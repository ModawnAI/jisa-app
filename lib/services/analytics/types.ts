/**
 * Analytics Types and Interfaces
 * Type definitions for Phase 6.2 Advanced Analytics
 */

export type TimeRange = '7d' | '30d' | '90d';
export type Role = 'user' | 'junior' | 'senior' | 'manager' | 'admin' | 'ceo';
export type Tier = 'free' | 'basic' | 'pro' | 'enterprise';
export type AccessLevel = 'L1_PUBLIC' | 'L2_BASIC' | 'L3_INTERNAL' | 'L4_SENSITIVE' | 'L5_CONFIDENTIAL' | 'L6_RESTRICTED';
export type QueryType = 'rag' | 'commission' | 'unknown';

// ==================== User Metrics ====================

export interface CohortData {
  cohortMonth: string;
  totalUsers: number;
  retentionRate: number;
  activeUsers: number;
  avgQueries: number;
}

export interface UserMetrics {
  // Engagement
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsers7d: number;
  newUsers30d: number;
  churnedUsers30d: number;

  // Activity
  avgQueriesPerUser: number;
  avgSessionDuration: number;
  avgResponseTime: number;

  // By Role/Tier
  usersByRole: Record<Role, number>;
  usersByTier: Record<Tier, number>;

  // Cohort Analysis
  cohortRetention: CohortData[];
  cohortEngagement: CohortData[];
}

// ==================== Content Metrics ====================

export interface DocumentAccessCount {
  documentId: string;
  title: string;
  accessLevel: AccessLevel;
  accessCount: number;
  uniqueUsers: number;
  avgResponseTime: number;
  lastAccessed: string;
}

export interface CategoryAccessCount {
  category: string;
  accessCount: number;
  uniqueUsers: number;
}

export interface QueryGap {
  queryText: string;
  frequency: number;
  lastOccurred: string;
  suggestedContent?: string;
}

export interface ContentMetrics {
  // Access Patterns
  totalQueries: number;
  uniqueDocumentsAccessed: number;
  avgDocumentAccesses: number;

  // Popular Content
  topDocuments: DocumentAccessCount[];
  topCategories: CategoryAccessCount[];

  // Access Denials
  accessDenials: number;
  accessDenialRate: number;
  denialsByRole: Record<Role, number>;
  denialsByTier: Record<Tier, number>;

  // Content Gaps
  queriesWithNoResults: QueryGap[];
  underutilizedContent: DocumentAccessCount[];
}

// ==================== Performance Metrics ====================

export interface QueryPerformanceStats {
  queryType: QueryType;
  queryCount: number;
  avgTime: number;
  p50Time: number;
  p95Time: number;
  p99Time: number;
  maxTime: number;
}

export interface PerformanceMetrics {
  // Response Times
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Query Types
  ragQueryCount: number;
  commissionQueryCount: number;
  avgRagTime: number;
  avgCommissionTime: number;

  // Errors
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;

  // System Health
  uptime: number;
  apiLatency: number;
  dbLatency: number;

  // Detailed Stats
  performanceByType: QueryPerformanceStats[];
}

// ==================== RBAC Metrics ====================

export interface AccessPattern {
  totalAccess: number;
  allowedAccess: number;
  deniedAccess: number;
  allowanceRate: number;
  avgResponseTime: number;
}

export interface PolicyUsage {
  policyName: string;
  applicationCount: number;
  allowCount: number;
  denyCount: number;
  effectiveness: number;
}

export interface RBACMetrics {
  // Policy Effectiveness
  totalAccessChecks: number;
  allowedAccess: number;
  deniedAccess: number;
  allowanceRate: number;

  // By Access Level
  accessByLevel: Record<AccessLevel, number>;
  denialsByLevel: Record<AccessLevel, number>;

  // Role Distribution
  contentAccessByRole: Record<Role, AccessPattern>;
  contentAccessByTier: Record<Tier, AccessPattern>;

  // Policy Impact
  policyUtilization: PolicyUsage[];
  unusedPolicies: string[];
  overpermissivePolicies: string[];

  // Trends
  dailyAllowanceRate: Array<{
    date: string;
    allowanceRate: number;
    totalChecks: number;
  }>;
}

// ==================== Overview Metrics ====================

export interface OverviewMetrics {
  users: UserMetrics;
  queries: ContentMetrics;
  performance: PerformanceMetrics;
  rbac: RBACMetrics;
  timeRange: TimeRange;
  lastUpdated: string;
}

// ==================== Database View Types ====================

export interface UserActivityRow {
  date: string;
  active_users: number;
  active_kakao_users: number;
  total_queries: number;
  avg_response_time: number;
  rag_queries: number;
  commission_queries: number;
}

export interface ContentAccessRow {
  id: string;
  title: string;
  access_level: AccessLevel;
  required_role: Role | null;
  required_tier: Tier | null;
  access_count: number;
  unique_users: number;
  unique_kakao_users: number;
  avg_response_time: number;
  last_accessed: string;
}

export interface RBACEffectivenessRow {
  date: string;
  total_checks: number;
  denied: number;
  allowed: number;
  allowance_rate: number;
}

export interface QueryPerformanceRow {
  query_type: QueryType;
  query_count: number;
  avg_time: number;
  p50_time: number;
  p95_time: number;
  p99_time: number;
  max_time: number;
}

export interface UserGrowthRow {
  date: string;
  new_users: number;
  total_users: number;
  active_users: number;
}

export interface HourlyVolumeRow {
  hour: number;
  query_count: number;
  avg_response_time: number;
}

export interface TopUserRow {
  user_id: string;
  kakao_user_id: string | null;
  query_count: number;
  avg_response_time: number;
  first_query: string;
  last_query: string;
}
