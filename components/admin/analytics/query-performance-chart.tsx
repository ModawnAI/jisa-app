/**
 * Query Performance Chart Component
 * Displays performance metrics and response time distribution
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PerformanceMetrics } from '@/lib/services/analytics';

interface QueryPerformanceChartProps {
  metrics: PerformanceMetrics;
  loading?: boolean;
}

export function QueryPerformanceChart({ metrics, loading = false }: QueryPerformanceChartProps) {
  // Transform performance data for chart
  const chartData = metrics.performanceByType.map((stat) => ({
    type: stat.queryType.toUpperCase(),
    avg: stat.avgTime,
    p50: stat.p50Time,
    p95: stat.p95Time,
    p99: stat.p99Time,
    count: stat.queryCount,
  }));

  // Overall percentile data
  const percentileData = [
    { name: 'Average', value: metrics.avgResponseTime },
    { name: 'P50', value: metrics.p50ResponseTime },
    { name: 'P95', value: metrics.p95ResponseTime },
    { name: 'P99', value: metrics.p99ResponseTime },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Query Performance Distribution</CardTitle>
            <CardDescription>Response time percentiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Distribution</CardTitle>
          <CardDescription>Overall system response time percentiles</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={percentileData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="ms" />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by Query Type */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Query Type</CardTitle>
            <CardDescription>Response times for RAG and Commission queries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="ms" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [`${value} queries`, 'Query Count'];
                    return [`${value.toFixed(0)}ms`, name.toUpperCase()];
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Average"
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="P95"
                />
                <Line
                  type="monotone"
                  dataKey="p99"
                  stroke="#ffc658"
                  strokeWidth={2}
                  name="P99"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Summary Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {chartData.map((stat) => (
                <div key={stat.type} className="space-y-1">
                  <div className="font-medium">{stat.type}</div>
                  <div className="text-muted-foreground">
                    {stat.count} queries • Avg: {stat.avg.toFixed(0)}ms • P95: {stat.p95.toFixed(0)}ms
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
