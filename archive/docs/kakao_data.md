# KakaoTalk Message & Response Data Structure Documentation

> Complete reference for KakaoTalk Chatbot API request/response payloads in the JISA App

## Table of Contents
- [Request Structure](#request-structure)
- [Response Structure](#response-structure)
- [Callback Mechanism](#callback-mechanism)
- [Code Analysis](#code-analysis)
- [Debug Logging](#debug-logging)

---

## Request Structure

### Inbound Request from KakaoTalk

When a user sends a message to the KakaoTalk chatbot, the backend receives a POST request at `/chat/` (via nginx proxy) with the following JSON structure:

```json
{
  "userRequest": {
    "utterance": "사용자가 입력한 메시지 텍스트",
    "user": {
      "id": "사용자_고유_식별자",
      "properties": {}
    },
    "callbackUrl": "https://callback.kakao.com/v1/..."
  },
  "bot": {
    "id": "봇_고유_식별자",
    "name": "봇_이름"
  },
  "action": {
    "id": "스킬_아이디",
    "name": "스킬_이름",
    "params": {},
    "detailParams": {},
    "clientExtra": {}
  },
  "contexts": []
}
```

### Key Request Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userRequest.utterance` | string | User's message text | `"한화생명 프로모션"` |
| `userRequest.user.id` | string | Unique user identifier | `"u-abc123..."` |
| `userRequest.callbackUrl` | string \| null | Optional callback URL for async responses | `"https://..."` or `null` |
| `bot.id` | string | Bot identifier | `"bot123"` |
| `bot.name` | string | Bot display name | `"JISA Bot"` |
| `action.id` | string | Skill/action ID | `"skill_main"` |
| `action.name` | string | Skill/action name | `"메인스킬"` |
| `contexts` | array | Conversation context (optional) | `[]` |

### Minimal Request (Commonly Used)

In practice, the backend primarily extracts these fields:

```json
{
  "userRequest": {
    "utterance": "사용자 질문",
    "user": {
      "id": "user_id_123"
    },
    "callbackUrl": "https://..." // or null
  }
}
```

**Code Reference:** `app.py:815-817`
```python
utterance = kakaorequest.get("userRequest", {}).get("utterance", "")
callback_url = kakaorequest.get("userRequest", {}).get("callbackUrl", "")
user_id = kakaorequest.get('userRequest', {}).get('user', {}).get('id', 'unknown')
```

---

## Response Structure

### Standard Synchronous Response (v2.0)

When responding immediately (no callback), the backend returns:

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "챗봇 응답 메시지"
        }
      }
    ],
    "quickReplies": []
  }
}
```

**Code Reference:** `app.py:36-49`
```python
def textReponseFormat(bot_message):
    response = {
        "version": "2.0",
        "template": {
            "outputs": [
                {
                    "simpleText": {
                        "text": bot_message
                    }
                }
            ],
            "quickReplies": []
        }
    }
    return response
```

### Response Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `version` | string | API version | Yes (always `"2.0"`) |
| `template.outputs[]` | array | Array of output components | Yes |
| `template.outputs[].simpleText.text` | string | Response message text | Yes |
| `template.quickReplies[]` | array | Optional quick reply buttons | No |

### Quick Replies Example

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "무엇을 도와드릴까요?"
        }
      }
    ],
    "quickReplies": [
      {
        "label": "보험 상품 문의",
        "action": "message",
        "messageText": "보험 상품 알려줘"
      },
      {
        "label": "수수료 조회",
        "action": "message",
        "messageText": "수수료 알려줘"
      }
    ]
  }
}
```

---

## Callback Mechanism

### Asynchronous Processing with Callback

For long-running operations (AI processing, database queries), KakaoTalk provides a callback mechanism:

#### 1. Immediate Acknowledgment Response

```json
{
  "version": "2.0",
  "useCallback": true,
  "data": {
    "text": "질문에 대한 답변을 준비 중입니다. 잠시만 기다려주세요..."
  }
}
```

**Code Reference:** `app.py:825-831`

#### 2. Background Processing

