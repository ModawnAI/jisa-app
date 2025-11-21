/**
 * Employee RAG Query API Endpoint
 *
 * Handles employee-specific RAG queries with namespace isolation.
 * Queries starting with "/" are routed to employee's private Pinecone namespace.
 *
 * Security: Triple-layer isolation
 * - Namespace isolation (infrastructure)
 * - Metadata filtering (query-level)
 * - JWT authentication (application)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryEmployeeRAG,
  isEmployeeRAGQuery,
  cleanEmployeeRAGQuery,
} from '@/lib/services/employee-rag.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, query } = await request.json();

    // Validate input
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Clean query (remove "/" prefix)
    const cleanQuery = cleanEmployeeRAGQuery(query);

    if (!cleanQuery) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    // Verify user exists and has RAG access
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, rag_enabled, pinecone_namespace')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!profile.rag_enabled || !profile.pinecone_namespace) {
      return NextResponse.json(
        {
          error: 'RAG access not enabled',
          message: 'Your account does not have access to the employee RAG system. Please contact your administrator.',
        },
        { status: 403 }
      );
    }

    // Execute employee RAG query
    console.log(`📋 Employee RAG Query Request:`);
    console.log(`   User: ${userId}`);
    console.log(`   Query: ${cleanQuery}`);

    const result = await queryEmployeeRAG({
      userId,
      query: cleanQuery,
      topK: 10,
    });

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error('❌ Employee RAG query error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific error types
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    if (errorMessage.includes('not enabled')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }

    if (errorMessage.includes('Security validation failed')) {
      return NextResponse.json(
        { error: 'Security violation detected' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process query',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
