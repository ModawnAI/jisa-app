/**
 * Users Table Component
 * Displays users with role and tier management
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Edit, Shield, Crown, Briefcase, User as UserIcon } from 'lucide-react';
import { UserRole, SubscriptionTier } from '@/lib/types/access-control';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  department?: string;
  query_count: number;
  created_at: string;
  last_login_at?: string;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?page=${page}&limit=20`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const badges = {
      ceo: { icon: Crown, color: 'bg-purple-100 text-purple-800', label: 'CEO' },
      admin: { icon: Shield, color: 'bg-red-100 text-red-800', label: 'Admin' },
      manager: { icon: Briefcase, color: 'bg-amber-100 text-amber-800', label: 'Manager' },
      senior: { icon: UserIcon, color: 'bg-blue-100 text-blue-800', label: 'Senior' },
      junior: { icon: UserIcon, color: 'bg-green-100 text-green-800', label: 'Junior' },
      user: { icon: UserIcon, color: 'bg-gray-100 text-gray-800', label: 'User' },
    };

    const badge = badges[role] || badges.user;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const getTierBadge = (tier: SubscriptionTier) => {
    const colors = {
      enterprise: 'bg-purple-100 text-purple-800 border-purple-200',
      pro: 'bg-blue-100 text-blue-800 border-blue-200',
      basic: 'bg-green-100 text-green-800 border-green-200',
      free: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels = {
      enterprise: 'Enterprise',
      pro: 'Pro',
      basic: 'Basic',
      free: 'Free',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded border ${colors[tier]}`}>
        {labels[tier]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">사용자를 불러오는 중...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">사용자가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  구독 티어
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  부서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  쿼리 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTierBadge(user.subscription_tier)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {user.query_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-primary-600 hover:text-primary-700">
                      <Edit className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            페이지 {page} / {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
