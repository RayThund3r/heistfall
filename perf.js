/* HEISTFALL performance layer. Loaded after game.js; touches the game only through its public globals.
   1. device-aware graphics profile (pixel ratio, shadows, lights, bloom)   2. stable dynamic resolution
   3. throttled shadow-map updates                                           4. static batching (20k draw calls -> a few hundred)
   Every part is wrapped so that a failure falls back to the original game behaviour.                         */
(function(){'use strict';
try{
const HF=window.HF||{},MOB=!!HF.mobile;
const PK=(0,eval)('(()=>({S,run,PM,PH,CUT,mode,CFG,S0,W,R,sc,cam,sun,comp,FURN,WMS,LTS,LODS,DEV,GFXQ,DYN,FPSA,BLOOM}))');
const G=n=>{try{return PK()[n]}catch(e){return undefined}};
const setFPSA=(0,eval)('v=>{FPSA=v}'),setDYN=(0,eval)('v=>{DYN=v}'),setBLOOM=(0,eval)('v=>{BLOOM=v}'),setLBUD=(0,eval)('v=>{LBUD=v}'),setLQ=(0,eval)('v=>{LQ=v}'),setPQ=(0,eval)('v=>{PARTQ=v}'),setDQ=(0,eval)('v=>{DRAWQ=v}');
const CFG=G('CFG'),R=G('R'),sun=G('sun'),cam=G('cam'),sc=G('sc'),W=G('W');
const now=()=>performance.now();
const PERF=window.HFPERF={dyn:1,shadowEvery:2,batch:{state:'idle',meshesBefore:0,meshesAfter:0,units:0,reverts:0},log:[]};
const log=(...a)=>{PERF.log.push(a.join(' '));if(HF.debug)console.log('[perf]',...a)};

/* ================= 1. graphics profile ================= */
/* one-time migration so existing saved settings (lamps=0 meant "ALL lights on High") pick up the new budget */
try{
  if((CFG.hfPerf||0)<3){
    CFG.hfPerf=3;
    if(!MOB&&CFG.fpsCap===30)CFG.fpsCap=0;   // old auto-detect capped desktops at 30 fps when the browser hid the GPU name
    if(MOB){CFG.resScale=1;CFG.part=Math.min(CFG.part||1,.6);if(!CFG.fpsCap)CFG.fpsCap=HF.lowEnd?30:60;if(CFG.gfx>1)CFG.gfx=1;CFG.bloomOn=false}
    CFG.lamps=0;
    if(typeof saveCfg==='function')saveCfg();
  }
}catch(e){}
const LAMPS_AUTO=[6,8,12,20];   // real point lights by tier (the old High/Ultra default lit all 72 lamps = 72-light shaders)
function lampBudgetFor(g){const c=CFG.lamps||0;if(c===0){let n=LAMPS_AUTO[Math.max(0,Math.min(3,g))];if(MOB)n=Math.min(n,HF.lowEnd?4:6);return n}return[0,8,16,32,0][c]}
let lastPR=0,lastW=0,lastH=0,lastSun=0;
const _applyOrig=window.applyGfx;
window.applyGfx=function(){
  try{
    const GFXQ=G('GFXQ'),g=CFG.gfx|0,q=GFXQ[g],DYN=G('DYN'),comp=G('comp');
    const cap=MOB?(HF.lowEnd?1:1.25):2;
    const base=MOB?((HF.lowEnd?.85:1)*(g>=2?1.15:1)):q.pr;   // phones: fixed sensible base, dynamic resolution handles the rest
    const pr=Math.max(.5,Math.min(window.devicePixelRatio||1,base*(CFG.resScale||1),cap)*DYN);
    const w=innerWidth,h=innerHeight;
    if(Math.abs(pr-lastPR)>.005||w!==lastW||h!==lastH){R.setPixelRatio(pr);R.setSize(w,h);if(comp)comp.setSize(w,h);lastPR=pr;lastW=w;lastH=h}
    const bl=q.bloom&&CFG.bloomOn!==false&&!(MOB&&g<2);setBLOOM(bl);
    let sh=CFG.shadow>=0?CFG.shadow:q.sh;if(MOB)sh=Math.min(sh,HF.lowEnd?1:2);
    const n=[512,1024,2048,4096][Math.max(0,Math.min(3,sh))];
    if(sun.shadow.mapSize.x!==n){sun.shadow.mapSize.set(n,n);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
    sun.castShadow=sh>0;R.shadowMap.needsUpdate=true;
    setLQ(q.lights);
    const lb=lampBudgetFor(g);setLBUD(lb);const LTS=G('LTS');if(!lb)LTS.forEach(l=>l.visible=true);else if(typeof lampBudget==='function')lampBudget();
    setPQ(q.part*(CFG.part||1));setDQ(q.draw*(CFG.draw||1));
    cam.far=Math.max(500,2600*q.draw*(CFG.draw||1));cam.updateProjectionMatrix();
    const CLD=(0,eval)('CLD');CLD.forEach(c=>c.visible=q.clouds&&!(MOB&&g===0));
    if(MOB&&sc.environment)sc.environment=null;   // PBR env-map reflections are wasted work on phones
  }catch(e){console.error('applyGfx(perf) failed, using original',e);try{_applyOrig()}catch(_){}}
};

/* ================= 2. stable dynamic resolution + frame bookkeeping ================= */
const D={samples:[],refresh:0,lastChange:0,bad:0,good:0,capUp:1,capUntil:0,runSince:0};
let frameNo=0;
function target(){const cap=CFG.fpsCap;if(cap)return 1000/cap;return 1000/(D.refresh||60)}
function sampleRefresh(ms){ // refresh rate = fastest typical frame interval seen early on
  if(D.refresh||D.samples.length<90)return;const a=D.samples.slice().sort((x,y)=>x-y),m=a[Math.floor(a.length*.2)];
  const hz=1000/m;D.refresh=hz>125?144:hz>100?120:hz>80?90:hz>66?72:60;PERF.refresh=D.refresh;log('refresh≈',D.refresh)}
const _fwOrig=window.frameWatch;
window.frameWatch=function(dt){
  frameNo++;PERF.frame=frameNo;
  try{
    const S=G('S'),run=G('run'),PM=G('PM');
    // --- original bookkeeping (FPS counter, wasted/busted end) without its resolution thrash ---
    const fp=G('FPSA')+(dt-G('FPSA'))*.05;setFPSA(fp);
    const el=document.getElementById('fps');
    if(el){if(CFG.fps||HF.debug){if(frameNo%15===0){const i=R.info&&R.info.render;el.textContent=Math.round(1/Math.max(.001,fp))+' FPS · '+Math.round(G('DYN')*100)+'%'+(HF.debug&&i?' · '+i.calls+' calls · '+PERF.batch.state:'')}}else if(el.textContent)el.textContent=''}
    if(S&&S.wst&&now()>S.wend+2500&&S.ph==4)(0,eval)('wastedEnd()');
    if(S&&S.bst&&now()>S.bend+2500&&S.ph==4)(0,eval)('bustedEnd()');
    // --- dynamic resolution ---
    if(run&&!PM&&!document.hidden){
      if(!D.runSince)D.runSince=now();
      const ms=dt*1000;D.samples.push(ms);if(D.samples.length>120)D.samples.shift();sampleRefresh(ms);
      if(CFG.autoQ!==false&&now()-D.runSince>4000&&D.samples.length>=90&&frameNo%60===0){
        const avg=D.samples.reduce((a,b)=>a+b,0)/D.samples.length,t=target(),DYN=G('DYN'),minD=MOB?.55:.6,t0=now();
        if(avg>t*1.32&&DYN>minD&&t0-D.lastChange>5000){D.good=0;D.bad++;
          if(D.bad>=2){const nd=Math.max(minD,Math.round((DYN-.1)*20)/20);setDYN(nd);D.lastChange=t0;D.bad=0;D.capUp=Math.min(D.capUp,nd+.05);D.capUntil=t0+60000;D.samples.length=0;window.applyGfx();log('DRS down',nd)}}
        else if(avg<t*1.1&&DYN<1&&t0-D.lastChange>9000){D.bad=0;D.good++;
          if(D.good>=3){const lim=t0<D.capUntil?D.capUp:1,nd=Math.min(lim,Math.round((DYN+.05)*20)/20);if(nd>DYN){setDYN(nd);D.lastChange=t0;D.samples.length=0;window.applyGfx();log('DRS up',nd)}D.good=0}}
        else{D.bad=0;D.good=0}
        PERF.dyn=G('DYN');
      }
    }else if(!run){D.runSince=0}
    batchTick();
  }catch(e){console.error('frameWatch(perf)',e);try{_fwOrig(dt)}catch(_){}}
};

/* ================= 3. throttled shadow updates ================= */
(function(){
  const inner=R.render;let lastRun=0;
  R.render=function(s,c){
    try{
      const run=G('run');
      // the shadow map is re-rendered every Nth displayed frame (shadows follow the player so one frame of lag is invisible)
      const every=run?(CFG.shadowFull?1:(PERF.shadowEvery||2)):1;
      if(every>1&&R.shadowMap.enabled&&frameNo!==lastRun){lastRun=frameNo;R.shadowMap.autoUpdate=false;if(frameNo%every===0)R.shadowMap.needsUpdate=true}
      else if(every===1)R.shadowMap.autoUpdate=true;
    }catch(e){}
    return inner.call(R,s,c);
  };
})();

/* ================= 4. static batching ================= */
const CELL=MOB?64:48,MAXV=60000;
const B={job:null,fired:false,units:[],entries:[],groups:[],matPairs:[],cursor:0,gcursor:0,mcursor:0,BW:null,t0:0};
function bReset(){ // new world: forget everything (the old meshes are discarded by the game itself)
  if(B.BW&&B.BW.parent)B.BW.parent.remove(B.BW);
  Object.assign(B,{layered:false,job:null,fired:false,units:[],entries:[],groups:[],matPairs:[],cursor:0,gcursor:0,mcursor:0,BW:null,t0:0});
  PERF.batch.state='idle';
}
const _spOrig=window.setPhase;
window.setPhase=function(n){bReset();try{G('FURN').length=0}catch(e){}return _spOrig.apply(this,arguments)};

const BASE_KEYS=new Set(Object.keys(new THREE.Group()));
const isPlain=o=>{if(!o.isGroup)return false;for(const k in o.userData)return false;for(const k of Object.keys(o))if(!BASE_KEYS.has(k))return false;return true};
const mtype=m=>m.isMeshStandardMaterial?'S':m.isMeshBasicMaterial?'B':m.isMeshLambertMaterial?'L':m.isMeshPhongMaterial?'P':null;
function okMesh(m){
  if(!m.isMesh||m.isInstancedMesh||m.isSkinnedMesh||!m.visible||m.renderOrder!==0||m.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender)return false;
  for(const k in m.userData)return false;
  const mt=m.material,g=m.geometry;
  if(!mt||Array.isArray(mt)||!g||!mtype(mt)||mt.transparent||mt.visible===false||mt.vertexColors||mt.wireframe||mt.alphaTest||mt.depthWrite===false||mt.depthTest===false||mt.blending!==1)return false;
  if(mt.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)return false;
  const a=g.attributes;if(!a||!a.position)return false;
  for(const k in a)if(k!=='position'&&k!=='normal'&&k!=='uv')return false;
  if(g.groups&&g.groups.length)return false;if(g.morphAttributes&&Object.keys(g.morphAttributes).length)return false;
  if(mtype(mt)!=='B'&&!a.normal)return false;
  if((mt.map||mt.emissiveMap)&&!a.uv)return false;
  if(a.position.count>12000)return false;
  if(!g.boundingSphere)g.computeBoundingSphere();
  const r=g.boundingSphere?g.boundingSphere.radius*Math.max(Math.abs(m.scale.x),Math.abs(m.scale.y),Math.abs(m.scale.z)):0;
  if(!(r>0)||r>CELL*.75)return false;
  return true;
}
function matKey(m,cs,rs){
  const t=mtype(m);
  return [t,cs?1:0,rs?1:0,t==='S'?(m.roughness+'|'+m.metalness+'|'+(m.flatShading?1:0)):'',m.emissive?m.emissive.getHex()+'|'+m.emissiveIntensity:'',m.map?m.map.uuid:'',m.emissiveMap?m.emissiveMap.uuid:'',m.side,m.fog===false?0:1,m.envMapIntensity===undefined?'':m.envMapIntensity,m.polygonOffset?(m.polygonOffsetFactor+'/'+m.polygonOffsetUnits):''].join('~');
}
function snapObj(o,a,i){const p=o.position,r=o.rotation,s=o.scale;a[i]=p.x;a[i+1]=p.y;a[i+2]=p.z;a[i+3]=r.x;a[i+4]=r.y;a[i+5]=r.z;a[i+6]=s.x;a[i+7]=s.y;a[i+8]=s.z;a[i+9]=o.visible?1:0}
function sameObj(o,a,i){const p=o.position,r=o.rotation,s=o.scale;return a[i]===p.x&&a[i+1]===p.y&&a[i+2]===p.z&&a[i+3]===r.x&&a[i+4]===r.y&&a[i+5]===r.z&&a[i+6]===s.x&&a[i+7]===s.y&&a[i+8]===s.z&&a[i+9]===(o.visible?1:0)}

function* batchJob(){
  const t0=now(),stats=PERF.batch;stats.state='scanning';
  const FURN=G('FURN')||[],LODS=G('LODS')||[];
  W.updateMatrixWorld(true);
  const e=W.matrixWorld.elements;if(Math.abs(e[0]-1)+Math.abs(e[5]-1)+Math.abs(e[10]-1)+Math.abs(e[12])+Math.abs(e[13])+Math.abs(e[14])>1e-6){log('W not identity: batching skipped');stats.state='skipped';return}
  /* ---- collect candidates ---- */
  const excl=new Set();for(const f of FURN)for(const o of f.l)excl.add(o);for(const o of LODS)excl.add(o);
  const cand=[],grp=[];   // cand: {m, grpIdx[]}
  let total=0;
  const walk=(o,gchain)=>{
    if(o.isMesh){total++;if(okMesh(o))cand.push({m:o,gc:gchain});return}
    if(o.isGroup&&isPlain(o)&&!excl.has(o)){const gi=grp.length;grp.push(o);const ch=gchain.concat(gi);for(const c of o.children.slice())walk(c,ch)}
  };
  let i=0;for(const c of W.children.slice()){if(!excl.has(c))walk(c,[]);if((++i&255)===0)yield}
  stats.meshesBefore=total;
  yield;
  /* ---- observe: anything that moves, toggles or recolours in the next ~2.5 s is not static ---- */
  const sn=new Float64Array(cand.length*10),gs=new Float64Array(grp.length*10);
  const msnap=new Map();
  const mats=(a,k)=>{const m=a.material;if(!msnap.has(m))msnap.set(m,[m.color.getHex(),m.emissive?m.emissive.getHex():0,m.emissiveIntensity,m.opacity,m.roughness,m.metalness]);};
  cand.forEach((c,k)=>{snapObj(c.m,sn,k*10);mats(c.m)});grp.forEach((o,k)=>snapObj(o,gs,k*10));
  const tEnd=now()+1500;while(now()<tEnd)yield;
  stats.state='baking';
  const badG=new Set();grp.forEach((o,k)=>{if(!sameObj(o,gs,k*10)||!o.visible)badG.add(k)});
  const keep=[];
  cand.forEach((c,k)=>{
    if(!sameObj(c.m,sn,k*10))return;
    for(const gi of c.gc)if(badG.has(gi))return;
    const s=msnap.get(c.m.material),m=c.m.material;if(s[0]!==m.color.getHex()||s[1]!==(m.emissive?m.emissive.getHex():0)||s[2]!==m.emissiveIntensity||s[3]!==m.opacity)return;
    keep.push(c);
  });
  yield;
  W.updateMatrixWorld(true);
  /* ---- group into units: (cell, material key) ---- */
  const wms=new Set(G('WMS')||[]);
  const cells=new Map();
  for(const c of keep){const m=c.m,e=m.matrixWorld.elements,cx=Math.floor(e[12]/CELL),cz=Math.floor(e[14]/CELL),key=cx+','+cz+'|'+matKey(m.material,m.castShadow,m.receiveShadow);let a=cells.get(key);if(!a)cells.set(key,a=[]);a.push(c)}
  yield;
  const BW=B.BW=new THREE.Group();BW.name='hf-batched';BW.matrixAutoUpdate=false;W.add(BW);
  const mmCache=new Map();let nUnits=0,removed=0;
  const mkMat=(src,key)=>{
    let mm=mmCache.get(key);if(mm)return mm;
    const o={vertexColors:true,color:0xffffff,side:src.side,fog:src.fog!==false};
    if(src.polygonOffset){o.polygonOffset=true;o.polygonOffsetFactor=src.polygonOffsetFactor;o.polygonOffsetUnits=src.polygonOffsetUnits}
    if(src.map)o.map=src.map;
    if(src.emissive&&(src.emissive.getHex()||src.emissiveMap)){o.emissive=src.emissive.clone();o.emissiveIntensity=src.emissiveIntensity;if(src.emissiveMap)o.emissiveMap=src.emissiveMap}
    const t=mtype(src);
    if(t==='B')mm=new THREE.MeshBasicMaterial(o);
    else if(MOB&&!src.flatShading)mm=new THREE.MeshLambertMaterial(o);
    else{mm=new THREE.MeshStandardMaterial(o);mm.roughness=src.roughness;mm.metalness=src.metalness;mm.flatShading=!!src.flatShading;if(src.envMapIntensity!==undefined)mm.envMapIntensity=src.envMapIntensity}
    mm.userData.hf=1;mmCache.set(key,mm);return mm;
  };
  let spent=now();
  for(const [key,list] of cells){
    const src0=list[0].m,mk=key.slice(key.indexOf('|')+1),mm=mkMat(src0.material,mk);
    let part=[],verts=0;
    const flush=()=>{
      if(!part.length)return;
      const geo=mergeGeo(part,!!mm.map||!!mm.emissiveMap,mtype(src0.material)!=='B');
      if(!geo){part=[];verts=0;return}
      const mesh=new THREE.Mesh(geo,mm);mesh.castShadow=src0.castShadow;mesh.receiveShadow=src0.receiveShadow;mesh.matrixAutoUpdate=false;mesh.userData.hfBatch=1;
      geo.computeBoundingSphere();BW.add(mesh);
      const u={mesh,srcs:part.map(p=>p.c),dead:false,parents:new Map()};
      for(const p of part){const m=p.c.m;u.parents.set(m,m.parent);p.c.unit=u}
      B.units.push(u);nUnits++;part=[];verts=0;
    };
    for(const c of list){const n=c.m.geometry.attributes.position.count;if(verts+n>MAXV)flush();part.push({c,m:c.m});verts+=n;}
    flush();
    if(now()-spent>6){yield;spent=now()}
  }
  yield;
  /* ---- detach originals (kept alive for revert), set up monitoring ---- */
  const pmat=new Map();
  for(const u of B.units){
    for(const c of u.srcs){const m=c.m,par=m.parent;if(par){par.remove(m);removed++}
      const idx=B.entries.length;B.entries.push({o:c.m,unit:u});
      const mo=m.material;if(!pmat.has(mo)){pmat.set(mo,{mo,mms:new Set(),snap:msnap.get(mo)||[0,0,0,0],wms:wms.has(mo),units:new Set()})}pmat.get(mo).units.add(u);pmat.get(mo).mms.add(u.mesh.material);
      try{m.geometry.dispose()}catch(_){}
    }
    if(now()-spent>6){yield;spent=now()}
  }
  B.snapE=new Float64Array(B.entries.length*10);B.entries.forEach((en,k)=>snapObj(en.o,B.snapE,k*10));
  B.groups=grp.map((o,k)=>({o,k,units:new Set()}));B.snapG=gs;
  for(const u of B.units)for(const c of u.srcs)for(const gi of c.gc)B.groups[gi].units.add(u);
  B.matPairs=[...pmat.values()];
  // remove now-empty plain groups from the scene (kept for revert)
  for(const g of B.groups){if(g.o.children.length===0&&g.o.parent){g.parent=g.o.parent;g.o.parent.remove(g.o);g.detached=true}}
  yield;
  /* ---- furniture: one merged mesh set per building, toggled by the game's own interior-culling ---- */
  let furnUnits=0;
  for(const f of FURN){
    try{
      const items=[];const rest=[];
      const wg=[];const walkF=(o)=>{ if(o.isMesh){ if(okMesh(o))items.push({m:o}); else rest.push(o); } else if(o.isGroup&&isPlain(o)){ wg.push(o);for(const c of o.children.slice())walkF(c);} else rest.push(o) };
      for(const o of f.l)walkF(o);
      if(items.length<4)continue;
      const byKey=new Map();for(const it of items){const m=it.m,key=matKey(m.material,m.castShadow,m.receiveShadow);let a=byKey.get(key);if(!a)byKey.set(key,a=[]);a.push(it)}
      const out=[];
      for(const [k,list] of byKey){const s0=list[0].m,mm=mkMat(s0.material,k);let part=[],verts=0;
        const fl=()=>{if(!part.length)return;const geo=mergeGeo(part.map(p=>({c:p,m:p.m})),!!mm.map||!!mm.emissiveMap,mtype(s0.material)!=='B');if(geo){const mesh=new THREE.Mesh(geo,mm);mesh.castShadow=s0.castShadow;mesh.receiveShadow=s0.receiveShadow;mesh.matrixAutoUpdate=false;mesh.userData.hfBatch=1;geo.computeBoundingSphere();mesh.visible=f.v;BW.add(mesh);out.push(mesh);furnUnits++;for(const p of part){const m=p.m;if(m.parent)m.parent.remove(m);try{m.geometry.dispose()}catch(_){}}}part=[];verts=0};
        for(const it of list){const n=it.m.geometry.attributes.position.count;if(verts+n>MAXV)fl();part.push(it);verts+=n}fl()}
      if(out.length){for(const g of wg)if(g.children.length&&!rest.includes(g))rest.push(g);f.l.length=0;for(const o of rest)if(!f.l.includes(o))f.l.push(o);for(const o of out)f.l.push(o);if(!f.l.length)f.l.push(out[0])}
    }catch(err){console.error('furniture batch failed for one building',err)}
    if(now()-spent>6){yield;spent=now()}
  }
  stats.units=nUnits+furnUnits;stats.meshesAfter=total-removed+B.units.length;
  stats.ms=Math.round(now()-t0);stats.removed=removed;stats.state='active';
  try{G('R').compile(G('sc'),G('cam'))}catch(e){}   // build every shader program now (spawn hitch) instead of mid-game stutters
  log('static batch: removed',removed,'meshes ->',nUnits,'+',furnUnits,'furniture batches');
  PERF.dyn=G('DYN');
}

/* geometry merge: bake world transform + per-vertex colour from the source material */
function mergeGeo(parts,needUV,needNormal){
  let nv=0,ni=0;for(const p of parts){const g=p.m.geometry;nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count}
  const pos=new Float32Array(nv*3),nor=needNormal?new Float32Array(nv*3):null,uv=needUV?new Float32Array(nv*2):null,col=new Float32Array(nv*3);
  const idx=nv>65535?new Uint32Array(ni):new Uint16Array(ni);
  let vo=0,io=0;
  for(const p of parts){
    const m=p.m,g=m.geometry,a=g.attributes,pa=a.position,na=a.normal,ua=a.uv,e=m.matrixWorld.elements,n=pa.count,c=m.material.color;
    const e0=e[0],e1=e[1],e2=e[2],e4=e[4],e5=e[5],e6=e[6],e8=e[8],e9=e[9],e10=e[10],e12=e[12],e13=e[13],e14=e[14];
    const det=e0*(e5*e10-e6*e9)-e4*(e1*e10-e2*e9)+e8*(e1*e6-e2*e5);
    // normal matrix = inverse-transpose of the upper 3x3 (cofactors / det)
    const id=det?1/det:0,
      n0=(e5*e10-e6*e9)*id,n1=(e6*e8-e4*e10)*id,n2=(e4*e9-e5*e8)*id,
      n3=(e2*e9-e1*e10)*id,n4=(e0*e10-e2*e8)*id,n5=(e1*e8-e0*e9)*id,
      n6=(e1*e6-e2*e5)*id,n7=(e2*e4-e0*e6)*id,n8=(e0*e5-e1*e4)*id;
    for(let i=0;i<n;i++){
      const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i),o=(vo+i)*3;
      pos[o]=e0*x+e4*y+e8*z+e12;pos[o+1]=e1*x+e5*y+e9*z+e13;pos[o+2]=e2*x+e6*y+e10*z+e14;
      if(nor&&na){const nx=na.getX(i),ny=na.getY(i),nz=na.getZ(i);let X=n0*nx+n1*ny+n2*nz,Y=n3*nx+n4*ny+n5*nz,Z=n6*nx+n7*ny+n8*nz;const l=Math.hypot(X,Y,Z)||1;nor[o]=X/l;nor[o+1]=Y/l;nor[o+2]=Z/l}
      if(uv&&ua){uv[(vo+i)*2]=ua.getX(i);uv[(vo+i)*2+1]=ua.getY(i)}
      col[o]=c.r;col[o+1]=c.g;col[o+2]=c.b;
    }
    const flip=det<0,ix=g.index;
    const cnt=ix?ix.count:n;
    for(let i=0;i<cnt;i+=3){
      const a0=ix?ix.getX(i):i,a1=ix?ix.getX(i+1):i+1,a2=ix?ix.getX(i+2):i+2;
      idx[io++]=vo+a0;if(flip){idx[io++]=vo+a2;idx[io++]=vo+a1}else{idx[io++]=vo+a1;idx[io++]=vo+a2}
    }
    vo+=n;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));if(nor)geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));if(uv)geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setIndex(new THREE.BufferAttribute(idx,1));
  return geo;
}
window.__hfMergeGeo=mergeGeo;   // exposed for tests

