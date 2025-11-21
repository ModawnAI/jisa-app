/**
 * Reset Employee Code
 * Reset a specific code so it can be used again for testing
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

async function resetCode(code: string) {
  console.log('🔄 Resetting Employee Code\n');
  console.log('='.repeat(80));
  console.log(`Code: ${code}\n`);

  // Step 1: Check if code exists
  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !codeData) {
    console.log(`❌ Code not found in database`);
    return;
  }

  console.log('✅ Code found');
  console.log(`   Employee: ${codeData.employee_sabon}`);
  console.log(`   Current status: ${codeData.status}`);
  console.log(`   Is used: ${codeData.is_used}`);
  console.log(`   Uses: ${codeData.current_uses}/${codeData.max_uses}`);

  // Step 2: Delete associated profile if exists
  if (codeData.user_id) {
    console.log(`\n🗑️  Deleting associated profile (user_id: ${codeData.user_id})...`);

    // Delete from profiles
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', codeData.user_id);

    if (profileDeleteError) {
      console.log(`   ⚠️  Failed to delete profile: ${profileDeleteError.message}`);
    } else {
      console.log(`   ✅ Profile deleted`);
    }

    // Delete auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(codeData.user_id);

    if (authDeleteError) {
      console.log(`   ⚠️  Failed to delete auth user: ${authDeleteError.message}`);
    } else {
      console.log(`   ✅ Auth user deleted`);
    }
  }

  // Step 3: Reset the code
  console.log(`\n🔄 Resetting verification code...`);

  const { error: resetError } = await supabase
    .from('verification_codes')
    .update({
      is_used: false,
      is_active: true,
      status: 'active',
      current_uses: 0,
      user_id: null,
      used_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('code', code);

  if (resetError) {
    console.log(`❌ Failed to reset code: ${resetError.message}`);
    return;
  }

  console.log(`✅ Code reset successfully!`);

  // Verify reset
  const { data: verifyData } = await supabase
    .from('verification_codes')
    .select('status, is_used, current_uses, is_active')
    .eq('code', code)
    .single();

  console.log(`\n📊 Current state:`);
  console.log(`   Status: ${verifyData?.status}`);
  console.log(`   Is active: ${verifyData?.is_active}`);
  console.log(`   Is used: ${verifyData?.is_used}`);
  console.log(`   Uses: ${verifyData?.current_uses}/${codeData.max_uses}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Code is ready to use in KakaoTalk!');
  console.log('\n📱 Test Steps:');
  console.log('   1. Open KakaoTalk');
  console.log('   2. Find JISA channel');
  console.log(`   3. Type: ${code}`);
  console.log('   4. Verify registration works\n');
}

// Get code from command line argument
const code = process.argv[2];

if (!code) {
  console.error('Usage: npx tsx scripts/reset-employee-code.ts <CODE>');
  console.error('Example: npx tsx scripts/reset-employee-code.ts EMP-00137-C7B');
  process.exit(1);
}

resetCode(code).catch(console.error);
