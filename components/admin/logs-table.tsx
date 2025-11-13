/**
 * Logs Table Component
 * Displays query logs with pagination
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDate, formatTime, truncate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface QueryLog {
  id: string;
  user_id?: string;
  session_id: string;
  query_text: string;
  response_text: string;
  response_time_ms: number;
  query_type: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function LogsTable() {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<QueryLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/logs?page=${page}&limit=20`);

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
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

  const getResponseTimeColor = (ms: number) => {
    if (ms < 1000) return 'text-green-600';
    if (ms < 3000) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">로그를 불러오는 중...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">로그가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  쿼리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  응답 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  세션 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{formatDate(log.timestamp)}</div>
                    <div className="text-xs text-gray-500">{formatTime(log.timestamp)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-md">
                      {truncate(log.query_text, 100)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQueryTypeBadge(
                        log.query_type
                      )}`}
                    >
                      {log.query_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getResponseTimeColor(log.response_time_ms)}`}>
                      {log.response_time_ms}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {truncate(log.session_id, 16)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && (
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

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

function LogDetailModal({ log, onClose }: { log: QueryLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">쿼리 상세 정보</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">시간</label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(log.timestamp)} {formatTime(log.timestamp)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">쿼리 타입</label>
              <p className="mt-1 text-sm text-gray-900">{log.query_type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">응답 시간</label>
              <p className="mt-1 text-sm text-gray-900">{log.response_time_ms}ms</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">세션 ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{log.session_id}</p>
            </div>
          </div>

          {/* Query */}
          <div>
            <label className="text-sm font-medium text-gray-600">사용자 쿼리</label>
            <div className="mt-2 p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.query_text}</p>
            </div>
          </div>

          {/* Response */}
          <div>
            <label className="text-sm font-medium text-gray-600">AI 응답</label>
            <div className="mt-2 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.response_text}</p>
            </div>
          </div>

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600">메타데이터</label>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <pre className="text-xs text-gray-900 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
