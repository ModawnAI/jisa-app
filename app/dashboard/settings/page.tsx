'use client';

/**
 * Dashboard Settings Page
 * User preferences and account settings
 */

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { User, Bell, Lock, CreditCard, Globe } from 'lucide-react';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">설정</h1>
          <p className="mt-2 text-sm text-gray-600">
            계정 및 시스템 설정을 관리합니다
          </p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">프로필</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  defaultValue="관리자"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  defaultValue="admin@jisa.app"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                프로필 저장
              </button>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Bell className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">알림</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">이메일 알림</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">쿼리 알림</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">결제 알림</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">시스템 알림</span>
                <input type="checkbox" className="rounded" />
              </label>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Lock className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">보안</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                비밀번호 변경
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">결제 수단</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                등록된 결제 수단이 없습니다
              </p>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                결제 수단 추가
              </button>
            </div>
          </div>

          {/* Language & Region */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">언어 및 지역</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  언어
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시간대
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="Asia/Seoul">서울 (GMT+9)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
