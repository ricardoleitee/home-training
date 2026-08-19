'use strict';
/*
 * Critério 4.2 (docs/quality-criteria.md):
 * "Zero elementos com overflow horizontal fora da viewport entre 320px e
 * 480px de largura, em todos os overlays (o mesmo teste de overflow já
 * usado manualmente nesta conversa, agora automatizado)."
 *
 * Estratégia: abre a app num Chromium real (Playwright), percorre todos os
 * ecrãs/overlays reais (tests/lib/app-screens.js) em várias larguras de
 * viewport entre 320px e 480px, e para cada uma verifica dois tipos de
 * overflow horizontal:
 *   1. Elementos cuja caixa (getBoundingClientRect) ultrapassa os limites
 *      da viewport (left < 0 ou right > largura), obrigando a página a
 *      scroll horizontal indesejado.
 *   2. Elementos cujo próprio conteúdo interno é mais largo que a caixa
 *      (scrollWidth > clientWidth), criando overflow escondido dentro de
 *      um contentor.
 * Ambos ignoram elementos dentro de um contentor com overflow-x:auto/scroll
 * — nesses (ex.: .day-nav, a barra de dias com scroll horizontal lateral
 * propositado), "overflow" é o comportamento pretendido, não um bug.
 *
 * Corre com: node tests/overlay-overflow.test.js
 */
const { chromium } = require('playwright');
const { startServer } = require('./lib/serve-static');
const { ALL_SCREENS_FOR_LAYOUT_SCAN } = require('./lib/app-screens');

// 320 e 480 são os extremos exigidos pelo critério; os intermédios apanham
// pontos de quebra de layout específicos (grelhas, flex-wrap) que só se
// manifestam a larguras não redondas.
const VIEWPORT_WIDTHS = [320, 340, 360, 375, 390, 414, 428, 460, 480];

const SCAN_FN = (viewportWidth) => {
  const TOLERANCE = 0.5;
  function isVisible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    let node = el;
    while (node) {
      const ncs = node === el ? cs : getComputedStyle(node);
      if (ncs.display === 'none') return false;
      node = node.parentElement;
    }
    return true;
  }
  function hasScrollableAncestor(el) {
    let node = el.parentElement;
    while (node) {
      const cs = getComputedStyle(node);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true;
      node = node.parentElement;
    }
    return false;
  }
  const fails = [];
  const all = Array.from(document.body.querySelectorAll('*'));
  for (const el of all) {
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const scrollable = hasScrollableAncestor(el);
    if (!scrollable) {
      if (r.right > viewportWidth + TOLERANCE || r.left < -TOLERANCE) {
        fails.push({ tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? el.className : '', left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, reason: 'fora-da-viewport' });
        continue;
      }
    }
    // <input>/<textarea> têm scroll horizontal interno NATIVO do texto
    // quando o valor não cabe (comportamento normal do browser, não um bug
    // de layout — o texto não "foge" visualmente da caixa, só deixa de
    // caber todo de uma vez, tal como em qualquer input de qualquer site).
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
    const cs = getComputedStyle(el);
    const ownOverflow = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
    if (!ownOverflow && el.scrollWidth - el.clientWidth > 1) {
      fails.push({ tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? el.className : '', scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, reason: 'overflow-interno' });
    }
  }
  return fails;
};

async function run() {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    let totalFails = [];
    for (const width of VIEWPORT_WIDTHS) {
      for (const screen of ALL_SCREENS_FOR_LAYOUT_SCAN) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
        await page.goto(server.url + '/index.html');
        await screen.prepare(page);
        await screen.trigger(page);
        const fails = await page.evaluate(SCAN_FN, width);
        for (const f of fails) totalFails.push({ width, screen: screen.name, ...f });
        await page.close();
      }
    }

    if (totalFails.length) {
      const msg = totalFails.map(f => {
        if (f.reason === 'fora-da-viewport') {
          return `  [${f.width}px | ${f.screen}] <${f.tag} class="${f.cls}"> fora da viewport: left=${f.left} right=${f.right}`;
        }
        return `  [${f.width}px | ${f.screen}] <${f.tag} class="${f.cls}"> overflow interno: scrollWidth=${f.scrollWidth} > clientWidth=${f.clientWidth}`;
      }).join('\n');
      throw new Error(`${totalFails.length} caso(s) de overflow horizontal:\n${msg}`);
    }

    console.log(`OK 4.2 — ${ALL_SCREENS_FOR_LAYOUT_SCAN.length} ecrãs × ${VIEWPORT_WIDTHS.length} larguras (320–480px), sem overflow horizontal.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch(err => {
  console.error('FALHOU 4.2:', err.message);
  process.exitCode = 1;
});
