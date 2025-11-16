# Phase 6.2 - Advanced Analytics Implementation Plan

**Status:** 🎯 Ready to Begin
**Prerequisites:** ✅ Phase 1-6.1 Complete
**Duration:** 3-5 days
**Priority:** High

---

## 📊 Overview

Phase 6.2 focuses on implementing advanced analytics and monitoring capabilities to provide deep insights into system usage, user behavior, and content access patterns.

### Goals
1. **Real-time Metrics** - Live dashboard with system health and activity
2. **User Analytics** - Behavior patterns, cohort analysis, engagement metrics
3. **Content Analytics** - Access patterns, popular content, gaps
4. **Performance Monitoring** - Query latency, error rates, system health
5. **RBAC Analytics** - Access control effectiveness, policy impact

---

## 🎯 Deliverables

### 1. Advanced Analytics Dashboard
**Route:** `/admin/analytics`

**Components:**
```typescript
app/admin/analytics/page.tsx          // Main analytics page
components/admin/analytics/
├── overview-metrics.tsx              // Top-level KPIs
├── user-behavior-chart.tsx           // User activity patterns
├── content-heatmap.tsx               // Content access visualization
├── query-performance-chart.tsx       // Performance metrics
├── rbac-effectiveness.tsx            // Access control analytics
├── cohort-analysis.tsx               // User cohort comparison
└── export-report.tsx                 // Report generation
```

### 2. Analytics Services
**Services:**
```typescript
lib/services/analytics/
├── analytics-advanced.service.ts     // Main analytics logic
├── user-analytics.service.ts         // User behavior analysis
├── content-analytics.service.ts      // Content access patterns
├── performance-analytics.service.ts  // System performance
└── rbac-analytics.service.ts         // RBAC effectiveness
```

### 3. API Endpoints
**Routes:**
```typescript
app/api/analytics/
├── overview/route.ts                 // GET - Overview metrics
├── users/route.ts                    // GET - User analytics
├── content/route.ts                  // GET - Content analytics
├── performance/route.ts              // GET - Performance metrics
├── rbac/route.ts                     // GET - RBAC analytics
├── cohorts/route.ts                  // GET - Cohort analysis
└── export/route.ts                   // POST - Export reports
```

### 4. Database Views & Functions
**SQL:**
```sql
supabase/migrations/
└── 20251113_analytics_views.sql
    ├── user_activity_summary         // User engagement metrics
    ├── content_access_patterns       // Content popularity
    ├── query_performance_stats       // Performance aggregates
    ├── rbac_policy_effectiveness     // Access control metrics
    └── daily_analytics_rollup        // Daily aggregated data
```

---

## 📈 Metrics to Track

### User Metrics
```typescript
interface UserMetrics {
  // Engagement
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsers7d: number;
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
```

### Content Metrics
```typescript
interface ContentMetrics {
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
  underutilizedContent: Document[];
}
```

### Performance Metrics
```typescript
interface PerformanceMetrics {
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
}
```

### RBAC Metrics
```typescript
interface RBACMetrics {
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
}
```

---

## 🛠️ Implementation Steps

### Step 1: Database Views & Functions (Day 1)
**File:** `supabase/migrations/20251113_analytics_views.sql`

```sql
-- User Activity Summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT kakao_user_id) as active_kakao_users,
  COUNT(*) as total_queries,
  AVG(response_time_ms) as avg_response_time,
  SUM(CASE WHEN query_type = 'rag' THEN 1 ELSE 0 END) as rag_queries,
  SUM(CASE WHEN query_type = 'commission' THEN 1 ELSE 0 END) as commission_queries
FROM query_logs
WHERE timestamp > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- Content Access Patterns
CREATE OR REPLACE VIEW content_access_patterns AS
SELECT
  d.id,
  d.title,
  d.access_level,
  d.required_role,
  d.required_tier,
  COUNT(DISTINCT ql.id) as access_count,
  COUNT(DISTINCT ql.user_id) as unique_users,
  COUNT(DISTINCT ql.kakao_user_id) as unique_kakao_users,
  AVG(ql.response_time_ms) as avg_response_time,
  MAX(ql.timestamp) as last_accessed
FROM documents d
LEFT JOIN query_logs ql ON ql.metadata->>'document_id' = d.id::text
WHERE d.created_at > NOW() - INTERVAL '90 days'
GROUP BY d.id, d.title, d.access_level, d.required_role, d.required_tier
ORDER BY access_count DESC;

-- RBAC Policy Effectiveness
CREATE OR REPLACE VIEW rbac_policy_effectiveness AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  COUNT(*) as total_checks,
  SUM(CASE WHEN metadata->>'access_denied' = 'true' THEN 1 ELSE 0 END) as denied,
  SUM(CASE WHEN metadata->>'access_denied' = 'false' THEN 1 ELSE 0 END) as allowed,
  ROUND(100.0 * SUM(CASE WHEN metadata->>'access_denied' = 'false' THEN 1 ELSE 0 END) / COUNT(*), 2) as allowance_rate
FROM query_logs
WHERE timestamp > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- Query Performance Stats
CREATE OR REPLACE VIEW query_performance_stats AS
SELECT
  query_type,
  COUNT(*) as query_count,
  AVG(response_time_ms) as avg_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_time,
  MAX(response_time_ms) as max_time
FROM query_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query_type;
```

