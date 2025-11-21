/**
 * Test Employee Profile Namespace Setup
 * Verify that employee profiles get proper namespace assignment
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

async function testNamespaceSetup() {
  console.log('🧪 Testing Employee Profile Namespace Setup\n');
  console.log('='.repeat(80));

  // Test code
  const testCode = 'EMP-00137-C7B';

  // Step 1: Get code data
  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', testCode)
    .single();

  if (codeError || !codeData) {
    console.log('❌ Code not found');
    return;
  }

  console.log('✅ Code found');
  console.log(`   Employee Sabon: ${codeData.employee_sabon}`);
  console.log(`   Pinecone Namespace (on code): ${codeData.pinecone_namespace}`);
  console.log(`   Intended Recipient ID: ${codeData.intended_recipient_id}`);

  // Step 2: Check if code has been used (has user_id)
  if (codeData.user_id) {
    console.log(`\n📋 Code has been used by user: ${codeData.user_id}`);

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        kakao_user_id,
        pinecone_namespace,
        rag_enabled,
        credential_id
      `)
      .eq('id', codeData.user_id)
      .single();

    if (profileError || !profile) {
      console.log(`   ❌ Profile not found: ${profileError?.message}`);
    } else {
      console.log(`\n✅ Profile found`);
      console.log(`   Full Name: ${profile.full_name}`);
      console.log(`   Kakao User ID: ${profile.kakao_user_id}`);
      console.log(`   Pinecone Namespace: ${profile.pinecone_namespace || '❌ NOT SET'}`);
      console.log(`   RAG Enabled: ${profile.rag_enabled || '❌ NOT SET'}`);
      console.log(`   Credential ID: ${profile.credential_id || '❌ NOT SET'}`);

      // Check if namespace matches
      if (profile.pinecone_namespace === codeData.pinecone_namespace) {
        console.log(`\n✅ Namespace matches! Employee can query their data.`);
      } else {
        console.log(`\n❌ NAMESPACE MISMATCH!`);
        console.log(`   Expected: ${codeData.pinecone_namespace}`);
        console.log(`   Got: ${profile.pinecone_namespace}`);
      }

      // Check credential link
      if (profile.credential_id) {
        const { data: credential, error: credError } = await supabase
          .from('user_credentials')
          .select('*')
          .eq('id', profile.credential_id)
          .single();

        if (credential) {
          console.log(`\n✅ Credential linked`);
          console.log(`   Employee ID: ${credential.employee_id}`);
          console.log(`   Full Name: ${credential.full_name}`);
          console.log(`   Namespace: ${credential.pinecone_namespace}`);
          console.log(`   RAG Enabled: ${credential.rag_enabled}`);
          console.log(`   Vector Count: ${credential.rag_vector_count}`);
        } else {
          console.log(`\n❌ Credential not found: ${credError?.message}`);
        }
      } else {
        console.log(`\n⚠️  No credential linked to profile`);
        console.log(`   This means profile.credential_id is null`);
        console.log(`   Need to link profile to credential for RAG to work`);
      }
    }
  } else {
    console.log(`\n⏳ Code has not been used yet`);
    console.log(`   Register with this code in KakaoTalk to test`);
  }

  // Step 3: Check the use-code route logic
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSIS\n');

  console.log('The code registration flow should:');
  console.log('1. ✅ Create auth user');
  console.log('2. ✅ Create/update profile with code info');
  console.log('3. ❓ Set profile.pinecone_namespace = code.pinecone_namespace');
  console.log('4. ❓ Set profile.rag_enabled = true');
  console.log('5. ❓ Link profile.credential_id to code.intended_recipient_id');

  console.log('\n📋 Checking code registration logic...');

  // Simulate what should happen
  console.log('\nWhen user registers with code:');
  console.log(`   Code namespace: ${codeData.pinecone_namespace}`);
  console.log(`   Credential ID: ${codeData.intended_recipient_id}`);
  console.log('\nProfile should have:');
  console.log(`   pinecone_namespace: ${codeData.pinecone_namespace}`);
  console.log(`   rag_enabled: true`);
  console.log(`   credential_id: ${codeData.intended_recipient_id}`);

  console.log('\n' + '='.repeat(80));
}

testNamespaceSetup().catch(console.error);
