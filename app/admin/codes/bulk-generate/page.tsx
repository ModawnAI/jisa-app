'use client'

/**
 * Bulk Code Generation Page
 *
 * Admin interface for generating multiple verification codes from CSV data.
 * Each code is linked to a user credential.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      setError('Please upload a CSV file')
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
          setError('CSV file must contain headers and at least one data row')
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
        setError('Failed to parse CSV file')
      }
    }

    reader.onerror = () => {
      setError('Failed to read CSV file')
    }

    reader.readAsText(file)
  }

  const handleGenerateCodes = async () => {
    if (parsedData.length === 0) {
      setError('No data to process')
      return
    }

    if (parsedData.length > 500) {
      setError('Maximum 500 users per batch')
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
        throw new Error(errorData.error || 'Failed to generate codes')
      }

      const data = await response.json()
      setGeneratedCodes(data.codes || [])
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    const headers = ['Code', 'Name', 'Email', 'Expires At']
    const rows = generatedCodes.map((c) => [
      c.code,
      c.intended_recipient_name,
      c.intended_recipient_email || '',
      new Date(c.expires_at).toLocaleDateString(),
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold mb-2">Bulk Code Generation</h1>
        <p className="text-gray-600">
          Generate multiple verification codes from CSV data
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
                    ? 'bg-blue-600 text-white'
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
          <span className="text-sm">Upload CSV</span>
          <span className="text-sm">Configure</span>
          <span className="text-sm">Results</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Upload CSV */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-medium mb-2">CSV Format Requirements:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>First row must contain column headers</li>
              <li>Required column: <code className="bg-gray-200 px-1">full_name</code></li>
              <li>
                Optional columns: <code className="bg-gray-200 px-1">email</code>,{' '}
                <code className="bg-gray-200 px-1">employee_id</code>,{' '}
                <code className="bg-gray-200 px-1">department</code>,{' '}
                <code className="bg-gray-200 px-1">position</code>, etc.
              </li>
              <li>Maximum 500 rows per file</li>
            </ul>

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Example CSV:</p>
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Configure Code Settings</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {parsedData.length} users loaded from CSV
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Role
                </label>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="user">User</option>
                  <option value="junior">Junior</option>
                  <option value="senior">Senior</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tier
                </label>
                <select
                  value={defaultTier}
                  onChange={(e) => setDefaultTier(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In Days
                </label>
                <input
                  type="number"
                  value={defaultExpiresInDays}
                  onChange={(e) => setDefaultExpiresInDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Method
                </label>
                <select
                  value={distributionMethod}
                  onChange={(e) => setDistributionMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="manual">Manual</option>
                  <option value="kakao">KakaoTalk</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Credential Matching</h3>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requiresCredentialMatch}
                  onChange={(e) => setRequiresCredentialMatch(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">
                  Require credential matching for verification
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-1 ml-6">
                Users must provide matching credentials when using the code
              </p>
            </div>

            {requiresCredentialMatch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Match Fields (select at least one)
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
                      <span className="text-sm capitalize">{field.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-2 border rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleGenerateCodes}
              disabled={loading || credentialMatchFields.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Codes'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Generation Complete!</h2>

          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">
              Successfully generated {generatedCodes.length} verification codes
            </p>
          </div>

          <div className="mb-6">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
            >
              Download CSV
            </button>
            <button
              onClick={() => router.push('/admin/codes')}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              View All Codes
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {generatedCodes.slice(0, 10).map((code, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {code.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {code.intended_recipient_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.intended_recipient_email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(code.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {generatedCodes.length > 10 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Showing first 10 codes. Download CSV to see all {generatedCodes.length} codes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
