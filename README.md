# Home Training

[![Testes](https://github.com/ricardoleitee/home-training/actions/workflows/test.yml/badge.svg)](https://github.com/ricardoleitee/home-training/actions/workflows/test.yml)

PWA pessoal de calistenia — `index.html` + `logic.js` + `manifest.json` + `sw.js`, sem frameworks nem dependências externas em runtime, servida estaticamente pelo GitHub Pages.

## Testes

```
npm install
npm test
```

Um único comando corre a suite completa (unitários com cobertura, secções 1/2/4/5 e o teste end-to-end de persistência). O `npm install` já descarrega o Chromium do Playwright necessário aos testes com browser real — não é preciso nenhum passo manual adicional.

A suite corre automaticamente em CI (GitHub Actions) a cada push e pull request — ver [`.github/workflows/test.yml`](.github/workflows/test.yml) e o resultado no badge acima ou no separador [Actions](https://github.com/ricardoleitee/home-training/actions).

Critérios de qualidade completos: [`docs/quality-criteria.md`](docs/quality-criteria.md).
