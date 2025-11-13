/**
 * Ingestion Jobs List API
 * GET /api/admin/data/jobs - List all ingestion jobs
 * Phase 5.1: Data Ingestion Pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'ceo'].includes(profile.role);

    // Query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('ingestion_jobs')
      .select('*, ingestion_documents(count)', { count: 'exact' });

    // Non-admins only see their own jobs
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      jobs: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[Jobs] List error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
