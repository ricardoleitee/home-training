'use strict';
/*
 * Configuração do Vitest (critério 7.2, docs/quality-criteria.md).
 *
 * - `include` aponta só para tests/unit/*.spec.js — os testes das secções
 *   1/2/4/5 já existentes em tests/*.test.js são scripts Node "à mão"
 *   (chamam run() e process.exit diretamente, sem describe/it), corridos
 *   via `node tests/run-sectionN.js`. Se o Vitest tentasse recolhê-los como
 *   ficheiros de teste, ia executá-los como side-effect da recolha (alguns
 *   abrem um browser Playwright) sem correr através do runner do Vitest —
 *   por isso ficam excluídos daqui e o `npm test` corre-os à parte.
 * - `environment: 'node'` chega: logic.js só toca em `localStorage` (stub
 *   em memória fornecido por tests/setup.js), nunca em DOM/window.
 * - coverage restrita a logic.js — é essa a "lógica pura" do critério 7.2;
 *   o <script> inline de index.html (render/eventos/DOM) não é avaliado
 *   aqui, tem a sua própria cobertura via testes de secção 1/2/4/5.
 */
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    // globals:true injeta describe/it/expect/vi/beforeEach/... como globais
    // — evita `require('vitest')` nos ficheiros de teste, que falha porque
    // o pacote vitest é ESM-only e o resto do projeto é CommonJS (zero
    // build step, sem "type":"module" no package.json).
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.spec.js'],
    setupFiles: ['./tests/unit/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['logic.js'],
      thresholds: {
        lines: 80,
      },
    },
  },
});
