const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCode() {
  const code = 'QKW-GYE-FVF-X3F';
  
  console.log('Checking code:', code);
  console.log('='.repeat(80));
  
  const { data, error } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } else if (data) {
    console.log('✅ Code found in database:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Code not found in database');
  }
  
  // Also check all codes to see what exists
  console.log('\n' + '='.repeat(80));
  console.log('All verification codes in database:');
  const { data: allCodes } = await supabase
    .from('verification_codes')
    .select('code, status, role, tier, current_uses, max_uses')
    .limit(10);
  
  console.log(JSON.stringify(allCodes, null, 2));
}

checkCode();
