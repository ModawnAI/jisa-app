#!/usr/bin/env python3
"""
Complete RAG Chatbot Pipeline for HO&F JISA App:
1. User Query → Gemini Flash (query enhancement with metadata_key.json)
2. Enhanced Query → Pinecone (retrieve top 4 results)
3. Retrieved Context → Gemini 2.5 Pro (generate final answer)
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI
from google import genai

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Constants
INDEX_NAME = "hof-branch-chatbot"
NAMESPACE = "hof-knowledge-base-max"
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent
METADATA_KEY_PATH = SCRIPT_DIR / "metadata_key.json"
PDF_URLS_PATH = SCRIPT_DIR / "pdf_urls.json"


def load_metadata_key():
    """Load the metadata key for context."""
    with open(METADATA_KEY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_pdf_urls():
    """Load PDF URLs configuration."""
    with open(PDF_URLS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_relevant_pdfs(user_query: str, results) -> list:
    """
    Determine which PDFs to attach based on query and results.

    Args:
        user_query: User's question
        results: Pinecone search results

    Returns:
        List of PDF objects to attach
    """
    pdf_config = load_pdf_urls()
    relevant_pdfs = []

    # Check if query is about schedules/training/education
    schedule_keywords = ['일정', '스케줄', '교육', '강의', '시험', '행사', 'KRS', '입문과정', '시간표']
    is_schedule_query = any(keyword in user_query for keyword in schedule_keywords)

    # Check if query is about Hanwha commissions/policies
    hanwha_keywords = ['한화생명', '한화', '시책', '수수료', '커미션', '익월', '13차월']
    is_hanwha_query = any(keyword in user_query for keyword in hanwha_keywords)

    # Check results for schedule or Hanwha data
    has_schedule_results = False
    has_hanwha_results = False

    if results.matches:
        for match in results.matches[:5]:  # Check top 5 results
            chunk_type = match.metadata.get('chunk_type', '')
            if chunk_type in ['event_individual', 'day_summary', 'event_range']:
                has_schedule_results = True
            if chunk_type in ['table_cell_commission', 'table_row_summary', 'table_column_summary']:
                has_hanwha_results = True

    # Add schedule PDFs if relevant
    if is_schedule_query or has_schedule_results:
        # Add main schedule PDF
        relevant_pdfs.append(pdf_config['schedule_pdfs'][0])  # 24년 호앤에프지사 일정표

        # Add KRS PDF if KRS-related
        if 'KRS' in user_query or 'krs' in user_query.lower() or '입문' in user_query:
            relevant_pdfs.append(pdf_config['schedule_pdfs'][1])  # KRS 시간표

    # Add policy PDFs if relevant
    if is_hanwha_query or has_hanwha_results:
        relevant_pdfs.append(pdf_config['policy_pdfs'][0])  # 한화생명 시책공지

    return relevant_pdfs


def format_pdf_attachments(pdfs: list) -> str:
    """Format PDF attachments for inclusion in response."""
    if not pdfs:
        return ""

    attachment_text = "\n\n" + "─" * 60 + "\n"
    attachment_text += "📎 **참고 자료**\n\n"

    for pdf in pdfs:
        attachment_text += f"**{pdf['description']}**\n"
        attachment_text += f"🔗 [PDF 보기]({pdf['url']})\n\n"

    return attachment_text


def enhance_query_with_gemini_flash(user_query: str, metadata_key: dict) -> dict:
    """
    Step 1: Use Gemini Flash to enhance query and generate Pinecone filters.
    Uses gemini-flash-latest for fast query optimization with metadata context.
    """

    # Instructions for Hanwha commission queries (now in main namespace)
    hanwha_instructions = """
## HANWHA COMMISSION QUERIES (한화생명 11월 시책 - 초세밀 데이터)

**이 네임스페이스는 264개의 초세밀 벡터로 구성되어 있습니다:**

### 사용 가능한 Chunk Types:
- **table_cell_commission** (154개): 개별 상품의 특정 수수료율 (가장 세밀함)
  * 각 셀마다 독립적인 벡터
  * 상품명, 납기, 수수료 유형(종합/1차시책/2차시책), 기간(익월/13차월)으로 필터링 가능

- **table_row_summary** (26개): 한 상품의 모든 수수료율 요약

- **table_column_summary** (35개): 한 수수료 유형의 모든 상품 목록

- **page_full** (5개): 전체 페이지 컨텐츠

- **heading_with_context** (7개): 섹션 헤더와 설명

- **text_sentence_group** (31개): 정책 및 규정 상세 설명

### 필터링 전략 (CRITICAL):
1. **특정 상품 + 특정 수수료** 질문:
   - chunk_type: "table_cell_commission" 필수
   - product_name_clean: 상품명 (정확한 매칭)
   - commission_category OR commission_period 사용

