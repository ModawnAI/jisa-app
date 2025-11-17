/**
 * Company Detail API
 * GET    /api/admin/companies/[id] - Get company details
 * PATCH  /api/admin/companies/[id] - Update company
 * DELETE /api/admin/companies/[id] - Delete company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/[id]
 * Get company details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id: companyId } = await params;

    const { data: company, error } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('[Company Detail API] Error fetching company:', error);
      return NextResponse.json(
        { error: 'Company not found', details: error.message },
        { status: 404 }
      );
    }

    // Get user counts for this company
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.company_id)
      .eq('is_billable', true);

    const { count: activeCount } = await supabase
      .from('user_activity_logs')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', company.company_id)
      .gte(
        'activity_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );

    const companyWithCounts = {
      ...company,
      total_users: userCount || 0,
      active_users_last_30_days: activeCount || 0,
    };

    return NextResponse.json({
      success: true,
      data: companyWithCounts,
    });
  } catch (error: any) {
    console.error('[Company Detail API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/companies/[id]
 * Update company
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id: companyId } = await params;
    const body = await request.json();

    const {
      company_name,
      company_registration_number,
      company_address,
      company_phone,
      billing_contact_name,
      billing_contact_email,
      billing_contact_phone,
      price_per_user_monthly,
      minimum_users,
      contract_start_date,
      contract_end_date,
      payment_terms_days,
      subscription_status,
    } = body;

    const updateData: any = {};
    if (company_name !== undefined) updateData.company_name = company_name;
    if (company_registration_number !== undefined)
      updateData.company_registration_number = company_registration_number;
    if (company_address !== undefined) updateData.company_address = company_address;
    if (company_phone !== undefined) updateData.company_phone = company_phone;
    if (billing_contact_name !== undefined)
      updateData.billing_contact_name = billing_contact_name;
    if (billing_contact_email !== undefined)
      updateData.billing_contact_email = billing_contact_email;
    if (billing_contact_phone !== undefined)
      updateData.billing_contact_phone = billing_contact_phone;
    if (price_per_user_monthly !== undefined)
      updateData.price_per_user_monthly = price_per_user_monthly;
    if (minimum_users !== undefined) updateData.minimum_users = minimum_users;
    if (contract_start_date !== undefined)
      updateData.contract_start_date = contract_start_date;
    if (contract_end_date !== undefined) updateData.contract_end_date = contract_end_date;
    if (payment_terms_days !== undefined) updateData.payment_terms_days = payment_terms_days;
    if (subscription_status !== undefined)
      updateData.subscription_status = subscription_status;

    const { data, error } = await supabase
      .from('company_subscriptions')
      .update(updateData)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('[Company Update API] Error updating company:', error);
      return NextResponse.json(
        { error: 'Failed to update company', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Company updated successfully',
      data,
    });
  } catch (error: any) {
    console.error('[Company Update API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * Delete company
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { id: companyId } = await params;

    const { error } = await supabase
      .from('company_subscriptions')
      .delete()
      .eq('company_id', companyId);

    if (error) {
      console.error('[Company Delete API] Error deleting company:', error);
      return NextResponse.json(
        { error: 'Failed to delete company', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error: any) {
    console.error('[Company Delete API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
