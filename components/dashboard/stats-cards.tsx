/**
 * Stats Cards Component
 * Displays key metrics in card format
 */

'use client';

import { MessageSquare, Users, Clock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Stat {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ElementType;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stat[]>([
    {
      name: '오늘의 쿼리',
      value: '0',
      change: '+0%',
      changeType: 'increase',
      icon: MessageSquare,
    },
    {
      name: '활성 사용자',
      value: '0',
      change: '+0%',
      changeType: 'increase',
      icon: Users,
    },
    {
      name: '평균 응답 시간',
      value: '0ms',
      change: '-0%',
      changeType: 'decrease',
      icon: Clock,
    },
    {
      name: 'RAG 성공률',
      value: '0%',
      change: '+0%',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');

      if (!response.ok) {
        console.error('Failed to fetch stats');
        return;
      }

      const data = await response.json();

      const updatedStats: Stat[] = [
        {
          name: '오늘의 쿼리',
          value: data.todayQueries.toLocaleString(),
          change: `${data.queryChange >= 0 ? '+' : ''}${data.queryChange}%`,
          changeType: data.queryChange >= 0 ? 'increase' : 'decrease',
          icon: MessageSquare,
        },
        {
          name: '활성 사용자',
          value: data.activeUsers.toLocaleString(),
          change: `${data.usersChange >= 0 ? '+' : ''}${data.usersChange}%`,
          changeType: data.usersChange >= 0 ? 'increase' : 'decrease',
          icon: Users,
        },
        {
          name: '평균 응답 시간',
          value: `${data.avgResponseTime}ms`,
          change: `${data.responseTimeChange >= 0 ? '+' : ''}${data.responseTimeChange}%`,
          changeType: data.responseTimeChange <= 0 ? 'increase' : 'decrease',
          icon: Clock,
        },
        {
          name: 'RAG 성공률',
          value: `${data.successRate}%`,
          change: `${data.successRateChange >= 0 ? '+' : ''}${data.successRateChange}%`,
          changeType: data.successRateChange >= 0 ? 'increase' : 'decrease',
          icon: TrendingUp,
        },
      ];

      setStats(updatedStats);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-primary-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <div
              className={`text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stat.change}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-600">{stat.name}</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
