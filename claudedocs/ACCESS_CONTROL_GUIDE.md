# Hierarchical Access Control System

## Overview

The JISA App implements a comprehensive **hierarchical access control system** that combines:
- **Role-Based Access Control (RBAC)**: User roles determine permissions
- **Tier-Based Access**: Subscription tiers gate feature access
- **Information Classification**: Documents tagged with access levels
- **Department Restrictions**: Selective access by organizational unit

## Architecture Components

### 1. User Roles (Hierarchical)

```
CEO (Level 5)          - Full system access, all information
  ↓
Admin (Level 4)        - System administration, user management
  ↓
Manager (Level 3)      - Team management, confidential information
  ↓
Senior (Level 2)       - Advanced operations, experienced staff
  ↓
Junior (Level 1)       - Basic operations, training staff
  ↓
User (Level 0)         - Limited access, external users
```

### 2. Subscription Tiers (Hierarchical)

```
Enterprise (Level 3)   - Unlimited, all features, executive information
  ↓
Pro (Level 2)          - High limits, advanced features
  ↓
Basic (Level 1)        - Standard limits, core features
  ↓
Free (Level 0)         - Limited queries, public information only
```

### 3. Information Access Levels

| Access Level | Min Role | Min Tier | Description |
|-------------|----------|----------|-------------|
| **Public** | User (0) | Free (0) | Public information for all users |
| **Basic** | User (0) | Basic (1) | Standard company information |
| **Intermediate** | Junior (1) | Basic (1) | Internal operational data |
| **Advanced** | Senior (2) | Pro (2) | Advanced business intelligence |
| **Confidential** | Manager (3) | Pro (2) | Management-only information |
| **Executive** | Admin (4) | Enterprise (3) | C-suite and executive data |

## Database Schema

### Profiles Table (Enhanced)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,

  -- Hierarchical access control
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'junior', 'senior', 'manager', 'admin', 'ceo')),
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),

  -- Department-based restrictions
  department TEXT,

  -- Additional permissions (JSON array)
  permissions JSONB DEFAULT '[]',

  -- Usage tracking
  query_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Documents Table (Access Control)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Access control metadata
  access_level TEXT NOT NULL DEFAULT 'public',
  required_role TEXT,  -- Optional specific role requirement
  required_tier TEXT,  -- Optional specific tier requirement

  -- Department restrictions
  allowed_departments TEXT[] DEFAULT '{}',

  -- Vector search integration
  namespace TEXT NOT NULL DEFAULT 'public',
  pinecone_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage Examples

### API Route Protection

```typescript
// Require authentication only
import { withAuth } from '@/lib/middleware/access-control';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // user.role, user.tier available
    return NextResponse.json({ message: 'Authenticated!' });
  });
}
```

```typescript
// Require specific role
import { requireManager } from '@/lib/middleware/access-control';

export async function POST(request: NextRequest) {
  const { user, error } = await requireManager(request);
  if (error) return error;

  // Only managers and above can access
  return NextResponse.json({ message: 'Manager access granted' });
}
```

```typescript
// Require both role AND tier
import { requireAccess } from '@/lib/middleware/access-control';

export async function GET(request: NextRequest) {
  const { user, error } = await requireAccess(request, 'senior', 'pro');
  if (error) return error;

  // Only senior staff with pro subscription
  return NextResponse.json({ data: 'Advanced data' });
}
```

### RAG Service with Access Control

```typescript
import { ragAnswerWithAccessControl } from '@/lib/services/rag.service.enhanced';

// Automatically filters results based on user access
const { answer, accessDeniedCount } = await ragAnswerWithAccessControl(
  userQuery,
  userId,
  topK
);

// Returns only documents user has permission to see
```

### Check User Access Programmatically

```typescript
import {
  checkAccessLevel,
  getUserAccessSummary,
  getAccessibleNamespaces
} from '@/lib/services/access-control.service';

// Check if user can access specific level
const accessCheck = checkAccessLevel(userProfile, 'confidential');
if (!accessCheck.allowed) {
  console.log(`Access denied: ${accessCheck.reason}`);
}

// Get user's access summary
const summary = getUserAccessSummary(userProfile);
console.log(`Max access level: ${summary.maxAccessLevel}`);
console.log(`Can access: ${summary.accessibleNamespaces.join(', ')}`);

// Get Pinecone namespaces user can search
const namespaces = getAccessibleNamespaces(userProfile);
// Returns: ['public', 'basic', 'intermediate'] for junior/basic user
```

## Row Level Security (RLS) Policies

### Documents Table RLS

```sql
-- Users see documents based on their access level
CREATE POLICY "Users see documents based on access level"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND has_sufficient_access(
        p.role,
        p.subscription_tier,
        COALESCE(required_role, 'user'),
        COALESCE(required_tier, 'free')
      )
    )
  );

-- Admins and CEOs bypass all restrictions
CREATE POLICY "Admins and CEOs see all documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'ceo')
    )
  );
```

## Rate Limiting by Tier

| Tier | Daily Query Limit |
|------|------------------|
| Free | 10 queries/day |
| Basic | 100 queries/day |
| Pro | 1,000 queries/day |
| Enterprise | Unlimited |

```typescript
import { checkRateLimit } from '@/lib/middleware/access-control';

const { allowed, remaining, limit } = await checkRateLimit(userId, tier);

if (!allowed) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      limit,
      remaining: 0,
      resetAt: 'tomorrow 00:00 KST'
    },
    { status: 429 }
  );
}
```

