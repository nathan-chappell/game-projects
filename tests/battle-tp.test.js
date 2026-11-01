import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEncounter, startKrisTurn, attackEnemy, defend, friendlynessPellets, proceed,
  advanceSnowAttack, advanceBattleTime, requestSpecialAttack, battleSettings, battleArena,
} from '../src/battle-rules.js';
import { freshPartyHP } from '../src/config.js';
import { crossingHazards, crossingSettings } from '../src/battle-crossing.js';
import { orbitHazards, orbitSettings } from '../src/battle-orbit.js';
import { goalSettings, goalGroundY, goalSnowballs } from '../src/battle-goal.js';
import { advanceGrazing, isGrazingHazard } from '../src/battle-graze.js';
import { snowgraveSettings, snowgraveCycle } from '../src/battle-snowgrave.js';

function partyTurn() { const battle = createEncounter(); startKrisTurn(battle); return battle; }
function enemyTurn(index = 0, buffed = false) {
  const battle = partyTurn();
  battle.enemyAttackCount = battle.strongerAttackCount = index;
  battle.strongerAttacks = buffed;
  attackEnemy(battle); attackEnemy(battle);
  return battle;
}
function ballAt(battle, gap, lane = 0) {
  return { x: battle.soul.x + battleSettings.soulWidth / 2 + battleSettings.snowballRadius + gap,
    y: battle.soul.y, velocity: 0, delay: 0, hit: false, grazeLane: lane };
}

test('Defend gives either teammate 10 TP, retains damage reduction, and rejects invalid turns', () => {
  const battle = createEncounter();
  assert.equal(defend(battle), false); assert.equal(battle.tp, 0);
  startKrisTurn(battle);
  defend(battle); assert.equal(battle.tp, 10); assert.equal(battle.turn, 'Flowey');
  defend(battle); assert.equal(battle.tp, 20); assert.equal(battle.phase, 'enemy');
  assert.equal(battle.projectileDamageMultiplier, 0.5);
  assert.equal(battle.tpGainAmount, 10); assert.equal(battle.tpGainSource, 'defend');
  assert.equal(defend(battle), false); assert.equal(battle.tp, 20);
  startKrisTurn(battle); assert.equal(battle.tp, 20);
  battle.tp = 98; defend(battle); assert.equal(battle.tp, 100);
  assert.equal(battle.tpGainAmount, 2);
});

test('TP earned by Defend can pay for Pellets and Proceed without manual TP grants', () => {
  for (const act of ['pellets','proceed']) {
    const battle = partyTurn(), hp = freshPartyHP();
    for (let round = 0; round < (act === 'pellets' ? 4 : 5); round++) {
      defend(battle); defend(battle); startKrisTurn(battle);
    }
    if (act === 'pellets') {
      defend(battle); assert.equal(battle.tp, 90);
      assert.equal(friendlynessPellets(battle, hp), true);
    } else {
      assert.equal(battle.tp, 100); assert.equal(proceed(battle), true);
    }
    assert.equal(battle.tp, 0);
  }
});

test('normal and buffed snowballs grant 3 TP every half second using a shared cooldown', () => {
  for (const index of [0,1]) for (const buffed of [false,true]) {
    const battle = enemyTurn(index,buffed), hp = freshPartyHP(), snow = battle.snowAttack;
    snow.nextWaveIn = 100;
    const first = ballAt(battle, 30); snow.balls = [first];
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,0);
    first.x = ballAt(battle,6).x;
    assert.equal(advanceSnowAttack(battle,hp,0.001),true);
    assert.equal(battle.tp,3); assert.deepEqual(hp,freshPartyHP());
    advanceSnowAttack(battle,hp,0.1); assert.equal(battle.tp,3);
    first.x += 70; advanceSnowAttack(battle,hp,0.001);
    first.x -= 70; advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
    snow.balls.push(ballAt(battle,6,1));
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
    assert.equal(snow.grazeActive,true);
    for (let i=0;i<30;i++) {
      snow.balls.forEach(ball => { ball.velocity=-battleSettings.snowballGravity/60; });
      advanceSnowAttack(battle,hp,1/60);
    }
    assert.equal(battle.tp,6,'same nearby snowballs pay again after half a second');
    first.x += 70; snow.balls=[];
    advanceSnowAttack(battle,hp,0.001); assert.equal(snow.grazeActive,false);
    assert.equal(battle.tpGainAmount,3); assert.equal(battle.tpGainSource,'graze');
  }
});

test('grazing uses full-heart circle clearance including diagonal near misses', () => {
  const battle = enemyTurn(), hp = freshPartyHP(), snow = battle.snowAttack;
  snow.nextWaveIn = 100;
  snow.balls = [{ ...ballAt(battle,0), x:battle.soul.x+24, y:battle.soul.y+22.5 }];
  advanceSnowAttack(battle,hp,0.001);
  assert.equal(battle.tp,3); assert.deepEqual(hp,freshPartyHP());
});

