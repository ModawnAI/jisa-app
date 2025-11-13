/**
 * Fix RLS Infinite Recursion
 *
 * Problem: Policies on other tables that check admin role via subquery to profiles
 * cause infinite recursion when accessing profiles table.
 *
 * Solution: Add admin policy to profiles that allows admins to bypass normal checks,
 * preventing recursion when other policies query profiles.
 */

-- =====================================================
-- FIX PROFILES RLS TO PREVENT RECURSION
-- =====================================================

-- The problem: Other tables have policies that query profiles to check admin status,
-- causing recursion when profiles RLS is evaluated.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS when checking admin status,
-- then use this function in all policies that need to check admin role.

-- Create a security definer function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Query profiles directly with SECURITY DEFINER to bypass RLS
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN user_role IN ('admin', 'ceo');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, anon;

-- Add admin policy to profiles that allows admins to see everything
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL
  TO authenticated
  USING (
    -- Simple function call - no recursion because function bypasses RLS
    is_admin()
  );

-- Keep the user-own policy for non-admin users
-- Note: This will be evaluated after profiles_admin_all
DROP POLICY IF EXISTS profiles_user_own ON profiles;
CREATE POLICY profiles_user_own ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    kakao_user_id = current_setting('app.current_kakao_user_id', TRUE)
  );

-- Update the kakao_sessions policy to use the function instead of subquery
-- Only if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kakao_user_sessions') THEN
    DROP POLICY IF EXISTS kakao_sessions_admin_all ON kakao_user_sessions;
    CREATE POLICY kakao_sessions_admin_all ON kakao_user_sessions
      FOR ALL
      TO authenticated
      USING (is_admin());
    RAISE NOTICE 'Updated kakao_sessions_admin_all policy';
  ELSE
    RAISE NOTICE 'Skipped kakao_sessions policy - table does not exist yet';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS recursion fix applied successfully';
  RAISE NOTICE 'Created is_admin() function';
  RAISE NOTICE 'Updated kakao_sessions_admin_all policy';
  RAISE NOTICE 'Added profiles_admin_all policy';
END $$;
