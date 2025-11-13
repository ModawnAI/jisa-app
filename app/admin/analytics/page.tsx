/**
 * Analytics Dashboard Page
 * Comprehensive analytics view with real-time metrics
 * Route: /admin/analytics
 */

'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TimeRangeSelector,
  OverviewMetrics,
  UserBehaviorChart,
  ContentHeatmap,
  QueryPerformanceChart,
  RBACEffectiveness,
  ExportReport,
  SystemHealthBadge,
} from '@/components/admin/analytics';
import type { OverviewMetrics as OverviewMetricsType, TimeRange } from '@/lib/services/analytics';
import { Loader2, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [metrics, setMetrics] = useState<OverviewMetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/analytics/overview?timeRange=${timeRange}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analytics');
        }

        const data = await response.json();
        setMetrics(data.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Advanced system analytics and insights
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-red-500 text-center">
            <p className="text-lg font-medium">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced system analytics and insights
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SystemHealthBadge />
          {metrics && <ExportReport timeRange={timeRange} />}
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
          />
        </div>
      </div>

      {/* Overview Metrics Section */}
      {loading && !metrics ? (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      ) : metrics ? (
        <>
          <OverviewMetrics metrics={metrics} loading={loading} />

          {/* Detailed Analytics Tabs */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">
                <TrendingUp className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="content">
                Content
              </TabsTrigger>
              <TabsTrigger value="performance">
                Performance
              </TabsTrigger>
              <TabsTrigger value="rbac">
                Access Control
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <UserBehaviorChart metrics={metrics.users} loading={loading} />

              {/* User Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">User Distribution by Role</h3>
                  <div className="space-y-2">
                    {Object.entries(metrics.users.usersByRole).map(([role, count]) => (
                      <div key={role} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{role}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">User Distribution by Tier</h3>
                  <div className="space-y-2">
                    {Object.entries(metrics.users.usersByTier).map(([tier, count]) => (
                      <div key={tier} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{tier}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <ContentHeatmap metrics={metrics.queries} loading={loading} />

              {/* Content Gaps */}
              {metrics.queries.queriesWithNoResults.length > 0 && (
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">Content Gaps</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Queries that returned no or poor results
                  </p>
                  <div className="space-y-2">
                    {metrics.queries.queriesWithNoResults.slice(0, 10).map((gap, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0">
                        <span className="text-muted-foreground">{gap.queryText}</span>
                        <span className="font-medium">{gap.frequency} times</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Underutilized Content */}
              {metrics.queries.underutilizedContent.length > 0 && (
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">Underutilized Content</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Documents with low access counts
                  </p>
                  <div className="space-y-2">
                    {metrics.queries.underutilizedContent.slice(0, 10).map((doc, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0">
                        <span className="text-muted-foreground">{doc.title}</span>
                        <span className="font-medium">{doc.accessCount} accesses</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <QueryPerformanceChart metrics={metrics.performance} loading={loading} />

              {/* Performance Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">Query Types</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">RAG Queries</span>
                      <span className="font-medium">{metrics.performance.ragQueryCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission Queries</span>
                      <span className="font-medium">{metrics.performance.commissionQueryCount}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">Average Times</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">RAG Avg</span>
                      <span className="font-medium">{metrics.performance.avgRagTime}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission Avg</span>
                      <span className="font-medium">{metrics.performance.avgCommissionTime}ms</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">System Health</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{metrics.performance.uptime.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span className="font-medium">{metrics.performance.errorRate.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rbac" className="space-y-4">
              <RBACEffectiveness metrics={metrics.rbac} loading={loading} />
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-8 border-t">
        Last updated: {metrics ? new Date(metrics.lastUpdated).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}
