/**
 * Employee Management API
 *
 * Provides comprehensive employee data with verification status, codes, and chat activity.
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

    // Use service client to bypass RLS and see all data
    const serviceClient = createServiceClient()

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const codeFilter = searchParams.get('code_status') || 'all'
    const department = searchParams.get('department')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // 4. Get all profiles (users) instead of just employee credentials
    let profilesQuery = serviceClient
      .from('profiles')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search) {
      profilesQuery = profilesQuery.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,kakao_nickname.ilike.%${search}%`
      )
    }

    // Apply status filter (map to profile data)
    if (statusFilter === 'verified') {
      profilesQuery = profilesQuery.not('verified_with_code', 'is', null)
    } else if (statusFilter === 'pending') {
      profilesQuery = profilesQuery.is('verified_with_code', null)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    profilesQuery = profilesQuery.range(from, to)

    // Order by created_at descending
    profilesQuery = profilesQuery.order('created_at', { ascending: false })

    // Execute profiles query
    const { data: profiles, error: profilesError, count } = await profilesQuery

    if (profilesError) {
      console.error('[Employees API] Profiles error:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        employees: [],
        total: 0,
        page,
        pageSize,
      })
    }

    // 5. Get query logs for chat activity
    const profileIds = profiles.map(p => p.id)
    let chatActivity = new Map()

    if (profileIds.length > 0) {
      const { data: queryCounts } = await serviceClient
        .from('query_logs')
        .select('user_id')
        .in('user_id', profileIds)

      if (queryCounts) {
        // Count queries per user
        const counts = queryCounts.reduce((acc, query) => {
          acc[query.user_id] = (acc[query.user_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Get last query timestamp for each user
        for (const profileId of profileIds) {
          const { data: lastQuery } = await serviceClient
            .from('query_logs')
            .select('timestamp')
            .eq('user_id', profileId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()

          chatActivity.set(profileId, {
            total_chats: counts[profileId] || 0,
            last_chat_at: lastQuery?.timestamp || null,
          })
        }
      }
    }

    // 6. Get verification codes used by these users
    const verificationCodes = profiles
      .map(p => p.verified_with_code)
      .filter(code => code != null)

    let codeMap = new Map()
    if (verificationCodes.length > 0) {
      const { data: codes } = await serviceClient
        .from('verification_codes')
        .select('code, created_at')
        .in('code', verificationCodes)

      codes?.forEach(code => {
        codeMap.set(code.code, code)
      })
    }

    // 7. Combine data into employee objects
    let employees = profiles.map(profile => {
      const activity = chatActivity.get(profile.id)
      const code = profile.verified_with_code ? codeMap.get(profile.verified_with_code) : null

      return {
        // Profile data
        id: profile.id,
        full_name: profile.full_name || profile.kakao_nickname || '사용자',
        email: profile.email || null,
        employee_id: profile.id.substring(0, 8), // Use first 8 chars of UUID as employee ID
        status: profile.verified_with_code ? 'verified' : 'pending',
        created_at: profile.created_at,
        metadata: {
          tier: profile.subscription_tier,
          role: profile.role,
          department: null,
        },

        // Verification code data
        has_code: !!profile.verified_with_code,
        verification_code: profile.verified_with_code || null,
        code_created_at: code?.created_at || null,

        // Profile data
        is_verified: !!profile.verified_with_code,
        profile_id: profile.id,
        verified_at: profile.created_at,

        // Chat activity data
        total_chats: activity?.total_chats || 0,
        last_chat_at: activity?.last_chat_at || null,

        // Computed fields
        tier: profile.subscription_tier || 'free',
        role: profile.role || 'user',
        department: null,
      }
    })

    // 9. Apply code status filter (if needed)
    if (codeFilter === 'with_code') {
      employees = employees.filter(e => e.has_code)
    } else if (codeFilter === 'without_code') {
      employees = employees.filter(e => !e.has_code)
    }

    // 10. Return employee data
    return NextResponse.json({
      employees,
      total: count || 0,
      page,
      pageSize,
      hasMore: count ? (page * pageSize < count) : false,
    })

  } catch (error: any) {
    console.error('[Employees API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
