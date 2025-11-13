'use client';

/**
 * Dashboard Home Page
 * Overview with key metrics and statistics
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentQueries } from '@/components/dashboard/recent-queries';
import { QueryTypeChart } from '@/components/dashboard/query-type-chart';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-sm text-gray-600">
            JISA 챗봇 시스템 개요 및 주요 지표
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QueryTypeChart />
          <ActivityTimeline />
        </div>

        {/* Recent Queries */}
        <RecentQueries />
      </div>
    </DashboardLayout>
  );
}
