'use strict';
/*
 * Critério 2.4 (docs/quality-criteria.md):
 * "Reordenar/adicionar/remover exercícios do plano nunca corrompe histórico
 * já registado — teste automatizado confirma que treino_data de semanas
 * passadas fica intacto após editar o plano atual."
 *
 * Também cobre, de caminho, o critério 2.1 (duplicar um dia inteiro): a
 * duplicação também só pode mexer em plan_v3, nunca em treino_data.
 *
 * Estratégia: chama as funções REAIS da app (moveEx, addExToDay,
 * removeExFromDay, confirmDuplicateDay) — não uma reimplementação da lógica
 * — através do sandbox de tests/lib/load-app.js, e confirma por
 * byte-a-byte (JSON.stringify) que os dados de duas semanas "passadas" no
 * treino_data ficam exatamente iguais antes e depois de uma sequência de
 * edições ao plano.
 *
 * Corre com: node tests/plan-edit-preserves-history.test.js
 */
const assert = require('assert');
const { loadApp } = require('./lib/load-app');

function run() {
  const app = loadApp();
  const plan = app.getPlan();

  // Dia A: tem de ter pelo menos 4 exercícios para dar para reordenar e
  // remover um sem ficar vazio. "Seg" (Peito e tríceps) no plano seed tem 4.
  const dayA = plan.days.findIndex(d => !d.rest && d.exerciseIds.length >= 4);
  assert.notStrictEqual(dayA, -1, 'não encontrei nenhum dia de treino com >=4 exercícios no plano seed');
  // Dia B: outro dia de treino qualquer, para testar que duplicar para lá
  // não mexe no histórico já lá registado.
  const dayB = plan.days.findIndex((d, i) => !d.rest && i !== dayA);
  assert.notStrictEqual(dayB, -1, 'não encontrei um segundo dia de treino no plano seed');

  const exIdsA = plan.days[dayA].exerciseIds;
  const exIdsB = plan.days[dayB].exerciseIds;

  // "Semanas passadas" — chaves bem antigas, para não coincidirem com a
  // semana atual nem com a anterior calculadas a partir de "agora".
  const PAST_WEEK_A = 'w_2019_03_04';
  const PAST_WEEK_B = 'w_2019_03_11';

  const dayDataA = {
    sets: { [`${exIdsA[0]}_0`]: '12', [`${exIdsA[0]}_1`]: '10', [`${exIdsA[1]}_0`]: '9' },
    setsDone: { [`${exIdsA[0]}_0`]: true, [`${exIdsA[0]}_1`]: true, [`${exIdsA[1]}_0`]: false },
    exOpen: { [exIdsA[0]]: true },
    exSetCount: { [exIdsA[0]]: 2 },
  };
  const dayDataB = {
    sets: { [`${exIdsB[0]}_0`]: '15' },
    setsDone: { [`${exIdsB[0]}_0`]: true },
    exOpen: {},
    exSetCount: {},
  };

  app.saveAll({
    [PAST_WEEK_A]: { [dayA]: dayDataA },
    [PAST_WEEK_B]: { [dayB]: dayDataB },
  });

  const snapshotBefore = JSON.stringify(app.loadAll());

  // ── Sequência de edições reais ao plano ──
  // 1. Reordenar (mesma função usada pelas setas ↑/↓ no editor).
  app.moveEx(dayA, 0, 1);
  // 2. Remover um exercício do dia A (confirm() está stubado para true).
  //    A troca 0<->1 do passo anterior não mexe no índice 2, por isso o
  //    exercício removido continua a ser exIdsA[2].
  const removedExId = exIdsA[2];
  app.removeExFromDay(dayA, 2);
  // 3. Adicionar um exercício novo ao dia A (mesmo fluxo do botão "+
  //    Adicionar exercício" -> abrir biblioteca com um dia-alvo -> escolher).
  // Exclui explicitamente o que acabou de ser removido — senão o "novo"
  // exercício escolhido podia calhar ser o mesmo, mascarando o efeito do
  // passo 2 no resultado final.
  const libIds = Object.keys(app.getLibrary());
  const newExId = libIds.find(id => id !== removedExId && !app.getPlan().days[dayA].exerciseIds.includes(id));
  assert.ok(newExId, 'não sobrou nenhum exercício na biblioteca para adicionar');
  app.openLibrary(dayA);
  app.addExToDay(newExId);
  // 4. Duplicar o dia A inteiro para o dia B (critério 2.1).
  app.confirmDuplicateDay(dayA, dayB);

  const planAfter = app.getPlan();

  // Sanidade: confirmar que as edições realmente aconteceram (senão o teste
  // passaria mesmo que nada tivesse efeito nenhum).
  assert.ok(!planAfter.days[dayA].exerciseIds.includes(removedExId), 'o exercício removido ainda está no dia A — removeExFromDay não teve efeito');
  assert.ok(planAfter.days[dayA].exerciseIds.includes(newExId), 'o exercício adicionado não está no dia A — addExToDay não teve efeito');
  assert.deepStrictEqual(planAfter.days[dayB].exerciseIds, planAfter.days[dayA].exerciseIds, 'a duplicação não copiou os exercícios do dia A para o dia B');

  const snapshotAfter = JSON.stringify(app.loadAll());

  assert.strictEqual(
    snapshotAfter, snapshotBefore,
    'treino_data de semanas passadas mudou depois de editar o plano (reordenar/remover/adicionar/duplicar) — histórico corrompido'
  );

  console.log('OK 2.4 — treino_data de 2 semanas passadas ficou byte-a-byte igual depois de reordenar, remover, adicionar e duplicar dia no plano.');
}

try {
  run();
} catch (err) {
  console.error('FALHOU 2.4:', err.message);
  process.exitCode = 1;
}
