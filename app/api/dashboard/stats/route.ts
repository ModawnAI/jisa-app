/**
 * Dashboard Stats API
 * Returns key metrics for dashboard home page
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's date range for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Today's query count
    const { count: todayQueryCount } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today.toISOString())
      .lt('timestamp', tomorrow.toISOString());

    // Yesterday's query count for comparison
    const { count: yesterdayQueryCount } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', yesterday.toISOString())
      .lt('timestamp', today.toISOString());

    // Calculate change percentage
    const queryChange =
      yesterdayQueryCount && yesterdayQueryCount > 0
        ? Math.round(
            ((todayQueryCount || 0) - yesterdayQueryCount) /
              yesterdayQueryCount *
              100
          )
        : 0;

    // 2. Active users (users who made queries today)
    const { data: todayUsers } = await supabase
      .from('query_logs')
      .select('user_id')
      .gte('timestamp', today.toISOString())
      .lt('timestamp', tomorrow.toISOString());

    const activeUsers = new Set(
      todayUsers?.map((log) => log.user_id).filter(Boolean)
    ).size;

    const { data: yesterdayUsers } = await supabase
      .from('query_logs')
      .select('user_id')
      .gte('timestamp', yesterday.toISOString())
      .lt('timestamp', today.toISOString());

    const yesterdayActiveUsers = new Set(
      yesterdayUsers?.map((log) => log.user_id).filter(Boolean)
    ).size;

    const usersChange =
      yesterdayActiveUsers > 0
        ? Math.round(
            ((activeUsers - yesterdayActiveUsers) / yesterdayActiveUsers) * 100
          )
        : 0;

    // 3. Average response time (today)
    const { data: todayLogs } = await supabase
      .from('query_logs')
      .select('response_time')
      .gte('timestamp', today.toISOString())
      .lt('timestamp', tomorrow.toISOString())
      .not('response_time', 'is', null);

    const avgResponseTime = todayLogs?.length
      ? Math.round(
          todayLogs.reduce((sum, log) => sum + (log.response_time || 0), 0) /
            todayLogs.length
        )
      : 0;

    const { data: yesterdayLogs } = await supabase
      .from('query_logs')
      .select('response_time')
      .gte('timestamp', yesterday.toISOString())
      .lt('timestamp', today.toISOString())
      .not('response_time', 'is', null);

    const yesterdayAvgResponseTime = yesterdayLogs?.length
      ? Math.round(
          yesterdayLogs.reduce((sum, log) => sum + (log.response_time || 0), 0) /
            yesterdayLogs.length
        )
      : 0;

    const responseTimeChange =
      yesterdayAvgResponseTime > 0
        ? Math.round(
            ((avgResponseTime - yesterdayAvgResponseTime) /
              yesterdayAvgResponseTime) *
              100
          )
        : 0;

    // 4. RAG success rate (queries with responses)
    const { count: successfulQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today.toISOString())
      .lt('timestamp', tomorrow.toISOString())
      .not('response_text', 'is', null)
      .neq('response_text', '');

    const successRate =
      todayQueryCount && todayQueryCount > 0
        ? Math.round(((successfulQueries || 0) / todayQueryCount) * 100)
        : 0;

    const { count: yesterdaySuccessfulQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', yesterday.toISOString())
      .lt('timestamp', today.toISOString())
      .not('response_text', 'is', null)
      .neq('response_text', '');

    const yesterdaySuccessRate =
      yesterdayQueryCount && yesterdayQueryCount > 0 && yesterdaySuccessfulQueries
        ? Math.round((yesterdaySuccessfulQueries / yesterdayQueryCount) * 100)
        : 0;

    const successRateChange = successRate - yesterdaySuccessRate;

    return NextResponse.json({
      todayQueries: todayQueryCount || 0,
      queryChange,
      activeUsers,
      usersChange,
      avgResponseTime,
      responseTimeChange,
      successRate,
      successRateChange,
    });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
