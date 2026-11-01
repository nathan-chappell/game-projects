import test from 'node:test';
import assert from 'node:assert/strict';
import {giveJackCandy,jackRevealConversation} from '../src/jack-story.js';
import {freshInventory,freshPartyHP,maxHP} from '../src/config.js';
import {useHealingItem,useBattleItem} from '../src/battle-rules.js';
import {createDarkEncounter} from '../src/dark-battle.js';
test('Jack rewards one candy after the second physical-challenge conversation, once per adventure',()=>{
 const story={},bag=freshInventory();assert.equal(giveJackCandy(story,bag),1);assert.equal(bag.items.jackCandy,1);
 assert.equal(giveJackCandy(story,bag),0);assert.equal(bag.items.jackCandy,1);
 bag.items.jackCandy=0;assert.equal(giveJackCandy(JSON.parse(JSON.stringify(story)),bag),0);
 assert.deepEqual(jackRevealConversation.slice(3).map(l=>l.speaker),['Ralsey','Tenna','Jackenstein','Narrator']);
 assert.match(jackRevealConversation[4].text,/2nd Physical challenge.*backstage.*Finale/);
});
test('Jack.Candy fully heals or revives only the selected teammate, and full HP cannot waste it',()=>{
 for(const hp of [0,1,52,99]){
  const team=freshPartyHP(),bag=freshInventory();bag.items.jackCandy=1;team.Flowey=hp;
  assert.equal(useHealingItem(team,bag,'jackCandy','Flowey').restored,maxHP-hp);
  assert.equal(team.Flowey,maxHP);assert.equal(team.Kris,maxHP);assert.equal(bag.items.jackCandy,0);
 }
 const team=freshPartyHP(),bag=freshInventory();bag.items.jackCandy=1;
 assert.equal(useHealingItem(team,bag,'jackCandy','Kris'),null);assert.equal(bag.items.jackCandy,1);
});
test('Jack.Candy works in battle and uses one turn',()=>{
 const b=createDarkEncounter(),team=freshPartyHP(),bag=freshInventory();bag.items.jackCandy=1;team.Susie=5;
 assert.equal(useBattleItem(b,team,bag,'jackCandy','Susie').restored,95);
 assert.equal(team.Susie,maxHP);assert.equal(bag.items.jackCandy,0);assert.equal(b.turn,'Flowey');
});
