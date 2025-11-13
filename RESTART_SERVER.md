# 🔄 How to Restart the Server

## The Problem
If you're seeing old responses with "정보 업데이트" or "참조 파일", you're running an old version of the server.

## The Solution: Restart

### Step 1: Stop the Current Server
Press `Ctrl+C` in the terminal where the server is running

OR find and kill the process:
```bash
# Find the process
ps aux | grep uvicorn

# Kill it (replace PID with the actual process ID)
kill -9 PID
```

### Step 2: Start the New Server
```bash
cd /home/bitnami/context-hub/kakaotalk_app
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Important**: Use the `--reload` flag so the server auto-restarts on code changes!

### Step 3: Test
Send a test question to verify:
```bash
curl -X POST http://localhost:8000/chat/ \
  -H "Content-Type: application/json" \
  -d '{"userRequest": {"utterance": "인플루언서 마케팅은 어떻게해?"}}'
```

## Expected Response Format

✅ **CORRECT** (New system with Pinecone):
```
목표에 따라 전략이 달라집니다. 직접 DB를 구축해 약 600명의 인플루언서·블로거·인스타 계정을 관리하는 방식이 실무 사례로 제시됩니다...
```
- Under 200 words
- No "정보 업데이트" or "참조 파일"
- Uses Pinecone QA data

❌ **INCORRECT** (Old system with reference.txt):
```
제공하신 참고 문서들에는...

---
📅 정보 업데이트: 2025년 9월 16일
📁 참조 파일: reference.txt
```

## Quick Verification Script

Run this to verify the server is using the new code:
```bash
cd /home/bitnami/context-hub/kakaotalk_app
python -c "
from app import getTextFromGPT
answer = getTextFromGPT('블로그 마케팅은?')
print(answer)
print('\n---')
print('Has old format:', '정보 업데이트' in answer or '참조 파일' in answer)
print('Word count:', len(answer.split()))
"
```

Should show:
- `Has old format: False`
- `Word count: < 200`

## ✅ Your Current Status

I just tested your `app.py` file and it's **working correctly**:
- ✅ Uses Pinecone semantic search
- ✅ Uses pinecone-rerank-v0 reranking  
- ✅ Generates concise Korean answers (<200 words)
- ✅ No old reference format

**You just need to restart the server!** 🚀





