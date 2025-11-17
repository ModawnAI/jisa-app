/**
 * User Detail API
 *
 * Comprehensive user information including profile, credential, and access summary.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ROLE_HIERARCHY = ['user', 'junior', 'senior', 'manager', 'admin', 'ceo']
const TIER_HIERARCHY = ['free', 'basic', 'pro', 'enterprise']

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
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
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service client to bypass RLS and access all user data
    const serviceClient = createServiceClient()

    // Get user profile
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user credential (if exists)
    const { data: credential } = await serviceClient
      .from('user_credentials')
      .select('*')
      .eq('user_id', params.id)
      .eq('status', 'verified')
      .single()

    // Get verification code (if used by this user)
    let verificationCode = null

    // Check if credential has a verification code ID
    if (credential?.verification_code_id) {
      const { data: code } = await serviceClient
        .from('verification_codes')
        .select('*')
        .eq('id', credential.verification_code_id)
        .single()

      verificationCode = code
    }

    // Also check if profile has a verification code (for KakaoTalk users)
    if (!verificationCode && profile.verified_with_code) {
      const { data: code } = await serviceClient
        .from('verification_codes')
        .select('*')
        .eq('code', profile.verified_with_code)
        .single()

      verificationCode = code
    }

    // Calculate access summary
    const roleLevel = ROLE_HIERARCHY.indexOf(profile.role || 'user')
    const tierLevel = TIER_HIERARCHY.indexOf(profile.tier || 'free')
    const credentialVerified = credential?.status === 'verified'
    const credentialBoost = credentialVerified ? 0.2 : 0.0

    // Calculate effective access level
    const baseScore = (roleLevel + 1 + tierLevel + 1) / (ROLE_HIERARCHY.length + TIER_HIERARCHY.length)
    const effectiveScore = Math.min(baseScore * (1 + credentialBoost), 1.0)

    let effectiveAccessLevel = 'Basic'
    if (effectiveScore >= 0.8) effectiveAccessLevel = 'Elite'
    else if (effectiveScore >= 0.6) effectiveAccessLevel = 'Advanced'
    else if (effectiveScore >= 0.4) effectiveAccessLevel = 'Intermediate'

    const accessSummary = {
      role_level: roleLevel,
      tier_level: tierLevel,
      credential_verified: credentialVerified,
      credential_boost: credentialBoost,
      effective_access_level: effectiveAccessLevel,
    }

    return NextResponse.json({
      success: true,
      data: {
        profile,
        credential: credential || undefined,
        verification_code: verificationCode || undefined,
        access_summary: accessSummary,
      },
    })
  } catch (error) {
    console.error('[User Detail API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
