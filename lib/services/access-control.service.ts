/**
 * Access Control Service
 * Handles hierarchical permission checks for information access
 */

import {
  UserAccessProfile,
  DocumentClassification,
  AccessCheckResult,
  AccessLevel,
  ROLE_HIERARCHY,
  TIER_HIERARCHY,
  ACCESS_REQUIREMENTS,
} from '@/lib/types/access-control';

/**
 * Check if user has access to specific access level
 */
export function checkAccessLevel(
  user: UserAccessProfile,
  requiredLevel: AccessLevel
): AccessCheckResult {
  const requirements = ACCESS_REQUIREMENTS[requiredLevel];
  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const userTierLevel = TIER_HIERARCHY[user.tier];

  // Check role requirement
  if (userRoleLevel < requirements.minRole) {
    const requiredRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level >= requirements.minRole)
      .map(([role]) => role);

    return {
      allowed: false,
      reason: `Requires role: ${requiredRoles[0]} or higher`,
      requiredRole: requiredRoles[0] as any,
    };
  }

  // Check tier requirement
  if (userTierLevel < requirements.minTier) {
    const requiredTiers = Object.entries(TIER_HIERARCHY)
      .filter(([_, level]) => level >= requirements.minTier)
      .map(([tier]) => tier);

    return {
      allowed: false,
      reason: `Requires subscription: ${requiredTiers[0]} or higher`,
      requiredTier: requiredTiers[0] as any,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can access a document
 */
export function checkDocumentAccess(
  user: UserAccessProfile,
  document: DocumentClassification
): AccessCheckResult {
  // Check access level first
  const levelCheck = checkAccessLevel(user, document.level);
  if (!levelCheck.allowed) {
    return levelCheck;
  }

  // Check specific role requirement
  if (document.requiredRole) {
    const userRoleLevel = ROLE_HIERARCHY[user.role];
    const requiredRoleLevel = ROLE_HIERARCHY[document.requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return {
        allowed: false,
        reason: `Requires specific role: ${document.requiredRole} or higher`,
        requiredRole: document.requiredRole,
      };
    }
  }

  // Check specific tier requirement
  if (document.requiredTier) {
    const userTierLevel = TIER_HIERARCHY[user.tier];
    const requiredTierLevel = TIER_HIERARCHY[document.requiredTier];

    if (userTierLevel < requiredTierLevel) {
      return {
        allowed: false,
        reason: `Requires specific subscription: ${document.requiredTier} or higher`,
        requiredTier: document.requiredTier,
      };
    }
  }

  // Check department restriction
  if (document.departments && document.departments.length > 0) {
    if (!user.department || !document.departments.includes(user.department)) {
      return {
        allowed: false,
        reason: `Document restricted to departments: ${document.departments.join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Filter documents based on user access
 */
export function filterDocumentsByAccess<T extends { classification: DocumentClassification }>(
  user: UserAccessProfile,
  documents: T[]
): T[] {
  return documents.filter(doc => checkDocumentAccess(user, doc.classification).allowed);
}

/**
 * Get accessible Pinecone namespaces for user
 */
export function getAccessibleNamespaces(user: UserAccessProfile): string[] {
  const namespaces: string[] = [];

  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const userTierLevel = TIER_HIERARCHY[user.tier];

  // Public namespace (everyone)
  if (userTierLevel >= 0) {
    namespaces.push('public');
  }

  // Basic namespace (basic tier+)
  if (userTierLevel >= 1) {
    namespaces.push('basic');
  }

  // Intermediate namespace (junior role+ & basic tier+)
  if (userRoleLevel >= 1 && userTierLevel >= 1) {
    namespaces.push('intermediate');
  }

  // Advanced namespace (senior role+ & pro tier+)
  if (userRoleLevel >= 2 && userTierLevel >= 2) {
    namespaces.push('advanced');
  }

  // Confidential namespace (manager+ & pro tier+)
  if (userRoleLevel >= 3 && userTierLevel >= 2) {
    namespaces.push('confidential');
  }

  // Executive namespace (admin/ceo & enterprise tier)
  if (userRoleLevel >= 4 && userTierLevel >= 3) {
    namespaces.push('executive');
  }

  // Department-specific namespaces
  if (user.department) {
    namespaces.push(`dept_${user.department.toLowerCase()}`);
  }

  return namespaces;
}

/**
 * Get maximum access level for user
 */
export function getMaxAccessLevel(user: UserAccessProfile): AccessLevel {
  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const userTierLevel = TIER_HIERARCHY[user.tier];

  // Find highest access level user can access
  const accessLevels: AccessLevel[] = ['executive', 'confidential', 'advanced', 'intermediate', 'basic', 'public'];

  for (const level of accessLevels) {
    const requirements = ACCESS_REQUIREMENTS[level];
    if (userRoleLevel >= requirements.minRole && userTierLevel >= requirements.minTier) {
      return level;
    }
  }

  return 'public';
}

/**
 * Check if user is admin or CEO (full access)
 */
export function hasFullAccess(user: UserAccessProfile): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.admin;
}

/**
 * Generate access summary for user
 */
export function getUserAccessSummary(user: UserAccessProfile): {
  maxAccessLevel: AccessLevel;
  accessibleNamespaces: string[];
  hasFullAccess: boolean;
  restrictions: string[];
} {
  const maxAccessLevel = getMaxAccessLevel(user);
  const accessibleNamespaces = getAccessibleNamespaces(user);
  const fullAccess = hasFullAccess(user);

  const restrictions: string[] = [];

  if (!fullAccess) {
    const userRoleLevel = ROLE_HIERARCHY[user.role];
    const userTierLevel = TIER_HIERARCHY[user.tier];

    // Check what they can't access
    Object.entries(ACCESS_REQUIREMENTS).forEach(([level, req]) => {
      if (userRoleLevel < req.minRole || userTierLevel < req.minTier) {
        restrictions.push(`Cannot access ${level} content`);
      }
    });
  }

  return {
    maxAccessLevel,
    accessibleNamespaces,
    hasFullAccess: fullAccess,
    restrictions,
  };
}
