'use strict';
/*
 * Critério 4.4 (docs/quality-criteria.md):
 * "First Contentful Paint < 2s sob throttling 'Slow 4G' do Lighthouse
 * mobile."
 *
 * Estratégia: corre o Lighthouse (programaticamente, via chrome-launcher)
 * contra o index.html real servido localmente (tests/lib/serve-static.js),
 * com formFactor 'mobile' e o preset de rede/CPU "Slow 4G" que o próprio
 * Lighthouse usa (rttMs 150, throughput 1.6Mbps, cpuSlowdownMultiplier 4x —
 * os valores documentados do preset mobileSlow4G do Lighthouse), e lê o
 * valor do audit 'first-contentful-paint'.
 *
 * Usa o Chromium já descarregado pelo Playwright (tests/tap-target-size.test.js
 * e outros) como motor do Lighthouse, para não depender de um Chrome do
 * sistema estar instalado na máquina onde os testes correm. O Chromium é
 * lançado pelo próprio Playwright (chromium.launch), não pelo
 * chrome-launcher — neste ambiente de sandbox, um spawn direto do
 * executável do Chrome feito pelo chrome-launcher falha com "spawn UNKNOWN",
 * enquanto o Playwright consegue lançar o mesmo binário sem problemas.
 * Passamos --remote-debugging-port explicitamente para o Lighthouse se
 * ligar por CDP à instância já lançada, sem precisar de a lançar ele
 * próprio.
 *
 * Corre com: node tests/lighthouse-fcp.test.js
 */
const lighthousePkg = require('lighthouse');
const lighthouse = lighthousePkg.default || lighthousePkg;
const { chromium } = require('playwright');
const { startServer } = require('./lib/serve-static');

const CDP_PORT = 9222;

async function waitForCdp(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Chromium não respondeu em http://127.0.0.1:${port}/json/version a tempo.`);
}

const FCP_BUDGET_MS = 2000;

// Preset "Slow 4G" documentado do Lighthouse (mobileSlow4G), replicado aqui
// de forma explícita em vez de importar um caminho interno instável do
// pacote lighthouse (que muda de versão para versão).
const SLOW_4G_THROTTLING = {
  rttMs: 150,
  throughputKbps: 1.6 * 1024,
  requestLatencyMs: 150 * 3.75,
  downloadThroughputKbps: 1.6 * 1024 * 0.9,
  uploadThroughputKbps: 750 * 0.9,
  cpuSlowdownMultiplier: 4,
};

const LH_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['first-contentful-paint'],
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false },
    throttlingMethod: 'simulate',
    throttling: SLOW_4G_THROTTLING,
  },
};

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${CDP_PORT}`],
  });
  try {
    await waitForCdp(CDP_PORT);
    const url = `${server.url}/index.html`;
    const runnerResult = await lighthouse(url, { port: CDP_PORT, logLevel: 'error' }, LH_CONFIG);
    if (!runnerResult || !runnerResult.lhr) {
      throw new Error('Lighthouse não devolveu resultado (runnerResult.lhr em falta).');
    }
    const audit = runnerResult.lhr.audits['first-contentful-paint'];
    if (!audit || typeof audit.numericValue !== 'number') {
      throw new Error(`Audit 'first-contentful-paint' não disponível no resultado: ${JSON.stringify(runnerResult.lhr.audits && Object.keys(runnerResult.lhr.audits))}`);
    }
    const fcpMs = audit.numericValue;
    console.log(`FCP medido: ${(fcpMs / 1000).toFixed(2)}s (score Lighthouse: ${audit.score})`);
    if (fcpMs >= FCP_BUDGET_MS) {
      throw new Error(`FCP de ${(fcpMs / 1000).toFixed(2)}s >= ${(FCP_BUDGET_MS / 1000).toFixed(0)}s sob throttling Slow 4G mobile.`);
    }
    console.log(`OK 4.4 — FCP ${(fcpMs / 1000).toFixed(2)}s < ${(FCP_BUDGET_MS / 1000).toFixed(0)}s sob Lighthouse mobile + Slow 4G.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch(err => {
  console.error('FALHOU 4.4:', err.message);
  process.exitCode = 1;
});
