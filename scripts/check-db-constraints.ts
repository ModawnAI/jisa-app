/**
 * Check Database Constraints Script
 * Query the actual database to see what constraints exist on verification_codes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('Checking verification_codes table constraints...\n');

  // Query PostgreSQL system catalogs for check constraints
  const { data, error } = await supabase.rpc('check_table_constraints', {
    p_table_name: 'verification_codes'
  });

  if (error) {
    console.error('RPC Error:', error);
    console.log('\nTrying direct query instead...\n');

    // Alternative: Try to insert with various code_type values to test constraint
    const testValues = [
      'registration',
      'invitation',
      'trial',
      'promotional',
      'employee_registration'
    ];

    for (const codeType of testValues) {
      const testCode = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const { error: insertError } = await supabase
        .from('verification_codes')
        .insert({
          code: testCode,
          code_type: codeType,
          tier: 'employee',
          role: 'employee',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          max_uses: 1,
          is_active: true,
          status: 'active'
        });

      if (insertError) {
        console.log(`❌ code_type='${codeType}': REJECTED`);
        console.log(`   Error: ${insertError.message}\n`);
      } else {
        console.log(`✅ code_type='${codeType}': ACCEPTED`);
        // Clean up test record
        await supabase.from('verification_codes').delete().eq('code', testCode);
      }
    }
  } else {
    console.log('Constraint info:', JSON.stringify(data, null, 2));
  }
}

checkConstraints().catch(console.error);
