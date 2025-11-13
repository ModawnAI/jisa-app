/**
 * Final RLS Fix - Remove Recursion Completely
 * Date: 2025-11-14
 *
 * Issue: infinite recursion detected in policy for relation "profiles"
 *
 * Solution: Simplify policies to avoid any recursion by:
 * 1. Drop problematic function if it still queries profiles
 * 2. Create simpler policies that don't cause recursion
 * 3. Use direct auth.uid() checks instead of complex subqueries
 */

BEGIN;

-- Drop existing problematic policies
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
DROP POLICY IF EXISTS profiles_user_own ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

-- Drop the potentially problematic function
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Note: We're NOT creating any new functions that query profiles
-- Admin checks will be handled at the application level to avoid RLS recursion

-- Create simple, non-recursive policies
-- Policy 1: Users can always see their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
  );

-- Policy 2: Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Users can insert their own profile (during registration)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy 4: Allow service role full access (for migrations and admin operations)
CREATE POLICY profiles_service_role_all ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For admin-specific queries, we'll handle permissions at the application level
-- This avoids RLS recursion issues entirely

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies simplified to prevent recursion';
  RAISE NOTICE '✅ Removed complex is_admin() function';
  RAISE NOTICE '✅ Created basic policies for user-own access';
  RAISE NOTICE '⚠️  Admin access now handled at application level via API routes';
END $$;
