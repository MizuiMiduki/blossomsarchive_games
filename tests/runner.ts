import { runI18nUnitTests } from './1-unit/i18n.test.ts';
import { runStorageUnitTests } from './1-unit/storage.test.ts';
import { runP2pUnitTests } from './1-unit/p2p.test.ts';
import { runGameRulesUnitTests } from './1-unit/game-rules.test.ts';
import { runGameLifecycleIntegrationTests } from './2-integration/game-lifecycle.test.ts';
import { runDataSyncIntegrationTests } from './2-integration/data-sync.test.ts';
import { runLocalizationFlowIntegrationTests } from './2-integration/localization-flow.test.ts';
import { runUiComponentTests } from './3-ui/components.test.ts';
import { runRoutingE2eTests } from './4-e2e/routing-e2e.test.ts';
import { runVisualRegressionTests } from './5-visual/visual-regression.test.ts';
import { runPerformanceBudgetTests } from './6-performance/performance-budget.test.ts';
import { runSecurityAuditTests } from './7-security/security-audit.test.ts';
import { TestContext } from './test-utils.ts';

const args = process.argv.slice(2);
const targetSuite = args.find((a) => a.startsWith('--suite='))?.split('=')[1];

async function main() {
  console.log('================================================================');
  console.log('      BLOSSOMSARCHIVE GAMES - COMPREHENSIVE TEST SUITE          ');
  console.log('   (Unit, Integration, UI, E2E, Visual, Performance, Security)  ');
  console.log('================================================================\n');

  const suiteRunners: Record<string, (() => Promise<TestContext>)[]> = {
    unit: [runI18nUnitTests, runStorageUnitTests, runP2pUnitTests, runGameRulesUnitTests],
    integration: [runGameLifecycleIntegrationTests, runDataSyncIntegrationTests, runLocalizationFlowIntegrationTests],
    ui: [runUiComponentTests],
    e2e: [runRoutingE2eTests],
    visual: [runVisualRegressionTests],
    performance: [runPerformanceBudgetTests],
    security: [runSecurityAuditTests],
  };

  const selectedSuites = targetSuite ? [targetSuite] : Object.keys(suiteRunners);

  let totalPassed = 0;
  let totalFailed = 0;
  const allFailures: string[] = [];

  for (const suiteKey of selectedSuites) {
    const fns = suiteRunners[suiteKey];
    if (!fns) {
      console.error(`Unknown suite: ${suiteKey}. Available: ${Object.keys(suiteRunners).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n▶ CATEGORY: ${suiteKey.toUpperCase()}`);
    console.log('----------------------------------------------------------------');

    for (const fn of fns) {
      try {
        const ctx = await fn();
        const res = ctx.summary();
        totalPassed += res.passed;
        totalFailed += res.failed;
        allFailures.push(...res.failures);
      } catch (err: any) {
        totalFailed++;
        const msg = `Exception in suite ${suiteKey}: ${err?.message || String(err)}`;
        allFailures.push(msg);
        console.error(`  ✗ CRITICAL FAIL: ${msg}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY:`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    console.error('\nFailures summary:');
    for (const f of allFailures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 ALL REQUESTED TEST SUITES PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
