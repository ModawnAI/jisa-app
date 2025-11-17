/**
 * Contexts Statistics API
 * Returns Pinecone vector database statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'ceo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get contexts count from Supabase
    const { count: totalContexts, error: countError } = await supabase
      .from('contexts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[Contexts Stats API] Error:', countError);
      return NextResponse.json(
        { error: 'Failed to get contexts count' },
        { status: 500 }
      );
    }

    // Get contexts by namespace
    const { data: contextsByNamespace, error: namespaceError } = await supabase
      .from('contexts')
      .select('pinecone_namespace');

    const namespaceStats: Record<string, number> = {};
    if (contextsByNamespace) {
      contextsByNamespace.forEach((ctx) => {
        const ns = ctx.pinecone_namespace || 'default';
        namespaceStats[ns] = (namespaceStats[ns] || 0) + 1;
      });
    }

    // Get contexts by access level
    const { data: contextsByAccess, error: accessError } = await supabase
      .from('contexts')
      .select('access_level');

    const accessLevelStats: Record<string, number> = {};
    if (contextsByAccess) {
      contextsByAccess.forEach((ctx) => {
        const level = ctx.access_level || 'unknown';
        accessLevelStats[level] = (accessLevelStats[level] || 0) + 1;
      });
    }

    return NextResponse.json({
      success: true,
      total: totalContexts || 0,
      by_namespace: namespaceStats,
      by_access_level: accessLevelStats,
    });
  } catch (error: any) {
    console.error('[Contexts Stats API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
