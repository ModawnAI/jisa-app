/**
 * Subscription Upgrade/Downgrade API
 * Handles tier changes with prorated payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { portoneService } from '@/lib/services/portone.service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { new_tier, billing_cycle } = body;

    // Validate tier
    const validTiers = ['free', 'basic', 'pro', 'enterprise'];
    if (!validTiers.includes(new_tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get current subscription
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const currentTier = currentSubscription.tier;
    const newAmount = portoneService.getSubscriptionAmount(new_tier, billing_cycle || currentSubscription.billing_cycle);

    // Calculate proration
    const now = new Date();
    const periodStart = new Date(currentSubscription.current_period_start);
    const periodEnd = new Date(currentSubscription.current_period_end);
    const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const remainingDays = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const proratedAmount = Math.round((newAmount / totalDays) * remainingDays);

    // Determine if upgrade or downgrade
    const tierOrder = { free: 0, basic: 1, pro: 2, enterprise: 3 };
    const isUpgrade = tierOrder[new_tier as keyof typeof tierOrder] > tierOrder[currentTier as keyof typeof tierOrder];

    if (isUpgrade) {
      // Upgrade: Charge prorated amount immediately
      if (currentSubscription.billing_key && proratedAmount > 0) {
        try {
          const { paymentId } = await portoneService.payWithBillingKey({
            userId: user.id,
            subscriptionId: currentSubscription.id,
            billingKey: currentSubscription.billing_key,
            amount: proratedAmount,
            orderName: `Upgrade to ${new_tier.toUpperCase()} - Prorated`,
            customerEmail: user.email,
            customerName: currentSubscription.portone_customer_id,
          });

          // Create payment record
          await supabase.from('payments').insert({
            user_id: user.id,
            subscription_id: currentSubscription.id,
            payment_id: paymentId,
            amount: proratedAmount,
            currency: 'KRW',
            status: 'paid',
            pay_method: 'card',
            order_name: `Upgrade to ${new_tier.toUpperCase()} - Prorated`,
            customer_email: user.email,
            paid_at: now.toISOString(),
          });
        } catch (error) {
          console.error('Error charging prorated amount:', error);
          return NextResponse.json(
            { error: 'Failed to process upgrade payment' },
            { status: 500 }
          );
        }
      }

      // Update subscription immediately
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          tier: new_tier,
          amount: newAmount,
          billing_cycle: billing_cycle || currentSubscription.billing_cycle,
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({ subscription_tier: new_tier })
        .eq('id', user.id);

      // Log event
      await supabase.from('billing_events').insert({
        user_id: user.id,
        subscription_id: currentSubscription.id,
        event_type: 'subscription.upgraded',
        description: `Upgraded from ${currentTier} to ${new_tier}`,
        amount: proratedAmount,
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription upgraded successfully',
        charged_amount: proratedAmount,
        new_tier,
      });
    } else {
      // Downgrade: Schedule change for period end
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          metadata: {
            scheduled_tier_change: {
              new_tier,
              new_amount: newAmount,
              effective_date: periodEnd.toISOString(),
            },
          },
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to schedule downgrade' },
          { status: 500 }
        );
      }

      // Log event
      await supabase.from('billing_events').insert({
        user_id: user.id,
        subscription_id: currentSubscription.id,
        event_type: 'subscription.downgrade_scheduled',
        description: `Downgrade from ${currentTier} to ${new_tier} scheduled for ${periodEnd.toISOString()}`,
      });

      return NextResponse.json({
        success: true,
        message: `Downgrade to ${new_tier} will take effect at the end of your current billing period`,
        effective_date: periodEnd.toISOString(),
        new_tier,
      });
    }
  } catch (error) {
    console.error('POST /api/subscriptions/upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
