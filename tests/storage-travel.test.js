import test from 'node:test';
import assert from 'node:assert/strict';
import {createHallway,advanceHallway,hallwayCamera,hallwaySettings} from '../src/storage-travel.js';
import {createTraffic,advanceTraffic,useTrafficStop,nearbyTrafficStop,trafficStops} from '../src/traffic.js';
import {defaults,upgradeProject,clone,validBuild} from '../src/world.js';

test('the storage hall scrolls continuously and takes about 23 seconds to walk',()=>{
  for(const fps of [30,60,144]) {
    const hall=createHallway(),keys=new Set(['right']);let result,frames=0;
    while(!result&&frames<fps*25){result=advanceHallway(hall,keys,1/fps);frames++;}
    assert.equal(result,'traffic');assert.ok(Math.abs(frames/fps-23)<0.05);
    assert.equal(hallwayCamera(hall.x),hallwaySettings.length-640);
  }
  const hall=createHallway();advanceHallway(hall,new Set(['right']),6);
  assert.equal(hall.x-hallwayCamera(hall.x),320);
  assert.equal(advanceHallway(createHallway(30,412),new Set(),1),null,'door must be approached at its height');
  assert.equal(advanceHallway(createHallway(30),new Set(),1),'storage');
  const diagonal=createHallway();advanceHallway(diagonal,new Set(['right','up']),1);
  assert.ok(Math.abs(diagonal.x-110-135/Math.SQRT2)<1e-8,'diagonal movement is normalized');
});

test('signs slow fast cars by 20% for five seconds, without stacking',()=>{
  const traffic=createTraffic();assert.ok(traffic.cars.every(c=>c.speed>=260));
  const player={x:60,y:300},car=traffic.cars[0],start=car.y;
  assert.equal(nearbyTrafficStop(player),'left');assert.equal(nearbyTrafficStop({x:320,y:300}),null);
  assert.equal(useTrafficStop(traffic,'left'),true);
  advanceTraffic(traffic,player,0.5);assert.ok(Math.abs(car.y-start-260*.8*.5)<1e-7);
  useTrafficStop(traffic,'left');assert.equal(traffic.slowRemaining,5);
  assert.equal(useTrafficStop(traffic,'bad'),false);assert.equal(traffic.slowRemaining,5);
  advanceTraffic(traffic,player,5);assert.ok(traffic.slowRemaining<1e-8);
  const after=car.y;advanceTraffic(traffic,player,.1);assert.ok(Math.abs(car.y-after-26)<1e-7);
});

test('a fast car hit resets position to either stop sign, preserves HP, and cannot tunnel past the player',()=>{
  for(const side of ['left','right']) {
    const traffic=createTraffic(),player={x:258,y:300,hp:84};useTrafficStop(traffic,side);
    traffic.cars=[{x:258,y:100,speed:310,color:0}];traffic.slowRemaining=0;
    assert.equal(advanceTraffic(traffic,player,1),true);
    assert.deepEqual(player,{...trafficStops[side].respawn,hp:84});assert.equal(traffic.checkpoint,side);
    assert.equal(advanceTraffic(traffic,player,.1),false,'checkpoint is outside the driving lanes');
  }
});

test('the crossing has survivable routes to both stop-sign banks at multiple frame rates',()=>{
  for(const fps of [30,60,144])for(const direction of [1,-1]) {
    let safeRoutes=0;
    for(let delay=0;delay<4;delay+=.05) {
      const traffic=createTraffic(direction===1?'left':'right'),player={x:direction===1?60:580,y:300};
      for(let frame=0;frame<Math.round(delay*fps);frame++)advanceTraffic(traffic,player,1/fps);
      useTrafficStop(traffic,traffic.checkpoint);let hit=false;
      for(let frame=0;frame<fps*4;frame++) {
        player.x+=direction*135/fps;
        if(advanceTraffic(traffic,player,1/fps)){hit=true;break;}
        if(direction===1?player.x>=580:player.x<=60)break;
      }
      if(!hit){safeRoutes++;assert.equal(traffic.checkpoint,direction===1?'right':'left');}
    }
    assert.ok(safeRoutes>=5,`${fps} FPS / direction ${direction}: several safe timing windows`);
  }
});

test('the storage hallway and crossing have return doors and preserve a full older Build',()=>{
  const p=upgradeProject(defaults()),store=p.rooms.findIndex(r=>r.scene==='tennaStorage'),
    hall=p.rooms.findIndex(r=>r.scene==='storageHallway'),cross=p.rooms.findIndex(r=>r.scene==='trafficCrossing');
  assert.equal(p.rooms[store].doorLinks['15,8'],hall);assert.equal(p.rooms[hall].doorLinks['0,8'],store);
  assert.equal(p.rooms[hall].doorLinks['15,8'],cross);assert.equal(p.rooms[cross].doorLinks['0,7'],hall);
  assert.equal(p.rooms[cross].map[7][0],6);assert.equal(p.rooms[cross].map[8][15],0);
  p.rooms=p.rooms.filter(r=>!['storageHallway','trafficCrossing','neonRooftop','queenPasscode','collisionChamber'].includes(r.scene));
  delete p.rooms[store].hallwayExitVersion;delete p.rooms[store].doorLinks['15,8'];p.rooms[store].map[8][15]=1;
  for(let i=0;i<2;i++){const custom=clone(p.rooms[0]);custom.name=`Custom ${i}`;p.rooms.push(custom);}
  const custom=clone(p.rooms.slice(-2));upgradeProject(p);assert.equal(p.rooms.length,27);
  assert.deepEqual(p.rooms.slice(20,22),custom);assert.equal(p.rooms[store].doorLinks['15,8'],22);
  assert.equal(validBuild({format:'little-lantern-build',version:1,savedAt:123,project:p}),true);
  const saved=clone(p);upgradeProject(p);assert.deepEqual(p,saved);
});
