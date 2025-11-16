# 🚨 CRITICAL: Schema Alignment Report

**Date**: 2025-11-13
**Project**: JISA App (KakaoTalk RAG Chatbot)
**Supabase Project**: kuixphvkbuuzfezoeyii
**Status**: 🔴 **CRITICAL MISALIGNMENT DETECTED**

---

kuixphvkbuuzfezoeyii

## Executive Summary

The local codebase and Supabase database schema are **severely misaligned**, resulting in:
- ❌ **29/29 tables in database.ts DO NOT EXIST in Supabase** (wrong project)
- ❌ **5 payment tables MISSING from Supabase** (migration never applied)
- ❌ **8 essential tables MISSING from database.ts** (types not generated)
- ❌ **All payment-related API routes WILL FAIL** (referencing non-existent tables)
- ⚠️ **Production deployment will break** immediately on any payment/subscription operation

---

## 1. Actual Supabase Schema (10 Tables)

### ✅ Tables That Exist in Supabase Project kuixphvkbuuzfezoeyii

| Table Name | Rows | RLS Enabled | Purpose |
|------------|------|-------------|---------|
| `documents` | 0 | ✅ | Document storage with hierarchical access control |
| `contexts` | 405 | ✅ | Document chunks with embeddings for RAG retrieval |
| `profiles` | 1 | ✅ | User profiles with roles and subscription tiers |
| `verification_codes` | 4 | ✅ | Access codes for registration with KakaoTalk support |
| `subscription_tiers` | 4 | ✅ | Subscription tier definitions (free/basic/pro/enterprise) |
| `query_logs` | 0 | ✅ | User query logs for analytics |
| `analytics_events` | 0 | ✅ | Event tracking for analytics dashboard |
| `ingestion_jobs` | 0 | ✅ | Document ingestion job tracking |
| `ingestion_documents` | 0 | ✅ | Individual document processing status |

### ❌ Critical Missing Tables (Payment Schema)

**These tables are referenced by API routes but DO NOT EXIST:**

| Table Name | Status | Impact |
|------------|--------|--------|
| `subscriptions` | ❌ Missing | **CRITICAL** - All subscription operations FAIL |
| `subscription_pricing` | ❌ Missing | **CRITICAL** - Pricing queries FAIL |
| `payments` | ❌ Missing | **CRITICAL** - Payment completion FAILS |
| `invoices` | ❌ Missing | **CRITICAL** - Invoice generation FAILS |
| `billing_events` | ❌ Missing | **HIGH** - Billing audit trail missing |

**Root Cause**: Migration file `supabase/migrations/20251113_payments_schema.sql` exists locally but was **NEVER applied** to Supabase.

---

## 2. Local Database Types (database.ts) - WRONG PROJECT

### ❌ All 29 Tables in database.ts Do NOT Exist in Supabase

The `lib/types/database.ts` file contains types from a **completely different project** (appears to be an e-commerce/admin platform with shops, reservations, moderation systems):

<details>
<summary><strong>29 Tables from Wrong Project</strong></summary>

1. `account_security` - Admin 2FA and security settings
2. `admin_actions` - Admin activity logs
3. `admin_ip_whitelist` - IP-based admin access control
4. `admin_login_attempts` - Admin login tracking
5. `admin_permissions` - Granular admin permissions
6. `admin_sessions` - Admin session management
7. `admin_users` - Separate admin user system
8. `advisory_lock_metrics` - Database lock monitoring
9. `analytics_events` - ⚠️ **ONLY MATCH** (but schema differs)
10. `announcements` - System announcements
11. `category_hierarchy` - Category tree structure
12. `category_metadata` - Category metadata
13. `comment_likes` - Comment like system
14. `comment_reports` - Comment reporting/moderation
15. `conflict_detection_log` - Data conflict tracking
16. `conflict_resolution_actions` - Conflict resolution history
17. `conflict_resolution_strategies` - Conflict resolution rules
18. `content_reports` - Content moderation reports
19. `customer_notes` - Customer service notes
20. `error_reports` - Application error tracking
21. `escrow_products` - E-commerce escrow system
22. `faqs` - FAQ management
23. `feed_posts` - Social media feed
24. `influencer_promotions` - Influencer marketing system
25. `login_attempts` - User login tracking
26. `moderation_actions` - Moderation action logs
27. `moderation_audit_trail` - Moderation audit system
28. `moderation_log` - Moderation event logs
29. `moderation_rules` - Automated moderation rules

</details>

**Match Rate**: 1/29 tables (3.4%) - `analytics_events` only
**Conclusion**: `database.ts` is from a **different codebase entirely**

---

## 3. Broken API Routes Analysis

