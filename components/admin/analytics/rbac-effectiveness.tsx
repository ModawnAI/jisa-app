/**
 * RBAC Effectiveness Component
 * Displays access control metrics and policy effectiveness
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RBACMetrics } from '@/lib/services/analytics';

interface RBACEffectivenessProps {
  metrics: RBACMetrics;
  loading?: boolean;
}

export function RBACEffectiveness({ metrics, loading = false }: RBACEffectivenessProps) {
  // Access by role data
  const roleData = Object.entries(metrics.contentAccessByRole).map(([role, pattern]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    allowed: pattern.allowedAccess,
    denied: pattern.deniedAccess,
    total: pattern.totalAccess,
    rate: pattern.allowanceRate,
  }));

  // Access by tier data
  const tierData = Object.entries(metrics.contentAccessByTier).map(([tier, pattern]) => ({
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    allowed: pattern.allowedAccess,
    denied: pattern.deniedAccess,
    total: pattern.totalAccess,
    rate: pattern.allowanceRate,
  }));

  // Overall access distribution
  const accessDistribution = [
    { name: 'Allowed', value: metrics.allowedAccess, color: '#22c55e' },
    { name: 'Denied', value: metrics.deniedAccess, color: '#ef4444' },
  ];

  // Access by level data
  const levelData = Object.entries(metrics.accessByLevel).map(([level, count]) => ({
    level: level.replace('_', ' '),
    count,
    denied: metrics.denialsByLevel[level as keyof typeof metrics.denialsByLevel] || 0,
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Control Effectiveness</CardTitle>
            <CardDescription>RBAC policy performance</CardDescription>
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
      {/* Overall Access Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Access Distribution</CardTitle>
            <CardDescription>Allowed vs Denied access</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={accessDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {accessDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} accesses`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center">
              <div className="text-2xl font-bold">{metrics.allowanceRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Overall Allowance Rate</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Summary</CardTitle>
            <CardDescription>Total access checks and outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Checks</span>
                <span className="font-medium">{metrics.totalAccessChecks.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Allowed Access</span>
                <span className="font-medium text-green-600">
                  {metrics.allowedAccess.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Denied Access</span>
                <span className="font-medium text-red-600">
                  {metrics.deniedAccess.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Policy Utilization</div>
              <div className="space-y-2">
                {metrics.policyUtilization.slice(0, 5).map((policy) => (
                  <div key={policy.policyName} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{policy.policyName}</span>
                    <span>{policy.applicationCount} uses</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Access Patterns by Role</CardTitle>
          <CardDescription>Allowed and denied access by user role</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="allowed" fill="#22c55e" name="Allowed" />
              <Bar dataKey="denied" fill="#ef4444" name="Denied" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Access by Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Access Patterns by Subscription Tier</CardTitle>
          <CardDescription>Allowed and denied access by subscription level</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="allowed" fill="#22c55e" name="Allowed" />
              <Bar dataKey="denied" fill="#ef4444" name="Denied" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Access by Level */}
      <Card>
        <CardHeader>
          <CardTitle>Access by Content Level</CardTitle>
          <CardDescription>Access patterns across different security levels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={levelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Total Access" />
              <Bar dataKey="denied" fill="#ef4444" name="Denied" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
