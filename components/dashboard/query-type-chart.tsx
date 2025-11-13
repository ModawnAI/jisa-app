/**
 * Query Type Chart Component
 * Shows distribution of query types (RAG vs Commission)
 */

'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  [key: string]: any;
}

const COLORS = {
  RAG: '#3b82f6',
  Commission: '#10b981',
  Unknown: '#6b7280',
};

export function QueryTypeChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/chart-data?days=7');

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const result = await response.json();
      setData(result.queryTypeDistribution || []);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">쿼리 타입 분포</h3>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500">데이터가 없습니다</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Unknown}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        COLORS[entry.name as keyof typeof COLORS] || COLORS.Unknown,
                    }}
                  ></div>
                  <span className="text-gray-700">{entry.name} 쿼리</span>
                </div>
                <span className="font-medium text-gray-900">
                  {entry.value.toLocaleString()} ({entry.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
