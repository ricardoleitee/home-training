'use strict';
/*
 * Testes unitários (Vitest) das funções de cálculo de treino em logic.js
 * (critério 7.2): getActiveExercises, isExDone, isDayComplete, calcPct,
 * getTotalReps, getPrevWeekReps, getSetsDoneCount, getWeekExerciseTotal,
 * calcVsPrevWeek e getProgressionSuggestion.
 */
const logic = require('../../logic.js');

afterEach(() => {
  vi.useRealTimers();
});

// Dia 0 = Seg = Peito e tríceps: flex-norm, flex-diam, flex-dec, dips (todos sets:3)
const DAY_TREINO = 0;
// Dia 2 = Qua = dia de descanso (rest:true, exerciseIds:[])
const DAY_DESCANSO = 2;
// Dia 3 = Qui = Pernas e glúteos: agach(4), lunges, sumo, calf, glute — todos com leg:true
const DAY_PERNAS = 3;

describe('getActiveExercises', () => {
  it('devolve os exercícios do plano seed para um dia de treino', () => {
    const exs = logic.getActiveExercises(DAY_TREINO);
    expect(exs.map(e => e.id)).toEqual(['flex-norm', 'flex-diam', 'flex-dec', 'dips']);
  });

  it('devolve array vazio num dia de descanso', () => {
    expect(logic.getActiveExercises(DAY_DESCANSO)).toEqual([]);
  });

  it('filtra exercícios de perna quando o modo lesão está ativo', () => {
    logic.saveSetting('injury', true);
    const exs = logic.getActiveExercises(DAY_PERNAS);
    expect(exs).toEqual([]); // todos os exercícios de Qui têm leg:true
  });
});

describe('isExDone', () => {
  it('false quando nenhuma série está marcada', () => {
    expect(logic.isExDone('w1', DAY_TREINO, 'flex-norm', 3)).toBe(false);
  });

  it('false quando sc é 0 (sem séries definidas)', () => {
    expect(logic.isExDone('w1', DAY_TREINO, 'flex-norm', 0)).toBe(false);
  });

  it('true só quando TODAS as séries até sc estão marcadas', () => {
    const dd = logic.getDayData('w1', DAY_TREINO);
    dd.setsDone['flex-norm_0'] = true;
    dd.setsDone['flex-norm_1'] = true;
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.isExDone('w1', DAY_TREINO, 'flex-norm', 3)).toBe(false);
    dd.setsDone['flex-norm_2'] = true;
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.isExDone('w1', DAY_TREINO, 'flex-norm', 3)).toBe(true);
  });
});

describe('isDayComplete', () => {
  it('false num dia de descanso mesmo que nada esteja marcado', () => {
    expect(logic.isDayComplete('w1', DAY_DESCANSO)).toBe(false);
  });

  it('false enquanto algum exercício do dia não estiver feito', () => {
    expect(logic.isDayComplete('w1', DAY_TREINO)).toBe(false);
  });

  it('true quando todos os exercícios ativos do dia estão feitos', () => {
    const plan = logic.getPlan();
    const exs = logic.getActiveExercises(DAY_TREINO);
    const dd = logic.getDayData('w1', DAY_TREINO);
    exs.forEach(ex => {
      for (let i = 0; i < ex.sets; i++) dd.setsDone[ex.id + '_' + i] = true;
    });
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.isDayComplete('w1', DAY_TREINO)).toBe(true);
    expect(plan.days[DAY_TREINO].rest).toBe(false);
  });
});

describe('calcPct', () => {
  it('0% num dia sem exercícios ativos (ex.: descanso)', () => {
    expect(logic.calcPct('w1', DAY_DESCANSO)).toBe(0);
  });

  it('0% quando nada está feito', () => {
    expect(logic.calcPct('w1', DAY_TREINO)).toBe(0);
  });

  it('percentagem arredondada de exercícios completos (1 de 4 = 25%)', () => {
    const dd = logic.getDayData('w1', DAY_TREINO);
    for (let i = 0; i < 3; i++) dd.setsDone['flex-norm_' + i] = true; // 1 dos 4 exercícios feito
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.calcPct('w1', DAY_TREINO)).toBe(25);
  });

  it('100% quando todos os exercícios ativos estão feitos', () => {
    const exs = logic.getActiveExercises(DAY_TREINO);
    const dd = logic.getDayData('w1', DAY_TREINO);
    exs.forEach(ex => { for (let i = 0; i < ex.sets; i++) dd.setsDone[ex.id + '_' + i] = true; });
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.calcPct('w1', DAY_TREINO)).toBe(100);
  });
});

