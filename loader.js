/* HEISTFALL loading transition (menu -> gameplay).
   Building the world is one long synchronous task, so the loading screen has to be PAINTED before it starts: menu entry points are
   wrapped so the overlay appears first, the browser gets two frames to draw it, and only then is the real function run. The overlay stays
   up while the post-build optimisations (static batching, tree chunking, shader compile) finish, then fades out.  */
(function(){'use strict';
try{
const HF=window.HF||{};
const $=id=>document.getElementById(id);
const PK=(0,eval)('(()=>({S,run}))');const G=()=>{try{return PK()}catch(e){return{}}};
const TIPS_T=['Drag the right side of the screen to look around.','Push the stick to its edge to sprint.','Tap the ••• button for emotes, phone and more.','Open your phone for jobs, GPS and settings.','Hold FIRE and drag to aim with one thumb.'];
const TIPS_D=['Press P to open your phone: jobs, GPS and settings.','Hold Shift while moving to sprint.','Press M for the big map and set waypoints.','Press E to talk, enter vehicles and interact.','Press H to see all controls.'];
let el,bar,st,tip,busy=false,timer=0,hideT=0,t0=0,frames=0;
function build(){
  if($('ld'))return;el=document.createElement('div');el.id='ld';
  el.innerHTML='<div class="ld-g"></div><div class="ld-c"><div class="ld-logo"><span>HEIST</span><b>FALL</b></div><div class="ld-bar"><i></i></div><div class="ld-st">LOADING</div><div class="ld-tip"></div></div>';
  document.body.appendChild(el);bar=el.querySelector('.ld-bar i');st=el.querySelector('.ld-st');tip=el.querySelector('.ld-tip');
}
const stage=(txt,p,ms)=>{if(!el)return;st.textContent=txt;bar.style.transition='transform '+(ms||700)+'ms cubic-bezier(.2,.8,.2,1)';bar.style.transform='scaleX('+p+')'};
function show(label){
  build();clearTimeout(hideT);clearInterval(timer);
  const tl=(HF.touch&&document.body.classList.contains('touchon'))?TIPS_T:TIPS_D;tip.textContent=tl[Math.random()*tl.length|0];
  el.className='on';bar.style.transition='none';bar.style.transform='scaleX(.04)';void bar.offsetWidth;
  stage(label||'BUILDING THE WORLD',.55,3200);t0=performance.now();frames=0;
}
function hide(){
  stage('READY',1,250);
  hideT=setTimeout(()=>{el.classList.add('out');hideT=setTimeout(()=>{el.className=''},650)},280);
}
/* readiness: world built, first frames drawn, and the optimisation passes (if any) finished */
function watch(){
  clearInterval(timer);frames=0;
  timer=setInterval(()=>{
    const g=G(),S=g.S,P=window.HFPERF&&window.HFPERF.batch,el2=performance.now()-t0;
    if(!g.run||!S){if(el2>2500){clearInterval(timer);hide()}return}
    frames++;
    let done=frames>=4;
    if(S.ph===4&&!HF.noBatch&&P){
      const s=P.state;
      if(s==='idle'||s==='scanning'){stage('WAKING THE CITIZENS',.72,1500);done=false}
      else if(s==='baking'){stage('OPTIMISING THE SKYLINE',.9,1200);done=false}
    }
    if(el2>12000)done=true;      // never trap the player
    if(done&&el2>900){clearInterval(timer);hide()}
  },120);
}
/* ---- wrap the entry points that start gameplay from a menu ---- */
let nest=0;
function wrap(name,label){
  const o=window[name];if(typeof o!=='function'||o.__ld)return;
  const w=function(){
    const m=$('m'),fromMenu=m&&m.style.display!=='none'&&m.className!=='intro'&&m.className!=='outro';
    if(nest>0||!fromMenu||busy){return o.apply(this,arguments)}
    const self=this,args=arguments;busy=true;show(label);
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{
      nest++;try{o.apply(self,args)}catch(e){console.error('start failed',e);busy=false;nest--;hide();return}
      nest--;busy=false;stage('WAKING THE CITIZENS',.7,1200);watch()
    },30)));
  };
  w.__ld=true;window[name]=w;
}
function init(){
  if(typeof window.go!=='function'||typeof window.newGame!=='function'){return setTimeout(init,60)}
  build();
  wrap('newGame','BUILDING THE CITY');wrap('loadGame','LOADING YOUR SAVE');wrap('go','PREPARING THE VAULT');
}
init();
}catch(err){console.error('loader.js failed to start',err)}
})();
