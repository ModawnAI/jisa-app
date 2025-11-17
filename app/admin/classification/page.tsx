'use client'

/**
 * Content Classification Management Page
 *
 * Admin interface for managing content classification.
 * Supports auto-classification suggestions and batch processing.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

interface ClassificationStats {
  total_documents: number
  classified_documents: number
  auto_classified: number
  manually_classified: number
  classification_rate: number
  auto_classification_rate: number
  average_confidence: number
  by_sensitivity: Record<string, number>
  by_category: Record<string, number>
  by_method: Record<string, number>
}

interface Document {
  id: string
  title: string
  description?: string
  sensitivity_level?: string
  content_category?: string[]
  auto_classified: boolean
  classification_confidence?: number
  classification_method?: string
  created_at: string
}

interface ClassificationSuggestion {
  content_id: string
  content_type: 'document' | 'context'
  suggestions: {
    sensitivity_level?: string
    content_category?: string[]
    target_departments?: string[]
    compliance_tags?: string[]
    confidence: number
  }
}

export default function ClassificationManagementPage() {
  const router = useRouter()
  const [stats, setStats] = useState<ClassificationStats | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [suggestions, setSuggestions] = useState<ClassificationSuggestion[]>([])

  // Filters
  const [filterClassified, setFilterClassified] = useState<string>('all')
  const [filterSensitivity, setFilterSensitivity] = useState<string>('all')

  useEffect(() => {
    loadStats()
    loadDocuments()
  }, [filterClassified, filterSensitivity])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/classification/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)

      // For demo purposes, we'll fetch from documents table
      // In production, you'd use a proper API endpoint with filters
      const response = await fetch('/api/admin/data/documents')

      if (response.ok) {
        const data = await response.json()
        let docs = data.documents || []

        // Apply filters
        if (filterClassified === 'classified') {
          docs = docs.filter((d: Document) => d.sensitivity_level || (d.content_category && d.content_category.length > 0))
        } else if (filterClassified === 'unclassified') {
          docs = docs.filter((d: Document) => !d.sensitivity_level && (!d.content_category || d.content_category.length === 0))
        }

        if (filterSensitivity !== 'all') {
          docs = docs.filter((d: Document) => d.sensitivity_level === filterSensitivity)
        }

        setDocuments(docs)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDocument = (id: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedDocuments(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(documents.map((d) => d.id)))
    }
  }

  const handleBatchClassify = async () => {
    if (selectedDocuments.size === 0) {
      alert('Please select documents to classify')
      return
    }

    if (selectedDocuments.size > 100) {
      alert('Maximum 100 documents per batch')
      return
    }

    setBatchProcessing(true)

    try {
      const response = await fetch('/api/admin/classification/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: Array.from(selectedDocuments),
          auto_apply: false, // Get suggestions first
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to classify documents')
      }

      const data = await response.json()
      setSuggestions(data.classifications || [])
      setShowBatchDialog(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setBatchProcessing(false)
    }
  }

  const handleApplySuggestions = async () => {
    setBatchProcessing(true)

    try {
      // Apply each suggestion
      for (const suggestion of suggestions) {
        await fetch('/api/admin/classification/classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content_id: suggestion.content_id,
            content_type: suggestion.content_type,
            sensitivity_level: suggestion.suggestions.sensitivity_level,
            content_category: suggestion.suggestions.content_category,
            target_departments: suggestion.suggestions.target_departments,
            compliance_tags: suggestion.suggestions.compliance_tags,
            classification_method: 'rule-based',
            classification_confidence: suggestion.suggestions.confidence,
          }),
        })
      }

      alert(`Successfully classified ${suggestions.length} documents`)
      setShowBatchDialog(false)
      setSuggestions([])
      setSelectedDocuments(new Set())
      loadStats()
      loadDocuments()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setBatchProcessing(false)
    }
  }

  const handleViewDocument = (id: string) => {
    router.push(`/admin/data/documents/${id}`)
  }

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null

    const percentage = (confidence * 100).toFixed(0)
    const color =
      confidence >= 0.8
        ? 'bg-green-100 text-green-800'
        : confidence >= 0.6
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'

    return <span className={`px-2 py-1 text-xs rounded-full ${color}`}>{percentage}%</span>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Classification</h1>
          <p className="text-gray-600">Manage multi-dimensional content classification</p>
        </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Documents</div>
            <div className="text-2xl font-bold">{stats.total_documents}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Classified</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.classified_documents}
            </div>
            <div className="text-xs text-gray-500">
              {stats.classification_rate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Auto-Classified</div>
            <div className="text-2xl font-bold text-blue-600">{stats.auto_classified}</div>
            <div className="text-xs text-gray-500">
              {stats.auto_classification_rate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Manual</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.manually_classified}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Avg Confidence</div>
            <div className="text-2xl font-bold">
              {(stats.average_confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">By Sensitivity Level</h3>
            <div className="space-y-2">
              {Object.entries(stats.by_sensitivity).map(([level, count]) => (
                <div key={level} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{level}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">By Category</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(stats.by_category)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <select
              value={filterClassified}
              onChange={(e) => setFilterClassified(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Documents</option>
              <option value="classified">Classified Only</option>
              <option value="unclassified">Unclassified Only</option>
            </select>
            <select
              value={filterSensitivity}
              onChange={(e) => setFilterSensitivity(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Sensitivity Levels</option>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="secret">Secret</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleBatchClassify}
              disabled={selectedDocuments.size === 0 || batchProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {batchProcessing
                ? 'Processing...'
                : `Classify Selected (${selectedDocuments.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === documents.length && documents.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sensitivity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Categories
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No documents found
                </td>
              </tr>
            ) : (
              documents.slice(0, 50).map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={() => handleSelectDocument(doc.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{doc.title}</div>
                    {doc.description && (
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {doc.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.sensitivity_level ? (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize">
                        {doc.sensitivity_level}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {doc.content_category && doc.content_category.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {doc.content_category.slice(0, 2).map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                        {doc.content_category.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{doc.content_category.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.classification_method || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getConfidenceBadge(doc.classification_confidence)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewDocument(doc.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View/Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Batch Classification Dialog */}
      {showBatchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto p-6">
            <h2 className="text-2xl font-bold mb-4">분류 제안</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Review auto-classification suggestions for {suggestions.length} documents
              </p>
            </div>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="border rounded p-4">
                  <div className="font-medium mb-2">
                    Document #{idx + 1}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium">Sensitivity:</span>{' '}
                      <span className="capitalize">
                        {suggestion.suggestions.sensitivity_level || 'Not detected'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Categories:</span>{' '}
                      {suggestion.suggestions.content_category?.join(', ') || 'None'}
                    </div>
                    <div>
                      <span className="font-medium">Departments:</span>{' '}
                      {suggestion.suggestions.target_departments?.join(', ') || 'None'}
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span>{' '}
                      {getConfidenceBadge(suggestion.suggestions.confidence)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowBatchDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySuggestions}
                disabled={batchProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {batchProcessing ? 'Applying...' : 'Apply All Suggestions'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
