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

    // Build query for verification codes
    let query = supabase
      .from('verification_codes')
      .select('*', { count: 'exact' });

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
    const { data: codes, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Codes List] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch codes' },
        { status: 500 }
      );
    }

    if (!codes || codes.length === 0) {
      return NextResponse.json({
        codes: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    // Get user IDs and intended recipient IDs
    const userIds = codes
      .map((code) => code.user_id)
      .filter((id): id is string => id != null);
    const recipientIds = codes
      .map((code) => code.intended_recipient_id)
      .filter((id): id is string => id != null);

    // Fetch user profiles
    let usersMap = new Map();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, kakao_user_id, kakao_nickname, full_name, email, department, verified_with_code, credential_id')
        .in('id', userIds);

      if (users) {
        users.forEach(user => usersMap.set(user.id, user));
      }
    }

    // Fetch intended recipients
    let recipientsMap = new Map();
    if (recipientIds.length > 0) {
      const { data: recipients } = await supabase
        .from('user_credentials')
        .select('id, employee_id, full_name, email, department, team, position, phone_number, status')
        .in('id', recipientIds);

      if (recipients) {
        recipients.forEach(recipient => recipientsMap.set(recipient.id, recipient));
      }
    }

    // Combine data
    const enrichedCodes = codes.map((code) => ({
      ...code,
      user: code.user_id ? usersMap.get(code.user_id) || null : null,
      intended_recipient: code.intended_recipient_id ? recipientsMap.get(code.intended_recipient_id) || null : null,
    }));

    return NextResponse.json({
      codes: enrichedCodes,
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
