/**
 * Fix Inconsistent Code State
 * Fixes codes that show status='used' but user_id is null
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

async function fixCode(code: string) {
  console.log('🔧 Fixing Inconsistent Code State\n');
  console.log('='.repeat(80));
  console.log(`Code: ${code}\n`);

  // Get code data
  const { data: codeData, error: codeError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !codeData) {
    console.log('❌ Code not found');
    return;
  }

  console.log('📋 Current State:');
  console.log(`   Status: ${codeData.status}`);
  console.log(`   Is Used: ${codeData.is_used}`);
  console.log(`   Current Uses: ${codeData.current_uses}`);
  console.log(`   Max Uses: ${codeData.max_uses}`);
  console.log(`   User ID: ${codeData.user_id || 'NULL'}`);

  // Check if inconsistent
  const isInconsistent =
    (codeData.status === 'used' || codeData.current_uses > 0) &&
    !codeData.user_id;

  if (!isInconsistent) {
    console.log('\n✅ Code state is consistent. No fix needed.');
    return;
  }

  console.log('\n⚠️  INCONSISTENT STATE DETECTED:');
  console.log('   Code marked as used but no user_id recorded');
  console.log('   This happens when code update failed during registration');

  console.log('\n🔧 Resetting code to unused state...');

  const { error: updateError } = await supabase
    .from('verification_codes')
    .update({
      status: 'active',
      is_used: false,
      current_uses: 0,
      user_id: null,
      used_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('code', code);

  if (updateError) {
    console.log(`❌ Reset failed: ${updateError.message}`);
    return;
  }

  console.log('✅ Code reset successfully');

  // Verify
  const { data: updatedCode } = await supabase
    .from('verification_codes')
    .select('status, is_used, current_uses, user_id')
    .eq('code', code)
    .single();

  console.log('\n📋 Updated State:');
  console.log(`   Status: ${updatedCode?.status}`);
  console.log(`   Is Used: ${updatedCode?.is_used}`);
  console.log(`   Current Uses: ${updatedCode?.current_uses}`);
  console.log(`   User ID: ${updatedCode?.user_id || 'NULL'}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Code is now ready to use!');
  console.log('\n📱 Employee can register in KakaoTalk:');
  console.log(`   1. Open KakaoTalk`);
  console.log(`   2. Search for "JISA" channel`);
  console.log(`   3. Enter: ${code}`);
  console.log(`   4. Start using "/" queries\n`);
}

const code = process.argv[2];

if (!code) {
  console.error('Usage: npx tsx scripts/fix-inconsistent-code.ts <CODE>');
  console.error('Example: npx tsx scripts/fix-inconsistent-code.ts EMP-00307-CEN');
  process.exit(1);
}

fixCode(code).catch(console.error);
