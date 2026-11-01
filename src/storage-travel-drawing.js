import {hallwaySettings,hallwayCamera} from './storage-travel.js';
export function createHallwayDrawing(ctx,{rect,pixelText,drawPlayer,drawFlowey,drawFountainFriend,reducedParticleMotion}) {
  return function drawHallway(state,time) {
    const hall=state.storageHallway,camera=hallwayCamera(hall.x);
    rect(0,0,640,480,'#05090f');rect(0,223,640,217,'#1b252f');
    ctx.save();ctx.translate(-camera,0);
    for(let x=Math.floor(camera/400)*400;x<camera+1040;x+=400) {
      rect(x,38,360,184,'#111923');rect(x+9,48,342,163,'#0a1119');
      rect(x,219,400,5,'#50606b');rect(x+20,34,300,4,'#3b4c5b');
      rect(x+80,83,2,71,'#657782');rect(x+70,148,29,20,'#364754');
      rect(x+65,140,13,11,'#263442');rect(x+84,140,13,11,'#263442');
      rect(x+99,151,9,13,'#718c98');rect(x+100,153,4,9,'#172530');
      rect(x+218,90,70,90,'#1e2c38');rect(x+218,90,70,5,'#4e6475');
      for(let y=111;y<172;y+=20)rect(x+225,y,55,3,'#0b151f');
      pixelText(`AISLE ${String(Math.floor(x/800)+1).padStart(2,'0')}`,x+134,68,'#8395a0',12);
      rect(x+127,208,112,7,'#637c81');rect(x+135,215,96,3,'#e3edc6');
      ctx.save();ctx.globalAlpha=0.055;
      ctx.fillStyle='#d8ecdd';ctx.beginPath();ctx.moveTo(x+136,220);ctx.lineTo(x+231,220);ctx.lineTo(x+301,440);ctx.lineTo(x+66,440);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.strokeStyle='#34414a';ctx.lineWidth=1;
    for(let x=Math.floor(camera/80)*80;x<camera+720;x+=80){ctx.beginPath();ctx.moveTo(x,224);ctx.lineTo(x,440);ctx.stroke();}
    for(const y of [275,340,408]){ctx.beginPath();ctx.moveTo(camera,y);ctx.lineTo(camera+640,y);ctx.stroke();}
    for(const [x,label] of [[0,'STORAGE'],[hallwaySettings.length-40,'CROSSING']]) {
      rect(x,241,40,190,'#273845');rect(x+4,246,32,177,'#070e17');
      rect(x+5,247,3,174,'#6bb7bd');rect(x+32,247,3,174,'#e1b76c');
      pixelText(x===0?'<':'>',x+12,346,'#dcf4d8',22);
      pixelText(label,x===0?47:x-86,264,'#b2c7c1',11);
    }
    ctx.restore();
    // The party follows in world space while the camera travels down the aisle.
    const members=[{name:'Kris',gap:0},{name:'Flowey',gap:43},...(state.story.teamJoined?[{name:'Ralsey',gap:84},{name:'Susie',gap:125}]:[])];
    for(const member of [...members].reverse()) {
      const x=Math.max(24,Math.min(hallwaySettings.length-24,hall.x-hall.direction*member.gap))-camera;
      if(member.name==='Kris')drawPlayer(x,hall.y,time);
      else if(member.name==='Flowey')drawFlowey(x,hall.y,time);
      else drawFountainFriend({name:member.name,x,y:hall.y},time);
    }
    rect(0,440,640,40,'#05090f');
    pixelText('TENNA’S STORAGE CORRIDOR',18,23,'#9fb6c6',12);
    rect(168,458,304,3,'#23343f');rect(168,458,304*hall.x/hallwaySettings.length,3,'#72bcc1');
    pixelText(`${Math.floor(hall.x/hallwaySettings.length*100)}%`,483,463,'#9fb6c6',11);
    if(!reducedParticleMotion.matches)for(let i=0;i<7;i++)rect((i*91-camera*0.3)%640,60+(i*63+time*6)%350,2,2,'#5d738044');
  };
}
