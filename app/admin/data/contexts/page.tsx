/**
 * Contexts Browser Page
 * Admin interface for viewing all knowledge base contexts
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Link as LinkIcon,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';

interface Context {
  id: string;
  document_id: string | null;
  title: string;
  content: string;
  pinecone_id: string;
  pinecone_namespace: string;
  access_level: string;
  embedding_model: string;
  created_at: string;
  metadata?: any;
  documents?: {
    id: string;
    title: string;
  } | null;
}

export default function ContextsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentIdParam = searchParams?.get('document_id');

  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [orphanedOnly, setOrphanedOnly] = useState(false);
  const [documentFilter, setDocumentFilter] = useState(documentIdParam || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);

  const fetchContexts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (orphanedOnly) params.append('orphaned', 'true');
      if (documentFilter) params.append('document_id', documentFilter);

      const response = await fetch(`/api/admin/data/contexts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch contexts');

      const data = await response.json();
      setContexts(data.contexts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch contexts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContexts();
  }, [page, searchTerm, orphanedOnly, documentFilter]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccessBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      public: 'bg-green-100 text-green-800',
      basic: 'bg-blue-100 text-blue-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-orange-100 text-orange-800',
      confidential: 'bg-red-100 text-red-800',
      executive: 'bg-purple-100 text-purple-800',
      standard: 'bg-gray-100 text-gray-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">지식 베이스 브라우저</h1>
        <p className="text-gray-600 mt-1">
          Pinecone에 저장된 모든 컨텍스트와 임베딩을 확인합니다.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 컨텍스트</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">연결된 컨텍스트</p>
              <p className="text-2xl font-bold text-green-600">
                {contexts.filter((c) => c.document_id).length}
              </p>
            </div>
            <LinkIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">고아 컨텍스트</p>
              <p className="text-2xl font-bold text-orange-600">
                {contexts.filter((c) => !c.document_id).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">네임스페이스</p>
              <p className="text-lg font-bold text-gray-900">
                {new Set(contexts.map((c) => c.pinecone_namespace)).size}
              </p>
            </div>
            <Database className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="제목 또는 내용으로 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Options */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setOrphanedOnly(!orphanedOnly);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                orphanedOnly
                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              고아 컨텍스트만
            </button>

            {documentFilter && (
              <button
                onClick={() => {
                  setDocumentFilter('');
                  router.push('/admin/data/contexts');
                }}
                className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                문서 필터 제거
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={fetchContexts}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* Contexts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-gray-600 mt-4">컨텍스트를 불러오는 중...</p>
          </div>
        ) : contexts.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">컨텍스트가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {contexts.map((context) => (
              <div
                key={context.id}
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{context.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getAccessBadgeColor(context.access_level)}`}
                      >
                        {context.access_level}
                      </span>
                      {!context.document_id && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          고아
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {context.content.substring(0, 200)}...
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Pinecone ID: <code className="bg-gray-100 px-1 rounded">{context.pinecone_id?.substring(0, 12)}...</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {context.documents ? (
                          <span
                            className="text-blue-600 hover:underline cursor-pointer"
                            onClick={() => router.push(`/admin/data/contexts?document_id=${context.document_id}`)}
                          >
                            {context.documents.title}
                          </span>
                        ) : (
                          <span className="text-orange-600">문서 없음</span>
                        )}
                      </div>
                      <div>
                        Namespace: <span className="font-medium">{context.pinecone_namespace}</span>
                      </div>
                      <div>
                        Model: <span className="font-medium">{context.embedding_model}</span>
                      </div>
                      <div className="col-span-2">
                        생성일: {formatDate(context.created_at)}
                      </div>
                    </div>

                    {context.metadata && Object.keys(context.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <details className="cursor-pointer">
                          <summary className="font-medium">메타데이터 보기</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                            {JSON.stringify(context.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedContext(context)}
                    className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            페이지 {page} / {totalPages} (총 {total}개)
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

      {/* Context Detail Modal */}
      {selectedContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">컨텍스트 상세</h2>
                <button
                  onClick={() => setSelectedContext(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">제목</label>
                  <p className="text-gray-900">{selectedContext.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">내용</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedContext.content}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pinecone ID</label>
                    <p className="text-gray-900 text-sm font-mono">{selectedContext.pinecone_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">접근 레벨</label>
                    <p className="text-gray-900">{selectedContext.access_level}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">네임스페이스</label>
                    <p className="text-gray-900">{selectedContext.pinecone_namespace}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">임베딩 모델</label>
                    <p className="text-gray-900">{selectedContext.embedding_model}</p>
                  </div>
                </div>

                {selectedContext.metadata && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">메타데이터</label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedContext.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