### Step 2: Analytics Services (Day 2)
**File:** `lib/services/analytics/analytics-advanced.service.ts`

```typescript
import { createServerClient } from '@/lib/supabase/server';

export class AdvancedAnalyticsService {
  async getOverviewMetrics(timeRange: '7d' | '30d' | '90d' = '7d') {
    const supabase = createServerClient();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    // Parallel queries for efficiency
    const [users, queries, performance, rbac] = await Promise.all([
      this.getUserMetrics(daysAgo),
      this.getQueryMetrics(daysAgo),
      this.getPerformanceMetrics(daysAgo),
      this.getRBACMetrics(daysAgo)
    ]);

    return { users, queries, performance, rbac, timeRange };
  }

  private async getUserMetrics(daysAgo: number) {
    const supabase = createServerClient();

    const { data, error } = await supabase.rpc('get_user_analytics', {
      days_ago: daysAgo
    });

    if (error) throw error;
    return data;
  }

  // ... more methods
}
```

### Step 3: API Endpoints (Day 3)
**File:** `app/api/analytics/overview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AdvancedAnalyticsService } from '@/lib/services/analytics/analytics-advanced.service';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'ceo'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') as '7d' | '30d' | '90d' || '7d';

    // Fetch analytics
    const analyticsService = new AdvancedAnalyticsService();
    const metrics = await analyticsService.getOverviewMetrics(timeRange);

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
```

### Step 4: UI Components (Day 4)
**File:** `components/admin/analytics/overview-metrics.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, MessageSquare, Clock } from 'lucide-react';

interface OverviewMetricsProps {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalQueries: number;
    avgResponseTime: number;
  };
  previousMetrics?: {
    totalUsers: number;
    activeUsers: number;
    totalQueries: number;
    avgResponseTime: number;
  };
}

export function OverviewMetrics({ metrics, previousMetrics }: OverviewMetricsProps) {
  const calculateChange = (current: number, previous?: number) => {
    if (!previous) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Users"
        value={metrics.totalUsers}
        change={calculateChange(metrics.totalUsers, previousMetrics?.totalUsers)}
        icon={Users}
      />
      <MetricCard
        title="Active Users"
        value={metrics.activeUsers}
        change={calculateChange(metrics.activeUsers, previousMetrics?.activeUsers)}
        icon={TrendingUp}
      />
      <MetricCard
        title="Total Queries"
        value={metrics.totalQueries}
        change={calculateChange(metrics.totalQueries, previousMetrics?.totalQueries)}
        icon={MessageSquare}
      />
      <MetricCard
        title="Avg Response Time"
        value={`${metrics.avgResponseTime}ms`}
        change={calculateChange(metrics.avgResponseTime, previousMetrics?.avgResponseTime)}
        icon={Clock}
        invertChange
      />
    </div>
  );
}

// ... MetricCard component
```

### Step 5: Main Analytics Page (Day 5)
**File:** `app/admin/analytics/page.tsx`

