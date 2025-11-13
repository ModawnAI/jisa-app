/**
 * Single Credential API
 *
 * Get, update, or delete a specific credential.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CredentialService } from '@/lib/services/credential.service'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
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

    // Get credential
    const { data: credential, error } = await CredentialService.getCredentialById(params.id)

    if (error || !credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      credential,
    })
  } catch (error) {
    console.error('[Credential API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
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

    // Soft delete credential
    const { error } = await CredentialService.deleteCredential(params.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete credential' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Credential deactivated successfully',
    })
  } catch (error) {
    console.error('[Credential Delete API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
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

    // Parse request body
    const body = await request.json()

    // Update credential
    const { data: credential, error } = await CredentialService.updateCredential(
      params.id,
      body
    )

    if (error || !credential) {
      return NextResponse.json(
        { error: 'Failed to update credential' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      credential,
    })
  } catch (error) {
    console.error('[Credential Update API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
