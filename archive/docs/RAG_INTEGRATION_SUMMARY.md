# RAG Chatbot Integration Summary

## ✅ Successfully Completed

The JISA chatbot app has been upgraded with a sophisticated 3-stage RAG (Retrieval-Augmented Generation) pipeline specifically designed for HO&F insurance branch operations.

---

## 🎯 System Architecture

### **3-Stage RAG Pipeline:**

```
User Query (KakaoTalk API)
    ↓
[1] Gemini Flash Latest (Query Enhancement)
    - Analyzes user intent
    - Generates optimized search query
    - Creates Pinecone metadata filters
    - Uses: metadata_key.json (rich insurance domain knowledge)
    ↓
[2] Pinecone Vector Search
    - Retrieves top 4 most relevant documents
    - Applies metadata filters from Stage 1
    - Index: hof-branch-chatbot
    - Namespace: hof-knowledge-base-v2
    ↓
[3] Gemini 2.5 Pro (Final Answer Generation)
    - Synthesizes retrieved context
    - Generates accurate, professional Korean response
    - 300-500 character answers
    ↓
Response (KakaoTalk API)
```

---

## 📦 Files Modified/Created

### **New Files:**
- ✅ `/home/bitnami/archive/context-hub/jisa_app/rag_chatbot.py` - Complete RAG implementation
- ✅ `/home/bitnami/archive/context-hub/jisa_app/metadata_key.json` - Insurance domain metadata

### **Modified Files:**
- ✅ `/home/bitnami/archive/context-hub/jisa_app/app.py` - Integrated RAG chatbot
- ✅ `/home/bitnami/archive/context-hub/jisa_app/requirements.txt` - Added `google-genai`
- ✅ `/home/bitnami/archive/context-hub/jisa_app/.env` - Already has GEMINI_API_KEY

### **System Configuration:**
- ✅ `/etc/systemd/system/jisa-chatbot.service` - Service running on port 9000
- ✅ `/etc/nginx/sites-available/jisa-flowos-work.conf` - Nginx proxy config
- ✅ `/etc/nginx/ssl/jisa-flowos-work.{crt,key}` - SSL certificates

---

## 🔧 Technical Details

### **Models Used:**
- **Query Enhancement:** `gemini-flash-latest` (fast, optimized for metadata filtering)
- **Final Inference:** `gemini-2.5-pro` (high-quality answer generation)
- **Embeddings:** `text-embedding-3-large` (3072 dimensions)

### **API Endpoints:**
- **Production:** `https://jisa.flowos.work/chat/chat/`
- **Local:** `http://localhost:9000/chat/`

### **Environment Variables:**
```bash
OPENAI_API_KEY=sk-proj-...  # For embeddings
GEMINI_API_KEY=AIzaSy...    # For Gemini models
PINECONE_API_KEY=pcsk_...   # For vector search
```

### **Dependencies Installed:**
```
google-genai==1.49.0
tenacity==9.1.2
```

---

## 📊 Metadata Knowledge Base

The `metadata_key.json` file contains rich domain-specific metadata:

### **Insurance Domain:**
- **Companies:** 한화생명, 교보생명, 삼성화재
- **Products:** 23 insurance products (H건강, H간병, 시그니처H암, etc.)
- **Organizations:** 10 branches (KBLP, MIRACLE, 아너스, etc.)
- **People:** 57 key personnel (managers, instructors, representatives)
- **Locations:** 15 locations (서울, 대구, 부산, 엠타워, etc.)

### **Content Categories:**
- **Content Types:** exam, insurance_commission_table, promotion_tier, training_session, etc.
- **Primary Categories:** event, exam, instruction, policy, resource, training
- **Semantic Tags:** agent_compensation, certification, compliance_rule, recruitment, etc.

### **Boolean Flags:**
- is_training, is_exam, is_promotion, is_policy, is_resource
- has_deadline, has_location, has_financial_data, requires_action

---

## 🚀 How It Works

### **Example Query:** "11월 한화생명 프로모션 알려줘"

