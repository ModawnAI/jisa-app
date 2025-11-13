/**
 * Codes Table Component
 * Displays access codes with usage status
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Copy, CheckCircle, XCircle } from 'lucide-react';

interface AccessCode {
  id: string;
  code: string;
  code_type: string;
  is_used: boolean;
  current_uses: number;
  max_uses: number;
  expires_at: string;
  created_at: string;
  metadata: {
    role?: string;
    subscription_tier?: string;
  };
}

export function CodesTable() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCodes();
  }, [page]);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/codes?page=${page}&limit=20`);

      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const getStatusBadge = (code: AccessCode) => {
    const isExpired = new Date(code.expires_at) < new Date();
    const isFullyUsed = code.current_uses >= code.max_uses;

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" />
          만료
        </span>
      );
    }

    if (isFullyUsed) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          사용 완료
        </span>
      );
    }

    if (code.is_used) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          사용 중
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        사용 가능
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels = {
      registration: '회원가입',
      subscription: '구독',
      one_time_access: '일회성',
    };

    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">코드를 불러오는 중...</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">코드가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할/티어
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용 현황
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  만료일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono font-semibold text-gray-900">
                      {code.code}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {getTypeBadge(code.code_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {code.metadata?.role || 'N/A'} /{' '}
                      {code.metadata?.subscription_tier || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {code.current_uses} / {code.max_uses}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(code)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(code.expires_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => copyCode(code.code)}
                      className="text-primary-600 hover:text-primary-700"
                      title="코드 복사"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && codes.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            페이지 {page} / {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
