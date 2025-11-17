/**
 * Check database data
 * Simple script to verify what data exists in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('🔍 Checking database data...\n');

  // Check user_credentials
  const { data: credentials, error: credError, count: credCount } = await supabase
    .from('user_credentials')
    .select('*', { count: 'exact' });

  console.log('📋 user_credentials table:');
  console.log(`  Total records: ${credCount || 0}`);
  if (credentials && credentials.length > 0) {
    console.log(`  Sample record:`, credentials[0]);
  } else {
    console.log('  ⚠️  No records found');
  }
  if (credError) {
    console.log('  ❌ Error:', credError.message);
  }
  console.log('');

  // Check verification_codes
  const { data: codes, error: codeError, count: codeCount } = await supabase
    .from('verification_codes')
    .select('*', { count: 'exact' });

  console.log('🔑 verification_codes table:');
  console.log(`  Total records: ${codeCount || 0}`);
  if (codes && codes.length > 0) {
    console.log(`  Sample record:`, codes[0]);
  } else {
    console.log('  ⚠️  No records found');
  }
  if (codeError) {
    console.log('  ❌ Error:', codeError.message);
  }
  console.log('');

  // Check profiles
  const { data: profiles, error: profError, count: profCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  console.log('👤 profiles table:');
  console.log(`  Total records: ${profCount || 0}`);
  if (profiles && profiles.length > 0) {
    console.log(`  Sample record:`, profiles[0]);
  } else {
    console.log('  ⚠️  No records found');
  }
  if (profError) {
    console.log('  ❌ Error:', profError.message);
  }
  console.log('');

  // Check auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  console.log('🔐 auth.users:');
  console.log(`  Total users: ${authUsers?.users?.length || 0}`);
  if (authUsers?.users && authUsers.users.length > 0) {
    console.log(`  Sample user:`, {
      id: authUsers.users[0].id,
      email: authUsers.users[0].email,
      created_at: authUsers.users[0].created_at
    });
  } else {
    console.log('  ⚠️  No users found');
  }
  if (authError) {
    console.log('  ❌ Error:', authError.message);
  }
}

checkData()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
