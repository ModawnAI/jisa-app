/**
 * Credentials Statistics API
 *
 * Returns statistics about user credentials.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CredentialService } from '@/lib/services/credential.service'

export async function GET(request: NextRequest) {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get statistics
    const { data: stats, error: statsError } = await CredentialService.getCredentialStats()

    if (statsError || !stats) {
      return NextResponse.json(
        { error: 'Failed to get statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('[Credentials Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
