/**
 * Billing System Migration
 * Implements per-seat pricing model for B2B SaaS
 *
 * Purpose: Enable monthly billing based on active user count
 * - Company subscriptions
 * - Monthly billing records
 * - User activity tracking
 *
 * Date: 2025-11-17
 */

-- =====================================================
-- 1. COMPANY_SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Information
  company_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_registration_number TEXT,  -- 사업자 등록번호
  company_address TEXT,
  company_phone TEXT,

  -- Contact Information
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  billing_contact_phone TEXT,

  -- Subscription Status
  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial')),

  -- Pricing
  price_per_user_monthly INTEGER NOT NULL DEFAULT 30000,  -- ₩30,000/user/month
  currency TEXT DEFAULT 'KRW',

  -- Volume Discount Tiers
  volume_discount_percentage INTEGER DEFAULT 0
    CHECK (volume_discount_percentage BETWEEN 0 AND 100),

  -- Discount rules (JSONB for flexibility)
  discount_rules JSONB DEFAULT '{
    "10-49": 0,
    "50-99": 5,
    "100-199": 10,
    "200+": 15
  }',

  -- Contract Details
  contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_end_date DATE,  -- NULL = indefinite
  minimum_users INTEGER DEFAULT 5,
  maximum_users INTEGER,  -- NULL = unlimited

  -- Billing Configuration
  billing_cycle TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  billing_day INTEGER DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28),  -- Safe for all months
  payment_method TEXT DEFAULT 'invoice'
    CHECK (payment_method IN ('invoice', 'card', 'transfer', 'other')),

  -- Payment Terms
  payment_terms_days INTEGER DEFAULT 30,  -- Net 30
  auto_suspend_on_overdue BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(subscription_status);
CREATE INDEX idx_company_subscriptions_contract_end ON company_subscriptions(contract_end_date)
  WHERE contract_end_date IS NOT NULL;

-- Comments
COMMENT ON TABLE company_subscriptions IS 'B2B company subscription management';
COMMENT ON COLUMN company_subscriptions.volume_discount_percentage IS 'Current volume discount (0-100%)';
COMMENT ON COLUMN company_subscriptions.discount_rules IS 'Volume discount tiers in JSON format';

