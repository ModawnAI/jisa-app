/**
 * Analytics Export API Endpoint
 * POST /api/analytics/export
 * Body: { timeRange: '7d'|'30d'|'90d', format: 'csv' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdvancedAnalyticsService } from '@/lib/services/analytics';
import type { TimeRange } from '@/lib/services/analytics';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const timeRange = (body.timeRange || '7d') as TimeRange;
    const format = body.format || 'csv';

    // Validate time range
    if (!['7d', '30d', '90d'].includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid time range. Must be 7d, 30d, or 90d' },
        { status: 400 }
      );
    }

    // Validate format
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Invalid format. Currently only CSV is supported' },
        { status: 400 }
      );
    }

    // Generate export
    const analyticsService = new AdvancedAnalyticsService();
    const csvData = await analyticsService.exportToCSV(timeRange);

    // Return as downloadable file
    const filename = `analytics-export-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