1. **Stage 1 - Query Enhancement (Gemini Flash):**
   ```json
   {
     "enhanced_query": "한화생명 11월 프로모션 성과비례 지원금",
     "filters": {
       "companies": {"$in": ["한화생명"]},
       "month": {"$eq": "2025-11"},
       "is_promotion": {"$eq": true}
     }
   }
   ```

2. **Stage 2 - Pinecone Retrieval:**
   - Searches with enhanced query + filters
   - Returns top 4 documents with metadata (dates, amounts, products, etc.)

3. **Stage 3 - Answer Generation (Gemini 2.5 Pro):**
   - Receives structured context with all metadata
   - Generates professional Korean response
   - Includes: dates, amounts, products, conditions, deadlines

---

## 🔄 Integration with Existing Code

### **Function Replacement:**
The old `getTextFromGPT()` function now:
1. **First tries:** New RAG pipeline via `rag_answer()`
2. **Fallback:** Old Pinecone method if RAG fails

```python
def getTextFromGPT(prompt):
    try:
        # New RAG chatbot
        answer = rag_answer(prompt, top_k=4)
        return answer
    except Exception as e:
        # Fallback to old method
        pinecone_results = query_pinecone(prompt, top_k=10, rerank_top_n=5)
        # ... old logic
```

---

## 📝 Service Management

### **Check Status:**
```bash
sudo systemctl status jisa-chatbot.service
```

### **Restart Service:**
```bash
sudo systemctl restart jisa-chatbot.service
```

### **View Logs:**
```bash
# Service logs
sudo journalctl -u jisa-chatbot.service -f

# Nginx logs
sudo tail -f /var/log/nginx/jisa-flowos-work-access.log
sudo tail -f /var/log/nginx/jisa-flowos-work-error.log
```

---

## 🧪 Testing

### **Test via Curl:**
```bash
curl -X POST https://jisa.flowos.work/chat/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "utterance": "11월 한화생명 프로모션 알려줘",
      "user": {"id": "test-user"},
      "callbackUrl": null
    }
  }'
```

### **Expected Response:**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [{
      "simpleText": {
        "text": "안녕하세요. HO&F 지사 전문 상담 AI입니다. 11월 한화생명 프로모션에 대해...[상세 정보]"
      }
    }]
  }
}
```

---

## 🎯 Key Benefits

### **1. Intelligent Query Understanding**
- Gemini Flash analyzes user intent
- Generates optimal metadata filters
- Reduces irrelevant results

### **2. Precise Retrieval**
- Rich metadata filtering (products, companies, dates, etc.)
- Boolean flags (is_promotion, has_deadline, etc.)
- Top-k retrieval with high relevance

### **3. High-Quality Answers**
- Gemini 2.5 Pro for final inference
- Structured, professional Korean responses
- Includes sources, dates, amounts, conditions

### **4. Domain-Specific Knowledge**
- 23 insurance products
- 57 key personnel
- 15 locations
- Company-specific policies and promotions

---

## 📋 Current Status

- ✅ **Service Status:** Active and running
- ✅ **Port:** 9000
- ✅ **Domain:** https://jisa.flowos.work/chat/
- ✅ **SSL:** Configured
- ✅ **Nginx:** Proxying correctly
- ✅ **Models:** gemini-flash-latest + gemini-2.5-pro
- ✅ **Fallback:** Old method available if RAG fails

---

## 🔐 Security Notes

- API keys stored in `.env` (not committed to git)
- SSL/TLS enabled with certificates
- CORS configured for jisa.flowos.work
- Cloudflare Real IP configuration enabled

---

## 📚 Related Documentation

- `/home/bitnami/archive/context-hub/jisa_app/DEPLOYMENT_INFO.md` - Server deployment details
- `/home/bitnami/archive/context-hub/jisa_app/MODIFIED/` - Original reference files

---

## 🎉 Summary

The JISA chatbot is now powered by a state-of-the-art 3-stage RAG pipeline:
- **Fast query optimization** with Gemini Flash + metadata
- **Precise retrieval** from Pinecone with rich filtering
- **High-quality answers** from Gemini 2.5 Pro

The system is **production-ready** and accessible at:
**https://jisa.flowos.work/chat/chat/**

---

*Last Updated: 2025-11-07 12:02 UTC*
