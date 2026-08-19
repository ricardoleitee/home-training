/* ═══════════════════════════════════════════
   LOGIC.JS — lógica pura da app (sem DOM)
   Critério 7.2 (docs/quality-criteria.md): as funções de lógica pura
   (cálculos, acesso a localStorage, validação) vivem aqui, separadas do
   <script> inline de index.html que trata de DOM/render/eventos. Isto
   permite testá-las com Vitest sem precisar de um browser nem de um
   sandbox `vm`.

   Zero build step: index.html carrega este ficheiro com
   <script src="logic.js"></script> ANTES do seu próprio <script> inline —
   as funções abaixo ficam disponíveis como globais tal como estavam antes
   da extração. O deploy no GitHub Pages continua a servir ficheiros
   estáticos tal como estão.

   ARQUITETURA v3 — DATA-DRIVEN
   O plano vive em localStorage:
   - 'plan_v3': { days: [{label, focus, rest, restEmoji, restDesc, exerciseIds: []}] }
   - 'library_v3': { exId: {id, name, emoji, target, unit, how, tip, sets, leg, custom} }
   - 'treino_data': histórico por semana (compatível com v2)
   ═══════════════════════════════════════════ */

// ── SEED: plano e biblioteca originais ──
const SEED_LIBRARY = {
  "flex-norm":{id:"flex-norm",emoji:"💪",name:"Flexões normais",target:"3 séries × máximo",unit:"reps",sets:3,leg:false,
    how:"Mãos à largura dos ombros, corpo em linha reta da cabeça aos calcanhares. Desce até o peito quase tocar o chão, cotovelos a 45° do corpo. Sobe de forma controlada. Mantém o core contraído durante todo o movimento.",
    tip:"Se não consegues fazer completas, começa de joelhos — é uma progressão legítima."},
  "flex-diam":{id:"flex-diam",emoji:"🔺",name:"Flexões diamante",target:"3 séries × 8-12",unit:"reps",sets:3,leg:false,
    how:"Coloca as mãos juntas por baixo do peito, formando um triângulo com os dedos. Cotovelos fecham junto ao corpo ao descer. Isola o tríceps com muito mais intensidade que a flexão normal.",
    tip:"Quanto mais juntas as mãos, mais tríceps trabalha."},
  "flex-dec":{id:"flex-dec",emoji:"📐",name:"Flexões declinadas",target:"3 séries × 8-10",unit:"reps",sets:3,leg:false,
    how:"Coloca os pés numa cadeira ou sofá com as mãos no chão. O ângulo trabalha a parte superior do peito e os ombros. Mantém o corpo reto e desce lentamente.",
    tip:"Quanto mais alto os pés, mais ombros trabalham."},
  "dips":{id:"dips",emoji:"🪑",name:"Dips entre cadeiras",target:"3 séries × 10-15",unit:"reps",sets:3,leg:false,
    how:"Duas cadeiras estáveis lado a lado. Apoia as mãos nas bordas, pernas esticadas à frente. Dobra os cotovelos a 90° descendo o corpo, depois empurra para cima. Cotovelos apontam para trás, não para os lados.",
    tip:"Certifica-te que as cadeiras são sólidas e não deslizam."},
  "prancha":{id:"prancha",emoji:"⏱️",name:"Prancha frontal",target:"3 séries × 30-60 seg",unit:"seg",sets:3,leg:false,
    how:"Apoia os antebraços no chão com os cotovelos sob os ombros. Corpo em linha reta, anca nem acima nem abaixo. Contrai o abdômen como se fosses receber um soco. Respira normalmente.",
    tip:"Regista o tempo em segundos. Tenta bater o teu recorde a cada semana."},
  "bicicleta":{id:"bicicleta",emoji:"🚴",name:"Abdominais bicicleta",target:"3 séries × 20",unit:"reps",sets:3,leg:false,
    how:"Deitado, mãos atrás da cabeça, joelhos a 90°. Alterna: cotovelo direito ao joelho esquerdo enquanto esticas a perna direita. Movimento lento e controlado — não uses o pescoço para puxar.",
    tip:"Lento é melhor que rápido aqui — cada rep conta."},
  "leg-raises":{id:"leg-raises",emoji:"🦵",name:"Leg raises",target:"3 séries × 12-15",unit:"reps",sets:3,leg:false,
    how:"Deitado de costas, mãos sob os glúteos para apoiar a lombar. Pernas juntas e esticadas. Sobe até 90° e desce lentamente sem tocar o chão. O segredo está na descida controlada.",
    tip:"A descida lenta é onde o músculo trabalha mais."},
  "prancha-lat":{id:"prancha-lat",emoji:"↔️",name:"Prancha lateral",target:"3 séries × 20-30 seg/lado",unit:"seg",sets:3,leg:false,
    how:"Apoia num antebraço, corpo em linha reta lateral. Anca no ar, não deixa cair. Trabalha os oblíquos. Faz cada lado separadamente.",
    tip:"Faz primeiro o lado mais fraco."},
  "mountain":{id:"mountain",emoji:"🏔️",name:"Mountain climbers",target:"3 séries × 30 seg",unit:"seg",sets:3,leg:false,
    how:"Posição de prancha alta (braços esticados). Alterna joelhos ao peito rapidamente, como se estivesses a correr no chão. Mantém as ancas baixas e o core contraído.",
    tip:"Ritmo constante é melhor que explosões curtas."},
  "agach":{id:"agach",emoji:"🏋️",name:"Agachamento livre",target:"4 séries × 15-20",unit:"reps",sets:4,leg:true,
    how:"Pés à largura dos ombros, dedos ligeiramente para fora. Desce como se fosses sentar numa cadeira, joelhos seguem a direção dos dedos. Costas retas, peso nos calcanhares.",
    tip:"Se as costas arredondam, não desças tanto — é normal no início."},
  "lunges":{id:"lunges",emoji:"👟",name:"Lunges alternados",target:"3 séries × 12/perna",unit:"reps",sets:3,leg:true,
    how:"Em pé, dá um passo largo à frente. O joelho traseiro desce quase ao chão sem tocar. O joelho da frente não ultrapassa o pé. Volta à posição inicial e alterna pernas.",
    tip:"Conta só numa perna — 12 reps por perna, não 12 total."},
  "sumo":{id:"sumo",emoji:"🦶",name:"Agachamento sumô",target:"3 séries × 15",unit:"reps",sets:3,leg:true,
    how:"Pés mais largos que os ombros, dedos apontados para fora a 45°. Desce mantendo o tronco ereto. Trabalha mais os adutores e glúteos que o agachamento normal.",
    tip:"Imagina que estás a empurrar o chão para os lados ao subir."},
  "calf":{id:"calf",emoji:"⬆️",name:"Calf raises",target:"3 séries × 20-25",unit:"reps",sets:3,leg:true,
    how:"Em pé, sobe na ponta dos pés o mais alto possível. Desce lentamente. Para mais intensidade, faz numa degrau com o calcanhar fora do bordo.",
    tip:"A descida abaixo do nível do chão dobra a intensidade."},
  "glute":{id:"glute",emoji:"🌉",name:"Glute bridge",target:"3 séries × 15",unit:"reps",sets:3,leg:true,
    how:"Deitado de costas, joelhos dobrados, pés no chão. Empurra as ancas para cima até o corpo ficar em linha reta dos ombros aos joelhos. Aperta os glúteos no topo durante 1 segundo.",
    tip:"Aperta bem os glúteos no topo — é aí que trabalham."},
  "inv-rows":{id:"inv-rows",emoji:"🔄",name:"Inverted rows",target:"3 séries × 8-12",unit:"reps",sets:3,leg:false,
    how:"Deita-te por baixo de uma mesa sólida. Segura a borda com as mãos à largura dos ombros. Corpo em linha reta, calcanhares no chão. Puxa o peito até à borda da mesa.",
    tip:"Quanto mais horizontal o corpo, mais difícil."},
  "superman":{id:"superman",emoji:"🦸",name:"Superman",target:"3 séries × 15",unit:"reps",sets:3,leg:false,
    how:"Deitado de bruços, braços esticados à frente. Levanta simultaneamente braços, peito e pernas do chão. Segura 2 segundos no topo. Fortalece toda a cadeia posterior.",
    tip:"Não precisas de subir muito — a contração é o que importa."},
  "dominadas":{id:"dominadas",emoji:"🏗️",name:"Dominadas",target:"3 séries × máximo",unit:"reps",sets:3,leg:false,
    how:"Agarra a barra com as mãos à largura dos ombros, palmas para fora. Puxa até o queixo passar a barra. Desce lento e controlado — a descida é metade do treino.",
    tip:"Sem barra? Faz inverted rows mais inclinados."},
  "curl-mochila":{id:"curl-mochila",emoji:"🎒",name:"Curl com mochila",target:"3 séries × 10-12",unit:"reps",sets:3,leg:false,
    how:"Enche uma mochila com livros ou garrafas de água. Segura a alça com a mão, cotovelo junto ao corpo. Dobra o cotovelo subindo a mochila até ao ombro. Faz cada braço separado.",
    tip:"Cotovelo fixo junto ao corpo — só o antebraço se move."},
  "burpees":{id:"burpees",emoji:"🔥",name:"Burpees",target:"4 séries × 10",unit:"reps",sets:4,leg:false,
    how:"De pé → agacha e coloca as mãos no chão → salta os pés para trás → faz uma flexão → salta os pés para a frente → salta com os braços ao ar.",
    tip:"Ritmo constante é melhor que rápido e parar."},
  "jump-squat":{id:"jump-squat",emoji:"🦘",name:"Jump squats",target:"3 séries × 12",unit:"reps",sets:3,leg:true,
    how:"Agachamento normal até às coxas paralelas, depois explode para cima num salto. Aterra suavemente com os joelhos ligeiramente dobrados.",
    tip:"Aterragem suave — joelhos nunca bloqueados ao aterrar."},
  "clap-push":{id:"clap-push",emoji:"👏",name:"Flexões com palma",target:"3 séries × 6-8",unit:"reps",sets:3,leg:false,
    how:"Flexão normal mas na subida explodes com força suficiente para as mãos saírem do chão. Dá uma palma rápida e volta a apoiar.",
    tip:"Primeiro treina a explosão sem palma — mãos no ar basta."},
  "high-knees":{id:"high-knees",emoji:"🏃",name:"High knees",target:"3 séries × 30 seg",unit:"seg",sets:3,leg:false,
    how:"Corre no lugar levantando os joelhos até à altura da anca. Braços a acompanhar como numa corrida real. Mantém o ritmo alto.",
    tip:"Olha em frente, não para os pés."},
  "prancha-ombro":{id:"prancha-ombro",emoji:"🤚",name:"Prancha toque ombro",target:"3 séries × 10/lado",unit:"reps",sets:3,leg:false,
    how:"Prancha alta (braços esticados). Com uma mão toca no ombro oposto, depois volta. Alterna lados. Mantém as ancas estáveis.",
    tip:"Pés mais afastados = mais fácil manter o equilíbrio."}
};