```typescript
import { Suspense } from 'react';
import { OverviewMetrics } from '@/components/admin/analytics/overview-metrics';
import { UserBehaviorChart } from '@/components/admin/analytics/user-behavior-chart';
import { ContentHeatmap } from '@/components/admin/analytics/content-heatmap';
import { QueryPerformanceChart } from '@/components/admin/analytics/query-performance-chart';
import { RBACEffectiveness } from '@/components/admin/analytics/rbac-effectiveness';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced system analytics and insights
          </p>
        </div>

        {/* Time Range Selector */}
        <TimeRangeSelector />
      </div>

      {/* Overview Metrics */}
      <Suspense fallback={<MetricsSkeleton />}>
        <OverviewMetrics />
      </Suspense>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="rbac">Access Control</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Suspense fallback={<ChartSkeleton />}>
            <UserBehaviorChart />
          </Suspense>
        </TabsContent>

        <TabsContent value="content">
          <Suspense fallback={<ChartSkeleton />}>
            <ContentHeatmap />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance">
          <Suspense fallback={<ChartSkeleton />}>
            <QueryPerformanceChart />
          </Suspense>
        </TabsContent>

        <TabsContent value="rbac">
          <Suspense fallback={<ChartSkeleton />}>
            <RBACEffectiveness />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 📊 Chart Library Setup

### Install Dependencies
```bash
# Already installed in Phase 3
npm install recharts
npm install @tremor/react  # Optional: for advanced charts
```

### Chart Components
```typescript
// User Activity Line Chart
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={activityData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="activeUsers" stroke="#8884d8" />
    <Line type="monotone" dataKey="queries" stroke="#82ca9d" />
  </LineChart>
</ResponsiveContainer>

// Content Access Heatmap
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={contentAccessData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="document" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="accessCount" fill="#8884d8" />
  </BarChart>
</ResponsiveContainer>

// Performance Distribution
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={performanceData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="time" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="p50" fill="#8884d8" stroke="#8884d8" />
    <Area type="monotone" dataKey="p95" fill="#82ca9d" stroke="#82ca9d" />
  </AreaChart>
</ResponsiveContainer>
```

---

## 🧪 Testing Plan

### Unit Tests
```typescript
// lib/services/analytics/__tests__/analytics-advanced.service.test.ts
describe('AdvancedAnalyticsService', () => {
  it('should calculate user metrics correctly', async () => {
    const service = new AdvancedAnalyticsService();
    const metrics = await service.getUserMetrics(7);
    expect(metrics.activeUsers7d).toBeGreaterThanOrEqual(0);
  });

  it('should handle timeRange parameter', async () => {
    const service = new AdvancedAnalyticsService();
    const metrics7d = await service.getOverviewMetrics('7d');
    const metrics30d = await service.getOverviewMetrics('30d');
    expect(metrics30d.users.totalUsers).toBeGreaterThanOrEqual(metrics7d.users.totalUsers);
  });
});
```

### Integration Tests
```typescript
// Test API endpoints
describe('Analytics API', () => {
  it('GET /api/analytics/overview returns metrics for admin', async () => {
    const response = await fetch('/api/analytics/overview', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('queries');
  });

  it('GET /api/analytics/overview returns 403 for non-admin', async () => {
    const response = await fetch('/api/analytics/overview', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    expect(response.status).toBe(403);
  });
});
```

---

## 📋 Checklist

### Database Layer
- [ ] Create analytics views SQL migration
- [ ] Create database functions for aggregations
- [ ] Add indexes for analytics queries
- [ ] Test view performance with sample data
- [ ] Document view usage

### Service Layer
- [ ] Implement `AdvancedAnalyticsService`
- [ ] Implement `UserAnalyticsService`
- [ ] Implement `ContentAnalyticsService`
- [ ] Implement `PerformanceAnalyticsService`
- [ ] Implement `RBACAnalyticsService`
- [ ] Add caching for expensive queries
- [ ] Write unit tests

### API Layer
- [ ] Create `/api/analytics/overview` endpoint
- [ ] Create `/api/analytics/users` endpoint
- [ ] Create `/api/analytics/content` endpoint
- [ ] Create `/api/analytics/performance` endpoint
- [ ] Create `/api/analytics/rbac` endpoint
- [ ] Add admin-only access control
- [ ] Add rate limiting
- [ ] Write integration tests

### UI Layer
- [ ] Create `OverviewMetrics` component
- [ ] Create `UserBehaviorChart` component
- [ ] Create `ContentHeatmap` component
- [ ] Create `QueryPerformanceChart` component
- [ ] Create `RBACEffectiveness` component
- [ ] Create `TimeRangeSelector` component
- [ ] Create `ExportReport` component
- [ ] Add loading states
- [ ] Add error handling
- [ ] Make responsive

### Testing & Documentation
- [ ] Write unit tests for services
- [ ] Write integration tests for APIs
- [ ] Test with real data
- [ ] Test performance with large datasets
- [ ] Create user guide for analytics
- [ ] Document metrics definitions
- [ ] Create admin training materials

---

## 🚀 Success Criteria

### Performance
- ✅ Analytics queries complete < 2 seconds
- ✅ Dashboard loads < 3 seconds
- ✅ Real-time updates < 1 second delay
- ✅ No N+1 queries in analytics endpoints

### Functionality
- ✅ All metrics calculate correctly
- ✅ Charts render properly on all screen sizes
- ✅ Export functionality works for CSV/PDF
- ✅ Time range selector updates all charts
- ✅ Admin-only access enforced

### User Experience
- ✅ Dashboard is intuitive and easy to navigate
- ✅ Metrics are clearly labeled and explained
- ✅ Visualizations are meaningful and actionable
- ✅ Loading states provide clear feedback
- ✅ Errors are handled gracefully

---

## 📚 Resources

### Documentation
- [Recharts Documentation](https://recharts.org/)
- [Tremor Documentation](https://tremor.so/docs)
- [PostgreSQL Analytics Queries](https://www.postgresql.org/docs/current/functions-aggregate.html)

### Design Inspiration
- [PostHog Analytics](https://posthog.com/)
- [Amplitude Analytics](https://amplitude.com/)
- [Mixpanel Dashboard](https://mixpanel.com/)

---

**Status:** 🎯 Ready to implement
**Next Action:** Start with Step 1 (Database Views & Functions)
**Estimated Completion:** 5 days
