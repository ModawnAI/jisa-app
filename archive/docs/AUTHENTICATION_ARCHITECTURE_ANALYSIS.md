# JISA Authentication Architecture - Correct Implementation

**Critical Correction Date:** November 13, 2025
**Issue:** Incorrect authentication flow understanding
**Impact:** HIGH - Core user interaction model was wrong

---

## ❌ Previous Incorrect Understanding

### What I Got Wrong

**Assumed Flow (INCORRECT):**
```
End User Flow:
1. Visit https://jisa-app.vercel.app/auth/register
2. Enter email, password, access code
3. Create account on website
4. Login to web dashboard
5. Use web interface
```

**Admin Flow (Partially Correct):**
```
1. Login to admin panel
2. Manage system
```

### Why This Was Wrong

- ❌ End users (보험 영업 직원) DON'T visit the website
- ❌ End users DON'T create accounts on the web
- ❌ End users DON'T have passwords
- ❌ The register page shouldn't exist for end users
- ❌ Web interface is ONLY for administrators

---

## ✅ Correct Architecture

### Two Completely Separate User Types

```
┌─────────────────────────────────────────────────────────────┐
│                     USER TYPE 1                             │
│              보험 영업 직원 (End Users)                      │
│         NEVER visit website, ONLY use KakaoTalk             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     USER TYPE 2                             │
│             모드온 AI 관리자 (Administrators)                │
│         ONLY visit website, manage system via admin panel   │
└─────────────────────────────────────────────────────────────┘
```

### End User Flow (보험 영업 직원) - KakaoTalk Only

```
Step 1: Admin Generates Code
┌──────────────────┐
│  Admin Panel     │
│  Generate Code   │ → Code: "HXK-9F2-M7Q-3WP"
│  Role: senior    │    Tier: pro
│  Tier: pro       │    Created in DB
└──────────────────┘

Step 2: Admin Sends Code via KakaoTalk
┌──────────────────┐
│  Admin sends     │
│  KakaoTalk msg   │ → "귀하의 인증 코드: HXK-9F2-M7Q-3WP"
│  to end user     │    "처음 대화 시 이 코드를 입력해주세요"
└──────────────────┘

Step 3: End User First Message
┌──────────────────┐
│  End User        │
│  (KakaoTalk)     │ → First message: "HXK-9F2-M7Q-3WP"
│  kakao_user_id   │    or "인증: HXK-9F2-M7Q-3WP"
│  = "abc123"      │
└──────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  JISA Backend (POST /api/kakao/chat)     │
│  1. Detect: First-time user              │
│  2. Extract: 인증 코드 from message       │
│  3. Verify: Code exists and not used     │
│  4. Create: Profile with kakao_user_id   │
│     - kakao_user_id: "abc123"            │
│     - role: "senior" (from code)         │
│     - subscription_tier: "pro"           │
│  5. Mark: Code as used                   │
│  6. Respond: "인증 완료! 이제 질문하세요" │
└──────────────────────────────────────────┘

Step 4: Subsequent Messages (All RBAC-Filtered)
┌──────────────────┐
│  End User        │ → "11월 한화생명 시책 알려줘"
│  kakao_user_id   │
│  = "abc123"      │
└──────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  JISA Backend                            │
│  1. Lookup: kakao_user_id in profiles    │
│  2. Found: role=senior, tier=pro         │
│  3. Apply RBAC: Filter content           │
│  4. RAG Search: With access filters      │
│  5. Return: Only content user can access │
└──────────────────────────────────────────┘
```

### Admin Flow (모드온 AI 관리자) - Web Only

