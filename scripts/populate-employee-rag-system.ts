/**
 * Employee RAG System Population Script
 *
 * Populates all 52 employees from MASTER_EMPLOYEE_RAG_REFERENCE.md into the database:
 * 1. Creates user_credentials records with Pinecone namespace mapping
 * 2. Generates unique verification codes for each employee
 * 3. Links codes to employees with RAG namespace info
 *
 * Run with: npx tsx scripts/populate-employee-rag-system.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Employee data from MASTER_EMPLOYEE_RAG_REFERENCE.md
const EMPLOYEES = [
  { sabon: 'J00124', name: '김기현', vectors: 51 },
  { sabon: 'J00127', name: '김진성', vectors: 34 },
  { sabon: 'J00128', name: '박현권', vectors: 78 },
  { sabon: 'J00131', name: '송기정', vectors: 67 },
  { sabon: 'J00132', name: '안유상', vectors: 57 },
  { sabon: 'J00133', name: '유신재', vectors: 53 },
  { sabon: 'J00134', name: '윤나래', vectors: 119 },
  { sabon: 'J00135', name: '윤나연', vectors: 76 },
  { sabon: 'J00137', name: '정다운', vectors: 5 },
  { sabon: 'J00139', name: '정혜림', vectors: 77 },
  { sabon: 'J00140', name: '조영훈', vectors: 22 },
  { sabon: 'J00142', name: '한현정', vectors: 45 },
  { sabon: 'J00143', name: '김민석', vectors: 18 },
  { sabon: 'J00189', name: '신원규', vectors: 21 },
  { sabon: 'J00209', name: '권유하', vectors: 8 },
  { sabon: 'J00215', name: '이원호', vectors: 7 },
  { sabon: 'J00217', name: '최현종', vectors: 5 },
  { sabon: 'J00251', name: '김명준', vectors: 26 },
  { sabon: 'J00292', name: '권준호', vectors: 6 },
  { sabon: 'J00295', name: '박세진', vectors: 45 },
  { sabon: 'J00304', name: '이용직', vectors: 6 },
  { sabon: 'J00307', name: '정다운', vectors: 9 },
  { sabon: 'J00311', name: '정호연', vectors: 77 },
  { sabon: 'J00336', name: '이로운', vectors: 77 },
  { sabon: 'J00361', name: '양재원', vectors: 15 },
  { sabon: 'J00366', name: '이성윤', vectors: 27 },
  { sabon: 'J00367', name: '이재훈', vectors: 12 },
  { sabon: 'J00372', name: '최정문', vectors: 5 },
  { sabon: 'J00376', name: '기재호', vectors: 32 },
  { sabon: 'J00380', name: '김남훈', vectors: 32 },
  { sabon: 'J00383', name: '김민지', vectors: 20 },
  { sabon: 'J00387', name: '김원', vectors: 5 },
  { sabon: 'J00394', name: '문지용', vectors: 8 },
  { sabon: 'J00396', name: '박성렬', vectors: 6 },
  { sabon: 'J00406', name: '손영준', vectors: 8 },
  { sabon: 'J00407', name: '송도연', vectors: 6 },
  { sabon: 'J00408', name: '송재현', vectors: 27 },
  { sabon: 'J00413', name: '이성수', vectors: 5 },
  { sabon: 'J00422', name: '임한별', vectors: 44 },
  { sabon: 'J00435', name: '황용식', vectors: 7 },
  { sabon: 'J00474', name: '조영은', vectors: 5 },
  { sabon: 'J00490', name: '엄도윤', vectors: 14 },
  { sabon: 'J00492', name: '유수현', vectors: 39 },
  { sabon: 'J00502', name: '최고운', vectors: 5 },
  { sabon: 'J00504', name: '손영훈', vectors: 10 },
  { sabon: 'J00597', name: '조효장', vectors: 30 },
  { sabon: 'J00607', name: '박지웅', vectors: 13 },
  { sabon: 'J00612', name: '장화평', vectors: 5 },
  { sabon: 'J00614', name: '홍원기', vectors: 5 },
  { sabon: 'J00616', name: '공한성', vectors: 13 },
  { sabon: 'J00720', name: '박정통', vectors: 37 },
  { sabon: 'J00750', name: '이하은', vectors: 6 },
];

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Generate unique verification code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-';
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return code;
}

/**
 * Check if code already exists
 */
async function codeExists(code: string): Promise<boolean> {
  const { data } = await supabase
    .from('verification_codes')
    .select('id')
    .eq('code', code)
    .single();

  return !!data;
}

/**
 * Generate unique code (check for duplicates)
 */
async function generateUniqueCode(): Promise<string> {
  let code = generateCode();
  let attempts = 0;

  while (await codeExists(code) && attempts < 10) {
    code = generateCode();
    attempts++;
  }

  if (attempts >= 10) {
    throw new Error('Failed to generate unique code after 10 attempts');
  }

  return code;
}

/**
 * Main population function
 */
