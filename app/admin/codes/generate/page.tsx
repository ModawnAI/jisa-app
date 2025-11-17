/**
 * Generate Single Access Code Page
 * Simplified interface for generating a single permanent employee code
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { Key, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function GenerateCodePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    tier: 'free',
    employeeName: '',
    employeeEmail: '',
    employeePhone: '',
    employeePosition: '', // 직급
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGeneratedCode(null)

    // Validation
    if (!formData.employeeName.trim()) {
      setError('직원 이름을 입력해주세요.')
      return
    }
    if (!formData.employeeEmail.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    if (!formData.employeePosition.trim()) {
      setError('직급을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 1,
          codeType: 'registration',
          role: 'user', // Everyone is employee/user
          tier: formData.tier,
          expiresInDays: null, // Never expires
          maxUses: 1,
          intendedRecipientName: formData.employeeName,
          intendedRecipientEmail: formData.employeeEmail,
          metadata: {
            phone: formData.employeePhone,
            position: formData.employeePosition,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '코드 생성에 실패했습니다.')
      }

      const data = await response.json()
      if (data.codes && data.codes.length > 0) {
        setGeneratedCode(data.codes[0])
      }
    } catch (err: any) {
      console.error('Code generation error:', err)
      setError(err.message || '코드 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/admin/codes" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">직원 인증 코드 생성</h1>
            <p className="mt-2 text-sm text-gray-600">
              영구 사용 가능한 직원 액세스 코드를 생성합니다
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message with Code */}
        {generatedCode && (
          <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-start mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  코드가 성공적으로 생성되었습니다!
                </h3>
                <p className="text-sm text-green-700 mb-2">
                  <strong>{formData.employeeName}</strong>님께 전달할 코드입니다.
                </p>
                <p className="text-xs text-green-600">
                  직급: {formData.employeePosition} | 이메일: {formData.employeeEmail}
                  {formData.employeePhone && ` | 연락처: ${formData.employeePhone}`}
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
              <div className="text-center">
                <code className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                  {generatedCode}
                </code>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              코드 복사
            </button>
          </div>
        )}

        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">직원 정보 및 접근 권한</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Name */}
            <div>
              <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-2">
                직원 이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="employeeName"
                name="employeeName"
                type="text"
                value={formData.employeeName}
                onChange={handleChange}
                required
                placeholder="홍길동"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {/* Employee Email */}
            <div>
              <label htmlFor="employeeEmail" className="block text-sm font-medium text-gray-700 mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                id="employeeEmail"
                name="employeeEmail"
                type="email"
                value={formData.employeeEmail}
                onChange={handleChange}
                required
                placeholder="hong@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {/* Employee Phone */}
            <div>
              <label htmlFor="employeePhone" className="block text-sm font-medium text-gray-700 mb-2">
                연락처 (선택사항)
              </label>
              <input
                id="employeePhone"
                name="employeePhone"
                type="tel"
                value={formData.employeePhone}
                onChange={handleChange}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {/* Employee Position (직급) */}
            <div>
              <label htmlFor="employeePosition" className="block text-sm font-medium text-gray-700 mb-2">
                직급 <span className="text-red-500">*</span>
              </label>
              <input
                id="employeePosition"
                name="employeePosition"
                type="text"
                value={formData.employeePosition}
                onChange={handleChange}
                required
                placeholder="예: 사원, 대리, 과장, 차장, 부장, 이사"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              <p className="mt-1 text-xs text-gray-500">
                직원의 직급을 입력하세요 (예: 사원, 대리, 과장, 차장, 부장, 이사)
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              {/* Access Tier */}
              <div>
                <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-2">
                  지식 접근 레벨 (Access Tier) <span className="text-red-500">*</span>
                </label>
                <select
                  id="tier"
                  name="tier"
                  value={formData.tier}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                >
                  <option value="free">레벨 1 - 공개 정보 (일반 직원)</option>
                  <option value="basic">레벨 2 - 내부 정보 (팀원급)</option>
                  <option value="pro">레벨 3 - 전문 정보 (리더급)</option>
                  <option value="enterprise">레벨 4 - 전체 정보 (경영진)</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  높은 레벨일수록 더 많은 내부 지식과 민감한 정보에 접근할 수 있습니다
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">코드 특징</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 사용자 유형: 직원 (Employee)</li>
                <li>• 만료 기간: 없음 (영구 사용)</li>
                <li>• 사용 횟수: 1회</li>
                <li>• 타입: 회원가입용</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-4 bg-blue-600 text-white font-semibold text-lg rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Key className="w-6 h-6 mr-2" />
                  코드 생성하기
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to Codes List */}
        <div className="text-center">
          <Link
            href="/admin/codes"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            ← 코드 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