## Namespace Strategy for Pinecone

Organize vector embeddings by access level:

```
Namespace Hierarchy:
├── public                # Everyone (free+)
├── basic                 # Basic tier+
├── intermediate          # Junior role+ & Basic tier+
├── advanced              # Senior role+ & Pro tier+
├── confidential          # Manager role+ & Pro tier+
├── executive             # Admin/CEO role & Enterprise tier
└── dept_<name>           # Department-specific (e.g., dept_sales)
```

## Example User Scenarios

### Scenario 1: Junior Staff, Basic Tier
```yaml
Role: junior
Tier: basic
Access:
  - Information Levels: Public, Basic, Intermediate
  - Namespaces: [public, basic, intermediate]
  - Rate Limit: 100 queries/day
  - Can access: General company info, operational data
  - Cannot access: Executive reports, financial data
```

### Scenario 2: Manager, Pro Tier
```yaml
Role: manager
Tier: pro
Access:
  - Information Levels: All except Executive
  - Namespaces: [public, basic, intermediate, advanced, confidential]
  - Rate Limit: 1,000 queries/day
  - Can access: Management reports, confidential data
  - Cannot access: Board minutes, C-suite communications
```

### Scenario 3: CEO, Enterprise Tier
```yaml
Role: ceo
Tier: enterprise
Access:
  - Information Levels: ALL
  - Namespaces: ALL
  - Rate Limit: Unlimited
  - Can access: Everything including executive information
  - Special privileges: Bypass all RLS policies
```

## Implementation Checklist

### For Document Upload
- [ ] Tag document with `access_level`
- [ ] Set `required_role` if specific role needed
- [ ] Set `required_tier` if specific subscription needed
- [ ] Add to appropriate Pinecone namespace
- [ ] Set `allowed_departments` if department-specific

### For API Routes
- [ ] Add authentication middleware
- [ ] Check role requirements
- [ ] Check tier requirements
- [ ] Implement rate limiting
- [ ] Log access attempts

### For RAG Queries
- [ ] Retrieve user profile (role + tier)
- [ ] Determine accessible namespaces
- [ ] Filter search results by access level
- [ ] Log document access for audit
- [ ] Apply watermarks to sensitive content

## Security Best Practices

1. **Fail Secure**: Default to most restrictive access
2. **Audit Everything**: Log all access attempts
3. **Least Privilege**: Grant minimum necessary permissions
4. **Defense in Depth**: Multiple layers (RLS + middleware + service)
5. **Regular Reviews**: Audit user roles and permissions quarterly

## Migration Path

### Existing Users
```sql
-- Set default role for existing users
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Migrate based on subscription
UPDATE profiles
SET role = 'senior'
WHERE subscription_tier IN ('pro', 'enterprise');
```

### Existing Documents
```sql
-- Tag public documents
UPDATE documents
SET access_level = 'public'
WHERE access_level IS NULL;

-- Department-based migration
UPDATE documents
SET allowed_departments = ARRAY['sales', 'marketing']
WHERE department_tag = 'sales_materials';
```

## Testing Access Control

```typescript
// Test user access matrix
const testCases = [
  { role: 'user', tier: 'free', expectedLevels: ['public'] },
  { role: 'junior', tier: 'basic', expectedLevels: ['public', 'basic', 'intermediate'] },
  { role: 'senior', tier: 'pro', expectedLevels: ['public', 'basic', 'intermediate', 'advanced'] },
  { role: 'manager', tier: 'pro', expectedLevels: ['public', 'basic', 'intermediate', 'advanced', 'confidential'] },
  { role: 'ceo', tier: 'enterprise', expectedLevels: 'ALL' },
];

for (const test of testCases) {
  const user: UserAccessProfile = {
    userId: 'test',
    role: test.role,
    tier: test.tier,
  };

  const summary = getUserAccessSummary(user);
  console.assert(
    JSON.stringify(summary.accessibleNamespaces) === JSON.stringify(test.expectedLevels),
    `Failed for ${test.role}/${test.tier}`
  );
}
```

## Troubleshooting

### User Can't Access Expected Documents

1. Check user profile: `SELECT role, subscription_tier FROM profiles WHERE id = '<user_id>'`
2. Check document access level: `SELECT access_level, required_role, required_tier FROM documents WHERE id = '<doc_id>'`
3. Verify RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'documents'`
4. Check department match if applicable

### Rate Limit Issues

1. Check query count: `SELECT COUNT(*) FROM query_logs WHERE user_id = '<user_id>' AND timestamp::date = CURRENT_DATE`
2. Verify tier limits: `SELECT query_limit FROM subscription_tiers WHERE name = '<tier>'`
3. Check if user upgraded tier recently

### RLS Policy Not Working

1. Ensure RLS is enabled: `ALTER TABLE documents ENABLE ROW LEVEL SECURITY;`
2. Check service role usage (bypasses RLS): Use anon key for user queries
3. Verify helper functions exist: `SELECT * FROM pg_proc WHERE proname = 'has_sufficient_access'`

## Future Enhancements

- [ ] Time-based access (expire after X days)
- [ ] Content redaction for lower tiers
- [ ] Dynamic permission elevation requests
- [ ] Audit log dashboard for compliance
- [ ] IP-based geo-restrictions
- [ ] Multi-factor authentication for sensitive data
- [ ] Data loss prevention (DLP) rules
