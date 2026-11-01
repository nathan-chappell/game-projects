import statueURL from '../assets/chamber-statue-transparent.png?inline';
export function createCollisionChamberDrawing(ctx){
 let art;
 const statue=new Image();statue.onload=()=>{art=null;};statue.src=statueURL;
 return function drawChamber(room,state){
  if(!art){art=document.createElement('canvas');art.width=320;art.height=240;const c=art.getContext('2d');
   const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
   const poly=(p,color)=>{c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
   r(0,0,320,240,'#292724');
   poly([[18,105],[26,56],[46,23],[80,15],[153,10],[218,15],[265,28],[296,48],[303,90],[292,123],[273,141],[41,141]],'#777070');
   r(0,140,320,100,'#514c49');r(32,140,256,100,'#171614');r(36,143,248,97,'#696460');
   // Dense, irregular stone marks reproduce the dark patterned foreground.
   let seed=461;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<235;i++){const x=39+Math.floor(random()*240),y=145+Math.floor(random()*95);
    c.strokeStyle=i%3?'#282624':'#948d87';c.lineWidth=1;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+4+(i%3),y-3);c.lineTo(x+8,y+1);c.lineTo(x+4,y+5);c.closePath();c.stroke();}
   for(const x of [5,291])for(let i=0;i<16;i++){const y=149+i*6;r(x+(i%3)*3,y,13,1,'#242220');r(x+7,y+2,11,1,'#242220');}
   // Draw only the transparent statue and its base beneath the spotlight.
   if(statue.complete&&statue.naturalWidth){c.imageSmoothingEnabled=false;c.drawImage(statue,278,112,581,1074,145,98,29,54);}
   // A pale spotlight from the barred ceiling lamp falls across the pedestal.
   c.save();c.globalAlpha=.17;poly([[141,57],[180,57],[214,211],[112,211]],'#fff9e8');c.restore();
   poly([[134,28],[188,28],[177,58],[145,58]],'#111110');
   for(let x=139;x<186;x+=8)for(let y=32;y<54;y+=9)r(x,y,2,2,'#c2beb5');
   r(159,30,1,26,'#a8a29c');r(173,30,1,26,'#a8a29c');
   for(const x of [88,234]){
    poly([[x-16,58],[x+16,58],[x+8,75],[x-8,75]],'#171715');poly([[x-12,60],[x+12,60],[x+6,71],[x-6,71]],'#67625d');
    r(x-4,65,8,5,'#3a3733');
    for(let i=0;i<6;i++){c.strokeStyle='#282724';c.lineWidth=2;c.strokeRect(x-3+(i%2),76+i*10,6,9);r(x-1,78+i*10,2,3,'#8e8880');}
   }
   // A marked bottom passage makes the existing return door easy to find.
   r(139,219,42,21,'#1b1a18');r(141,220,2,20,'#a39e93');r(179,220,2,20,'#a39e93');
   r(143,221,36,19,'#49453f');
   c.fillStyle='#f1ead7';c.font='bold 8px monospace';c.textAlign='center';c.fillText('BACKSTAGE',160,216);c.textAlign='start';
   poly([[165,225],[169,225],[169,229],[174,229],[167,236],[160,229],[165,229]],'#fff3cc');

  }
  ctx.imageSmoothingEnabled=false;ctx.drawImage(art,0,0,640,480);
  if(state?.story.jackRevealed&&room?.jackLever){
   const x=room.jackLever.x*40+20,y=room.jackLever.y*40+20;
   ctx.fillStyle='#24231f';ctx.fillRect(x-16,y-13,32,17);ctx.fillStyle='#999a8b';ctx.fillRect(x-13,y-15,26,13);ctx.fillStyle='#4e5549';ctx.fillRect(x-10,y-12,20,7);
   ctx.strokeStyle='#30352d';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x-12,y-42);ctx.stroke();ctx.strokeStyle='#c6ccb3';ctx.lineWidth=4;ctx.stroke();
   ctx.fillStyle='#699951';ctx.fillRect(x-22,y-49,20,10);ctx.fillStyle='#b0d475';ctx.fillRect(x-22,y-49,20,3);
   ctx.fillStyle='#d9dec7';ctx.font='11px monospace';ctx.fillText('LEVER',x-17,y+19);
  }
 };
}
