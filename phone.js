/* HEISTFALL smartphone: replaces the old scrolling "PHONE" panel with a real phone that slides in from the right
   (home screen, apps, notifications, settings). Same open/close entry points as before (togPh / phRender / P key). */
(function(){'use strict';
try{
const $=id=>document.getElementById(id);
const HF=window.HF||{};
const PK=(0,eval)('(()=>({S,PH,run,CFG,FAC,REG,BD,JR,SIDEQ,DS,PTAB,P,MAPL,WX,yaw}))');
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
/* ---------- GPS / Maps data ---------- */
const CATS=[['All','All'],['Saved','\u2605 Saved'],['Recent','Recent'],['Food','Food'],['Fun','Fun'],['Shops','Shops'],['Services','Services'],['Sights','Sights'],['Districts','Districts'],['Nature','Nature']];
const CAT_ICO={Food:'\ud83c\udf5c',Fun:'\ud83c\udfb0',Shops:'\ud83d\udecd\ufe0f',Services:'\ud83c\udfe5',Sights:'\ud83c\udfdb\ufe0f',Districts:'\ud83d\uddfa\ufe0f',Nature:'\ud83c\udf32',Home:'\ud83c\udfe0'};
const CAT_COL={Food:'#ffb347',Fun:'#d77bff',Shops:'#6ee08a',Services:'#5cc8ff',Sights:'#ffd24a',Districts:'#9aa7c7',Nature:'#4fd18b'};
function catOf(n){const u=n.toUpperCase();
  if(/HOSPITAL|CLINIC|POLICE|PRECINCT|FIRE STATION|TAXI|CITY HALL|TOWN HALL|WARDEN HQ|BANK|EXCHANGE|CHURCH|CHAPEL|^HOME$|HOTEL|WORKSHOP/.test(u))return'Services';
  if(/CAFE|DELI|RAMEN|SUSHI|TEA ROOM|DINER|\bPUB\b|\bBAR\b/.test(u))return'Food';
  if(/CLUB|KARAOKE|ARCADE|GAME CENTER|PACHINKO|CASINO|ROULETTE|THEATRE|SAUNA/.test(u))return'Fun';
  if(/BOUTIQUE|ARMS|BOOKSHOP|SKI SHOP|MARKET/.test(u))return'Shops';
  return'Sights'}
const titleCase=n=>n.toLowerCase().replace(/(^|[\s'-])([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/\bHq\b/,'HQ').replace(/\b(\d+)h\b/,'$1H');
const LSJ={get(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const favs=()=>LSJ.get('hf_fav',[]),recents=()=>LSJ.get('hf_recent',[]);
function pushRecent(k){const r=recents().filter(x=>x!==k);r.unshift(k);LSJ.set('hf_recent',r.slice(0,8))}
function travelList(){
  const {BD,REG,DS}=G(),out=[];
  const add=(n,c,x,z,go)=>out.push({key:n,n:titleCase(n),c,x,z,go});
  const sp=BD.filter(b=>b.sp);sp.forEach((b,i)=>add(b.nm,catOf(b.nm),b.cx,b.cz+13,()=>window.tpTo(i)));
  add('Beach pier','Sights',-20,DS+8,()=>window.tpS());
  [['Zoo',240,-90],['Forest',-200,-60],['Farm',-50,-215],['Golf course',70,-205],['Village',-245,70],['Lake',130,-190],['Mountain',170,-235]].forEach(a=>add(a[0],'Nature',a[1],a[2],()=>window.tpZ(a[1],a[2],a[0])));
  REG.forEach(r=>{const zz=r.z+(r.n=='CONTAINER PORT'||r.n=='AIRPORT'?25:0);add(r.n,'Districts',r.x,zz,()=>window.tpZ(r.x,zz,r.n))});
  add('Island resort','Sights',320,DS+470,()=>window.tpZ(320,DS+470,'Island resort'));
  out.forEach(t=>{t.ico=t.key==='HOME'?CAT_ICO.Home:CAT_ICO[t.c]||'\ud83d\udccd'});
  return out}
let TR=[];
const APPS=[
 {id:'msgs',n:'Messages',ic:'✉️',a:'#5ee27a',b:'#1d9d4a',badge:()=>unread,r:()=>{
   return h('Messages',MSG.length+' recent')+(MSG.length?MSG.map(m=>'<div class="msg"><i>'+({cash:'💵',warn:'⚠️',job:'💼',sys:'📡'}[m.k])+'</i><div><b>'+({cash:'PAYMENT',warn:'ALERT',job:'JOBS',sys:'CITY'}[m.k])+' · <time>'+fmtT(m.h)+'</time></b><span>'+esc(m.t)+'</span></div></div>').join('')+'<div style="margin-top:10px"><button class="btn" data-act="msgclr">Clear all</button></div>':'<div class="empty">No messages yet.<br>Mission results, payments and city alerts show up here.</div>')}},
 {id:'jobs',n:'Jobs',ic:'💼',a:'#ffb347',b:'#ff6a3d',r:()=>{
   const {S,JR}=G(),ms=S.ms;
   return h('Jobs','$'+(S.sc||0))+'<h4>ACTIVE JOB</h4>'+(ms?'<div class="card"><div class="row2"><b>'+esc(String(ms.t).toUpperCase())+'</b><span class="tag">IN PROGRESS</span></div><small>'+esc(ms.txt||'')+'</small></div>'+(S.mt?'<button class="btn" data-act="trkmt" style="width:100%;margin-bottom:6px">Track objective</button>':'')+'<button class="btn red" data-act="abandon" style="width:100%">Abandon job</button>':'<div class="card"><small>No active job. Offers refresh daily. Accept jobs at Taxi HQ, City Hall, the Bar, or ask townspeople for work.</small></div>')+
   '<h4>TODAY\u2019S OFFERS</h4>'+((S.jobs||[]).length?(S.jobs||[]).map(j=>'<div class="card"><div class="row2"><b>'+esc(j.title)+'</b><span class="tag">~$'+(JR[j.t]||0)+'</span></div><small>'+esc(j.brief)+'</small></div>').join(''):'<div class="empty">No offers right now.</div>')}},
 {id:'story',n:'Story',ic:'📖',a:'#b57bff',b:'#6a3dd6',r:()=>{
   const {S,SIDEQ}=G();let qp=0,qt='';try{qp=window.questProg();qt=window.questTitle()}catch(e){}
   return h('Story',qp+'%')+'<div class="card"><b>'+esc(qt||'Not started')+'</b><small>'+esc(S.ms&&S.ms.t=='story'?S.ms.txt:'Start a new story from the main menu')+'</small><div class="bar2"><i style="width:'+qp+'%"></i></div>'+(S.mt?'<button class="btn" data-act="trkmt" style="margin-top:6px">Track objective</button>':'')+'</div><h4>SIDE QUESTS</h4>'+
   SIDEQ.map(q=>{const dn=S.sideDone&&S.sideDone[q[0]],v=Math.min(q[4],q[3]());return'<div class="card"><div class="row2"><b>'+esc(q[1])+(dn?' \u2713':'')+'</b><span class="tag">$'+q[5]+'</span></div><small>'+esc(q[2])+'</small><div class="bar2"><i style="width:'+(dn?100:v/q[4]*100)+'%"></i></div></div>'}).join('')}},
 {id:'gps',n:'Maps',ic:'\ud83d\udccd',a:'#ff6b6b',b:'#c8243a',r:()=>{
   TR=travelList();const {S,P}=G(),N=window.HFNAV||{};
   let route='';
   if(S.wp){const d=N.dist||Math.hypot(S.wp.x-P.position.x,S.wp.z-P.position.z);route='<div class="card route"><div class="row2"><div style="min-width:0"><b>\u27a4 '+esc(N.name||'Waypoint')+'</b><br><small>'+fmtD(Math.round(d))+(N.eta?' \u00b7 '+fmtE(N.eta):'')+'</small></div><button class="btn red mini" data-act="wclr">Clear</button></div></div>'}
   const sel=gSel?TR.find(t=>t.key===gSel):null;let sheet='';
   if(sel){const d=dstTo(sel),fav=favs().includes(sel.key);
     sheet='<div class="card sheet"><div class="row2"><b>'+sel.ico+' '+esc(sel.n)+'</b><button class="star'+(fav?' on':'')+'" data-act="fav:'+TR.indexOf(sel)+'" aria-label="Save place">'+(fav?'\u2605':'\u2606')+'</button></div><small>'+esc(sel.c)+' \u00b7 '+fmtD(d)+' \u00b7 '+fmtE(eta(d))+'</small><div class="btns"><button class="btn sel" data-act="trk:'+TR.indexOf(sel)+'">Navigate</button><button class="btn" data-act="go:'+TR.indexOf(sel)+'">Fast travel</button></div></div>'}
   else if(gPin){const d=Math.round(Math.hypot(gPin.x-P.position.x,gPin.z-P.position.z));
     sheet='<div class="card sheet"><div class="row2"><b>\ud83d\udccc Dropped pin</b><button class="star" data-act="pinx" aria-label="Remove pin">\u2715</button></div><small>'+fmtD(d)+' \u00b7 '+fmtE(eta(d))+'</small><div class="btns"><button class="btn sel" data-act="pinnav">Navigate</button><button class="btn" data-act="pingo">Fast travel</button></div></div>'}
   return h('Maps',areaName())+route+'<div class="atl"><canvas id="phmap" aria-label="Map"></canvas><button class="btn atz" data-act="gzoom">'+(gZoom==='near'?'World':'Nearby')+'</button></div>'+(sheet||'<div class="card hint"><small>Tap a dot to select a place, or tap anywhere on the map to drop a pin.</small></div>')+
     '<input type="text" id="phq" placeholder="Search places\u2026" value="'+esc(gq)+'" autocomplete="off"><div class="chips">'+CATS.map(c=>'<button class="btn '+(gc===c[0]?'sel':'')+'" data-act="gcat:'+c[0]+'">'+c[1]+'</button>').join('')+'</div><div id="phlist">'+gpsList()+'</div>'}},
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
   '<h4>GAME</h4>'+sl('vol','Master volume',0,100,100)+sl('sens','Look sensitivity',20,250,100)+sl('fov','Field of view',50,100,1)+sl('day','Day length',20,240,1,'Seconds per in-game hour')+tg('tut','Hints',true)+tg('autosave','Autosave',true,'Every 45 s and when you leave the game')+
   '<h4>CONTROLS</h4>'+seg('touch','Touch controls',[['Auto','auto'],['On','on'],['Off','off']],CFG.touch||'auto')+(HF.touch?sl('tScale','Button size',70,150,100,'',1)+sl('tOp','Button opacity',30,100,100,'',.78)+sl('tSens','Touch look speed',50,200,100,'',1)+tg('tLeft','Left-handed layout',false,'Mirrors the controls')+tg('tFixed','Fixed stick',false,'Stick stays in the corner')+tg('autoRun','Auto-sprint',true,'Push the stick to the edge')+tg('aimAssist','Aim assist',true,'Nudges shots toward nearby hostiles')+tg('tLabels','Button labels',true)+tg('haptic','Vibration',true):'')+
   '<h4>PHONE</h4><div class="set"><span>Wallpaper</span><div class="seg">'+THEMES.map(t=>'<button class="btn '+((CFG.phTheme||'neon')===t?'sel':'')+'" data-act="theme:'+t+'">'+t[0].toUpperCase()+t.slice(1)+'</button>').join('')+'</div></div><div style="margin-top:12px"><button class="btn" data-act="fullset" style="width:100%">Open full settings\u2026</button></div>'}}
];
let gq='',gc='All',gSel='',gPin=null,gZoom='world';
const fmtD=m=>m>=1000?(m/1000).toFixed(1)+' km':m+' m';
const fmtE=s=>s<50?'<1 min':s<3570?Math.round(s/60)+' min':(s/3600).toFixed(1)+' h';
const eta=d=>d/(G().S&&G().S.drv?14:5);          // rough: on foot ~5 m/s, in a vehicle ~14 m/s
function dstTo(t){const P=G().P;return P?Math.round(Math.hypot(t.x-P.position.x,t.z-P.position.z)):0}
function areaName(){const {P,REG,DS}=G();if(!P)return'';let best='',bd=190;for(const r of REG){const d=Math.hypot(r.x-P.position.x,r.z-P.position.z);if(d<bd){bd=d;best=r.n}}
  if(best)return titleCase(best);return(Math.abs(P.position.x)<=DS+4&&Math.abs(P.position.z)<=DS+4)?'Citadel City':'Countryside'}
function gpsList(){
  const q=gq.trim().toLowerCase(),fv=favs(),rc=recents();
  let rows=TR.map((t,i)=>({t,i,d:dstTo(t)}));
  if(gc==='Saved')rows=rows.filter(o=>fv.includes(o.t.key));
  else if(gc==='Recent')rows=rows.filter(o=>rc.includes(o.t.key)).sort((a,b)=>rc.indexOf(a.t.key)-rc.indexOf(b.t.key));
  else if(gc!=='All')rows=rows.filter(o=>o.t.c===gc);
  if(q)rows=rows.filter(o=>o.t.n.toLowerCase().includes(q)||o.t.c.toLowerCase().includes(q));
  if(gc!=='Recent')rows.sort((a,b)=>a.d-b.d);
  rows=rows.slice(0,60);
  if(!rows.length)return'<div class="empty">'+(gc==='Saved'?'Tap the \u2606 on a place to save it here.':gc==='Recent'?'Places you navigate to show up here.':'No matching places.')+'</div>';
  return rows.map(o=>{const on=fv.includes(o.t.key);return'<div class="prow'+(gSel===o.t.key?' sel':'')+'" data-act="sel:'+o.i+'" role="button"><i style="--c:'+(CAT_COL[o.t.c]||'#aab3c8')+'">'+o.t.ico+'</i><div><b>'+esc(o.t.n)+'</b><small>'+esc(o.t.c)+' \u00b7 '+fmtD(o.d)+' \u00b7 '+fmtE(eta(o.d))+'</small></div><button class="star'+(on?' on':'')+'" data-act="fav:'+o.i+'" aria-label="'+(on?'Unsave':'Save')+'">'+(on?'\u2605':'\u2606')+'</button></div>'}).join('')}
/* ---------- atlas inside the phone ---------- */
let AT=null;
function drawAtlas(){
  const cv=$('phmap');if(!cv)return;const g=G(),P=g.P,WX=g.WX||700;
  let M=g.MAPL;if(!M){try{window.mapBuild();M=G().MAPL}catch(e){}}
  const short=innerHeight<520,cs=Math.max(120,Math.min(short?150:210,cv.parentNode.clientWidth||190)),dpr=Math.min(2,window.devicePixelRatio||1);
  cv.style.width=cv.style.height=cs+'px';cv.width=cv.height=Math.round(cs*dpr);const c=cv.getContext('2d');c.scale(dpr,dpr);
  const half=gZoom==='near'?210:WX,cx=gZoom==='near'?P.position.x:0,cz=gZoom==='near'?P.position.z:0,k=cs/(2*half);
  const X=x=>(x-cx)*k+cs/2,Z=z=>(z-cz)*k+cs/2;
  c.fillStyle='#0b1a2c';c.fillRect(0,0,cs,cs);
  if(M&&M.width){const sx=(cx-half+WX)/(2*WX)*M.width,sz=(cz-half+WX)/(2*WX)*M.height,sw=2*half/(2*WX)*M.width,sh=2*half/(2*WX)*M.height;
    const x0=Math.max(0,sx),z0=Math.max(0,sz),x1=Math.min(M.width,sx+sw),z1=Math.min(M.height,sz+sh);
    if(x1>x0&&z1>z0){c.imageSmoothingEnabled=true;c.drawImage(M,x0,z0,x1-x0,z1-z0,(x0-sx)/sw*cs,(z0-sz)/sh*cs,(x1-x0)/sw*cs,(z1-z0)/sh*cs)}}
  c.fillStyle='rgba(5,8,14,.28)';c.fillRect(0,0,cs,cs);
  // places
  for(const t of TR){if(t.c==='Districts')continue;const px=X(t.x),pz=Z(t.z);if(px<2||pz<2||px>cs-2||pz>cs-2)continue;
    c.beginPath();c.arc(px,pz,gSel===t.key?5:2.6,0,7);c.fillStyle=CAT_COL[t.c]||'#fff';c.fill();c.lineWidth=gSel===t.key?2:.8;c.strokeStyle=gSel===t.key?'#fff':'rgba(0,0,0,.6)';c.stroke()}
  if(gZoom==='world'||true){c.font='700 7px system-ui,sans-serif';c.textAlign='center';c.fillStyle='rgba(255,255,255,.7)';for(const t of TR){if(t.c!=='Districts')continue;const px=X(t.x),pz=Z(t.z);if(px>10&&pz>8&&px<cs-10&&pz<cs-4)c.fillText(t.n.toUpperCase(),px,pz)}}
  // waypoint + dropped pin
  const pin=(x,z,col)=>{const px=X(x),pz=Z(z);c.beginPath();c.arc(px,pz,5.5,0,7);c.fillStyle=col;c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke()};
  const S=g.S;if(S.wp)pin(S.wp.x,S.wp.z,'#ffcf33');if(gPin)pin(gPin.x,gPin.z,'#ff4a5e');
  // you
  const px=X(P.position.x),pz=Z(P.position.z),yw=g.yaw||0;   // heading (forward = (-sin yaw, -cos yaw)), clockwise from "up"
    c.save();c.translate(px,pz);c.rotate(Math.atan2(-Math.sin(yw),Math.cos(yw)));c.fillStyle='#5cc8ff';c.strokeStyle='#fff';c.lineWidth=1.6;c.beginPath();c.moveTo(0,-7);c.lineTo(5,6);c.lineTo(0,3);c.lineTo(-5,6);c.closePath();c.fill();c.stroke();c.restore();
  c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=1;c.strokeRect(.5,.5,cs-1,cs-1);
  AT={cs,X,Z,k,cx,cz,half};
  if(!cv._bound){cv._bound=1;cv.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(!AT)return;const r=cv.getBoundingClientRect(),mx=(e.clientX-r.left)*(AT.cs/r.width),mz=(e.clientY-r.top)*(AT.cs/r.height);
    let best=null,bd=14;for(const t of TR){if(t.c==='Districts'&&gZoom==='near')continue;const d=Math.hypot(AT.X(t.x)-mx,AT.Z(t.z)-mz);if(d<bd){bd=d;best=t}}
    if(best){gSel=best.key;gPin=null}else{const WX2=G().WX||700,wx=(mx-AT.cs/2)/AT.k+AT.cx,wz=(mz-AT.cs/2)/AT.k+AT.cz;gPin={x:Math.max(-WX2+6,Math.min(WX2-6,wx)),z:Math.max(-WX2+6,Math.min(WX2-6,wz))};gSel=''}
    click();buzz();render(false)},{passive:false})}
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
  if(view==='gps')try{drawAtlas()}catch(e){console.error('atlas',e)}
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
window.HFPHONE={open(appId){if(!G().S)return;if(!G().PH)open();if(appId&&app(appId)){view=appId;stack=[];render(true)}}};
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
   case'sel':{const t=TR[+x];if(t){gSel=gSel===t.key?'':t.key;gPin=null;render(false);if(body)body.scrollTop=0}break}
   case'fav':{const t=TR[+x];if(t){const f=favs(),i=f.indexOf(t.key);if(i>=0)f.splice(i,1);else f.push(t.key);LSJ.set('hf_fav',f);render(false)}break}
   case'go':{const t=TR[+x];if(t){pushRecent(t.key);t.go();if(G().PH)close()}break}
   case'trk':{const t=TR[+x];if(t&&t.x!=null){pushRecent(t.key);if(window.HFNAV)window.HFNAV.willSet(t.n);window.wpSet(t.x,t.z);close()}break}
   case'pinnav':{if(gPin){if(window.HFNAV)window.HFNAV.willSet('Dropped pin');window.wpSet(gPin.x,gPin.z);close()}break}
   case'pingo':{if(gPin){window.tpZ(gPin.x,gPin.z,'Dropped pin');close()}break}
   case'pinx':gPin=null;render(false);break;
   case'gzoom':gZoom=gZoom==='near'?'world':'near';render(false);break;
   case'wclr':window.wpClear();render(false);break;
   case'trkmt':{const m=S.mt;if(m){window.wpSet(m.x,m.z);close()}break}
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
