# PortOne V2 Payment Integration Guide for JISA App

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Webhook Configuration](#webhook-configuration)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the complete PortOne V2 payment integration for the JISA app, a Next.js 15 + TypeScript application with Supabase backend.

### Features Implemented

✅ **Subscription Management**
- 4 tiers: Free, Basic (₩10,000/month), Pro (₩30,000/month), Enterprise (₩100,000/month)
- Monthly and yearly billing cycles
- Upgrade/downgrade with prorated payments
- Automatic renewal with billing keys

✅ **Payment Processing**
- Credit card payments via PortOne V2
- Virtual account support
- Payment verification and fraud prevention
- Webhook-based payment confirmation

✅ **Billing Management**
- Invoice generation
- Payment history
- Billing events audit log
- Revenue analytics

✅ **Admin Features**
- Payment analytics dashboard
- Subscription reports
- Revenue tracking
- User billing management

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                       │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │  Subscription  │  │    Billing     │  │    Payment    │  │
│  │    Checkout    │  │   Dashboard    │  │    Success    │  │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘  │
└───────────┼──────────────────┼───────────────────┼──────────┘
            │                  │                   │
            │  @portone/       │  API Calls        │
            │  browser-sdk     │                   │
            ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js Routes)                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │ /api/payment/    │  │ /api/            │  │ /api/admin/││
│  │   - complete     │  │  subscriptions/  │  │  billing/  ││
│  │   - webhook      │  │   - create       │  │  analytics ││
│  └─────────┬────────┘  │   - upgrade      │  └────────────┘│
│            │            │   - cancel       │                 │
│            ▼            └────────┬─────────┘                 │
│  ┌──────────────────────────────▼──────────────────────┐    │
│  │        lib/services/portone.service.ts               │    │
│  │  - Payment verification                              │    │
│  │  - Billing key management                            │    │
│  │  - Webhook verification                              │    │
│  │  - Subscription billing automation                   │    │
│  └──────────────────────────┬───────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL Database                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │subscriptions │  │   payments   │  │    invoices      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │billing_events│  │subscription_ │                         │
│  │              │  │   pricing    │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ Webhooks
                              │
                    ┌─────────┴─────────┐
                    │   PortOne V2 API  │
                    │  Payment Gateway  │
                    └───────────────────┘
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Install PortOne SDK
npm install @portone/browser-sdk @portone/server-sdk

# Already installed in JISA app
# - @supabase/supabase-js
# - @supabase/ssr
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
# PortOne V2 Configuration
PORTONE_API_SECRET=your_api_secret_here
PORTONE_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_PORTONE_STORE_ID=store-your-store-id
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-your-channel-key

# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run Database Migration

```bash
# Apply payment schema migration
npx supabase migration up
# or
psql -h db.project.supabase.co -U postgres -d postgres -f supabase/migrations/20251113_payments_schema.sql
```

### 4. Configure PortOne Console

1. **Go to PortOne Console**: https://admin.portone.io
2. **Navigate to**: 결제 연동 → 연동 관리
3. **Set up Webhook**:
   - URL: `https://your-domain.vercel.app/api/payment/webhook`
   - Webhook Version: `2024-04-25` (latest)
   - Content Type: `application/json`
   - Generate webhook secret and add to `.env.local`
4. **Get Credentials**:
   - Store ID: From dashboard
   - Channel Key: From channel settings
   - API Secret: Generate in API settings

---

## Database Schema

### Tables

#### 1. `subscriptions`
Stores user subscription information

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tier TEXT CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  billing_key TEXT, -- PortOne billing key
  amount INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  ...
);
```

#### 2. `payments`
Tracks all payment transactions

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  payment_id TEXT UNIQUE, -- PortOne paymentId
  transaction_id TEXT, -- PortOne transactionId
  amount INTEGER,
  status TEXT CHECK (status IN ('ready', 'paid', 'failed', 'cancelled', ...)),
  pay_method TEXT,
  paid_at TIMESTAMPTZ,
  ...
);
```

