/* HEISTFALL smartphone: replaces the old scrolling "PHONE" panel with a real phone that slides in from the right
   (home screen, apps, notifications, settings). Same open/close entry points as before (togPh / phRender / P key). */
(function(){'use strict';
try{
const $=id=>document.getElementById(id);
const HF=window.HF||{};
const PK=(0,eval)('(()=>({S,PH,run,CFG,FAC,REG,BD,JR,SIDEQ,DS,PTAB}))');
const setPH=(0,eval)('v=>{PH=v;paused=!!v}');
const G=()=>{try{return PK()}catch(e){return{}}};
const el=$('ph');if(!el)return;
el.classList.add('np');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const click=()=>{try{window.sfx&&sfx(720,.035,'square')}catch(e){}};
const buzz=()=>{try{if(HF.android&&navigator.vibrate&&G().CFG.haptic!==false)navigator.vibrate(6)}catch(e){}};

/* ---------- notifications: every banner the game shows is kept in Messages ---------- */
const MSG=[];let unread=0;
(function(){const ob=window.banner;if(typeof ob!=='function')return;
  window.banner=function(t){try{if(t){const s=G().S||{};MSG.unshift({t:String(t),h:s.tm||0,k:/^MISSION PASSED|\$|\+/i.test(t)?'cash':/fail|abandon|busted|wasted|died/i.test(t)?'warn':/mission|job|quest|story/i.test(t)?'job':'sys'});if(MSG.length>40)MSG.pop();if(!G().PH)unread++;else if(view==='msgs')unread=0}}catch(e){}return ob.apply(this,arguments)}})();
const fmtT=h=>{h=((h||0)%24+24)%24;return String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor((h%1)*60)).padStart(2,'0')};

/* ---------- apps ---------- */
const THEMES=['neon','sunset','forest','mono'];
function travelList(){
  const {BD,REG,DS}=G(),out=[];
  const sp=BD.filter(b=>b.sp);sp.forEach((b,i)=>out.push({n:b.nm,c:'Places',go:()=>window.tpTo(i)}));
  out.push({n:'Beach pier',c:'Places',go:()=>window.tpS()});
  [['Zoo',240,-90],['Forest',-200,-60],['Farm',-50,-215],['Golf course',70,-205],['Village',-245,70],['Lake',130,-190],['Mountain',170,-235]].forEach(a=>out.push({n:a[0],c:'Places',go:()=>window.tpZ(a[1],a[2],a[0])}));
  REG.forEach(r=>out.push({n:r.n,c:'Districts',go:()=>window.tpZ(r.x,r.z+(r.n=='CONTAINER PORT'||r.n=='AIRPORT'?25:0),r.n)}));
  out.push({n:'Island resort',c:'Places',go:()=>window.tpZ(320,DS+470,'Island resort')});
  return out;
}
let TR=[];
const APPS=[
 {id:'msgs',n:'Messages',ic:'✉️',a:'#5ee27a',b:'#1d9d4a',badge:()=>unread,r:()=>{
   return h('Messages',MSG.length+' recent')+(MSG.length?MSG.map(m=>'<div class="msg"><i>'+({cash:'💵',warn:'⚠️',job:'💼',sys:'📡'}[m.k])+'</i><div><b>'+({cash:'PAYMENT',warn:'ALERT',job:'JOBS',sys:'CITY'}[m.k])+' · <time>'+fmtT(m.h)+'</time></b><span>'+esc(m.t)+'</span></div></div>').join('')+'<div style="margin-top:10px"><button class="btn" data-act="msgclr">Clear all</button></div>':'<div class="empty">No messages yet.<br>Mission results, payments and city alerts show up here.</div>')}},
 {id:'jobs',n:'Jobs',ic:'💼',a:'#ffb347',b:'#ff6a3d',r:()=>{
   const {S,JR}=G(),ms=S.ms;
   return h('Jobs','$'+(S.sc||0))+'<h4>ACTIVE JOB</h4>'+(ms?'<div class="card"><div class="row2"><b>'+esc(String(ms.t).toUpperCase())+'</b><span class="tag">IN PROGRESS</span></div><small>'+esc(ms.txt||'')+'</small></div><button class="btn red" data-act="abandon" style="width:100%">Abandon job</button>':'<div class="card"><small>No active job. Offers refresh daily. Accept jobs at Taxi HQ, City Hall, the Bar, or ask townspeople for work.</small></div>')+
   '<h4>TODAY\u2019S OFFERS</h4>'+((S.jobs||[]).length?(S.jobs||[]).map(j=>'<div class="card"><div class="row2"><b>'+esc(j.title)+'</b><span class="tag">~$'+(JR[j.t]||0)+'</span></div><small>'+esc(j.brief)+'</small></div>').join(''):'<div class="empty">No offers right now.</div>')}},
 {id:'story',n:'Story',ic:'📖',a:'#b57bff',b:'#6a3dd6',r:()=>{
   const {S,SIDEQ}=G();let qp=0,qt='';try{qp=window.questProg();qt=window.questTitle()}catch(e){}
   return h('Story',qp+'%')+'<div class="card"><b>'+esc(qt||'Not started')+'</b><small>'+esc(S.ms&&S.ms.t=='story'?S.ms.txt:'Start a new story from the main menu')+'</small><div class="bar2"><i style="width:'+qp+'%"></i></div></div><h4>SIDE QUESTS</h4>'+
   SIDEQ.map(q=>{const dn=S.sideDone&&S.sideDone[q[0]],v=Math.min(q[4],q[3]());return'<div class="card"><div class="row2"><b>'+esc(q[1])+(dn?' \u2713':'')+'</b><span class="tag">$'+q[5]+'</span></div><small>'+esc(q[2])+'</small><div class="bar2"><i style="width:'+(dn?100:v/q[4]*100)+'%"></i></div></div>'}).join('')}},
 {id:'gps',n:'GPS',ic:'📍',a:'#ff6b6b',b:'#c8243a',r:()=>{
   TR=travelList();const cats=['All',...new Set(TR.map(t=>t.c))];
   return h('GPS','Fast travel')+'<input type="text" id="phq" placeholder="Search places\u2026" value="'+esc(gq)+'" autocomplete="off"><div class="btns" style="margin:8px 0">'+cats.map(c=>'<button class="btn '+(gc===c?'sel':'')+'" data-act="gcat:'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div><div id="phlist">'+gpsList()+'</div>'}},
 {id:'fac',n:'Factions',ic:'🏴',a:'#ffd24a',b:'#c88a00',r:()=>{
   const {S,FAC}=G();
   return h('Factions','Reputation')+FAC.map(a=>{const rp=(S.rep&&S.rep[a.id])||0;return'<div class="card" style="border-left:3px solid '+a.c+'"><div class="row2"><b style="color:'+a.c+'">'+esc(a.n)+'</b><span class="tag">REP '+rp+'</span></div><small>'+esc(a.g)+'</small><div class="bar2"><i style="width:'+Math.max(0,Math.min(100,rp))+'%;background:'+a.c+'"></i></div></div>'}).join('')}},
 {id:'wx',n:'Weather',ic:'⛅',a:'#5bc0ff',b:'#2c6fd0',r:()=>{
   const {S}=G(),w=S.wz||'clear';
   return h('Weather',fmtT(S.tm))+'<div class="wx"><b>'+Math.round(S.tc||15)+'\u00b0C</b>'+esc(w.toUpperCase())+'</div><h4>TIME OF DAY</h4><div class="btns">'+[['Dawn',6],['Noon',12],['Dusk',18.5],['Midnight',0]].map(t=>'<button class="btn" data-act="time:'+t[1]+'">'+t[0]+'</button>').join('')+'</div><h4>WEATHER</h4><div class="btns">'+['clear','cloudy','rain','storm','fog','snow'].map(x=>'<button class="btn '+(w===x?'sel':'')+'" data-act="wx:'+x+'">'+x+'</button>').join('')+'</div>'}},
 {id:'ev',n:'Alerts',ic:'🚨',a:'#ff8a4d',b:'#d83a1a',r:()=>h('Alerts','City events')+'<div class="card"><small>Trigger a city-wide disaster. The phone closes so you can watch it happen.</small></div><div class="btns"><button class="btn red" data-act="ev:quake">Earthquake</button><button class="btn red" data-act="ev:fire">Wildfire</button></div>'},
 {id:'stats',n:'Stats',ic:'📊',a:'#4dd6c8',b:'#12857a',r:()=>{
   const {S,SIDEQ}=G(),done=Object.keys(S.sideDone||{}).length;let qp=0;try{qp=window.questProg()}catch(e){}
   const tl=S.tl||{};
   return h('Stats','Profile')+'<div class="stat2"><div class="card"><small>CASH</small><b>$'+(S.sc||0)+'</b></div><div class="card"><small>STORY</small><b>'+qp+'%</b></div><div class="card"><small>SIDE QUESTS</small><b>'+done+'/'+SIDEQ.length+'</b></div><div class="card"><small>SIGNAL CHIPS</small><b>'+(S.chips||0)+'</b></div><div class="card"><small>ON FOOT</small><b>'+Math.round((tl.m||0))+' m</b></div><div class="card"><small>TEMPERATURE</small><b>'+Math.round(S.tc||15)+'\u00b0C</b></div></div>'}},
 {id:'set',n:'Settings',ic:'⚙️',a:'#aab3c8',b:'#4b5368',r:()=>{
   const {CFG}=G();
   const sl=(k,lab,min,max,sc,sub,def)=>'<div class="set"><span>'+lab+(sub?'<small>'+sub+'</small>':'')+'</span><input type="range" min="'+min+'" max="'+max+'" value="'+Math.round((CFG[k]!=null?CFG[k]:(def==null?1:def))*sc)+'" data-cfg="'+k+'" data-sc="'+sc+'"></div>';
   const tg=(k,lab,def,sub)=>{const on=CFG[k]===undefined?def:!!CFG[k];return'<div class="set"><span>'+lab+(sub?'<small>'+sub+'</small>':'')+'</span><button class="tgl '+(on?'on':'')+'" data-act="tog:'+k+':'+(def?1:0)+'" aria-label="'+lab+'"></button></div>'};
   const seg=(k,lab,opts,cur)=>'<div class="set"><span>'+lab+'</span><div class="seg">'+opts.map(o=>'<button class="btn '+(String(cur)===String(o[1])?'sel':'')+'" data-act="cfg:'+k+':'+o[1]+'">'+o[0]+'</button>').join('')+'</div></div>';
   return h('Settings','')+'<h4>DISPLAY</h4>'+seg('gfx','Graphics',[['Low',0],['Med',1],['High',2],['Ultra',3]],CFG.gfx)+sl('resScale','Resolution',50,100,100,'Lower = faster')+seg('fpsCap','Frame cap',[['Off',0],['30',30],['60',60]],CFG.fpsCap||0)+tg('autoQ','Auto quality',true,'Adjusts resolution to keep FPS up')+tg('fps','Show FPS',false)+tg('perfHud','Performance overlay',false,'Shows what is slow; has a copy-report button')+
   '<h4>GAME</h4>'+sl('vol','Master volume',0,100,100)+sl('sens','Look sensitivity',20,250,100)+sl('fov','Field of view',50,100,1)+sl('day','Day length',20,240,1,'Seconds per in-game hour')+tg('tut','Hints',true)+
   '<h4>CONTROLS</h4>'+seg('touch','Touch controls',[['Auto','auto'],['On','on'],['Off','off']],CFG.touch||'auto')+(HF.touch?sl('tScale','Button size',70,150,100,'',1)+sl('tOp','Button opacity',30,100,100,'',.78)+sl('tSens','Touch look speed',50,200,100,'',1)+tg('tLeft','Left-handed layout',false,'Mirrors the controls')+tg('tFixed','Fixed stick',false,'Stick stays in the corner')+tg('autoRun','Auto-sprint',true,'Push the stick to the edge')+tg('tLabels','Button labels',true)+tg('haptic','Vibration',true):'')+
   '<h4>PHONE</h4><div class="set"><span>Wallpaper</span><div class="seg">'+THEMES.map(t=>'<button class="btn '+((CFG.phTheme||'neon')===t?'sel':'')+'" data-act="theme:'+t+'">'+t[0].toUpperCase()+t.slice(1)+'</button>').join('')+'</div></div><div style="margin-top:12px"><button class="btn" data-act="fullset" style="width:100%">Open full settings\u2026</button></div>'}}
];
let gq='',gc='All';
function gpsList(){
  const q=gq.trim().toLowerCase();let n=0;
  const html=TR.map((t,i)=>({t,i})).filter(o=>(gc==='All'||o.t.c===gc)&&(!q||o.t.n.toLowerCase().includes(q))).map(o=>{n++;return'<div class="card" style="padding:0"><button class="btn go" data-act="go:'+o.i+'"><span>'+esc(o.t.n)+'</span><small>'+esc(o.t.c)+' \u203a</small></button></div>'}).join('');
  return n?html:'<div class="empty">No matching places.</div>';
}
function h(t,sub){return'<h2>'+esc(t)+(sub?'<small>'+esc(sub)+'</small>':'')+'</h2>'}

/* ---------- shell ---------- */
let view='home',stack=[],timer=0,body,statClk,statBat;
const app=id=>APPS.find(a=>a.id===id);
function shell(){
  const th=G().CFG.phTheme||'neon';
  el.innerHTML='<div class="pd-bk" data-act="close"></div><div class="pd"><i class="pd-btn b1"></i><i class="pd-btn b2"></i><i class="pd-btn b3"></i><div class="pd-shell"><div class="scr" data-th="'+th+'"><div class="wall"></div><div class="notch"></div>'+
   '<div class="stat"><span id="phclk"></span><span><span class="sig"><i style="height:3px"></i><i style="height:5px"></i><i style="height:7px"></i><i style="height:9px"></i></span>5G<span class="bat"><i style="width:78%"></i></span></span></div>'+
   '<div class="body" id="phbody"></div><div class="navb"><button data-act="back" aria-label="Back">\u25c0</button><button data-act="home" aria-label="Home">\u25cf</button><button data-act="close" aria-label="Close phone">\u2715</button></div></div></div></div>';
  body=$('phbody');statClk=$('phclk');
}
function render(anim){
  if(!G().S)return;
  if(!el.firstChild||!body||!body.isConnected)shell();
  const scr=el.querySelector('.scr');if(scr)scr.dataset.th=G().CFG.phTheme||'neon';
  let html='';
  if(view==='home'){
    const S=G().S,w=(S.wz||'clear');
    html='<div class="pclk"><b>'+fmtT(S.tm)+'</b><small>$'+(S.sc||0)+' \u00b7 '+Math.round(S.tc||15)+'\u00b0C \u00b7 '+esc(w)+'</small></div>'+
     '<div class="grid">'+APPS.map(a=>{const b=a.badge?a.badge():0;return'<button class="app" data-act="open:'+a.id+'" style="--c1:'+a.a+';--c2:'+a.b+'"><i>'+a.ic+'</i><span>'+a.n+'</span>'+(b?'<b class="bd">'+(b>9?'9+':b)+'</b>':'')+'</button>'}).join('')+'</div>'+
     '<div class="wid"><div><b>'+(S.ms?esc(String(S.ms.t).toUpperCase()):'No active job')+'</b><br><small>'+(S.ms?esc((S.ms.txt||'').slice(0,60)):'Open Jobs to see today\u2019s offers')+'</small></div><button class="btn" data-act="open:jobs">\u203a</button></div>';
  }else{const a=app(view);html=a?a.r():''}
  const keep=body.scrollTop,same=body.dataset.v===view;
  body.innerHTML=html;body.dataset.v=view;
  if(anim){body.classList.remove('in');void body.offsetWidth;body.classList.add('in');body.scrollTop=0}else if(same)body.scrollTop=keep;
  if(view==='msgs')unread=0;
  tick();
}
function tick(){if(statClk)statClk.textContent=fmtT(G().S.tm)}
function nav(v){click();buzz();if(v!==view){if(view!=='home')stack.push(view);else stack=[];}view=v;render(true)}
function goHome(){view='home';stack=[];render(true)}
function goBack(){if(view==='home'){close();return}view=stack.pop()||'home';render(true)}

/* ---------- open / close ---------- */
let closeT=0;
function open(){
  clearTimeout(closeT);view='home';stack=[];
  setPH(true);try{document.exitPointerLock&&document.exitPointerLock()}catch(e){}
  const S=G().S;if(S&&S.tl)S.tl.p=1;
  el.style.display='block';shell();render(true);
  void el.offsetWidth;el.classList.add('open');
  clearInterval(timer);timer=setInterval(()=>{if(G().PH&&G().S)tick()},1000);
  try{window.sfx&&sfx(520,.06,'sine')}catch(e){}
}
function close(){
  setPH(false);el.classList.remove('open');clearInterval(timer);
  clearTimeout(closeT);closeT=setTimeout(()=>{if(!G().PH)el.style.display='none'},320);
}
window.togPh=function(){if(!G().S)return;if(G().PH)close();else open()};
window.phRender=function(){if(G().PH)render(false)};

/* ---------- actions ---------- */
function act(a){
  const g=G(),CFG=g.CFG,S=g.S;
  const [k,x,y]=a.split(':');
  switch(k){
   case'open':nav(x);break;case'home':click();goHome();break;case'back':click();goBack();break;case'close':close();break;
   case'msgclr':MSG.length=0;unread=0;render(false);break;
   case'abandon':window.endM(0,0);render(false);break;
   case'gcat':gc=a.slice(5);render(false);break;
   case'go':{const t=TR[+x];if(t){t.go();if(G().PH)close()}break}
   case'time':window.setT(+x);break;
   case'wx':S.wz=x;S.wx=90;render(false);break;
   case'ev':close();window.disaster(x==='quake'?'quake':'fire');break;
   case'cfg':{const v=(x==='touch')?y:+y;CFG[x]=v;if(x==='touch'){window.saveCfg();render(false);return}window.saveCfg();if(x==='gfx'||x==='fpsCap')try{window.applyGfx()}catch(e){}render(false);break}
   case'tog':{const def=y==='1',cur=CFG[x]===undefined?def:!!CFG[x];CFG[x]=!cur;window.saveCfg();if(x==='autoQ'&&cur===false){}render(false);break}
   case'theme':CFG.phTheme=x;window.saveCfg();render(false);break;
   case'fullset':close();setTimeout(()=>{try{window.openPause();(0,eval)("PTAB='settings';renderPause()")}catch(e){}},60);break;
  }
}
el.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t||!el.contains(t))return;e.stopPropagation();act(t.dataset.act)});
let sv=0;
el.addEventListener('input',e=>{const t=e.target;
  if(t.id==='phq'){gq=t.value;const l=$('phlist');if(l)l.innerHTML=gpsList();return}
  if(t.dataset&&t.dataset.cfg){const CFG=G().CFG,sc=+t.dataset.sc||1;CFG[t.dataset.cfg]=+t.value/sc;clearTimeout(sv);sv=setTimeout(()=>{window.saveCfg();if(t.dataset.cfg==='resScale')try{window.applyGfx()}catch(e){}},250)}});
/* typing in the search box must never trigger game hotkeys (P would close the phone) */
el.addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT'){e.stopPropagation();if(e.key==='Escape'){e.target.blur();e.preventDefault()}}},false);
el.addEventListener('keyup',e=>{if(e.target&&e.target.tagName==='INPUT')e.stopPropagation()},false);
el.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
/* Backspace = back while the phone is open */
addEventListener('keydown',e=>{if(G().PH&&(e.key==='Backspace')&&!(e.target&&e.target.tagName==='INPUT')){e.preventDefault();goBack()}},true);
/* a world reset must not leave stale messages */
const sp0=window.setPhase;if(typeof sp0==='function')window.setPhase=function(){MSG.length=0;unread=0;return sp0.apply(this,arguments)};
if(HF.debug)console.log('[phone] ready');
}catch(err){console.error('phone.js failed to start (old phone stays active)',err)}
})();