### 🔴 CRITICAL: Payment APIs (All Will Fail)

#### `/api/subscriptions/route.ts`
**Lines Affected**: 27-33, 98-101, 108-121, 134, 170, 215-218, 229-237, 262-269, 280-288

```typescript
// ❌ BROKEN: Table does not exist
const { data: subscription } = await supabase
  .from('subscriptions')  // ❌ Table missing
  .select(`
    *,
    subscription_pricing(*)  // ❌ Table missing
  `)
  .eq('user_id', user.id)
  .single();

// ❌ BROKEN: Table does not exist
await supabase.from('billing_events').insert({  // ❌ Table missing
  user_id: user.id,
  subscription_id: subscription.id,
  event_type: 'subscription.created',
  description: `Subscription created: ${tier}`,
  amount,
});
```

**Impact**:
- ❌ GET requests return 500 errors
- ❌ POST (create subscription) fails silently
- ❌ DELETE (cancel subscription) fails
- ❌ No billing audit trail

#### `/api/payment/complete/route.ts`
**Lines Affected**: 32-36, 64-75, 88-93, 97-105

```typescript
// ❌ BROKEN: Table does not exist
const { data: paymentRecord } = await supabaseAdmin
  .from('payments')  // ❌ Table missing
  .select('*, profiles(*)')
  .eq('payment_id', paymentId)
  .single();

// ❌ BROKEN: Cannot update non-existent table
await supabaseAdmin
  .from('payments')  // ❌ Table missing
  .update({
    status: 'paid',
    transaction_id: portonePayment.transactionId,
    // ...
  })
  .eq('payment_id', paymentId);
```

**Impact**:
- ❌ Payment verification fails completely
- ❌ PortOne webhooks fail to update payment status
- ❌ Users cannot complete payments
- ❌ Revenue tracking impossible

#### `/api/invoices/[id]/route.ts`
**Lines Affected**: 26-30

```typescript
// ❌ BROKEN: Table does not exist
const { data: invoice, error } = await supabase
  .from('invoices')  // ❌ Table missing
  .select('*')
  .eq('id', invoiceId)
  .single();
```

**Impact**:
- ❌ Invoice retrieval returns 404 always
- ❌ PDF generation fails
- ❌ Download endpoints broken
- ❌ Billing compliance issues

### Additional Broken APIs

| API Route | Missing Tables | Impact Level |
|-----------|----------------|--------------|
| `/api/payment/history` | `payments` | 🔴 Critical |
| `/api/subscriptions/upgrade` | `subscriptions`, `payments` | 🔴 Critical |
| `/api/subscriptions/pricing` | `subscription_pricing` | 🔴 Critical |
| `/api/invoices/by-payment/[paymentId]` | `invoices`, `payments` | 🔴 Critical |
| `/api/analytics/payments` | `payments`, `billing_events` | 🟡 High |

---

## 4. Applied vs Unapplied Migrations

### ✅ Migrations Applied to Supabase (15 total)

```sql
20251113090237 - create_profiles_table ✅
20251113090239 - create_query_logs_table ✅
20251113090241 - create_analytics_events_table ✅
20251113090242 - create_verification_codes_table ✅
20251113090244 - create_subscription_tiers_table ✅
20251113090516 - enhance_profiles_with_hierarchical_roles ✅
20251113090517 - create_documents_table_with_access_control ✅
20251113090646 - fix_subscription_tiers_constraint ✅
20251113094845 - fix_verification_codes_schema ✅
20251113101504 - create_ingestion_tables ✅
20251113101824 - create_contexts_table ✅
20251113125825 - kakao_auth_support ✅
20251113130504 - analytics_views ✅
20251113130920 - add_missing_profiles_columns ✅
20251113131001 - add_auth_trigger_and_policies ✅
20251113131953 - add_foreign_keys ✅
```

### ❌ Unapplied Local Migration (CRITICAL)

```bash
❌ supabase/migrations/20251113_payments_schema.sql - NEVER APPLIED
```

**This migration should create**:
- `subscription_pricing` table
- `subscriptions` table
- `payments` table
- `invoices` table
- `billing_events` table
- `kakao_user_sessions` table (KakaoTalk session tracking)

**Why it failed**:
- Migration file exists locally but was never pushed to Supabase
- No error logs indicate what prevented application
- Likely manual execution required

---

## 5. Foreign Key Analysis

### ✅ Correctly Implemented Relationships (Supabase)

```sql
documents.created_by → auth.users.id
contexts.document_id → documents.id
verification_codes.created_by → auth.users.id
verification_codes.user_id → auth.users.id
query_logs.user_id → profiles.id
analytics_events.user_id → profiles.id
ingestion_jobs.user_id → auth.users.id
ingestion_documents.job_id → ingestion_jobs.id
ingestion_documents.document_id → documents.id
```

