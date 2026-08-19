# Critérios de qualidade — Home Training v5

Referências de mercado usadas para comparação: **Freeletics**, **Nike Training Club (NTC)**, **Hevy**.
Cada critério é binário (cumprido / não cumprido) e verificável por inspeção de código, teste automatizado ou medição concreta — sem adjetivos vagos.

## 1. Registo de séries/repetições e histórico de treinos
- **1.1** Marcar uma série como feita atualiza o UI (check, contadores) de forma síncrona no mesmo handler de clique — sem `setTimeout`/debounce artificial entre o toque e o repaint.
- **1.2** O `localStorage.setItem` da série ocorre de forma síncrona no mesmo evento de clique que a marca como feita (sem passos assíncronos pelo meio) — para que fechar a app 1 frame depois não perca o registo.
- **1.3** O histórico mostra **todas** as semanas com pelo menos 1 série registada, sem limite arbitrário — teste automatizado gera 20 semanas fake e confirma que as 20 aparecem.
- **1.4** O valor de reps de uma série permanece editável depois de marcada como feita (não fica `readonly`/bloqueado).
- **1.5** O cálculo "vs. semana anterior" está matematicamente correto — teste automatizado com dados gerados aleatoriamente confirma a soma em 100% dos casos.

## 2. Planos e progressão de exercícios
- **2.1** É possível duplicar um dia de treino inteiro para outro dia sem recriar exercício a exercício.
- **2.2** A app sugere uma progressão concreta (ex.: "última semana 3×15, tenta 3×16") para exercícios com unidade `reps`, visível no card do exercício.
- **2.3** Existe pelo menos uma alternativa ao ciclo fixo de 7 dias (Seg–Dom) — ciclo de N dias configurável — ou, se ficar fora de escopo, isso é documentado explicitamente com justificação (não fica "esquecido").
- **2.4** Reordenar/adicionar/remover exercícios do plano nunca corrompe histórico já registado — teste automatizado confirma que `treino_data` de semanas passadas fica intacto após editar o plano atual.

## 3. Comportamento offline/PWA
- **3.1** Com a rede desligada (Service Worker offline), a app abre sem erros de rede na consola.
- **3.2** Todas as ações offline (marcar série, editar plano, criar exercício) sobrevivem a um reload da página enquanto offline.
- **3.3** `manifest.json` passa a verificação de instalabilidade do Lighthouse PWA (score ≥ 90).
- **3.4** Uma nova versão do Service Worker é adotada em no máximo 1 reload da página (sem ficar preso em "waiting").
- **3.5** Zero chamadas de rede (`fetch`/`XMLHttpRequest`) na app inteira — confirma que nada depende de servidor.

## 4. Performance e responsividade em mobile
- **4.1** Nenhum elemento interativo (botão, input, opção de select) tem alvo de toque menor que 44×44px (WCAG 2.5.5) — verificado por varrimento automático de `getBoundingClientRect()`.
- **4.2** Zero elementos com overflow horizontal fora da viewport entre 320px e 480px de largura, em todos os overlays (o mesmo teste de overflow já usado manualmente nesta conversa, agora automatizado).
- **4.3** Cumulative Layout Shift (CLS) < 0.1 ao abrir qualquer overlay.
- **4.4** First Contentful Paint < 2s sob throttling "Slow 4G" do Lighthouse mobile.
- **4.5** O ficheiro `index.html` (HTML+CSS+JS inline) não ultrapassa 200KB não comprimido.

## 5. Persistência e segurança dos dados de treino
- **5.1** 100% dos acessos a `localStorage` passam pelas funções `loadJSON`/`saveJSON` (sem `localStorage.setItem`/`getItem` direto espalhado pelo código).
- **5.2** Import de um ficheiro JSON com estrutura inválida é rejeitado com validação de schema mínima **antes** de sobrescrever os dados existentes (atualmente confia no `try/catch` do `JSON.parse`, mas não valida a forma dos dados).
- **5.3** Nomes de exercícios/planos definidos pelo utilizador não permitem XSS — teste automatizado cria um exercício com nome `<img src=x onerror=alert(1)>` e confirma que não executa. (Este é um risco real e presente hoje: `ex.name` vai para `innerHTML` sem escaping.)
- **5.4** Round-trip export→clear→import produz dados idênticos aos originais em 100% dos casos testados.
- **5.5** `resetAllData()` e outras ações destrutivas continuam a exigir dupla confirmação (já implementado — confirmar que não regride).

## 6. Interface e UX
- **6.1** Todos os pares texto/fundo definidos nas custom properties CSS (paleta clara e escura) cumprem contraste mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande).
- **6.2** Toda a ação relevante de toque (registar peso, guardar nutrição, guardar perfil — não só as já existentes no treino) dispara vibração/feedback tátil consistente com o resto da app.
- **6.3** Navegação por Tab percorre todos os elementos interativos de cada overlay em ordem lógica, sem ficar preso (tab trap).
- **6.4** Nenhum flash de tema errado (FOUC) no arranque — o dark mode aplica-se antes do primeiro paint visível.
- **6.5** Zero overflow horizontal (mesmo critério da área 4, aplicado à revisão visual manual de cada ecrã).

## 7. Testes automatizados
- **7.1** Existe uma suite de testes corrível com um único comando (`npm test`), sem configuração manual adicional.
- **7.2** As funções de lógica pura (`calcPct`, `isExDone`, `getTotalReps`, `calcMeta`, `getSetsDoneCount`, etc.) têm cobertura de testes unitários ≥ 80% de linhas.
- **7.3** Existe pelo menos 1 teste end-to-end (Playwright) que simula o fluxo completo: marcar séries de um treino → fechar/reabrir a página → confirmar que o progresso persiste.
- **7.4** Os testes correm automaticamente em CI (GitHub Actions) a cada push, com o resultado visível (badge ou log da Action).
- **7.5** A suite completa corre em menos de 60 segundos.

---

**Nota de arquitetura:** o critério 7.2 (testes unitários de funções puras) requer extrair essa lógica do `<script>` inline do `index.html` para um ficheiro `logic.js` separado, importado tanto pela app como pelos testes. Isto não introduz build step nem muda o deploy (GitHub Pages continua a servir ficheiros estáticos tal como estão) — só deixa de ser "tudo num único ficheiro". Sinalizado para confirmação antes de começar.
