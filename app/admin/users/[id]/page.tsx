'use client'

/**
 * User Detail View
 *
 * Comprehensive user profile with credential information, verification status,
 * and access level summary based on role/tier/credential.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

interface UserProfile {
  id: string
  full_name: string
  email?: string
  role: string
  tier: string
  kakao_id?: string
  phone_number?: string
  created_at: string
  last_chat_at?: string
  total_queries?: number
}

interface UserCredential {
  id: string
  user_id: string
  full_name: string
  email?: string
  phone_number?: string
  employee_id?: string
  national_id_hash?: string
  department?: string
  team?: string
  position?: string
  hire_date?: string
  location?: string
  status: string
  verified_at?: string
  verification_code_id?: string
  created_at: string
}

interface VerificationCode {
  id: string
  code: string
  intended_recipient_name: string
  intended_recipient_email?: string
  status: string
  created_at: string
  expires_at: string
  used_at?: string
}

interface UserDetailData {
  profile: UserProfile
  credential?: UserCredential
  verification_code?: VerificationCode
  access_summary: {
    role_level: number
    tier_level: number
    credential_verified: boolean
    credential_boost: number
    effective_access_level: string
  }
}

const ROLE_HIERARCHY = ['user', 'junior', 'senior', 'manager', 'admin', 'ceo']
const TIER_HIERARCHY = ['free', 'basic', 'pro', 'enterprise']

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [data, setData] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch user details')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      user: 'bg-gray-100 text-gray-800',
      junior: 'bg-blue-100 text-blue-800',
      senior: 'bg-purple-100 text-purple-800',
      manager: 'bg-green-100 text-green-800',
      admin: 'bg-orange-100 text-orange-800',
      ceo: 'bg-red-100 text-red-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800',
    }
    return colors[tier] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
      available: 'bg-blue-100 text-blue-800',
      used: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">사용자 상세 정보를 불러오는 중...</div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-red-600">{error || '사용자를 찾을 수 없습니다'}</div>
      </DashboardLayout>
    )
  }

  const { profile, credential, verification_code, access_summary } = data

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">사용자 상세 정보</h1>
          <p className="text-gray-600">
            사용자 프로필, 인증 정보 및 접근 레벨에 대한 종합 정보
          </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Credential */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-2xl font-bold mb-2">{profile.full_name}</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role)}`}
                    >
                      {profile.role.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(profile.tier)}`}
                    >
                      {profile.tier.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium">{profile.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Phone</div>
                  <div className="font-medium">{profile.phone_number || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">KakaoTalk ID</div>
                  <div className="font-medium">{profile.kakao_id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">사용자 ID</div>
                  <div className="font-mono text-xs">{profile.id}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-gray-600">Total Queries</div>
                  <div className="font-medium">{profile.total_queries || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Last Active</div>
                  <div className="font-medium">
                    {profile.last_chat_at
                      ? new Date(profile.last_chat_at).toLocaleDateString()
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Joined</div>
                  <div className="font-medium">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Credential Information */}
          {credential ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">인증 정보</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(credential.status)}`}
                >
                  {credential.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Full Name</div>
                    <div className="font-medium">{credential.full_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">사원번호</div>
                    <div className="font-medium">{credential.employee_id || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium">{credential.email || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium">{credential.phone_number || 'N/A'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-600">Department</div>
                    <div className="font-medium">{credential.department || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Team</div>
                    <div className="font-medium">{credential.team || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Position</div>
                    <div className="font-medium">{credential.position || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Location</div>
                    <div className="font-medium">{credential.location || 'N/A'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-600">Hire Date</div>
                    <div className="font-medium">
                      {credential.hire_date
                        ? new Date(credential.hire_date).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Verified At</div>
                    <div className="font-medium">
                      {credential.verified_at
                        ? new Date(credential.verified_at).toLocaleDateString()
                        : 'Not verified'}
                    </div>
                  </div>
                </div>

                {credential.national_id_hash && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600">National ID (Hashed)</div>
                    <div className="font-mono text-xs text-gray-500 truncate">
                      {credential.national_id_hash}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-yellow-800">
                  <div className="font-semibold mb-1">연결된 인증 정보가 없습니다</div>
                  <div className="text-sm">
                    이 사용자는 아직 인증 정보로 신원을 확인하지 않았습니다.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification Code Information */}
          {verification_code && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">인증 코드</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(verification_code.status)}`}
                >
                  {verification_code.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">코드</div>
                    <div className="font-mono font-bold text-lg">{verification_code.code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Intended Recipient</div>
                    <div className="font-medium">{verification_code.intended_recipient_name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-600">생성일</div>
                    <div className="font-medium">
                      {new Date(verification_code.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Expires</div>
                    <div className="font-medium">
                      {new Date(verification_code.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  {verification_code.used_at && (
                    <div>
                      <div className="text-sm text-gray-600">Used At</div>
                      <div className="font-medium">
                        {new Date(verification_code.used_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Access Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Access Level Summary</h2>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Role Level</div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{profile.role}</span>
                    <span className="text-sm text-gray-600">
                      {access_summary.role_level + 1}/{ROLE_HIERARCHY.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((access_summary.role_level + 1) / ROLE_HIERARCHY.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">Tier Level</div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{profile.tier}</span>
                    <span className="text-sm text-gray-600">
                      {access_summary.tier_level + 1}/{TIER_HIERARCHY.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${((access_summary.tier_level + 1) / TIER_HIERARCHY.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">인증 상태</div>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {access_summary.credential_verified ? '인증완료' : '미인증'}
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full ${access_summary.credential_verified ? 'bg-green-500' : 'bg-gray-300'}`}
                    />
                  </div>
                  {access_summary.credential_verified && (
                    <div className="mt-2 text-sm text-green-700">
                      +{Math.round(access_summary.credential_boost * 100)}% access boost
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">Effective Access</div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-lg font-bold text-center text-blue-600">
                    {access_summary.effective_access_level}
                  </div>
                  <div className="text-xs text-center text-gray-600 mt-1">
                    Combined access level
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>• Role and tier determine base access</div>
                  <div>• Verified credentials provide bonus access</div>
                  <div>• Classification rules filter content</div>
                  <div>• Time/geo restrictions may apply</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  )
}
