# Employee Code System Implementation Guide

## 📋 Overview

This guide explains how to generate and distribute special verification codes for all 52 employees, enabling them to register and access their personal RAG (Retrieval-Augmented Generation) system with Pinecone namespace isolation.

## 🎯 System Architecture

### Components

1. **Employee Population Script** (`scripts/populate-employees-with-codes.ts`)
   - Creates user_credentials for all 52 employees
   - Generates unique codes for each employee
   - Links codes to Pinecone namespaces

2. **Enhanced Code APIs**
   - `/api/auth/verify-code` - Validates codes and returns namespace info
   - `/api/auth/use-code` - Marks codes as used and assigns namespaces to profiles
   - `/api/admin/credentials/generate-codes` - Batch code generation with namespace support

3. **Admin UI**
   - `/admin/employees/codes` - View and manage all employee codes
   - Download codes as CSV
   - Copy codes to clipboard

4. **Employee RAG Service** (`lib/services/employee-rag.service.ts`)
   - Detects "/" command for employee-specific queries
   - Enforces triple-layer security (namespace, metadata, JWT)
   - Queries only employee's own data

## 🚀 Quick Start

### Step 1: Run Population Script

```bash
# Navigate to project directory
cd /home/bitnami/archive/context-hub/jisa_app

# Ensure environment variables are set
# Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Run the script
npx tsx scripts/populate-employees-with-codes.ts
```

**What this does:**
- Creates/updates user_credentials for all 52 employees
- Generates unique codes in format: `EMP-00124-XXX` (based on employee ID)
- Links each code to its Pinecone namespace (e.g., `employee_J00124`)
- Sets RAG enabled status and vector counts
- Saves codes to `employee-codes.json`

### Step 2: View Codes in Admin Panel

1. Navigate to: `http://your-domain/admin/employees/codes`
2. View all employee codes with their:
   - Employee ID (사번)
   - Name (이름)
   - Verification Code
   - Pinecone Namespace
   - Vector Count
   - Usage Status

### Step 3: Distribute Codes to Employees

**Option A: Manual Distribution**
1. Click the copy button next to each employee's code
2. Send via email/KakaoTalk to the employee
3. Include registration instructions

**Option B: Bulk Export**
1. Click "CSV 다운로드" button
2. Open CSV file
3. Send codes via your preferred method

### Step 4: Employee Registration

Employees register via KakaoTalk:

```
/등록 EMP-00124-A3K
```

**What happens automatically:**
1. Code is validated
2. Pinecone namespace is assigned to their profile
3. RAG access is enabled
4. They can now use "/" commands

## 🔍 Using the RAG System

### Employee Commands (via KakaoTalk)

Once registered, employees can query their compensation data:

```
/내 최종지급액은?
/이번 달 수수료는?
/환수가 얼마야?
/메리츠화재 계약은?
/계약이 몇 개야?
```

**The "/" prefix triggers:**
- Search only in employee's namespace (e.g., `employee_J00124`)
- Filter by employee's 사번
- Return only their personal data

### Security Guarantees

**Triple-Layer Security:**

1. **Layer 1: Namespace Isolation**
   - Infrastructure-level at Pinecone
   - Employee J00124 physically cannot access namespace `employee_J00127`

2. **Layer 2: Metadata Filtering**
   - Query-level backup security
   - All documents filtered by `사번: { $eq: "J00124" }`

3. **Layer 3: Application Validation**
   - JWT authentication required
   - Employee ID extracted from verified token
   - Results validated before returning

## 📊 Database Schema

### verification_codes Table

```sql
CREATE TABLE verification_codes (
  code TEXT PRIMARY KEY,
  code_type TEXT,
  employee_sabon TEXT,              -- Employee ID (e.g., J00124)
  pinecone_namespace TEXT,          -- Namespace (e.g., employee_J00124)
  intended_recipient_name TEXT,
  intended_recipient_email TEXT,
  intended_recipient_id UUID,       -- Links to user_credentials.id
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB
);
```

### user_credentials Table

```sql
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY,
  employee_id TEXT,                 -- 사번
  full_name TEXT,
  pinecone_namespace TEXT,          -- employee_J00124
  rag_enabled BOOLEAN DEFAULT FALSE,
  rag_vector_count INTEGER,
  rag_last_sync_at TIMESTAMPTZ
);
```

### profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  credential_id UUID,               -- Links to user_credentials
  pinecone_namespace TEXT,          -- Cached from credentials
  rag_enabled BOOLEAN DEFAULT FALSE
);
```

## 🔧 Troubleshooting

### Issue: Code already exists

**Solution:**
- Codes are generated idempotently
- Running script multiple times is safe
- Existing codes are preserved

### Issue: Employee can't access RAG

**Check:**
1. Code was used successfully
2. `profiles.rag_enabled = TRUE`
3. `profiles.pinecone_namespace` is set correctly
4. Employee is using "/" prefix in queries

**Debug query:**
```sql
SELECT
  p.id,
  p.pinecone_namespace,
  p.rag_enabled,
  c.employee_id,
  c.full_name
FROM profiles p
JOIN user_credentials c ON c.id = p.credential_id
WHERE c.employee_id = 'J00124';
```

### Issue: Security violation error

**Cause:**
- Namespace mismatch detected
- Employee trying to access another's data

**This is expected behavior** - the system is working correctly!

## 📝 Code Formats

### Generated Codes

Format: `EMP-[EmployeeID]-[Random]`

Examples:
- `EMP-00124-A3K` (Employee J00124)
- `EMP-00127-B7M` (Employee J00127)
- `EMP-00128-C2N` (Employee J00128)

**Properties:**
- Unique per employee
- Easy to identify employee from code
- Random suffix prevents guessing
- Expires after 1 year

## 🎨 Admin UI Features

### Employee Codes Page (`/admin/employees/codes`)

**Stats Dashboard:**
- Total Codes: All generated codes
- Used: Codes that have been redeemed
- Unused: Codes waiting for registration
- RAG Enabled: Employees with active RAG access

**Actions:**
- 📋 Copy individual codes
- 📄 Copy all codes as text
- 💾 Download as CSV
- 🔍 View usage status

**Table Columns:**
- 사번 (Employee ID)
- 이름 (Name)
- 코드 (Code)
- 네임스페이스 (Namespace)
- 벡터수 (Vector Count)
- 상태 (Status: Used/Unused)
- 만료일 (Expiry Date)

## 🔄 Workflow Summary

```
┌─────────────────────────────────────────────┐
│  Step 1: Admin runs population script       │
│  → Creates credentials + codes              │
│  → Links to Pinecone namespaces            │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  Step 2: Admin distributes codes            │
│  → View in /admin/employees/codes          │
│  → Copy/download codes                     │
│  → Send to employees                       │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  Step 3: Employee registers                 │
│  → Uses code in KakaoTalk: /등록 [code]    │
│  → Namespace assigned automatically        │
│  → RAG access enabled                      │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  Step 4: Employee queries data              │
│  → Uses "/" prefix: /내 최종지급액은?       │
│  → Searches only own namespace             │
│  → Gets personalized response              │
└─────────────────────────────────────────────┘
```

## ✅ Verification Checklist

After running the script:

- [ ] All 52 employees have credentials in `user_credentials`
- [ ] All 52 codes exist in `verification_codes`
- [ ] Each code has correct `employee_sabon` and `pinecone_namespace`
- [ ] `employee-codes.json` file was created
- [ ] Admin page shows all codes at `/admin/employees/codes`
- [ ] Test registration with one code
- [ ] Test RAG query with "/" command
- [ ] Verify namespace isolation (employee can't see others' data)

## 🚨 Important Notes

### Security

1. **Never expose codes publicly** - They grant access to employee data
2. **Distribute codes securely** - Use secure channels (email, direct message)
3. **Monitor usage** - Check admin panel for suspicious activity
4. **Rotate expired codes** - Codes expire after 1 year

### Data Privacy

- Each employee sees ONLY their own data
- "/" queries are logged for audit purposes
- Namespace isolation is enforced at infrastructure level
- No cross-employee data leakage possible

### Maintenance

- Codes expire after 1 year (configurable)
- Re-run script to update vector counts
- Script is idempotent (safe to run multiple times)
- Existing codes are preserved

## 📞 Support

If you encounter issues:

1. Check logs in `/api/employee-rag/query`
2. Verify environment variables are set
3. Ensure Pinecone index exists: `hof-branch-chatbot`
4. Confirm all 52 employees have vectors uploaded
5. Test with a single employee first

## 📚 Related Documentation

- [Master.md](./Master.md) - Complete employee list and RAG reference
- [EMPLOYEE_RAG_IMPLEMENTATION_GUIDE.md](./EMPLOYEE_RAG_IMPLEMENTATION_GUIDE.md) - Technical implementation
- [lib/services/employee-rag.service.ts](./lib/services/employee-rag.service.ts) - RAG service code
- [supabase/migrations/20251121_employee_rag_system.sql](./supabase/migrations/20251121_employee_rag_system.sql) - Database schema

---

**System Status:** ✅ Ready for Production

**Last Updated:** 2025-11-21

**Version:** 1.0

**Total Employees:** 52
