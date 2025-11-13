/**
 * RBAC Analytics Service
 * Handles access control effectiveness and policy utilization analysis
 */

import { createServiceClient } from '@/lib/supabase/server';
import type {
  RBACMetrics,
  AccessPattern,
  PolicyUsage,
  Role,
  Tier,
  AccessLevel,
  RBACEffectivenessRow,
} from './types';

export class RBACAnalyticsService {
  /**
   * Get comprehensive RBAC metrics
   */
  async getRBACMetrics(daysAgo: number = 7): Promise<RBACMetrics> {
    const supabase = createServiceClient();

    try {
      // Parallel queries for efficiency
      const [
        policyStats,
        accessByLevel,
        accessByRole,
        accessByTier,
        dailyTrends,
        policyUtilization,
      ] = await Promise.all([
        this.getPolicyStats(daysAgo),
        this.getAccessByLevel(daysAgo),
        this.getAccessByRole(daysAgo),
        this.getAccessByTier(daysAgo),
        this.getDailyAllowanceRate(daysAgo),
        this.getPolicyUtilization(daysAgo),
      ]);

      return {
        // Policy Effectiveness
        totalAccessChecks: policyStats.totalChecks,
        allowedAccess: policyStats.allowed,
        deniedAccess: policyStats.denied,
        allowanceRate: policyStats.allowanceRate,

        // By Access Level
        accessByLevel: accessByLevel.access,
        denialsByLevel: accessByLevel.denials,

        // Role Distribution
        contentAccessByRole: accessByRole,
        contentAccessByTier: accessByTier,

        // Policy Impact
        policyUtilization,
        unusedPolicies: [], // Can be enhanced with actual policy tracking
        overpermissivePolicies: [], // Can be enhanced with policy analysis

        // Trends
        dailyAllowanceRate: dailyTrends,
      };
    } catch (error) {
      console.error('Error fetching RBAC metrics:', error);
      throw new Error('Failed to fetch RBAC metrics');
    }
  }

  /**
   * Get overall policy statistics
   */
  private async getPolicyStats(daysAgo: number) {
    const supabase = createServiceClient();

    // Use rbac_effectiveness_by_access view
    const { data, error } = await supabase
      .from('rbac_effectiveness_by_access')
      .select('*');

    if (error) {
      console.error('Error fetching policy stats:', error);
      return {
        totalChecks: 0,
        allowed: 0,
        denied: 0,
        allowanceRate: 0,
      };
    }

    const totals = data?.reduce(
      (acc, row) => ({
        totalChecks: acc.totalChecks + (row.total_checks || 0),
        allowed: acc.allowed + (row.allowed || 0),
        denied: acc.denied + (row.denied || 0),
      }),
      { totalChecks: 0, allowed: 0, denied: 0 }
    ) || { totalChecks: 0, allowed: 0, denied: 0 };

    const allowanceRate = totals.totalChecks > 0
      ? (totals.allowed / totals.totalChecks) * 100
      : 0;

    return {
      ...totals,
      allowanceRate: Math.round(allowanceRate * 100) / 100,
    };
  }

  /**
   * Get access statistics by access level
   */
  private async getAccessByLevel(daysAgo: number) {
    const supabase = createServiceClient();

    // Use content_access_by_level view
    const { data, error } = await supabase
      .from('content_access_by_level')
      .select('*');

    if (error) {
      console.error('Error fetching access by level:', error);
      return {
        access: {} as Record<AccessLevel, number>,
        denials: {} as Record<AccessLevel, number>,
      };
    }

    const access: Record<AccessLevel, number> = {
      L1_PUBLIC: 0,
      L2_BASIC: 0,
      L3_INTERNAL: 0,
      L4_SENSITIVE: 0,
      L5_CONFIDENTIAL: 0,
      L6_RESTRICTED: 0,
    };

    const denials: Record<AccessLevel, number> = {
      L1_PUBLIC: 0,
      L2_BASIC: 0,
      L3_INTERNAL: 0,
      L4_SENSITIVE: 0,
      L5_CONFIDENTIAL: 0,
      L6_RESTRICTED: 0,
    };

    data?.forEach(row => {
      const level = row.access_level as AccessLevel;
      if (level in access) {
        access[level] = row.access_count || 0;
        denials[level] = row.denied || 0;
      }
    });

    return { access, denials };
  }