#### 3. `invoices`
Generated invoices for subscriptions

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  invoice_number TEXT UNIQUE, -- Auto-generated: INV-YYYY-MM-NNNN
  status TEXT CHECK (status IN ('draft', 'open', 'paid', 'void')),
  total INTEGER,
  paid_at TIMESTAMPTZ,
  ...
);
```

#### 4. `billing_events`
Audit log for billing operations

```sql
CREATE TABLE billing_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT, -- 'subscription.created', 'payment.succeeded', etc.
  description TEXT,
  webhook_data JSONB,
  ...
);
```

#### 5. `subscription_pricing`
Subscription tier pricing (pre-populated)

```sql
CREATE TABLE subscription_pricing (
  tier TEXT PRIMARY KEY,
  monthly_price INTEGER,
  yearly_price INTEGER,
  features JSONB,
  ...
);
```

---

## API Endpoints

### Payment APIs

#### POST `/api/payment/complete`
**Purpose**: Verify payment after PortOne.requestPayment()

**Request**:
```json
{
  "paymentId": "payment-xxxxx-xxxxx-xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "status": "PAID",
  "paymentId": "payment-xxxxx-xxxxx-xxxxx",
  "amount": 10000
}
```

#### POST `/api/payment/webhook`
**Purpose**: Receive PortOne webhook events

**Headers**:
- `webhook-id`
- `webhook-timestamp`
- `webhook-signature`

**Body**:
```json
{
  "type": "Transaction.Paid",
  "timestamp": "2025-11-13T10:00:00.000Z",
  "data": {
    "paymentId": "payment-xxxxx",
    "transactionId": "txn-xxxxx",
    "storeId": "store-xxxxx"
  }
}
```

### Subscription APIs

#### GET `/api/subscriptions`
**Purpose**: Get user's current subscription

**Response**:
```json
{
  "subscription": {
    "id": "uuid",
    "tier": "pro",
    "status": "active",
    "billing_cycle": "monthly",
    "amount": 30000,
    "current_period_end": "2025-12-13T00:00:00Z",
    ...
  }
}
```

#### POST `/api/subscriptions`
**Purpose**: Create or update subscription

**Request**:
```json
{
  "tier": "pro",
  "billing_cycle": "monthly",
  "billing_key": "billing-key-xxxxx"
}
```

#### DELETE `/api/subscriptions`
**Purpose**: Cancel subscription

**Query Params**:
- `reason`: Cancellation reason (optional)
- `immediate`: Cancel immediately (default: false)

#### POST `/api/subscriptions/upgrade`
**Purpose**: Upgrade or downgrade subscription

**Request**:
```json
{
  "new_tier": "enterprise",
  "billing_cycle": "yearly"
}
```

**Response (Upgrade)**:
```json
{
  "success": true,
  "message": "Subscription upgraded successfully",
  "charged_amount": 15000,
  "new_tier": "enterprise"
}
```

**Response (Downgrade)**:
```json
{
  "success": true,
  "message": "Downgrade will take effect at the end of your current billing period",
  "effective_date": "2025-12-13T00:00:00Z",
  "new_tier": "basic"
}
```

#### GET `/api/subscriptions/pricing`
**Purpose**: Get available subscription plans (public)

**Response**:
```json
{
  "pricing": [
    {
      "tier": "free",
      "monthly_price": 0,
      "yearly_price": 0,
      "display_name": "Free",
      "features": ["10 queries/month", "Basic support", "1 user"]
    },
    {
      "tier": "basic",
      "monthly_price": 10000,
      "yearly_price": 100000,
      "display_name": "Basic",
      "features": ["100 queries/month", "Email support", "3 users"]
    },
    ...
  ]
}
```

---

## Frontend Integration

### 1. Install SDK

```tsx
// Already done in package.json
import * as PortOne from '@portone/browser-sdk/v2';
```

### 2. Subscription Checkout

```tsx
import { SubscriptionCheckout } from '@/components/payment/subscription-checkout';

export default function CheckoutPage() {
  return (
    <SubscriptionCheckout
      tier="pro"
      billingCycle="monthly"
      userId={user.id}
      userEmail={user.email}
      userName={user.name}
    />
  );
}
```

### 3. Payment Flow

```tsx
// 1. User selects plan
// 2. Click "결제하기" button
// 3. PortOne.requestPayment() opens payment window
const response = await PortOne.requestPayment({
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
  paymentId: `payment-${crypto.randomUUID()}`,
  orderName: "Pro Plan - Monthly",
  totalAmount: 30000,
  currency: "CURRENCY_KRW",
  payMethod: "CARD",
  customer: { email, fullName },
});

