#!/usr/bin/env node
/**
 * Test Dynamic Commission Calculation System
 */

import { NaturalLanguageCommissionSystem } from '../src/nl_query_system_dynamic.js';

async function main() {
  console.log('='.repeat(80));
  console.log(' 🧪 TESTING DYNAMIC COMMISSION SYSTEM');
  console.log('='.repeat(80));

  const system = new NaturalLanguageCommissionSystem();

  const tests = [
    {
      name: 'Base Percentage (60%)',
      query: '약속플러스 60%',
      expected_multiplier: 1.0
    },
    {
      name: 'Low Percentage (55%)',
      query: '약속플러스 55%',
      expected_multiplier: 0.916667
    },
    {
      name: 'High Percentage (75%) - Beyond Old Limit!',
      query: '약속플러스 75%',
      expected_multiplier: 1.25
    },
    {
      name: 'Very High Percentage (85%) - New Capability!',
      query: 'KB 종신보험 85%',
      expected_multiplier: 1.416667
    },
    {
      name: 'Maximum (90%) - New Capability!',
      query: '변액연금 90%',
      expected_multiplier: 1.5
    },
    {
      name: 'Minimum (50%)',
      query: '삼성생명 50%',
      expected_multiplier: 0.833333
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📝 Test: ${test.name}`);
    console.log(`   Query: "${test.query}"`);

    try {
      const result = await system.executeQuery(test.query);

      if (result.status === 'success') {
        const actualMultiplier = result.commission_data.multiplier_ratio;
        const expectedMultiplier = test.expected_multiplier;
        const diff = Math.abs(actualMultiplier - expectedMultiplier);

        if (diff < 0.001) {
          console.log(`   ✅ PASS`);
          console.log(`   Multiplier: ${actualMultiplier.toFixed(6)}x (expected: ${expectedMultiplier.toFixed(6)}x)`);
          console.log(`   Formula: ${result.commission_data.calculation_formula}`);
          passed++;
        } else {
          console.log(`   ❌ FAIL`);
          console.log(`   Expected multiplier: ${expectedMultiplier.toFixed(6)}x`);
          console.log(`   Got multiplier: ${actualMultiplier.toFixed(6)}x`);
          console.log(`   Difference: ${diff.toFixed(6)}`);
          failed++;
        }
      } else {
        console.log(`   ❌ FAIL - ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(80));
  console.log(' 📊 TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${(passed / tests.length * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review.');
  }
}

main().catch(console.error);