2. **상품 전체 수수료** 질문:
   - chunk_type: "table_row_summary"

3. **수수료 유형별 전체 상품** 질문:
   - chunk_type: "table_column_summary"

4. **정책/환수/규정** 질문:
   - chunk_type: "text_sentence_group"

### 메타데이터 필드 (Hanwha 전용):
- product_name: 원본 상품명 (예: "(일반/간편) 레이디H보장보험")
- product_name_clean: 정제된 상품명 (예: "레이디H보장보험")
- payment_term: 납기 (예: "10년납", "20년납↑", "납기무관")
- commission_type: 수수료 키 (comprehensive_current, fc_policy_13th, 등)
- commission_label: 수수료 라벨 (예: "종합 익월", "1차시책(FC시책) 13차월")
- commission_value: 실제 수수료율 (예: "485.0%", "194.0%")
- commission_category: 카테고리 ("종합", "1차시책(FC시책)", "2차시책(본부시책)")
- commission_period: 기간 ("익월", "13차월")

### Boolean 필터 (Hanwha):
- is_current_month: True면 익월 수수료
- is_13th_month: True면 13차월 수수료
- is_fc_policy: True면 FC시책
- is_hq_policy: True면 본부시책
- is_comprehensive: True면 종합

### 쿼리 최적화 예시:
1. "레이디H보장보험 종합 익월 수수료"
   → filter: {{"chunk_type": "table_cell_commission", "is_comprehensive": true, "is_current_month": true}}
   → enhanced_query: "레이디H보장보험 종합 익월 수수료율"

2. "제로백H종신 20년납"
   → filter: {{"chunk_type": "table_cell_commission", "payment_term": "20년납"}}
   → enhanced_query: "제로백H종신 20년납 수수료"

3. "H건강플러스 모든 수수료"
   → filter: {{"chunk_type": "table_row_summary"}}
   → enhanced_query: "H건강플러스 전체 수수료율"

### CRITICAL FILTERING RULES for Hanwha:
1. **NEVER use product_name or product_name_clean in filters** - semantic search will find products!
2. **NEVER use companies field** - it doesn't exist! Field is "company" but don't filter by it
3. **ONLY use these fields**:
   - chunk_type (REQUIRED: "table_cell_commission" or "table_row_summary" or "table_column_summary")
   - Boolean flags: is_comprehensive, is_current_month, is_13th_month, is_fc_policy, is_hq_policy
   - payment_term (ONLY if user explicitly says "20년납", "10년납", etc.)
4. **Semantic search handles product matching** automatically via searchable_text field
5. **Example good filter**: {{"chunk_type": "table_cell_commission", "is_comprehensive": true, "is_current_month": true}}
6. **Example BAD filter**: {{"product_name": "...", "companies": [...], "product_name_clean": "..."}} ← DON'T DO THIS!

## SCHEDULE QUERIES (일정, 교육, 시험 - 초세밀 데이터)

**이 네임스페이스는 91개의 초세밀 스케줄 벡터를 포함합니다:**

### 사용 가능한 Chunk Types:
- **event_individual** (47개): 개별 교육/행사 (날짜, 시간, 강사 포함)
- **day_summary** (14개): 일일 전체 일정 요약
- **event_range** (30개): 기간 행사 (위촉 링크, 시험 기간 등)

### Schedule 필터링 전략 (CRITICAL - USE CONSERVATIVE FILTERS):

**IMPORTANT: For schedule queries, use MINIMAL filters to avoid missing data!**

1. **특정 날짜 질문** ("11월 4일 일정", "4일에 뭐 있어?"):
   - Use: {{"date_start": "2025-11-04"}} OR {{"date": "2025-11-04"}}
   - chunk_type: "event_individual" OR "day_summary"
   - DO NOT add is_training filter unless explicitly asked!

2. **교육 관련** ("교육 일정", "강의 스케줄"):
   - Use ONLY: {{"is_training": true}}
   - DO NOT use date filters unless date is explicitly mentioned!

3. **시험 관련** ("시험 일정", "생명보험 시험"):
   - Use: {{"is_exam": true}}
   - Optionally add chunk_type: "event_range" for exam periods

4. **강사/장소 관련**:
   - Let semantic search handle it - DO NOT filter!
   - Enhanced query should include presenter/location terms

### Schedule Boolean 필터:
- is_training: 교육/강의/과정
- is_exam: 시험/응시
- is_appointment: 위촉/코드발급
- is_deadline: 마감/접수
- is_ceremony: 수료식
- is_orientation: 오리엔테이션
- is_partner_education: 제휴사 교육
- is_kblp: KBLP 본사 강의
- is_zoom: ZOOM 강의
- is_conference: Conference

### 예시 (FOLLOW THESE PATTERNS):
1. "11월 4일 강의 스케줄"
   → filter: {{"date_start": "2025-11-04"}}  # NO is_training! Date is specific enough
   → enhanced_query: "11월 4일 강의 교육 일정 스케줄"

