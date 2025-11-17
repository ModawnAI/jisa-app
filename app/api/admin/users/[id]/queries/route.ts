/**
 * User Query History API
 * GET /api/admin/users/[id]/queries
 *
 * Returns all questions and answers for a specific user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Use service client to bypass RLS
    const serviceClient = createServiceClient()

    // Get user's query history
    const { data: queries, error: queriesError, count } = await serviceClient
      .from('query_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', params.id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (queriesError) {
      console.error('[User Queries API] Error fetching queries:', queriesError)
      throw queriesError
    }

    // Calculate stats
    const avgResponseTime = queries.length > 0
      ? queries.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / queries.length
      : 0

    const queryTypeBreakdown = queries.reduce((acc, q) => {
      acc[q.query_type] = (acc[q.query_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        queries,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
        stats: {
          total_queries: count || 0,
          avg_response_time_ms: Math.round(avgResponseTime),
          query_type_breakdown: queryTypeBreakdown,
        },
      },
    })
  } catch (error) {
    console.error('[User Queries API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