The backend processes the request asynchronously and prepares the final response.

**Code Reference:** `app.py:835`
```python
task = asyncio.create_task(process_callback_response(callback_url, utterance))
```

#### 3. Callback Response Delivery

Once processing completes, send the final response to KakaoTalk's callback URL:

```python
# POST to callbackUrl
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "최종 AI 응답 메시지"
        }
      }
    ],
    "quickReplies": []
  }
}
```

**Code Reference:** `app.py:425-465`
```python
async def send_callback_response(callback_url: str, message: str, max_retries: int = 3):
    response_data = {
        "version": "2.0",
        "template": {
            "outputs": [
                {"simpleText": {"text": message}}
            ],
            "quickReplies": []
        }
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(callback_url, json=response_data) as response:
            if response.status == 200:
                print(f"Callback response sent successfully")
            else:
                print(f"Callback failed with status {response.status}")
```

### Callback Flow Diagram

```
User Message → KakaoTalk → Backend
                              ↓
                    Check callbackUrl?
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              Yes (Async)          No (Sync)
                    │                   │
                    ↓                   ↓
          Return useCallback:true    Process & Return
                    │
                    ↓
          Background Processing
                    │
                    ↓
          POST to callbackUrl
                    │
                    ↓
          User Receives Response
```

---

## Code Analysis

### Request Handling Flow

1. **Webhook Entry Point** (`app.py:748-758`)
   ```python
   @app.post("/")
   async def chat_root(request: Request):
       kakaorequest = await request.json()
       print(json.dumps(kakaorequest, indent=2, ensure_ascii=False))
       return await mainChat(kakaorequest)
   ```

2. **Main Chat Handler** (`app.py:813-850`)
   ```python
   async def mainChat(kakaorequest):
       utterance = kakaorequest.get("userRequest", {}).get("utterance", "")
       callback_url = kakaorequest.get("userRequest", {}).get("callbackUrl", "")

       if callback_url:
           # Async: Return temp response + create background task
           temp_response = {"version": "2.0", "useCallback": True, ...}
           asyncio.create_task(process_callback_response(callback_url, utterance))
           return temp_response
       else:
           # Sync: Process and return directly
           answer = await getTextFromGPT(utterance)
           return textReponseFormat(answer)
   ```

3. **AI Response Generation** (`app.py:65-423`)
   ```python
   async def getTextFromGPT(userMsg):
       # Route to appropriate AI system:
       # 1. Commission System (Gemini) for insurance queries
       # 2. RAG System (3-stage pipeline) for general questions
       # 3. Fallback to old Pinecone method
   ```

### Fields Actually Used in Code

Based on code analysis (`grep "userRequest"`), the backend extracts:

| Field | Usage Location | Purpose |
|-------|----------------|---------|
| `userRequest.utterance` | `app.py:815, 895` | User's question/message |
| `userRequest.callbackUrl` | `app.py:817` | Async callback URL |
| `userRequest.user.id` | `app.py:501` | User identification |

**Other KakaoTalk fields** (bot, action, contexts, etc.) are received but not currently processed.

---

## Debug Logging

### Enable Raw Request Logging

The backend now includes debug logging to capture complete raw requests:

**Added in `app.py:752-756`:**
```python
print("=" * 80)
print("RAW KAKAOTALK REQUEST:")
print(json.dumps(kakaorequest, indent=2, ensure_ascii=False))
print("=" * 80)
```

### View Real Request Data

1. **Start the server in development mode:**
   ```bash
   cd /home/bitnami/archive/context-hub/jisa_app
   npm run dev:api
   ```

2. **Send a test message** via KakaoTalk or curl:
   ```bash
   curl -X POST https://jisa.flowos.work/chat/chat/ \
     -H "Content-Type: application/json" \
     -d '{
       "userRequest": {
         "utterance": "테스트 메시지",
         "user": {"id": "test-user"},
         "callbackUrl": null
       }
     }'
   ```

3. **Check terminal output** to see the complete raw JSON structure.

### Log Output Example

