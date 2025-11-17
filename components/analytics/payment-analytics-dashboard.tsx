'use client';

/**
 * Payment Analytics Dashboard Component
 * 청구 관리 및 분석 대시보드
 * Per-seat billing system dashboard
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
import { DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface BillingStats {
  revenue: {
    total: number;
    pending: number;
    overdue: number;
    estimated_mrr: number;
  };
  current_month: {
    total_invoices: number;
    total_active_users: number;
    total_amount: number;
    tier_distribution: Record<string, number>;
  };
  trends: {
    active_users: Array<{
      billing_month: string;
      active_users: number;
      billable_users: number;
    }>;
    revenue_by_month: Array<{
      month: string;
      amount: number;
    }>;
  };
  invoice_status: Record<string, number>;
  active_companies: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function PaymentAnalyticsDashboard() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingStats();
  }, []);

  const fetchBillingStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/billing/stats');

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('관리자 권한이 필요합니다');
        }
        throw new Error('청구 데이터를 불러오지 못했습니다');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error('Error fetching billing stats:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
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
      free: '무료',
      basic: '베이직',
      pro: '프로',
      enterprise: '엔터프라이즈',
    };
    return names[tier] || tier;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '임시저장',
      pending: '대기',
      sent: '발송됨',
      paid: '지급완료',
      partial: '부분지급',
      overdue: '연체',
      cancelled: '취소',
      refunded: '환불',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">청구 데이터를 불러오는 중...</span>
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
            onClick={fetchBillingStats}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const tierChartData = Object.entries(stats.current_month.tier_distribution).map(
    ([tier, count]) => ({
      name: getTierDisplayName(tier),
      value: count,
    })
  );

  const statusChartData = Object.entries(stats.invoice_status).map(
    ([status, count]) => ({
      name: getStatusLabel(status),
      count,
    })
  );

  const revenueChartData = stats.trends.revenue_by_month
    .slice()
    .reverse()
    .map((item) => ({
      date: format(new Date(item.month), 'MM월', { locale: ko }),
      revenue: item.amount,
    }));

  const activeUsersChartData = stats.trends.active_users
    .slice()
    .reverse()
    .map((item) => ({
      date: format(new Date(item.billing_month), 'MM월', { locale: ko }),
      active: item.active_users,
      billable: item.billable_users,
    }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">예상 MRR</p>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(stats.revenue.estimated_mrr)}
          </p>
          <p className="text-xs text-gray-500 mt-1">월간 반복 수익</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">총 수익</p>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(stats.revenue.total)}
          </p>
          <p className="text-xs text-gray-500 mt-1">지급완료</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">미수금</p>
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {formatAmount(stats.revenue.pending)}
          </p>
          <p className="text-xs text-gray-500 mt-1">대기 + 발송됨</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">활성 회사</p>
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.active_companies}
          </p>
          <p className="text-xs text-gray-500 mt-1">구독 중</p>
        </div>
      </div>

      {/* Current Month Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          당월 청구 현황
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">인보이스 수</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.current_month.total_invoices}건
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">활성 사용자</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.current_month.total_active_users}명
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">당월 청구액</p>
            <p className="text-xl font-bold text-gray-900">
              {formatAmount(stats.current_month.total_amount)}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          월별 수익 추이
        </h3>
        {revenueChartData.length > 0 ? (
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
        ) : (
          <p className="text-center text-gray-500 py-12">데이터가 없습니다</p>
        )}
      </div>

      {/* Active Users Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          월별 활성 사용자 추이
        </h3>
        {activeUsersChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activeUsersChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip labelStyle={{ color: '#111827' }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#10B981"
                strokeWidth={2}
                name="활성 사용자"
              />
              <Line
                type="monotone"
                dataKey="billable"
                stroke="#3B82F6"
                strokeWidth={2}
                name="청구 대상"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-12">데이터가 없습니다</p>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            지식 레벨별 사용자 분포
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

        {/* Invoice Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            인보이스 상태별 분포
          </h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusChartData}>
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
    </div>
  );
}
