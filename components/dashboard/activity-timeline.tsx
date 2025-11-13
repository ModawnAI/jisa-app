/**
 * Activity Timeline Component
 * Shows recent system activities
 */

'use client';

import { Clock, User, FileText, Key } from 'lucide-react';

interface Activity {
  id: string;
  type: 'query' | 'user' | 'code' | 'system';
  message: string;
  timestamp: string;
}

export function ActivityTimeline() {
  // TODO: Fetch real activity data
  const activities: Activity[] = [];

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      query: FileText,
      user: User,
      code: Key,
      system: Clock,
    };

    return icons[type] || Clock;
  };

  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      query: 'bg-blue-100 text-blue-600',
      user: 'bg-green-100 text-green-600',
      code: 'bg-amber-100 text-amber-600',
      system: 'bg-gray-100 text-gray-600',
    };

    return colors[type] || colors.system;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>

      {activities.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500">아직 활동이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4 h-64 overflow-y-auto">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);

            return (
              <div key={activity.id} className="flex items-start">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
