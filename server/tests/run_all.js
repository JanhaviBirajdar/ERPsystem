const { execSync } = require('child_process');

const suites = [
  'server/tests/api.test.js',
  'server/tests/workflow.test.js',
  'server/tests/ai_copilot.test.js',
  'server/tests/analytics.test.js',
  'server/tests/support_alerts.test.js',
  'server/tests/smart_timetable.test.js',
  'server/tests/search.test.js',
  'server/tests/multi_tenant_saas.test.js'
];

console.log('================================================================');
console.log('🎓 RUNNING COMPLETE VERIFICATION SUITE ACROSS SAAS & AI CAPABILITIES');
console.log('================================================================\n');

for (const suite of suites) {
  try {
    console.log(`▶ Executing: ${suite}`);
    execSync(`node ${suite}`, { stdio: 'inherit' });
    console.log(`✔ Passed: ${suite}\n`);
  } catch (err) {
    console.error(`\n❌ Failed in suite: ${suite}`);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('🏆 ALL 8 TEST SUITES (CORE, WORKFLOWS, AI, & SAAS) PASSED 100%');
console.log('================================================================');
