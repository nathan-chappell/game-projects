export const trafficSettings={slowSeconds:5,slowMultiplier:0.8,hitCooldown:0.85,span:760,top:-120};
export const trafficStops={
  left:{x:45,y:237,respawn:{x:60,y:300}},right:{x:595,y:237,respawn:{x:580,y:300}},
};
export function createTraffic(checkpoint='left') {
  return{checkpoint,slowRemaining:0,hitCooldown:0,hitPoint:null,cars:[
    {x:134,y:80,speed:260,color:0},{x:258,y:220,speed:295,color:1},
    {x:382,y:-60,speed:275,color:0},{x:506,y:130,speed:310,color:1},
  ]};
}
export function nearbyTrafficStop(player) {
  return Object.keys(trafficStops).find(side=>Math.hypot(player.x-trafficStops[side].x,player.y-trafficStops[side].y)<=78)??null;
}
export function useTrafficStop(traffic,side) {
  if(!traffic||!trafficStops[side])return false;
  traffic.checkpoint=side;traffic.slowRemaining=trafficSettings.slowSeconds;
  return true;
}
export function carTouchesPlayer(car,player) {
  // Forgiving body hitboxes follow the feet and the car's solid center, leaving
  // the tall sprite's hair and the car's outer mirrors out of collision.
  return Math.abs(car.x-player.x)<32&&Math.abs(car.y-(player.y-5))<34;
}
export function advanceTraffic(traffic,player,dt) {
  if(!traffic||!Number.isFinite(dt)||dt<=0)return false;
  const steps=Math.max(1,Math.ceil(dt*120-1e-9)),step=dt/steps;
  let hit=false;
  for(let i=0;i<steps;i++) {
    const factor=traffic.slowRemaining>1e-9?trafficSettings.slowMultiplier:1;
    traffic.slowRemaining=Math.max(0,traffic.slowRemaining-step);
    traffic.hitCooldown=Math.max(0,traffic.hitCooldown-step);
    if(traffic.hitPoint){traffic.hitPoint.age+=step;if(traffic.hitPoint.age>=0.35)traffic.hitPoint=null;}
    for(const car of traffic.cars) {
      car.y+=car.speed*factor*step;
      if(car.y>trafficSettings.top+trafficSettings.span)car.y-=trafficSettings.span;
    }
    if(traffic.hitCooldown<=0&&traffic.cars.some(car=>carTouchesPlayer(car,player))) {
      traffic.hitPoint={x:player.x,y:player.y,age:0};
      Object.assign(player,trafficStops[traffic.checkpoint].respawn);
      traffic.hitCooldown=trafficSettings.hitCooldown;hit=true;
    }
  }
  if(player.x<=65)traffic.checkpoint='left';
  else if(player.x>=575)traffic.checkpoint='right';
  return hit;
}
export function createTrafficRoom(hallwayIndex) {
  const map=Array.from({length:12},(_,y)=>Array.from({length:16},(_,x)=>x>=2&&x<=13||y>=5&&y<=8?0:1));
  map[7][0]=6;
  return{name:'The Glitched Crossing',scene:'trafficCrossing',theme:'dark',map,spawn:{x:1,y:7},flowey:{x:1,y:8},
    target:hallwayIndex,doorLinks:{'0,7':hallwayIndex},npcs:[],trees:[],spikes:[],glitchPoints:[],dialogue:[],savePoints:[{x:15,y:8}]};
}
