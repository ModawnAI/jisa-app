/**
 * Ingestion Jobs Monitoring Page
 * View and monitor document processing jobs
 * Phase 5.1: Data Ingestion Pipeline
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Upload,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface IngestionJob {
  id: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  chunking_strategy: string;
  chunk_size: number;
  default_access_level: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_log?: any;
}

export default function IngestionJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const response = await fetch(
        `/api/admin/data/jobs?page=${page}&limit=20${statusParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, filter]);

  // Auto-refresh for active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === 'pending' || job.status === 'processing'
    );

    if (hasActiveJobs) {
      const interval = setInterval(fetchJobs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [jobs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            완료
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 animate-spin" />
            처리 중
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            대기 중
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            실패
          </span>
        );
      default:
        return null;
    }
  };

  const getProgress = (job: IngestionJob) => {
    const total = job.total_documents;
    const processed = job.processed_documents + job.failed_documents;
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">수집 작업 모니터링</h1>
          <p className="text-gray-600 mt-1">
            문서 처리 작업의 진행 상황을 실시간으로 확인합니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchJobs}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            onClick={() => router.push('/admin/data/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            새 업로드
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'processing', 'completed', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status === 'all' && '전체'}
            {status === 'pending' && '대기 중'}
            {status === 'processing' && '처리 중'}
            {status === 'completed' && '완료'}
            {status === 'failed' && '실패'}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">작업 목록을 불러오는 중...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">수집 작업이 없습니다.</p>
            <button
              onClick={() => router.push('/admin/data/upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              첫 문서 업로드하기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업 ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행률
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    문서 수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설정
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성 시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.map((job) => {
                  const progress = getProgress(job);

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/data/jobs/${job.id}`)}
                    >
                      <td className="px-4 py-4">
                        <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {job.id.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(job.status)}</td>
                      <td className="px-4 py-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{progress}%</span>
                            <span>
                              {job.processed_documents}/{job.total_documents}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                job.status === 'completed'
                                  ? 'bg-green-600'
                                  : job.status === 'failed'
                                    ? 'bg-red-600'
                                    : 'bg-blue-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {job.failed_documents > 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              {job.failed_documents}개 실패
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900">
                          {job.total_documents}개
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            Strategy: <span className="font-medium">{job.chunking_strategy}</span>
                          </div>
                          <div>
                            Size: <span className="font-medium">{job.chunk_size}</span>
                          </div>
                          <div>
                            Access: <span className="font-medium">{job.default_access_level}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(job.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            페이지 {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
