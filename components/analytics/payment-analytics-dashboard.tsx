'use client';

/**
 * Payment Analytics Dashboard Component
 * Displays comprehensive payment and subscription metrics with charts
 */

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
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
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Analytics {
  overview: {
    mrr: number;
    totalRevenue: number;
    newSubscriptions: number;
    churnRate: number;
    successRate: number;
  };
  revenue: Array<{
    period: string;
    total_revenue: number;
    subscription_count: number;
    payment_count: number;
  }>;
  tierDistribution: Record<string, number>;
  paymentStats: {
    successful: number;
    failed: number;
    total: number;
  };
  topPaymentMethods: Record<string, number>;
  recentEvents: Array<{
    id: string;
    event_type: string;
    description: string;
    amount?: number;
    created_at: string;
    profiles?: {
      full_name?: string;
      email?: string;
    };
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function PaymentAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      const response = await fetch(`/api/analytics/payments?${params}`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('관리자 권한이 필요합니다');
        }
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getTierDisplayName = (tier: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      basic: 'Basic',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return names[tier] || tier;
  };

  const getPayMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      card: '카드',
      virtual_account: '가상계좌',
      transfer: '계좌이체',
      mobile: '휴대폰',
      easy_pay: '간편결제',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">분석 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="text-red-600 text-center">
          <p className="font-semibold mb-2">오류가 발생했습니다</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare chart data
  const tierChartData = Object.entries(analytics.tierDistribution).map(
    ([tier, count]) => ({
      name: getTierDisplayName(tier),
      value: count,
    })
  );

  const paymentMethodData = Object.entries(analytics.topPaymentMethods).map(
    ([method, count]) => ({
      name: getPayMethodLabel(method),
      count,
    })
  );

  const revenueChartData = analytics.revenue.map((item) => ({
    date: format(new Date(item.period), 'MM/dd', { locale: ko }),
    revenue: item.total_revenue,
    subscriptions: item.subscription_count,
  }));

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">결제 분석</h2>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
            <option value="365">최근 1년</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">MRR</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(analytics.overview.mrr)}
          </p>
          <p className="text-xs text-gray-500 mt-1">월간 반복 수익</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">총 수익</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(analytics.overview.totalRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">기간 내 총액</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">신규 구독</p>
          <p className="text-2xl font-bold text-green-600">
            +{analytics.overview.newSubscriptions}
          </p>
          <p className="text-xs text-gray-500 mt-1">기간 내</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">이탈률</p>
          <p className="text-2xl font-bold text-orange-600">
            {analytics.overview.churnRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">구독 취소율</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">결제 성공률</p>
          <p className="text-2xl font-bold text-blue-600">
            {analytics.overview.successRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {analytics.paymentStats.successful}/{analytics.paymentStats.total}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          수익 추이
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => formatAmount(value)}
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={2}
              name="수익"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            플랜별 구독 분포
          </h3>
          {tierChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">
              데이터가 없습니다
            </p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            결제 수단별 사용
          </h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="건수" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">
              데이터가 없습니다
            </p>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          최근 청구 이벤트
        </h3>
        <div className="space-y-3">
          {analytics.recentEvents.length > 0 ? (
            analytics.recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {event.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {event.profiles?.full_name || event.profiles?.email || '알 수 없음'} •{' '}
                    {format(
                      new Date(event.created_at),
                      'yyyy년 MM월 dd일 HH:mm',
                      { locale: ko }
                    )}
                  </p>
                </div>
                {event.amount !== undefined && (
                  <p className="text-sm font-semibold text-gray-900 ml-4">
                    {formatAmount(event.amount)}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-6">
              최근 이벤트가 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
