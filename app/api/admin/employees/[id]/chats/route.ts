/**
 * Employee Chat History API
 *
 * Provides chat message history for a specific employee.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Employee Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: employeeId } = await props.params

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

    // 3. Get employee's profile ID from credential ID
    const { data: employeeProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('credential_id', employeeId)
      .single()

    if (!employeeProfile) {
      // Employee not verified yet, no chat history
      return NextResponse.json({
        chats: [],
        total: 0,
      })
    }

    // 4. Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 5. Get chat logs for this employee
    const { data: chats, error: chatError, count } = await supabase
      .from('chat_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', employeeProfile.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (chatError) {
      console.error('[Employee Chats API] Chat logs error:', chatError)
      return NextResponse.json(
        { error: 'Failed to fetch chat history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      chats: chats || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: count ? (page * pageSize < count) : false,
    })

  } catch (error: any) {
    console.error('[Employee Chats API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
