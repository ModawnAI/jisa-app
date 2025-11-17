'use client';

/**
 * Company Detail Page
 * View detailed information about a specific company
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Building2,
  Users,
  DollarSign,
  Calendar,
  Edit,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react';

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

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/companies/${companyId}`);

      if (!response.ok) {
        throw new Error('회사 정보를 불러오지 못했습니다');
      }

      const data = await response.json();
      setCompany(data.data);
    } catch (err) {
      console.error('Error fetching company:', err);
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

  if (error || !company) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-red-600 mb-4">{error || '회사 정보를 찾을 수 없습니다'}</p>
          <button
            onClick={() => router.push('/admin/billing/companies')}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/billing/companies')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
              <p className="mt-2 text-sm text-gray-600">
                {company.company_registration_number || '사업자번호 미등록'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/admin/billing/companies/${company.company_id}/edit`)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              수정
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
              company.subscription_status
            )}`}
          >
            {getStatusLabel(company.subscription_status)}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 사용자</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {company.total_users || 0}명
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 사용자 (30일)</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {company.active_users_last_30_days || 0}명
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">사용자당 요금</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatAmount(company.price_per_user_monthly)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">월 예상 매출</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatAmount(
                    company.price_per_user_monthly *
                      Math.max(company.total_users || 0, company.minimum_users)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              회사 정보
            </h2>
            <div className="space-y-4">
              {company.company_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">대표 전화번호</p>
                    <p className="text-sm text-gray-900">{company.company_phone}</p>
                  </div>
                </div>
              )}
              {company.company_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">주소</p>
                    <p className="text-sm text-gray-900">{company.company_address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing Contact */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">청구 담당자</h2>
            <div className="space-y-4">
              {company.billing_contact_name && (
                <div>
                  <p className="text-sm font-medium text-gray-600">이름</p>
                  <p className="text-sm text-gray-900">{company.billing_contact_name}</p>
                </div>
              )}
              {company.billing_contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">이메일</p>
                    <p className="text-sm text-gray-900">{company.billing_contact_email}</p>
                  </div>
                </div>
              )}
              {company.billing_contact_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">전화번호</p>
                    <p className="text-sm text-gray-900">{company.billing_contact_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            계약 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">계약 시작일</p>
              <p className="text-sm text-gray-900">
                {format(new Date(company.contract_start_date), 'yyyy년 MM월 dd일', {
                  locale: ko,
                })}
              </p>
            </div>
            {company.contract_end_date && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">계약 종료일</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(company.contract_end_date), 'yyyy년 MM월 dd일', {
                    locale: ko,
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">결제 조건</p>
              <p className="text-sm text-gray-900">{company.payment_terms_days}일</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">최소 사용자 수</p>
              <p className="text-sm text-gray-900">{company.minimum_users}명</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">등록일</p>
              <p className="text-sm text-gray-900">
                {format(new Date(company.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
