'use client'

/**
 * Admin Dashboard Home
 *
 * Central hub for all admin features with quick access and statistics.
 *
 * Database: kuixphvkbuuzfezoeyii
 * Phase 4: Enhanced Admin UI - Dashboard Integration
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import {
  Users,
  UserCheck,
  KeyRound,
  FileStack,
  Tags,
  FolderOpen,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface QuickAccessCard {
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: string
  badge?: string
}

interface StatCard {
  title: string
  value: string | number
  change?: string
  icon: React.ElementType
  color: string
  loading?: boolean
}

const quickAccessCards: QuickAccessCard[] = [
  // Hidden: 통합 사용자 관리
  // {
  //   title: '통합 사용자 관리',
  //   description: '사용자, 인증 정보, 코드 통합 관리',
  //   href: '/admin/user-management',
  //   icon: Users,
  //   color: 'blue',
  //   badge: 'NEW',
  // },
  {
    title: '인증 코드',
    description: '코드 생성 및 관리',
    href: '/admin/codes',
    icon: KeyRound,
    color: 'purple',
  },
  {
    title: '대량 코드 생성',
    description: 'CSV 업로드로 대량 코드 생성',
    href: '/admin/codes/bulk-generate',
    icon: FileStack,
    color: 'orange',
  },
  {
    title: '분류 관리',
    description: '문서 및 컨텍스트 분류 설정',
    href: '/admin/classification',
    icon: Tags,
    color: 'pink',
    badge: 'NEW',
  },
  {
    title: '문서 라이브러리',
    description: '업로드된 문서 관리',
    href: '/admin/data/documents',
    icon: FolderOpen,
    color: 'indigo',
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Fetch credentials stats
      const credentialsRes = await fetch('/api/admin/credentials/stats')
      const credentialsData = credentialsRes.ok ? await credentialsRes.json() : null

      // Fetch classification stats
      const classificationRes = await fetch('/api/admin/classification/stats')
      const classificationData = classificationRes.ok ? await classificationRes.json() : null

      // Fetch users/profiles stats
      const usersRes = await fetch('/api/admin/users')
      const usersData = usersRes.ok ? await usersRes.json() : null

      // Fetch contexts stats
      const contextsRes = await fetch('/api/admin/data/contexts/stats')
      const contextsData = contextsRes.ok ? await contextsRes.json() : null

      const statsCards: StatCard[] = [
        {
          title: '총 인증 정보',
          value: credentialsData?.stats?.total || 0,
          icon: UserCheck,
          color: 'blue',
        },
        {
          title: '인증 완료',
          value: credentialsData?.stats?.verified || 0,
          icon: CheckCircle,
          color: 'green',
        },
        {
          title: '활성 사용자',
          value: usersData?.total || 0,
          icon: Users,
          color: 'indigo',
        },
        {
          title: '총 문서',
          value: classificationData?.stats?.total_documents || 0,
          icon: FileStack,
          color: 'purple',
        },
        {
          title: '지식 베이스 (Pinecone)',
          value: contextsData?.total || 0,
          icon: FolderOpen,
          color: 'orange',
        },
        {
          title: '분류율',
          value: classificationData?.stats?.classification_rate
            ? `${Math.round(classificationData.stats.classification_rate)}%`
            : '0%',
          icon: TrendingUp,
          color: 'pink',
        },
      ]

      setStats(statsCards)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100',
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:bg-green-100',
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:bg-purple-100',
      },
      orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-200',
        hover: 'hover:bg-orange-100',
      },
      pink: {
        bg: 'bg-pink-50',
        text: 'text-pink-600',
        border: 'border-pink-200',
        hover: 'hover:bg-pink-100',
      },
      indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-200',
        hover: 'hover:bg-indigo-100',
      },
      yellow: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        border: 'border-yellow-200',
        hover: 'hover:bg-yellow-100',
      },
    }

    return colors[color] || colors.blue
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="mt-2 text-sm text-gray-600">
            사용자 기반 코드 생성 시스템 관리 센터
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))
          ) : (
            stats.map((stat, index) => {
              const colors = getColorClasses(stat.color)
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      {stat.change && (
                        <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                      )}
                    </div>
                    <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Quick Access Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">빠른 액세스</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickAccessCards.map((card) => {
              const colors = getColorClasses(card.color)
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`block bg-white rounded-lg border ${colors.border} p-6 ${colors.hover} transition-all hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <card.icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    {card.badge && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
