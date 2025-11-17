/**
 * Single Invoice API
 * Manage individual invoice
 *
 * GET    /api/admin/billing/invoices/[id] - Get invoice details
 * PUT    /api/admin/billing/invoices/[id] - Update invoice
 * DELETE /api/admin/billing/invoices/[id] - Cancel invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing/invoices/[id]
 * Get single invoice details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('monthly_billing_records')
      .select(`
        *,
        company:company_subscriptions!company_id(
          company_name,
          company_registration_number,
          company_address,
          company_phone,
          billing_contact_name,
          billing_contact_email,
          billing_contact_phone,
          price_per_user_monthly
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      console.error('[Billing API] Error fetching invoice:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoice', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
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
 * PUT /api/admin/billing/invoices/[id]
 * Update invoice status or payment information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const {
      billing_status,
      payment_date,
      payment_amount,
      payment_reference,
      payment_method,
      notes
    } = body;

    // Build update object
    const updates: any = {};

    if (billing_status) {
      const validStatuses = ['draft', 'pending', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'];
      if (!validStatuses.includes(billing_status)) {
        return NextResponse.json(
          { error: `Invalid billing_status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.billing_status = billing_status;
    }

    if (payment_date !== undefined) updates.payment_date = payment_date;
    if (payment_amount !== undefined) updates.payment_amount = payment_amount;
    if (payment_reference !== undefined) updates.payment_reference = payment_reference;
    if (payment_method !== undefined) updates.payment_method = payment_method;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('monthly_billing_records')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        company:company_subscriptions!company_id(
          company_name,
          billing_contact_name,
          billing_contact_email
        )
      `)
      .single();

    if (error) {
      console.error('[Billing API] Error updating invoice:', error);
      return NextResponse.json(
        { error: 'Failed to update invoice', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data
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
 * DELETE /api/admin/billing/invoices/[id]
 * Cancel invoice (soft delete by setting status to 'cancelled')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    // Check current status
    const { data: invoice, error: fetchError } = await supabase
      .from('monthly_billing_records')
      .select('billing_status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.billing_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot cancel a paid invoice. Use refund instead.' },
        { status: 400 }
      );
    }

    // Update to cancelled
    const { data, error } = await supabase
      .from('monthly_billing_records')
      .update({ billing_status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Billing API] Error cancelling invoice:', error);
      return NextResponse.json(
        { error: 'Failed to cancel invoice', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data
    });

  } catch (error: any) {
    console.error('[Billing API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
