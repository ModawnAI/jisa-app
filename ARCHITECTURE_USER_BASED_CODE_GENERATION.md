# JISA Gated Chatbot - User-Based Code Generation & Information Categorization
## Comprehensive Architecture Design Document

**Document Version:** 1.0
**Date:** November 14, 2025
**System:** JISA KakaoTalk RAG Chatbot
**Scope:** Access Code Generation & Content Classification Enhancements

THIS IS THE SUPABSE DB: kuixphvkbuuzfezoeyii YOU MUST USE THIS!

---

## Executive Summary

### Current State
JISA currently operates as a gated KakaoTalk chatbot where:
- Admins generate **anonymous** verification codes with role/tier assignments
- Codes are distributed manually via KakaoTalk to users
- Users verify with codes on first message (creates profile with assigned role/tier)
- All queries are RBAC-filtered based on role + tier hierarchy

### Enhancement Goals
1. **User-Based Code Generation**: Generate codes linked to specific user credentials
2. **Information Categorization**: Multi-dimensional document tagging for access control
3. **Credential Matching**: Link codes to user profiles with real-world credentials

### Strategic Impact
- **User Management**: Transition from anonymous code distribution to credential-based identity
- **Content Control**: Multi-dimensional classification (role, tier, department, sensitivity)
- **Audit Trail**: Complete tracking from code generation → user verification → content access
- **Scalability**: Support 1000+ users with complex organizational structures

---

## 📊 IMPLEMENTATION STATUS

**Last Updated:** November 14, 2025
**Database:** kuixphvkbuuzfezoeyii (Supabase)

### ✅ Phase 1: Database Schema Enhancement - COMPLETED
**Status:** Migration Successfully Applied
**Completion Date:** November 14, 2025

**What Was Implemented:**
1. ✅ **New Tables Created**
   - `user_credentials` table with full employee identity tracking
   - `credential_verification_log` table for complete audit trail

2. ✅ **Enhanced Existing Tables**
   - `verification_codes`: Added 13 new columns for intended recipient tracking
   - `profiles`: Added 5 new columns for credential linking
   - `documents`: Added 16 new columns for multi-dimensional classification
   - `contexts`: Added 9 new columns for multi-dimensional classification

3. ✅ **Infrastructure**
   - Materialized view `user_access_summary` for efficient admin queries
   - Complete indexing strategy (35+ indexes created)
   - Row-level security policies for admin-only access
   - Legacy data migration for existing profiles

4. ✅ **Database Changes Applied**
   - Migration file: `supabase/migrations/20251115_user_credentials_complete_system.sql`
   - TypeScript types updated: `lib/types/database.ts`
   - All fixes applied (policy syntax, unique indexes, column names)

**Migration Result:**
- ✅ 2 new tables created
- ✅ 4 existing tables enhanced
- ✅ 35+ indexes created
- ✅ RLS policies applied
- ✅ Legacy profiles migrated
- ✅ Materialized view operational

### ✅ Phase 2: Credential Management Backend - COMPLETED
**Status:** Implementation Complete
**Completion Date:** November 14, 2025
**Dependencies:** Phase 1 Complete ✅

**What Was Implemented:**
1. ✅ **Credential Service** (`lib/services/credential.service.ts`)
   - Complete CRUD operations for user credentials
   - Bulk credential creation
   - Credential search and filtering by department/status
   - National ID hashing with bcrypt
   - Credential verification and status management
   - Statistics and analytics functions

2. ✅ **Enhanced Code Generation APIs**
   - **Single Code with Credential**: `app/api/admin/codes/generate-with-credentials/route.ts`
     - Link codes to specific users (new or existing credentials)
     - Credential verification requirements configuration
     - Distribution method settings (kakao/email/sms/manual)
     - Per-code customization (role, tier, expiration)

   - **Bulk Code Generation**: `app/api/admin/codes/generate-bulk/route.ts`
     - CSV/JSON batch processing (up to 500 users)
     - Automatic credential creation from user data
     - Batch-specific default settings
     - Error handling with partial success support

3. ✅ **Verification Service** (`lib/services/verification.service.ts`)
   - Two-stage verification (code + credential matching)
   - Configurable credential matching fields
   - Partial match detection with scoring
   - Complete audit trail logging
   - Missing field detection
   - Profile creation with credential linkage
   - Verification statistics and analytics

4. ✅ **Verification API** (`app/api/verify/route.ts`)
   - RESTful verification endpoint
   - IP address and user agent tracking
   - Detailed error responses with match status
   - Integration ready for KakaoTalk webhook

**Features Delivered:**
- 🔐 Secure national ID handling (bcrypt hashing)
- 📊 Comprehensive verification logging
- 🎯 Flexible credential matching (email, employee_id, name, phone)
- 📈 Real-time statistics and analytics
- 🔄 Bulk operations support
- ✅ Two-stage verification flow
- 📝 Complete audit trail

**Database Utilization:**
- All new tables and columns from Phase 1 utilized
- Row-level security enforced
- Efficient indexing leveraged for performance

### ✅ Phase 3: Multi-Dimensional Content Classification - COMPLETED
**Status:** Implementation Complete
**Completion Date:** November 14, 2025
**Dependencies:** Phase 2 Complete

**What Was Implemented:**

1. ✅ **Enhanced RBAC Filter Service** (`lib/services/rbac-filter.service.ts`)
   - Multi-dimensional access control filtering
   - Support for sensitivity_level, content_category, target audiences
   - Time-based and geographic access restrictions
   - Access match scoring (0.0-1.0)
   - Complete audit trail logging

2. ✅ **Content Classification Service** (`lib/services/classification.service.ts`)
   - Rule-based auto-classification engine
   - Pattern matching for Korean + English content
   - Sensitivity, category, department, compliance detection
   - Batch classification support (up to 100 documents)
   - Classification statistics and analytics

3. ✅ **Classification APIs**
   - `POST /api/admin/classification/classify` - Single classification
   - `POST /api/admin/classification/batch` - Batch auto-classification
   - `POST /api/admin/classification/suggest` - Classification suggestions
   - `GET /api/admin/classification/stats` - System statistics

**Features Delivered:**
- 🔐 Multi-dimensional access control (8+ dimensions)
- 🎯 Rule-based auto-classification with confidence scoring
- 📊 Comprehensive classification statistics
- ⏰ Time-based content availability
- 🌍 Geographic content restrictions
- ✅ Compliance tag management
- 📈 Batch processing capabilities
- 🔍 Access match scoring and detailed denial reasons

**Database Utilization:**
- All multi-dimensional classification columns from Phase 1 utilized
- Enhanced RBAC filtering on documents and contexts tables
- Classification confidence tracking and method logging
- Complete audit trail via analytics_events

### ✅ Phase 4: Enhanced Admin UI - COMPLETED
**Status:** ✅ Complete (2025-01-14)
**Dependencies:** Phase 2, Phase 3 Complete
**Documentation:** `/PHASE_4_COMPLETE_SUMMARY.md`

**Implemented Features:**
- ✅ Credential management UI with search/filter/CRUD
- ✅ Bulk code generation with CSV upload (500 users max)
- ✅ Classification management dashboard with batch operations
- ✅ Individual document classification editor (8+ dimensions)
- ✅ User detail view with access level summary
- ✅ Enhanced code generation form with credential selection
- ✅ Statistics dashboards for all modules
- ✅ Real-time search and filtering
- ✅ Multi-step wizards for complex workflows

### ⏳ Phase 5: Testing & Validation - PENDING
**Status:** Not Started
**Dependencies:** Phase 2, 3, 4 Complete

**Planned Implementation:**
- E2E tests
- Integration tests
- Validation of all flows

---

## 1. Current Architecture Analysis

### 1.1 Code Generation Flow (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Admin Generates Code (Current)                        │
├─────────────────────────────────────────────────────────────────┤
│  Input:                                                          │
│    - count: 1                                                    │
│    - role: "senior"                                              │
│    - tier: "pro"                                                 │
│    - expiresInDays: 30                                          │
│    - maxUses: 1                                                 │
│                                                                  │
│  Output:                                                         │
│    - Generated Code: "SNR-PRO-A3F-9K2"                          │
│    - Status: active                                             │
│    - Metadata: { role, tier, created_by }                       │
│                                                                  │
│  Limitation: NO USER IDENTITY CAPTURED                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Manual Distribution                                   │
├─────────────────────────────────────────────────────────────────┤
│  Admin manually sends code via KakaoTalk:                       │
│  "안녕하세요 홍길동님, 인증코드: SNR-PRO-A3F-9K2"                │
│                                                                  │
│  Problem: No system tracking of intended recipient              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: User Verification                                     │
├─────────────────────────────────────────────────────────────────┤
│  User (KakaoTalk ID: kakao_abc123) sends: "SNR-PRO-A3F-9K2"    │
│                                                                  │
│  System:                                                         │
│  1. Validates code (exists, active, not expired)                │
│  2. Creates profile with kakao_user_id = "kakao_abc123"         │
│  3. Assigns role = "senior", tier = "pro"                       │
│  4. Marks code as used                                          │
│                                                                  │
│  Gap: System doesn't verify this is the intended recipient      │
└─────────────────────────────────────────────────────────────────┘
```

**Critical Gaps Identified:**
1. ❌ No intended recipient tracking
2. ❌ No credential verification (anyone with code can use it)
3. ❌ No user identity captured during code generation
4. ❌ Limited audit trail (can't trace code → intended user → actual user)
5. ❌ No credential-based validation

### 1.2 Information Access Control (Current)

**Current Schema:**
```typescript
// Document/Context Classification
interface Document {
  access_level: 'public' | 'basic' | 'intermediate' | 'advanced' | 'confidential' | 'executive';
  required_role: 'user' | 'junior' | 'senior' | 'manager' | 'admin' | 'ceo';
  required_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  allowed_departments: string[] | null;
  tags: string[] | null;
}
```

**Current RBAC Logic:**
```typescript
// lib/services/rag.service.enhanced.ts
buildRBACFilters(userRole, userTier) {
  return {
    required_role: { $lte: ROLE_HIERARCHY[userRole] },
    required_tier: { $lte: TIER_HIERARCHY[userTier] }
  };
}
```

**Strengths:**
- ✅ Clear hierarchical role system (6 levels)
- ✅ Clear hierarchical tier system (4 levels)
- ✅ Department-based filtering support
- ✅ Tag-based categorization support

**Limitations:**
- ❌ Single-dimensional access level (one size fits all)
- ❌ No content sensitivity levels (beyond role/tier)
- ❌ No time-based access restrictions
- ❌ No multi-criterion filtering (AND/OR logic)
- ❌ Limited metadata for access decisions

---

## 2. Enhanced Database Schema

### 2.1 User Credentials Extension

**New Table: `user_credentials`**
```sql
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Identity (captured during code generation)
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  employee_id TEXT,
  national_id_hash TEXT,  -- Hashed for security

  -- Organizational Context
  department TEXT,
  team TEXT,
  position TEXT,
  hire_date DATE,
  location TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'pending',  -- pending, verified, suspended, inactive
  verified_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_employee_id UNIQUE (employee_id),
  CONSTRAINT unique_email UNIQUE (email) WHERE email IS NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX idx_credentials_employee_id ON user_credentials(employee_id);
