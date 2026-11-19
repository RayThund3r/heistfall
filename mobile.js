/* HEISTFALL mobile layer: touch controls (TUI), touch-friendly wording, fullscreen / orientation / audio unlock.
   Loaded after game.js. It only talks to the game through its public globals (keys, TJ, MH, CBT, yaw, pit, S, run, ...). */
(function(){'use strict';
try{
const HF=window.HF||{};
const $=id=>document.getElementById(id);
const PK=(0,eval)('(()=>({S,run,PM,PH,CUT,mode,AC,keys,TJ,CFG,CBT,WM,S0}))');   // reads the game's let/const globals cheaply (they are not on window)
const g=n=>{try{return PK()[n]}catch(e){return undefined}};
const setMH=(0,eval)('v=>{MH=v}'),lookBy=(0,eval)('(dx,dy)=>{yaw-=dx;pit=Math.max(.05,Math.min(1.1,pit+dy))}'),
  callG=(0,eval)('n=>{if(n=="pause")openPause();else if(n=="pulse"){if(S&&!S.over)pulse()}else if(n=="phone"){if(S&&S.ph==4)togPh()}else if(n=="swap"){if(S&&S.wo){const i=S.wo.indexOf(S.wi);S.wi=S.wo[(i+1)%S.wo.length]}}}');
const TUI=window.TUI={on:false,ctx:'',tray:false,lastTouch:0};
window.touchOn=function(){return TUI.on};

/* ---------- when is the touch UI active? ---------- */
function wantTouch(){
  const c=g('CFG')||{};
  if(c.touch==='on'||HF.forceTouch)return true;
  if(c.touch==='off')return false;
  return HF.mobile||TUI.hybridTouch===true;           // 'auto': phones/tablets, or a laptop the moment you touch the screen
}
function sync(){
  const on=wantTouch();
  if(on!==TUI.on){TUI.on=on;document.body.classList.toggle('touchon',on);if(!on)releaseAll();}
  if(!root)return;
  applyPrefs();
  const c=context();
  const mo=!!(g('S')&&g('S').bm);
  root.classList.toggle('mapopen',mo&&on);
  if(c!==TUI.ctx){TUI.ctx=c;if(c!=='foot'){TUI.tray=false;tray.classList.remove('open')}releaseHeld();root.className=root.className.replace(/\bc-\S+/g,'').trim()+' c-'+c;if(mo)root.classList.add('mapopen')}
  rot();
}
/* ---------- control preferences (Phone > Settings > Controls) ---------- */
let prefKey='';
function applyPrefs(){
  const C=g('CFG')||{},k=[C.tScale,C.tOp,C.tLeft,C.tLabels,C.tFixed].join('|');if(k===prefKey)return;prefKey=k;
  root.style.setProperty('--ts',String(Math.max(.7,Math.min(1.5,C.tScale||1))));root.style.setProperty('--to',String(Math.max(.25,Math.min(1,C.tOp==null?.78:C.tOp))));
  root.classList.toggle('lefty',!!C.tLeft);root.classList.toggle('nolabels',C.tLabels===false);
}
/* ---------- which control set? ---------- */
function context(){
  if(!TUI.on)return'none';
  const run=g('run'),S=g('S');
  if(!run||!S)return'none';
  if(g('PM')||g('PH'))return'menu';
  if(g('CUT'))return'cut';
  const dlg=$('dlg');if(dlg&&dlg.style.display==='block'&&dlg.children.length)return'menu';
  if(g('mode')==='commander')return S.over?'none':'warden';
  if(S.over)return'none';
  if(S.ph==4){
    if(S.drv){const t=String(S.drv.ty||'');return /heli|plane|balloon|rocket/.test(t)?'fly':'veh'}
    if(S.menu||S.dg)return'menu';
    return'foot';
  }
  return'arena';
}

/* ---------- DOM ---------- */
let root,tray,stickEl,stickKnob,hint;
const B=[ // id,label,size,kind,payload
 ['fire','FIRE','big','hold','MH'],['aim','AIM','mid','hold','ADS'],['jump','JUMP','mid','hold','Space'],['use','USE','mid','tap','KeyE'],
 ['rld','R','sm','tap','KeyR'],['run','RUN','sm','latch','ShiftLeft'],['more','•••','sm','act','more'],
 ['pls','PULSE','big','act','pulse'],['dash','DASH','mid','tap','ShiftLeft'],['bar','WALL','sm','tap','KeyQ'],
 ['gas','GAS','big','hold','KeyW'],['brk','BRAKE','mid','hold','KeyS'],['hnd','DRIFT','sm','hold','Space'],['nit','NITRO','sm','hold','ShiftLeft'],
 ['ext','EXIT','sm','tap','KeyE'],['cam','VIEW','xs','tap','KeyU'],['up','UP','mid','hold','Space'],['dn','DOWN','mid','hold','KeyC'],
 ['pause','II','xs','act','pause'],['mapb','MAP','xs','tap','KeyM'],['mapx','✕','sm','tap','KeyM'],
 ['wplace','BUILD','big','tap','Space'],['wrot','ROT','xs','tap','KeyR'],['wsell','SELL','xs','tap','KeyX'],['wgo','WAVE','sm','tap','KeyG']];
const TRAY=[['swap','SWAP','act','swap'],['blk','BLOCK','hold','KeyZ'],['shv','SHOVE','tap','KeyX'],['med','MED','tap','KeyF'],['phn','PHONE','act','phone'],['emo','EMOTE','tap','KeyG'],['dive','DIVE','hold','KeyC'],['sit','SIT','tap','KeyN'],['view','VIEW','tap','KeyU']];

/* ---------- icons (stroke, 24x24) ---------- */
const IC={
 fire:'<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
 aim:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
 jump:'<path d="M6 12.5l6-6 6 6"/><path d="M6 18.5l6-6 6 6"/>',
 use:'<path d="M9 11V5.5a1.8 1.8 0 013.6 0V11m0-1.4a1.8 1.8 0 013.6 0v1.6m0-.6a1.8 1.8 0 013.4.8V14a7 7 0 01-7 7h-.6a6 6 0 01-4.7-2.3L4.5 14.8a1.8 1.8 0 012.7-2.3L9 14"/>',
 rld:'<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/>',
 run:'<path d="M6 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/>',
 more:'<circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/>',
 pls:'<circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M7.5 7.5a6.4 6.4 0 000 9M16.5 7.5a6.4 6.4 0 010 9M4.5 4.5a10.6 10.6 0 000 15M19.5 4.5a10.6 10.6 0 010 15"/>',
 dash:'<path d="M4 12h13"/><path d="M12.5 6.5L18 12l-5.5 5.5"/><path d="M20.5 7v10"/>',
 bar:'<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 12h17M9 5v7M15 12v7"/>',
 gas:'<path d="M8 20l2.2-15h3.6L16 20z"/><path d="M9.5 12h5"/>',
 brk:'<rect x="5" y="5" width="14" height="14" rx="3"/>',
 hnd:'<path d="M5 18c0-6 4-10 10-10h4"/><path d="M15 4l4 4-4 4"/>',
 nit:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
 ext:'<path d="M10 4H5.5v16H10"/><path d="M14 8l4 4-4 4M18 12H9"/>',
 cam:'<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 up:'<path d="M6 15l6-6 6 6"/>',dn:'<path d="M6 9l6 6 6-6"/>',
 pause:'<path d="M9 6v12M15 6v12"/>',
 mapb:'<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
 mapx:'<path d="M6 6l12 12M18 6L6 18"/>',
 wplace:'<path d="M12 5v14M5 12h14"/>',wrot:'<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/>',
 wsell:'<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/>',wgo:'<path d="M8 5l11 7-11 7z"/>',
 swap:'<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
 blk:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
 shv:'<path d="M5 12h9M11 7l5 5-5 5"/><path d="M19 6v12"/>',
 med:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
 phn:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
 emo:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 007 0"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/>',
 dive:'<path d="M12 3v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M3.5 19c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 5 0"/>',
 sit:'<path d="M7 4v8h9v8M7 12v8"/>',view:'<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'};
const ico=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC[n]||'')+'</svg>';
function build(){
  if($('tui'))return;
  root=document.createElement('div');root.id='tui';root.className='c-none';
  root.innerHTML='<div class="zone zl"></div><div class="zone zr"></div><div class="stick"><b></b><i></i></div><div class="hint">MOVE</div><div class="tapcont">TAP TO CONTINUE</div>'+
    B.map(b=>'<button class="tb '+b[2]+' t-'+b[0]+'" data-id="'+b[0]+'" aria-label="'+b[1]+'">'+ico(b[0])+'<span class="lb">'+b[1]+'</span><small></small></button>').join('')+
    '<div class="tray">'+TRAY.map(b=>'<button class="tb t-'+b[0]+'" data-tray="'+b[0]+'" aria-label="'+b[1]+'">'+ico(b[0])+'<span class="lb">'+b[1]+'</span></button>').join('')+'</div>';
  document.body.appendChild(root);
  tray=root.querySelector('.tray');stickEl=root.querySelector('.stick');stickKnob=stickEl.querySelector('i');hint=root.querySelector('.hint');
  wireZones();
  root.querySelectorAll('button[data-id]').forEach(b=>{const d=B.find(x=>x[0]===b.dataset.id);wireBtn(b,d[3],d[4])});
  root.querySelectorAll('button[data-tray]').forEach(b=>{const d=TRAY.find(x=>x[0]===b.dataset.tray);wireBtn(b,d[2],d[3])});
  root.querySelector('.tapcont').addEventListener('pointerdown',e=>{e.preventDefault();tapKey('Space');tapKey('Enter')});
  root.addEventListener('contextmenu',e=>e.preventDefault());
  const tg=document.createElement('div');document.body.appendChild(tg);tg.remove();
}

/* ---------- key helpers ---------- */
const K=()=>g('keys');
function setKey(k,v){const ks=K();if(ks)ks[k]=v?1:0}
function tapKey(k,ms){setKey(k,1);setTimeout(()=>setKey(k,0),ms||160)}
function buzz(ms){try{if(HF.android&&navigator.vibrate&&(g('CFG')||{}).haptic!==false)navigator.vibrate(ms||8)}catch(e){}}

/* ---------- buttons ---------- */
const held=new Set();
function wireBtn(b,kind,pay){
  let pid=null,lx=0,ly=0;
  const press=e=>{
    e.preventDefault();e.stopPropagation();if(pid!==null)return;pid=e.pointerId;try{b.setPointerCapture(pid)}catch(_){}
    lx=e.clientX;ly=e.clientY;b.classList.add('on');buzz();
    if(pay==='MH'){setMH(1)}
    else if(pay==='ADS'){const C=g('CBT');if(C)C.adsK=true}
    else if(kind==='act')action(pay);
    else if(kind==='latch'){const on=!b.classList.contains('lat');b.classList.toggle('lat',on);setKey(pay,on);TUI.runLatch=on}
    else if(kind==='tap'){setKey(pay,1);setTimeout(()=>{setKey(pay,0);b.classList.remove('on')},170)}
    else{setKey(pay,1);held.add(b)}
  };
  const move=e=>{ if(e.pointerId!==pid||pay!=='MH')return;look(e.clientX-lx,e.clientY-ly,1.0);lx=e.clientX;ly=e.clientY };   // fire-and-drag to aim
  const rel=e=>{
    if(e.pointerId!==pid)return;pid=null;
    if(pay==='MH')setMH(0);
    else if(pay==='ADS'){const C=g('CBT');if(C)C.adsK=false}
    else if(kind==='hold')setKey(pay,0);
    held.delete(b);
    if(kind==='latch'){if(!b.classList.contains('lat'))b.classList.remove('on')}else if(kind!=='tap')b.classList.remove('on');
    else if(kind==='act')b.classList.remove('on');
  };
  b._rel=()=>{if(pid!==null){rel({pointerId:pid})}};
  b.addEventListener('pointerdown',press);b.addEventListener('pointermove',move);
  b.addEventListener('pointerup',rel);b.addEventListener('pointercancel',rel);b.addEventListener('lostpointercapture',rel);
}
function action(a){
  if(a==='more'){TUI.tray=!TUI.tray;tray.classList.toggle('open',TUI.tray)}
  else{try{callG(a)}catch(e){}}
}
function releaseHeld(){held.forEach(b=>b._rel&&b._rel());held.clear();root&&root.querySelectorAll('.tb.on').forEach(b=>{if(!b.classList.contains('lat'))b.classList.remove('on')})}
function releaseAll(){
  releaseHeld();stickEnd();lookEnd();
  const ks=K();if(ks)for(const k in ks)ks[k]=0;
  setMH(0);
  const C=g('CBT');if(C)C.adsK=false;
  root&&root.querySelectorAll('.lat').forEach(b=>b.classList.remove('lat','on'));TUI.runLatch=false;
}

/* ---------- stick + look ---------- */
const st={id:null,ox:0,oy:0,t:0,full:0};const lk={id:null,x:0,y:0};
function uPx(){const v=Math.min(innerWidth,innerHeight);return Math.max(46,Math.min(70,v*.125))}
function wireZones(){
  const zl=root.querySelector('.zl'),zr=root.querySelector('.zr');
  zl.addEventListener('pointerdown',e=>{
    e.preventDefault();if(st.id!==null)return;st.id=e.pointerId;try{zl.setPointerCapture(e.pointerId)}catch(_){}
    st.ox=e.clientX;st.oy=e.clientY;st.full=0;hint.classList.add('off');TUI.usedStick=1;
    if((g('CFG')||{}).tFixed){const h=hint.getBoundingClientRect();st.ox=h.left+h.width/2;st.oy=h.top+h.height/2}
    stickEl.style.display='block';stickEl.style.left=st.ox+'px';stickEl.style.top=st.oy+'px';stickSet(e.clientX,e.clientY)});
  zl.addEventListener('pointermove',e=>{if(e.pointerId===st.id){e.preventDefault();stickSet(e.clientX,e.clientY)}});
  const up=e=>{if(e.pointerId===st.id)stickEnd()};zl.addEventListener('pointerup',up);zl.addEventListener('pointercancel',up);zl.addEventListener('lostpointercapture',up);
  /* right side: drag = look (or, in Warden mode, move the build cursor) */
  zr.addEventListener('pointerdown',e=>{
    e.preventDefault();if(TUI.ctx==='warden'){wardenPt(e);lk.id=e.pointerId;try{zr.setPointerCapture(e.pointerId)}catch(_){}return}
    if(lk.id!==null)return;lk.id=e.pointerId;lk.x=e.clientX;lk.y=e.clientY;try{zr.setPointerCapture(e.pointerId)}catch(_){}});
  zr.addEventListener('pointermove',e=>{if(e.pointerId!==lk.id)return;e.preventDefault();
    if(TUI.ctx==='warden'){wardenPt(e);return}
    const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];let dx=0,dy=0;for(const c of(evs.length?evs:[e])){dx+=c.clientX-lk.x;dy+=c.clientY-lk.y;lk.x=c.clientX;lk.y=c.clientY}
    look(dx,dy,1)});
  const lup=e=>{if(e.pointerId===lk.id)lookEnd()};zr.addEventListener('pointerup',lup);zr.addEventListener('pointercancel',lup);zr.addEventListener('lostpointercapture',lup);
}
function wardenPt(e){const W=g('WM');if(W){W.x=e.clientX;W.y=e.clientY;W.t=performance.now()}}
function look(dx,dy,m){
  const C=g('CFG')||{},sens=(C.sens||1)*(C.tSens||1),ads=(g('CBT')||{}).adsK?.62:1;
  const k=.0054*sens*ads*m*(1+Math.min(.5,Math.hypot(dx,dy)/60));   // slight acceleration for fast flicks
  try{lookBy(dx*k,dy*k*(C.invY?-1:1))}catch(e){}
}
function lookEnd(){lk.id=null}
function stickSet(x,y){
  const R=uPx()*1.1;let dx=x-st.ox,dy=y-st.oy,m=Math.hypot(dx,dy);
  if(m>R){const o=m-R;st.ox+=dx/m*o;st.oy+=dy/m*o;dx=x-st.ox;dy=y-st.oy;m=R;stickEl.style.left=st.ox+'px';stickEl.style.top=st.oy+'px'}   // origin follows the thumb
  stickKnob.style.transform='translate('+dx+'px,'+dy+'px)';
  let nx=dx/R,ny=dy/R;const mag=Math.hypot(nx,ny);
  if(mag<.1){nx=ny=0}else{const s=(mag-.1)/.9/mag;nx*=s;ny*=s}
  const tj=g('TJ');if(tj){tj.x=nx;tj.y=ny}
  const S=g('S');
  if(S&&(S.drv||S.fw)){setKey('KeyW',ny<-.3);setKey('KeyS',ny>.3);setKey('KeyA',nx<-.25);setKey('KeyD',nx>.25)}
  st.mag=Math.hypot(nx,ny);
  /* auto-sprint on foot when the stick is pushed to the rim */
  if(TUI.ctx==='foot'&&(g('CFG')||{}).autoRun!==false&&!TUI.runLatch){
    const full=st.mag>.96;if(full){if(!st.full)st.full=performance.now();if(performance.now()-st.full>300&&!st.sprint){st.sprint=1;setKey('ShiftLeft',1);stickEl.classList.add('run')}}
    else if(st.mag<.8&&st.sprint){st.sprint=0;st.full=0;setKey('ShiftLeft',0);stickEl.classList.remove('run')}else if(!full)st.full=0;
  }
}
function stickEnd(){
  if(st.id===null&&!st.sprint)return;st.id=null;st.full=0;
  stickEl&&(stickEl.style.display='none',stickEl.classList.remove('run'),stickKnob.style.transform='');
  const tj=g('TJ');if(tj){tj.x=0;tj.y=0}
  setKey('KeyW',0);setKey('KeyS',0);setKey('KeyA',0);setKey('KeyD',0);
  if(st.sprint){st.sprint=0;if(!TUI.runLatch)setKey('ShiftLeft',0)}
}

/* ---------- prompt on USE button + touch wording ---------- */
function tx(s){
  return s.replace(/SPACE · next shot/g,'TAP · next shot').replace(/\[E\]/g,'[USE]').replace(/\bpress E\b/gi,'tap USE').replace(/\bpress F\b/gi,'tap PULSE').replace(/\bpress Q\b/gi,'tap WALL').replace(/\bpress G\b/gi,'tap WAVE').replace(/\bpress P\b/gi,'tap PHONE').replace(/\bpress V\b/gi,'tap EMOTE')
   .replace(/Look around with the mouse, right stick, or by dragging the right side/,'Look around by dragging the right side of the screen')
   .replace(/Move with WASD \(or the stick\)/,'Move with the left stick')
   .replace(/Hold Shift while moving to sprint/,'Push the stick to its edge to sprint')
   .replace(/Pick a weapon \(1-0\) and fire with the mouse/,'Tap SWAP in the ••• tray, hold FIRE')
   .replace(/Eat or drink with X, use a medkit with F/,'Use MED / SHOVE in the ••• tray')
   .replace(/Open the emote wheel and pick an emote/,'Open EMOTE in the ••• tray');
}
const TAGS={MOUSE:'DRAG',WASD:'STICK',SPACE:'JUMP',SHIFT:'RUN',P:'PHONE',M:'MAP',E:'USE',LMB:'FIRE','X / F':'TRAY',G:'EMOTE'};
function rewrite(node){
  if(!TUI.on||!node||!node.nodeType)return;
  const w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){const v=n.nodeValue;let o=tx(v);if(o!==v)n.nodeValue=o}
  if(node.nodeType===1&&node.closest&&node.closest('#tut'))node.querySelectorAll&&node.querySelectorAll('small,kbd,i').forEach(e=>{const t=e.textContent.trim();if(TAGS[t])e.textContent=TAGS[t]});
}
let mo;
function watchText(){
  const ids=['cm','tut','bn','sub','dlg','nt','nws','dng','mres','wd','cb'].map($).filter(Boolean);
  mo=new MutationObserver(ms=>{if(!TUI.on)return;mo.disconnect();try{for(const m of ms){if(m.type==='characterData')rewrite(m.target.parentNode||m.target);else m.addedNodes.forEach(a=>rewrite(a.nodeType===3?a.parentNode:a));if(m.target.nodeType===1)rewrite(m.target)}}finally{observe()}});
  const observe=()=>ids.forEach(e=>mo.observe(e,{childList:true,characterData:true,subtree:true}));observe();
}
let lastCm='';
function promptSync(){
  const cm=$('cm'),use=root&&root.querySelector('.t-use');if(!use)return;
  const t=cm&&cm.style.display!=='none'?cm.textContent:'';if(t===lastCm)return;lastCm=t;
  const m=/^\[(?:E|USE)\]\s*(.*)/.exec(t);use.classList.toggle('hot',!!m);use.querySelector('small').textContent=m?m[1].slice(0,16):'';
}