2. "교육 일정"
   → filter: {{"is_training": true}}  # ONLY boolean flag
   → enhanced_query: "교육 강의 트레이닝 일정"

3. "삼성화재 교육"
   → filter: {{"is_training": true}}  # Let semantic search find company
   → enhanced_query: "삼성화재 제휴사 교육"

4. "11월 7일 시험"
   → filter: {{"$or": [{{"date_start": "2025-11-07"}}, {{"date": "2025-11-07"}}]}}
   → enhanced_query: "11월 7일 시험 응시 생명보험"

**CRITICAL RULES:**
1. **NEVER use $gte, $lte, $gt, $lt with date strings** - Pinecone only supports these with numbers!
2. **For date ranges, use $eq ONLY** - semantic search will handle date proximity
3. Prefer semantic search over strict filters for schedules!
4. Only use date filters when date is explicitly mentioned.
"""

    prompt = f"""You are an expert query optimizer for a Korean insurance branch office RAG system.

{hanwha_instructions}

## AVAILABLE METADATA IN PINECONE:

**IMPORTANT: These are EXAMPLES only. Semantic search handles actual matching!**

**Chunk Types (select based on query type):** {', '.join(metadata_key.get('chunk_types', []))}
**Content Types (examples):** {', '.join(metadata_key.get('content_types', []))}
**Primary Categories (examples):** {', '.join(metadata_key.get('primary_categories', []))}
**Insurance Companies:** {', '.join(metadata_key.get('companies', []))}
**Product Examples:** {', '.join(metadata_key.get('product_names_examples', [])[:5])}...
**Presenter Examples:** {', '.join(metadata_key.get('presenters_examples', [])[:4])}...
**Locations:** {', '.join(metadata_key.get('locations', []))}
**Payment Terms:** {', '.join(metadata_key.get('payment_terms', [])[:8])}...
**Commission Categories:** {', '.join(metadata_key.get('commission_categories', []))}
**Commission Periods:** {', '.join(metadata_key.get('commission_periods', []))}

## BOOLEAN FLAGS AVAILABLE:
{chr(10).join(f"- {flag}" for flag in metadata_key.get('boolean_filters', []))}

## USER QUERY:
"{user_query}"

## YOUR TASK:
Generate optimized search query and Pinecone filters.

## PRODUCT NAME MATCHING RULES:
- When user asks about a product (보험, 상품), use PARTIAL matching, not exact
- Remove qualifiers like "일반/", "간편/", "(일반)", "(간편)" when creating filters
- Example: "H건강플러스" should match "H건강플러스", "(일반/간편) H건강플러스", "간편 H건강플러스"
- Use semantic search (enhanced_query) for product names, NOT strict filters
- Only use product filters when user specifies exact product codes or very specific names

## DATE EXTRACTION RULES (HIGHEST PRIORITY - FOLLOW EXACTLY):

**CRITICAL: NEVER use $gte/$lte with date strings! Only use $eq.**

### Rule 1: Specific Date (날짜 명시)
If query contains: "N월 M일", "M일", "N/M", or day number:
- MUST use: {{"date_start": {{"$eq": "2025-11-04"}}}} OR {{"date": {{"$eq": "2025-11-04"}}}}
- Examples that trigger this:
  * "11월 4일 행사" → {{"$or": [{{"date_start": "2025-11-04"}}, {{"date": "2025-11-04"}}]}}
  * "4일에 뭐 있어?" → {{"$or": [{{"date_start": "2025-11-04"}}, {{"date": "2025-11-04"}}]}}

### Rule 2: Date Range (기간) - DO NOT USE FILTERS!
If query contains: "N일부터 M일", "N일~M일":
- DO NOT use filters! Let semantic search handle it
- Enhanced query should include both dates

### Rule 3: Month Only (월만 언급)
ONLY if query has month but NO specific day:
- Use: {{"month": {{"$eq": "2025-11"}}}}
- Examples: "11월 일정", "11월에 뭐 있어?"

### Rule 4: Date Format
- Always use YYYY-MM-DD format
- Current year is 2025
- Convert Korean dates: "11월 4일" → "2025-11-04"

## WHEN NOT TO FILTER (CRITICAL):

**Use NO FILTERS (null) for these query types:**
1. General procedures/절차 questions (보증보험 동의 절차, 가입 방법, etc.)
2. General "how to" questions (어떻게, 방법, 안내)
3. **Resource/link/material requests** (링크, 자료, 문서, 파일, 있어?, 모음) ← MOST IMPORTANT!
4. Policy/regulation questions WITHOUT specific keywords
5. When you're unsure - prefer semantic search over strict filters!

