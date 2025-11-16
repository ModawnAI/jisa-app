# KakaoTalk Message Flow - JISA Gated Chatbot

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**System:** JISA Gated KakaoTalk Chatbot with RBAC
**Database:** kuixphvkbuuzfezoeyii (Supabase)

---

## 📨 Message Flow Architecture

### **1. KakaoTalk Webhook Setup**
```
KakaoTalk Server → POST /api/kakao/chat
```
- **Endpoint**: `app/api/kakao/chat/route.ts`
- **Format**: KakaoTalk v2.0 webhook payload
- **Timeout**: 5 seconds (KakaoTalk requirement)
- **Runtime**: Node.js with 30s max duration

### **2. Webhook Payload Structure**
```typescript
{
  userRequest: {
    utterance: "11월 교육 일정 알려줘",  // User's message
    user: {
      id: "kakao_abc123xyz",              // Unique KakaoTalk ID
      properties: { nickname: "홍길동" }
    }
  }
}
```

### **3. Processing Pipeline**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Identification                                │
├─────────────────────────────────────────────────────────────┤
│ Extract: kakao_user_id from webhook                        │
│ Query: profiles table WHERE kakao_user_id = ?              │
│                                                             │
│ ┌──────────────────┬────────────────────────────────────┐  │
│ │ No Profile       │ Has Profile                        │  │
│ ├──────────────────┼────────────────────────────────────┤  │
│ │ → First-time     │ → Verified user                    │  │
│ │ → Request code   │ → Continue to STEP 4               │  │
│ │ → Go to STEP 2   │                                    │  │
│ └──────────────────┴────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Code Verification (First-time users only)          │
├─────────────────────────────────────────────────────────────┤
│ Extract code: HXK-9F2-M7Q-3WP                              │
│                                                             │
│ Validate:                                                   │
│ ✅ Code exists in verification_codes table                  │
│ ✅ status = 'active'                                        │
│ ✅ current_uses < max_uses                                  │
│ ✅ expires_at > NOW() or NULL                               │
│                                                             │
│ If valid → STEP 3                                          │
│ If invalid → Return error message                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Profile Creation (from verification code)          │
├─────────────────────────────────────────────────────────────┤
│ INSERT INTO profiles:                                       │
│   kakao_user_id: "kakao_abc123xyz"                         │
│   role: code.role (e.g., "senior")                         │
│   subscription_tier: code.tier (e.g., "pro")               │
│   metadata: { verification_code, verified_at, ... }        │
│                                                             │
│ UPDATE verification_codes:                                  │
│   current_uses += 1                                         │
│   status = 'used' (if max_uses reached)                    │
│   used_by += [kakao_user_id]                               │
│                                                             │
│ Response: "✅ 인증 완료! 역할: 시니어, 등급: Pro"          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Query Processing (RBAC-Filtered)                   │
├─────────────────────────────────────────────────────────────┤
│ Input: User message + profile.id                           │
│                                                             │
│ 4a. Update timestamp:                                       │
│     UPDATE profiles SET last_chat_at = NOW()               │
│                                                             │
│ 4b. Route to chat service:                                  │
│     getTextFromGPT(message, profile.id)                    │
│                                                             │
│ 4c. Query type detection:                                   │
│     ┌──────────────────┬──────────────────────┐            │
│     │ Commission Query │ RAG Query            │            │
│     ├──────────────────┼──────────────────────┤            │
│     │ "수수료", "%"    │ General questions    │            │
│     │ → Commission DB  │ → Pinecone search   │            │
│     │ → Gemini AI      │ → Gemini AI         │            │
│     └──────────────────┴──────────────────────┘            │
│                                                             │
│ 4d. RBAC Filtering (RAG queries):                          │
│     - Get user's role & tier from profile                  │
│     - Build Pinecone filters:                              │
│       {                                                     │
│         required_role: { $lte: user.role },                │
│         required_tier: { $lte: user.tier }                 │
│       }                                                     │
│     - Search ONLY accessible content                       │
│                                                             │
│ 4e. Generate response with Gemini AI                       │
│                                                             │
│ Timeout handling: 4.5s limit                               │
│ If timeout → Quick reply with retry button                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Logging & Analytics (Non-blocking)                 │
├─────────────────────────────────────────────────────────────┤
│ INSERT INTO query_logs:                                     │
│   user_id, query_text, response_text,                      │
│   query_type, response_time_ms                             │
│                                                             │
│ INSERT INTO analytics_events:                              │
│   event_type: 'query.completed'                            │
│   metadata: { query_type, response_time, success }         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: KakaoTalk Response                                 │
├─────────────────────────────────────────────────────────────┤
│ Return JSON (v2.0 format):                                  │
│ {                                                           │
│   version: "2.0",                                          │
│   template: {                                              │
│     outputs: [{                                            │
│       simpleText: { text: "AI response here..." }         │
│     }],                                                    │
│     quickReplies: [...]  // Optional buttons              │
│   }                                                        │
│ }                                                           │
│                                                             │
│ Status: Always 200 (even on errors)                       │
│ KakaoTalk displays response to user                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Features

