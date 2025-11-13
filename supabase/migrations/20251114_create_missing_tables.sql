/**
 * Create Missing Tables for Open Access Migration
 * Date: 2025-11-14
 *
 * Purpose: Create tables referenced in open_access migration
 * - chat_logs: Chat conversation logging
 * - access_codes: User access code management
 * - kakao_user_sessions: KakaoTalk user session tracking
 */

BEGIN;

-- =====================================================
-- CREATE CHAT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kakao_user_id TEXT,
  session_id TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'assistant', 'system')) DEFAULT 'user',
  message TEXT NOT NULL,
  response TEXT,
  query_type TEXT CHECK (query_type IN ('rag', 'commission', 'general')) DEFAULT 'general',
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_logs
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_kakao_user_id ON chat_logs(kakao_user_id) WHERE kakao_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);

-- Add constraint: at least one user identifier
ALTER TABLE chat_logs
  ADD CONSTRAINT check_chat_logs_user_identity
  CHECK (user_id IS NOT NULL OR kakao_user_id IS NOT NULL);

-- Comments
COMMENT ON TABLE chat_logs IS 'Chat conversation logs with messages and responses';
COMMENT ON COLUMN chat_logs.user_id IS 'Profile ID (null for unauthenticated chats)';
COMMENT ON COLUMN chat_logs.kakao_user_id IS 'KakaoTalk user ID for chatbot conversations';
COMMENT ON COLUMN chat_logs.session_id IS 'Session identifier for grouping conversation turns';

-- =====================================================
-- CREATE ACCESS_CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  tier TEXT CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')) DEFAULT 'free',
  role TEXT CHECK (role IN ('user', 'junior', 'senior', 'manager', 'admin', 'ceo')) DEFAULT 'user',
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0 AND current_uses <= max_uses),
  status TEXT CHECK (status IN ('active', 'used', 'expired', 'revoked')) DEFAULT 'active',
  code_type TEXT CHECK (code_type IN ('registration', 'invitation', 'trial', 'promotional')) DEFAULT 'registration',

  -- Metadata
  purpose TEXT,
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Usage tracking
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by TEXT[], -- Array of user identifiers who used this code

  -- KakaoTalk specific
  kakao_sent_to TEXT,

  -- Boolean flags (for backwards compatibility)
  is_active BOOLEAN DEFAULT true,
  is_used BOOLEAN DEFAULT false
);

-- Indexes for access_codes
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);
CREATE INDEX IF NOT EXISTS idx_access_codes_created_by ON access_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at ON access_codes(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE access_codes IS 'Access codes for user registration and tier assignments';
COMMENT ON COLUMN access_codes.code IS 'Unique access code (e.g., ABC-123-XYZ-789)';
COMMENT ON COLUMN access_codes.tier IS 'Subscription tier granted by this code';
COMMENT ON COLUMN access_codes.role IS 'User role granted by this code';
COMMENT ON COLUMN access_codes.used_by IS 'Array of user IDs (or kakao_user_ids) who used this code';

-- =====================================================
-- CREATE KAKAO_USER_SESSIONS TABLE
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

-- Indexes for kakao_user_sessions
CREATE INDEX IF NOT EXISTS idx_kakao_sessions_user ON kakao_user_sessions(kakao_user_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_kakao_sessions_active ON kakao_user_sessions(kakao_user_id) WHERE session_end IS NULL;
CREATE INDEX IF NOT EXISTS idx_kakao_sessions_profile ON kakao_user_sessions(profile_id);

-- Comments
COMMENT ON TABLE kakao_user_sessions IS 'KakaoTalk user session tracking for analytics';
COMMENT ON COLUMN kakao_user_sessions.kakao_user_id IS 'KakaoTalk user ID';
COMMENT ON COLUMN kakao_user_sessions.profile_id IS 'Linked profile ID if user is registered';
COMMENT ON COLUMN kakao_user_sessions.session_end IS 'NULL for active sessions';

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kakao_user_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE BASIC RLS POLICIES (to be overridden by open_access migration)
-- =====================================================

-- Chat logs: Admins can view all, users can view own
CREATE POLICY chat_logs_admin_all ON chat_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

CREATE POLICY chat_logs_user_own ON chat_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Access codes: Admins can manage, users can verify
CREATE POLICY access_codes_admin_all ON access_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

CREATE POLICY access_codes_verify ON access_codes
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()));

-- Kakao sessions: Admins can view all, users can view own
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

CREATE POLICY kakao_sessions_user_own ON kakao_user_sessions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Trigger for chat_logs updated_at
CREATE OR REPLACE FUNCTION update_chat_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chat_logs_updated_at
  BEFORE UPDATE ON chat_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_logs_updated_at();

-- Trigger for access_codes updated_at
CREATE OR REPLACE FUNCTION update_access_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_access_codes_updated_at
  BEFORE UPDATE ON access_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_access_codes_updated_at();

-- Trigger for kakao_user_sessions updated_at
CREATE OR REPLACE FUNCTION update_kakao_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kakao_sessions_updated_at
  BEFORE UPDATE ON kakao_user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_kakao_sessions_updated_at();

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Verify all tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_logs') THEN
    RAISE EXCEPTION 'Migration failed: chat_logs table not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_codes') THEN
    RAISE EXCEPTION 'Migration failed: access_codes table not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kakao_user_sessions') THEN
    RAISE EXCEPTION 'Migration failed: kakao_user_sessions table not created';
  END IF;

  RAISE NOTICE '✅ All tables created successfully:';
  RAISE NOTICE '   - chat_logs';
  RAISE NOTICE '   - access_codes';
  RAISE NOTICE '   - kakao_user_sessions';
END $$;