**SPECIAL RULE for 자료/링크/파일 queries:**
- When user asks "루키 스쿨 자료 있어?", "교육 자료 링크", "파일 있어?" → **NEVER use filters!**
- Resource documents are often category="resource_links" or "link", NOT "is_training"
- Filters will EXCLUDE the actual resource links you're looking for!
- Let semantic search find the right materials

**Only use filters when:**
- User asks for specific date ("11월 4일 일정")
- User asks for specific schedule type (교육 일정, 시험 일정) ← schedule, not materials!
- User asks about Hanwha commissions (use chunk_type)
- User specifies boolean criteria explicitly

**Examples - NO FILTER:**
- "보증보험 동의 절차 뭐야?" → filters: null
- "어떻게 가입해?" → filters: null
- "자료 링크 알려줘" → filters: null ← Resource request
- "루키 스쿨 자료 있어?" → filters: null ← Resource request
- "교육 자료 파일" → filters: null ← Resource request
- "KRS 링크" → filters: null ← Resource request

**Examples - USE FILTER:**
- "11월 4일 교육 일정" → filters: {{"date": "2025-11-04", "is_training": true}} ← Schedule query
- "이번 주 시험 일정" → filters: {{"is_exam": true}} ← Schedule query

## FILTER SYNTAX RULES:
- Use {{"field": {{"$eq": value}}}} for exact match
- Use {{"field": {{"$in": [values]}}}} for arrays
- **NEVER use $gte, $lte, $gt, $lt with STRINGS** - only use with numbers!
- For date strings, ONLY use $eq - no comparison operators!
- Use {{"$and": [conditions]}} for multiple conditions (all must match)
- Use {{"$or": [conditions]}} for alternative conditions (any can match)
- Boolean flags use true/false (lowercase)

## EXACT FIELD NAMES:
- companies (array)
- products (array)
- locations (array)
- month (string, format: "2025-11")
- date (string, format: "2025-11-04")
- date_start (string, format: "2025-11-04")
- date_end (string, format: "2025-11-06")
- content_type (string)
- primary_category (string)
- sub_category (string)
- semantic_tags (array)
- keywords (array)
- is_training, is_exam, is_promotion, is_policy, etc. (boolean)

## OUTPUT FORMAT (VALID JSON ONLY):
```json
{{
  "enhanced_query": "optimized Korean search text with core terms and variations",
  "filters": {{
    // Pinecone filter object, or null if no filters needed
  }},
  "reasoning": "Brief explanation"
}}
```

**Enhanced Query Tips:**
- For products: include base name + variations (예: "H건강플러스 OR H건강플러스상품 OR 간편H건강플러스 OR 일반H건강플러스")
- For dates: include multiple formats (예: "11월 4일 OR 11/4 OR 4일")
- Use semantic expansions to improve recall

Return ONLY valid JSON, no markdown.
"""

    response = genai_client.models.generate_content(
        model='gemini-flash-latest',
        contents=prompt
    )
    response_text = response.text.strip()

    # Clean markdown
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    try:
        return json.loads(response_text.strip())
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON Parse Error: {e}")
        return {
            "enhanced_query": user_query,
            "filters": None,
            "reasoning": "Failed to parse Gemini response"
        }


def get_embedding(text: str):
    """Generate embedding for query text."""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS
    )
    return response.data[0].embedding


def retrieve_from_pinecone(enhanced_query: str, filters: dict = None, top_k: int = 4):
    """
    Step 2: Query Pinecone with enhanced query and filters.

    Args:
        enhanced_query: Optimized search query
        filters: Pinecone metadata filters
        top_k: Number of results to retrieve
    """
    index = pc.Index(INDEX_NAME)

    # Generate embedding
    query_embedding = get_embedding(enhanced_query)

    # Query Pinecone
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=NAMESPACE,
        include_metadata=True,
        filter=filters
    )

    return results


def format_context_for_gemini(results) -> str:
    """
    Format Pinecone results into context for Gemini 2.5 Pro.
    Handles both general and Hanwha-specific metadata.
    """
    if not results.matches:
        return "검색 결과가 없습니다."

    context_parts = []

    for idx, match in enumerate(results.matches, 1):
        meta = match.metadata
        chunk_type = meta.get('chunk_type', 'N/A')

        # Check if this is Hanwha commission data
        is_hanwha = chunk_type in ['table_cell_commission', 'table_row_summary', 'table_column_summary']

        # Check if this is schedule data
        is_schedule = chunk_type in ['event_individual', 'day_summary', 'event_range']

        if is_schedule:
            # Format schedule-specific data
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
            elif chunk_type == 'event_range':
                date_start = meta.get('date_start', '')
                date_end = meta.get('date_end', '')
                duration = meta.get('duration_days', 0)
                if date_start and date_end:
                    context += f"**기간:** {date_start} ~ {date_end}"
                    if duration:
                        context += f" ({duration}일간)"
                    context += "\n"
                if meta.get('business_days'):
                    context += f"**영업일:** {meta.get('business_days')}일\n"

            # Time, Location, Presenter
            if meta.get('time'):
                context += f"**시간:** {meta.get('time')}\n"
            if meta.get('location'):
                context += f"**장소:** {meta.get('location')}\n"
            if meta.get('presenter'):
                context += f"**강사:** {meta.get('presenter')}\n"
            if meta.get('category'):
                context += f"**카테고리:** {meta.get('category')}\n"

            # Companies/Regions
            if meta.get('companies'):
                context += f"**보험사:** {', '.join(meta.get('companies', []))}\n"
            if meta.get('regions'):
                context += f"**지역:** {', '.join(meta.get('regions', []))}\n"

            # Event count for day summaries
            if chunk_type == 'day_summary' and meta.get('event_count'):
                context += f"**행사 수:** {meta.get('event_count')}개\n"
                if meta.get('event_titles'):
                    context += f"**행사 목록:** {', '.join(meta.get('event_titles', []))}\n"

            # Full content
            searchable = meta.get('searchable_text', meta.get('natural_description', ''))
            if searchable:
                context += f"\n**상세 내용:**\n{searchable}\n"

        elif is_hanwha:
            # Format Hanwha-specific data
            context = f"""
