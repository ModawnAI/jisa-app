/**
 * Sidebar Navigation
 * Main navigation for dashboard
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { COMPANY_INFO } from '@/lib/constants/company';
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  FolderOpen,
  Layers,
  UserCheck,
  Tags,
  KeyRound,
  Briefcase,
  CreditCard,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    title: '대시보드',
    items: [
      {
        name: '홈',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: '관리자',
        href: '/admin',
        icon: Shield,
        adminOnly: true,
      },
    ],
  },
  {
    title: '사용자 관리',
    items: [
      {
        name: '사용자',
        href: '/admin/users',
        icon: Users,
        adminOnly: true,
      },
      {
        name: '직원',
        href: '/admin/employees',
        icon: Briefcase,
        adminOnly: true,
      },
      {
        name: '인증 정보',
        href: '/admin/credentials',
        icon: UserCheck,
        adminOnly: true,
      },
    ],
  },
  {
    title: '코드 관리',
    items: [
      {
        name: '인증 코드',
        href: '/admin/codes',
        icon: KeyRound,
        adminOnly: true,
      },
    ],
  },
  {
    title: '콘텐츠 관리',
    items: [
      {
        name: '분류',
        href: '/admin/classification',
        icon: Tags,
        adminOnly: true,
      },
      {
        name: '문서',
        href: '/admin/data/documents',
        icon: FolderOpen,
        adminOnly: true,
      },
      {
        name: '지식 베이스',
        href: '/admin/data/contexts',
        icon: Layers,
        adminOnly: true,
      },
    ],
  },
  {
    title: '시스템',
    items: [
      {
        name: '결제',
        href: '/admin/billing',
        icon: CreditCard,
        adminOnly: true,
      },
      {
        name: '로그',
        href: '/admin/logs',
        icon: FileText,
        adminOnly: true,
      },
    ],
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
        <div className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title}>
              {/* Section Title */}
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + '/');

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
                      <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500 text-center">
          <p className="font-semibold text-gray-700">{COMPANY_INFO.appName}</p>
          <p className="mt-1">{COMPANY_INFO.copyright}</p>
          <p className="mt-0.5 text-[10px]">{COMPANY_INFO.certification}</p>
        </div>
      </div>
    </div>
  );
}
