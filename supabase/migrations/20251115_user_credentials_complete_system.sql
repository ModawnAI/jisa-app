-- ============================================================================
-- JISA User Credentials & Multi-Dimensional Classification System
-- Migration: 20251115_user_credentials_complete_system.sql
-- Purpose: Implement user-based code generation and enhanced content classification
-- Supabase Project: kuixphvkbuuzfezoeyii
-- ============================================================================

-- ============================================================================
-- SECTION 1: USER CREDENTIALS SYSTEM
-- ============================================================================

-- Create user_credentials table
CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Identity (captured during code generation)
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  employee_id TEXT,
  national_id_hash TEXT,  -- Hashed for security (bcrypt)

  -- Organizational Context
  department TEXT,
  team TEXT,
  position TEXT,
  hire_date DATE,
  location TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended', 'inactive')),
  verified_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraints as separate indexes (supports partial uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS unique_employee_id ON user_credentials(employee_id) WHERE employee_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_email ON user_credentials(email) WHERE email IS NOT NULL;

-- Additional indexes for user_credentials
CREATE INDEX IF NOT EXISTS idx_credentials_employee_id ON user_credentials(employee_id);
CREATE INDEX IF NOT EXISTS idx_credentials_email ON user_credentials(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_phone ON user_credentials(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_status ON user_credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_dept ON user_credentials(department);
CREATE INDEX IF NOT EXISTS idx_credentials_lookup ON user_credentials(employee_id, email) WHERE status = 'verified';

-- RLS Policies for user_credentials (Admin only)
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to user_credentials" ON user_credentials;
CREATE POLICY "Admin full access to user_credentials" ON user_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- ============================================================================
-- SECTION 2: ENHANCED VERIFICATION CODES
-- ============================================================================

-- Add new columns to verification_codes table
DO $$
BEGIN
  -- Intended recipient tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_codes' AND column_name = 'intended_recipient_id') THEN
    ALTER TABLE verification_codes
      ADD COLUMN intended_recipient_id UUID REFERENCES user_credentials(id),
      ADD COLUMN intended_recipient_name TEXT,
      ADD COLUMN intended_recipient_email TEXT,
      ADD COLUMN intended_recipient_employee_id TEXT;
  END IF;

  -- Credential verification requirements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_codes' AND column_name = 'requires_credential_match') THEN
    ALTER TABLE verification_codes
      ADD COLUMN requires_credential_match BOOLEAN DEFAULT FALSE,
      ADD COLUMN credential_match_fields JSONB DEFAULT '[]';
  END IF;

  -- Distribution tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_codes' AND column_name = 'distribution_method') THEN
    ALTER TABLE verification_codes
      ADD COLUMN distribution_method TEXT CHECK (distribution_method IN ('kakao', 'email', 'sms', 'manual', NULL)),
      ADD COLUMN distribution_status TEXT DEFAULT 'pending' CHECK (distribution_status IN ('pending', 'sent', 'delivered', 'failed')),
      ADD COLUMN distributed_at TIMESTAMPTZ;
  END IF;

  -- Usage restrictions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_codes' AND column_name = 'allowed_kakao_user_ids') THEN
    ALTER TABLE verification_codes
      ADD COLUMN allowed_kakao_user_ids TEXT[],
      ADD COLUMN ip_restriction TEXT[],
      ADD COLUMN time_restriction JSONB;
  END IF;

  -- Enhanced metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_codes' AND column_name = 'notes') THEN
    ALTER TABLE verification_codes
      ADD COLUMN notes TEXT,
      ADD COLUMN auto_expire_after_first_use BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Additional indexes for verification_codes
CREATE INDEX IF NOT EXISTS idx_codes_intended_recipient ON verification_codes(intended_recipient_id);
CREATE INDEX IF NOT EXISTS idx_codes_intended_email ON verification_codes(intended_recipient_email) WHERE intended_recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_codes_distribution ON verification_codes(distribution_status, distributed_at);
CREATE INDEX IF NOT EXISTS idx_codes_active ON verification_codes(code, status) WHERE status = 'active';

-- ============================================================================
-- SECTION 3: ENHANCED PROFILES TABLE
-- ============================================================================

-- Add credential tracking to profiles
DO $$
BEGIN
  -- Link to user credentials
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credential_id') THEN
    ALTER TABLE profiles
      ADD COLUMN credential_id UUID REFERENCES user_credentials(id),
      ADD COLUMN credential_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN credential_verified_at TIMESTAMPTZ;
  END IF;

  -- Store credential snapshot at verification (for audit)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credential_snapshot') THEN
    ALTER TABLE profiles
      ADD COLUMN credential_snapshot JSONB;
  END IF;

  -- Add verification code reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified_with_code') THEN
    ALTER TABLE profiles
      ADD COLUMN verified_with_code TEXT;
  END IF;
END $$;

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_credential_id ON profiles(credential_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_code ON profiles(verified_with_code);
CREATE INDEX IF NOT EXISTS idx_profiles_kakao ON profiles(kakao_user_id) WHERE kakao_user_id IS NOT NULL;

-- ============================================================================
-- SECTION 4: CREDENTIAL VERIFICATION LOG
-- ============================================================================

-- Create credential_verification_log table
CREATE TABLE IF NOT EXISTS credential_verification_log (
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
  match_status TEXT CHECK (match_status IN ('matched', 'partial_match', 'no_match', 'no_credential_required')),
  match_score FLOAT,
  match_details JSONB,

  -- Outcome
  verification_result TEXT CHECK (verification_result IN ('success', 'failed', 'rejected')),
  rejection_reason TEXT,
  profile_created UUID REFERENCES profiles(id),

  -- Context
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'
);

-- Indexes for credential_verification_log
CREATE INDEX IF NOT EXISTS idx_verification_log_code ON credential_verification_log(verification_code);
CREATE INDEX IF NOT EXISTS idx_verification_log_kakao ON credential_verification_log(kakao_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_timestamp ON credential_verification_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_verification_log_status ON credential_verification_log(match_status, verification_result);

-- RLS Policies for credential_verification_log (Admin read-only)
ALTER TABLE credential_verification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read access to verification log" ON credential_verification_log;
CREATE POLICY "Admin read access to verification log" ON credential_verification_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- ============================================================================
-- SECTION 5: MULTI-DIMENSIONAL CONTENT CLASSIFICATION
-- ============================================================================

-- Extend documents table with multi-dimensional classification
DO $$
BEGIN
  -- Sensitivity Level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'sensitivity_level') THEN
    ALTER TABLE documents
      ADD COLUMN sensitivity_level TEXT DEFAULT 'internal' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'secret'));
  END IF;

  -- Content Categorization
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'content_category') THEN
    ALTER TABLE documents
      ADD COLUMN content_category TEXT[];
  END IF;

  -- Target Audience
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'target_departments') THEN
    ALTER TABLE documents
      ADD COLUMN target_departments TEXT[],
      ADD COLUMN target_roles TEXT[],
      ADD COLUMN target_tiers TEXT[],
      ADD COLUMN target_positions TEXT[];
  END IF;

  -- Time-based access
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'available_from') THEN
    ALTER TABLE documents
      ADD COLUMN available_from TIMESTAMPTZ,
      ADD COLUMN available_until TIMESTAMPTZ;
  END IF;

  -- Geographic restrictions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'geo_restrictions') THEN
    ALTER TABLE documents
      ADD COLUMN geo_restrictions TEXT[];
  END IF;

  -- Compliance & Regulatory
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'compliance_tags') THEN
    ALTER TABLE documents
      ADD COLUMN compliance_tags TEXT[];
  END IF;

  -- Content Lifecycle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'version_number') THEN
    ALTER TABLE documents
      ADD COLUMN version_number TEXT,
      ADD COLUMN superseded_by UUID REFERENCES documents(id);
  END IF;

  -- Auto-classification metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'auto_classified') THEN
    ALTER TABLE documents
      ADD COLUMN auto_classified BOOLEAN DEFAULT FALSE,
      ADD COLUMN classification_confidence FLOAT,
      ADD COLUMN classification_method TEXT CHECK (classification_method IN ('manual', 'ai', 'rule-based', NULL));
  END IF;
