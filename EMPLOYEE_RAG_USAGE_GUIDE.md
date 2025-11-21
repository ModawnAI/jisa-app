# Employee RAG System - Usage Guide

## Overview

The Employee RAG system allows employees to query **only their own** compensation and contract data using Pinecone namespace isolation. Each employee's data is stored in a dedicated namespace (e.g., `employee_J00124`) and is completely isolated from other employees.

## Critical: The "/" Command

**⭐ IMPORTANT: Employee-specific queries MUST start with "/" (forward slash)**

### Why the "/" Command?

The system has two modes:

1. **General Mode** (no "/"): Searches public knowledge base
   - Company policies, training schedules, general insurance info
   - Example: `"11월 교육 일정 알려줘"`

2. **Employee RAG Mode** (starts with "/"): Searches YOUR personal data
   - Your contracts, commissions, compensation details
   - Example: `"/ 보험계약 건별 수수료 알려줘"`

Without the "/" prefix, the system won't know to search your personal namespace!

## How It Works

### Registration Flow

1. Employee receives code: `EMP-00124-673`
2. Employee enters code in KakaoTalk
3. System automatically:
   - ✅ Creates profile
   - ✅ Sets `pinecone_namespace = employee_J00124`
   - ✅ Sets `rag_enabled = true`
   - ✅ Links to employee credential (사번: J00124, 이름: 김기현)
4. Employee can now query their data with "/"

### Query Flow

When you type `"/ 보험계약 건별 수수료 알려줘"`:

1. **Pattern Detection**: System sees "/" prefix → routes to Employee RAG
2. **Profile Lookup**: Gets your profile and finds `pinecone_namespace = employee_J00124`
3. **Security Check**: Verifies you have RAG enabled
4. **Embedding**: Converts your question to vector embedding
5. **Namespace Search**: Searches ONLY `employee_J00124` namespace
6. **Metadata Filter**: Double-checks results match your 사번 (J00124)
7. **Security Validation**: Paranoid check - ensures no data leaks
8. **Answer Generation**: Creates personalized answer from YOUR data only

## Usage Examples

### ✅ Correct Usage

```
/ 보험계약 건별 수수료 알려줘
/ 내 최종지급액은?
/ 이번 달 환수가 얼마야?
/ 메리츠화재 계약 현황
/ 내 계약 몇 개야?
/ 202509 수수료 내역
```

### ❌ Wrong Usage (Will Not Work)

```
보험계약 건별 수수료 알려줘          ← Missing "/"
내 최종지급액은?                      ← Missing "/"
이번 달 환수가 얼마야?                ← Missing "/"
```

Without "/", these queries go to the general knowledge base, not your personal data!

## Quick Reply Buttons

After registration, employees see helpful quick reply buttons:

- 💰 **내 급여 정보**: `"/ 내 최종지급액 알려줘"`
- 📋 **내 계약 현황**: `"/ 보험계약 건별 수수료"`
- 📚 **일반 정보**: `"11월 교육 일정"`

Simply tap these buttons instead of typing!

## Example Employee Setup

| 사번 | 이름 | 코드 | 네임스페이스 | 벡터수 |
|------|------|------|-------------|--------|
| J00124 | 김기현 | EMP-00124-673 | employee_J00124 | 51 |
| J00127 | 김진성 | EMP-00127-LP5 | employee_J00127 | 34 |
| J00137 | 정다운 | EMP-00137-C7B | employee_J00137 | 5 |

When 김기현 (J00124) queries with "/", the system:
- Searches only in `employee_J00124` namespace
- Returns only documents with `사번: J00124` metadata
- Cannot see data from J00127, J00137, or any other employee

## Security Architecture

### Layer 1: Infrastructure-Level Isolation
- Pinecone namespace provides complete data isolation
- `employee_J00124` and `employee_J00127` are separate namespaces
- Impossible to cross-contaminate at infrastructure level

### Layer 2: Metadata Filtering
- Every query includes filter: `{ 사번: { $eq: "J00124" } }`
- Backup security even if namespace isolation fails

### Layer 3: Application-Level Validation
- Results are validated: all must have matching 사번
- If any mismatch detected → Security violation error thrown
- Query aborted immediately

### Layer 4: Profile Authentication
- Only authenticated users with valid profiles can query
- Profile must have `rag_enabled = true`
- Profile must have valid `pinecone_namespace` set

