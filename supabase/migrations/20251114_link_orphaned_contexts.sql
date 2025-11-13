/**
 * Migration: Link Orphaned Contexts to Parent Documents
 * Date: 2025-11-14
 *
 * Purpose:
 * - Create placeholder document for 398 orphaned contexts
 * - Link all contexts without document_id to the placeholder
 * - Ensure referential integrity for admin display
 *
 * Context:
 * Python upload scripts created contexts directly without parent documents.
 * The new TypeScript architecture requires documents → contexts hierarchy.
 */

BEGIN;

-- Step 1: Create placeholder document for imported Python data
INSERT INTO documents (
  id,
  title,
  content,
  access_level,
  namespace,
  pdf_url,
  created_at,
  metadata
)
SELECT
  gen_random_uuid(),
  'Legacy Knowledge Base Data (Imported)',
  'Historical knowledge base data imported from Python scripts before migration to TypeScript ingestion system. This includes schedule data, commission tables, and general information uploaded via upload_hanwha_ultragranular.py and upload_schedules_ultragranular.py scripts.',
  'public',
  'hof-knowledge-base-max',
  NULL,
  '2025-11-13 10:48:00+00',  -- Earliest context creation timestamp
  jsonb_build_object(
    'source', 'python_upload_scripts',
    'migration_date', NOW(),
    'migration_script', '20251114_link_orphaned_contexts.sql',
    'imported', true,
    'original_scripts', ARRAY[
      'upload_hanwha_ultragranular.py',
      'upload_schedules_ultragranular.py',
      'upsert_to_pinecone.py'
    ],
    'context_count', (SELECT COUNT(*) FROM contexts WHERE document_id IS NULL),
    'note', 'Contexts were created directly by Python scripts without parent document records'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM documents
  WHERE title = 'Legacy Knowledge Base Data (Imported)'
);

-- Step 2: Link all orphaned contexts to the placeholder document
WITH placeholder AS (
  SELECT id FROM documents
  WHERE title = 'Legacy Knowledge Base Data (Imported)'
  LIMIT 1
),
orphaned_contexts AS (
  SELECT id FROM contexts
  WHERE document_id IS NULL
)
UPDATE contexts
SET
  document_id = (SELECT id FROM placeholder),
  updated_at = NOW()
WHERE id IN (SELECT id FROM orphaned_contexts);

-- Step 3: Add metadata to updated contexts
WITH placeholder AS (
  SELECT id FROM documents
  WHERE title = 'Legacy Knowledge Base Data (Imported)'
  LIMIT 1
)
UPDATE contexts
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{migration_linked}',
  'true'::jsonb
)
WHERE document_id = (SELECT id FROM placeholder);

-- Step 4: Verify results
DO $$
DECLARE
  total_contexts INT;
  linked_contexts INT;
  orphaned_contexts INT;
  placeholder_id UUID;
BEGIN
  -- Count contexts
  SELECT COUNT(*) INTO total_contexts FROM contexts;
  SELECT COUNT(*) INTO linked_contexts FROM contexts WHERE document_id IS NOT NULL;
  SELECT COUNT(*) INTO orphaned_contexts FROM contexts WHERE document_id IS NULL;

  -- Get placeholder document ID
  SELECT id INTO placeholder_id FROM documents
  WHERE title = 'Legacy Knowledge Base Data (Imported)';

  -- Log results
  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Total contexts: %', total_contexts;
  RAISE NOTICE 'Linked contexts: %', linked_contexts;
  RAISE NOTICE 'Orphaned contexts: %', orphaned_contexts;
  RAISE NOTICE 'Placeholder document ID: %', placeholder_id;

  -- Verify migration success
  IF orphaned_contexts > 0 THEN
    RAISE EXCEPTION 'Migration failed: % orphaned contexts remain', orphaned_contexts;
  END IF;

  IF linked_contexts != total_contexts THEN
    RAISE EXCEPTION 'Migration incomplete: Expected % linked, got %', total_contexts, linked_contexts;
  END IF;

  RAISE NOTICE '✅ Migration successful: All contexts linked to documents';
END $$;

-- Step 5: Create index for faster queries on document_id
CREATE INDEX IF NOT EXISTS idx_contexts_document_id
ON contexts(document_id)
WHERE document_id IS NOT NULL;

-- Step 6: Update RLS policies if needed (contexts should inherit document access)
-- (No changes needed - existing RLS policies handle document-based access)

COMMIT;

-- Post-migration verification query (run manually to verify)
-- SELECT
--   d.title as document_title,
--   COUNT(c.id) as context_count,
--   d.created_at as document_created,
--   d.namespace,
--   d.access_level
-- FROM documents d
-- LEFT JOIN contexts c ON c.document_id = d.id
-- GROUP BY d.id, d.title, d.created_at, d.namespace, d.access_level
-- ORDER BY d.created_at DESC;
