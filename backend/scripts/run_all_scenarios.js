#!/usr/bin/env node

/**
 * Master test runner for all phase-switching and scenario tests
 * Run all scenarios at once to verify phase switching system
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Phase Switching Test',
    file: 'test_phase_switching.js',
    description: 'Verifies phase detection and rate application for all packages'
  },
  {
    name: 'Commission Independence Test',
    file: 'test_commission_with_phases.js',
    description: 'Confirms commissions are phase-independent'
  },
  {
    name: 'Ahmed Scenario - 4 Referrals',
    file: 'scenario_4_directs_3_phases.js',
    description: 'Complete earnings analysis across 3 phases with 4 referrals'
  },
  {
    name: 'Summary Comparison Table',
    file: 'scenario_summary_table.js',
    description: 'Side-by-side comparison of all phases'
  }
];

let currentTest = 0;

function runTest(testIndex) {
  if (testIndex >= tests.length) {
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                       ALL TESTS COMPLETED SUCCESSFULLY                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n📊 Tests Run:\n');
    
    tests.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.name}`);
      console.log(`     ${test.description}\n`);
    });
    
    console.log('✅ All phase switching and commission calculations verified\n');
    process.exit(0);
  }

  const test = tests[testIndex];
  
  console.log('\n\n');
  console.log('╔' + '═'.repeat(94) + '╗');
  console.log('║ TEST ' + (testIndex + 1) + ' OF ' + tests.length + ': ' + test.name.padEnd(82) + ' ║');
  console.log('║ ' + test.description.padEnd(92) + ' ║');
  console.log('╚' + '═'.repeat(94) + '╝');
  
  const testProcess = spawn('node', [path.join(__dirname, test.file)], {
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Test ${testIndex + 1} failed with code ${code}`);
      process.exit(1);
    }
    runTest(testIndex + 1);
  });

  testProcess.on('error', (error) => {
    console.error(`\n❌ Error running test ${testIndex + 1}:`, error.message);
    process.exit(1);
  });
}

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    PHASE SWITCHING SYSTEM - TEST SUITE                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝');

console.log('\nRunning ' + tests.length + ' comprehensive tests...\n');

runTest(0);
