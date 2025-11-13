/**
 * Payment Completion API
 * Called from frontend after PortOne.requestPayment() succeeds
 * Verifies payment and updates database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { portoneService } from '@/lib/services/portone.service';

// Service role client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying payment:', paymentId);

    // 1. Get payment record from database
    const { data: paymentRecord, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*, profiles(*)')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError || !paymentRecord) {
      console.error('❌ Payment record not found:', paymentId);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // 2. Verify payment with PortOne
    const verification = await portoneService.verifyPayment(
      paymentId,
      paymentRecord.amount
    );

    if (!verification.isValid) {
      console.error('❌ Payment verification failed:', verification.error);
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    const portonePayment = verification.payment!;

    // 3. Update payment status
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'paid',
        transaction_id: portonePayment.transactionId,
        paid_at: new Date().toISOString(),
        pay_method_detail: portonePayment.paymentMethod,
        pg_provider: portonePayment.channel?.pgProvider,
        pg_transaction_id: portonePayment.pgTransactionId,
        receipt_url: portonePayment.receiptUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

    if (updateError) {
      console.error('❌ Failed to update payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    // 4. Update subscription if applicable
    if (paymentRecord.subscription_id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.subscription_id);
    }

    // 5. Log billing event
    await supabaseAdmin.from('billing_events').insert({
      user_id: paymentRecord.user_id,
      subscription_id: paymentRecord.subscription_id,
      payment_id: paymentRecord.id,
      event_type: 'payment.completed',
      description: `Payment of ${portoneService.formatAmount(portonePayment.amount.total)} completed`,
      amount: portonePayment.amount.total,
      currency: portonePayment.currency,
    });

    console.log('✅ Payment completed successfully:', paymentId);

    return NextResponse.json({
      success: true,
      status: portonePayment.status,
      paymentId,
      amount: portonePayment.amount.total,
    });
  } catch (error) {
    console.error('❌ Payment completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
