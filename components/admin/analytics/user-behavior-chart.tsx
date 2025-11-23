/**
 * User Behavior Chart Component
 * Displays user activity trends over time
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { UserMetrics } from '@/lib/services/analytics';

interface UserBehaviorChartProps {
  metrics: UserMetrics;
  loading?: boolean;
}

export function UserBehaviorChart({ metrics, loading = false }: UserBehaviorChartProps) {
  // Transform cohort data for chart
  const chartData = metrics.cohortRetention.map((cohort) => ({
    month: cohort.cohortMonth,
    activeUsers: cohort.activeUsers,
    retentionRate: cohort.retentionRate,
    totalUsers: cohort.totalUsers,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>사용자 활동 추이</CardTitle>
          <CardDescription>시간에 따른 활성 사용자 및 유지율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>사용자 활동 추이</CardTitle>
          <CardDescription>시간에 따른 활성 사용자 및 유지율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>사용자 활동 추이</CardTitle>
        <CardDescription>시간에 따른 활성 사용자 및 유지율</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year.slice(2)}`;
              }}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'retentionRate') return `${value.toFixed(1)}%`;
                return value;
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="activeUsers"
              stroke="#8884d8"
              strokeWidth={2}
              name="활성 사용자"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="retentionRate"
              stroke="#82ca9d"
              strokeWidth={2}
              name="유지율 (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