CREATE INDEX idx_credentials_email ON user_credentials(email) WHERE email IS NOT NULL;
CREATE INDEX idx_credentials_phone ON user_credentials(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_credentials_status ON user_credentials(status);
CREATE INDEX idx_credentials_dept ON user_credentials(department);
```

### 2.2 Enhanced Verification Codes

**Extended `verification_codes` Table:**
```sql
ALTER TABLE verification_codes
  -- Add intended recipient tracking
  ADD COLUMN intended_recipient_id UUID REFERENCES user_credentials(id),
  ADD COLUMN intended_recipient_name TEXT,
  ADD COLUMN intended_recipient_email TEXT,
  ADD COLUMN intended_recipient_employee_id TEXT,

  -- Add credential verification requirements
  ADD COLUMN requires_credential_match BOOLEAN DEFAULT FALSE,
  ADD COLUMN credential_match_fields JSONB DEFAULT '[]',  -- ["email", "employee_id"]

  -- Add distribution tracking
  ADD COLUMN distribution_method TEXT,  -- 'kakao', 'email', 'sms', 'manual'
  ADD COLUMN distribution_status TEXT DEFAULT 'pending',  -- 'pending', 'sent', 'delivered', 'failed'
  ADD COLUMN distributed_at TIMESTAMPTZ,

  -- Add usage restrictions
  ADD COLUMN allowed_kakao_user_ids TEXT[],  -- Restrict to specific KakaoTalk IDs
  ADD COLUMN ip_restriction TEXT[],  -- IP whitelist
  ADD COLUMN time_restriction JSONB,  -- { start: "09:00", end: "18:00" }

  -- Enhanced metadata
  ADD COLUMN notes TEXT,  -- Admin notes about this code
  ADD COLUMN auto_expire_after_first_use BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX idx_codes_intended_recipient ON verification_codes(intended_recipient_id);
CREATE INDEX idx_codes_intended_email ON verification_codes(intended_recipient_email) WHERE intended_recipient_email IS NOT NULL;
CREATE INDEX idx_codes_distribution ON verification_codes(distribution_status, distributed_at);
```

### 2.3 Link User Credentials to Profiles

**Add to `profiles` table:**
```sql
ALTER TABLE profiles
  -- Link to user credentials
  ADD COLUMN credential_id UUID REFERENCES user_credentials(id),
  ADD COLUMN credential_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN credential_verified_at TIMESTAMPTZ,

  -- Store credential snapshot at verification (for audit)
  ADD COLUMN credential_snapshot JSONB,

  -- Add verification code reference
  ADD COLUMN verified_with_code TEXT REFERENCES verification_codes(code);

-- Index for credential lookup
CREATE INDEX idx_profiles_credential_id ON profiles(credential_id);
CREATE INDEX idx_profiles_verified_code ON profiles(verified_with_code);
```

### 2.4 Multi-Dimensional Content Classification

**Enhanced `documents` and `contexts` tables:**
```sql
ALTER TABLE documents
  -- Multi-dimensional classification
  ADD COLUMN sensitivity_level TEXT DEFAULT 'internal',  -- public, internal, confidential, secret
  ADD COLUMN content_category TEXT[],  -- ["training", "compliance", "sales"]
  ADD COLUMN target_departments TEXT[],
  ADD COLUMN target_roles TEXT[],
  ADD COLUMN target_tiers TEXT[],
  ADD COLUMN target_positions TEXT[],  -- ["Agent", "Team Leader", "Manager"]

  -- Time-based access
  ADD COLUMN available_from TIMESTAMPTZ,
  ADD COLUMN available_until TIMESTAMPTZ,

  -- Geographic restrictions
  ADD COLUMN geo_restrictions TEXT[],  -- ["KR", "US"]

  -- Advanced metadata
  ADD COLUMN compliance_tags TEXT[],  -- ["GDPR", "HIPAA", "PII"]
  ADD COLUMN version_number TEXT,
  ADD COLUMN superseded_by UUID REFERENCES documents(id),

  -- Auto-classification
  ADD COLUMN auto_classified BOOLEAN DEFAULT FALSE,
  ADD COLUMN classification_confidence FLOAT,
  ADD COLUMN classification_method TEXT;  -- "manual", "ai", "rule-based"

-- Apply same schema to contexts table
ALTER TABLE contexts
  ADD COLUMN sensitivity_level TEXT DEFAULT 'internal',
  ADD COLUMN content_category TEXT[],
  ADD COLUMN target_departments TEXT[],
  ADD COLUMN target_roles TEXT[],
  ADD COLUMN target_tiers TEXT[],
  ADD COLUMN target_positions TEXT[],
  ADD COLUMN available_from TIMESTAMPTZ,
  ADD COLUMN available_until TIMESTAMPTZ,
  ADD COLUMN geo_restrictions TEXT[],
  ADD COLUMN compliance_tags TEXT[];

-- Indexes for multi-dimensional filtering
CREATE INDEX idx_docs_sensitivity ON documents(sensitivity_level);
CREATE INDEX idx_docs_categories ON documents USING GIN(content_category);
CREATE INDEX idx_docs_departments ON documents USING GIN(target_departments);
CREATE INDEX idx_docs_availability ON documents(available_from, available_until);

CREATE INDEX idx_contexts_sensitivity ON contexts(sensitivity_level);
CREATE INDEX idx_contexts_categories ON contexts USING GIN(content_category);
CREATE INDEX idx_contexts_departments ON contexts USING GIN(target_departments);
```

### 2.5 Audit Trail Enhancement

**New Table: `credential_verification_log`**
```sql
CREATE TABLE credential_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Verification attempt
  verification_code TEXT NOT NULL,
  kakao_user_id TEXT NOT NULL,

  -- Credential data provided (if any)
  provided_email TEXT,
  provided_employee_id TEXT,
  provided_name TEXT,
  provided_phone TEXT,

  -- Matching results
  intended_credential_id UUID REFERENCES user_credentials(id),
  match_status TEXT,  -- "matched", "partial_match", "no_match", "no_credential_required"
  match_score FLOAT,
  match_details JSONB,

  -- Outcome
  verification_result TEXT,  -- "success", "failed", "rejected"
  rejection_reason TEXT,
  profile_created UUID REFERENCES profiles(id),

  -- Context
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_verification_log_code ON credential_verification_log(verification_code);
CREATE INDEX idx_verification_log_kakao ON credential_verification_log(kakao_user_id);
CREATE INDEX idx_verification_log_timestamp ON credential_verification_log(timestamp DESC);
CREATE INDEX idx_verification_log_status ON credential_verification_log(match_status, verification_result);
```

---

## 3. User-Based Code Generation Workflow

### 3.1 Enhanced Code Generation Process

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Admin Enters User Credentials (NEW)                    │
├─────────────────────────────────────────────────────────────────┤
│  Form Fields:                                                    │
│    ┌─────────────────────────────────────┐                      │
│    │ ★ Full Name: [홍길동____________]   │                      │
│    │ ★ Email: [hong@company.com____]    │                      │
│    │   Phone: [010-1234-5678_______]    │                      │
│    │ ★ Employee ID: [EMP-2024-001___]   │                      │
│    │   Department: [Sales▼]             │                      │
│    │   Position: [Senior Agent▼]        │                      │
│    │   Team: [Team A_______________]    │                      │
│    └─────────────────────────────────────┘                      │
│                                                                  │
│  Validation:                                                     │
│  ✓ Check if employee_id already exists                          │
│  ✓ Check if email already registered                            │
│  ✓ Verify required fields filled                                │
│                                                                  │
│  Options:                                                        │
│  ☑ Require credential match on verification                     │
│  ☑ Match fields: [Email] [Employee ID]                          │
│  ☐ Auto-expire after first use                                  │
│  ☐ Allow multiple devices                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: System Creates User Credential Record                  │
├─────────────────────────────────────────────────────────────────┤
│  INSERT INTO user_credentials (                                 │
│    full_name: "홍길동",                                         │
│    email: "hong@company.com",                                   │
│    employee_id: "EMP-2024-001",                                 │
│    phone_number: "010-1234-5678",                               │
│    department: "Sales",                                          │
│    position: "Senior Agent",                                     │
│    team: "Team A",                                              │
│    status: "pending",                                           │
│    created_by: admin_user_id                                    │
│  ) RETURNING id AS credential_id                                │
│                                                                  │
│  Status: pending (verified only after code verification)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Generate Code with Credential Link                     │
├─────────────────────────────────────────────────────────────────┤
│  Auto-generate code based on role/tier:                         │
│    Pattern: [ROLE]-[TIER]-[DEPT]-[RANDOM]                       │
│    Example: "SNR-PRO-SAL-K9F2"                                  │
│             Senior-Pro-Sales-Random                              │
│                                                                  │
│  INSERT INTO verification_codes (                               │
│    code: "SNR-PRO-SAL-K9F2",                                    │
│    role: "senior",                                              │
│    tier: "pro",                                                 │
│    intended_recipient_id: credential_id,                        │
│    intended_recipient_name: "홍길동",                           │
│    intended_recipient_email: "hong@company.com",                │
│    intended_recipient_employee_id: "EMP-2024-001",              │
│    requires_credential_match: TRUE,                             │
│    credential_match_fields: ["email", "employee_id"],           │
│    purpose: "신규 시니어 직원 온보딩",                           │
│    max_uses: 1,                                                 │
│    expires_at: NOW() + INTERVAL '30 days',                      │
│    distribution_method: "kakao",                                │
│    distribution_status: "pending",                              │
│    created_by: admin_user_id,                                   │
│    metadata: {                                                  │
│      department: "Sales",                                       │
│      position: "Senior Agent"                                   │
│    }                                                             │
│  )                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Admin Reviews & Distributes                            │
├─────────────────────────────────────────────────────────────────┤
│  Generated Code Summary:                                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Code: SNR-PRO-SAL-K9F2                                 │    │
│  │ For: 홍길동 (EMP-2024-001)                             │    │
│  │ Email: hong@company.com                                │    │
│  │ Role: Senior | Tier: Pro                               │    │
│  │ Department: Sales | Position: Senior Agent             │    │
│  │                                                         │    │
│  │ ⚠️  Requires credential verification                   │    │
│  │ ✓  Match fields: Email, Employee ID                   │    │
│  │                                                         │    │
│  │ [Copy Code] [Send via KakaoTalk] [Download QR]        │    │
│  │ [Email Instructions] [Print Card]                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Distribution Template:                                          │
│  "안녕하세요 홍길동님,                                           │
│   JISA 챗봇 인증 코드입니다: SNR-PRO-SAL-K9F2                   │
│                                                                  │
│   KakaoTalk에서 'JISA' 채널을 추가한 후,                        │
│   첫 메시지로 이 코드를 입력하세요.                              │
│                                                                  │
│   ⚠️ 보안을 위해 사번과 이메일 확인이 필요합니다."               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Enhanced Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  USER VERIFICATION FLOW (Enhanced)                              │
├─────────────────────────────────────────────────────────────────┤
│  User adds JISA channel on KakaoTalk                            │
│  First message: "SNR-PRO-SAL-K9F2"                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Initial Code Validation                                │
├─────────────────────────────────────────────────────────────────┤
│  Extract: kakao_user_id = "kakao_abc123"                        │
│           code = "SNR-PRO-SAL-K9F2"                             │
│                                                                  │
│  Query verification_codes:                                       │
│    WHERE code = "SNR-PRO-SAL-K9F2"                              │
│    AND status = 'active'                                        │
│    AND expires_at > NOW()                                       │
│    AND current_uses < max_uses                                  │
│                                                                  │
│  ✓ Code found and valid                                         │
│  ✓ Check requires_credential_match = TRUE                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Request Credential Verification (NEW)                  │
├─────────────────────────────────────────────────────────────────┤
│  Bot Response:                                                   │
│  "인증 코드가 확인되었습니다! 🎉                                 │
│                                                                  │
│   보안을 위해 본인 확인이 필요합니다.                            │
│   아래 정보를 입력해주세요:                                      │
│                                                                  │
│   형식: 이메일|사번                                             │
│   예시: hong@company.com|EMP-2024-001"                          │
│                                                                  │
│  User responds: "hong@company.com|EMP-2024-001"                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Credential Matching Logic (NEW)                        │
├─────────────────────────────────────────────────────────────────┤
│  Parse user input:                                               │
│    provided_email = "hong@company.com"                          │
│    provided_employee_id = "EMP-2024-001"                        │
│                                                                  │
│  Fetch intended credentials:                                     │
│    SELECT * FROM user_credentials                               │
│    WHERE id = (                                                 │
│      SELECT intended_recipient_id                               │
│      FROM verification_codes                                    │
│      WHERE code = "SNR-PRO-SAL-K9F2"                            │
│    )                                                             │
│                                                                  │
│  Expected:                                                       │
│    email = "hong@company.com"                                   │
│    employee_id = "EMP-2024-001"                                 │
│                                                                  │
│  Match Logic:                                                    │
│    email_match = (provided_email == expected_email)             │
│    employee_match = (provided_employee_id == expected_id)       │
│                                                                  │
│    match_score = (email_match + employee_match) / 2.0           │
│    match_status = match_score == 1.0 ? "matched" : "no_match"  │
│                                                                  │
│  Log verification attempt:                                       │
│    INSERT INTO credential_verification_log (...)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Create Profile on Successful Match                     │
├─────────────────────────────────────────────────────────────────┤
│  IF match_status = "matched":                                   │
│                                                                  │
│    1. Create profile:                                           │
│       INSERT INTO profiles (                                    │
│         kakao_user_id: "kakao_abc123",                          │
│         kakao_nickname: from_webhook,                           │
│         role: "senior",                                         │
│         subscription_tier: "pro",                               │
│         department: "Sales",                                    │
│         credential_id: credential_id,                           │
│         credential_verified: TRUE,                              │
│         credential_verified_at: NOW(),                          │
│         verified_with_code: "SNR-PRO-SAL-K9F2",                 │
│         credential_snapshot: {                                  │
│           email: "hong@company.com",                            │
│           employee_id: "EMP-2024-001",                          │
│           full_name: "홍길동"                                   │
│         },                                                       │
│         metadata: {                                             │
│           position: "Senior Agent",                             │
│           team: "Team A"                                        │
│         }                                                        │
│       )                                                          │
│                                                                  │
│    2. Update user_credentials status:                           │
│       UPDATE user_credentials                                   │
│       SET status = 'verified',                                  │
│           verified_at = NOW()                                   │
│       WHERE id = credential_id                                  │
│                                                                  │
│    3. Update verification code:                                 │
│       UPDATE verification_codes                                 │
│       SET current_uses = current_uses + 1,                      │
│           status = 'used',                                      │
│           used_at = NOW(),                                      │
│           used_by = array_append(used_by, "kakao_abc123")      │
│       WHERE code = "SNR-PRO-SAL-K9F2"                           │
│                                                                  │
│    4. Send success response:                                    │
│       "✅ 인증 완료!                                            │
│        👤 역할: 시니어                                         │
│        🎫 등급: Pro                                            │
│        🏢 부서: Sales                                          │
│        👋 환영합니다, 홍길동님!"                                │
│                                                                  │
│  ELSE:                                                           │
│    Send rejection:                                              │
│    "❌ 인증 정보가 일치하지 않습니다.                           │
│     관리자에게 문의해주세요."                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Bulk Code Generation

**For onboarding teams or departments:**

```typescript
// API: POST /api/admin/codes/bulk-generate

interface BulkCodeGenerationRequest {
  users: Array<{
    full_name: string;
    email: string;
    employee_id: string;
    phone_number?: string;
    department: string;
    position: string;
    team?: string;
  }>;

  // Assign same role/tier to all
  default_role: UserRole;
  default_tier: SubscriptionTier;

  // Or individual assignments
  individual_assignments?: Map<string, { role: UserRole; tier: SubscriptionTier }>;

  // Code settings
  expires_in_days: number;
  requires_credential_match: boolean;
  distribution_method: 'kakao' | 'email' | 'csv_export';
}

interface BulkCodeGenerationResponse {
  success: boolean;
  created_count: number;
  credentials: Array<{
    credential_id: string;
    user: {
      full_name: string;
      email: string;
      employee_id: string;
    };
    code: string;
    role: UserRole;
    tier: SubscriptionTier;
  }>;
  csv_export_url?: string;
  errors: Array<{ user: string; error: string }>;
}
```

**CSV Export Format:**
```csv
Full Name,Email,Employee ID,Department,Position,Code,Role,Tier,Expires
홍길동,hong@company.com,EMP-2024-001,Sales,Senior Agent,SNR-PRO-SAL-K9F2,senior,pro,2025-12-14
김영희,kim@company.com,EMP-2024-002,Sales,Junior Agent,JNR-BAS-SAL-P3M7,junior,basic,2025-12-14
박철수,park@company.com,EMP-2024-003,Marketing,Manager,MGR-PRO-MKT-X8N4,manager,pro,2025-12-14
```

---

## 4. Multi-Dimensional Information Categorization

### 4.1 Content Classification Framework

**Classification Dimensions:**

```typescript
interface ContentClassification {
  // Primary Access Control
  access_level: 'public' | 'basic' | 'intermediate' | 'advanced' | 'confidential' | 'executive';
  required_role: UserRole;
  required_tier: SubscriptionTier;

  // Sensitivity Level (NEW)
  sensitivity_level: 'public' | 'internal' | 'confidential' | 'secret';

  // Content Categorization (NEW)
  content_category: string[];  // ["training", "compliance", "product_info", "sales_strategy"]

  // Target Audience (NEW)
  target_departments: string[];  // ["Sales", "Marketing", "Operations"]
  target_roles: UserRole[];
  target_tiers: SubscriptionTier[];
  target_positions: string[];  // ["Agent", "Team Leader", "Branch Manager"]

  // Time-Based Access (NEW)
  available_from: Date | null;
  available_until: Date | null;

  // Geographic Restrictions (NEW)
  geo_restrictions: string[];  // ISO country codes: ["KR", "US"]

  // Compliance & Regulatory (NEW)
  compliance_tags: string[];  // ["GDPR", "HIPAA", "PII", "Financial"]

  // Content Lifecycle (NEW)
  version_number: string;
  superseded_by: string | null;  // Reference to newer version

  // Auto-Classification Metadata (NEW)
  auto_classified: boolean;
  classification_confidence: number;  // 0.0 - 1.0
  classification_method: 'manual' | 'ai' | 'rule-based';
}
```

### 4.2 Enhanced RBAC Filtering Logic

**Current (Simple):**
```typescript
// Simple 2D filtering
function buildRBACFilters(userRole: UserRole, userTier: SubscriptionTier) {
  return {
    required_role: { $lte: ROLE_HIERARCHY[userRole] },
    required_tier: { $lte: TIER_HIERARCHY[userTier] }
  };
}
```

**Enhanced (Multi-Dimensional):**
```typescript
interface UserAccessContext {
  role: UserRole;
  tier: SubscriptionTier;
  department: string;
  position: string;
  team?: string;
  location?: string;
  verified: boolean;
}

function buildEnhancedRBACFilters(
  user: UserAccessContext,
  queryContext?: {
    timestamp?: Date;
    ip_address?: string;
    geo_location?: string;
  }
) {
  const filters: any = {
    // Base role/tier filtering (AND condition)
    $and: [
      { required_role: { $lte: ROLE_HIERARCHY[user.role] } },
      { required_tier: { $lte: TIER_HIERARCHY[user.tier] } }
    ]
  };

  // Department filtering (OR condition - can see own dept or null)
  if (user.department) {
    filters.$and.push({
      $or: [
        { target_departments: { $exists: false } },
        { target_departments: { $size: 0 } },
        { target_departments: user.department }
      ]
    });
  }

  // Position filtering
  if (user.position) {
    filters.$and.push({
      $or: [
        { target_positions: { $exists: false } },
        { target_positions: { $size: 0 } },
        { target_positions: user.position }
      ]
    });
  }

  // Time-based filtering
  const now = queryContext?.timestamp || new Date();
  filters.$and.push({
    $or: [
      { available_from: { $exists: false } },
      { available_from: { $lte: now } }
    ]
  });
  filters.$and.push({
    $or: [
      { available_until: { $exists: false } },
      { available_until: { $gte: now } }
    ]
  });

  // Geographic filtering
  if (queryContext?.geo_location) {
    filters.$and.push({
      $or: [
        { geo_restrictions: { $exists: false } },
        { geo_restrictions: { $size: 0 } },
        { geo_restrictions: queryContext.geo_location }
      ]
    });
  }

  // Sensitivity level filtering (based on verified status)
  const maxSensitivity = user.verified ? 'confidential' : 'internal';
  filters.$and.push({
    sensitivity_level: { $lte: SENSITIVITY_HIERARCHY[maxSensitivity] }
  });

  return filters;
}

const SENSITIVITY_HIERARCHY = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3
};
```

### 4.3 Auto-Classification System

**AI-Powered Classification:**

```typescript
// lib/services/content-classifier.service.ts

