/**
 * PortOne V2 Webhook Handler
 * Receives payment events from PortOne and processes them
 *
 * Events handled:
 * - Transaction.Paid - Payment successful
 * - Transaction.Failed - Payment failed
 * - Transaction.Cancelled - Payment cancelled
 * - Transaction.VirtualAccountIssued - Virtual account issued
 * - BillingKey.Issued - Billing key created
 * - BillingKey.Deleted - Billing key deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { portoneService } from '@/lib/services/portone.service';

// Use service role client to bypass RLS for webhook processing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body text for signature verification
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // 2. Verify webhook signature
    const verification = await portoneService.verifyWebhook(body, headers);

    if (!verification.isValid) {
      console.error('❌ Webhook verification failed:', verification.error);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const webhook = verification.webhook!;
    console.log('✅ Webhook verified:', webhook.type);

    // 3. Process webhook based on event type
    switch (webhook.type) {
      case 'Transaction.Paid':
        await handlePaymentPaid(webhook);
        break;

      case 'Transaction.Failed':
        await handlePaymentFailed(webhook);
        break;

      case 'Transaction.Cancelled':
      case 'Transaction.PartialCancelled':
        await handlePaymentCancelled(webhook);
        break;

      case 'Transaction.VirtualAccountIssued':
        await handleVirtualAccountIssued(webhook);
        break;

      case 'BillingKey.Issued':
        await handleBillingKeyIssued(webhook);
        break;

      case 'BillingKey.Deleted':
        await handleBillingKeyDeleted(webhook);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook type: ${webhook.type}`);
    }

    // 4. Return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// WEBHOOK EVENT HANDLERS
// =====================================================

/**
 * Handle successful payment
 */
async function handlePaymentPaid(webhook: any) {
  const { paymentId, transactionId } = webhook.data;

  try {
    // 1. Get payment details from PortOne
    const payment = await portoneService.getPayment(paymentId);
    if (!payment) {
      console.error('❌ Payment not found:', paymentId);
      return;
    }

    // 2. Update payment record
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'paid',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
        pay_method_detail: (payment as any).paymentMethod || null,
        receipt_url: (payment as any).receiptUrl || null,
        webhook_received: true,
        webhook_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

    if (updateError) {
      console.error('❌ Failed to update payment:', updateError);
      return;
    }

    // 3. Get payment record with user info
    const { data: paymentRecord } = await supabaseAdmin
      .from('payments')
      .select('*, subscriptions(*)')
      .eq('payment_id', paymentId)
      .single();

    if (!paymentRecord) {
      console.error('❌ Payment record not found:', paymentId);
      return;
    }

    // 4. Update subscription status if applicable
    if (paymentRecord.subscription_id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.subscription_id);
    }

    // 5. Create invoice
    await createInvoice(paymentRecord);

    // 6. Log billing event
    const paymentAmount = (payment as any).amount?.total || paymentRecord.amount;
    await logBillingEvent({
      user_id: paymentRecord.user_id,
      subscription_id: paymentRecord.subscription_id,
      payment_id: paymentRecord.id,
      event_type: 'payment.succeeded',
      description: `Payment of ${portoneService.formatAmount(paymentAmount)} succeeded`,
      webhook_type: webhook.type,
      webhook_data: webhook.data,
      amount: paymentAmount,
    });

    console.log('✅ Payment processed successfully:', paymentId);

    // 7. Send confirmation email (TODO: implement email service)
    // await sendPaymentConfirmationEmail(paymentRecord);
  } catch (error) {
    console.error('❌ Error handling payment paid:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(webhook: any) {
  const { paymentId, transactionId } = webhook.data;

  try {
    const payment = await portoneService.getPayment(paymentId);
    if (!payment) return;

    // Update payment record
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        transaction_id: transactionId,
        failed_at: new Date().toISOString(),
        failure_code: (payment as any).failure?.code || null,
        failure_message: (payment as any).failure?.message || null,
        webhook_received: true,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

    // Get payment record
    const { data: paymentRecord } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (!paymentRecord) return;

    // If subscription payment, mark subscription as past_due
    if (paymentRecord.subscription_id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.subscription_id);
    }

    // Log event
    const failureMessage = (payment as any).failure?.message || 'Unknown error';
    const failedAmount = (payment as any).amount?.total || paymentRecord.amount;
    await logBillingEvent({
      user_id: paymentRecord.user_id,
      subscription_id: paymentRecord.subscription_id,
      payment_id: paymentRecord.id,
      event_type: 'payment.failed',
      description: `Payment failed: ${failureMessage}`,
      webhook_type: webhook.type,
      webhook_data: webhook.data,
      amount: failedAmount,
    });

    console.log('✅ Failed payment processed:', paymentId);

    // Send failure notification
    // await sendPaymentFailedEmail(paymentRecord);
  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
  }
}

/**
 * Handle cancelled payment
 */
