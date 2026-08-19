'use strict';
/*
 * Critério 5.5 (docs/quality-criteria.md):
 * "resetAllData() e outras ações destrutivas continuam a exigir dupla
 * confirmação (já implementado — confirmar que não regride)."
 *
 * Estratégia: carrega a app 3 vezes, cada uma com um confirm() customizado
 * (via tests/lib/load-app.js) que conta quantas vezes é chamado e devolve
 * respostas diferentes, chamando a função REAL resetAllData():
 *   1. 1ª confirmação recusada  -> só 1 chamada a confirm(), nada apagado.
 *   2. 1ª aceite, 2ª recusada   -> exatamente 2 chamadas, nada apagado.
 *   3. ambas aceites            -> exatamente 2 chamadas, tudo apagado.
 *
 * Corre com: node tests/reset-double-confirm.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

function run() {
  // Caso 1: recusa a 1ª confirmação.
  let calls1 = 0;
  const app1 = loadApp({ confirm: () => { calls1++; return false; } });
  app1.saveSetting('injury', true);
  app1.resetAllData();
  assert.strictEqual(calls1, 1, `esperava 1 chamada a confirm() quando a 1ª é recusada, tive ${calls1}`);
  assert.strictEqual(app1.loadSetting('injury', false), true, 'dados foram apagados mesmo recusando a 1ª confirmação');

  // Caso 2: aceita a 1ª, recusa a 2ª.
  let calls2 = 0;
  const app2 = loadApp({ confirm: () => { calls2++; return calls2 === 1; } });
  app2.saveSetting('injury', true);
  app2.resetAllData();
  assert.strictEqual(calls2, 2, `resetAllData não pediu uma 2ª confirmação (esperava 2 chamadas a confirm(), tive ${calls2}) — deixou de exigir dupla confirmação`);
  assert.strictEqual(app2.loadSetting('injury', false), true, 'dados foram apagados só com a 1ª confirmação, sem a 2ª');

  // Caso 3: aceita as duas.
  let calls3 = 0;
  const app3 = loadApp({ confirm: () => { calls3++; return true; } });
  app3.saveSetting('injury', true);
  app3.resetAllData();
  assert.strictEqual(calls3, 2, `esperava exatamente 2 chamadas a confirm() quando ambas são aceites, tive ${calls3}`);
  assert.strictEqual(app3.loadSetting('injury', false), false, 'dados não foram apagados mesmo confirmando as 2 vezes');

  console.log('OK 5.5 — resetAllData continua a exigir exatamente 2 confirmações antes de apagar tudo.');
}

try {
  run();
} catch (err) {
  console.error('FALHOU 5.5:', err.message);
  process.exitCode = 1;
}
