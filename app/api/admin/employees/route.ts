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

    // 4. Build base query for credentials
    let credentialsQuery = serviceClient
      .from('user_credentials')
      .select('*', { count: 'exact' })

    // Apply status filter
    if (statusFilter !== 'all') {
      credentialsQuery = credentialsQuery.eq('status', statusFilter)
    }

    // Apply department filter (from metadata)
    if (department && department !== 'all') {
      credentialsQuery = credentialsQuery.eq('metadata->>department', department)
    }

    // Apply search filter
    if (search) {
      credentialsQuery = credentialsQuery.or(
        `full_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    credentialsQuery = credentialsQuery.range(from, to)

    // Order by created_at descending
    credentialsQuery = credentialsQuery.order('created_at', { ascending: false })

    // Execute credentials query
    const { data: credentials, error: credError, count } = await credentialsQuery

    if (credError) {
      console.error('[Employees API] Credentials error:', credError)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({
        employees: [],
        total: 0,
        page,
        pageSize,
      })
    }

    // 5. Get verification codes for these credentials
    const credentialIds = credentials.map(c => c.id)
    const { data: codes } = await serviceClient
      .from('verification_codes')
      .select('intended_recipient_id, code, created_at')
      .in('intended_recipient_id', credentialIds)
      .not('intended_recipient_id', 'is', null)

    // Create code lookup map
    const codeMap = new Map(
      codes?.map(c => [c.intended_recipient_id, c]) || []
    )

    // 6. Get profiles for verified employees
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, credential_id, created_at')
      .in('credential_id', credentialIds)
      .not('credential_id', 'is', null)

    // Create profile lookup map
    const profileMap = new Map(
      profiles?.map(p => [p.credential_id, p]) || []
    )

    // 7. Get chat activity for verified employees
    const verifiedProfileIds = profiles?.map(p => p.id) || []
    let chatActivity = new Map()

    if (verifiedProfileIds.length > 0) {
      const { data: chats } = await serviceClient
        .from('chat_logs')
        .select('user_id')
        .in('user_id', verifiedProfileIds)

      if (chats) {
        // Count chats per user
        const chatCounts = chats.reduce((acc, chat) => {
          acc[chat.user_id] = (acc[chat.user_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Get last chat timestamp for each user
        for (const profileId of verifiedProfileIds) {
          const { data: lastChat } = await serviceClient
            .from('chat_logs')
            .select('created_at')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          chatActivity.set(profileId, {
            total_chats: chatCounts[profileId] || 0,
            last_chat_at: lastChat?.created_at || null,
          })
        }
      }
    }

    // 8. Combine data into employee objects
    let employees = credentials.map(credential => {
      const code = codeMap.get(credential.id)
      const profile = profileMap.get(credential.id)
      const activity = profile ? chatActivity.get(profile.id) : null

      return {
        // Credential data
        id: credential.id,
        full_name: credential.full_name,
        email: credential.email,
        employee_id: credential.employee_id,
        status: credential.status,
        created_at: credential.created_at,
        metadata: credential.metadata,

        // Verification code data
        has_code: !!code,
        verification_code: code?.code || null,
        code_created_at: code?.created_at || null,

        // Profile data
        is_verified: !!profile,
        profile_id: profile?.id || null,
        verified_at: profile?.created_at || null,

        // Chat activity data
        total_chats: activity?.total_chats || 0,
        last_chat_at: activity?.last_chat_at || null,

        // Computed fields
        tier: credential.metadata?.tier || 'free',
        role: credential.metadata?.role || 'user',
        department: credential.metadata?.department || null,
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
