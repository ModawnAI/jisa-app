'use client';

/**
 * Admin Billing Overview Page
 * Comprehensive billing analytics and management for administrators
 */

import { PaymentAnalyticsDashboard } from '@/components/analytics/payment-analytics-dashboard';
import { useEffect, useState } from 'react';

export default function AdminBillingPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // This would check via API - simplified for now
      setIsAdmin(true);
    } catch (err) {
      console.error('Error checking admin access:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            접근 권한이 없습니다
          </h1>
          <p className="text-gray-600 mb-6">
            이 페이지는 관리자만 접근할 수 있습니다.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                결제 관리 대시보드
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                구독, 결제, 수익 분석 및 관리
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/admin/billing/subscriptions'}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                구독 관리
              </button>
              <button
                onClick={() => window.location.href = '/admin/billing/payments'}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                결제 내역
              </button>
              <button
                onClick={() => window.location.href = '/admin/billing/invoices'}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                인보이스
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PaymentAnalyticsDashboard />
      </div>
    </div>
  );
}
