/**
 * User-Based Code Generation & Multi-Dimensional Content Classification
 * Migration: Phase 1 - Database Schema Enhancement
 * Date: 2025-11-15
 *
 * Project: kuixphvkbuuzfezoeyii
 *
 * Purpose:
 * 1. Create user_credentials table for identity management
 * 2. Extend verification_codes with credential tracking
 * 3. Link profiles to credentials
 * 4. Add multi-dimensional classification to documents/contexts
 * 5. Create audit trail for credential verification
 */

BEGIN;

-- =====================================================
-- PART 1: USER CREDENTIALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Identity (captured during code generation)
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  employee_id TEXT,
  national_id_hash TEXT,  -- Hashed for security (SHA-256)

  -- Organizational Context
  department TEXT,
  team TEXT,
  position TEXT,
  hire_date DATE,
  location TEXT,
  organization_unit TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended', 'inactive')),
  verified_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_employee_id UNIQUE (employee_id),
  CONSTRAINT unique_email UNIQUE (email) WHERE email IS NOT NULL,
  CONSTRAINT check_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
  CONSTRAINT check_phone_format CHECK (phone_number ~ '^[0-9+-]{10,15}$' OR phone_number IS NULL)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_credentials_employee_id ON user_credentials(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_email ON user_credentials(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_phone ON user_credentials(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_status ON user_credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_dept ON user_credentials(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_position ON user_credentials(position) WHERE position IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_created_at ON user_credentials(created_at DESC);

-- Comments
COMMENT ON TABLE user_credentials IS 'User identity and organizational data for credential-based code generation';
COMMENT ON COLUMN user_credentials.full_name IS 'Full name as appears on ID documents';
COMMENT ON COLUMN user_credentials.employee_id IS 'Unique employee identifier (e.g., EMP-2024-001)';
COMMENT ON COLUMN user_credentials.national_id_hash IS 'SHA-256 hashed national ID for verification';
COMMENT ON COLUMN user_credentials.status IS 'pending: awaiting verification, verified: confirmed, suspended: access revoked, inactive: archived';

-- =====================================================
-- PART 2: EXTEND VERIFICATION_CODES TABLE
-- =====================================================

-- Add intended recipient tracking
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS intended_recipient_id UUID REFERENCES user_credentials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intended_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS intended_recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS intended_recipient_employee_id TEXT;

-- Add credential verification requirements
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS requires_credential_match BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credential_match_fields JSONB DEFAULT '[]';  -- ["email", "employee_id"]

-- Add distribution tracking
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS distribution_method TEXT CHECK (distribution_method IN ('kakao', 'email', 'sms', 'manual', 'bulk') OR distribution_method IS NULL),
  ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending' CHECK (distribution_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ;

-- Add usage restrictions
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS allowed_kakao_user_ids TEXT[],  -- Restrict to specific KakaoTalk IDs
  ADD COLUMN IF NOT EXISTS ip_restriction TEXT[],  -- IP whitelist
  ADD COLUMN IF NOT EXISTS time_restriction JSONB;  -- { start: "09:00", end: "18:00", timezone: "Asia/Seoul" }

-- Enhanced metadata
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS notes TEXT,  -- Admin notes about this code
  ADD COLUMN IF NOT EXISTS auto_expire_after_first_use BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_codes_intended_recipient ON verification_codes(intended_recipient_id) WHERE intended_recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_codes_intended_email ON verification_codes(intended_recipient_email) WHERE intended_recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_codes_intended_employee_id ON verification_codes(intended_recipient_employee_id) WHERE intended_recipient_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_codes_distribution ON verification_codes(distribution_status, distributed_at);
CREATE INDEX IF NOT EXISTS idx_codes_requires_match ON verification_codes(requires_credential_match) WHERE requires_credential_match = TRUE;

-- Comments
COMMENT ON COLUMN verification_codes.intended_recipient_id IS 'Links code to specific user_credentials record';
COMMENT ON COLUMN verification_codes.requires_credential_match IS 'If true, user must provide matching credentials during verification';
COMMENT ON COLUMN verification_codes.credential_match_fields IS 'Array of fields to match: ["email", "employee_id", "phone_number"]';

-- =====================================================
-- PART 3: EXTEND PROFILES TABLE
-- =====================================================

-- Link to user credentials
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES user_credentials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credential_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credential_verified_at TIMESTAMPTZ;

-- Store credential snapshot at verification (for audit)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credential_snapshot JSONB;

-- Add verification code reference
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified_with_code TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_credential_id ON profiles(credential_id) WHERE credential_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_verified_code ON profiles(verified_with_code) WHERE verified_with_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_credential_verified ON profiles(credential_verified);

-- Comments
COMMENT ON COLUMN profiles.credential_id IS 'Links profile to user_credentials record';
COMMENT ON COLUMN profiles.credential_verified IS 'True if user provided matching credentials during verification';
COMMENT ON COLUMN profiles.credential_snapshot IS 'Snapshot of credentials at time of verification (for audit trail)';

-- =====================================================
-- PART 4: MULTI-DIMENSIONAL CONTENT CLASSIFICATION
-- =====================================================

-- Extend documents table
ALTER TABLE documents
  -- Multi-dimensional classification
  ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'internal' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'secret')),
  ADD COLUMN IF NOT EXISTS content_category TEXT[],  -- ["training", "compliance", "sales", "hr", "finance"]
  ADD COLUMN IF NOT EXISTS target_departments TEXT[],
  ADD COLUMN IF NOT EXISTS target_roles TEXT[],
  ADD COLUMN IF NOT EXISTS target_tiers TEXT[],
  ADD COLUMN IF NOT EXISTS target_positions TEXT[],  -- ["Agent", "Team Leader", "Manager"]

  -- Time-based access
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ,

  -- Geographic restrictions
  ADD COLUMN IF NOT EXISTS geo_restrictions TEXT[],  -- ["KR", "US", "JP"]

  -- Advanced metadata
  ADD COLUMN IF NOT EXISTS compliance_tags TEXT[],  -- ["GDPR", "HIPAA", "PII", "Financial"]
  ADD COLUMN IF NOT EXISTS version_number TEXT,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Auto-classification
  ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS classification_confidence FLOAT CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  ADD COLUMN IF NOT EXISTS classification_method TEXT CHECK (classification_method IN ('manual', 'ai', 'rule-based', 'hybrid') OR classification_method IS NULL);

-- Apply same schema to contexts table
ALTER TABLE contexts
  ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'internal' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'secret')),
  ADD COLUMN IF NOT EXISTS content_category TEXT[],
  ADD COLUMN IF NOT EXISTS target_departments TEXT[],
  ADD COLUMN IF NOT EXISTS target_roles TEXT[],
  ADD COLUMN IF NOT EXISTS target_tiers TEXT[],
  ADD COLUMN IF NOT EXISTS target_positions TEXT[],
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geo_restrictions TEXT[],
  ADD COLUMN IF NOT EXISTS compliance_tags TEXT[],
  ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS classification_confidence FLOAT CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  ADD COLUMN IF NOT EXISTS classification_method TEXT CHECK (classification_method IN ('manual', 'ai', 'rule-based', 'hybrid') OR classification_method IS NULL);

