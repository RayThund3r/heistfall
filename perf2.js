/* HEISTFALL performance layer 2 (loaded after perf.js). Every item is independent, guarded, and falls back to the original behaviour.
   1. HUD DOM de-duplication     2. minimap throttle        3. no GPU work while paused / phone open
   4. far-pedestrian scene-graph pruning                      5. automatic quality safety net (governor)            */
(function(){'use strict';
try{
const HF=window.HF||{},MOB=!!HF.mobile;
const PK=(0,eval)('(()=>({S,run,PM,PH,CFG,sun,cam,R,DYN,W}))');
const G=()=>{try{return PK()}catch(e){return{}}};
const $=id=>document.getElementById(id);
const PERF=window.HFPERF=window.HFPERF||{log:[]};
const log=(...a)=>{PERF.log.push(a.join(' '));if(HF.debug)console.log('[perf2]',...a)};
const S2=PERF.p2={domSkips:0,domWrites:0,miniSkips:0,pausedSkips:0,pruned:0,level:0};

/* ---------- 1. HUD DOM de-duplication ----------
   The game rebuilds #tp (right HUD panel), #cm (prompt) and #cmp (compass) with innerHTML EVERY frame, even when the text is identical.
   Re-parsing HTML each frame forces style + layout work and creates garbage. Identical writes are now skipped. */
const IH=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML'),TC=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
function dedupe(id){
  const e=$(id);if(!e||e.__hfd||!IH||!TC)return;e.__hfd=1;let key=null,n=-1;
  Object.defineProperty(e,'innerHTML',{configurable:true,get(){return IH.get.call(this)},set(v){v=v==null?'':String(v);const k='h'+v;if(k===key&&this.childNodes.length===n){S2.domSkips++;return}key=k;S2.domWrites++;IH.set.call(this,v);n=this.childNodes.length}});
  Object.defineProperty(e,'textContent',{configurable:true,get(){return TC.get.call(this)},set(v){v=v==null?'':String(v);const k='t'+v;if(k===key&&this.childNodes.length===n){S2.domSkips++;return}key=k;S2.domWrites++;TC.set.call(this,v);n=this.childNodes.length}});
}
const HOT=['tp','cm','cmp'];
HOT.forEach(dedupe);setInterval(()=>HOT.forEach(dedupe),2000);   // re-arm if the game ever recreates an element

/* ---------- 2. minimap throttle ---------- */
(function(){const o=window.mini;if(typeof o!=='function')return;let last=0;const GAP=MOB?50:33;
  window.mini=function(){const t=performance.now(),S=G().S;if((S&&S.bm)||t-last>=GAP||t<last){last=t;return o.apply(this,arguments)}S2.miniSkips++}})();

/* ---------- 3. no GPU work while the pause menu / phone is open ----------
   The scene is frozen while paused, so re-rendering it (shadows, bloom, 20k objects) is wasted battery and heat.
   A WebGL canvas keeps its last picture when nothing is drawn, so we simply stop drawing after a few frames. */
let dirty=4,pf=0;
(function(){const R=G().R;if(!R)return;const inner=R.render;
  R.render=function(s,c){
    try{const g=G();if(g.run&&(g.PH||g.PM)&&!HF.debug){if(dirty>0){dirty--}else if(++pf>2){S2.pausedSkips++;return}}else{pf=0;if(dirty<2)dirty=2}}catch(e){}
    return inner.call(R,s,c)}})();
const mark=()=>{dirty=4;pf=0};
addEventListener('resize',mark);document.addEventListener('visibilitychange',mark);
['pm','ph'].forEach(id=>{const e=$(id);if(e){e.addEventListener('input',mark,true);e.addEventListener('click',mark,true)}});
(function(){const ag=window.applyGfx;if(typeof ag!=='function')return;window.applyGfx=function(){const r=ag.apply(this,arguments);mark();try{applyLevel()}catch(e){}return r}})();

/* ---------- 4. far-pedestrian scene-graph pruning ----------
   Distant pedestrians are already swapped for a single baked mesh, but their ~30 hidden body-part nodes were still walked, composed and
   matrix-multiplied by three.js every frame (~8,000 nodes in the city). Beyond the LOD distance those children are now unlinked from the
   parent's children array (their .parent pointer is kept, and traverse() still reaches them, so disposal / tinting code is unaffected). */
const OT=THREE.Object3D.prototype.traverse;
function hfTrav(cb){OT.call(this,cb);const u=this.userData&&this.userData.lod,k=u&&u.hfOff;if(k)for(let i=0;i<k.length;i++)k[i].traverse(cb)}
function prune(u){
  const o=u.g&&u.g.parent;if(!o||u.car||u.hfOff||!u.srcs||!u.srcs.length)return;
  u.hfAll=o.children.slice();const set=new Set(u.srcs),off=[];
  for(let i=o.children.length-1;i>=0;i--){const c=o.children[i];if(set.has(c)){off.unshift(c);o.children.splice(i,1)}}
  u.hfOff=off;u.hfRoot=o;o.traverse=hfTrav;S2.pruned++}
function unprune(u){
  const o=u.hfRoot;if(!o||!u.hfOff)return;
  const cur=o.children.slice(),have=new Set(cur),all=u.hfAll.filter(c=>have.has(c)||u.hfOff.includes(c));
  const extra=cur.filter(c=>!all.includes(c));o.children.length=0;for(const c of all)o.children.push(c);for(const c of extra)o.children.push(c);
  u.hfOff=null;delete o.traverse;S2.pruned--}
(function(){const o=window.lodSet;if(typeof o!=='function')return;
  window.lodSet=function(u,m){const prev=u.mode;o.call(this,u,m);if(u.mode===prev)return;try{if(u.mode===2)prune(u);else if(prev===2&&u.hfOff)unprune(u)}catch(e){console.error('prune failed',e)}}})();

/* ---------- 4b. chunked tree culling ----------
   Each forest is three big InstancedMeshes (trunks, pines, oaks). three.js can only frustum-cull an InstancedMesh as ONE object, so the game
   switched culling off and every tree in the world was drawn every frame, including 360 degrees behind you. Instances are regrouped into
   64 m cells (hidden/zero-scale instances are dropped) with proper bounding spheres, so only trees in view are drawn. Visuals are identical. */
const TREE={done:false,group:null,srcs:[]};
function isTreeGeo(g){
  const P=g&&g.parameters;if(!P)return false;const t=g.type||'',get=(k,i)=>Array.isArray(P)?P[i]:P[k];
  if(t==='CylinderGeometry')return get('radiusTop',0)===.25&&get('height',2)===3;
  if(t==='ConeGeometry')return(get('radius',0)===1.9||get('radius',0)===1.8)&&(get('height',1)===5||get('height',1)===4.5);
  if(t==='IcosahedronGeometry')return get('radius',0)===2.1&&get('detail',1)===1;
  return false}
function chunkTrees(){
  const W=G().W;if(!W)return;const CELL=MOB?128:80;let made=0,inst=0,kept=0;
  const grp=TREE.group=new THREE.Group();grp.name='hf-trees';
  for(const m of W.children.slice()){
    if(!m.isInstancedMesh||!m.visible||m.instanceColor||!m.instanceMatrix||!m.instanceMatrix.array||!isTreeGeo(m.geometry))continue;
    const arr=m.instanceMatrix.array,n=Math.min(m.count,arr.length/16|0),cells=new Map();
    for(let i=0;i<n;i++){const o=i*16;if(arr[o]*arr[o]+arr[o+1]*arr[o+1]+arr[o+2]*arr[o+2]<1e-8)continue;   // zero-scale = hidden variant
      const k=Math.floor(arr[o+12]/CELL)+','+Math.floor(arr[o+14]/CELL);let a=cells.get(k);if(!a)cells.set(k,a=[]);a.push(i)}
    for(const idx of cells.values()){
      const g=m.geometry.clone(),im=new THREE.InstancedMesh(g,m.material,idx.length);let cx=0,cy=0,cz=0;
      idx.forEach((si,j)=>{const o=si*16;im.instanceMatrix.array.set(arr.subarray(o,o+16),j*16);cx+=arr[o+12];cy+=arr[o+13];cz+=arr[o+14]});
      cx/=idx.length;cy/=idx.length;cz/=idx.length;let r=0;
      for(const si of idx){const o=si*16;r=Math.max(r,Math.hypot(arr[o+12]-cx,arr[o+13]-cy,arr[o+14]-cz))}
      g.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,cy,cz),r+12);   // +12 m covers the crown of the biggest tree
      im.instanceMatrix.needsUpdate=true;im.castShadow=m.castShadow;im.receiveShadow=m.receiveShadow;im.frustumCulled=true;im.renderOrder=m.renderOrder;
      grp.add(im);made++;inst+=idx.length}
    m.visible=false;TREE.srcs.push(m);kept++}
  if(made){W.add(grp)}
  S2.treeChunks=made;S2.treeInstances=inst;log('tree chunks:',made,'from',kept,'instanced meshes,',inst,'instances')}
function treesReset(){if(TREE.group&&TREE.group.parent)TREE.group.parent.remove(TREE.group);TREE.group=null;TREE.srcs=[];TREE.done=false}
(function(){const sp=window.setPhase;if(typeof sp!=='function')return;window.setPhase=function(){treesReset();return sp.apply(this,arguments)}})();
(function(){const fw=window.frameWatch;if(typeof fw!=='function')return;
  window.frameWatch=function(dt){fw.apply(this,arguments);
    try{if(TREE.done||HF.noBatch)return;const g=G(),S=g.S;if(g.run&&S&&S.ph===4&&S.t>1.2&&g.CFG.batch!==false){TREE.done=true;chunkTrees()}}catch(e){TREE.done=true;console.error('tree chunking failed (trees stay as before)',e)}}})();
PERF._tree={run:()=>{TREE.done=true;chunkTrees()},state:()=>TREE};

/* ---------- 5. quality governor: last-resort safety net once dynamic resolution has hit its floor ---------- */
const L={level:0,bad:0,good:0,samples:[],base:null};
const sPQ=(0,eval)('v=>{PARTQ=v}'),sDQ=(0,eval)('v=>{DRAWQ=v}'),sLB=(0,eval)('v=>{LBUD=v}'),gv=(0,eval)('()=>({p:PARTQ,d:DRAWQ,l:LBUD})');
function applyLevel(){
  const g=G(),sun=g.sun,cam=g.cam;if(!sun||!cam)return;
  const lv=L.level;PERF.shadowEvery=lv>=1?3:2;
  if(lv>=2){const v=gv();if(!L.base)L.base=v;sPQ(Math.min(v.p,L.base.p*.6));sDQ(Math.min(v.d,L.base.d*.8));if(v.l>3||v.l===0){sLB(3);try{window.lampBudget&&window.lampBudget()}catch(e){}}cam.far=Math.max(500,cam.far*.85);cam.updateProjectionMatrix()}
  if(lv>=3){sun.castShadow=false}
  PERF.level=S2.level=lv}
(function(){const fw=window.frameWatch;if(typeof fw!=='function')return;let n=0,t0=0;
  window.frameWatch=function(dt){
    fw.apply(this,arguments);
    try{
      const g=G();if(!g.run||g.PM||g.PH||document.hidden){L.samples.length=0;return}
      L.samples.push(dt*1000);if(L.samples.length>150)L.samples.shift();
      if(++n%90!==0||L.samples.length<120)return;
      const avg=L.samples.reduce((a,b)=>a+b,0)/L.samples.length,cap=g.CFG.fpsCap,tgt=cap?1000/cap:1000/Math.min(120,(PERF.refresh||60)),floor=MOB?.55:.6,now=performance.now();
      if(now-t0<8000)return;
      const atFloor=g.DYN<=floor+.001;
      if(atFloor&&avg>tgt*1.4&&L.level<3){L.bad++;L.good=0;if(L.bad>=2){L.level++;L.bad=0;t0=now;L.samples.length=0;(window.applyGfx||(()=>{}))();log('governor level',L.level)}}
      else if(L.level>0&&avg<tgt*1.05){L.good++;L.bad=0;if(L.good>=8){L.level--;L.good=0;t0=now;L.samples.length=0;L.base&&L.level<2&&(sPQ(L.base.p),sDQ(L.base.d));(window.applyGfx||(()=>{}))();log('governor level',L.level)}}
      else{L.bad=0;L.good=0}
    }catch(e){}
  }})();
PERF.governor=()=>L;
log('perf2 ready');
}catch(err){console.error('perf2.js failed to start',err)}
})();
