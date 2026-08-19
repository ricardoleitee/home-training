'use strict';
/*
 * Testes unitários (Vitest) das funções de data de logic.js (critério 7.2).
 * Usa vi.setSystemTime para fixar "hoje" a datas conhecidas — sem isso,
 * getWeekKey()/getPrevWeekKey()/todayDayIndex() dependeriam do dia real em
 * que os testes correm, o que os tornaria não-determinísticos.
 */
const logic = require('../../logic.js');

afterEach(() => {
  vi.useRealTimers();
});

describe('todayDayIndex', () => {
  it('segunda-feira real (getDay()===1) dá índice 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T10:00:00')); // segunda-feira
    expect(logic.todayDayIndex()).toBe(0);
  });

  it('domingo real (getDay()===0) dá índice 6, não -1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-11T10:00:00')); // domingo
    expect(logic.todayDayIndex()).toBe(6);
  });

  it('sábado dá índice 5', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T10:00:00')); // sábado
    expect(logic.todayDayIndex()).toBe(5);
  });
});

describe('getWeekKey / getPrevWeekKey / getWeekLabel', () => {
  it('getWeekKey ancora sempre na segunda-feira da semana corrente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00')); // quinta-feira da semana de 5-11 jan
    expect(logic.getWeekKey()).toBe('w_2026_01_05');
  });

  it('getWeekKey a partir de um domingo ainda ancora na segunda ANTERIOR (mesma semana)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-11T10:00:00')); // domingo, fim da semana de 5-11 jan
    expect(logic.getWeekKey()).toBe('w_2026_01_05');
  });

  it('getPrevWeekKey é sempre exatamente 7 dias antes da segunda atual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    expect(logic.getPrevWeekKey()).toBe('w_2025_12_29');
  });

  it('getWeekLabel descreve o intervalo segunda–domingo da semana corrente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-08T10:00:00'));
    expect(logic.getWeekLabel()).toBe('Semana de 5/1 a 11/1');
  });

  it('getWeekKey funciona corretamente atravessando a virada do ano', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00')); // quinta-feira, semana de 29 dez a 4 jan
    expect(logic.getWeekKey()).toBe('w_2025_12_29');
  });
});
