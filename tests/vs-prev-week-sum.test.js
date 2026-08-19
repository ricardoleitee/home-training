'use strict';
/*
 * Critério 1.5 (docs/quality-criteria.md):
 * "O cálculo 'vs. semana anterior' está matematicamente correto — teste
 * automatizado com dados gerados aleatoriamente confirma a soma em 100% dos
 * casos."
 *
 * Gera séries aleatórias (incluindo valores vazios e não-numéricos, como
 * inputs reais por preencher) para a semana atual e para a semana anterior,
 * guarda-as e confirma que calcVsPrevWeek()/getWeekExerciseTotal() somam
 * exatamente o que uma implementação de referência independente também soma.
 *
 * Corre com: node tests/vs-prev-week-sum.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

const TRIALS = 200;

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Mistura valores numéricos válidos com strings vazias e lixo não numérico —
// tal como uma série real que ainda não foi preenchida ou foi mal escrita.
function buildRandomSetValues(count) {
  const vals = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (r < 0.15) vals.push('');
    else if (r < 0.25) vals.push('abc');
    else vals.push(String(randomInt(0, 60)));
  }
  return vals;
}

function toSetsObject(exId, vals) {
  const o = {};
  vals.forEach((v, i) => { o[`${exId}_${i}`] = v; });
  return o;
}

// Implementação de referência, escrita de forma independente da app, que só
// soma valores que dão um inteiro válido — igual à regra usada em toda a app.
function referenceSum(vals) {
  return vals.reduce((acc, v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? acc : acc + n;
  }, 0);
}

function run() {
  let failures = 0;

  for (let t = 0; t < TRIALS; t++) {
    const app = loadApp(); // sandbox + localStorage novos e isolados por trial
    const plan = app.getPlan();
    const dayIdx = plan.days.findIndex(d => !d.rest);
    assert.notStrictEqual(dayIdx, -1, 'o plano seed não tem nenhum dia de treino');
    const exId = plan.days[dayIdx].exerciseIds[0];
    const defaultSets = plan.days[dayIdx].exerciseIds.length ? 3 : 3;

    const currWk = app.getWeekKey();
    const prevWk = app.getPrevWeekKey();

    const currCount = randomInt(1, 8);
    const prevCount = randomInt(1, 8);
    const currVals = buildRandomSetValues(currCount);
    const prevVals = buildRandomSetValues(prevCount);

    const all = {
      [currWk]: { [dayIdx]: { sets: toSetsObject(exId, currVals), setsDone: {}, exOpen: {}, exSetCount: { [exId]: currCount } } },
      [prevWk]: { [dayIdx]: { sets: toSetsObject(exId, prevVals), setsDone: {}, exOpen: {}, exSetCount: { [exId]: prevCount } } },
    };
    app.saveAll(all);

    const expectedCurr = referenceSum(currVals);
    const expectedPrev = referenceSum(prevVals);
    const expectedDiff = expectedCurr - expectedPrev;

    const { currTotal, prevTotal, diff } = app.calcVsPrevWeek(dayIdx, exId, defaultSets);

    try {
      assert.strictEqual(currTotal, expectedCurr, `trial ${t}: currTotal esperado ${expectedCurr}, obtido ${currTotal}`);
      assert.strictEqual(prevTotal, expectedPrev, `trial ${t}: prevTotal esperado ${expectedPrev}, obtido ${prevTotal}`);
      assert.strictEqual(diff, expectedDiff, `trial ${t}: diff esperado ${expectedDiff}, obtido ${diff}`);
    } catch (err) {
      failures++;
      console.error(err.message);
    }
  }

  if (failures > 0) {
    console.error(`FALHOU 1.5 — ${failures}/${TRIALS} casos aleatórios com soma incorreta.`);
    process.exitCode = 1;
    return;
  }

  console.log(`OK 1.5 — ${TRIALS}/${TRIALS} casos aleatórios (100%) com soma correta em calcVsPrevWeek/getWeekExerciseTotal.`);
}

run();
