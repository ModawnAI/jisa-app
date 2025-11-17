const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Try to get the profiles table structure
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  console.log('Sample profile:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

checkSchema();
