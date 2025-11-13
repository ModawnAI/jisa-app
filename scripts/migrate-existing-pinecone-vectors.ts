/**
 * Migrate Existing Pinecone Vectors with RBAC Metadata
 *
 * This script adds RBAC (Role-Based Access Control) metadata to existing vectors
 * in Pinecone that were created before the Phase 5 ingestion pipeline.
 *
 * Usage:
 *   npx tsx scripts/migrate-existing-pinecone-vectors.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Preview changes without applying them
 *
 * What it does:
 * 1. Fetches ALL vectors from Pinecone namespace
 * 2. Checks each vector for RBAC metadata
 * 3. Adds default RBAC metadata to vectors that don't have it
 * 4. Preserves existing metadata (content, chunk_type, etc.)
 *
 * Default RBAC values (can be customized):
 * - access_level: 'standard'
 * - required_role: 'user'
 * - required_tier: 'basic'
 * - access_roles: ['ceo', 'admin', 'manager', 'senior', 'junior', 'user']
 * - access_tiers: ['enterprise', 'pro', 'basic', 'free']
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuration
const INDEX_NAME = process.env.PINECONE_INDEX || 'hof-branch-chatbot';
const NAMESPACE = 'hof-knowledge-base-max';
const BATCH_SIZE = 100; // Process vectors in batches
const DRY_RUN = process.argv.includes('--dry-run');

// Initialize Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

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
  return hierarchy[role] || ['user'];
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
  return hierarchy[tier] || ['free'];
}

/**
 * Check if vector has RBAC metadata
 */
function hasRBACMetadata(metadata: Record<string, any>): boolean {
  return !!(
    metadata.access_roles &&
    metadata.access_tiers &&
    metadata.access_level
  );
}

/**
 * Create default RBAC metadata
 */
function createDefaultRBACMetadata(): Record<string, any> {
  const defaultRole = 'user';
  const defaultTier = 'basic';
  const defaultLevel = 'standard';

  return {
    // Access control fields
    access_level: defaultLevel,
    required_role: defaultRole,
    required_tier: defaultTier,

    // Hierarchies for $in queries
    access_roles: getRoleHierarchy(defaultRole),
    access_tiers: getTierHierarchy(defaultTier),

    // System metadata
    rbac_migrated_at: new Date().toISOString(),
    rbac_migration_version: '1.0',
  };
}

/**
 * List all vector IDs in namespace
 */
async function listAllVectorIds(namespace: any): Promise<string[]> {
  const vectorIds: string[] = [];
  let paginationToken: string | undefined;

  console.log('📋 Listing all vector IDs...');

  do {
    const listResult = await namespace.listPaginated({
      limit: 100,
      paginationToken,
    });

    if (listResult.vectors) {
      vectorIds.push(...listResult.vectors.map((v: any) => v.id));
    }

    paginationToken = listResult.pagination?.next;

    process.stdout.write(`\r   Found ${vectorIds.length} vectors...`);
  } while (paginationToken);

  console.log(`\n✅ Found ${vectorIds.length} total vectors`);
  return vectorIds;
}

/**
 * Process vectors in batches
 */
