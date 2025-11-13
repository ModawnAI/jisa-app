/**
 * RBAC Analytics API Endpoint
 * GET /api/analytics/rbac?timeRange=7d|30d|90d
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdvancedAnalyticsService } from '@/lib/services/analytics';
import type { TimeRange } from '@/lib/services/analytics';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check admin access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') || '7d') as TimeRange;

    // Validate time range
    if (!['7d', '30d', '90d'].includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid time range. Must be 7d, 30d, or 90d' },
        { status: 400 }
      );
    }

    // Fetch RBAC analytics
    const analyticsService = new AdvancedAnalyticsService();
    const metrics = await analyticsService.getRBACAnalytics(timeRange);

    return NextResponse.json({
      success: true,
      data: metrics,
      timeRange,
    });

  } catch (error) {
    console.error('RBAC analytics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch RBAC analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