interface ClassificationResult {
  content_category: string[];
  suggested_access_level: AccessLevel;
  suggested_role: UserRole;
  suggested_tier: SubscriptionTier;
  sensitivity_level: 'public' | 'internal' | 'confidential' | 'secret';
  compliance_tags: string[];
  confidence: number;
  reasoning: string;
}

async function classifyContent(
  title: string,
  content: string,
  metadata?: Record<string, any>
): Promise<ClassificationResult> {

  // 1. Rule-based classification (fast)
  const ruleBasedResult = applyClassificationRules(title, content, metadata);

  // 2. If high confidence, return immediately
  if (ruleBasedResult.confidence > 0.9) {
    return {
      ...ruleBasedResult,
      classification_method: 'rule-based'
    };
  }

  // 3. Use AI for complex cases
  const aiResult = await classifyWithAI(title, content, metadata);

  // 4. Combine results
  return mergeClassificationResults(ruleBasedResult, aiResult);
}

// Rule-based classification
function applyClassificationRules(
  title: string,
  content: string,
  metadata?: Record<string, any>
): Partial<ClassificationResult> {

  const keywords = {
    confidential: ['비밀', '기밀', '임원', '재무', '전략', 'confidential', 'secret'],
    compliance: ['GDPR', 'HIPAA', '개인정보', 'PII', '규정', 'compliance'],
    training: ['교육', '가이드', '매뉴얼', '트레이닝', 'training', 'guide'],
    sales: ['영업', '수수료', '상품', '판매', 'sales', 'commission'],
    executive: ['CEO', '임원', '이사회', 'board', 'executive']
  };

  let category: string[] = [];
  let sensitivity: string = 'internal';
  let suggestedRole: UserRole = 'user';
  let confidence = 0.5;

  const lowerText = `${title} ${content}`.toLowerCase();

  // Check keywords
  if (keywords.confidential.some(kw => lowerText.includes(kw))) {
    sensitivity = 'confidential';
    suggestedRole = 'manager';
    confidence = 0.8;
  }

  if (keywords.executive.some(kw => lowerText.includes(kw))) {
    sensitivity = 'secret';
    suggestedRole = 'ceo';
    confidence = 0.9;
  }

  if (keywords.training.some(kw => lowerText.includes(kw))) {
    category.push('training');
    confidence += 0.2;
  }

  if (keywords.sales.some(kw => lowerText.includes(kw))) {
    category.push('sales');
    confidence += 0.2;
  }

  return {
    content_category: category,
    sensitivity_level: sensitivity as any,
    suggested_role: suggestedRole,
    confidence: Math.min(confidence, 1.0)
  };
}

