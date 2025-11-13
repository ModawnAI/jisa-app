/**
 * Role-Based Access Control (RBAC) Service
 * Enforces hierarchical role and subscription tier based access control
 * Phase 5.2: RBAC in RAG Pipeline
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';

export interface RBACFilter {
  access_roles?: { $in: string[] };
  access_tiers?: { $in: string[] };
  required_clearance_level?: { $lte: number };
  allowed_departments?: { $in: string[] };
  allowed_regions?: { $in: string[] };
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  subscription_tier: string;
  department?: string;
  permissions?: any;
  metadata?: {
    clearance_level?: number;
    department?: string;
    region?: string;
    [key: string]: any;
  };
}

export class RBACService {
  /**
   * Role hierarchy: Higher roles inherit lower role permissions
   * CEO > Admin > Manager > Senior > Junior > User
   */
  private static readonly ROLE_HIERARCHY: Record<string, string[]> = {
    ceo: ['ceo', 'admin', 'manager', 'senior', 'junior', 'user'],
    admin: ['admin', 'manager', 'senior', 'junior', 'user'],
    manager: ['manager', 'senior', 'junior', 'user'],
    senior: ['senior', 'junior', 'user'],
    junior: ['junior', 'user'],
    user: ['user'],
  };

  /**
   * Subscription tier hierarchy: Higher tiers include lower tier content
   * Enterprise > Pro > Basic > Free
   */
  private static readonly TIER_HIERARCHY: Record<string, string[]> = {
    enterprise: ['enterprise', 'pro', 'basic', 'free'],
    pro: ['pro', 'basic', 'free'],
    basic: ['basic', 'free'],
    free: ['free'],
  };

  /**
   * Get role hierarchy for a given role
   */
  getRoleHierarchy(role: string): string[] {
    return RBACService.ROLE_HIERARCHY[role] || [role];
  }

  /**
   * Get tier hierarchy for a given subscription tier
   */
  getTierHierarchy(tier: string): string[] {
    return RBACService.TIER_HIERARCHY[tier] || [tier];
  }

  /**
   * Check if user has required role (considering hierarchy)
   */
  hasRole(userRole: string, requiredRole: string): boolean {
    const allowedRoles = this.getRoleHierarchy(userRole);
    return allowedRoles.includes(requiredRole);
  }

  /**
   * Check if user has required tier (considering hierarchy)
   */
  hasTier(userTier: string, requiredTier: string): boolean {
    const allowedTiers = this.getTierHierarchy(userTier);
    return allowedTiers.includes(requiredTier);
  }

  /**
   * Get user profile with metadata
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('[RBAC] Failed to get user profile:', error);
      return null;
    }

    return data as UserProfile;
  }

  /**
   * Build Pinecone filter for user based on role, tier, and metadata
   */
  async buildPineconeFilter(userId: string): Promise<RBACFilter> {
    const user = await this.getUserProfile(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const filter: RBACFilter = {};
    const userMetadata = (user.metadata as any) || {};

    // Role-based filtering
    // CEO and Admin can see everything, so no role filter
    if (user.role !== 'ceo' && user.role !== 'admin') {
      filter.access_roles = { $in: this.getRoleHierarchy(user.role) };
    }

    // Tier-based filtering
    // Everyone is filtered by tier (including admins)
    filter.access_tiers = { $in: this.getTierHierarchy(user.subscription_tier) };

    // Clearance level filtering
    if (userMetadata.clearance_level !== undefined) {
      filter.required_clearance_level = { $lte: userMetadata.clearance_level };
    }

    // Department filtering
    if (userMetadata.department) {
      filter.allowed_departments = { $in: [userMetadata.department, '*'] };
    }

    // Region filtering
    if (userMetadata.region) {
      filter.allowed_regions = { $in: [userMetadata.region, '*'] };
    }

    console.log(`[RBAC] Built filter for user ${user.email}:`, filter);

    return filter;
  }

  /**
   * Check if user can access specific content based on metadata
   */
  async canAccessContent(
    userId: string,
    contentMetadata: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.getUserProfile(userId);

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // CEO and Admin bypass most checks
    const isAdmin = ['ceo', 'admin'].includes(user.role);

    // Check required role
    if (contentMetadata.required_role && !isAdmin) {
      if (!this.hasRole(user.role, contentMetadata.required_role)) {
        return {
          allowed: false,
          reason: `Requires role: ${contentMetadata.required_role}, user has: ${user.role}`,
        };
      }
    }

    // Check required tier (applies to everyone including admins)
    if (contentMetadata.required_tier) {
      if (!this.hasTier(user.subscription_tier, contentMetadata.required_tier)) {
        return {
          allowed: false,
          reason: `Requires tier: ${contentMetadata.required_tier}, user has: ${user.subscription_tier}`,
        };
      }
    }

    const userMetadata = (user.metadata as any) || {};

    // Check clearance level
    if (contentMetadata.required_clearance_level !== undefined && !isAdmin) {
      const userClearance = userMetadata.clearance_level || 0;
      if (userClearance < contentMetadata.required_clearance_level) {
        return {
          allowed: false,
          reason: `Requires clearance level: ${contentMetadata.required_clearance_level}, user has: ${userClearance}`,
        };
      }
    }

    // Check department restrictions
    if (contentMetadata.allowed_departments && !isAdmin) {
      const allowedDepts = Array.isArray(contentMetadata.allowed_departments)
        ? contentMetadata.allowed_departments
        : [contentMetadata.allowed_departments];

      if (
        !allowedDepts.includes('*') &&
        !allowedDepts.includes(userMetadata.department)
      ) {
        return {
          allowed: false,
          reason: `Not in allowed departments: ${allowedDepts.join(', ')}`,
        };
      }
    }

    // Check region restrictions
    if (contentMetadata.allowed_regions && !isAdmin) {
      const allowedRegions = Array.isArray(contentMetadata.allowed_regions)
        ? contentMetadata.allowed_regions
        : [contentMetadata.allowed_regions];

      if (
        !allowedRegions.includes('*') &&
        !allowedRegions.includes(userMetadata.region)
      ) {
        return {
          allowed: false,
          reason: `Not in allowed regions: ${allowedRegions.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Filter contexts based on user access rights
   */
  async filterAccessibleContexts(
    userId: string,
    contexts: any[]
  ): Promise<any[]> {
    const accessibleContexts: any[] = [];

    for (const context of contexts) {
      const { allowed } = await this.canAccessContent(userId, {
        required_role: context.required_role,
        required_tier: context.required_tier,
        required_clearance_level: context.access_metadata?.required_clearance_level,
        allowed_departments: context.access_metadata?.allowed_departments,
        allowed_regions: context.access_metadata?.allowed_regions,
      });

      if (allowed) {
        accessibleContexts.push(context);
      }
    }

    return accessibleContexts;
  }

  /**
   * Get accessible documents for user
   */
  async getAccessibleDocuments(
    userId: string,
    options?: {
      accessLevel?: string;
      requiredRole?: string;
      requiredTier?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ documents: any[]; total: number }> {
    const user = await this.getUserProfile(userId);

    if (!user) {
      return { documents: [], total: 0 };
    }

    const supabase = await createClient();

    // Build query
    let query = supabase.from('documents').select('*', { count: 'exact' });

    const isAdmin = ['ceo', 'admin'].includes(user.role);

    // Filter by role (if not admin)
    if (!isAdmin) {
      const allowedRoles = this.getRoleHierarchy(user.role);
      query = query.or(
        `required_role.is.null,required_role.in.(${allowedRoles.join(',')})`
      );
    }

    // Filter by tier (applies to everyone)
    const allowedTiers = this.getTierHierarchy(user.subscription_tier);
    query = query.or(
      `required_tier.is.null,required_tier.in.(${allowedTiers.join(',')})`
    );

    // Apply additional filters if provided
    if (options?.accessLevel) {
      query = query.eq('access_level', options.accessLevel);
    }

    // Pagination
    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('[RBAC] Failed to get accessible documents:', error);
      return { documents: [], total: 0 };
    }

    // Apply metadata-based filtering (post-query filtering)
    const userMetadata = (user.metadata as any) || {};
    const filteredDocs = (data || []).filter((doc) => {
      const docMetadata = (doc.access_metadata as any) || {};

      // Check clearance level
      if (
        docMetadata.required_clearance_level !== undefined &&
        !isAdmin
      ) {
        if (
          (userMetadata.clearance_level || 0) <
          docMetadata.required_clearance_level
        ) {
          return false;
        }
      }

      // Check departments
      if (docMetadata.allowed_departments && !isAdmin) {
        if (
          !docMetadata.allowed_departments.includes('*') &&
          !docMetadata.allowed_departments.includes(userMetadata.department)
        ) {
          return false;
        }
      }

      // Check regions
      if (docMetadata.allowed_regions && !isAdmin) {
        if (
          !docMetadata.allowed_regions.includes('*') &&
          !docMetadata.allowed_regions.includes(userMetadata.region)
        ) {
          return false;
        }
      }

      return true;
    });

    return { documents: filteredDocs, total: count || 0 };
  }

  /**
   * Log access attempt (for audit trail)
   */
  async logAccessAttempt(params: {
    userId: string;
    resourceType: 'document' | 'context' | 'query';
    resourceId: string;
    accessGranted: boolean;
    denialReason?: string;
  }): Promise<void> {
    const supabase = createServiceClient();

    await supabase.from('analytics_events').insert({
      user_id: params.userId,
      event_type: 'access_attempt',
      event_data: {
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        access_granted: params.accessGranted,
        denial_reason: params.denialReason,
      },
    });
  }
}

// Export singleton instance
export const rbacService = new RBACService();
