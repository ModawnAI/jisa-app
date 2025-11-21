/**
 * Delete User by ID
 * Removes user from auth and profiles tables
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

async function deleteUser(userId: string) {
  console.log('🗑️  Deleting User\n');
  console.log('='.repeat(80));
  console.log(`User ID: ${userId}\n`);

  // Step 1: Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.log(`❌ Error fetching profile: ${profileError.message}`);
    return;
  }

  if (!profile) {
    console.log('⚠️  Profile not found');
  } else {
    console.log('📋 Profile Information:');
    console.log(`   Full Name: ${profile.full_name || 'N/A'}`);
    console.log(`   Email: ${profile.email || 'N/A'}`);
    console.log(`   Kakao User ID: ${profile.kakao_user_id || 'N/A'}`);
    console.log(`   Role: ${profile.role || 'N/A'}`);
    console.log(`   Namespace: ${profile.pinecone_namespace || 'N/A'}`);
    console.log(`   Created: ${profile.created_at}`);
  }

  // Step 2: Check for verification code usage
  const { data: codes } = await supabase
    .from('verification_codes')
    .select('code, employee_sabon')
    .eq('user_id', userId);

  if (codes && codes.length > 0) {
    console.log('\n📝 Associated Verification Codes:');
    codes.forEach(code => {
      console.log(`   Code: ${code.code} (${code.employee_sabon || 'N/A'})`);
    });
  }

  // Step 3: Delete auth user (will cascade to profile via trigger)
  console.log('\n🗑️  Deleting auth user...');

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    console.log(`❌ Failed to delete auth user: ${authDeleteError.message}`);

    // Try direct profile deletion as fallback
    console.log('\n🔄 Attempting direct profile deletion...');
    const { error: directDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (directDeleteError) {
      console.log(`❌ Failed to delete profile: ${directDeleteError.message}`);
      return;
    }

    console.log('✅ Profile deleted directly');
  } else {
    console.log('✅ Auth user deleted');
  }

  // Step 4: Clean up verification codes (reset them)
  if (codes && codes.length > 0) {
    console.log('\n🔄 Resetting verification codes...');

    const { error: resetError } = await supabase
      .from('verification_codes')
      .update({
        user_id: null,
        is_used: false,
        status: 'active',
        current_uses: 0,
        used_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (resetError) {
      console.log(`⚠️  Failed to reset codes: ${resetError.message}`);
    } else {
      console.log(`✅ Reset ${codes.length} verification code(s)`);
    }
  }

  // Step 5: Verify deletion
  console.log('\n✅ Verifying deletion...');

  const { data: checkProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (checkProfile) {
    console.log('⚠️  Profile still exists in database');
  } else {
    console.log('✅ Profile successfully deleted');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ User deletion complete\n');
}

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: npx tsx scripts/delete-user-by-id.ts <USER_ID>');
  console.error('Example: npx tsx scripts/delete-user-by-id.ts 163f05b4-854e-4d6f-9ff0-df1b0b605aca');
  process.exit(1);
}

deleteUser(userId).catch(console.error);