/* ---------- map: tap the big atlas to set a waypoint; tap the minimap to open it ---------- */
function mapTaps(){
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'||!TUI.on)return;
    const S=g('S'),t=e.target;
    if(t&&t.id==='mm'){
      if(S&&S.bm){try{window.mapClick({clientX:e.clientX,clientY:e.clientY,button:0})}catch(_){}}
      else if(TUI.ctx==='foot'||TUI.ctx==='veh'||TUI.ctx==='fly'){tapKey('KeyM')}
    }
  },true);
  const mm=$('mm');if(mm)new MutationObserver(()=>{}).observe(mm,{attributes:true});
}
function enableMinimapTap(){document.body.classList.contains('touchon')&&0;const mm=$('mm');if(mm)mm.style.pointerEvents='auto'}

/* ---------- fullscreen / orientation / wake lock / audio unlock ---------- */
function goFull(){
  try{const d=document.documentElement;if(!document.fullscreenElement&&!HF.ios&&(d.requestFullscreen||d.webkitRequestFullscreen)){
    const p=(d.requestFullscreen||d.webkitRequestFullscreen).call(d,{navigationUI:'hide'});if(p&&p.catch)p.catch(()=>{});}}catch(e){}
  try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(e){}
}
let wl=null;
async function wake(){try{if('wakeLock' in navigator&&!wl&&document.visibilityState==='visible'){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null})}}catch(e){wl=null}}
function audioUnlock(){const AC=g('AC');try{if(AC&&AC.state!=='running')AC.resume()}catch(e){}}
function firstGesture(e){
  if(e.pointerType==='touch'&&!TUI.hybridTouch){TUI.hybridTouch=true;TUI.lastTouch=Date.now();sync()}
  if(TUI.on||HF.mobile){if(!TUI.fs){TUI.fs=1;goFull()}wake()}
  audioUnlock();
}
let rotEl,tipEl;
function rot(){
  if(!rotEl)return;
  const portrait=innerHeight>innerWidth*1.05,run=g('run'),on=TUI.on&&run&&portrait&&!TUI.portraitOK&&innerWidth<820&&!(g('PM'));
  rotEl.classList.toggle('on',!!on);
}
function tip(html,key){
  try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1')}catch(e){}
  tipEl.innerHTML=html+'<button onclick="this.parentNode.classList.remove(\'on\')">OK</button>';tipEl.classList.add('on');setTimeout(()=>tipEl.classList.remove('on'),14000);
}

