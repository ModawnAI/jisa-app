/**
 * User Verification API with Credential Matching
 *
 * Verifies users with verification codes and optional credential matching.
 * Used by KakaoTalk webhook and other verification flows.
 *
 * Database: kuixphvkbuuzfezoeyii
 */

import { NextRequest, NextResponse } from 'next/server'
import { VerificationService } from '@/lib/services/verification.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      code,
      kakao_user_id,
      kakao_nickname,
      provided_email,
      provided_employee_id,
      provided_name,
      provided_phone,
    } = body

    // Validate required fields
    if (!code || !kakao_user_id) {
      return NextResponse.json(
        { error: 'Code and kakao_user_id are required' },
        { status: 400 }
      )
    }

    // Extract IP and user agent from request
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       undefined
    const user_agent = request.headers.get('user-agent') || undefined

    // Verify user
    const result = await VerificationService.verifyUser({
      code,
      kakao_user_id,
      kakao_nickname,
      provided_email,
      provided_employee_id,
      provided_name,
      provided_phone,
      ip_address,
      user_agent,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          match_status: result.match_status,
          match_score: result.match_score,
          requires_additional_info: result.requires_additional_info,
          missing_fields: result.missing_fields,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: result.profile?.id,
        role: result.profile?.role,
        subscription_tier: result.profile?.subscription_tier,
        department: result.profile?.department,
        credential_verified: result.profile?.credential_verified,
      },
      match_status: result.match_status,
      message: 'Verification successful',
    })
  } catch (error) {
    console.error('[Verify API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
