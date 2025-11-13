/**
 * Dashboard Header
 * Top navigation bar with user menu
 */

'use client';

import { Bell, User, LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    // TODO: Implement Supabase logout
    router.push('/auth/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Breadcrumb / Page Title */}
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800">관리자 대시보드</h2>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="알림"
        >
          <Bell className="w-5 h-5" />
          {/* Notification Badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="relative group">
          <button className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md transition-colors">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">관리자</p>
              <p className="text-xs text-gray-500">admin@jisa.app</p>
            </div>
          </button>

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="py-1">
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4 mr-3" />
                설정
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-3" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