```
Step 1: Admin Login
┌──────────────────┐
│  Visit Website   │ → https://jisa-app.vercel.app/auth/login
│  /auth/login     │    Email: admin@modawn.ai
│                  │    Password: [admin password]
└──────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  Supabase Auth                           │
│  Verify credentials                      │
│  Check role = 'admin' or 'ceo'           │
│  Grant access to admin panel             │
└──────────────────────────────────────────┘

Step 2: Admin Dashboard
┌──────────────────┐
│  Admin Panel     │ → /admin/codes/generate
│  - Generate      │   /admin/users
│    인증 코드      │   /admin/logs
│  - View users    │   /admin/billing
│  - View logs     │   /admin/data
│  - Manage system │
└──────────────────┘

Step 3: Generate 인증 코드
┌──────────────────────────────────────────┐
│  /admin/codes/generate                   │
│  Select:                                 │
│    - Role: senior                        │
│    - Tier: pro                           │
│    - Max uses: 1                         │
│  Generate → HXK-9F2-M7Q-3WP             │
│  Copy code                               │
└──────────────────────────────────────────┘

Step 4: Send via KakaoTalk (Outside System)
┌──────────────────┐
│  Admin manually  │
│  sends code to   │ → KakaoTalk direct message
│  end user via    │    "인증 코드: HXK-9F2-M7Q-3WP"
│  KakaoTalk       │
└──────────────────┘
```

---

## 🔄 Database Schema Impact

### profiles Table Purpose (REVISED)

**Two Types of Records:**

**Type 1: Admin Users (Web Login)**
```sql
INSERT INTO profiles (
  id,                    -- Supabase auth.users.id
  email,                 -- admin@modawn.ai
  full_name,             -- "정다운"
  role,                  -- 'admin' or 'ceo'
  subscription_tier,     -- 'enterprise' (admins get full access)
  kakao_user_id,         -- NULL (admins don't use KakaoTalk bot)
  created_at
) VALUES (...);
```

**Type 2: KakaoTalk Users (End Users)**
```sql
INSERT INTO profiles (
  id,                    -- Generated UUID (NOT from Supabase Auth)
  kakao_user_id,         -- "abc123" (KakaoTalk user ID)
  full_name,             -- "홍길동" (from KakaoTalk or code metadata)
  email,                 -- NULL (no email required)
  role,                  -- 'user', 'junior', 'senior', etc. (from 인증 코드)
  subscription_tier,     -- 'free', 'basic', 'pro' (from 인증 코드)
  metadata,              -- { verification_code: "HXK-...", verified_at: "..." }
  created_at
) VALUES (...);
```

**Key Difference:**
- Admins: Have `id` from Supabase Auth, NO `kakao_user_id`
- End Users: Have `kakao_user_id`, `id` is just a UUID

### verification_codes Table Purpose (REVISED)

**Purpose:** Admin-generated codes sent via KakaoTalk

```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,           -- "HXK-9F2-M7Q-3WP"
  role TEXT NOT NULL,                  -- Role to assign when used
  tier TEXT NOT NULL,                  -- Subscription tier to assign
  max_uses INTEGER DEFAULT 1,          -- Usually 1 (single-use)
  current_uses INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',        -- 'active', 'used', 'expired', 'revoked'
  created_by UUID,                     -- Admin who generated it
  used_by TEXT[],                      -- Array of kakao_user_ids who used it
  expires_at TIMESTAMPTZ,
  metadata JSONB,                      -- { purpose: "신규 시니어 직원", notes: "..." }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);
```

**Workflow:**
1. Admin generates code in web panel
2. Code stored in database with role/tier
3. Admin sends code to end user via KakaoTalk (manual)
4. End user sends code in first KakaoTalk message
5. Backend verifies and creates profile
6. Code marked as used

---

## 🔧 Required Implementation Changes

### 1. KakaoTalk Webhook Handler (CRITICAL UPDATE)

**Current Implementation (app/api/kakao/chat/route.ts) - WRONG:**
```typescript
export async function POST(request: NextRequest) {
  const data: KakaoRequest = await request.json();
  const userMessage = data.user_message || '';
  const userId = data.user_id;  // This is kakao_user_id, NOT Supabase user ID!

  // Directly processes message - NO AUTHENTICATION!
  const response = await getTextFromGPT(userMessage);

  return NextResponse.json({ ... });
}
```