## 문서 {idx} (관련도: {match.score:.3f})

**출처:** 한화생명 11월 시책공지
**유형:** {chunk_type}
"""
            if chunk_type == 'table_cell_commission':
                context += f"**상품명:** {meta.get('product_name', 'N/A')}\n"
                if meta.get('payment_term'):
                    context += f"**납기:** {meta.get('payment_term')}\n"
                context += f"**시책 유형:** {meta.get('commission_label', 'N/A')}\n"
                context += f"**수수료율:** {meta.get('commission_value', 'N/A')}\n"
                context += f"**카테고리:** {meta.get('commission_category', 'N/A')}\n"
                context += f"**기간:** {meta.get('commission_period', 'N/A')}\n"

            elif chunk_type == 'table_row_summary':
                context += f"**상품명:** {meta.get('product_name', 'N/A')}\n"
                if meta.get('payment_term'):
                    context += f"**납기:** {meta.get('payment_term')}\n"
                rates = meta.get('all_commission_values', [])
                if rates:
                    context += f"**전체 수수료율:** {', '.join(str(r) for r in rates)}\n"

            elif chunk_type == 'table_column_summary':
                context += f"**시책 유형:** {meta.get('column_header', 'N/A')}\n"
                context += f"**상품 개수:** {meta.get('product_count', 0)}개\n"

            # Add searchable text
            searchable = meta.get('searchable_text', meta.get('natural_description', ''))
            if searchable:
                context += f"\n**상세 내용:**\n{searchable}\n"

        else:
            # Format general data (original format)
            context = f"""
## 문서 {idx} (관련도: {match.score:.3f})

