'use strict';
/*
 * Critério 5.2 (docs/quality-criteria.md):
 * "Import de um ficheiro JSON com estrutura inválida é rejeitado com
 * validação de schema mínima ANTES de sobrescrever os dados existentes."
 *
 * validateBackup() (definida no <script> de index.html, chamada por
 * handleImport ANTES de qualquer saveJSON/saveAll) é a função pura que faz
 * essa validação. Este teste chama-a diretamente com estruturas inválidas
 * (tipos errados, campos em falta) e confirma que todas são rejeitadas, e
 * que um backup real gerado pela própria app é aceite.
 *
 * Corre com: node tests/import-schema-validation.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

function run() {
  const app = loadApp();

  const invalidCases = [
    ['plan não é objeto com days[]', { plan: 'não é um plano' }],
    ['plan.days vazio', { plan: { days: [] } }],
    ['dia do plano sem "focus"', { plan: { days: [{ label: 'Seg', rest: false, exerciseIds: [] }] } }],
    ['dia de treino sem exerciseIds', { plan: { days: [{ label: 'Seg', focus: 'X', rest: false }] } }],
    ['exercício de biblioteca incompleto (falta name/unit/sets)', { library: { x: { id: 'x', emoji: '💪' } } }],
    ['exercício de biblioteca com sets como string', { library: { x: { id: 'x', name: 'X', emoji: '💪', unit: 'reps', sets: '3' } } }],
    ['history com dayData sem setsDone', { history: { w_1: { 0: { sets: {}, exOpen: {}, exSetCount: {} } } } }],
    ['history com semana que não é objeto', { history: { w_1: 'asneira' } }],
    ['peso com valores não numéricos', { peso: { '2024-01-01': '70' } }],
    ['nutri com valores não-objeto', { nutri: { '2024-01-01': 123 } }],
    ['perfil sem heightCm/age numéricos', { perfil: { heightCm: '180', age: 30 } }],
    ['ficheiro raiz é um array', ['não', 'é', 'um', 'backup']],
    ['ficheiro raiz é null', null],
  ];

  for (const [desc, data] of invalidCases) {
    assert.strictEqual(
      app.validateBackup(data), false,
      `validateBackup devia REJEITAR: ${desc}`
    );
  }

  // Um backup real, gerado a partir do próprio estado da app (o mesmo que
  // exportData() produz), tem de ser aceite.
  const validBackup = {
    plan: app.getPlan(),
    library: app.getLibrary(),
    history: app.loadAll(),
    peso: app.getPeso(),
    nutri: app.getNutri(),
    perfil: app.getPerfil(),
    exported: new Date().toISOString(),
  };
  assert.strictEqual(
    app.validateBackup(validBackup), true,
    'validateBackup rejeitou um backup válido gerado pela própria app'
  );

  // Backup "v2" antigo — o próprio objeto É o treino_data, sem wrapper
  // {plan,library,...}. Tem de continuar a ser aceite (compatibilidade).
  const legacyV2 = { w_2020_01_06: { 0: { sets: {}, setsDone: {}, exOpen: {}, exSetCount: {} } } };
  assert.strictEqual(
    app.validateBackup(legacyV2), true,
    'validateBackup rejeitou um backup v2 (só histórico, sem wrapper) que é válido'
  );

  // E confirmar que, tal como está escrito o handleImport, nenhuma escrita
  // acontece antes de validateBackup(...) ser chamado: procura no código
  // fonte que a chamada a validateBackup precede as chamadas de saveJSON.
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const fnMatch = html.match(/function handleImport\([\s\S]*?\n\}/);
  assert.ok(fnMatch, 'não encontrei a função handleImport em index.html');
  const body = fnMatch[0];
  const validateIdx = body.indexOf('validateBackup(');
  const firstSaveIdx = body.indexOf("saveJSON('plan_v3'");
  assert.ok(validateIdx !== -1, 'handleImport já não chama validateBackup(...)');
  assert.ok(firstSaveIdx !== -1, 'não encontrei a escrita de plan_v3 em handleImport');
  assert.ok(
    validateIdx < firstSaveIdx,
    'validateBackup(...) é chamado DEPOIS de começar a sobrescrever dados — tem de ser antes'
  );

  console.log('OK 5.2 — validateBackup rejeita estruturas inválidas, aceita backups válidos (novos e v2), e handleImport valida antes de escrever.');
}

try {
  run();
} catch (err) {
  console.error('FALHOU 5.2:', err.message);
  process.exitCode = 1;
}
