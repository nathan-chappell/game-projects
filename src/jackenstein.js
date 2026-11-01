import jackURL from '../assets/jackenstein.png?inline';
const image=new Image();image.src=jackURL;
export function createJackSprite(ctx){
 const ready=()=>image.complete&&image.naturalWidth>0;
 function draw(x,y,height=142){if(!ready())return;const w=height*image.naturalWidth/image.naturalHeight;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,Math.round(x-w/2),Math.round(y-height),Math.round(w),height);ctx.restore();}
 function portrait(){ctx.clearRect(0,0,64,64);if(!ready()){image.addEventListener('load',portrait,{once:true});return;}ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,650,650,0,0,64,64);ctx.restore();}
 return{draw,portrait};
}
