'use client';

/**
 * Subscription Manager Component
 * Handles plan upgrades, downgrades, and billing cycle changes
 */

import { useState, useEffect } from 'react';

interface PricingTier {
  tier: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
}

interface SubscriptionManagerProps {
  currentTier: string;
  currentCycle: 'monthly' | 'yearly';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubscriptionManager({
  currentTier,
  currentCycle,
  onSuccess,
  onCancel,
}: SubscriptionManagerProps) {
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>(currentCycle);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/pricing');
      if (!response.ok) throw new Error('Failed to fetch pricing');

      const data = await response.json();
      setPricing(data.pricing || []);
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setError('가격 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (selectedTier === currentTier && selectedCycle === currentCycle) {
      alert('현재 플랜과 동일합니다.');
      return;
    }

    if (!confirm(`${getTierName(selectedTier)} 플랜으로 변경하시겠습니까?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_tier: selectedTier,
          billing_cycle: selectedCycle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change plan');
      }

      const data = await response.json();

      if (data.charged_amount) {
        alert(`플랜이 업그레이드되었습니다. 일할 계산 금액: ${formatAmount(data.charged_amount)}원이 청구되었습니다.`);
      } else if (data.effective_date) {
        alert(`플랜 변경이 예약되었습니다. ${new Date(data.effective_date).toLocaleDateString('ko-KR')}에 적용됩니다.`);
      } else {
        alert('플랜이 변경되었습니다.');
      }

      onSuccess?.();
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError(err instanceof Error ? err.message : '플랜 변경에 실패했습니다');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getTierName = (tier: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      basic: 'Basic',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return names[tier] || tier;
  };

  const getTierOrder = (tier: string) => {
    const order: Record<string, number> = {
      free: 0,
      basic: 1,
      pro: 2,
      enterprise: 3,
    };
    return order[tier] || 0;
  };

  const isUpgrade = getTierOrder(selectedTier) > getTierOrder(currentTier);
  const isDowngrade = getTierOrder(selectedTier) < getTierOrder(currentTier);
  const isCycleChange = selectedTier === currentTier && selectedCycle !== currentCycle;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 주기</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedCycle('monthly')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
              selectedCycle === 'monthly'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setSelectedCycle('yearly')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
              selectedCycle === 'yearly'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            <div>연간 결제</div>
            <div className="text-sm text-green-600 font-semibold">약 17% 절약</div>
          </button>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricing.map((tier) => {
          const price =
            selectedCycle === 'monthly'
              ? tier.monthly_price
              : tier.yearly_price;
          const isCurrentPlan = tier.tier === currentTier && selectedCycle === currentCycle;
          const isSelected = tier.tier === selectedTier;

          return (
            <div
              key={tier.tier}
              className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setSelectedTier(tier.tier)}
            >
              {isCurrentPlan && (
                <div className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mb-3">
                  현재 플랜
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {tier.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  {price === 0 ? '무료' : `₩${formatAmount(price)}`}
                </span>
                {price > 0 && (
                  <span className="text-gray-600 text-sm">
                    / {selectedCycle === 'monthly' ? '월' : '년'}
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {tier.features?.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Change Information */}
      {(isUpgrade || isDowngrade || isCycleChange) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {isUpgrade && '업그레이드 시 일할 계산된 금액이 즉시 청구됩니다.'}
            {isDowngrade && '다운그레이드는 현재 결제 기간이 끝날 때 적용됩니다.'}
            {isCycleChange && !isUpgrade && !isDowngrade && '결제 주기는 다음 결제 시 적용됩니다.'}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleUpgrade}
          disabled={processing || (selectedTier === currentTier && selectedCycle === currentCycle)}
          className="flex-1 px-6 py-3 text-white bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {processing ? '처리 중...' : isUpgrade ? '업그레이드' : isDowngrade ? '다운그레이드' : '변경하기'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={processing}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
