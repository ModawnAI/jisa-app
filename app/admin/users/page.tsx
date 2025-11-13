/**
 * Admin Users Page
 * User management interface
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { UsersTable } from '@/components/admin/users-table';
import { UsersFilters } from '@/components/admin/users-filters';
import { UserPlus } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              시스템 사용자를 관리하고 권한을 설정합니다
            </p>
          </div>
          <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
            <UserPlus className="w-5 h-5 mr-2" />
            사용자 추가
          </button>
        </div>

        {/* Filters */}
        <UsersFilters />

        {/* Users Table */}
        <UsersTable />
      </div>
    </DashboardLayout>
  );
}
