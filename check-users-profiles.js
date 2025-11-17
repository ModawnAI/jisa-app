const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRelationship() {
  console.log('Checking profiles with kakao_user_id...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, kakao_user_id, full_name')
    .not('kakao_user_id', 'is', null)
    .limit(5);
  
  console.log('Profiles with KakaoTalk:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

checkRelationship();
