/**
 * KakaoTalk Authentication Support Migration
 * Adds kakao_user_id columns and updates schema for KakaoTalk-based authentication
 *
 * Purpose: Support two user types:
 * 1. Admins - Web login with email/password (Supabase Auth)
 * 2. End Users - KakaoTalk only with 인증 코드 verification
 */

-- =====================================================
-- PROFILES TABLE UPDATES
-- =====================================================

-- Add KakaoTalk user identification
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kakao_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS kakao_nickname TEXT,
  ADD COLUMN IF NOT EXISTS last_chat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_chat_at TIMESTAMPTZ;

-- Make email nullable (KakaoTalk users don't have email)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN profiles.kakao_user_id IS 'KakaoTalk user ID for chatbot users (null for web admins)';
COMMENT ON COLUMN profiles.email IS 'Email for web admin users (null for KakaoTalk users)';

-- Create index for fast KakaoTalk user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_kakao_user_id ON profiles(kakao_user_id) WHERE kakao_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_chat ON profiles(last_chat_at DESC) WHERE kakao_user_id IS NOT NULL;

-- Update check constraint: must have either Supabase auth ID OR kakao_user_id
-- Note: We'll handle this in application logic rather than DB constraint for flexibility

-- =====================================================
-- VERIFICATION_CODES TABLE UPDATES
-- =====================================================

-- Add KakaoTalk tracking fields
ALTER TABLE verification_codes
  ADD COLUMN IF NOT EXISTS used_by TEXT[],           -- Array of kakao_user_ids who used this code
  ADD COLUMN IF NOT EXISTS kakao_sent_to TEXT,       -- KakaoTalk ID this was sent to (optional)
  ADD COLUMN IF NOT EXISTS purpose TEXT,             -- "신규 시니어 직원", "업그레이드" etc.
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;     -- Admin name who created it

-- Add comment
COMMENT ON COLUMN verification_codes.used_by IS 'Array of kakao_user_ids that have used this code';
COMMENT ON COLUMN verification_codes.kakao_sent_to IS 'KakaoTalk ID this code was sent to (for tracking)';

-- =====================================================
-- QUERY_LOGS TABLE UPDATES
-- =====================================================

-- Make user_id nullable and add kakao_user_id
ALTER TABLE query_logs
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- Add index for KakaoTalk user queries
CREATE INDEX IF NOT EXISTS idx_query_logs_kakao_user ON query_logs(kakao_user_id) WHERE kakao_user_id IS NOT NULL;

-- Add constraint: at least one user identifier required
ALTER TABLE query_logs
  ADD CONSTRAINT check_query_user_identity
  CHECK (user_id IS NOT NULL OR kakao_user_id IS NOT NULL);

-- Add comment
COMMENT ON COLUMN query_logs.user_id IS 'Profile ID (null for unauthenticated queries)';
COMMENT ON COLUMN query_logs.kakao_user_id IS 'KakaoTalk user ID for chatbot users';

-- =====================================================
-- ANALYTICS_EVENTS TABLE UPDATES
-- =====================================================

-- Add kakao_user_id tracking
ALTER TABLE analytics_events
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- Add index
CREATE INDEX IF NOT EXISTS idx_analytics_kakao_user ON analytics_events(kakao_user_id) WHERE kakao_user_id IS NOT NULL;

-- =====================================================
-- NEW TABLE: KAKAO_USER_SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kakao_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kakao_user_id TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active session lookup
CREATE INDEX idx_kakao_sessions_user ON kakao_user_sessions(kakao_user_id, session_start DESC);
CREATE INDEX idx_kakao_sessions_active ON kakao_user_sessions(kakao_user_id) WHERE session_end IS NULL;

-- RLS Policies for kakao_user_sessions
ALTER TABLE kakao_user_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view all sessions
CREATE POLICY kakao_sessions_admin_all ON kakao_user_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- Users can view their own sessions
CREATE POLICY kakao_sessions_user_own ON kakao_user_sessions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to find or create profile by kakao_user_id
CREATE OR REPLACE FUNCTION get_profile_by_kakao_id(
  p_kakao_user_id TEXT,
  p_kakao_nickname TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Try to find existing profile
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE kakao_user_id = p_kakao_user_id;

  -- Update last_chat_at if found
  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles
    SET last_chat_at = NOW(),
        kakao_nickname = COALESCE(p_kakao_nickname, kakao_nickname)
    WHERE id = v_profile_id;

    RETURN v_profile_id;
  END IF;

  -- Profile not found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create profile from verification code
CREATE OR REPLACE FUNCTION create_profile_from_code(
  p_kakao_user_id TEXT,
  p_kakao_nickname TEXT,
  p_verification_code TEXT
) RETURNS TABLE(
  success BOOLEAN,
  profile_id UUID,
  role TEXT,
  tier TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_code_record RECORD;
  v_new_profile_id UUID;
BEGIN
  -- Verify code exists and is active
  SELECT * INTO v_code_record
  FROM verification_codes
  WHERE code = p_verification_code
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW())
  AND current_uses < max_uses;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Invalid or expired code';
    RETURN;
  END IF;

  -- Check if kakao_user_id already has a profile
  IF EXISTS (SELECT 1 FROM profiles WHERE kakao_user_id = p_kakao_user_id) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, 'User already registered';
    RETURN;
  END IF;

  -- Create new profile
  INSERT INTO profiles (
    kakao_user_id,
    kakao_nickname,
    full_name,
    role,
    subscription_tier,
    metadata,
    first_chat_at,
    last_chat_at,
    created_at
  ) VALUES (
    p_kakao_user_id,
    p_kakao_nickname,
    p_kakao_nickname,
    v_code_record.role,
    v_code_record.tier,
    jsonb_build_object(
      'verification_code', p_verification_code,
      'verified_at', NOW(),
      'code_metadata', v_code_record.metadata
    ),
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_profile_id;

  -- Update verification code usage
  UPDATE verification_codes
  SET
    current_uses = current_uses + 1,
    status = CASE
      WHEN current_uses + 1 >= max_uses THEN 'used'
      ELSE 'active'
    END,
    used_at = NOW(),
    used_by = array_append(COALESCE(used_by, ARRAY[]::TEXT[]), p_kakao_user_id)
  WHERE code = p_verification_code;

  -- Return success
  RETURN QUERY SELECT
    TRUE,
    v_new_profile_id,
    v_code_record.role,
    v_code_record.tier,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- View: KakaoTalk Users with Activity
CREATE OR REPLACE VIEW kakao_users_activity AS
SELECT
  p.id,
  p.kakao_user_id,
  p.kakao_nickname,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.first_chat_at,
  p.last_chat_at,
  p.created_at,
  p.metadata->>'verification_code' as verification_code,
  COUNT(DISTINCT ql.id) as total_queries,
  MAX(ql.timestamp) as last_query_at,
  AVG(ql.response_time_ms) as avg_response_time
FROM profiles p
LEFT JOIN query_logs ql ON ql.kakao_user_id = p.kakao_user_id
WHERE p.kakao_user_id IS NOT NULL  -- Only KakaoTalk users
GROUP BY p.id;

-- View: Admin Users (Web Login)
CREATE OR REPLACE VIEW admin_users AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  p.last_sign_in_at
FROM profiles p
WHERE p.kakao_user_id IS NULL  -- Only web admin users
AND p.role IN ('admin', 'ceo');

-- =====================================================
-- RLS POLICY UPDATES
-- =====================================================

-- Update profiles RLS to handle kakao_user_id
-- Users can view their own profile by kakao_user_id OR auth.uid
DROP POLICY IF EXISTS profiles_user_own ON profiles;
CREATE POLICY profiles_user_own ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    kakao_user_id = current_setting('app.current_kakao_user_id', TRUE)
  );

-- Note: app.current_kakao_user_id should be set in API routes when processing KakaoTalk requests

-- =====================================================
-- STATISTICS
-- =====================================================

-- Count KakaoTalk users vs Admin users
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  'KakaoTalk Users' as user_type,
  COUNT(*) as count,
  COUNT(CASE WHEN last_chat_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
  COUNT(CASE WHEN last_chat_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_30d
FROM profiles
WHERE kakao_user_id IS NOT NULL

UNION ALL

SELECT
  'Admin Users' as user_type,
  COUNT(*) as count,
  COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
  COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_30d
FROM profiles
WHERE kakao_user_id IS NULL
AND role IN ('admin', 'ceo');

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to helper functions
GRANT EXECUTE ON FUNCTION get_profile_by_kakao_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_profile_from_code TO authenticated, anon;

-- Grant access to views (admin only)
GRANT SELECT ON kakao_users_activity TO authenticated;
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT ON user_statistics TO authenticated;

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample admin user (web login)
-- This should be done manually via Supabase Auth Dashboard or signup flow

-- Insert sample verification code
INSERT INTO verification_codes (
  code,
  role,
  tier,
  max_uses,
  current_uses,
  status,
  purpose,
  expires_at,
  metadata
) VALUES
(
  'TEST-001-002-003',
  'senior',
  'pro',
  1,
  0,
  'active',
  'Test code for development',
  NOW() + INTERVAL '30 days',
  '{"test": true, "environment": "development"}'
)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- MIGRATION VERIFICATION
-- =====================================================

-- Verify migration
DO $$
BEGIN
  -- Check kakao_user_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'kakao_user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: kakao_user_id column not created';
  END IF;

  -- Check email is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Migration failed: email column still NOT NULL';
  END IF;

  RAISE NOTICE 'Migration completed successfully';
END $$;
