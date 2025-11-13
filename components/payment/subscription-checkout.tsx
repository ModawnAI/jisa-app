'use client';

/**
 * Subscription Checkout Component
 * Handles PortOne V2 payment flow for subscriptions
 */

import { useState } from 'react';
import * as PortOne from '@portone/browser-sdk/v2';

interface SubscriptionCheckoutProps {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  userId: string;
  userEmail?: string;
  userName?: string;
}

export function SubscriptionCheckout({
  tier,
  billingCycle,
  userId,
  userEmail,
  userName,
}: SubscriptionCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricing: Record<string, { monthly: number; yearly: number }> = {
    free: { monthly: 0, yearly: 0 },
    basic: { monthly: 10000, yearly: 100000 },
    pro: { monthly: 30000, yearly: 300000 },
    enterprise: { monthly: 100000, yearly: 1000000 },
  };

  const amount = pricing[tier][billingCycle];
  const displayName: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate unique payment ID
      const paymentId = `payment-${crypto.randomUUID()}`;

      // Request payment via PortOne SDK
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `${displayName[tier]} Plan - ${billingCycle === 'monthly' ? '월간' : '연간'}`,
        totalAmount: amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customer: {
          email: userEmail,
          fullName: userName,
        },
        customData: {
          userId,
          tier,
          billingCycle,
          subscriptionType: 'new',
        },
      });

      // Check for errors
      if (!response || response.code !== undefined) {
        setError(response?.message || 'Payment failed');
        setLoading(false);
        return;
      }

      // Payment initiated successfully
      // Now verify and complete on backend
      const completeResponse = await fetch('/api/payment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: response.paymentId }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        setError(errorData.error || 'Payment verification failed');
        setLoading(false);
        return;
      }

      // Success! Redirect to success page
      window.location.href = `/dashboard/subscription/success?tier=${tier}`;
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (tier === 'free') {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
        <p className="text-gray-600 mb-4">기본 기능을 무료로 사용하세요.</p>
        <button
          onClick={() => (window.location.href = '/dashboard')}
          className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
        >
          계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{displayName[tier]} Plan</h3>
      <div className="mb-4">
        <p className="text-3xl font-bold">{formatAmount(amount)}</p>
        <p className="text-gray-600">
          {billingCycle === 'monthly' ? '월간 결제' : '연간 결제'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
      >
        {loading ? '처리 중...' : `${formatAmount(amount)} 결제하기`}
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        결제 시 자동으로 구독이 시작됩니다.
      </p>
    </div>
  );
}
