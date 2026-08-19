'use strict';
/*
 * Ecrãs/overlays reais da app usados pelos testes de secção 4 (4.1, 4.2, 4.3
 * — docs/quality-criteria.md) que precisam de um browser real (Playwright),
 * ao contrário dos testes de lógica pura das secções 1/2 que correm num
 * sandbox `vm` sem layout (ver tests/lib/load-app.js).
 *
 * Cada ecrã tem dois passos, para que o teste de CLS (4.3) consiga isolar
 * SÓ o layout shift causado por "abrir o overlay", sem contar o shift de
 * preparação (mudar de dia, semear dados de exemplo):
 *   - prepare(page): estado prévio, ainda sem o overlay visível.
 *   - trigger(page): a própria abertura do overlay (o que os testes 4.1/4.2
 *     medem depois de correr, e o que o 4.3 mede o CLS à volta).
 *
 * As funções chamadas (switchDay, openHistory, toggleExOpen, ...) são as
 * funções reais e globais da app (o <script> do index.html corre tal e
 * qual num browser real) — nunca uma reimplementação da lógica.
 */

const SCREENS = [
  {
    name: 'modo treino',
    async prepare(page) {
      await page.evaluate(() => {
        const plan = getPlan();
        const workDay = plan.days.findIndex(d => !d.rest);
        switchDay(workDay);
      });
    },
    async trigger(page) {
      await page.evaluate(() => { startTreinoMode(); });
    },
  },
  {
    name: 'histórico',
    async prepare(page) {
      await page.evaluate(() => {
        const plan = getPlan();
        const workDay = plan.days.findIndex(d => !d.rest);
        const exId = plan.days[workDay].exerciseIds[0];
        saveAll({
          w_2019_03_04: { [workDay]: { sets: { [exId + '_0']: '10' }, setsDone: { [exId + '_0']: true }, exOpen: {}, exSetCount: {} } },
          w_2019_03_11: { [workDay]: { sets: { [exId + '_0']: '12' }, setsDone: { [exId + '_0']: true }, exOpen: {}, exSetCount: {} } },
        });
      });
    },
    async trigger(page) {
      await page.evaluate(() => { openHistory(); });
    },
  },
  {
    name: 'progresso corporal',
    async prepare(page) {
      await page.evaluate(() => {
        savePesoEntry(todayISO(), 70);
        savePesoEntry('2020-01-01', 72);
        saveNutriEntry(todayISO(), { kcal: 2000, protein: 150 });
        savePerfil({ heightCm: 175, age: 30, sex: 'm', activity: '1.55', goal: 'recomp' });
      });
    },
    async trigger(page) {
      await page.evaluate(() => { openProgress(); });
    },
  },
  {
    name: 'definições',
    async prepare() {},
    async trigger(page) {
      await page.evaluate(() => { openSettings(); });
    },
  },
  {
    name: 'editor de plano',
    async prepare() {},
    async trigger(page) {
      await page.evaluate(() => { openPlanEditor(); });
    },
  },
  {
    name: 'biblioteca',
    async prepare() {},
    async trigger(page) {
      await page.evaluate(() => { openLibrary(null); });
    },
  },
  {
    name: 'form de exercício (novo)',
    async prepare() {},
    async trigger(page) {
      await page.evaluate(() => { openExForm(null); });
    },
  },
  {
    name: 'form de exercício (editar, com apagar visível)',
    async prepare(page) {
      await page.evaluate(() => {
        const lib = getLibrary();
        lib['custom-test'] = { id: 'custom-test', name: 'Exercício de teste', emoji: '💪', sets: 3, unit: 'reps', target: '3x10', how: 'Descrição de teste.', tip: 'Dica de teste.', leg: false, custom: true };
        saveLibrary(lib);
      });
    },
    async trigger(page) {
      await page.evaluate(() => { openExForm('custom-test'); });
    },
  },
  {
    name: 'conclusão de treino',
    async prepare(page) {
      await page.evaluate(() => {
        const plan = getPlan();
        const workDay = plan.days.findIndex(d => !d.rest);
        switchDay(workDay);
        const exs = getActiveExercises(workDay);
        const wk = getWeekKey();
        const dd = getDayData(wk, workDay);
        exs.forEach(ex => {
          for (let i = 0; i < ex.sets; i++) { dd.setsDone[ex.id + '_' + i] = true; dd.sets[ex.id + '_' + i] = '10'; }
        });
        saveDayData(wk, workDay, dd);
      });
    },
    async trigger(page) {
      await page.evaluate(() => { showConclusao(getWeekKey()); });
    },
  },
];

// Ecrã "home" — não é um <div class="overlay">, mas é o ecrã principal com
// mais conteúdo interativo (sets, timer, botão de adicionar série), por
// isso entra nos varrimentos de alvo de toque (4.1) e overflow (4.2), mas
// fica de fora da lista de CLS (4.3), cujo critério é especificamente
// "ao abrir qualquer overlay".
const HOME_SCREEN = {
  name: 'home (dia de treino, exercício aberto)',
  async prepare(page) {
    await page.evaluate(() => {
      const plan = getPlan();
      const workDay = plan.days.findIndex(d => !d.rest);
      switchDay(workDay);
    });
  },
  async trigger(page) {
    await page.evaluate(() => {
      const workDay = getPlan().days.findIndex(d => !d.rest);
      const exs = getActiveExercises(workDay);
      if (exs[0]) toggleExOpen(exs[0].id);
    });
  },
};

// Para 4.1/4.2: todos os ecrãs, incluindo a home.
const ALL_SCREENS_FOR_LAYOUT_SCAN = [HOME_SCREEN, ...SCREENS];

// Para 4.3: só overlays reais (critério fala especificamente em "overlay").
const OVERLAY_SCREENS_FOR_CLS = SCREENS;

module.exports = { ALL_SCREENS_FOR_LAYOUT_SCAN, OVERLAY_SCREENS_FOR_CLS };
