/**
 * Check Profile by ID
 * Detailed inspection of a profile's configuration
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

async function checkProfile(profileId: string) {
  console.log('🔍 Checking Profile Configuration\n');
  console.log('='.repeat(80));
  console.log(`Profile ID: ${profileId}\n`);

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    console.log(`❌ Profile not found: ${profileError?.message}`);
    return;
  }

  console.log('📋 PROFILE DATA:');
  console.log(`   ID: ${profile.id}`);
  console.log(`   Email: ${profile.email || 'N/A'}`);
  console.log(`   Full Name: ${profile.full_name || 'N/A'}`);
  console.log(`   Kakao User ID: ${profile.kakao_user_id || 'N/A'}`);
  console.log(`   Kakao Nickname: ${profile.kakao_nickname || 'N/A'}`);
  console.log(`   Role: ${profile.role || 'N/A'}`);
  console.log(`   Tier: ${profile.subscription_tier || 'N/A'}`);

  console.log('\n🔧 RAG CONFIGURATION:');
  console.log(`   Pinecone Namespace: ${profile.pinecone_namespace || '❌ NOT SET'}`);
  console.log(`   RAG Enabled: ${profile.rag_enabled ? '✅ true' : '❌ false/null'}`);
  console.log(`   Credential ID: ${profile.credential_id || '❌ NOT SET'}`);

  console.log('\n📅 TIMESTAMPS:');
  console.log(`   Created: ${profile.created_at}`);
  console.log(`   Updated: ${profile.updated_at}`);
  console.log(`   First Chat: ${profile.first_chat_at || 'N/A'}`);
  console.log(`   Last Chat: ${profile.last_chat_at || 'N/A'}`);

  console.log('\n📝 METADATA:');
  console.log(JSON.stringify(profile.metadata, null, 2));

  // Check credential link
  if (profile.credential_id) {
    console.log('\n' + '─'.repeat(80));
    console.log('🔗 LINKED CREDENTIAL:');

    const { data: credential, error: credError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', profile.credential_id)
      .single();

    if (credError || !credential) {
      console.log(`   ❌ Credential not found: ${credError?.message}`);
    } else {
      console.log(`   Employee ID: ${credential.employee_id}`);
      console.log(`   Full Name: ${credential.full_name}`);
      console.log(`   Email: ${credential.email}`);
      console.log(`   Department: ${credential.department}`);
      console.log(`   Position: ${credential.position}`);
      console.log(`   Namespace: ${credential.pinecone_namespace}`);
      console.log(`   RAG Enabled: ${credential.rag_enabled}`);
      console.log(`   Vector Count: ${credential.rag_vector_count}`);
    }
  } else {
    console.log('\n⚠️  No credential linked (credential_id is null)');
  }

  // Check if can use Employee RAG
  console.log('\n' + '═'.repeat(80));
  console.log('EMPLOYEE RAG READINESS CHECK:');
  console.log('═'.repeat(80));

  const hasNamespace = !!profile.pinecone_namespace;
  const hasRagEnabled = profile.rag_enabled === true;
  const hasCredential = !!profile.credential_id;

  console.log(`\n1. Has Namespace: ${hasNamespace ? '✅' : '❌'}`);
  console.log(`2. RAG Enabled: ${hasRagEnabled ? '✅' : '❌'}`);
  console.log(`3. Credential Linked: ${hasCredential ? '✅' : '❌'}`);

  const canUseRAG = hasNamespace && hasRagEnabled && hasCredential;

  if (canUseRAG) {
    console.log(`\n✅ READY: Can use "/" queries for personal data`);
    console.log(`   Namespace: ${profile.pinecone_namespace}`);
  } else {
    console.log(`\n❌ NOT READY: Cannot use "/" queries yet`);
    console.log('\n💡 Missing:');
    if (!hasNamespace) console.log('   ❌ pinecone_namespace not set');
    if (!hasRagEnabled) console.log('   ❌ rag_enabled not true');
    if (!hasCredential) console.log('   ❌ credential_id not linked');
  }

  console.log('\n' + '═'.repeat(80));
}

const profileId = process.argv[2];

if (!profileId) {
  console.error('Usage: npx tsx scripts/check-profile-by-id.ts <PROFILE_ID>');
  console.error('Example: npx tsx scripts/check-profile-by-id.ts f29a5269-bfb3-4dd2-ac66-ddd27c81f336');
  process.exit(1);
}

checkProfile(profileId).catch(console.error);
