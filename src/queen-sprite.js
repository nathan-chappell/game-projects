// Queen's sharp silhouette is painted on a small pixel grid, then enlarged.
export function createQueenSprite(ctx) {
  let body;
  const heads=new Map();
  function canvas(width,height) {
    const image=document.createElement('canvas');image.width=width;image.height=height;
    const ink=image.getContext('2d');
    const rect=(x,y,w,h,color)=>{ink.fillStyle=color;ink.fillRect(x,y,w,h);};
    // Fill whole pixels so diagonal edges stay crisp at every sprite size.
    function poly(points,color) {
      for(let y=Math.min(...points.map(p=>p[1]));y<Math.max(...points.map(p=>p[1]));y++) {
        const crossings=[];
        for(let i=0;i<points.length;i++) {
          const [x1,y1]=points[i],[x2,y2]=points[(i+1)%points.length];
          if((y1<=y+.5&&y2>y+.5)||(y2<=y+.5&&y1>y+.5))crossings.push(x1+(y+.5-y1)*(x2-x1)/(y2-y1));
        }
        crossings.sort((a,b)=>a-b);
        for(let i=0;i+1<crossings.length;i+=2) {
          const start=Math.ceil(crossings[i]-.5),end=Math.ceil(crossings[i+1]-.5);
          rect(start,y,end-start,1,color);
        }
      }
    }
    return{image,ink,rect,poly};
  }
  function head(green=false) {
    if(heads.has(green))return heads.get(green);
    const {image,rect:r,poly:p}=canvas(36,28);
    const black=green?'#051c0b':'#050609',cyan=green?'#27bd39':'#4dc7ef',white=green?'#75f25b':'#f1f6fa',shade=green?'#15852c':'#7797dd';
    // Swept helmet, curled side pieces and the long pointed cheek outline.
    p([[10,0],[25,0],[29,2],[31,5],[31,8],[36,8],[36,10],[32,14],[27,18],[22,23],[18,27],[14,27],[10,24],[7,21],[4,17],[2,12],[2,5],[4,3],[5,3],[5,10],[7,11],[7,6]],black);
    p([[11,2],[25,2],[28,4],[30,6],[27,7],[26,11],[23,14],[17,14],[14,13],[9,13],[7,11],[7,7],[9,4]],cyan);
    r(11,2,13,1,white);r(9,3,2,1,'#a9e9ff');
    p([[7,14],[11,16],[16,17],[21,16],[27,14],[24,20],[19,25],[15,25],[11,22],[8,19]],white);
    p([[4,11],[6,13],[7,17],[10,21],[9,21],[6,18],[4,14]],white);
    p([[27,15],[29,13],[34,10],[32,13],[27,17],[23,21],[21,21]],white);
    r(4,7,1,4,shade);r(5,13,1,3,shade);r(8,19,1,2,shade);
    p([[7,11],[12,11],[15,13],[19,13],[21,11],[27,11],[26,15],[23,17],[19,17],[17,15],[15,17],[10,16],[8,14]],black);
    r(8,11,3,1,shade);r(23,11,3,1,cyan);
    r(16,17,1,3,black);r(17,19,3,1,black);
    r(12,21,2,1,black);r(14,22,6,1,black);r(14,21,5,1,white);r(20,20,1,2,black);r(15,24,3,1,shade);
    heads.set(green,image);return image;
  }
  function sprite() {
    if(body)return body;
    const {image,ink,rect:r,poly:p}=canvas(36,72),black='#050609',cyan='#4dc7ef',white='#f1f6fa',shade='#7797dd';
    // Long black boots cross at the ankles, with pointed heels and toes.
    p([[14,53],[20,53],[20,63],[17,68],[14,71],[8,71],[9,69],[13,66]],black);
    p([[20,52],[24,55],[24,67],[27,72],[20,72],[18,69],[18,63]],black);
    // Narrow black waist, asymmetric cyan and white leg panels.
    p([[10,31],[26,31],[23,39],[24,45],[24,57],[21,62],[18,56],[16,61],[13,59],[11,49],[11,43],[13,38]],black);
    p([[13,43],[17,44],[18,49],[17,54],[17,60],[15,60],[14,55],[13,52]],cyan);
    p([[18,43],[22,45],[23,49],[23,58],[21,60],[19,55],[19,49],[17,47]],white);
    r(14,48,1,3,black);r(14,53,1,3,shade);r(18,50,1,7,shade);r(22,57,1,3,shade);
    // Left arm bends inward to rest a blue glove on her hip.
    p([[6,29],[11,32],[7,36],[4,40],[7,42],[12,42],[11,46],[6,46],[2,44],[0,41],[1,38],[4,33]],black);
    p([[6,32],[8,33],[5,37],[3,40],[5,43],[9,43],[9,44],[5,44],[2,41],[2,39]],white);
    r(3,38,1,3,shade);r(5,42,3,1,cyan);
    p([[9,42],[12,42],[12,46],[10,47],[10,50],[7,51],[6,50],[8,47]],cyan);
    r(7,50,3,1,black);r(9,46,2,2,black);
    // Right arm hangs straight, ending in the long cyan glove.
    p([[25,29],[29,30],[29,48],[31,49],[31,56],[29,58],[26,57],[25,52]],black);
    r(26,32,2,17,white);r(28,33,1,16,shade);
    p([[27,49],[29,49],[29,51],[30,51],[30,55],[28,56],[27,54]],cyan);
    r(28,52,1,3,shade);
    // Wide pointed shoulders and the cyan V collar frame a slim torso.
    p([[5,27],[13,27],[16,29],[20,27],[29,27],[27,32],[24,33],[19,39],[14,39],[10,33],[6,31]],black);
    p([[6,28],[12,28],[16,31],[21,28],[27,28],[25,31],[22,32],[18,37],[15,37],[11,31],[7,30]],cyan);
    p([[14,26],[19,26],[20,29],[17,32],[15,31]],white);
    r(16,28,2,3,black);r(16,31,2,1,shade);
    ink.drawImage(head(),2,0,32,28);
    body=image;return body;
  }
  function face(x,y,scale=1,green=false) {
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(head(green),Math.round(x-16*scale),Math.round(y-14*scale),Math.round(32*scale),Math.round(28*scale));
    ctx.restore();
  }
  function draw(x,y,scale=1.75) {
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#070e1b55';ctx.fillRect(Math.round(x-18),Math.round(y-2),36,4);
    ctx.drawImage(sprite(),Math.round(x-17*scale),Math.round(y-72*scale),Math.round(36*scale),Math.round(72*scale));
    ctx.restore();
  }
  function portrait(){ctx.clearRect(0,0,64,64);face(32,31,1.75);}
  return{draw,face,portrait};
}
