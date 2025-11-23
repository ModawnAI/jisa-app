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
        title="전체 사용자"
        value={formatNumber(metrics.users.totalUsers)}
        icon={Users}
        loading={loading}
      />

      <MetricCard
        title="활성 사용자 (7일)"
        value={formatNumber(metrics.users.activeUsers7d)}
        icon={Users}
        loading={loading}
      />

      <MetricCard
        title="전체 쿼리"
        value={formatNumber(metrics.queries.totalQueries)}
        icon={MessageSquare}
        loading={loading}
      />

      <MetricCard
        title="평균 응답 시간"
        value={formatTime(metrics.performance.avgResponseTime)}
        icon={Clock}
        invertChange
        loading={loading}
      />

      <MetricCard
        title="접근한 문서"
        value={formatNumber(metrics.queries.uniqueDocumentsAccessed)}
        icon={MessageSquare}
        loading={loading}
      />

      <MetricCard
        title="접근 허용률"
        value={`${metrics.rbac.allowanceRate.toFixed(1)}%`}
        icon={ShieldCheck}
        loading={loading}
      />

      <MetricCard
        title="오류율"
        value={`${metrics.performance.errorRate.toFixed(2)}%`}
        icon={Clock}
        invertChange
        loading={loading}
      />

      <MetricCard
        title="시스템 가동률"
        value={`${metrics.performance.uptime.toFixed(1)}%`}
        icon={ShieldCheck}
        loading={loading}
      />
    </div>
  );
}
