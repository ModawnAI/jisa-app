/**
 * Sync Existing Pinecone Vectors to Supabase Database
 *
 * This script creates database records for vectors that exist in Pinecone
 * but don't have corresponding records in the Supabase contexts table.
 *
 * Usage:
 *   npx tsx scripts/sync-pinecone-to-supabase.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Preview changes without applying them
 *
 * What it does:
 * 1. Fetches all vectors from Pinecone namespace
 * 2. Adds RBAC metadata to vectors in Pinecone (if missing)
 * 3. Creates corresponding context records in Supabase
 * 4. Links vectors to contexts via pinecone_id field
 *
 * This ensures:
 * - All vectors have RBAC metadata in Pinecone
 * - All vectors are tracked in the database
 * - Future migrations and queries work correctly
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuration
const INDEX_NAME = process.env.PINECONE_INDEX || 'hof-branch-chatbot';
const NAMESPACE = 'hof-knowledge-base-max';
const BATCH_SIZE = 50; // Process vectors in batches
const DRY_RUN = process.argv.includes('--dry-run');

// Initialize clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    access_level: defaultLevel,
    required_role: defaultRole,
    required_tier: defaultTier,
    access_roles: getRoleHierarchy(defaultRole),
    access_tiers: getTierHierarchy(defaultTier),
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

  console.log('📋 Listing all vector IDs from Pinecone...');

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

  console.log(`\n✅ Found ${vectorIds.length} total vectors in Pinecone`);
  return vectorIds;
}

/**
 * Check which vectors are missing from database
 */
async function findMissingContexts(vectorIds: string[]): Promise<string[]> {
  console.log('\n📋 Checking database for existing contexts...');

  try {
    // Check if table exists and has data
    const { count, error: countError } = await supabase
      .from('contexts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn('⚠️  Could not count contexts:', countError.message);
      console.log('📝 Assuming all vectors need to be added to database');
      return vectorIds;
    }

    console.log(`   Database has ${count || 0} total contexts`);

    // Batch check in chunks of 100 to avoid URL length limits
    const CHUNK_SIZE = 100;
    const existingIds = new Set<string>();

    for (let i = 0; i < vectorIds.length; i += CHUNK_SIZE) {
      const chunk = vectorIds.slice(i, i + CHUNK_SIZE);

      const { data: existingContexts, error } = await supabase
        .from('contexts')
        .select('pinecone_id')
        .in('pinecone_id', chunk);

      if (error) {
        console.error(`❌ Error fetching contexts batch ${i / CHUNK_SIZE + 1}:`, error.message);
        // Continue anyway, assuming these are missing
        continue;
      }

      existingContexts?.forEach(c => {
        if (c.pinecone_id) existingIds.add(c.pinecone_id);
      });

      process.stdout.write(`\r   Checked ${Math.min(i + CHUNK_SIZE, vectorIds.length)}/${vectorIds.length} vectors...`);
    }

    console.log(`\r   ✅ Found ${existingIds.size} existing contexts in database`);

    const missingIds = vectorIds.filter(id => !existingIds.has(id));
    console.log(`📝 Found ${missingIds.length} missing contexts`);

    return missingIds;
  } catch (error) {
    console.error('❌ Error checking database:', error);
    console.log('📝 Assuming all vectors need to be added to database');
    return vectorIds;
  }
}

/**
 * Process batch of vectors
 */