-- Indexes for multi-dimensional filtering (GIN for array columns)
CREATE INDEX IF NOT EXISTS idx_docs_sensitivity ON documents(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_docs_categories ON documents USING GIN(content_category);
CREATE INDEX IF NOT EXISTS idx_docs_departments ON documents USING GIN(target_departments);
CREATE INDEX IF NOT EXISTS idx_docs_roles ON documents USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS idx_docs_tiers ON documents USING GIN(target_tiers);
CREATE INDEX IF NOT EXISTS idx_docs_positions ON documents USING GIN(target_positions);
CREATE INDEX IF NOT EXISTS idx_docs_availability ON documents(available_from, available_until) WHERE available_from IS NOT NULL OR available_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_docs_geo ON documents USING GIN(geo_restrictions) WHERE geo_restrictions IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_docs_compliance ON documents USING GIN(compliance_tags) WHERE compliance_tags IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contexts_sensitivity ON contexts(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_contexts_categories ON contexts USING GIN(content_category);
CREATE INDEX IF NOT EXISTS idx_contexts_departments ON contexts USING GIN(target_departments);
CREATE INDEX IF NOT EXISTS idx_contexts_roles ON contexts USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS idx_contexts_tiers ON contexts USING GIN(target_tiers);
CREATE INDEX IF NOT EXISTS idx_contexts_positions ON contexts USING GIN(target_positions);
CREATE INDEX IF NOT EXISTS idx_contexts_availability ON contexts(available_from, available_until) WHERE available_from IS NOT NULL OR available_until IS NOT NULL;

-- Comments
COMMENT ON COLUMN documents.sensitivity_level IS 'Content sensitivity: public (anyone), internal (employees), confidential (management), secret (executives)';
COMMENT ON COLUMN documents.content_category IS 'Content type tags for multi-dimensional filtering';
COMMENT ON COLUMN documents.target_departments IS 'Departments that can access this content';
COMMENT ON COLUMN documents.available_from IS 'Content becomes accessible from this date/time';
COMMENT ON COLUMN documents.available_until IS 'Content access expires at this date/time';

-- =====================================================
-- PART 5: CREDENTIAL VERIFICATION AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credential_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Verification attempt
  verification_code TEXT NOT NULL,
  kakao_user_id TEXT NOT NULL,
  session_id TEXT,

  -- Credential data provided (if any)
  provided_email TEXT,
  provided_employee_id TEXT,
  provided_name TEXT,
  provided_phone TEXT,
  provided_data JSONB,  -- Full credential data provided

  -- Matching results
  intended_credential_id UUID REFERENCES user_credentials(id) ON DELETE SET NULL,
  match_status TEXT CHECK (match_status IN ('matched', 'partial_match', 'no_match', 'no_credential_required', 'error')),
  match_score FLOAT CHECK (match_score >= 0 AND match_score <= 1),
  match_details JSONB,  -- Detailed matching results per field

  -- Outcome
  verification_result TEXT CHECK (verification_result IN ('success', 'failed', 'rejected', 'pending')),
  rejection_reason TEXT,
  profile_created UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Context
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_log_code ON credential_verification_log(verification_code);
CREATE INDEX IF NOT EXISTS idx_verification_log_kakao ON credential_verification_log(kakao_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_timestamp ON credential_verification_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_verification_log_status ON credential_verification_log(match_status, verification_result);
CREATE INDEX IF NOT EXISTS idx_verification_log_credential ON credential_verification_log(intended_credential_id) WHERE intended_credential_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_log_profile ON credential_verification_log(profile_created) WHERE profile_created IS NOT NULL;

-- Comments
COMMENT ON TABLE credential_verification_log IS 'Complete audit trail of all credential verification attempts';
COMMENT ON COLUMN credential_verification_log.match_status IS 'Result of credential matching: matched (all fields), partial_match (some fields), no_match (none), no_credential_required (code without cred requirement)';
COMMENT ON COLUMN credential_verification_log.match_score IS 'Confidence score 0-1 for credential match quality';
COMMENT ON COLUMN credential_verification_log.verification_result IS 'Final outcome: success (profile created), failed (error), rejected (intentional denial)';

-- =====================================================
-- PART 6: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_verification_log ENABLE ROW LEVEL SECURITY;

-- user_credentials: Any authenticated user can read all
CREATE POLICY user_credentials_authenticated_all ON user_credentials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- credential_verification_log: Any authenticated user can read all
CREATE POLICY credential_log_authenticated_all ON credential_verification_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PART 7: UPDATE TRIGGERS
-- =====================================================

-- Trigger for user_credentials updated_at
CREATE OR REPLACE FUNCTION update_user_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credentials_updated_at();

-- Trigger to auto-verify credential when profile is created
CREATE OR REPLACE FUNCTION auto_verify_credential_on_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile has credential_id and is marked as verified
  IF NEW.credential_id IS NOT NULL AND NEW.credential_verified = TRUE THEN
    -- Update the credential status to verified
    UPDATE user_credentials
    SET status = 'verified',
        verified_at = NOW()
    WHERE id = NEW.credential_id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_verify_credential
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.credential_id IS NOT NULL AND NEW.credential_verified = TRUE)
  EXECUTE FUNCTION auto_verify_credential_on_profile_creation();

-- =====================================================
-- PART 8: HELPER FUNCTIONS
-- =====================================================

-- Function to match credentials
CREATE OR REPLACE FUNCTION match_credentials(
  p_code TEXT,
  p_provided_email TEXT DEFAULT NULL,
  p_provided_employee_id TEXT DEFAULT NULL,
  p_provided_phone TEXT DEFAULT NULL
) RETURNS TABLE(
  match_found BOOLEAN,
  match_score FLOAT,
  credential_id UUID,
  match_details JSONB
) AS $$
DECLARE
  v_code_record RECORD;
  v_credential_record RECORD;
  v_score FLOAT := 0;
  v_matches JSONB := '{}';
  v_total_fields INT := 0;
  v_matched_fields INT := 0;
BEGIN
  -- Get code details
  SELECT * INTO v_code_record
  FROM verification_codes
  WHERE code = p_code;

  IF NOT FOUND OR v_code_record.intended_recipient_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0.0, NULL::UUID, '{}'::JSONB;
    RETURN;
  END IF;

  -- Get intended credential
  SELECT * INTO v_credential_record
  FROM user_credentials
  WHERE id = v_code_record.intended_recipient_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0.0, NULL::UUID, '{}'::JSONB;
    RETURN;
  END IF;

  -- Match email
  IF p_provided_email IS NOT NULL AND v_credential_record.email IS NOT NULL THEN
    v_total_fields := v_total_fields + 1;
    IF LOWER(p_provided_email) = LOWER(v_credential_record.email) THEN
      v_matched_fields := v_matched_fields + 1;
      v_matches := v_matches || jsonb_build_object('email', 'matched');
    ELSE
      v_matches := v_matches || jsonb_build_object('email', 'no_match');
    END IF;
  END IF;

  -- Match employee_id
  IF p_provided_employee_id IS NOT NULL AND v_credential_record.employee_id IS NOT NULL THEN
    v_total_fields := v_total_fields + 1;
    IF UPPER(p_provided_employee_id) = UPPER(v_credential_record.employee_id) THEN
      v_matched_fields := v_matched_fields + 1;
      v_matches := v_matches || jsonb_build_object('employee_id', 'matched');
    ELSE
      v_matches := v_matches || jsonb_build_object('employee_id', 'no_match');
    END IF;
  END IF;

  -- Match phone
  IF p_provided_phone IS NOT NULL AND v_credential_record.phone_number IS NOT NULL THEN
    v_total_fields := v_total_fields + 1;
    IF REPLACE(REPLACE(p_provided_phone, '-', ''), ' ', '') = REPLACE(REPLACE(v_credential_record.phone_number, '-', ''), ' ', '') THEN
      v_matched_fields := v_matched_fields + 1;
      v_matches := v_matches || jsonb_build_object('phone', 'matched');
    ELSE
      v_matches := v_matches || jsonb_build_object('phone', 'no_match');
    END IF;
  END IF;

  -- Calculate score
  IF v_total_fields > 0 THEN
    v_score := v_matched_fields::FLOAT / v_total_fields::FLOAT;
  END IF;

  RETURN QUERY SELECT
    (v_matched_fields = v_total_fields AND v_total_fields > 0),
    v_score,
    v_credential_record.id,
    v_matches;
END;
$$ LANGUAGE plpgsql;

-- Function to log verification attempt
CREATE OR REPLACE FUNCTION log_verification_attempt(
  p_code TEXT,
  p_kakao_user_id TEXT,
  p_provided_email TEXT DEFAULT NULL,
  p_provided_employee_id TEXT DEFAULT NULL,
  p_provided_phone TEXT DEFAULT NULL,
  p_match_status TEXT DEFAULT NULL,
  p_match_score FLOAT DEFAULT NULL,
  p_verification_result TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_profile_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_intended_cred_id UUID;
  v_match_details JSONB;
BEGIN
  -- Get intended credential
  SELECT intended_recipient_id INTO v_intended_cred_id
  FROM verification_codes
  WHERE code = p_code;

  -- Call match function to get details
  SELECT match_details INTO v_match_details
  FROM match_credentials(p_code, p_provided_email, p_provided_employee_id, p_provided_phone);

  -- Insert log
  INSERT INTO credential_verification_log (
    verification_code,
    kakao_user_id,
    provided_email,
    provided_employee_id,
    provided_phone,
    intended_credential_id,
    match_status,
    match_score,
    match_details,
    verification_result,
    rejection_reason,
    profile_created,
    ip_address,
    user_agent
  ) VALUES (
    p_code,
    p_kakao_user_id,
    p_provided_email,
    p_provided_employee_id,
    p_provided_phone,
    v_intended_cred_id,
    p_match_status,
    p_match_score,
    v_match_details,
    p_verification_result,
    p_rejection_reason,
    p_profile_id,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION log_verification_attempt TO authenticated;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Verify all tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credentials') THEN
    RAISE EXCEPTION 'Migration failed: user_credentials table not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credential_verification_log') THEN
    RAISE EXCEPTION 'Migration failed: credential_verification_log table not created';
  END IF;

  -- Verify columns added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_codes' AND column_name = 'intended_recipient_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: intended_recipient_id not added to verification_codes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credential_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: credential_id not added to profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'sensitivity_level'
  ) THEN
    RAISE EXCEPTION 'Migration failed: sensitivity_level not added to documents';
  END IF;

  RAISE NOTICE '✅ Phase 1 Migration completed successfully!';
  RAISE NOTICE '   ✓ user_credentials table created';
  RAISE NOTICE '   ✓ verification_codes extended';
  RAISE NOTICE '   ✓ profiles linked to credentials';
  RAISE NOTICE '   ✓ documents/contexts multi-dimensional classification added';
  RAISE NOTICE '   ✓ credential_verification_log created';
  RAISE NOTICE '   ✓ All indexes and triggers created';
  RAISE NOTICE '   ✓ Helper functions created';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Step: Update TypeScript types in lib/types/database.ts';
END $$;