**Correct Implementation Needed:**
```typescript
export async function POST(request: NextRequest) {
  const data: KakaoRequest = await request.json();
  const userMessage = data.user_message || '';
  const kakaoUserId = data.user.id;  // KakaoTalk user ID
  const kakaoUserName = data.user.properties?.nickname;

  // STEP 1: Check if user exists in our system
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('kakao_user_id', kakaoUserId)
    .single();

  // STEP 2: If no profile, check if message contains 인증 코드
  if (!profile) {
    const codeMatch = userMessage.match(/([A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3})/);

    if (!codeMatch) {
      // No profile and no code - instruct user
      return NextResponse.json({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '안녕하세요! JISA 챗봇입니다.\n\n처음 사용하시는 분은 관리자로부터 받은 인증 코드를 입력해주세요.\n\n예: HXK-9F2-M7Q-3WP'
            }
          }],
          quickReplies: []
        }
      });
    }

    // Found code - verify it
    const code = codeMatch[1];
    const { data: verificationCode, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'active')
      .single();

    if (codeError || !verificationCode) {
      return NextResponse.json({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '❌ 유효하지 않은 인증 코드입니다.\n\n관리자에게 새로운 코드를 요청해주세요.'
            }
          }],
          quickReplies: []
        }
      });
    }

    // Check if code already used
    if (verificationCode.current_uses >= verificationCode.max_uses) {
      return NextResponse.json({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '❌ 이미 사용된 인증 코드입니다.\n\n관리자에게 새로운 코드를 요청해주세요.'
            }
          }],
          quickReplies: []
        }
      });
    }

    // STEP 3: Create profile for KakaoTalk user
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        kakao_user_id: kakaoUserId,
        full_name: kakaoUserName || '사용자',
        role: verificationCode.role,
        subscription_tier: verificationCode.tier,
        metadata: {
          verification_code: code,
          verified_at: new Date().toISOString(),
          kakao_nickname: kakaoUserName
        }
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: '❌ 인증 처리 중 오류가 발생했습니다.\n\n잠시 후 다시 시도해주세요.'
            }
          }],
          quickReplies: []
        }
      });
    }

    // STEP 4: Mark code as used
    await supabase
      .from('verification_codes')
      .update({
        current_uses: verificationCode.current_uses + 1,
        status: verificationCode.current_uses + 1 >= verificationCode.max_uses ? 'used' : 'active',
        used_at: new Date().toISOString(),
        used_by: [...(verificationCode.used_by || []), kakaoUserId]
      })
      .eq('code', code);

    // STEP 5: Welcome message
    const tierName = { free: 'Free', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' }[verificationCode.tier];
    const roleName = { user: '사용자', junior: '주니어', senior: '시니어', manager: '매니저', admin: '관리자', ceo: 'CEO' }[verificationCode.role];

    return NextResponse.json({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: `✅ 인증 완료!\n\n역할: ${roleName}\n등급: ${tierName}\n\n이제 JISA에게 질문하실 수 있습니다.\n예: "11월 교육 일정 알려줘" 또는 "한화생명 종신보험 수수료"`
          }
        }],
        quickReplies: [{
          action: 'message',
          label: '11월 일정 📅',
          messageText: '11월 교육 일정 알려줘'
        }, {
          action: 'message',
          label: '수수료 조회 💰',
          messageText: '한화생명 종신보험 수수료'
        }]
      }
    });
  }

  // STEP 6: User exists - process normal chat with RBAC
  const response = await getTextFromGPT(userMessage, profile.id);  // Use profile.id for RBAC

  // Log the query
  await logQuery({
    userId: profile.id,
    kakaoUserId: kakaoUserId,
    queryText: userMessage,
    responseText: response,
    responseTime: Date.now() - startTime,
  });

  return NextResponse.json({
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: response } }],
      quickReplies: []
    }
  });
}
```

