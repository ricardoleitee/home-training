'use strict';
/*
 * Testes unitários (Vitest) de logic.js (critério 7.2): getHistoryWeeksData
 * (histórico agregado, critério 1.3), calcMeta (metas nutricionais),
 * progressBarHtml e buildWeightChartSVG (templates SVG/HTML puros).
 */
const logic = require('../../logic.js');

describe('getHistoryWeeksData (critério 1.3)', () => {
  it('devolve [] quando não há histórico', () => {
    expect(logic.getHistoryWeeksData({}, logic.getPlan())).toEqual([]);
  });

  it('ignora dias sem nenhuma série marcada como feita', () => {
    const plan = logic.getPlan();
    const all = { w_2026_01_05: { 0: { sets: { 'flex-norm_0': '10' }, setsDone: {} } } };
    expect(logic.getHistoryWeeksData(all, plan)).toEqual([]);
  });

  it('ignora dias de descanso mesmo que tenham dados residuais', () => {
    const plan = logic.getPlan();
    const all = { w_2026_01_05: { 2: { sets: {}, setsDone: { x: true } } } }; // dia 2 = Qua, rest:true
    expect(logic.getHistoryWeeksData(all, plan)).toEqual([]);
  });

  it('agrega reps/sets por sessão e ordena semanas da mais recente para a mais antiga', () => {
    const plan = logic.getPlan();
    const all = {
      w_2026_01_05: { 0: { sets: { 'flex-norm_0': '10', 'flex-norm_1': '12' }, setsDone: { 'flex-norm_0': true, 'flex-norm_1': true } } },
      w_2025_12_29: { 0: { sets: { 'flex-norm_0': '8' }, setsDone: { 'flex-norm_0': true } } },
    };
    const result = logic.getHistoryWeeksData(all, plan);
    expect(result.map(w => w.wk)).toEqual(['w_2026_01_05', 'w_2025_12_29']);
    expect(result[0].sessions[0]).toEqual({ dayI: 0, label: 'Seg', focus: 'Peito e tríceps', reps: 22, sets: 2 });
  });

  it('mostra TODAS as semanas com pelo menos 1 série, sem limite arbitrário', () => {
    const plan = logic.getPlan();
    const all = {};
    for (let i = 0; i < 20; i++) {
      const wk = `w_fake_${String(i).padStart(2, '0')}`;
      all[wk] = { 0: { sets: { 'flex-norm_0': '10' }, setsDone: { 'flex-norm_0': true } } };
    }
    expect(logic.getHistoryWeeksData(all, plan).length).toBe(20);
  });
});

describe('calcMeta', () => {
  it('null sem perfil ou sem peso registado', () => {
    expect(logic.calcMeta()).toBeNull();
    logic.savePerfil({ heightCm: 180, age: 30, sex: 'm', activity: '1.55', goal: 'recomp' });
    expect(logic.calcMeta()).toBeNull(); // ainda sem peso
  });

  it('calcula kcal/proteína com a fórmula Mifflin-St Jeor para homem', () => {
    logic.savePerfil({ heightCm: 180, age: 30, sex: 'm', activity: '1.55', goal: 'recomp' });
    logic.savePesoEntry('2026-01-05', 80);
    // bmr = 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
    // tdee = 1780*1.55 = 2759 -> +0 (recomp) -> round a 10 = 2760
    const meta = logic.calcMeta();
    expect(meta.kcal).toBe(2760);
    expect(meta.protein).toBe(160); // round(80*2)
  });

  it('aplica o ajuste de +300kcal para bulk e -400kcal para cut', () => {
    logic.savePesoEntry('2026-01-05', 80);
    logic.savePerfil({ heightCm: 180, age: 30, sex: 'f', activity: '1.2', goal: 'bulk' });
    const bulk = logic.calcMeta().kcal;
    logic.savePerfil({ heightCm: 180, age: 30, sex: 'f', activity: '1.2', goal: 'cut' });
    const cut = logic.calcMeta().kcal;
    expect(bulk - cut).toBe(700);
  });
});

describe('progressBarHtml', () => {
  it('calcula a percentagem e marca "complete" quando atinge o alvo', () => {
    expect(progressBarHtml_pct('Proteína', 80, 160)).toBe(50);
    expect(logic.progressBarHtml('Proteína', 160, 160)).toContain('complete');
    expect(logic.progressBarHtml('Proteína', 40, 160)).not.toContain('complete');
  });

  it('nunca ultrapassa 100% mesmo quando o valor excede o alvo', () => {
    expect(progressBarHtml_pct('X', 300, 100)).toBe(100);
  });

  function progressBarHtml_pct(label, val, target) {
    const html = logic.progressBarHtml(label, val, target);
    const m = html.match(/width:(\d+)%/);
    return Number(m[1]);
  }
});

describe('buildWeightChartSVG', () => {
  it('gera um <svg> com um ponto por entrada', () => {
    const svg = logic.buildWeightChartSVG([{ kg: 80 }, { kg: 79 }, { kg: 78 }]);
    expect(svg).toContain('<svg');
    expect((svg.match(/<circle/g) || []).length).toBe(3);
  });

  it('não rebenta com uma única entrada (min===max, range cairia a 0)', () => {
    const svg = logic.buildWeightChartSVG([{ kg: 80 }]);
    expect(svg).toContain('<svg');
    expect((svg.match(/<circle/g) || []).length).toBe(1);
  });
});
