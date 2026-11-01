import {queenCode,queenOriginalCode,queenLetters} from './queen-room.js';
import {createQueenSprite} from './queen-sprite.js';

export function createQueenRoomDrawing(ctx,{rect,pixelText,reducedParticleMotion}) {
  let background;
  const queenSprite=createQueenSprite(ctx);
  function platform() {
    if(background)return background;
    background=document.createElement('canvas');background.width=640;background.height=480;
    const c=background.getContext('2d'),r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    r(0,0,640,480,'#000000');
    // A mint-green T-shaped platform floats in black space.
    r(76,154,488,250,'#174d40');r(80,158,480,242,'#4ae3ae');r(84,164,472,232,'#25cf8c');
    r(280,394,80,86,'#164e3f');r(284,398,72,82,'#62eeb7');r(290,400,60,80,'#25cf8c');
    r(84,394,194,6,'#83edbf');r(362,394,194,6,'#83edbf');
    r(80,402,196,14,'#22483f');r(364,402,196,14,'#22483f');
    for(let x=84;x<272;x+=10){r(x,406,6,3,x%30?'#d8d669':'#1ba9aa');r(x+280,406,6,3,x%30?'#d8d669':'#1ba9aa');}
    for(let y=420;y<446;y+=3)for(let x=80;x<560;x+=4)if(x<276||x>=364)r(x+(y%2),y,1,1,y<434?'#33524a':'#152b27');
    // Terminal housing, speakers and two-line display.
    r(96,24,448,120,'#15372f');r(102,16,436,11,'#5ae2ad');r(130,8,380,14,'#31be87');
    r(134,8,372,4,'#93f0c9');r(130,22,380,3,'#163b31');
    r(100,36,40,104,'#2b5b4b');r(500,36,40,104,'#2b5b4b');
    for(const x of [108,508]) {
      r(x,64,24,28,'#0c2623');
      for(let i=0;i<6;i++){r(x+3+i*3,66+i*2,2,13,'#3d7561');}
    }
    r(142,34,356,103,'#1a5b44');r(146,38,240,78,'#71e6b5');r(150,42,232,70,'#0a2822');r(154,46,224,62,'#000000');
    r(400,38,88,78,'#74e7b5');r(404,42,80,70,'#133c28');r(410,48,68,58,'#0aef32');
    createQueenSprite(c).face(443,77,1.7,true);
    c.fillStyle='#f3f6f1';c.font='bold 20px monospace';c.fillText(queenOriginalCode,159,72);
    c.fillStyle='#f1ed4b';c.fillText(queenOriginalCode,159,96);
    r(154,136,330,7,'#0b2a21');r(154,138,330,2,'#72e9b4');
    for(let x=140;x<500;x+=8)r(x,28,5,2,x%24?'#f0df66':'#57ded2');
    // Four rows of raised letter buttons, matching the reference layout.
    queenLetters.forEach((row,y)=>[...row].forEach((letter,x)=>{
      const left=176+x*36,top=168+y*36;
      r(left,top,36,36,'#183329');r(left+1,top+1,34,32,'#f0f1e9');r(left+3,top+3,29,26,'#c4c9c3');
      r(left+3,top+3,29,3,'#ffffff');r(left+3,top+3,3,26,'#ffffff');r(left+4,top+29,29,3,'#858e88');
      c.fillStyle='#101413';c.font='bold 25px monospace';c.fillText(letter,left+10,top+26);
    }));
    return background;
  }
  return function drawQueenRoom(time,state) {
    ctx.drawImage(platform(),0,0);
    const p=state.queenPuzzle,mode=p?.mode||'ready',demo=['glitch','demoWrong','demoClear'].includes(mode);
    const wrong=['demoWrong','wrong'].includes(mode),correct=['correct','solved'].includes(mode)||state.story.queenSolved;
    rect(154,46,224,62,'#000000');
    const changed=!!p?.demonstrated||state.story.queenDemoSeen||state.story.queenBriefed;
    const target=changed?queenCode:queenOriginalCode;
    const whiteText=mode==='demoClear'?'':wrong?'WRONG CODE':correct?'Correct':changed?(demo?'':p?.input||''):queenOriginalCode;
    pixelText(whiteText,159,72,wrong?'#ff344d':correct?'#8bff9f':'#f3f6f1',20);
    pixelText(target,159,96,'#f1ed4b',20);
    if(mode==='glitch'&&!reducedParticleMotion.matches)for(let i=0;i<5;i++)rect(156+(i*37+Math.floor(time*25)*7)%214,49+i*10,21,2,i%2?'#dd42f2':'#1cfae6');
    if(p?.lastTile&&p.mode!=='solved'){
      const [x,y]=p.lastTile.split(',').map(Number);ctx.strokeStyle=wrong?'#ff3656':'#ffec64';ctx.lineWidth=3;ctx.strokeRect(178+x*36,170+y*36,31,29);
    }
    if(state.queenDeparture!=null){
      const age=state.queenDeparture,x=500+Math.max(0,age-.6)*180,y=304-Math.max(0,age-.3)*100;
      rect(x-30,y-76,58,84,'#0b153a');rect(x-25,y-72,48,75,'#6787c4');rect(x-22,y-68,42,62,'#29356c');
      queenSprite.draw(x,y-8,1.35);
      rect(x-35,y-24,14,9,'#afd6ef');rect(x+20,y-24,14,9,'#afd6ef');rect(x-29,y+3,57,7,'#b5e0ed');
      if(!reducedParticleMotion.matches){rect(x-22,y+10,10,13+Math.sin(time*20)*4,'#60dcff');rect(x+12,y+10,10,13+Math.cos(time*20)*4,'#60dcff');}
    }
    // Only the thin status lamp pulses; text remains steady and readable.
    if(!reducedParticleMotion.matches){ctx.save();ctx.globalAlpha=.35+.2*Math.sin(time*2);rect(316,119,3,12,'#a9ffcc');ctx.restore();}
    pixelText('v',332,467,'#c0ffe1',15);
  };
}