### Admin Flow (모드온 AI 관리자) - Web Only

```
Step 1: Admin Login (Web)
┌──────────────────────────────────────────┐
│  https://jisa-app.vercel.app/auth/login  │
│                                          │
│  Email: admin@modawn.ai                  │
│  Password: [secure password]             │
│                                          │
│  → Supabase Auth verifies                │
│  → Check profile.role = 'admin' or 'ceo' │
│  → Grant access to /admin/*              │
└──────────────────────────────────────────┘

Step 2: Generate 인증 코드 (Web)
┌──────────────────────────────────────────┐
│  /admin/codes/generate                   │
│                                          │
│  Role: [dropdown] senior                 │
│  Tier: [dropdown] pro                    │
│  Expires: [date] 2025-12-31              │
│  Max Uses: [number] 1                    │
│  Notes: "신규 시니어 영업사원"           │
│                                          │
│  [Generate Code] → HXK-9F2-M7Q-3WP      │
│  [Copy to Clipboard]                     │
└──────────────────────────────────────────┘

Step 3: Send Code (Outside System)
┌──────────────────────────────────────────┐
│  Admin opens KakaoTalk on their phone    │
│  Sends direct message to end user:       │
│                                          │
│  "안녕하세요, JISA 챗봇 인증 코드입니다:  │
│   HXK-9F2-M7Q-3WP                        │
│                                          │
│   JISA 챗봇 채널을 추가하시고            │
│   첫 메시지로 이 코드를 입력해주세요."    │
└──────────────────────────────────────────┘

Step 4: Monitor Usage (Web)
┌──────────────────────────────────────────┐
│  /admin/codes                            │
│  View all codes:                         │
│    - HXK-9F2-M7Q-3WP: ✅ Used            │
│    - ABC-DEF-GHI-JKL: ⏳ Active          │
│    - XYZ-123-456-789: ❌ Expired         │
│                                          │
│  /admin/users                            │
│  View all KakaoTalk users:               │
│    - kakao_abc123: senior/pro            │
│    - kakao_xyz789: junior/basic          │
└──────────────────────────────────────────┘
```

---

## 📊 Data Model Corrections

### profiles Table Schema Update

**Need to add:**
```sql
ALTER TABLE profiles ADD COLUMN kakao_user_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN kakao_nickname TEXT;
ALTER TABLE profiles ADD COLUMN last_chat_at TIMESTAMPTZ;

-- Make email nullable (KakaoTalk users don't have email)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Index for fast KakaoTalk user lookup
CREATE INDEX idx_profiles_kakao_user_id ON profiles(kakao_user_id);

-- Check constraint: either id from auth OR kakao_user_id required
ALTER TABLE profiles ADD CONSTRAINT check_user_identity
  CHECK (
    (id IN (SELECT id FROM auth.users)) OR
    (kakao_user_id IS NOT NULL)
  );
```

### verification_codes Table Schema Update

**Add tracking fields:**
```sql
ALTER TABLE verification_codes ADD COLUMN used_by TEXT[];  -- Array of kakao_user_ids
ALTER TABLE verification_codes ADD COLUMN kakao_sent_to TEXT;  -- Track who it was sent to
ALTER TABLE verification_codes ADD COLUMN purpose TEXT;  -- "신규 직원", "업그레이드" etc.
```

### query_logs Table Schema Update

**Make user_id nullable, add kakao_user_id:**
```sql
ALTER TABLE query_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE query_logs ADD COLUMN kakao_user_id TEXT;

-- At least one ID required
ALTER TABLE query_logs ADD CONSTRAINT check_query_user
  CHECK (user_id IS NOT NULL OR kakao_user_id IS NOT NULL);
```

---

## 🔍 KakaoTalk Webhook Payload

### What KakaoTalk Sends