async function processBatch(
  namespace: any,
  vectorIds: string[],
  batchNum: number,
  totalBatches: number
): Promise<{
  processed: number;
  pineconeUpdated: number;
  dbCreated: number;
  errors: number;
}> {
  const stats = { processed: 0, pineconeUpdated: 0, dbCreated: 0, errors: 0 };

  console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${vectorIds.length} vectors)`);

  try {
    // Fetch vectors from Pinecone
    const fetchResult = await namespace.fetch(vectorIds);
    const vectors = fetchResult.records;

    if (!vectors) {
      console.log('   ⚠️  No vectors returned');
      return stats;
    }

    // Process each vector
    for (const [vectorId, vector] of Object.entries(vectors)) {
      stats.processed++;

      try {
        const vectorData = vector as any;
        const metadata = vectorData.metadata || {};
        const values = vectorData.values || [];

        // Step 1: Add RBAC metadata to Pinecone if missing
        if (!hasRBACMetadata(metadata)) {
          if (!DRY_RUN) {
            const rbacMetadata = createDefaultRBACMetadata();
            const mergedMetadata = { ...metadata, ...rbacMetadata };

            await namespace.update({
              id: vectorId,
              metadata: mergedMetadata,
            });

            stats.pineconeUpdated++;
            metadata.access_level = rbacMetadata.access_level;
            metadata.required_role = rbacMetadata.required_role;
            metadata.required_tier = rbacMetadata.required_tier;
            metadata.access_roles = rbacMetadata.access_roles;
            metadata.access_tiers = rbacMetadata.access_tiers;
          } else {
            stats.pineconeUpdated++;
          }
        }

        // Step 2: Create context record in Supabase
        if (!DRY_RUN) {
          const contextData = {
            pinecone_id: vectorId,
            title: metadata.title || metadata.chunk_type || 'Imported Context',
            content: metadata.content || metadata.text || '[Content not available]',
            content_embedding: values,
            embedding_model: metadata.embedding_model || 'text-embedding-3-large',

            // RBAC fields
            access_level: metadata.access_level || 'standard',
            required_role: metadata.required_role || 'user',
            required_tier: metadata.required_tier || 'basic',
            access_metadata: {
              ...(metadata.access_metadata || {}),
              imported_from_pinecone: true,
              original_metadata: {
                chunk_type: metadata.chunk_type,
                document_id: metadata.document_id,
              },
            },
          };

          const { error: insertError } = await supabase
            .from('contexts')
            .insert(contextData);

          if (insertError) {
            // Check if it's a duplicate error (context already exists)
            if (insertError.code === '23505') {
              // Duplicate key, skip
              console.log(`   ⏭️  Context ${vectorId} already exists, skipping`);
            } else {
              throw insertError;
            }
          } else {
            stats.dbCreated++;
          }
        } else {
          stats.dbCreated++;
        }

        // Progress indicator
        if (stats.processed % 5 === 0) {
          process.stdout.write(
            `\r   Progress: ${stats.processed}/${vectorIds.length} | Pinecone: ${stats.pineconeUpdated} | DB: ${stats.dbCreated}`
          );
        }
      } catch (error) {
        stats.errors++;
        console.error(
          `\n   ❌ Error processing ${vectorId}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `\r   ✅ Batch complete: ${stats.processed} processed, ${stats.pineconeUpdated} Pinecone updates, ${stats.dbCreated} DB inserts`
    );
  } catch (error) {
    console.error(`   ❌ Batch error:`, error);
    stats.errors += vectorIds.length;
  }

  return stats;
}

/**
 * Main sync function
 */