```
================================================================================
RAW KAKAOTALK REQUEST:
{
  "userRequest": {
    "utterance": "한화생명 프로모션",
    "user": {
      "id": "u-abc123def456",
      "properties": {}
    },
    "callbackUrl": "https://callback.kakao.com/v1/callback/xxx"
  },
  "bot": {
    "id": "5f1234567890abcdef",
    "name": "JISA 챗봇"
  },
  "action": {
    "id": "skill_main_action",
    "name": "메인스킬",
    "params": {},
    "detailParams": {},
    "clientExtra": {}
  },
  "contexts": []
}
================================================================================
```

---

## Testing

### Manual Test (Without Callback)

```bash
curl -X POST https://jisa.flowos.work/chat/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "utterance": "한화생명 프로모션 알려줘",
      "user": {"id": "test-user-123"},
      "callbackUrl": null
    }
  }'
```

**Expected Response:**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "한화생명 프로모션에 대한 AI 응답..."
        }
      }
    ],
    "quickReplies": []
  }
}
```

### With Callback (Async)

```bash
curl -X POST https://jisa.flowos.work/chat/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "utterance": "복잡한 질문",
      "user": {"id": "test-user-123"},
      "callbackUrl": "https://your-callback-endpoint.com/callback"
    }
  }'
```

**Immediate Response:**
```json
{
  "version": "2.0",
  "useCallback": true,
  "data": {
    "text": "질문에 대한 답변을 준비 중입니다. 잠시만 기다려주세요..."
  }
}
```

**Callback Delivery:**
Backend will POST final response to the provided `callbackUrl`.

---

## API Version Reference

### KakaoTalk Chatbot API v2.0

This implementation uses **KakaoTalk i Open Builder API v2.0**.

**Official Documentation:**
- [KakaoTalk Chatbot API](https://i.kakao.com/docs/skill-response-format)
- [Callback Guide](https://i.kakao.com/docs/skill-callback)

### Response Format Compatibility

| Version | Support | Notes |
|---------|---------|-------|
| v2.0 | ✅ Full | Current implementation |
| v1.0 | ❌ No | Legacy format (deprecated) |

---

## Additional Response Types (Not Yet Implemented)

KakaoTalk supports various response types beyond `simpleText`:

### Basic Card
```json
{
  "basicCard": {
    "title": "카드 제목",
    "description": "설명",
    "thumbnail": {
      "imageUrl": "https://..."
    },
    "buttons": [
      {
        "action": "webLink",
        "label": "자세히 보기",
        "webLinkUrl": "https://..."
      }
    ]
  }
}
```

### List Card
```json
{
  "listCard": {
    "header": {
      "title": "리스트 제목"
    },
    "items": [
      {
        "title": "항목 1",
        "description": "설명 1"
      },
      {
        "title": "항목 2",
        "description": "설명 2"
      }
    ]
  }
}
```

### Carousel
```json
{
  "carousel": {
    "type": "basicCard",
    "items": [
      { "basicCard": {...} },
      { "basicCard": {...} }
    ]
  }
}
```

---

## Summary

### What Backend Receives (Raw Request)

```json
{
  "userRequest": {
    "utterance": "사용자 메시지",
    "user": {"id": "user_id"},
    "callbackUrl": "https://..." // or null
  },
  "bot": {...},
  "action": {...},
  "contexts": []
}
```

### What Backend Sends (Response)

**Sync:**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [{"simpleText": {"text": "..."}}],
    "quickReplies": []
  }
}
```

**Async (Callback):**
```json
{
  "version": "2.0",
  "useCallback": true,
  "data": {"text": "처리중..."}
}
```
Then later POST final response to `callbackUrl`.

---

## File References

- **Main Handler:** `app.py:748-758` (webhook entry)
- **Main Chat Logic:** `app.py:813-850`
- **Response Formatter:** `app.py:36-49`
- **Callback Sender:** `app.py:425-465`
- **AI Processing:** `app.py:65-423`

---

**Last Updated:** 2025-11-13
**JISA App Version:** Production (context-hub)