## Data Types Available

Employees can query these document types:

### 1. Personal Financial Summary
- `최종지급액` (Final payment amount)
- `총수입` (Total income)
- `총환수` (Total clawback)
- `환수비율` (Clawback ratio)

### 2. Contract Information (my_contract)
- `보험사` (Insurance company)
- `상품명` (Product name)
- `계약상태` (Contract status)
- `월납입보험료` (Monthly premium)
- `수수료` (Commission)

### 3. Override Income (my_override)
- `오버라이드수입` (Override income)

### 4. Clawback Details (my_clawback)
- `환수금액` (Clawback amount)
- `환수사유` (Clawback reason)

## Common Questions

### Q: Why don't I see my data?
A: Make sure your query starts with "/". Without it, you're searching the general knowledge base.

### Q: Can I see other employees' data?
A: No. The system enforces strict namespace isolation. You can ONLY see your own data.

### Q: What if I registered but RAG doesn't work?
A: Check with admin to verify:
- Your profile has `pinecone_namespace` set
- Your profile has `rag_enabled = true`
- Your profile is linked to a credential

### Q: Can I use "/" for general questions?
A: No. "/" is ONLY for your personal compensation data. General questions don't need "/".

## Testing

### Test Your Setup

1. **Register with employee code**
   ```
   EMP-00124-673
   ```

2. **Verify welcome message shows**
   ```
   ⭐ 본인 급여 정보 조회는 반드시 "/" 로 시작하세요!
   ```

3. **Test employee query**
   ```
   / 내 최종지급액 알려줘
   ```

4. **Should return YOUR data only**
   ```
   안녕하세요 김기현님,

   검색된 급여 정보:
   [Your specific financial data]
   ```

### Verify Namespace Isolation

Admin can verify with this script:
```bash
npx tsx scripts/test-employee-profile-namespace.ts
```

This checks:
- ✅ Code has correct namespace
- ✅ Profile has namespace set
- ✅ Profile has RAG enabled
- ✅ Profile linked to credential

## Troubleshooting

### Error: "직원 정보를 찾을 수 없습니다"
**Cause**: Profile not found or not linked to employee credential
**Solution**: Contact admin to verify your profile setup

### Error: "RAG 시스템이 활성화되지 않았습니다"
**Cause**: Profile has `rag_enabled = false` or `pinecone_namespace` is null
**Solution**: Contact admin to enable RAG for your account

### No Results Found
**Cause**: Query doesn't match any data in your namespace
**Solution**: Try more specific queries like:
- Include company name: `"/ 메리츠화재 계약"`
- Include date: `"/ 202509 수수료"`
- Use Korean terms: `"/ 최종지급액"`, `"/ 환수"`

### Wrong Data Returned
**Cause**: If you see someone else's data, this is a CRITICAL security bug
**Solution**:
1. Screenshot immediately
2. Stop using the system
3. Contact admin with screenshot
4. Include your 사번 and the 사번 in the leaked data

## API Endpoints Used

### Registration
- `POST /api/kakao/chat` - Handles code verification and profile creation

### Employee RAG Query
- `POST /api/kakao/chat` - Routes "/" queries to employee RAG service
- Uses `lib/services/employee-rag.service.ts`

### Database Tables
- `profiles` - Stores `pinecone_namespace`, `rag_enabled`, `credential_id`
- `user_credentials` - Stores employee details and namespace mapping
- `verification_codes` - Links codes to namespaces
- `employee_rag_queries` - Logs all employee RAG queries

## Monitoring

All employee RAG queries are logged to `employee_rag_queries` table with:
- Query text
- Results count
- Max relevance score
- Query duration
- Pinecone namespace used
- Employee ID

Admins can review query history to:
- Verify namespace isolation is working
- Monitor query performance
- Identify common query patterns
- Debug issues

## Summary

✅ **DO**: Start personal queries with "/"
❌ **DON'T**: Use "/" for general questions
✅ **DO**: Trust the namespace isolation
❌ **DON'T**: Worry about seeing others' data (impossible)
✅ **DO**: Use quick reply buttons for convenience
❌ **DON'T**: Forget the "/" prefix!

---

**Last Updated**: 2025-11-21
**System Version**: Employee RAG v2 (Namespace Isolation)