```json
{
  "user": {
    "id": "abc123xyz",  // This is the kakao_user_id we need!
    "type": "botUserKey",
    "properties": {
      "nickname": "홍길동",
      "profileImageUrl": "http://..."
    }
  },
  "utterance": "11월 교육 일정 알려줘",  // User message
  "action": {
    "id": "action-id",
    "name": "action-name",
    "params": {},
    "detailParams": {},
    "clientExtra": {}
  },
  "contexts": []
}
```

**Key Fields:**
- `user.id` → This is `kakao_user_id` (use for profile lookup)
- `user.properties.nickname` → Display name
- `utterance` → User message

### Updated Interface

```typescript
interface KakaoWebhookRequest {
  user: {
    id: string;  // kakao_user_id
    type: string;
    properties?: {
      nickname?: string;
      profileImageUrl?: string;
    };
  };
  utterance: string;  // User message
  action?: {
    id: string;
    name?: string;
    params?: Record<string, any>;
  };
  contexts?: any[];
}
```

---

## 🚨 Critical Issues in Current Implementation

### Issue 1: Wrong User Identification

**Current Code (WRONG):**
```typescript
const userId = data.user_id;  // This field doesn't exist in KakaoTalk payload!
```

**Should Be:**
```typescript
const kakaoUserId = data.user.id;  // Correct field from KakaoTalk
```

### Issue 2: No Authentication Flow

**Current:** Webhook accepts any message and processes it
**Problem:** No verification, no access control, everyone gets same results

**Should Have:**
1. First-time user detection
2. 인증 코드 extraction and verification
3. Profile creation with role/tier from code
4. RBAC filtering for all subsequent messages

### Issue 3: RBAC Not Applied

**Current:**
```typescript
const response = await getTextFromGPT(userMessage);  // No userId passed!
```

**Should Be:**
```typescript
const response = await getTextFromGPT(userMessage, profile.id);  // RBAC enabled
```

### Issue 4: Wrong Register Page Purpose

**Current:** `/auth/register` allows anyone to create account
**Problem:** End users should NOT create web accounts

**Should Be:**
- Remove public register page OR
- Make register page admin-only OR
- Change to admin invitation system

---

## 🔄 Authentication Flows Compared

### Flow 1: KakaoTalk User (End User) - PRIMARY FLOW

```
┌─────────────────────────────────────────────────────────┐
│  FIRST TIME USER                                        │
└─────────────────────────────────────────────────────────┘

1. Admin generates code in web panel
   ↓
2. Admin sends code via KakaoTalk: "인증 코드: HXK-9F2-M7Q-3WP"
   ↓
3. User adds JISA chatbot to KakaoTalk
   ↓
4. User sends first message: "HXK-9F2-M7Q-3WP" or "인증: HXK-9F2-M7Q-3WP"
   ↓
5. JISA Backend:
   - Extracts kakao_user_id from webhook
   - No profile found for this kakao_user_id
   - Detects 인증 코드 pattern in message
   - Verifies code in database
   - Creates profile with:
     * kakao_user_id: from webhook
     * role: from code
     * tier: from code
   - Marks code as used
   - Responds: "✅ 인증 완료! 질문하세요"
   ↓
6. User sends query: "11월 일정 알려줘"
   ↓
7. JISA Backend:
   - Looks up profile by kakao_user_id
   - Found: role=senior, tier=pro
   - Applies RBAC filtering
   - Processes with RAG (filtered content)
   - Returns answer
   ↓
8. All subsequent messages use RBAC filtering

┌─────────────────────────────────────────────────────────┐
│  RETURNING USER                                         │
└─────────────────────────────────────────────────────────┘

1. User sends message via KakaoTalk
   ↓
2. Backend:
   - Extracts kakao_user_id
   - Finds existing profile
   - Applies RBAC filtering
   - Processes query
   - Returns filtered answer
```

### Flow 2: Admin User (모드온 AI Staff) - ADMIN FLOW

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN AUTHENTICATION (Web Only)                        │
└─────────────────────────────────────────────────────────┘

