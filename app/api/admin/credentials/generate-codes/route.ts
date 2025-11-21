/**
 * Batch Code Generation API for Credentials
 *
 * Generates verification codes for multiple credentials at once.
 * Each code is linked to a specific credential.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 2: Auto-Code Generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generate random code in format: XXX-XXX-XXX-XXX
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar chars
  let code = ''

  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-'
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }

  return code
}

interface GenerateCodesRequest {
  credentialIds?: string[] // Specific credentials to generate codes for
  status?: 'pending' | 'all' // Generate for all pending or all credentials
  tier?: string // Default tier if not in metadata
  role?: string // Default role if not in metadata
  expiresInDays?: number // Code expiration (default 365)
  maxUses?: number // Max uses per code (default 1)
}

export async function POST(request: NextRequest) {
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

    // 3. Parse request body
    const body: GenerateCodesRequest = await request.json()
    const {
      credentialIds,
      status = 'pending',
      tier: defaultTier = 'free',
      role: defaultRole = 'user',
      expiresInDays = 365,
      maxUses = 1,
    } = body

    // 4. Fetch credentials to generate codes for
    let query = supabase
      .from('user_credentials')
      .select('id, full_name, email, employee_id, metadata')

    if (credentialIds && credentialIds.length > 0) {
      // Generate for specific credentials
      query = query.in('id', credentialIds)
    } else if (status === 'pending') {
      // Generate for all pending credentials without codes
      query = query.eq('status', 'pending')
    }

    const { data: credentials, error: fetchError } = await query

    if (fetchError) {
      console.error('[Generate Codes] Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      )
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json(
        { error: 'No credentials found matching criteria' },
        { status: 404 }
      )
    }

    // 5. Check which credentials already have codes
    const { data: existingCodes } = await supabase
      .from('verification_codes')
      .select('intended_recipient_id')
      .in('intended_recipient_id', credentials.map(c => c.id))
      .not('intended_recipient_id', 'is', null)

    const credentialsWithCodes = new Set(
      existingCodes?.map(c => c.intended_recipient_id) || []
    )

    const credentialsNeedingCodes = credentials.filter(
      c => !credentialsWithCodes.has(c.id)
    )

    if (credentialsNeedingCodes.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'All selected credentials already have codes',
          summary: {
            totalCredentials: credentials.length,
            alreadyHadCodes: credentials.length,
            newCodesGenerated: 0,
          },
        }
      )
    }

    // 6. Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // 7. Generate codes for each credential
    const codes: string[] = []
    const codeRecords = []
    const results = []

    for (const credential of credentialsNeedingCodes) {
      let code = generateCode()

      // Ensure uniqueness
      while (codes.includes(code)) {
        code = generateCode()
      }

      codes.push(code)

      // Get tier and role from metadata or use defaults
      const credentialTier = credential.metadata?.tier || defaultTier
      const credentialRole = credential.metadata?.role || defaultRole

      // Construct Pinecone namespace if employee_id exists
      const employeeSabon = credential.employee_id || null;
      const pineconeNamespace = employeeSabon ? `employee_${employeeSabon}` : null;

      const codeRecord = {
        code,
        code_type: 'registration',
        tier: credentialTier,
        role: credentialRole,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        current_uses: 0,
        is_used: false,
        is_active: true,
        status: 'active',
        intended_recipient_name: credential.full_name,
        intended_recipient_email: credential.email || null,
        intended_recipient_id: credential.id,
        requires_credential_match: true,
        employee_sabon: employeeSabon,
        pinecone_namespace: pineconeNamespace,
        metadata: {
          source: 'batch_generation',
          generated_at: new Date().toISOString(),
          employee_id: credential.employee_id,
          generated_by: profile.role,
          rag_enabled: !!pineconeNamespace,
        },
      }

      codeRecords.push(codeRecord)

      results.push({
        credentialId: credential.id,
        fullName: credential.full_name,
        employeeId: credential.employee_id,
        email: credential.email,
        code: code,
        tier: credentialTier,
        role: credentialRole,
      })
    }

    // 8. Insert codes into database
    const { data: insertedCodes, error: insertError } = await supabase
      .from('verification_codes')
      .insert(codeRecords)
      .select('code, intended_recipient_id, tier, role')

    if (insertError) {
      console.error('[Generate Codes] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate codes', details: insertError.message },
        { status: 500 }
      )
    }

    // 9. Return success with detailed results
    return NextResponse.json({
      success: true,
      message: `Successfully generated ${insertedCodes.length} verification codes`,
      summary: {
        totalCredentials: credentials.length,
        alreadyHadCodes: credentialsWithCodes.size,
        newCodesGenerated: insertedCodes.length,
      },
      codes: results,
    })

  } catch (error: any) {
    console.error('[Generate Codes] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
