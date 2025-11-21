# Apply Employee RAG Migration - Instructions

## 🎯 Quick Steps

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/kuixphvkbuuzfezoeyii/sql/new
   ```

2. **Copy the migration SQL:**
   - Open file: `supabase/migrations/20251121_employee_rag_system.sql`
   - Copy ALL contents (lines 1-323)

3. **Paste and Execute:**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" button
   - Wait for completion (should take 5-10 seconds)

4. **Verify Success:**
   Look for this message at the bottom:
   ```
   Employee RAG System Migration Complete
   Employees in user_credentials: [number]
   Profiles with credentials: [number]
   Codes with employee sabon: [number]
   ```

### Method 2: Using Supabase CLI (Alternative)

If you have Supabase CLI installed:

```bash
# Apply migration
supabase db push --db-url "postgresql://postgres.kuixphvkbuuzfezoeyii:ModawnAI2024!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

# Or apply specific migration
supabase migration up --db-url "..." --file supabase/migrations/20251121_employee_rag_system.sql
```

## 🔍 What This Migration Does

### Tables Modified:

1. **user_credentials** - Adds:
   - `pinecone_namespace` (TEXT) - Employee's Pinecone namespace
   - `rag_enabled` (BOOLEAN) - RAG access flag
   - `rag_vector_count` (INTEGER) - Number of vectors
   - `rag_last_sync_at` (TIMESTAMPTZ) - Last sync timestamp

2. **profiles** - Adds:
   - `pinecone_namespace` (TEXT) - Cached namespace
   - `rag_enabled` (BOOLEAN) - Cached RAG flag

3. **verification_codes** - Adds:
   - `employee_sabon` (TEXT) - Employee ID (e.g., J00124)
   - `pinecone_namespace` (TEXT) - Assigned namespace

### New Features:

4. **employee_rag_queries** table - Tracks:
   - All employee RAG queries
   - Performance metrics
   - Relevance scores
   - Query history

5. **Triggers:**
   - Auto-sync namespace from credentials to profile
   - Auto-update credentials when code is used

6. **Views:**
   - `employee_rag_status` - Comprehensive RAG status view

## ✅ After Migration

Once the migration is applied successfully:

### Step 1: Run Population Script

```bash
cd /home/bitnami/archive/context-hub/jisa_app
npx tsx scripts/populate-employees-with-codes.ts
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Employee Population & Code Generation Script            ║
╚════════════════════════════════════════════════════════════╝

[1/52] Processing 김기현 (J00124)...
   ✅ Created new credential (ID: ...)
   ✅ Generated code: EMP-00124-XXX

[2/52] Processing 김진성 (J00127)...
...

📊 Summary:
   ✅ Credentials created: 52
   🔑 Codes generated: 52
   ❌ Errors: 0

💾 Codes saved to: employee-codes.json
```

### Step 2: Access Admin Panel

Navigate to:
```
http://your-domain/admin/employees/codes
```

You should see:
- List of all 52 employee codes
- Copy/download buttons
- Usage status for each code

### Step 3: Distribute Codes

**Copy codes from admin panel and send to employees via:**
- Email
- KakaoTalk
- Internal messaging system

**Include registration instructions:**
```
안녕하세요! 귀하의 JISA 등록 코드입니다:

[CODE_HERE]

카카오톡에서 사용하려면:
/등록 [코드]

등록 후 "/" 명령어로 급여 정보를 조회할 수 있습니다:
/내 최종지급액은?
/이번 달 수수료는?
```

## 🚨 Troubleshooting

### Migration Fails

**Error:** "Column already exists"
- **Solution:** Migration is idempotent, this is OK. The column was added previously.

**Error:** "Permission denied"
- **Solution:** Use Service Role key in Supabase Dashboard SQL editor

**Error:** "Table not found"
- **Solution:** Check that you're connected to the correct project (kuixphvkbuuzfezoeyii)

### Verification

After migration, run this SQL to verify:

```sql
-- Check user_credentials columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'user_credentials'
AND column_name IN ('pinecone_namespace', 'rag_enabled', 'rag_vector_count');

-- Check profiles columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('pinecone_namespace', 'rag_enabled');

-- Check verification_codes columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'verification_codes'
AND column_name IN ('employee_sabon', 'pinecone_namespace');

-- Check employee_rag_queries table
SELECT COUNT(*) FROM employee_rag_queries;
```

Expected result: Should show all columns exist.

## 📞 Need Help?

If migration fails:

1. **Check Project ID:**
   - Confirm: `kuixphvkbuuzfezoeyii`
   - URL: `https://supabase.com/dashboard/project/kuixphvkbuuzfezoeyii`

2. **Check Permissions:**
   - Use Service Role key (not Anon key)
   - Check in project settings

3. **Manual Application:**
   - Copy migration SQL file contents
   - Paste into Supabase Dashboard SQL editor
   - Execute manually

---

**Ready to proceed?** Follow Method 1 above to apply the migration!