**제목:** {meta.get('title', 'N/A')}
**출처:** {meta.get('source_file', meta.get('doc_title', 'N/A'))}
**유형:** {meta.get('content_type', meta.get('type', meta.get('doc_type', 'N/A')))}
**카테고리:** {meta.get('primary_category', meta.get('category', 'N/A'))} → {meta.get('sub_category', 'N/A')}
"""

            # Add relevant metadata for general documents
            if meta.get('insurance_company'):
                context += f"**보험사:** {meta.get('insurance_company')}\n"
            if meta.get('company'):
                context += f"**회사:** {meta.get('company')}\n"
            if meta.get('provider'):
                context += f"**제공:** {meta.get('provider')}\n"
            if meta.get('date'):
                context += f"**날짜:** {meta.get('date')}\n"
            if meta.get('date_start') and meta.get('date_end'):
                context += f"**기간:** {meta.get('date_start')} ~ {meta.get('date_end')}\n"
            if meta.get('payout_amount'):
                context += f"**지원금:** {meta.get('payout_amount'):,.0f}원\n"
            if meta.get('financial_tier'):
                context += f"**금액구간:** {meta.get('financial_tier')}\n"
            if meta.get('people'):
                context += f"**관련인물:** {', '.join(meta.get('people', []))}\n"
            if meta.get('locations'):
                context += f"**장소:** {', '.join(meta.get('locations', []))}\n"
            if meta.get('products'):
                context += f"**상품:** {', '.join(meta.get('products', [])[:5])}\n"

            # Extract URLs/links (universal for all document types)
            url = meta.get('url') or meta.get('app_link') or meta.get('link') or meta.get('resource_url')
            if url:
                context += f"**링크:** {url}\n"

            # For insurance_procedures type, extract structured info
            if meta.get('category') == 'insurance_procedures' or meta.get('type') == 'guarantee_insurance_consent':
                if meta.get('procedure_steps'):
                    context += f"**절차:** {meta.get('procedure_steps')}\n"
                if meta.get('required_info'):
                    context += f"**필요정보:** {meta.get('required_info')}\n"
                if meta.get('important_note'):
                    context += f"**중요:** {meta.get('important_note')}\n"
                if meta.get('warning'):
                    context += f"**주의사항:** {meta.get('warning')}\n"
                if meta.get('purpose_detail'):
                    context += f"**목적:** {meta.get('purpose_detail')}\n"

            # For resource_links type, add description
            if meta.get('category') == 'resource_links':
                if meta.get('doc_type'):
                    context += f"**자료 유형:** {meta.get('doc_type')}\n"
                if meta.get('keywords'):
                    context += f"**키워드:** {meta.get('keywords')}\n"

            # For zoom meetings, add meeting details
            if meta.get('category') == 'zoom_meeting':
                if meta.get('meeting_id'):
                    context += f"**Meeting ID:** {meta.get('meeting_id')}\n"
                if meta.get('passcode'):
                    context += f"**Passcode:** {meta.get('passcode')}\n"

            # Full text content - try multiple field names
            text_content = meta.get('full_text') or meta.get('text') or meta.get('text_preview') or meta.get('searchable_text') or 'N/A'
            if text_content and text_content != 'N/A':
                context += f"\n**전체 내용:**\n{text_content}\n"

        context_parts.append(context)

    return "\n".join(context_parts)


def detect_question_type(user_query: str) -> str:
    """
    Detect the type of question to select appropriate prompt strategy.

    Returns:
        'list_all': User wants comprehensive list of all items (행사, 교육, 프로모션, etc.)
        'specific': User wants specific information about one thing
        'explanation': User wants explanation or understanding
        'single': User explicitly wants one item only
    """
    query_lower = user_query.lower()

    # Keywords indicating "show me everything"
    list_all_keywords = ['모두', '전부', '다', '전체', '모든', '몇', '뭐', '무엇', '어떤', '어떻게']

    # Keywords indicating "just one" or "specific item"
    single_keywords = ['하나만', '첫번째', '첫 번째', '가장', '제일', '최고', '주요한', '중요한']

    # Question types that expect lists
    list_context_words = ['행사', '교육', '일정', '프로모션', '시책', '워크샵', '세미나', '강의', '미팅']

    # Check for explicit "single item" request
    if any(kw in query_lower for kw in single_keywords):
        return 'single'

    # Check for list-all request with context words
    has_list_keyword = any(kw in query_lower for kw in list_all_keywords)
    has_list_context = any(kw in query_lower for kw in list_context_words)

    if has_list_context and has_list_keyword:
        return 'list_all'

    # If asking "what events" type questions without limiting words
    if has_list_context:
        return 'list_all'

    # Default to explanation for other types
    return 'explanation'


def generate_answer_with_gemini_pro(user_query: str, context: str) -> str:
    """
    Step 3: Use Gemini 2.5 Pro to generate final answer based on retrieved context.
    Uses gemini-2.5-pro for high-quality final inference.
    Selects specialized prompt based on question type.
    """

    question_type = detect_question_type(user_query)
    print(f"   🎯 질문 유형: {question_type}")

    # Base formatting instructions (shared across all prompts)
    formatting_instructions = """
특별 지침 (출력 형식):
- 마크다운 사용 금지: **, ##, *, -, [], () 등 마크다운 기호를 절대 사용하지 마세요
- 순수 텍스트만 사용: 들여쓰기(스페이스)와 줄바꿈만으로 구조를 표현하세요
- 목록 표시: 번호나 기호 대신 "1. ", "2. " 또는 "- " 같은 간단한 텍스트로 표시하세요
- 강조 표시: 별표나 밑줄 대신 그냥 텍스트로 작성하세요
- 표 금지: 표 형식 대신 텍스트로 나열하세요
- 금액은 쉼표로 구분하여 표시하세요 (예: 1,000,000원)
- 날짜는 명확하게 표시하세요 (예: 2025년 11월 1일 금요일 ~ 11월 23일 토요일)
- 시간은 오전/오후 형식으로 표시하세요 (예: 오후 2시 30분)
- 프로모션/시책은 적용 조건을 명확히 설명하세요
- 교육 일정은 날짜, 요일, 시간, 장소, 강사를 모두 포함하세요
- 환수 규정은 회차별로 나열하세요 (예: 1회차 환수율 100%, 2회차 환수율 80%)
"""

    # Commission-specific instructions
    commission_instructions = """
**수수료 데이터 처리 규칙 (CRITICAL):**

