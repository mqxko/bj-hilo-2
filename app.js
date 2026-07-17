const $ = (id) => document.getElementById(id);

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

const state = {
  shoe: [],
  running: 0,
  currentCards: [],
  revealed: false,
  history: [],
  attempts: 0,
  correct: 0,
  currentStreak: 0,
  bestStreak: 0,
  startedAt: null,
  timerId: null,
  pendingInstall: null,
  stats: loadStats(),
  game: {
    shoe: [],
    player: [],
    dealer: [],
    active: false,
    bankroll: 10000,
    bet: 100,
    doubled: false
  }
};

function loadStats(){
  try{
    return JSON.parse(localStorage.getItem("hiloTrainerStats")) || {
      cards:0, correct:0, bestStreak:0, games:0, sessions:[], lastVisit:null, dayStreak:0
    };
  }catch{
    return {cards:0, correct:0, bestStreak:0, games:0, sessions:[], lastVisit:null, dayStreak:0};
  }
}

function saveStats(){
  localStorage.setItem("hiloTrainerStats", JSON.stringify(state.stats));
  renderStats();
}

function updateDayStreak(){
  const today = new Date().toISOString().slice(0,10);
  const last = state.stats.lastVisit;
  if(!last){
    state.stats.dayStreak = 1;
  }else if(last !== today){
    const diff = Math.round((new Date(today)-new Date(last))/86400000);
    state.stats.dayStreak = diff === 1 ? (state.stats.dayStreak || 0)+1 : 1;
  }
  state.stats.lastVisit = today;
  $("streakValue").textContent = state.stats.dayStreak || 1;
  saveStats();
}

function buildShoe(deckCount){
  const cards = [];
  for(let d=0; d<deckCount; d++){
    for(const suit of SUITS){
      for(const rank of RANKS) cards.push({rank,suit});
    }
  }
  for(let i=cards.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [cards[i],cards[j]]=[cards[j],cards[i]];
  }
  return cards;
}

function hiloValue(rank){
  if(["2","3","4","5","6"].includes(rank)) return 1;
  if(["7","8","9"].includes(rank)) return 0;
  return -1;
}

function cardHtml(card, mini=false, hidden=false){
  if(hidden) return `<div class="${mini?"mini-card":"playing-card"} hidden-card"></div>`;
  const red = card.suit==="♥" || card.suit==="♦";
  return `<div class="${mini?"mini-card":"playing-card"} ${red?"red":""}">
    <div class="card-rank">${card.rank}</div>
    <div class="card-center">${card.suit}</div>
    <div class="card-suit">${card.suit}</div>
  </div>`;
}

function resetTrainer(){
  const decks = Number($("deckCount").value);
  state.shoe = buildShoe(decks);
  state.running = 0;
  state.currentCards = [];
  state.revealed = false;
  state.history = [];
  state.attempts = 0;
  state.correct = 0;
  state.currentStreak = 0;
  state.bestStreak = 0;
  state.startedAt = Date.now();
  startTimer();
  $("countGuess").value = "";
  $("cardStage").innerHTML = `<div class="playing-card card-back"><div class="card-logo">HI‑LO</div></div>`;
  setFeedback("Otoč první kartu a drž průběžný součet v hlavě.","neutral");
  updateTrainerUI();
}

function drawTrainerCard(){
  if(state.revealed){
    setFeedback("Nejdřív zkontroluj svůj odhad.","bad");
    return;
  }
  if(!state.shoe.length){
    finishSession();
    setFeedback("Balíček je prázdný. Resetuj trénink.","good");
    return;
  }

  const mode = $("trainerMode").value;
  const count = mode==="pairs" ? 2 : 1;
  state.currentCards = [];
  for(let i=0;i<count && state.shoe.length;i++) state.currentCards.push(state.shoe.pop());

  $("cardStage").innerHTML = state.currentCards.map(c=>cardHtml(c)).join("");
  state.revealed = true;
  $("countGuess").focus();

  if(mode==="speed"){
    setTimeout(()=>{
      if(state.revealed) revealCorrectCount(false);
    },1300);
  }
  updateTrainerUI();
}

