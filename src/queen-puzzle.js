import {queenCode} from './queen-room.js';
export const queenKeyPath=[[0,3],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[2,0],[2,1],[1,1],[1,2]];
export const createQueenPuzzle=(briefed=false,solved=false)=>({mode:solved?'solved':'ready',input:'',age:0,lastTile:null,demonstrated:briefed});
export function startQueenDemo(p){if(p.demonstrated)return;p.demonstrated=true;p.mode='glitch';p.age=0;}
export const queenDemoActive=p=>p&&['glitch','demoWrong','demoClear'].includes(p.mode);
export function advanceQueenPuzzle(p,dt){
  p.age+=dt;
  if(p.mode==='glitch'&&p.age>=1){p.mode='demoWrong';p.age=0;}
  else if(p.mode==='demoWrong'&&p.age>=1.2){p.mode='demoClear';p.age=0;}
  else if(p.mode==='demoClear'&&p.age>=.6){p.mode='ready';p.age=0;}
  else if(p.mode==='wrong'&&p.age>=1){p.mode='ready';p.input='';p.age=0;}
  else if(p.mode==='correct'&&p.age>=1.2){p.mode='solved';return 'success';}
  return null;
}
export function pressQueenTile(p,player,letters,enabled=true){
  const x=Math.floor((player.x-176)/36),y=Math.floor((player.y-168)/36);
  const tile=x>=0&&x<8&&y>=0&&y<4?`${x},${y}`:null,changed=tile!==p.lastTile;p.lastTile=tile;
  if(!enabled||!changed||!tile||p.mode!=='ready')return false;
  p.input+=letters[y][x];p.age=0;
  if(!queenCode.startsWith(p.input))p.mode='wrong';
  else if(p.input===queenCode)p.mode='correct';
  return true;
}