  /**
   * Get access patterns by role
   */
  private async getAccessByRole(daysAgo: number): Promise<Record<Role, AccessPattern>> {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get all queries with user profiles
    const { data: queries } = await supabase
      .from('query_logs')
      .select('user_id, metadata, response_time_ms')
      .gte('timestamp', cutoffDate);

    // Get user profiles
    const userIds = [...new Set(queries?.map(q => q.user_id).filter(Boolean))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', userIds);

    // Map user_id to role
    const userRoleMap = new Map(
      profiles?.map(p => [p.id, p.role as Role]) || []
    );

    // Aggregate by role
    const roleStats = new Map<Role, {
      totalAccess: number;
      allowedAccess: number;
      deniedAccess: number;
      responseTimes: number[];
    }>();

    const roles: Role[] = ['user', 'junior', 'senior', 'manager', 'admin', 'ceo'];
    roles.forEach(role => {
      roleStats.set(role, {
        totalAccess: 0,
        allowedAccess: 0,
        deniedAccess: 0,
        responseTimes: [],
      });
    });

    queries?.forEach(q => {
      const role = userRoleMap.get(q.user_id);
      if (role && roleStats.has(role)) {
        const stats = roleStats.get(role)!;
        stats.totalAccess++;
        if (q.metadata?.access_denied === 'true') {
          stats.deniedAccess++;
        } else {
          stats.allowedAccess++;
        }
        if (q.response_time_ms) {
          stats.responseTimes.push(q.response_time_ms);
        }
      }
    });

    // Convert to AccessPattern format
    const result: Record<Role, AccessPattern> = {} as Record<Role, AccessPattern>;

    roles.forEach(role => {
      const stats = roleStats.get(role)!;
      const avgResponseTime = stats.responseTimes.length > 0
        ? stats.responseTimes.reduce((sum, t) => sum + t, 0) / stats.responseTimes.length
        : 0;

      result[role] = {
        totalAccess: stats.totalAccess,
        allowedAccess: stats.allowedAccess,
        deniedAccess: stats.deniedAccess,
        allowanceRate: stats.totalAccess > 0
          ? (stats.allowedAccess / stats.totalAccess) * 100
          : 0,
        avgResponseTime: Math.round(avgResponseTime),
      };
    });

    return result;
  }

  /**
   * Get access patterns by tier
   */
  private async getAccessByTier(daysAgo: number): Promise<Record<Tier, AccessPattern>> {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get all queries with user profiles
    const { data: queries } = await supabase
      .from('query_logs')
      .select('user_id, metadata, response_time_ms')
      .gte('timestamp', cutoffDate);

    // Get user profiles
    const userIds = [...new Set(queries?.map(q => q.user_id).filter(Boolean))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .in('id', userIds);

    // Map user_id to tier
    const userTierMap = new Map(
      profiles?.map(p => [p.id, p.subscription_tier as Tier]) || []
    );

    // Aggregate by tier
    const tierStats = new Map<Tier, {
      totalAccess: number;
      allowedAccess: number;
      deniedAccess: number;
      responseTimes: number[];
    }>();

    const tiers: Tier[] = ['free', 'basic', 'pro', 'enterprise'];
    tiers.forEach(tier => {
      tierStats.set(tier, {
        totalAccess: 0,
        allowedAccess: 0,
        deniedAccess: 0,
        responseTimes: [],
      });
    });

    queries?.forEach(q => {
      const tier = userTierMap.get(q.user_id);
      if (tier && tierStats.has(tier)) {
        const stats = tierStats.get(tier)!;
        stats.totalAccess++;
        if (q.metadata?.access_denied === 'true') {
          stats.deniedAccess++;
        } else {
          stats.allowedAccess++;
        }
        if (q.response_time_ms) {
          stats.responseTimes.push(q.response_time_ms);
        }
      }
    });

    // Convert to AccessPattern format
    const result: Record<Tier, AccessPattern> = {} as Record<Tier, AccessPattern>;

    tiers.forEach(tier => {
      const stats = tierStats.get(tier)!;
      const avgResponseTime = stats.responseTimes.length > 0
        ? stats.responseTimes.reduce((sum, t) => sum + t, 0) / stats.responseTimes.length
        : 0;

      result[tier] = {
        totalAccess: stats.totalAccess,
        allowedAccess: stats.allowedAccess,
        deniedAccess: stats.deniedAccess,
        allowanceRate: stats.totalAccess > 0
          ? (stats.allowedAccess / stats.totalAccess) * 100
          : 0,
        avgResponseTime: Math.round(avgResponseTime),
      };
    });

    return result;
  }

  /**
   * Get daily allowance rate trends
   */
  private async getDailyAllowanceRate(daysAgo: number) {
    const supabase = createServiceClient();

    // Use rbac_policy_effectiveness view (which is actually rbac_effectiveness_by_access in migration)
    const { data, error } = await supabase
      .from('rbac_effectiveness_by_access')
      .select('*')
      .order('access_level', { ascending: true });

    if (error) {
      console.error('Error fetching daily allowance rate:', error);
      return [];
    }

    // Note: The actual view doesn't have daily breakdowns
    // This is a simplified version - can be enhanced with proper daily aggregation
    return (data || []).map(row => ({
      date: new Date().toISOString().split('T')[0], // Placeholder
      allowanceRate: row.allowance_rate || 0,
      totalChecks: row.total_checks || 0,
    }));
  }

  /**
   * Get policy utilization statistics
   */
  private async getPolicyUtilization(daysAgo: number): Promise<PolicyUsage[]> {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get access patterns by document access level (proxy for policy)
    const { data } = await supabase
      .from('query_logs')
      .select('metadata')
      .gte('timestamp', cutoffDate);

    // Aggregate by policy type (access level)
    const policyStats = new Map<string, {
      applications: number;
      allows: number;
      denies: number;
    }>();

    data?.forEach(q => {
      const accessLevel = q.metadata?.access_level || 'unknown';
      if (!policyStats.has(accessLevel)) {
        policyStats.set(accessLevel, { applications: 0, allows: 0, denies: 0 });
      }
      const stats = policyStats.get(accessLevel)!;
      stats.applications++;
      if (q.metadata?.access_denied === 'true') {
        stats.denies++;
      } else {
        stats.allows++;
      }
    });

    // Convert to PolicyUsage format
    return Array.from(policyStats.entries()).map(([policyName, stats]) => ({
      policyName,
      applicationCount: stats.applications,
      allowCount: stats.allows,
      denyCount: stats.denies,
      effectiveness: stats.applications > 0
        ? (stats.allows / stats.applications) * 100
        : 0,
    }));
  }

  /**
   * Get RBAC effectiveness by access level
   */
  async getRBACEffectivenessByLevel() {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('rbac_effectiveness_by_access')
      .select('*')
      .order('access_level', { ascending: true });

    if (error) {
      console.error('Error fetching RBAC effectiveness by level:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user engagement by access level
   */
  async getUserEngagementByAccess() {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('user_engagement_by_access')
      .select('*')
      .order('avg_queries_per_user', { ascending: false });

    if (error) {
      console.error('Error fetching user engagement by access:', error);
      return [];
    }

    return data || [];
  }
}