async function handlePaymentCancelled(webhook: any) {
  const { paymentId, transactionId, cancellationId } = webhook.data;

  try {
    const payment = await portoneService.getPayment(paymentId);
    if (!payment) return;

    const status =
      webhook.type === 'Transaction.PartialCancelled'
        ? 'partial_cancelled'
        : 'cancelled';

    const cancellations = (payment as any).cancellations || [];
    const cancelAmount = cancellations.reduce(
      (sum: number, c: any) => sum + (c.cancelledAmount?.total || 0),
      0
    );
    await supabaseAdmin
      .from('payments')
      .update({
        status,
        transaction_id: transactionId,
        cancelled_at: new Date().toISOString(),
        cancel_amount: cancelAmount || null,
        cancel_reason: cancellations[0]?.reason || null,
        webhook_received: true,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

    const { data: paymentRecord } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (!paymentRecord) return;

    await logBillingEvent({
      user_id: paymentRecord.user_id,
      subscription_id: paymentRecord.subscription_id,
      payment_id: paymentRecord.id,
      event_type: 'payment.cancelled',
      description: `Payment ${status}: ${cancellations[0]?.reason || 'No reason'}`,
      webhook_type: webhook.type,
      webhook_data: webhook.data,
      amount: cancellations[0]?.cancelledAmount?.total || paymentRecord.amount,
    });

    console.log('✅ Cancelled payment processed:', paymentId);
  } catch (error) {
    console.error('❌ Error handling payment cancelled:', error);
  }
}

/**
 * Handle virtual account issued
 */
async function handleVirtualAccountIssued(webhook: any) {
  const { paymentId, transactionId } = webhook.data;

  try {
    const payment = await portoneService.getPayment(paymentId);
    if (!payment) return;

    await supabaseAdmin
      .from('payments')
      .update({
        status: 'virtual_account_issued',
        transaction_id: transactionId,
        pay_method_detail: (payment as any).paymentMethod || null,
        webhook_received: true,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

    const { data: paymentRecord } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (!paymentRecord) return;

    await logBillingEvent({
      user_id: paymentRecord.user_id,
      event_type: 'virtual_account.issued',
      description: 'Virtual account issued',
      webhook_type: webhook.type,
      webhook_data: webhook.data,
    });

    console.log('✅ Virtual account issued:', paymentId);

    // Send virtual account info email
    // await sendVirtualAccountEmail(paymentRecord, (payment as any).paymentMethod);
  } catch (error) {
    console.error('❌ Error handling virtual account issued:', error);
  }
}

/**
 * Handle billing key issued
 */
async function handleBillingKeyIssued(webhook: any) {
  const { billingKey, storeId } = webhook.data;

  try {
    // Find subscription by metadata or create new subscription
    // This requires client to pass subscription_id in metadata during billing key issuance

    await logBillingEvent({
      event_type: 'billing_key.issued',
      description: 'Billing key issued for subscription',
      webhook_type: webhook.type,
      webhook_data: webhook.data,
    });

    console.log('✅ Billing key issued:', billingKey);
  } catch (error) {
    console.error('❌ Error handling billing key issued:', error);
  }
}

/**
 * Handle billing key deleted
 */
async function handleBillingKeyDeleted(webhook: any) {
  const { billingKey } = webhook.data;

  try {
    // Update subscription to remove billing key
    await supabaseAdmin
      .from('subscriptions')
      .update({
        billing_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq('billing_key', billingKey);

    await logBillingEvent({
      event_type: 'billing_key.deleted',
      description: 'Billing key deleted',
      webhook_type: webhook.type,
      webhook_data: webhook.data,
    });

    console.log('✅ Billing key deleted:', billingKey);
  } catch (error) {
    console.error('❌ Error handling billing key deleted:', error);
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Create invoice for payment
 */
async function createInvoice(paymentRecord: any) {
  try {
    const subscription = paymentRecord.subscriptions;
    if (!subscription) return;

    const lineItems = [
      {
        description: `${subscription.tier.toUpperCase()} Plan - ${subscription.billing_cycle}`,
        amount: paymentRecord.amount,
        quantity: 1,
      },
    ];

    await supabaseAdmin.from('invoices').insert({
      user_id: paymentRecord.user_id,
      subscription_id: subscription.id,
      payment_id: paymentRecord.id,
      status: 'paid',
      subtotal: paymentRecord.amount,
      total: paymentRecord.amount,
      amount_paid: paymentRecord.amount,
      amount_remaining: 0,
      currency: paymentRecord.currency,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
      paid_at: new Date().toISOString(),
      line_items: lineItems,
      customer_name: paymentRecord.customer_name,
      customer_email: paymentRecord.customer_email,
    });

    console.log('✅ Invoice created for payment:', paymentRecord.payment_id);
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
  }
}

/**
 * Log billing event
 */
async function logBillingEvent(event: any) {
  try {
    await supabaseAdmin.from('billing_events').insert({
      ...event,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error logging billing event:', error);
  }
}
