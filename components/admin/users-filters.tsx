/**
 * Users Filters Component
 * Filter controls for user management
 */

'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

export function UsersFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="이메일 또는 이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
          >
            <option value="all">모든 역할</option>
            <option value="ceo">CEO</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="senior">Senior</option>
            <option value="junior">Junior</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Tier Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
          >
            <option value="all">모든 티어</option>
            <option value="enterprise">Enterprise</option>
            <option value="pro">Pro</option>
            <option value="basic">Basic</option>
            <option value="free">Free</option>
          </select>
        </div>
      </div>
    </div>
  );
}
