import snowgraveNoelleURL from '../assets/noelle-snowgrave-left.png?inline';

// Small, flat-color sprites are painted at their native resolution, then enlarged
// with nearest-neighbor sampling so every outline remains a deliberate pixel.
export function createBattleCharacterSprites(ctx, reducedMotion = () => false) {
  const cache = new Map();
  const snowgraveImage = new Image();
  snowgraveImage.src = snowgraveNoelleURL;
  function sprite(key, x, y, scale, paint) {
    let bitmap = cache.get(key);
    if (!bitmap) {
      bitmap = document.createElement('canvas'); bitmap.width = bitmap.height = 96;
      const ink = bitmap.getContext('2d'); ink.translate(48,84);
      const rect = (x,y,w,h,c) => { ink.fillStyle=c; ink.fillRect(Math.round(x),Math.round(y),w,h); };
      const poly = (points,c) => {
        ink.fillStyle=c; ink.beginPath();
        points.forEach(([px,py],i) => i ? ink.lineTo(px,py) : ink.moveTo(px,py));
        ink.closePath(); ink.fill();
      };
      paint(rect,poly); cache.set(key,bitmap);
    }
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, Math.round(x-48*scale), Math.round(y-84*scale), 96*scale, 96*scale);
    ctx.restore();
  }

  function krisHead(r) {
    const hair='#17142f', skin='#64d5e8';
    r(-8,-44,13,2,hair); r(-10,-42,18,3,hair); r(-12,-39,21,8,hair);
    r(-11,-32,5,5,hair); r(-8,-34,17,7,skin); r(8,-33,3,5,skin);
    // The heavy fringe hides Kris's eyes; only the cyan cheek is exposed.
    r(-11,-40,20,5,hair); r(-10,-35,5,6,hair); r(-5,-35,4,3,hair);
    r(0,-35,3,4,hair); r(5,-35,4,2,hair); r(-8,-42,8,1,'#343154');
    r(4,-28,5,1,'#3286ad');
  }
  function paintKris(r, poly, frame, red) {
    const outline='#13132b', armor='#a8c4df', shade='#60759d', scarf='#ed48b0';
    r(-8,-15,6,13,outline); r(3,-14,6,12,outline);
    r(-7,-13,4,10,'#3a426a'); r(4,-13,4,10,'#3a426a');
    r(-11,-4,9,5,outline); r(3,-4,11,5,outline);
    r(-10,-3,8,3,'#f2efff'); r(4,-3,9,3,'#f2efff');
    r(-10,-26,18,13,outline); r(-8,-25,14,11,shade);
    r(-8,-25,11,8,armor); r(-6,-24,10,3,'#e6ecff');
    r(-8,-17,15,3,armor); r(-9,-14,17,2,outline);
    r(-12,-26,7,3,outline); r(-14,-23,8,7,outline);
    r(-13,-23,6,3,armor); r(-13,-20,4,4,shade); r(-14,-16,5,3,armor);
    r(6,-25,6,4,outline); r(8,-22,5,6,'#64d5e8');
    r(10,-18,6,4,outline); r(11,-18,5,3,'#64d5e8');
    krisHead(r);
    r(-10,-29,16,5,outline); r(-10,-28,15,3,scarf); r(-8,-27,12,2,'#ff79d2');
    r(-16,-27,7,4,scarf); r(-23,-24,9,3,scarf); r(-26,-22,6,2,'#b52b89');
    // Three drawn poses avoid a smoothly rotated, vector-looking sword.
    if (frame === 1) {
      poly([[12,-16],[31,-20],[32,-17],[16,-13]],outline);
      poly([[15,-16],[29,-19],[30,-18],[16,-15]],'#e9eeff');
      r(10,-17,3,7,'#d87dad');
      r(17,-26,13,2,red?'#ff1938':'#ef83c8'); r(27,-24,7,2,red?'#ff1938':'#ef83c8');
    } else if (frame === 2) {
      poly([[12,-15],[26,-8],[25,-5],[11,-12]],outline);
      poly([[15,-13],[24,-8],[24,-7],[14,-11]],'#e9eeff');
      r(10,-16,3,6,'#d87dad');
    } else {
      poly([[12,-17],[23,-35],[26,-36],[27,-32],[15,-14]],outline);
      poly([[14,-17],[24,-33],[25,-33],[25,-31],[15,-15]],'#f0efff');
      r(10,-17,7,2,'#d87dad'); r(12,-15,2,5,'#794369');
    }
  }
  function kris(x,y,scale=1,hitAge=null,red=false) {
    const attacking=hitAge!==null && hitAge<0.32;
    const frame=attacking ? (hitAge<0.1?0:hitAge<0.23?1:2) : 0;
    const step=attacking && !reducedMotion() ? [0,5,2][frame] : 0;
    sprite(`kris:${frame}:${red}`,x+step,y,scale*1.75,(r,p)=>paintKris(r,p,frame,red));
  }

  function paintFlowey(r, bob) {
    const black='#18121c', yellow='#ffe044';
    r(-1,-17,3,17,black); r(0,-16,1,16,'#439c45');
    r(-8,-6,7,3,black); r(-11,-8,5,3,black); r(-10,-7,6,2,'#5ab54b');
    r(2,-7,7,3,black); r(7,-10,5,3,black); r(3,-7,6,2,'#5ab54b');
    // Six broad yellow petals frame an unshaded, expressive cream face.
    const petal=(x,y,w,h)=>{r(x+1,y,w-2,h,black);r(x,y+1,w,h-2,black);r(x+1,y+1,w-2,h-2,yellow);};
    petal(-3,-31+bob,7,8); petal(4,-28+bob,8,8); petal(4,-20+bob,8,8);
    petal(-3,-16+bob,7,8); petal(-11,-20+bob,8,8); petal(-11,-28+bob,8,8);
    r(-5,-26+bob,11,14,black); r(-7,-24+bob,15,10,black);
    r(-4,-25+bob,9,12,'#fff9d9'); r(-6,-23+bob,13,8,'#fff9d9');
    r(-3,-23+bob,1,4,black); r(3,-23+bob,1,4,black);
    r(-4,-18+bob,1,2,black); r(4,-18+bob,1,2,black);
    r(-3,-16+bob,7,1,black); r(-2,-15+bob,5,1,black);
  }
  function flowey(x,y,time=0,scale=1) {
    const bob=reducedMotion()?0:Math.sin(time*2)>0?0:1;
    sprite(`flowey:${bob}`,x,y,scale*1.5,r=>paintFlowey(r,bob));
  }

  function krisDown(x,y,scale=1,frame=2) {
    sprite(`kris:down:${frame}`,x,y,scale*(frame===2?1.4:1.75),(r,poly)=>{
      const edge='#16152b', armor='#a5bed6', light='#e0e9f3', shade='#607396',
        cyan='#65d3e1', pink='#ed4fae', low=frame===2, lift=low?0:-5, lean=low?0:-2;
      if (low) {
        const ink=(px,py,w,h,c)=>r(px+13,py,w,h,c),
          shape=(points,c)=>poly(points.map(([px,py])=>[px+13,py]),c);
        // Face-down, stretched-out silhouette from the reference: boots trail
        // left, the pink scarf runs along the floor, and the fringe hides the face.
        ink(-33,0,59,2,'#2a2440');
        shape([[-32,-6],[-25,-9],[-20,-12],[-11,-12],[-5,-7],[-7,0],[-32,0]],edge);
        shape([[-29,-5],[-22,-8],[-18,-10],[-12,-10],[-8,-6],[-10,-2],[-29,-2]],'#3d4267');
        ink(-30,-5,7,3,armor);ink(-27,-7,6,3,'#d5e4ef');ink(-22,-6,4,3,'#8db9d7');
        shape([[-19,-9],[-13,-13],[-4,-13],[2,-7],[-2,-1],[-17,-2],[-22,-5]],edge);
        shape([[-17,-7],[-12,-11],[-5,-11],[-1,-6],[-4,-3],[-16,-4]],'#262a4e');
        shape([[-10,-13],[-3,-16],[7,-14],[12,-8],[9,-1],[-5,-1],[-12,-7]],edge);
        shape([[-7,-12],[-2,-14],[5,-12],[9,-7],[6,-3],[-4,-3],[-9,-8]],shade);
        ink(-8,-11,3,6,armor);ink(-6,-7,3,4,light);ink(-3,-4,10,2,armor);
        // One sleeve follows the ground beneath the shoulder and cheek.
        shape([[7,-9],[16,-8],[23,-5],[25,-2],[23,0],[13,0],[6,-3]],edge);
        ink(12,-5,9,3,shade);ink(19,-4,5,3,armor);ink(21,-3,3,3,light);
        // The low head rests on the arm, with the stepped hair crest toward Kris's back.
        shape([[2,-19],[5,-22],[10,-23],[12,-25],[15,-24],[15,-22],[18,-21],[19,-18],[22,-14],[23,-10],[25,-7],[24,-3],[20,-1],[9,-1],[2,-6],[-1,-13]],'#11122f');
        ink(4,-20,7,1,'#292344');ink(2,-18,3,2,'#211e3b');
        shape([[1,-16],[9,-17],[13,-13],[18,-9],[21,-3],[17,-2],[9,-4],[3,-8]],'#11122f');
        ink(8,-12,3,2,cyan);ink(7,-10,3,4,cyan);
        ink(8,-10,1,3,'#b2f5ed');ink(9,-6,2,3,'#3aa7bd');
        // The bright scarf traces the same curved line across the fallen body.
        shape([[-5,-14],[-1,-15],[1,-10],[6,-6],[13,-3],[16,-1],[10,0],[3,-3],[-2,-7],[-6,-11]],edge);
        shape([[-4,-13],[-2,-13],[0,-8],[5,-4],[12,-2],[9,-1],[3,-3],[-2,-7]],pink);
        ink(-4,-13,2,2,'#ff9ddd');ink(-2,-8,2,3,'#c73994');ink(5,-3,5,1,'#ff79ca');
        return;
      }
      const ink=(px,py,w,h,c)=>r(px+lean,py+lift,w,h,c),
        shape=(points,c)=>poly(points.map(([px,py])=>[px+lean,py+lift]),c);
      // A folded rear leg and a forward knee keep the silhouette readable below
      // the breastplate. Each boot has its own dark gap and pale toe cap.
      r(-23,0,50,2,'#292238');
      poly([[-13,-13],[-5,-12],[0,-5],[-3,0],[-16,0],[-21,-4]],edge);
      poly([[-13,-10],[-7,-10],[-4,-6],[-8,-3],[-17,-3],[-18,-5]],'#404968');
      r(-23,-3,11,4,edge);r(-22,-2,9,2,light);r(-14,-5,5,3,shade);
      poly([[-5,-12],[4,-13],[9,-9],[9,-3],[3,1],[-4,-2]],edge);
      poly([[-3,-10],[3,-10],[6,-7],[5,-3],[0,-2],[-3,-4]],shade);
      r(1,-3,11,4,edge);r(3,-2,8,2,light);
      // The torso leans toward the grounded hand; silver shoulders and a dark
      // waist remain distinct from the head instead of being hidden underneath.
      shape([[-11,-25],[-3,-27],[6,-24],[12,-18],[9,-10],[1,-8],[-11,-12],[-15,-19]],edge);
      shape([[-10,-23],[-3,-25],[4,-23],[9,-18],[6,-12],[0,-11],[-9,-14],[-12,-19]],armor);
      shape([[-10,-22],[-4,-24],[3,-22],[5,-19],[-6,-18],[-11,-19]],light);
      shape([[-11,-17],[1,-16],[7,-18],[6,-12],[-1,-11],[-10,-14]],shade);
      ink(-9,-14,12,3,armor);ink(-9,-11,10,2,edge);
      // The near arm braces against the floor, with an elbow, wrist and fingers.
      shape([[6,-21],[12,-20],[15,-15],[15,-10],[19,-5],[18,-1],[13,-2],[10,-9],[9,-14],[5,-16]],edge);
      shape([[7,-19],[11,-18],[12,-14],[11,-11],[9,-14],[6,-16]],light);
      ink(11,-13,3,6,shade);ink(13,-8,3,5,armor);
      ink(15,-4,8,4,edge);ink(16,-4,6,2,cyan);ink(20,-2,3,2,'#3aa3bc');
      // The far hand rests on the raised knee rather than merging into the chest.
      shape([[-11,-22],[-16,-18],[-17,-12],[-12,-8],[-6,-8],[-5,-12],[-12,-14],[-10,-18]],edge);
      ink(-14,-19,4,6,armor);ink(-14,-14,4,3,shade);
      ink(-11,-11,6,3,cyan);ink(-10,-10,4,1,'#a8eff2');
      // A bowed three-quarter head: the cyan cheek looks toward the floor,
      // while the stepped fringe hides the eyes and leaves a visible neck.
      shape([[-1,-34],[9,-34],[15,-31],[18,-26],[18,-22],[14,-17],[5,-16],[-3,-20],[-6,-26],[-4,-31]],edge);
      shape([[0,-32],[9,-32],[14,-29],[16,-25],[14,-21],[8,-18],[2,-20],[-3,-25],[-2,-29]],'#1c1937');
      ink(-1,-32,8,1,'#46435f');ink(-4,-29,2,4,'#37334f');
      shape([[12,-26],[17,-25],[17,-22],[14,-20],[13,-17],[9,-18],[8,-21]],cyan);
      ink(13,-20,3,2,'#3aa3bc');ink(12,-18,2,2,'#4196b1');
      shape([[3,-29],[12,-30],[16,-27],[17,-25],[12,-24],[11,-21],[8,-21],[7,-24],[3,-24]],edge);
      // The scarf follows the bent shoulders, with a loose end hanging at the back.
      shape([[-5,-21],[1,-23],[7,-20],[12,-19],[11,-15],[5,-15],[-2,-18],[-7,-18]],edge);
      shape([[-4,-20],[1,-21],[6,-18],[10,-18],[10,-16],[5,-17],[-2,-19]],pink);
      ink(-4,-20,5,1,'#ff8bd2');
      shape([[-5,-19],[-10,-18],[-14,-12],[-10,-10],[-7,-15],[-4,-16]],'#b52b81');
      ink(-10,-17,3,4,pink);ink(-12,-13,3,2,'#f369bd');
      // A complete dropped blade, separated from the supporting hand by a gap.
      r(25,-2,16,3,edge);r(29,-2,12,1,light);r(29,-1,10,1,'#8193b0');
      r(25,-4,2,7,'#ac5f98');r(26,-3,1,5,'#f28cbe');
      r(21,-1,5,2,edge);r(22,-1,3,1,'#6f6984');
    });
  }

  function floweyDown(x,y,scale=1,frame=2) {
    sprite(`flowey:down:${frame}`,x,y,scale*1.5,(r,poly)=>{
      const edge='#191520', stem='#60a15e', yellow='#f5d75e', cream='#fff4bd',
        low=frame===2, lift=low?0:-4, shift=low?-6:-8;
      const ink=(px,py,w,h,c)=>r(px+shift,py+lift,w,h,c),
        shape=(points,c)=>poly(points.map(([px,py])=>[px+shift,py+lift]),c);
      // A thin hooked stem and curled roots preserve the drooping silhouette;
      // the flower hangs from the end of the arch rather than sitting on a stump.
      poly([[-15,-6],[-12,-8],[-10,-6],[-11,-3],[-6,-2],[-3,-5],[-4,-8],[-1,-7],[0,-2],[-4,1],[-11,1],[-16,-2]],edge);
      r(-14,-4,2,3,stem);r(-12,-1,8,1,'#92bb76');r(-3,-4,1,3,stem);
      shape([[-6,-1],[-10,-5],[-12,-12],[-12,-19],[-10,-25],[-6,-29],[0,-31],[7,-30],[12,-26],[14,-21],[11,-19],[9,-25],[4,-27],[-2,-27],[-7,-23],[-9,-17],[-8,-10],[-5,-5],[-3,-2]],edge);
      shape([[-6,-3],[-9,-7],[-10,-13],[-10,-19],[-8,-24],[-4,-27],[1,-29],[6,-28],[10,-25],[11,-22],[10,-22],[8,-25],[3,-27],[-2,-26],[-6,-22],[-8,-17],[-7,-10],[-4,-5]],stem);
      ink(-9,-18,1,6,'#a7c98c');ink(-5,-26,5,1,'#9ecf8f');
      // Long petals fold down around the lowered face, as in the reference.
      for(const [outer,inner] of [
        [[[1,-30],[4,-29],[6,-24],[4,-19],[1,-17],[-1,-20],[0,-25]],[[2,-28],[3,-28],[4,-24],[3,-20],[1,-20],[2,-24]]],
        [[[6,-33],[9,-32],[12,-26],[11,-22],[8,-23],[6,-28]],[[7,-31],[8,-30],[10,-26],[10,-24],[8,-25]]],
        [[[12,-31],[16,-28],[19,-24],[19,-20],[16,-20],[13,-25]],[[13,-29],[15,-27],[17,-24],[17,-22],[15,-23]]],
        [[[17,-26],[21,-22],[21,-17],[18,-14],[16,-17],[17,-21]],[[18,-24],[19,-21],[19,-18],[18,-17],[18,-20]]],
        [[[14,-22],[18,-19],[17,-14],[14,-11],[11,-13],[12,-17]],[[14,-20],[16,-18],[15,-14],[13,-13],[13,-16]]],
        [[[6,-24],[10,-22],[12,-17],[10,-13],[7,-13],[5,-17]],[[7,-22],[9,-21],[10,-17],[9,-15],[7,-15],[7,-18]]],
      ]) { shape(outer,edge);shape(inner,yellow); }
      shape([[5,-28],[10,-28],[15,-25],[17,-21],[15,-17],[11,-16],[7,-19],[4,-23]],edge);
      shape([[6,-26],[10,-26],[14,-24],[15,-21],[13,-19],[11,-18],[8,-20],[6,-23]],cream);
      // Closed, downward-slanting eyes keep the face pitched toward the ground.
      ink(8,-23,2,2,edge);ink(10,-22,1,1,edge);ink(13,-21,2,1,edge);
      ink(11,-19,2,1,'#8f714c');
    });
  }

  function ralseyHead(r, angry) {
    const black='#11191c', green='#64d48c', white='#fff9eb';
    // A shadowed face under a floppy hat, soft ears, and round glasses.
    r(-9,-32,19,12,black); r(-12,-30,5,7,black); r(9,-30,5,7,black);
    r(-12,-28,3,4,white); r(11,-28,3,4,white);
    r(-8,-30,7,7,green); r(2,-30,7,7,green); r(-1,-28,3,1,green);
    r(-7,-29,5,5,black); r(3,-29,5,5,black);
    r(-5,-28,2,3,white); r(4,-28,2,3,white);
    r(-2,-22,4,1,white); r(-1,-21,2,1,white);
    if(angry){r(-7,-32,3,1,white);r(-4,-31,3,1,white);r(2,-31,3,1,white);r(5,-32,3,1,white);}
    r(-14,-35,29,4,black); r(-12,-35,25,2,green);
    r(-10,-38,21,3,black); r(-8,-40,17,3,black); r(-6,-43,14,4,black);
    r(-3,-46,9,4,black); r(3,-47,6,3,black); r(7,-46,4,2,black);
    r(-8,-37,17,2,green); r(-6,-40,13,3,green); r(-4,-43,10,3,green);
    r(-1,-45,8,2,green); r(6,-45,3,1,green);
  }
  function paintRalsey(r, angry, healing) {
    const black='#11191c', green='#64d48c';
    r(-8,-7,6,8,black);r(3,-7,6,8,black);
    r(-9,-21,19,14,black);r(-11,-14,23,9,black);r(-13,-8,27,5,black);
    r(-7,-20,15,12,green);r(-9,-13,19,8,green);r(-11,-7,23,2,green);
    r(-3,-17,3,2,black);r(2,-17,3,2,black);r(-4,-15,10,3,black);r(-2,-12,6,2,black);r(0,-10,2,1,black);
    r(-12,-21,5,9,black);r(-13,-15,5,4,'#fff9eb');r(-11,-19,3,5,green);
    if(healing){r(9,-23,7,4,black);r(14,-25,5,4,'#fff9eb');r(10,-22,5,3,green);}
    else{r(8,-21,5,10,black);r(10,-15,4,4,'#fff9eb');r(9,-19,3,5,green);}
    ralseyHead(r,angry);
    r(-10,-22,20,4,black);r(-9,-22,18,3,'#ef7fba');r(-4,-19,4,11,'#ef7fba');r(-3,-8,4,2,'#ef7fba');
  }
  function ralsey(x,y,time=0,scale=1,angry=false,healing=false) {
    sprite(`ralsey:${angry}:${healing}`,x,y,scale*1.6,r=>paintRalsey(r,angry,healing));
  }

  function scaredNoelle(x,y,time=0,scale=1,running=false) {
    const frame=running && !reducedMotion()?Math.floor(time*10)%2:0;
    sprite(`noelle:${running}:${frame}`,x,y,scale,(rect,poly)=>paintNoelle(rect,poly,frame,running));
  }

  function snowgraveNoelle(x,y,scale=1) {
    if (!snowgraveImage.complete || !snowgraveImage.naturalWidth) return;
    // Trim the generated cutout's transparent margin; its casting hand and face point left at Kris.
    const source = { x: 50, y: 45, width: 1011, height: 1342 },
      height = 62 * scale, width = height * source.width / source.height;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(snowgraveImage, source.x, source.y, source.width, source.height,
      Math.round(x-width/2), Math.round(y-height), Math.round(width), Math.round(height));
    ctx.restore();
  }
  function paintNoelle(rect,poly,frame,running=false) {
      const leg = frame ? 3 : 0;
      rect(-9,-12+leg,6,12,'#302b40'); rect(4,-12-leg,6,12,'#302b40');
      rect(-11,-3+leg,9,4,'#49394e'); rect(4,-3-leg,9,4,'#49394e');
      // Pale hair frames the shoulders, with antlers and long ears matching Noelle.
      poly([[-12,-53],[-17,-46],[-17,-24],[-23,-18],[-17,-14],[-10,-18],[11,-18],[18,-14],[24,-18],[18,-24],[17,-44],[11,-53]], '#403345');
      poly([[-11,-51],[-15,-44],[-14,-26],[-20,-18],[-13,-18],[-8,-23],[10,-23],[16,-18],[21,-18],[15,-27],[15,-44],[10,-51]], '#f0f2a3');
      rect(-15,-59,5,13,'#dc91a5'); rect(-19,-61,5,5,'#dc91a5'); rect(-18,-54,6,4,'#dc91a5');
      rect(10,-59,5,13,'#dc91a5'); rect(14,-61,5,5,'#dc91a5'); rect(12,-54,6,4,'#dc91a5');
      rect(-21,-45,9,5,'#e9aabd'); rect(13,-45,9,5,'#e9aabd');
      poly(running ? [[-10,-30],[10,-30],[12,-17],[21,-10],[16,-5],[-12,-5],[-16,-8],[-12,-15]]
        : [[-10,-30],[10,-30],[12,-12],[16,-8],[10,-5],[-12,-5],[-16,-8],[-12,-15]], '#77bfd6');
      poly(running ? [[-7,-29],[7,-29],[9,-18],[17,-10],[14,-8],[-12,-9],[-8,-15]]
        : [[-7,-29],[7,-29],[9,-14],[12,-9],[-12,-9],[-8,-15]], '#f9ffff');
      rect(-7,-29,14,4,'#baf5f5'); rect(-11,-9,22,3,'#c6faff');
      if (running) {
        // Raised sleeves and hands frame her face, matching the panicked escape reference.
        poly([[-10,-29],[-20,-34],[-23,-42],[-20,-48],[-14,-46],[-16,-40],[-12,-36]], '#403345');
        poly([[-11,-30],[-18,-35],[-20,-42],[-18,-46],[-16,-44],[-18,-40],[-13,-35]], '#f5ffff');
        poly([[9,-29],[20,-31],[24,-39],[22,-46],[17,-49],[13,-46],[17,-40],[15,-36],[10,-35]], '#403345');
        poly([[10,-30],[18,-33],[21,-39],[20,-44],[17,-47],[15,-45],[19,-40],[17,-35],[11,-33]], '#f5ffff');
      } else {
        rect(-15,-28,6,15,'#f5ffff'); rect(10,-28,6,15,'#f5ffff');
        rect(-15,-16,5,8,'#e6a0b5'); rect(11,-16,5,8,'#e6a0b5');
      }
      poly([[-9,-47],[8,-47],[12,-42],[10,-33],[4,-28],[-5,-29],[-11,-35]], '#e6a0b5');
      if (running) {
        rect(-8,-41,2,2,'#302a37'); rect(-6,-39,3,2,'#302a37'); rect(-8,-37,2,2,'#302a37');
        rect(7,-41,2,2,'#302a37'); rect(4,-39,3,2,'#302a37'); rect(7,-37,2,2,'#302a37');
      } else {
        rect(-8,-44,6,10,'#fffdf6'); rect(3,-44,6,10,'#fffdf6');
        rect(-4,-42,2,7,'#302a37'); rect(3,-42,2,7,'#302a37');
      }
      poly([[-9,-47],[-2,-49],[-2,-47],[-9,-45]], '#744450');
      poly([[2,-49],[9,-47],[9,-45],[2,-47]], '#744450');
      rect(-3,-35,7,3,'#d92340'); rect(-1,-32,2,4,'#56313e');
      rect(-2,-29,4,2,'#513340'); rect(-1,-28,2,2,'#fff9e6');
      if (running) { rect(-3,-32,6,7,'#513340'); rect(-1,-31,3,4,'#f9dce0'); }
      poly([[-12,-46],[-9,-51],[4,-52],[12,-48],[13,-42],[9,-43],[6,-47],[-5,-47],[-9,-40],[-9,-32],[-13,-27]], '#f1f5b3');
      rect(-13,-25,4,5,'#d7dd91'); rect(11,-38,3,4,'#b7efff'); rect(12,-41,1,4,'#efffff');
      if (running) {
        rect(-19,-47,5,6,'#e6a0b5'); rect(14,-48,5,6,'#e6a0b5');
      }
  }
  function portrait(name,angry=false) {
    ctx.clearRect(0,0,96,88);
    if(name==='Kris') sprite('kris:portrait',48,180,4,r=>krisHead(r));
    else if(name==='Flowey') sprite('flowey:portrait',48,155,5,r=>paintFlowey(r,0));
    else sprite(`ralsey:portrait:${angry}`,48,144,3,r=>ralseyHead(r,angry));
  }
  return {kris,flowey,krisDown,floweyDown,ralsey,scaredNoelle,snowgraveNoelle,portrait};
}
