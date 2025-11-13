/**
 * Subscription Pricing API
 * Public endpoint to get available subscription plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all active pricing tiers
    const { data: pricing, error } = await supabase
      .from('subscription_pricing')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching pricing:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pricing' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('GET /api/subscriptions/pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
