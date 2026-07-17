const $=id=>document.getElementById(id),SUITS=["♠","♥","♦","♣"],RANKS=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SYSTEMS={hilo:{name:"Hi-Lo",v:{"2":1,"3":1,"4":1,"5":1,"6":1,"7":0,"8":0,"9":0,"10":-1,J:-1,Q:-1,K:-1,A:-1}},ko:{name:"KO",v:{"2":1,"3":1,"4":1,"5":1,"6":1,"7":1,"8":0,"9":0,"10":-1,J:-1,Q:-1,K:-1,A:-1}},omega:{name:"Omega II",v:{"2":1,"3":1,"4":2,"5":2,"6":2,"7":1,"8":0,"9":-1,"10":-2,J:-2,Q:-2,K:-2,A:0}},halves:{name:"Halves",v:{"2":.5,"3":1,"4":1,"5":1.5,"6":1,"7":.5,"8":0,"9":-.5,"10":-1,J:-1,Q:-1,K:-1,A:-1}}};
let S={shoe:[],running:0,current:[],shown:false,guess:0,history:[],counts:[0],attempts:0,correct:0,streak:0,start:0,timer:null,stats:load(),game:{shoe:[],p:[],d:[],active:false,bank:10000,bet:100}};
function load(){try{return JSON.parse(localStorage.getItem("hiloPro"))||{cards:0,correct:0,best:0,games:0,sessions:[],day:null,daily:0,days:1}}catch{return{cards:0,correct:0,best:0,games:0,sessions:[],daily:0,days:1}}}
function save(){localStorage.setItem("hiloPro",JSON.stringify(S.stats));renderStats()}
function shoe(n){let a=[];for(let d=0;d<n;d++)for(const s of SUITS)for(const r of RANKS)a.push({r,s});for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function val(r){return SYSTEMS[$("system").value].v[r]}function signed(n){return n>0?`+${n}`:`${n}`}
function pipPositions(rank){
  const map={
    "2":[[2,1],[2,5]],
    "3":[[2,1],[2,3],[2,5]],
    "4":[[1,1],[3,1],[1,5],[3,5]],
    "5":[[1,1],[3,1],[2,3],[1,5],[3,5]],
    "6":[[1,1],[3,1],[1,3],[3,3],[1,5],[3,5]],
    "7":[[1,1],[3,1],[2,2],[1,3],[3,3],[1,5],[3,5]],
    "8":[[1,1],[3,1],[2,2],[1,3],[3,3],[2,4],[1,5],[3,5]],
    "9":[[1,1],[3,1],[1,2],[3,2],[2,3],[1,4],[3,4],[1,5],[3,5]],
    "10":[[1,1],[3,1],[2,2],[1,2],[3,2],[1,3],[3,3],[1,4],[3,4],[2,5]]
  };
  return map[rank]||[];
}
function cardFaceHtml(c,mini=false){
  const red=c.s==="♥"||c.s==="♦";
  const rank=c.r;
  let center="";
  if(rank==="A"){
    center=`<div class="ace-pip">${c.s}</div>`;
  }else if(["J","Q","K"].includes(rank)){
    center=`<div class="face-card">${rank}${c.s}</div>`;
  }else{
    const pips=pipPositions(rank).map(([col,row],i)=>{
      const flip=row>=4?" flip-pip":"";
      return `<span class="pip${flip}" style="grid-column:${col};grid-row:${row}">${c.s}</span>`;
    }).join("");
    center=`<div class="pip-grid">${pips}</div>`;
  }
  return `<div class="${mini?"mini":"playing"} ${red?"red":""} card-shine">
    <div class="corner top"><span class="corner-rank">${rank}</span><span class="corner-suit">${c.s}</span></div>
    <div class="pips">${center}</div>
    <div class="corner bottom"><span class="corner-rank">${rank}</span><span class="corner-suit">${c.s}</span></div>
  </div>`;
}
function card(c,mini=false,hidden=false,anim="deal"){
  const cls=anim==="flip"?"card-flip-in":anim==="pop"?"card-pop":"card-deal-in";
  if(hidden)return `<div class="card-wrap ${cls}"><div class="mini hiddenCard back"></div></div>`;
  return `<div class="card-wrap ${cls}">${cardFaceHtml(c,mini)}</div>`;
}
function reset(){S.shoe=shoe(+$("decks").value);S.running=0;S.current=[];S.shown=false;S.guess=0;S.history=[];S.counts=[0];S.attempts=0;S.correct=0;S.streak=0;S.start=Date.now();$("stage").innerHTML='<div class="playing back">HI‑LO</div>';guess(0);feedback("Otoč první kartu.","");clearInterval(S.timer);S.timer=setInterval(()=>{let t=Math.floor((Date.now()-S.start)/1000);$("timer").textContent=`${String(t/60|0).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`},1000);ui()}
function guess(n){S.guess=Math.round(n*2)/2;$("guess").textContent=signed(S.guess)}
function draw(){if(S.shown)return feedback("Nejdřív zkontroluj odhad.","bad");if(!S.shoe.length)return endSession();let m=$("mode").value,n=m==="pairs"?2:m==="casino"?6:1;S.current=[];for(let i=0;i<n&&S.shoe.length;i++)S.current.push(S.shoe.pop());if(m==="casino"){
  $("stage").innerHTML=`<div class="casino">${S.current.map((c,i)=>`<div class="seat"><small>${i===5?"Dealer":`Hráč ${i+1}`}</small><div style="animation-delay:${i*70}ms">${card(c,false,false,"flip")}</div></div>`).join("")}</div>`;
}else{
  $("stage").innerHTML=S.current.map((c,i)=>`<div style="animation-delay:${i*90}ms">${card(c,false,false,"flip")}</div>`).join("");
}S.shown=true;if(m==="speed"||m==="hardcore")setTimeout(()=>{if(S.shown)$("stage").innerHTML='<div class="playing back">COUNT?</div>'},m==="hardcore"?800:+$("speed").value)}
function check(show=false){if(!S.shown)return feedback("Nejdřív otoč kartu.","bad");let next=S.running+S.current.reduce((a,c)=>a+val(c.r),0);S.attempts++;S.stats.cards+=S.current.length;S.stats.daily=(S.stats.daily||0)+S.current.length;if(!show&&S.guess===next){S.correct++;S.stats.correct++;S.streak++;S.stats.best=Math.max(S.stats.best||0,S.streak);feedback(`Správně. Count je ${signed(next)}.`,"good")}else{S.streak=0;feedback(`Správný count je ${signed(next)}.` ,show?"":"bad")}S.running=next;S.history.push(...S.current);S.current=[];S.shown=false;S.counts.push(next);guess(0);save();ui()}
function ui(){let dl=Math.max(S.shoe.length/52,.01),tc=S.running/dl;$("running").textContent=signed(S.running);$("trueCount").textContent=signed(tc.toFixed(2));$("left").textContent=S.shoe.length;$("accuracy").textContent=S.attempts?`${Math.round(S.correct/S.attempts*100)}%`:"100%";$("decksLeft").textContent=`${(S.shoe.length/52).toFixed(2)} balíčku`;$("signal").textContent=tc>=2?"Více vysokých karet":tc<=0?"Nevýhodný / neutrální shoe":"Mírně pozitivní shoe";$("history").innerHTML=S.history.slice(-20).map(c=>`<span>${c.r}${c.s}</span>`).join("");chart()}
function feedback(t,c){$("feedback").textContent=t;$("feedback").className=`feedback ${c}`}
function endSession(){if(S.attempts){let sec=Math.floor((Date.now()-S.start)/1000);S.stats.sessions.unshift({d:new Date().toLocaleString("cs-CZ"),cards:S.history.length,acc:Math.round(S.correct/S.attempts*100),sec});S.stats.sessions=S.stats.sessions.slice(0,10);save()}feedback("Balíček dokončen. Dej Reset.","good")}
function map(){let sys=SYSTEMS[$("system").value],g={};Object.entries(sys.v).forEach(([r,v])=>(g[v]??=[]).push(r));$("mapTitle").textContent=`${sys.name} mapa`;$("map").innerHTML=Object.entries(g).sort((a,b)=>b[0]-a[0]).map(([v,r])=>`<div><strong>${+v>0?"+":""}${v}</strong><span>${r.join(", ")}</span></div>`).join("")}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});
$("minus").onclick=()=>guess(S.guess-1);$("plus").onclick=()=>guess(S.guess+1);$("zero").onclick=()=>guess(0);document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>guess(S.guess+ +b.dataset.d));$("draw").onclick=draw;$("check").onclick=()=>check(false);$("reveal").onclick=()=>check(true);$("reset").onclick=reset;$("decks").onchange=reset;$("system").onchange=()=>{map();reset()};

