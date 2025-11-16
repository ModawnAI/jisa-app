# Pinecone Data Admin Display Issue - Root Cause Analysis

## Investigation Date
2025-11-14

## Problem Statement
User reports that "none of the pinecone data is being displayed in the admin dashboard" and requests verification of Pinecone upsert schema.

## Root Cause Analysis

### 1. **MISSING ADMIN PAGE FOR VIEWING DATA**
**Critical Issue**: There is NO admin page to view documents or contexts!

Current admin pages:
- ✅ `/admin/data/upload` - Upload new documents
- ✅ `/admin/data/jobs` - Monitor ingestion jobs
- ✅ `/admin/data/jobs/[id]` - View individual job details
- ❌ **MISSING**: `/admin/data/documents` - View uploaded documents
- ❌ **MISSING**: `/admin/data/contexts` - View knowledge base contexts

**Result**: User has no way to see the 398 contexts that exist in the database!

### 2. **SCHEMA MISMATCH: Python Scripts vs TypeScript System**

#### Current Database State:
```sql
-- Contexts table: 398 records (from Python scripts)
SELECT COUNT(*) FROM contexts;  -- 398 rows
SELECT COUNT(*) FROM contexts WHERE document_id IS NULL;  -- 398 rows (all orphaned!)

-- Documents table: EMPTY (no parent documents created)
SELECT COUNT(*) FROM documents;  -- 0 rows
```

#### Python Upload Scripts (Legacy):
**Files**:
- `upload_hanwha_ultragranular.py`
- `upload_schedules_ultragranular.py`
- `upsert_to_pinecone.py`

**What they did**:
1. ✅ Created vectors in Pinecone
2. ✅ Created `contexts` records in Supabase
3. ❌ Did NOT create `documents` records
4. ❌ Left `contexts.document_id = NULL` (orphaned contexts)

**Pinecone metadata from Python scripts**:
```python
{
    "document_title": "HO&F지사 11월 시책공지",
    "company": "한화생명",
    "category": "insurance_commission_table",
    "chunk_type": "table_cell_commission",
    "product_name": "...",
    "payment_term": "...",
    "commission_label": "...",
    "commission_value": "...",
    # ... many custom fields
}
```

#### TypeScript Ingestion Service (New Architecture):
**File**: `lib/services/ingestion.service.ts`

**What it does**:
1. ✅ Creates `documents` record first
2. ✅ Creates `contexts` records linked to document
3. ✅ Syncs vectors to Pinecone with RBAC metadata
4. ✅ Properly links everything with foreign keys

**Expected schema**:
```typescript
// Step 1: Create document
documents {
  id: uuid,
  title: string,
  content: text,
  pdf_url: string,
  access_level: string,
  // ... RBAC fields
}

// Step 2: Create contexts linked to document
contexts {
  id: uuid,
  document_id: uuid -> documents.id,  // ✅ Properly linked!
  title: string,
  content: text,
  pinecone_id: string,
  // ... RBAC fields
}

// Step 3: Upsert to Pinecone
{
  id: context.id,
  values: [...embedding...],
  metadata: {
    content: string,
    document_id: uuid,
    access_level: string,
    access_roles: string[],
    // ... RBAC metadata
  }
}
```

### 3. **INCOMPATIBLE METADATA SCHEMAS**

#### Python Scripts Metadata (Domain-specific):
```json
{
  "chunk_type": "table_cell_commission",
  "product_name": "무배당 뉴원더풀치아보험",
  "payment_term": "20년납",
  "commission_label": "익월 28 수수료",
  "commission_value": "30.0%",
  "is_current_month": true,
  "is_13th_month": false,
  "searchable_text": "무배당 뉴원더풀치아보험 20년납 익월 28 수수료: 30.0%"
}
```

#### TypeScript Service Metadata (RBAC-focused):
```json
{
  "content": "chunk text...",
  "title": "Document Title - Chunk 1/10",
  "document_id": "uuid",
  "access_level": "standard",
  "required_role": "user",
  "required_tier": "free",
  "access_roles": ["ceo", "admin", "manager", "senior", "junior", "user"],
  "access_tiers": ["enterprise", "pro", "basic", "free"],
  "embedding_model": "text-embedding-3-large",
  "created_at": "2025-11-13T..."
}
```

**Impact**: Two completely different metadata structures for the same namespace!

## Data Verification

### Existing Pinecone Data:
```sql
-- All contexts are properly synced to Pinecone
SELECT
  COUNT(*) as total,
  COUNT(pinecone_id) as with_pinecone_id,
  pinecone_namespace
FROM contexts;

Result:
total: 398
with_pinecone_id: 398
pinecone_namespace: hof-knowledge-base-max
```

**Verdict**: ✅ All contexts have Pinecone IDs - data IS in Pinecone!

### Sample Context Records:
```
id: 72ddab75-fa62-4d79-acea-43217d03d680
title: "Imported Context"
document_id: NULL  ❌ (orphaned)
pinecone_id: "9fa23821855f6cb0"
pinecone_namespace: "hof-knowledge-base-max"
access_level: "public"
```

## Solutions Required

### **SOLUTION 1: Create Admin Data Viewer Pages** ⭐ HIGHEST PRIORITY

Create two new admin pages:

#### A. Document Library Page (`/admin/data/documents`)
```typescript
// app/admin/data/documents/page.tsx
- List all documents from documents table
- Show: title, access_level, created_at, pdf_url
- Filter by: access_level, date range
- Search by: title, content
- Actions: View, Edit access, Delete
- Link to contexts for each document
```

