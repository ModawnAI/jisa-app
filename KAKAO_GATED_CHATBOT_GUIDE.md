# JISA Gated KakaoTalk Chatbot - Complete Guide

**System Type:** Gated Public Chatbot with Tiered Access Control
**Platform:** KakaoTalk Messenger
**Backend:** Next.js 15 + Supabase + RBAC
kuixphvkbuuzfezoeyii
---

## 🎯 Core Concept

**JISA is a GATED chatbot:**
- ✅ KakaoTalk channel is PUBLIC (anyone can add it)
- 🔒 But chatbot won't respond without valid verification code
- 🎫 Each code grants specific access level (role + tier)
- 📊 Different users see different knowledge based on their code
- 📈 All interactions tracked in Supabase for analytics

**Think of it as:** A multi-tier knowledge vault where the verification code is the key that unlocks specific levels.

---

## 👥 Two User Types

### Type 1: End Users (보험 영업 직원)
- **Access:** KakaoTalk ONLY
- **Authentication:** Verification code (인증 코드)
- **Interface:** KakaoTalk messenger
- **Actions:** Ask questions, get filtered answers
- **Never:** Visit website, create account, use email/password

### Type 2: Administrators (모드온 AI 관리자)
- **Access:** Web admin panel ONLY
- **Authentication:** Email + password (Supabase Auth)
- **Interface:** https://jisa-app.vercel.app/admin/*
- **Actions:** Generate codes, manage users, view analytics, manage system
- **Never:** Use KakaoTalk chatbot (it's for end users)

---

## 🔐 Gated Access Flow

### Step 1: Admin Generates Code (Web Panel)

```
Admin logs into web panel
↓
Navigates to /admin/codes/generate
↓
Selects:
  - Role: senior (determines content access by hierarchy)
  - Tier: pro (determines subscription level)
  - Expires: 2025-12-31
  - Max Uses: 1 (single-use) or 10 (multi-use for team)
  - Purpose: "신규 시니어 영업사원"
↓
Clicks [Generate Code]
↓
System generates: HXK-9F2-M7Q-3WP
↓
Code saved to database with role=senior, tier=pro
```

**Database Record:**
```sql
INSERT INTO verification_codes (
  code: 'HXK-9F2-M7Q-3WP',
  role: 'senior',
  tier: 'pro',
  status: 'active',
  max_uses: 1,
  current_uses: 0,
  purpose: '신규 시니어 영업사원',
  created_by: [admin_id],
  expires_at: '2025-12-31'
)
```

### Step 2: Admin Sends Code to End User

**Outside the system** (manual process):
- Admin sends code via KakaoTalk DM
- Or via SMS, email, Slack, etc.
- Admin includes instructions:

```
안녕하세요!

JISA 챗봇 이용을 위한 인증 코드입니다:

HXK-9F2-M7Q-3WP

[사용 방법]
1. KakaoTalk에서 "JISA" 채널을 검색하여 추가
2. 첫 메시지로 위 코드를 입력
3. 인증 완료 후 질문하세요

문의: info@modawn.ai
```

### Step 3: User Adds JISA Channel (Public)

```
User opens KakaoTalk
↓
Searches for "JISA" or "지사"
↓
Finds official JISA chatbot channel
↓
Clicks [채널 추가] (Add Channel)
↓
Channel added - ready to chat
```

**Important:** This is a PUBLIC channel - anyone can add it!

### Step 4: First Message = Verification Code (GATED)

**User sends:** `HXK-9F2-M7Q-3WP`

**Backend processes:**
```typescript
POST /api/kakao/chat receives:
{
  user: { id: "kakao_abc123xyz", properties: { nickname: "홍길동" } },
  utterance: "HXK-9F2-M7Q-3WP"
}

Backend logic:
1. Extract kakao_user_id: "kakao_abc123xyz"
2. Check profiles: No profile found for this kakao_user_id
3. Extract code from message: "HXK-9F2-M7Q-3WP"
4. Verify code in database:
   ✅ Code exists
   ✅ Status = 'active'
   ✅ current_uses (0) < max_uses (1)
   ✅ Not expired
5. Create profile:
   - kakao_user_id: "kakao_abc123xyz"
   - kakao_nickname: "홍길동"
   - role: "senior" (from code)
   - subscription_tier: "pro" (from code)
   - metadata: { verification_code: "HXK-...", verified_at: "2025-11-13T..." }
6. Update code:
   - current_uses: 1
   - status: 'used'
   - used_by: ["kakao_abc123xyz"]
   - used_at: NOW()
7. Respond to user
```

**User receives:**
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

### Step 5: User Asks Questions (RBAC-Filtered)

**User sends:** `11월 교육 일정 알려줘`

**Backend processes:**
```typescript
POST /api/kakao/chat receives:
{
  user: { id: "kakao_abc123xyz", properties: { nickname: "홍길동" } },
  utterance: "11월 교육 일정 알려줘"
}

Backend logic:
1. Extract kakao_user_id: "kakao_abc123xyz"
2. Check profiles: ✅ Found profile
   - role: "senior"
   - subscription_tier: "pro"
   - id: [uuid]
3. Call getTextFromGPT(message, profile.id)
   → Chat service checks role/tier
   → Calls ragAnswerWithRBAC(message, profile.id)
   → RAG service builds RBAC filters:
      {
        required_role: { $lte: "senior" },  // senior can see: public, user, junior, senior
        required_tier: { $lte: "pro" }      // pro can see: free, basic, pro
      }
   → Searches Pinecone with filters
   → Returns ONLY content user can access
4. Log query to Supabase
5. Return filtered answer
```

**User receives:**
```
11월 호앤에프지사 일정:

📅 11월 5일 (화) - 한화생명 시책 설명회
   장소: 본사 대강당
   시간: 14:00 - 16:00

📅 11월 12일 (화) - KRS 입문과정 시험
   장소: 교육센터
   시간: 10:00 - 12:00

[etc...]

📚 출처: 24년 호앤에프지사 일정표
```

**Note:** This answer is filtered by role=senior, tier=pro. A junior user with basic tier would get less detailed information.

---

## 🎫 Access Level Matrix

### Role Hierarchy (6 levels)

```
CEO          → Can see: ALL content (executive + confidential + advanced + intermediate + basic + public)
Admin        → Can see: confidential + advanced + intermediate + basic + public
Manager      → Can see: advanced + intermediate + basic + public
Senior       → Can see: intermediate + basic + public
Junior       → Can see: basic + public
User         → Can see: public only
```

### Subscription Tier Hierarchy (4 levels)

```
Enterprise   → Can see: ALL subscription content
Pro          → Can see: pro + basic + free content
Basic        → Can see: basic + free content
Free         → Can see: free content only
```

### Combined Access Control

**Example: Senior + Pro**
- Role: senior → Can access up to "intermediate" level content
- Tier: pro → Can access "pro" subscription features
- Result: Gets intermediate-level content with pro features

**Example: Junior + Basic**
- Role: junior → Can access up to "basic" level content
- Tier: basic → Can access "basic" subscription features
- Result: Gets basic-level content only

**Example: Manager + Enterprise**
- Role: manager → Can access up to "advanced" level content
- Tier: enterprise → Can access all subscription features
- Result: Gets advanced-level content with all features

### Content Classification

**Documents in Pinecone/Supabase are tagged:**
```json
{
  "access_level": "intermediate",  // public, basic, intermediate, advanced, confidential, executive
  "required_role": "senior",       // minimum role required
  "required_tier": "pro",          // minimum tier required
  "content_type": "commission_data",
  "company": "한화생명",
  ...
}
```

---

## 📊 User Journey Examples

### Journey 1: Junior Staff Member (Basic Tier)

**Day 1: Onboarding**
```
10:00 AM - Manager gives code: "JNR-001-002-003"
         Code settings: role=junior, tier=basic

10:05 AM - Adds JISA KakaoTalk channel

10:06 AM - First message: "JNR-001-002-003"
         ← Bot: "✅ 인증 완료! 역할: 주니어, 등급: Basic"

10:10 AM - Asks: "11월 교육 일정"
         ← Bot: Returns basic schedule info (no advanced details)

10:15 AM - Asks: "한화생명 시니어 영업 전략"
         ← Bot: "죄송합니다. 이 정보는 시니어 등급 이상 접근 가능합니다."
              (Content filtered - junior can't see senior content)
```

**Database State:**
```sql
profiles:
  kakao_user_id: "junior_user_123"
  role: "junior"
  subscription_tier: "basic"
  first_chat_at: "2025-11-13 10:06:00"

verification_codes:
  code: "JNR-001-002-003"
  status: "used"
  current_uses: 1
  used_by: ["junior_user_123"]

query_logs:
  - query: "JNR-001-002-003" (verification)
  - query: "11월 교육 일정" (allowed - basic content)
  - query: "한화생명 시니어 영업 전략" (blocked - requires senior role)
```

### Journey 2: Senior Staff Member (Pro Tier)

**Day 1: Onboarding**
```
09:00 AM - CEO gives code: "SNR-PRO-001-XYZ"
         Code settings: role=senior, tier=pro

09:05 AM - Adds JISA channel

09:06 AM - First message: "SNR-PRO-001-XYZ"
         ← Bot: "✅ 인증 완료! 역할: 시니어, 등급: Pro"

09:10 AM - Asks: "11월 교육 일정"
         ← Bot: Returns detailed schedule with senior-level insights

09:15 AM - Asks: "한화생명 시니어 영업 전략"
         ← Bot: Returns full strategy document
              (Content allowed - senior can see intermediate content)

09:20 AM - Asks: "매니저 회의록"
         ← Bot: "죄송합니다. 이 정보는 매니저 등급 이상 접근 가능합니다."
              (Content filtered - senior can't see advanced content)
```

### Journey 3: Unauthorized User (No Code)

**Attempt:**
```
Random person adds JISA channel

Sends: "안녕하세요"
← Bot: "안녕하세요! JISA 챗봇입니다. 👋
       처음 사용하시는 분은 관리자로부터 받은 **인증 코드**를 입력해주세요.
       📝 코드 형식: HXK-9F2-M7Q-3WP"

Sends: "11월 일정 알려줘"
← Bot: "안녕하세요! JISA 챗봇입니다. 👋
       처음 사용하시는 분은 관리자로부터 받은 **인증 코드**를 입력해주세요."
       (Same message - no answer without code)

Sends: "ABC-123-456-789" (fake code)
← Bot: "❌ 유효하지 않은 인증 코드입니다.
       관리자에게 정확한 코드를 확인해주세요."

Result: User CANNOT access JISA without valid code
```

---

## 🔄 Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN GENERATES CODE                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
         [Web Panel: /admin/codes/generate]
         Select: role=senior, tier=pro, max_uses=1
         Generate → "SNR-PRO-001-XYZ"
         Save to verification_codes table
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            ADMIN SENDS CODE TO END USER                     │
│            (Manual - via KakaoTalk DM)                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│          END USER ADDS PUBLIC JISA CHANNEL                  │
└─────────────────────────────────────────────────────────────┘
         KakaoTalk → Search "JISA" → Add Channel
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              FIRST MESSAGE = CODE (GATE)                    │
└─────────────────────────────────────────────────────────────┘
   User sends: "SNR-PRO-001-XYZ"
                         ↓
            [POST /api/kakao/chat]
         Extract: kakao_user_id = "kakao_abc123"
         Check profiles: NOT FOUND (first time)
         Extract code: "SNR-PRO-001-XYZ"
         Verify code: ✅ Valid, active, not expired
         Create profile:
           - kakao_user_id: "kakao_abc123"
           - role: "senior" (from code)
           - tier: "pro" (from code)
         Update code: status='used', used_by=['kakao_abc123']
         Response: "✅ 인증 완료! 역할: 시니어, 등급: Pro"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           SUBSEQUENT MESSAGES (RBAC-FILTERED)               │
└─────────────────────────────────────────────────────────────┘
   User sends: "11월 교육 일정"
                         ↓
            [POST /api/kakao/chat]
         Extract: kakao_user_id = "kakao_abc123"
         Check profiles: ✅ FOUND (role=senior, tier=pro)
         Update: last_chat_at = NOW()
         Process query:
           → getTextFromGPT(message, profile.id)
           → ragAnswerWithRBAC(message, userId)
           → Build RBAC filters:
              { required_role: { $lte: "senior" },
                required_tier: { $lte: "pro" } }
           → Search Pinecone WITH filters
           → Return ONLY content user can access
         Log to Supabase: query_logs, analytics_events
         Response: [Filtered answer based on senior/pro access]
                         ↓
         User receives answer customized to their access level
```

---

## 🛡️ Security & Access Control

### Gate 1: Code Verification (First Message)

**Without valid code:**
- ❌ Cannot use chatbot
- ❌ No answers provided
- ❌ Repeated requests get same "enter code" message
- ❌ Invalid codes rejected immediately

**With valid code:**
- ✅ Profile created with specific role/tier
- ✅ Access granted to chatbot
- ✅ Answers filtered by access level
- ✅ All queries logged

### Gate 2: RBAC Filtering (Every Message)

**Every query is filtered:**
```typescript
// Pinecone metadata filtering
{
  required_role: { $lte: userRole },      // User's role must be >= content's required_role
  required_tier: { $lte: userTier }       // User's tier must be >= content's required_tier
}
```

**Example Scenarios:**

**User: role=junior, tier=basic**
```
Query: "11월 일정"
→ Search filter: required_role <= "junior" AND required_tier <= "basic"
→ Results: Only public and basic content
→ Answer: Basic schedule without strategic details
```

**User: role=senior, tier=pro**
```
Query: "11월 일정"
→ Search filter: required_role <= "senior" AND required_tier <= "pro"
→ Results: Public, basic, intermediate content + pro features
→ Answer: Detailed schedule with strategic insights
```

**User: role=manager, tier=enterprise**
```
Query: "11월 일정"
→ Search filter: required_role <= "manager" AND required_tier <= "enterprise"
→ Results: All content except executive-level
→ Answer: Comprehensive schedule with management insights
```

### Gate 3: Content Classification

**When documents are uploaded:**
```typescript
Admin uploads document → /admin/data/upload
↓
Set access controls:
  - Access Level: "intermediate" (content sensitivity)
  - Required Role: "senior" (minimum role)
  - Required Tier: "pro" (minimum subscription)
↓
Document chunked and stored in Pinecone with metadata:
{
  access_level: "intermediate",
  required_role: "senior",
  required_tier: "pro",
  ...
}
↓
Only users with role >= senior AND tier >= pro can retrieve this content
```

---

## 📊 Admin Dashboard Features

### /admin/codes/generate - Code Generation

**Purpose:** Create verification codes for new users

**UI:**
```
┌────────────────────────────────────────┐
│  Generate Verification Code            │
├────────────────────────────────────────┤
│  Role: [Dropdown]                      │
│    ○ User                              │
│    ○ Junior                            │
│    ● Senior                            │
│    ○ Manager                           │
│    ○ Admin                             │
│    ○ CEO                               │
│                                        │
│  Tier: [Dropdown]                      │
│    ○ Free                              │
│    ○ Basic                             │
│    ● Pro                               │
│    ○ Enterprise                        │
│                                        │
│  Max Uses: [1]                         │
│  Expires: [2025-12-31]                 │
│  Purpose: [신규 시니어 영업사원]         │
│                                        │
│  [Generate Code]                       │
└────────────────────────────────────────┘

Generated Code: SNR-PRO-001-XYZ
[Copy to Clipboard] [Send via KakaoTalk] [Download QR]
```

### /admin/codes - Code Management

**Purpose:** View and manage all verification codes

**Table View:**
```
┌─────────────────┬────────┬───────┬────────┬──────────┬────────────────┐
│ Code            │ Role   │ Tier  │ Status │ Uses     │ Used By        │
├─────────────────┼────────┼───────┼────────┼──────────┼────────────────┤
│ SNR-PRO-001-XYZ │ senior │ pro   │ used   │ 1/1      │ kakao_abc123   │
│ JNR-BAS-002-ABC │ junior │ basic │ active │ 0/1      │ -              │
│ MGR-ENT-003-DEF │ manager│ enter │ active │ 3/10     │ kakao_xyz, ... │
│ OLD-CODE-004-GH │ senior │ pro   │ expired│ 0/1      │ -              │
└─────────────────┴────────┴───────┴────────┴──────────┴────────────────┘

Filters: [All Status] [All Roles] [All Tiers] [Show Expired: No]
Actions: [Revoke] [Extend Expiration] [Export]
```

### /admin/users - KakaoTalk User Management

**Purpose:** View all KakaoTalk users and their access

**Table View:**
```
┌───────────────────┬────────────┬────────┬───────┬─────────────┬────────────┐
│ KakaoTalk ID      │ Nickname   │ Role   │ Tier  │ First Chat  │ Last Chat  │
├───────────────────┼────────────┼────────┼───────┼─────────────┼────────────┤
│ kakao_abc123      │ 홍길동     │ senior │ pro   │ 2025-11-01  │ 2 min ago  │
│ kakao_xyz789      │ 김영희     │ junior │ basic │ 2025-11-05  │ 1 hour ago │
│ kakao_def456      │ 박철수     │ manager│ enter │ 2025-10-15  │ 1 day ago  │
└───────────────────┴────────────┴────────┴───────┴─────────────┴────────────┘

Stats:
  Total KakaoTalk Users: 245
  Active (7 days): 180
  By Role: junior=120, senior=90, manager=30, admin=5
  By Tier: free=80, basic=100, pro=50, enterprise=15
```

### /admin/logs - Query Logs

**Purpose:** Monitor all chatbot interactions

**Log View:**
```
┌────────────┬───────────────┬──────────────────────┬──────────┬──────────┐
│ Time       │ User          │ Query                │ Type     │ Response │
├────────────┼───────────────┼──────────────────────┼──────────┼──────────┤
│ 2 min ago  │ 홍길동(senior)│ 11월 교육 일정       │ RAG      │ 2.3s     │
│ 5 min ago  │ 김영희(junior)│ 한화생명 수수료      │ Commis.  │ 1.1s     │
│ 10 min ago │ 박철수(mgr)   │ 시니어 전략 문서     │ RAG      │ 3.1s     │
└────────────┴───────────────┴──────────────────────┴──────────┴──────────┘

Filters: [All Roles] [All Tiers] [Last 7 days] [Query Type: All]
Search: [________________________] [Search]
```

---

## 🚀 Implementation Checklist

### ✅ Completed

- [x] Database migration (kakao_user_id columns)
- [x] KakaoTalk webhook handler (gated flow)
- [x] Code verification logic
- [x] Profile creation on first message
- [x] RBAC filtering integration
- [x] Analytics logging (kakao_user_id tracking)
- [x] Documentation (this guide + architecture analysis)

### ⏳ Pending

- [ ] Apply database migration to Supabase
- [ ] Test with real KakaoTalk channel
- [ ] Verify RBAC filtering works correctly
- [ ] Test different role/tier combinations
- [ ] Monitor analytics data collection
- [ ] Create admin guide for code management

---

## 🧪 Testing Guide

### Test Scenario 1: First-Time User (Happy Path)

**Setup:**
1. Admin generates code: `TEST-001-002-003` (role=senior, tier=pro)
2. Use KakaoTalk test account

**Test Steps:**
```
1. Add JISA channel
2. Send: "안녕하세요"
   Expected: "인증 코드를 입력해주세요"

3. Send: "TEST-001-002-003"
   Expected: "✅ 인증 완료! 역할: 시니어, 등급: Pro"

4. Send: "11월 교육 일정"
   Expected: Schedule response (filtered for senior/pro)

5. Check database:
   - profiles table: New record with kakao_user_id
   - verification_codes: status='used', current_uses=1
   - query_logs: 3 entries (code, first query)
```

### Test Scenario 2: Invalid Code

```
1. Send: "INVALID-CODE-123"
   Expected: "❌ 유효하지 않은 인증 코드입니다"

2. Send: "TEST-001-002-003" (already used)
   Expected: "❌ 이 코드는 더 이상 사용할 수 없습니다. 상태: 이미 사용됨"
```

### Test Scenario 3: RBAC Filtering

```
Setup: Two users with different access levels
  User A: role=junior, tier=basic
  User B: role=senior, tier=pro

Upload document:
  - Content: "고급 영업 전략"
  - Access: required_role=senior, required_tier=pro

Test:
  User A sends: "고급 영업 전략"
  Expected: "이 정보는 시니어 등급 이상 접근 가능합니다" OR empty results

  User B sends: "고급 영업 전략"
  Expected: Full strategy document content
```

### Test Scenario 4: Returning User

```
User (already verified) sends: "한화생명 수수료"

Backend should:
1. Find profile by kakao_user_id ✅
2. NOT ask for code again ✅
3. Process query with RBAC ✅
4. Log to Supabase ✅
5. Return filtered answer ✅
```

---

## 📱 KakaoTalk Channel Setup

### Channel Configuration

**Channel Name:** JISA (or 지사)
**Channel Type:** Smart Chatbot
**Visibility:** Public (검색 가능)
**Welcome Message:**
```
안녕하세요! JISA 챗봇입니다. 👋

보험 영업 지사를 위한 AI 어시스턴트입니다.

처음 사용하시는 분은 관리자로부터 받은
인증 코드를 입력해주세요.

문의: info@modawn.ai
```

**Webhook URL:**
```
Production: https://jisa-app.vercel.app/api/kakao/chat
Development: https://[ngrok-url]/api/kakao/chat
Method: POST
Timeout: 5 seconds
```

**Fallback Messages:**
```
Timeout: "잠시 후 다시 시도해주세요"
Error: "오류가 발생했습니다. 관리자에게 문의하세요"
```

---

## 📈 Analytics & Monitoring

### Tracked Metrics

**User Metrics:**
- Total KakaoTalk users
- Active users (7d, 30d)
- Users by role distribution
- Users by tier distribution
- New verifications per day
- Average queries per user

**Query Metrics:**
- Total queries
- Queries by type (RAG vs Commission)
- Average response time
- Success rate
- Timeout rate
- Queries by role/tier

**Code Metrics:**
- Codes generated
- Codes used
- Codes expired
- Average time from generation to use
- Multi-use code utilization

**Content Metrics:**
- Most accessed documents
- Access denials by content
- Popular query topics
- Content gaps (queries with no results)

### Dashboard Views

**Admin sees:**
- Real-time query feed
- User activity heatmap
- Code usage statistics
- Content access patterns
- System health metrics

---

## 🔒 Security Considerations

### Threat Model

**Threat 1: Unauthorized Access**
- Attack: Random user tries to use chatbot
- Defense: Requires valid verification code
- Result: ❌ Blocked - no useful response

**Threat 2: Code Sharing**
- Attack: User shares their code with others
- Defense: Code max_uses limit, tracking used_by
- Result: ⚠️ Limited - code becomes inactive after max uses

**Threat 3: Code Guessing**
- Attack: Brute force code generation
- Defense: 4-part format (12 chars), rate limiting
- Result: ❌ Infeasible - 36^12 combinations

**Threat 4: Privilege Escalation**
- Attack: Junior user tries to access senior content
- Defense: RBAC filtering on every query
- Result: ❌ Blocked - Pinecone filters prevent access

**Threat 5: Data Exfiltration**
- Attack: User tries to dump all content
- Defense: Rate limiting, query logging, RBAC
- Result: ⚠️ Mitigated - can only access authorized content

### Best Practices

✅ **Code Management:**
- Generate unique codes per user
- Set appropriate expiration dates
- Use single-use codes for sensitive roles
- Monitor code usage patterns
- Revoke suspicious codes

✅ **Access Control:**
- Assign minimum required role/tier
- Review content classifications regularly
- Audit access denials
- Track unusual access patterns

✅ **Monitoring:**
- Alert on multiple failed code attempts
- Monitor query patterns per user
- Track response time anomalies
- Review error logs daily

---

## 🎓 User Onboarding Guide (For Admins)

### How to Onboard New User

**Step 1: Determine Access Level**
```
Ask yourself:
- What role should they have? (junior, senior, manager)
- What subscription tier? (basic, pro, enterprise)
- Do they need temporary or permanent access?
- Should code be single-use or multi-use?
```

**Step 2: Generate Code**
```
1. Login to admin panel: https://jisa-app.vercel.app/auth/login
2. Navigate to: /admin/codes/generate
3. Select role and tier
4. Set expiration (e.g., 30 days, 1 year, never)
5. Set max uses (1 for individual, 10+ for teams)
6. Add purpose note (e.g., "신규 시니어 영업사원 - 홍길동")
7. Click [Generate Code]
8. Copy generated code: HXK-9F2-M7Q-3WP
```

**Step 3: Send Code to User**
```
Via KakaoTalk DM:
"안녕하세요 홍길동님!

JISA 챗봇 사용을 위한 인증 코드입니다:

HXK-9F2-M7Q-3WP

[사용 방법]
1. KakaoTalk에서 'JISA' 검색
2. 채널 추가
3. 첫 메시지로 위 코드 입력
4. 인증 후 자유롭게 질문하세요

💡 예시 질문:
- 11월 교육 일정
- 한화생명 종신보험 수수료
- KRS 시험 준비 자료

문의사항: info@modawn.ai
모드온 AI 드림"
```

**Step 4: Verify User Activation**
```
1. Wait for user to verify (usually within 1 hour)
2. Check /admin/codes - code should show "used" status
3. Check /admin/users - new user should appear
4. Monitor /admin/logs - first queries should appear
```

**Step 5: Monitor Usage**
```
Regular checks:
- User's query activity (daily/weekly)
- Content access patterns
- Any access denials (might need tier upgrade)
- Response quality feedback
```

---

## 🆘 Troubleshooting

### Issue: User says code doesn't work

**Diagnosis:**
```sql
-- Check code status
SELECT code, status, current_uses, max_uses, expires_at
FROM verification_codes
WHERE code = 'HXK-9F2-M7Q-3WP';
```

**Common Causes:**
- Code already used (status='used')
- Code expired (expires_at < NOW())
- Code typo (user entered wrong code)
- Code revoked (status='revoked')

**Solution:**
- Generate new code
- Check user's KakaoTalk messages for typos
- Verify code was sent correctly

### Issue: User says they can't see certain content

**Diagnosis:**
```sql
-- Check user's access level
SELECT kakao_user_id, role, subscription_tier
FROM profiles
WHERE kakao_user_id = 'kakao_abc123';

-- Check document requirements
SELECT title, access_level, required_role, required_tier
FROM documents
WHERE title LIKE '%[query topic]%';
```

**Common Causes:**
- User's role too low (junior trying to access senior content)
- User's tier too low (basic trying to access pro content)
- Content properly restricted (working as intended)

**Solution:**
- Upgrade user's code if appropriate 
- Explain access limitations
- Review content classification if incorrect

### Issue: User says bot isn't responding

**Diagnosis:**
```sql
-- Check if user is verified
SELECT * FROM profiles WHERE kakao_user_id = 'kakao_abc123';

-- Check recent queries
SELECT * FROM query_logs WHERE kakao_user_id = 'kakao_abc123' ORDER BY timestamp DESC LIMIT 5;

-- Check for errors
SELECT * FROM analytics_events WHERE kakao_user_id = 'kakao_abc123' AND event_type LIKE '%error%';
```

**Common Causes:**
- User not verified (no profile)
- Webhook not configured correctly
- Server error (check logs)
- Timeout (query taking >5s)

**Solution:**
- Ask user to resend verification code
- Check server logs
- Verify webhook URL in KakaoTalk console
- Test with simple query first

---

## 📚 Summary

**JISA = Gated KakaoTalk Chatbot with Tiered Access**

**For End Users:**
1. Add public JISA channel on KakaoTalk
2. First message = verification code from admin
3. Chatbot responds only after valid code
4. Subsequent queries answered with RBAC filtering
5. Different codes = different knowledge access
6. Never visit website, never create account

**For Admins:**
1. Login to web panel (email/password)
2. Generate codes with specific role/tier
3. Send codes to users (via KakaoTalk DM)
4. Monitor usage via admin dashboard
5. Manage users, view logs, analytics
6. Never use KakaoTalk chatbot (it's for end users)

**Key Innovation:** Public chatbot that enforces tiered access through verification codes - scalable, secure, flexible.

---

## 📈 Implementation Progress

### ✅ Phase 1: Bulk Employee Upload System (COMPLETED)
**Date Completed:** November 17, 2025
**Database:** kuixphvkbuuzfezoeyii

**Implemented Features:**
1. **Backend API**
   - ✅ `/api/admin/credentials/bulk-upload` - POST endpoint for CSV processing
   - ✅ `/api/admin/credentials/template` - GET endpoint for template download
   - ✅ CSV parsing with csv-parse library
   - ✅ Comprehensive validation (required fields, tier, role, email format)
   - ✅ Admin authentication check (admin/ceo only)
   - ✅ Duplicate detection via database constraints
   - ✅ Metadata storage pattern for tier/role
   - ✅ Error reporting with row numbers
   - ✅ Partial success handling

2. **Frontend UI** (`/app/admin/credentials/page.tsx`)
   - ✅ Collapsible bulk upload section
   - ✅ Drag-and-drop file upload area
   - ✅ File validation (CSV only)
   - ✅ Template download button
   - ✅ Step-by-step instructions
   - ✅ Upload progress indicator
   - ✅ Detailed success/error feedback
   - ✅ Validation error display with row numbers
   - ✅ List of uploaded employees with tiers
   - ✅ Auto-refresh credentials list and stats after upload

3. **Sample Template**
   - ✅ `/public/templates/employee-upload-template.csv`
   - ✅ 4 Korean sample employees
   - ✅ All fields demonstrated

**Validation Rules:**
- Required: `full_name`, `employee_id`
- Optional: `email`, `phone_number`, `department`, `team`, `position`, `hire_date`, `location`
- Valid tiers: `free`, `basic`, `pro`, `enterprise`
- Valid roles: `user`, `junior`, `senior`, `manager`, `admin`, `ceo`
- Email format validation
- Unique constraints: `employee_id`, `email`

**Testing:**
- Status: Ready for testing
- Guide: `/claudedocs/BULK_UPLOAD_TESTING_GUIDE.md`
- 12 comprehensive test scenarios documented

### ✅ Phase 2: Auto-Code Generation (COMPLETED)
**Date Completed:** November 17, 2025
**Database:** kuixphvkbuuzfezoeyii

**Implemented Features:**
1. **Backend API**
   - ✅ `/api/admin/credentials/generate-codes` - POST endpoint for batch code generation
   - ✅ Automatic code generation for all pending credentials
   - ✅ Code-to-credential linking via `intended_recipient_id`
   - ✅ Tier/role auto-extracted from credential metadata
   - ✅ Duplicate code prevention
   - ✅ Check for existing codes (skip if already generated)
   - ✅ `requires_credential_match: true` for security
   - ✅ Configurable expiration (default 365 days)
   - ✅ Admin authentication check

2. **Frontend UI** (`/app/admin/credentials/page.tsx`)
   - ✅ Generate codes banner (shows when pending > 0)
   - ✅ One-click "Generate Codes for All Pending" button
   - ✅ Confirmation dialog before generation
   - ✅ Progress indicator during generation
   - ✅ Results panel with success message
   - ✅ Detailed results table (employee, ID, code, tier/role)
   - ✅ Copy all codes button (formatted text)
   - ✅ Download CSV button (codes with employee data)
   - ✅ Individual code copy buttons
   - ✅ Dismissible results panel

3. **Code Format**
   - ✅ Format: `XXX-XXX-XXX-XXX` (12 characters, 4 groups)
   - ✅ Character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes similar chars)
   - ✅ Example: `A2C-X9Z-4B3-D7F`

4. **Security Features**
   - ✅ Code-credential linking prevents code sharing
   - ✅ `requires_credential_match` enforces identity verification
   - ✅ Single-use codes (max_uses: 1)
   - ✅ 365-day expiration
   - ✅ Audit trail in metadata

**Complete Workflow:**
1. Upload employees via CSV → Creates pending credentials
2. Click "Generate Codes" → One code per employee
3. Download CSV or copy codes → Distribute to employees
4. Employees paste codes in KakaoTalk → Verified with tier/role access

**Testing:**
- Status: Ready for testing
- Guide: `/claudedocs/PHASE_2_CODE_GENERATION_COMPLETE.md`
- 5 comprehensive test scenarios documented

### ✅ Phase 3: Employee Management Pages (COMPLETED)
**Date Completed:** November 17, 2025

**Implemented Features:**

1. **Employee List Page** (`/admin/employees/page.tsx`)
   - ✅ Stats dashboard (Total, Verified, Pending, With/Without Codes, Active Chatters)
   - ✅ Advanced filtering (status, code status, department, search)
   - ✅ Comprehensive table with all employee data
   - ✅ Quick actions (View Details, Generate Code)
   - ✅ Pagination support
   - ✅ Real-time data updates

2. **Employee Detail Page** (`/admin/employees/[id]/page.tsx`)
   - ✅ Employee information card (name, ID, email, tier, role, department)
   - ✅ Verification status with timestamps
   - ✅ Verification code display with copy/delete
   - ✅ Complete chat history (scrollable)
   - ✅ Chat activity summary
   - ✅ Quick code generation if missing

3. **Backend APIs**
   - ✅ `/api/admin/employees` - List with multi-table joins
   - ✅ `/api/admin/employees/stats` - Dashboard statistics
   - ✅ `/api/admin/employees/[id]` - Employee details
   - ✅ `/api/admin/employees/[id]/chats` - Chat history

**Complete Workflow:**
1. Navigate to `/admin/employees` → View all employees with stats
2. Filter by status, code status, department → Find specific employees
3. Click "View Details" → See comprehensive employee information
4. View chat history → Understand employee engagement
5. Quick actions → Generate code, copy code, delete code

**Data Integration:**
- Multi-table joins (credentials + codes + profiles + chat_logs)
- Real-time aggregation of chat activity
- Tier/role from credential metadata
- Verification status from profiles
- Code status from verification_codes table

**Files Created:** 9 files, ~1,725 lines of code
**Documentation:** `/claudedocs/PHASE_3_EMPLOYEE_MANAGEMENT_COMPLETE.md`

### ✅ Phase 4: Pinecone Data Viewer (COMPLETED)
**Date Completed:** November 17, 2025
**Database:** kuixphvkbuuzfezoeyii

**Implemented Features:**
1. **Backend API**
   - ✅ `/api/admin/data/vector-search` - POST endpoint for semantic search with full metadata
   - ✅ `/api/admin/data/vector-search` - GET endpoint for index statistics
   - ✅ OpenAI embedding generation for queries
   - ✅ Pinecone vector search with RBAC filtering
   - ✅ Supabase context integration
   - ✅ Complete metadata extraction from both sources
   - ✅ Similarity score calculation
   - ✅ Sync status monitoring

2. **Frontend UI** (`/app/admin/data/contexts/page.tsx`)
   - ✅ Pinecone index statistics banner (vectors, dimension, sync status)
   - ✅ Namespace breakdown display
   - ✅ Enhanced semantic search with tier/role filtering
   - ✅ Similarity score visualization (progress bars)
   - ✅ Context detail modal with ALL metadata
   - ✅ Separate Supabase and Pinecone metadata sections
   - ✅ Individual key-value pairs + full JSON views
   - ✅ Real-time sync monitoring
   - ✅ Collapsible metadata sections

3. **Data Integration**
   - Multi-source metadata merging (Supabase + Pinecone)
   - RBAC access level filtering
   - Metadata completeness validation
   - Sync status calculation
   - Health monitoring

**Vector Database Stats:**
- Index: hof-branch-chatbot
- Total Vectors: 398
- Dimension: 3072
- Namespace: hof-knowledge-base-max
- Sync Status: ✅ In sync with Supabase

**Files Enhanced:** 2 files, ~290 lines of code
**Documentation:** `/claudedocs/PHASE_4_PINECONE_VIEWER_COMPLETE.md`

### ⏳ Phase 5: Payment Integration (PENDING)
**Next Step:** Create `/admin/payments` page for subscription management

**Planned Features:**
- Subscription tier management
- Payment history
- Invoice generation
- Usage-based billing

---

**Guide Version:** 1.0
**Last Updated:** November 17, 2025
**Implementation Started:** November 17, 2025
**Maintained By:** 모드온 AI (ModawnAI)
**Support:** info@modawn.ai