/* ---- self-healing monitor: if a baked mesh ever moves / toggles / recolours, its chunk is un-merged ---- */
function revert(u){
  if(u.dead)return;u.dead=true;PERF.batch.reverts++;
  try{if(u.mesh.parent)u.mesh.parent.remove(u.mesh);u.mesh.geometry.dispose()}catch(_){}
  for(const c of u.srcs){const m=c.m,par=u.parents.get(m);if(par&&!m.parent){
    for(const g of B.groups){if(g.o===par&&g.detached){g.parent.add(g.o);g.detached=false}}
    par.add(m)}}
  log('reverted batch unit (something moved)');
}
function monitor(){
  const E=B.entries,n=E.length;if(!n)return;
  let per=Math.max(64,Math.ceil(n/20)),i=B.cursor;
  for(let k=0;k<per;k++){if(i>=n)i=0;const en=E[i];if(!en.unit.dead&&!sameObj(en.o,B.snapE,i*10))revert(en.unit);i++}B.cursor=i;
  const Gs=B.groups,gn=Gs.length;let gi=B.gcursor;for(let k=0;k<Math.min(gn,64);k++){if(gi>=gn)gi=0;const g=Gs[gi];if(!sameObj(g.o,B.snapG,g.k*10)){for(const u of g.units)revert(u);B.snapG[g.k*10]=NaN}gi++}B.gcursor=gi;
  const P=B.matPairs,pn=P.length;let mi=B.mcursor;
  for(let k=0;k<Math.min(pn,200);k++){if(mi>=pn)mi=0;const p=P[mi++],mo=p.mo,s=p.snap;
    const ei=mo.emissiveIntensity,eh=mo.emissive?mo.emissive.getHex():0;
    if(s[2]!==ei||s[1]!==eh){
      if(p.wms){for(const mm of p.mms)if(mm.emissive){mm.emissiveIntensity=ei;mm.emissive.copy(mo.emissive)}s[2]=ei;s[1]=eh}   // day/night window glow follows the original material
      else{for(const u of p.units)revert(u);s[2]=ei;s[1]=eh}}
    else if(s[0]!==mo.color.getHex()||s[3]!==mo.opacity){for(const u of p.units)revert(u);s[0]=mo.color.getHex();s[3]=mo.opacity}
  }B.mcursor=mi;
}
/* ---- ground layering: flat ground-level surfaces (grass, asphalt, parks, runways, lane decals) sit only 0.01-0.03 units apart.
   Beyond ~150 m the depth buffer cannot tell them apart, so grass "flickers through" roads while you walk. Each distinct height gets its own
   polygon-offset rank (small, fixed, in depth-buffer units), so the higher surface always wins at every distance. */
