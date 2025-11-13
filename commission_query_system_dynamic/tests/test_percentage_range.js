#!/usr/bin/env node
/**
 * Test Percentage Range (50-90%)
 */

import { NaturalLanguageCommissionSystem } from '../src/nl_query_system_dynamic.js';

async function main() {
  console.log('='.repeat(80));
  console.log(' 🎯 TESTING PERCENTAGE RANGE (50-90%)');
  console.log('='.repeat(80));

  const system = new NaturalLanguageCommissionSystem();

  // Test all percentages from 50-90%
  const percentages = [50, 55, 60, 65, 70, 75, 80, 85, 90];
  let passed = 0;
  let failed = 0;

  for (const pct of percentages) {
    console.log(`\n📝 Testing ${pct}%...`);

    try {
      const result = await system.executeQuery(`약속플러스 ${pct}%`);

      if (result.status === 'success') {
        const multiplier = result.commission_data.multiplier_ratio;
        const expectedMultiplier = pct / 60;
        const diff = Math.abs(multiplier - expectedMultiplier);

        if (diff < 0.001) {
          console.log(`   ✅ ${pct}% works! Multiplier: ${multiplier.toFixed(6)}x`);
          passed++;
        } else {
          console.log(`   ❌ ${pct}% failed! Expected ${expectedMultiplier.toFixed(6)}x, got ${multiplier.toFixed(6)}x`);
          failed++;
        }
      } else {
        console.log(`   ❌ ${pct}% failed! ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${pct}% error! ${error.message}`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(80));
  console.log(' 📊 RANGE TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Percentages Tested: ${percentages.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Range Coverage: ${percentages[0]}% to ${percentages[percentages.length - 1]}%`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('🎉 Full 50-90% range supported!');
  }
}

main().catch(console.error);
