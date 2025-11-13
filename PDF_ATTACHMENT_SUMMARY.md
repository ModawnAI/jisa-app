# PDF Attachment Integration Summary

## Date: 2025-11-08

## Overview
Successfully integrated PDF attachments into RAG chatbot responses. PDFs are automatically attached based on query type and search results.

## PDFs Uploaded to Vercel Blob

### Schedule PDFs:
1. **24년 호앤에프지사 일정표 - 25년 11월.pdf**
   - URL: https://xsctqzbwa1mbabgs.public.blob.vercel-storage.com/pdfs/24-25-11.pdf
   - Description: 2025년 11월 HO&F지사 전체 일정표
   - Attached when: Schedule/training/education queries

2. **HO&F지사 KRS 시간표 - 25011일반직.pdf**
   - URL: https://xsctqzbwa1mbabgs.public.blob.vercel-storage.com/pdfs/hof-krs-25011.pdf
   - Description: KRS 16기 입문과정 상세 시간표
   - Attached when: KRS-specific queries

### Policy PDFs:
3. **11월시책공지_한화생명추가만 (25.10.06.)_Ho&F.pdf**
   - URL: https://xsctqzbwa1mbabgs.public.blob.vercel-storage.com/pdfs/11-251006-hof.pdf
   - Description: 한화생명 11월 시책 공지 (수수료율표 포함)
   - Attached when: Hanwha commission queries

## Implementation Details

### 1. Vercel Blob Upload Module (`vercel_blob_upload.py`)
```python
def upload_pdf_to_blob(pdf_path: str, token: str) -> str:
    """Upload PDF to Vercel Blob storage using REST API."""
    # Sanitize filename
    sanitized_filename = sanitize_blob_filename(filename)
    blob_path = f"pdfs/{sanitized_filename}"

    # Upload using PUT request to Vercel Blob API
    url = f"https://blob.vercel-storage.com/{blob_path}"
    response = requests.put(url, data=file_content, headers=headers)

    return uploaded_url
```

### 2. PDF Configuration (`pdf_urls.json`)
```json
{
  "schedule_pdfs": [
    {
      "name": "24년 호앤에프지사 일정표 - 25년 11월.pdf",
      "url": "https://...",
      "description": "2025년 11월 HO&F지사 전체 일정표",
      "keywords": ["일정", "스케줄", "교육", "시험", "강의"]
    }
  ],
  "policy_pdfs": [...]
}
```

### 3. Smart PDF Attachment Logic
PDFs are attached based on:
- **Query keywords** (일정, 교육, 한화생명, etc.)
- **Search result types** (chunk_type: event_individual, table_cell_commission, etc.)

```python
def get_relevant_pdfs(user_query: str, results) -> list:
    # Check query keywords
    is_schedule_query = any(keyword in user_query for keyword in schedule_keywords)
    is_hanwha_query = any(keyword in user_query for keyword in hanwha_keywords)

    # Check result types
    has_schedule_results = chunk_type in ['event_individual', 'day_summary', 'event_range']
    has_hanwha_results = chunk_type in ['table_cell_commission', ...]

    # Attach relevant PDFs
    if is_schedule_query or has_schedule_results:
        relevant_pdfs.append(schedule_pdf)
    if is_hanwha_query or has_hanwha_results:
        relevant_pdfs.append(policy_pdf)
```

### 4. Response Formatting
```markdown
────────────────────────────────────────────────────────────
📎 **참고 자료**

**2025년 11월 HO&F지사 전체 일정표**
🔗 [PDF 보기](https://xsctqzbwa1mbabgs.public.blob.vercel-storage.com/pdfs/24-25-11.pdf)

**한화생명 11월 시책 공지 (수수료율표 포함)**
🔗 [PDF 보기](https://xsctqzbwa1mbabgs.public.blob.vercel-storage.com/pdfs/11-251006-hof.pdf)
```

## Test Results

### Query: "11월 4일 강의 스케줄"
- **Attached**: 1 PDF (24년 호앤에프지사 일정표)
- **Reason**: Schedule query detected + event_individual results

### Query: "한화생명 레이디H보장보험 종합 익월"
- **Attached**: 1 PDF (한화생명 시책공지)
- **Reason**: Hanwha keyword + table_cell_commission results

### Query: "KRS 16기 일정"
- **Attached**: 2 PDFs (전체 일정표 + KRS 시간표)
- **Reason**: Schedule query + KRS keyword detected

## Benefits

✅ **Automatic PDF attachment** - No manual selection needed
✅ **Context-aware** - Only attaches relevant PDFs
✅ **Multiple PDFs** - Can attach multiple PDFs per query
✅ **Clickable links** - Direct PDF access via Vercel Blob URLs
✅ **Public access** - PDFs are publicly accessible without authentication

## Files Created/Modified

1. `vercel_blob_upload.py` - Blob upload module
2. `pdf_urls.json` - PDF configuration
3. `rag_chatbot.py` - Updated with PDF attachment logic
4. `.env` - Added BLOB_READ_WRITE_TOKEN

## Future Enhancements

- Add more PDFs as they become available
- Track PDF click analytics
- Add PDF preview thumbnails
- Support for other file types (images, Excel, etc.)
