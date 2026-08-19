'use strict';
/*
 * Corre todos os testes automatizados da secção 1 (docs/quality-criteria.md)
 * num único comando: node tests/run-section1.js
 * Sai com código != 0 se algum teste falhar (para poder ser usado em CI mais tarde).
 */
const path = require('path');
const { execFileSync } = require('child_process');

const TESTS = [
  'history-shows-all-weeks.test.js',
  'vs-prev-week-sum.test.js',
];

let failed = false;
for (const file of TESTS) {
  const full = path.join(__dirname, file);
  console.log(`\n── ${file} ──`);
  try {
    execFileSync(process.execPath, [full], { stdio: 'inherit' });
  } catch {
    failed = true;
  }
}

if (failed) {
  console.error('\nAlguns testes falharam.');
  process.exit(1);
}
console.log('\nTodos os testes passaram.');