### **Gated Access Model**
- ✅ Public channel (anyone can add)
- 🔒 Requires verification code to use
- 🎫 Code determines role + tier
- 📊 Different users see different content

### **RBAC (Role-Based Access Control)**

**6 Roles** (hierarchical):
```
user < junior < senior < manager < admin < ceo
```

**4 Tiers**:
```
free < basic < pro < enterprise
```

**Example**: A "senior/pro" user can see:
- ✅ All content for: public, user, junior, senior
- ✅ All tiers: free, basic, pro
- ❌ Cannot see: manager, admin, ceo content
- ❌ Cannot see: enterprise tier content

### **Access Level Matrix**

| Role | Can Access Roles | Tier | Can Access Tiers |
|------|-----------------|------|------------------|
| user | public, user | free | free |
| junior | public, user, junior | basic | free, basic |
| senior | public → senior | pro | free, basic, pro |
| manager | public → manager | enterprise | free → enterprise |
| admin | public → admin | enterprise | free → enterprise |
| ceo | ALL | enterprise | ALL |

---

## 🔄 Query Routing Intelligence

### **1. Commission Query Detection**
```typescript
// Triggers:
- Contains: "수수료", "%", "커미션"
- Company names: "한화생명", "삼성생명"
- Product types: "종신보험", "변액보험"

// Process:
1. Search MySQL commission database
2. Extract relevant commission data
3. Format with Gemini AI (convert decimals to %)
4. Return formatted response
```

### **2. RAG (General Knowledge) Query**
```typescript
// Triggers:
- Education/training: "교육", "일정", "강의"
- Product info: "상품 설명", "약관"
- General questions: "어떻게", "언제", "무엇"

// Process:
1. Build RBAC filters from user's role/tier
2. Search Pinecone vector database
3. Retrieve ONLY accessible contexts
4. Generate answer with Gemini AI
5. Return contextualized response
```

---

## 📊 Code Verification Flow

### **Code Generation (Admin)**
```typescript
// Admin creates code at /admin/codes/generate
{
  role: 'senior',
  tier: 'pro',
  max_uses: 1,
  expires_at: '2025-12-31',
  purpose: '신규 시니어 영업사원'
}

// System generates: HXK-9F2-M7Q-3WP
// Saved to verification_codes table
```

### **Code Usage (End User)**
```typescript
// User sends code in KakaoTalk
1. Extract code from message
2. Validate in database:
   ✅ Code exists
   ✅ status = 'active'
   ✅ current_uses < max_uses
   ✅ Not expired

3. Create profile with code's role/tier
4. Mark code as used
5. Return success message

// User profile now has:
{
  kakao_user_id: 'kakao_abc123xyz',
  role: 'senior',
  subscription_tier: 'pro'
}
```

---

