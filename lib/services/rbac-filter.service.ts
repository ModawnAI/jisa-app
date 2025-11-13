/**
 * Enhanced RBAC Filter Service
 *
 * Multi-dimensional content classification and filtering.
 * Extends basic RBAC with sensitivity levels, content categories,
 * target audiences, time-based access, geographic restrictions, and compliance.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Multi-Dimensional Content Classification
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Document = Database['public']['Tables']['documents']['Row']
type Context = Database['public']['Tables']['contexts']['Row']

/**
 * User access context with all relevant attributes
 */
export interface UserAccessContext {
  // Basic identity
  id: string
  kakao_user_id?: string

  // Role and tier
  role: string
  subscription_tier: string

  // Organizational attributes
  department?: string
  team?: string
  position?: string
  location?: string

  // Verification status
  credential_verified: boolean
  credential_id?: string

  // Query context
  query_timestamp?: Date
  ip_address?: string
  geo_location?: string  // ISO country code (e.g., "KR", "US")
}

/**
 * Enhanced filter result
 */
export interface EnhancedFilterResult {
  allowed: boolean
  reason?: string
  match_score?: number  // 0.0-1.0 relevance score
  blocked_fields?: string[]  // Which fields caused blocking
}

/**
 * Sensitivity level hierarchy
 */
const SENSITIVITY_HIERARCHY: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3,
}

/**
 * Role hierarchy with numerical levels
 */
const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  junior: 1,
  senior: 2,
  manager: 3,
  admin: 4,
  ceo: 5,
}

/**
 * Subscription tier hierarchy
 */
const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
}

export class EnhancedRBACFilterService {
  /**
   * Build comprehensive filter for user based on all dimensions
   */
  static async buildEnhancedFilters(
    userId: string,
    queryContext?: {
      timestamp?: Date
      ip_address?: string
      geo_location?: string
    }
  ): Promise<UserAccessContext> {
    const supabase = await createClient()

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      throw new Error(`Failed to get user profile: ${error?.message}`)
    }

    // Get user credential if exists
    let credentialData = null
    if (profile.credential_id) {
      const { data: cred } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('id', profile.credential_id)
        .single()

      credentialData = cred
    }

    // Build access context
    const accessContext: UserAccessContext = {
      id: profile.id,
      kakao_user_id: profile.kakao_user_id || undefined,
      role: profile.role || 'user',
      subscription_tier: profile.subscription_tier || 'free',
      department: profile.department || credentialData?.department,
      team: credentialData?.team,
      position: credentialData?.position,
      location: credentialData?.location,
      credential_verified: profile.credential_verified || false,
      credential_id: profile.credential_id || undefined,
      query_timestamp: queryContext?.timestamp || new Date(),
      ip_address: queryContext?.ip_address,
      geo_location: queryContext?.geo_location,
    }