// AI-powered classification using GPT
async function classifyWithAI(
  title: string,
  content: string,
  metadata?: Record<string, any>
): Promise<ClassificationResult> {

  const prompt = `
You are a content classification system for an insurance company's internal knowledge base.

Classify the following document:

Title: ${title}
Content: ${content.substring(0, 2000)}...

Provide classification in this JSON format:
{
  "content_category": ["training", "compliance", "sales", "product_info", etc.],
  "sensitivity_level": "public|internal|confidential|secret",
  "suggested_access_level": "public|basic|intermediate|advanced|confidential|executive",
  "suggested_role": "user|junior|senior|manager|admin|ceo",
  "suggested_tier": "free|basic|pro|enterprise",
  "compliance_tags": ["GDPR", "PII", etc. if applicable],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}

Consider:
- Content sensitivity (personal data, financial info, strategic plans)
- Target audience (general staff, managers, executives)
- Regulatory requirements (GDPR, HIPAA, etc.)
- Document purpose (training, reference, policy, etc.)
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 4.4 Admin Categorization Interface

**Document Upload with Classification:**

```tsx
// app/admin/data/upload/page.tsx (Enhanced)

function DocumentUploadForm() {
  const [classification, setClassification] = useState<ContentClassification>({
    access_level: 'basic',
    required_role: 'user',
    required_tier: 'free',
    sensitivity_level: 'internal',
    content_category: [],
    target_departments: [],
    target_roles: [],
    target_tiers: [],
    target_positions: [],
    available_from: null,
    available_until: null,
    geo_restrictions: [],
    compliance_tags: [],
    auto_classified: false
  });

  const [aiSuggestions, setAiSuggestions] = useState<ClassificationResult | null>(null);

  const handleAutoClassify = async (file: File) => {
    // Extract text from PDF
    const text = await extractTextFromPDF(file);

    // Get AI suggestions
    const suggestions = await fetch('/api/admin/content/classify', {
      method: 'POST',
      body: JSON.stringify({ title: file.name, content: text })
    }).then(r => r.json());

    setAiSuggestions(suggestions);
  };

  return (
    <form>
      {/* File Upload */}
      <input type="file" onChange={(e) => handleAutoClassify(e.target.files[0])} />

      {/* AI Suggestions */}
      {aiSuggestions && (
        <div className="ai-suggestions">
          <h3>AI Classification Suggestions (Confidence: {aiSuggestions.confidence})</h3>
          <button onClick={() => applyAISuggestions(aiSuggestions)}>
            Apply Suggestions
          </button>

          <div className="suggestion-preview">
            <p><strong>Sensitivity:</strong> {aiSuggestions.sensitivity_level}</p>
            <p><strong>Categories:</strong> {aiSuggestions.content_category.join(', ')}</p>
            <p><strong>Suggested Role:</strong> {aiSuggestions.suggested_role}</p>
            <p><strong>Reasoning:</strong> {aiSuggestions.reasoning}</p>
          </div>
        </div>
      )}

      {/* Manual Classification Form */}
      <div className="classification-form">
        {/* Primary Access Control */}
        <section>
          <h3>Primary Access Control</h3>
          <select name="access_level" value={classification.access_level}>
            <option value="public">Public</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="confidential">Confidential</option>
            <option value="executive">Executive</option>
          </select>

          <select name="required_role" value={classification.required_role}>
            <option value="user">User</option>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="ceo">CEO</option>
          </select>

          <select name="required_tier" value={classification.required_tier}>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </section>

        {/* Sensitivity Level */}
        <section>
          <h3>Sensitivity Level</h3>
          <select name="sensitivity_level" value={classification.sensitivity_level}>
            <option value="public">Public (External sharing OK)</option>
            <option value="internal">Internal (Company only)</option>
            <option value="confidential">Confidential (Restricted access)</option>
            <option value="secret">Secret (Highest restriction)</option>
          </select>
        </section>

        {/* Content Categories */}
        <section>
          <h3>Content Categories</h3>
          <MultiSelect
            options={['training', 'compliance', 'sales', 'product_info', 'operations', 'hr', 'finance']}
            value={classification.content_category}
            onChange={(cats) => setClassification({...classification, content_category: cats})}
          />
        </section>

        {/* Target Audience */}
        <section>
          <h3>Target Audience</h3>
          <label>Departments:</label>
          <MultiSelect
            options={['Sales', 'Marketing', 'Operations', 'HR', 'Finance', 'IT']}
            value={classification.target_departments}
          />

          <label>Positions:</label>
          <MultiSelect
            options={['Agent', 'Senior Agent', 'Team Leader', 'Branch Manager', 'Regional Manager']}
            value={classification.target_positions}
          />
        </section>

        {/* Time-Based Access */}
        <section>
          <h3>Time-Based Access</h3>
          <label>Available From:</label>
          <input type="datetime-local" name="available_from" />

          <label>Available Until:</label>
          <input type="datetime-local" name="available_until" />
        </section>

        {/* Compliance Tags */}
        <section>
          <h3>Compliance & Regulatory</h3>
          <MultiSelect
            options={['GDPR', 'HIPAA', 'PII', 'Financial', 'Trade Secret', 'Export Control']}
            value={classification.compliance_tags}
          />
        </section>
      </div>

      <button type="submit">Upload & Classify Document</button>
    </form>
  );
}
```

---

## 5. Admin Interface Redesign

### 5.1 Enhanced Code Generation Form

**Mockup: `/admin/codes/generate` (Enhanced)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Generate Verification Code                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ STEP 1: User Credentials                            ★ Required │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ Full Name ★                                                     │ │
│ │ [홍길동_________________________________]                        │ │
│ │                                                                 │ │
│ │ Email ★                                                         │ │
│ │ [hong@company.com____________________]                          │ │
│ │                                                                 │ │
│ │ Employee ID ★                                                   │ │
│ │ [EMP-2024-001________________________]                          │ │
│ │ [Check Existing ✓]  Status: ✓ Available                        │ │
│ │                                                                 │ │
│ │ Phone Number                                                    │ │
│ │ [010-1234-5678_______________________]                          │ │
│ │                                                                 │ │
│ │ Department ★                           Position ★               │ │
│ │ [Sales_____________▼]                  [Senior Agent_______▼]  │ │
│ │                                                                 │ │
│ │ Team                                   Hire Date               │ │
│ │ [Team A____________]                   [2024-01-15________]    │ │
│ │                                                                 │ │
│ │ Location                                                        │ │
│ │ [Seoul HQ__________▼]                                          │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ STEP 2: Access Level                                           │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ Role ★                                 Tier ★                  │ │
│ │ [Senior___________▼]                   [Pro____________▼]      │ │
│ │                                                                 │ │
│ │ Preview Access:                                                │ │
│ │ ✓ Can view: Basic, Intermediate, Advanced content              │ │
│ │ ✓ Can access: Free, Basic, Pro features                        │ │
│ │ ✗ Cannot view: Confidential, Executive content                 │ │
│ │ ✗ Cannot access: Enterprise features                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ STEP 3: Verification Settings                                  │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ ☑ Require credential verification                              │ │
│ │   Match on: ☑ Email  ☑ Employee ID  ☐ Phone                   │ │
│ │                                                                 │ │
│ │ ☐ Auto-expire after first use                                  │ │
│ │ ☐ Allow multiple devices                                       │ │
│ │ ☐ Restrict to specific KakaoTalk IDs                           │ │
│ │                                                                 │ │
│ │ Max Uses: [1_____]                                             │ │
│ │ Expires In: [30____] days                                      │ │
│ │                                                                 │ │
│ │ Purpose/Notes:                                                 │ │
│ │ [신규 시니어 직원 온보딩____________________________]            │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ STEP 4: Distribution Method                                    │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ ○ Generate only (manual distribution)                          │ │
│ │ ● Send via KakaoTalk (requires KakaoTalk ID)                   │ │
│ │   KakaoTalk ID: [_______________________]                      │ │
│ │ ○ Send via Email                                               │ │
│ │ ○ Send via SMS                                                 │ │
│ │ ○ Generate QR Code                                             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [Generate Code]                              [Bulk Upload CSV →]   │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Generated Code Display

**After Generation:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ Verification Code Generated Successfully                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Generated Code                                                  │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │   ┌──────────────────────────────────────────────────────┐    │ │
│ │   │  SNR-PRO-SAL-K9F2                                    │    │ │
│ │   │  [Copy] [QR Code] [Print Card]                       │    │ │
│ │   └──────────────────────────────────────────────────────┘    │ │
│ │                                                                 │ │
│ │   For: 홍길동 (EMP-2024-001)                                   │ │
│ │   Email: hong@company.com                                      │ │
│ │   Phone: 010-1234-5678                                         │ │
│ │   Department: Sales | Position: Senior Agent                   │ │
│ │                                                                 │ │
│ │   Access Level:                                                │ │
│ │   • Role: Senior                                               │ │
│ │   • Tier: Pro                                                  │ │
│ │   • Can view: Basic → Advanced content                         │ │
│ │   • Cannot view: Confidential, Executive                       │ │
│ │                                                                 │ │
│ │   Security Settings:                                           │ │
│ │   ⚠️  Requires credential verification                         │ │
│ │   ✓  Must match: Email, Employee ID                           │ │
│ │   ⏱️  Expires: 2025-12-14                                      │ │
│ │   🔢 Max uses: 1                                               │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Distribution Instructions                                       │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ Send this message to the user:                                 │ │
│ │ ┌────────────────────────────────────────────────────────────┐ │ │
│ │ │ 안녕하세요 홍길동님,                                        │ │ │
│ │ │                                                             │ │ │
│ │ │ JISA 챗봇 인증 코드입니다:                                  │ │ │
│ │ │ SNR-PRO-SAL-K9F2                                            │ │ │
│ │ │                                                             │ │ │
│ │ │ 사용 방법:                                                  │ │ │
│ │ │ 1. KakaoTalk에서 'JISA' 채널 추가                           │ │ │
│ │ │ 2. 첫 메시지로 위 코드 입력                                 │ │ │
│ │ │ 3. 본인 확인을 위해 이메일과 사번 입력                      │ │ │
│ │ │    (형식: 이메일|사번)                                      │ │ │
│ │ │                                                             │ │ │
│ │ │ ⚠️ 보안을 위해 본인 확인이 필요합니다.                      │ │ │
│ │ │ 입력 예시: hong@company.com|EMP-2024-001                   │ │ │
│ │ └────────────────────────────────────────────────────────────┘ │ │
│ │                                                                 │ │
│ │ [Copy Message] [Send via KakaoTalk] [Send via Email]           │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [Generate Another Code]  [View All Codes]                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Enhanced Users Table

**Mockup: `/admin/users` (Enhanced)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Users Management                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Filters:  [All Roles ▼] [All Tiers ▼] [All Depts ▼] [Active 7d ▼] │
│ Search:   [홍길동 or EMP-2024-001________________] [🔍]             │
│                                                                      │
│ [Export CSV] [Bulk Actions ▼]                                       │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ User          │ Credentials    │ Access  │ Activity │ Actions  │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ ●홍길동        │ ✓ Verified    │ Senior  │ 2 min   │ [👁] [✏] │ │
│ │ EMP-2024-001  │ hong@co.com   │ Pro     │ 45 Q    │ [🚫]     │ │
│ │ Sales         │ 010-1234-5678 │         │         │          │ │
│ │ kakao_abc123  │ Code: SNR-PRO │         │         │          │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ ●김영희        │ ✓ Verified    │ Junior  │ 1 hr    │ [👁] [✏] │ │
│ │ EMP-2024-002  │ kim@co.com    │ Basic   │ 12 Q    │ [🚫]     │ │
│ │ Sales         │ 010-2345-6789 │         │         │          │ │
│ │ kakao_xyz789  │ Code: JNR-BAS │         │         │          │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ ⚠박철수        │ ⏳ Pending    │ Manager │ Never   │ [👁] [✏] │ │
│ │ EMP-2024-003  │ park@co.com   │ Pro     │ 0 Q     │ [📧]     │ │
│ │ Marketing     │ 010-3456-7890 │         │         │          │ │
│ │ Not verified  │ Code: Sent    │         │         │          │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Legend: ● Active | ⚠ Pending | 🔴 Suspended                         │
│ Actions: 👁 View | ✏ Edit | 🚫 Suspend | 📧 Resend Code             │
│                                                                      │
│ Page 1 of 15 | Total Users: 245                                     │
│ [◀] [1] [2] [3] ... [15] [▶]                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 User Detail View

**Mockup: `/admin/users/[id]` (New)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Profile: 홍길동 (EMP-2024-001)                     [Edit] [⚙️] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Basic Information                                               │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Full Name:        홍길동                                        │ │
│ │ Employee ID:      EMP-2024-001                                 │ │
│ │ Email:            hong@company.com ✓ Verified                  │ │
│ │ Phone:            010-1234-5678                                │ │
│ │ Department:       Sales                                        │ │
│ │ Position:         Senior Agent                                 │ │
│ │ Team:             Team A                                       │ │
│ │ Location:         Seoul HQ                                     │ │
│ │ Hire Date:        2024-01-15                                   │ │
│ │ Status:           ● Active                                     │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Access Control                                                  │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Role:             Senior (Level 2/5)                           │ │
│ │ Tier:             Pro (Level 2/3)                              │ │
│ │ Credential Status: ✓ Verified on 2024-11-14 09:23 KST         │ │
│ │ Verification Code: SNR-PRO-SAL-K9F2 (Used)                     │ │
│ │ Code Issued By:   admin@company.com                            │ │
│ │                                                                 │ │
│ │ Content Access:                                                │ │
│ │ ✓ Public, Basic, Intermediate, Advanced                        │ │
│ │ ✗ Confidential, Executive                                      │ │
│ │                                                                 │ │
│ │ Feature Access:                                                │ │
│ │ ✓ Free, Basic, Pro features                                    │ │
│ │ ✗ Enterprise features                                          │ │
│ │                                                                 │ │
│ │ [Upgrade Role ▼] [Change Tier ▼]                              │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ KakaoTalk Activity                                             │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ KakaoTalk ID:     kakao_abc123                                 │ │
│ │ Nickname:         홍길동                                        │ │
│ │ First Chat:       2024-11-14 09:25 KST                         │ │
│ │ Last Chat:        2 minutes ago                                │ │
│ │ Total Queries:    45                                           │ │
│ │ Avg Response:     2.3s                                         │ │
│ │                                                                 │ │
│ │ Recent Queries (Last 24h):                                     │ │
│ │ [10:23] "11월 교육 일정" → RAG (2.1s) ✓                        │ │
│ │ [10:25] "한화생명 수수료" → Commission (1.8s) ✓                │ │
│ │ [10:30] "KRS 시험 준비" → RAG (2.5s) ✓                         │ │
│ │ [View All Queries →]                                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Content Access Log (Last 7 days)                               │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Document Category  │ Access Count │ Avg Time │ Last Access   │ │
│ │────────────────────────────────────────────────────────────────│ │
│ │ Training           │ 15           │ 3.2s     │ 2 min ago     │ │
│ │ Sales              │ 12           │ 2.1s     │ 10 min ago    │ │
│ │ Product Info       │ 8            │ 2.5s     │ 1 hr ago      │ │
│ │ Compliance         │ 5            │ 3.1s     │ 2 hrs ago     │ │
│ │────────────────────────────────────────────────────────────────│ │
│ │ Total Queries: 45  │ Success: 43  │ Failed: 2                │ │
│ │ [View Detailed Analytics →]                                    │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Actions                                                         │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ [Generate New Code]  [Reset Credentials]  [Suspend Account]    │ │
│ │ [Export Activity Log]  [Send Notification]                     │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5 Document Categorization Interface

**Mockup: `/admin/data/documents/[id]/edit` (Enhanced)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Edit Document Classification                                        │
├─────────────────────────────────────────────────────────────────────┤
│ Document: "11월 교육 일정 - 한화생명 설명회"                         │
│ Type: PDF | Size: 2.3 MB | Uploaded: 2024-11-10                    │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ AI Classification Suggestions            Confidence: 87%       │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Based on content analysis:                                     │ │
│ │                                                                 │ │
│ │ Sensitivity: Internal                                          │ │
│ │ Categories: ["training", "sales", "product_info"]              │ │
│ │ Suggested Role: Junior                                         │ │
│ │ Suggested Tier: Basic                                          │ │
│ │ Target Departments: ["Sales", "Marketing"]                     │ │
│ │                                                                 │ │
│ │ Reasoning: Document contains training schedule information     │ │
│ │ for insurance products. No sensitive financial or strategic    │ │
│ │ data detected. Suitable for junior-level staff and above.      │ │
│ │                                                                 │ │
│ │ [Apply Suggestions] [Ignore]                                   │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Manual Classification                                          │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ Primary Access Control:                                        │ │
│ │ ├─ Access Level:  [Basic_____________▼]                       │ │
│ │ ├─ Required Role: [Junior____________▼]                       │ │
│ │ └─ Required Tier: [Basic_____________▼]                       │ │
│ │                                                                 │ │
│ │ Sensitivity Level:                                             │ │
│ │ ├─ [Internal___________▼]                                     │ │
│ │ └─ ℹ️ Internal: Company only, not for external sharing        │ │
│ │                                                                 │ │
│ │ Content Categories: (Select multiple)                         │ │
│ │ ☑ Training     ☑ Sales         ☐ Compliance                   │ │
│ │ ☑ Product Info ☐ Operations    ☐ HR                           │ │
│ │ ☐ Finance      ☐ Legal         ☐ Strategy                     │ │
│ │                                                                 │ │
│ │ Target Audience:                                               │ │
│ │ ├─ Departments:  ☑ Sales  ☑ Marketing  ☐ Operations  ☐ All   │ │
│ │ ├─ Positions:    ☑ Agent  ☑ Senior Agent  ☐ Manager  ☐ All   │ │
│ │ └─ Roles:        ☑ Junior  ☑ Senior  ☐ Manager  ☐ All        │ │
│ │                                                                 │ │
│ │ Time-Based Access:                                             │ │
│ │ ├─ Available From: [2024-11-01________] [09:00_]             │ │
│ │ └─ Available Until: [2024-11-30_______] [18:00_]             │ │
│ │    ☑ Enforce business hours (Mon-Fri 9am-6pm)                 │ │
│ │                                                                 │ │
│ │ Geographic Restrictions:                                       │ │
│ │ ├─ [All Locations_______________▼]                            │ │
│ │ └─ ☐ Restrict to: ☐ KR  ☐ US  ☐ JP  ☐ CN                     │ │
│ │                                                                 │ │
│ │ Compliance Tags:                                               │ │
│ │ ☐ GDPR  ☐ HIPAA  ☐ PII  ☐ Financial  ☐ Trade Secret          │ │
│ │                                                                 │ │
│ │ Version Control:                                               │ │
│ │ ├─ Version: [1.0_____]                                        │ │
│ │ └─ ☐ This document supersedes: [Select document▼]            │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Access Preview                                                 │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Who can access this document?                                  │ │
│ │                                                                 │ │
│ │ ✓ Junior (Basic tier) in Sales/Marketing                      │ │
│ │ ✓ Senior (Basic tier) in Sales/Marketing                      │ │
│ │ ✓ All Managers and above                                       │ │
│ │ ✗ Free tier users                                              │ │
│ │ ✗ Users outside Sales/Marketing (unless Manager+)             │ │
│ │ ✗ Access outside Nov 1-30, 2024                                │ │
│ │                                                                 │ │
│ │ Estimated audience: ~120 users (49% of active users)          │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [Save Classification]  [Apply & Re-Index]  [Cancel]                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Roadmap

### Phase 1: Database Schema Enhancement (Week 1)
**Priority: Critical | Estimated: 5 days**

**Tasks:**
1. Create `user_credentials` table with all fields
2. Extend `verification_codes` table with credential tracking
3. Add credential columns to `profiles` table
4. Extend `documents` and `contexts` with multi-dimensional classification
5. Create `credential_verification_log` table
6. Create indexes for performance
7. Write and test migration scripts

**Deliverables:**
- [ ] SQL migration script: `20251115_user_credentials_system.sql`
- [ ] Database type definitions updated in `lib/types/database.ts`
- [ ] Test data seeded for development
- [ ] Migration verification tests passing

**Success Criteria:**
- All new tables created without errors
- Existing data preserved
- Foreign key relationships valid
- Indexes created and performant

---

### Phase 2: Credential Management Backend (Week 2)
**Priority: High | Estimated: 7 days**

**Tasks:**
1. Create credential service: `lib/services/credential.service.ts`
2. Enhanced code generation API: `app/api/admin/codes/generate/route.ts`
3. Bulk code generation API: `app/api/admin/codes/bulk-generate/route.ts`
4. Credential verification logic in KakaoTalk webhook
5. Verification logging service
6. Credential matching algorithm implementation

**Deliverables:**
- [ ] `CredentialService` class with CRUD operations
- [ ] Enhanced code generation endpoint
- [ ] Bulk code generation endpoint with CSV export
- [ ] Credential verification middleware
- [ ] Unit tests (>80% coverage)

**Key Files:**
```
lib/services/
  ├─ credential.service.ts          # NEW: Credential CRUD
  ├─ code-generation.service.ts     # ENHANCED: Link to credentials
  └─ verification.service.ts        # NEW: Credential matching logic

app/api/admin/codes/
  ├─ generate/route.ts              # ENHANCED: Credential capture
  └─ bulk-generate/route.ts         # NEW: Bulk operations

app/api/kakao/
  └─ chat/route.ts                  # ENHANCED: Credential verification
```

**Success Criteria:**
- Code generation captures user credentials
- Credentials stored securely (hashed fields)
- Verification matches credentials correctly
- Audit trail complete

---

### Phase 3: Multi-Dimensional Content Classification (Week 3)
**Priority: High | Estimated: 7 days**

**Tasks:**
1. Enhanced RBAC service with multi-dimensional filters
2. Auto-classification service using AI
3. Rule-based classification engine
4. Content categorization API endpoints
5. Migration script for existing documents

**Deliverables:**
- [ ] `ContentClassificationService` with AI integration
- [ ] Enhanced `buildRBACFilters()` function
- [ ] Auto-classification endpoint: `/api/admin/content/classify`
- [ ] Bulk re-classification script
- [ ] Classification confidence scoring

**Key Files:**
```
lib/services/
  ├─ content-classifier.service.ts  # NEW: AI classification
  ├─ rag.service.enhanced.ts        # ENHANCED: Multi-dim filters
  └─ rbac.service.ts                # ENHANCED: Complex filtering

app/api/admin/content/
  ├─ classify/route.ts              # NEW: AI classification
  └─ bulk-classify/route.ts         # NEW: Bulk operations
```

**Success Criteria:**
- Auto-classification >85% accuracy
- Multi-dimensional filtering working
- Existing documents migrated
- Performance impact <100ms per query

---

### Phase 4: Enhanced Admin UI (Week 4-5)
**Priority: Medium | Estimated: 10 days**

**Tasks:**
1. Enhanced code generation form with credential input
2. Bulk code generation interface with CSV upload
3. User detail view with credential verification status
4. Document categorization interface with AI suggestions
5. Access preview component
6. Credential verification status indicators

**Deliverables:**
- [ ] Enhanced `/admin/codes/generate` page
- [ ] New `/admin/codes/bulk-generate` page
- [ ] New `/admin/users/[id]` detail view
- [ ] Enhanced `/admin/data/documents/[id]/edit` page
- [ ] Reusable UI components for classification
- [ ] Mobile-responsive design

**Key Files:**
```
app/admin/codes/
  ├─ generate/page.tsx              # ENHANCED: Credential form
  └─ bulk-generate/page.tsx         # NEW: Bulk operations

app/admin/users/
  ├─ page.tsx                       # ENHANCED: Credential status
  └─ [id]/page.tsx                  # NEW: User detail view

app/admin/data/documents/
  └─ [id]/edit/page.tsx             # ENHANCED: Classification UI

components/admin/
  ├─ credential-form.tsx            # NEW: Credential input
  ├─ classification-form.tsx        # NEW: Multi-dim classification
  ├─ access-preview.tsx             # NEW: Access visualization
  └─ ai-suggestions.tsx             # NEW: AI classification UI
```

**Success Criteria:**
- All forms functional and validated
- AI suggestions displayed correctly
- Mobile-first design works on phones
- User experience smooth and intuitive

---

### Phase 5: Testing & Validation (Week 6)
**Priority: Critical | Estimated: 5 days**

**Tasks:**
1. End-to-end testing of credential verification flow
2. Load testing with 1000+ users
3. Security audit of credential storage
4. RBAC filtering validation with complex scenarios
5. Performance optimization
6. Bug fixes and refinements

**Deliverables:**
- [ ] E2E test suite covering all flows
- [ ] Load test results (1000 concurrent users)
- [ ] Security audit report
- [ ] Performance benchmarks
- [ ] Bug fix documentation

**Test Scenarios:**
```
1. New User Onboarding:
   - Admin generates code with credentials
   - User verifies with matching credentials
   - Profile created with correct role/tier
   - Audit log complete

2. Credential Mismatch:
   - User provides wrong email
   - System rejects verification
   - Attempt logged
   - User notified

3. Multi-Dimensional Access:
   - Junior Sales user queries training docs
   - Senior Marketing user queries sales docs
   - Manager queries confidential docs
   - Access granted/denied correctly

4. Bulk Operations:
   - Upload 100 users via CSV
   - Codes generated for all
   - Distribution tracked
   - No duplicate employee IDs

5. Performance:
   - 1000 concurrent queries
   - Response time <3s
   - No database locks
   - Memory usage stable
```

**Success Criteria:**
- All E2E tests passing
- Load test: <3s response under 1000 users
- Security audit: No critical vulnerabilities
- Performance: <100ms RBAC filter overhead

---

### Phase 6: Documentation & Training (Week 7)
**Priority: Medium | Estimated: 3 days**

**Tasks:**
1. Admin user guide for credential management
2. API documentation
3. Database schema documentation
4. Training materials for admins
5. Troubleshooting guide

**Deliverables:**
- [ ] Admin User Manual (PDF)
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Database ERD and schema docs
- [ ] Training video tutorials
- [ ] FAQ and troubleshooting guide

---

## 7. Security Considerations

### 7.1 Credential Storage

**Security Requirements:**
1. **Email & Phone**: Store in plaintext (needed for matching)
2. **National ID**: NEVER store plaintext → Use bcrypt hash
3. **Employee ID**: Store in plaintext (low sensitivity, needed for matching)
4. **Passwords**: N/A (KakaoTalk only, no passwords)

**Implementation:**
```typescript
// lib/utils/security.ts

import bcrypt from 'bcryptjs';

export async function hashSensitiveData(data: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(data, salt);
}

export async function verifySensitiveData(
  provided: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(provided, hashed);
}

// Usage
const user = {
  email: 'hong@company.com',  // Plaintext OK
  employee_id: 'EMP-2024-001',  // Plaintext OK
  national_id_hash: await hashSensitiveData('123456-1234567')  // HASHED
};
```

### 7.2 Access Control

**RLS Policies:**
```sql
-- user_credentials: Admins only
CREATE POLICY credentials_admin_only ON user_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- credential_verification_log: Admins read-only
CREATE POLICY verification_log_admin_read ON credential_verification_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );
```

### 7.3 Credential Verification Security

**Anti-Brute Force:**
```typescript
// Rate limiting on credential verification
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