## ⚡ Performance Optimizations

### **Timeout Management**
```typescript
// KakaoTalk requires response within 5 seconds
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 4500)
);

response = await Promise.race([
  getTextFromGPT(message, profileId),
  timeoutPromise
]);

// If timeout:
return "아직 생각이 끝나지 않았어요. 잠시 후 다시 시도해주세요."
```

### **Non-blocking Operations**
```typescript
// Logging and analytics don't block response
supabase.from('query_logs').insert({...}).then(result => {
  // Handle async
});

supabase.from('analytics_events').insert({...}).then(result => {
  // Handle async
});

// Response returned immediately without waiting
```

### **Efficient RBAC Filtering**
```typescript
// Build filters once, use in Pinecone query
const roleHierarchy = {
  user: 0, junior: 1, senior: 2,
  manager: 3, admin: 4, ceo: 5
};

const tierHierarchy = {
  free: 0, basic: 1, pro: 2, enterprise: 3
};

// Filter: required_role <= user.role
// Only searches accessible content, not entire database
```

---

## 📍 File Locations

### **Core Components**

| Component | Path | Purpose |
|-----------|------|---------|
| **Webhook Handler** | `app/api/kakao/chat/route.ts` | Main KakaoTalk message receiver |
| **Chat Orchestrator** | `lib/services/chat.service.ts` | Routes to Commission/RAG |
| **RAG with RBAC** | `lib/services/rag.service.enhanced.ts` | RBAC-filtered knowledge search |
| **Commission System** | `lib/services/commission.service.ts` | Commission database queries |
| **RBAC Filters** | `lib/services/rbac-filter.service.ts` | Access control logic |
| **Code Verification** | `lib/services/verification.service.ts` | Code validation logic |

### **Database Tables**

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with role/tier |
| `verification_codes` | Access codes for registration |
| `query_logs` | All chat interactions |
| `analytics_events` | System events tracking |
| `contexts` | Knowledge base (synced with Pinecone) |

---

## 🔍 Message Examples

### **Example 1: First-Time User**

**User sends:** `HXK-9F2-M7Q-3WP`

**System Response:**
```
✅ 인증 완료!

👤 역할: 시니어
🎫 등급: Pro

이제 JISA에게 질문하실 수 있습니다.

💡 예시 질문:
• "11월 교육 일정 알려줘"
• "한화생명 종신보험 수수료"
• "이번 주 KRS 시험 일정"

[Button: 11월 일정 📅]
[Button: 수수료 조회 💰]
[Button: KRS 일정 📚]
```

### **Example 2: Commission Query**

**User sends:** `한화생명 종신보험 수수료`

**Processing:**
```
1. Detect: Commission query (수수료)
2. Search: MySQL commission database
3. Extract: Commission rates for 한화생명 종신보험
4. Format: Convert decimals to percentages
5. Generate: Natural language response with Gemini
```

**System Response:**
```
한화생명 종신보험 수수료 정보입니다:

📋 상품명: 한화생명 종신보험
💰 기본 수수료: 45.2%
📈 추가 수수료: 12.5%

* 상품에 따라 차이가 있을 수 있습니다.
```

### **Example 3: RAG Query (RBAC-Filtered)**

**User sends:** `11월 교육 일정 알려줘`

**Processing:**
```
1. Get user profile: role=senior, tier=pro
2. Build RBAC filters:
   - required_role: ≤ senior
   - required_tier: ≤ pro
3. Search Pinecone (ONLY accessible content)
4. Generate answer with context
```

**System Response:**
```
11월 교육 일정입니다:

📅 2025년 11월 5일 (화)
- 보험 상품 교육
- 시간: 14:00 - 17:00
- 장소: 본사 2층 강당

📅 2025년 11월 12일 (화)
- KRS 시험 대비반
- 시간: 10:00 - 18:00
- 장소: 교육센터

자세한 내용은 교육 담당자에게 문의하세요.
```

---

## 🚨 Error Handling