async function processBatch(
  namespace: any,
  vectorIds: string[],
  batchNum: number,
  totalBatches: number
): Promise<{ checked: number; needsUpdate: number; updated: number; errors: number }> {
  const stats = { checked: 0, needsUpdate: 0, updated: 0, errors: 0 };

  console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${vectorIds.length} vectors)`);

  try {
    // Fetch vectors
    const fetchResult = await namespace.fetch(vectorIds);
    const vectors = fetchResult.records;

    if (!vectors) {
      console.log('   ⚠️  No vectors returned');
      return stats;
    }

    // Check each vector
    for (const [vectorId, vector] of Object.entries(vectors)) {
      stats.checked++;

      const metadata = (vector as any).metadata || {};
      const hasRBAC = hasRBACMetadata(metadata);

      if (!hasRBAC) {
        stats.needsUpdate++;

        if (!DRY_RUN) {
          try {
            // Create merged metadata
            const rbacMetadata = createDefaultRBACMetadata();
            const mergedMetadata = {
              ...metadata,
              ...rbacMetadata,
            };

            // Update vector
            await namespace.update({
              id: vectorId,
              metadata: mergedMetadata,
            });

            stats.updated++;
          } catch (error) {
            stats.errors++;
            console.error(`   ❌ Error updating ${vectorId}:`, error instanceof Error ? error.message : error);
          }
        }
      }

      // Progress indicator
      if (stats.checked % 10 === 0) {
        process.stdout.write(
          `\r   Progress: ${stats.checked}/${vectorIds.length} checked, ${stats.needsUpdate} need update`
        );
      }
    }

    console.log(
      `\r   ✅ Batch complete: ${stats.checked} checked, ${stats.needsUpdate} need update, ${stats.updated} updated`
    );
  } catch (error) {
    console.error(`   ❌ Batch error:`, error);
    stats.errors += vectorIds.length;
  }

  return stats;
}

/**
 * Main migration function
 */
async function migrateExistingVectors() {
  console.log('🚀 Migrate Existing Pinecone Vectors with RBAC Metadata');
  console.log('='.repeat(80));
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Namespace: ${NAMESPACE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will update vectors)'}`);
  console.log('='.repeat(80));

  try {
    // Get index and namespace
    const index = pinecone.index(INDEX_NAME);
    const namespace = index.namespace(NAMESPACE);

    // Get index stats
    console.log('\n📊 Fetching index statistics...');
    const stats = await index.describeIndexStats();
    const namespaceStats = stats.namespaces?.[NAMESPACE];

    if (!namespaceStats) {
      console.log(`⚠️  Namespace '${NAMESPACE}' not found`);
      return;
    }

    console.log(`✅ Namespace contains ${namespaceStats.recordCount} vectors`);

    // List all vector IDs
    const vectorIds = await listAllVectorIds(namespace);

    if (vectorIds.length === 0) {
      console.log('⚠️  No vectors to process');
      return;
    }

    // Process in batches
    console.log(`\n🔄 Processing ${vectorIds.length} vectors in batches of ${BATCH_SIZE}...`);
    console.log('='.repeat(80));

    const totalBatches = Math.ceil(vectorIds.length / BATCH_SIZE);
    const totalStats = { checked: 0, needsUpdate: 0, updated: 0, errors: 0 };

    for (let i = 0; i < vectorIds.length; i += BATCH_SIZE) {
      const batchIds = vectorIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const batchStats = await processBatch(namespace, batchIds, batchNum, totalBatches);

      totalStats.checked += batchStats.checked;
      totalStats.needsUpdate += batchStats.needsUpdate;
      totalStats.updated += batchStats.updated;
      totalStats.errors += batchStats.errors;

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < vectorIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 Migration Complete!');
    console.log('='.repeat(80));
    console.log(`✅ Vectors checked: ${totalStats.checked}`);
    console.log(`📝 Vectors needing update: ${totalStats.needsUpdate}`);

    if (DRY_RUN) {
      console.log(`🔍 DRY RUN: ${totalStats.needsUpdate} vectors would be updated`);
      console.log('\nRun without --dry-run to apply changes:');
      console.log('  npx tsx scripts/migrate-existing-pinecone-vectors.ts');
    } else {
      console.log(`✅ Vectors updated: ${totalStats.updated}`);
      if (totalStats.errors > 0) {
        console.log(`❌ Errors: ${totalStats.errors}`);
      }
    }

    // Verify migration with sample
    if (!DRY_RUN && totalStats.updated > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 Verification: Checking sample vector...');

      const sampleId = vectorIds[0];
      const verifyResult = await namespace.fetch([sampleId]);
      const sampleMetadata = verifyResult.records[sampleId]?.metadata;

      console.log('\nSample vector ID:', sampleId);
      console.log('Sample metadata:');
      console.log(JSON.stringify(sampleMetadata, null, 2));

      if (hasRBACMetadata(sampleMetadata || {})) {
        console.log('\n✅ Verification successful - RBAC metadata present');
      } else {
        console.log('\n⚠️  Verification failed - RBAC metadata missing');
      }
    }

    console.log('\n='.repeat(80));
    console.log('✅ All done!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Run migration
 */
console.log('');
migrateExistingVectors()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
