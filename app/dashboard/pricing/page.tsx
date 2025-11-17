'use client';

/**
 * Pricing Plans Page
 * Display subscription tiers and pricing options
 */

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PricingTier {
  id: string;
  tier: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_popular: boolean;
  sort_order: number;
}

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [currentTier, setCurrentTier] = useState<string>('free');

  useEffect(() => {
    fetchPricing();
    fetchCurrentSubscription();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/pricing');

      if (!response.ok) {
        // Use mock data if API fails
        setPricingTiers(MOCK_PRICING);
        return;
      }

      const data = await response.json();
      setPricingTiers(data.pricing || MOCK_PRICING);
    } catch (err) {
      console.error('Error fetching pricing:', err);
      // Use mock data on error
      setPricingTiers(MOCK_PRICING);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setCurrentTier(data.subscription?.tier || 'free');
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const handleSelectPlan = async (tier: string) => {
    if (tier === 'free') {
      alert('무료 플랜은 자동으로 제공됩니다.');
      return;
    }

    if (tier === currentTier) {
      router.push('/dashboard/billing');
      return;
    }

    try {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billing_cycle: billingCycle,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '구독 업그레이드에 실패했습니다');
      }

      alert('구독이 성공적으로 업그레이드되었습니다!');
      router.push('/dashboard/billing');
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'basic':
        return <Zap className="h-8 w-8" />;
      case 'pro':
        return <Crown className="h-8 w-8" />;
      case 'enterprise':
        return <Building2 className="h-8 w-8" />;
      default:
        return null;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic':
        return 'text-blue-600 bg-blue-100';
      case 'pro':
        return 'text-purple-600 bg-purple-100';
      case 'enterprise':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">요금제 선택</h1>
          <p className="mt-4 text-lg text-gray-600">
            비즈니스에 맞는 플랜을 선택하세요
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              연간 결제
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                20% 할인
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">불러오는 중...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingTiers.map((tier) => {
              const price = billingCycle === 'monthly' ? tier.price_monthly : tier.price_yearly;
              const isCurrentTier = tier.tier === currentTier;

              return (
                <div
                  key={tier.id}
                  className={`relative bg-white rounded-2xl border-2 p-8 ${
                    tier.is_popular
                      ? 'border-primary-600 shadow-xl scale-105'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-lg'
                  } transition-all`}
                >
                  {tier.is_popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        인기
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  {tier.tier !== 'free' && (
                    <div className={`mb-4 p-3 rounded-lg inline-flex ${getTierColor(tier.tier)}`}>
                      {getTierIcon(tier.tier)}
                    </div>
                  )}

                  {/* Tier Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{tier.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      <span className="ml-2 text-gray-600">
                        / {billingCycle === 'monthly' ? '월' : '년'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && price > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        월 {formatPrice(price / 12)}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(tier.tier)}
                    disabled={isCurrentTier}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                      isCurrentTier
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : tier.is_popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCurrentTier ? '현재 플랜' : tier.tier === 'free' ? '무료 시작' : '선택하기'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ or Additional Info */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            자주 묻는 질문
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">언제든지 플랜을 변경할 수 있나요?</h3>
              <p className="text-gray-600 text-sm">
                네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 변경사항은 즉시 적용됩니다.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">결제 방법은 무엇인가요?</h3>
              <p className="text-gray-600 text-sm">
                신용카드, 체크카드, 계좌이체를 지원합니다. 기업의 경우 세금계산서 발행이 가능합니다.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">환불 정책은 어떻게 되나요?</h3>
              <p className="text-gray-600 text-sm">
                서비스 사용 후 7일 이내에는 전액 환불이 가능합니다. 그 이후에는 남은 기간에 대해 일할 계산하여 환불해드립니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Mock pricing data for fallback
const MOCK_PRICING: PricingTier[] = [
  {
    id: '1',
    tier: 'free',
    name: 'Free',
    description: '개인 사용자를 위한 기본 플랜',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      '월 100개 쿼리',
      '기본 지식베이스 접근',
      '이메일 지원',
      '데이터 보관 30일',
    ],
    is_popular: false,
    sort_order: 1,
  },
  {
    id: '2',
    tier: 'basic',
    name: 'Basic',
    description: '소규모 팀을 위한 시작 플랜',
    price_monthly: 29000,
    price_yearly: 278400,
    features: [
      '월 1,000개 쿼리',
      '전체 지식베이스 접근',
      '우선 이메일 지원',
      '데이터 보관 90일',
      '기본 분석 대시보드',
      '팀 협업 (최대 5명)',
    ],
    is_popular: false,
    sort_order: 2,
  },
  {
    id: '3',
    tier: 'pro',
    name: 'Pro',
    description: '성장하는 비즈니스를 위한 플랜',
    price_monthly: 99000,
    price_yearly: 950400,
    features: [
      '월 10,000개 쿼리',
      '고급 지식베이스 접근',
      '24/7 채팅 지원',
      '데이터 무제한 보관',
      '고급 분석 및 리포트',
      '팀 협업 무제한',
      'API 접근',
      '맞춤 통합',
    ],
    is_popular: true,
    sort_order: 3,
  },
  {
    id: '4',
    tier: 'enterprise',
    name: 'Enterprise',
    description: '대규모 조직을 위한 맞춤 솔루션',
    price_monthly: 299000,
    price_yearly: 2870400,
    features: [
      '쿼리 무제한',
      '전용 지식베이스',
      '전담 계정 매니저',
      '온프레미스 배포 옵션',
      'SLA 보장',
      '고급 보안 기능',
      '맞춤 교육 및 온보딩',
      '우선 기능 개발',
    ],
    is_popular: false,
    sort_order: 4,
  },
];
