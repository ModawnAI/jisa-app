/**
 * Fix All Inconsistent Codes
 * Finds and fixes all codes with inconsistent state
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

async function fixAllInconsistentCodes() {
  console.log('🔍 Finding Inconsistent Verification Codes\n');
  console.log('='.repeat(80));

  // Find codes that are marked as used but have no user_id
  const { data: codes, error } = await supabase
    .from('verification_codes')
    .select('*')
    .or('status.eq.used,current_uses.gt.0')
    .is('user_id', null);

  if (error) {
    console.error('❌ Query failed:', error.message);
    return;
  }

  if (!codes || codes.length === 0) {
    console.log('✅ No inconsistent codes found. All codes are in valid state.\n');
    return;
  }

  console.log(`⚠️  Found ${codes.length} inconsistent codes:\n`);

  codes.forEach((code, idx) => {
    console.log(`${idx + 1}. ${code.code}`);
    console.log(`   Employee: ${code.intended_recipient_name} (${code.employee_sabon})`);
    console.log(`   Status: ${code.status}, Uses: ${code.current_uses}/${code.max_uses}, User ID: NULL`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔧 Fixing all inconsistent codes...\n');

  let fixed = 0;
  let failed = 0;

  for (const code of codes) {
    console.log(`Fixing ${code.code}...`);

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
      .eq('code', code.code);

    if (updateError) {
      console.log(`   ❌ Failed: ${updateError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Fixed`);
      fixed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary:');
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${codes.length}`);

  if (fixed > 0) {
    console.log('\n✅ All inconsistent codes have been reset!');
    console.log('   Employees can now register with these codes in KakaoTalk.\n');
  }
}

fixAllInconsistentCodes().catch(console.error);