-- RLS Policies
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all company subscriptions"
  ON company_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "Company members can view their company subscription"
  ON company_subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 2. MONTHLY_BILLING_RECORDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.monthly_billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Reference
  company_id UUID NOT NULL REFERENCES company_subscriptions(company_id) ON DELETE CASCADE,

  -- Billing Period
  billing_month DATE NOT NULL,  -- Format: 2025-01-01 (first day of month)
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- User Count Statistics
  total_registered_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,  -- Users who made at least 1 query
  billable_users INTEGER NOT NULL DEFAULT 0,  -- active_users (for clarity)

  -- Knowledge Tier Distribution (for analytics)
  users_by_tier JSONB DEFAULT '{
    "free": 0,
    "basic": 0,
    "pro": 0,
    "enterprise": 0
  }',

  -- Role Distribution (for analytics)
  users_by_role JSONB DEFAULT '{
    "user": 0,
    "junior": 0,
    "senior": 0,
    "manager": 0,
    "admin": 0,
    "ceo": 0
  }',

  -- Pricing Calculation
  price_per_user INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,  -- billable_users × price_per_user
  discount_percentage INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  tax_percentage INTEGER DEFAULT 0,  -- VAT or sales tax
  tax_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,  -- subtotal - discount + tax

  -- Invoice Details
  invoice_number TEXT UNIQUE,
  invoice_date DATE,
  due_date DATE,

  -- Payment Tracking
  billing_status TEXT DEFAULT 'draft'
    CHECK (billing_status IN ('draft', 'pending', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded')),
  payment_date DATE,
  payment_amount INTEGER,
  payment_reference TEXT,
  payment_method TEXT,

  -- Notes
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_billing_records_company ON monthly_billing_records(company_id);
CREATE INDEX idx_billing_records_month ON monthly_billing_records(billing_month DESC);
CREATE INDEX idx_billing_records_status ON monthly_billing_records(billing_status);
CREATE INDEX idx_billing_records_invoice ON monthly_billing_records(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX idx_billing_records_due_date ON monthly_billing_records(due_date) WHERE billing_status NOT IN ('paid', 'cancelled', 'refunded');

-- Unique constraint: one billing record per company per month
CREATE UNIQUE INDEX idx_billing_unique_company_month
  ON monthly_billing_records(company_id, billing_month);

-- Comments
COMMENT ON TABLE monthly_billing_records IS 'Monthly billing records for per-seat pricing';
COMMENT ON COLUMN monthly_billing_records.active_users IS 'Users who made at least 1 query in the billing period';
COMMENT ON COLUMN monthly_billing_records.users_by_tier IS 'Distribution of active users by knowledge access level';

-- RLS Policies
ALTER TABLE monthly_billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all billing records"
  ON monthly_billing_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "Company members can view their billing records"
  ON monthly_billing_records
  FOR SELECT
  USING (
    company_id IN (
      SELECT cs.company_id FROM company_subscriptions cs
      JOIN profiles p ON p.company_id = cs.company_id
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager', 'ceo')
    )
  );

-- =====================================================
-- 3. USER_ACTIVITY_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Reference
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,

  -- Activity Date (one record per user per day)
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Activity Metrics
  query_count INTEGER DEFAULT 0,
  first_query_at TIMESTAMPTZ,
  last_query_at TIMESTAMPTZ,

  -- User State at time of activity
  user_role TEXT NOT NULL,
  knowledge_tier TEXT NOT NULL,
  is_billable BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_company_date ON user_activity_logs(company_id, activity_date DESC);
CREATE INDEX idx_user_activity_date ON user_activity_logs(activity_date DESC);

-- Unique constraint: one activity record per user per day
CREATE UNIQUE INDEX idx_user_activity_unique
  ON user_activity_logs(user_id, activity_date);

-- Partition by month (for performance with large datasets)
-- Note: Partitioning can be added later if needed

-- Comments
COMMENT ON TABLE user_activity_logs IS 'Daily user activity tracking for billing';
COMMENT ON COLUMN user_activity_logs.is_billable IS 'Whether this user should be included in billing';

-- RLS Policies
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON user_activity_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can view all activity"
  ON user_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "System can insert/update activity"
  ON user_activity_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. UPDATE PROFILES TABLE
-- =====================================================

-- Add company reference
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_subscriptions(company_id),
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id) WHERE company_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN profiles.company_id IS 'Company this user belongs to (B2B model)';
COMMENT ON COLUMN profiles.is_billable IS 'Whether to include this user in billing (false for inactive/terminated users)';
COMMENT ON COLUMN profiles.subscription_tier IS 'Knowledge access level (free/basic/pro/enterprise) - NOT pricing tier. All users have same price.';

-- =====================================================
-- 5. INVOICE NUMBER SEQUENCE
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

COMMENT ON SEQUENCE invoice_seq IS 'Sequential number for invoice generation';

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function: Calculate volume discount based on user count
CREATE OR REPLACE FUNCTION calculate_volume_discount(
  p_company_id UUID,
  p_user_count INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_discount_rules JSONB;
  v_discount_percentage INTEGER := 0;
BEGIN
  SELECT discount_rules INTO v_discount_rules
  FROM company_subscriptions
  WHERE company_id = p_company_id;

  IF p_user_count >= 200 THEN
    v_discount_percentage := (v_discount_rules->>'200+')::INTEGER;
  ELSIF p_user_count >= 100 THEN
    v_discount_percentage := (v_discount_rules->>'100-199')::INTEGER;
  ELSIF p_user_count >= 50 THEN
    v_discount_percentage := (v_discount_rules->>'50-99')::INTEGER;
  ELSE
    v_discount_percentage := (v_discount_rules->>'10-49')::INTEGER;
  END IF;

  RETURN COALESCE(v_discount_percentage, 0);
END;
$$;

-- Function: Get active users for a billing period
CREATE OR REPLACE FUNCTION get_active_users_for_period(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_users INTEGER,
  active_users INTEGER,
  users_by_tier JSONB,
  users_by_role JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH active_user_ids AS (
    SELECT DISTINCT ual.user_id
    FROM user_activity_logs ual
    WHERE ual.company_id = p_company_id
      AND ual.activity_date >= p_start_date
      AND ual.activity_date <= p_end_date
      AND ual.is_billable = true
  ),
  all_company_users AS (
    SELECT id FROM profiles
    WHERE company_id = p_company_id
      AND is_billable = true
  ),
  tier_distribution AS (
    SELECT
      p.subscription_tier as tier,
      COUNT(*) as count
    FROM profiles p
    INNER JOIN active_user_ids aui ON p.id = aui.user_id
    WHERE p.is_billable = true
    GROUP BY p.subscription_tier
  ),
  role_distribution AS (
    SELECT
      p.role,
      COUNT(*) as count
    FROM profiles p
    INNER JOIN active_user_ids aui ON p.id = aui.user_id
    WHERE p.is_billable = true
    GROUP BY p.role
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM all_company_users),
    (SELECT COUNT(*)::INTEGER FROM active_user_ids),
    COALESCE((SELECT jsonb_object_agg(tier, count) FROM tier_distribution), '{}'::JSONB),
    COALESCE((SELECT jsonb_object_agg(role, count) FROM role_distribution), '{}'::JSONB);
END;
$$;

-- Function: Generate monthly invoice
CREATE OR REPLACE FUNCTION generate_monthly_invoice(
  p_company_id UUID,
  p_billing_month DATE  -- First day of month, e.g., '2025-01-01'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_subscription RECORD;
  v_stats RECORD;
  v_period_start DATE;
  v_period_end DATE;
  v_subtotal INTEGER;
  v_discount_percentage INTEGER;
  v_discount_amount INTEGER;
  v_total INTEGER;
  v_invoice_number TEXT;
  v_due_date DATE;
BEGIN
  -- Calculate billing period
  v_period_start := DATE_TRUNC('month', p_billing_month)::DATE;
  v_period_end := (DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month - 1 day')::DATE;

  -- Get subscription details
  SELECT * INTO v_subscription
  FROM company_subscriptions
  WHERE company_id = p_company_id
    AND subscription_status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active company subscription not found for company_id: %', p_company_id;
  END IF;

  -- Get active user statistics
  SELECT * INTO v_stats
  FROM get_active_users_for_period(p_company_id, v_period_start, v_period_end);

  -- Calculate amounts
  v_subtotal := v_stats.active_users * v_subscription.price_per_user_monthly;
  v_discount_percentage := calculate_volume_discount(p_company_id, v_stats.active_users);
  v_discount_amount := v_subtotal * v_discount_percentage / 100;
  v_total := v_subtotal - v_discount_amount;

  -- Generate invoice number
  v_invoice_number := 'INV-' || TO_CHAR(p_billing_month, 'YYYYMM') || '-' ||
                      LPAD(nextval('invoice_seq')::TEXT, 6, '0');

  -- Calculate due date
  v_due_date := CURRENT_DATE + (v_subscription.payment_terms_days || ' days')::INTERVAL;

  -- Insert billing record
  INSERT INTO monthly_billing_records (
    company_id,
    billing_month,
    billing_period_start,
    billing_period_end,
    total_registered_users,
    active_users,
    billable_users,
    users_by_tier,
    users_by_role,
    price_per_user,
    subtotal,
    discount_percentage,
    discount_amount,
    total_amount,
    invoice_number,
    invoice_date,
    due_date,
    billing_status,
    created_by
  )
  VALUES (
    p_company_id,
    v_period_start,
    v_period_start,
    v_period_end,
    v_stats.total_users,
    v_stats.active_users,
    v_stats.active_users,
    COALESCE(v_stats.users_by_tier, '{}'::JSONB),
    COALESCE(v_stats.users_by_role, '{}'::JSONB),
    v_subscription.price_per_user_monthly,
    v_subtotal,
    v_discount_percentage,
    v_discount_amount,
    v_total,
    v_invoice_number,
    CURRENT_DATE,
    v_due_date,
    'pending',
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger: Auto-update company subscription updated_at
CREATE OR REPLACE FUNCTION update_company_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_company_subscription_timestamp
BEFORE UPDATE ON company_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_company_subscription_timestamp();

-- Trigger: Auto-update billing record timestamp
CREATE OR REPLACE FUNCTION update_billing_record_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_billing_record_timestamp
BEFORE UPDATE ON monthly_billing_records
FOR EACH ROW
EXECUTE FUNCTION update_billing_record_timestamp();

-- Trigger: Log user activity on query
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
  v_user_role TEXT;
  v_user_tier TEXT;
  v_is_billable BOOLEAN;
BEGIN
  -- Get user details
  SELECT company_id, role, subscription_tier, is_billable
  INTO v_company_id, v_user_role, v_user_tier, v_is_billable
  FROM profiles
  WHERE id = NEW.user_id;

  -- Insert or update activity log
  INSERT INTO user_activity_logs (
    user_id,
    company_id,
    activity_date,
    query_count,
    first_query_at,
    last_query_at,
    user_role,
    knowledge_tier,
    is_billable
  )
  VALUES (
    NEW.user_id,
    v_company_id,
    CURRENT_DATE,
    1,
    NOW(),
    NOW(),
    v_user_role,
    v_user_tier,
    v_is_billable
  )
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    query_count = user_activity_logs.query_count + 1,
    last_query_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Only create trigger if query_logs table exists and has user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'query_logs'
    AND column_name = 'user_id'
  ) THEN
    CREATE TRIGGER trigger_log_user_activity
    AFTER INSERT ON query_logs
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION log_user_activity();
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add helpful comments
COMMENT ON FUNCTION calculate_volume_discount IS 'Calculate volume discount percentage based on user count';
COMMENT ON FUNCTION get_active_users_for_period IS 'Get active users and distribution for a billing period';
COMMENT ON FUNCTION generate_monthly_invoice IS 'Generate monthly invoice for a company';
