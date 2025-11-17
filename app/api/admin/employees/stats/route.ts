/**
 * Employee Statistics API
 *
 * Provides summary statistics for employee management dashboard.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Employee Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient()

    // 3. Get total user count from profiles
    const { count: totalCount } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // 4. Get verified count (users with verification codes)
    const { count: verifiedCount } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('verified_with_code', 'is', null)

    // 5. Get pending count (users without verification codes)
    const { count: pendingCount } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('verified_with_code', null)

    // 6. Users with codes (same as verified)
    const withCodesCount = verifiedCount || 0
    const withoutCodesCount = (totalCount || 0) - withCodesCount

    // 7. Get active chatters (users who have queries)
    const { data: queryUsers } = await serviceClient
      .from('query_logs')
      .select('user_id')

    let activeChattersCount = 0
    if (queryUsers && queryUsers.length > 0) {
      const uniqueUserIds = new Set(queryUsers.map(q => q.user_id).filter(id => id))
      activeChattersCount = uniqueUserIds.size
    }

    // 8. Calculate percentages
    const total = totalCount || 0
    const verifiedPercentage = total > 0 ? Math.round((verifiedCount / total) * 100) : 0
    const pendingPercentage = total > 0 ? Math.round(((pendingCount || 0) / total) * 100) : 0
    const withCodesPercentage = total > 0 ? Math.round((withCodesCount / total) * 100) : 0
    const activeChattersPercentage = verifiedCount > 0
      ? Math.round((activeChattersCount / verifiedCount) * 100)
      : 0

    // 9. Return statistics with simple format for employee page
    return NextResponse.json({
      stats: {
        total: total,
        verified: verifiedCount || 0,
        pending: pendingCount || 0,
        inactive: 0,
        with_codes: withCodesCount,
        without_codes: withoutCodesCount,
        active_chatters: activeChattersCount,
      }
    })

  } catch (error: any) {
    console.error('[Employee Stats API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