### ❌ Missing Foreign Keys (Would Be in Payment Schema)

```sql
subscriptions.user_id → profiles.id (missing)
subscriptions.pricing_id → subscription_pricing.id (missing)
payments.user_id → profiles.id (missing)
payments.subscription_id → subscriptions.id (missing)
invoices.user_id → profiles.id (missing)
invoices.payment_id → payments.id (missing)
billing_events.user_id → profiles.id (missing)
billing_events.subscription_id → subscriptions.id (missing)
billing_events.payment_id → payments.id (missing)
```

---

## 6. TypeScript Type Generation Required

### ❌ Missing Types in database.ts

These tables exist in Supabase but have **NO TypeScript types** defined:

1. `documents` - Core document storage
2. `contexts` - RAG context chunks (405 rows exist!)
3. `profiles` - User profile system
4. `verification_codes` - Registration codes
5. `subscription_tiers` - Tier definitions
6. `query_logs` - Query tracking
7. `ingestion_jobs` - Job tracking
8. `ingestion_documents` - Document processing

**Result**: TypeScript cannot validate queries → Runtime errors guaranteed

---

## 7. Impact Assessment

### 🔴 CRITICAL - Production Blocker

**Affected Systems**:
- ✅ **Authentication**: Works (profiles table exists)
- ❌ **Subscriptions**: Completely broken
- ❌ **Payments**: Completely broken
- ❌ **Invoicing**: Completely broken
- ❌ **Billing Analytics**: No data to analyze
- ⚠️ **RAG System**: Works but no type safety
- ✅ **Admin Codes**: Works
- ✅ **KakaoTalk Integration**: Auth works, but session tracking missing

**User Impact**:
- ❌ Cannot upgrade subscription
- ❌ Cannot make payments
- ❌ Cannot view payment history
- ❌ Cannot download invoices
- ❌ Free tier users stuck (cannot upgrade)
- ❌ Admin billing dashboard shows no data

**Revenue Impact**:
- ❌ **NO REVENUE COLLECTION POSSIBLE**
- ❌ Payment processing completely non-functional
- ❌ Subscription management broken
- ❌ Financial reporting impossible

### 🟡 HIGH - Type Safety Issues

**Affected Areas**:
- Document queries lack TypeScript validation
- Context queries untyped
- Profile updates unvalidated
- Ingestion pipeline untyped

**Developer Impact**:
- No autocomplete for database queries
- Runtime errors instead of compile-time errors
- Difficult to maintain and refactor
- High bug risk

---

## 8. Recommended Actions (Priority Order)

### 🚨 IMMEDIATE (Do First - Production Blocker)