END $$;

-- Indexes for documents multi-dimensional filtering
CREATE INDEX IF NOT EXISTS idx_docs_sensitivity ON documents(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_docs_categories ON documents USING GIN(content_category);
CREATE INDEX IF NOT EXISTS idx_docs_departments ON documents USING GIN(target_departments);
CREATE INDEX IF NOT EXISTS idx_docs_availability ON documents(available_from, available_until);

-- ============================================================================
-- SECTION 6: MULTI-DIMENSIONAL CLASSIFICATION FOR CONTEXTS
-- ============================================================================

-- Extend contexts table with multi-dimensional classification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contexts' AND column_name = 'sensitivity_level') THEN
    ALTER TABLE contexts
      ADD COLUMN sensitivity_level TEXT DEFAULT 'internal' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'secret')),
      ADD COLUMN content_category TEXT[],
      ADD COLUMN target_departments TEXT[],
      ADD COLUMN target_roles TEXT[],
      ADD COLUMN target_tiers TEXT[],
      ADD COLUMN target_positions TEXT[],
      ADD COLUMN available_from TIMESTAMPTZ,
      ADD COLUMN available_until TIMESTAMPTZ,
      ADD COLUMN geo_restrictions TEXT[],
      ADD COLUMN compliance_tags TEXT[];
  END IF;
