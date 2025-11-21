/**
 * Bulk Fix All Employee Profiles
 * Updates all 52 employee profiles with correct namespace configuration
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

// All 52 employee codes
const EMPLOYEE_CODES = [
  'EMP-00124-673',
  'EMP-00127-LP5',
  'EMP-00128-H4F',
  'EMP-00131-9UE',
  'EMP-00132-DAL',
  'EMP-00133-L7U',
  'EMP-00134-N7L',
  'EMP-00135-VP2',
  'EMP-00137-C7B',
  'EMP-00139-RVE',
  'EMP-00140-K7V',
  'EMP-00142-GCC',
  'EMP-00143-DMN',
  'EMP-00189-M9L',
  'EMP-00209-RTQ',
  'EMP-00215-TYX',
  'EMP-00217-LEZ',
  'EMP-00251-BVB',
  'EMP-00292-7JD',
  'EMP-00295-TJS',
  'EMP-00304-SXG',
  'EMP-00307-CEN',
  'EMP-00311-MDV',
  'EMP-00336-TRZ',
  'EMP-00361-R5W',
  'EMP-00366-TSQ',
  'EMP-00367-6LF',
  'EMP-00372-7D3',
  'EMP-00376-GF9',
  'EMP-00380-UUQ',
  'EMP-00383-UYD',
  'EMP-00387-8L5',
  'EMP-00394-T4L',
  'EMP-00396-GED',
  'EMP-00406-QEQ',
  'EMP-00407-CKQ',
  'EMP-00408-7Y6',
  'EMP-00413-RWF',
  'EMP-00422-NPZ',
  'EMP-00435-J4B',
  'EMP-00474-N4Z',
  'EMP-00490-PBD',
  'EMP-00492-JED',
  'EMP-00502-KG3',
  'EMP-00504-6U2',
  'EMP-00597-FNY',
  'EMP-00607-3MV',
  'EMP-00612-FWZ',
  'EMP-00614-B3Z',
  'EMP-00616-JLF',
  'EMP-00720-2YM',
  'EMP-00750-3EJ',
];

interface FixResult {
  code: string;
  employeeName: string;
  employeeSabon: string;
  status: 'not_used' | 'already_fixed' | 'fixed' | 'error';
  message: string;
}

async function fixAllEmployees() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Bulk Fix All Employee Profiles                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Processing ${EMPLOYEE_CODES.length} employee codes...\n`);

  const results: FixResult[] = [];

  for (let i = 0; i < EMPLOYEE_CODES.length; i++) {
    const code = EMPLOYEE_CODES[i];
    console.log(`\n[${ i + 1}/${EMPLOYEE_CODES.length}] Processing ${code}...`);
    console.log('─'.repeat(60));

    try {
      // Get code data
      const { data: codeData, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (codeError || !codeData) {
        console.log('   ❌ Code not found in database');
        results.push({
          code,
          employeeName: 'Unknown',
          employeeSabon: 'Unknown',
          status: 'error',
          message: 'Code not found',
        });
        continue;
      }

      const employeeName = codeData.intended_recipient_name || 'Unknown';
      const employeeSabon = codeData.employee_sabon || 'Unknown';

      console.log(`   Employee: ${employeeName} (${employeeSabon})`);
      console.log(`   Namespace: ${codeData.pinecone_namespace}`);

      // Check if code has been used
      if (!codeData.user_id) {
        console.log('   ⏳ Not registered yet - no fix needed');
        results.push({
          code,
          employeeName,
          employeeSabon,
          status: 'not_used',
          message: 'Code not used yet',
        });
        continue;
      }

      const userId = codeData.user_id;
      console.log(`   User ID: ${userId}`);

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.log(`   ❌ Profile not found: ${profileError?.message}`);
        results.push({
          code,
          employeeName,
          employeeSabon,
          status: 'error',
          message: `Profile not found: ${profileError?.message}`,
        });
        continue;
      }

      // Check if fix needed
      const needsFix =
        profile.pinecone_namespace !== codeData.pinecone_namespace ||
        profile.rag_enabled !== true ||
        profile.credential_id !== codeData.intended_recipient_id;

      if (!needsFix) {
        console.log('   ✅ Already configured correctly');
        results.push({
          code,
          employeeName,
          employeeSabon,
          status: 'already_fixed',
          message: 'Already configured',
        });
        continue;
      }

      console.log('   🔧 Applying fix...');
      console.log(`      Setting namespace: ${codeData.pinecone_namespace}`);
      console.log(`      Setting rag_enabled: true`);
      console.log(`      Linking credential: ${codeData.intended_recipient_id}`);

      // Apply fix
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pinecone_namespace: codeData.pinecone_namespace,
          rag_enabled: true,
          credential_id: codeData.intended_recipient_id,
          metadata: {
            ...profile.metadata,
            employee_sabon: codeData.employee_sabon,
            namespace_fixed_at: new Date().toISOString(),
            fixed_by: 'bulk-fix-script',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.log(`   ❌ Fix failed: ${updateError.message}`);
        results.push({
          code,
          employeeName,
          employeeSabon,
          status: 'error',
          message: `Update failed: ${updateError.message}`,
        });
        continue;
      }

      console.log('   ✅ Fixed successfully');
      results.push({
        code,
        employeeName,
        employeeSabon,
        status: 'fixed',
        message: 'Profile updated',
      });

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        code,
        employeeName: 'Unknown',
        employeeSabon: 'Unknown',
        status: 'error',
        message: error.message,
      });
    }
  }

  // Summary
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PROCESSING COMPLETE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const notUsed = results.filter(r => r.status === 'not_used').length;
  const alreadyFixed = results.filter(r => r.status === 'already_fixed').length;
  const fixed = results.filter(r => r.status === 'fixed').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log('📊 Summary:');
  console.log(`   ⏳ Not registered yet: ${notUsed}`);
  console.log(`   ✅ Already configured: ${alreadyFixed}`);
  console.log(`   🔧 Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📝 Total processed: ${results.length}`);

  // Details by status
  if (fixed > 0) {
    console.log('\n🔧 Fixed Employees:');
    results
      .filter(r => r.status === 'fixed')
      .forEach(r => {
        console.log(`   ✅ ${r.employeeSabon} ${r.employeeName} (${r.code})`);
      });
  }

  if (alreadyFixed > 0) {
    console.log('\n✅ Already Configured:');
    results
      .filter(r => r.status === 'already_fixed')
      .forEach(r => {
        console.log(`   ✅ ${r.employeeSabon} ${r.employeeName} (${r.code})`);
      });
  }

  if (notUsed > 0) {
    console.log('\n⏳ Not Registered Yet:');
    results
      .filter(r => r.status === 'not_used')
      .forEach(r => {
        console.log(`   ⏳ ${r.employeeSabon} ${r.employeeName} (${r.code})`);
      });
  }

  if (errors > 0) {
    console.log('\n❌ Errors:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`   ❌ ${r.employeeSabon} ${r.employeeName} (${r.code})`);
        console.log(`      ${r.message}`);
      });
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    VERIFICATION                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Verify all fixed profiles
  if (fixed > 0) {
    console.log('🧪 Verifying fixed profiles...\n');

    const fixedResults = results.filter(r => r.status === 'fixed');
    let verifySuccess = 0;
    let verifyFailed = 0;

    for (const result of fixedResults) {
      const { data: codeData } = await supabase
        .from('verification_codes')
        .select('user_id')
        .eq('code', result.code)
        .single();

      if (!codeData?.user_id) continue;

      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select(`
          id,
          pinecone_namespace,
          rag_enabled,
          credential_id,
          user_credentials (
            employee_id,
            full_name
          )
        `)
        .eq('id', codeData.user_id)
        .single();

      const credential = testData?.user_credentials as any;

      if (testError || !credential || !credential.employee_id) {
        console.log(`   ❌ ${result.employeeSabon} - Verification failed`);
        verifyFailed++;
      } else {
        console.log(`   ✅ ${result.employeeSabon} - Verified`);
        verifySuccess++;
      }
    }

    console.log(`\n✅ Verification: ${verifySuccess} passed, ${verifyFailed} failed`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL DONE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (fixed > 0) {
    console.log('🎉 Fixed employees can now use "/" queries:');
    console.log('   / 보험계약 건별 수수료 알려줘');
    console.log('   / 내 최종지급액 알려줘');
    console.log('   / 메리츠화재 계약 현황\n');
  }

  if (notUsed > 0) {
    console.log(`⏳ ${notUsed} employees haven't registered yet.`);
    console.log('   When they register, they will be automatically configured.\n');
  }
}

fixAllEmployees().catch(console.error);