❌ 절대 금지:
- 컬럼 이름 언급 금지: col_8, col_19, col_20~col_43 같은 기술 용어 사용 금지
- 계산/공식 언급 금지: "배율", "계산식", "×", "공식" 사용 금지
- 분석 용어 금지: "분포", "합산", "패턴", "구간" 사용 금지
- 소수점 형식 금지: 0.08148, 2.50842 같은 소수 그대로 표시 금지
- 기술 설명 금지: 데이터 구조, 테이블 구조 설명 금지
- 실무 팁 금지: "실무 활용 팁", "비교", "판단" 조언 금지
- 유사 상품 금지: 다른 상품 추천 금지

✅ 필수 처리:
- 모든 소수값은 × 100하여 백분율(%)로 변환
- 예시: 0.405 → 40.5%, 1.76346 → 176.35%, 8.0 → 800% (NOT 8.0!)
- 간결하게: 상품명, 회사, 주요 수수료율만 표시
- 있는 정보만: 없는 정보는 "해당 정보 없음"이라고만 표시
"""

    if question_type == 'list_all':
        # USER WANTS COMPREHENSIVE LIST - SHOW EVERYTHING
        prompt = f"""당신은 HO&F 지사 AI입니다. 사용자가 행사, 교육, 일정 등의 완전한 목록을 요청했습니다.

사용자 질문:
{user_query}

검색된 관련 정보 (최대 10개 문서):
{context}

**핵심 지침 (절대 준수 - CRITICAL):**

⚠️ 문서 파싱 규칙 (MOST IMPORTANT):
- 검색된 문서에 일정표, 캘린더, 스케줄이 포함되어 있으면 해당 날짜의 **모든 항목**을 추출하세요
- 문서 안에 여러 날짜/이벤트가 나열되어 있으면 질문한 날짜와 일치하는 **모든 이벤트**를 찾으세요
- 예: "11월 4일" 질문 시 문서에서 "11월 4일", "4일", "11/4" 로 표시된 모든 항목 추출
- **제품명 검색**: 사용자가 제품 이름을 물으면, 문서 내용에서 유사한 이름을 찾으세요
  * "H건강플러스" 검색 시 → "(일반/간편) H건강플러스", "H건강플러스상품", "간편 H건강플러스" 등 모두 매칭
  * 정확한 제품명이 없으면 "찾을 수 없습니다"라고 하지 말고, 문서에서 유사한 제품을 찾아 안내하세요

1. 완전성이 최우선: 검색된 모든 관련 항목을 빠짐없이 나열하세요. 절대 축약하거나 생략하지 마세요.
2. 항목 개수 명시: 응답 시작 시 총 몇 개 항목인지 명시하세요 (예: "총 5개 행사가 있습니다")
3. 문서 내 검색: 하나의 문서에 여러 이벤트가 있으면 날짜로 필터링하여 모두 추출하세요.
4. 검색 결과가 없으면 솔직하게 알려주세요.

{formatting_instructions}

답변 형식 예시:
안녕하세요. HO&F 지사 AI입니다.

11월 4일 행사는 총 3개입니다.

1. IM라이프 위촉링크 발송
   기간: 2025년 11월 4일 ~ 11월 6일
   유형: 모집 행사

2. KB라이프 채용 프로모션
   기간: 2025년 11월 4일 ~ 11월 30일
   지원금: 500,000원

3. 신입 FC 교육 오리엔테이션
   날짜: 2025년 11월 4일
   시간: 오전 10시
   장소: 본사 5층

답변을 시작하세요:
"""

    elif question_type == 'single':
        # USER WANTS JUST ONE ITEM
        prompt = f"""당신은 HO&F 지사 AI입니다. 사용자가 하나의 항목만 요청했습니다.

사용자 질문:
{user_query}

검색된 관련 정보 (최대 10개 문서):
{context}

**핵심 지침:**
1. 가장 관련성 높은 하나의 항목만 선택하세요.
2. 선택 이유를 간단히 설명하세요.
3. 다른 옵션이 있다면 간략히 언급하세요.

{formatting_instructions}

답변을 시작하세요:
"""

    else:  # explanation or default
        # USER WANTS EXPLANATION OR GENERAL ANSWER
        prompt = f"""당신은 HO&F 지사 AI입니다. 아래 검색된 정보를 바탕으로 사용자 질문에 정확하고 친절하게 답변하세요.

사용자 질문:
{user_query}

검색된 관련 정보 (최대 10개 문서):
{context}

**핵심 지침:**
1. 정확성: 검색된 정보만을 사용하여 답변하세요.
2. 관련성: 질문과 직접 관련된 정보를 선택하세요.
3. 구조화: 이해하기 쉽게 정리하세요.
4. 친절함: 존댓말을 사용하세요.

{formatting_instructions}

{commission_instructions}

