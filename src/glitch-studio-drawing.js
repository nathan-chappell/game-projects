import { createScoreboard } from './glitch-studio.js';

const glyphs={
  S:['01111','11000','11000','01110','00011','00011','11110'],
  C:['01111','11000','11000','11000','11000','11000','01111'],
  O:['01110','11011','11011','11011','11011','11011','01110'],
  R:['11110','11011','11011','11110','11100','11010','11011'],
  E:['11111','11000','11000','11110','11000','11000','11111'],
  0:['01110','11011','11011','11011','11011','11011','01110'],
  1:['00110','01110','00110','00110','00110','00110','01111'],
  2:['01110','11011','00011','00110','01100','11000','11111'],
  3:['11110','00011','00011','01110','00011','00011','11110'],
  4:['00011','00111','01111','11011','11111','00011','00011'],
  5:['11111','11000','11000','11110','00011','00011','11110'],
  6:['01110','11000','11000','11110','11011','11011','01110'],
  7:['11111','00011','00110','00110','01100','01100','01100'],
  8:['01110','11011','11011','01110','11011','11011','01110'],
  9:['01110','11011','11011','01111','00011','00011','01110'],
};

export function createGlitchStudioDrawing(ctx, {rect,reducedParticleMotion}) {
  const glyphCache=new Map(),scores=createScoreboard(),sky=ctx.createLinearGradient(0,0,0,200);
  const snapshot=document.createElement('canvas');snapshot.width=640;snapshot.height=480;
  const snapshotInk=snapshot.getContext('2d');
  sky.addColorStop(0,'#080775');sky.addColorStop(0.5,'#004b7c');sky.addColorStop(1,'#029179');
  const poly=(points,color)=>{
    ctx.fillStyle=color;ctx.beginPath();
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
  };
  function scoreText(text,center,y,scale) {
    const start=Math.round(center-(text.length*6-1)*scale/2);
    for(const [i,char] of [...text].entries()) {
      const key=char+':'+scale;
      let bitmap=glyphCache.get(key);
      if(!bitmap) {
        bitmap=document.createElement('canvas');bitmap.width=5*scale+6;bitmap.height=7*scale+6;
        const ink=bitmap.getContext('2d');
        const paint=(dx,dy,color)=>{
          ink.fillStyle=color;
          for(const [row,line] of glyphs[char].entries())for(let col=0;col<line.length;col++)
            if(line[col]==='1')ink.fillRect(col*scale+dx+3,row*scale+dy+3,scale,scale);
        };
        for(const [dx,dy] of [[-3,-3],[0,-3],[3,-3],[-3,0],[3,0],[-3,3],[0,3],[3,3]])paint(dx,dy,'#1226a7');
        paint(0,0,'#fcffff');glyphCache.set(key,bitmap);
      }
      ctx.drawImage(bitmap,start+i*6*scale-3,y-3);
    }
  }

  function backAudience() {
    // These are painted scenery, not characters, encounters or interactive NPCs.
    for(let i=0;i<25;i++) {
      const x=i*27-5,y=161+(i%3)*5,color=i%2?'#b1e89a':'#9bdb8b';
      rect(x+6,y,12,3,color);rect(x+3,y+3,18,10,color);
      rect(x+7,y+13,11,12,color);rect(x,y+15,25,4,color);
      rect(x-2,y+6,5,12,color);rect(x+23,y+4,4,15,color);
      rect(x+6,y+6,3,3,'#54b684');rect(x+15,y+6,3,3,'#54b684');
      if(i%3===0){rect(x+5,y-5,3,7,color);rect(x+16,y-3,3,5,color);}
    }
  }
  function floorLines(room) {
    ctx.save();ctx.beginPath();
    // Keep the perspective floor on the room's actual walkable tiles, including
    // custom Build edits, so the visible stage agrees with collision geometry.
    for(let y=5;y<11;y++)for(let x=0;x<16;x++)
      if([0,2,3,5].includes(room.map[y][x]))ctx.rect(x*40,y*40,40,40);
    ctx.clip();ctx.strokeStyle='#c7a477';ctx.lineWidth=2;
    for(let end=-240;end<=880;end+=60) {
      ctx.beginPath();ctx.moveTo(320+(end-320)*0.65,200);ctx.lineTo(end,440);ctx.stroke();
    }
    ctx.strokeStyle='#e1bc87';ctx.lineWidth=1;
    for(const y of [220,252,293,345,410]) {
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(640,y);ctx.stroke();
    }
    rect(0,201,640,4,'#fff7d6');rect(0,432,640,8,'#ffdf96');
    ctx.restore();
  }
  function room(time,room) {
    ctx.fillStyle=sky;ctx.fillRect(0,0,640,200);
    rect(0,181,640,19,'#87ce87');backAudience();
    // Broad green surround, warm gold bevel, and the faceted blue inset from
    // the room reference. There is one SCORE display rather than separate panels.
    rect(80,16,480,166,'#96d98c');rect(99,27,442,143,'#83bea0');
    poly([[101,33],[539,33],[505,174],[135,174]],'#ffcf7e');
    poly([[119,42],[521,42],[495,162],[145,162]],'#151c79');
    poly([[119,42],[238,42],[274,162],[145,162]],'#4c5299');
    poly([[154,49],[221,44],[267,162],[185,162]],'#555da3');
    poly([[238,42],[348,42],[383,162],[274,162]],'#272a8a');
    poly([[348,42],[443,42],[410,162],[383,162]],'#202780');
    poly([[443,42],[521,42],[495,162],[410,162]],'#0e1762');
    poly([[351,42],[437,42],[468,69],[413,98]],'#303d99');
    scoreText('SCORE',320,52,5);
    scoreText(String(scores(time,reducedParticleMotion.matches)[0]),320,106,5);
    rect(80,181,480,7,'#b9df86');rect(0,197,640,3,'#b7d78f');
    floorLines(room);
    rect(0,440,640,40,'#06192d');rect(0,440,640,13,'#f2a8b6');
    rect(0,440,640,3,'#ffd3c7');
  }
  function frontAudience() {
    for(let i=0;i<23;i++) {
      const x=i*29-8,y=462+(i%3)*3;
      // Curved-looking stepped heads and raised hands form the foreground crowd.
      rect(x+5,y-5,13,4,'#050c1b');rect(x+2,y-1,19,12,'#050c1b');
      rect(x,y+9,25,17,'#050c1b');
      if(i%2===0) {
        poly([[x+1,y+5],[x-4,y-10],[x-4,y-18],[x-1,y-13],[x+1,y-22],[x+3,y-15],[x+7,y-18],[x+5,y-10],[x+8,y+6]],'#050c1b');
        poly([[x+17,y+6],[x+19,y-10],[x+18,y-20],[x+22,y-16],[x+24,y-23],[x+25,y-13],[x+29,y-15],[x+27,y-6],[x+25,y+10]],'#050c1b');
      }else{rect(x+3,y-12,3,9,'#050c1b');rect(x+15,y-10,3,8,'#050c1b');}
    }
  }
  function overlay(time) {
    frontAudience();ctx.save();
    const reduced=reducedParticleMotion.matches,tick=reduced?3:Math.floor(time*12),burst=!reduced&&tick%30<9;
    if(burst) {
      // Reuse one snapshot for brief displaced bands of the actual room. No
      // scene objects or collision positions move with the signal distortion.
      snapshotInk.drawImage(ctx.canvas,0,0);
      for(let i=0;i<4;i++) {
        const y=i===0?50+tick*13%95:205+(i*67+tick*19)%220,
          height=[7,12,5,10][i],shift=(i%2?-1:1)*(12+(tick*7+i*5)%22);
        rect(0,y,640,height,'#181132');
        ctx.drawImage(snapshot,0,y,640,height,shift,y,640,height);
        ctx.globalAlpha=0.5;
        rect(Math.max(0,shift),y,180+i*63,1,i%2?'#ff5bc4':'#39f2eb');
        rect(390-i*51,y+height-1,170,2,i%2?'#39f2eb':'#ff5bc4');
        ctx.globalAlpha=1;
      }
      ctx.globalAlpha=0.16;
      rect(86,31+tick*9%140,460,4,'#b6ffff');
      rect(93,38+tick*11%135,445,2,'#fc71d7');
    }
    for(let i=0;i<36;i++) {
      const x=(i*97+tick*43)%600+10,y=24+(i*41+tick*17)%402;
      ctx.globalAlpha=i%4===0?0.65:0.3;
      rect(x,y,8+(i*13%56),i%4===0?5:2,i%2?'#dc37ba':'#30dedb');
      if(i%3===0) {
        rect(x+5,y+8,5,5,'#171651');rect(x+13,y+8,3,3,'#b4ffe8');
      }
    }
    const scanY=reduced?232:Math.floor(time*58)%430;
    ctx.globalAlpha=0.09;rect(0,scanY,640,12,'#49dfda');
    ctx.globalAlpha=0.24;rect(0,scanY,640,1,'#80fff1');
    ctx.globalAlpha=0.07;
    for(let y=0;y<440;y+=7)rect(0,y,640,1,'#1e2b85');
    ctx.restore();
  }
  return {room,overlay};
}
