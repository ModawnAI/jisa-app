/**
 * Recent Queries Component
 * Shows recent chatbot queries in table format
 */

'use client';

import { useEffect, useState } from 'react';
import { formatDate, formatTime } from '@/lib/utils';
import Link from 'next/link';

interface Query {
  id: string;
  queryText: string;
  queryType: string;
  responseTime: number;
  timestamp: string;
  userId?: string;
}

export function RecentQueries() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentQueries();
  }, []);

  const fetchRecentQueries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/recent-queries?limit=10');

      if (!response.ok) {
        throw new Error('Failed to fetch recent queries');
      }

      const data = await response.json();
      setQueries(data.queries || []);
    } catch (error) {
      console.error('Failed to fetch recent queries:', error);
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  const getQueryTypeBadge = (type: string) => {
    const colors = {
      rag: 'bg-blue-100 text-blue-800',
      commission: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800',
    };

    return colors[type as keyof typeof colors] || colors.general;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">최근 쿼리</h3>
        <Link
          href="/admin/logs"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          전체 보기 →
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-600">로딩 중...</p>
          </div>
        ) : queries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-600">아직 쿼리가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  쿼리 내용
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  응답 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queries.map((query) => (
                <tr key={query.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                    {query.queryText}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQueryTypeBadge(
                        query.queryType
                      )}`}
                    >
                      {query.queryType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {query.responseTime}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatTime(query.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
