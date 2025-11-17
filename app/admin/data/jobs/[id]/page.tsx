/**
 * Individual Job Detail Page
 * Detailed view of document processing job with real-time updates
 * Phase 5.1: Data Ingestion Pipeline
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface JobDetails {
  id: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  chunking_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_model: string;
  default_access_level: string;
  default_required_role?: string;
  default_required_tier?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_log?: any;
  progress: number;
  estimatedTimeRemaining?: number;
  documentsRemaining: number;
  ingestion_documents: any[];
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [jobId, setJobId] = useState<string>('');
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params Promise in Next.js 15
  useEffect(() => {
    params.then((p) => setJobId(p.id));
  }, [params]);

  const fetchJobDetails = async () => {
    if (!jobId) return;
    try {
      const response = await fetch(`/api/admin/data/jobs/${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }

      const data = await response.json();
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  // Auto-refresh for active jobs
  useEffect(() => {
    if (job && (job.status === 'pending' || job.status === 'processing')) {
      const interval = setInterval(fetchJobDetails, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [job?.status]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
          <p className="text-red-800">{error || '작업을 찾을 수 없습니다.'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}분 ${secs}초`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/data/jobs')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          작업 목록으로 돌아가기
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">작업 상세</h1>
            <p className="text-gray-600 mt-1">
              작업 ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{job.id}</code>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(job.status === 'pending' || job.status === 'processing') && (
              <span className="text-sm text-gray-600">
                <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                자동 새로고침 중...
              </span>
            )}
            <button
              onClick={fetchJobDetails}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">상태</p>
            <div className="text-lg font-semibold">
              {job.status === 'completed' && <span className="text-green-600">완료</span>}
              {job.status === 'processing' && <span className="text-blue-600">처리 중</span>}
              {job.status === 'pending' && <span className="text-yellow-600">대기 중</span>}
              {job.status === 'failed' && <span className="text-red-600">실패</span>}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">진행률</p>
            <div className="text-lg font-semibold">{job.progress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  job.status === 'completed'
                    ? 'bg-green-600'
                    : job.status === 'failed'
                      ? 'bg-red-600'
                      : 'bg-blue-600'
                }`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">처리 완료</p>
            <div className="text-lg font-semibold">
              {job.processed_documents} / {job.total_documents}
            </div>
            {job.failed_documents > 0 && (
              <p className="text-sm text-red-600 mt-1">
                실패: {job.failed_documents}개
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">예상 남은 시간</p>
            <div className="text-lg font-semibold">
              {job.estimatedTimeRemaining
                ? formatTime(job.estimatedTimeRemaining)
                : job.status === 'completed'
                  ? '-'
                  : '계산 중...'}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">처리 설정</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Chunking Strategy:</span>
            <span className="ml-2 font-medium">{job.chunking_strategy}</span>
          </div>
          <div>
            <span className="text-gray-600">Chunk Size:</span>
            <span className="ml-2 font-medium">{job.chunk_size} words</span>
          </div>
          <div>
            <span className="text-gray-600">Chunk Overlap:</span>
            <span className="ml-2 font-medium">{job.chunk_overlap} words</span>
          </div>
          <div>
            <span className="text-gray-600">Embedding Model:</span>
            <span className="ml-2 font-medium">{job.embedding_model}</span>
          </div>
          <div>
            <span className="text-gray-600">Access Level:</span>
            <span className="ml-2 font-medium">{job.default_access_level}</span>
          </div>
          <div>
            <span className="text-gray-600">Required Role:</span>
            <span className="ml-2 font-medium">{job.default_required_role || '없음'}</span>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">문서 목록</h2>

        {job.ingestion_documents && job.ingestion_documents.length > 0 ? (
          <div className="space-y-3">
            {job.ingestion_documents.map((doc: any) => (
              <div
                key={doc.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{doc.file_name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {doc.file_type} • {(doc.file_size / 1024).toFixed(1)} KB
                      </p>

                      {doc.status === 'completed' && (
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <div>✅ Chunks: {doc.chunks_created}개</div>
                          <div>✅ Contexts: {doc.contexts_created}개</div>
                          <div>✅ Vectors: {doc.pinecone_vectors}개</div>
                        </div>
                      )}

                      {doc.error_message && (
                        <div className="mt-2 text-xs text-red-600 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5" />
                          <span>{doc.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {doc.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" />
                        완료
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        처리 중
                      </span>
                    )}
                    {doc.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3" />
                        대기
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        실패
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">문서 정보를 불러오는 중...</p>
        )}
      </div>

      {/* Error Log */}
      {job.error_log && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-3">오류 로그</h2>
          <pre className="text-sm text-red-800 overflow-x-auto">
            {JSON.stringify(job.error_log, null, 2)}
          </pre>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