function checkGuess(){
  if(!state.revealed){
    setFeedback("Nejdřív otoč kartu.","bad");
    return;
  }
  const guess = Number($("countGuess").value);
  if(!Number.isFinite(guess)){
    setFeedback("Zadej svůj odhad running countu.","bad");
    return;
  }

  const newRunning = state.running + state.currentCards.reduce((sum,c)=>sum+hiloValue(c.rank),0);
  state.attempts++;
  state.stats.cards += state.currentCards.length;

  if(guess === newRunning){
    state.correct++;
    state.currentStreak++;
    state.bestStreak=Math.max(state.bestStreak,state.currentStreak);
    state.stats.correct++;
    state.stats.bestStreak=Math.max(state.stats.bestStreak || 0,state.currentStreak);
    setFeedback(`Správně. Running count je ${formatSigned(newRunning)}.`,"good");
  }else{
    state.currentStreak=0;
    setFeedback(`Vedle. Správný running count je ${formatSigned(newRunning)}.`,"bad");
  }

  commitCurrentCards(newRunning);
}

function revealCorrectCount(trackAttempt=true){
  if(!state.revealed) return;
  const newRunning = state.running + state.currentCards.reduce((sum,c)=>sum+hiloValue(c.rank),0);
  if(trackAttempt){
    state.attempts++;
    state.currentStreak=0;
    state.stats.cards += state.currentCards.length;
  }
  setFeedback(`Správný running count je ${formatSigned(newRunning)}.`,"neutral");
  commitCurrentCards(newRunning);
}

function commitCurrentCards(newRunning){
  state.running = newRunning;
  state.history.push(...state.currentCards);
  state.currentCards = [];
  state.revealed = false;
  $("countGuess").value = "";
  saveStats();
  updateTrainerUI();
}

function updateTrainerUI(){
  const decksLeft = Math.max(state.shoe.length/52,0.01);
  const trueCount = state.running/decksLeft;
  $("runningCount").textContent = formatSigned(state.running);
  $("trueCount").textContent = formatSigned(trueCount.toFixed(2));
  $("cardsLeft").textContent = state.shoe.length;
  $("accuracy").textContent = state.attempts ? `${Math.round(state.correct/state.attempts*100)}%` : "100%";
  $("decksLeftLabel").textContent = `${(state.shoe.length/52).toFixed(2)} balíčku zbývá`;
  $("history").innerHTML = state.history.slice(-18).map(c=>`<span class="history-chip">${c.rank}${c.suit}</span>`).join("");

  const signal = $("countSignal");
  if(trueCount>=2){
    signal.className="signal good";
    signal.textContent="Více vysokých karet";
  }else if(trueCount<=0){
    signal.className="signal bad";
    signal.textContent="Nevýhodný / neutrální shoe";
  }else{
    signal.className="signal neutral";
    signal.textContent="Mírně pozitivní shoe";
  }
}

function setFeedback(text,type){
  const box=$("trainerFeedback");
  box.textContent=text;
  box.className=`feedback ${type}`;
}

