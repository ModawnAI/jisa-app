/**
 * Enhanced Code Generation API with User Credentials
 *
 * Generates verification codes linked to specific user credentials.
 * Supports both single and bulk generation with credential matching.
 *
 * Database: kuixphvkbuuzfezoeyii
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CredentialService } from '@/lib/services/credential.service'

// Generate random code in format: XXX-XXX-XXX-XXX
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''

  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-'
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }

  return code
}

interface GenerateWithCredentialRequest {
  // Credential information (can be existing ID or new credential data)
  credential_id?: string // Link to existing credential
  credential?: {
    // Or create new credential
    full_name: string
    email?: string
    phone_number?: string
    employee_id?: string
    department?: string
    team?: string
    position?: string
    hire_date?: string
    location?: string
  }

  // Code properties
  code_type?: string
  role: string
  tier: string
  expiresInDays?: number
  maxUses?: number

  // Credential verification requirements
  requires_credential_match?: boolean
  credential_match_fields?: string[] // e.g., ["email", "employee_id"]

  // Distribution settings
  distribution_method?: 'kakao' | 'email' | 'sms' | 'manual'
  allowed_kakao_user_ids?: string[]
  notes?: string
  auto_expire_after_first_use?: boolean
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const requestData: GenerateWithCredentialRequest = await request.json()

    // Validate input
    if (!requestData.role || !requestData.tier) {
      return NextResponse.json(
        { error: 'Role and tier are required' },
        { status: 400 }
      )
    }

    if (!requestData.credential_id && !requestData.credential) {
      return NextResponse.json(
        { error: 'Either credential_id or credential data must be provided' },
        { status: 400 }
      )
    }

    // Step 1: Get or create credential
    let credentialId: string
    let credentialData: any

    if (requestData.credential_id) {
      // Use existing credential
      const { data: existingCred, error: credError } =
        await CredentialService.getCredentialById(requestData.credential_id)

      if (credError || !existingCred) {
        return NextResponse.json(
          { error: 'Credential not found' },
          { status: 404 }
        )
      }

      credentialId = existingCred.id
      credentialData = existingCred
    } else {
      // Create new credential
      const { data: newCred, error: createError } =
        await CredentialService.createCredential({
          ...requestData.credential!,
          created_by: user.id,
        })

      if (createError || !newCred) {
        return NextResponse.json(
          { error: `Failed to create credential: ${createError?.message}` },
          { status: 500 }
        )
      }

      credentialId = newCred.id
      credentialData = newCred
    }

    // Step 2: Generate verification code
    const code = generateCode()

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (requestData.expiresInDays || 30))

    // Step 3: Create code record with credential linkage
    const codeRecord = {
      code,
      code_type: requestData.code_type || 'credential_based',
      expires_at: expiresAt.toISOString(),
      max_uses: requestData.maxUses || 1,
      current_uses: 0,
      is_used: false,
      status: 'active',

      // Link to credential
      intended_recipient_id: credentialId,
      intended_recipient_name: credentialData.full_name,
      intended_recipient_email: credentialData.email,
      intended_recipient_employee_id: credentialData.employee_id,

      // Credential verification settings
      requires_credential_match: requestData.requires_credential_match || false,
      credential_match_fields: requestData.credential_match_fields || [],

      // Distribution settings
      distribution_method: requestData.distribution_method || 'manual',
      distribution_status: 'pending',
      allowed_kakao_user_ids: requestData.allowed_kakao_user_ids || null,
      notes: requestData.notes || null,
      auto_expire_after_first_use:
        requestData.auto_expire_after_first_use || false,

      // Metadata
      metadata: {
        role: requestData.role,
        subscription_tier: requestData.tier,
        department: credentialData.department,
        position: credentialData.position,
      },
      source: 'admin_dashboard_credential_based',
    }

    const { data: insertedCode, error: insertError } = await supabase
      .from('verification_codes')
      .insert(codeRecord)
      .select()
      .single()

    if (insertError) {
      console.error('[Generate Code with Credential] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: insertedCode.code,
      credential_id: credentialId,
      credential: {
        full_name: credentialData.full_name,
        email: credentialData.email,
        employee_id: credentialData.employee_id,
        department: credentialData.department,
      },
      expires_at: insertedCode.expires_at,
      requires_credential_match: insertedCode.requires_credential_match,
    })
  } catch (error) {
    console.error('[Generate Code with Credential] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
