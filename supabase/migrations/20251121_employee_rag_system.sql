-- ============================================================================
-- Employee-Specific RAG System Migration
-- Migration: 20251121_employee_rag_system.sql
-- Purpose: Enable employee-specific Pinecone namespace isolation for RAG
-- Project: ysrudwzwnzxrrwjtpuoh
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD PINECONE NAMESPACE FIELDS
-- ============================================================================

-- Add pinecone_namespace to user_credentials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_credentials'
    AND column_name = 'pinecone_namespace'
  ) THEN
    ALTER TABLE user_credentials
      ADD COLUMN pinecone_namespace TEXT,
      ADD COLUMN rag_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN rag_vector_count INTEGER DEFAULT 0,
      ADD COLUMN rag_last_sync_at TIMESTAMPTZ;

    COMMENT ON COLUMN user_credentials.pinecone_namespace IS 'Pinecone namespace for employee RAG data (e.g., employee_J00124)';
    COMMENT ON COLUMN user_credentials.rag_enabled IS 'Whether employee has RAG data available';
    COMMENT ON COLUMN user_credentials.rag_vector_count IS 'Number of vectors in employee namespace';
  END IF;
END $$;

-- Add pinecone_namespace to profiles (for quick access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'pinecone_namespace'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN pinecone_namespace TEXT,
      ADD COLUMN rag_enabled BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN profiles.pinecone_namespace IS 'Cached pinecone namespace from user_credentials';
    COMMENT ON COLUMN profiles.rag_enabled IS 'Cached RAG availability flag';
  END IF;
END $$;

-- Add pinecone_namespace to verification_codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_codes'
    AND column_name = 'pinecone_namespace'
  ) THEN
    ALTER TABLE verification_codes
      ADD COLUMN pinecone_namespace TEXT,
      ADD COLUMN employee_sabon TEXT;

    COMMENT ON COLUMN verification_codes.pinecone_namespace IS 'Pinecone namespace assigned to this code';
    COMMENT ON COLUMN verification_codes.employee_sabon IS 'Employee sabon (ID) for this code (e.g., J00124)';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE INDEXES
-- ============================================================================

-- Indexes for user_credentials
CREATE INDEX IF NOT EXISTS idx_credentials_namespace
  ON user_credentials(pinecone_namespace)
  WHERE pinecone_namespace IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credentials_rag_enabled
  ON user_credentials(rag_enabled)
  WHERE rag_enabled = TRUE;

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_namespace
  ON profiles(pinecone_namespace)
  WHERE pinecone_namespace IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_rag
  ON profiles(pinecone_namespace, rag_enabled)
  WHERE rag_enabled = TRUE;

