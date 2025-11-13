/**
 * Payment History API
 * Returns paginated payment history for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id'); // For admin access

    // Check if user has admin access (if userId is provided)
    let targetUserId = user.id;
    if (userId && userId !== user.id) {
      // Check if current user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['super_admin', 'org_admin'].includes(profile.role)) {
        return NextResponse.json(
          { error: 'Unauthorized to view other users payments' },
          { status: 403 }
        );
      }

      targetUserId = userId;
    }

    // Build query
    let query = supabase
      .from('payments')
      .select(
        `
        id,
        payment_id,
        transaction_id,
        amount,
        currency,
        status,
        pay_method,
        order_name,
        customer_name,
        customer_email,
        paid_at,
        failed_at,
        cancelled_at,
        receipt_url,
        invoice_id,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Error fetching payment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payments: payments || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/payment/history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
