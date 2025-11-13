/**
 * Access Control Middleware
 * Handles authentication and authorization for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  UserAccessProfile,
  UserRole,
  SubscriptionTier,
  ROLE_HIERARCHY,
  TIER_HIERARCHY,
} from '@/lib/types/access-control';

export interface AuthenticatedRequest extends NextRequest {
  user?: UserAccessProfile;
}

/**
 * Authenticate user and attach profile to request
 */
export async function authenticate(
  request: NextRequest
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, subscription_tier, department, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }),
      };
    }

    const userProfile: UserAccessProfile = {
      userId: user.id,
      role: profile.role as UserRole,
      tier: profile.subscription_tier as SubscriptionTier,
      department: profile.department,
      permissions: profile.permissions || [],
    };

    return { user: userProfile, error: null };
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return {
      user: null,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
    };
  }
}

/**
 * Require specific role (or higher)
 */
export async function requireRole(
  request: NextRequest,
  minRole: UserRole
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  const { user, error } = await authenticate(request);

  if (error) return { user, error };
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const minRoleLevel = ROLE_HIERARCHY[minRole];

  if (userRoleLevel < minRoleLevel) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Insufficient permissions',
          required: minRole,
          current: user.role,
        },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Require specific subscription tier (or higher)
 */
export async function requireTier(
  request: NextRequest,
  minTier: SubscriptionTier
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  const { user, error } = await authenticate(request);

  if (error) return { user, error };
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const userTierLevel = TIER_HIERARCHY[user.tier];
  const minTierLevel = TIER_HIERARCHY[minTier];

  if (userTierLevel < minTierLevel) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Subscription upgrade required',
          required: minTier,
          current: user.tier,
        },
        { status: 402 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Require both role and tier
 */
export async function requireAccess(
  request: NextRequest,
  minRole: UserRole,
  minTier: SubscriptionTier
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  const { user, error } = await authenticate(request);

  if (error) return { user, error };
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const minRoleLevel = ROLE_HIERARCHY[minRole];
  const userTierLevel = TIER_HIERARCHY[user.tier];
  const minTierLevel = TIER_HIERARCHY[minTier];

  if (userRoleLevel < minRoleLevel) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Insufficient role',
          required: minRole,
          current: user.role,
        },
        { status: 403 }
      ),
    };
  }

  if (userTierLevel < minTierLevel) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Subscription upgrade required',
          required: minTier,
          current: user.tier,
        },
        { status: 402 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Admin-only middleware
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  return requireRole(request, 'admin');
}

/**
 * CEO-only middleware
 */
export async function requireCEO(
  request: NextRequest
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  return requireRole(request, 'ceo');
}

/**
 * Manager and above middleware
 */
export async function requireManager(
  request: NextRequest
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  return requireRole(request, 'manager');
}

/**
 * Department-specific access
 */
export async function requireDepartment(
  request: NextRequest,
  allowedDepartments: string[]
): Promise<{ user: UserAccessProfile | null; error: NextResponse | null }> {
  const { user, error } = await authenticate(request);

  if (error) return { user, error };
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Admins and CEOs bypass department restrictions
  if (ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.admin) {
    return { user, error: null };
  }

  if (!user.department || !allowedDepartments.includes(user.department)) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Department access denied',
          allowed: allowedDepartments,
          current: user.department || 'none',
        },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Rate limiting by tier
 */
export interface RateLimitConfig {
  free: number;
  basic: number;
  pro: number;
  enterprise: number;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  free: 10, // 10 queries per day
  basic: 100, // 100 queries per day
  pro: 1000, // 1000 queries per day
  enterprise: -1, // unlimited
};

export async function checkRateLimit(
  userId: string,
  tier: SubscriptionTier
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = DEFAULT_RATE_LIMITS[tier];

  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  try {
    const supabase = await createClient();

    // Get today's query count
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('query_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('timestamp', `${today}T00:00:00Z`)
      .lte('timestamp', `${today}T23:59:59Z`);

    if (error) {
      console.error('[Rate Limit] Error checking count:', error);
      return { allowed: true, remaining: limit, limit }; // Fail open
    }

    const queryCount = count || 0;
    const remaining = Math.max(0, limit - queryCount);
    const allowed = queryCount < limit;

    return { allowed, remaining, limit };
  } catch (error) {
    console.error('[Rate Limit] Error:', error);
    return { allowed: true, remaining: limit, limit }; // Fail open
  }
}

/**
 * Middleware wrapper for easy use in API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: UserAccessProfile) => Promise<NextResponse>
): Promise<NextResponse> {
  const { user, error } = await authenticate(request);

  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handler(request, user);
}

export async function withRole(
  request: NextRequest,
  minRole: UserRole,
  handler: (req: NextRequest, user: UserAccessProfile) => Promise<NextResponse>
): Promise<NextResponse> {
  const { user, error } = await requireRole(request, minRole);

  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handler(request, user);
}
