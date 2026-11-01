export const saxSettings={damage:30,hitCooldown:.75,warmup:1.1,interval:1.2,waves:8,speed:210,phraseLength:7.2,lanes:9,laneSpacing:22};
export function createSaxAttack(arena){return{arena:{...arena},age:0,waves:0,notes:[]};}
export const saxHelperTurn=a=>Math.min(1,Math.floor(a.age/saxSettings.phraseLength));
// A phrase keeps its staff fixed: notes and the preview use this same curve.
export function saxStaffY(a,lane,x,helper=saxHelperTurn(a)){
 return a.arena.y+29+lane*saxSettings.laneSpacing+Math.sin((x-a.arena.x)*.018+helper*Math.PI)*7;
}
export function advanceSaxAttack(a,dt){
 a.age+=dt;
 while(a.waves<saxSettings.waves){
  const wave=a.waves,helper=Math.floor(wave/4),localWave=wave%4;
  const launch=helper*saxSettings.phraseLength+saxSettings.warmup+localWave*saxSettings.interval;
  if(a.age+1e-9<launch)break;
  a.waves++;const gap=[4,3,2,3][localWave];
  for(let lane=0;lane<saxSettings.lanes;lane++)if(lane<gap||lane>gap+2)a.notes.push({direction:-1,helper,lane,launch,x:0,y:0});
 }
 for(const n of a.notes){const t=Math.max(0,a.age-n.launch);n.x=a.arena.x+a.arena.size+24-saxSettings.speed*t;n.y=saxStaffY(a,n.lane,n.x,n.helper);}
 a.notes=a.notes.filter(n=>n.x>a.arena.x-24);
 return a.waves===saxSettings.waves&&!a.notes.length;
}
export function noteTouches(n,soul,width=24,height=21,margin=0){
 return [{x:n.x,y:n.y,hw:7,hh:5},{x:n.x+6,y:n.y-11,hw:2,hh:12},{x:n.x+11,y:n.y-21,hw:7,hh:2}].some(p=>Math.abs(p.x-soul.x)<p.hw+width/2+margin&&Math.abs(p.y-soul.y)<p.hh+height/2+margin);
}
export function drawSaxAttack(ctx,a){
 if(!a)return;const {x,y,size}=a.arena;
 ctx.save();ctx.beginPath();ctx.rect(x+3,y+3,size-6,size-6);ctx.clip();
 // The staff is scenery; only the solid notes can hit the soul.
 const helper=saxHelperTurn(a),localAge=a.age-helper*saxSettings.phraseLength;
 const reveal=Math.min(1,localAge/.75),left=x+size*(1-reveal);
 ctx.strokeStyle=localAge<saxSettings.warmup?'#b8bac3':'#696b79';ctx.lineWidth=1;
 for(let lane=0;lane<saxSettings.lanes;lane++){
  ctx.beginPath();for(let px=x+size;px>=left;px-=2){const py=saxStaffY(a,lane,px,helper);px===x+size?ctx.moveTo(px,py):ctx.lineTo(px,py);}ctx.stroke();
 }
 for(const n of a.notes){ctx.save();ctx.translate(Math.round(n.x),Math.round(n.y));ctx.shadowColor='#ffffff';ctx.shadowBlur=4;ctx.fillStyle='#ffffff';ctx.fillRect(-6,-4,11,8);ctx.fillRect(-8,-2,15,4);ctx.fillRect(5,-23,3,24);ctx.fillRect(7,-23,11,3);ctx.fillRect(14,-20,4,5);ctx.restore();}
 ctx.restore();
}
// A small white-outlined silhouette, matching the supplied Helper reference.
export function drawSaxHelper(ctx,x,y,facing,age){
 const entrance=Math.min(1,age/.7),bob=Math.sin(age*8)*1.5;
 ctx.save();ctx.translate(Math.round(x-facing*(1-entrance)*75),Math.round(y+bob));ctx.scale(facing*2,2);
 const path=()=>{ctx.beginPath();ctx.moveTo(-8,-32);ctx.lineTo(-10,-37);ctx.lineTo(-3,-34);ctx.lineTo(3,-38);ctx.lineTo(2,-33);ctx.lineTo(7,-32);ctx.lineTo(5,-25);ctx.lineTo(1,-22);ctx.lineTo(3,-17);ctx.lineTo(10,-19);ctx.lineTo(13,-14);ctx.lineTo(8,-10);ctx.lineTo(3,-12);ctx.lineTo(3,-3);ctx.lineTo(7,1);ctx.lineTo(2,3);ctx.lineTo(-3,0);ctx.lineTo(-3,-9);ctx.lineTo(-7,-5);ctx.lineTo(-11,-8);ctx.lineTo(-8,-14);ctx.lineTo(-9,-22);ctx.lineTo(-5,-25);ctx.lineTo(-8,-32);ctx.closePath();};
 path();ctx.strokeStyle='#deded5';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#101116';ctx.fill();
 ctx.fillStyle='#eeeece';ctx.fillRect(0,-29,4,1);ctx.fillRect(0,-21,2,5);
 // Mouthpiece, long curved monochrome tube, keys and wide upward-facing bell.
 ctx.strokeStyle='#f0f0f0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(5,-25);ctx.lineTo(9,-25);ctx.lineTo(13,-19);ctx.lineTo(13,-7);ctx.quadraticCurveTo(13,-1,18,-4);ctx.lineTo(21,-14);ctx.stroke();
 ctx.strokeStyle='#111218';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(16,-16);ctx.lineTo(25,-13);ctx.lineTo(22,-9);ctx.lineTo(18,-10);ctx.closePath();ctx.fill();ctx.fillStyle='#111218';ctx.fillRect(19,-15,5,2);
 ctx.fillStyle='#ffffff';for(let i=0;i<3;i++)ctx.fillRect(11,-18+i*4,2,2);
 ctx.restore();
}
