'use strict';
/*
 * Critério 1.3 (docs/quality-criteria.md):
 * "O histórico mostra TODAS as semanas com pelo menos 1 série registada, sem
 * limite arbitrário — teste automatizado gera 20 semanas fake e confirma que
 * as 20 aparecem."
 *
 * Corre com: node tests/history-shows-all-weeks.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

function pad2(n) { return String(n).padStart(2, '0'); }

function run() {
  const app = loadApp();
  const plan = app.getPlan();
  const workDayIdx = plan.days.findIndex(d => !d.rest);
  assert.notStrictEqual(workDayIdx, -1, 'o plano seed não tem nenhum dia de treino (todos são descanso?)');
  const exId = plan.days[workDayIdx].exerciseIds[0];
  assert.ok(exId, 'o dia de treino escolhido não tem nenhum exercício');

  const WEEK_COUNT = 20;
  const all = {};
  const weekKeys = [];

  for (let i = 0; i < WEEK_COUNT; i++) {
    // Datas espaçadas 7 dias (segundas-feiras), formatadas exatamente como
    // getWeekKey() as produz: w_AAAA_MM_DD.
    const d = new Date(2020, 0, 6 + i * 7);
    const wk = `w_${d.getFullYear()}_${pad2(d.getMonth() + 1)}_${pad2(d.getDate())}`;
    weekKeys.push(wk);
    all[wk] = {
      [workDayIdx]: {
        sets: { [`${exId}_0`]: '10' },
        setsDone: { [`${exId}_0`]: true },
        exOpen: {},
        exSetCount: {},
      },
    };
  }

  const historyWeeks = app.getHistoryWeeksData(all, plan);

  assert.strictEqual(
    historyWeeks.length, WEEK_COUNT,
    `esperava ${WEEK_COUNT} semanas no histórico, obtive ${historyWeeks.length}`
  );

  const gotKeys = new Set(historyWeeks.map(h => h.wk));
  for (const wk of weekKeys) {
    assert.ok(gotKeys.has(wk), `a semana ${wk} não apareceu no histórico`);
  }

  console.log(`OK 1.3 — ${WEEK_COUNT} semanas fake geradas, ${historyWeeks.length}/${WEEK_COUNT} apareceram no histórico.`);
}

try {
  run();
} catch (err) {
  console.error('FALHOU 1.3:', err.message);
  process.exitCode = 1;
}