    return accessContext
  }

  /**
   * Check if user can access content with multi-dimensional filtering
   */
  static canAccessContent(
    user: UserAccessContext,
    content: Partial<Document> | Partial<Context>
  ): EnhancedFilterResult {
    const blockedFields: string[] = []
    let totalChecks = 0
    let passedChecks = 0

    // 1. Base role and tier check (REQUIRED)
    totalChecks += 2

    // Role check
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0
    const requiredRoleLevel = content.required_role
      ? ROLE_HIERARCHY[content.required_role] || 0
      : 0

    if (userRoleLevel < requiredRoleLevel) {
      blockedFields.push('required_role')
    } else {
      passedChecks++
    }

    // Tier check
    const userTierLevel = TIER_HIERARCHY[user.subscription_tier] || 0
    const requiredTierLevel = content.required_tier
      ? TIER_HIERARCHY[content.required_tier] || 0
      : 0

    if (userTierLevel < requiredTierLevel) {
      blockedFields.push('required_tier')
    } else {
      passedChecks++
    }

    // 2. Sensitivity level check (based on verification status)
    if (content.sensitivity_level) {
      totalChecks++

      const maxSensitivity = user.credential_verified ? 'confidential' : 'internal'
      const userSensitivityLevel = SENSITIVITY_HIERARCHY[maxSensitivity]
      const contentSensitivityLevel = SENSITIVITY_HIERARCHY[content.sensitivity_level]

      if (contentSensitivityLevel > userSensitivityLevel) {
        blockedFields.push('sensitivity_level')
      } else {
        passedChecks++
      }
    }

    // 3. Department targeting
    if (content.target_departments && Array.isArray(content.target_departments) && content.target_departments.length > 0) {
      totalChecks++

      if (user.department && content.target_departments.includes(user.department)) {
        passedChecks++
      } else {
        blockedFields.push('target_departments')
      }
    }

    // 4. Role targeting
    if (content.target_roles && Array.isArray(content.target_roles) && content.target_roles.length > 0) {
      totalChecks++

      if (content.target_roles.includes(user.role)) {
        passedChecks++
      } else {
        blockedFields.push('target_roles')
      }
    }

    // 5. Tier targeting
    if (content.target_tiers && Array.isArray(content.target_tiers) && content.target_tiers.length > 0) {
      totalChecks++

      if (content.target_tiers.includes(user.subscription_tier)) {
        passedChecks++
      } else {
        blockedFields.push('target_tiers')
      }
    }

    // 6. Position targeting
    if (content.target_positions && Array.isArray(content.target_positions) && content.target_positions.length > 0) {
      totalChecks++

      if (user.position && content.target_positions.includes(user.position)) {
        passedChecks++
      } else {
        blockedFields.push('target_positions')
      }
    }

    // 7. Time-based access
    const now = user.query_timestamp || new Date()

    if (content.available_from) {
      totalChecks++
      const availableFrom = new Date(content.available_from)

      if (now >= availableFrom) {
        passedChecks++
      } else {
        blockedFields.push('available_from')
      }
    }

    if (content.available_until) {
      totalChecks++
      const availableUntil = new Date(content.available_until)

      if (now <= availableUntil) {
        passedChecks++
      } else {
        blockedFields.push('available_until')
      }
    }

    // 8. Geographic restrictions
    if (content.geo_restrictions && Array.isArray(content.geo_restrictions) && content.geo_restrictions.length > 0) {
      totalChecks++

      if (user.geo_location && content.geo_restrictions.includes(user.geo_location)) {
        passedChecks++
      } else {
        blockedFields.push('geo_restrictions')
      }
    }

    // Calculate access decision
    const allowed = blockedFields.length === 0
    const matchScore = totalChecks > 0 ? passedChecks / totalChecks : 1.0

    if (!allowed) {
      return {
        allowed: false,
        reason: `Access denied: ${blockedFields.join(', ')}`,
        match_score: matchScore,
        blocked_fields: blockedFields,
      }
    }

    return {
      allowed: true,
      match_score: matchScore,
    }
  }

  /**
   * Build SQL WHERE clause for document/context queries
   * Returns Supabase query builder filters
   */
  static buildSupabaseFilters(
    user: UserAccessContext
  ): Record<string, any> {
    const filters: Record<string, any> = {}

    // Role filter (user must have >= required role level)
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0
    const allowedRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level <= userRoleLevel)
      .map(([role]) => role)

    filters.required_role_in = allowedRoles

    // Tier filter (user must have >= required tier level)
    const userTierLevel = TIER_HIERARCHY[user.subscription_tier] || 0
    const allowedTiers = Object.entries(TIER_HIERARCHY)
      .filter(([_, level]) => level <= userTierLevel)
      .map(([tier]) => tier)

    filters.required_tier_in = allowedTiers

    // Sensitivity level filter
    const maxSensitivity = user.credential_verified ? 'confidential' : 'internal'
    const maxSensitivityLevel = SENSITIVITY_HIERARCHY[maxSensitivity]
    const allowedSensitivities = Object.entries(SENSITIVITY_HIERARCHY)
      .filter(([_, level]) => level <= maxSensitivityLevel)
      .map(([sensitivity]) => sensitivity)

    filters.sensitivity_level_in = allowedSensitivities

    // Time-based filters
    const now = user.query_timestamp || new Date()
    filters.available_from_lte = now.toISOString()
    filters.available_until_gte = now.toISOString()

    // Department filter (if user has department)
    if (user.department) {
      filters.target_departments_contains = user.department
    }

    // Position filter (if user has position)
    if (user.position) {
      filters.target_positions_contains = user.position
    }

    // Geographic filter (if user has location)
    if (user.geo_location) {
      filters.geo_restrictions_contains = user.geo_location
    }

    return filters
  }

  /**
   * Filter array of documents/contexts by access rules
   */
  static filterAccessibleContent<T extends Partial<Document> | Partial<Context>>(
    user: UserAccessContext,
    content: T[]
  ): { accessible: T[]; denied: T[]; results: Map<string, EnhancedFilterResult> } {
    const accessible: T[] = []
    const denied: T[] = []
    const results = new Map<string, EnhancedFilterResult>()

    for (const item of content) {
      const result = this.canAccessContent(user, item)
      const itemId = (item as any).id || `${Date.now()}-${Math.random()}`

      results.set(itemId, result)

      if (result.allowed) {
        accessible.push(item)
      } else {
        denied.push(item)
      }
    }

    return { accessible, denied, results }
  }

  /**
   * Get accessible documents for user with enhanced filtering
   */
  static async getAccessibleDocuments(
    userId: string,
    options?: {
      content_category?: string[]
      sensitivity_level?: string
      limit?: number
      offset?: number
      order_by?: 'created_at' | 'updated_at' | 'title'
      order_direction?: 'asc' | 'desc'
    }
  ): Promise<{ documents: Document[]; total: number; filtered_count: number }> {
    const supabase = await createClient()

    // Build user access context
    const user = await this.buildEnhancedFilters(userId)

    // Build base query
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })

    // Apply role filter (OR with null for public content)
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0
    const allowedRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level <= userRoleLevel)
      .map(([role]) => role)

    query = query.or(`required_role.is.null,required_role.in.(${allowedRoles.join(',')})`)

    // Apply tier filter
    const userTierLevel = TIER_HIERARCHY[user.subscription_tier] || 0
    const allowedTiers = Object.entries(TIER_HIERARCHY)
      .filter(([_, level]) => level <= userTierLevel)
      .map(([tier]) => tier)

    query = query.or(`required_tier.is.null,required_tier.in.(${allowedTiers.join(',')})`)

    // Apply sensitivity filter
    const maxSensitivity = user.credential_verified ? 'confidential' : 'internal'
    const maxSensitivityLevel = SENSITIVITY_HIERARCHY[maxSensitivity]
    const allowedSensitivities = Object.entries(SENSITIVITY_HIERARCHY)
      .filter(([_, level]) => level <= maxSensitivityLevel)
      .map(([sensitivity]) => sensitivity)

    query = query.or(`sensitivity_level.is.null,sensitivity_level.in.(${allowedSensitivities.join(',')})`)

    // Apply time-based filters
    const now = new Date().toISOString()
    query = query.or(`available_from.is.null,available_from.lte.${now}`)
    query = query.or(`available_until.is.null,available_until.gte.${now}`)

    // Apply optional filters
    if (options?.content_category && options.content_category.length > 0) {
      // Note: Array contains in PostgreSQL - will match if any category matches
      query = query.overlaps('content_category', options.content_category)
    }

    if (options?.sensitivity_level) {
      query = query.eq('sensitivity_level', options.sensitivity_level)
    }

    // Apply ordering
    const orderBy = options?.order_by || 'created_at'
    const orderDirection = options?.order_direction || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply pagination
    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Enhanced RBAC] Failed to get documents:', error)
      throw new Error(`Failed to get documents: ${error.message}`)
    }

    // Apply post-query filtering for complex rules
    const filteredResults = this.filterAccessibleContent(user, data || [])

    return {
      documents: filteredResults.accessible,
      total: count || 0,
      filtered_count: filteredResults.accessible.length,
    }
  }

  /**
   * Get accessible contexts for user with enhanced filtering
   */
  static async getAccessibleContexts(
    userId: string,
    options?: {
      content_category?: string[]
      sensitivity_level?: string
      document_id?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ contexts: Context[]; total: number; filtered_count: number }> {
    const supabase = await createClient()

    // Build user access context
    const user = await this.buildEnhancedFilters(userId)

    // Build base query
    let query = supabase
      .from('contexts')
      .select('*', { count: 'exact' })

    // Apply document filter if provided
    if (options?.document_id) {
      query = query.eq('document_id', options.document_id)
    }

    // Apply role filter
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0
    const allowedRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level <= userRoleLevel)
      .map(([role]) => role)

    query = query.or(`required_role.is.null,required_role.in.(${allowedRoles.join(',')})`)

    // Apply tier filter
    const userTierLevel = TIER_HIERARCHY[user.subscription_tier] || 0
    const allowedTiers = Object.entries(TIER_HIERARCHY)
      .filter(([_, level]) => level <= userTierLevel)
      .map(([tier]) => tier)

    query = query.or(`required_tier.is.null,required_tier.in.(${allowedTiers.join(',')})`)

    // Apply sensitivity filter
    const maxSensitivity = user.credential_verified ? 'confidential' : 'internal'
    const maxSensitivityLevel = SENSITIVITY_HIERARCHY[maxSensitivity]
    const allowedSensitivities = Object.entries(SENSITIVITY_HIERARCHY)
      .filter(([_, level]) => level <= maxSensitivityLevel)
      .map(([sensitivity]) => sensitivity)

    query = query.or(`sensitivity_level.is.null,sensitivity_level.in.(${allowedSensitivities.join(',')})`)

    // Apply time-based filters
    const now = new Date().toISOString()
    query = query.or(`available_from.is.null,available_from.lte.${now}`)
    query = query.or(`available_until.is.null,available_until.gte.${now}`)

    // Apply optional filters
    if (options?.content_category && options.content_category.length > 0) {
      query = query.overlaps('content_category', options.content_category)
    }

    if (options?.sensitivity_level) {
      query = query.eq('sensitivity_level', options.sensitivity_level)
    }

    // Apply pagination
    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('[Enhanced RBAC] Failed to get contexts:', error)
      throw new Error(`Failed to get contexts: ${error.message}`)
    }

    // Apply post-query filtering
    const filteredResults = this.filterAccessibleContent(user, data || [])

    return {
      contexts: filteredResults.accessible,
      total: count || 0,
      filtered_count: filteredResults.accessible.length,
    }
  }

  /**
   * Log access attempt for audit trail
   */
  static async logAccessAttempt(params: {
    user_id: string
    resource_type: 'document' | 'context'
    resource_id: string
    access_granted: boolean
    denial_reason?: string
    blocked_fields?: string[]
  }): Promise<void> {
    const supabase = await createClient()

    await supabase.from('analytics_events').insert({
      user_id: params.user_id,
      event_type: 'content_access_attempt',
      event_data: {
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        access_granted: params.access_granted,
        denial_reason: params.denial_reason,
        blocked_fields: params.blocked_fields,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
