import test from 'node:test';
import assert from 'node:assert/strict';
import {freshInventory} from '../src/config.js';
import {giveTennaElixirs} from '../src/tenna-storage.js';
import {defaults,upgradeProject,clone,validBuild,validProject} from '../src/world.js';

function reachable(room,start) {
  const seen=new Set(),queue=[start];
  while(queue.length) {
    const {x,y}=queue.shift(),key=`${x},${y}`;
    if(seen.has(key)||![0,6].includes(room.map[y]?.[x]))continue;
    seen.add(key);queue.push({x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1});
  }
  return seen;
}

test('Tenna gives exactly three carried TP Elixirs once, preserving other items and the reward through save/load',()=>{
  const story={tennaElixirsReceived:false},inventory=freshInventory();inventory.items.tpElixir=2;inventory.items.gCandy=4;
  assert.equal(giveTennaElixirs(story,inventory),3);
  assert.deepEqual(inventory.items,{gCandy:4,tpElixir:5,jackCandy:0});assert.equal(story.tennaElixirsReceived,true);
  assert.equal(giveTennaElixirs(story,inventory),0);assert.equal(inventory.items.tpElixir,5);
  const saved=JSON.parse(JSON.stringify({story,inventory}));
  assert.equal(giveTennaElixirs(saved.story,saved.inventory),0);assert.equal(saved.inventory.items.tpElixir,5);
  const legacy=freshInventory();assert.equal(giveTennaElixirs({},legacy),3);assert.equal(legacy.items.tpElixir,3);
});

test('backstage uses the marked upper-left entrance and storage is reachable around the equipment cases',()=>{
  const p=upgradeProject(defaults()),studio=p.rooms.findIndex(r=>r.scene==='glitchStudio'),
    back=p.rooms.findIndex(r=>r.scene==='glitchBackstage'),store=p.rooms.findIndex(r=>r.scene==='tennaStorage'),
    backstage=p.rooms[back],storage=p.rooms[store];
  assert.deepEqual(backstage.spawn,{x:3,y:5});assert.equal(backstage.doorLinks['3,3'],studio);
  assert.equal(p.rooms[backstage.doorLinks['0,8']].scene,'collisionChamber');assert.equal(backstage.map[4][3],0);
  assert.equal(backstage.doorLinks['15,8'],store);assert.equal(storage.doorLinks['0,8'],back);
  const backWalk=reachable(backstage,backstage.spawn),storageWalk=reachable(storage,storage.spawn);
  assert.ok(backWalk.has('3,3'));assert.ok(backWalk.has('15,8'));
  assert.ok(storageWalk.has('0,8'));assert.ok(storageWalk.has('9,8'));assert.ok(storageWalk.has('4,10'));
  assert.equal(storage.npcs.length,1);assert.equal(storage.npcs[0].id,'tenna-storage');
  assert.deepEqual(storage.spikes,[]);assert.equal(storage.map[5][1],7);
  assert.equal(validBuild({format:'little-lantern-build',version:1,savedAt:123,project:p}),true);
});

test('old backstage entries migrate to the marked opening without resetting other room edits',()=>{
  const p=upgradeProject(defaults()),back=p.rooms.find(r=>r.scene==='glitchBackstage'),studio=p.rooms.findIndex(r=>r.scene==='glitchStudio');
  delete back.backstageEntryVersion;delete back.collisionExitVersion;delete back.doorLinks['3,3'];back.map[3][3]=back.map[4][3]=1;
  back.map[8][0]=6;back.doorLinks['0,8']=studio;back.spawn={x:3,y:8};back.tileColors={'6,9':'#123456'};
  upgradeProject(p);assert.equal(back.doorLinks['3,3'],studio);assert.equal(p.rooms[back.doorLinks['0,8']].scene,'collisionChamber');
  assert.deepEqual(back.spawn,{x:3,y:5});assert.equal(back.tileColors['6,9'],'#123456');
  const before=clone(p);upgradeProject(p);assert.deepEqual(p,before);
});

test('an older full backstage Build gains storage without replacing either custom room',()=>{
  const p=upgradeProject(defaults());p.rooms=p.rooms.filter(r=>!['tennaStorage','storageHallway','trafficCrossing','neonRooftop','queenPasscode','collisionChamber'].includes(r.scene));const back=p.rooms.find(r=>r.scene==='glitchBackstage');
  delete back.storageExitVersion;delete back.doorLinks['15,8'];back.map[8][15]=1;
  for(let i=0;i<2;i++){const r=clone(p.rooms[0]);r.name=`My room ${i}`;p.rooms.push(r);}
  assert.equal(p.rooms.length,21);const before=clone(p.rooms);
  upgradeProject(p);assert.equal(p.rooms.length,27);assert.equal(p.rooms[21].scene,'tennaStorage');
  assert.deepEqual(p.rooms[19],before[19]);assert.deepEqual(p.rooms[20],before[20]);
  assert.equal(back.doorLinks['15,8'],21);assert.equal(validProject(p),true);
});
