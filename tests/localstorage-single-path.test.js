'use strict';
/*
 * Critério 5.1 (docs/quality-criteria.md):
 * "100% dos acessos a localStorage passam pelas funções loadJSON/saveJSON
 * (sem localStorage.setItem/getItem direto espalhado pelo código)."
 *
 * Estratégia: análise estática do texto do <script> em index.html + logic.js
 * (critério 7.2: loadJSON/saveJSON/clearAllStorage vivem em logic.js desde a
 * extração da lógica pura, carregado por index.html via <script src="logic.js">
 * antes do <script> inline — ver docs/quality-criteria.md secção 7). Conta
 * TODAS as ocorrências de localStorage.<método>( nos dois ficheiros e
 * confirma que existe exatamente 1 de cada uma das operações usadas
 * (getItem, setItem, clear) — e que estão dentro de loadJSON/saveJSON/
 * clearAllStorage respetivamente, que são a única abstração de storage da
 * app. Qualquer outro acesso direto (noutra função, em qualquer um dos dois
 * ficheiros) faz este teste falhar.
 *
 * Corre com: node tests/localstorage-single-path.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const LOGIC_JS_PATH = path.join(__dirname, '..', 'logic.js');

function run() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'não encontrei nenhum <script> em index.html');
  const logicJs = fs.readFileSync(LOGIC_JS_PATH, 'utf8');
  // Concatena o <script> inline (render/eventos) com logic.js (lógica pura,
  // onde loadJSON/saveJSON/clearAllStorage vivem agora) — o critério 5.1
  // aplica-se ao acesso a localStorage em toda a app, nos dois ficheiros.
  const script = scriptMatch[1] + '\n' + logicJs;

  const calls = [...script.matchAll(/localStorage\.(getItem|setItem|clear|removeItem|key)\s*\(/g)];
  const getItemCalls = calls.filter(c => c[1] === 'getItem');
  const setItemCalls = calls.filter(c => c[1] === 'setItem');
  const clearCalls = calls.filter(c => c[1] === 'clear');
  const otherCalls = calls.filter(c => !['getItem', 'setItem', 'clear'].includes(c[1]));

  assert.strictEqual(
    getItemCalls.length, 1,
    `esperava exatamente 1 chamada a localStorage.getItem (dentro de loadJSON), encontrei ${getItemCalls.length}`
  );
  assert.strictEqual(
    setItemCalls.length, 1,
    `esperava exatamente 1 chamada a localStorage.setItem (dentro de saveJSON), encontrei ${setItemCalls.length}`
  );
  assert.strictEqual(
    clearCalls.length, 1,
    `esperava exatamente 1 chamada a localStorage.clear (dentro de clearAllStorage), encontrei ${clearCalls.length}`
  );
  assert.strictEqual(
    otherCalls.length, 0,
    otherCalls.length ? `encontrei acesso direto a localStorage.${otherCalls[0][1]} fora de loadJSON/saveJSON/clearAllStorage` : ''
  );

  assert.ok(
    /function loadJSON\([^)]*\)\{[^}]*localStorage\.getItem/.test(script),
    'localStorage.getItem não está dentro da função loadJSON'
  );
  assert.ok(
    /function saveJSON\([^)]*\)\{[^}]*localStorage\.setItem/.test(script),
    'localStorage.setItem não está dentro da função saveJSON'
  );
  assert.ok(
    /function clearAllStorage\(\)\{[^}]*localStorage\.clear/.test(script),
    'localStorage.clear não está dentro da função clearAllStorage'
  );

  console.log('OK 5.1 — 100% dos acessos a localStorage passam por loadJSON/saveJSON/clearAllStorage.');
}

try {
  run();
} catch (err) {
  console.error('FALHOU 5.1:', err.message);
  process.exitCode = 1;
}
