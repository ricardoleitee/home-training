'use strict';
/*
 * Critério 5.3 (docs/quality-criteria.md):
 * "Nomes de exercícios/planos definidos pelo utilizador não permitem XSS —
 * teste automatizado cria um exercício com nome <img src=x onerror=alert(1)>
 * e confirma que não executa."
 *
 * Estratégia: usa as funções REAIS da app (saveLibrary/savePlan/switchDay)
 * através do sandbox de tests/lib/load-app.js para colocar um exercício com
 * nome malicioso no dia ativo, no editor de plano e na biblioteca, e inspeciona
 * o innerHTML que a app realmente escreveu (via o document fake) confirmando
 * que a tag nunca aparece "viva" (sem escaping) — só como texto escapado.
 *
 * Corre com: node tests/exercise-name-xss.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

const XSS_NAME = '<img src=x onerror=alert(1)>';
const ESCAPED_NAME = '&lt;img src=x onerror=alert(1)&gt;';

function assertNoLiveTag(html, where) {
  // Se o nome não tivesse sido escapado, o HTML resultante conteria uma tag
  // <img ...> real (que o browser tentaria carregar e disparava o onerror).
  assert.ok(
    !/<img\s+src=x\s+onerror=alert\(1\)>/i.test(html),
    `${where}: encontrei a tag <img> maliciosa NÃO escapada — XSS executável`
  );
  assert.ok(
    html.includes(ESCAPED_NAME),
    `${where}: esperava encontrar o nome escapado (${ESCAPED_NAME}) no HTML gerado`
  );
}

function run() {
  const app = loadApp();

  const exId = 'xss-test-ex';
  const lib = app.getLibrary();
  lib[exId] = {
    id: exId, name: XSS_NAME, emoji: '💥', target: XSS_NAME, unit: 'reps',
    sets: 3, leg: false, how: XSS_NAME, tip: XSS_NAME, custom: true,
  };
  app.saveLibrary(lib);

  const plan = app.getPlan();
  const dayI = plan.days.findIndex(d => !d.rest);
  assert.notStrictEqual(dayI, -1, 'não encontrei nenhum dia de treino no plano seed');
  plan.days[dayI].exerciseIds.push(exId);
  plan.days[dayI].focus = XSS_NAME; // também testa o "foco do dia" (editável pelo utilizador)
  app.savePlan(plan);

  // 1) Ecrã principal do dia (renderContent, via switchDay -> refresh()).
  app.switchDay(dayI);
  assertNoLiveTag(app.document.getElementById('content').innerHTML, 'ecrã principal do dia');

  // 2) Editor de plano.
  app.renderPlanEditor();
  assertNoLiveTag(app.document.getElementById('planBody').innerHTML, 'editor de plano');

  // 3) Biblioteca de exercícios.
  app.openLibrary(null);
  assertNoLiveTag(app.document.getElementById('libBody').innerHTML, 'biblioteca de exercícios');

  // 4) Histórico (usa d.label/d.focus do plano para cada sessão).
  app.saveAll({
    w_2020_01_06: {
      [dayI]: {
        sets: { [`${exId}_0`]: '10' },
        setsDone: { [`${exId}_0`]: true },
        exOpen: {}, exSetCount: {},
      },
    },
  });
  app.openHistory();
  assertNoLiveTag(app.document.getElementById('historyBody').innerHTML, 'histórico');

  console.log('OK 5.3 — nome/foco de exercício com <img onerror=...> é escapado em todos os ecrãs testados, nunca executa.');
}

try {
  run();
} catch (err) {
  console.error('FALHOU 5.3:', err.message);
  process.exitCode = 1;
}
