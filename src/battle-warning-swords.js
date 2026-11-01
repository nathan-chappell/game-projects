import {createMiniSwords,advanceMiniSwords} from './battle-mini-swords.js';
export const warningSwordSettings={warning:.5,interval:1,count:12,linger:1,miniSpeed:720};
export function createWarningSwords(arena,random=Math.random){
 const a={arena:{...arena},age:0,event:0,warning:null,active:null,lastX:null,random,soul:{x:arena.x+arena.size/2,y:arena.y+arena.size/2}};
 a.minis=createMiniSwords(arena,true,()=>a.random(),{warmup:.6,warning:.4,interval:1,volleys:12,perVolley:3,speed:warningSwordSettings.miniSpeed});
 a.minis.selectEdges=mini=>{
  // Aimed volleys remove the permanent safe row. The marked cluster gives
  // enough time to dodge vertically before the fast blades cross the box.
  const side=Math.floor(a.random()*2)%2;
  const row=Math.max(1,Math.min(9,Math.round((a.soul.y-arena.y-arena.border-16)/19)));
  return mini.edges.filter(e=>e.side===side&&Math.abs(e.id%11-row)<=1);
 };
 return a;
}
export function warningSwordPieces(a,sword){
 const y=a.arena.y+a.arena.size/2;
 return[{x:sword.x,y:y+10,hw:16,hh:60},{x:sword.x,y:y-49,hw:29,hh:6},{x:sword.x,y:y-72,hw:5,hh:20}];
}
export function warningSwordTouches(a,soul,width,height,margin=0){
 return !!a.active&&warningSwordPieces(a,a.active).some(p=>Math.abs(p.x-soul.x)<p.hw+width/2+margin&&Math.abs(p.y-soul.y)<p.hh+height/2+margin);
}
export function advanceWarningSwords(a,dt,soul){
 a.age+=dt;a.soul={...soul};
 while(a.event<warningSwordSettings.count*2){
  const index=Math.floor(a.event/2),blade=a.event%2,time=index*warningSwordSettings.interval+(blade?warningSwordSettings.warning:0);
  if(a.age<time-1e-9)break;
  if(!blade){
   const choices=[55,85,115,145,175].map(x=>a.arena.x+x).filter(x=>a.lastX===null||Math.abs(x-a.lastX)>=60);
   const escapes=[42,78,115,152,188].map(x=>a.arena.x+x);
   const safeChoices=choices.filter(column=>escapes.some(x=>Math.abs(x-column)>=43&&Math.abs(x-a.soul.x)<=74&&(!a.active||Math.abs(x-a.active.x)>=43)&&!warningSwordTouches(a,{x,y:a.soul.y},24,21)&&(!a.active||(x-a.active.x)*(a.soul.x-a.active.x)>=0)));
   const available=(safeChoices.length?safeChoices:choices).sort((x,y)=>Math.abs(x-a.soul.x)-Math.abs(y-a.soul.x)).slice(0,2);
   const x=available[Math.floor(a.random()*available.length)%available.length];a.warning={x,index,born:time};a.lastX=x;
  }else{a.active={...a.warning,born:time};a.warning=null;}
  a.event++;
 }
 const end=(warningSwordSettings.count-1)*warningSwordSettings.interval+warningSwordSettings.warning+warningSwordSettings.linger;
 if(a.age>=end)a.active=null;
 const minisDone=advanceMiniSwords(a.minis,dt);
 return a.age>=end&&minisDone;
}
export function drawWarningSwords(ctx,a){
 if(!a)return;
 const cy=a.arena.y+a.arena.size/2;
 if(a.active){
  ctx.save();ctx.translate(Math.round(a.active.x),Math.round(cy));
  ctx.shadowColor='#c1d6e866';ctx.shadowBlur=5;ctx.fillStyle='#9ba0a5';
  ctx.beginPath();ctx.moveTo(-16,-44);ctx.lineTo(16,-44);ctx.lineTo(16,56);ctx.lineTo(0,88);ctx.lineTo(-16,56);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#d5dadd';ctx.fillRect(-14,-42,3,96);ctx.fillStyle='#686e75';ctx.fillRect(11,-42,4,96);
  ctx.fillStyle='#969da5';ctx.fillRect(-29,-55,58,12);ctx.fillRect(-5,-92,10,37);ctx.fillStyle='#c2c9cf';ctx.fillRect(-29,-55,58,2);ctx.fillRect(-5,-92,2,35);ctx.restore();
 }
 if(a.warning){
  const x=Math.round(a.warning.x);ctx.save();ctx.fillStyle='#ff831e44';ctx.fillRect(x-30,cy-92,60,184);ctx.strokeStyle='#ff353b';ctx.lineWidth=3;ctx.strokeRect(x-30,cy-92,60,184);
  ctx.fillStyle='#ff4c34';ctx.fillRect(x-5,cy-48,10,50);ctx.fillRect(x-5,cy+18,10,10);ctx.restore();
 }
}
