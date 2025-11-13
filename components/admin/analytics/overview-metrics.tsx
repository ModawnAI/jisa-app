/**
 * Overview Metrics Component
 * Displays top-level KPI cards
 */

'use client';

import { Users, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import { MetricCard } from './metric-card';
import type { OverviewMetrics } from '@/lib/services/analytics';

interface OverviewMetricsProps {
  metrics: OverviewMetrics;
  loading?: boolean;
}

export function OverviewMetrics({ metrics, loading = false }: OverviewMetricsProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Users"
        value={formatNumber(metrics.users.totalUsers)}
        icon={Users}
        loading={loading}
      />

      <MetricCard
        title="Active Users (7d)"
        value={formatNumber(metrics.users.activeUsers7d)}
        icon={Users}
        loading={loading}
      />

      <MetricCard
        title="Total Queries"
        value={formatNumber(metrics.queries.totalQueries)}
        icon={MessageSquare}
        loading={loading}
      />

      <MetricCard
        title="Avg Response Time"
        value={formatTime(metrics.performance.avgResponseTime)}
        icon={Clock}
        invertChange
        loading={loading}
      />

      <MetricCard
        title="Documents Accessed"
        value={formatNumber(metrics.queries.uniqueDocumentsAccessed)}
        icon={MessageSquare}
        loading={loading}
      />

      <MetricCard
        title="Access Allowance Rate"
        value={`${metrics.rbac.allowanceRate.toFixed(1)}%`}
        icon={ShieldCheck}
        loading={loading}
      />

      <MetricCard
        title="Error Rate"
        value={`${metrics.performance.errorRate.toFixed(2)}%`}
        icon={Clock}
        invertChange
        loading={loading}
      />

      <MetricCard
        title="System Uptime"
        value={`${metrics.performance.uptime.toFixed(1)}%`}
        icon={ShieldCheck}
        loading={loading}
      />
    </div>
  );
}