test('direct hits suppress the halo and TP even with immunity; spent bullets give no TP', () => {
  for (const invincible of [false,true]) {
    const battle = enemyTurn(), hp = freshPartyHP(), snow = battle.snowAttack;
    battle.invincible = invincible; snow.nextWaveIn = 100;
    snow.balls = [ballAt(battle,-2)];
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,0);
    assert.equal(hp.Kris+hp.Flowey,invincible?200:185);
    assert.equal(snow.grazeActive,false);
    snow.balls[0].x = ballAt(battle,6).x;
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,invincible?3:0);
  }
});

test('warnings, ending attacks and path snow give no TP; new waves share the cooldown', () => {
  const battle = enemyTurn(), hp = freshPartyHP(), snow = battle.snowAttack;
  snow.nextWaveIn = 100; snow.balls = [{...ballAt(battle,6),delay:0.3}];
  advanceSnowAttack(battle,hp,0.1); assert.equal(battle.tp,0);
  snow.balls[0].delay = 0; advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
  snow.waves++; snow.balls = [ballAt(battle,6)];
  advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
  snow.waves++; snow.endingAge=0;
  advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
  assert.equal(snow.grazeActive,false);
  const terrain = enemyTurn(2); terrain.snowAttack.pathAge=4.5; terrain.soul.x=400;
  advanceSnowAttack(terrain,freshPartyHP(),0.01); assert.equal(terrain.tp,0);
});

test('orbiting snowballs and the rotating cube award TP only after their preparation window', () => {
  for (const cube of [true,false]) {
    const battle = enemyTurn(3), hp=freshPartyHP(), orbit=battle.snowAttack.orbit;
    orbit.box.vx=orbit.box.vy=0;
    orbit.box.x=240;
    const hazards=orbitHazards(orbit);
    battle.soul=cube ? {x:hazards.cube.x+44,y:hazards.cube.y}
      : {x:hazards.balls[0].x-27,y:hazards.balls[0].y};
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,0);
    orbit.age=orbitSettings.warmup;
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
    advanceSnowAttack(battle,hp,0.01); assert.equal(battle.tp,3);
    assert.deepEqual(hp,freshPartyHP());
  }
});

test('crossing large, fixed and spinning snowballs can each be grazed', () => {
  for (const group of ['large','small','spinning']) {
    const battle=enemyTurn(4),hp=freshPartyHP(),crossing=battle.snowAttack.crossing;
    crossing.age=crossingSettings.warmup;
    const hazards=crossingHazards(crossing,battleArena),ball=hazards[group][group==='large'?2:0];
    battle.soul=group==='small'?{x:ball.x+25,y:ball.y}
      : {x:ball.x,y:ball.y+10.5+(group==='large'?18:12)+6};
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3,group);
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3,group);
    assert.deepEqual(hp,freshPartyHP(),group);
  }
});

test('blue-soul rollers support grazing and wrapping does not bypass the cooldown', () => {
  const battle=partyTurn(),hp=freshPartyHP();
  requestSpecialAttack(battle); attackEnemy(battle); attackEnemy(battle);
  const goal=battle.snowAttack.goal;
  goal.age=goalSettings.warmup;
  battle.soul={x:128,y:goalGroundY-10.5};
  advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
  advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
  const firstPass=goalSnowballs(goal)[0].pass;
  goal.age=goalSettings.warmup+goalSettings.groupSpacing*4/goalSettings.startSpeed;
  assert.notEqual(goalSnowballs(goal)[0].pass,firstPass);
  advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
  assert.deepEqual(hp,freshPartyHP());
});

test('Snowgrave only supports grazing during live eruptions and shares the cooldown', () => {
  const battle=partyTurn(),hp=freshPartyHP();
  battle.enemy.hp=40;attackEnemy(battle);
  const spell=battle.snowAttack.snowgrave;
  battle.soul.x=317;spell.age=snowgraveSettings.intro+0.1;
  advanceSnowAttack(battle,hp,0.001);assert.equal(battle.tp,0);
  spell.age=snowgraveSettings.intro+snowgraveSettings.warning+0.06;
  advanceSnowAttack(battle,hp,0.001);assert.equal(battle.tp,3);
  advanceSnowAttack(battle,hp,0.02);assert.equal(battle.tp,3);
  spell.age=snowgraveSettings.intro+snowgraveSettings.warning+0.06+snowgraveCycle;
  battle.soul.x=353;
  advanceSnowAttack(battle,hp,0.001);assert.equal(battle.tp,3);
  assert.deepEqual(hp,freshPartyHP());
});