async function checkVerificationAttempts(kakaoUserId: string) {
  const recentAttempts = await supabase
    .from('credential_verification_log')
    .select('*')
    .eq('kakao_user_id', kakaoUserId)
    .gte('timestamp', new Date(Date.now() - LOCKOUT_DURATION));

  if (recentAttempts.data.length >= MAX_ATTEMPTS) {
    throw new Error('Too many verification attempts. Please try again in 15 minutes.');
  }
}
```

**Match Scoring Security:**
```typescript
// Prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
```

### 7.4 Audit Trail

**What to Log:**
```typescript
interface VerificationAttempt {
  verification_code: string;
  kakao_user_id: string;
  provided_email: string;
  provided_employee_id: string;
  match_status: 'matched' | 'partial' | 'no_match';
  verification_result: 'success' | 'failed';
  ip_address: string;
  user_agent: string;
  timestamp: Date;
}

// Log EVERYTHING - even failed attempts
await logVerificationAttempt({
  ...attemptData,
  rejection_reason: match_status !== 'matched' ? 'Credential mismatch' : null
});
```

**Retention Policy:**
- Verification logs: Retain 2 years
- User credentials: Retain while active + 1 year after termination
- Access logs: Retain 90 days

### 7.5 GDPR Compliance

**Data Subject Rights:**
```typescript
// Right to access
async function exportUserData(credentialId: string) {
  return {
    credentials: await getCredential(credentialId),
    profile: await getProfile(credentialId),
    verification_history: await getVerificationLog(credentialId),
    access_history: await getAccessLog(credentialId),
    codes_issued: await getCodesForUser(credentialId)
  };
}