const SEED_PLAN = {
  days:[
    {label:"Seg",focus:"Peito e tríceps",rest:false,exerciseIds:["flex-norm","flex-diam","flex-dec","dips"]},
    {label:"Ter",focus:"Core e abdominais",rest:false,exerciseIds:["prancha","bicicleta","leg-raises","prancha-lat","mountain"]},
    {label:"Qua",focus:"Descanso",rest:true,restEmoji:"😴",restDesc:"O músculo cresce no descanso, não no treino. Aproveita para uma caminhada leve ou simplesmente recupera bem.",exerciseIds:[]},
    {label:"Qui",focus:"Pernas e glúteos",rest:false,exerciseIds:["agach","lunges","sumo","calf","glute"]},
    {label:"Sex",focus:"Costas e bíceps",rest:false,exerciseIds:["inv-rows","superman","dominadas","curl-mochila"]},
    {label:"Sáb",focus:"Full body + cardio",rest:false,exerciseIds:["burpees","jump-squat","clap-push","high-knees","prancha-ombro"]},
    {label:"Dom",focus:"Descanso",rest:true,restEmoji:"🧘",restDesc:"Descanso total ou mobilidade suave. 10 minutos de alongamentos fazem maravilhas para a recuperação.",exerciseIds:[]}
  ]
};