describe('getTotalReps', () => {
  it('0 quando não há séries registadas', () => {
    expect(logic.getTotalReps('w1', DAY_TREINO)).toBe(0);
  });

  it('soma só valores numéricos válidos, ignora lixo não-numérico', () => {
    const dd = logic.getDayData('w1', DAY_TREINO);
    dd.sets['flex-norm_0'] = '15';
    dd.sets['flex-norm_1'] = '12';
    dd.sets['flex-norm_2'] = ''; // vazio, não deve contar
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.getTotalReps('w1', DAY_TREINO)).toBe(27);
  });
});

describe('getPrevWeekReps', () => {
  it('null quando não há registo na semana anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    expect(logic.getPrevWeekReps(DAY_TREINO, 'flex-norm', 0)).toBeNull();
  });

  it('devolve o valor guardado na semana anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00')); // semana atual w_2026_01_05
    const prevKey = logic.getPrevWeekKey(); // w_2025_12_29
    const dd = logic.getDayData(prevKey, DAY_TREINO);
    dd.sets['flex-norm_0'] = '18';
    logic.saveDayData(prevKey, DAY_TREINO, dd);
    expect(logic.getPrevWeekReps(DAY_TREINO, 'flex-norm', 0)).toBe('18');
  });
});

describe('getSetsDoneCount', () => {
  it('total = soma de sets de cada exercício ativo, done = quantas estão marcadas', () => {
    const dd = logic.getDayData('w1', DAY_TREINO);
    dd.setsDone['flex-norm_0'] = true;
    dd.setsDone['dips_1'] = true;
    logic.saveDayData('w1', DAY_TREINO, dd);
    const { total, done } = logic.getSetsDoneCount('w1', DAY_TREINO);
    expect(total).toBe(12); // 4 exercícios × 3 séries
    expect(done).toBe(2);
  });

  it('respeita exSetCount quando o utilizador mudou o nº de séries de um exercício', () => {
    const dd = logic.getDayData('w1', DAY_TREINO);
    dd.exSetCount['flex-norm'] = 5;
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.getSetsDoneCount('w1', DAY_TREINO).total).toBe(14); // 5+3+3+3
  });
});

describe('getWeekExerciseTotal / calcVsPrevWeek', () => {
  it('soma as reps válidas de um exercício numa semana, usando o nº de séries dessa semana', () => {
    const dd = logic.getDayData('w1', DAY_TREINO);
    dd.sets['flex-norm_0'] = '10';
    dd.sets['flex-norm_1'] = '12';
    dd.sets['flex-norm_2'] = '14';
    logic.saveDayData('w1', DAY_TREINO, dd);
    expect(logic.getWeekExerciseTotal('w1', DAY_TREINO, 'flex-norm', 3)).toBe(36);
  });

  it('calcVsPrevWeek calcula currTotal, prevTotal e diff corretamente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    const currKey = logic.getWeekKey();
    const prevKey = logic.getPrevWeekKey();

    const ddCurr = logic.getDayData(currKey, DAY_TREINO);
    ddCurr.sets['flex-norm_0'] = '20';
    logic.saveDayData(currKey, DAY_TREINO, ddCurr);

    const ddPrev = logic.getDayData(prevKey, DAY_TREINO);
    ddPrev.sets['flex-norm_0'] = '15';
    logic.saveDayData(prevKey, DAY_TREINO, ddPrev);

    const result = logic.calcVsPrevWeek(DAY_TREINO, 'flex-norm', 3);
    expect(result).toEqual({ currTotal: 20, prevTotal: 15, diff: 5 });
  });
});

describe('getProgressionSuggestion (critério 2.2)', () => {
  it('null para exercícios medidos em segundos (não faz sentido sugerir "+1 rep")', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    const ex = logic.getEx('prancha'); // unit: 'seg'
    expect(logic.getProgressionSuggestion(1, 'prancha', ex)).toBeNull();
  });

  it('null quando não há dados da semana anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    const ex = logic.getEx('flex-norm');
    expect(logic.getProgressionSuggestion(DAY_TREINO, 'flex-norm', ex)).toBeNull();
  });

  it('sugere a média +1 rep com base na semana anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    const prevKey = logic.getPrevWeekKey();
    const dd = logic.getDayData(prevKey, DAY_TREINO);
    dd.sets['flex-norm_0'] = '14';
    dd.sets['flex-norm_1'] = '15';
    dd.sets['flex-norm_2'] = '16';
    logic.saveDayData(prevKey, DAY_TREINO, dd);

    const ex = logic.getEx('flex-norm');
    const suggestion = logic.getProgressionSuggestion(DAY_TREINO, 'flex-norm', ex);
    expect(suggestion).toEqual({ sets: 3, lastReps: 15, nextReps: 16 });
  });
});
