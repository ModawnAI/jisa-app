/**
 * Test Specific Employee Code
 * Verify EMP-00137-C7B works end-to-end
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

async function testCode() {
  const testCode = 'EMP-00137-C7B';

  console.log('🧪 Testing Specific Employee Code\n');
  console.log('='.repeat(80));
  console.log(`Code: ${testCode}\n`);

  // Step 1: Test pattern matching (like KakaoTalk does)
  const codePattern = /([A-Z]{3,4}-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}(?:-[A-Z0-9]{3,5})?)/;
  const match = testCode.match(codePattern);

  console.log('STEP 1: Pattern Matching');
  console.log('─'.repeat(80));
  if (match) {
    console.log(`✅ Code pattern matches: ${match[1]}`);
  } else {
    console.log(`❌ Code pattern does NOT match`);
    return;
  }

  // Step 2: Check if code exists in database
  console.log('\nSTEP 2: Database Lookup');
  console.log('─'.repeat(80));

  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', testCode)
    .single();

  if (codeError || !codeData) {
    console.log(`❌ Code not found in database`);
    console.log(`   Error:`, codeError?.message);
    return;
  }

  console.log(`✅ Code found in database`);
  console.log(`   ID: ${codeData.id}`);
  console.log(`   Employee Sabon: ${codeData.employee_sabon}`);
  console.log(`   Namespace: ${codeData.pinecone_namespace}`);

  // Step 3: Validate code status
  console.log('\nSTEP 3: Code Validation');
  console.log('─'.repeat(80));

  let isValid = true;
  const validationErrors: string[] = [];

  // Check status
  if (codeData.status !== 'active') {
    isValid = false;
    validationErrors.push(`❌ Status is '${codeData.status}' (expected 'active')`);
  } else {
    console.log(`✅ Status: active`);
  }

  // Check if used
  if (codeData.is_used || codeData.current_uses >= codeData.max_uses) {
    isValid = false;
    validationErrors.push(`❌ Code already used (${codeData.current_uses}/${codeData.max_uses} uses)`);
  } else {
    console.log(`✅ Not used yet (${codeData.current_uses}/${codeData.max_uses} uses)`);
  }

  // Check expiration
  const now = new Date();
  const expiresAt = new Date(codeData.expires_at);
  if (now > expiresAt) {
    isValid = false;
    validationErrors.push(`❌ Code expired on ${expiresAt.toLocaleDateString('ko-KR')}`);
  } else {
    console.log(`✅ Not expired (valid until ${expiresAt.toLocaleDateString('ko-KR')})`);
  }

  // Check is_active flag
  if (!codeData.is_active) {
    isValid = false;
    validationErrors.push(`❌ is_active flag is false`);
  } else {
    console.log(`✅ is_active: true`);
  }

  // Step 4: Check linked credential
  console.log('\nSTEP 4: Linked Credential Check');
  console.log('─'.repeat(80));

  if (codeData.intended_recipient_id) {
    const { data: credential, error: credError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', codeData.intended_recipient_id)
      .single();

    if (credential) {
      console.log(`✅ Linked credential found`);
      console.log(`   Employee ID: ${credential.employee_id}`);
      console.log(`   Full Name: ${credential.full_name}`);
      console.log(`   Namespace: ${credential.pinecone_namespace}`);
      console.log(`   RAG Enabled: ${credential.rag_enabled}`);
      console.log(`   Vector Count: ${credential.rag_vector_count}`);
    } else {
      console.log(`⚠️  No credential found (error: ${credError?.message})`);
    }
  } else {
    console.log(`⚠️  No linked credential (intended_recipient_id is null)`);
  }

  // Final result
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULT');
  console.log('='.repeat(80));

  if (isValid) {
    console.log(`✅ Code ${testCode} is VALID and ready to use!`);
    console.log('\n📱 KakaoTalk Login Steps:');
    console.log('   1. Open KakaoTalk and search for "JISA"');
    console.log('   2. Add the JISA channel');
    console.log(`   3. Type: ${testCode}`);
    console.log('   4. Bot will verify and create your profile');
    console.log('   5. Start chatting!\n');
  } else {
    console.log(`❌ Code ${testCode} is INVALID:\n`);
    validationErrors.forEach(err => console.log(`   ${err}`));
  }
}

testCode().catch(console.error);