1. Admin visits https://jisa-app.vercel.app/auth/login
   ↓
2. Supabase Auth:
   - Email: admin@modawn.ai
   - Password: [secure password]
   - Creates session
   ↓
3. Middleware checks:
   - User authenticated? ✅
   - Profile.role = 'admin' or 'ceo'? ✅
   - Grant access to /admin/*
   ↓
4. Admin uses web interface:
   - Generate 인증 코드
   - View KakaoTalk users
   - View query logs
   - Manage system
   ↓
5. Admin never interacts via KakaoTalk chatbot
   (Different channel - admin panel only)
```

---

## 📋 Required Changes Summary

### 1. Database Migration

**File:** `supabase/migrations/20251113_add_kakao_auth.sql`

```sql
-- Add KakaoTalk user fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kakao_user_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kakao_nickname TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_chat_at TIMESTAMPTZ;

-- Make email nullable (KakaoTalk users don't have email)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Index for KakaoTalk user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_kakao_user_id ON profiles(kakao_user_id);

-- Update verification_codes
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS used_by TEXT[];
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS kakao_sent_to TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Update query_logs
ALTER TABLE query_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;
```

### 2. KakaoTalk Webhook Handler

**File:** `app/api/kakao/chat/route.ts`

Needs complete rewrite with:
- ✅ Correct payload parsing (data.user.id)
- ✅ Profile lookup by kakao_user_id
- ✅ First-time user detection
- ✅ 인증 코드 extraction and verification
- ✅ Profile creation with code metadata
- ✅ RBAC-enabled chat processing
- ✅ Proper error messages

### 3. Update Chat Service

**File:** `lib/services/chat.service.ts`

Already has userId parameter - just needs to be used correctly:
```typescript
export async function getTextFromGPT(prompt: string, userId?: string): Promise<string>
```

Usage should be:
```typescript
// userId here is the profile.id (UUID), NOT kakao_user_id
const response = await getTextFromGPT(userMessage, profile.id);
```

### 4. Auth Pages

**File:** `app/auth/register/page.tsx`

Either:
- **Option A:** Remove entirely (admins created by super admin)
- **Option B:** Make admin-only with different flow
- **Option C:** Rename to "Admin Invitation" page

**File:** `app/auth/login/page.tsx`

Update messaging:
```typescript
<p className="mt-1 text-sm text-muted-foreground">
  관리자 계정으로 로그인하세요
</p>
```

Add notice:
```typescript
<div className="mt-4 p-3 bg-accent rounded-lg">
  <p className="text-xs text-accent-foreground">
    💡 일반 사용자는 KakaoTalk 챗봇을 통해 이용하세요.
    관리자만 웹 로그인이 가능합니다.
  </p>
</div>
```

---

## 🎯 Correct Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    END USER JOURNEY                         │
│              (보험 영업 직원 - KakaoTalk Only)               │
└─────────────────────────────────────────────────────────────┘

Admin (Web Panel)
      ↓ Generate Code
   [Database]
   verification_codes
      ↓ Manual Send
   KakaoTalk DM
      ↓ User Receives
End User (KakaoTalk)
      ↓ First Message: "HXK-9F2-M7Q-3WP"
   [POST /api/kakao/chat]
      ├─ No profile found
      ├─ Extract code from message
      ├─ Verify code in DB
      ├─ Create profile:
      │   - kakao_user_id: "abc123"
      │   - role: from code
      │   - tier: from code
      ├─ Mark code as used
      └─ Response: "✅ 인증 완료"
      ↓ Subsequent Message: "11월 일정"
   [POST /api/kakao/chat]
      ├─ Profile found (kakao_user_id)
      ├─ Get role=senior, tier=pro
      ├─ Apply RBAC filters
      ├─ RAG search (filtered)
      └─ Response: [filtered content]

┌─────────────────────────────────────────────────────────────┐
│                   ADMIN JOURNEY                             │
│              (모드온 AI 관리자 - Web Only)                   │
└─────────────────────────────────────────────────────────────┘

Admin
      ↓ Visit Website
   [/auth/login]
      ↓ Supabase Auth
   Email + Password
      ↓ Check Role
   profile.role = 'admin'
      ↓ Access Granted
   [/admin/* Dashboard]
      ├─ /admin/codes/generate → Generate 인증 코드
      ├─ /admin/users → View KakaoTalk users
      ├─ /admin/logs → View query logs
      ├─ /admin/billing → Payment analytics
      └─ /admin/data → Document management
```

---

## 🔐 Security Implications

### Current Issues

1. **No Authentication on KakaoTalk Webhook**
   - Anyone can send messages
   - No user verification
   - No access control
   - All users see all content

2. **Wrong User Identity Model**
   - Using non-existent `user_id` field
   - Not using `kakao_user_id`
   - Can't track individual users

3. **RBAC Not Enforced**
   - RBAC system exists but not used
   - All KakaoTalk users get public content only
   - Defeats purpose of tier system

### Required Fixes

✅ **Proper Authentication:**
- First message must contain 인증 코드
- Verify code before creating profile
- Associate kakao_user_id with role/tier

✅ **Access Control:**
- All queries filtered by user's role/tier
- Document access based on RBAC
- Usage tracking per user

✅ **Audit Trail:**
- Log all 인증 코드 usage
- Track which kakao_user_id used which code
- Monitor query patterns per user

---

## 📱 KakaoTalk Integration Details

### Webhook URL Configuration

**Current Setup (if exists):**
```
KakaoTalk Business Channel Settings
→ Smart Chatbot
  → Webhook URL: https://your-python-server:8000/
```

**Should Update To:**
```
KakaoTalk Business Channel Settings
→ Smart Chatbot
  → Webhook URL: https://jisa-app.vercel.app/api/kakao/chat
  → Method: POST
  → Response Timeout: 5 seconds
```

### Message Format

**KakaoTalk sends:**
```json
POST /api/kakao/chat
{
  "user": {
    "id": "kakao_abc123xyz",  // Unique KakaoTalk user ID
    "type": "botUserKey",
    "properties": {
      "nickname": "홍길동",
      "profileImageUrl": "..."
    }
  },
  "utterance": "HXK-9F2-M7Q-3WP",  // First message with code
  "action": { ... },
  "contexts": []
}
```

**JISA responds:**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [{
      "simpleText": {
        "text": "✅ 인증 완료!\n\n역할: 시니어\n등급: Pro\n\n이제 질문하실 수 있습니다."
      }
    }],
    "quickReplies": [{
      "action": "message",
      "label": "11월 일정 📅",
      "messageText": "11월 교육 일정 알려줘"
    }]
  }
}
```

---

## 🎓 User Experience Flow

### End User Perspective (보험 영업 직원)

```
Day 1: Onboarding
-----------------
09:00 - Manager gives me JISA chatbot access
      - "KakaoTalk에서 'JISA' 채널 추가하세요"
      - "인증 코드: HXK-9F2-M7Q-3WP"

09:05 - I add JISA chatbot on KakaoTalk

09:06 - First message: "HXK-9F2-M7Q-3WP"
      - Bot responds: "✅ 인증 완료! 역할: 시니어, 등급: Pro"

09:10 - Ask question: "11월 교육 일정"
      - Bot responds with schedule (I have Pro access)

Day 2: Normal Usage
------------------
10:00 - Ask: "한화생명 종신보험 수수료"
      - Bot responds with commission data

14:30 - Ask: "이번 달 KRS 시험 일정"
      - Bot responds with exam schedule

16:00 - Ask: "고급 영업 전략 자료"
      - Bot responds with senior-level content (I have senior role)

[ I NEVER visit the website ]
[ I NEVER create an account ]
[ All interactions via KakaoTalk ]
```

### Admin Perspective (모드온 AI 관리자)

```
Day 1: Setup
-----------
09:00 - Login to https://jisa-app.vercel.app/auth/login
      - Email: admin@modawn.ai, Password: [secure]

09:05 - Navigate to /admin/codes/generate
      - Create code for new senior employee
      - Role: senior, Tier: pro
      - Generate: HXK-9F2-M7Q-3WP

09:10 - Open KakaoTalk on phone
      - Send code to employee via DM
      - "인증 코드: HXK-9F2-M7Q-3WP"

Day 2: Monitoring
----------------
10:00 - Check /admin/users
      - See new user: kakao_abc123 (senior/pro)
      - Last active: 5 minutes ago

14:00 - Check /admin/logs
      - Review queries from all users
      - Monitor system usage

16:00 - Check /admin/billing
      - Review subscription revenue
      - Track active users by tier

[ I NEVER use KakaoTalk chatbot ]
[ I use web admin panel ]
```

---

## 📊 Correct vs Incorrect Comparison

| Aspect | ❌ Incorrect (Current) | ✅ Correct (Should Be) |
|--------|------------------------|------------------------|
| **End User Access** | Web register page | KakaoTalk only |
| **End User Auth** | Email + password | 인증 코드 via KakaoTalk |
| **User ID** | data.user_id (wrong field) | data.user.id (kakao_user_id) |
| **Profile Creation** | Web form | First KakaoTalk message |
| **RBAC Application** | Not applied | Every KakaoTalk message |
| **Admin Access** | Web login | Web login ✅ (correct) |
| **Code Distribution** | Web form | KakaoTalk DM |
| **User Database** | Supabase Auth users | profiles.kakao_user_id |

---

## 🚀 Implementation Priority

### HIGH Priority (Blocking Production)

1. **Update KakaoTalk Webhook Handler**
   - Fix payload parsing (user.id)
   - Add first-time user detection
   - Add 인증 코드 verification
   - Add profile creation
   - Apply RBAC filtering

2. **Database Migration**
   - Add kakao_user_id columns
   - Make email nullable
   - Update constraints

3. **Testing**
   - Test code verification flow
   - Test RBAC filtering
   - Test user profile creation

### MEDIUM Priority

4. **Update Documentation**
   - Correct auth flow diagrams
   - Update user onboarding guide
   - Clarify admin vs end user paths

5. **UI Updates**
   - Add notice to login page (admin only)
   - Remove or hide register page
   - Update admin code generation UI

### LOW Priority

6. **Enhanced Features**
   - Code expiration handling
   - Multi-use codes (for groups)
   - Code usage analytics
   - Bulk code generation

---

## 🎯 Next Steps

1. **Immediate Action:** Update KakaoTalk webhook handler
2. **Database:** Add kakao_user_id support
3. **Testing:** Verify end-to-end flow
4. **Documentation:** Update all auth-related docs
5. **Deployment:** Test with real KakaoTalk channel

---

## 📝 Summary

**Critical Realization:**

JISA is a **KakaoTalk-first application**, not a web application. The web interface exists ONLY for administrators. End users (보험 영업 직원) interact exclusively via KakaoTalk messenger.

**Authentication Model:**
- **End Users:** No passwords, no web accounts - authenticated via 인증 코드 sent through KakaoTalk
- **Admins:** Email/password login to web panel - manage system and generate codes

**The current implementation is backwards** - it treats the web interface as primary and KakaoTalk as secondary. The correct model is:
- **Primary Interface:** KakaoTalk chatbot (end users)
- **Admin Interface:** Web dashboard (administrators)

**This changes everything about how authentication works.**

---

**Analysis By:** Claude Code (Sonnet 4.5)
**Urgency:** HIGH - Core architecture misunderstanding
**Action Required:** Implement correct KakaoTalk-based authentication
**ETA:** 2-4 hours to implement correctly
