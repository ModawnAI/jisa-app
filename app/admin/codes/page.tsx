'use client';

/**
 * Access Codes Page
 * Admin interface for viewing and managing access codes
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { CodesTable } from '@/components/admin/codes-table';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CodesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">인증 코드 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              액세스 코드를 생성하고 관리합니다
            </p>
          </div>
          <Link
            href="/admin/codes/generate"
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            코드 생성
          </Link>
        </div>

        {/* Codes Table */}
        <CodesTable />
      </div>
    </DashboardLayout>
  );
}
