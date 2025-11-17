/**
 * Billing Invoices API
 * Manage monthly billing invoices
 *
 * GET  /api/admin/billing/invoices - List all invoices
 * POST /api/admin/billing/invoices - Generate new invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing/invoices
 * List all billing invoices with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    // Query parameters
    const companyId = searchParams.get('company_id');
    const status = searchParams.get('status');
    const month = searchParams.get('month'); // Format: 2025-01
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('monthly_billing_records')
      .select(`
        *,
        company:company_subscriptions!company_id(
          company_name,
          billing_contact_name,
          billing_contact_email
        )
      `, { count: 'exact' })
      .order('billing_month', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (status) {
      query = query.eq('billing_status', status);
    }

    if (month) {
      // Month format: 2025-01
      const startDate = `${month}-01`;
      query = query.eq('billing_month', startDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Billing API] Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error: any) {
    console.error('[Billing API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/billing/invoices
 * Generate new invoice for a company and month
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { company_id, billing_month } = body;

    // Validation
    if (!company_id || !billing_month) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, billing_month' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const monthRegex = /^\d{4}-\d{2}-01$/;
    if (!monthRegex.test(billing_month)) {
      return NextResponse.json(
        { error: 'billing_month must be first day of month (YYYY-MM-01)' },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    const { data: existing } = await supabase
      .from('monthly_billing_records')
      .select('id, invoice_number, billing_status')
      .eq('company_id', company_id)
      .eq('billing_month', billing_month)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: 'Invoice already exists for this period',
          existing_invoice: existing
        },
        { status: 409 }
      );
    }

    // Call stored function to generate invoice
    const { data, error } = await supabase
      .rpc('generate_monthly_invoice', {
        p_company_id: company_id,
        p_billing_month: billing_month
      });

    if (error) {
      console.error('[Billing API] Error generating invoice:', error);
      return NextResponse.json(
        { error: 'Failed to generate invoice', details: error.message },
        { status: 500 }
      );
    }

    // Fetch the generated invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('monthly_billing_records')
      .select(`
        *,
        company:company_subscriptions!company_id(
          company_name,
          billing_contact_name,
          billing_contact_email
        )
      `)
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('[Billing API] Error fetching generated invoice:', fetchError);
      return NextResponse.json(
        { error: 'Invoice generated but failed to fetch details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Billing API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
