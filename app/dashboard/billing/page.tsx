'use client';

/**
 * Billing Dashboard Page
 * Central hub for subscription management, payment history, and billing analytics
 */

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { PaymentHistory } from '@/components/payment/payment-history';
import { InvoiceViewer } from '@/components/payment/invoice-viewer';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Subscription {
  id: string;
  tier: string;
  status: string;
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  subscription_pricing?: {
    name: string;
    description: string;
  };
}

export default function BillingDashboardPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'invoices'>('overview');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/subscriptions');
      if (!response.ok) throw new Error('Failed to fetch subscription');

      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('구독을 취소하시겠습니까? 현재 결제 기간이 끝나면 Free 플랜으로 변경됩니다.')) {
      return;
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      alert('구독이 취소되었습니다. 현재 결제 기간 종료 시까지 이용 가능합니다.');
      fetchSubscription();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert('구독 취소에 실패했습니다.');
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: subscription?.tier,
          billing_cycle: subscription?.billing_cycle,
        }),
      });

      if (!response.ok) throw new Error('Failed to reactivate subscription');

      alert('구독이 재활성화되었습니다.');
      fetchSubscription();
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      alert('구독 재활성화에 실패했습니다.');
    }
  };

  const formatAmount = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      past_due: 'bg-orange-100 text-orange-800',
      trialing: 'bg-blue-100 text-blue-800',
      paused: 'bg-gray-100 text-gray-800',
    };

    const labels: Record<string, string> = {
      active: '활성',
      cancelled: '취소됨',
      past_due: '연체',
      trialing: '체험중',
      paused: '일시중지',
    };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${badges[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">불러오는 중...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">결제 및 구독 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            구독 정보를 확인하고 결제 내역을 관리하세요
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              구독 현황
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              결제 내역
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              인보이스
            </button>
          </nav>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && (
          <>
            {/* Subscription Card */}
            {subscription ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {getTierDisplayName(subscription.tier)} 플랜
                      </h2>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <p className="text-gray-600">
                      {subscription.subscription_pricing?.description || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">
                      {formatAmount(subscription.amount, subscription.currency)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      / {subscription.billing_cycle === 'monthly' ? '월' : '년'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">현재 결제 기간</p>
                    <p className="text-gray-900 font-medium">
                      {format(new Date(subscription.current_period_start), 'yyyy년 MM월 dd일', { locale: ko })}
                      {' ~ '}
                      {format(new Date(subscription.current_period_end), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">다음 결제일</p>
                    <p className="text-gray-900 font-medium">
                      {subscription.cancel_at_period_end
                        ? '취소됨 - 다음 결제 없음'
                        : format(new Date(subscription.current_period_end), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      현재 결제 기간이 끝나면 Free 플랜으로 변경됩니다.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  {subscription.tier !== 'free' && !subscription.cancel_at_period_end && (
                    <>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        플랜 변경
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        구독 취소
                      </button>
                    </>
                  )}
                  {subscription.cancel_at_period_end && (
                    <button
                      onClick={handleReactivateSubscription}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      구독 재개
                    </button>
                  )}
                  {subscription.tier === 'free' && (
                    <button
                      onClick={() => window.location.href = '/dashboard/pricing'}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      업그레이드
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  구독이 없습니다
                </h3>
                <p className="text-gray-600 mb-6">
                  플랜을 선택하여 JISA의 모든 기능을 이용하세요
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard/pricing'}
                  className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  플랜 선택하기
                </button>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">총 결제 금액</p>
                <p className="text-2xl font-bold text-gray-900">₩0</p>
                <p className="text-xs text-gray-500 mt-1">누적</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">이번 달 결제</p>
                <p className="text-2xl font-bold text-gray-900">₩0</p>
                <p className="text-xs text-gray-500 mt-1">월별</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-1">다음 결제 예정</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subscription && !subscription.cancel_at_period_end
                    ? formatAmount(subscription.amount, subscription.currency)
                    : '₩0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">예정</p>
              </div>
            </div>
          </>
          )}

            {activeTab === 'history' && (
            <PaymentHistory showFilters={true} limit={20} />
          )}

          {activeTab === 'invoices' && (
          <>
            {selectedInvoiceId ? (
              <InvoiceViewer
                invoiceId={selectedInvoiceId}
                onClose={() => setSelectedInvoiceId(null)}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600">인보이스를 선택하세요</p>
              </div>
            )}
          </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
