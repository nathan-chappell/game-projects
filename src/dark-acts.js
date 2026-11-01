export const darkActDefinitions={
 Kris:{name:'Shine',cost:100,description:'Shine a light. Use three times to unlock attacks and ACTs; five times to light up the room.'},
 Flowey:{name:'Friendlyness Pellets',cost:65,description:'Deal 150 damage and heal Flowey 35 HP.'},
 Susie:{name:'Rude Buster',cost:70,description:'Deal 170–230 damage.'},
 Ralsey:{name:'Heal Player',cost:50,description:'Heal a random teammate below max HP by 50–70 HP.'},
};
export const darkActInfo=b=>darkActDefinitions[b?.turn]||darkActDefinitions.Kris;
export const darkActLocked=b=>b?.kind==='dark'&&b.turn!=='Kris'&&!b.darkUnlocked;
