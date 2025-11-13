/**
 * Payment Analytics API
 * Provides payment and subscription metrics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'org_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end_date') || new Date().toISOString();

    // Get revenue analytics from view
    const { data: revenueData, error: revenueError } = await supabase
      .from('revenue_analytics')
      .select('*')
      .gte('period', startDate)
      .lte('period', endDate)
      .order('period', { ascending: true });

    if (revenueError) {
      console.error('Error fetching revenue analytics:', revenueError);
    }

    // Get subscription distribution
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
    }

    const tierDistribution = subscriptions?.reduce((acc, sub) => {
      acc[sub.tier] = (acc[sub.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get payment success rate
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('status, created_at, pay_method')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    const paymentStats = payments?.reduce(
      (acc, payment) => {
        if (payment.status === 'paid') acc.successful++;
        else if (payment.status === 'failed') acc.failed++;
        acc.total++;
        return acc;
      },
      { successful: 0, failed: 0, total: 0 }
    ) || { successful: 0, failed: 0, total: 0 };

    const successRate = paymentStats.total > 0
      ? (paymentStats.successful / paymentStats.total) * 100
      : 0;

    // Get MRR (Monthly Recurring Revenue)
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('amount, billing_cycle')
      .eq('status', 'active');

    const mrr = activeSubscriptions?.reduce((total, sub) => {
      // Normalize to monthly amount
      const monthlyAmount = sub.billing_cycle === 'yearly'
        ? sub.amount / 12
        : sub.amount;
      return total + monthlyAmount;
    }, 0) || 0;

    // Get new subscriptions count
    const { count: newSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Get churn count (cancellations)
    const { count: churnedSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('cancelled_at', 'is', null)
      .gte('cancelled_at', startDate)
      .lte('cancelled_at', endDate);

    // Calculate churn rate
    const { count: totalActiveAtStart } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('created_at', startDate);

    const churnRate = totalActiveAtStart && totalActiveAtStart > 0
      ? ((churnedSubscriptions || 0) / totalActiveAtStart) * 100
      : 0;

    // Get top payment methods
    const topPaymentMethods = payments?.reduce((acc, payment) => {
      if (payment.status === 'paid') {
        acc[payment.pay_method] = (acc[payment.pay_method] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // Get recent billing events
    const { data: recentEvents } = await supabase
      .from('billing_events')
      .select(`
        id,
        event_type,
        description,
        amount,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    const analytics = {
      overview: {
        mrr: Math.round(mrr),
        totalRevenue: revenueData?.reduce((sum, item) => sum + (item.total_revenue || 0), 0) || 0,
        newSubscriptions: newSubscriptions || 0,
        churnRate: Math.round(churnRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
      },
      revenue: revenueData || [],
      tierDistribution,
      paymentStats,
      topPaymentMethods,
      recentEvents: recentEvents || [],
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('GET /api/analytics/payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
