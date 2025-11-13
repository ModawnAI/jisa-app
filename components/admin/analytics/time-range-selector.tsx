/**
 * Time Range Selector Component
 * Allows selection of analytics time range (7d, 30d, 90d)
 */

'use client';

import { useState } from 'react';

export type TimeRange = '7d' | '30d' | '90d';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

export function TimeRangeSelector({
  value,
  onChange,
  className = '',
}: TimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
      <div className="flex bg-muted rounded-lg p-1">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all
              ${
                value === range.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
