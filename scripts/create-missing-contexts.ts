/**
 * Create Missing Supabase Context Records
 *
 * This script creates database records for vectors that exist in Pinecone
 * but don't have corresponding records in the Supabase contexts table.
 *
 * Usage:
 *   npx tsx scripts/create-missing-contexts.ts [--dry-run]
 *
 * Since Pinecone already has RBAC metadata, this script just focuses on
 * creating the database records with pinecone_id links.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const INDEX_NAME = process.env.PINECONE_INDEX || 'hof-branch-chatbot';
const NAMESPACE = 'hof-knowledge-base-max';
const BATCH_SIZE = 50;
const DRY_RUN = process.argv.includes('--dry-run');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  console.log(`\n✅ Found ${vectorIds.length} total vectors`);
  return vectorIds;
}

async function createContextsBatch(
  namespace: any,
  vectorIds: string[],
  batchNum: number,
  totalBatches: number
): Promise<{ processed: number; created: number; errors: number; skipped: number }> {
  const stats = { processed: 0, created: 0, errors: 0, skipped: 0 };

  console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${vectorIds.length} vectors)`);

  try {
    const fetchResult = await namespace.fetch(vectorIds);
    const vectors = fetchResult.records;

    if (!vectors) {
      console.log('   ⚠️  No vectors returned');
      return stats;
    }

    for (const [vectorId, vector] of Object.entries(vectors)) {
      stats.processed++;

      try {
        const vectorData = vector as any;
        const metadata = vectorData.metadata || {};
        const values = vectorData.values || [];

        // Map access_level from Pinecone to valid DB values
        const dbAccessLevel = metadata.access_level === 'standard' ? 'public' : metadata.access_level || 'public';

        const contextData = {
          pinecone_id: vectorId,
          title: metadata.doc_title || metadata.title || metadata.label || 'Imported Context',
          content: metadata.content || `[Vector from ${metadata.source_uri || 'Pinecone'}]`,
          embedding_model: metadata.embedding_model || 'text-embedding-3-large',
          access_level: dbAccessLevel,
          required_role: metadata.required_role || null,
          required_tier: metadata.required_tier || null,
          access_metadata: {
            imported_from_pinecone: true,
            original_access_level: metadata.access_level, // Preserve original
            original_source: metadata.source_uri,
            category: metadata.category,
            doc_type: metadata.doc_type,
            platform: metadata.platform,
            url: metadata.url,
            version: metadata.version,
          },
        };

        if (!DRY_RUN) {
          const { error: insertError } = await supabase
            .from('contexts')
            .insert(contextData);

          if (insertError) {
            if (insertError.code === '23505') {
              // Duplicate key
              stats.skipped++;
            } else {
              throw insertError;
            }
          } else {
            stats.created++;
          }
        } else {
          stats.created++;
        }

        if (stats.processed % 5 === 0) {
          process.stdout.write(
            `\r   Progress: ${stats.processed}/${vectorIds.length} | Created: ${stats.created} | Skipped: ${stats.skipped}`
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
      `\r   ✅ Batch complete: ${stats.processed} processed, ${stats.created} created, ${stats.skipped} skipped`
    );
  } catch (error) {
    console.error(`   ❌ Batch error:`, error);
    stats.errors += vectorIds.length;
  }

  return stats;
}

async function createMissingContexts() {
  console.log('🚀 Create Missing Supabase Context Records');
  console.log('='.repeat(80));
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Namespace: ${NAMESPACE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will create records)'}`);
  console.log('='.repeat(80));

  try {
    const index = pinecone.index(INDEX_NAME);
    const namespace = index.namespace(NAMESPACE);

    console.log('\n📊 Fetching Pinecone statistics...');
    const stats = await index.describeIndexStats();
    const namespaceCount = stats.namespaces?.[NAMESPACE]?.recordCount || 0;

    console.log(`✅ Namespace contains ${namespaceCount} vectors`);

    const allVectorIds = await listAllVectorIds(namespace);

    if (allVectorIds.length === 0) {
      console.log('⚠️  No vectors to process');
      return;
    }

    console.log(`\n🔄 Creating database records for ${allVectorIds.length} vectors...`);
    console.log('='.repeat(80));

    const totalBatches = Math.ceil(allVectorIds.length / BATCH_SIZE);
    const totalStats = { processed: 0, created: 0, errors: 0, skipped: 0 };

    for (let i = 0; i < allVectorIds.length; i += BATCH_SIZE) {
      const batchIds = allVectorIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const batchStats = await createContextsBatch(namespace, batchIds, batchNum, totalBatches);

      totalStats.processed += batchStats.processed;
      totalStats.created += batchStats.created;
      totalStats.errors += batchStats.errors;
      totalStats.skipped += batchStats.skipped;

      if (i + BATCH_SIZE < allVectorIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Creation Complete!');
    console.log('='.repeat(80));
    console.log(`✅ Vectors processed: ${totalStats.processed}`);
    console.log(`💾 Database records created: ${totalStats.created}`);
    console.log(`⏭️  Records skipped (already exist): ${totalStats.skipped}`);

    if (totalStats.errors > 0) {
      console.log(`❌ Errors: ${totalStats.errors}`);
    }

    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN: ${totalStats.created} database records would be created`);
      console.log('\nRun without --dry-run to apply changes:');
      console.log('  npx tsx scripts/create-missing-contexts.ts');
    } else {
      console.log('\n✅ All database records created successfully!');
    }

    console.log('\n='.repeat(80));

  } catch (error) {
    console.error('\n❌ Creation failed:', error);
    process.exit(1);
  }
}

console.log('');
createMissingContexts()
  .then(() => {
    console.log('✅ All done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