-- Indexes for verification_codes
CREATE INDEX IF NOT EXISTS idx_codes_sabon
  ON verification_codes(employee_sabon)
  WHERE employee_sabon IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_codes_namespace
  ON verification_codes(pinecone_namespace)
  WHERE pinecone_namespace IS NOT NULL;

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Function to sync pinecone namespace from credentials to profile
CREATE OR REPLACE FUNCTION sync_profile_rag_info()
RETURNS TRIGGER AS $$
BEGIN
  -- When profile is updated or credential_id changes
  IF NEW.credential_id IS NOT NULL THEN
    UPDATE profiles
    SET
      pinecone_namespace = c.pinecone_namespace,
      rag_enabled = c.rag_enabled,
      updated_at = NOW()
    FROM user_credentials c
    WHERE c.id = NEW.credential_id
      AND profiles.id = NEW.id
      AND (
        profiles.pinecone_namespace IS DISTINCT FROM c.pinecone_namespace
        OR profiles.rag_enabled IS DISTINCT FROM c.rag_enabled
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile sync
DROP TRIGGER IF EXISTS trigger_sync_profile_rag ON profiles;
CREATE TRIGGER trigger_sync_profile_rag
  AFTER INSERT OR UPDATE OF credential_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_rag_info();

-- Function to update user_credentials from verification code
CREATE OR REPLACE FUNCTION update_credential_from_code()
RETURNS TRIGGER AS $$
BEGIN
  -- When code is used, update the linked credential with namespace info
  IF NEW.is_used = TRUE AND NEW.intended_recipient_id IS NOT NULL THEN
    UPDATE user_credentials
    SET
      pinecone_namespace = NEW.pinecone_namespace,
      rag_enabled = (NEW.pinecone_namespace IS NOT NULL),
      updated_at = NOW()
    WHERE id = NEW.intended_recipient_id
      AND (
        pinecone_namespace IS NULL
        OR pinecone_namespace != NEW.pinecone_namespace
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for code usage
DROP TRIGGER IF EXISTS trigger_update_credential_on_code_use ON verification_codes;
CREATE TRIGGER trigger_update_credential_on_code_use
  AFTER UPDATE OF is_used ON verification_codes
  FOR EACH ROW
  WHEN (NEW.is_used = TRUE)
  EXECUTE FUNCTION update_credential_from_code();

-- ============================================================================
-- SECTION 4: EMPLOYEE RAG QUERY HISTORY TABLE
-- ============================================================================

-- Create table to track employee RAG queries
CREATE TABLE IF NOT EXISTS employee_rag_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User & Employee Info
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id TEXT,
  pinecone_namespace TEXT NOT NULL,

  -- Query Details
  query_text TEXT NOT NULL,
  query_type TEXT DEFAULT 'general' CHECK (query_type IN ('general', 'employee_rag', 'compensation', 'document')),

  -- Pinecone Results
  vectors_searched INTEGER DEFAULT 0,
  top_k INTEGER DEFAULT 10,
  max_score FLOAT,
  results_count INTEGER DEFAULT 0,

  -- Response
  response_generated BOOLEAN DEFAULT FALSE,
  response_length INTEGER,

  -- Performance
  query_duration_ms INTEGER,
  embedding_duration_ms INTEGER,
  generation_duration_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  queried_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for employee_rag_queries
CREATE INDEX IF NOT EXISTS idx_rag_queries_profile
  ON employee_rag_queries(profile_id, queried_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_queries_employee
  ON employee_rag_queries(employee_id, queried_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_queries_namespace
  ON employee_rag_queries(pinecone_namespace, queried_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_queries_type
  ON employee_rag_queries(query_type, queried_at DESC);

-- RLS for employee_rag_queries
ALTER TABLE employee_rag_queries ENABLE ROW LEVEL SECURITY;

-- Users can see their own queries
DROP POLICY IF EXISTS "Users can view own RAG queries" ON employee_rag_queries;
CREATE POLICY "Users can view own RAG queries" ON employee_rag_queries
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Admins can see all queries
DROP POLICY IF EXISTS "Admins can view all RAG queries" ON employee_rag_queries;
CREATE POLICY "Admins can view all RAG queries" ON employee_rag_queries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- ============================================================================
-- SECTION 5: VIEWS
-- ============================================================================

-- View for employee RAG status
CREATE OR REPLACE VIEW employee_rag_status AS
SELECT
  c.id as credential_id,
  c.employee_id,
  c.full_name,
  c.email,
  c.department,
  c.position,
  c.pinecone_namespace,
  c.rag_enabled,
  c.rag_vector_count,
  c.rag_last_sync_at,
  p.id as profile_id,
  p.kakao_user_id,
  p.role,
  p.subscription_tier,
  COALESCE(q.query_count, 0) as total_queries,
  q.last_query_at,
  COALESCE(q.avg_score, 0) as avg_relevance_score
FROM user_credentials c
LEFT JOIN profiles p ON p.credential_id = c.id
LEFT JOIN (
  SELECT
    profile_id,
    COUNT(*) as query_count,
    MAX(queried_at) as last_query_at,
    AVG(max_score) as avg_score
  FROM employee_rag_queries
  WHERE query_type = 'employee_rag'
  GROUP BY profile_id
) q ON q.profile_id = p.id
WHERE c.employee_id IS NOT NULL
ORDER BY c.employee_id;

-- Grant access to view
GRANT SELECT ON employee_rag_status TO authenticated;

-- ============================================================================
-- SECTION 6: GRANTS
-- ============================================================================

GRANT SELECT ON employee_rag_queries TO authenticated;
GRANT INSERT ON employee_rag_queries TO authenticated;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  credential_count INTEGER;
  profile_count INTEGER;
  code_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO credential_count
  FROM user_credentials
  WHERE employee_id IS NOT NULL;

  SELECT COUNT(*) INTO profile_count
  FROM profiles
  WHERE credential_id IS NOT NULL;

  SELECT COUNT(*) INTO code_count
  FROM verification_codes
  WHERE employee_sabon IS NOT NULL;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Employee RAG System Migration Complete';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Employees in user_credentials: %', credential_count;
  RAISE NOTICE 'Profiles with credentials: %', profile_count;
  RAISE NOTICE 'Codes with employee sabon: %', code_count;
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  - Pinecone namespace tracking in credentials, profiles, codes';
  RAISE NOTICE '  - Employee RAG query history table';
  RAISE NOTICE '  - Automatic namespace sync triggers';
  RAISE NOTICE '  - Employee RAG status view';
  RAISE NOTICE '============================================================================';
END $$;