async function populateEmployeeRagSystem() {
  console.log('🚀 Employee RAG System Population Script');
  console.log('=========================================\n');

  let credentialsCreated = 0;
  let credentialsUpdated = 0;
  let codesCreated = 0;
  const errors: string[] = [];

  console.log(`📋 Processing ${EMPLOYEES.length} employees...\n`);

  for (const employee of EMPLOYEES) {
    const { sabon, name, vectors } = employee;
    const namespace = `employee_${sabon}`;

    try {
      console.log(`\n🔹 Processing: ${name} (${sabon})`);

      // Step 1: Check if credential already exists
      const { data: existingCred } = await supabase
        .from('user_credentials')
        .select('id, employee_id, pinecone_namespace')
        .eq('employee_id', sabon)
        .single();

      let credentialId: string;

      if (existingCred) {
        console.log(`   ℹ️  Credential exists (ID: ${existingCred.id})`);
        credentialId = existingCred.id;

        // Update with namespace info if missing
        if (!existingCred.pinecone_namespace) {
          const { error: updateError } = await supabase
            .from('user_credentials')
            .update({
              pinecone_namespace: namespace,
              rag_enabled: true,
              rag_vector_count: vectors,
              rag_last_sync_at: new Date().toISOString(),
            })
            .eq('id', credentialId);

          if (updateError) {
            throw updateError;
          }

          console.log(`   ✅ Updated namespace: ${namespace}`);
          credentialsUpdated++;
        } else {
          console.log(`   ℹ️  Namespace already set: ${existingCred.pinecone_namespace}`);
        }
      } else {
        // Create new credential
        const { data: newCred, error: credError } = await supabase
          .from('user_credentials')
          .insert({
            full_name: name,
            employee_id: sabon,
            status: 'pending',
            pinecone_namespace: namespace,
            rag_enabled: true,
            rag_vector_count: vectors,
            rag_last_sync_at: new Date().toISOString(),
            metadata: {
              source: 'employee_rag_population',
              populated_at: new Date().toISOString(),
              vector_count: vectors,
            },
          })
          .select('id')
          .single();

        if (credError) {
          throw credError;
        }

        credentialId = newCred.id;
        console.log(`   ✅ Created credential (ID: ${credentialId})`);
        credentialsCreated++;
      }

      // Step 2: Check if code already exists for this employee
      const { data: existingCode } = await supabase
        .from('verification_codes')
        .select('code, status')
        .eq('employee_sabon', sabon)
        .eq('status', 'active')
        .single();

      if (existingCode) {
        console.log(`   ℹ️  Active code exists: ${existingCode.code}`);
      } else {
        // Generate new code
        const code = await generateUniqueCode();
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

        const { error: codeError } = await supabase
          .from('verification_codes')
          .insert({
            code,
            status: 'active',
            role: 'employee',
            tier: 'basic',
            code_type: '직원 RAG 접근',
            expires_at: expiresAt.toISOString(),
            max_uses: 1,
            current_uses: 0,
            is_used: false,
            is_active: true,
            requires_credential_match: true,
            credential_match_fields: ['employee_id'],
            intended_recipient_id: credentialId,
            intended_recipient_name: name,
            intended_recipient_employee_id: sabon,
            employee_sabon: sabon,
            pinecone_namespace: namespace,
            distribution_method: 'manual',
            distribution_status: 'pending',
            created_by: 'system',
            created_by_name: 'Employee RAG Automation',
            metadata: {
              source: 'employee_rag_population',
              generated_at: new Date().toISOString(),
              vector_count: vectors,
              namespace: namespace,
            },
            purpose: `${name} 님 급여정보 RAG 접근`,
            notes: `자동 생성된 코드 - 직원별 급여 정보 RAG 시스템 접근용`,
          });

        if (codeError) {
          throw codeError;
        }

        console.log(`   ✅ Generated code: ${code}`);
        codesCreated++;
      }

    } catch (error) {
      const errorMsg = `Failed to process ${name} (${sabon}): ${error instanceof Error ? error.message : String(error)}`;
      console.error(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  // Print summary
  console.log('\n\n=========================================');
  console.log('📊 Population Summary');
  console.log('=========================================');
  console.log(`Total Employees: ${EMPLOYEES.length}`);
  console.log(`Credentials Created: ${credentialsCreated}`);
  console.log(`Credentials Updated: ${credentialsUpdated}`);
  console.log(`Codes Generated: ${codesCreated}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err}`);
    });
  }

  // Verify final state
  console.log('\n=========================================');
  console.log('🔍 Verification');
  console.log('=========================================');

  const { data: credStats } = await supabase
    .from('user_credentials')
    .select('id')
    .not('employee_id', 'is', null)
    .not('pinecone_namespace', 'is', null);

  const { data: codeStats } = await supabase
    .from('verification_codes')
    .select('id')
    .not('employee_sabon', 'is', null)
    .eq('status', 'active');

  console.log(`✅ Credentials with namespace: ${credStats?.length || 0}`);
  console.log(`✅ Active employee codes: ${codeStats?.length || 0}`);

  console.log('\n=========================================');
  console.log('✨ Population Complete!');
  console.log('=========================================\n');
}

// Run the script
populateEmployeeRagSystem()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
