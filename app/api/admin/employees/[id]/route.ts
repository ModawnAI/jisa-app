/**
 * Individual Employee API
 *
 * Provides detailed information about a specific employee.
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

    // 3. Get employee credential data
    const { data: credential, error: credError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (credError || !credential) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // 4. Get verification code
    const { data: code } = await supabase
      .from('verification_codes')
      .select('code, created_at')
      .eq('intended_recipient_id', employeeId)
      .single()

    // 5. Get profile (if verified)
    const { data: employeeProfile } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('credential_id', employeeId)
      .single()

    // 6. Get chat activity count
    let totalChats = 0
    let lastChatAt = null

    if (employeeProfile) {
      const { count } = await supabase
        .from('chat_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', employeeProfile.id)

      totalChats = count || 0

      // Get last chat timestamp
      if (count && count > 0) {
        const { data: lastChat } = await supabase
          .from('chat_logs')
          .select('created_at')
          .eq('user_id', employeeProfile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        lastChatAt = lastChat?.created_at || null
      }
    }

    // 7. Construct employee detail object
    const employeeDetail = {
      // Credential data
      id: credential.id,
      full_name: credential.full_name,
      email: credential.email,
      employee_id: credential.employee_id,
      status: credential.status,
      created_at: credential.created_at,
      metadata: credential.metadata,

      // Verification code
      has_code: !!code,
      verification_code: code?.code || null,
      code_created_at: code?.created_at || null,

      // Profile data
      is_verified: !!employeeProfile,
      profile_id: employeeProfile?.id || null,
      verified_at: employeeProfile?.created_at || null,

      // Chat activity
      total_chats: totalChats,
      last_chat_at: lastChatAt,
    }

    return NextResponse.json({ employee: employeeDetail })

  } catch (error: any) {
    console.error('[Employee Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
