'use strict';
/*
 * Critério 5.4 (docs/quality-criteria.md):
 * "Round-trip export→clear→import produz dados idênticos aos originais em
 * 100% dos casos testados."
 *
 * Estratégia: usa as funções REAIS de storage da app (savePlan/saveLibrary/
 * saveAll/savePesoEntry/saveNutriEntry/savePerfil/clearAllStorage) — as
 * mesmas que exportData()/handleImport() usam — para: (1) popular dados
 * variados em todas as categorias do backup, (2) construir o objeto de
 * backup exatamente como exportData() o constrói, (3) limpar tudo com
 * clearAllStorage() (o mesmo "apagar tudo" do resetAllData), (4) reimportar
 * validando com validateBackup() e escrevendo de volta exatamente como
 * handleImport() faz, e finalmente compara byte-a-byte (JSON.stringify) o
 * estado antes vs. depois.
 *
 * Nota: o FileReader/Blob do browser (usados por exportData/handleImport
 * para gerar/ler o ficheiro .json em si) não existem no sandbox Node — este
 * teste replica a lógica de leitura/escrita dessas funções tal como está
 * implementada, sem reimplementar a serialização de ficheiro.
 *
 * Corre com: node tests/export-import-roundtrip.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

function snapshot(app) {
  return JSON.stringify({
    plan: app.loadJSON('plan_v3', null),
    library: app.loadJSON('library_v3', null),
    history: app.loadAll(),
    peso: app.getPeso(),
    nutri: app.getNutri(),
    perfil: app.getPerfil(),
  });
}

function run() {
  const app = loadApp();

  // 1) Popular dados variados em TODAS as categorias do backup.
  const plan = app.getPlan();
  plan.days[0].focus = 'Foco personalizado';
  app.savePlan(plan);

  const lib = app.getLibrary();
  lib['custom-round-trip'] = {
    id: 'custom-round-trip', name: 'Exercício round-trip', emoji: '🔁',
    target: '3x10', unit: 'reps', sets: 3, leg: false,
    how: 'descrição', tip: 'dica', custom: true,
  };
  app.saveLibrary(lib);

  app.saveAll({
    w_2020_01_06: {
      0: { sets: { a_0: '12', a_1: '10' }, setsDone: { a_0: true, a_1: false }, exOpen: { a: true }, exSetCount: { a: 2 } },
    },
    w_2020_01_13: {
      3: { sets: { b_0: '8' }, setsDone: { b_0: true }, exOpen: {}, exSetCount: {} },
    },
  });

  app.savePesoEntry('2024-01-01', 70.5);
  app.savePesoEntry('2024-01-08', 70.1);
  app.saveNutriEntry('2024-01-01', { kcal: 2200, protein: 160 });
  app.savePerfil({ heightCm: 178, age: 29, sex: 'm', activity: '1.55', goal: 'recomp' });

  const before = snapshot(app);

  // 2) Construir o backup — mesma forma que exportData() produz.
  const backup = {
    plan: app.loadJSON('plan_v3', null),
    library: app.loadJSON('library_v3', null),
    history: app.loadAll(),
    peso: app.getPeso(),
    nutri: app.getNutri(),
    perfil: app.getPerfil(),
    exported: new Date().toISOString(),
  };

  // 3) Apagar tudo (mesma função que resetAllData usa).
  app.clearAllStorage();
  assert.strictEqual(app.loadJSON('plan_v3', null), null, 'clearAllStorage não limpou plan_v3');
  assert.notStrictEqual(snapshot(app), before, 'estado ficou igual depois de limpar — o teste não estava a testar nada de facto');

  // 4) Reimportar — mesma lógica (e mesma ordem) de handleImport().
  assert.strictEqual(app.validateBackup(backup), true, 'validateBackup rejeitou um backup válido gerado pela própria app');
  if (backup.plan) app.saveJSON('plan_v3', backup.plan);
  if (backup.library) app.saveJSON('library_v3', backup.library);
  if (backup.history) app.saveAll(backup.history);
  if (backup.peso) app.saveJSON('peso_v4', backup.peso);
  if (backup.nutri) app.saveJSON('nutri_v4', backup.nutri);
  if (backup.perfil) app.saveJSON('perfil_v4', backup.perfil);

  const after = snapshot(app);
  assert.strictEqual(after, before, 'round-trip export→clear→import não produziu dados idênticos aos originais');

  console.log('OK 5.4 — round-trip export→clear→import produziu dados byte-a-byte idênticos (plano, biblioteca, histórico, peso, nutrição, perfil).');
}

try {
  run();
} catch (err) {
  console.error('FALHOU 5.4:', err.message);
  process.exitCode = 1;
}