### **Invalid Code**
```
❌ 유효하지 않은 인증 코드입니다.

코드: ABC-DEF-GHI-JKL

관리자에게 정확한 코드를 확인해주세요.
```

### **Code Already Used**
```
❌ 이 코드는 이미 1회 사용되었습니다.

관리자에게 새로운 코드를 요청해주세요.
```

### **Code Expired**
```
❌ 이 코드는 만료되었습니다.

만료일: 2025-10-31

관리자에게 새로운 코드를 요청해주세요.
```

### **Query Timeout**
```
아직 생각이 끝나지 않았어요. 🙍‍♂️

잠시 후 아래 버튼을 눌러주세요 👆

[Button: 생각 다 끝났나요? 🙋‍♂️]
```

### **System Error**
```
❌ 오류가 발생했습니다.

잠시 후 다시 시도해주세요.
문제가 지속되면 관리자에게 문의하세요.

E: info@modawn.ai
```

---

## 📊 Analytics & Logging

### **Query Logs**
Every interaction is logged to `query_logs` table:
```typescript
{
  user_id: UUID,
  kakao_user_id: string,
  query_text: string,
  response_text: string,
  query_type: 'commission' | 'rag',
  response_time_ms: number,
  timestamp: ISO8601
}
```

### **Analytics Events**
System events tracked in `analytics_events`:
```typescript
// User verification
{
  event_type: 'user.verified',
  user_id: UUID,
  metadata: { verification_code, role, tier }
}

// Query completion
{
  event_type: 'query.completed',
  user_id: UUID,
  metadata: { query_type, response_time, success }
}

// Query timeout
{
  event_type: 'query.timeout',
  user_id: UUID,
  metadata: { query }
}
```

---

## 🔐 Security Features

### **1. Gated Access**
- No anonymous queries allowed
- All users must have valid verification code
- Codes are single-use or limited multi-use

### **2. RBAC Enforcement**
- Content filtered by role hierarchy
- Content filtered by tier level
- Users cannot access higher privilege content

### **3. User Tracking**
- All interactions logged with kakao_user_id
- Profiles track first_chat_at and last_chat_at
- Verification codes track used_by array

### **4. Code Security**
- Random 12-character codes (format: XXX-XXX-XXX-XXX)
- Status tracking (active/used/expired/revoked)
- Expiration dates enforced
- Usage limits enforced

---

## 🔧 Configuration

### **Environment Variables**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kuixphvkbuuzfezoeyii.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Gemini AI
GEMINI_API_KEY=...

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=hof-branch-chatbot
PINECONE_ENVIRONMENT=...
```

### **API Limits**
- **KakaoTalk Timeout**: 5 seconds
- **Internal Timeout**: 4.5 seconds (safety margin)
- **Max Duration**: 30 seconds (Vercel limit)
- **Pinecone Search**: Top 10 contexts

---

## 📈 Future Enhancements

### **Planned Features**
1. **Async Callback Support**: Use KakaoTalk callback URL for long queries
2. **Rich Media**: Images, carousel templates, list templates
3. **Voice Input**: Support KakaoTalk voice messages
4. **Multi-language**: English support for international users
5. **Advanced Analytics**: User behavior tracking, popular queries
6. **Smart Suggestions**: Personalized quick replies based on history

### **Performance Improvements**
1. **Caching**: Redis cache for frequent queries
2. **Pre-computation**: Pre-generate answers for common questions
3. **Streaming**: Partial responses for long answers
4. **Load Balancing**: Multiple worker instances

---

## 📞 Support

**Technical Issues:**
- Email: info@modawn.ai
- Admin Panel: https://jisa-app.vercel.app/admin

**Company:**
- 모드온 AI (Modawn AI)
- 벤처기업인증
- CEO: 정다운
- Business Number: 145-87-03354

---

**Document Status:** Complete ✅
**Last Verified:** 2025-11-17
**Maintained By:** 모드온 AI Development Team
