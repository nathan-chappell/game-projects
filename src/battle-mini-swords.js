export const miniSwordSettings={depth:18,warmup:.8,warning:.7,interval:1.15,volleys:5,perVolley:9,speed:540};
export function createMiniSwords(arena,launching=false,random=Math.random,options={}){
 const a={arena:{...arena},launching,age:0,settings:{...miniSwordSettings,...options},volleys:0,edges:[],shots:[],random,nextId:0};
 for(let side=0;side<4;side++)for(let k=0;k<11;k++){
  const along=arena.border+16+k*19,dx=[1,-1,0,0][side],dy=[0,0,1,-1][side];
  const x=side===0?arena.x+arena.border+6:side===1?arena.x+arena.size-arena.border-6:arena.x+along;
  const y=side===2?arena.y+arena.border+6:side===3?arena.y+arena.size-arena.border-6:arena.y+along;
  a.edges.push({id:side*11+k,x,y,dx,dy,side,warningUntil:0});
 }
 return a;
}
export function advanceMiniSwords(a,dt){
 a.age+=dt;if(!a.launching)return false;
 const settings=a.settings;
 while(a.volleys<settings.volleys&&a.age>=settings.warmup+a.volleys*settings.interval-1e-9){
  const launch=settings.warmup+a.volleys*settings.interval+settings.warning;
  let edges;
  if(a.selectEdges)edges=a.selectEdges(a);
  else{
   const side=Math.floor(a.random()*4)%4,gapStart=1+Math.floor(a.random()*8)%8;
   edges=a.edges.filter(edge=>edge.side===side&&(edge.id%11<gapStart||edge.id%11>=gapStart+11-settings.perVolley));
  }
  for(const edge of edges){edge.warningUntil=launch;a.shots.push({...edge,id:a.nextId++,originX:edge.x,originY:edge.y,launch,active:false});}
  a.volleys++;
 }
 for(const shot of a.shots){shot.active=a.age>=shot.launch;const travel=Math.max(0,a.age-shot.launch)*settings.speed;shot.x=shot.originX+shot.dx*travel;shot.y=shot.originY+shot.dy*travel;}
 const {x,y,size}=a.arena;
 a.shots=a.shots.filter(s=>s.x>x-22&&s.x<x+size+22&&s.y>y-22&&s.y<y+size+22);
 return a.volleys===settings.volleys&&!a.shots.length;
}
export function miniShotTouches(shot,soul,width,height,margin=0){
 return shot.active&&Math.abs(shot.x-soul.x)<(shot.dx?12:5)+width/2+margin&&Math.abs(shot.y-soul.y)<(shot.dy?12:5)+height/2+margin;
}
export function miniSwordHazards(a,soul,width,height,margin=10){
 if(!a||a.age<miniSwordSettings.warmup)return [];
 const {x,y,size,border}=a.arena,depth=miniSwordSettings.depth;
 const clearance=Math.min(soul.x-width/2-x-border-depth,x+size-border-depth-soul.x-width/2,soul.y-height/2-y-border-depth,y+size-border-depth-soul.y-height/2);
 return[{hit:clearance<0,near:clearance<=margin},...a.shots.map(s=>({hit:miniShotTouches(s,soul,width,height),near:miniShotTouches(s,soul,width,height,margin)}))];
}
export function drawMiniSwords(ctx,a){
 if(!a)return;
 function draw(s,warning=false){
  ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y));ctx.rotate(Math.atan2(s.dy,s.dx));
  ctx.fillStyle=warning?'#ffb84d':'#94a2b133';ctx.fillRect(-11,-5,23,10);
  ctx.fillStyle=warning?'#ffe39a':'#aab4bc';ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(5,-3);ctx.lineTo(12,0);ctx.lineTo(5,3);ctx.lineTo(-7,3);ctx.closePath();ctx.fill();
  ctx.fillStyle=warning?'#ffad4a':'#75828c';ctx.fillRect(-8,-7,3,14);ctx.fillRect(-13,-2,6,4);ctx.fillStyle='#e1e9ed';ctx.fillRect(-5,-2,10,1);ctx.restore();
 }
 for(const edge of a.edges)draw(edge,edge.warningUntil>a.age);
 for(const shot of a.shots)if(shot.active)draw(shot);
}
