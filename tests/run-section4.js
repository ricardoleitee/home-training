'use strict';
/*
 * Corre todos os testes automatizados da secção 4 (docs/quality-criteria.md)
 * num único comando: node tests/run-section4.js
 * Sai com código != 0 se algum teste falhar (para poder ser usado em CI mais tarde).
 *
 * Requer as devDependencies instaladas (`npm install`) e o Chromium do
 * Playwright descarregado (`npx playwright install chromium`) — os testes
 * desta secção usam um browser real, ao contrário das secções 1/2 que
 * correm num sandbox `vm` sem layout.
 */
const path = require('path');
const { execFileSync } = require('child_process');

const TESTS = [
  'tap-target-size.test.js',    // 4.1
  'overlay-overflow.test.js',   // 4.2
  'overlay-cls.test.js',        // 4.3
  'lighthouse-fcp.test.js',     // 4.4
  // 4.5 (index.html <= 200KB) é uma verificação estática direta, feita
  // aqui em vez de precisar de um browser — ver abaixo.
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

// 4.5 — index.html não ultrapassa 200KB não comprimido.
const fs = require('fs');
const indexPath = path.join(__dirname, '..', 'index.html');
const sizeKB = fs.statSync(indexPath).size / 1024;
console.log(`\n── 4.5 (tamanho de index.html) ──`);
if (sizeKB > 200) {
  console.error(`FALHOU 4.5: index.html tem ${sizeKB.toFixed(1)}KB, acima do limite de 200KB.`);
  failed = true;
} else {
  console.log(`OK 4.5 — index.html tem ${sizeKB.toFixed(1)}KB (limite: 200KB).`);
}

if (failed) {
  console.error('\nAlguns testes da secção 4 falharam.');
  process.exit(1);
}
console.log('\nTodos os testes da secção 4 passaram.');
