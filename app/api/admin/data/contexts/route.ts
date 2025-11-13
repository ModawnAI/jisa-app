/**
 * Contexts API
 * GET /api/admin/data/contexts - List all contexts with filtering
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'ceo'].includes(profile.role);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const documentId = searchParams.get('document_id') || '';
    const orphaned = searchParams.get('orphaned') === 'true';
    const namespace = searchParams.get('namespace') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('contexts')
      .select(`
        id,
        document_id,
        title,
        content,
        pinecone_id,
        pinecone_namespace,
        access_level,
        embedding_model,
        created_at,
        metadata,
        documents (
          id,
          title
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (orphaned) {
      query = query.is('document_id', null);
    }

    if (namespace) {
      query = query.eq('pinecone_namespace', namespace);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: contexts, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      contexts: contexts || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[Contexts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contexts' },
      { status: 500 }
    );
  }
}