답변을 시작하세요:
"""

    response = genai_client.models.generate_content(
        model='gemini-flash-latest',  # Use Gemini Flash for speed
        contents=prompt
    )
    return response.text


def rag_answer(user_query: str, top_k: int = 10) -> str:
    """
    Complete RAG pipeline - returns just the answer string for API use.

    Args:
        user_query: User's question
        top_k: Number of documents to retrieve (default: 10)

    Returns:
        str: Final answer from Gemini 2.5 Pro
    """
    try:
        print(f"\n🔍 RAG Query: {user_query}")

        # Step 1: Load metadata and enhance query
        print("🔄 Step 1: Gemini Flash로 쿼리 최적화 중...")
        metadata_key = load_metadata_key()
        gemini_flash_output = enhance_query_with_gemini_flash(user_query, metadata_key)

        print(f"   ✅ 최적화된 쿼리: {gemini_flash_output['enhanced_query']}")
        if gemini_flash_output['filters']:
            print(f"   🎯 필터: {json.dumps(gemini_flash_output['filters'], ensure_ascii=False)}")

        # Step 2: Retrieve from Pinecone (retrieve top 10 for AI to choose from)
        print(f"🔍 Step 2: Pinecone에서 관련 정보 검색 중 (namespace: {NAMESPACE}, top {top_k})...")
        results = retrieve_from_pinecone(
            gemini_flash_output['enhanced_query'],
            gemini_flash_output['filters'],
            top_k=top_k
        )

        print(f"   ✅ {len(results.matches)}개 문서 검색 완료")

        # Fallback: If no results with filters, retry without filters (pure semantic search)
        if len(results.matches) == 0 and gemini_flash_output['filters'] is not None:
            print(f"   ⚠️ 필터 적용 결과 0개 - 필터 없이 재검색 중...")
            results = retrieve_from_pinecone(
                gemini_flash_output['enhanced_query'],
                filters=None,  # No filters, pure semantic search
                top_k=top_k
            )
            print(f"   ✅ 재검색 완료: {len(results.matches)}개 문서 검색 완료 (순수 시맨틱 검색)")

        # Check relevance scores - if all results have low scores, ask for more specific query
        RELEVANCE_THRESHOLD = 0.3  # Threshold for considering results relevant
        if results.matches:
            max_score = max(match.score for match in results.matches)
            print(f"   📊 최고 관련도 점수: {max_score:.3f}")

            # Check for generic greetings or inappropriate queries
            low_quality_keywords = ['hey', 'hi', 'hello', '안녕', '하이', '욕', '씨발', '개새', '병신', 'fuck', 'shit']
            is_low_quality = any(keyword in user_query.lower() for keyword in low_quality_keywords)

            if max_score < RELEVANCE_THRESHOLD or (is_low_quality and max_score < 0.5):
                print(f"   ⚠️ 낮은 관련도 감지 또는 부적절한 쿼리")
                import datetime
                from datetime import datetime as dt

                now = dt.now()
                # Format time in Korean style
                weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
                weekday = weekdays[now.weekday()]

                if now.hour < 12:
                    ampm = "오전"
                    hour_12 = now.hour if now.hour != 0 else 12
                else:
                    ampm = "오후"
                    hour_12 = now.hour if now.hour <= 12 else now.hour - 12

                time_str = f"{now.year}년 {now.month}월 {now.day}일 ({weekday}) {ampm} {hour_12}시 {now.minute}분"

                return f"""안녕하세요. HO&F 지사 AI입니다.

현재 시각: {time_str}

질문하신 내용과 관련된 정보를 찾기 어렵습니다.

구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.

예시:
- 11월 워크샵 일정 알려줘
- 삼성화재 프로모션 정보
- 신입 FC 교육 일정
- 환수 규정 알려줘

무엇을 도와드릴까요?"""

        # Format context
        context = format_context_for_gemini(results)

        # Step 3: Generate answer with Gemini 2.5 Pro
        print("💬 Step 3: Gemini 2.5 Pro로 답변 생성 중...")
        answer = generate_answer_with_gemini_pro(user_query, context)

        print(f"   ✅ 답변 생성 완료 (길이: {len(answer)}자)")

        # Step 4: Attach relevant PDFs
        print("📎 Step 4: 관련 PDF 첨부 중...")
        relevant_pdfs = get_relevant_pdfs(user_query, results)
        if relevant_pdfs:
            pdf_attachments = format_pdf_attachments(relevant_pdfs)
            answer += pdf_attachments
            print(f"   ✅ {len(relevant_pdfs)}개 PDF 첨부 완료\n")
        else:
            print(f"   ℹ️  첨부할 PDF 없음\n")

        return answer

    except Exception as e:
        print(f"❌ RAG 오류: {e}")
        return f"죄송합니다. 답변을 생성하는 중 오류가 발생했습니다: {str(e)}"


# For backward compatibility with existing code
def getTextFromGPT_RAG(prompt: str) -> str:
    """
    Wrapper function to replace the old getTextFromGPT function.
    Uses the new RAG pipeline with top 10 results.
    """
    return rag_answer(prompt, top_k=10)
