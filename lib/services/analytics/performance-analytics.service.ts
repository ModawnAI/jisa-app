/**
 * Performance Analytics Service
 * Handles system performance monitoring and query performance analysis
 */

import { createServiceClient } from '@/lib/supabase/server';
import type {
  PerformanceMetrics,
  QueryPerformanceStats,
  QueryPerformanceRow,
  HourlyVolumeRow,
} from './types';

export class PerformanceAnalyticsService {
  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(daysAgo: number = 7): Promise<PerformanceMetrics> {
    const supabase = createServiceClient();

    try {
      // Parallel queries for efficiency
      const [
        responseTimes,
        queryTypeStats,
        errorStats,
        systemHealth,
      ] = await Promise.all([
        this.getResponseTimeStats(daysAgo),
        this.getQueryTypeStats(daysAgo),
        this.getErrorStats(daysAgo),
        this.getSystemHealth(),
      ]);

      return {
        // Response Times
        avgResponseTime: responseTimes.avg,
        p50ResponseTime: responseTimes.p50,
        p95ResponseTime: responseTimes.p95,
        p99ResponseTime: responseTimes.p99,

        // Query Types
        ragQueryCount: queryTypeStats.ragCount,
        commissionQueryCount: queryTypeStats.commissionCount,
        avgRagTime: queryTypeStats.avgRagTime,
        avgCommissionTime: queryTypeStats.avgCommissionTime,

        // Errors
        totalErrors: errorStats.totalErrors,
        errorRate: errorStats.errorRate,
        errorsByType: errorStats.errorsByType,

        // System Health
        uptime: systemHealth.uptime,
        apiLatency: systemHealth.apiLatency,
        dbLatency: systemHealth.dbLatency,

        // Detailed Stats
        performanceByType: queryTypeStats.detailedStats,
      };
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw new Error('Failed to fetch performance metrics');
    }
  }

