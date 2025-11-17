/**
 * Subscription Pricing API
 * Public endpoint to get available subscription plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all active pricing tiers
    const { data: pricing, error } = await supabase
      .from('subscription_pricing')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching pricing:', error);
      // Return mock pricing data on error
      return NextResponse.json({ pricing: MOCK_PRICING });
    }

    // If no pricing data found, return mock data
    if (!pricing || pricing.length === 0) {
      return NextResponse.json({ pricing: MOCK_PRICING });
    }

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('GET /api/subscriptions/pricing error:', error);
    // Return mock pricing data on error
    return NextResponse.json({ pricing: MOCK_PRICING });
  }
}

// Mock pricing data for fallback
const MOCK_PRICING = [
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
    is_active: true,
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
    is_active: true,
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
    is_active: true,
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
    is_active: true,
    sort_order: 4,
  },
];
