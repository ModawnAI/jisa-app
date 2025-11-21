/**
 * Diagnose Employee Lookup Error
 * Debug why getEmployeeInfo() is failing
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

async function diagnose(code: string) {
  console.log('🔍 Diagnosing Employee Lookup Error\n');
  console.log('='.repeat(80));
  console.log(`Code: ${code}\n`);

  // Step 1: Get code and see if it has been used
  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !codeData) {
    console.log('❌ Code not found');
    return;
  }

  console.log('CODE DATA:');
  console.log(`   Code: ${codeData.code}`);
  console.log(`   Employee Sabon: ${codeData.employee_sabon}`);
  console.log(`   Namespace: ${codeData.pinecone_namespace}`);
  console.log(`   Intended Recipient ID: ${codeData.intended_recipient_id}`);
  console.log(`   User ID (after use): ${codeData.user_id || 'NOT USED YET'}`);

  if (!codeData.user_id) {
    console.log('\n❌ Code has not been used yet. User needs to register first.');
    return;
  }

  const userId = codeData.user_id;
  console.log(`\n✅ Code has been used, user_id: ${userId}`);

  // Step 2: Check profile
  console.log('\n' + '─'.repeat(80));
  console.log('PROFILE DATA:');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.log(`❌ Profile not found: ${profileError?.message}`);
    return;
  }

  console.log(`   Profile ID: ${profile.id}`);
  console.log(`   Full Name: ${profile.full_name}`);
  console.log(`   Kakao User ID: ${profile.kakao_user_id}`);
  console.log(`   Pinecone Namespace: ${profile.pinecone_namespace || '❌ NULL'}`);
  console.log(`   RAG Enabled: ${profile.rag_enabled || '❌ FALSE/NULL'}`);
  console.log(`   Credential ID: ${profile.credential_id || '❌ NULL'}`);

  // Step 3: Try the EXACT query that getEmployeeInfo() uses
  console.log('\n' + '─'.repeat(80));
  console.log('TESTING getEmployeeInfo() QUERY:');
  console.log(`Simulating: getEmployeeInfo("${userId}")\n`);

  const { data: employeeData, error: employeeError } = await supabase
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

  if (employeeError) {
    console.log(`❌ Query failed: ${employeeError.message}`);
    console.log(`   Code: ${employeeError.code}`);
    console.log(`   Details: ${employeeError.details}`);
    return;
  }

  console.log('Query result:');
  console.log(JSON.stringify(employeeData, null, 2));

  // Step 4: Check what getEmployeeInfo() checks
  console.log('\n' + '─'.repeat(80));
  console.log('VALIDATION CHECKS (from getEmployeeInfo):');

  const credential = employeeData.user_credentials as any;

  console.log('\n1. Check if credential exists:');
  if (!credential) {
    console.log('   ❌ FAIL: No credential found');
    console.log('   Error message: "Employee information not found"');
    console.log(`\n   💡 DIAGNOSIS: profile.credential_id = ${profile.credential_id}`);
    console.log('      This is the issue! The profile has no credential linked.');
    return;
  } else {
    console.log('   ✅ PASS: Credential exists');
  }

  console.log('\n2. Check if credential has employee_id:');
  if (!credential.employee_id) {
    console.log('   ❌ FAIL: No employee_id in credential');
    console.log('   Error message: "No employee credential found for profile"');
    return;
  } else {
    console.log(`   ✅ PASS: employee_id = ${credential.employee_id}`);
  }

  console.log('\n3. Check if pinecone_namespace exists:');
  if (!employeeData.pinecone_namespace) {
    console.log('   ❌ FAIL: No pinecone_namespace');
    console.log('   Error message: "No Pinecone namespace configured for employee"');
    return;
  } else {
    console.log(`   ✅ PASS: namespace = ${employeeData.pinecone_namespace}`);
  }

  // Step 5: Root cause analysis
  console.log('\n' + '='.repeat(80));
  console.log('ROOT CAUSE ANALYSIS:');

  if (profile.credential_id === null) {
    console.log('\n❌ PROBLEM: profile.credential_id is NULL');
    console.log('\n📋 This happened because:');
    console.log('   The profile was created BEFORE the namespace fix was deployed');
    console.log('   OR the profile update failed during registration');
    console.log('\n💡 SOLUTION: Update the profile manually:');
    console.log(`\n   UPDATE profiles`);
    console.log(`   SET credential_id = '${codeData.intended_recipient_id}',`);
    console.log(`       pinecone_namespace = '${codeData.pinecone_namespace}',`);
    console.log(`       rag_enabled = true`);
    console.log(`   WHERE id = '${userId}';`);
  } else if (profile.credential_id !== codeData.intended_recipient_id) {
    console.log('\n⚠️  PROBLEM: credential_id mismatch');
    console.log(`   Profile credential_id: ${profile.credential_id}`);
    console.log(`   Code intended_recipient_id: ${codeData.intended_recipient_id}`);
  } else {
    console.log('\n✅ Profile configuration looks correct!');
  }

  console.log('\n' + '='.repeat(80));
}

const code = process.argv[2] || 'EMP-00124-673';
diagnose(code).catch(console.error);
