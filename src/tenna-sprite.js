import tennaURL from '../assets/tenna-pointing.png?inline';

// Share the reference cutout across the entrance, backstage NPC and portrait.
const image=new Image();image.src=tennaURL;
const body={x:18,y:24,width:1001,height:1480,anchorX:600};

export function createTennaSprite(ctx) {
  const ready=()=>image.complete&&image.naturalWidth>0;
  function draw(x,y,scale=1.3) {
    if(!ready())return;
    const height=126*scale,ratio=height/body.height;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,body.x,body.y,body.width,body.height,
      Math.round(x-(body.anchorX-body.x)*ratio),Math.round(y-height),
      Math.round(body.width*ratio),Math.round(height));
    ctx.restore();
  }
  function portrait() {
    ctx.clearRect(0,0,64,64);
    if(!ready()) {image.addEventListener('load',portrait,{once:true});return;}
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,360,16,568,530,0,2,64,60);
    ctx.restore();
  }
  return{draw,portrait};
}
