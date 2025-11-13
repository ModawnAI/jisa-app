# Payment Integration Testing Guide

Complete testing guide for JISA PortOne V2 payment integration.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Test Card Numbers](#test-card-numbers)
3. [Testing Scenarios](#testing-scenarios)
4. [Webhook Testing](#webhook-testing)
5. [Error Scenarios](#error-scenarios)
6. [Subscription Flow Testing](#subscription-flow-testing)
7. [Analytics Testing](#analytics-testing)
8. [Production Readiness Checklist](#production-readiness-checklist)

---

## Environment Setup

### Prerequisites

1. **Supabase Database**
   ```bash
   # Run migration to create payment tables
   cd supabase
   supabase db reset  # Resets and applies all migrations
   # OR apply specific migration:
   psql $DATABASE_URL -f migrations/20251113_payments_schema.sql
   ```

2. **Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_PORTONE_STORE_ID=store-your-store-id
   NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-your-channel-key
   PORTONE_API_SECRET=your-api-secret
   PORTONE_WEBHOOK_SECRET=your-webhook-secret
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Install Dependencies**
   ```bash
   npm install @portone/browser-sdk @portone/server-sdk
   npm install date-fns recharts
   ```

4. **Add Test Channel**
   - Use `mcp__portone-mcp-server__listSharedTestChannels` to list available test channels
   - Use `mcp__portone-mcp-server__addTestChannel` to add a test channel to your store
   - Example test PG providers: NICE, Inicis, Toss Payments

---

## Test Card Numbers

### PortOne Test Cards (Korea)

| Card Type | Card Number | Expiry | CVC | Expected Result |
|-----------|-------------|--------|-----|-----------------|
| 신한카드 | 5465-0550-7474-3070 | 12/29 | 123 | Success |
| 국민카드 | 9430-0415-5214-3456 | 12/29 | 123 | Success |
| 현대카드 | 9446-0106-8124-5678 | 12/29 | 123 | Success |
| 우리카드 | 9410-7208-1234-5678 | 12/29 | 123 | Success |
| Test Fail | 4000-0000-0000-0002 | 12/29 | 123 | Insufficient Funds |
| Test Decline | 4000-0000-0000-0069 | 12/29 | 123 | Card Declined |

**Note**: Use ANY 3-digit CVC and future expiry date for test cards.

### Virtual Account Testing

For virtual account (가상계좌) testing:
- Choose "가상계좌" as payment method
- Select test bank (e.g., "국민은행")
- Webhook will be triggered when virtual account is issued
- Use PortOne Admin Console to simulate payment completion

---

## Testing Scenarios

### 1. New Subscription Purchase

**Test Steps:**
1. Navigate to `/dashboard/pricing`
2. Select a tier (Basic, Pro, or Enterprise)
3. Click "구매하기" / "Purchase"
4. Enter test card details
5. Complete payment
6. Verify redirect to success page
7. Check subscription created in database

**Expected Results:**
- ✅ Payment record created with status `paid`
- ✅ Subscription record created with status `active`
- ✅ Invoice generated
- ✅ Billing event logged
- ✅ User's `subscription_tier` updated in profiles table
- ✅ Webhook received and processed

**SQL Verification:**
```sql
-- Check payment
SELECT * FROM payments WHERE user_id = 'user-uuid' ORDER BY created_at DESC LIMIT 1;

-- Check subscription
SELECT * FROM subscriptions WHERE user_id = 'user-uuid';

-- Check invoice
SELECT * FROM invoices WHERE user_id = 'user-uuid' ORDER BY created_at DESC LIMIT 1;

-- Check billing events
SELECT * FROM billing_events WHERE user_id = 'user-uuid' ORDER BY created_at DESC;
```

---

### 2. Subscription Upgrade

**Test Steps:**
1. Have an active Basic subscription
2. Navigate to `/dashboard/billing`
3. Click "플랜 변경" / "Change Plan"
4. Select Pro tier
5. Confirm upgrade
6. Verify prorated charge

**Expected Results:**
- ✅ Prorated payment calculated correctly
- ✅ Immediate charge for remaining period
- ✅ Subscription tier updated immediately
- ✅ New period dates calculated
- ✅ Billing event logged as `subscription.upgraded`

**Proration Calculation:**
```typescript
// Formula
const proratedAmount = (newTierAmount / totalDaysInPeriod) * remainingDays;

// Example: Upgrade from Basic (₩10,000/month) to Pro (₩30,000/month)
// With 15 days remaining in 30-day period
// Prorated charge = (30,000 / 30) * 15 = ₩15,000
```

---

### 3. Subscription Downgrade

**Test Steps:**
1. Have an active Pro subscription
2. Navigate to `/dashboard/billing`
3. Click "플랜 변경" / "Change Plan"
4. Select Basic tier
5. Confirm downgrade

**Expected Results:**
- ✅ No immediate charge
- ✅ Downgrade scheduled for period end
- ✅ `metadata.scheduled_tier_change` set with new tier and effective date
- ✅ Billing event logged as `subscription.downgrade_scheduled`
- ✅ User notified of effective date

**SQL Verification:**
```sql
SELECT
  tier,
  status,
  current_period_end,
  metadata->>'scheduled_tier_change' as scheduled_change
FROM subscriptions
WHERE user_id = 'user-uuid';
```

---

### 4. Subscription Cancellation

**Test Steps:**
1. Have an active subscription
2. Navigate to `/dashboard/billing`
3. Click "구독 취소" / "Cancel Subscription"
4. Confirm cancellation
5. Verify cancellation scheduled

**Expected Results:**
- ✅ `cancel_at_period_end` set to `true`
- ✅ No immediate status change
- ✅ Subscription remains active until period end
- ✅ Billing event logged
- ✅ User notified of cancellation date

**Immediate Cancellation:**
```bash
# Test immediate cancellation with query param
DELETE /api/subscriptions?immediate=true
```

Expected:
- ✅ Status immediately set to `cancelled`
- ✅ `cancelled_at` timestamp set
- ✅ Billing key deleted from PortOne
- ✅ User downgraded to Free tier

---

### 5. Payment Failure Handling

**Test Steps:**
1. Use test card `4000-0000-0000-0002` (insufficient funds)
2. Attempt subscription purchase
3. Verify failure handling

**Expected Results:**
- ✅ Payment record created with status `failed`
- ✅ Error message displayed to user
- ✅ No subscription created
- ✅ Billing event logged with failure reason
- ✅ User can retry payment

**Test Other Failures:**
- Expired card: Use past expiry date
- Invalid CVC: Use 00 as CVC
- Card declined: Use `4000-0000-0000-0069`

---

## Webhook Testing

### Setup ngrok for Local Testing

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start Next.js dev server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Configure Webhook in PortOne Console

1. Go to PortOne Admin Console
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://abc123.ngrok.io/api/payment/webhook`
4. Copy webhook secret and add to `.env.local`

### Test Webhook Events

**1. Transaction.Paid**
```bash
# Trigger: Complete a successful payment
# Expected: Webhook received, payment status updated to 'paid'
```

**2. Transaction.Failed**
```bash
# Trigger: Use failing test card
# Expected: Webhook received, payment status updated to 'failed'
```

**3. Transaction.Cancelled**
```bash
# Trigger: User cancels during payment
# Expected: Webhook received, payment status updated to 'cancelled'
```

**4. Transaction.VirtualAccountIssued**
```bash
# Trigger: Select virtual account payment method
# Expected: Webhook received, virtual account details saved
```

**5. BillingKey.Issued**
```bash
# Trigger: First subscription payment with billing key
# Expected: Webhook received, billing key saved for recurring payments
```

**6. BillingKey.Deleted**
```bash
# Trigger: Cancel subscription with immediate flag
# Expected: Webhook received, billing key removed
```

### Webhook Verification

Check webhook signature verification:
```typescript
// Logs should show:
console.log('Webhook signature verified successfully');
console.log('Processing webhook event:', webhook.type);
```

### Monitor Webhook Logs

```sql
-- Check billing events for webhook processing
SELECT
  event_type,
  description,
  created_at
FROM billing_events
WHERE event_type LIKE '%webhook%'
ORDER BY created_at DESC;
```

---

## Error Scenarios

### 1. Invalid Payment Amount

**Test:**
```typescript
// Modify payment amount in checkout component
totalAmount: 100  // Less than minimum (usually 1000 won)
```

**Expected:**
- ❌ Payment rejected by PortOne
- ✅ Error message displayed
- ✅ No payment record created

### 2. Network Timeout

**Test:**
```bash
# Simulate slow network in browser DevTools
# Network tab → Throttling → Slow 3G
```

**Expected:**
- ✅ Loading state shown
- ✅ Timeout after 30 seconds
- ✅ Error message with retry option

### 3. Webhook Signature Mismatch

**Test:**
```typescript
// Temporarily modify webhook secret in .env.local
PORTONE_WEBHOOK_SECRET=wrong-secret
```

**Expected:**
- ❌ Webhook verification fails
- ✅ 401 Unauthorized response
- ✅ Webhook not processed
- ✅ Error logged

### 4. Duplicate Payment Prevention

**Test:**
```typescript
// Try to complete same payment twice
POST /api/payment/complete
{ "paymentId": "payment-123" }
// Second call with same paymentId
```

**Expected:**
- ✅ First call succeeds
- ✅ Second call returns error or idempotent success
- ✅ No duplicate records

### 5. Concurrent Subscription Updates

**Test:**
```bash
# Open two browser tabs
# Tab 1: Start upgrade to Pro
# Tab 2: Start downgrade to Basic (before Tab 1 completes)
```

**Expected:**
- ✅ Database constraints prevent conflicts
- ✅ Only one operation succeeds
- ✅ Error message on failed operation

---

## Subscription Flow Testing

### Monthly Billing Cycle

1. **Create Subscription**
   - Subscribe to Basic Monthly (₩10,000)
   - Verify `current_period_start` and `current_period_end`
   - Period should be ~30 days

2. **Mid-Cycle Upgrade**
   - Upgrade to Pro Monthly (₩30,000) after 15 days
   - Verify prorated charge: ₩15,000
   - Verify new period starts immediately

3. **Mid-Cycle Downgrade**
   - Downgrade to Basic after 10 days
   - Verify no immediate charge
   - Verify scheduled change in metadata

4. **Period End**
   - Simulate reaching `current_period_end`
   - Run renewal cron job (manual simulation)
   - Verify new payment created
   - Verify period extended

### Yearly Billing Cycle

1. **Create Yearly Subscription**
   - Subscribe to Pro Yearly (₩300,000)
   - Verify period is ~365 days
   - Verify discount applied (vs. monthly × 12)

2. **Cycle Change**
   - Change from Yearly to Monthly
   - Verify no immediate charge
   - Verify change scheduled for period end

---

## Analytics Testing

### Payment Analytics Dashboard

**Test Steps:**
1. Create multiple payments with different statuses
2. Create subscriptions across different tiers
3. Navigate to `/admin/billing`
4. Verify analytics display

**Expected Metrics:**
- ✅ MRR (Monthly Recurring Revenue) calculated correctly
- ✅ Total Revenue sum accurate
- ✅ New Subscriptions count correct
- ✅ Churn Rate calculated
- ✅ Payment Success Rate accurate

**Calculations to Verify:**

```typescript
// MRR Calculation
const mrr = activeSubscriptions.reduce((total, sub) => {
  const monthlyAmount = sub.billing_cycle === 'yearly'
    ? sub.amount / 12
    : sub.amount;
  return total + monthlyAmount;
}, 0);

// Churn Rate
const churnRate = (cancelledSubscriptions / totalSubscriptionsAtPeriodStart) * 100;

// Success Rate
const successRate = (paidPayments / totalPayments) * 100;
```

### Revenue Chart

**Test:**
1. Create payments over several days
2. Verify revenue chart shows daily data
3. Test date range filters (7, 30, 90, 365 days)

### Tier Distribution

**Test:**
1. Create subscriptions across all tiers
2. Verify pie chart shows correct distribution
3. Check percentages sum to 100%

---

## Production Readiness Checklist

### Environment Configuration

- [ ] Production PortOne store created
- [ ] Live payment channel configured and tested
- [ ] Production environment variables set
- [ ] Webhook URL configured with HTTPS
- [ ] Webhook secret rotated from test value
- [ ] Database migration applied to production
- [ ] RLS policies tested and enabled

### Security

- [ ] Webhook signature verification enabled
- [ ] Payment amount verification in place
- [ ] API routes protected with authentication
- [ ] Admin routes restricted to admin roles
- [ ] Environment variables not exposed to client
- [ ] HTTPS enforced for all payment flows
- [ ] Rate limiting configured for API routes

### Testing

- [ ] All test scenarios passed
- [ ] Webhook events tested for all types
- [ ] Error scenarios handled gracefully
- [ ] Subscription lifecycle tested end-to-end
- [ ] Payment failure recovery tested
- [ ] Analytics accuracy verified
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified

### Monitoring

- [ ] Error logging configured (e.g., Sentry)
- [ ] Payment failure alerts set up
- [ ] Webhook failure monitoring enabled
- [ ] Database performance monitored
- [ ] API response time tracking
- [ ] Subscription churn alerts configured

### Documentation

- [ ] Integration guide reviewed and updated
- [ ] API documentation complete
- [ ] Admin user guide created
- [ ] Troubleshooting guide prepared
- [ ] Runbook for common issues documented

### Compliance

- [ ] PCI compliance requirements reviewed
- [ ] Data privacy policy updated
- [ ] Terms of service include payment terms
- [ ] Refund policy documented
- [ ] Customer support procedures defined

### Performance

- [ ] Payment flow load tested
- [ ] Webhook processing optimized
- [ ] Database indexes reviewed
- [ ] API response times acceptable (<2s)
- [ ] Analytics queries optimized

### Backup & Recovery

- [ ] Database backup schedule configured
- [ ] Payment data retention policy defined
- [ ] Disaster recovery plan documented
- [ ] Rollback procedures tested

---

## Common Issues & Troubleshooting

### Issue: Payment Stuck in "ready" Status

**Symptoms:**
- Payment shows as "ready" in database
- No webhook received
- User completed payment

**Diagnosis:**
```sql
SELECT payment_id, status, created_at, paid_at
FROM payments
WHERE status = 'ready' AND created_at < NOW() - INTERVAL '10 minutes';
```

**Solutions:**
1. Check PortOne console for payment status
2. Manually verify payment with PortOne API
3. Check webhook logs for delivery failures
4. Retry webhook delivery from PortOne console

### Issue: Webhook Signature Verification Fails

**Symptoms:**
- Webhook returns 401 Unauthorized
- Payments not updating in database

**Diagnosis:**
```bash
# Check logs for signature verification errors
tail -f .next/server/chunks/ssr/api/payment/webhook.log
```

**Solutions:**
1. Verify webhook secret matches PortOne console
2. Check webhook URL is exactly as configured
3. Ensure webhook payload not modified by proxy/CDN
4. Test with ngrok for local debugging

### Issue: Duplicate Payments Created

**Symptoms:**
- Multiple payment records for same transaction
- User charged multiple times

**Diagnosis:**
```sql
SELECT payment_id, COUNT(*)
FROM payments
GROUP BY payment_id
HAVING COUNT(*) > 1;
```

**Solutions:**
1. Add unique constraint on `payment_id`
2. Implement idempotency keys
3. Check for race conditions in payment flow
4. Review error handling in payment complete API

### Issue: Proration Calculation Incorrect

**Symptoms:**
- Unexpected charge amount on upgrade
- User complaints about billing

**Diagnosis:**
```typescript
// Log proration calculation
console.log({
  currentAmount,
  newAmount,
  totalDays,
  remainingDays,
  proratedAmount
});
```

**Solutions:**
1. Verify period dates are correct
2. Check timezone handling in date calculations
3. Ensure billing cycle considered in calculation
4. Test with various upgrade scenarios

---

## Test Data Cleanup

### Reset Test Environment

```sql
-- Delete test payments
DELETE FROM payments WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%'
);

-- Delete test subscriptions
DELETE FROM subscriptions WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%'
);

-- Delete test invoices
DELETE FROM invoices WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%'
);

-- Delete test billing events
DELETE FROM billing_events WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%'
);
```

### Create Test Users

```sql
-- Create test user with subscription
INSERT INTO auth.users (id, email) VALUES ('test-user-1', 'test1@example.com');
INSERT INTO profiles (id, email, subscription_tier) VALUES ('test-user-1', 'test1@example.com', 'free');

-- Create test subscription
INSERT INTO subscriptions (
  user_id, tier, status, billing_cycle, amount, currency,
  current_period_start, current_period_end
) VALUES (
  'test-user-1', 'basic', 'active', 'monthly', 10000, 'KRW',
  NOW(), NOW() + INTERVAL '30 days'
);
```

---

## Support Contacts

### PortOne Support
- Email: support@portone.io
- Documentation: https://developers.portone.io
- Console: https://admin.portone.io

### Internal Team
- Engineering: dev@jisa.app
- Support: support@jisa.app
- On-call: Slack #payments-alerts

---

## Appendix

### A. Test Scenarios Matrix

| Scenario | User Action | System Response | Database Changes | Webhooks |
|----------|-------------|-----------------|------------------|----------|
| New subscription | Purchase Basic | Payment processed | Payment, Subscription, Invoice created | Transaction.Paid |
| Upgrade | Change to Pro | Prorated charge | Subscription tier updated | Transaction.Paid |
| Downgrade | Change to Basic | Schedule change | Metadata updated | - |
| Cancel | Cancel subscription | Schedule cancellation | cancel_at_period_end = true | - |
| Payment fail | Use failed card | Show error | Payment with status='failed' | Transaction.Failed |
| Webhook retry | Webhook fails | Retry with backoff | Status updated on retry | Retry delivery |

### B. SQL Queries for Testing

```sql
-- Active subscriptions by tier
SELECT tier, COUNT(*) as count
FROM subscriptions
WHERE status = 'active'
GROUP BY tier;

-- Revenue in last 30 days
SELECT SUM(amount) as total_revenue
FROM payments
WHERE status = 'paid'
  AND paid_at >= NOW() - INTERVAL '30 days';

-- Failed payments
SELECT payment_id, order_name, amount, error_message
FROM payments
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Upcoming renewals (next 7 days)
SELECT user_id, tier, amount, current_period_end
FROM subscriptions
WHERE status = 'active'
  AND current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days';
```

---

**Last Updated:** November 13, 2025
**Version:** 1.0
**Maintainer:** JISA Development Team