// Right to erasure
async function deleteUserData(credentialId: string) {
  // 1. Anonymize verification logs
  await anonymizeVerificationLogs(credentialId);

  // 2. Delete profile
  await deleteProfile(credentialId);

  // 3. Delete credentials
  await deleteCredential(credentialId);

  // 4. Revoke active codes
  await revokeActiveCodesForUser(credentialId);
}
```

---

## 8. Scalability Considerations

### 8.1 Database Performance

**Expected Scale:**
- **Users**: 1000 active users, 5000 total
- **Credentials**: 5000 records
- **Codes**: 10000 generated, 5000 active
- **Documents**: 10000 documents, 100000 contexts
- **Queries**: 10000/day peak

**Index Strategy:**
```sql
-- High-priority indexes (create immediately)
CREATE INDEX CONCURRENTLY idx_credentials_lookup
  ON user_credentials(employee_id, email)
  WHERE status = 'verified';

CREATE INDEX CONCURRENTLY idx_codes_active
  ON verification_codes(code, status)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_profiles_kakao
  ON profiles(kakao_user_id)
  WHERE kakao_user_id IS NOT NULL;

-- GIN indexes for array columns
CREATE INDEX CONCURRENTLY idx_docs_multi_dim
  ON documents USING GIN(
    content_category,
    target_departments,
    target_roles
  );