test('graze TP caps at 100, feedback expires, and a new encounter resets TP', () => {
  const battle=enemyTurn(),hp=freshPartyHP();battle.tp=99;
  battle.snowAttack.nextWaveIn=100;battle.snowAttack.balls=[ballAt(battle,6)];
  advanceSnowAttack(battle,hp,0.001);assert.equal(battle.tp,100);assert.equal(battle.tpGainAmount,1);
  advanceBattleTime(battle,battleSettings.tpGainSeconds);
  assert.equal(battle.tpGainAge,null);assert.equal(battle.tp,100);
  assert.equal(createEncounter().tp,0);
});


test('grazing stays active through repeated ticks, stops on exit, and cannot be farmed by reentry', () => {
  const battle=enemyTurn(), snow=battle.snowAttack;
  snow.balls=[ballAt(battle,6)];
  const tick=dt=>advanceGrazing(battle,battleSettings,battleArena,dt);
  assert.equal(tick(0.001),1); assert.equal(snow.grazeActive,true);
  assert.equal(tick(0.499),0); assert.equal(snow.grazeActive,true);
  assert.equal(tick(0.001),1);
  snow.balls[0].x+=60;
  assert.equal(tick(0.1),0); assert.equal(snow.grazeActive,false);
  snow.balls[0].x-=60;
  assert.equal(tick(0.1),0); assert.equal(snow.grazeActive,true);
  assert.equal(tick(0.3),1);
  snow.balls.push(ballAt(battle,6,1));
  assert.equal(tick(0.5),1,'multiple hazards still grant one 3% award per interval');
});

test('all four snow borders and the growing bottom/right bank can be grazed in normal and buffed attacks', () => {
  const a=battleArena, rim=battleSettings.snowBorderDepth, hw=12, hh=10.5,
    left=a.x+a.border+rim, right=a.x+a.size-a.border-rim,
    top=a.y+a.border+rim, bottom=a.y+a.size-a.border-rim;
  for (const index of [0,1]) for (const buffed of [false,true]) {
    const battle=enemyTurn(index,buffed), snow=battle.snowAttack, hp=freshPartyHP();
    snow.nextWaveIn=100;
    const near=()=>isGrazingHazard(battle,battleSettings,battleArena);
    for (const soul of [{x:left+hw+6,y:163},{x:right-hw-6,y:163},
      {x:320,y:top+hh+6},{x:320,y:bottom-hh-6}]) {
      battle.soul=soul;assert.equal(near(),true);
    }
    battle.soul={x:320,y:163};assert.equal(near(),false);
    snow.height=70;
    const surface=(index===0?a.y:a.x)+a.size-a.border-snow.height;
    battle.soul=index===0?{x:320,y:surface-hh-6}:{x:surface-hw-6,y:163};
    assert.equal(near(),true);
    advanceSnowAttack(battle,hp,0.001); assert.equal(battle.tp,3);
    advanceSnowAttack(battle,hp,0.5); assert.equal(battle.tp,6);
    assert.equal(snow.grazeActive,true);assert.deepEqual(hp,freshPartyHP());
    if(index===0) battle.soul.y=surface-hh-11;else battle.soul.x=surface-hw-11;
    advanceSnowAttack(battle,hp,0.001);assert.equal(snow.grazeActive,false);
    if(index===0) battle.soul.y=surface-hh+1;else battle.soul.x=surface-hw+1;
    advanceSnowAttack(battle,hp,0.5);assert.equal(snow.grazeActive,false);
    assert.equal(battle.tp,6,'being inside snow gives damage, not grazing rewards');
    assert.equal(hp.Kris+hp.Flowey,buffed?168:175);
  }
});

test('snow grazing has consistent timing at different frame rates, stays visible at full TP and resets between turns', () => {
  for (const fps of [30,60,144]) {
    const battle=enemyTurn(),hp=freshPartyHP(),snow=battle.snowAttack;
    snow.nextWaveIn=100;battle.soul={x:243,y:163};
    for(let frame=0;frame<fps*2;frame++)advanceSnowAttack(battle,hp,1/fps);
    assert.equal(battle.tp,12,`${fps} fps`);assert.equal(snow.grazeActive,true);
    battle.tp=100;advanceSnowAttack(battle,hp,0.5);
    assert.equal(battle.tp,100);assert.equal(snow.grazeActive,true);
    startKrisTurn(battle);assert.equal(battle.snowAttack,null);
    attackEnemy(battle);attackEnemy(battle);
    assert.equal(battle.snowAttack.grazeActive,false);assert.equal(battle.snowAttack.grazeCooldown,0);
  }
});
