'use strict';
/*
 * Carrega as funções puras definidas no <script> do index.html para dentro
 * de um sandbox Node isolado (via vm), sem precisar de DOM nem de tocar no
 * localStorage real da máquina.
 *
 * Como funciona: o <script> do index.html é um único bloco. A partir do
 * comentário "// ── INIT ──" até ao fim, o código mexe diretamente no DOM
 * (document.getElementById(...).innerHTML=...) e regista o service worker —
 * isso só faz sentido dentro de um browser. Tudo o que vem ANTES desse
 * marcador é só definição de constantes/funções (nada é executado
 * imediatamente que precise de document/window), por isso é seguro avaliar
 * só essa parte aqui.
 *
 * localStorage é substituído por um stub em memória, para os testes correrem
 * isolados uns dos outros e sem deixar rasto no disco.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', '..', 'index.html');
const INIT_MARKER = '// ── INIT ──';

function makeMemoryLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
    get length() { return store.size; },
  };
}

// Stub mínimo de DOM: o suficiente para correr, sem browser, funções da app
// que escrevem em document.getElementById(id).innerHTML/.style/.value (ex.:
// renderPlanEditor, openLibrary, closeOverlay) sem que rebentem com
// "document is not defined". Não simula layout nem eventos — só guarda o
// que lá é escrito, para os testes poderem chamar as funções reais da app
// (não uma reimplementação da lógica) e confirmar efeitos noutro sítio
// (ex.: localStorage/treino_data).
function makeFakeElement() {
  const attrs = new Map();
  return {
    innerHTML: '', textContent: '', value: '',
    style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    dataset: {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, click() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    // setAttribute/getAttribute/removeAttribute: usados por updateInertState()
    // (critério 6.3) para marcar #app e overlays tapados como inert. Stub
    // simples em memória — suficiente para as funções da app correrem sem
    // "setAttribute is not a function", sem simular reflexão DOM real.
    setAttribute(name, val) { attrs.set(name, String(val)); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    removeAttribute(name) { attrs.delete(name); },
    hasAttribute(name) { return attrs.has(name); },
  };
}
function makeFakeDocument() {
  const elements = new Map();
  return {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeFakeElement());
      return elements.get(id);
    },
    createElement() { return makeFakeElement(); },
    addEventListener() {},
  };
}

function extractAppScript() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error('load-app: não encontrei nenhum <script> em index.html');
  }
  const full = match[1];
  const initIdx = full.indexOf(INIT_MARKER);
  if (initIdx === -1) {
    throw new Error(
      `load-app: não encontrei o marcador "${INIT_MARKER}" em index.html — ` +
      'sem ele não há forma segura de avaliar o script sem DOM. Se o comentário ' +
      'de INIT foi renomeado, atualiza INIT_MARKER neste ficheiro.'
    );
  }
  return full.slice(0, initIdx);
}

/**
 * Devolve um sandbox novo com todas as funções/constantes de topo do
 * index.html (getPlan, getWeekKey, calcVsPrevWeek, getHistoryWeeksData,
 * moveEx, addExToDay, removeExFromDay, duplicateDayTo, ...) acessíveis como
 * propriedades do objeto devolvido, com localStorage próprio e vazio (já
 * seedado de SEED_PLAN/SEED_LIBRARY na primeira leitura, tal como na app
 * real). Inclui stubs de document/window/confirm/alert para que funções que
 * também tocam no DOM (ex.: renderPlanEditor, openLibrary) possam ser
 * chamadas diretamente pelos testes sem rebentar — os stubs não simulam
 * layout, só evitam ReferenceError.
 */
// `opts.confirm`, quando passado, substitui o confirm() sempre-true por
// omissão — usado pelo teste do critério 5.5 (dupla confirmação em
// resetAllData) para contar quantas vezes confirm() é chamado e simular o
// utilizador a aceitar/recusar cada uma das duas confirmações.
function loadApp(opts = {}) {
  const script = extractAppScript();
  const fakeDocument = makeFakeDocument();
  const sandbox = {
    localStorage: makeMemoryLocalStorage(),
    navigator: {},
    document: fakeDocument,
    window: { addEventListener() {}, scrollTo() {} },
    confirm: opts.confirm || (() => true),
    alert() {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox, { filename: 'index.html (script, sem secção INIT)' });
  return sandbox;
}

module.exports = { loadApp, makeMemoryLocalStorage };
