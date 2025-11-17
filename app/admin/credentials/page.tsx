'use client'

/**
 * Credentials Management Page
 *
 * Admin interface for managing user credentials.
 * Supports CRUD operations, search, and verification status tracking.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

interface Credential {
  id: string
  full_name: string
  email?: string
  phone_number?: string
  employee_id?: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  status: 'pending' | 'verified' | 'inactive'
  verified_at?: string
  created_at: string
  updated_at: string
}

interface UploadResult {
  success: boolean
  message?: string
  summary?: {
    totalRows: number
    validRows: number
    invalidRows: number
    inserted: number
  }
  credentials?: any[]
  validationErrors?: Array<{
    row: number
    field: string
    message: string
  }>
  error?: string
  details?: string
}

export default function CredentialsPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  // Stats
  const [stats, setStats] = useState<{
    total: number
    verified: number
    pending: number
    inactive: number
  } | null>(null)

  // Bulk Upload State
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Code Generation State
  const [generatingCodes, setGeneratingCodes] = useState(false)
  const [codeGenResult, setCodeGenResult] = useState<any>(null)
  const [showCodeGenResult, setShowCodeGenResult] = useState(false)

  useEffect(() => {
    loadCredentials()
    loadStats()
  }, [currentPage, statusFilter, departmentFilter, searchTerm])

  const loadCredentials = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/credentials?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load credentials')
      }

      const data = await response.json()
      setCredentials(data.credentials || [])
      setTotalItems(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/credentials/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleCreateNew = () => {
    router.push('/admin/credentials/new')
  }

  const handleEdit = (id: string) => {
    router.push(`/admin/credentials/${id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this credential?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/credentials/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete credential')
      }

      loadCredentials()
      loadStats()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Bulk Upload Handlers
  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert('Please select a CSV file to upload')
      return
    }

    try {
      setUploading(true)
      setUploadResult(null)

      const formData = new FormData()
      formData.append('file', uploadFile)

      const response = await fetch('/api/admin/credentials/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data: UploadResult = await response.json()

      if (!response.ok) {
        setUploadResult({
          success: false,
          error: data.error || 'Upload failed',
          details: data.details,
          validationErrors: data.validationErrors,
        })
      } else {
        setUploadResult(data)
        setUploadFile(null)

        // Reload credentials and stats after successful upload
        setTimeout(() => {
          loadCredentials()
          loadStats()
        }, 1000)
      }
    } catch (err) {
      setUploadResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/credentials/template')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'employee-upload-template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Failed to download template')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.csv')) {
        setUploadFile(file)
        setUploadResult(null)
      } else {
        alert('Please upload a CSV file')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith('.csv')) {
        setUploadFile(file)
        setUploadResult(null)
      } else {
        alert('Please upload a CSV file')
      }
    }
  }

  // Code Generation Handlers
  const handleGenerateCodesForPending = async () => {
    if (!stats || stats.pending === 0) {
      alert('No pending credentials to generate codes for')
      return
    }

    if (!confirm(`Generate verification codes for ${stats.pending} pending employees?`)) {
      return
    }

    try {
      setGeneratingCodes(true)
      setCodeGenResult(null)

      const response = await fetch('/api/admin/credentials/generate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending', // Generate for all pending credentials
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate codes')
      }

      setCodeGenResult(data)
      setShowCodeGenResult(true)

      // Reload stats after code generation
      setTimeout(() => {
        loadStats()
      }, 1000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate codes')
    } finally {
      setGeneratingCodes(false)
    }
  }

  const copyAllGeneratedCodes = () => {
    if (!codeGenResult?.codes) return

    const codesText = codeGenResult.codes
      .map((c: any) => `${c.fullName} (${c.employeeId}): ${c.code}`)
      .join('\n')

    navigator.clipboard.writeText(codesText)
    alert('Codes copied to clipboard!')
  }

  const downloadCodesAsCSV = () => {
    if (!codeGenResult?.codes) return

    const csvContent = [
      'Full Name,Employee ID,Email,Code,Tier,Role',
      ...codeGenResult.codes.map((c: any) =>
        `"${c.fullName}","${c.employeeId}","${c.email || ''}","${c.code}","${c.tier}","${c.role}"`
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `verification-codes-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
    }

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}
      >
        {status}
      </span>
    )
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">사용자 인증 정보</h1>
          <p className="text-gray-600">
            Manage employee credentials and verification status
          </p>
        </div>

      {/* Bulk Upload Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <button
          onClick={() => setShowBulkUpload(!showBulkUpload)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="text-left">
              <h2 className="text-lg font-semibold">직원 대량 업로드</h2>
              <p className="text-sm text-gray-600">
                Upload multiple employees at once using CSV file
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              showBulkUpload ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showBulkUpload && (
          <div className="px-6 pb-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Upload Area */}
              <div>
                <h3 className="font-semibold mb-3">CSV 파일 업로드</h3>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {uploadFile ? (
                    <div>
                      <svg
                        className="w-12 h-12 mx-auto text-green-500 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(uploadFile.size / 1024).toFixed(2)} KB
                      </p>
                      <button
                        onClick={() => setUploadFile(null)}
                        className="mt-3 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg
                        className="w-12 h-12 mx-auto text-gray-400 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2">
                        <label
                          htmlFor="csv-upload"
                          className="text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          Click to upload
                        </label>{' '}
                        or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">CSV files only</p>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {uploadFile && (
                  <button
                    onClick={handleBulkUpload}
                    disabled={uploading}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Employees'
                    )}
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-semibold mb-3">Instructions</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">1. Download Template</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Download our CSV template with sample data
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-50"
                    >
                      📥 Download Template
                    </button>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-1">2. Fill Employee Data</h4>
                    <p className="text-sm text-gray-600">
                      Required fields: <strong>full_name, employee_id</strong>
                      <br />
                      Optional: email, phone_number, department, team, position,
                      hire_date, location, tier, role
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-1">3. Valid Values</h4>
                    <p className="text-sm text-gray-600">
                      <strong>Tier:</strong> free, basic, pro, enterprise
                      <br />
                      <strong>Role:</strong> user, junior, senior, manager, admin, ceo
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-1">4. Upload CSV</h4>
                    <p className="text-sm text-gray-600">
                      Upload your completed CSV file. The system will validate and
                      report any errors.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div className="mt-6">
                {uploadResult.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mt-0.5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-800 mb-2">
                          {uploadResult.message}
                        </h4>
                        {uploadResult.summary && (
                          <div className="text-sm text-green-700 space-y-1">
                            <p>✓ Total rows processed: {uploadResult.summary.totalRows}</p>
                            <p>✓ Successfully inserted: {uploadResult.summary.inserted}</p>
                            {uploadResult.summary.invalidRows > 0 && (
                              <p className="text-yellow-700">
                                ⚠ Rows with errors: {uploadResult.summary.invalidRows}
                              </p>
                            )}
                          </div>
                        )}

                        {uploadResult.credentials && uploadResult.credentials.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-green-800 mb-2">
                              Uploaded Employees:
                            </p>
                            <div className="bg-white rounded border border-green-200 max-h-40 overflow-y-auto">
                              {uploadResult.credentials.map((cred: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2 border-b last:border-b-0 text-sm"
                                >
                                  <span className="font-medium">{cred.full_name}</span>
                                  <span className="text-gray-500 ml-2">
                                    ({cred.employee_id})
                                  </span>
                                  {cred.tier && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                      {cred.tier}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {uploadResult.validationErrors && uploadResult.validationErrors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-yellow-700 mb-2">
                              Validation Warnings:
                            </p>
                            <div className="bg-yellow-50 rounded border border-yellow-200 max-h-40 overflow-y-auto">
                              {uploadResult.validationErrors.map((error, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2 border-b last:border-b-0 text-sm text-yellow-800"
                                >
                                  Row {error.row}: {error.message} ({error.field})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-red-500 mt-0.5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-800 mb-2">업로드 실패</h4>
                        <p className="text-sm text-red-700">{uploadResult.error}</p>
                        {uploadResult.details && (
                          <p className="text-sm text-red-600 mt-1">{uploadResult.details}</p>
                        )}

                        {uploadResult.validationErrors && uploadResult.validationErrors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-red-700 mb-2">
                              Validation Errors:
                            </p>
                            <div className="bg-white rounded border border-red-200 max-h-40 overflow-y-auto">
                              {uploadResult.validationErrors.map((error, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2 border-b last:border-b-0 text-sm text-red-800"
                                >
                                  <strong>Row {error.row}:</strong> {error.message} (
                                  {error.field})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Credentials</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Verified</div>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </div>
        </div>
      )}

      {/* Generate Codes Section */}
      {stats && stats.pending > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900">
                  Generate Verification Codes
                </h3>
                <p className="text-sm text-blue-700">
                  {stats.pending} pending {stats.pending === 1 ? 'employee' : 'employees'} need verification codes
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateCodesForPending}
              disabled={generatingCodes}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {generatingCodes ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Generate Codes for All Pending</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Code Generation Results */}
      {showCodeGenResult && codeGenResult && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-900">
                    {codeGenResult.message}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Generated {codeGenResult.summary?.newCodesGenerated} codes
                    {codeGenResult.summary?.alreadyHadCodes > 0 &&
                      ` (${codeGenResult.summary.alreadyHadCodes} already had codes)`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCodeGenResult(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex space-x-2 mb-4">
              <button
                onClick={copyAllGeneratedCodes}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                📋 Copy All Codes
              </button>
              <button
                onClick={downloadCodesAsCSV}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                📥 Download CSV
              </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Verification Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tier / Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {codeGenResult.codes?.map((codeData: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {codeData.fullName}
                        </div>
                        {codeData.email && (
                          <div className="text-xs text-gray-500">{codeData.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {codeData.employeeId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {codeData.code}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(codeData.code)
                              alert('Code copied!')
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {codeData.tier}
                        </span>
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {codeData.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Customer Service">Customer Service</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleCreateNew}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + New Credential
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">인증 정보를 불러오는 중...</p>
        </div>
      )}

      {/* Credentials Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {credentials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No credentials found
                  </td>
                </tr>
              ) : (
                credentials.map((credential) => (
                  <tr key={credential.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {credential.full_name}
                      </div>
                      {credential.verified_at && (
                        <div className="text-xs text-gray-500">
                          Verified: {new Date(credential.verified_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {credential.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {credential.employee_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {credential.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {credential.position || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(credential.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(credential.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(credential.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} credentials
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
              )
              .map((page, idx, arr) => (
                <div key={page} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-2">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </div>
              ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
