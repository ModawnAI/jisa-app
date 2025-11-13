/**
 * System Health API Endpoint
 * GET /api/analytics/health
 * Real-time system health check (no time range needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdvancedAnalyticsService } from '@/lib/services/analytics';

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

    if (!['admin', 'ceo', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Manager access or higher required' },
        { status: 403 }
      );
    }

    // Fetch system health
    const analyticsService = new AdvancedAnalyticsService();
    const health = await analyticsService.getSystemHealth();

    return NextResponse.json({
      success: true,
      data: health,
    });

  } catch (error) {
    console.error('System health error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch system health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