// 4. Verify payment on backend
const result = await fetch('/api/payment/complete', {
  method: 'POST',
  body: JSON.stringify({ paymentId: response.paymentId }),
});

// 5. Redirect to success page
if (result.ok) {
  window.location.href = '/dashboard/subscription/success';
}
```

### 4. Billing Key (Recurring Payments)

```tsx
// For recurring subscriptions, issue billing key
const response = await PortOne.requestIssueBillingKey({
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
  billingKeyMethod: "CARD",
  customer: { email, fullName },
});

// Save billing key to subscription
await fetch('/api/subscriptions', {
  method: 'POST',
  body: JSON.stringify({
    tier: 'pro',
    billing_cycle: 'monthly',
    billing_key: response.billingKey,
  }),
});
```

---

## Webhook Configuration

### 1. Webhook Events

PortOne sends these events to `/api/payment/webhook`:

- `Transaction.Paid` - Payment succeeded
- `Transaction.Failed` - Payment failed
- `Transaction.Cancelled` - Payment cancelled
- `Transaction.VirtualAccountIssued` - Virtual account issued
- `BillingKey.Issued` - Billing key created
- `BillingKey.Deleted` - Billing key deleted

### 2. Webhook Security

**ALWAYS verify webhook signature**:

```typescript
import * as PortOne from '@portone/server-sdk';

const webhook = await PortOne.Webhook.verify(
  process.env.PORTONE_WEBHOOK_SECRET!,
  requestBody, // Raw text body
  requestHeaders
);
```

### 3. Webhook Processing

```typescript
// app/api/payment/webhook/route.ts handles:
1. Signature verification
2. Payment status update
3. Subscription status update
4. Invoice generation
5. Billing event logging
6. Email notifications (TODO)
```

---

## Testing

### 1. Test Mode Setup

```bash
# Use test credentials
PORTONE_STORE_ID=store-test-xxxxx
PORTONE_CHANNEL_KEY=channel-key-test-xxxxx
PORTONE_API_SECRET=test_secret_xxxxx
PORTONE_WEBHOOK_SECRET=test_webhook_secret_xxxxx
```

### 2. Test Cards (PortOne Test Mode)

| Card Number | CVV | Expiry | Result |
|------------|-----|--------|--------|
| 4090-0000-0000-0001 | 123 | 12/30 | Success |
| 4090-0000-0000-0002 | 123 | 12/30 | Failed |

### 3. Test Webhook Locally

```bash
# Use ngrok to expose local server
ngrok http 3000

# Update webhook URL in PortOne console
https://your-ngrok-url.ngrok.io/api/payment/webhook

