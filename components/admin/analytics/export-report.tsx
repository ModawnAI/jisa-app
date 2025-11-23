/**
 * Export Report Component
 * Provides functionality to export analytics data
 */

'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TimeRange = '7d' | '30d' | '90d';

interface ExportReportProps {
  timeRange: TimeRange;
}

export function ExportReport({ timeRange }: ExportReportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange,
          format: 'csv',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get the CSV data
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={handleExport}
        disabled={isExporting}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            내보내는 중...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            CSV로 내보내기
          </>
        )}
      </Button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
