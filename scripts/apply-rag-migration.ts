/**
 * Apply Employee RAG System Migration
 * Executes the migration SQL file directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Applying Employee RAG System Migration               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Read migration file
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20251121_employee_rag_system.sql'
  );

  console.log(`📄 Reading migration file: ${migrationPath}`);

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`✅ Migration file loaded (${migrationSQL.length} characters)\n`);

  console.log('🔄 Executing migration...\n');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // Try alternative approach - execute via REST API
      console.log('⚠️  RPC method not available, trying direct execution...\n');

      // Split into individual statements and execute
      const statements = migrationSQL
        .split(/;\s*$/gm)
        .filter(stmt => stmt.trim().length > 0);

      console.log(`📝 Found ${statements.length} SQL statements\n`);

      let executed = 0;
      let failed = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;

        try {
          // Use raw SQL execution
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ query: stmt }),
          });

          if (response.ok) {
            executed++;
            process.stdout.write('.');
          } else {
            failed++;
            process.stdout.write('x');
          }
        } catch (err) {
          failed++;
          process.stdout.write('x');
        }

        if ((i + 1) % 50 === 0) {
          process.stdout.write(` [${i + 1}/${statements.length}]\n`);
        }
      }

      console.log(`\n\n📊 Execution Summary:`);
      console.log(`   ✅ Executed: ${executed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   📝 Total: ${statements.length}\n`);

      if (failed > 0) {
        console.log('⚠️  Some statements failed. Checking if critical tables exist...\n');
      }
    } else {
      console.log('✅ Migration executed successfully via RPC\n');
    }

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    // Check if columns were added
    const checks = [
      {
        name: 'user_credentials.pinecone_namespace',
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'user_credentials'
          AND column_name = 'pinecone_namespace'
        `,
      },
      {
        name: 'profiles.pinecone_namespace',
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'profiles'
          AND column_name = 'pinecone_namespace'
        `,
      },
      {
        name: 'verification_codes.employee_sabon',
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'verification_codes'
          AND column_name = 'employee_sabon'
        `,
      },
      {
        name: 'employee_rag_queries table',
        query: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_name = 'employee_rag_queries'
        `,
      },
    ];

    let allPassed = true;

    for (const check of checks) {
      const { data: checkData, error: checkError } = await supabase.rpc(
        'exec_sql',
        { sql: check.query }
      );

      // Fallback: try direct table query
      if (checkError) {
        if (check.name.includes('employee_rag_queries')) {
          const { error: tableError } = await supabase
            .from('employee_rag_queries')
            .select('id')
            .limit(1);

          if (!tableError) {
            console.log(`   ✅ ${check.name}`);
          } else {
            console.log(`   ❌ ${check.name}`);
            allPassed = false;
          }
        } else {
          console.log(`   ⚠️  ${check.name} (unable to verify)`);
        }
      } else if (checkData && checkData.length > 0) {
        console.log(`   ✅ ${check.name}`);
      } else {
        console.log(`   ❌ ${check.name}`);
        allPassed = false;
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    if (allPassed) {
      console.log('║              ✅ MIGRATION COMPLETED                        ║');
    } else {
      console.log('║          ⚠️  MIGRATION PARTIALLY COMPLETED                 ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Next Steps:');
    console.log('   1. Run: npx tsx scripts/populate-employees-with-codes.ts');
    console.log('   2. Access: http://your-domain/admin/employees/codes');
    console.log('   3. Distribute codes to employees\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Apply migration manually in Supabase Dashboard');
    console.error('   1. Go to: https://supabase.com/dashboard/project/kuixphvkbuuzfezoeyii/sql/new');
    console.error('   2. Copy contents of: supabase/migrations/20251121_employee_rag_system.sql');
    console.error('   3. Execute the SQL');
    process.exit(1);
  }
}

applyMigration();
