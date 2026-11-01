import test from 'node:test';
import assert from 'node:assert/strict';
import {createTennaEncounter,finaleConversation} from '../src/tenna-finale.js';
import {attackEnemy,battlePartyNames,canUseBattleAction,spareInDark,defend,proceed,requestSpecialAttack} from '../src/battle-rules.js';
test('the Finale introduces fighting Tenna with all four party turns',()=>{
 assert.ok(finaleConversation.some(l=>/fighting ME/.test(l.text)));
 const b=createTennaEncounter();assert.equal(b.enemy.name,'Tenna');assert.equal(b.kind,'tenna');assert.equal(b.turn,'Kris');
 assert.deepEqual(battlePartyNames(b),['Kris','Flowey','Susie','Ralsey']);
 for(const name of battlePartyNames(b)){assert.equal(b.turn,name);assert.equal(canUseBattleAction(b,'attack'),true);defend(b);}
 assert.equal(b.turn,'Tenna');assert.equal(b.phase,'tennaCue');assert.equal(b.snowAttack,null);assert.equal(b.tp,40);
});
test('TV TIME is available and does absolutely nothing for every party member',()=>{
 const b=createTennaEncounter();
 for(const name of battlePartyNames(b)){
  assert.equal(b.turn,name);assert.equal(canUseBattleAction(b,'spare'),true);
  const before=structuredClone(b);assert.equal(spareInDark(b),true);assert.deepEqual(b,before);defend(b);
 }
});
test('Tenna damage and victory cannot trigger Noelle’s story or attacks',()=>{
 const b=createTennaEncounter();assert.equal(proceed(b),false);assert.equal(requestSpecialAttack(b),false);
 b.enemy.hp=1;assert.equal(attackEnemy(b),true);assert.equal(b.enemy.hp,0);assert.equal(b.phase,'victory');assert.equal(b.finalAttackPending,false);
});
