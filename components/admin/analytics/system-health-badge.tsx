/**
 * System Health Badge Component
 * Displays real-time system health status
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  activeUsers: number;
  activeSessions: number;
  avgResponseTime: number;
  lastChecked: string;
}

export function SystemHealthBadge() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/analytics/health');
        if (response.ok) {
          const data = await response.json();
          setHealth(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchHealth();

    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading || !health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking system...</span>
      </div>
    );
  }

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      label: 'Healthy',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    },
    degraded: {
      icon: AlertCircle,
      label: 'Degraded',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    },
    unhealthy: {
      icon: AlertCircle,
      label: 'Unhealthy',
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    },
    unknown: {
      icon: Activity,
      label: 'Unknown',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
    },
  };

  const config = statusConfig[health.status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.className}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
      <span className="text-xs opacity-75">
        {health.activeUsers} active • {health.avgResponseTime}ms
      </span>
    </div>
  );
}
