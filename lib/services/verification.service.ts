/**
 * Verification Service with Credential Matching
 *
 * Handles user verification with optional credential matching.
 * Supports two-stage verification: code validation + credential matching.
 *
 * Database: kuixphvkbuuzfezoeyii
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type VerificationCode = Database['public']['Tables']['verification_codes']['Row']
type UserCredential = Database['public']['Tables']['user_credentials']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type VerificationLog = Database['public']['Tables']['credential_verification_log']['Insert']

export interface VerificationInput {
  code: string
  kakao_user_id: string
  kakao_nickname?: string

  // Optional credential data for matching
  provided_email?: string
  provided_employee_id?: string
  provided_name?: string
  provided_phone?: string

  // Context
  ip_address?: string
  user_agent?: string
}

export interface VerificationResult {
  success: boolean
  profile?: Profile
  error?: string
  match_status?: 'matched' | 'partial_match' | 'no_match' | 'no_credential_required'
  match_score?: number
  requires_additional_info?: boolean
  missing_fields?: string[]
}

export class VerificationService {
  /**
   * Verify user with code and optional credential matching
   */
  static async verifyUser(
    input: VerificationInput
  ): Promise<VerificationResult> {
    const supabase = await createClient()

    try {
      // Step 1: Validate verification code
      const { data: code, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code', input.code)
        .eq('status', 'active')
        .single()

      if (codeError || !code) {
        await this.logVerificationAttempt(supabase, {
          verification_code: input.code,
          kakao_user_id: input.kakao_user_id,
          verification_result: 'failed',
          rejection_reason: 'Invalid or inactive code',
          ip_address: input.ip_address,
          user_agent: input.user_agent,
        })

        return {
          success: false,
          error: 'Invalid or inactive verification code',
        }
      }

      // Check expiration
      if (new Date(code.expires_at) < new Date()) {
        await this.logVerificationAttempt(supabase, {
          verification_code: input.code,
          kakao_user_id: input.kakao_user_id,
          verification_result: 'failed',
          rejection_reason: 'Code expired',
          ip_address: input.ip_address,
          user_agent: input.user_agent,
        })

        return {
          success: false,
          error: 'Verification code has expired',
        }
      }

      // Check max uses
      if (code.max_uses && code.current_uses >= code.max_uses) {
        await this.logVerificationAttempt(supabase, {
          verification_code: input.code,
          kakao_user_id: input.kakao_user_id,
          verification_result: 'failed',
          rejection_reason: 'Code max uses exceeded',
          ip_address: input.ip_address,
          user_agent: input.user_agent,
        })

        return {
          success: false,
          error: 'Verification code has reached maximum uses',
        }
      }

      // Step 2: Check if credential matching is required
      if (code.requires_credential_match && code.intended_recipient_id) {
        const credentialResult = await this.matchCredentials(
          supabase,
          code.intended_recipient_id,
          input,
          code.credential_match_fields || []
        )

        if (!credentialResult.success) {
          await this.logVerificationAttempt(supabase, {
            verification_code: input.code,
            kakao_user_id: input.kakao_user_id,
            provided_email: input.provided_email,
            provided_employee_id: input.provided_employee_id,
            provided_name: input.provided_name,
            provided_phone: input.provided_phone,
            intended_credential_id: code.intended_recipient_id,
            match_status: credentialResult.match_status,
            match_score: credentialResult.match_score,
            match_details: credentialResult.match_details,
            verification_result: 'rejected',
            rejection_reason: credentialResult.error || 'Credential mismatch',
            ip_address: input.ip_address,
            user_agent: input.user_agent,
          })

          return {
            success: false,
            error: credentialResult.error,
            match_status: credentialResult.match_status,
            match_score: credentialResult.match_score,
            requires_additional_info: credentialResult.requires_additional_info,
            missing_fields: credentialResult.missing_fields,
          }
        }
      }

      // Step 3: Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('kakao_user_id', input.kakao_user_id)
        .single()

      if (existingProfile) {
        await this.logVerificationAttempt(supabase, {
          verification_code: input.code,
          kakao_user_id: input.kakao_user_id,
          verification_result: 'failed',
          rejection_reason: 'Profile already exists',
          profile_created: existingProfile.id,
          ip_address: input.ip_address,
          user_agent: input.user_agent,
        })

        return {
          success: false,
          error: 'Profile already exists for this KakaoTalk user',
        }
      }

      // Step 4: Create profile
      const metadata = code.metadata as any
      const role = metadata?.role || 'user'
      const tier = metadata?.subscription_tier || 'free'

      const profileData = {
        kakao_user_id: input.kakao_user_id,
        kakao_nickname: input.kakao_nickname || input.kakao_user_id,
        role,
        subscription_tier: tier,
        department: metadata?.department,
        credential_id: code.intended_recipient_id || null,
        credential_verified: code.requires_credential_match || false,
        credential_verified_at: code.requires_credential_match
          ? new Date().toISOString()
          : null,
        verified_with_code: code.code,
        metadata: {
          verification_code: code.code,
          verified_at: new Date().toISOString(),
          code_type: code.code_type,
        },
      }

      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (profileError || !newProfile) {
        await this.logVerificationAttempt(supabase, {
          verification_code: input.code,
          kakao_user_id: input.kakao_user_id,
          intended_credential_id: code.intended_recipient_id,
          verification_result: 'failed',
          rejection_reason: `Profile creation failed: ${profileError?.message}`,
          ip_address: input.ip_address,
          user_agent: input.user_agent,
        })

        return {
          success: false,
          error: 'Failed to create profile',
        }
      }

      // Step 5: Update verification code
      await supabase
        .from('verification_codes')
        .update({
          current_uses: code.current_uses + 1,
          is_used: true,
          status: code.auto_expire_after_first_use ? 'used' : 'active',
        })
        .eq('id', code.id)

      // Step 6: Update credential status if linked
      if (code.intended_recipient_id) {
        await supabase
          .from('user_credentials')
          .update({
            status: 'verified',
            verified_at: new Date().toISOString(),
          })
          .eq('id', code.intended_recipient_id)
      }

      // Step 7: Log successful verification
      await this.logVerificationAttempt(supabase, {
        verification_code: input.code,
        kakao_user_id: input.kakao_user_id,
        provided_email: input.provided_email,
        provided_employee_id: input.provided_employee_id,
        provided_name: input.provided_name,
        provided_phone: input.provided_phone,
        intended_credential_id: code.intended_recipient_id,
        match_status: code.requires_credential_match
          ? 'matched'
          : 'no_credential_required',
        match_score: code.requires_credential_match ? 1.0 : undefined,
        verification_result: 'success',
        profile_created: newProfile.id,
        ip_address: input.ip_address,
        user_agent: input.user_agent,
      })

      return {
        success: true,
        profile: newProfile,
        match_status: code.requires_credential_match
          ? 'matched'
          : 'no_credential_required',
      }
    } catch (error) {
      console.error('[Verification Service] Error:', error)
      return {
        success: false,
        error: 'Internal verification error',
      }
    }
  }

  /**
   * Match provided credentials against intended recipient
   */
  private static async matchCredentials(
    supabase: any,
    credentialId: string,
    input: VerificationInput,
    matchFields: any[]
  ): Promise<{
    success: boolean
    error?: string
    match_status?: 'matched' | 'partial_match' | 'no_match'
    match_score?: number
    match_details?: any
    requires_additional_info?: boolean
    missing_fields?: string[]
  }> {
    try {
      // Get intended credential
      const { data: credential, error } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('id', credentialId)
        .single()

      if (error || !credential) {
        return {
          success: false,
          error: 'Intended recipient credential not found',
          match_status: 'no_match',
        }
      }

      // Parse match fields
      const fieldsToMatch =
        Array.isArray(matchFields) && matchFields.length > 0
          ? matchFields
          : ['email', 'employee_id']

      // Check if user provided required fields
      const missingFields: string[] = []
      for (const field of fieldsToMatch) {
        const providedValue =
          field === 'email'
            ? input.provided_email
            : field === 'employee_id'
            ? input.provided_employee_id
            : field === 'name'
            ? input.provided_name
            : field === 'phone'
            ? input.provided_phone
            : null

        if (!providedValue) {
          missingFields.push(field)
        }
      }

      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Please provide: ${missingFields.join(', ')}`,
          match_status: 'no_match',
          requires_additional_info: true,
          missing_fields: missingFields,
        }
      }

      // Perform matching
      let matchedFields = 0
      const matchDetails: any = {}

      for (const field of fieldsToMatch) {
        const credentialValue =
          field === 'email'
            ? credential.email
            : field === 'employee_id'
            ? credential.employee_id
            : field === 'name'
            ? credential.full_name
            : field === 'phone'
            ? credential.phone_number
            : null

        const providedValue =
          field === 'email'
            ? input.provided_email
            : field === 'employee_id'
            ? input.provided_employee_id
            : field === 'name'
            ? input.provided_name
            : field === 'phone'
            ? input.provided_phone
            : null

        if (!credentialValue) {
          matchDetails[field] = 'not_set_in_credential'
          continue
        }

        // Normalize and compare
        const normalizedCredential = credentialValue.toLowerCase().trim()
        const normalizedProvided = providedValue?.toLowerCase().trim()

        if (normalizedCredential === normalizedProvided) {
          matchedFields++
          matchDetails[field] = 'matched'
        } else {
          matchDetails[field] = 'mismatch'
        }
      }

      const matchScore = matchedFields / fieldsToMatch.length
      const matchStatus: 'matched' | 'partial_match' | 'no_match' =
        matchScore === 1
          ? 'matched'
          : matchScore > 0.5
          ? 'partial_match'
          : 'no_match'

      if (matchStatus === 'matched') {
        return {
          success: true,
          match_status: matchStatus,
          match_score: matchScore,
          match_details: matchDetails,
        }
      } else {
        return {
          success: false,
          error: `Credential mismatch. Matched ${matchedFields} of ${fieldsToMatch.length} required fields.`,
          match_status: matchStatus,
          match_score: matchScore,
          match_details: matchDetails,
        }
      }
    } catch (error) {
      console.error('[Match Credentials] Error:', error)
      return {
        success: false,
        error: 'Credential matching failed',
        match_status: 'no_match',
      }
    }
  }

  /**
   * Log verification attempt
   */
  private static async logVerificationAttempt(
    supabase: any,
    log: VerificationLog
  ): Promise<void> {
    try {
      await supabase.from('credential_verification_log').insert(log)
    } catch (error) {
      console.error('[Log Verification] Error:', error)
    }
  }

  /**
   * Get verification logs for a user
   */
  static async getVerificationLogs(
    kakaoUserId: string
  ): Promise<{
    data: any[] | null
    error: Error | null
  }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('credential_verification_log')
        .select('*')
        .eq('kakao_user_id', kakaoUserId)
        .order('timestamp', { ascending: false })

      if (error) {
        throw new Error(`Failed to get verification logs: ${error.message}`)
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Get verification statistics
   */
  static async getVerificationStats(): Promise<{
    data: {
      total_attempts: number
      successful: number
      failed: number
      rejected: number
      success_rate: number
      match_stats: {
        matched: number
        partial_match: number
        no_match: number
        no_credential_required: number
      }
    } | null
    error: Error | null
  }> {
    try {
      const supabase = await createClient()

      const { data: logs, error } = await supabase
        .from('credential_verification_log')
        .select('verification_result, match_status')

      if (error) {
        throw new Error(`Failed to get verification stats: ${error.message}`)
      }

      if (!logs) {
        return {
          data: {
            total_attempts: 0,
            successful: 0,
            failed: 0,
            rejected: 0,
            success_rate: 0,
            match_stats: {
              matched: 0,
              partial_match: 0,
              no_match: 0,
              no_credential_required: 0,
            },
          },
          error: null,
        }
      }

      const stats = {
        total_attempts: logs.length,
        successful: logs.filter((l) => l.verification_result === 'success')
          .length,
        failed: logs.filter((l) => l.verification_result === 'failed').length,
        rejected: logs.filter((l) => l.verification_result === 'rejected')
          .length,
        success_rate:
          logs.length > 0
            ? logs.filter((l) => l.verification_result === 'success').length /
              logs.length
            : 0,
        match_stats: {
          matched: logs.filter((l) => l.match_status === 'matched').length,
          partial_match: logs.filter((l) => l.match_status === 'partial_match')
            .length,
          no_match: logs.filter((l) => l.match_status === 'no_match').length,
          no_credential_required: logs.filter(
            (l) => l.match_status === 'no_credential_required'
          ).length,
        },
      }

      return { data: stats, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }
}