```

**Query Optimization:**
```typescript
// Use materialized views for expensive queries
CREATE MATERIALIZED VIEW user_access_summary AS
SELECT
  p.id,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.department,
  COUNT(DISTINCT ql.id) as total_queries,
  MAX(ql.timestamp) as last_query,
  AVG(ql.response_time_ms) as avg_response_time,
  c.employee_id,
  c.status as credential_status
FROM profiles p
LEFT JOIN query_logs ql ON ql.user_id = p.id
LEFT JOIN user_credentials c ON c.id = p.credential_id
WHERE p.kakao_user_id IS NOT NULL
GROUP BY p.id, c.employee_id, c.status;

-- Refresh every 5 minutes
CREATE INDEX ON user_access_summary(id);
REFRESH MATERIALIZED VIEW CONCURRENTLY user_access_summary;
```

### 8.2 Caching Strategy

**What to Cache:**
```typescript
// lib/cache/redis-cache.ts

const CACHE_TTL = {
  USER_PROFILE: 300,        // 5 minutes
  USER_CREDENTIALS: 600,    // 10 minutes
  RBAC_FILTERS: 300,        // 5 minutes
  DOCUMENT_METADATA: 1800,  // 30 minutes
  CODE_VALIDATION: 60       // 1 minute
};

async function getCachedProfile(userId: string) {
  const cached = await redis.get(`profile:${userId}`);
  if (cached) return JSON.parse(cached);

  const profile = await fetchProfile(userId);
  await redis.setex(
    `profile:${userId}`,
    CACHE_TTL.USER_PROFILE,
    JSON.stringify(profile)
  );

  return profile;
}

// Invalidation on updates
async function updateProfile(userId: string, data: any) {
  await updateInDatabase(userId, data);
  await redis.del(`profile:${userId}`);
}
```

### 8.3 Rate Limiting

**Per-User Limits:**
```typescript
// lib/middleware/rate-limit.ts

const RATE_LIMITS = {
  VERIFICATION_ATTEMPTS: {
    max: 3,
    window: 15 * 60 * 1000  // 15 minutes
  },
  QUERIES: {
    free: { max: 100, window: 24 * 60 * 60 * 1000 },    // 100/day
    basic: { max: 500, window: 24 * 60 * 60 * 1000 },   // 500/day
    pro: { max: 2000, window: 24 * 60 * 60 * 1000 },    // 2000/day
    enterprise: { max: -1, window: 0 }                   // Unlimited
  }
};

