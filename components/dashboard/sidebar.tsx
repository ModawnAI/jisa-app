/**
 * Sidebar Navigation
 * Main navigation for dashboard
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  KeyRound,
  MessageSquare,
  Shield,
  Database,
  Upload,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

const navigation: NavigationItem[] = [
  {
    name: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '챗봇 테스트',
    href: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    name: '사용자 관리',
    href: '/admin/users',
    icon: Users,
    adminOnly: true,
  },
  {
    name: '접근 제어',
    href: '/admin/access-control',
    icon: Shield,
    adminOnly: true,
  },
  {
    name: '쿼리 로그',
    href: '/admin/logs',
    icon: FileText,
    adminOnly: true,
  },
  {
    name: '문서 관리',
    href: '/admin/documents',
    icon: Database,
    adminOnly: true,
  },
  {
    name: '데이터 수집',
    href: '/admin/data/upload',
    icon: Upload,
    adminOnly: true,
    badge: 'NEW',
  },
  {
    name: '인증 코드',
    href: '/admin/codes',
    icon: KeyRound,
    adminOnly: true,
  },
  {
    name: '분석',
    href: '/admin/analytics',
    icon: BarChart3,
    adminOnly: true,
  },
  {
    name: '설정',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo / Brand */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
        <h1 className="text-2xl font-bold text-primary-600">지사 JISA</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="flex-1">{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                    Admin
                  </span>
                )}
                {item.badge && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500 text-center">
          <p>JISA App v1.0</p>
          <p className="mt-1">© 2025 HO&F</p>
        </div>
      </div>
    </div>
  );
}
