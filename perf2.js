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
(function(){const sp=window.setPhase;if(typeof sp!=='function')return;window.setPhase=function(){treesReset();try{LITE.done.clear();LITE.mode=0;LITE.map.clear()}catch(e){}return sp.apply(this,arguments)}})();
(function(){const fw=window.frameWatch;if(typeof fw!=='function')return;
  window.frameWatch=function(dt){fw.apply(this,arguments);
    try{if(TREE.done||HF.noBatch)return;const g=G(),S=g.S;if(g.run&&S&&S.ph===4&&S.t>1.2&&g.CFG.batch!==false){TREE.done=true;chunkTrees()}}catch(e){TREE.done=true;console.error('tree chunking failed (trees stay as before)',e)}}})();
PERF._tree={run:()=>{TREE.done=true;chunkTrees()},state:()=>TREE};

/* ---------- 5. adaptive quality governor ----------
   Two independent ladders, because "slow" has two different causes and they need different cures:
     GPU ladder  (frame time >> JS time: the GPU is busy shading pixels): bloom -> fewer lights/smaller shadow map -> env map off ->
                 cheap lighting on scenery -> cheap lighting everywhere -> shadows off
     CPU ladder  (JS time ~ frame time: too many objects / too much logic): shadow rate -> particles + draw distance -> shadow pass off -> shorter view
   Resolution (perf.js) is only allowed to drop far once the cheaper options are used, so the picture stays sharp as long as possible.
   The level reached is remembered between sessions so the next start is already stable. */
const L={gl:0,cl:0,bad:0,good:0,samples:[],js:[],base:null,sw:false,last:0};
const sPQ=(0,eval)('v=>{PARTQ=v}'),sDQ=(0,eval)('v=>{DRAWQ=v}'),sLB=(0,eval)('v=>{LBUD=v}'),sBL=(0,eval)('v=>{BLOOM=v}'),gv=(0,eval)('()=>({p:PARTQ,d:DRAWQ,l:LBUD,b:BLOOM})');
const GL_MAX=6,CL_MAX=4,KEY='hf_gov';
try{const sv=JSON.parse(localStorage.getItem(KEY)||'null');if(sv&&sv.v===1){L.gl=Math.min(GL_MAX,sv.gl|0);L.cl=Math.min(CL_MAX,sv.cl|0)}}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({v:1,gl:L.gl,cl:L.cl}))}catch(e){}};
/* ----- cheap lighting swap (Standard PBR -> Lambert). Colour / emissive objects are SHARED with the original material, so seasonal tints,
   wrecks and day/night glow keep working. Fully reversible. ----- */
const LITE={map:new Map(),done:new Map(),mode:0};
const OBC=THREE.Material.prototype.onBeforeCompile;
function liteOf(m){
  let l=LITE.map.get(m);if(l!==undefined)return l;
  if(!m||!m.isMeshStandardMaterial||m.isMeshPhysicalMaterial||m.transparent||m.flatShading||m.onBeforeCompile!==OBC||m.wireframe){LITE.map.set(m,null);return null}
  l=new THREE.MeshLambertMaterial({vertexColors:!!m.vertexColors,map:m.map||null,emissiveMap:m.emissiveMap||null,side:m.side,fog:m.fog!==false,alphaTest:m.alphaTest||0,
    polygonOffset:!!m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor||0,polygonOffsetUnits:m.polygonOffsetUnits||0});
  l.color=m.color;l.emissive=m.emissive;l.emissiveIntensity=m.emissiveIntensity;m.__lite=l;LITE.map.set(m,l);return l}
function liteApply(mode){   // mode 1 = merged scenery + ground, 2 = everything
  const W=G().W;if(!W)return;let n=0;
  const ground=new Set(PERF.groundMeshes||[]);
  W.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||LITE.done.has(o))return;
    const m=o.material;if(!m||Array.isArray(m))return;
    if(mode===1&&!(o.userData&&o.userData.hfBatch)&&!ground.has(o))return;
    const l=liteOf(m);if(l){LITE.done.set(o,m);o.material=l;n++}});
  LITE.mode=mode;S2.lite=LITE.done.size;return n}