/* ---------- boot ---------- */
function init(){
  if(!g('CFG')||!g('S0')){return setTimeout(init,50)}
  build();
  rotEl=document.createElement('div');rotEl.id='rot';rotEl.innerHTML='<div class="ph"></div><div>ROTATE YOUR DEVICE</div><small>Heistfall plays best in landscape.</small><button>Play in portrait anyway</button>';document.body.appendChild(rotEl);
  rotEl.querySelector('button').onclick=()=>{TUI.portraitOK=true;rot()};
  tipEl=document.createElement('div');tipEl.id='tip';document.body.appendChild(tipEl);
  watchText();mapTaps();
  /* A tap on the title / end screen shows the home menu on pointerdown; the browser's follow-up click would then land on whichever
     menu button is under the finger and silently activate it. Swallow that click (and its mouse twins) for a moment. */
  TUI.swallow=0;
  document.addEventListener('pointerdown',e=>{const m=$('m');if(m&&(m.classList.contains('intro')||m.classList.contains('outro')))TUI.swallow=performance.now()+650},true);
  ['mousedown','mouseup','click','touchend'].forEach(t=>document.addEventListener(t,e=>{if(performance.now()<TUI.swallow){e.stopImmediatePropagation();if(t==='click'||t==='mouseup'||t==='mousedown')e.preventDefault()}},true));
  document.addEventListener('pointerdown',firstGesture,{capture:true,passive:true});
  document.addEventListener('touchend',audioUnlock,{passive:true});document.addEventListener('click',audioUnlock);
  /* a laptop with a touchscreen: go back to mouse/keyboard UI as soon as the mouse is used */
  addEventListener('mousemove',e=>{if(e.pointerType==='touch'||Date.now()-TUI.lastTouch<800)return;if(TUI.hybridTouch&&!HF.mobile){TUI.hybridTouch=false;sync()}},{passive:true});
  addEventListener('keydown',e=>{if(TUI.hybridTouch&&!HF.mobile&&e.isTrusted){TUI.hybridTouch=false;sync()}},{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){releaseAll();try{if(g('run')&&!g('PM')&&TUI.on)(0,eval)('openPause()')}catch(e){}}else{wake();audioUnlock()}});
  addEventListener('blur',releaseAll);addEventListener('pagehide',releaseAll);
  addEventListener('resize',()=>{sync()});addEventListener('orientationchange',()=>setTimeout(sync,250));
  /* block pinch-zoom / double-tap zoom / context menu inside the game (iOS ignores user-scalable=no) */
  ['gesturestart','gesturechange','gestureend'].forEach(n=>document.addEventListener(n,e=>e.preventDefault()));
  document.addEventListener('contextmenu',e=>{if(TUI.on)e.preventDefault()});
  let lt=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-lt<320&&!(e.target.closest&&e.target.closest('input,textarea')))e.preventDefault();lt=n},{passive:false});
  document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
  mm0();
  setInterval(()=>{sync();promptSync()},120);
  sync();
  if(HF.ios&&!HF.standalone)setTimeout(()=>tip('For true fullscreen on iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>, then open Heistfall from your home screen.','hf_ios_tip'),4000);
  if(HF.debug)console.log('[mobile] ready',TUI);
}
function mm0(){const mm=$('mm');if(mm)mm.style.pointerEvents='auto'}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}catch(err){console.error('mobile.js failed to start',err)}
})();
