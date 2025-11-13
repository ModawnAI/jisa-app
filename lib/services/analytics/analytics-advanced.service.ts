/**
 * Advanced Analytics Service
 * Main orchestrator for Phase 6.2 analytics functionality
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { OverviewMetrics, TimeRange } from './types';
import { UserAnalyticsService } from './user-analytics.service';
import { ContentAnalyticsService } from './content-analytics.service';
import { PerformanceAnalyticsService } from './performance-analytics.service';
import { RBACAnalyticsService } from './rbac-analytics.service';

export class AdvancedAnalyticsService {
  private userAnalytics: UserAnalyticsService;
  private contentAnalytics: ContentAnalyticsService;
  private performanceAnalytics: PerformanceAnalyticsService;
  private rbacAnalytics: RBACAnalyticsService;

  constructor() {
    this.userAnalytics = new UserAnalyticsService();
    this.contentAnalytics = new ContentAnalyticsService();
    this.performanceAnalytics = new PerformanceAnalyticsService();
    this.rbacAnalytics = new RBACAnalyticsService();
  }

  /**
   * Get comprehensive overview metrics
   * Fetches all analytics in parallel for efficiency
   */
  async getOverviewMetrics(timeRange: TimeRange = '7d'): Promise<OverviewMetrics> {
    const daysAgo = this.timeRangeToDays(timeRange);

    try {
      // Parallel queries for optimal performance
      const [users, queries, performance, rbac] = await Promise.all([
        this.userAnalytics.getUserMetrics(daysAgo),
        this.contentAnalytics.getContentMetrics(daysAgo),
        this.performanceAnalytics.getPerformanceMetrics(daysAgo),
        this.rbacAnalytics.getRBACMetrics(daysAgo),
      ]);

      return {
        users,
        queries,
        performance,
        rbac,
        timeRange,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      throw new Error('Failed to fetch analytics overview');
    }
  }

  /**
   * Get user-focused analytics
   */
  async getUserAnalytics(timeRange: TimeRange = '7d') {
    const daysAgo = this.timeRangeToDays(timeRange);
    return this.userAnalytics.getUserMetrics(daysAgo);
  }

  /**
   * Get content-focused analytics
   */
  async getContentAnalytics(timeRange: TimeRange = '7d') {
    const daysAgo = this.timeRangeToDays(timeRange);
    return this.contentAnalytics.getContentMetrics(daysAgo);
  }

  /**
   * Get performance-focused analytics
   */
  async getPerformanceAnalytics(timeRange: TimeRange = '7d') {
    const daysAgo = this.timeRangeToDays(timeRange);
    return this.performanceAnalytics.getPerformanceMetrics(daysAgo);
  }

  /**
   * Get RBAC-focused analytics
   */
  async getRBACAnalytics(timeRange: TimeRange = '7d') {
    const daysAgo = this.timeRangeToDays(timeRange);
    return this.rbacAnalytics.getRBACMetrics(daysAgo);
  }

  /**
   * Get real-time system health snapshot
   */
  async getSystemHealth() {
    const supabase = createServiceClient();

    try {
      // Check recent queries (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: recentQueries, error: queriesError } = await supabase
        .from('query_logs')
        .select('id, response_time_ms, timestamp')
        .gte('timestamp', fiveMinutesAgo)
        .order('timestamp', { ascending: false });

      if (queriesError) throw queriesError;

      const activeUsers = new Set(recentQueries?.map(q => q.id)).size;
      const avgResponseTime = recentQueries?.length
        ? recentQueries.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / recentQueries.length
        : 0;

      // Check active sessions
      const { count: activeSessions, error: sessionsError } = await supabase
        .from('query_logs')
        .select('session_id', { count: 'exact', head: true })
        .gte('timestamp', fiveMinutesAgo);

      if (sessionsError) throw sessionsError;

      return {
        status: avgResponseTime < 3000 ? 'healthy' : avgResponseTime < 5000 ? 'degraded' : 'unhealthy',
        activeUsers,
        activeSessions: activeSessions || 0,
        avgResponseTime: Math.round(avgResponseTime),
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        status: 'unknown' as const,
        activeUsers: 0,
        activeSessions: 0,
        avgResponseTime: 0,
        lastChecked: new Date().toISOString(),
        error: 'Health check failed',
      };
    }
  }

  /**
   * Export analytics data to CSV format
   */
  async exportToCSV(timeRange: TimeRange = '7d'): Promise<string> {
    const metrics = await this.getOverviewMetrics(timeRange);

    const rows = [
      ['Metric', 'Value'],
      ['Time Range', metrics.timeRange],
      ['Generated', metrics.lastUpdated],
      [''],
      ['USER METRICS', ''],
      ['Total Users', metrics.users.totalUsers.toString()],
      ['Active Users (7d)', metrics.users.activeUsers7d.toString()],
      ['Active Users (30d)', metrics.users.activeUsers30d.toString()],
      ['New Users (7d)', metrics.users.newUsers7d.toString()],
      ['Avg Queries Per User', metrics.users.avgQueriesPerUser.toFixed(2)],
      [''],
      ['CONTENT METRICS', ''],
      ['Total Queries', metrics.queries.totalQueries.toString()],
      ['Unique Documents', metrics.queries.uniqueDocumentsAccessed.toString()],
      ['Access Denials', metrics.queries.accessDenials.toString()],
      ['Access Denial Rate', `${metrics.queries.accessDenialRate.toFixed(2)}%`],
      [''],
      ['PERFORMANCE METRICS', ''],
      ['Avg Response Time', `${metrics.performance.avgResponseTime.toFixed(0)}ms`],
      ['P95 Response Time', `${metrics.performance.p95ResponseTime.toFixed(0)}ms`],
      ['RAG Query Count', metrics.performance.ragQueryCount.toString()],
      ['Commission Query Count', metrics.performance.commissionQueryCount.toString()],
      ['Total Errors', metrics.performance.totalErrors.toString()],
      ['Error Rate', `${metrics.performance.errorRate.toFixed(2)}%`],
      [''],
      ['RBAC METRICS', ''],
      ['Total Access Checks', metrics.rbac.totalAccessChecks.toString()],
      ['Allowed Access', metrics.rbac.allowedAccess.toString()],
      ['Denied Access', metrics.rbac.deniedAccess.toString()],
      ['Allowance Rate', `${metrics.rbac.allowanceRate.toFixed(2)}%`],
    ];

    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Convert TimeRange to number of days
   */
  private timeRangeToDays(timeRange: TimeRange): number {
    switch (timeRange) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 7;
    }
  }
}