  /**
   * Get response time statistics
   */
  private async getResponseTimeStats(daysAgo: number) {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const { data: queries } = await supabase
      .from('query_logs')
      .select('response_time_ms')
      .gte('timestamp', cutoffDate)
      .order('response_time_ms', { ascending: true });

    if (!queries || queries.length === 0) {
      return { avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const times = queries.map(q => q.response_time_ms || 0);
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;

    // Calculate percentiles
    const p50Index = Math.floor(times.length * 0.50);
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);

    return {
      avg: Math.round(avg),
      p50: times[p50Index] || 0,
      p95: times[p95Index] || 0,
      p99: times[p99Index] || 0,
    };
  }

  /**
   * Get query type statistics
   */
  private async getQueryTypeStats(daysAgo: number) {
    const supabase = createServiceClient();

    // Use the query_performance_stats view
    const { data, error } = await supabase
      .from('query_performance_stats')
      .select('*');

    if (error) {
      console.error('Error fetching query type stats:', error);
      return {
        ragCount: 0,
        commissionCount: 0,
        avgRagTime: 0,
        avgCommissionTime: 0,
        detailedStats: [],
      };
    }

    const ragStats = data?.find((row: QueryPerformanceRow) => row.query_type === 'rag');
    const commissionStats = data?.find((row: QueryPerformanceRow) => row.query_type === 'commission');

    const detailedStats: QueryPerformanceStats[] = (data || []).map((row: QueryPerformanceRow) => ({
      queryType: row.query_type,
      queryCount: row.query_count,
      avgTime: Math.round(row.avg_time),
      p50Time: Math.round(row.p50_time),
      p95Time: Math.round(row.p95_time),
      p99Time: Math.round(row.p99_time),
      maxTime: Math.round(row.max_time),
    }));

    return {
      ragCount: ragStats?.query_count || 0,
      commissionCount: commissionStats?.query_count || 0,
      avgRagTime: Math.round(ragStats?.avg_time || 0),
      avgCommissionTime: Math.round(commissionStats?.avg_time || 0),
      detailedStats,
    };
  }

  /**
   * Get error statistics
   */
  private async getErrorStats(daysAgo: number) {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Total queries
    const { count: totalQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', cutoffDate);

    // Error queries (identified by metadata)
    const { data: errorQueries } = await supabase
      .from('query_logs')
      .select('metadata')
      .gte('timestamp', cutoffDate)
      .eq('metadata->>error', 'true');

    const totalErrors = errorQueries?.length || 0;
    const errorRate = totalQueries ? (totalErrors / totalQueries) * 100 : 0;

    // Group errors by type
    const errorsByType: Record<string, number> = {};
    errorQueries?.forEach(q => {
      const errorType = q.metadata?.error_type || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    return {
      totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      errorsByType,
    };
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealth() {
    const supabase = createServiceClient();

    // Calculate uptime (based on successful queries in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: totalQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    const { count: successfulQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo)
      .neq('metadata->>error', 'true');

    const uptime = totalQueries && successfulQueries
      ? (successfulQueries / totalQueries) * 100
      : 100;

    // API latency (recent average response time)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentQueries } = await supabase
      .from('query_logs')
      .select('response_time_ms')
      .gte('timestamp', fiveMinutesAgo);

    const apiLatency = recentQueries?.length
      ? recentQueries.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / recentQueries.length
      : 0;

    // DB latency (simplified - can be enhanced with actual DB metrics)
    const dbLatency = apiLatency * 0.3; // Rough estimate: 30% of total response time

    return {
      uptime: Math.round(uptime * 100) / 100,
      apiLatency: Math.round(apiLatency),
      dbLatency: Math.round(dbLatency),
    };
  }

  /**
   * Get hourly query volume trends
   */
  async getHourlyTrends(daysAgo: number = 1): Promise<HourlyVolumeRow[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .rpc('get_query_volume_by_hour', { days_back: daysAgo });

    if (error) {
      console.error('Error fetching hourly trends:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(daysAgo: number = 30) {
    const supabase = createServiceClient();

    // Use hourly_performance_trends view
    const { data, error } = await supabase
      .from('hourly_performance_trends')
      .select('*')
      .order('hour', { ascending: true });

    if (error) {
      console.error('Error fetching performance trends:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get slow queries (queries above threshold)
   */
  async getSlowQueries(thresholdMs: number = 3000, limit: number = 20) {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('query_logs')
      .select('id, query_text, response_time_ms, query_type, timestamp, metadata')
      .gte('response_time_ms', thresholdMs)
      .order('response_time_ms', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching slow queries:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get error breakdown by category
   */
  async getErrorBreakdown(daysAgo: number = 7) {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const { data: errorQueries } = await supabase
      .from('query_logs')
      .select('metadata, timestamp')
      .gte('timestamp', cutoffDate)
      .eq('metadata->>error', 'true')
      .order('timestamp', { ascending: false });

    // Group by error type and severity
    const breakdown = {
      byType: new Map<string, number>(),
      bySeverity: new Map<string, number>(),
      byTimeOfDay: new Map<number, number>(),
    };

    errorQueries?.forEach(q => {
      const errorType = q.metadata?.error_type || 'unknown';
      const severity = q.metadata?.severity || 'medium';
      const hour = new Date(q.timestamp).getHours();

      breakdown.byType.set(errorType, (breakdown.byType.get(errorType) || 0) + 1);
      breakdown.bySeverity.set(severity, (breakdown.bySeverity.get(severity) || 0) + 1);
      breakdown.byTimeOfDay.set(hour, (breakdown.byTimeOfDay.get(hour) || 0) + 1);
    });

    return {
      byType: Object.fromEntries(breakdown.byType),
      bySeverity: Object.fromEntries(breakdown.bySeverity),
      byTimeOfDay: Object.fromEntries(breakdown.byTimeOfDay),
      totalErrors: errorQueries?.length || 0,
    };
  }
}
