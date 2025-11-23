/**
 * Content Heatmap Component
 * Displays popular content access patterns
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ContentMetrics } from '@/lib/services/analytics';

interface ContentHeatmapProps {
  metrics: ContentMetrics;
  loading?: boolean;
}

export function ContentHeatmap({ metrics, loading = false }: ContentHeatmapProps) {
  // Transform top documents for chart
  const chartData = metrics.topDocuments.slice(0, 10).map((doc) => ({
    title: doc.title.length > 30 ? doc.title.substring(0, 30) + '...' : doc.title,
    accessCount: doc.accessCount,
    uniqueUsers: doc.uniqueUsers,
    level: doc.accessLevel,
  }));

  // Color coding by access level
  const getColor = (level: string) => {
    const colors: Record<string, string> = {
      L1_PUBLIC: '#22c55e',
      L2_BASIC: '#3b82f6',
      L3_INTERNAL: '#a855f7',
      L4_SENSITIVE: '#f97316',
      L5_CONFIDENTIAL: '#ef4444',
      L6_RESTRICTED: '#dc2626',
    };
    return colors[level] || '#8884d8';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>콘텐츠 접근 패턴</CardTitle>
          <CardDescription>사용자가 가장 많이 접근한 콘텐츠</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>콘텐츠 접근 패턴</CardTitle>
          <CardDescription>사용자가 가장 많이 접근한 콘텐츠</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            콘텐츠 접근 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>콘텐츠 접근 패턴</CardTitle>
        <CardDescription>상위 10개 접근 문서 (접근 레벨별 색상)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="title"
              width={150}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'accessCount') return [`${value} 접근`, '전체 접근'];
                if (name === 'uniqueUsers') return [`${value} 사용자`, '고유 사용자'];
                return value;
              }}
            />
            <Legend />
            <Bar dataKey="accessCount" name="접근 수">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.level)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend for access levels */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span>L1 공개</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
            <span>L2 기본</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }} />
            <span>L3 내부</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }} />
            <span>L4 민감</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span>L5 기밀</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#dc2626' }} />
            <span>L6 제한</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
