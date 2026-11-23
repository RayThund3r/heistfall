/* HEISTFALL navigation: route pill (distance / ETA / turn arrow) + on-screen waypoint marker.
   Works on desktop and touch. Reads the game's own waypoint (S.wp) and route (RTE.pts), so everything that sets a waypoint
   (map tap, phone GPS, mission objective) gets guidance automatically. */
(function(){'use strict';
try{
const HF=window.HF||{};
const $=id=>document.getElementById(id);
const PK=(0,eval)('(()=>({S,run,PM,PH,CUT,CFG,P,RTE,yaw,cam}))');const G=()=>{try{return PK()}catch(e){return{}}};
const NAV=window.HFNAV={name:'',pending:'',dist:0,eta:0,
  /* names a destination for the NEXT waypoint that gets set (phone GPS calls this before wpSet) */
  willSet(n){NAV.pending=n||''}};

/* ---------- DOM ---------- */
let pill,mark,arrow,dEl,eEl,mDst;
const ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l6.5 15L12 14.5 5.5 18z" fill="currentColor" fill-opacity=".25"/></svg>';
function build(){
  const h=$('h');if(!h||$('navp'))return;
  pill=document.createElement('div');pill.id='navp';
  pill.innerHTML='<div class="na">'+ARROW+'</div><div class="ntx"><b class="nd">\u2014</b><small class="ne"></small></div><button class="nx" aria-label="Clear route" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg></button>';
  h.appendChild(pill);
  arrow=pill.querySelector('.na');dEl=pill.querySelector('.nd');eEl=pill.querySelector('.ne');
  pill.querySelector('.nx').addEventListener('click',e=>{e.stopPropagation();try{window.wpClear()}catch(_){}});
  pill.addEventListener('click',()=>{if(window.HFPHONE)window.HFPHONE.open('gps')});
  mark=document.createElement('div');mark.id='wpi';mark.innerHTML='<i class="pt">'+ARROW+'</i><i class="dia"></i><b class="md"></b>';
  h.appendChild(mark);mDst=mark.querySelector('.md');
}
/* ---------- numbers ---------- */
const fmtD=m=>m>=1000?(m/1000).toFixed(1)+' km':Math.max(0,Math.round(m/ (m<100?1:5))*(m<100?1:5))+' m';
const fmtE=s=>s<50?'<1 min':s<3570?Math.round(s/60)+' min':(s/3600).toFixed(1)+' h';
let lastPos=null,lastT=0,spd=0;
function routeRemaining(P,w,RTE){
  const pts=RTE&&RTE.pts;if(!pts||pts.length<2)return Math.hypot(w.x-P.position.x,w.z-P.position.z);
  let bi=0,bd=1e12;for(let i=0;i<pts.length;i++){const d=(pts[i][0]-P.position.x)**2+(pts[i][1]-P.position.z)**2;if(d<bd){bd=d;bi=i}}
  let rem=Math.sqrt(bd);for(let i=bi;i<pts.length-1;i++)rem+=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);
  return rem}
function nextPoint(P,w,RTE){
  const pts=RTE&&RTE.pts;if(!pts||pts.length<2)return[w.x,w.z];
  let bi=0,bd=1e12;for(let i=0;i<pts.length;i++){const d=(pts[i][0]-P.position.x)**2+(pts[i][1]-P.position.z)**2;if(d<bd){bd=d;bi=i}}
  for(let i=bi;i<pts.length;i++){if(Math.hypot(pts[i][0]-P.position.x,pts[i][1]-P.position.z)>9)return pts[i]}
  return pts[pts.length-1]}
const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
/* ---------- 5 Hz state ---------- */
let wpKey='',shown=false;
function slow(){
  const g=G(),S=g.S;build();if(!pill)return;
  const on=!!(g.run&&S&&S.wp&&S.ph===4&&!g.CUT);
  if(on!==shown){shown=on;pill.classList.toggle('on',on);mark.classList.toggle('on',on);document.body.classList.toggle('hasnav',on)}
  if(!on){lastPos=null;return}
  const key=Math.round(S.wp.x)+','+Math.round(S.wp.z);
  if(key!==wpKey){wpKey=key;NAV.name=NAV.pending||(S.mt&&Math.hypot(S.mt.x-S.wp.x,S.mt.z-S.wp.z)<8?'Objective':'Dropped pin');NAV.pending='';spd=0;lastPos=null}
  const P=g.P,now=performance.now();
  if(lastPos&&now-lastT>150){const v=Math.hypot(P.position.x-lastPos[0],P.position.z-lastPos[1])/((now-lastT)/1000);if(v<80)spd=spd*.75+v*.25}
  if(!lastPos||now-lastT>150){lastPos=[P.position.x,P.position.z];lastT=now}
  const dist=routeRemaining(P,S.wp,g.RTE),floor=S.drv?11:3.8,eta=dist/Math.max(spd,floor);
  NAV.dist=dist;NAV.eta=eta;
  const t1=fmtD(dist),t2=(g.RTE&&g.RTE.pts&&g.RTE.pts.length>1||eta<50?fmtE(eta):'~'+fmtE(eta))+' \u00b7 '+NAV.name;
  if(dEl.textContent!==t1)dEl.textContent=t1;if(eEl.textContent!==t2)eEl.textContent=t2;
}
/* ---------- per-frame marker + arrow ---------- */
const V=new THREE.Vector3();
function frame(){
  if(!shown)return;
  const g=G(),S=g.S;if(!S||!S.wp||g.PH||g.PM)return;
  const P=g.P,yaw=g.yaw,W=innerWidth,H=innerHeight;
  // turn arrow: bearing of the next route point relative to the camera heading
  const np=nextPoint(P,S.wp,g.RTE),dx=np[0]-P.position.x,dz=np[1]-P.position.z;
  const rel=norm(Math.atan2(-Math.sin(yaw),-Math.cos(yaw))-Math.atan2(dx,dz));   // +90 deg = turn right
  const deg=(rel*180/Math.PI).toFixed(0);if(arrow._d!==deg){arrow._d=deg;arrow.style.transform='rotate('+deg+'deg)'}
  // world marker
  V.set(S.wp.x,5,S.wp.z).project(g.cam);
  place(V.x,V.y,V.z>1,Math.hypot(S.wp.x-P.position.x,S.wp.z-P.position.z));
}
function clusterTop(){   // top edge of the lowest-right thumb cluster (ignores the pause / map buttons along the top)
  const H=innerHeight,tb=[...document.querySelectorAll('#tui .tb')].filter(b=>b.offsetParent&&!b.closest('.tray')).map(b=>b.getBoundingClientRect()).filter(r=>r.top>H*.4);
  return tb.length?Math.min(...tb.map(r=>r.top)):H}
function safeRect(){
  const touch=document.body.classList.contains('touchon'),W=innerWidth,H=innerHeight;
  return{l:touch?48:40,r:W-(touch?48:40),t:touch?138:100,b:H-(touch?64:60)}}
/* an edge-clamped marker slides along the screen edge until it is clear of HUD blocks and thumb buttons */
const OBS='#tp,#mm:not(.big),#tut.on,#hp,#navp.on,.rc.wpc,.rc.spd,#tui .tb,#cmp,.rc.obj';
function avoid(px,py,edge,R){
  const rs=[...document.querySelectorAll(OBS)].filter(e=>e.offsetParent!==null&&!e.closest('.tray')).map(e=>e.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1);
  const pad=22,vert=edge==='l'||edge==='r';
  for(let it=0;it<6;it++){
    const hit=rs.find(r=>px>r.left-pad&&px<r.right+pad&&py>r.top-pad&&py<r.bottom+pad);if(!hit)break;
    if(vert){const up=hit.top-pad,dn=hit.bottom+pad;py=(Math.abs(py-up)<Math.abs(py-dn)&&up>=R.t)||dn>R.b?up:dn}
    else{const lf=hit.left-pad,rt=hit.right+pad;px=(Math.abs(px-lf)<Math.abs(px-rt)&&lf>=R.l)||rt>R.r?lf:rt}
    py=Math.max(R.t,Math.min(R.b,py));px=Math.max(R.l,Math.min(R.r,px))}
  const blocked=(x,y)=>rs.some(r=>x>r.left-pad+8&&x<r.right+pad-8&&y>r.top-pad+8&&y<r.bottom+pad-8);
  /* no free spot on this edge (short screens): slide inward until clear */
  for(let k=1;k<=6&&blocked(px,py);k++){const dir=edge==='r'?-1:edge==='l'?1:0;if(dir)px+=dir*60;else py+=(py<(R.t+R.b)/2?1:-1)*40}
  return[px,py]}
function place(nx,ny,behind,dist){
  const W=innerWidth,H=innerHeight,R=safeRect();
  let px=(nx+1)/2*W,py=(1-ny)/2*H,off=false;
  if(behind){px=W-px;py=H-py;off=true;nx=-nx;ny=-ny}
  if(px<R.l||px>R.r||py<R.t||py>R.b)off=true;
  let ang=0;
  if(off){
    const cx=W/2,cy=(R.t+R.b)/2;let vx=px-cx,vy=py-cy;if(behind&&Math.abs(vx)<1&&Math.abs(vy)<1)vy=1;
    const sx=vx?((vx>0?R.r:R.l)-cx)/vx:1e9,sy=vy?((vy>0?R.b:R.t)-cy)/vy:1e9,s=Math.min(Math.abs(sx),Math.abs(sy));
    ang=Math.atan2(vx,-vy)*180/Math.PI;px=cx+vx*s;py=cy+vy*s;
    const edge=px<=R.l+1?'l':px>=R.r-1?'r':py<=R.t+1?'t':'b';[px,py]=avoid(px,py,edge,R);
  }
  mark.classList.toggle('off',off);
  const t='translate3d('+px.toFixed(1)+'px,'+py.toFixed(1)+'px,0)';if(mark._t!==t){mark._t=t;mark.style.transform=t}
  const pt=mark.firstChild;if(off&&pt._a!==Math.round(ang)){pt._a=Math.round(ang);pt.style.transform='rotate('+Math.round(ang)+'deg)'}
  const tx=fmtD(dist);if(mDst._t!==tx){mDst._t=tx;mDst.textContent=tx}
}
NAV._place=place;NAV._slow=slow;
/* hook the game frame */
(function(){const fw=window.frameWatch;if(typeof fw!=='function')return;let n=0;window.frameWatch=function(dt){fw.apply(this,arguments);try{if((++n&1)===0)frame()}catch(e){}}})();
setInterval(slow,200);
}catch(err){console.error('nav.js failed to start',err)}
})();
