/**
 * Bulk Code Generation API with CSV Support
 *
 * Generates multiple verification codes from CSV data or JSON array.
 * Each code is linked to a specific user credential.
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

interface BulkCodeRequest {
  users: Array<{
    // User credential data
    full_name: string
    email?: string
    phone_number?: string
    employee_id?: string
    department?: string
    team?: string
    position?: string
    hire_date?: string
    location?: string

    // Code properties (can be per-user or default)
    role?: string
    tier?: string
    expiresInDays?: number
  }>

  // Default values for all codes
  defaults?: {
    role: string
    tier: string
    expiresInDays?: number
    code_type?: string
    requires_credential_match?: boolean
    credential_match_fields?: string[]
    distribution_method?: 'kakao' | 'email' | 'sms' | 'manual'
    auto_expire_after_first_use?: boolean
  }
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
    const requestData: BulkCodeRequest = await request.json()

    // Validate input
    if (!requestData.users || requestData.users.length === 0) {
      return NextResponse.json(
        { error: 'No users provided' },
        { status: 400 }
      )
    }

    if (requestData.users.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 users per batch' },
        { status: 400 }
      )
    }

    const defaults = requestData.defaults || { role: '', tier: '' }

    // Validate defaults
    if (!defaults.role || !defaults.tier) {
      return NextResponse.json(
        { error: 'Default role and tier are required' },
        { status: 400 }
      )
    }

    // Step 1: Create all credentials in bulk
    const credentialsToCreate = requestData.users.map((userData) => ({
      full_name: userData.full_name,
      email: userData.email,
      phone_number: userData.phone_number,
      employee_id: userData.employee_id,
      department: userData.department,
      team: userData.team,
      position: userData.position,
      hire_date: userData.hire_date,
      location: userData.location,
    }))

    const {
      data: createdCredentials,
      error: credError,
      errors: credErrors,
    } = await CredentialService.createCredentialsBulk({
      credentials: credentialsToCreate,
      created_by: user.id,
    })

    if (credError) {
      return NextResponse.json(
        { error: `Failed to create credentials: ${credError.message}` },
        { status: 500 }
      )
    }

    if (!createdCredentials || createdCredentials.length === 0) {
      return NextResponse.json(
        { error: 'No credentials were created' },
        { status: 500 }
      )
    }

    // Step 2: Generate codes for each credential
    const codes: string[] = []
    const codeRecords = []

    for (let i = 0; i < createdCredentials.length; i++) {
      const credential = createdCredentials[i]
      const userData = requestData.users[i]

      let code = generateCode()

      // Ensure uniqueness
      while (codes.includes(code)) {
        code = generateCode()
      }

      codes.push(code)

      // Calculate expiry date
      const expiresInDays =
        userData.expiresInDays || defaults.expiresInDays || 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      // Use per-user values or defaults
      const role = userData.role || defaults.role
      const tier = userData.tier || defaults.tier

      codeRecords.push({
        code,
        code_type: defaults.code_type || 'bulk_credential_based',
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        current_uses: 0,
        is_used: false,
        status: 'active',

        // Link to credential
        intended_recipient_id: credential.id,
        intended_recipient_name: credential.full_name,
        intended_recipient_email: credential.email,
        intended_recipient_employee_id: credential.employee_id,

        // Credential verification settings
        requires_credential_match: defaults.requires_credential_match || false,
        credential_match_fields: defaults.credential_match_fields || [],

        // Distribution settings
        distribution_method: defaults.distribution_method || 'manual',
        distribution_status: 'pending',
        auto_expire_after_first_use:
          defaults.auto_expire_after_first_use || false,

        // Metadata
        metadata: {
          role,
          subscription_tier: tier,
          department: credential.department,
          position: credential.position,
          bulk_import: true,
          import_batch_id: `bulk_${Date.now()}`,
        },
        source: 'admin_dashboard_bulk_import',
      })
    }

    // Step 3: Insert all codes
    const { data: insertedCodes, error: insertError } = await supabase
      .from('verification_codes')
      .insert(codeRecords)
      .select('code, intended_recipient_name, intended_recipient_email, expires_at')

    if (insertError) {
      console.error('[Bulk Generate Codes] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate codes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      total: insertedCodes?.length || 0,
      codes: insertedCodes,
      credential_errors: credErrors || [],
      summary: {
        credentials_created: createdCredentials.length,
        codes_generated: insertedCodes?.length || 0,
        failed: credErrors?.length || 0,
      },
    })
  } catch (error) {
    console.error('[Bulk Generate Codes] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
