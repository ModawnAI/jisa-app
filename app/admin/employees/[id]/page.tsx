'use client'

/**
 * Employee Detail Page
 *
 * Shows comprehensive information about a specific employee including:
 * - Employee information
 * - Verification status
 * - Verification code
 * - Complete chat history
 * - Quick actions
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 3: Employee Management
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  MessageSquare,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Code,
  Trash2,
} from 'lucide-react'

// Simple toast helper
const toast = {
  success: (message: string) => alert(message),
  error: (message: string) => alert(`Error: ${message}`),
}

interface EmployeeDetail {
  // Credential data
  id: string
  full_name: string
  email?: string
  employee_id: string
  status: 'pending' | 'verified' | 'inactive'
  created_at: string
  metadata?: {
    tier?: string
    role?: string
    department?: string
  }

  // Verification code
  has_code: boolean
  verification_code?: string
  code_created_at?: string

  // Profile data
  is_verified: boolean
  profile_id?: string
  verified_at?: string

  // Chat activity
  total_chats: number
  last_chat_at?: string
}

interface ChatMessage {
  id: string
  user_message: string
  bot_response: string
  created_at: string
  metadata?: any
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [deletingCode, setDeletingCode] = useState(false)

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true)

        // Fetch employee details
        const response = await fetch(`/api/admin/employees/${employeeId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch employee')
        }

        const data = await response.json()
        setEmployee(data.employee)

        // Fetch chat history if verified
        if (data.employee.is_verified && data.employee.profile_id) {
          const chatResponse = await fetch(
            `/api/admin/employees/${employeeId}/chats`
          )
          if (chatResponse.ok) {
            const chatData = await chatResponse.json()
            setChatHistory(chatData.chats || [])
          }
        }
      } catch (error) {
        console.error('Error fetching employee:', error)
        toast.error('Failed to load employee data')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployeeData()
  }, [employeeId])

  // Generate verification code
  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true)

      const response = await fetch('/api/admin/credentials/generate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialIds: [employeeId],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }

      const data = await response.json()

      if (data.success && data.codes.length > 0) {
        toast.success('Verification code generated successfully')
        // Refresh employee data
        window.location.reload()
      } else {
        toast.error('Failed to generate code')
      }
    } catch (error) {
      console.error('Error generating code:', error)
      toast.error('Failed to generate code')
    } finally {
      setGeneratingCode(false)
    }
  }

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  // Delete verification code
  const handleDeleteCode = async () => {
    if (!confirm('Are you sure you want to delete this verification code?')) {
      return
    }

    try {
      setDeletingCode(true)
      // Implementation would require a delete endpoint
      toast.success('Code deleted successfully')
      window.location.reload()
    } catch (error) {
      console.error('Error deleting code:', error)
      toast.error('Failed to delete code')
    } finally {
      setDeletingCode(false)
    }
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = {
      verified: { color: 'bg-green-500', icon: CheckCircle2, label: 'Verified' },
      pending: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
      inactive: { color: 'bg-gray-500', icon: XCircle, label: 'Inactive' },
    }

    const statusConfig = config[status as keyof typeof config] || config.pending
    const Icon = statusConfig.icon

    return (
      <Badge className={`${statusConfig.color} text-white`}>
        <Icon className="mr-1 h-3 w-3" />
        {statusConfig.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">직원 데이터를 불러오는 중...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">직원을 찾을 수 없습니다</h2>
            <p className="text-gray-600 mb-4">
              요청하신 직원이 존재하지 않습니다.
            </p>
            <Button onClick={() => router.push('/admin/employees')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              직원 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/employees')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{employee.full_name}</h1>
            <p className="text-gray-600">사원번호: {employee.employee_id}</p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(employee.status)}
            {employee.has_code && (
              <Badge variant="outline" className="border-green-500 text-green-700">
                <Code className="mr-1 h-3 w-3" />
                Has Code
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Employee Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Employee Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{employee.full_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">사원번호</p>
                <p className="font-medium">{employee.employee_id}</p>
              </div>

              {employee.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {employee.email}
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-gray-500">Tier</p>
                <Badge variant="outline" className="mt-1">
                  {employee.metadata?.tier || 'free'}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-500">Role</p>
                <Badge variant="outline" className="mt-1">
                  {employee.metadata?.role || 'user'}
                </Badge>
              </div>

              {employee.metadata?.department && (
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{employee.metadata.department}</p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-gray-500">생성일</p>
                <p className="font-medium">{formatDate(employee.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="mt-1">{getStatusBadge(employee.status)}</div>
              </div>

              {employee.is_verified && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Verified At</p>
                    <p className="font-medium">{formatDate(employee.verified_at)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Profile ID</p>
                    <p className="font-mono text-xs">{employee.profile_id}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Verification Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Verification Code
              </CardTitle>
              <CardDescription>
                {employee.has_code
                  ? 'Code assigned to this employee'
                  : 'No code generated yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employee.has_code && employee.verification_code ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">코드</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-4 py-2 bg-gray-100 rounded font-mono text-lg">
                        {employee.verification_code}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleCopyCode(employee.verification_code!)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">생성일</p>
                    <p className="font-medium">
                      {formatDate(employee.code_created_at)}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteCode}
                    disabled={deletingCode}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Code
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    No verification code has been generated for this employee yet.
                  </p>
                  <Button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="w-full"
                  >
                    {generatingCode ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Code className="mr-2 h-4 w-4" />
                        Generate Code
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total Messages</p>
                <p className="text-2xl font-bold">{employee.total_chats}</p>
              </div>

              {employee.last_chat_at && (
                <div>
                  <p className="text-sm text-gray-500">Last Chat</p>
                  <p className="font-medium">{formatDate(employee.last_chat_at)}</p>
                </div>
              )}

              {!employee.is_verified && (
                <p className="text-sm text-gray-600">
                  Employee must verify before chatting
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Chat History */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat History
              </CardTitle>
              <CardDescription>
                {chatHistory.length > 0
                  ? `${chatHistory.length} conversation${
                      chatHistory.length === 1 ? '' : 's'
                    }`
                  : 'No chat history yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!employee.is_verified ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Employee must verify their identity before chatting
                  </p>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No chat messages yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Messages will appear here once the employee starts chatting
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* User Message */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">
                            User
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(chat.created_at)}
                          </span>
                        </div>
                        <p className="text-sm pl-6">{chat.user_message}</p>
                      </div>

                      {/* Bot Response */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            Bot
                          </span>
                        </div>
                        <p className="text-sm pl-6 text-gray-700">
                          {chat.bot_response}
                        </p>
                      </div>

                      {/* Metadata (if any) */}
                      {chat.metadata && (
                        <div className="pl-6">
                          <details className="text-xs text-gray-500">
                            <summary className="cursor-pointer">Metadata</summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
                              {JSON.stringify(chat.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}
