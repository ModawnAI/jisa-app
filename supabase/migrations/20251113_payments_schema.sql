-- =====================================================
-- JISA App - PortOne V2 Payment Integration Schema
-- Created: 2025-11-13
-- Description: Comprehensive payment and subscription management
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription Details
  tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')) DEFAULT 'active',

  -- Billing Period
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,

  -- PortOne Integration
  billing_key TEXT, -- PortOne billing key for recurring payments
  portone_customer_id TEXT,

  -- Pricing
  amount INTEGER NOT NULL, -- Amount in KRW (e.g., 10000 for ₩10,000)
  currency TEXT NOT NULL DEFAULT 'KRW',

  -- Trial
  trial_end TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT FALSE,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id) -- One active subscription per user
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX idx_subscriptions_billing_key ON public.subscriptions(billing_key);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end);

-- =====================================================
-- 2. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- PortOne V2 Payment Details
  payment_id TEXT NOT NULL UNIQUE, -- PortOne paymentId (merchant's unique ID)
  transaction_id TEXT, -- PortOne transactionId (PortOne's internal ID)

  -- Payment Information
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (KRW)
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL CHECK (status IN (
    'ready', 'paid', 'failed', 'cancelled',
    'partial_cancelled', 'virtual_account_issued',
    'pay_pending', 'cancel_pending'
  )) DEFAULT 'ready',

  -- Payment Method
  pay_method TEXT NOT NULL CHECK (pay_method IN ('card', 'virtual_account', 'transfer', 'mobile', 'easy_pay')),
  pay_method_detail JSONB, -- Card number, bank info, etc.

  -- Billing Details
  order_name TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,

  -- PG Details
  pg_provider TEXT, -- 'toss', 'nice', 'inicis', etc.
  pg_transaction_id TEXT,
  receipt_url TEXT,

  -- Timestamps
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Failure/Cancellation Info
  failure_code TEXT,
  failure_message TEXT,
  cancel_amount INTEGER,
  cancel_reason TEXT,

  -- Webhook
  webhook_received BOOLEAN DEFAULT FALSE,
  webhook_received_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX idx_payments_payment_id ON public.payments(payment_id);
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

-- =====================================================
-- 3. INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,

  -- Invoice Details
  invoice_number TEXT NOT NULL UNIQUE, -- Auto-generated (e.g., INV-2025-11-0001)
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')) DEFAULT 'draft',

  -- Amounts
  subtotal INTEGER NOT NULL,
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_remaining INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',

  -- Billing Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Dates
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,

  -- Line Items (detailed breakdown)
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Customer Info
  customer_name TEXT,
  customer_email TEXT,
  billing_address JSONB,

  -- PDF
  pdf_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_payment_id ON public.invoices(payment_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);

-- =====================================================
-- 4. BILLING_EVENTS TABLE (Audit Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,

  -- Event Details
  event_type TEXT NOT NULL, -- 'subscription.created', 'payment.succeeded', 'subscription.cancelled', etc.
  description TEXT NOT NULL,

  -- PortOne Webhook Data
  webhook_type TEXT, -- PortOne webhook event type
  webhook_data JSONB,

  -- Related Data
  amount INTEGER,
  currency TEXT DEFAULT 'KRW',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_events_user_id ON public.billing_events(user_id);
CREATE INDEX idx_billing_events_subscription_id ON public.billing_events(subscription_id);
CREATE INDEX idx_billing_events_payment_id ON public.billing_events(payment_id);
CREATE INDEX idx_billing_events_event_type ON public.billing_events(event_type);
CREATE INDEX idx_billing_events_created_at ON public.billing_events(created_at DESC);

-- =====================================================
-- 5. SUBSCRIPTION TIER PRICING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),

  -- Pricing
  monthly_price INTEGER NOT NULL, -- KRW
  yearly_price INTEGER NOT NULL, -- KRW
  currency TEXT NOT NULL DEFAULT 'KRW',

  -- Features
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  query_limit INTEGER, -- Max queries per month (NULL = unlimited)
  user_limit INTEGER, -- Max users (NULL = unlimited)
  storage_limit INTEGER, -- Storage in GB (NULL = unlimited)

  -- Display
  display_name TEXT NOT NULL,
  description TEXT,
  is_popular BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO public.subscription_pricing (tier, monthly_price, yearly_price, display_name, description, features, query_limit, user_limit, storage_limit, sort_order) VALUES
('free', 0, 0, 'Free', '기본 기능 체험',
  '["10 queries/month", "Basic support", "1 user"]'::jsonb, 10, 1, 1, 1),
('basic', 10000, 100000, 'Basic', '개인 사용자',
  '["100 queries/month", "Email support", "3 users", "5GB storage"]'::jsonb, 100, 3, 5, 2),
('pro', 30000, 300000, 'Pro', '전문가용',
  '["1000 queries/month", "Priority support", "10 users", "50GB storage", "Advanced analytics"]'::jsonb, 1000, 10, 50, 3),
('enterprise', 100000, 1000000, 'Enterprise', '기업용',
  '["Unlimited queries", "24/7 support", "Unlimited users", "Unlimited storage", "Custom integrations", "SLA"]'::jsonb, NULL, NULL, NULL, 4)
ON CONFLICT (tier) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_pricing ENABLE ROW LEVEL SECURITY;

-- Subscriptions Policies
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- Payments Policies
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- Invoices Policies
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- Billing Events Policies
CREATE POLICY "Users can view their own billing events"
  ON public.billing_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing events"
  ON public.billing_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- Pricing Policies (Public Read-Only)
CREATE POLICY "Anyone can view pricing"
  ON public.subscription_pricing FOR SELECT
  USING (is_active = TRUE);

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT := TO_CHAR(NOW(), 'YYYY');
  month TEXT := TO_CHAR(NOW(), 'MM');
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 4) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year || '-' || month || '-%';

  -- Format: INV-YYYY-MM-NNNN
  invoice_num := 'INV-' || year || '-' || month || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_pricing_updated_at
  BEFORE UPDATE ON public.subscription_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. HELPER VIEWS
-- =====================================================

-- View: Active Subscriptions with User Info
CREATE OR REPLACE VIEW public.v_active_subscriptions AS
SELECT
  s.*,
  p.email as user_email,
  p.full_name as user_name,
  p.role as user_role,
  pr.monthly_price,
  pr.yearly_price,
  pr.display_name as tier_name
FROM public.subscriptions s
JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.subscription_pricing pr ON s.tier = pr.tier
WHERE s.status = 'active';

-- View: Monthly Revenue Report
CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT
  DATE_TRUNC('month', p.created_at) as month,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_revenue,
  COUNT(DISTINCT p.user_id) as unique_customers,
  s.tier,
  s.billing_cycle
FROM public.payments p
LEFT JOIN public.subscriptions s ON p.subscription_id = s.id
WHERE p.status = 'paid'
GROUP BY DATE_TRUNC('month', p.created_at), s.tier, s.billing_cycle
ORDER BY month DESC;

-- =====================================================
-- 9. INDEXES FOR ANALYTICS
-- =====================================================

-- Revenue analytics
CREATE INDEX idx_payments_paid_created_at ON public.payments(created_at)
  WHERE status = 'paid';

-- Subscription analytics
CREATE INDEX idx_subscriptions_active_tier ON public.subscriptions(tier)
  WHERE status = 'active';

-- Churn analysis
CREATE INDEX idx_subscriptions_cancelled_at ON public.subscriptions(cancelled_at)
  WHERE cancelled_at IS NOT NULL;

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE public.subscriptions IS 'User subscription plans and billing information';
COMMENT ON TABLE public.payments IS 'Payment transactions from PortOne V2';
COMMENT ON TABLE public.invoices IS 'Generated invoices for subscription billing';
COMMENT ON TABLE public.billing_events IS 'Audit log for all billing-related events';
COMMENT ON TABLE public.subscription_pricing IS 'Subscription tier pricing and features';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
