# Employee Code Generation - Quick Start Guide

## 🚀 Generate Codes via Admin UI

### Step-by-Step Instructions

#### 1. Access Admin Dashboard

Navigate to your admin dashboard:
```
http://your-domain/admin
```

#### 2. Click "직원 코드 생성" Card

On the admin dashboard, click the **"직원 코드 생성"** (Employee Code Generation) card with the green badge labeled "RAG".

Alternatively, navigate directly to:
```
http://your-domain/admin/employees/generate-codes
```

#### 3. Review What Will Happen

The page will show you exactly what the generation process does:

- ✅ Creates/updates 52 employees in `user_credentials` table
- ✅ Generates unique verification codes
- ✅ Links codes to Pinecone namespaces (employee_J00124, etc.)
- ✅ Enables RAG access for all employees
- ✅ Sets vector counts from Master.md

**Safety Note:** This operation is idempotent - you can run it multiple times safely. Existing codes will be preserved.

#### 4. Click "52명의 직원 코드 생성" Button

Click the large green button at the bottom:
```
🔑 52명의 직원 코드 생성
```

A confirmation dialog will appear:
```
모든 직원(52명)의 코드를 생성하시겠습니까?
```

Click **OK** to proceed.

#### 5. Wait for Generation (5-10 seconds)

The button will show a loading spinner:
```
⏳ 코드 생성 중...
```

The system will:
- Process all 52 employees
- Create/update credentials
- Generate unique codes
- Link to Pinecone namespaces

#### 6. Review Results

Once complete, you'll see:

**Summary Statistics:**
- ✅ **Total**: 52 employees
- ✅ **Created**: X new credentials
- ✅ **Updated**: Y existing credentials
- ✅ **Codes**: Z codes generated
- ❌ **Errors**: 0 (hopefully!)

**Generated Codes Table:**
All 52 employee codes displayed with:
- Employee ID (사번)
- Name (이름)
- Verification Code
- Pinecone Namespace
- Vector Count

#### 7. Download or Copy Codes

**Option A: Download CSV**
Click the **"CSV 다운로드"** button to download a CSV file:
```csv
Employee ID,Name,Code,Namespace,Vector Count
J00124,"김기현",EMP-00124-A3K,employee_J00124,51
J00127,"김진성",EMP-00127-B7M,employee_J00127,34
...
```

**Option B: Copy All Codes**
Click the **"전체 복사"** button to copy all codes to clipboard in format:
```
J00124 | 김기현 | EMP-00124-A3K | employee_J00124
J00127 | 김진성 | EMP-00127-B7M | employee_J00127
...
```

**Option C: Copy Individual Code**
Click the copy icon next to any code to copy just that code.

#### 8. View Codes Anytime

After generation, you can always view codes at:
```
http://your-domain/admin/employees/codes
```

Or click the **"직원 코드 관리"** card on the admin dashboard.

## 📤 Distribute Codes to Employees

### Email Template

```
안녕하세요 [직원명]님,

귀하의 JISA 등록 코드입니다:

┌─────────────────────────┐
│   [EMP-00124-XXX]      │
└─────────────────────────┘

【 등록 방법 】
1. 카카오톡에서 "JISA" 채널 추가
2. 다음 명령어 입력:
   /등록 EMP-00124-XXX

【 사용 방법 】
등록 후 "/" 명령어로 급여 정보를 조회하실 수 있습니다:

• /내 최종지급액은?
• /이번 달 수수료는?
• /환수가 얼마야?
• /메리츠화재 계약은?
• /계약이 몇 개야?

코드는 1년간 유효합니다.

감사합니다.
```

### KakaoTalk Template

```
[JISA 등록 코드]

안녕하세요 [직원명]님 👋

📋 등록 코드: EMP-00124-XXX

✅ 등록하기:
/등록 EMP-00124-XXX

💬 급여 조회:
/내 최종지급액은?
/이번 달 수수료는?
/환수가 얼마야?

유효기간: 1년
```

## 🔍 Verification

### Check if Codes Were Generated

1. Navigate to `/admin/employees/codes`
2. Verify all 52 employees are listed
3. Check that each has:
   - ✅ Unique code (EMP-XXXXX-XXX format)
   - ✅ Pinecone namespace (employee_J00124)
   - ✅ Vector count matches Master.md

### Test Employee Registration

1. Pick one employee code (e.g., EMP-00124-XXX)
2. Test registration flow:
   ```
   /등록 EMP-00124-XXX
   ```
3. Verify profile is updated with:
   - `pinecone_namespace = employee_J00124`
   - `rag_enabled = true`

### Test RAG Query

After registration, test RAG query:
```
/내 최종지급액은?
```

Should return personalized data for that employee only.

## ❓ Troubleshooting

### "Migration needed" Error

**Problem:** Database columns don't exist

**Solution:** Apply the migration first:
1. Go to Supabase Dashboard SQL editor
2. Execute `supabase/migrations/20251121_employee_rag_system.sql`
3. Then run code generation again

### "Code already exists" Message

**Status:** ✅ This is normal!

**Explanation:** Codes are preserved on re-run. The system will:
- Skip employees that already have codes
- Show them in the "Skipped" count
- Include them in the codes table

### Some Employees Missing

**Check:**
1. Look at the "Errors" section
2. Check error messages
3. Verify database connection
4. Ensure all required columns exist

**Fix:**
- Apply migration if columns are missing
- Check Supabase service role key
- Retry generation

## 📊 What Happens Behind the Scenes

### Database Changes

**user_credentials table:**
```sql
INSERT/UPDATE:
- employee_id: "J00124"
- full_name: "김기현"
- pinecone_namespace: "employee_J00124"
- rag_enabled: true
- rag_vector_count: 51
```

**verification_codes table:**
```sql
INSERT:
- code: "EMP-00124-XXX"
- employee_sabon: "J00124"
- pinecone_namespace: "employee_J00124"
- intended_recipient_id: [credential_id]
- expires_at: [1 year from now]
```

### Code Format

Generated codes follow this pattern:
```
EMP-[EmployeeNumber]-[Random3Chars]

Examples:
- EMP-00124-A3K
- EMP-00127-B7M
- EMP-00128-C2N
```

**Properties:**
- ✅ Unique per employee
- ✅ Easy to identify employee
- ✅ Random suffix for security
- ✅ No similar characters (no O/0, I/1, etc.)

## 🎯 Success Checklist

After generation, verify:

- [ ] All 52 employees in codes table
- [ ] Each code is unique
- [ ] Each namespace follows pattern: `employee_J00XXX`
- [ ] Vector counts match Master.md
- [ ] CSV download works
- [ ] Copy to clipboard works
- [ ] Can view codes at `/admin/employees/codes`
- [ ] Test registration with one code
- [ ] Test RAG query with "/" command

## 🔗 Related Pages

- **Admin Dashboard:** `/admin`
- **Code Generation:** `/admin/employees/generate-codes` (This page)
- **Code Management:** `/admin/employees/codes` (View existing codes)
- **API Endpoint:** `/api/admin/employees/populate`

## 📞 Need Help?

1. Check the errors section on the generation page
2. Review `EMPLOYEE_CODE_SYSTEM_GUIDE.md` for detailed documentation
3. Check `APPLY_MIGRATION_INSTRUCTIONS.md` if migration needed
4. Verify environment variables in `.env`

---

**Ready to generate codes?** Navigate to `/admin/employees/generate-codes` and click the big green button! 🚀
