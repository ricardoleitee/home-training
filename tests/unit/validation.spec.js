'use strict';
/*
 * Testes unitários (Vitest) da validação de schema de backup em logic.js
 * (critério 5.2, validado aqui como consequência direta da extração do
 * critério 7.2 — as funções isValid... / validateBackup vivem agora em
 * logic.js).
 */
const logic = require('../../logic.js');

describe('isValidPlan / isValidPlanDay', () => {
  it('aceita o SEED_PLAN', () => {
    expect(logic.isValidPlan(logic.SEED_PLAN)).toBe(true);
  });
  it('rejeita plano sem days', () => {
    expect(logic.isValidPlan({})).toBe(false);
  });
  it('rejeita plano com days vazio', () => {
    expect(logic.isValidPlan({ days: [] })).toBe(false);
  });
  it('rejeita dia sem exerciseIds quando não é rest', () => {
    expect(logic.isValidPlanDay({ label: 'Seg', focus: 'X', rest: false })).toBe(false);
  });
  it('aceita dia rest sem exerciseIds', () => {
    expect(logic.isValidPlanDay({ label: 'Qua', focus: 'Descanso', rest: true })).toBe(true);
  });
});

describe('isValidLibrary / isValidLibraryExercise', () => {
  it('aceita a SEED_LIBRARY', () => {
    expect(logic.isValidLibrary(logic.SEED_LIBRARY)).toBe(true);
  });
  it('rejeita exercício sem os campos mínimos', () => {
    expect(logic.isValidLibraryExercise({ id: 'x' })).toBe(false);
  });
});

describe('isValidDayData / isValidHistory', () => {
  const validDD = { sets: {}, setsDone: {}, exOpen: {}, exSetCount: {} };
  it('aceita dayData com as 4 chaves esperadas', () => {
    expect(logic.isValidDayData(validDD)).toBe(true);
  });
  it('rejeita dayData a que falte uma chave', () => {
    // A função usa curto-circuito (dd.exSetCount&&...) — sem a chave devolve
    // `undefined`, não `false`; falsy chega para o uso real (if/&&), por
    // isso o teste confirma falsy em vez de igualdade estrita a `false`.
    expect(logic.isValidDayData({ sets: {}, setsDone: {}, exOpen: {} })).toBeFalsy();
  });
  it('isValidHistory aceita {} e histórico bem formado, rejeita array/null', () => {
    expect(logic.isValidHistory({})).toBe(true);
    expect(logic.isValidHistory({ w_1: { 0: validDD } })).toBe(true);
    expect(logic.isValidHistory([])).toBe(false);
    expect(logic.isValidHistory(null)).toBe(false);
  });
});

describe('isValidPeso / isValidNutri / isValidPerfil', () => {
  it('isValidPeso exige valores numéricos', () => {
    expect(logic.isValidPeso({ '2026-01-05': 70 })).toBe(true);
    expect(logic.isValidPeso({ '2026-01-05': '70' })).toBe(false);
  });
  it('isValidNutri exige objetos por data', () => {
    expect(logic.isValidNutri({ '2026-01-05': { kcal: 2000 } })).toBe(true);
    expect(logic.isValidNutri({ '2026-01-05': 2000 })).toBe(false);
  });
  it('isValidPerfil exige heightCm e age numéricos', () => {
    expect(logic.isValidPerfil({ heightCm: 180, age: 30 })).toBe(true);
    expect(logic.isValidPerfil({ heightCm: '180', age: 30 })).toBe(false);
  });
});

describe('validateBackup (critério 5.2)', () => {
  it('rejeita null, array e tipos primitivos', () => {
    expect(logic.validateBackup(null)).toBe(false);
    expect(logic.validateBackup([])).toBe(false);
    expect(logic.validateBackup('nao é objeto')).toBe(false);
  });

  it('rejeita um objeto com forma completamente errada (o bug real do critério 5.2)', () => {
    expect(logic.validateBackup({ plan: 'asneira' })).toBe(false);
  });

  it('aceita um backup completo e válido no formato atual', () => {
    const backup = {
      plan: logic.SEED_PLAN,
      library: logic.SEED_LIBRARY,
      history: {},
      peso: { '2026-01-05': 70 },
      nutri: {},
      perfil: { heightCm: 180, age: 30 },
      exported: '2026-01-05T00:00:00.000Z',
    };
    expect(logic.validateBackup(backup)).toBe(true);
  });

  it('aceita um backup parcial (só algumas secções presentes)', () => {
    expect(logic.validateBackup({ plan: logic.SEED_PLAN })).toBe(true);
  });

  it('aceita um backup v2 antigo (sem wrapper, só o histórico)', () => {
    expect(logic.validateBackup({ w_2026_01_05: { 0: { sets: {}, setsDone: {}, exOpen: {}, exSetCount: {} } } })).toBe(true);
  });

  it('rejeita quando qualquer secção presente tem forma inválida', () => {
    const base = { plan: logic.SEED_PLAN, library: logic.SEED_LIBRARY, history: {}, peso: {}, nutri: {}, perfil: { heightCm: 180, age: 30 } };
    expect(logic.validateBackup({ ...base, library: { x: { id: 'x' } } })).toBe(false);
    expect(logic.validateBackup({ ...base, history: { w1: { 0: { sets: {} } } } })).toBe(false);
    expect(logic.validateBackup({ ...base, peso: { d: '70' } })).toBe(false);
    expect(logic.validateBackup({ ...base, nutri: { d: 1 } })).toBe(false);
    expect(logic.validateBackup({ ...base, perfil: { heightCm: '180' } })).toBe(false);
  });
});
