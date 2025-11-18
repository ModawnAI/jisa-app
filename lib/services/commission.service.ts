/**
 * Commission Service - Direct TypeScript Integration with Node.js System
 * No subprocess needed - direct module import
 */

import { NaturalLanguageCommissionSystem } from '@/commission_query_system_dynamic/src/nl_query_system_dynamic.js';

export interface CommissionResult {
  status: 'success' | 'error';
  message?: string;
  error?: string;
  best_match?: {
    product_name: string;
    company: string;
    payment_period: string;
    match_score: number;
    metadata?: Record<string, any>;
  };
  commission_data?: {
    product: {
      commission_rates: Record<string, number>;
    };
    multiplier_ratio: number;
    calculation_formula: string;
  };
  percentage?: number;
  alternatives?: Array<{
    product_name: string;
    company: string;
    payment_period: string;
    match_score: number;
  }>;
}

// Singleton instance
let commissionSystem: NaturalLanguageCommissionSystem | null = null;

/**
 * Get commission system instance (lazy initialization)
 */
function getCommissionSystem(): NaturalLanguageCommissionSystem {
  if (!commissionSystem) {
    commissionSystem = new NaturalLanguageCommissionSystem();
  }
  return commissionSystem;
}

/**
 * Query the commission system
 */
export async function queryCommission(userQuery: string): Promise<CommissionResult> {
  try {
    console.log(`[Commission] Querying: ${userQuery}`);

    const system = getCommissionSystem();
    const result = await system.executeQuery(userQuery);

    console.log(`[Commission] Query successful: ${result.status}`);
    return result as CommissionResult;
  } catch (error) {
    console.error(`[Commission] Error: ${error}`);
    return {
      status: 'error',
      message: '수수료 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Format commission result as context for GPT (plain text, no technical details)
 */
export function formatCommissionForGPT(result: CommissionResult): string {
  if (result.status === 'error') {
    return `수수료 조회 오류: ${result.message || '수수료 정보를 찾을 수 없습니다.'}`;
  }

  if (!result.best_match || !result.commission_data) {
    return '수수료 정보를 찾을 수 없습니다.';
  }

  const lines: string[] = [];

  // Best match product
  const bestMatch = result.best_match;
  lines.push('=== 수수료 조회 결과 ===');
  lines.push('');
  lines.push(`상품명: ${bestMatch.product_name}`);
  lines.push(`보험회사: ${bestMatch.company}`);
  lines.push(`납입기간: ${bestMatch.payment_period}`);

  // Add 환산율 (conversion rate) if available - CONVERT TO PERCENTAGE
  const metadata = bestMatch.metadata || {};
  if (metadata['환산율']) {
    const conversionRate = parseFloat(metadata['환산율']);
    const conversionRatePercent = (conversionRate * 100).toFixed(2);
    lines.push(`환산율: ${conversionRatePercent}%`);
  }

  lines.push('');

  // Commission data - NO 배율, NO 공식
  const commData = result.commission_data;
  const percentage = result.percentage || 60;
  lines.push(`수수료율 (${percentage}% 기준):`);
  lines.push('');

  // Commission rates details - FILTER OUT col_X and only show meaningful keys
  const rates = Object.entries(commData.product.commission_rates);

  // Filter out technical column names
  const meaningfulRates = rates.filter(([key]) => {
    return !key.startsWith('col_') && !key.startsWith('Col_');
  });

  // Show only meaningful rates with cleaner key names - CONVERT TO PERCENTAGE
  for (const [key, value] of meaningfulRates.slice(0, 10)) {
    // Clean up key name
    let cleanKey = key;
    if (cleanKey.includes('_0.6_0.6_')) {
      cleanKey = cleanKey.split('_0.6_0.6_').pop() || cleanKey;
    }
    if (cleanKey.includes('2025년 FC 수수료_')) {
      cleanKey = cleanKey.replace('2025년 FC 수수료_', '');
    }

    // CRITICAL: Convert decimal to percentage (0.78 → 78%, 3.7714 → 377.14%)
    const percentValue = (value * 100).toFixed(2);
    lines.push(`${cleanKey}: ${percentValue}%`);
  }

  lines.push('');

  return lines.join('\n');
}
