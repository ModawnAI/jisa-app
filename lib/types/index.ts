/**
 * Core TypeScript types for JISA App
 */

// ==================== Metadata Types ====================

export interface MetadataKey {
  content_types: string[];
  chunk_types: string[];
  primary_categories: string[];
  sub_categories: string[];
  companies: string[];
  products_examples: string[];
  product_names_examples: string[];
  presenters_examples: string[];
  locations: string[];
  date_examples: string[];
  month_examples: string[];
  boolean_filters: string[];
  payment_terms: string[];
  commission_categories: string[];
  commission_periods: string[];
  _note?: string;
}

export interface PdfUrlsConfig {
  schedule_pdfs: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
  policy_pdfs: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

// ==================== RAG Types ====================

export interface EnhancedQuery {
  improved_query: string;
  pinecone_filter?: Record<string, any>;
  reasoning?: string;
  keywords?: string[];
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export interface PineconeSearchResult {
  matches: PineconeMatch[];
  namespace?: string;
}

export interface PdfAttachment {
  title: string;
  url: string;
  description?: string;
}

// ==================== Commission Types ====================

export interface CommissionDetectionResult {
  is_commission_query: boolean;
  confidence: number;
  matched_keywords: string[];
  reasoning: string;
}

export interface CommissionQueryResult {
  status: 'success' | 'error';
  message?: string;
  best_match?: {
    product_name: string;
    company: string;
    payment_period: string;
    commission_rate: number;
    [key: string]: any;
  };
  alternatives?: any[];
  [key: string]: any;
}

// ==================== Chat Types ====================

export interface ChatRequest {
  user_message: string;
  user_id?: string;
  session_id?: string;
}

export interface ChatResponse {
  version: string;
  template: {
    outputs: Array<{
      simpleText: {
        text: string;
      };
    }>;
    quickReplies: any[];
  };
}

// ==================== Supabase Types (Future) ====================

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'user' | 'guest';
  permissions?: string[];
  subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise';
  kakao_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface QueryLog {
  id: string;
  user_id?: string;
  kakao_user_id?: string;
  session_id?: string;
  query_text: string;
  response_text?: string;
  response_time?: number;
  query_type?: 'commission' | 'rag' | 'unknown';
  was_commission_query?: boolean;
  commission_confidence?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}
