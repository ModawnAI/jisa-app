/**
 * Pinecone RBAC Metadata Migration Script
 * Adds access control metadata to existing Pinecone vectors
 * Phase 5.2: RBAC in RAG Pipeline
 *
 * Usage:
 *   npx tsx scripts/migrate-pinecone-rbac.ts
 *
 * What it does:
 * 1. Fetches all contexts from PostgreSQL
 * 2. For each context, updates corresponding Pinecone vector with RBAC metadata
 * 3. Adds: access_roles, access_tiers, required_clearance_level, etc.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INDEX_NAME = process.env.PINECONE_INDEX || 'hof-branch-chatbot';
const NAMESPACE = 'hof-knowledge-base-max';

/**
 * Role hierarchy
 */
function getRoleHierarchy(role: string): string[] {
  const hierarchy: Record<string, string[]> = {
    ceo: ['ceo', 'admin', 'manager', 'senior', 'junior', 'user'],
    admin: ['admin', 'manager', 'senior', 'junior', 'user'],
    manager: ['manager', 'senior', 'junior', 'user'],
    senior: ['senior', 'junior', 'user'],
    junior: ['junior', 'user'],
    user: ['user'],
  };
  return hierarchy[role] || ['user']; // Default to 'user' if not found
}

/**
 * Tier hierarchy
 */
function getTierHierarchy(tier: string): string[] {
  const hierarchy: Record<string, string[]> = {
    enterprise: ['enterprise', 'pro', 'basic', 'free'],
    pro: ['pro', 'basic', 'free'],
    basic: ['basic', 'free'],
    free: ['free'],
  };
  return hierarchy[tier] || ['free']; // Default to 'free' if not found
}

/**
 * Main migration function
 */
async function migrateRBACMetadata() {
  console.log('🚀 Starting Pinecone RBAC Metadata Migration');
  console.log('='.repeat(80));

  try {
    // Step 1: Get all contexts from PostgreSQL
    console.log('Step 1: Fetching contexts from PostgreSQL...');

    const { data: contexts, error } = await supabase
      .from('contexts')
      .select('*')
      .not('pinecone_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch contexts: ${error.message}`);
    }

    if (!contexts || contexts.length === 0) {
      console.log('⚠️  No contexts found with Pinecone IDs');
      return;
    }

    console.log(`✅ Found ${contexts.length} contexts to migrate`);
    console.log('='.repeat(80));

    // Step 2: Initialize Pinecone index
    const index = pinecone.index(INDEX_NAME);
    const namespace = index.namespace(NAMESPACE);

    // Step 3: Migrate each context
    console.log('Step 2: Updating Pinecone vectors with RBAC metadata...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i];
      const progress = ((i + 1) / contexts.length * 100).toFixed(1);

      try {
        // Build RBAC metadata
        const rbacMetadata = {
          // Access control fields
          access_level: context.access_level || 'public',
          required_role: context.required_role || null,
          required_tier: context.required_tier || null,

          // Hierarchies for $in queries
          access_roles: getRoleHierarchy(context.required_role || 'user'),
          access_tiers: getTierHierarchy(context.required_tier || 'free'),

          // Additional metadata from access_metadata field
          ...(context.access_metadata || {}),

          // System metadata
          document_id: context.document_id,
          embedding_model: context.embedding_model || 'text-embedding-3-large',
          migrated_at: new Date().toISOString(),
        };

        // Fetch current vector to preserve existing metadata
        const fetchResult = await namespace.fetch([context.pinecone_id]);
        const currentMetadata = fetchResult.records[context.pinecone_id]?.metadata || {};

        // Merge with existing metadata (don't overwrite content, chunk_type, etc.)
        const mergedMetadata = {
          ...currentMetadata,
          ...rbacMetadata,
        };

        // Update vector in Pinecone
        await namespace.update({
          id: context.pinecone_id,
          metadata: mergedMetadata,
        });

        successCount++;

        // Progress logging
        if ((i + 1) % 10 === 0 || i === contexts.length - 1) {
          console.log(
            `Progress: ${i + 1}/${contexts.length} (${progress}%) - ✅ Success: ${successCount}, ❌ Errors: ${errorCount}`
          );
        }
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Error migrating context ${context.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Migration Complete!');
    console.log(`✅ Successfully migrated: ${successCount}/${contexts.length} vectors`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log('='.repeat(80));

    // Step 4: Verify migration
    console.log('\nStep 3: Verifying migration...');

    const sampleId = contexts[0].pinecone_id;
    const verifyResult = await namespace.fetch([sampleId]);
    const sampleMetadata = verifyResult.records[sampleId]?.metadata;

    console.log('\nSample vector metadata:');
    console.log(JSON.stringify(sampleMetadata, null, 2));

    if (sampleMetadata?.access_roles && sampleMetadata?.access_tiers) {
      console.log('\n✅ Migration verified - RBAC metadata present');
    } else {
      console.log('\n⚠️  Migration incomplete - RBAC metadata missing');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Run migration
 */
console.log('Pinecone RBAC Metadata Migration');
console.log('Index:', INDEX_NAME);
console.log('Namespace:', NAMESPACE);
console.log('');

migrateRBACMetadata()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
