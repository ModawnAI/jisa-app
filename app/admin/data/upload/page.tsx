/**
 * Data Upload Page
 * Admin UI for uploading documents and starting ingestion jobs
 * Phase 5.1: Data Ingestion Pipeline
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DataUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Configuration
  const [chunkingStrategy, setChunkingStrategy] = useState('sliding_window');
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [accessLevel, setAccessLevel] = useState('standard');
  const [requiredRole, setRequiredRole] = useState('');
  const [requiredTier, setRequiredTier] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Validate file types
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const validFiles = selectedFiles.filter(file => {
      return allowedTypes.includes(file.type) || file.name.match(/\.(pdf|docx|txt)$/i);
    });

    if (validFiles.length !== selectedFiles.length) {
      setError('일부 파일이 지원되지 않는 형식입니다. PDF, DOCX, TXT만 가능합니다.');
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();

      // Add files
      files.forEach(file => formData.append('files', file));

      // Add configuration
      formData.append('chunkingStrategy', chunkingStrategy);
      formData.append('chunkSize', chunkSize.toString());
      formData.append('chunkOverlap', chunkOverlap.toString());
      formData.append('accessLevel', accessLevel);
      if (requiredRole) formData.append('requiredRole', requiredRole);
      if (requiredTier) formData.append('requiredTier', requiredTier);

      const response = await fetch('/api/admin/data/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.');
      }

      setSuccess(`${files.length}개 파일 업로드 성공! 작업 ID: ${data.jobId}`);
      setFiles([]);

      // Redirect to jobs page after 2 seconds
      setTimeout(() => {
        router.push('/admin/data/jobs');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">데이터 업로드</h1>
          <p className="mt-2 text-sm text-gray-600">
            문서를 업로드하여 자동으로 처리하고 지식 베이스에 추가합니다
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800">{success}</p>
              <p className="text-green-600 text-sm mt-1">작업 모니터링 페이지로 이동합니다...</p>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">파일 선택</h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-blue-600 hover:text-blue-700 font-medium">
              파일 선택
            </span>
            <span className="text-gray-600"> 또는 드래그 앤 드롭</span>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            PDF, DOCX, TXT (최대 50MB)
          </p>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">
                선택된 파일 ({files.length}개)
              </h3>
              <p className="text-sm text-gray-600">
                총 크기: {totalSizeMB}MB
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                  >
                    제거
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Configuration Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">처리 설정</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Chunking Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chunking Strategy
            </label>
            <select
              value={chunkingStrategy}
              onChange={(e) => setChunkingStrategy(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="sliding_window">Sliding Window (기본)</option>
              <option value="semantic">Semantic (문장 단위)</option>
              <option value="table_aware">Table-Aware (표 인식)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {chunkingStrategy === 'sliding_window' && '고정 크기 윈도우로 분할'}
              {chunkingStrategy === 'semantic' && '문장 경계를 고려하여 분할'}
              {chunkingStrategy === 'table_aware' && '표 구조를 유지하며 분할'}
            </p>
          </div>

          {/* Chunk Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chunk Size (단어 수)
            </label>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value))}
              min="128"
              max="2048"
              step="64"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              권장: 512 (약 600-700 토큰)
            </p>
          </div>

          {/* Chunk Overlap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chunk Overlap (단어 수)
            </label>
            <input
              type="number"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
              min="0"
              max={chunkSize / 2}
              step="10"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              권장: 50 (문맥 연속성 유지)
            </p>
          </div>

          {/* Access Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              접근 레벨
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="public">Public (공개)</option>
              <option value="basic">Basic (기본)</option>
              <option value="intermediate">Intermediate (중급)</option>
              <option value="advanced">Advanced (고급)</option>
              <option value="confidential">Confidential (기밀)</option>
              <option value="executive">Executive (임원급)</option>
            </select>
          </div>

          {/* Required Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              필수 역할 (선택사항)
            </label>
            <select
              value={requiredRole}
              onChange={(e) => setRequiredRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">제한 없음</option>
              <option value="user">User</option>
              <option value="junior">Junior</option>
              <option value="senior">Senior</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="ceo">CEO</option>
            </select>
          </div>

          {/* Required Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              필수 구독 티어 (선택사항)
            </label>
            <select
              value={requiredTier}
              onChange={(e) => setRequiredTier(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">제한 없음</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        </div>

        {/* Upload Button */}
        <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/data/jobs')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          작업 모니터링으로 이동
        </button>

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
            files.length === 0 || uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Upload className="w-5 h-5" />
          {uploading ? (
            <>처리 중...</>
          ) : (
            <>{files.length}개 파일 업로드</>
          )}
        </button>
        </div>

        {/* Info Panel */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">처리 과정</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>파일을 Supabase Storage에 업로드</li>
          <li>텍스트 추출 (PDF/DOCX/TXT)</li>
          <li>설정된 전략으로 청킹</li>
          <li>OpenAI 임베딩 생성 (3072차원)</li>
          <li>PostgreSQL에 청크 저장</li>
          <li>Pinecone에 벡터 동기화</li>
          <li>완료 후 RAG 시스템에서 즉시 사용 가능</li>
        </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}
