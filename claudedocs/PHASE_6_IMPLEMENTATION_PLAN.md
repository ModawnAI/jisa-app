# Phase 6: 수익화 & 분석 - 상세 구현 계획

**작성일:** 2025-11-13
**상태:** 🎯 준비 완료 → 구현 대기
**예상 기간:** 2주 (120시간)
**우선순위:** P0 - CRITICAL (Revenue Generation)

---

## 📋 목차

1. [개요](#개요)
2. [Phase 6.1: 구독 관리 & 결제 시스템](#phase-61-구독-관리--결제-시스템)
3. [Phase 6.2: 고급 분석 시스템](#phase-62-고급-분석-시스템)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [API 설계](#api-설계)
6. [UI/UX 설계](#uiux-설계)
7. [구현 순서](#구현-순서)
8. [테스트 계획](#테스트-계획)
9. [배포 전략](#배포-전략)
10. [성공 지표](#성공-지표)

---

## 개요

### 🎯 Phase 6 목표

**비즈니스 목표:**
- 구독 기반 매출 생성 시작
- 사용량 추적 및 제한으로 리소스 관리
- 데이터 기반 의사결정을 위한 분석 인프라 구축

**기술 목표:**
- Stripe 결제 통합 완료
- 사용량 추적 시스템 구현
- 고급 분석 대시보드 구축
- 자동화된 구독 관리 워크플로우

### 📊 현재 상태

**✅ Phase 5 완료 항목 (기반 완성):**
- RBAC (Role-Based Access Control) 시스템 구현
- 6단계 역할 계층 (CEO → Admin → Manager → Senior → Junior → User)
- 4단계 구독 티어 (Enterprise → Pro → Basic → Free)
- 398개 프로덕션 벡터에 RBAC 메타데이터 추가
- Database contexts 테이블 with pinecone_id 링크

**🎯 Phase 6에서 추가할 항목:**
- 구독 티어 → 실제 결제 연동
- 사용량 추적 및 제한 강제
- 구독 업그레이드/다운그레이드 자동화
- 비즈니스 인텔리전스 대시보드

### 💰 예상 ROI

**투자:**
- 개발 시간: 120시간 ($12,000)
- Stripe 수수료: 2.9% + $0.30/transaction
- 추가 인프라: +$50/월

**예상 수익 (첫 3개월):**
- 엔터프라이즈 고객 1명: $2,000/월
- Pro 고객 5명: $500/월
- Basic 고객 20명: $200/월
- **총 수익:** $2,700/월

**ROI:** 4-5개월 내 회수 예상

---

## Phase 6.1: 구독 관리 & 결제 시스템

**예상 시간:** 70시간
**우선순위:** P0 - CRITICAL

### 6.1.1 데이터베이스 마이그레이션

#### subscription_history 테이블
```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_tier subscription_tier NOT NULL,
  to_tier subscription_tier NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  stripe_subscription_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  INDEX idx_subscription_history_user (user_id, changed_at DESC),
  INDEX idx_subscription_history_stripe (stripe_subscription_id)
);

-- RLS Policy
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription history"
  ON subscription_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription history"
  ON subscription_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );
```

#### usage_tracking 테이블
```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'query', 'document_upload', 'storage_mb'
  metric_value INTEGER NOT NULL DEFAULT 1,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,

  -- Indexes
  INDEX idx_usage_tracking_user_period (user_id, period_start, period_end),
  INDEX idx_usage_tracking_metric (metric_type, created_at DESC),

  -- Constraints
  CONSTRAINT usage_tracking_valid_period CHECK (period_end >= period_start),
  CONSTRAINT usage_tracking_positive_value CHECK (metric_value > 0)
);

-- RLS Policy
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON usage_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );
```

#### subscription_plans 테이블 (정적 플랜 정보)
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly INTEGER NOT NULL, -- cents
  price_yearly INTEGER, -- cents (null = not available)

  -- Limits
  query_limit_monthly INTEGER, -- null = unlimited
  document_upload_limit_monthly INTEGER,
  storage_limit_mb INTEGER,

  -- Features
  features JSONB NOT NULL DEFAULT '[]',

  -- Stripe IDs
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (tier, name, price_monthly, price_yearly, query_limit_monthly, document_upload_limit_monthly, storage_limit_mb, features) VALUES
  ('free', 'Free', 0, NULL, 10, 0, 10, '["기본 RAG 검색"]'),
  ('basic', 'Basic', 1000, 10000, 100, 5, 100, '["RAG 검색", "문서 업로드 (5/월)", "이메일 지원"]'),
  ('pro', 'Pro', 5000, 50000, 1000, 50, 1000, '["무제한 RAG 검색", "문서 업로드 (50/월)", "우선 지원", "고급 분석"]'),
  ('enterprise', 'Enterprise', 20000, 200000, NULL, NULL, NULL, '["무제한 모든 기능", "전담 지원", "커스텀 통합", "SLA 보장"]');
```

### 6.1.2 SubscriptionService 구현

**파일:** `lib/services/subscription.service.ts`

```typescript
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface UsageLimits {
  queries: { used: number; limit: number | null };
  documents: { used: number; limit: number | null };
  storage: { used: number; limit: number | null }; // MB
}

export class SubscriptionService {
  /**
   * Get current subscription for user
   */
  static async getCurrentSubscription(userId: string) {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      tier: profile.subscription_tier,
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: profile.stripe_subscription_id,
    };
  }

  /**
   * Get subscription plan details
   */
  static async getPlanDetails(tier: string) {
    const supabase = await createClient();

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return plan;
  }

  /**
   * Check if user has exceeded usage limits
   */
  static async checkUsageLimits(userId: string): Promise<UsageLimits> {
    const supabase = await createClient();

    // Get current subscription tier
    const { tier } = await this.getCurrentSubscription(userId);
    const plan = await this.getPlanDetails(tier);

    // Get current period (monthly)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get usage for current period
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('metric_type, metric_value')
      .eq('user_id', userId)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString());

    const usageByType = (usage || []).reduce((acc, curr) => {
      acc[curr.metric_type] = (acc[curr.metric_type] || 0) + curr.metric_value;
      return acc;
    }, {} as Record<string, number>);

    return {
      queries: {
        used: usageByType['query'] || 0,
        limit: plan.query_limit_monthly,
      },
      documents: {
        used: usageByType['document_upload'] || 0,
        limit: plan.document_upload_limit_monthly,
      },
      storage: {
        used: usageByType['storage_mb'] || 0,
        limit: plan.storage_limit_mb,
      },
    };
  }

  /**
   * Check if action is allowed based on limits
   */
  static async canPerformAction(
    userId: string,
    action: 'query' | 'document_upload' | 'storage'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const limits = await this.checkUsageLimits(userId);

    const limitMap = {
      query: limits.queries,
      document_upload: limits.documents,
      storage: limits.storage,
    };

    const limit = limitMap[action];

    // Unlimited (null limit)
    if (limit.limit === null) {
      return { allowed: true };
    }

    // Check if under limit
    if (limit.used < limit.limit) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `${action} limit exceeded (${limit.used}/${limit.limit})`,
    };
  }

  /**
   * Increment usage counter
   */
  static async incrementUsage(
    userId: string,
    metricType: 'query' | 'document_upload' | 'storage_mb',
    value: number = 1,
    metadata?: any
  ) {
    const supabase = await createClient();

    // Get current period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        metric_type: metricType,
        metric_value: value,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        metadata,
      });

    if (error) throw error;
  }

  /**
   * Create Stripe Checkout Session
   */
  static async createCheckoutSession(
    userId: string,
    tier: string,
    billingPeriod: 'monthly' | 'yearly' = 'monthly'
  ) {
    const supabase = await createClient();

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('User not found');

    // Get plan details
    const plan = await this.getPlanDetails(tier);
    const priceId = billingPeriod === 'monthly'
      ? plan.stripe_price_id_monthly
      : plan.stripe_price_id_yearly;

    if (!priceId) throw new Error('Price ID not found for plan');

    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        supabase_user_id: userId,
        tier,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Create Stripe Customer Portal Session
   */
  static async createPortalSession(userId: string) {
    const { stripeCustomerId } = await this.getCurrentSubscription(userId);

    if (!stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return { url: session.url };
  }

  /**
   * Handle subscription change (from Stripe webhook)
   */
  static async handleSubscriptionChange(
    userId: string,
    newTier: string,
    stripeSubscriptionId: string,
    reason: string = 'Stripe payment'
  ) {
    const supabase = await createClient();

    // Get current tier
    const { tier: currentTier } = await this.getCurrentSubscription(userId);

    // Update profile
    await supabase
      .from('profiles')
      .update({
        subscription_tier: newTier,
        stripe_subscription_id: stripeSubscriptionId,
      })
      .eq('id', userId);

    // Log history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        from_tier: currentTier,
        to_tier: newTier,
        reason,
        stripe_subscription_id: stripeSubscriptionId,
      });
  }
}
```

### 6.1.3 Stripe Webhook 핸들러

**파일:** `app/api/webhooks/stripe/route.ts`

```typescript
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SubscriptionService } from '@/lib/services/subscription.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const tier = session.metadata?.tier;

        if (userId && tier && session.subscription) {
          await SubscriptionService.handleSubscriptionChange(
            userId,
            tier,
            session.subscription as string,
            'Subscription created'
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if ('metadata' in customer && customer.metadata?.supabase_user_id) {
          const userId = customer.metadata.supabase_user_id;

          // Determine new tier from price ID
          // (You'll need to map Stripe price IDs to tiers)
          const newTier = await determineTierFromSubscription(subscription);

          await SubscriptionService.handleSubscriptionChange(
            userId,
            newTier,
            subscription.id,
            'Subscription updated'
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if ('metadata' in customer && customer.metadata?.supabase_user_id) {
          const userId = customer.metadata.supabase_user_id;

          // Downgrade to free tier
          await SubscriptionService.handleSubscriptionChange(
            userId,
            'free',
            subscription.id,
            'Subscription canceled'
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function determineTierFromSubscription(
  subscription: Stripe.Subscription
): Promise<string> {
  // Get price ID from subscription
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) return 'free';

  // Query subscription_plans to find matching tier
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('tier')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();

  return plan?.tier || 'free';
}
```

### 6.1.4 Usage Tracking Middleware

**파일:** `lib/middleware/usage-tracking.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription.service';

export async function withUsageTracking(
  req: NextRequest,
  userId: string,
  action: 'query' | 'document_upload' | 'storage',
  value: number = 1
) {
  // Check if action is allowed
  const { allowed, reason } = await SubscriptionService.canPerformAction(
    userId,
    action
  );

  if (!allowed) {
    return NextResponse.json(
      { error: reason },
      { status: 403 }
    );
  }

  // Increment usage counter
  await SubscriptionService.incrementUsage(userId, action, value);

  return null; // Continue with request
}
```

### 6.1.5 Billing UI

#### Billing Page
**파일:** `app/billing/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2 } from 'lucide-react';

interface Plan {
  tier: string;
  name: string;
  description: string;
  price_monthly: number;
  features: string[];
}

interface UsageLimits {
  queries: { used: number; limit: number | null };
  documents: { used: number; limit: number | null };
  storage: { used: number; limit: number | null };
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile) {
      setCurrentTier(profile.subscription_tier);
    }

    // Get available plans
    const { data: plansData } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (plansData) {
      setPlans(plansData);
    }

    // Get usage limits
    const response = await fetch('/api/billing/usage');
    const usageData = await response.json();
    setUsage(usageData);

    setLoading(false);
  }

  async function handleUpgrade(tier: string) {
    setUpgrading(tier);

    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout process');
      setUpgrading(null);
    }
  }

  async function handleManageSubscription() {
    try {
      const response = await fetch('/api/billing/portal');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open billing portal');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">구독 관리</h1>
      <p className="text-muted-foreground mb-8">
        플랜을 업그레이드하여 더 많은 기능을 사용하세요
      </p>

      {/* Current Usage */}
      {usage && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>이번 달 사용량</CardTitle>
            <CardDescription>
              현재 플랜: <Badge>{currentTier.toUpperCase()}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">쿼리</span>
                <span className="text-sm text-muted-foreground">
                  {usage.queries.used} / {usage.queries.limit || '무제한'}
                </span>
              </div>
              {usage.queries.limit && (
                <Progress
                  value={(usage.queries.used / usage.queries.limit) * 100}
                />
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">문서 업로드</span>
                <span className="text-sm text-muted-foreground">
                  {usage.documents.used} / {usage.documents.limit || '무제한'}
                </span>
              </div>
              {usage.documents.limit && (
                <Progress
                  value={(usage.documents.used / usage.documents.limit) * 100}
                />
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">스토리지</span>
                <span className="text-sm text-muted-foreground">
                  {usage.storage.used} MB / {usage.storage.limit || '무제한'} MB
                </span>
              </div>
              {usage.storage.limit && (
                <Progress
                  value={(usage.storage.used / usage.storage.limit) * 100}
                />
              )}
            </div>

            {currentTier !== 'free' && (
              <Button
                onClick={handleManageSubscription}
                variant="outline"
                className="w-full mt-4"
              >
                구독 관리 (결제 정보, 청구서 등)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.tier}
            className={plan.tier === currentTier ? 'border-primary' : ''}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {plan.tier === currentTier && (
                  <Badge variant="secondary">현재 플랜</Badge>
                )}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  ₩{(plan.price_monthly / 100).toLocaleString()}
                </span>
                <span className="text-muted-foreground">/월</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.tier === currentTier ? (
                <Button variant="outline" disabled className="w-full">
                  현재 플랜
                </Button>
              ) : plan.tier === 'free' ? (
                <Button variant="outline" disabled className="w-full">
                  무료 플랜
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={upgrading !== null}
                  className="w-full"
                >
                  {upgrading === plan.tier ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {upgrading === plan.tier ? '처리 중...' : '업그레이드'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 6.2: 고급 분석 시스템

**예상 시간:** 50시간
**우선순위:** P1 - HIGH

### 6.2.1 데이터베이스 마이그레이션

#### code_usage_logs 테이블
```sql
CREATE TABLE code_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES verification_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL, -- 'viewed', 'registered', 'first_query', etc.

  -- Context
  source TEXT, -- 'web', 'kakao', 'email', etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,

  -- Indexes
  INDEX idx_code_usage_logs_code (code_id, created_at DESC),
  INDEX idx_code_usage_logs_user (user_id, created_at DESC),
  INDEX idx_code_usage_logs_event (event_type, created_at DESC)
);

-- RLS Policy
ALTER TABLE code_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all code usage logs"
  ON code_usage_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );
```

#### context_access_logs 테이블
```sql
CREATE TABLE context_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
  query_log_id UUID REFERENCES query_logs(id) ON DELETE SET NULL,

  -- Access details
  access_granted BOOLEAN NOT NULL DEFAULT true,
  denial_reason TEXT, -- If access_granted = false

  -- User context
  user_role user_role NOT NULL,
  user_tier subscription_tier NOT NULL,

  -- Content context
  content_access_level access_level NOT NULL,
  content_required_role user_role,
  content_required_tier subscription_tier,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,

  -- Indexes
  INDEX idx_context_access_logs_user (user_id, created_at DESC),
  INDEX idx_context_access_logs_context (context_id, created_at DESC),
  INDEX idx_context_access_logs_query (query_log_id),
  INDEX idx_context_access_logs_access (access_granted, created_at DESC)
);

-- RLS Policy
ALTER TABLE context_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs"
  ON context_access_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all access logs"
  ON context_access_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );
```

#### user_sessions 테이블
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Activity
  queries_count INTEGER NOT NULL DEFAULT 0,
  documents_viewed INTEGER NOT NULL DEFAULT 0,
  pages_visited TEXT[] DEFAULT '{}',

  -- Device/Browser
  user_agent TEXT,
  ip_address INET,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,

  -- Indexes
  INDEX idx_user_sessions_user (user_id, session_start DESC),
  INDEX idx_user_sessions_duration (duration_seconds DESC),
  INDEX idx_user_sessions_device (device_type)
);

-- RLS Policy
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );
```

### 6.2.2 AnalyticsService 확장

**파일:** `lib/services/analytics.service.enhanced.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export interface CodeAnalytics {
  code: string;
  totalViews: number;
  totalRegistrations: number;
  conversionRate: number;
  firstQueryRate: number;
  avgTimeToFirstQuery: number; // seconds
  bySource: Array<{
    source: string;
    views: number;
    registrations: number;
  }>;
}

export interface ContentAnalytics {
  contextId: string;
  title: string;
  totalAccesses: number;
  uniqueUsers: number;
  accessGrantedCount: number;
  accessDeniedCount: number;
  avgAccessesPerUser: number;
  topUsers: Array<{
    userId: string;
    email: string;
    accessCount: number;
  }>;
}

export interface SessionAnalytics {
  totalSessions: number;
  avgDuration: number; // seconds
  avgQueriesPerSession: number;
  bounceRate: number; // sessions with only 1 query
  byDevice: Array<{
    deviceType: string;
    count: number;
    avgDuration: number;
  }>;
}

export class EnhancedAnalyticsService {
  /**
   * Get code campaign analytics
   */
  static async getCodeAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<CodeAnalytics[]> {
    const supabase = await createClient();

    const query = supabase
      .from('code_usage_logs')
      .select(`
        code_id,
        event_type,
        source,
        verification_codes (code)
      `);

    if (startDate) {
      query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query.lte('created_at', endDate.toISOString());
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Group by code and analyze
    const codeMap = new Map<string, any>();

    logs?.forEach((log) => {
      const code = log.verification_codes?.code;
      if (!code) return;

      if (!codeMap.has(code)) {
        codeMap.set(code, {
          code,
          views: 0,
          registrations: 0,
          firstQueries: 0,
          sources: new Map(),
          registrationTimes: [],
        });
      }

      const codeData = codeMap.get(code);

      if (log.event_type === 'viewed') {
        codeData.views++;

        const source = log.source || 'unknown';
        const sourceData = codeData.sources.get(source) || { views: 0, registrations: 0 };
        sourceData.views++;
        codeData.sources.set(source, sourceData);
      }

      if (log.event_type === 'registered') {
        codeData.registrations++;

        const source = log.source || 'unknown';
        const sourceData = codeData.sources.get(source) || { views: 0, registrations: 0 };
        sourceData.registrations++;
        codeData.sources.set(source, sourceData);
      }

      if (log.event_type === 'first_query') {
        codeData.firstQueries++;
      }
    });

    return Array.from(codeMap.values()).map((data) => ({
      code: data.code,
      totalViews: data.views,
      totalRegistrations: data.registrations,
      conversionRate: data.views > 0 ? (data.registrations / data.views) * 100 : 0,
      firstQueryRate: data.registrations > 0 ? (data.firstQueries / data.registrations) * 100 : 0,
      avgTimeToFirstQuery: 0, // Calculate from timestamps
      bySource: Array.from(data.sources.entries()).map(([source, stats]) => ({
        source,
        views: stats.views,
        registrations: stats.registrations,
      })),
    }));
  }

  /**
   * Get content access analytics
   */
  static async getContentAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ContentAnalytics[]> {
    const supabase = await createClient();

    const query = supabase
      .from('context_access_logs')
      .select(`
        context_id,
        user_id,
        access_granted,
        contexts (title)
      `);

    if (startDate) {
      query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query.lte('created_at', endDate.toISOString());
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Group by context
    const contextMap = new Map<string, any>();

    logs?.forEach((log) => {
      if (!contextMap.has(log.context_id)) {
        contextMap.set(log.context_id, {
          contextId: log.context_id,
          title: log.contexts?.title || 'Unknown',
          accesses: [],
          uniqueUsers: new Set(),
          granted: 0,
          denied: 0,
        });
      }

      const contextData = contextMap.get(log.context_id);
      contextData.accesses.push(log);
      contextData.uniqueUsers.add(log.user_id);

      if (log.access_granted) {
        contextData.granted++;
      } else {
        contextData.denied++;
      }
    });

    return Array.from(contextMap.values()).map((data) => ({
      contextId: data.contextId,
      title: data.title,
      totalAccesses: data.accesses.length,
      uniqueUsers: data.uniqueUsers.size,
      accessGrantedCount: data.granted,
      accessDeniedCount: data.denied,
      avgAccessesPerUser: data.uniqueUsers.size > 0
        ? data.accesses.length / data.uniqueUsers.size
        : 0,
      topUsers: [], // Calculate from user access counts
    }));
  }

  /**
   * Get session analytics
   */
  static async getSessionAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SessionAnalytics> {
    const supabase = await createClient();

    const query = supabase
      .from('user_sessions')
      .select('*');

    if (startDate) {
      query.gte('session_start', startDate.toISOString());
    }
    if (endDate) {
      query.lte('session_start', endDate.toISOString());
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    const totalSessions = sessions?.length || 0;
    const avgDuration = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / totalSessions || 0;
    const avgQueries = sessions?.reduce((sum, s) => sum + s.queries_count, 0) / totalSessions || 0;
    const bounceSessions = sessions?.filter(s => s.queries_count <= 1).length || 0;

    // Group by device
    const deviceMap = new Map<string, { count: number; totalDuration: number }>();
    sessions?.forEach((session) => {
      const device = session.device_type || 'unknown';
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { count: 0, totalDuration: 0 });
      }
      const deviceData = deviceMap.get(device)!;
      deviceData.count++;
      deviceData.totalDuration += session.duration_seconds || 0;
    });

    return {
      totalSessions,
      avgDuration,
      avgQueriesPerSession: avgQueries,
      bounceRate: totalSessions > 0 ? (bounceSessions / totalSessions) * 100 : 0,
      byDevice: Array.from(deviceMap.entries()).map(([deviceType, data]) => ({
        deviceType,
        count: data.count,
        avgDuration: data.totalDuration / data.count,
      })),
    };
  }

  /**
   * Get user cohort analytics
   */
  static async getCohortAnalytics() {
    const supabase = await createClient();

    // Get users grouped by signup month
    const { data: cohorts } = await supabase.rpc('get_user_cohorts');

    return cohorts;
  }
}
```

### 6.2.3 Analytics APIs

**파일:** `app/api/admin/analytics/codes/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { EnhancedAnalyticsService } from '@/lib/services/analytics.service.enhanced';
import { verifyAdmin } from '@/lib/middleware/auth';

export async function GET(req: Request) {
  try {
    // Verify admin access
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date')
      ? new Date(searchParams.get('start_date')!)
      : undefined;
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : undefined;

    const analytics = await EnhancedAnalyticsService.getCodeAnalytics(
      startDate,
      endDate
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching code analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
```

**Similar APIs for:**
- `app/api/admin/analytics/content/route.ts`
- `app/api/admin/analytics/sessions/route.ts`
- `app/api/admin/analytics/cohorts/route.ts`

### 6.2.4 Analytics Dashboards

#### Code Analytics Dashboard
**파일:** `app/admin/analytics/codes/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

export default function CodeAnalyticsPage() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    const response = await fetch('/api/admin/analytics/codes');
    const data = await response.json();
    setAnalytics(data);
    setLoading(false);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">코드 캠페인 분석</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>총 조회수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.reduce((sum, a) => sum + a.totalViews, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>총 가입 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.reduce((sum, a) => sum + a.totalRegistrations, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>평균 전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>코드별 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart width={800} height={400} data={analytics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="code" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalViews" fill="#8884d8" name="조회수" />
            <Bar dataKey="totalRegistrations" fill="#82ca9d" name="가입 수" />
          </BarChart>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 구현 순서

### Week 1: 구독 관리 시스템 (70시간)

**Day 1-2 (16h): Database & Core Service**
- [ ] subscription_history, usage_tracking, subscription_plans 테이블 생성
- [ ] SubscriptionService 구현 (getCurrentSubscription, getPlanDetails, checkUsageLimits)
- [ ] 기본 Stripe 연동 설정
- [ ] 단위 테스트 작성

**Day 3-4 (16h): Stripe Integration**
- [ ] Checkout Session 생성 로직
- [ ] Webhook 핸들러 구현 및 테스트
- [ ] Customer Portal 연동
- [ ] Stripe 이벤트 로깅

**Day 5-6 (16h): Usage Tracking**
- [ ] Usage tracking middleware 구현
- [ ] Query API에 usage tracking 추가
- [ ] Document upload API에 usage tracking 추가
- [ ] Usage limit enforcement 테스트

**Day 7-8 (16h): Billing UI**
- [ ] Billing page 구현 (플랜 선택, 현재 구독, 사용량)
- [ ] Upgrade/downgrade flows
- [ ] Stripe Checkout redirect handling
- [ ] Customer Portal 연동
- [ ] End-to-end 테스트

**Day 9 (6h): Testing & Documentation**
- [ ] Integration testing (전체 결제 플로우)
- [ ] Error scenarios 테스트 (결제 실패, webhook 실패 등)
- [ ] 관리자 문서 작성

### Week 2: 고급 분석 시스템 (50시간)

**Day 10-11 (16h): Analytics Database**
- [ ] code_usage_logs, context_access_logs, user_sessions 테이블 생성
- [ ] EnhancedAnalyticsService 구현
- [ ] 기본 analytics 쿼리 최적화
- [ ] RLS policies 설정

**Day 12-13 (16h): Analytics APIs**
- [ ] Code analytics API 구현
- [ ] Content analytics API 구현
- [ ] Session analytics API 구현
- [ ] Cohort analytics API 구현
- [ ] API 성능 테스트

**Day 14-15 (18h): Analytics Dashboards**
- [ ] Code analytics dashboard 구현
- [ ] Content analytics dashboard 구현
- [ ] Session analytics dashboard 구현
- [ ] 차트 및 시각화 컴포넌트
- [ ] 필터링 및 날짜 범위 선택

---

## 테스트 계획

### Unit Tests
- [ ] SubscriptionService 모든 메서드
- [ ] EnhancedAnalyticsService 모든 메서드
- [ ] Usage tracking middleware
- [ ] Stripe webhook handlers

### Integration Tests
- [ ] 전체 결제 플로우 (signup → upgrade → payment → webhook)
- [ ] 사용량 제한 enforcement
- [ ] Analytics 데이터 수집 및 조회
- [ ] Subscription 변경 및 히스토리 추적

### End-to-End Tests
- [ ] 사용자 회원가입 → 무료 플랜 사용 → 제한 도달 → 업그레이드
- [ ] 결제 성공/실패 시나리오
- [ ] 관리자 분석 대시보드 탐색

---

## 배포 전략

### Pre-Deployment
1. [ ] Stripe 프로덕션 키 설정
2. [ ] Webhook endpoint 등록
3. [ ] Subscription plans 데이터 입력
4. [ ] 데이터베이스 마이그레이션 실행

### Deployment
1. [ ] Feature flag로 구독 기능 점진적 활성화
2. [ ] 기존 사용자 무료 플랜 자동 할당
3. [ ] 모니터링 설정 (Stripe events, usage metrics)

### Post-Deployment
1. [ ] Stripe webhook 로그 모니터링
2. [ ] 사용량 추적 정확성 검증
3. [ ] 결제 성공률 추적
4. [ ] 사용자 피드백 수집

---

## 성공 지표

### Week 1 완료 시
- ✅ Stripe 결제 테스트 성공
- ✅ 사용량 제한 강제 작동
- ✅ 구독 변경 자동화

### Week 2 완료 시
- ✅ 모든 analytics 대시보드 작동
- ✅ 데이터 수집 정확성 95%+
- ✅ Dashboard 로딩 시간 < 2초

### Phase 6 완료 시
- ✅ 첫 유료 고객 확보
- ✅ 구독 관리 워크플로우 자동화
- ✅ 데이터 기반 의사결정 가능

---

**문서 버전:** 1.0
**작성일:** 2025-11-13
**다음 업데이트:** Phase 6 시작 시