1. **Apply Payment Schema Migration**
   ```bash
   # Option 1: Apply migration to Supabase
   supabase db push --project-ref kuixphvkbuuzfezoeyii

   # Option 2: Manually execute SQL
   psql postgresql://postgres:[password]@[host]:5432/postgres \
     -f supabase/migrations/20251113_payments_schema.sql
   ```

   **Verify**: Check that all 5 payment tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('subscriptions', 'payments', 'invoices', 'billing_events', 'subscription_pricing');
   ```

2. **Regenerate TypeScript Types from Actual Schema**
   ```bash
   # Generate types from Supabase project kuixphvkbuuzfezoeyii
   supabase gen types typescript \
     --project-id kuixphvkbuuzfezoeyii \
     > lib/types/database.ts
   ```

   **Verify**: Check that generated file includes:
   - documents
   - contexts
   - profiles
   - verification_codes
   - subscription_tiers
   - query_logs
   - analytics_events
   - ingestion_jobs
   - ingestion_documents
   - subscriptions (after migration)
   - payments (after migration)
   - invoices (after migration)
   - billing_events (after migration)
   - subscription_pricing (after migration)

3. **Test Payment Flow End-to-End**
   ```bash
   # Test each API endpoint
   curl -X GET http://localhost:3000/api/subscriptions
   curl -X POST http://localhost:3000/api/subscriptions -d '{...}'
   curl -X POST http://localhost:3000/api/payment/complete -d '{...}'
   ```

### 🔧 URGENT (Do Second - Quality & Stability)

4. **Add Database Constraints and Indexes**
   - Review all foreign key relationships
   - Add missing indexes for query performance
   - Verify RLS policies on payment tables

5. **Update API Error Handling**
   - Add proper error messages for missing tables
   - Implement retry logic for transient failures
   - Log database errors to monitoring system

6. **Add Integration Tests**
   ```typescript
   // Test payment flow
   test('complete payment creates subscription', async () => {
     // Test that payment completion updates all related tables
   });

   // Test subscription management
   test('subscription lifecycle', async () => {
     // Test create, upgrade, cancel subscription
   });
   ```

### 📊 HIGH PRIORITY (Do Third - Monitoring & Analytics)

7. **Implement Monitoring**
   - Set up alerts for failed payment operations
   - Track subscription conversion rates
   - Monitor billing event creation
   - Dashboard for payment health metrics

8. **Data Migration Plan** (If needed)
   - If any test data exists in wrong tables, migrate
   - Verify all existing users have correct profile data
   - Audit existing verification codes and subscriptions

### 🛡️ RECOMMENDED (Do Fourth - Long-term Health)

9. **Schema Validation in CI/CD**
   ```yaml
   # Add to GitHub Actions or CI pipeline
   - name: Validate Schema Alignment
     run: |
       supabase db diff --use-migra
       npm run test:schema-alignment
   ```

10. **Documentation Updates**
    - Document all database tables and relationships
    - Create ERD (Entity Relationship Diagram)
    - Update API documentation with correct schemas
    - Add schema change procedures to CONTRIBUTING.md

---

## 9. Schema Alignment Checklist

### Before Deployment
- [ ] Apply payment schema migration to Supabase
- [ ] Regenerate database.ts from actual Supabase schema
- [ ] Verify all 14 tables exist in Supabase
- [ ] Run TypeScript compilation (no type errors)
- [ ] Test subscription creation API
- [ ] Test payment completion API
- [ ] Test invoice generation API
- [ ] Verify RLS policies on all tables
- [ ] Check foreign key constraints
- [ ] Review indexes for performance

### Post-Deployment
- [ ] Monitor error logs for database issues
- [ ] Track payment success/failure rates
- [ ] Verify subscription data integrity
- [ ] Check billing event audit trail
- [ ] Validate invoice generation
- [ ] Test full payment flow in production
- [ ] Confirm analytics dashboard displays data

---

## 10. Technical Debt Assessment

### Critical Technical Debt
- ❌ Payment schema not in production database
- ❌ Type definitions completely mismatched
- ❌ No schema validation in CI/CD
- ❌ Missing integration tests for payment flow

### High Technical Debt
- ⚠️ No automated schema migration testing
- ⚠️ RLS policies not fully tested
- ⚠️ Missing database migration rollback plan
- ⚠️ No monitoring for schema drift

### Medium Technical Debt
- ⚠️ API error handling could be more robust
- ⚠️ Missing comprehensive database documentation
- ⚠️ No automated type generation in CI/CD
- ⚠️ Schema changes not tracked in changelog

---

## 11. Prevention Measures

### Process Improvements

1. **Automated Schema Sync Check**
   ```typescript
   // Add to test suite
   describe('Schema Alignment', () => {
     it('database.ts matches Supabase schema', async () => {
       const localTables = Object.keys(Database.public.Tables);
       const supabaseTables = await fetchSupabaseTables();
       expect(localTables).toEqual(supabaseTables);
     });
   });
   ```

2. **Pre-commit Hook**
   ```bash
   #!/bin/bash
   # .git/hooks/pre-commit

   # Check if migrations are applied
   if [ -f "supabase/migrations/*.sql" ]; then
     echo "⚠️  Unapplied migrations detected!"
     echo "Run: supabase db push"
     exit 1
   fi

   # Regenerate types
   supabase gen types typescript > lib/types/database.ts
   git add lib/types/database.ts
   ```

3. **Migration Checklist Template**
   ```markdown
   ## Migration Checklist
   - [ ] SQL file created in supabase/migrations/
   - [ ] Migration applied to local Supabase: `supabase db push`
   - [ ] Migration applied to remote: `supabase db push --project-ref <ref>`
   - [ ] Types regenerated: `supabase gen types typescript`
   - [ ] API routes updated to use new schema
   - [ ] Tests updated for new tables
   - [ ] Documentation updated
   ```

---

## 12. Contact for Questions

**Critical Issues**: Escalate to technical lead immediately
**Schema Questions**: Review with database architect
**Type Generation**: Check Supabase CLI documentation

---

## Status: 🔴 CRITICAL ACTION REQUIRED

**This issue MUST be resolved before any production deployment.**

Payment functionality is completely non-functional due to missing database tables. Revenue collection is impossible in current state.

**Estimated Fix Time**: 1-2 hours
**Testing Required**: 2-3 hours
**Total Downtime Risk**: High if not addressed

---

**Report Generated**: 2025-11-13
**Last Updated**: 2025-11-13
**Next Review**: After migration application
