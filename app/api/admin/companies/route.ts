/**
 * Companies API
 * Manage company subscriptions
 *
 * GET  /api/admin/companies - List all companies
 * POST /api/admin/companies - Create new company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies
 * List all company subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('company_subscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('subscription_status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Companies API] Error fetching companies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch companies', details: error.message },
        { status: 500 }
      );
    }

    // Get user counts for each company
    const companiesWithCounts = await Promise.all(
      (data || []).map(async (company) => {
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.company_id)
          .eq('is_billable', true);

        const { count: activeCount } = await supabase
          .from('user_activity_logs')
          .select('user_id', { count: 'exact', head: true })
          .eq('company_id', company.company_id)
          .gte('activity_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        return {
          ...company,
          total_users: userCount || 0,
          active_users_last_30_days: activeCount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: companiesWithCounts,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error: any) {
    console.error('[Companies API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/companies
 * Create new company subscription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      company_name,
      company_registration_number,
      company_address,
      company_phone,
      billing_contact_name,
      billing_contact_email,
      billing_contact_phone,
      price_per_user_monthly = 30000,
      minimum_users = 5,
      contract_start_date,
      payment_terms_days = 30
    } = body;

    // Validation
    if (!company_name) {
      return NextResponse.json(
        { error: 'company_name is required' },
        { status: 400 }
      );
    }

    // Insert company
    const { data, error } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: crypto.randomUUID(),
        company_name,
        company_registration_number,
        company_address,
        company_phone,
        billing_contact_name,
        billing_contact_email,
        billing_contact_phone,
        price_per_user_monthly,
        minimum_users,
        contract_start_date: contract_start_date || new Date().toISOString().split('T')[0],
        payment_terms_days,
        subscription_status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('[Companies API] Error creating company:', error);
      return NextResponse.json(
        { error: 'Failed to create company', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Company created successfully',
      data
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Companies API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
