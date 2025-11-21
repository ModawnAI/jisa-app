/**
 * Populate Employees with Special Codes Script
 *
 * Purpose:
 * - Create user_credentials entries for all 52 employees from Master.md
 * - Generate unique verification codes for each employee
 * - Link codes to employee's Pinecone namespace (employee_J00124, etc.)
 * - Enable RAG access for all employees
 *
 * Usage:
 *   npx tsx scripts/populate-employees-with-codes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Employee data from Master.md
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

// Generate random code in format: EMP-XXX-XXX-XXX
function generateEmployeeCode(sabon: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = `EMP-${sabon.substring(1)}`; // EMP-00124, EMP-00127, etc.

  // Add random suffix for uniqueness
  code += '-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Employee Population & Code Generation Script            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Total employees to process: ${EMPLOYEES.length}\n`);

  const results = {
    credentialsCreated: 0,
    credentialsUpdated: 0,
    credentialsSkipped: 0,
    codesGenerated: 0,
    errors: [] as string[],
  };

  const generatedCodes: Array<{
    sabon: string;
    name: string;
    code: string;
    namespace: string;
    vectors: number;
  }> = [];

  // Process each employee
  for (let i = 0; i < EMPLOYEES.length; i++) {
    const employee = EMPLOYEES[i];
    const { sabon, name, vectors } = employee;

    console.log(`\n[${i + 1}/${EMPLOYEES.length}] Processing ${name} (${sabon})...`);

    try {
      const namespace = `employee_${sabon}`;

      // Step 1: Check if credential already exists
      const { data: existingCredential } = await supabase
        .from('user_credentials')
        .select('id, pinecone_namespace, rag_enabled')
        .eq('employee_id', sabon)
        .single();

      let credentialId: string;

      if (existingCredential) {
        console.log(`   ℹ️  Credential exists (ID: ${existingCredential.id})`);

        // Update existing credential
        const { error: updateError } = await supabase
          .from('user_credentials')
          .update({
            pinecone_namespace: namespace,
            rag_enabled: true,
            rag_vector_count: vectors,
            rag_last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCredential.id);

        if (updateError) {
          throw new Error(`Failed to update credential: ${updateError.message}`);
        }

        credentialId = existingCredential.id;
        results.credentialsUpdated++;
        console.log(`   ✅ Updated credential with namespace: ${namespace}`);
      } else {
        // Create new credential
        const { data: newCredential, error: insertError } = await supabase
          .from('user_credentials')
          .insert({
            employee_id: sabon,
            full_name: name,
            email: `${sabon.toLowerCase()}@company.com`, // Placeholder email
            department: '영업부',
            position: '보험설계사',
            pinecone_namespace: namespace,
            rag_enabled: true,
            rag_vector_count: vectors,
            rag_last_sync_at: new Date().toISOString(),
            status: 'active',
            metadata: {
              source: 'employee_population_script',
              created_at: new Date().toISOString(),
            },
          })
          .select('id')
          .single();

        if (insertError) {
          throw new Error(`Failed to create credential: ${insertError.message}`);
        }

        credentialId = newCredential.id;
        results.credentialsCreated++;
        console.log(`   ✅ Created new credential (ID: ${credentialId})`);
      }

      // Step 2: Check if code already exists
      const { data: existingCode } = await supabase
        .from('verification_codes')
        .select('code')
        .eq('employee_sabon', sabon)
        .single();

      if (existingCode) {
        console.log(`   ℹ️  Code already exists: ${existingCode.code}`);
        results.credentialsSkipped++;

        generatedCodes.push({
          sabon,
          name,
          code: existingCode.code,
          namespace,
          vectors,
        });

        continue;
      }

      // Step 3: Generate unique code
      let code = generateEmployeeCode(sabon);

      // Ensure code is unique
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const { data: codeCheck } = await supabase
          .from('verification_codes')
          .select('code')
          .eq('code', code)
          .single();

        if (!codeCheck) {
          isUnique = true;
        } else {
          code = generateEmployeeCode(sabon);
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique code after 10 attempts');
      }

      // Step 4: Create verification code
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

      const { error: codeError } = await supabase
        .from('verification_codes')
        .insert({
          code,
          code_type: 'employee_registration',
          tier: 'employee',
          role: 'employee',
          expires_at: expiresAt.toISOString(),
          max_uses: 1,
          current_uses: 0,
          is_used: false,
          is_active: true,
          status: 'active',
          intended_recipient_name: name,
          intended_recipient_email: `${sabon.toLowerCase()}@company.com`,
          intended_recipient_id: credentialId,
          requires_credential_match: true,
          employee_sabon: sabon,
          pinecone_namespace: namespace,
          metadata: {
            source: 'employee_population_script',
            generated_at: new Date().toISOString(),
            rag_enabled: true,
            vector_count: vectors,
          },
        });

      if (codeError) {
        throw new Error(`Failed to create code: ${codeError.message}`);
      }

      results.codesGenerated++;
      console.log(`   ✅ Generated code: ${code}`);

      generatedCodes.push({
        sabon,
        name,
        code,
        namespace,
        vectors,
      });

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.errors.push(`${sabon} (${name}): ${error.message}`);
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PROCESSING COMPLETE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Summary:');
  console.log(`   ✅ Credentials created: ${results.credentialsCreated}`);
  console.log(`   🔄 Credentials updated: ${results.credentialsUpdated}`);
  console.log(`   ⏭️  Credentials skipped: ${results.credentialsSkipped}`);
  console.log(`   🔑 Codes generated: ${results.codesGenerated}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    results.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err}`);
    });
  }

  // Save codes to file
  const outputPath = path.join(process.cwd(), 'employee-codes.json');
  fs.writeFileSync(outputPath, JSON.stringify(generatedCodes, null, 2));
  console.log(`\n💾 Codes saved to: ${outputPath}`);

  // Display codes for distribution
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              EMPLOYEE CODES FOR DISTRIBUTION               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Format: 사번 | 이름 | 코드 | 네임스페이스 | 벡터수\n');

  generatedCodes.forEach((emp) => {
    console.log(
      `${emp.sabon} | ${emp.name.padEnd(6)} | ${emp.code} | ${emp.namespace} | ${emp.vectors}`
    );
  });

  console.log('\n✅ All employees processed successfully!');
  console.log('🔑 Distribute these codes to employees for registration.\n');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