function groundLayers(){
  const st=PERF.ground={layers:0,meshes:0};
  W.updateMatrixWorld(true);
  const flats=[],box=new THREE.Box3();
  W.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||!o.visible)return;
    const m=o.material;if(!m||Array.isArray(m)||m.transparent||m.isShaderMaterial||m.blending!==1||!m.isMaterial)return;
    const y=o.matrixWorld.elements[13];if(y<-.4||y>.7)return;
    const g=o.geometry;if(!g||!g.attributes||!g.attributes.position)return;
    if(!g.boundingBox)g.computeBoundingBox();
    box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    const h=box.max.y-box.min.y;if(h>.12||box.max.y>.6||box.max.y<-.35)return;
    const wd=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);if(wd<1.5)return;   // ignore tiny bits
    flats.push({m,top:box.max.y});
  });
  if(!flats.length)return;
  flats.sort((a,b)=>a.top-b.top);
  const ranks=[];let rank=-1,last=-9;
  for(const f of flats){if(f.top-last>.004){rank++;last=f.top}f.rank=Math.min(rank,9)}
  const done=new Set();
  for(const f of flats){const m=f.m;if(done.has(m)){m.polygonOffsetFactor=Math.min(m.polygonOffsetFactor,-(1+f.rank));m.polygonOffsetUnits=Math.min(m.polygonOffsetUnits,-(2+f.rank*3));continue}
    done.add(m);m.polygonOffset=true;m.polygonOffsetFactor=-(1+f.rank);m.polygonOffsetUnits=-(2+f.rank*3);m.needsUpdate=true}
  st.layers=rank+1;st.meshes=flats.length;log('ground layers:',st.layers,'over',st.meshes,'surfaces');
}
function batchTick(){
  const S=G('S'),run=G('run');
  if(!run||!S||S.ph!==4||G('mode')==='commander'){return}
  if(!B.layered&&S.t>.6){B.layered=true;try{groundLayers()}catch(e){console.error('ground layering failed',e)}}
  if(HF.noBatch||CFG.batch===false)return;
  if(!B.fired){if(S.t>1.0&&!G('PM')){B.fired=true;B.job=batchJob();B.t0=now()}return}
  if(B.job){
    const t=now();
    try{while(now()-t<5){const r=B.job.next();if(r.done){B.job=null;break}}}
    catch(e){console.error('static batching failed; continuing without it',e);B.job=null;PERF.batch.state='failed';safeRestoreAll()}
  }else if(PERF.batch.state==='active'){
    try{monitor()}catch(e){console.error('batch monitor failed, restoring',e);safeRestoreAll();PERF.batch.state='failed'}
  }
}
function safeRestoreAll(){try{for(const u of B.units)revert(u)}catch(e){}}
PERF.restore=safeRestoreAll;
PERF._test={layers:()=>groundLayers(),job:()=>{B.fired=true;return batchJob()},monitor:()=>monitor(),state:()=>B,markActive:()=>{}};

log('perf layer ready',MOB?'(mobile profile)':'(desktop profile)');
window.applyGfx();
}catch(err){console.error('perf.js failed to start',err)}
})();
