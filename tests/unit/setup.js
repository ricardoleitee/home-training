'use strict';
/*
 * Setup global do Vitest para os testes unitários de logic.js (critério 7.2).
 *
 * logic.js usa `localStorage` como global (é assim que corre no browser
 * real, via <script src="logic.js">, sem import nenhum). Em Node isso não
 * existe por omissão, por isso definimos aqui o mesmo stub em memória já
 * usado pelos testes das secções 1/2/4/5 (tests/lib/load-app.js) — mantém
 * os dois conjuntos de testes a usar a mesma noção de "localStorage falso",
 * e cada teste começa com um `localStorage` vazio e isolado dos outros
 * (beforeEach substitui a instância global inteira).
 */
// beforeEach vem do global injetado pelo Vitest (test.globals:true em
// vitest.config.js) — ver comentário nesse ficheiro sobre porque não se usa
// require('vitest') diretamente aqui (pacote ESM-only, projeto CommonJS).
const { makeMemoryLocalStorage } = require('../lib/load-app');

beforeEach(() => {
  global.localStorage = makeMemoryLocalStorage();
});
