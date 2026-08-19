'use strict';
/*
 * Critério 4.1 (docs/quality-criteria.md):
 * "Nenhum elemento interativo (botão, input, opção de select) tem alvo de
 * toque menor que 44×44px (WCAG 2.5.5) — verificado por varrimento
 * automático de getBoundingClientRect()."
 *
 * Estratégia: abre a app num Chromium real (Playwright) servido por
 * tests/lib/serve-static.js, percorre todos os ecrãs/overlays reais
 * (tests/lib/app-screens.js) em duas larguras de viewport (320px e 480px —
 * os extremos suportados, ver critério 4.2), e faz
 * document.querySelectorAll('button, a[href], input, select, [onclick]')
 * + getBoundingClientRect() em cada elemento visível. Falha se algum tiver
 * largura ou altura < 44px.
 *
 * <option> fica de fora do varrimento: é renderizado pelo SO fora da árvore
 * de layout da página, por isso getBoundingClientRect() não devolve uma
 * caixa real para ele (é sempre 0×0) — não há forma de o medir por esta via.
 * O <select> em si (a caixa clicável que abre a lista) é medido normalmente.
 *
 * Elementos puramente decorativos sem onclick próprio (ex.: o círculo
 * .ex-check dentro do cabeçalho clicável do exercício, ou o emoji .ex-emoji)
 * não entram no varrimento — o alvo de toque real do utilizador é o
 * elemento que tem o onclick (ex.: .ex-header), não os seus filhos visuais.
 *
 * Corre com: node tests/tap-target-size.test.js
 */
const assert = require('assert');
const { chromium } = require('playwright');
const { startServer } = require('./lib/serve-static');
const { ALL_SCREENS_FOR_LAYOUT_SCAN } = require('./lib/app-screens');

const VIEWPORT_WIDTHS = [320, 480];
const MIN_TARGET = 44;

const SCAN_FN = () => {
  function isVisible(el) {
    if (el.hasAttribute('disabled')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    let node = el;
    while (node) {
      const ncs = node === el ? cs : getComputedStyle(node);
      if (ncs.display === 'none') return false;
      node = node.parentElement;
    }
    return true;
  }
  const candidates = Array.from(document.querySelectorAll('button, a[href], input, select, [onclick]'));
  const fails = [];
  for (const el of candidates) {
    if (el.tagName === 'OPTION') continue;
    if (el.type === 'hidden') continue;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // não renderizado (ex.: input file escondido)
    const w = Math.round(r.width * 100) / 100;
    const h = Math.round(r.height * 100) / 100;
    if (w < 44 - 0.5 || h < 44 - 0.5) {
      fails.push({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className : '',
        id: el.id,
        w, h,
        text: (el.textContent || '').trim().slice(0, 30),
      });
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
        // serviceWorkers:'block' — sw.js faz location.reload() em
        // controllerchange (ver index.html, critério 3.4); sem bloquear,
        // reloads assíncronos do SW destroem o contexto de execução a meio
        // do varrimento desta página. Nada disto tem a ver com o que este
        // teste mede (alvo de toque), por isso é seguro desligar aqui.
        const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
        await page.goto(server.url + '/index.html');
        await screen.prepare(page);
        await screen.trigger(page);
        const fails = await page.evaluate(SCAN_FN);
        for (const f of fails) {
          totalFails.push({ width, screen: screen.name, ...f });
        }
        await page.close();
      }
    }

    if (totalFails.length) {
      const msg = totalFails.map(f =>
        `  [${f.width}px | ${f.screen}] <${f.tag} class="${f.cls}"${f.id ? ` id="${f.id}"` : ''}> ${f.w}×${f.h}px "${f.text}"`
      ).join('\n');
      throw new Error(`${totalFails.length} elemento(s) interativo(s) abaixo de ${MIN_TARGET}×${MIN_TARGET}px:\n${msg}`);
    }

    const screensCount = ALL_SCREENS_FOR_LAYOUT_SCAN.length;
    console.log(`OK 4.1 — varrimento getBoundingClientRect() em ${screensCount} ecrãs × ${VIEWPORT_WIDTHS.length} larguras de viewport, sem alvos de toque abaixo de 44×44px.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch(err => {
  console.error('FALHOU 4.1:', err.message);
  process.exitCode = 1;
});
