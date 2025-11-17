/**
 * Billing Statistics API
 * Get billing overview and analytics
 *
 * GET /api/admin/billing/stats - Get billing statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing/stats
 * Get comprehensive billing statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const companyId = searchParams.get('company_id');
    const startMonth = searchParams.get('start_month'); // Format: 2025-01-01
    const endMonth = searchParams.get('end_month');     // Format: 2025-12-01

    // Get current month statistics
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    const currentMonthStr = currentMonth.toISOString().split('T')[0];

    // Build query for current month
    let currentMonthQuery = supabase
      .from('monthly_billing_records')
      .select('*')
      .eq('billing_month', currentMonthStr);

    if (companyId) {
      currentMonthQuery = currentMonthQuery.eq('company_id', companyId);
    }

    const { data: currentMonthData } = await currentMonthQuery;

    // Get revenue statistics
    let revenueQuery = supabase
      .from('monthly_billing_records')
      .select('total_amount, billing_status, billing_month');

    if (companyId) {
      revenueQuery = revenueQuery.eq('company_id', companyId);
    }

    if (startMonth) {
      revenueQuery = revenueQuery.gte('billing_month', startMonth);
    }

    if (endMonth) {
      revenueQuery = revenueQuery.lte('billing_month', endMonth);
    }

    const { data: revenueData } = await revenueQuery;

    // Calculate statistics
    const totalRevenue = revenueData?.reduce((sum, record) =>
      record.billing_status === 'paid' ? sum + record.total_amount : sum, 0
    ) || 0;

    const pendingRevenue = revenueData?.reduce((sum, record) =>
      ['pending', 'sent'].includes(record.billing_status) ? sum + record.total_amount : sum, 0
    ) || 0;

    const overdueRevenue = revenueData?.reduce((sum, record) =>
      record.billing_status === 'overdue' ? sum + record.total_amount : sum, 0
    ) || 0;

    // Get active users trend
    const { data: activeUsersTrend } = await supabase
      .from('monthly_billing_records')
      .select('billing_month, active_users, billable_users')
      .order('billing_month', { ascending: false })
      .limit(12);

    // Get knowledge tier distribution (current month)
    const currentMonthTierDist = currentMonthData?.reduce((acc: any, record) => {
      const tiers = record.users_by_tier || {};
      Object.entries(tiers).forEach(([tier, count]) => {
        acc[tier] = (acc[tier] || 0) + (count as number);
      });
      return acc;
    }, {}) || {};

    // Get invoice status breakdown
    const statusBreakdown = revenueData?.reduce((acc: any, record) => {
      const status = record.billing_status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Calculate MRR (Monthly Recurring Revenue) - based on current active subscriptions
    const { data: activeSubscriptions } = await supabase
      .from('company_subscriptions')
      .select('price_per_user_monthly, company_id')
      .eq('subscription_status', 'active');

    const { data: activeUsersPerCompany } = await supabase
      .from('user_activity_logs')
      .select('company_id, user_id')
      .gte('activity_date', currentMonthStr);

    // Group active users by company
    const activeUsersByCompany = activeUsersPerCompany?.reduce((acc: any, log) => {
      if (!acc[log.company_id]) {
        acc[log.company_id] = new Set();
      }
      acc[log.company_id].add(log.user_id);
      return acc;
    }, {}) || {};

    const estimatedMRR = activeSubscriptions?.reduce((sum, sub) => {
      const activeUsers = activeUsersByCompany[sub.company_id]?.size || 0;
      return sum + (activeUsers * sub.price_per_user_monthly);
    }, 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        // Revenue summary
        revenue: {
          total: totalRevenue,
          pending: pendingRevenue,
          overdue: overdueRevenue,
          estimated_mrr: estimatedMRR
        },

        // Current month
        current_month: {
          total_invoices: currentMonthData?.length || 0,
          total_active_users: currentMonthData?.reduce((sum, r) => sum + r.active_users, 0) || 0,
          total_amount: currentMonthData?.reduce((sum, r) => sum + r.total_amount, 0) || 0,
          tier_distribution: currentMonthTierDist
        },

        // Trends
        trends: {
          active_users: activeUsersTrend || [],
          revenue_by_month: revenueData?.reduce((acc: any[], record) => {
            const existing = acc.find(r => r.month === record.billing_month);
            if (existing) {
              existing.amount += record.total_amount;
            } else {
              acc.push({ month: record.billing_month, amount: record.total_amount });
            }
            return acc;
          }, []) || []
        },

        // Invoice status breakdown
        invoice_status: statusBreakdown,

        // Company count
        active_companies: activeSubscriptions?.length || 0
      }
    });

  } catch (error: any) {
    console.error('[Billing Stats API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
