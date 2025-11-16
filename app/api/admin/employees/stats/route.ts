/**
 * Employee Statistics API
 *
 * Provides summary statistics for employee management dashboard.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Employee Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // 3. Get total credentials count
    const { count: totalCount } = await supabase
      .from('user_credentials')
      .select('*', { count: 'exact', head: true })

    // 4. Get verified count (credentials with profiles)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('credential_id')
      .not('credential_id', 'is', null)

    const verifiedCount = profiles?.length || 0

    // 5. Get pending count
    const { count: pendingCount } = await supabase
      .from('user_credentials')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // 6. Get credentials with codes
    const { data: codesWithCredentials } = await supabase
      .from('verification_codes')
      .select('intended_recipient_id')
      .not('intended_recipient_id', 'is', null)

    const withCodesCount = codesWithCredentials?.length || 0
    const withoutCodesCount = (totalCount || 0) - withCodesCount

    // 7. Get active chatters (users who have sent at least one message)
    const verifiedProfileIds = profiles?.map(p => p.credential_id) || []

    let activeChattersCount = 0
    if (verifiedProfileIds.length > 0) {
      // Get profiles IDs from credential IDs
      const { data: profilesWithIds } = await supabase
        .from('profiles')
        .select('id, credential_id')
        .in('credential_id', verifiedProfileIds)

      const profileIds = profilesWithIds?.map(p => p.id) || []

      if (profileIds.length > 0) {
        // Get unique users who have chat logs
        const { data: chatUsers } = await supabase
          .from('chat_logs')
          .select('user_id')
          .in('user_id', profileIds)

        if (chatUsers) {
          const uniqueUserIds = new Set(chatUsers.map(c => c.user_id))
          activeChattersCount = uniqueUserIds.size
        }
      }
    }

    // 8. Calculate percentages
    const total = totalCount || 0
    const verifiedPercentage = total > 0 ? Math.round((verifiedCount / total) * 100) : 0
    const pendingPercentage = total > 0 ? Math.round(((pendingCount || 0) / total) * 100) : 0
    const withCodesPercentage = total > 0 ? Math.round((withCodesCount / total) * 100) : 0
    const activeChattersPercentage = verifiedCount > 0
      ? Math.round((activeChattersCount / verifiedCount) * 100)
      : 0

    // 9. Return statistics
    return NextResponse.json({
      total: total,
      verified: {
        count: verifiedCount,
        percentage: verifiedPercentage,
      },
      pending: {
        count: pendingCount || 0,
        percentage: pendingPercentage,
      },
      withCodes: {
        count: withCodesCount,
        percentage: withCodesPercentage,
      },
      withoutCodes: {
        count: withoutCodesCount,
        percentage: 100 - withCodesPercentage,
      },
      activeChatters: {
        count: activeChattersCount,
        percentage: activeChattersPercentage,
        outOf: verifiedCount,
      },
    })

  } catch (error: any) {
    console.error('[Employee Stats API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
