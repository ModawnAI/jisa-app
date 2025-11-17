/**
 * Invoice API - Get invoice by payment ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { paymentId } = await props.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get invoice by payment_id
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found for this payment' },
        { status: 404 }
      );
    }

    // Check access
    if (invoice.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['super_admin', 'org_admin'].includes(profile.role)) {
        return NextResponse.json(
          { error: 'Unauthorized to view this invoice' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('GET /api/invoices/by-payment/[paymentId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
