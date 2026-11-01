export const tennaArrivalSettings={jump:0.7,land:0.22,leave:0.7};
export const tennaArrivalConversation=[
  {speaker:'Tenna',text:"Aren't those my FAVOURITE contestants?"},
  {speaker:'Tenna',text:"Who's ready for TV TIME!!!!!"},
  {speaker:'Susie',text:'Not now.'},
  {speaker:'Flowey',text:"Listen, TV guy. Our worlds are fusing together. The Underground and the Dark World are getting mixed up."},
  {speaker:'Flowey',text:"Places that shouldn't connect are crashing into each other. We fell out of the CORE and ended up here."},
  {speaker:'Flowey',text:"Now everything's glitching. Even your precious show. We need to figure out what's causing it."},
  {speaker:'Tenna',text:'WORLD-SHAKING DRAMA! Now THAT is television!'},
  {speaker:'Susie',text:'Did you even hear him? We need your help.'},
  {speaker:'Tenna',text:'Then meet me backstage, my stars! We can talk away from the cameras.'},
  {speaker:'Tenna',text:"Through the door on the right! Don't keep your favourite host waiting!"},
];
export const tennaBackstageConversation=[
  {speaker:'Flowey',text:"The glitches are changing real places. We fell out of the CORE and landed somewhere that shouldn't exist."},
  {speaker:'Flowey',text:'Rooms are joining up wrong. The Underground and the Dark World are bleeding into each other.'},
  {speaker:'Flowey',text:"It's affecting people, too. Noelle attacked us. Your studio is turning into static. This isn't just a broken TV."},
  {speaker:'Susie',text:"Yeah. So if you've got something that can help, now's the time."},
  {speaker:'Tenna',text:'This will hurt my budget... but come to my storage. I want to show you something.'},
  {speaker:'Tenna',text:'Through the door on the right! Mind the cameras hanging from the ceiling.'},
  {speaker:'Flowey',text:'Fine. Lead the way.'},
];
export const createTennaEntrance=()=>({stage:'jump',age:0});

export function advanceTennaEntrance(scene,dt) {
  scene.age+=dt;
  if(scene.stage==='jump'&&scene.age>=tennaArrivalSettings.jump+tennaArrivalSettings.land-1e-9) {
    scene.stage='talk';scene.age=0;return 'talk';
  }
  if(scene.stage==='depart'&&scene.age>=tennaArrivalSettings.leave-1e-9)return 'done';
  return null;
}
export function tennaEntrancePose(scene,reduced=false) {
  if(!scene)return null;
  if(scene.stage==='talk'||reduced)return{x:470,y:360,scaleX:1,scaleY:1};
  if(scene.stage==='depart') {
    const p=Math.min(1,scene.age/tennaArrivalSettings.leave);
    return{x:470+230*p,y:360-Math.sin(p*Math.PI)*85,scaleX:1,scaleY:1};
  }
  const p=Math.min(1,scene.age/tennaArrivalSettings.jump),
    landing=Math.max(0,(scene.age-tennaArrivalSettings.jump)/tennaArrivalSettings.land),
    squash=scene.age>=tennaArrivalSettings.jump?Math.sin(landing*Math.PI)*0.1:0;
  return{x:700-230*p,y:360-4*p*(1-p)*120,scaleX:1+squash,scaleY:1-squash};
}
