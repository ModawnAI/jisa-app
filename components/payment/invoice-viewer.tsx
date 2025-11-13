'use client';

/**
 * Invoice Viewer Component
 * Displays invoice details and provides download functionality
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoice_number: string;
  payment_id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'paid' | 'void' | 'uncollectible';
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  items: InvoiceItem[];
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  customer_name?: string;
  customer_email?: string;
  customer_address?: string;
  created_at: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoiceViewerProps {
  invoiceId?: string;
  paymentId?: string;
  onClose?: () => void;
}

export function InvoiceViewer({
  invoiceId,
  paymentId,
  onClose,
}: InvoiceViewerProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (invoiceId || paymentId) {
      fetchInvoice();
    }
  }, [invoiceId, paymentId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = invoiceId
        ? `/api/invoices/${invoiceId}`
        : `/api/invoices/by-payment/${paymentId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }

      const data = await response.json();
      setInvoice(data.invoice);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;

    try {
      setDownloading(true);

      const response = await fetch(`/api/invoices/${invoice.id}/download`);
      if (!response.ok) throw new Error('Failed to download invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('인보이스 다운로드에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatAmount = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      void: 'bg-red-100 text-red-800',
      uncollectible: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      paid: '지불완료',
      draft: '초안',
      void: '무효',
      uncollectible: '수금불가',
    };

    return (
      <span
        className={`px-3 py-1 text-sm font-semibold rounded-full ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">인보이스를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="text-red-600 text-center">
          <p className="font-semibold mb-2">오류가 발생했습니다</p>
          <p className="text-sm">{error || '인보이스를 찾을 수 없습니다'}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header with actions */}
      <div className="border-b border-gray-200 p-6 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">인보이스</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              인쇄
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {downloading ? '다운로드 중...' : 'PDF 다운로드'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice content */}
      <div className="p-8 print:p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">JISA</h1>
            <p className="text-sm text-gray-600">
              KakaoTalk RAG Chatbot Platform
            </p>
          </div>
          <div className="text-right">
            <div className="mb-2">{getStatusBadge(invoice.status)}</div>
            <p className="text-sm text-gray-600">
              인보이스 번호: <span className="font-mono">{invoice.invoice_number}</span>
            </p>
          </div>
        </div>

        {/* Billing details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">청구 대상</h3>
            <p className="text-gray-900 font-medium">{invoice.customer_name || '고객'}</p>
            {invoice.customer_email && (
              <p className="text-sm text-gray-600">{invoice.customer_email}</p>
            )}
            {invoice.customer_address && (
              <p className="text-sm text-gray-600 mt-1">
                {invoice.customer_address}
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">청구 정보</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-600">
                발행일:{' '}
                <span className="text-gray-900">
                  {format(new Date(invoice.issue_date), 'yyyy년 MM월 dd일', {
                    locale: ko,
                  })}
                </span>
              </p>
              {invoice.due_date && (
                <p className="text-gray-600">
                  마감일:{' '}
                  <span className="text-gray-900">
                    {format(new Date(invoice.due_date), 'yyyy년 MM월 dd일', {
                      locale: ko,
                    })}
                  </span>
                </p>
              )}
              {invoice.paid_date && (
                <p className="text-gray-600">
                  지불일:{' '}
                  <span className="text-gray-900">
                    {format(new Date(invoice.paid_date), 'yyyy년 MM월 dd일', {
                      locale: ko,
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice items */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 text-sm font-semibold text-gray-700">
                  항목
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">
                  수량
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">
                  단가
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">
                  금액
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-4 text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-sm text-gray-900 text-right">
                    {formatAmount(item.unit_price, invoice.currency)}
                  </td>
                  <td className="py-4 text-sm text-gray-900 text-right font-medium">
                    {formatAmount(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">소계</span>
              <span className="text-gray-900">
                {formatAmount(invoice.amount, invoice.currency)}
              </span>
            </div>
            {invoice.tax_amount !== undefined && invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">부가세 (10%)</span>
                <span className="text-gray-900">
                  {formatAmount(invoice.tax_amount, invoice.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-gray-300">
              <span className="text-lg font-semibold text-gray-900">총액</span>
              <span className="text-lg font-bold text-gray-900">
                {formatAmount(invoice.total_amount, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">참고사항</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>이 인보이스는 자동으로 생성되었습니다.</p>
          <p className="mt-1">문의사항이 있으시면 고객 지원팀으로 연락주시기 바랍니다.</p>
        </div>
      </div>
    </div>
  );
}
