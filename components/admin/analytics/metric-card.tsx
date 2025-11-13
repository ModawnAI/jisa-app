/**
 * Metric Card Component
 * Displays a single metric with optional change indicator
 */

'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string | null;
  icon: LucideIcon;
  invertChange?: boolean; // For metrics where lower is better (e.g., response time)
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  invertChange = false,
  loading = false,
}: MetricCardProps) {
  const changeNum = change ? parseFloat(change) : null;
  const isPositive = changeNum !== null ? changeNum > 0 : null;
  const isImprovement = isPositive !== null
    ? (invertChange ? !isPositive : isPositive)
    : null;

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded mt-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== null && change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {isImprovement !== null && (
              <>
                {isImprovement ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
              </>
            )}
            <span className={isImprovement ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="ml-1">from previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
