/**
 * Logs Filters Component
 * Filter controls for query logs
 */

'use client';

import { useState } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';

export function LogsFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [queryType, setQueryType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting logs...');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="쿼리 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Query Type Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={queryType}
            onChange={(e) => setQueryType(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
          >
            <option value="all">모든 타입</option>
            <option value="rag">RAG</option>
            <option value="commission">Commission</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
          >
            <option value="today">오늘</option>
            <option value="yesterday">어제</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="all">전체</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          CSV 내보내기
        </button>
      </div>
    </div>
  );
}
