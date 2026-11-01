import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounter, startKrisTurn, attackEnemy, moveSoul, advanceSnowAttack,
  snowPathBounds, battleSettings } from '../src/battle-rules.js';
import { freshPartyHP } from '../src/config.js';

function pathTurn(buffed=false) {
  const battle=createEncounter();startKrisTurn(battle);
  battle.enemyAttackCount=battle.strongerAttackCount=2;battle.strongerAttacks=buffed;
  attackEnemy(battle);attackEnemy(battle);
  return battle;
}

for(const buffed of [false,true]) {
  test(`${buffed?'buffed':'normal'} path: holding left/right with a moving bend cannot cause rapid entry hits`, () => {
    for(const fps of [30,60,144]) for(const direction of ['left','right']) {
      const b=pathTurn(buffed),hp=freshPartyHP(),dt=1/fps,
        damage=battleSettings.snowPathDamage+(buffed?battleSettings.strongerDamageBonus:0),hits=[];
      b.snowAttack.pathAge=direction==='left'?2.3:5.1;
      const bounds=snowPathBounds(b,b.soul.y);
      b.soul.x=direction==='left'?bounds.left+16:bounds.right-16;
      for(let frame=0;frame<Math.floor(fps*0.8);frame++) {
        const before=hp.Kris+hp.Flowey;
        moveSoul(b,new Set([direction]),dt);advanceSnowAttack(b,hp,dt,()=>0);
        if(hp.Kris+hp.Flowey<before)hits.push((frame+1)*dt);
      }
      assert.equal(hits.length,1,`${direction} at ${fps} FPS: only the first contact should hurt in 0.8s`);
      assert.equal(hp.Kris,100-damage);assert.equal(hp.Flowey,100);
      for(let frame=0;frame<fps*2;frame++) {
        const before=hp.Kris+hp.Flowey;
        moveSoul(b,new Set([direction]),dt);advanceSnowAttack(b,hp,dt,()=>0);
        if(hp.Kris+hp.Flowey<before)hits.push(Math.floor(fps*0.8)*dt+(frame+1)*dt);
      }
      for(let i=1;i<hits.length;i++)assert.ok(hits[i]-hits[i-1]>=1-dt-1e-9,'snow hits must be a second apart');
    }
  });
}

test('brief path exits/re-entries keep the damage cooldown, a long safe wait allows an immediate hit, and a new attack resets it', () => {
  for(const buffed of [false,true]) {
    const b=pathTurn(buffed),hp=freshPartyHP(),damage=buffed?37:30;
    b.snowAttack.pathAge=4.5;b.soul={x:400,y:163};
    advanceSnowAttack(b,hp,0.01,()=>0);assert.equal(hp.Kris,100-damage);
    b.soul.x=264;advanceSnowAttack(b,hp,0.1,()=>0);
    assert.equal(b.snowAttack.inSnow,false);
    b.soul.x=400;advanceSnowAttack(b,hp,0.1,()=>0);
    assert.equal(hp.Kris,100-damage,'re-entry inside cooldown cannot damage again');
    for(let frame=0;frame<81;frame++) {
      const bounds=snowPathBounds(b,b.soul.y);b.soul.x=(bounds.left+bounds.right)/2;
      advanceSnowAttack(b,hp,0.01,()=>0);
    }
    assert.equal(hp.Kris,100-damage,'waiting safely causes no delayed damage');
    b.soul.x=400;advanceSnowAttack(b,hp,0.001,()=>0);
    assert.equal(hp.Kris,100-damage*2,'contact after a safe wait hits immediately');
    startKrisTurn(b);b.enemyAttackCount=b.strongerAttackCount=2;attackEnemy(b);attackEnemy(b);
    assert.equal(b.snowAttack.contactCooldown,0);
  }
});
