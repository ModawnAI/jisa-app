/**
 * Content Analytics Service
 * Handles content access patterns and document analytics
 */

import { createServiceClient } from '@/lib/supabase/server';
import type {
  ContentMetrics,
  DocumentAccessCount,
  CategoryAccessCount,
  QueryGap,
  Role,
  Tier,
  ContentAccessRow,
} from './types';

export class ContentAnalyticsService {
  /**
   * Get comprehensive content metrics
   */
  async getContentMetrics(daysAgo: number = 7): Promise<ContentMetrics> {
    const supabase = createServiceClient();

    try {
      // Parallel queries for efficiency
      const [
        accessStats,
        topDocuments,
        topCategories,
        denialStats,
        contentGaps,
        underutilized,
      ] = await Promise.all([
        this.getAccessStats(daysAgo),
        this.getTopDocuments(daysAgo),
        this.getTopCategories(daysAgo),
        this.getDenialStats(daysAgo),
        this.getContentGaps(daysAgo),
        this.getUnderutilizedContent(),
      ]);

      return {
        // Access Patterns
        totalQueries: accessStats.totalQueries,
        uniqueDocumentsAccessed: accessStats.uniqueDocuments,
        avgDocumentAccesses: accessStats.avgAccesses,

        // Popular Content
        topDocuments,
        topCategories,

        // Access Denials
        accessDenials: denialStats.totalDenials,
        accessDenialRate: denialStats.denialRate,
        denialsByRole: denialStats.denialsByRole,
        denialsByTier: denialStats.denialsByTier,

        // Content Gaps
        queriesWithNoResults: contentGaps,
        underutilizedContent: underutilized,
      };
    } catch (error) {
      console.error('Error fetching content metrics:', error);
      throw new Error('Failed to fetch content metrics');
    }
  }

  /**
   * Get overall access statistics
   */
  private async getAccessStats(daysAgo: number) {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Total queries
    const { count: totalQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', cutoffDate);

    // Unique documents accessed
    const { data: queries } = await supabase
      .from('query_logs')
      .select('metadata')
      .gte('timestamp', cutoffDate);

    const uniqueDocuments = new Set(
      queries
        ?.map(q => q.metadata?.document_id)
        .filter(Boolean)
    ).size;

    const avgAccesses = uniqueDocuments > 0
      ? (totalQueries || 0) / uniqueDocuments
      : 0;

    return {
      totalQueries: totalQueries || 0,
      uniqueDocuments,
      avgAccesses: Math.round(avgAccesses * 10) / 10,
    };
  }

  /**
   * Get top accessed documents
   */
  private async getTopDocuments(daysAgo: number, limit: number = 10): Promise<DocumentAccessCount[]> {
    const supabase = createServiceClient();

    // Use the content_access_patterns view
    const { data, error } = await supabase
      .from('content_access_patterns')
      .select('*')
      .order('access_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top documents:', error);
      return [];
    }

    return (data || []).map((row: ContentAccessRow) => ({
      documentId: row.id,
      title: row.title,
      accessLevel: row.access_level,
      accessCount: row.access_count,
      uniqueUsers: row.unique_users + row.unique_kakao_users,
      avgResponseTime: row.avg_response_time,
      lastAccessed: row.last_accessed,
    }));
  }

