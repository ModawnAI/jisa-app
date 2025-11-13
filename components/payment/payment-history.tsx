'use client';

/**
 * Payment History Component
 * Displays user's payment transaction history with filtering and details
 */

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Payment {
  id: string;
  payment_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  status: 'ready' | 'paid' | 'failed' | 'cancelled' | 'partial_cancelled' | 'virtual_account_issued';
  pay_method: string;
  order_name: string;
  customer_name?: string;
  customer_email?: string;
  paid_at?: string;
  failed_at?: string;
  cancelled_at?: string;
  receipt_url?: string;
  invoice_id?: string;
  created_at: string;
}

interface PaymentHistoryProps {
  userId?: string;
  limit?: number;
  showFilters?: boolean;
}

export function PaymentHistory({
  userId,
  limit = 10,
  showFilters = true,
}: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (userId) {
        params.append('user_id', userId);
      }

      const response = await fetch(`/api/payment/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency || 'KRW',
    }).format(amount);
  };

  const getStatusBadge = (status: Payment['status']) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      ready: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      partial_cancelled: 'bg-orange-100 text-orange-800',
      virtual_account_issued: 'bg-blue-100 text-blue-800',
    };

    const labels = {
      paid: '결제완료',
      ready: '대기중',
      failed: '실패',
      cancelled: '취소됨',
      partial_cancelled: '부분취소',
      virtual_account_issued: '가상계좌발급',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPayMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      card: '카드',
      virtual_account: '가상계좌',
      transfer: '계좌이체',
      mobile: '휴대폰',
      gift_certificate: '상품권',
      easy_pay: '간편결제',
    };
    return labels[method] || method;
  };

  const handleDownloadInvoice = async (paymentId: string, invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      if (!response.ok) throw new Error('Failed to download invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('인보이스 다운로드에 실패했습니다.');
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">결제 내역을 불러오는 중...</span>
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
            onClick={fetchPayments}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              상태 필터:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="paid">결제완료</option>
              <option value="ready">대기중</option>
              <option value="failed">실패</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <p className="mt-4 text-lg font-medium">결제 내역이 없습니다</p>
            <p className="mt-2 text-sm">아직 결제가 이루어지지 않았습니다.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제수단
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.paid_at
                          ? formatDistanceToNow(new Date(payment.paid_at), {
                              addSuffix: true,
                              locale: ko,
                            })
                          : formatDistanceToNow(new Date(payment.created_at), {
                              addSuffix: true,
                              locale: ko,
                            })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.order_name}
                        </div>
                        {payment.customer_name && (
                          <div className="text-sm text-gray-500">
                            {payment.customer_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getPayMethodLabel(payment.pay_method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {payment.receipt_url && (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              영수증
                            </a>
                          )}
                          {payment.invoice_id && (
                            <button
                              onClick={() =>
                                handleDownloadInvoice(
                                  payment.payment_id,
                                  payment.invoice_id!
                                )
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              인보이스
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-gray-700">
                페이지 {page + 1}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={payments.length < limit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
