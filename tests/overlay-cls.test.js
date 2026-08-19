'use strict';
/*
 * Critério 4.3 (docs/quality-criteria.md):
 * "Cumulative Layout Shift (CLS) < 0.1 ao abrir qualquer overlay."
 *
 * Estratégia: usa a Layout Instability API real do Chromium (PerformanceObserver
 * com entryType 'layout-shift', a mesma API que o Lighthouse/Chrome DevTools
 * usam para calcular CLS) via Playwright. Para cada overlay
 * (tests/lib/app-screens.js):
 *   1. Corre o `prepare()` do ecrã (mudar de dia, semear dados) — ainda sem
 *      observer, para não contaminar a medição com shifts que nada têm a
 *      ver com "abrir o overlay".
 *   2. Liga o PerformanceObserver e memoriza o CLS acumulado até aqui.
 *   3. Corre o `trigger()` — a função real da app que mostra o overlay
 *      (display:flex).
 *   4. Espera dois frames (rAF) + um instante para os entries de
 *      layout-shift serem despachados, e lê o CLS de novo.
 *   5. Confirma que o delta (shift causado só pela abertura) é < 0.1.
 *
 * Corre com: node tests/overlay-cls.test.js
 */
const { chromium } = require('playwright');
const { startServer } = require('./lib/serve-static');
const { OVERLAY_SCREENS_FOR_CLS } = require('./lib/app-screens');

const CLS_BUDGET = 0.1;

async function measureClsDelta(page, screen) {
  await page.evaluate(() => {
    window.__clsSum = 0;
    window.__clsObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__clsSum += entry.value;
      }
    });
    window.__clsObserver.observe({ type: 'layout-shift', buffered: true });
  });

  const before = await page.evaluate(() => window.__clsSum);
  await screen.trigger(page);
  // Os layout-shift entries são despachados ao fim do frame; dois rAF +
  // uma margem garantem que já foram entregues ao observer antes de ler.
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 200)));
  }));
  const after = await page.evaluate(() => window.__clsSum);
  return after - before;
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    const results = [];
    for (const screen of OVERLAY_SCREENS_FOR_CLS) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await page.goto(server.url + '/index.html');
      await screen.prepare(page);
      const delta = await measureClsDelta(page, screen);
      results.push({ name: screen.name, delta });
      await page.close();
    }

    const fails = results.filter(r => r.delta >= CLS_BUDGET);
    const report = results.map(r => `  ${r.delta < CLS_BUDGET ? 'OK ' : 'FAIL'} ${r.name}: CLS=${r.delta.toFixed(4)}`).join('\n');
    console.log(report);

    if (fails.length) {
      throw new Error(`${fails.length} overlay(s) com CLS >= ${CLS_BUDGET} ao abrir.`);
    }

    console.log(`OK 4.3 — CLS < ${CLS_BUDGET} em todos os ${results.length} overlays ao abrir.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch(err => {
  console.error('FALHOU 4.3:', err.message);
  process.exitCode = 1;
});
