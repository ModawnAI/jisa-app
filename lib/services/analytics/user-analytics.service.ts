/**
 * User Analytics Service
 * Handles user behavior analysis and engagement metrics
 */

import { createServiceClient } from '@/lib/supabase/server';
import type {
  UserMetrics,
  CohortData,
  Role,
  Tier,
  UserGrowthRow,
  TopUserRow,
} from './types';

export class UserAnalyticsService {
  /**
   * Get comprehensive user metrics
   */
  async getUserMetrics(daysAgo: number = 7): Promise<UserMetrics> {
    const supabase = createServiceClient();

    try {
      // Parallel queries for efficiency
      const [
        userCounts,
        activityStats,
        roleDistribution,
        tierDistribution,
        cohortData,
      ] = await Promise.all([
        this.getUserCounts(daysAgo),
        this.getActivityStats(daysAgo),
        this.getRoleDistribution(),
        this.getTierDistribution(),
        this.getCohortAnalysis(),
      ]);

      return {
        // Engagement
        totalUsers: userCounts.totalUsers,
        activeUsers7d: userCounts.activeUsers7d,
        activeUsers30d: userCounts.activeUsers30d,
        newUsers7d: userCounts.newUsers7d,
        newUsers30d: userCounts.newUsers30d,
        churnedUsers30d: userCounts.churnedUsers30d,

        // Activity
        avgQueriesPerUser: activityStats.avgQueriesPerUser,
        avgSessionDuration: activityStats.avgSessionDuration,
        avgResponseTime: activityStats.avgResponseTime,

        // Distribution
        usersByRole: roleDistribution,
        usersByTier: tierDistribution,

        // Cohorts
        cohortRetention: cohortData.retention,
        cohortEngagement: cohortData.engagement,
      };
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      throw new Error('Failed to fetch user metrics');
    }
  }