# Test webhook from console: "호출 테스트" button
```

### 4. Test Scenarios

✅ **New Subscription**
1. Select plan (Basic/Pro/Enterprise)
2. Complete payment
3. Verify subscription created
4. Check billing event logged

✅ **Upgrade**
1. Upgrade from Basic to Pro
2. Verify prorated charge
3. Check immediate tier change
4. Verify billing event

✅ **Downgrade**
1. Downgrade from Pro to Basic
2. Verify scheduled for period end
3. Check no immediate charge
4. Verify scheduled change in metadata

✅ **Cancellation**
1. Cancel subscription
2. Verify cancel_at_period_end = true
3. Access continues until period end
4. Check billing event

---

## Production Deployment

### 1. Environment Variables

Add to Vercel environment variables:

```bash
# Production PortOne Credentials
PORTONE_API_SECRET=live_secret_xxxxx
PORTONE_WEBHOOK_SECRET=live_webhook_xxxxx
NEXT_PUBLIC_PORTONE_STORE_ID=store-live-xxxxx
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-live-xxxxx
```

### 2. Webhook URL

Set in PortOne console:
```
https://your-domain.vercel.app/api/payment/webhook
```

### 3. Security Checklist

- [ ] HTTPS enabled (required by PortOne)
- [ ] Webhook signature verification implemented
- [ ] Payment amount verification implemented
- [ ] RLS policies enabled on all tables
- [ ] API secrets stored in environment variables
- [ ] CORS configured properly
- [ ] Rate limiting enabled (Vercel Edge Config)

### 4. Monitoring

- [ ] Set up Vercel Analytics
- [ ] Monitor webhook delivery (PortOne console)
- [ ] Set up error alerts (Sentry/LogRocket)
- [ ] Track failed payments
- [ ] Monitor subscription churn

---

## Troubleshooting

### Common Issues

#### 1. Webhook Signature Verification Failed

**Error**: `WebhookVerificationError`

**Solutions**:
- Check webhook secret matches console
- Ensure raw body text is used (not parsed JSON)
- Verify headers include `webhook-signature`
- Check webhook version is `2024-04-25`

#### 2. Payment Verification Failed

**Error**: `Amount mismatch` or `Payment not found`

**Solutions**:
- Wait a few seconds after payment (async processing)
- Check payment exists in PortOne
- Verify amount matches exactly (including currency)
- Check channel type is LIVE (not TEST in production)

#### 3. Billing Key Payment Failed

**Error**: `Billing key not found` or `Card declined`

**Solutions**:
- Verify billing key still valid
- Check card hasn't expired
- Ensure sufficient funds
- Implement retry logic with exponential backoff

#### 4. Subscription Not Created

**Solutions**:
- Check webhook was received successfully
- Verify payment status is `PAID`
- Check database logs for errors
- Ensure user_id exists in profiles table

### Debug Mode

Enable debug logging:

```typescript
// lib/services/portone.service.ts
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Payment verification:', { paymentId, amount, result });
}
```

### Support

- **PortOne Documentation**: https://developers.portone.io
- **PortOne Support**: support@portone.io
- **JISA App Issues**: Create issue in GitHub repo

---

## Next Steps

### Immediate (Required for Launch)

1. **Test all payment flows** in production-like environment
2. **Configure email notifications** for payment events
3. **Set up monitoring and alerts** for failed payments
4. **Implement retry logic** for failed subscription renewals
5. **Add admin billing dashboard** for revenue tracking

### Future Enhancements

- [ ] Add promo codes and discounts
- [ ] Implement usage-based billing
- [ ] Add payment method management (update card)
- [ ] Implement refunds
- [ ] Add tax calculation for B2B customers
- [ ] Integrate accounting software (e.g., 호두 계산서)
- [ ] Add multi-currency support
- [ ] Implement payment reminders (email/SMS)
- [ ] Add subscription pause feature
- [ ] Implement seat-based pricing for teams

---

## Architecture Decisions

### Why PortOne V2?

1. ✅ **Korean Market Leader** - Best PG integration in Korea
2. ✅ **Multiple PG Support** - Toss, Nice, Inicis, KCP, etc.
3. ✅ **Unified API** - Single interface for all PGs
4. ✅ **Webhook-based** - Reliable event notifications
5. ✅ **Great Documentation** - Korean and English docs
6. ✅ **Billing Key Support** - Easy recurring payments

### Design Patterns Used

- **Service Layer Pattern** - `portoneService` encapsulates all PortOne logic
- **Webhook Handler Pattern** - Event-driven payment processing
- **Proration Strategy** - Fair billing for mid-cycle changes
- **Audit Log Pattern** - Complete billing event history
- **Idempotency** - Safe webhook replay handling

---

## Appendix

### Subscription Tier Comparison

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| Price | ₩0 | ₩10,000/mo | ₩30,000/mo | ₩100,000/mo |
| Queries/month | 10 | 100 | 1,000 | Unlimited |
| Users | 1 | 3 | 10 | Unlimited |
| Storage | 1GB | 5GB | 50GB | Unlimited |
| Support | Basic | Email | Priority | 24/7 |
| Analytics | ❌ | ✅ | ✅ | ✅ |
| Custom Integration | ❌ | ❌ | ❌ | ✅ |
| SLA | ❌ | ❌ | ❌ | ✅ |

### API Error Codes

| Code | Message | Action |
|------|---------|--------|
| 400 | Invalid request | Check request parameters |
| 401 | Unauthorized | Check authentication token |
| 404 | Not found | Verify resource exists |
| 409 | Conflict | Check for duplicate operation |
| 500 | Server error | Contact support |

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
**Status**: ✅ Ready for Production