#### B. Knowledge Base Browser (`/admin/data/contexts`)
```typescript
// app/admin/data/contexts/page.tsx
- List all contexts from contexts table
- Show: title, document_id, pinecone_id, access_level
- Filter by: orphaned (document_id IS NULL), namespace, access_level
- Search by: content, title
- Actions: View content, Link to document, Delete
- Highlight orphaned contexts with document_id = NULL
```

### **SOLUTION 2: Migrate Orphaned Contexts**

Create migration to link existing 398 contexts to parent documents:

```sql
-- supabase/migrations/20251114_link_orphaned_contexts.sql

-- Step 1: Create placeholder documents for orphaned contexts
INSERT INTO documents (
  id,
  title,
  content,
  access_level,
  namespace,
  created_at,
  metadata
)
SELECT
  gen_random_uuid(),
  'Imported Knowledge Base Data',
  'Data imported from Python scripts before TypeScript migration',
  'public',
  'hof-knowledge-base-max',
  NOW(),
  jsonb_build_object(
    'source', 'python_scripts',
    'migration_date', NOW(),
    'imported', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM documents
  WHERE title = 'Imported Knowledge Base Data'
);

-- Step 2: Link all orphaned contexts to the placeholder document
WITH placeholder AS (
  SELECT id FROM documents
  WHERE title = 'Imported Knowledge Base Data'
  LIMIT 1
)
UPDATE contexts
SET document_id = (SELECT id FROM placeholder)
WHERE document_id IS NULL;

-- Step 3: Verify
SELECT
  COUNT(*) as total_contexts,
  COUNT(document_id) as linked_contexts,
  COUNT(*) FILTER (WHERE document_id IS NULL) as orphaned_contexts
FROM contexts;
-- Should show: total=398, linked=398, orphaned=0
```

### **SOLUTION 3: Standardize Metadata Schema**

Decision needed: Which metadata schema to use?

**Option A: Keep Both Schemas (Recommended)**
- Python scripts metadata = domain-specific, searchable
- TypeScript metadata = RBAC, access control
- Merge both in Pinecone metadata (up to 40KB limit)

**Option B: Migrate to RBAC-only**
- Lose valuable domain-specific metadata
- Simpler but less functional

**Option C: Hybrid Approach**
```typescript
// Combined metadata in Pinecone
{
  // RBAC fields (required)
  access_level: "standard",
  required_role: "user",
  access_roles: [...],

  // Document reference (required)
  document_id: "uuid",
  content: "searchable text...",

  // Domain-specific fields (optional, from metadata jsonb)
  chunk_type: "table_cell_commission",
  product_name: "...",
  commission_value: "...",
  // ... preserve valuable Python metadata
}
```

### **SOLUTION 4: Update Ingestion Service**

Modify `lib/services/ingestion.service.ts` to:

1. Support custom metadata fields
2. Preserve domain-specific metadata from uploads
3. Add migration mode for existing data

```typescript
// Enhancement needed in syncToPinecone()
private async syncToPinecone(
  contextIds: string[],
  embeddings: number[][],
  job: any
): Promise<void> {
  // ... existing code ...

  const vectors = contexts.map((ctx, index) => ({
    id: ctx.id,
    values: embeddings[index],
    metadata: {
      // Core RBAC (always present)
      content: ctx.content.substring(0, 10000),
      title: ctx.title,
      document_id: ctx.document_id,
      access_level: ctx.access_level,
      access_roles: this.getRoleHierarchy(ctx.required_role || 'user'),

      // Preserve existing metadata from ctx.metadata jsonb field
      ...ctx.metadata,  // 🆕 Merge custom fields!

      // Indexing metadata
      embedding_model: ctx.embedding_model,
      created_at: ctx.created_at,
    },
  }));
}
```

## Immediate Action Items

1. ✅ **[COMPLETED]** Verify Pinecone data exists (398 contexts confirmed)
2. ✅ **[COMPLETED]** Identify schema mismatch between Python and TypeScript
3. ✅ **[COMPLETED]** Determine why admin shows no data (missing pages)
4. 🔄 **[IN PROGRESS]** Create migration to link orphaned contexts
5. ⏳ **[TODO]** Create `/admin/data/documents` page
6. ⏳ **[TODO]** Create `/admin/data/contexts` page
7. ⏳ **[TODO]** Update ingestion service to preserve custom metadata

## Files Requiring Changes

### New Files to Create:
1. `app/admin/data/documents/page.tsx` - Document library viewer
2. `app/admin/data/contexts/page.tsx` - Knowledge base browser
3. `app/api/admin/data/documents/route.ts` - Documents API
4. `app/api/admin/data/contexts/route.ts` - Contexts API
5. `supabase/migrations/20251114_link_orphaned_contexts.sql` - Migration

### Files to Modify:
1. `lib/services/ingestion.service.ts` - Add custom metadata support
2. `components/dashboard/sidebar.tsx` - Add navigation links

## Summary

**Why no Pinecone data shows in admin:**
1. ❌ No admin pages exist to view documents or contexts
2. ❌ Documents table is empty (Python scripts didn't create documents)
3. ❌ All 398 contexts are orphaned (document_id = NULL)
4. ✅ Pinecone data DOES exist and is properly synced

**The data is there, but there's no UI to see it!**
