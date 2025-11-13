#!/usr/bin/env python3
"""
Ultra-granular schedule upload to Pinecone.
Creates individual vectors for each event, time slot, and queryable attribute.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI
import time
from datetime import datetime, timedelta

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Constants
INDEX_NAME = "hof-branch-chatbot"
NAMESPACE = "hof-knowledge-base-max"
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072

# File paths
script_dir = Path(__file__).parent
SCHEDULE_FILE = script_dir / "MODIFIED" / "Schedule.txt"
SCHEDULE_2_FILE = script_dir / "MODIFIED" / "Schedule_2.txt"


def get_embedding(text: str) -> List[float]:
    """Generate OpenAI embedding for text."""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS
    )
    return response.data[0].embedding


def parse_date_range(date_range: str) -> tuple:
    """Parse date range string into start and end dates."""
    if ".." in date_range:
        start, end = date_range.split("..")
        return start, end
    return date_range, date_range


def extract_individual_events_schedule1(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract ultra-granular vectors from Schedule.txt (daily events).
    Each event gets its own vector with full metadata.
    """
    chunks = []
    month = data.get("month", "2025-11")

    by_date = data.get("by_date", {})

    for date_str, events in by_date.items():
        # Parse date
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        weekday = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"][date_obj.weekday()]

        for event_idx, event in enumerate(events):
            title = event.get("title", "")
            time_slot = event.get("time", "")
            location = event.get("location", "")
            presenter = event.get("presenter", "")
            category = event.get("category", "일반 교육")

            # Create searchable text
            searchable_text = f"""날짜: {date_str} ({weekday})
제목: {title}"""

            if time_slot:
                searchable_text += f"\n시간: {time_slot}"
            if location:
                searchable_text += f"\n장소: {location}"
            if presenter:
                searchable_text += f"\n강사: {presenter}"
            searchable_text += f"\n카테고리: {category}"

            # Natural language description
            natural_desc = f"{date_obj.month}월 {date_obj.day}일 {weekday} "
            if time_slot:
                natural_desc += f"{time_slot} "
            natural_desc += f"{title}"
            if presenter:
                natural_desc += f" (강사: {presenter})"
            if location:
                natural_desc += f" at {location}"

            # Extract time components
            start_time = None
            end_time = None
            if time_slot and "-" in time_slot:
                times = time_slot.split("-")
                if len(times) == 2:
                    start_time = times[0].strip()
                    end_time = times[1].strip()

            # Determine event type
            is_training = "교육" in title or "과정" in title or "강의" in category
            is_exam = "시험" in title or "응시" in title
            is_orientation = "오리엔테이션" in title
            is_ceremony = "수료식" in title
            is_partner_education = category == "제휴사 교육"
            is_kblp = category == "KBLP 본사 강의" or "KBLP" in presenter
            is_zoom = "ZOOM" in title or "zoom" in title.lower()

            # Extract company/partner names
            companies = []
            if "삼성화재" in title or "삼성화재" in presenter:
                companies.append("삼성화재")
            if "DB손보" in title or "DB손보" in presenter:
                companies.append("DB손보")
            if "KB라이프" in title or "KBLP" in presenter:
                companies.append("KB라이프")
            if "한화" in title:
                companies.append("한화생명")

            # Create metadata
            metadata = {
                "chunk_type": "event_individual",
                "source_file": "Schedule.txt",
                "month": month,
                "date": date_str,
                "date_start": date_str,
                "date_end": date_str,
                "weekday": weekday,
                "day_of_month": date_obj.day,
                "title": title,
                "category": category,
                "searchable_text": searchable_text,
                "natural_description": natural_desc,

                # Boolean flags
                "is_training": is_training,
                "is_exam": is_exam,
                "is_orientation": is_orientation,
                "is_ceremony": is_ceremony,
                "is_partner_education": is_partner_education,
                "is_kblp": is_kblp,
                "is_zoom": is_zoom,
                "has_time": bool(time_slot),
                "has_location": bool(location),
                "has_presenter": bool(presenter),
            }

            # Add optional fields
            if time_slot:
                metadata["time"] = time_slot
                metadata["time_start"] = start_time
                metadata["time_end"] = end_time
            if location:
                metadata["location"] = location
            if presenter:
                metadata["presenter"] = presenter
            if companies:
                metadata["companies"] = companies

            chunks.append({
                "text": searchable_text,
                "metadata": metadata
            })

    return chunks