  /**
   * Get top accessed categories
   */
  private async getTopCategories(daysAgo: number, limit: number = 10): Promise<CategoryAccessCount[]> {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get queries with document categories
    const { data: queries } = await supabase
      .from('query_logs')
      .select('metadata')
      .gte('timestamp', cutoffDate);

    // Aggregate by category
    const categoryStats = new Map<string, { count: number; users: Set<string> }>();

    queries?.forEach(q => {
      const category = q.metadata?.category || 'Uncategorized';
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { count: 0, users: new Set() });
      }
      const stats = categoryStats.get(category)!;
      stats.count++;
      if (q.metadata?.user_id) {
        stats.users.add(q.metadata.user_id);
      }
    });

    // Convert to array and sort
    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        accessCount: stats.count,
        uniqueUsers: stats.users.size,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get access denial statistics
   */
  private async getDenialStats(daysAgo: number) {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get all queries
    const { count: totalQueries } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', cutoffDate);

    // Get denied access queries
    const { data: deniedQueries } = await supabase
      .from('query_logs')
      .select('metadata, user_id')
      .gte('timestamp', cutoffDate)
      .eq('metadata->>access_denied', 'true');

    const totalDenials = deniedQueries?.length || 0;
    const denialRate = totalQueries ? (totalDenials / totalQueries) * 100 : 0;

    // Get profile data for denied queries
    const userIds = [...new Set(deniedQueries?.map(q => q.user_id).filter(Boolean))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, subscription_tier')
      .in('id', userIds);

    const denialsByRole: Record<Role, number> = {
      user: 0,
      junior: 0,
      senior: 0,
      manager: 0,
      admin: 0,
      ceo: 0,
    };

    const denialsByTier: Record<Tier, number> = {
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };

    profiles?.forEach(p => {
      if (p.role && p.role in denialsByRole) {
        denialsByRole[p.role as Role]++;
      }
      if (p.subscription_tier && p.subscription_tier in denialsByTier) {
        denialsByTier[p.subscription_tier as Tier]++;
      }
    });

    return {
      totalDenials,
      denialRate: Math.round(denialRate * 100) / 100,
      denialsByRole,
      denialsByTier,
    };
  }

  /**
   * Get content gaps (queries with no/poor results)
   */
  private async getContentGaps(daysAgo: number, limit: number = 20): Promise<QueryGap[]> {
    const supabase = createServiceClient();

    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Get queries with poor results (indicated by metadata)
    const { data: poorResults } = await supabase
      .from('query_logs')
      .select('query_text, metadata, timestamp')
      .gte('timestamp', cutoffDate)
      .or('metadata->>no_results.eq.true,metadata->>low_confidence.eq.true')
      .order('timestamp', { ascending: false });

    // Aggregate by similar query text
    const gapStats = new Map<string, { count: number; lastOccurred: string }>();

    poorResults?.forEach(q => {
      const queryKey = q.query_text.toLowerCase().trim();
      if (!gapStats.has(queryKey)) {
        gapStats.set(queryKey, { count: 0, lastOccurred: q.timestamp });
      }
      const stats = gapStats.get(queryKey)!;
      stats.count++;
      if (new Date(q.timestamp) > new Date(stats.lastOccurred)) {
        stats.lastOccurred = q.timestamp;
      }
    });

    // Convert to array and sort by frequency
    return Array.from(gapStats.entries())
      .map(([queryText, stats]) => ({
        queryText,
        frequency: stats.count,
        lastOccurred: stats.lastOccurred,
        suggestedContent: undefined, // Can be enhanced with AI suggestions
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get underutilized content
   */
  private async getUnderutilizedContent(limit: number = 10): Promise<DocumentAccessCount[]> {
    const supabase = createServiceClient();

    // Use the underutilized_content view
    const { data, error } = await supabase
      .from('underutilized_content')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching underutilized content:', error);
      return [];
    }

    return (data || []).map((row: ContentAccessRow) => ({
      documentId: row.id,
      title: row.title,
      accessLevel: row.access_level,
      accessCount: row.access_count,
      uniqueUsers: row.unique_users + row.unique_kakao_users,
      avgResponseTime: row.avg_response_time,
      lastAccessed: row.last_accessed,
    }));
  }

  /**
   * Get popular content in the last 7 days
   */
  async getPopularContent(limit: number = 10): Promise<DocumentAccessCount[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('popular_content_7d')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching popular content:', error);
      return [];
    }

    return (data || []).map((row: ContentAccessRow) => ({
      documentId: row.id,
      title: row.title,
      accessLevel: row.access_level,
      accessCount: row.access_count,
      uniqueUsers: row.unique_users + row.unique_kakao_users,
      avgResponseTime: row.avg_response_time,
      lastAccessed: row.last_accessed,
    }));
  }
}
