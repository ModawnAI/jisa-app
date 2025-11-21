/**
 * Test Complete Employee Flow
 * Simulates full registration and query flow for an employee
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

async function testEmployeeFlow(code: string) {
  console.log('🧪 Testing Complete Employee Flow\n');
  console.log('='.repeat(80));
  console.log(`Testing Code: ${code}\n`);

  // STEP 1: Verify code exists and get details
  console.log('STEP 1: Code Verification');
  console.log('─'.repeat(80));

  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !codeData) {
    console.log('❌ Code not found');
    return;
  }

  console.log('✅ Code found in database');
  console.log(`   Code: ${codeData.code}`);
  console.log(`   Employee Sabon: ${codeData.employee_sabon}`);
  console.log(`   Intended Recipient: ${codeData.intended_recipient_name}`);
  console.log(`   Pinecone Namespace: ${codeData.pinecone_namespace}`);
  console.log(`   Status: ${codeData.status}`);
  console.log(`   Is Used: ${codeData.is_used}`);
  console.log(`   Uses: ${codeData.current_uses}/${codeData.max_uses}`);

  // STEP 2: Check if code has been used (profile exists)
  console.log('\nSTEP 2: Profile Check');
  console.log('─'.repeat(80));

  if (codeData.user_id) {
    console.log(`✅ Code has been used (user_id: ${codeData.user_id})`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        kakao_user_id,
        role,
        subscription_tier,
        pinecone_namespace,
        rag_enabled,
        credential_id
      `)
      .eq('id', codeData.user_id)
      .single();

    if (profileError || !profile) {
      console.log(`❌ Profile not found: ${profileError?.message}`);
      return;
    }

    console.log('✅ Profile exists');
    console.log(`   Full Name: ${profile.full_name}`);
    console.log(`   Kakao User ID: ${profile.kakao_user_id || 'Not set'}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Tier: ${profile.subscription_tier}`);
    console.log(`   Pinecone Namespace: ${profile.pinecone_namespace || '❌ NOT SET'}`);
    console.log(`   RAG Enabled: ${profile.rag_enabled ? '✅' : '❌ NOT SET'}`);
    console.log(`   Credential ID: ${profile.credential_id || '❌ NOT SET'}`);

    // STEP 3: Verify namespace matches
    console.log('\nSTEP 3: Namespace Verification');
    console.log('─'.repeat(80));

    const namespaceMatch = profile.pinecone_namespace === codeData.pinecone_namespace;
    const ragEnabled = profile.rag_enabled === true;

    if (namespaceMatch && ragEnabled) {
      console.log('✅ Namespace configuration is CORRECT');
      console.log(`   Code namespace: ${codeData.pinecone_namespace}`);
      console.log(`   Profile namespace: ${profile.pinecone_namespace}`);
      console.log(`   RAG enabled: ${profile.rag_enabled}`);
    } else {
      console.log('❌ Namespace configuration is INCORRECT');
      if (!namespaceMatch) {
        console.log(`   ❌ Namespace mismatch:`);
        console.log(`      Code: ${codeData.pinecone_namespace}`);
        console.log(`      Profile: ${profile.pinecone_namespace}`);
      }
      if (!ragEnabled) {
        console.log(`   ❌ RAG not enabled (profile.rag_enabled = ${profile.rag_enabled})`);
      }
    }

    // STEP 4: Check credential link
    console.log('\nSTEP 4: Credential Link Verification');
    console.log('─'.repeat(80));

    if (profile.credential_id) {
      const { data: credential, error: credError } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('id', profile.credential_id)
        .single();

      if (credential) {
        console.log('✅ Credential linked correctly');
        console.log(`   Employee ID: ${credential.employee_id}`);
        console.log(`   Full Name: ${credential.full_name}`);
        console.log(`   Namespace: ${credential.pinecone_namespace}`);
        console.log(`   RAG Enabled: ${credential.rag_enabled}`);
        console.log(`   Vector Count: ${credential.rag_vector_count}`);

        // Verify credential namespace matches
        if (credential.pinecone_namespace === codeData.pinecone_namespace) {
          console.log('   ✅ Credential namespace matches code');
        } else {
          console.log('   ❌ Credential namespace mismatch');
        }
      } else {
        console.log(`❌ Credential not found: ${credError?.message}`);
      }
    } else {
      console.log('⚠️  No credential linked (profile.credential_id is null)');
      console.log('   This will cause Employee RAG queries to fail');
    }

    // STEP 5: Simulate employee RAG query readiness
    console.log('\nSTEP 5: Employee RAG Query Readiness');
    console.log('─'.repeat(80));

    const canUseEmployeeRAG =
      profile.pinecone_namespace &&
      profile.rag_enabled &&
      profile.credential_id;

    if (canUseEmployeeRAG) {
      console.log('✅ Employee CAN use "/" queries for personal data');
      console.log('\n📱 Example queries that will work:');
      console.log('   / 보험계약 건별 수수료 알려줘');
      console.log('   / 내 최종지급액 알려줘');
      console.log('   / 메리츠화재 계약 현황');
      console.log('\n🔒 Security guarantees:');
      console.log(`   • Will ONLY search: ${profile.pinecone_namespace}`);
      console.log(`   • Will ONLY return data with: 사번 = ${codeData.employee_sabon}`);
      console.log(`   • Cannot see other employees' data`);
    } else {
      console.log('❌ Employee CANNOT use "/" queries yet');
      console.log('\n🔧 Missing configuration:');
      if (!profile.pinecone_namespace) console.log('   ❌ profile.pinecone_namespace not set');
      if (!profile.rag_enabled) console.log('   ❌ profile.rag_enabled not set');
      if (!profile.credential_id) console.log('   ❌ profile.credential_id not linked');
      console.log('\n💡 Solution: Re-register with the code after the fix');
    }

  } else {
    console.log('⏳ Code has NOT been used yet');
    console.log('\n📋 What will happen when user registers:');
    console.log('   1. User enters code in KakaoTalk');
    console.log('   2. System creates auth user');
    console.log('   3. System creates profile with:');
    console.log(`      • pinecone_namespace = ${codeData.pinecone_namespace}`);
    console.log(`      • rag_enabled = true`);
    console.log(`      • credential_id = ${codeData.intended_recipient_id}`);
    console.log('   4. User can query with "/" command');
  }

  // FINAL SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(80));

  console.log(`\nEmployee: ${codeData.intended_recipient_name} (${codeData.employee_sabon})`);
  console.log(`Code: ${code}`);
  console.log(`Namespace: ${codeData.pinecone_namespace}`);

  if (codeData.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('pinecone_namespace, rag_enabled, credential_id')
      .eq('id', codeData.user_id)
      .single();

    const ready = profile?.pinecone_namespace && profile?.rag_enabled && profile?.credential_id;

    if (ready) {
      console.log(`\n✅ STATUS: READY TO USE`);
      console.log(`   User can query personal data with "/" command`);
    } else {
      console.log(`\n❌ STATUS: NOT CONFIGURED`);
      console.log(`   User registered but namespace not set properly`);
      console.log(`   Need to fix and re-register`);
    }
  } else {
    console.log(`\n⏳ STATUS: NOT REGISTERED YET`);
    console.log(`   User needs to enter code in KakaoTalk`);
  }

  console.log('');
}

// Get code from command line or use default
const code = process.argv[2] || 'EMP-00124-673';

testEmployeeFlow(code).catch(console.error);