function hv(h){let t=0,a=0;h.forEach(c=>{if(c.r==="A"){t+=11;a++}else if("KQJ".includes(c.r))t+=10;else t+=+c.r});while(t>21&&a){t-=10;a--}return{t,soft:a>0}}
function gr(){if(S.game.shoe.length<40)S.game.shoe=shoe(6);return S.game.shoe.pop()}
function renderGame(show=false){$("playerHand").innerHTML=S.game.p.map((c,i)=>`<div style="animation-delay:${i*85}ms">${card(c,true,false,"deal")}</div>`).join("");
$("dealerHand").innerHTML=S.game.d.map((c,i)=>`<div style="animation-delay:${i*85}ms">${card(c,true,!show&&i===1,"deal")}</div>`).join("");$("playerTotal").textContent=hv(S.game.p).t;$("dealerTotal").textContent=show?hv(S.game.d).t:"?";$("bankroll").textContent=S.game.bank.toLocaleString("cs-CZ");$("bet").textContent=S.game.bet.toLocaleString("cs-CZ")}
function action(cards,dealer){let d=["J","Q","K"].includes(dealer.r)?10:dealer.r==="A"?11:+dealer.r,v=hv(cards),t=v.t;if(cards.length===2&&(["J","Q","K"].includes(cards[0].r)?10:cards[0].r)===(["J","Q","K"].includes(cards[1].r)?10:cards[1].r)){let r=cards[0].r;if(r==="A"||r==="8")return["SPLIT","Tento pár se standardně rozděluje."];if(["10","J","Q","K"].includes(r))return["STAND","Dvacítku nerozděluj."]}if(v.soft&&t===18)return d>=3&&d<=6?["DOUBLE","Soft 18 proti slabému dealerovi."]:d===2||d===7||d===8?["STAND","Tady je lepší stát."]:["HIT","Proti silné kartě vezmi kartu."];if(t>=17)return["STAND","17 nebo více."];if(t>=13)return d<=6?["STAND","Dealer má slabou kartu."]:["HIT","Dealer má silnou kartu."];if(t===12)return d>=4&&d<=6?["STAND","Dealer 4–6 má vyšší bust šanci."]:["HIT","Vezmi kartu."];if(t===11)return["DOUBLE","Jedenáctka je silný double."];if(t===10)return d<=9?["DOUBLE","Desítka proti 2–9."]:["HIT","Proti 10/A hit."];if(t===9)return d>=3&&d<=6?["DOUBLE","Devítka proti 3–6."]:["HIT","Vezmi kartu."];return["HIT","Nízký součet."]}
function gameMsg(t,c=""){$("gameMsg").textContent=t;$("gameMsg").className=`feedback ${c}`}
function buttons(on){$("deal").disabled=on;$("hit").disabled=!on;$("stand").disabled=!on;$("double").disabled=!on}
$("deal").onclick=()=>{if(S.game.active)return;if(S.game.bet>S.game.bank)return gameMsg("Nedostatek bankrollu.","bad");S.game.p=[gr(),gr()];S.game.d=[gr(),gr()];S.game.active=true;buttons(true);renderGame();let a=action(S.game.p,S.game.d[0]);$("hint").textContent=`Strategie: ${a[0]} – ${a[1]}`;if(hv(S.game.p).t===21||hv(S.game.d).t===21)settle();else gameMsg("Jsi na tahu.")};
$("hit").onclick=()=>{S.game.p.push(gr());renderGame();if(hv(S.game.p).t>21)settle();else{let a=action(S.game.p,S.game.d[0]);$("hint").textContent=`Strategie: ${a[0]} – ${a[1]}`}};
$("stand").onclick=()=>dealerPlay();$("double").onclick=()=>{if(S.game.bet*2>S.game.bank)return gameMsg("Nedostatek bankrollu.","bad");S.game.bet*=2;S.game.p.push(gr());renderGame();hv(S.game.p).t>21?settle():dealerPlay()};
function dealerPlay(){while(hv(S.game.d).t<17)S.game.d.push(gr());settle()}
function settle(){let p=hv(S.game.p).t,d=hv(S.game.d).t;if(p>21||d<=21&&p<d){S.game.bank-=S.game.bet;gameMsg("Prohra.","bad")}else if(d>21||p>d){S.game.bank+=S.game.bet;gameMsg("Výhra.","good")}else gameMsg("Push.");S.stats.games++;save();S.game.active=false;buttons(false);renderGame(true);S.game.bet=100}
document.querySelectorAll("[data-chip]").forEach(b=>b.onclick=()=>{if(!S.game.active&&S.game.bet+ +b.dataset.chip<=S.game.bank){S.game.bet+=+b.dataset.chip;renderGame()}});