  /**
   * Get user count metrics
   */
  private async getUserCounts(daysAgo: number) {
    const supabase = createServiceClient();

    const now = new Date();
    const daysAgoDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users (KakaoTalk users only)
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('kakao_user_id', 'is', null);

    // Active users (7d) - users with queries in last 7 days
    const { data: active7d } = await supabase
      .from('query_logs')
      .select('kakao_user_id')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .not('kakao_user_id', 'is', null);

    const activeUsers7d = new Set(active7d?.map(q => q.kakao_user_id)).size;

    // Active users (30d)
    const { data: active30d } = await supabase
      .from('query_logs')
      .select('kakao_user_id')
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .not('kakao_user_id', 'is', null);

    const activeUsers30d = new Set(active30d?.map(q => q.kakao_user_id)).size;

    // New users (7d)
    const { count: newUsers7d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('kakao_user_id', 'is', null);

    // New users (30d)
    const { count: newUsers30d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('kakao_user_id', 'is', null);

    // Churned users (no activity in last 30 days but had activity before)
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('kakao_user_id, last_chat_at')
      .not('kakao_user_id', 'is', null)
      .lt('last_chat_at', thirtyDaysAgo.toISOString());

    const churnedUsers30d = allUsers?.length || 0;

    return {
      totalUsers: totalUsers || 0,
      activeUsers7d,
      activeUsers30d,
      newUsers7d: newUsers7d || 0,
      newUsers30d: newUsers30d || 0,
      churnedUsers30d,
    };
  }

  /**
   * Get activity statistics
   */
  private async getActivityStats(daysAgo: number) {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get query activity
    const { data: queries } = await supabase
      .from('query_logs')
      .select('kakao_user_id, response_time_ms, session_id, timestamp')
      .gte('timestamp', cutoffDate);

    if (!queries || queries.length === 0) {
      return {
        avgQueriesPerUser: 0,
        avgSessionDuration: 0,
        avgResponseTime: 0,
      };
    }

    // Calculate queries per user
    const queriesByUser = new Map<string, number>();
    queries.forEach(q => {
      if (q.kakao_user_id) {
        queriesByUser.set(q.kakao_user_id, (queriesByUser.get(q.kakao_user_id) || 0) + 1);
      }
    });

    const avgQueriesPerUser = queriesByUser.size > 0
      ? Array.from(queriesByUser.values()).reduce((sum, count) => sum + count, 0) / queriesByUser.size
      : 0;

    // Calculate average session duration
    const sessionTimes = new Map<string, { start: Date; end: Date }>();
    queries.forEach(q => {
      const time = new Date(q.timestamp);
      if (!sessionTimes.has(q.session_id)) {
        sessionTimes.set(q.session_id, { start: time, end: time });
      } else {
        const session = sessionTimes.get(q.session_id)!;
        if (time < session.start) session.start = time;
        if (time > session.end) session.end = time;
      }
    });

    const durations = Array.from(sessionTimes.values()).map(
      s => s.end.getTime() - s.start.getTime()
    );
    const avgSessionDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length / 1000 // Convert to seconds
      : 0;

    // Calculate average response time
    const avgResponseTime = queries.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / queries.length;

    return {
      avgQueriesPerUser: Math.round(avgQueriesPerUser * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration),
      avgResponseTime: Math.round(avgResponseTime),
    };
  }

  /**
   * Get user distribution by role
   */
  private async getRoleDistribution(): Promise<Record<Role, number>> {
    const supabase = createServiceClient();

    const { data: users } = await supabase
      .from('profiles')
      .select('role')
      .not('kakao_user_id', 'is', null);

    const distribution: Record<Role, number> = {
      user: 0,
      junior: 0,
      senior: 0,
      manager: 0,
      admin: 0,
      ceo: 0,
    };

    users?.forEach(u => {
      if (u.role && u.role in distribution) {
        distribution[u.role as Role]++;
      }
    });

    return distribution;
  }

  /**
   * Get user distribution by tier
   */
  private async getTierDistribution(): Promise<Record<Tier, number>> {
    const supabase = createServiceClient();

    const { data: users } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .not('kakao_user_id', 'is', null);

    const distribution: Record<Tier, number> = {
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };

    users?.forEach(u => {
      if (u.subscription_tier && u.subscription_tier in distribution) {
        distribution[u.subscription_tier as Tier]++;
      }
    });

    return distribution;
  }

  /**
   * Get cohort analysis
   */
  private async getCohortAnalysis(): Promise<{
    retention: CohortData[];
    engagement: CohortData[];
  }> {
    const supabase = createServiceClient();

    // Use the database function for user growth metrics
    const { data: growthData, error: growthError } = await supabase
      .rpc('get_user_growth_metrics', { days_back: 90 });

    if (growthError || !growthData) {
      console.error('Error fetching cohort data:', growthError);
      return { retention: [], engagement: [] };
    }

    // Group by month for cohort analysis
    const monthlyData = new Map<string, UserGrowthRow[]>();
    growthData.forEach((row: UserGrowthRow) => {
      const month = row.date.substring(0, 7); // YYYY-MM
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(row);
    });

    const cohortRetention: CohortData[] = Array.from(monthlyData.entries()).map(([month, days]) => {
      const totalUsers = days[days.length - 1]?.total_users || 0;
      const activeUsers = days.reduce((sum, d) => sum + d.active_users, 0) / days.length;
      const newUsers = days.reduce((sum, d) => sum + d.new_users, 0);

      return {
        cohortMonth: month,
        totalUsers,
        retentionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        activeUsers: Math.round(activeUsers),
        avgQueries: 0, // Will be calculated if needed
      };
    });

    // For engagement, use query counts
    const cohortEngagement: CohortData[] = cohortRetention.map(cohort => ({
      ...cohort,
      avgQueries: 0, // Placeholder - can be enhanced with actual query data
    }));

    return {
      retention: cohortRetention,
      engagement: cohortEngagement,
    };
  }

  /**
   * Get top users by query count
   */
  async getTopUsers(limit: number = 10, daysAgo: number = 7): Promise<TopUserRow[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .rpc('get_top_users_by_queries', {
        days_back: daysAgo,
        limit_count: limit,
      });

    if (error) {
      console.error('Error fetching top users:', error);
      return [];
    }

    return data || [];
  }
}