function liteRestore(){for(const [o,m] of LITE.done)o.material=m;LITE.done.clear();LITE.mode=0;S2.lite=0}
let envBackup;
function applyLevel(){
  const g=G(),sun=g.sun,cam=g.cam,sc=g.sc||(0,eval)('sc');if(!sun||!cam)return;
  const gl=L.gl,cl=L.cl;
  /* CPU ladder */
  PERF.shadowEvery=(cl>=1||gl>=1)?3:2;
  /* GPU ladder */
  if(gl>=1)sBL(false);
  if(gl>=2){const v=gv();if(!L.base)L.base=v;if(v.l>4||v.l===0){sLB(4);try{window.lampBudget&&window.lampBudget()}catch(e){}}
    if(sun.shadow.mapSize.x>1024){sun.shadow.mapSize.set(1024,1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}}
  if(gl>=5){const v=gv();if(v.l>2){sLB(2);try{window.lampBudget&&window.lampBudget()}catch(e){}}}
  if(gl>=3){if(sc&&sc.environment){envBackup=sc.environment;sc.environment=null}}else if(envBackup&&sc){sc.environment=envBackup;envBackup=null}
  const wantLite=gl>=5?2:gl>=4?1:0;
  if(wantLite===0&&LITE.mode)liteRestore();else if(wantLite&&wantLite!==LITE.mode){if(LITE.mode&&wantLite<LITE.mode)liteRestore();liteApply(wantLite)}
  /* CPU ladder (continued) */
  if(cl>=2||gl>=6){const v=gv();if(!L.base)L.base=v;sPQ(Math.min(v.p,L.base.p*.6));sDQ(Math.min(v.d,L.base.d*(cl>=4?.7:.85)));cam.far=Math.max(500,cam.far*(cl>=4?.7:.85));cam.updateProjectionMatrix()}
  if(cl>=3||gl>=6){sun.castShadow=false}
  PERF.gl=gl;PERF.cl=cl;PERF.level=S2.level=Math.max(gl,cl);S2.gl=gl;S2.cl=cl}
(function(){const fw=window.frameWatch;if(typeof fw!=='function')return;let n=0;
  /* split frame time into "JS + draw submission" and the rest (= waiting for the GPU) */
  const li=window.loopInner;if(typeof li==='function'){window.loopInner=function(){const t=performance.now();const r=li.apply(this,arguments);PERF.jsMs=(PERF.jsMs||0)*.9+(performance.now()-t)*.1;return r}}
  window.frameWatch=function(dt){
    fw.apply(this,arguments);
    try{
      const g=G();if(!g.run||g.PM||g.PH||document.hidden){L.samples.length=0;return}
      L.samples.push(dt*1000);if(L.samples.length>150)L.samples.shift();
      const now=performance.now();
      if(now-L.last<1500||L.samples.length<45)return;L.last=now;
      const rs=L.samples.slice(-90),avg=rs.reduce((a,b)=>a+b,0)/rs.length,cap=g.CFG.fpsCap,tgt=cap?1000/cap:1000/Math.min(120,(PERF.refresh||60));
      const cpuFrac=Math.min(1.5,(PERF.jsMs||0)/Math.max(1,avg));PERF.cpuFrac=cpuFrac;
      if(g.CFG.autoQ===false)return;
      const slow=avg>tgt*1.25,severe=avg>tgt*2;
      if(slow){
        L.good=0;L.bad++;
        if(L.bad>=(severe?1:2)&&now-(L.t||0)>(severe?2500:4500)){
          L.bad=0;L.t=now;L.samples.length=0;
          // CPU-bound (JS + draw submission eats most of the frame) -> CPU ladder, otherwise the GPU is the bottleneck -> GPU ladder
          if(cpuFrac>.7&&L.cl<CL_MAX)L.cl++;else if(L.gl<GL_MAX)L.gl++;else if(L.cl<CL_MAX)L.cl++;
          log('governor gl',L.gl,'cl',L.cl,'avg',avg.toFixed(1),'ms cpu',(cpuFrac*100|0)+'%');save();(window.applyGfx||(()=>{}))()}
      }else if((L.gl||L.cl)&&avg<tgt*.8){
        L.bad=0;L.good++;
        if(L.good>=14&&now-(L.t||0)>20000){L.good=0;L.t=now;L.samples.length=0;if(L.cl>0&&(L.cl>=L.gl||!L.gl))L.cl--;else L.gl--;L.base&&(L.gl<2&&L.cl<2)&&(sPQ(L.base.p),sDQ(L.base.d));save();(window.applyGfx||(()=>{}))();log('governor relaxed gl',L.gl,'cl',L.cl)}
      }else{L.bad=0;L.good=0}
    }catch(e){}
  }})();
/* software rendering (browser hardware acceleration off) is the single worst case: detect it, start at the cheapest level, tell the player */
(function(){try{const R=G().R,gl=R.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const name=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'(masked)';PERF.gpu=name;
  if(/swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(name)){L.sw=true;L.gl=Math.max(L.gl,4);L.cl=Math.max(L.cl,2);
    setTimeout(()=>{const t=document.createElement('div');t.id='tip';t.className='on';t.innerHTML='Your browser is rendering in software (hardware acceleration looks OFF). Turn on <b>Use graphics acceleration</b> in the browser settings for 5-10x more speed.<button onclick="this.parentNode.remove()">OK</button>';document.body.appendChild(t)},6000)}}catch(e){}})();
PERF.governor=()=>L;
/* ---------- 6. performance overlay (?debug, or Phone > Settings > Performance overlay): shows where the time goes ---------- */
(function(){
  let box,txt,acc=0,frames=0,last=performance.now(),fps=0,rc=0,tris=0,calls=0;const R=G().R;
  const hudOn=()=>HF.debug||G().CFG&&G().CFG.perfHud;
  const inner=R.render;
  R.render=function(s,c){
    if(!hudOn())return inner.call(R,s,c);
    const top=!R.__in;if(top){R.__in=1;R.info.autoReset=false;R.info.reset();rc=performance.now()}
    try{return inner.call(R,s,c)}finally{if(top){R.__in=0;PERF.renderMs=(PERF.renderMs||0)*.9+(performance.now()-rc)*.1;calls=R.info.render.calls;tris=R.info.render.triangles}}};
  function report(){
    const g=G(),I=G().R.info;return{ua:navigator.userAgent,gpu:PERF.gpu,fps:Math.round(fps),dyn:g.DYN,gl:L.gl,cl:L.cl,jsMs:+(PERF.jsMs||0).toFixed(1),renderSubmitMs:+(PERF.renderMs||0).toFixed(1),cpuFrac:+(PERF.cpuFrac||0).toFixed(2),
      calls,tris,geometries:I.memory&&I.memory.geometries,textures:I.memory&&I.memory.textures,programs:I.programs&&I.programs.length,batch:PERF.batch,ground:PERF.ground,p2:S2,
      cfg:{gfx:g.CFG.gfx,fpsCap:g.CFG.fpsCap,resScale:g.CFG.resScale,autoQ:g.CFG.autoQ,lamps:g.CFG.lamps,shadow:g.CFG.shadow},size:[innerWidth,innerHeight,devicePixelRatio],sw:L.sw}}
  function tick(){
    frames++;const n=performance.now();if(n-last<500){requestAnimationFrame(tick);return}
    fps=frames*1000/(n-last);frames=0;last=n;
    if(hudOn()){
      if(!box){box=document.createElement('div');box.id='perfhud';box.innerHTML='<pre></pre><button>copy report</button>';document.body.appendChild(box);txt=box.querySelector('pre');
        box.querySelector('button').onclick=()=>{const t=JSON.stringify(report(),null,1);try{navigator.clipboard.writeText(t);box.querySelector('button').textContent='copied!'}catch(e){window.prompt('Copy this report',t)}setTimeout(()=>box.querySelector('button').textContent='copy report',1500)}}
      box.style.display='block';const g=G(),r=report();
      txt.textContent='FPS '+r.fps+'  ('+(1000/Math.max(1,r.fps)).toFixed(1)+' ms)  res '+Math.round((g.DYN||1)*100)+'%\nJS '+r.jsMs+' ms  draw-submit '+r.renderSubmitMs+' ms  cpu '+Math.round(r.cpuFrac*100)+'%\ncalls '+calls+'  tris '+(tris/1000|0)+'k  progs '+r.programs+'\nGPU ladder '+L.gl+'/'+GL_MAX+'  CPU ladder '+L.cl+'/'+CL_MAX+'  lite '+(S2.lite||0)+'\nbatch '+(PERF.batch&&PERF.batch.state)+'  trees '+(S2.treeChunks||0)+'  pruned '+(S2.pruned||0)+'\n'+(PERF.gpu||'');
    }else if(box)box.style.display='none';
    requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
})();

try{window.applyGfx()}catch(e){}   // apply any remembered governor level right away
log('perf2 ready');
}catch(err){console.error('perf2.js failed to start',err)}
})();
