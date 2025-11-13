/**
 * Documents API
 * GET /api/admin/data/documents - List all documents with context counts
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
    const accessLevel = searchParams.get('access_level') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('documents')
      .select('id, title, content, access_level, namespace, pdf_url, created_at, created_by, metadata', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (accessLevel) {
      query = query.eq('access_level', accessLevel);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: documents, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get context counts for each document
    const documentsWithCounts = await Promise.all(
      (documents || []).map(async (doc) => {
        const { count: contextCount } = await supabase
          .from('contexts')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);

        return {
          ...doc,
          context_count: contextCount || 0,
        };
      })
    );

    return NextResponse.json({
      documents: documentsWithCounts,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