async function syncPineconeToSupabase() {
  console.log('🚀 Sync Pinecone Vectors to Supabase Database');
  console.log('='.repeat(80));
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Namespace: ${NAMESPACE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will update database)'}`);
  console.log('='.repeat(80));

  try {
    // Get Pinecone index and namespace
    const index = pinecone.index(INDEX_NAME);
    const namespace = index.namespace(NAMESPACE);

    // Get index stats
    console.log('\n📊 Fetching Pinecone statistics...');
    const stats = await index.describeIndexStats();
    const namespaceStats = stats.namespaces?.[NAMESPACE];

    if (!namespaceStats) {
      console.log(`⚠️  Namespace '${NAMESPACE}' not found`);
      return;
    }

    console.log(`✅ Namespace contains ${namespaceStats.recordCount} vectors`);

    // List all vector IDs
    const allVectorIds = await listAllVectorIds(namespace);

    if (allVectorIds.length === 0) {
      console.log('⚠️  No vectors to process');
      return;
    }

    // Find vectors missing from database
    const missingVectorIds = await findMissingContexts(allVectorIds);

    if (missingVectorIds.length === 0) {
      console.log('\n✅ All vectors are already in the database!');
      console.log('Checking for RBAC metadata in Pinecone...');

      // Still process all vectors to ensure RBAC metadata
      const vectorsToProcess = allVectorIds;

      console.log(`\n🔄 Processing ${vectorsToProcess.length} vectors for RBAC metadata...`);
      console.log('='.repeat(80));

      const totalBatches = Math.ceil(vectorsToProcess.length / BATCH_SIZE);
      const totalStats = { processed: 0, pineconeUpdated: 0, dbCreated: 0, errors: 0 };

      for (let i = 0; i < vectorsToProcess.length; i += BATCH_SIZE) {
        const batchIds = vectorsToProcess.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        const batchStats = await processBatch(namespace, batchIds, batchNum, totalBatches);

        totalStats.processed += batchStats.processed;
        totalStats.pineconeUpdated += batchStats.pineconeUpdated;
        totalStats.dbCreated += batchStats.dbCreated;
        totalStats.errors += batchStats.errors;

        // Small delay between batches
        if (i + BATCH_SIZE < vectorsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final summary
      console.log('\n' + '='.repeat(80));
      console.log('🎉 Sync Complete!');
      console.log('='.repeat(80));
      console.log(`✅ Vectors processed: ${totalStats.processed}`);
      console.log(`📝 Pinecone RBAC updates: ${totalStats.pineconeUpdated}`);
      console.log(`💾 Database records created: ${totalStats.dbCreated}`);

      if (totalStats.errors > 0) {
        console.log(`❌ Errors: ${totalStats.errors}`);
      }

      if (DRY_RUN) {
        console.log(`\n🔍 DRY RUN: ${totalStats.pineconeUpdated} Pinecone updates and ${totalStats.dbCreated} DB inserts would be made`);
        console.log('\nRun without --dry-run to apply changes:');
        console.log('  npx tsx scripts/sync-pinecone-to-supabase.ts');
      }

      return;
    }

    // Process missing vectors
    console.log(`\n🔄 Syncing ${missingVectorIds.length} missing vectors...`);
    console.log('='.repeat(80));

    const totalBatches = Math.ceil(missingVectorIds.length / BATCH_SIZE);
    const totalStats = { processed: 0, pineconeUpdated: 0, dbCreated: 0, errors: 0 };

    for (let i = 0; i < missingVectorIds.length; i += BATCH_SIZE) {
      const batchIds = missingVectorIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const batchStats = await processBatch(namespace, batchIds, batchNum, totalBatches);

      totalStats.processed += batchStats.processed;
      totalStats.pineconeUpdated += batchStats.pineconeUpdated;
      totalStats.dbCreated += batchStats.dbCreated;
      totalStats.errors += batchStats.errors;

      // Small delay between batches
      if (i + BATCH_SIZE < missingVectorIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 Sync Complete!');
    console.log('='.repeat(80));
    console.log(`✅ Vectors processed: ${totalStats.processed}`);
    console.log(`📝 Pinecone RBAC updates: ${totalStats.pineconeUpdated}`);
    console.log(`💾 Database records created: ${totalStats.dbCreated}`);

    if (totalStats.errors > 0) {
      console.log(`❌ Errors: ${totalStats.errors}`);
    }

    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN: ${totalStats.pineconeUpdated} Pinecone updates and ${totalStats.dbCreated} DB inserts would be made`);
      console.log('\nRun without --dry-run to apply changes:');
      console.log('  npx tsx scripts/sync-pinecone-to-supabase.ts');
    } else {
      console.log('\n✅ All vectors synced successfully!');
      console.log('   - Pinecone vectors have RBAC metadata');
      console.log('   - Database contexts created with pinecone_id links');
    }

    console.log('\n='.repeat(80));

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

/**
 * Run sync
 */
console.log('');
syncPineconeToSupabase()
  .then(() => {
    console.log('✅ All done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
