/**
 * Analytics Services - Phase 6.2
 * Export all analytics services and types
 */

// Main orchestrator
export { AdvancedAnalyticsService } from './analytics-advanced.service';

// Specialized services
export { UserAnalyticsService } from './user-analytics.service';
export { ContentAnalyticsService } from './content-analytics.service';
export { PerformanceAnalyticsService } from './performance-analytics.service';
export { RBACAnalyticsService } from './rbac-analytics.service';

// Types
export type {
  // Time and dimension types
  TimeRange,
  Role,
  Tier,
  AccessLevel,
  QueryType,

  // Metrics interfaces
  UserMetrics,
  ContentMetrics,
  PerformanceMetrics,
  RBACMetrics,
  OverviewMetrics,

  // Supporting types
  CohortData,
  DocumentAccessCount,
  CategoryAccessCount,
  QueryGap,
  QueryPerformanceStats,
  AccessPattern,
  PolicyUsage,

  // Database view types
  UserActivityRow,
  ContentAccessRow,
  RBACEffectivenessRow,
  QueryPerformanceRow,
  UserGrowthRow,
  HourlyVolumeRow,
  TopUserRow,
} from './types';
