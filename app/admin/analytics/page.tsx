/**
 * 분석 대시보드 페이지
 * 실시간 메트릭을 포함한 종합 분석 뷰
 * Route: /admin/analytics
 */

'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
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
import { Loader2, TrendingUp, FileText, Gauge, Shield } from 'lucide-react';

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
          throw new Error(errorData.error || '분석 데이터를 불러오는데 실패했습니다');
        }

        const data = await response.json();
        setMetrics(data.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : '분석 데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: '사용자',
      junior: '주니어',
      senior: '시니어',
      manager: '관리자',
      admin: '총괄 관리자',
      ceo: '대표이사',
    };
    return labels[role] || role;
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      free: '무료',
      basic: '베이직',
      pro: '프로',
      enterprise: '엔터프라이즈',
    };
    return labels[tier] || tier;
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">분석</h1>
            <p className="mt-2 text-sm text-gray-600">
              시스템 분석 및 인사이트
            </p>
          </div>

          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="text-red-500 text-center">
              <p className="text-lg font-medium">분석 데이터를 불러오지 못했습니다</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">분석</h1>
            <p className="mt-2 text-sm text-gray-600">
              시스템 분석 및 인사이트
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
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <p className="text-gray-600">분석 데이터 로딩 중...</p>
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
                  사용자
                </TabsTrigger>
                <TabsTrigger value="content">
                  <FileText className="h-4 w-4 mr-2" />
                  콘텐츠
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <Gauge className="h-4 w-4 mr-2" />
                  성능
                </TabsTrigger>
                <TabsTrigger value="rbac">
                  <Shield className="h-4 w-4 mr-2" />
                  접근 제어
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <UserBehaviorChart metrics={metrics.users} loading={loading} />

                {/* User Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">역할별 사용자 분포</h3>
                    <div className="space-y-2">
                      {Object.entries(metrics.users.usersByRole).map(([role, count]) => (
                        <div key={role} className="flex justify-between text-sm">
                          <span className="text-gray-600">{getRoleLabel(role)}</span>
                          <span className="font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">구독 티어별 사용자 분포</h3>
                    <div className="space-y-2">
                      {Object.entries(metrics.users.usersByTier).map(([tier, count]) => (
                        <div key={tier} className="flex justify-between text-sm">
                          <span className="text-gray-600">{getTierLabel(tier)}</span>
                          <span className="font-medium text-gray-900">{count}</span>
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
                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">콘텐츠 부족 영역</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      결과가 없거나 부족한 쿼리
                    </p>
                    <div className="space-y-2">
                      {metrics.queries.queriesWithNoResults.slice(0, 10).map((gap, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b border-gray-200 pb-2 last:border-0">
                          <span className="text-gray-600">{gap.queryText}</span>
                          <span className="font-medium text-gray-900">{gap.frequency}회</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Underutilized Content */}
                {metrics.queries.underutilizedContent.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">활용도가 낮은 콘텐츠</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      접근 횟수가 낮은 문서
                    </p>
                    <div className="space-y-2">
                      {metrics.queries.underutilizedContent.slice(0, 10).map((doc, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b border-gray-200 pb-2 last:border-0">
                          <span className="text-gray-600">{doc.title}</span>
                          <span className="font-medium text-gray-900">{doc.accessCount}회 접근</span>
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
                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">쿼리 유형</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">RAG 쿼리</span>
                        <span className="font-medium text-gray-900">{metrics.performance.ragQueryCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">커미션 쿼리</span>
                        <span className="font-medium text-gray-900">{metrics.performance.commissionQueryCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">평균 응답 시간</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">RAG 평균</span>
                        <span className="font-medium text-gray-900">{metrics.performance.avgRagTime}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">커미션 평균</span>
                        <span className="font-medium text-gray-900">{metrics.performance.avgCommissionTime}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">시스템 상태</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">가동률</span>
                        <span className="font-medium text-gray-900">{metrics.performance.uptime.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">오류율</span>
                        <span className="font-medium text-gray-900">{metrics.performance.errorRate.toFixed(2)}%</span>
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
        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          최종 업데이트: {metrics ? new Date(metrics.lastUpdated).toLocaleString('ko-KR') : 'N/A'}
        </div>
      </div>
    </DashboardLayout>
  );
}
