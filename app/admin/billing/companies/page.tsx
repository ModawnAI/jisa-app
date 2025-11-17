'use client';

/**
 * 회사 구독 관리 페이지
 * Company Subscriptions Management Page
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Building2, Users, DollarSign, Calendar, Plus, Edit, Eye } from 'lucide-react';

interface Company {
  id: string;
  company_id: string;
  company_name: string;
  company_registration_number?: string;
  company_address?: string;
  company_phone?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
  price_per_user_monthly: number;
  minimum_users: number;
  subscription_status: string;
  contract_start_date: string;
  contract_end_date?: string;
  payment_terms_days: number;
  total_users?: number;
  active_users_last_30_days?: number;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchCompanies();
  }, [statusFilter]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/companies?${params}`);

      if (!response.ok) {
        throw new Error('회사 목록을 불러오지 못했습니다');
      }

      const data = await response.json();
      setCompanies(data.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '활성',
      suspended: '일시정지',
      cancelled: '취소',
      trial: '평가판',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">회사 구독 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              기업 구독 현황 및 관리
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/admin/billing'}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              대시보드로 돌아가기
            </button>
            <button
              onClick={() => window.location.href = '/admin/billing/companies/new'}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              새 회사 추가
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">상태:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">모든 상태</option>
              <option value="active">활성</option>
              <option value="suspended">일시정지</option>
              <option value="cancelled">취소</option>
              <option value="trial">평가판</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Companies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {companies.length > 0 ? (
            companies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                {/* Company Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {company.company_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {company.company_registration_number || '사업자번호 미등록'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      company.subscription_status
                    )}`}
                  >
                    {getStatusLabel(company.subscription_status)}
                  </span>
                </div>

                {/* Company Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">총 사용자</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {company.total_users || 0}명
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-xs text-gray-500">활성 사용자 (30일)</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {company.active_users_last_30_days || 0}명
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">사용자당 요금</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatAmount(company.price_per_user_monthly)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">결제 조건</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {company.payment_terms_days}일
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2">청구 담당자</p>
                  <p className="text-sm text-gray-900">
                    {company.billing_contact_name || '-'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {company.billing_contact_email || '-'}
                  </p>
                  {company.billing_contact_phone && (
                    <p className="text-sm text-gray-600">
                      {company.billing_contact_phone}
                    </p>
                  )}
                </div>

                {/* Contract Info */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">계약 시작일</p>
                      <p className="text-sm text-gray-900">
                        {format(new Date(company.contract_start_date), 'yyyy-MM-dd', {
                          locale: ko,
                        })}
                      </p>
                    </div>
                    {company.contract_end_date && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">계약 종료일</p>
                        <p className="text-sm text-gray-900">
                          {format(new Date(company.contract_end_date), 'yyyy-MM-dd', {
                            locale: ko,
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() =>
                      (window.location.href = `/admin/billing/companies/${company.company_id}`)
                    }
                    className="flex-1 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    상세보기
                  </button>
                  <button
                    onClick={() =>
                      (window.location.href = `/admin/billing/companies/${company.company_id}/edit`)
                    }
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    수정
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">등록된 회사가 없습니다</p>
              <button
                onClick={() => window.location.href = '/admin/billing/companies/new'}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                새 회사 추가
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {companies.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">요약</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">총 회사 수</p>
                <p className="text-xl font-bold text-gray-900">{companies.length}개</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">활성 구독</p>
                <p className="text-xl font-bold text-green-600">
                  {companies.filter((c) => c.subscription_status === 'active').length}개
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">총 사용자</p>
                <p className="text-xl font-bold text-gray-900">
                  {companies.reduce((sum, c) => sum + (c.total_users || 0), 0)}명
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">활성 사용자 (30일)</p>
                <p className="text-xl font-bold text-gray-900">
                  {companies.reduce(
                    (sum, c) => sum + (c.active_users_last_30_days || 0),
                    0
                  )}
                  명
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