async function checkRateLimit(userId: string, action: string, tier: string) {
  const limit = RATE_LIMITS[action][tier];
  if (limit.max === -1) return true;

  const key = `ratelimit:${action}:${userId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, Math.floor(limit.window / 1000));
  }

  return current <= limit.max;
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Coverage Targets:**
- Services: >90%
- API Routes: >80%
- UI Components: >70%

**Key Test Suites:**
```typescript
// tests/services/credential.service.test.ts
describe('CredentialService', () => {
  test('creates credential with hashed sensitive data', async () => {
    const credential = await CredentialService.create({
      full_name: '홍길동',
      email: 'hong@test.com',
      employee_id: 'EMP-001',
      national_id: '123456-1234567'
    });

    expect(credential.national_id_hash).toBeDefined();
    expect(credential.national_id_hash).not.toBe('123456-1234567');
  });

  test('matches credentials correctly', async () => {
    const result = await CredentialService.matchCredentials(
      'code-123',
      { email: 'hong@test.com', employee_id: 'EMP-001' }
    );

    expect(result.match_status).toBe('matched');
    expect(result.match_score).toBe(1.0);
  });

  test('rejects mismatched credentials', async () => {
    const result = await CredentialService.matchCredentials(
      'code-123',
      { email: 'wrong@test.com', employee_id: 'EMP-001' }
    );

    expect(result.match_status).toBe('no_match');
    expect(result.match_score).toBeLessThan(1.0);
  });
});

// tests/services/content-classifier.service.test.ts
describe('ContentClassificationService', () => {
  test('classifies training document correctly', async () => {
    const result = await ContentClassificationService.classify(
      '11월 교육 일정',
      '한화생명 설명회 일정...'
    );

    expect(result.content_category).toContain('training');
    expect(result.sensitivity_level).toBe('internal');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('detects confidential content', async () => {
    const result = await ContentClassificationService.classify(
      '임원 회의록',
      'CEO 전략 회의 내용...'
    );

    expect(result.sensitivity_level).toBe('confidential');
    expect(result.suggested_role).toBe('ceo');
  });
});
```

### 9.2 Integration Tests

**End-to-End Flows:**
```typescript
// tests/e2e/credential-verification.test.ts
describe('Credential Verification Flow', () => {
  test('complete user onboarding', async () => {
    // 1. Admin generates code
    const { code } = await request(app)
      .post('/api/admin/codes/generate')
      .send({
        full_name: '홍길동',
        email: 'hong@test.com',
        employee_id: 'EMP-001',
        role: 'senior',
        tier: 'pro'
      })
      .expect(200);

    // 2. User verifies with code
    const webhook1 = await simulateKakaoWebhook({
      userRequest: {
        user: { id: 'kakao_test123' },
        utterance: code
      }
    });

    expect(webhook1.body.template.outputs[0].simpleText.text)
      .toContain('본인 확인이 필요합니다');

    // 3. User provides credentials
    const webhook2 = await simulateKakaoWebhook({
      userRequest: {
        user: { id: 'kakao_test123' },
        utterance: 'hong@test.com|EMP-001'
      }
    });

    expect(webhook2.body.template.outputs[0].simpleText.text)
      .toContain('인증 완료');

    // 4. Verify profile created
    const profile = await supabase
      .from('profiles')
      .select('*')
      .eq('kakao_user_id', 'kakao_test123')
      .single();

    expect(profile.data.role).toBe('senior');
    expect(profile.data.subscription_tier).toBe('pro');
    expect(profile.data.credential_verified).toBe(true);
  });
});
```

### 9.3 Load Tests

**Locust Test Script:**
```python
# tests/load/locustfile.py

from locust import HttpUser, task, between

class JISAUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def query_chatbot(self):
        """Simulate KakaoTalk query"""
        self.client.post('/api/kakao/chat', json={
            'userRequest': {
                'user': { 'id': f'kakao_{self.user_id}' },
                'utterance': '11월 교육 일정'
            }
        })

    @task(1)
    def generate_code(self):
        """Simulate admin code generation"""
        self.client.post('/api/admin/codes/generate', json={
            'full_name': f'User {self.user_id}',
            'email': f'user{self.user_id}@test.com',
            'employee_id': f'EMP-{self.user_id}',
            'role': 'senior',
            'tier': 'pro'
        }, headers={
            'Authorization': f'Bearer {self.admin_token}'
        })

    def on_start(self):
        self.user_id = self.environment.runner.user_count

# Run: locust -f locustfile.py --users 1000 --spawn-rate 10
```

---

## 10. Migration Plan

### 10.1 Existing Users Migration

**For users already verified (without credentials):**

```sql
-- Migration script: migrate_existing_users.sql

-- Create pending credentials for existing KakaoTalk users
INSERT INTO user_credentials (
  full_name,
  email,
  employee_id,
  status,
  metadata,
  created_at
)
SELECT
  p.kakao_nickname,
  NULL,  -- Email unknown
  'LEGACY-' || p.id::text,  -- Generate temporary employee ID
  'pending',
  jsonb_build_object(
    'legacy_migration', true,
    'original_profile_id', p.id,
    'migration_date', NOW()
  ),
  p.created_at
FROM profiles p
WHERE p.kakao_user_id IS NOT NULL
  AND p.credential_id IS NULL;

-- Link credentials to profiles
UPDATE profiles p
SET credential_id = c.id,
    credential_verified = FALSE,
    metadata = COALESCE(p.metadata, '{}'::jsonb) ||
               jsonb_build_object('requires_credential_update', true)
FROM user_credentials c
WHERE c.metadata->>'original_profile_id' = p.id::text
  AND c.metadata->>'legacy_migration' = 'true';
```

**User Re-verification Flow:**
```typescript
// When legacy user queries chatbot
if (profile.credential_verified === false &&
    profile.metadata?.requires_credential_update) {

  return {
    text: `안녕하세요! 👋

보안 강화를 위해 본인 확인이 필요합니다.
아래 정보를 입력해주세요:

형식: 이메일|사번
예시: hong@company.com|EMP-2024-001

이메일과 사번은 관리자에게 문의하시면 확인 가능합니다.`
  };
}
```

### 10.2 Existing Documents Migration

**Bulk classification of existing documents:**

```typescript
// scripts/migrate-documents.ts

async function migrateExistingDocuments() {
  const documents = await supabase
    .from('documents')
    .select('*')
    .is('sensitivity_level', null);  // Not yet classified

  for (const doc of documents.data) {
    console.log(`Classifying: ${doc.title}`);

    // Auto-classify with AI
    const classification = await ContentClassificationService.classify(
      doc.title,
      doc.content
    );

    // Update document
    await supabase
      .from('documents')
      .update({
        sensitivity_level: classification.sensitivity_level,
        content_category: classification.content_category,
        target_departments: inferDepartments(classification),
        target_roles: [classification.suggested_role],
        target_tiers: [classification.suggested_tier],
        auto_classified: true,
        classification_confidence: classification.confidence,
        classification_method: 'ai'
      })
      .eq('id', doc.id);

    // Also update contexts
    await supabase
      .from('contexts')
      .update({
        sensitivity_level: classification.sensitivity_level,
        content_category: classification.content_category
      })
      .eq('document_id', doc.id);
  }

  console.log('Migration complete!');
}
```

---

## 11. Success Metrics

### 11.1 Business Metrics

**User Adoption:**
- Target: 90% of new users complete credential verification within 7 days
- Target: <5% verification failure rate
- Target: 0 duplicate employee IDs

**Content Access:**
- Target: >80% of queries return results
- Target: <1% unauthorized access attempts
- Target: 0 data leaks (confidential content to unauthorized users)

**Admin Efficiency:**
- Target: Code generation time <30 seconds
- Target: Bulk code generation for 100 users <2 minutes
- Target: Document classification time <10 seconds per document

### 11.2 Technical Metrics

**Performance:**
- Target: Credential verification <2 seconds
- Target: RBAC filter overhead <100ms
- Target: Page load time <1 second
- Target: 99.9% uptime

**Security:**
- Target: 0 critical vulnerabilities
- Target: 100% of sensitive data encrypted
- Target: Complete audit trail (100% of actions logged)

**Data Quality:**
- Target: >95% classification confidence for auto-classified documents
- Target: <1% credential mismatch false positives
- Target: 0 orphaned records (credentials without profiles)

### 11.3 Monitoring & Alerts

**Dashboard Metrics:**
```typescript
// Real-time monitoring dashboard
const metrics = {
  verification_success_rate: await getMetric('verifications.success_rate'),
  credential_match_accuracy: await getMetric('credentials.match_accuracy'),
  classification_confidence_avg: await getMetric('classification.confidence_avg'),
  query_response_time_p95: await getMetric('queries.response_time.p95'),
  active_users_24h: await getMetric('users.active.24h'),
  failed_access_attempts: await getMetric('access.denied.count')
};
```

**Alert Thresholds:**
- ⚠️ Verification failure rate >10% (5 minutes)
- 🚨 Response time p95 >5s (5 minutes)
- 🚨 Unauthorized access attempts >10 (1 minute)
- ⚠️ Classification confidence <70% (1 hour)
- 🚨 Database error rate >1% (1 minute)

---

## 12. Conclusion

### Summary

This comprehensive architecture design provides a complete blueprint for implementing:

1. **User-Based Code Generation** with real-world credential tracking
2. **Multi-Dimensional Information Categorization** for granular access control
3. **Enhanced Admin UX** with intuitive interfaces for all operations
4. **Complete Audit Trail** for compliance and troubleshooting
5. **Scalable Foundation** supporting 1000+ users with <3s response times

### Key Innovations

1. **Credential-Linked Codes**: Unlike traditional anonymous codes, each code is tied to specific user credentials, providing accountability and security

2. **Multi-Dimensional RBAC**: Move beyond simple role/tier to support department, position, time-based, and geographic access controls

3. **AI-Powered Classification**: Leverage GPT-4 for intelligent document categorization, reducing manual admin work by 80%

4. **Complete Verification Flow**: Two-stage verification (code + credentials) ensures only intended recipients can access

5. **Audit Excellence**: Every action logged with full context for compliance and debugging

### Implementation Priority

**Must-Have (MVP):**
- User credentials system (Phase 1-2)
- Credential-linked code generation (Phase 2)
- Enhanced verification flow (Phase 2)
- Basic multi-dimensional filtering (Phase 3)

**Should-Have (V1.1):**
- AI-powered classification (Phase 3)
- Enhanced admin UI (Phase 4)
- Bulk operations (Phase 2-4)

**Nice-to-Have (V1.2):**
- Time-based access restrictions
- Geographic restrictions
- Advanced analytics dashboards

### Next Steps

1. **Review & Approval**: Stakeholder review of this architecture document
2. **Resource Allocation**: Assign developers and timeline
3. **Sprint Planning**: Break down phases into 2-week sprints
4. **Development Start**: Begin Phase 1 (Database Schema Enhancement)

---

**Document End** | Total Pages: 42 | Word Count: ~18,000
