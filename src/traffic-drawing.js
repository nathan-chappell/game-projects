import {createTraffic,trafficStops,nearbyTrafficStop} from './traffic.js';
export function createTrafficDrawing(ctx,{rect,pixelText,reducedParticleMotion}) {
  const preview=createTraffic(),carArt=[];
  function carBitmap(variant) {
    if(carArt[variant])return carArt[variant];
    const c=document.createElement('canvas');c.width=70;c.height=82;const ink=c.getContext('2d');ink.translate(35,40);
    const r=(x,y,w,h,color)=>{ink.fillStyle=color;ink.fillRect(x,y,w,h);};
    const p=(points,color)=>{ink.fillStyle=color;ink.beginPath();points.forEach(([x,y],i)=>i?ink.lineTo(x,y):ink.moveTo(x,y));ink.closePath();ink.fill();};
    const edge='#14183d',pink=variant?'#e95aab':'#e74a91';
    r(-28,-10,7,29,edge);r(21,-10,7,29,edge);
    p([[-17,-31],[17,-31],[23,-25],[27,-10],[30,-1],[29,18],[23,27],[-23,27],[-29,18],[-30,-1],[-27,-10],[-23,-25]],edge);
    p([[-16,-28],[16,-28],[20,-24],[23,-11],[27,-1],[26,17],[20,23],[-20,23],[-26,17],[-27,-1],[-23,-11],[-20,-24]],pink);
    p([[-15,-23],[15,-23],[18,-12],[14,-7],[-14,-7],[-18,-12]],edge);
    p([[-13,-22],[13,-22],[15,-13],[12,-10],[-12,-10],[-15,-13]],'#9df2d0');
    r(-12,-25,24,2,'#f791c9');r(-18,-5,36,3,'#c4337c');
    p([[-22,5],[-17,8],[-15,18],[-20,21],[-25,16],[-26,10]],'#fff875');
    p([[22,5],[17,8],[15,18],[20,21],[25,16],[26,10]],'#fff875');
    r(-11,20,22,7,edge);r(-9,21,18,4,'#9fe8c3');r(-22,24,9,4,edge);r(13,24,9,4,edge);
    carArt[variant]=c;return c;
  }
  function stop(side,traffic) {
    const {x,y}=trafficStops[side],active=traffic.checkpoint===side;
    rect(x-20,y-92,40,79,'#215390');rect(x-17,y-89,34,73,'#080f25');
    rect(x-13,y-85,26,29,'#3a527d');rect(x-10,y-82,20,23,'#070c1a');
    pixelText(traffic.slowRemaining>0?String(Math.ceil(traffic.slowRemaining)):'5',x-7,y-61,traffic.slowRemaining>0?'#fff4a5':'#f74b7f',24);
    pixelText('STOP',x-14,y-28,'#f05b76',12);
    rect(x-3,y-14,6,25,'#67889d');rect(x-16,y+11,32,7,'#0b1931');
    rect(x-12,y+8,24,7,'#527b9c');rect(x-6,y+2,12,10,active?'#df5c75':'#a1e273');
  }
  function room(time,traffic=preview) {
    rect(0,0,640,480,'#030619');rect(80,0,480,480,'#2a85ec');
    for(const x of [198,320,442])for(let y=12;y<480;y+=104)rect(x-3,y,7,33,'#7fdeda');
    for(const x of [0,560]) {
      rect(x,200,80,160,'#235fac');rect(x,200,80,4,'#70ded8');rect(x,356,80,4,'#70ded8');
      rect(x+(x===0?76:0),200,4,160,'#71e8e0');
      for(let y=204;y<356;y+=17)rect(x+(x===0?77:0),y,2,8,'#c6ffff');
    }
    for(const side of [0,1]) {
      const x=side?565:5;
      for(let i=0;i<3;i++) {
        ctx.strokeStyle=i%2?'#203e74':'#2e75aa';ctx.lineWidth=3;
        ctx.strokeRect(x+i*8,78-i*18,65-i*16,122+i*18);
      }
    }
    rect(80,263,480,5,'#a9eee0');rect(80,322,480,5,'#a9eee0');
    for(let x=84;x<558;x+=18)rect(x,268,6,54,'#a9eee0');
    rect(80,0,480,4,'#71e5dc');
    for(const x of [134,258,382,506]) {
      rect(x-3,0,6,28,'#111934');rect(x-14,23,28,65,'#102b53');rect(x-10,27,20,57,'#07132c');
      for(const [i,color] of ['#f488d7','#ffc6d6','#80cbd9'].entries()) {
        rect(x-7,32+i*16,14,9,color);rect(x-5,30+i*16,10,13,color);
      }
    }
    stop('left',traffic);stop('right',traffic);
    pixelText('< STORAGE',4,348,'#d2f6ed',10);
    for(const car of traffic.cars) {
      ctx.save();ctx.globalAlpha=0.18;rect(car.x-28,car.y+22,56,7,'#061b47');ctx.restore();
      ctx.drawImage(carBitmap(car.color),Math.round(car.x-35),Math.round(car.y-40));
    }
    if(traffic.slowRemaining>0) {
      rect(206,448,228,23,'#07142c');pixelText(`CARS SLOWED · ${Math.ceil(traffic.slowRemaining)}s`,219,464,'#c1ffdc',13);
    }
  }
  function overlay(traffic,player) {
    if(!traffic)return;
    const side=nearbyTrafficStop(player);
    if(side)pixelText('C / Z · SLOW CARS',side==='left'?5:505,284,'#fff4b0',10);
    if(traffic.hitPoint&&!reducedParticleMotion.matches) {
      const p=traffic.hitPoint.age/0.35;ctx.save();ctx.globalAlpha=1-p;
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4,d=10+p*28;
        rect(traffic.hitPoint.x+Math.cos(a)*d,traffic.hitPoint.y-10+Math.sin(a)*d,4,4,'#fff2a6');
      }
      ctx.restore();
    }
    if(traffic.hitCooldown>0) {
      ctx.save();ctx.globalAlpha=0.5*traffic.hitCooldown/0.85;
      ctx.strokeStyle='#b2fff1';ctx.lineWidth=2;ctx.strokeRect(player.x-17,player.y-45,34,48);ctx.restore();
    }
  }
  return{room,overlay};
}
