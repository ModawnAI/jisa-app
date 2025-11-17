'use client'

/**
 * Employee Management Page
 *
 * Comprehensive employee view with verification status, code status, and chat activity.
 * Integrates credentials, verification codes, and user profiles.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Employee Management
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

interface Employee {
  // From user_credentials
  id: string
  full_name: string
  email?: string
  phone_number?: string
  employee_id: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  status: 'pending' | 'verified' | 'inactive'
  verified_at?: string
  created_at: string
  updated_at: string
  metadata?: {
    tier?: string
    role?: string
    bulk_upload?: boolean
  }

  // Joined data
  has_code?: boolean
  verification_code?: string
  code_expires_at?: string
  is_verified?: boolean
  profile_id?: string
  kakao_user_id?: string
  last_chat_at?: string
  total_chats?: number
}

interface Stats {
  total: number
  verified: number
  pending: number
  inactive: number
  with_codes: number
  without_codes: number
  active_chatters: number
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [codeFilter, setCodeFilter] = useState<string>('all') // all, with_code, without_code
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)

  // Quick actions
  const [generatingCodeFor, setGeneratingCodeFor] = useState<string | null>(null)

  useEffect(() => {
    loadEmployees()
    loadStats()
  }, [currentPage, statusFilter, codeFilter, departmentFilter, searchTerm])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (codeFilter !== 'all') {
        params.append('code_status', codeFilter)
      }

      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/employees?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load employees')
      }

      const data = await response.json()
      setEmployees(data.employees || [])
      setTotalItems(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/employees/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleGenerateCode = async (employeeId: string) => {
    try {
      setGeneratingCodeFor(employeeId)

      const response = await fetch('/api/admin/credentials/generate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialIds: [employeeId],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code')
      }

      alert(`Code generated: ${data.codes[0].code}`)
      loadEmployees()
      loadStats()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setGeneratingCodeFor(null)
    }
  }

  const handleViewEmployee = (id: string) => {
    router.push(`/admin/employees/${id}`)
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      verified: 'bg-gray-100 text-gray-800',
      pending: 'bg-gray-100 text-gray-600',
      inactive: 'bg-gray-100 text-gray-500',
    }

    const labels = {
      verified: '인증완료',
      pending: '대기중',
      inactive: '비활성',
    }

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">직원 관리</h1>
        <p className="text-gray-600">
          직원 인증 상태 및 채팅 활동 조회 및 관리
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">전체</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">인증완료</div>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">대기중</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">비활성</div>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">코드보유</div>
            <div className="text-2xl font-bold text-blue-600">{stats.with_codes}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">코드없음</div>
            <div className="text-2xl font-bold text-orange-600">{stats.without_codes}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">활성사용자</div>
            <div className="text-2xl font-bold text-purple-600">{stats.active_chatters}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="이름, 이메일 또는 사원번호로 검색..."
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
              <option value="all">모든 상태</option>
              <option value="verified">인증완료</option>
              <option value="pending">대기중</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
          <div>
            <select
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">모든 직원</option>
              <option value="with_code">코드 있음</option>
              <option value="without_code">코드 없음</option>
            </select>
          </div>
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">모든 부서</option>
              <option value="영업팀">영업팀</option>
              <option value="마케팅팀">마케팅팀</option>
              <option value="IT팀">IT팀</option>
              <option value="인사팀">인사팀</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">빠른 작업</h3>
            <p className="text-sm text-gray-600">직원 정보 및 인증 코드 관리</p>
          </div>
          <div className="flex space-x-2">
            <Link
              href="/admin/credentials"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              대량 업로드
            </Link>
            <Link
              href="/admin/codes/generate"
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
            >
              코드 생성
            </Link>
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
          <p className="mt-2 text-gray-600">직원 정보를 불러오는 중...</p>
        </div>
      )}

      {/* Employees Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  직원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  사원번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  부서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  코드 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  채팅 활동
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  등급/역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    등록된 직원이 없습니다
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {employee.full_name}
                      </div>
                      {employee.email && (
                        <div className="text-xs text-gray-500">{employee.email}</div>
                      )}
                      {employee.verified_at && (
                        <div className="text-xs text-gray-600">
                          인증완료 {new Date(employee.verified_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {employee.employee_id}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.department || '-'}
                      {employee.team && (
                        <div className="text-xs text-gray-400">{employee.team}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(employee.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {employee.has_code ? (
                        <div>
                          <span className="text-gray-800">코드 있음</span>
                          {employee.verification_code && (
                            <div className="text-xs text-gray-500 font-mono">
                              {employee.verification_code}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">코드 없음</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {employee.total_chats ? (
                        <div>
                          <div className="text-gray-900 font-medium">
                            {employee.total_chats}회
                          </div>
                          {employee.last_chat_at && (
                            <div className="text-xs text-gray-500">
                              마지막: {new Date(employee.last_chat_at).toLocaleString('ko-KR')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">활동 없음</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        {employee.metadata?.tier && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {employee.metadata.tier}
                          </span>
                        )}
                        {employee.metadata?.role && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {employee.metadata.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => handleViewEmployee(employee.id)}
                          className="text-gray-700 hover:text-gray-900 text-left"
                        >
                          상세보기
                        </button>
                        {!employee.has_code && (
                          <button
                            onClick={() => handleGenerateCode(employee.id)}
                            disabled={generatingCodeFor === employee.id}
                            className="text-gray-600 hover:text-gray-800 disabled:opacity-50 text-left"
                          >
                            {generatingCodeFor === employee.id
                              ? '생성중...'
                              : '코드 생성'}
                          </button>
                        )}
                      </div>
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
            {totalItems}명 중 {(currentPage - 1) * itemsPerPage + 1}~
            {Math.min(currentPage * itemsPerPage, totalItems)}명 표시
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
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
                        ? 'bg-gray-800 text-white'
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
              다음
            </button>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
