import {movementSpeed,sprintMultiplier} from './config.js';
export const hallwaySettings={length:3270,speed:movementSpeed,start:110,doorY:340,minY:254,maxY:412};
export const hallwayCamera=x=>Math.max(0,Math.min(hallwaySettings.length-640,x-320));
export const createHallway=(x=hallwaySettings.start,y=340)=>({x:Math.max(18,Math.min(hallwaySettings.length-18,x)),y,direction:1,moving:false});

export function advanceHallway(hall,keys,dt) {
  if(!Number.isFinite(dt)||dt<=0)return null;
  let dx=Number(keys.has('right'))-Number(keys.has('left')),dy=Number(keys.has('down'))-Number(keys.has('up'));
  const magnitude=Math.hypot(dx,dy),beforeX=hall.x,beforeY=hall.y;
  if(magnitude){dx/=magnitude;dy/=magnitude;}
  const speed=hallwaySettings.speed*(keys.has('sprint')?sprintMultiplier:1);
  hall.x=Math.max(18,Math.min(hallwaySettings.length-18,hall.x+dx*speed*dt));
  hall.y=Math.max(hallwaySettings.minY,Math.min(hallwaySettings.maxY,hall.y+dy*speed*dt));
  if(dx)hall.direction=Math.sign(dx);
  hall.moving=Math.abs(hall.x-beforeX)+Math.abs(hall.y-beforeY)>1e-9;
  if(Math.abs(hall.y-hallwaySettings.doorY)<55) {
    if(hall.x<58)return 'storage';
    if(hall.x>hallwaySettings.length-58)return 'traffic';
  }
  return null;
}
export function createHallwayRoom(storageIndex) {
  const map=Array.from({length:12},(_,y)=>Array(16).fill(y>=6&&y<=10?0:1));map[8][0]=map[8][15]=6;
  return{name:'Storage — The Long Hall',scene:'storageHallway',theme:'dark',map,spawn:{x:2,y:8},flowey:{x:1,y:8},
    target:storageIndex,doorLinks:{'0,8':storageIndex},npcs:[],trees:[],spikes:[],savePoints:[],glitchPoints:[],dialogue:[]};
}
