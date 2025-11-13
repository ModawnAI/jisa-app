/**
 * Open Access for All Authenticated Users
 * Date: 2025-11-14
 *
 * Purpose: Allow ANY logged-in user to access ALL data
 * No role checks, no admin restrictions - just authentication
 */

BEGIN;

-- =====================================================
-- DROP ALL RESTRICTIVE POLICIES
-- =====================================================

-- Profiles table
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
DROP POLICY IF EXISTS profiles_user_own ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_service_role_all ON profiles;

-- Drop problematic functions
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- =====================================================
-- CREATE SIMPLE OPEN POLICIES FOR ALL TABLES
-- =====================================================

-- Profiles: Any authenticated user can do anything
CREATE POLICY profiles_authenticated_all ON profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Chat logs: Any authenticated user can access
DROP POLICY IF EXISTS chat_logs_select_all ON chat_logs;
DROP POLICY IF EXISTS chat_logs_insert_own ON chat_logs;
CREATE POLICY chat_logs_authenticated_all ON chat_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Documents: Any authenticated user can access
DROP POLICY IF EXISTS documents_select_all ON documents;
DROP POLICY IF EXISTS documents_insert_admin ON documents;
CREATE POLICY documents_authenticated_all ON documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Contexts: Any authenticated user can access
DROP POLICY IF EXISTS contexts_select_all ON contexts;
DROP POLICY IF EXISTS contexts_insert_admin ON contexts;
CREATE POLICY contexts_authenticated_all ON contexts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ingestion jobs: Any authenticated user can access
DROP POLICY IF EXISTS ingestion_jobs_select_all ON ingestion_jobs;
DROP POLICY IF EXISTS ingestion_jobs_insert_admin ON ingestion_jobs;
DROP POLICY IF EXISTS ingestion_jobs_update_admin ON ingestion_jobs;
CREATE POLICY ingestion_jobs_authenticated_all ON ingestion_jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Access codes: Any authenticated user can access
DROP POLICY IF EXISTS access_codes_select_all ON access_codes;
DROP POLICY IF EXISTS access_codes_insert_admin ON access_codes;
DROP POLICY IF EXISTS access_codes_update_admin ON access_codes;
CREATE POLICY access_codes_authenticated_all ON access_codes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Subscriptions: Any authenticated user can access
DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
DROP POLICY IF EXISTS subscriptions_insert_own ON subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own ON subscriptions;
CREATE POLICY subscriptions_authenticated_all ON subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payments: Any authenticated user can access
DROP POLICY IF EXISTS payments_select_own ON payments;
DROP POLICY IF EXISTS payments_insert_system ON payments;
CREATE POLICY payments_authenticated_all ON payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices: Any authenticated user can access
DROP POLICY IF EXISTS invoices_select_own ON invoices;
DROP POLICY IF EXISTS invoices_insert_system ON invoices;
CREATE POLICY invoices_authenticated_all ON invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Kakao sessions: Any authenticated user can access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kakao_user_sessions') THEN
    DROP POLICY IF EXISTS kakao_sessions_admin_all ON kakao_user_sessions;
    DROP POLICY IF EXISTS kakao_sessions_own ON kakao_user_sessions;
    CREATE POLICY kakao_sessions_authenticated_all ON kakao_user_sessions
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ All tables now accessible to ANY authenticated user';
  RAISE NOTICE '✅ No role-based restrictions';
  RAISE NOTICE '✅ No recursion - using simple true condition';
  RAISE NOTICE '⚠️  Security: Only authentication required for all data access';
END $$;
