/**
 * Access Codes List API
 * Returns list of access codes with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'active', 'used', 'expired'

    // Build query with user information joins
    let query = supabase
      .from('verification_codes')
      .select(`
        *,
        user:profiles!verification_codes_user_id_fkey(
          id,
          kakao_user_id,
          kakao_nickname,
          full_name,
          email,
          department,
          verified_with_code,
          credential_id
        ),
        intended_recipient:user_credentials!verification_codes_intended_recipient_id_fkey(
          id,
          employee_id,
          full_name,
          email,
          department,
          team,
          position,
          phone_number,
          status
        )
      `, { count: 'exact' });

    // Apply filters
    if (status === 'active') {
      const now = new Date().toISOString();
      query = query.eq('is_used', false).gte('expires_at', now);
    } else if (status === 'used') {
      query = query.eq('is_used', true);
    } else if (status === 'expired') {
      const now = new Date().toISOString();
      query = query.lt('expires_at', now);
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Codes List] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      codes: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[Codes List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
