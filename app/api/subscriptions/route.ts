/**
 * Subscriptions API
 * Handles subscription management operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { portoneService } from '@/lib/services/portone.service';

// GET /api/subscriptions - Get user's subscription
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

    // Get subscription with pricing info
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_pricing(*)
      `)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('Error fetching subscription:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscription: subscription || null });
  } catch (error) {
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Create or update subscription
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
    const { tier, billing_cycle, billing_key } = body;

    if (!tier || !billing_cycle) {
      return NextResponse.json(
        { error: 'Tier and billing cycle are required' },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers = ['free', 'basic', 'pro', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get pricing for tier
    const amount = portoneService.getSubscriptionAmount(tier, billing_cycle);

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billing_cycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Check if subscription exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let subscription;

    if (existingSubscription) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          tier,
          billing_cycle,
          billing_key,
          amount,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          status: 'active',
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      subscription = data;

      // Log event
      await supabase.from('billing_events').insert({
        user_id: user.id,
        subscription_id: subscription.id,
        event_type: 'subscription.updated',
        description: `Subscription updated to ${tier} (${billing_cycle})`,
        amount,
      });
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          tier,
          billing_cycle,
          billing_key,
          amount,
          currency: 'KRW',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }

      subscription = data;

      // Log event
      await supabase.from('billing_events').insert({
        user_id: user.id,
        subscription_id: subscription.id,
        event_type: 'subscription.created',
        description: `Subscription created: ${tier} (${billing_cycle})`,
        amount,
      });
    }

    // Update user's subscription tier in profiles
    await supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', user.id);

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    console.error('POST /api/subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'User requested cancellation';
    const cancelImmediately = searchParams.get('immediate') === 'true';

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (cancelImmediately) {
      // Cancel immediately
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to cancel subscription' },
          { status: 500 }
        );
      }

      // Downgrade to free tier
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', user.id);

      // Delete billing key if exists
      if (subscription.billing_key) {
        try {
          await portoneService.deleteBillingKey(subscription.billing_key);
        } catch (error) {
          console.error('Error deleting billing key:', error);
        }
      }
    } else {
      // Cancel at period end
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to schedule cancellation' },
          { status: 500 }
        );
      }
    }

    // Log event
    await supabase.from('billing_events').insert({
      user_id: user.id,
      subscription_id: subscription.id,
      event_type: 'subscription.cancelled',
      description: cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at period end',
      metadata: { reason },
    });

    return NextResponse.json({
      success: true,
      message: cancelImmediately
        ? 'Subscription cancelled'
        : 'Subscription will be cancelled at period end',
    });
  } catch (error) {
    console.error('DELETE /api/subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
