'use client';

/**
 * 통합 사용자 관리 페이지
 * Unified User Management Page
 * Combines employees, users, credentials, and codes into one interface
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { useState, useEffect } from 'react';
import {
  Users,
  KeyRound,
  UserCheck,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';

type Tab = 'users' | 'codes' | 'bulk';

interface User {
  id: string;
  full_name: string;
  email?: string;
  employee_id?: string;
  phone_number?: string;
  department?: string;
  team?: string;
  position?: string;
  status: 'pending' | 'verified' | 'inactive';
  has_code: boolean;
  verification_code?: string;
  code_status?: string;
  kakao_user_id?: string;
  role?: string;
  tier?: string;
  last_activity?: string;
  created_at: string;
  metadata?: {
    department?: string;
    team?: string;
    position?: string;
    role?: string;
    tier?: string;
    [key: string]: any;
  };
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [codeFilter, setCodeFilter] = useState('all');

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, statusFilter, codeFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      console.log('Fetching users with params:', params.toString());

      // Try to fetch from /api/admin/users (profiles table)
      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        alert(`데이터 로드 실패: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      console.log('Fetched data:', data);

      // Map profiles to user format
      const mappedUsers = (data.users || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name || profile.kakao_nickname || '이름 없음',
        email: profile.email,
        employee_id: profile.metadata?.employee_id || null,
        phone_number: null,
        department: profile.department || profile.metadata?.department,
        position: profile.metadata?.position,
        status: profile.credential_verified ? 'verified' : 'pending',
        has_code: !!profile.verified_with_code,
        verification_code: profile.verified_with_code,
        role: profile.role,
        tier: profile.subscription_tier,
        created_at: profile.created_at,
        metadata: profile.metadata
      }));

      console.log('Mapped users:', mappedUsers);
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      verified: { text: '인증완료', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { text: '대기중', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
      inactive: { text: '비활성', class: 'bg-gray-100 text-gray-800', icon: XCircle },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        <Icon className="h-3 w-3" />
        {badge.text}
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.employee_id?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: users.length,
    verified: users.filter(u => u.status === 'verified').length,
    pending: users.filter(u => u.status === 'pending').length,
    with_codes: users.filter(u => u.has_code).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              직원, 인증 정보, 코드를 통합 관리합니다
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/admin/codes/generate'}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              코드 생성
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              대량 업로드
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 사용자</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">인증완료</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">코드 보유</p>
                <p className="text-2xl font-bold text-primary-600 mt-1">{stats.with_codes}</p>
              </div>
              <KeyRound className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Users className="h-5 w-5" />
              사용자 목록
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`${
                activeTab === 'codes'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <KeyRound className="h-5 w-5" />
              인증 코드
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`${
                activeTab === 'bulk'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Upload className="h-5 w-5" />
              대량 업로드
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="이름, 이메일, 사원번호 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">모든 상태</option>
                  <option value="verified">인증완료</option>
                  <option value="pending">대기중</option>
                  <option value="inactive">비활성</option>
                </select>
                <select
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">모든 코드 상태</option>
                  <option value="with_code">코드 있음</option>
                  <option value="without_code">코드 없음</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">불러오는 중...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          사용자
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          연락처
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          부서/직급
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          코드
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <UserCheck className="h-5 w-5 text-primary-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.employee_id || 'ID 없음'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email || '-'}</div>
                            <div className="text-sm text-gray-500">{user.phone_number || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.department || user.metadata?.department || '-'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.position || user.metadata?.position || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(user.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.has_code ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckCircle className="h-3 w-3" />
                                코드 있음
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                <AlertCircle className="h-3 w-3" />
                                코드 없음
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => window.location.href = `/admin/employees/${user.id}`}
                                className="text-primary-600 hover:text-primary-900"
                                title="상세보기"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                className="text-gray-600 hover:text-gray-900"
                                title="수정"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">사용자가 없습니다</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center py-12">
              <KeyRound className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                코드 관리 기능은 곧 추가됩니다
              </p>
              <button
                onClick={() => window.location.href = '/admin/codes'}
                className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
              >
                기존 코드 페이지 보기
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center py-12">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                대량 업로드 기능은 곧 추가됩니다
              </p>
              <button
                onClick={() => window.location.href = '/admin/codes/bulk-generate'}
                className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
              >
                기존 대량 생성 페이지 보기
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