// ── STORAGE CORE ──
// Critério 5.1: TODO o acesso a localStorage (leitura, escrita e limpeza)
// passa por estas funções — loadJSON/saveJSON para chaves individuais,
// clearAllStorage() para o "apagar tudo". Nenhum outro ponto do código chama
// localStorage.getItem/setItem/clear diretamente.
function loadJSON(k,def){ try{const v=localStorage.getItem(k);return v===null?def:JSON.parse(v);}catch{return def;} }
function saveJSON(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch{} }
function clearAllStorage(){ try{localStorage.clear();}catch{} }

// Critério 5.3: escaping central para qualquer valor definido pelo utilizador
// (nomes de exercícios, foco do dia, dicas, reps, etc.) antes de ir para
// innerHTML — quer como texto, quer dentro de um atributo value="...".
// Sem isto, um nome de exercício como <img src=x onerror=alert(1)> executava.
function escapeHtml(str){
  if(str===null||str===undefined)return'';
  return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function getPlan(){
  let p=loadJSON('plan_v3',null);
  if(!p){ p=JSON.parse(JSON.stringify(SEED_PLAN)); saveJSON('plan_v3',p); }
  return p;
}
function savePlan(p){ saveJSON('plan_v3',p); }

function getLibrary(){
  let lib=loadJSON('library_v3',null);
  if(!lib){ lib=JSON.parse(JSON.stringify(SEED_LIBRARY)); saveJSON('library_v3',lib); }
  return lib;
}
function saveLibrary(lib){ saveJSON('library_v3',lib); }

function getEx(exId){ return getLibrary()[exId]||null; }

// ── HISTÓRICO (compatível v2) ──
function loadAll(){ return loadJSON('treino_data',{}); }
function saveAll(d){ saveJSON('treino_data',d); }
function getDayData(wk,dayI){
  const all=loadAll();
  if(!all[wk])all[wk]={};
  if(!all[wk][dayI])all[wk][dayI]={sets:{},setsDone:{},exOpen:{},exSetCount:{}};
  return all[wk][dayI];
}
function saveDayData(wk,dayI,dd){ const all=loadAll(); if(!all[wk])all[wk]={}; all[wk][dayI]=dd; saveAll(all); }
function loadSetting(k,def){ return loadJSON('s_'+k,def); }
function saveSetting(k,v){ saveJSON('s_'+k,v); }

// ── PESO E NUTRIÇÃO (v4) ──
function getPeso(){ return loadJSON('peso_v4',{}); }
function savePesoEntry(date,kg){ const d=getPeso(); d[date]=kg; saveJSON('peso_v4',d); }
function deletePesoEntry(date){ const d=getPeso(); delete d[date]; saveJSON('peso_v4',d); }
function getNutri(){ return loadJSON('nutri_v4',{}); }
function saveNutriEntry(date,obj){ const d=getNutri(); d[date]=obj; saveJSON('nutri_v4',d); }
function deleteNutriEntry(date){ const d=getNutri(); delete d[date]; saveJSON('nutri_v4',d); }
function getPerfil(){ return loadJSON('perfil_v4',null); }
function savePerfil(p){ saveJSON('perfil_v4',p); }
function getLatestWeight(){
  const peso=getPeso();
  const dates=Object.keys(peso).sort();
  return dates.length?peso[dates[dates.length-1]]:null;
}
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatDatePT(iso){ const[y,m,d]=iso.split('-'); return`${d}/${m}`; }

// ── DATAS ──
function todayDayIndex(){ const d=new Date().getDay(); return d===0?6:d-1; }
function getWeekKey(){
  const now=new Date(); const monday=new Date(now);
  const day=now.getDay(); const diff=day===0?-6:1-day;
  monday.setDate(now.getDate()+diff);
  return `w_${monday.getFullYear()}_${String(monday.getMonth()+1).padStart(2,'0')}_${String(monday.getDate()).padStart(2,'0')}`;
}
function getWeekLabel(){
  const now=new Date(); const monday=new Date(now);
  const day=now.getDay(); const diff=day===0?-6:1-day;
  monday.setDate(now.getDate()+diff);
  const sunday=new Date(monday); sunday.setDate(monday.getDate()+6);
  const f=d=>`${d.getDate()}/${d.getMonth()+1}`;
  return `Semana de ${f(monday)} a ${f(sunday)}`;
}
function getPrevWeekKey(){
  const now=new Date(); now.setDate(now.getDate()-7);
  const monday=new Date(now); const day=now.getDay(); const diff=day===0?-6:1-day;
  monday.setDate(now.getDate()+diff);
  return `w_${monday.getFullYear()}_${String(monday.getMonth()+1).padStart(2,'0')}_${String(monday.getDate()).padStart(2,'0')}`;
}

/* ═══ CICLO DE TREINO — critério 2.3 (docs/quality-criteria.md), decisão
   registada explicitamente, NÃO esquecida ═══
   Não foi implementado nesta versão um ciclo de N dias configurável como
   alternativa ao ciclo fixo Seg–Dom.
   Justificação: getWeekKey()/getPrevWeekKey() ancoram a "semana" ao
   calendário real (chave 'w_AAAA_MM_DD' da segunda-feira dessa semana), e é
   nessa âncora que assentam: todo o treino_data já gravado pelos
   utilizadores atuais, a comparação "vs. semana anterior" (critério 1.5,
   calcVsPrevWeek/getWeekExerciseTotal) e o histórico que mostra todas as
   semanas (critério 1.3, getHistoryWeeksData + tests/history-shows-all-
   weeks.test.js). Substituir isto por um ciclo rotativo de N dias exigiria:
   (a) migrar as chaves de semana já guardadas no localStorage de quem já
   usa a app, (b) redefinir o que é "período anterior" quando o ciclo não
   coincide com semanas de calendário, e (c) alterar lógica validada pelas
   secções 1 e 5, fora do âmbito da secção 2 desta ronda de trabalho. Fica
   sinalizado aqui como funcionalidade própria a fazer com plano de migração
   de dados, não como omissão. */

// ── LÓGICA ──
function getActiveExercises(dayI){
  const plan=getPlan();
  const day=plan.days[dayI];
  if(!day||day.rest)return[];
  const injury=loadSetting('injury',false);
  return day.exerciseIds.map(id=>getEx(id)).filter(ex=>ex&&!(injury&&ex.leg));
}

function isExDone(wk,dayI,exId,sc){
  const dd=getDayData(wk,dayI);
  for(let i=0;i<sc;i++){if(!dd.setsDone[exId+'_'+i])return false;}
  return sc>0;
}
function isDayComplete(wk,dayI){
  const plan=getPlan();
  if(plan.days[dayI]?.rest)return false;
  const exs=getActiveExercises(dayI);
  return exs.length>0&&exs.every(ex=>{
    const dd=getDayData(wk,dayI);
    return isExDone(wk,dayI,ex.id,dd.exSetCount[ex.id]||ex.sets);
  });
}
function calcPct(wk,dayI){
  const exs=getActiveExercises(dayI);
  if(!exs.length)return 0;
  const done=exs.filter(ex=>{
    const dd=getDayData(wk,dayI);
    return isExDone(wk,dayI,ex.id,dd.exSetCount[ex.id]||ex.sets);
  }).length;
  return Math.round((done/exs.length)*100);
}
function getTotalReps(wk,dayI){
  const dd=getDayData(wk,dayI);
  let t=0;Object.values(dd.sets).forEach(v=>{const n=parseInt(v);if(!isNaN(n))t+=n;});
  return t;
}
function getPrevWeekReps(dayI,exId,setI){
  const dd=getDayData(getPrevWeekKey(),dayI);
  return dd.sets[exId+'_'+setI]||null;
}
function getSetsDoneCount(wk,dayI){
  const exs=getActiveExercises(dayI);
  let total=0,done=0;
  exs.forEach(ex=>{
    const dd=getDayData(wk,dayI);
    const sc=dd.exSetCount[ex.id]||ex.sets;
    total+=sc;
    for(let i=0;i<sc;i++){if(dd.setsDone[ex.id+'_'+i])done++;}
  });
  return{total,done};
}
// Soma as reps/segundos de UM exercício numa semana concreta, usando o número
// de séries realmente registado NESSA semana (nunca o de outra semana) — é
// isto que garante que a comparação "vs. semana anterior" soma cada semana
// pelas suas próprias séries, mesmo que o nº de séries tenha mudado entretanto.
function getWeekExerciseTotal(wk,dayI,exId,defaultSets){
  const dd=getDayData(wk,dayI);
  const sc=dd.exSetCount[exId]||defaultSets;
  let t=0;
  for(let i=0;i<sc;i++){
    const n=parseInt(dd.sets[exId+'_'+i]);
    if(!isNaN(n))t+=n;
  }
  return t;
}
// Comparação pura e testável "semana atual vs. semana anterior" para um exercício.
function calcVsPrevWeek(dayI,exId,defaultSets){
  const currTotal=getWeekExerciseTotal(getWeekKey(),dayI,exId,defaultSets);
  const prevTotal=getWeekExerciseTotal(getPrevWeekKey(),dayI,exId,defaultSets);
  return{currTotal,prevTotal,diff:currTotal-prevTotal};
}
// Critério 2.2: sugestão de progressão CONCRETA (ex.: "última semana 3×15,
// tenta 3×16") para exercícios de unidade 'reps' — só faz sentido em reps,
// não em segundos (uma prancha não se mede em "reps a mais"). Usa a média
// (arredondada) das reps válidas de cada série da semana anterior e sugere
// manter o mesmo nº de séries com +1 rep de média. Devolve null quando não
// há dados da semana anterior. Pura e testável — só lê localStorage via
// getDayData, nunca escreve nem toca no DOM.
function getProgressionSuggestion(dayI,exId,ex){
  if(ex.unit!=='reps')return null;
  const prevDD=getDayData(getPrevWeekKey(),dayI);
  const sc=prevDD.exSetCount[exId]||ex.sets;
  const vals=[];
  for(let i=0;i<sc;i++){
    const n=parseInt(prevDD.sets[exId+'_'+i]);
    if(!isNaN(n))vals.push(n);
  }
  if(!vals.length)return null;
  const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  if(avg<=0)return null;
  return{sets:sc,lastReps:avg,nextReps:avg+1};
}

// ── HISTÓRICO (agregação para o overlay) ──
function getHistoryWeeksData(all,plan){
  const weeks=Object.keys(all).sort().reverse();
  const result=[];
  weeks.forEach(wk=>{
    const sessions=Object.keys(all[wk]).map(dayI=>{
      const d=plan.days[parseInt(dayI)];
      if(!d||d.rest)return null;
      const dd=all[wk][dayI];
      let reps=0;Object.values(dd.sets||{}).forEach(v=>{const n=parseInt(v);if(!isNaN(n))reps+=n;});
      const sets=Object.values(dd.setsDone||{}).filter(Boolean).length;
      if(!sets)return null;
      return{dayI:parseInt(dayI),label:d.label,focus:d.focus,reps,sets};
    }).filter(Boolean);
    if(!sessions.length)return;
    result.push({wk,sessions});
  });
  return result;
}

// ── PROGRESSO CORPORAL ──
function calcMeta(){
  const p=getPerfil();
  const w=getLatestWeight();
  if(!p||!w)return null;
  const bmr=p.sex==='f'?(10*w+6.25*p.heightCm-5*p.age-161):(10*w+6.25*p.heightCm-5*p.age+5);
  const tdee=bmr*parseFloat(p.activity);
  const adj=p.goal==='bulk'?300:(p.goal==='cut'?-400:0);
  return{kcal:Math.round((tdee+adj)/10)*10,protein:Math.round(w*2)};
}

function progressBarHtml(label,val,target){
  const pct=Math.min(100,Math.round((val/target)*100));
  return`<div class="progress-wrap" style="margin-top:10px">
    <div class="progress-meta"><span class="progress-label">${label}</span><span class="progress-pct">${val}/${target}</span></div>
    <div class="progress-bar"><div class="progress-fill${pct>=100?' complete':''}" style="width:${pct}%"></div></div>
  </div>`;
}

function buildWeightChartSVG(entries){
  const w=300,h=120,pad=10;
  const kgs=entries.map(e=>e.kg);
  const min=Math.min(...kgs),max=Math.max(...kgs);
  const range=(max-min)||1;
  const stepX=entries.length>1?(w-2*pad)/(entries.length-1):0;
  const pos=(e,i)=>{
    const x=pad+i*stepX;
    const y=pad+(h-2*pad)*(1-(e.kg-min)/range);
    return[x,y];
  };
  const pts=entries.map((e,i)=>pos(e,i).map(v=>v.toFixed(1)).join(',')).join(' ');
  const dots=entries.map((e,i)=>{const[x,y]=pos(e,i);return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="var(--accent)"/>`;}).join('');
  return`<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${dots}
  </svg>`;
}

// ── VALIDAÇÃO DE BACKUP (critério 5.2) ──
function isValidPlanDay(d){
  return d&&typeof d==='object'&&!Array.isArray(d)&&
    typeof d.label==='string'&&typeof d.focus==='string'&&typeof d.rest==='boolean'&&
    (d.rest||Array.isArray(d.exerciseIds));
}
function isValidPlan(p){
  return p&&typeof p==='object'&&Array.isArray(p.days)&&p.days.length>0&&p.days.every(isValidPlanDay);
}
function isValidLibraryExercise(ex){
  return ex&&typeof ex==='object'&&!Array.isArray(ex)&&
    typeof ex.id==='string'&&typeof ex.name==='string'&&typeof ex.emoji==='string'&&
    typeof ex.unit==='string'&&typeof ex.sets==='number';
}
function isValidLibrary(lib){
  return lib&&typeof lib==='object'&&!Array.isArray(lib)&&Object.values(lib).every(isValidLibraryExercise);
}
function isValidDayData(dd){
  return dd&&typeof dd==='object'&&!Array.isArray(dd)&&
    dd.sets&&typeof dd.sets==='object'&&
    dd.setsDone&&typeof dd.setsDone==='object'&&
    dd.exOpen&&typeof dd.exOpen==='object'&&
    dd.exSetCount&&typeof dd.exSetCount==='object';
}
function isValidHistory(h){
  if(!h||typeof h!=='object'||Array.isArray(h))return false;
  return Object.values(h).every(week=>
    week&&typeof week==='object'&&!Array.isArray(week)&&Object.values(week).every(isValidDayData)
  );
}
function isValidPeso(p){
  return p&&typeof p==='object'&&!Array.isArray(p)&&Object.values(p).every(v=>typeof v==='number');
}
function isValidNutri(n){
  return n&&typeof n==='object'&&!Array.isArray(n)&&Object.values(n).every(v=>v&&typeof v==='object'&&!Array.isArray(v));
}
function isValidPerfil(p){
  return p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.heightCm==='number'&&typeof p.age==='number';
}
// Valida a forma inteira de um ficheiro de backup. Aceita tanto o formato
// atual ({plan,library,history,peso,nutri,perfil}) como um backup antigo v2
// (o próprio objeto é o treino_data, sem chaves plan/library/etc.).
function validateBackup(data){
  if(!data||typeof data!=='object'||Array.isArray(data))return false;
  const KNOWN=['plan','library','history','peso','nutri','perfil','exported'];
  const hasKnownKey=Object.keys(data).some(k=>KNOWN.includes(k));
  if(!hasKnownKey)return isValidHistory(data); // backup v2: só histórico, sem wrapper
  if(data.plan!=null&&!isValidPlan(data.plan))return false;
  if(data.library!=null&&!isValidLibrary(data.library))return false;
  if(data.history!=null&&!isValidHistory(data.history))return false;
  if(data.peso!=null&&!isValidPeso(data.peso))return false;
  if(data.nutri!=null&&!isValidNutri(data.nutri))return false;
  if(data.perfil!=null&&!isValidPerfil(data.perfil))return false;
  return true;
}

// Exporta como módulo CommonJS quando corrido em Node (testes Vitest), sem
// deixar de funcionar como script global clássico no browser (index.html
// carrega isto com <script src="logic.js">, sem type="module") — nenhum
// `import`/`export` é usado acima, só isto no fim.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEED_LIBRARY, SEED_PLAN,
    loadJSON, saveJSON, clearAllStorage, escapeHtml,
    getPlan, savePlan, getLibrary, saveLibrary, getEx,
    loadAll, saveAll, getDayData, saveDayData, loadSetting, saveSetting,
    getPeso, savePesoEntry, deletePesoEntry, getNutri, saveNutriEntry, deleteNutriEntry,
    getPerfil, savePerfil, getLatestWeight, todayISO, formatDatePT,
    todayDayIndex, getWeekKey, getWeekLabel, getPrevWeekKey,
    getActiveExercises, isExDone, isDayComplete, calcPct, getTotalReps,
    getPrevWeekReps, getSetsDoneCount, getWeekExerciseTotal, calcVsPrevWeek,
    getProgressionSuggestion, getHistoryWeeksData,
    calcMeta, progressBarHtml, buildWeightChartSVG,
    isValidPlanDay, isValidPlan, isValidLibraryExercise, isValidLibrary,
    isValidDayData, isValidHistory, isValidPeso, isValidNutri, isValidPerfil,
    validateBackup,
  };
}
