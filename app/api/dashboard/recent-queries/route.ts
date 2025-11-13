/**
 * Recent Queries API
 * Returns recent queries for dashboard home page
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
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent queries with user info (left join to include queries without profiles)
    const { data: queries, error } = await supabase
      .from('query_logs')
      .select(
        `
        id,
        query_text,
        response_time_ms,
        query_type,
        timestamp,
        user_id,
        kakao_user_id,
        profiles(full_name, email)
      `
      )
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Recent Queries] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queries' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedQueries = queries?.map((query) => ({
      id: query.id,
      queryText: query.query_text,
      responseTime: query.response_time_ms,
      queryType: query.query_type || 'general',
      timestamp: query.timestamp,
      userId: query.user_id,
      kakaoUserId: query.kakao_user_id,
      userFullName:
        (query.profiles as any)?.full_name ||
        (query.kakao_user_id ? `KakaoTalk User` : 'Unknown'),
      userEmail: (query.profiles as any)?.email || '',
    }));

    return NextResponse.json({
      queries: transformedQueries || [],
      total: transformedQueries?.length || 0,
    });
  } catch (error) {
    console.error('[Recent Queries] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
