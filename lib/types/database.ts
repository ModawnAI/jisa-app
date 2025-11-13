export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          kakao_user_id: string | null
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json
          event_type: string
          id?: string
          kakao_user_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          kakao_user_id?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
          payment_id: string | null
          subscription_id: string | null
          user_id: string | null
          webhook_data: Json | null
          webhook_type: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
          webhook_data?: Json | null
          webhook_type?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
          webhook_data?: Json | null
          webhook_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      contexts: {
        Row: {
          access_level: string | null
          access_metadata: Json | null
          available_from: string | null
          available_until: string | null
          compliance_tags: string[] | null
          content: string
          content_category: string[] | null
          created_at: string | null
          document_id: string | null
          embedding_model: string | null
          embedding_version: string | null
          geo_restrictions: string[] | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          pinecone_id: string | null
          pinecone_namespace: string | null
          required_role: string | null
          required_tier: string | null
          sensitivity_level: string | null
          target_departments: string[] | null
          target_positions: string[] | null
          target_roles: string[] | null
          target_tiers: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          access_metadata?: Json | null
          available_from?: string | null
          available_until?: string | null
          compliance_tags?: string[] | null
          content: string
          content_category?: string[] | null
          created_at?: string | null
          document_id?: string | null
          embedding_model?: string | null
          embedding_version?: string | null
          geo_restrictions?: string[] | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          pinecone_id?: string | null
          pinecone_namespace?: string | null
          required_role?: string | null
          required_tier?: string | null
          sensitivity_level?: string | null
          target_departments?: string[] | null
          target_positions?: string[] | null
          target_roles?: string[] | null
          target_tiers?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          access_metadata?: Json | null
          available_from?: string | null
          available_until?: string | null
          compliance_tags?: string[] | null
          content?: string
          content_category?: string[] | null
          created_at?: string | null
          document_id?: string | null
          embedding_model?: string | null
          embedding_version?: string | null
          geo_restrictions?: string[] | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          pinecone_id?: string | null
          pinecone_namespace?: string | null
          required_role?: string | null
          required_tier?: string | null
          sensitivity_level?: string | null
          target_departments?: string[] | null
          target_positions?: string[] | null
          target_roles?: string[] | null
          target_tiers?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contexts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_verification_log: {
        Row: {
          id: string
          intended_credential_id: string | null
          ip_address: string | null
          kakao_user_id: string
          match_details: Json | null
          match_score: number | null
          match_status: string | null
          metadata: Json | null
          profile_created: string | null
          provided_email: string | null
          provided_employee_id: string | null
          provided_name: string | null
          provided_phone: string | null
          rejection_reason: string | null
          timestamp: string | null
          user_agent: string | null
          verification_code: string
          verification_result: string | null
        }
        Insert: {
          id?: string
          intended_credential_id?: string | null
          ip_address?: string | null
          kakao_user_id: string
          match_details?: Json | null
          match_score?: number | null
          match_status?: string | null
          metadata?: Json | null
          profile_created?: string | null
          provided_email?: string | null
          provided_employee_id?: string | null
          provided_name?: string | null
          provided_phone?: string | null
          rejection_reason?: string | null
          timestamp?: string | null
          user_agent?: string | null
          verification_code: string
          verification_result?: string | null
        }
        Update: {
          id?: string
          intended_credential_id?: string | null
          ip_address?: string | null
          kakao_user_id?: string
          match_details?: Json | null
          match_score?: number | null
          match_status?: string | null
          metadata?: Json | null
          profile_created?: string | null
          provided_email?: string | null
          provided_employee_id?: string | null
          provided_name?: string | null
          provided_phone?: string | null
          rejection_reason?: string | null
          timestamp?: string | null
          user_agent?: string | null
          verification_code?: string
          verification_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_verification_log_intended_credential_id_fkey"
            columns: ["intended_credential_id"]
            isOneToOne: false
            referencedRelation: "user_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_verification_log_profile_created_fkey"
            columns: ["profile_created"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access_level: string
          allowed_departments: string[] | null
          auto_classified: boolean | null
          available_from: string | null
          available_until: string | null
          classification_confidence: number | null
          classification_method: string | null
          compliance_tags: string[] | null
          content: string
          content_category: string[] | null
          created_at: string | null
          created_by: string | null
          geo_restrictions: string[] | null
          id: string
          metadata: Json | null
          namespace: string
          pdf_url: string | null
          pinecone_id: string | null
          required_role: string | null
          required_tier: string | null
          sensitivity_level: string | null
          superseded_by: string | null
          tags: string[] | null
          target_departments: string[] | null
          target_positions: string[] | null
          target_roles: string[] | null
          target_tiers: string[] | null
          title: string
          updated_at: string | null
          version_number: string | null
        }
        Insert: {
          access_level?: string
          allowed_departments?: string[] | null
          auto_classified?: boolean | null
          available_from?: string | null
          available_until?: string | null
          classification_confidence?: number | null
          classification_method?: string | null
          compliance_tags?: string[] | null
          content: string
          content_category?: string[] | null
          created_at?: string | null
          created_by?: string | null
          geo_restrictions?: string[] | null
          id?: string
          metadata?: Json | null
          namespace?: string
          pdf_url?: string | null
          pinecone_id?: string | null
          required_role?: string | null
          required_tier?: string | null
          sensitivity_level?: string | null
          superseded_by?: string | null
          tags?: string[] | null
          target_departments?: string[] | null
          target_positions?: string[] | null
          target_roles?: string[] | null
          target_tiers?: string[] | null
          title: string
          updated_at?: string | null
          version_number?: string | null
        }
        Update: {
          access_level?: string
          allowed_departments?: string[] | null
          auto_classified?: boolean | null
          available_from?: string | null
          available_until?: string | null
          classification_confidence?: number | null
          classification_method?: string | null
          compliance_tags?: string[] | null
          content?: string
          content_category?: string[] | null
          created_at?: string | null
          created_by?: string | null
          geo_restrictions?: string[] | null
          id?: string
          metadata?: Json | null
          namespace?: string
          pdf_url?: string | null
          pinecone_id?: string | null
          required_role?: string | null
          required_tier?: string | null
          sensitivity_level?: string | null
          superseded_by?: string | null
          tags?: string[] | null
          target_departments?: string[] | null
          target_positions?: string[] | null
          target_roles?: string[] | null
          target_tiers?: string[] | null
          title?: string
          updated_at?: string | null
          version_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_documents: {
        Row: {
          chunks_created: number | null
          contexts_created: number | null
          created_at: string | null
          document_id: string | null
          error_message: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          job_id: string | null
          pinecone_vectors: number | null
          retry_count: number | null
          status: string | null
          storage_url: string | null
          updated_at: string | null
        }
        Insert: {
          chunks_created?: number | null
          contexts_created?: number | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          job_id?: string | null
          pinecone_vectors?: number | null
          retry_count?: number | null
          status?: string | null
          storage_url?: string | null
          updated_at?: string | null
        }
        Update: {
          chunks_created?: number | null
          contexts_created?: number | null
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          job_id?: string | null
          pinecone_vectors?: number | null
          retry_count?: number | null
          status?: string | null
          storage_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          access_metadata: Json | null
          auto_tagging: boolean | null
          chunk_overlap: number | null
          chunk_size: number | null
          chunking_strategy: string | null
          completed_at: string | null
          created_at: string | null
          default_access_level: string | null
          default_required_role: string | null
          default_required_tier: string | null
          embedding_model: string | null
          error_log: Json | null
          failed_documents: number | null
          id: string
          processed_documents: number | null
          started_at: string | null
          status: string | null
          total_documents: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_metadata?: Json | null
          auto_tagging?: boolean | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          chunking_strategy?: string | null
          completed_at?: string | null
          created_at?: string | null
          default_access_level?: string | null
          default_required_role?: string | null
          default_required_tier?: string | null
          embedding_model?: string | null
          error_log?: Json | null
          failed_documents?: number | null
          id?: string
          processed_documents?: number | null
          started_at?: string | null
          status?: string | null
          total_documents: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_metadata?: Json | null
          auto_tagging?: boolean | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          chunking_strategy?: string | null
          completed_at?: string | null
          created_at?: string | null
          default_access_level?: string | null
          default_required_role?: string | null
          default_required_tier?: string | null
          embedding_model?: string | null
          error_log?: Json | null
          failed_documents?: number | null
          id?: string
          processed_documents?: number | null
          started_at?: string | null
          status?: string | null
          total_documents?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number | null
          amount_remaining: number
          billing_address: Json | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json
          metadata: Json | null
          paid_at: string | null
          payment_id: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string
          subscription_id: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
          user_id: string
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          amount_remaining: number
          billing_address?: Json | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json
          metadata?: Json | null
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string
          subscription_id?: string | null
          subtotal: number
          tax?: number | null
          total: number
          updated_at?: string | null
          user_id: string
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          amount_remaining?: number
          billing_address?: Json | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json
          metadata?: Json | null
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
          user_id?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cancel_amount: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json | null
          order_name: string
          paid_at: string | null
          pay_method: string
          pay_method_detail: Json | null
          payment_id: string
          pg_provider: string | null
          pg_transaction_id: string | null
          receipt_url: string | null
          status: string
          subscription_id: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
          webhook_received: boolean | null
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          cancel_amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json | null
          order_name: string
          paid_at?: string | null
          pay_method: string
          pay_method_detail?: Json | null
          payment_id: string
          pg_provider?: string | null
          pg_transaction_id?: string | null
          receipt_url?: string | null
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
          webhook_received?: boolean | null
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          cancel_amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json | null
          order_name?: string
          paid_at?: string | null
          pay_method?: string
          pay_method_detail?: Json | null
          payment_id?: string
          pg_provider?: string | null
          pg_transaction_id?: string | null
          receipt_url?: string | null
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_received?: boolean | null
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          credential_id: string | null
          credential_snapshot: Json | null
          credential_verified: boolean | null
          credential_verified_at: string | null
          department: string | null
          email: string | null
          first_chat_at: string | null
          full_name: string | null
          id: string
          kakao_nickname: string | null
          kakao_user_id: string | null
          last_chat_at: string | null
          last_sign_in_at: string | null
          metadata: Json | null
          permissions: Json | null
          query_count: number | null
          role: string
          subscription_tier: string
          updated_at: string | null
          verified_with_code: string | null
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          credential_snapshot?: Json | null
          credential_verified?: boolean | null
          credential_verified_at?: string | null
          department?: string | null
          email?: string | null
          first_chat_at?: string | null
          full_name?: string | null
          id: string
          kakao_nickname?: string | null
          kakao_user_id?: string | null
          last_chat_at?: string | null
          last_sign_in_at?: string | null
          metadata?: Json | null
          permissions?: Json | null
          query_count?: number | null
          role?: string
          subscription_tier?: string
          updated_at?: string | null
          verified_with_code?: string | null
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          credential_snapshot?: Json | null
          credential_verified?: boolean | null
          credential_verified_at?: string | null
          department?: string | null
          email?: string | null
          first_chat_at?: string | null
          full_name?: string | null
          id?: string
          kakao_nickname?: string | null
          kakao_user_id?: string | null
          last_chat_at?: string | null
          last_sign_in_at?: string | null
          metadata?: Json | null
          permissions?: Json | null
          query_count?: number | null
          role?: string
          subscription_tier?: string
          updated_at?: string | null
          verified_with_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "user_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_verified_with_code_fkey"
            columns: ["verified_with_code"]
            isOneToOne: false
            referencedRelation: "verification_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      query_logs: {
        Row: {
          id: string
          kakao_user_id: string | null
          metadata: Json | null
          query_text: string
          query_type: string
          response_text: string
          response_time_ms: number
          session_id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          kakao_user_id?: string | null
          metadata?: Json | null
          query_text: string
          query_type: string
          response_text: string
          response_time_ms: number
          session_id: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          kakao_user_id?: string | null
          metadata?: Json | null
          query_text?: string
          query_type?: string
          response_text?: string
          response_time_ms?: number
          session_id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "query_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_pricing: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          metadata: Json | null
          monthly_price: number
          query_limit: number | null
          sort_order: number | null
          storage_limit: number | null
          tier: string
          updated_at: string | null
          user_limit: number | null
          yearly_price: number
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          metadata?: Json | null
          monthly_price: number
          query_limit?: number | null
          sort_order?: number | null
          storage_limit?: number | null
          tier: string
          updated_at?: string | null
          user_limit?: number | null
          yearly_price: number
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          metadata?: Json | null
          monthly_price?: number
          query_limit?: number | null
          sort_order?: number | null
          storage_limit?: number | null
          tier?: string
          updated_at?: string | null
          user_limit?: number | null
          yearly_price?: number
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          name: string
          price_monthly: number
          query_limit: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          name: string
          price_monthly: number
          query_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          name?: string
          price_monthly?: number
          query_limit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          billing_key: string | null
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          portone_customer_id: string | null
          status: string
          tier: string
          trial_end: string | null
          trial_used: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string
          billing_key?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          portone_customer_id?: string | null
          status?: string
          tier: string
          trial_end?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          billing_key?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          portone_customer_id?: string | null
          status?: string
          tier?: string
          trial_end?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_credentials: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          employee_id: string | null
          full_name: string
          hire_date: string | null
          id: string
          location: string | null
          metadata: Json | null
          national_id_hash: string | null
          phone_number: string | null
          position: string | null
          status: string | null
          team: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          national_id_hash?: string | null
          phone_number?: string | null
          position?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          national_id_hash?: string | null
          phone_number?: string | null
          position?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          allowed_kakao_user_ids: string[] | null
          auto_expire_after_first_use: boolean | null
          code: string
          code_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          credential_match_fields: Json | null
          current_uses: number | null
          distributed_at: string | null
          distribution_method: string | null
          distribution_status: string | null
          expires_at: string | null
          id: string
          intended_recipient_email: string | null
          intended_recipient_employee_id: string | null
          intended_recipient_id: string | null
          intended_recipient_name: string | null
          ip_restriction: string[] | null
          is_active: boolean | null
          is_used: boolean | null
          kakao_sent_to: string | null
          max_uses: number | null
          metadata: Json | null
          notes: string | null
          purpose: string | null
          requires_credential_match: boolean | null
          role: string | null
          status: string | null
          tier: string
          time_restriction: Json | null
          updated_at: string | null
          used_at: string | null
          used_by: string[] | null
          user_id: string | null
        }
        Insert: {
          allowed_kakao_user_ids?: string[] | null
          auto_expire_after_first_use?: boolean | null
          code: string
          code_type?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          credential_match_fields?: Json | null
          current_uses?: number | null
          distributed_at?: string | null
          distribution_method?: string | null
          distribution_status?: string | null
          expires_at?: string | null
          id?: string
          intended_recipient_email?: string | null
          intended_recipient_employee_id?: string | null
          intended_recipient_id?: string | null
          intended_recipient_name?: string | null
          ip_restriction?: string[] | null
          is_active?: boolean | null
          is_used?: boolean | null
          kakao_sent_to?: string | null
          max_uses?: number | null
          metadata?: Json | null
          notes?: string | null
          purpose?: string | null
          requires_credential_match?: boolean | null
          role?: string | null
          status?: string | null
          tier: string
          time_restriction?: Json | null
          updated_at?: string | null
          used_at?: string | null
          used_by?: string[] | null
          user_id?: string | null
        }
        Update: {
          allowed_kakao_user_ids?: string[] | null
          auto_expire_after_first_use?: boolean | null
          code?: string
          code_type?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          credential_match_fields?: Json | null
          current_uses?: number | null
          distributed_at?: string | null
          distribution_method?: string | null
          distribution_status?: string | null
          expires_at?: string | null
          id?: string
          intended_recipient_email?: string | null
          intended_recipient_employee_id?: string | null
          intended_recipient_id?: string | null
          intended_recipient_name?: string | null
          ip_restriction?: string[] | null
          is_active?: boolean | null
          is_used?: boolean | null
          kakao_sent_to?: string | null
          max_uses?: number | null
          metadata?: Json | null
          notes?: string | null
          purpose?: string | null
          requires_credential_match?: boolean | null
          role?: string | null
          status?: string | null
          tier?: string
          time_restriction?: Json | null
          updated_at?: string | null
          used_at?: string | null
          used_by?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_intended_recipient_id_fkey"
            columns: ["intended_recipient_id"]
            isOneToOne: false
            referencedRelation: "user_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      query_performance_stats: {
        Row: {
          avg_time: number | null
          error_count: number | null
          error_rate_pct: number | null
          max_time: number | null
          min_time: number | null
          p50_time: number | null
          p95_time: number | null
          p99_time: number | null
          query_count: number | null
          query_type: string | null
        }
        Relationships: []
      }
      user_access_summary: {
        Row: {
          credential_status: string | null
          credential_verified: boolean | null
          department: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string | null
          kakao_nickname: string | null
          kakao_user_id: string | null
          last_chat_at: string | null
          position: string | null
          registered_at: string | null
          role: string | null
          subscription_tier: string | null
          verified_with_code: string | null
        }
        Relationships: []
      }
      user_activity_summary: {
        Row: {
          active_kakao_users: number | null
          active_users_with_profile: number | null
          avg_response_time: number | null
          commission_queries: number | null
          date: string | null
          error_count: number | null
          median_response_time: number | null
          p95_response_time: number | null
          rag_queries: number | null
          total_active_users: number | null
          total_queries: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_profile_from_code: {
        Args: {
          p_kakao_nickname: string
          p_kakao_user_id: string
          p_verification_code: string
        }
        Returns: {
          error_message: string
          profile_id: string
          role: string
          success: boolean
          tier: string
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_profile_by_kakao_id: {
        Args: { p_kakao_nickname?: string; p_kakao_user_id: string }
        Returns: string
      }
      get_role_level: { Args: { role_name: string }; Returns: number }
      get_tier_level: { Args: { tier_name: string }; Returns: number }
      get_user_growth_metrics: {
        Args: { days_back?: number }
        Returns: {
          active_users: number
          date: string
          new_users: number
          total_users: number
        }[]
      }
      has_sufficient_access: {
        Args: {
          required_role: string
          required_tier: string
          user_role: string
          user_tier: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
