'use strict';
/*
 * Critério 7.3 (docs/quality-criteria.md):
 * "Existe pelo menos 1 teste end-to-end (Playwright) que simula o fluxo
 * completo: marcar séries de um treino → fechar/reabrir a página →
 * confirmar que o progresso persiste."
 *
 * Usa um browser real (Chromium/Playwright) contra o index.html/logic.js
 * REAIS servidos por tests/lib/serve-static.js — mesma infraestrutura dos
 * testes da secção 4 (ver overlay-cls.test.js). Interage só através da UI
 * real (cliques em botões visíveis), nunca chamando funções internas
 * diretamente, para simular o que um utilizador faria:
 *
 *   1. Abre a app, escolhe o dia "Seg" (treino, não descanso).
 *   2. Abre o 1º exercício, escreve reps na 1ª série e marca TODAS as séries
 *      desse exercício como feitas (fica com o exercício completo, e a
 *      percentagem do dia sobe de 0% — não só o checkbox isolado).
 *   3. Fecha a página (page.close()) — não só um reload, uma página nova.
 *   4. Reabre a app no MESMO contexto de browser (mesma origem/storage,
 *      como reabrir o browser/PWA no telemóvel), volta ao dia "Seg".
 *   5. Confirma que as séries continuam marcadas, as reps continuam
 *      guardadas, e a percentagem de progresso do dia (agora >0%) se
 *      mantém — sem ter corrido nenhum passo extra de "guardar".
 *
 * Corre com: node tests/persist-progress.e2e.test.js
 */
const { chromium } = require('playwright');
const { startServer } = require('./lib/serve-static');

const DAY_TAB_SELECTOR = '#dayNav button:nth-child(1)'; // "Seg" — sempre dia de treino no SEED_PLAN
const REPS_VALUE = '15';

async function run() {
  const server = await startServer();
  const browser = await chromium.launch();
  // Um único `context` para as duas páginas: fechar uma página e abrir outra
  // dentro do MESMO contexto preserva o localStorage da origem, tal como
  // fechar e reabrir o browser/PWA preserva os dados no telemóvel real.
  // (browser.newPage() duas vezes criaria dois contextos/storages separados
  // — não serviria para testar persistência.)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block', // isola o teste de cache do SW; a persistência aqui é só localStorage
  });
  try {
    // ── 1ª "sessão": marcar progresso ──
    const page1 = await context.newPage();
    await page1.goto(server.url + '/index.html');
    await page1.click(DAY_TAB_SELECTOR);
    await page1.click('.ex-header'); // abre o 1º exercício do dia
    await page1.fill('.set-input', REPS_VALUE); // escreve reps na 1ª série
    await page1.locator('.set-input').first().dispatchEvent('change'); // saveRepsMain só corre em onchange
    // Marca TODAS as séries do exercício aberto como feitas — não só a 1ª —
    // para que o exercício fique completo e a % de progresso do dia suba
    // acima de 0%, tornando a verificação de "o progresso persiste" mais
    // exigente do que só o estado de um checkbox isolado.
    const setBtnCount = await page1.locator('.set-done-btn').count();
    for (let i = 0; i < setBtnCount; i++) {
      await page1.locator('.set-done-btn').nth(i).click();
    }

    const before = await page1.evaluate(() => ({
      allDone: [...document.querySelectorAll('.set-done-btn')].every(b => b.classList.contains('done')),
      exCardDone: document.querySelector('.ex-card').classList.contains('ex-done'),
      repsValue: document.querySelector('.set-input').value,
      pct: document.querySelector('.progress-pct').textContent,
    }));
    await page1.close();

    // ── "fecha a app" → "reabre a app" (mesmo contexto, página nova) ──
    const page2 = await context.newPage();
    await page2.goto(server.url + '/index.html');
    await page2.click(DAY_TAB_SELECTOR);

    const after = await page2.evaluate(() => ({
      allDone: [...document.querySelectorAll('.set-done-btn')].every(b => b.classList.contains('done')),
      exCardDone: document.querySelector('.ex-card').classList.contains('ex-done'),
      repsValue: document.querySelector('.set-input').value,
      pct: document.querySelector('.progress-pct').textContent,
    }));
    await page2.close();

    const fails = [];
    if (before.pct === '0%') fails.push('marcar todas as séries do exercício não fez a percentagem de progresso do dia sair de 0% (teste não está a validar progresso real)');
    if (!before.allDone || !before.exCardDone) fails.push('as séries/exercício não ficaram marcados como feitos na 1ª sessão (antes de fechar)');
    if (before.repsValue !== REPS_VALUE) fails.push(`reps não guardadas na 1ª sessão: esperava "${REPS_VALUE}", tinha "${before.repsValue}"`);
    if (!after.allDone || !after.exCardDone) fails.push('depois de fechar/reabrir a página, as séries/exercício já não aparecem marcados como feitos');
    if (after.repsValue !== REPS_VALUE) fails.push(`depois de fechar/reabrir, reps mudaram: esperava "${REPS_VALUE}", encontrei "${after.repsValue}"`);
    if (after.pct !== before.pct) fails.push(`percentagem de progresso mudou ao reabrir: antes "${before.pct}", depois "${after.pct}"`);

    if (fails.length) {
      throw new Error(fails.join('; '));
    }
    console.log(`OK 7.3 — série marcada + reps (${REPS_VALUE}) persistem intactas depois de fechar/reabrir a página (progresso: ${after.pct}).`);
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
}

run().catch(err => {
  console.error('FALHOU 7.3:', err.message);
  process.exitCode = 1;
});