function startTimer(){
  clearInterval(state.timerId);
  state.timerId=setInterval(()=>{
    if(!state.startedAt) return;
    const sec=Math.floor((Date.now()-state.startedAt)/1000);
    $("timerValue").textContent=`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
  },1000);
}

function finishSession(){
  if(!state.startedAt || state.attempts===0) return;
  const duration=Math.floor((Date.now()-state.startedAt)/1000);
  state.stats.sessions.unshift({
    date:new Date().toLocaleString("cs-CZ"),
    cards:state.history.length,
    accuracy:Math.round(state.correct/state.attempts*100),
    duration
  });
  state.stats.sessions=state.stats.sessions.slice(0,10);
  saveStats();
  state.startedAt=null;
  clearInterval(state.timerId);
}

function formatSigned(value){
  const n=Number(value);
  if(n>0) return `+${value}`;
  return String(value);
}

// Tabs
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active-panel"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active-panel");
  });
});

// Blackjack simulation
function resetGameShoe(){
  state.game.shoe=buildShoe(6);
}

function handValue(hand){
  let total=0, aces=0;
  hand.forEach(c=>{
    if(c.rank==="A"){total+=11;aces++}
    else if(["K","Q","J"].includes(c.rank)) total+=10;
    else total+=Number(c.rank);
  });
  while(total>21 && aces>0){total-=10;aces--}
  return {total,soft:aces>0};
}

function drawGameCard(){
  if(state.game.shoe.length<40) resetGameShoe();
  return state.game.shoe.pop();
}

function renderGame(showDealer=false){
  $("playerHand").innerHTML=state.game.player.map(c=>cardHtml(c,true)).join("");
  $("dealerHand").innerHTML=state.game.dealer.map((c,i)=>cardHtml(c,true,!showDealer && i===1)).join("");
  $("playerTotal").textContent=handValue(state.game.player).total;
  $("dealerTotal").textContent=showDealer?handValue(state.game.dealer).total:"?";
  $("bankroll").textContent=state.game.bankroll.toLocaleString("cs-CZ");
  $("betAmount").textContent=state.game.bet.toLocaleString("cs-CZ");
}

function dealGame(){
  if(state.game.active) return;
  if(state.game.bet>state.game.bankroll){
    gameFeedback("Nemáš dost tréninkového bankrollu.","bad");
    return;
  }
  state.game.player=[drawGameCard(),drawGameCard()];
  state.game.dealer=[drawGameCard(),drawGameCard()];
  state.game.active=true;
  state.game.doubled=false;
  setGameButtons(true);
  renderGame(false);
  updateStrategyHint();

  const p=handValue(state.game.player).total;
  const d=handValue(state.game.dealer).total;
  if(p===21 || d===21) settleGame();
  else gameFeedback("Jsi na tahu.","neutral");
}

function hitGame(){
  if(!state.game.active) return;
  state.game.player.push(drawGameCard());
  renderGame(false);
  if(handValue(state.game.player).total>21) settleGame();
  else updateStrategyHint();
}

function standGame(){
  if(!state.game.active) return;
  dealerPlay();
}

function doubleGame(){
  if(!state.game.active || state.game.player.length!==2) return;
  if(state.game.bet*2>state.game.bankroll){
    gameFeedback("Na double nemáš dost bankrollu.","bad");
    return;
  }
  state.game.bet*=2;
  state.game.doubled=true;
  state.game.player.push(drawGameCard());
  renderGame(false);
  if(handValue(state.game.player).total>21) settleGame();
  else dealerPlay();
}

function dealerPlay(){
  while(handValue(state.game.dealer).total<17) state.game.dealer.push(drawGameCard());
  settleGame();
}

function settleGame(){
  const p=handValue(state.game.player).total;
  const d=handValue(state.game.dealer).total;
  let result="push";

  if(p>21) result="lose";
  else if(d>21 || p>d) result="win";
  else if(p<d) result="lose";

  if(result==="win"){
    state.game.bankroll += state.game.bet;
    gameFeedback("Výhra v simulaci.","good");
  }else if(result==="lose"){
    state.game.bankroll -= state.game.bet;
    gameFeedback("Prohra v simulaci.","bad");
  }else{
    gameFeedback("Push – remíza.","neutral");
  }

  state.stats.games++;
  saveStats();
  state.game.active=false;
  setGameButtons(false);
  renderGame(true);
  state.game.bet=100;
  $("betAmount").textContent=state.game.bet;
}

function setGameButtons(active){
  $("hitBtn").disabled=!active;
  $("standBtn").disabled=!active;
  $("doubleBtn").disabled=!active;
  $("dealBtn").disabled=active;
}

function gameFeedback(text,type){
  const box=$("gameFeedback");
  box.textContent=text;
  box.className=`feedback ${type}`;
}

function updateStrategyHint(){
  const action = recommendAction(state.game.player,state.game.dealer[0]);
  $("strategyHint").textContent=`Basic strategy doporučuje: ${action.label}. ${action.reason}`;
}

function normalizeRank(rank){
  return ["J","Q","K"].includes(rank) ? "10" : rank;
}

function recommendAction(playerCards,dealerCard){
  const dealer = normalizeRank(dealerCard.rank);
  const d = dealer==="A" ? 11 : Number(dealer);
  const info = handValue(playerCards);
  const pair = playerCards.length===2 && normalizeRank(playerCards[0].rank)===normalizeRank(playerCards[1].rank);

  if(pair){
    const r=normalizeRank(playerCards[0].rank);
    if(r==="A" || r==="8") return {label:"SPLIT",reason:"Tento pár se standardně rozděluje."};
    if(r==="10") return {label:"STAND",reason:"Dvacítku nerozděluj."};
    if(r==="9") return (d>=2&&d<=6)||d===8||d===9 ? {label:"SPLIT",reason:"Výhodný split proti této kartě."}:{label:"STAND",reason:"Proti 7, 10 nebo A je lepší stát."};
    if(r==="7") return d>=2&&d<=7 ? {label:"SPLIT",reason:"Rozdělení proti slabšímu dealerovi."}:{label:"HIT",reason:"Proti silné kartě dealera vezmi kartu."};
    if(r==="6") return d>=2&&d<=6 ? {label:"SPLIT",reason:"Rozdělení proti slabšímu dealerovi."}:{label:"HIT",reason:"Jinak vezmi kartu."};
    if(r==="5") return d>=2&&d<=9 ? {label:"DOUBLE",reason:"Desítka je silná pro double."}:{label:"HIT",reason:"Proti 10 nebo A vezmi kartu."};
    if(r==="4") return d===5||d===6 ? {label:"SPLIT",reason:"Split pouze proti 5 nebo 6."}:{label:"HIT",reason:"Jinak vezmi kartu."};
    if(r==="3"||r==="2") return d>=2&&d<=7 ? {label:"SPLIT",reason:"Rozdělení proti 2 až 7."}:{label:"HIT",reason:"Jinak vezmi kartu."};
  }

  if(info.soft){
    if(info.total>=19) return {label:"STAND",reason:"Soft 19 nebo více se běžně drží."};
    if(info.total===18){
      if(d>=3&&d<=6) return {label:"DOUBLE",reason:"Soft 18 proti slabému dealerovi."};
      if(d===2||d===7||d===8) return {label:"STAND",reason:"Tady je nejlepší stát."};
      return {label:"HIT",reason:"Proti 9, 10 nebo A vezmi kartu."};
    }
    if(info.total===17) return d>=3&&d<=6 ? {label:"DOUBLE",reason:"Soft 17 proti 3 až 6."}:{label:"HIT",reason:"Jinak vezmi kartu."};
    if(info.total===15||info.total===16) return d>=4&&d<=6 ? {label:"DOUBLE",reason:"Double proti 4 až 6."}:{label:"HIT",reason:"Jinak vezmi kartu."};
    if(info.total===13||info.total===14) return d>=5&&d<=6 ? {label:"DOUBLE",reason:"Double proti 5 nebo 6."}:{label:"HIT",reason:"Jinak vezmi kartu."};
  }

  const t=info.total;
  if(t>=17) return {label:"STAND",reason:"Tvrdých 17 nebo více se standardně drží."};
  if(t>=13&&t<=16) return d>=2&&d<=6 ? {label:"STAND",reason:"Dealer má slabou kartu."}:{label:"HIT",reason:"Proti silnému dealerovi vezmi kartu."};
  if(t===12) return d>=4&&d<=6 ? {label:"STAND",reason:"Dealer 4 až 6 má vyšší riziko bustu."}:{label:"HIT",reason:"Jinak vezmi kartu."};
  if(t===11) return {label:"DOUBLE",reason:"Jedenáctka je nejlepší standardní double."};
  if(t===10) return d>=2&&d<=9 ? {label:"DOUBLE",reason:"Desítka proti 2 až 9."}:{label:"HIT",reason:"Proti 10 nebo A vezmi kartu."};
  if(t===9) return d>=3&&d<=6 ? {label:"DOUBLE",reason:"Devítka proti 3 až 6."}:{label:"HIT",reason:"Jinak vezmi kartu."};
  return {label:"HIT",reason:"Nízký součet potřebuje další kartu."};
}

// Strategy calculator
function parseCards(text){
  return text.split(/[,\s]+/).map(x=>x.trim().toUpperCase()).filter(Boolean).map(rank=>({rank,suit:"♠"}));
}

function calculateStrategy(){
  const cards=parseCards($("playerCardsInput").value);
  if(cards.length<2 || cards.some(c=>!RANKS.includes(c.rank))){
    $("strategyResult").textContent="Neplatné karty";
    $("strategyReason").textContent="Použij například A,7 nebo 10,6.";
    return;
  }
  const dealer={rank:$("dealerUpcard").value,suit:"♠"};
  const action=recommendAction(cards,dealer);
  $("strategyResult").textContent=action.label;
  $("strategyReason").textContent=action.reason;
}

// Stats
function renderStats(){
  $("statsCards").textContent=state.stats.cards||0;
  $("statsCorrect").textContent=state.stats.correct||0;
  $("statsBestStreak").textContent=state.stats.bestStreak||0;
  $("statsGames").textContent=state.stats.games||0;
  $("streakValue").textContent=state.stats.dayStreak||1;
  const list=$("sessionList");
  if(!state.stats.sessions?.length){
    list.innerHTML=`<div class="empty-state">Zatím žádné dokončené tréninky.</div>`;
    return;
  }
  list.innerHTML=state.stats.sessions.map(s=>`
    <div class="session-item">
      <div><strong>${s.cards} karet</strong><br><span>${s.date}</span></div>
      <div><strong>${s.accuracy}%</strong><br><span>${Math.floor(s.duration/60)}:${String(s.duration%60).padStart(2,"0")}</span></div>
    </div>`).join("");
}

// Install prompt
window.addEventListener("beforeinstallprompt",(e)=>{
  e.preventDefault();
  state.pendingInstall=e;
  $("installBtn").classList.remove("hidden");
});
$("installBtn").addEventListener("click",async()=>{
  if(!state.pendingInstall) return;
  state.pendingInstall.prompt();
  await state.pendingInstall.userChoice;
  state.pendingInstall=null;
  $("installBtn").classList.add("hidden");
});

// Events
$("resetTrainer").addEventListener("click",()=>{finishSession();resetTrainer()});
$("deckCount").addEventListener("change",()=>{finishSession();resetTrainer()});
$("drawCard").addEventListener("click",drawTrainerCard);
$("checkGuess").addEventListener("click",checkGuess);
$("skipGuess").addEventListener("click",()=>revealCorrectCount(true));
$("countGuess").addEventListener("keydown",(e)=>{if(e.key==="Enter") checkGuess()});

$("dealBtn").addEventListener("click",dealGame);
$("hitBtn").addEventListener("click",hitGame);
$("standBtn").addEventListener("click",standGame);
$("doubleBtn").addEventListener("click",doubleGame);
document.querySelectorAll(".chip-btn").forEach(btn=>btn.addEventListener("click",()=>{
  if(state.game.active) return;
  const next=state.game.bet+Number(btn.dataset.chip);
  if(next<=state.game.bankroll) state.game.bet=next;
  renderGame(false);
}));
$("calculateStrategy").addEventListener("click",calculateStrategy);
$("clearStats").addEventListener("click",()=>{
  if(confirm("Opravdu chceš vymazat statistiky?")){
    state.stats={cards:0,correct:0,bestStreak:0,games:0,sessions:[],lastVisit:new Date().toISOString().slice(0,10),dayStreak:1};
    saveStats();
  }
});

window.addEventListener("beforeunload",finishSession);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
}

updateDayStreak();
resetTrainer();
resetGameShoe();
renderGame(false);
renderStats();
