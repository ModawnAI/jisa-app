/**
 * Chart Data API
 * Returns data for dashboard charts (query type distribution, trends, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get query type distribution
    const { data: queryTypeData } = await supabase
      .from('query_logs')
      .select('query_type')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    // Count by query type
    const typeCounts: Record<string, number> = {};
    queryTypeData?.forEach((log) => {
      const type = log.query_type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Format for pie chart
    const queryTypeDistribution = Object.entries(typeCounts).map(
      ([name, value]) => ({
        name: name === 'rag' ? 'RAG' : name === 'commission' ? 'Commission' : 'Unknown',
        value,
        percentage: queryTypeData?.length
          ? Math.round((value / queryTypeData.length) * 100)
          : 0,
      })
    );

    // Get daily query trends
    const dailyTrends: Record<string, { date: string; queries: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateKey = date.toISOString().split('T')[0];
      dailyTrends[dateKey] = {
        date: dateKey,
        queries: 0,
      };
    }

    // Fill in actual query counts
    const { data: dailyData } = await supabase
      .from('query_logs')
      .select('timestamp')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());

    dailyData?.forEach((log) => {
      const dateKey = log.timestamp.split('T')[0];
      if (dailyTrends[dateKey]) {
        dailyTrends[dateKey].queries += 1;
      }
    });

    const queryTrends = Object.values(dailyTrends).map((trend) => ({
      date: new Date(trend.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
      queries: trend.queries,
    }));

    // Get response time distribution
    const { data: responseTimeData } = await supabase
      .from('query_logs')
      .select('response_time')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .not('response_time', 'is', null);

    // Group by response time ranges
    const timeRanges = {
      '<1s': 0,
      '1-2s': 0,
      '2-3s': 0,
      '3-5s': 0,
      '>5s': 0,
    };

    responseTimeData?.forEach((log) => {
      const time = log.response_time || 0;
      if (time < 1000) timeRanges['<1s']++;
      else if (time < 2000) timeRanges['1-2s']++;
      else if (time < 3000) timeRanges['2-3s']++;
      else if (time < 5000) timeRanges['3-5s']++;
      else timeRanges['>5s']++;
    });

    const responseTimeDistribution = Object.entries(timeRanges).map(
      ([range, count]) => ({
        range,
        count,
      })
    );

    return NextResponse.json({
      queryTypeDistribution,
      queryTrends,
      responseTimeDistribution,
      totalQueries: queryTypeData?.length || 0,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
    });
  } catch (error) {
    console.error('[Chart Data] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
