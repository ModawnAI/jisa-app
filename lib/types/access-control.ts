/**
 * Hierarchical Access Control Types
 * Supports role-based and tier-based information access
 */

export type UserRole = 'user' | 'junior' | 'senior' | 'manager' | 'admin' | 'ceo';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export type AccessLevel = 'public' | 'basic' | 'intermediate' | 'advanced' | 'confidential' | 'executive';

export type DocumentClassification = {
  level: AccessLevel;
  requiredRole?: UserRole;
  requiredTier?: SubscriptionTier;
  departments?: string[];
  tags?: string[];
};

/**
 * Role hierarchy (higher = more access)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  junior: 1,
  senior: 2,
  manager: 3,
  admin: 4,
  ceo: 5,
};

/**
 * Tier hierarchy (higher = more access)
 */
export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * Access level requirements
 */
export const ACCESS_REQUIREMENTS: Record<AccessLevel, {
  minRole: number;
  minTier: number;
  description: string;
}> = {
  public: {
    minRole: 0, // user
    minTier: 0, // free
    description: 'Public information accessible to all users',
  },
  basic: {
    minRole: 0, // user
    minTier: 1, // basic
    description: 'Basic information for paid users',
  },
  intermediate: {
    minRole: 1, // junior
    minTier: 1, // basic
    description: 'Intermediate information for junior staff and above',
  },
  advanced: {
    minRole: 2, // senior
    minTier: 2, // pro
    description: 'Advanced information for senior staff and above',
  },
  confidential: {
    minRole: 3, // manager
    minTier: 2, // pro
    description: 'Confidential information for management',
  },
  executive: {
    minRole: 4, // admin/ceo
    minTier: 3, // enterprise
    description: 'Executive-level information for top management',
  },
};

/**
 * User access profile
 */
export interface UserAccessProfile {
  userId: string;
  role: UserRole;
  tier: SubscriptionTier;
  department?: string;
  permissions?: string[];
}

/**
 * Document metadata with access control
 */
export interface DocumentMetadata {
  id: string;
  title: string;
  classification: DocumentClassification;
  content: string;
  namespace: string;
  pdfUrl?: string;
}

/**
 * Access check result
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredTier?: SubscriptionTier;
}
