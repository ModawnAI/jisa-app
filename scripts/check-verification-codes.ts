/**
 * Check Verification Codes in Database
 * Quick diagnostic script to verify codes exist and are configured correctly
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCodes() {
  console.log('🔍 Checking Verification Codes in Database\n');

  // Sample codes from the user's list
  const sampleCodes = [
    'EMP-00124-673',
    'EMP-00127-LP5',
    'EMP-00128-H4F',
  ];

  console.log('Sample codes to check:', sampleCodes.join(', '), '\n');

  for (const code of sampleCodes) {
    console.log(`\n📋 Checking code: ${code}`);
    console.log('─'.repeat(60));

    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);

      // Also check with uppercase
      const { data: data2, error: error2 } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error2) {
        console.log(`❌ Also not found in uppercase`);
      } else {
        console.log(`✅ Found with uppercase:`, data2);
      }
    } else {
      console.log('✅ Code found!');
      console.log('   ID:', data.id);
      console.log('   Employee Sabon:', data.employee_sabon);
      console.log('   Namespace:', data.pinecone_namespace);
      console.log('   Is Active:', data.is_active);
      console.log('   Is Used:', data.is_used);
      console.log('   Status:', data.status);
      console.log('   Code Type:', data.code_type);
      console.log('   Tier:', data.tier);
      console.log('   Role:', data.role);
      console.log('   Expires At:', data.expires_at);
      console.log('   Current Uses:', data.current_uses);
      console.log('   Max Uses:', data.max_uses);
    }
  }

  // Count total codes
  console.log('\n\n📊 Database Statistics');
  console.log('─'.repeat(60));

  const { count: totalCodes } = await supabase
    .from('verification_codes')
    .select('*', { count: 'exact', head: true });

  const { count: employeeCodes } = await supabase
    .from('verification_codes')
    .select('*', { count: 'exact', head: true })
    .not('employee_sabon', 'is', null);

  const { count: activeCodes } = await supabase
    .from('verification_codes')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_used', false);

  console.log('Total codes:', totalCodes);
  console.log('Employee codes:', employeeCodes);
  console.log('Active unused codes:', activeCodes);

  // List all employee codes
  console.log('\n\n📝 All Employee Codes');
  console.log('─'.repeat(60));

  const { data: allCodes, error: listError } = await supabase
    .from('verification_codes')
    .select('code, employee_sabon, is_active, is_used, status')
    .not('employee_sabon', 'is', null)
    .order('employee_sabon');

  if (listError) {
    console.log('❌ Error listing codes:', listError.message);
  } else {
    console.log(`Found ${allCodes?.length || 0} employee codes:\n`);
    allCodes?.forEach((code) => {
      const status = code.is_used ? '🔴 USED' : code.is_active ? '🟢 ACTIVE' : '🟡 INACTIVE';
      console.log(`${status} ${code.employee_sabon}: ${code.code}`);
    });
  }
}

checkCodes().catch(console.error);
