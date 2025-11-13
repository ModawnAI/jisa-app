/**
 * Analytics Service - Query Logging and Analytics
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface QueryLogData {
  userId?: string;
  kakaoUserId?: string;
  sessionId: string;
  queryText: string;
  responseText: string;
  responseTime: number;
  queryType?: 'commission' | 'rag' | 'unknown';
  wasCommissionQuery?: boolean;
  commissionConfidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Log a query to Supabase
 */
export async function logQuery(data: QueryLogData): Promise<void> {
  try {
    const supabase = createServiceClient();

    const logEntry = {
      user_id: data.userId || null,
      kakao_user_id: data.kakaoUserId || null,
      session_id: data.sessionId,
      query_text: data.queryText,
      response_text: data.responseText,
      response_time: data.responseTime,
      query_type: data.queryType || 'unknown',
      was_commission_query: data.wasCommissionQuery || false,
      commission_confidence: data.commissionConfidence || null,
      metadata: data.metadata || {},
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('query_logs')
      .insert(logEntry);

    if (error) {
      console.error('Failed to log query:', error);
    } else {
      console.log('✅ Query logged successfully');
    }
  } catch (error) {
    console.error('Error logging query:', error);
  }
}

/**
 * Log an analytics event
 */
export async function logAnalyticsEvent(data: {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  queryText?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const supabase = createServiceClient();

    const eventEntry = {
      user_id: data.userId || null,
      session_id: data.sessionId || null,
      event_type: data.eventType,
      event_category: data.eventCategory || null,
      event_action: data.eventAction || null,
      event_label: data.eventLabel || null,
      query_text: data.queryText || null,
      metadata: data.metadata || {},
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('analytics_events')
      .insert(eventEntry);

    if (error) {
      console.error('Failed to log analytics event:', error);
    }
  } catch (error) {
    console.error('Error logging analytics event:', error);
  }
}
