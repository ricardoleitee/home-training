'use strict';
/*
 * Testes unitários (Vitest) das funções de storage core de logic.js
 * (critério 7.2, docs/quality-criteria.md). Cobre loadJSON/saveJSON/
 * clearAllStorage, escapeHtml, getPlan/savePlan, getLibrary/saveLibrary,
 * getEx, o histórico (getDayData/saveDayData), settings, peso/nutrição/
 * perfil e as funções de data simples (todayISO/formatDatePT).
 */
const logic = require('../../logic.js');

describe('loadJSON / saveJSON / clearAllStorage', () => {
  it('devolve o default quando a chave não existe', () => {
    expect(logic.loadJSON('inexistente', { a: 1 })).toEqual({ a: 1 });
  });

  it('faz round-trip de um valor guardado', () => {
    logic.saveJSON('k', { x: 42, y: ['a', 'b'] });
    expect(logic.loadJSON('k', null)).toEqual({ x: 42, y: ['a', 'b'] });
  });

  it('devolve o default quando o JSON guardado está corrompido', () => {
    localStorage.setItem('k', '{ isto não é json válido');
    expect(logic.loadJSON('k', 'fallback')).toBe('fallback');
  });

  it('nunca rebenta mesmo que localStorage.setItem falhe', () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('quota excedida'); };
    expect(() => logic.saveJSON('k', { a: 1 })).not.toThrow();
    localStorage.setItem = original;
  });

  it('clearAllStorage() apaga tudo', () => {
    logic.saveJSON('a', 1);
    logic.saveJSON('b', 2);
    logic.clearAllStorage();
    expect(logic.loadJSON('a', null)).toBeNull();
    expect(logic.loadJSON('b', null)).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('escapa os 5 caracteres perigosos', () => {
    expect(logic.escapeHtml(`<img src=x onerror="alert(1)">&'`))
      .toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
  });

  it('devolve string vazia para null/undefined', () => {
    expect(logic.escapeHtml(null)).toBe('');
    expect(logic.escapeHtml(undefined)).toBe('');
  });

  it('converte valores não-string para string antes de escapar', () => {
    expect(logic.escapeHtml(42)).toBe('42');
  });

  it('texto sem caracteres especiais fica inalterado', () => {
    expect(logic.escapeHtml('Flexões normais')).toBe('Flexões normais');
  });
});

describe('getPlan / savePlan', () => {
  it('semeia SEED_PLAN na primeira leitura', () => {
    const plan = logic.getPlan();
    expect(plan.days.length).toBe(7);
    expect(plan.days[0].label).toBe('Seg');
  });

  it('persiste alterações feitas com savePlan', () => {
    const plan = logic.getPlan();
    plan.days[0].focus = 'Peito custom';
    logic.savePlan(plan);
    expect(logic.getPlan().days[0].focus).toBe('Peito custom');
  });
});

describe('getLibrary / saveLibrary / getEx', () => {
  it('semeia SEED_LIBRARY na primeira leitura', () => {
    const lib = logic.getLibrary();
    expect(lib['flex-norm'].name).toBe('Flexões normais');
  });

  it('getEx devolve null para id inexistente', () => {
    expect(logic.getEx('nao-existe')).toBeNull();
  });

  it('getEx devolve o exercício depois de saveLibrary', () => {
    const lib = logic.getLibrary();
    lib['custom-1'] = { id: 'custom-1', name: 'Custom', emoji: '💪', unit: 'reps', sets: 3, leg: false };
    logic.saveLibrary(lib);
    expect(logic.getEx('custom-1').name).toBe('Custom');
  });
});

describe('histórico: loadAll/saveAll/getDayData/saveDayData', () => {
  it('getDayData cria uma estrutura vazia para semana/dia nunca guardados', () => {
    const dd = logic.getDayData('w_2026_01_05', 0);
    expect(dd).toEqual({ sets: {}, setsDone: {}, exOpen: {}, exSetCount: {} });
  });

  it('saveDayData persiste e getDayData volta a lê-lo', () => {
    const dd = logic.getDayData('w_2026_01_05', 0);
    dd.sets['flex-norm_0'] = '15';
    logic.saveDayData('w_2026_01_05', 0, dd);
    expect(logic.getDayData('w_2026_01_05', 0).sets['flex-norm_0']).toBe('15');
  });

  it('loadAll/saveAll operam sobre o objeto treino_data inteiro', () => {
    logic.saveAll({ w_x: { 0: logic.getDayData('w_x', 0) } });
    expect(Object.keys(logic.loadAll())).toEqual(['w_x']);
  });
});

describe('settings genéricas', () => {
  it('loadSetting devolve o default quando nunca foi guardada', () => {
    expect(logic.loadSetting('injury', false)).toBe(false);
  });
  it('saveSetting/loadSetting fazem round-trip', () => {
    logic.saveSetting('injury', true);
    expect(logic.loadSetting('injury', false)).toBe(true);
  });
});

describe('peso / nutrição / perfil', () => {
  it('getPeso começa vazio e savePesoEntry/deletePesoEntry funcionam', () => {
    expect(logic.getPeso()).toEqual({});
    logic.savePesoEntry('2026-01-05', 70.5);
    expect(logic.getPeso()).toEqual({ '2026-01-05': 70.5 });
    logic.deletePesoEntry('2026-01-05');
    expect(logic.getPeso()).toEqual({});
  });

  it('getNutri começa vazio e saveNutriEntry/deleteNutriEntry funcionam', () => {
    logic.saveNutriEntry('2026-01-05', { kcal: 2200, protein: 140 });
    expect(logic.getNutri()['2026-01-05']).toEqual({ kcal: 2200, protein: 140 });
    logic.deleteNutriEntry('2026-01-05');
    expect(logic.getNutri()).toEqual({});
  });

  it('getPerfil começa null e savePerfil persiste', () => {
    expect(logic.getPerfil()).toBeNull();
    logic.savePerfil({ heightCm: 180, age: 30, sex: 'm', activity: '1.55', goal: 'recomp' });
    expect(logic.getPerfil().heightCm).toBe(180);
  });

  it('getLatestWeight devolve null sem registos, e o mais recente por data quando há vários', () => {
    expect(logic.getLatestWeight()).toBeNull();
    logic.savePesoEntry('2026-01-01', 71);
    logic.savePesoEntry('2026-01-10', 70);
    logic.savePesoEntry('2026-01-05', 70.5);
    expect(logic.getLatestWeight()).toBe(70);
  });
});

describe('todayISO / formatDatePT', () => {
  it('formatDatePT converte AAAA-MM-DD em DD/MM', () => {
    expect(logic.formatDatePT('2026-01-05')).toBe('05/01');
    expect(logic.formatDatePT('2026-12-31')).toBe('31/12');
  });

  it('todayISO devolve uma data no formato AAAA-MM-DD', () => {
    expect(logic.todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
