# Detailed Response Fix for Schedule Queries

## Issue
When querying schedule data (e.g., "11월 4일 강의 스케줄"), the RAG system was returning basic information without detailed metadata like:
- Time slots
- Location
- Presenter/instructor names
- Category

## Root Cause
The `format_context_for_gemini()` function in `rag_chatbot.py` only had special formatting for:
1. Hanwha commission data (`table_cell_commission`, `table_row_summary`, etc.)
2. Generic/general data (fallback)

Schedule data (`event_individual`, `day_summary`, `event_range`) was falling into the generic formatter, which didn't extract schedule-specific fields.

## Solution
Added dedicated schedule formatting logic to `format_context_for_gemini()`:

```python
# Check if this is schedule data
is_schedule = chunk_type in ['event_individual', 'day_summary', 'event_range']

if is_schedule:
    # Format schedule-specific data with all metadata
    context = f"""
## 문서 {idx} (관련도: {match.score:.3f})

**출처:** {meta.get('source_file', 'Schedule')}
**유형:** {chunk_type}
"""
    # Event details
    if meta.get('title'):
        context += f"**제목:** {meta.get('title')}\n"

    # Date information
    if chunk_type == 'event_individual' or chunk_type == 'day_summary':
        date = meta.get('date', '')
        weekday = meta.get('weekday', '')
        if date:
            context += f"**날짜:** {date}"
            if weekday:
                context += f" ({weekday})"
            context += "\n"

    # Time, Location, Presenter
    if meta.get('time'):
        context += f"**시간:** {meta.get('time')}\n"
    if meta.get('location'):
        context += f"**장소:** {meta.get('location')}\n"
    if meta.get('presenter'):
        context += f"**강사:** {meta.get('presenter')}\n"
    if meta.get('category'):
        context += f"**카테고리:** {meta.get('category')}\n"
```

## Before vs After

### Before (Missing Details):
```
1. 세일즈프로세스 7단계 길라잡이
   날짜: 2025년 11월 4일

2. FC 비즈니스 매너
   날짜: 2025년 11월 4일
```

### After (Full Details):
```
1. 세일즈프로세스 7단계 길라잡이
   날짜: 2025년 11월 4일 화요일
   시간: 오후 1시 00분 ~ 오후 2시 20분
   강사: 정다운 본부장 (수도권)
   카테고리: 일반 교육

2. FC 비즈니스 매너
   날짜: 2025년 11월 4일 화요일
   시간: 오후 2시 30분 ~ 오후 3시 10분
   강사: 박영준 본부장 (사람인)
   카테고리: 일반 교육
```

## Metadata Fields Now Displayed

### For `event_individual`:
- ✅ Title (제목)
- ✅ Date with weekday (날짜)
- ✅ Time slot (시간)
- ✅ Location (장소)
- ✅ Presenter/Instructor (강사)
- ✅ Category (카테고리)
- ✅ Insurance companies (보험사)

### For `event_range`:
- ✅ Title (제목)
- ✅ Date range (기간)
- ✅ Duration in days (일수)
- ✅ Business days (영업일)
- ✅ Time (시간)
- ✅ Location (장소)
- ✅ Insurance companies (보험사)
- ✅ Regions (지역)

### For `day_summary`:
- ✅ Date with weekday (날짜)
- ✅ Event count (행사 수)
- ✅ List of all event titles (행사 목록)

## Test Results

### Query: "11월 4일 강의 스케줄"
Returns 6 events with full details including time, location, presenter for each.

### Query: "삼성화재 교육 언제야?"
Returns 2 events with dates, times, locations, and instructors.

### Query: "11월 11일 일정"
Returns 4 events with complete schedule information.

## Impact
- ✅ Users now get comprehensive schedule information in a single query
- ✅ No need for follow-up questions about time/location/presenter
- ✅ Better user experience with complete, actionable information
- ✅ Maintains accurate first-attempt results (no fallback needed)