END $$;

-- Indexes for contexts multi-dimensional filtering
CREATE INDEX IF NOT EXISTS idx_contexts_sensitivity ON contexts(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_contexts_categories ON contexts USING GIN(content_category);
CREATE INDEX IF NOT EXISTS idx_contexts_departments ON contexts USING GIN(target_departments);

-- ============================================================================
-- SECTION 7: MATERIALIZED VIEW FOR USER ACCESS SUMMARY
-- ============================================================================

-- Create materialized view for efficient user access summary
CREATE MATERIALIZED VIEW IF NOT EXISTS user_access_summary AS
SELECT
  p.id,
  p.kakao_user_id,
  p.kakao_nickname,
  p.role,
  p.subscription_tier,
  p.department,
  p.credential_verified,
  p.verified_with_code,
  c.full_name,
  c.email,
  c.employee_id,
  c.position,
  c.status as credential_status,
  p.created_at as registered_at,
  p.last_chat_at
FROM profiles p
LEFT JOIN user_credentials c ON c.id = p.credential_id
WHERE p.kakao_user_id IS NOT NULL;

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_user_summary_id ON user_access_summary(id);
CREATE INDEX IF NOT EXISTS idx_user_summary_kakao ON user_access_summary(kakao_user_id);

-- ============================================================================
-- SECTION 8: HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_credentials updated_at
DROP TRIGGER IF EXISTS update_user_credentials_updated_at ON user_credentials;
CREATE TRIGGER update_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 9: MIGRATE EXISTING DATA
-- ============================================================================

-- Create pending credentials for existing KakaoTalk users (legacy migration)
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
  AND NOT EXISTS (
    SELECT 1 FROM user_credentials c
    WHERE c.metadata->>'original_profile_id' = p.id::text
  )
ON CONFLICT DO NOTHING;

-- Link credentials to profiles
UPDATE profiles p
SET
  credential_id = c.id,
  credential_verified = FALSE,
  metadata = COALESCE(p.metadata, '{}'::jsonb) ||
             jsonb_build_object('requires_credential_update', true)
FROM user_credentials c
WHERE c.metadata->>'original_profile_id' = p.id::text
  AND c.metadata->>'legacy_migration' = 'true'
  AND p.credential_id IS NULL;

-- Set default sensitivity_level for existing documents (if not set)
UPDATE documents
SET sensitivity_level = 'internal'
WHERE sensitivity_level IS NULL;

-- Set default sensitivity_level for existing contexts (if not set)
UPDATE contexts
SET sensitivity_level = 'internal'
WHERE sensitivity_level IS NULL;

-- ============================================================================
-- SECTION 10: GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON user_credentials TO authenticated;
GRANT SELECT ON credential_verification_log TO authenticated;
GRANT SELECT ON user_access_summary TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Refresh materialized view
REFRESH MATERIALIZED VIEW user_access_summary;

-- Display summary
DO $$
DECLARE
  credential_count INTEGER;
  profile_count INTEGER;
  document_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO credential_count FROM user_credentials;
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE credential_id IS NOT NULL;
  SELECT COUNT(*) INTO document_count FROM documents WHERE sensitivity_level IS NOT NULL;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'JISA User Credentials System Migration Complete';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'User Credentials Created: %', credential_count;
  RAISE NOTICE 'Profiles Linked: %', profile_count;
  RAISE NOTICE 'Documents Enhanced: %', document_count;
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Database: kuixphvkbuuzfezoeyii';
  RAISE NOTICE '============================================================================';
END $$;