$("calc").onclick=()=>{let cs=$("cardsInput").value.toUpperCase().split(/[,\s]+/).filter(Boolean).map(r=>({r,s:"♠"}));if(cs.length<2||cs.some(c=>!RANKS.includes(c.r))){$("result").textContent="Neplatné";$("reason").textContent="Použij A,7 nebo 10,6.";return}let a=action(cs,{r:$("dealerUp").value});$("result").textContent=a[0];$("reason").textContent=a[1]};

const ACH=[["První desítka","10 karet",s=>s.cards>=10],["Sto karet","100 karet",s=>s.cards>=100],["Tisícovka","1 000 karet",s=>s.cards>=1000],["Bez chyby","Série 25",s=>s.best>=25],["Dealerův soupeř","10 her",s=>s.games>=10],["Ostrostřelec","100 správných",s=>s.correct>=100]];
function chart(){let c=$("chart"),x=c.getContext("2d"),a=S.counts.length>1?S.counts:[0],mn=Math.min(...a,-1),mx=Math.max(...a,1),r=mx-mn||1;x.clearRect(0,0,c.width,c.height);x.strokeStyle="#243a55";for(let i=1;i<5;i++){let y=i*c.height/5;x.beginPath();x.moveTo(0,y);x.lineTo(c.width,y);x.stroke()}x.strokeStyle="#4ed7ff";x.lineWidth=4;x.beginPath();a.forEach((v,i)=>{let px=a.length===1?0:i/(a.length-1)*c.width,py=c.height-(v-mn)/r*c.height;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}
function renderStats(){$("statCards").textContent=S.stats.cards||0;$("statCorrect").textContent=S.stats.correct||0;$("statStreak").textContent=S.stats.best||0;$("statGames").textContent=S.stats.games||0;$("achievements").innerHTML=ACH.map(([t,d,f])=>`<div class="achievement ${f(S.stats)?"on":""}"><b>${f(S.stats)?"🏆":"🔒"} ${t}</b><span>${d}</span></div>`).join("");$("sessions").innerHTML=(S.stats.sessions||[]).map(s=>`<div class="session"><span>${s.d}<br>${s.cards} karet</span><b>${s.acc}%</b></div>`).join("")||"<p>Žádné tréninky.</p>";let p=Math.min(S.stats.daily||0,50),pct=Math.round(p/50*100);$("dailyText").textContent=`${p} / 50`;$("dailyPct").textContent=`${pct}%`;$("dailyRing").style.background=`conic-gradient(var(--amber) ${pct*3.6}deg,#1a2a40 0deg)`;$("dayStreak").textContent=S.stats.days||1}
$("clear").onclick=()=>{if(confirm("Vymazat statistiky?")){S.stats={cards:0,correct:0,best:0,games:0,sessions:[],daily:0,days:1,day:new Date().toISOString().slice(0,10)};save()}};
let today=new Date().toISOString().slice(0,10);if(S.stats.day!==today){if(S.stats.day){let diff=Math.round((new Date(today)-new Date(S.stats.day))/86400000);S.stats.days=diff===1?(S.stats.days||1)+1:1}S.stats.day=today;S.stats.daily=0;save()}
let deferred;addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("install").hidden=false});$("install").onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;$("install").hidden=true}};
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
map();reset();S.game.shoe=shoe(6);renderGame();renderStats();
let lastTouchEnd=0;
document.addEventListener("touchend",function(e){
  const now=Date.now();
  if(now-lastTouchEnd<=300)e.preventDefault();
  lastTouchEnd=now;
},{passive:false});
document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});

(function preventIOSZoom(){
  let lastTouch = 0;
  document.addEventListener("touchend", function(e){
    const now = Date.now();
    if (now - lastTouch < 350) {
      e.preventDefault();
      e.stopPropagation();
    }
    lastTouch = now;
  }, {passive:false, capture:true});

  document.addEventListener("touchmove", function(e){
    if (typeof e.scale === "number" && e.scale !== 1) e.preventDefault();
  }, {passive:false});

  ["gesturestart","gesturechange","gestureend"].forEach(type=>{
    document.addEventListener(type, e=>e.preventDefault(), {passive:false});
  });
})();
