'use client'

/**
 * 대량 코드 생성 페이지
 *
 * CSV 데이터에서 여러 인증 코드를 생성하는 관리자 인터페이스
 * 각 코드는 사용자 인증 정보와 연결됩니다
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { Upload, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react'

interface UserRow {
  full_name: string
  email?: string
  phone_number?: string
  employee_id?: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  role?: string
  tier?: string
  expiresInDays?: number
}

interface GeneratedCode {
  code: string
  intended_recipient_name: string
  intended_recipient_email?: string
  expires_at: string
}

export default function BulkCodeGenerationPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'configure' | 'preview' | 'results'>('upload')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<UserRow[]>([])
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Default settings
  const [defaultRole, setDefaultRole] = useState('user')
  const [defaultTier, setDefaultTier] = useState('free')
  const [defaultExpiresInDays, setDefaultExpiresInDays] = useState(30)
  const [requiresCredentialMatch, setRequiresCredentialMatch] = useState(true)
  const [credentialMatchFields, setCredentialMatchFields] = useState<string[]>([
    'email',
    'employee_id',
  ])
  const [distributionMethod, setDistributionMethod] = useState<'manual' | 'kakao' | 'email' | 'sms'>('manual')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('CSV 파일을 업로드해주세요')
      return
    }

    setCsvFile(file)
    setError(null)
    parseCSV(file)
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').filter((line) => line.trim())

        if (lines.length < 2) {
          setError('CSV 파일에 헤더와 최소 1개의 데이터 행이 있어야 합니다')
          return
        }

        // Parse headers
        const headers = lines[0].split(',').map((h) => h.trim())

        // Parse data rows
        const data: UserRow[] = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim())
          const row: any = {}

          headers.forEach((header, index) => {
            if (values[index]) {
              row[header] = values[index]
            }
          })

          return row as UserRow
        })

        setParsedData(data)
        setStep('configure')
      } catch (err) {
        setError('CSV 파일 파싱에 실패했습니다')
      }
    }

    reader.onerror = () => {
      setError('CSV 파일을 읽는데 실패했습니다')
    }

    reader.readAsText(file)
  }

  const handleGenerateCodes = async () => {
    if (parsedData.length === 0) {
      setError('처리할 데이터가 없습니다')
      return
    }

    if (parsedData.length > 500) {
      setError('배치당 최대 500명까지 가능합니다')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/codes/generate-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: parsedData,
          defaults: {
            role: defaultRole,
            tier: defaultTier,
            expiresInDays: defaultExpiresInDays,
            requires_credential_match: requiresCredentialMatch,
            credential_match_fields: credentialMatchFields,
            distribution_method: distributionMethod,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '코드 생성에 실패했습니다')
      }

      const data = await response.json()
      setGeneratedCodes(data.codes || [])
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    const headers = ['코드', '이름', '이메일', '만료일']
    const rows = generatedCodes.map((c) => [
      c.code,
      c.intended_recipient_name,
      c.intended_recipient_email || '',
      new Date(c.expires_at).toLocaleDateString('ko-KR'),
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `verification_codes_${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleToggleMatchField = (field: string) => {
    if (credentialMatchFields.includes(field)) {
      setCredentialMatchFields(credentialMatchFields.filter((f) => f !== field))
    } else {
      setCredentialMatchFields([...credentialMatchFields, field])
    }
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      email: '이메일',
      employee_id: '사번',
      name: '이름',
      phone: '전화번호',
    }
    return labels[field] || field
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대량 코드 생성</h1>
          <p className="mt-2 text-sm text-gray-600">
            CSV 데이터에서 여러 인증 코드를 생성합니다
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['upload', 'configure', 'results'].map((s, idx) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step === s
                      ? 'bg-primary-600 text-white'
                      : idx < ['upload', 'configure', 'results'].indexOf(step)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 2 && <div className="flex-1 h-1 bg-gray-300 mx-2" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm">CSV 업로드</span>
            <span className="text-sm">설정</span>
            <span className="text-sm">결과</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Upload CSV */}
        {step === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CSV 파일 업로드</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV 파일
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-900 mb-2">CSV 형식 요구사항:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>첫 번째 행에 컬럼 헤더가 있어야 합니다</li>
                <li>필수 컬럼: <code className="bg-gray-200 px-1">full_name</code></li>
                <li>
                  선택 컬럼: <code className="bg-gray-200 px-1">email</code>,{' '}
                  <code className="bg-gray-200 px-1">employee_id</code>,{' '}
                  <code className="bg-gray-200 px-1">department</code>,{' '}
                  <code className="bg-gray-200 px-1">position</code> 등
                </li>
                <li>파일당 최대 500개 행</li>
              </ul>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900 mb-2">예시 CSV:</p>
                <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                  {`full_name,email,employee_id,department,position
홍길동,hong@company.com,EMP001,Sales,Agent
김철수,kim@company.com,EMP002,Marketing,Manager
이영희,lee@company.com,EMP003,Operations,Team Leader`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configure Settings */}
        {step === 'configure' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">코드 설정</h2>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  CSV에서 {parsedData.length}명의 사용자를 불러왔습니다
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기본 역할
                  </label>
                  <select
                    value={defaultRole}
                    onChange={(e) => setDefaultRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="user">사용자</option>
                    <option value="junior">주니어</option>
                    <option value="senior">시니어</option>
                    <option value="manager">관리자</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기본 지식 접근 레벨
                  </label>
                  <select
                    value={defaultTier}
                    onChange={(e) => setDefaultTier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="free">무료 (공개 정보)</option>
                    <option value="basic">베이직 (기본 내부 정보)</option>
                    <option value="pro">프로 (전문 지식)</option>
                    <option value="enterprise">엔터프라이즈 (모든 정보)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    모든 레벨 동일 요금. 직무에 필요한 정보 수준을 선택하세요.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    만료 기간 (일)
                  </label>
                  <input
                    type="number"
                    value={defaultExpiresInDays}
                    onChange={(e) => setDefaultExpiresInDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    max="365"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    배포 방법
                  </label>
                  <select
                    value={distributionMethod}
                    onChange={(e) => setDistributionMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="manual">수동</option>
                    <option value="kakao">카카오톡</option>
                    <option value="email">이메일</option>
                    <option value="sms">문자</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">인증 정보 일치</h3>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={requiresCredentialMatch}
                    onChange={(e) => setRequiresCredentialMatch(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    인증 정보 일치 필수
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  코드 사용 시 제공한 인증 정보와 일치해야 합니다
                </p>
              </div>

              {requiresCredentialMatch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    일치 필드 (최소 1개 선택)
                  </label>
                  <div className="space-y-2">
                    {['email', 'employee_id', 'name', 'phone'].map((field) => (
                      <label key={field} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={credentialMatchFields.includes(field)}
                          onChange={() => handleToggleMatchField(field)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">{getFieldLabel(field)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={handleGenerateCodes}
                disabled={loading || credentialMatchFields.length === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '생성 중...' : '코드 생성'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">생성 완료!</h2>
            </div>

            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                {generatedCodes.length}개의 인증 코드가 성공적으로 생성되었습니다
              </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                CSV 다운로드
              </button>
              <button
                onClick={() => router.push('/admin/codes')}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-5 h-5 mr-2" />
                모든 코드 보기
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      코드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수신자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      만료일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {generatedCodes.slice(0, 10).map((code, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                        {code.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {code.intended_recipient_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.intended_recipient_email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(code.expires_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {generatedCodes.length > 10 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  처음 10개의 코드를 표시하고 있습니다. 전체 {generatedCodes.length}개의 코드를 보려면 CSV를 다운로드하세요.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
