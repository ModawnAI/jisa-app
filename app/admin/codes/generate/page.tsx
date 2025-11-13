/**
 * Generate Access Codes Page
 * Admin interface for generating access codes with credential linking
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { Key, Plus, ArrowLeft, AlertCircle, CheckCircle, Search, X } from 'lucide-react'
import Link from 'next/link'

interface Credential {
  id: string
  full_name: string
  email?: string
  employee_id?: string
  department?: string
}

export default function GenerateCodesPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    count: 1,
    codeType: 'registration',
    role: 'user',
    tier: 'free',
    expiresInDays: 30,
    maxUses: 1,
    intendedRecipientName: '',
    intendedRecipientEmail: '',
    requiresCredentialMatch: false,
    credentialId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  // Credential selection state
  const [showCredentialSearch, setShowCredentialSearch] = useState(false)
  const [credentialSearch, setCredentialSearch] = useState('')
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [loadingCredentials, setLoadingCredentials] = useState(false)

  useEffect(() => {
    if (credentialSearch.length > 0) {
      searchCredentials()
    } else {
      setCredentials([])
    }
  }, [credentialSearch])

  const searchCredentials = async () => {
    setLoadingCredentials(true)
    try {
      const response = await fetch(
        `/api/admin/credentials?search=${encodeURIComponent(credentialSearch)}&limit=10&status=verified`
      )
      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials || [])
      }
    } catch (err) {
      console.error('Failed to search credentials:', err)
    } finally {
      setLoadingCredentials(false)
    }
  }

  const handleSelectCredential = (credential: Credential) => {
    setSelectedCredential(credential)
    setFormData({
      ...formData,
      intendedRecipientName: credential.full_name,
      intendedRecipientEmail: credential.email || '',
      credentialId: credential.id,
      requiresCredentialMatch: true,
    })
    setShowCredentialSearch(false)
    setCredentialSearch('')
  }

  const handleClearCredential = () => {
    setSelectedCredential(null)
    setFormData({
      ...formData,
      intendedRecipientName: '',
      intendedRecipientEmail: '',
      credentialId: '',
      requiresCredentialMatch: false,
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]:
        name === 'count' || name === 'expiresInDays' || name === 'maxUses'
          ? parseInt(value)
          : type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Only send credential info if selected
          intendedRecipientName: formData.intendedRecipientName || undefined,
          intendedRecipientEmail: formData.intendedRecipientEmail || undefined,
          credentialId: formData.credentialId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '코드 생성에 실패했습니다.')
      }

      const data = await response.json()
      setGeneratedCodes(data.codes || [])
      setSuccess(`${data.codes.length}개의 코드가 성공적으로 생성되었습니다!`)

      // Reset form
      setFormData({
        count: 1,
        codeType: 'registration',
        role: 'user',
        tier: 'free',
        expiresInDays: 30,
        maxUses: 1,
        intendedRecipientName: '',
        intendedRecipientEmail: '',
        requiresCredentialMatch: false,
        credentialId: '',
      })
      setSelectedCredential(null)
    } catch (err: any) {
      console.error('Code generation error:', err)
      setError(err.message || '코드 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'))
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <Link href="/admin/codes" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">인증 코드 생성</h1>
                <p className="mt-2 text-sm text-gray-600">
                  새로운 액세스 코드를 생성합니다
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generation Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">코드 설정</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Credential Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수신자 선택 (선택사항)
                </label>

                {selectedCredential ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{selectedCredential.full_name}</div>
                      <div className="text-xs text-gray-600">
                        {selectedCredential.email || 'No email'}
                        {selectedCredential.employee_id && ` • ${selectedCredential.employee_id}`}
                        {selectedCredential.department && ` • ${selectedCredential.department}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCredential}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowCredentialSearch(!showCredentialSearch)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      인증된 사용자 검색...
                    </button>

                    {showCredentialSearch && (
                      <div className="mt-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                        <input
                          type="text"
                          placeholder="이름, 이메일, 사번으로 검색"
                          value={credentialSearch}
                          onChange={(e) => setCredentialSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />

                        {loadingCredentials && (
                          <div className="mt-2 text-center text-sm text-gray-600">검색 중...</div>
                        )}

                        {credentials.length > 0 && (
                          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                            {credentials.map((credential) => (
                              <button
                                key={credential.id}
                                type="button"
                                onClick={() => handleSelectCredential(credential)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                              >
                                <div className="font-medium">{credential.full_name}</div>
                                <div className="text-xs text-gray-600">
                                  {credential.email || 'No email'}
                                  {credential.employee_id && ` • ${credential.employee_id}`}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {!loadingCredentials &&
                          credentialSearch.length > 0 &&
                          credentials.length === 0 && (
                            <div className="mt-2 text-center text-sm text-gray-600">
                              결과 없음
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Recipient Info (if no credential selected) */}
              {!selectedCredential && (
                <>
                  <div>
                    <label
                      htmlFor="intendedRecipientName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      수신자 이름 (선택사항)
                    </label>
                    <input
                      id="intendedRecipientName"
                      name="intendedRecipientName"
                      type="text"
                      value={formData.intendedRecipientName}
                      onChange={handleChange}
                      placeholder="홍길동"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="intendedRecipientEmail"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      수신자 이메일 (선택사항)
                    </label>
                    <input
                      id="intendedRecipientEmail"
                      name="intendedRecipientEmail"
                      type="email"
                      value={formData.intendedRecipientEmail}
                      onChange={handleChange}
                      placeholder="hong@company.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {/* Credential Match Requirement */}
              {selectedCredential && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="requiresCredentialMatch"
                      checked={formData.requiresCredentialMatch}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-yellow-800">
                      인증 정보 일치 필수 (추천)
                    </span>
                  </label>
                  <p className="text-xs text-yellow-700 mt-1 ml-6">
                    코드 사용 시 선택한 사용자의 인증 정보와 일치해야 합니다
                  </p>
                </div>
              )}

              {/* Count */}
              <div>
                <label
                  htmlFor="count"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  생성할 코드 수
                </label>
                <input
                  id="count"
                  name="count"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.count}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Code Type */}
              <div>
                <label
                  htmlFor="codeType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  코드 타입
                </label>
                <select
                  id="codeType"
                  name="codeType"
                  value={formData.codeType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="registration">회원가입</option>
                  <option value="subscription">구독 업그레이드</option>
                  <option value="one_time_access">일회성 액세스</option>
                </select>
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  역할
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="junior">Junior</option>
                  <option value="senior">Senior</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="ceo">CEO</option>
                </select>
              </div>

              {/* Tier */}
              <div>
                <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-1">
                  구독 티어
                </label>
                <select
                  id="tier"
                  name="tier"
                  value={formData.tier}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Expiry */}
              <div>
                <label
                  htmlFor="expiresInDays"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  만료 기간 (일)
                </label>
                <input
                  id="expiresInDays"
                  name="expiresInDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.expiresInDays}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Max Uses */}
              <div>
                <label
                  htmlFor="maxUses"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  최대 사용 횟수
                </label>
                <input
                  id="maxUses"
                  name="maxUses"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxUses}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    코드 생성
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Codes Display */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">생성된 코드</h2>
              {generatedCodes.length > 0 && (
                <button
                  onClick={copyAllCodes}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  전체 복사
                </button>
              )}
            </div>

            {generatedCodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <Key className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600">생성된 코드가 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {generatedCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <code className="text-sm font-mono font-semibold text-gray-900">{code}</code>
                    <button
                      onClick={() => copyToClipboard(code)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      복사
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