def extract_individual_events_schedule2(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract ultra-granular vectors from Schedule_2.txt (event ranges and weekly events).
    """
    chunks = []
    month = data.get("month", "2025-11")

    events = data.get("events", [])

    for event_idx, event in enumerate(events):
        title = event.get("title", "")

        # Handle date ranges
        date_range = event.get("date_range", "")
        week_window = event.get("week_window", "")

        if date_range:
            date_start, date_end = parse_date_range(date_range)
        elif week_window:
            date_start, date_end = parse_date_range(week_window)
        else:
            continue  # Skip events without dates

        # Parse dates
        start_obj = datetime.strptime(date_start, "%Y-%m-%d")
        end_obj = datetime.strptime(date_end, "%Y-%m-%d")
        duration_days = (end_obj - start_obj).days + 1

        # Get other fields
        time_slot = event.get("time", "")
        location = event.get("location", "")
        category = event.get("category", "")
        regions = event.get("regions", [])
        business_days = event.get("details", {}).get("business_days", 0)

        # Create searchable text
        searchable_text = f"""제목: {title}
기간: {date_start} ~ {date_end} ({duration_days}일간)"""

        if time_slot:
            searchable_text += f"\n시간: {time_slot}"
        if location:
            searchable_text += f"\n장소: {location}"
        if category:
            searchable_text += f"\n카테고리: {category}"
        if regions:
            searchable_text += f"\n지역: {', '.join(regions)}"
        if business_days:
            searchable_text += f"\n영업일: {business_days}일"

        # Natural description
        natural_desc = f"{title} ({start_obj.month}월 {start_obj.day}일"
        if duration_days > 1:
            natural_desc += f" ~ {end_obj.month}월 {end_obj.day}일"
        natural_desc += ")"

        # Determine event type
        is_training = "교육" in title or "과정" in title
        is_exam = "시험" in title or category == "시험"
        is_appointment = "위촉" in title or "코드발급" in title
        is_deadline = "마감" in title or "접수" in title
        is_ceremony = "수료식" in title
        is_conference = "Conference" in title

        # Extract companies
        companies = []
        if "삼성화재" in title:
            companies.append("삼성화재")
        if "삼성생명" in title:
            companies.append("삼성생명")
        if "DB손보" in title or "DB세일즈" in title:
            companies.append("DB손보")
        if "KB라이프" in title or "KBLP" in title:
            companies.append("KB라이프")
        if "한화생명" in title:
            companies.append("한화생명")
        if "교보생명" in title:
            companies.append("교보생명")
        if "미래에셋" in title:
            companies.append("미래에셋")
        if "IM라이프" in title:
            companies.append("IM라이프")

        # Create metadata
        metadata = {
            "chunk_type": "event_range",
            "source_file": "Schedule_2.txt",
            "month": month,
            "date_start": date_start,
            "date_end": date_end,
            "duration_days": duration_days,
            "title": title,
            "searchable_text": searchable_text,
            "natural_description": natural_desc,

            # Boolean flags
            "is_training": is_training,
            "is_exam": is_exam,
            "is_appointment": is_appointment,
            "is_deadline": is_deadline,
            "is_ceremony": is_ceremony,
            "is_conference": is_conference,
            "has_time": bool(time_slot),
            "has_location": bool(location),
            "has_regions": bool(regions),
        }

        # Add optional fields
        if time_slot:
            metadata["time"] = time_slot
        if location:
            metadata["location"] = location
        if category:
            metadata["category"] = category
        if regions:
            metadata["regions"] = regions
        if companies:
            metadata["companies"] = companies
        if business_days:
            metadata["business_days"] = business_days

        chunks.append({
            "text": searchable_text,
            "metadata": metadata
        })

    return chunks


def extract_date_summaries(schedule1_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Create daily summary vectors for Schedule.txt.
    One vector per day summarizing all events on that day.
    """
    chunks = []
    month = schedule1_data.get("month", "2025-11")
    by_date = schedule1_data.get("by_date", {})

    for date_str, events in by_date.items():
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        weekday = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"][date_obj.weekday()]

        # Create summary
        event_titles = [e.get("title", "") for e in events]
        event_count = len(events)

        searchable_text = f"""{date_str} ({weekday}) 일정 요약
총 {event_count}개 행사

행사 목록:
""" + "\n".join([f"{i+1}. {title}" for i, title in enumerate(event_titles)])

        natural_desc = f"{date_obj.month}월 {date_obj.day}일 {weekday}에는 {event_count}개 행사 예정: {', '.join(event_titles[:3])}"
        if event_count > 3:
            natural_desc += f" 외 {event_count - 3}개"

        metadata = {
            "chunk_type": "day_summary",
            "source_file": "Schedule.txt",
            "month": month,
            "date": date_str,
            "date_start": date_str,
            "date_end": date_str,
            "weekday": weekday,
            "day_of_month": date_obj.day,
            "event_count": event_count,
            "event_titles": event_titles,
            "searchable_text": searchable_text,
            "natural_description": natural_desc,
        }

        chunks.append({
            "text": searchable_text,
            "metadata": metadata
        })

    return chunks


def main():
    print("="*80)
    print("ULTRA-GRANULAR SCHEDULE UPLOAD TO PINECONE")
    print("="*80)

    # Load schedule files
    print(f"\n📖 Loading schedule files...")
    with open(SCHEDULE_FILE, "r", encoding="utf-8") as f:
        schedule1_data = json.load(f)
    with open(SCHEDULE_2_FILE, "r", encoding="utf-8") as f:
        schedule2_data = json.load(f)

    print(f"✓ Loaded Schedule.txt: {len(schedule1_data.get('by_date', {}))} days")
    print(f"✓ Loaded Schedule_2.txt: {len(schedule2_data.get('events', []))} events")

    # Extract chunks
    print(f"\n🔧 Extracting ultra-granular vectors...")

    chunks = []

    # Schedule 1: Individual events
    schedule1_events = extract_individual_events_schedule1(schedule1_data)
    chunks.extend(schedule1_events)
    print(f"  ✓ Schedule.txt individual events: {len(schedule1_events)}")

    # Schedule 1: Daily summaries
    schedule1_summaries = extract_date_summaries(schedule1_data)
    chunks.extend(schedule1_summaries)
    print(f"  ✓ Schedule.txt daily summaries: {len(schedule1_summaries)}")

    # Schedule 2: Event ranges
    schedule2_events = extract_individual_events_schedule2(schedule2_data)
    chunks.extend(schedule2_events)
    print(f"  ✓ Schedule_2.txt event ranges: {len(schedule2_events)}")

    total_chunks = len(chunks)
    print(f"\n📊 Total vectors to create: {total_chunks}")

    # Generate embeddings and prepare vectors
    print(f"\n🔮 Generating embeddings...")
    vectors = []

    for i, chunk in enumerate(chunks, 1):
        if i % 10 == 0:
            print(f"  Progress: {i}/{total_chunks}")

        embedding = get_embedding(chunk["text"])

        vector_id = f"schedule_ultra_{i}_{time.time()}"

        vectors.append({
            "id": vector_id,
            "values": embedding,
            "metadata": chunk["metadata"]
        })

    print(f"✓ Generated {len(vectors)} embeddings")

    # Upload to Pinecone
    print(f"\n📤 Uploading to Pinecone (namespace: {NAMESPACE})...")
    index = pc.Index(INDEX_NAME)

    # Upload in batches
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(vectors=batch, namespace=NAMESPACE)
        print(f"  ✓ Uploaded batch {i//batch_size + 1}/{(len(vectors)-1)//batch_size + 1}")

    print(f"\n✅ Upload complete!")

    # Get final stats
    time.sleep(2)
    stats = index.describe_index_stats()
    total_vectors = stats.namespaces.get(NAMESPACE, {}).vector_count or 0

    print(f"\n{'='*80}")
    print("FINAL STATISTICS")
    print(f"{'='*80}")
    print(f"Namespace: {NAMESPACE}")
    print(f"Total vectors in namespace: {total_vectors}")
    print(f"Newly added: {total_chunks}")
    print(f"\nBreakdown:")
    print(f"  • Individual events (Schedule.txt): {len(schedule1_events)}")
    print(f"  • Daily summaries (Schedule.txt): {len(schedule1_summaries)}")
    print(f"  • Event ranges (Schedule_2.txt): {len(schedule2_events)}")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()
