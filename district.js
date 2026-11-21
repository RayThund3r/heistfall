/* HEISTFALL district-mode quality of life (desktop + touch).
   - autosave (every 45 s, when you leave the page, never during cutscenes / travel / wasted / busted) with a small "saved" tick
   - Skip button for every cutscene
   - tap / click the mission objective to open the phone on the Story or Jobs app                                                  */
(function(){'use strict';
try{
const $=id=>document.getElementById(id);
const PK=(0,eval)('(()=>({S,run,PM,PH,CUT,CFG}))');const G=()=>{try{return PK()}catch(e){return{}}};

/* ---------- autosave ---------- */
let pill,pillT=0,lastSave=0;
function tick(){
  if(!pill){pill=document.createElement('div');pill.id='asv';pill.textContent='\u2713 Saved';document.body.appendChild(pill)}
  pill.classList.add('on');clearTimeout(pillT);pillT=setTimeout(()=>pill.classList.remove('on'),1400)}
function canSave(){
  const g=G(),S=g.S;
  return !!(g.run&&S&&S.ph===4&&!S.over&&!S.ft&&!g.CUT&&!S.menu&&!S.shopOpen&&!S.wst&&!S.bst&&S.hp>0&&typeof window.saveGame==='function')}
function autosave(force){
  const g=G();if(g.CFG&&g.CFG.autosave===false)return;
  if(!canSave())return;
  if(!force&&(g.PM||g.PH))return;
  const now=performance.now();if(now-lastSave<8000)return;lastSave=now;
  try{window.saveGame(true);tick()}catch(e){}}
setInterval(()=>autosave(false),45000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)autosave(true)});
addEventListener('pagehide',()=>autosave(true));

/* ---------- skip cutscene ---------- */
const sk=document.createElement('button');sk.id='skipcut';sk.type='button';sk.textContent='Skip \u203a';sk.setAttribute('aria-label','Skip cutscene');
sk.addEventListener('click',e=>{e.stopPropagation();try{if(G().CUT)window.endCut()}catch(err){}});
document.body.appendChild(sk);
let skOn=false;setInterval(()=>{const on=!!G().CUT;if(on!==skOn){skOn=on;sk.classList.toggle('on',on)}},150);
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&G().CUT&&!G().PM){/* Esc skips a cutscene instead of opening the pause menu */}},true);

/* ---------- objective -> phone ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('.rc.obj');if(!t||!window.HFPHONE)return;
  const S=G().S;if(!S)return;window.HFPHONE.open(S.ms&&S.ms.t==='story'?'story':(S.ms?'jobs':'story'))},true);
}catch(err){console.error('district.js failed to start',err)}
})();
