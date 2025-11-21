/**
 * Fix Employee Profile Namespace
 * Updates profiles that were created before the namespace fix
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

async function fixProfile(code: string) {
  console.log('🔧 Fixing Employee Profile Namespace\n');
  console.log('='.repeat(80));
  console.log(`Code: ${code}\n`);

  // Step 1: Get code data
  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !codeData) {
    console.log('❌ Code not found');
    return;
  }

  console.log('✅ Code found');
  console.log(`   Employee: ${codeData.intended_recipient_name} (${codeData.employee_sabon})`);
  console.log(`   Namespace: ${codeData.pinecone_namespace}`);
  console.log(`   Credential ID: ${codeData.intended_recipient_id}`);

  if (!codeData.user_id) {
    console.log('\n⏳ Code not used yet. Nothing to fix.');
    return;
  }

  const userId = codeData.user_id;
  console.log(`   User ID: ${userId}`);

  // Step 2: Get current profile state
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.log(`\n❌ Profile not found: ${profileError?.message}`);
    return;
  }

  console.log('\n📋 Current Profile State:');
  console.log(`   pinecone_namespace: ${profile.pinecone_namespace || '❌ NOT SET'}`);
  console.log(`   rag_enabled: ${profile.rag_enabled || '❌ NOT SET'}`);
  console.log(`   credential_id: ${profile.credential_id || '❌ NOT SET'}`);

  // Step 3: Check if fix needed
  const needsFix =
    profile.pinecone_namespace !== codeData.pinecone_namespace ||
    profile.rag_enabled !== true ||
    profile.credential_id !== codeData.intended_recipient_id;

  if (!needsFix) {
    console.log('\n✅ Profile already configured correctly. No fix needed.');
    return;
  }

  console.log('\n🔧 Applying fix...');

  // Step 4: Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      pinecone_namespace: codeData.pinecone_namespace,
      rag_enabled: true,
      credential_id: codeData.intended_recipient_id,
      metadata: {
        ...profile.metadata,
        employee_sabon: codeData.employee_sabon,
        namespace_fixed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.log(`\n❌ Update failed: ${updateError.message}`);
    return;
  }

  console.log('✅ Profile updated successfully');

  // Step 5: Verify fix
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('\n✅ Updated Profile State:');
  console.log(`   pinecone_namespace: ${updatedProfile?.pinecone_namespace}`);
  console.log(`   rag_enabled: ${updatedProfile?.rag_enabled}`);
  console.log(`   credential_id: ${updatedProfile?.credential_id}`);

  // Step 6: Test employee info lookup
  console.log('\n🧪 Testing Employee Info Lookup...');

  const { data: testData, error: testError } = await supabase
    .from('profiles')
    .select(`
      id,
      pinecone_namespace,
      rag_enabled,
      credential_id,
      user_credentials (
        employee_id,
        full_name,
        rag_vector_count
      )
    `)
    .eq('id', userId)
    .single();

  if (testError) {
    console.log(`   ❌ Lookup failed: ${testError.message}`);
    return;
  }

  const credential = testData.user_credentials as any;

  if (!credential || !credential.employee_id) {
    console.log('   ❌ Still failing: No credential found');
    return;
  }

  console.log('   ✅ Lookup successful!');
  console.log(`      Employee ID: ${credential.employee_id}`);
  console.log(`      Full Name: ${credential.full_name}`);
  console.log(`      Vector Count: ${credential.rag_vector_count}`);

  console.log('\n' + '='.repeat(80));
  console.log('🎉 FIX COMPLETE');
  console.log('='.repeat(80));
  console.log('\n✅ Employee can now use "/" queries:');
  console.log('   / 보험계약 건별 수수료 알려줘');
  console.log('   / 내 최종지급액 알려줘');
  console.log('   / 메리츠화재 계약 현황\n');
}

// Get code from command line
const code = process.argv[2];

if (!code) {
  console.error('Usage: npx tsx scripts/fix-employee-profile-namespace.ts <CODE>');
  console.error('Example: npx tsx scripts/fix-employee-profile-namespace.ts EMP-00124-673');
  process.exit(1);
}

fixProfile(code).catch(console.error);
