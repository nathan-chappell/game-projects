export const storageScene='tennaStorage';
export const storageGiftConversation=[
  {speaker:'Tenna',text:'Welcome to my storage! Spare cameras, lights, props... nothing goes to waste in show business!'},
  {speaker:'Flowey',text:'You brought us here to look at old cameras?'},
  {speaker:'Tenna',text:'These cameras have recorded places that should NEVER have shared a stage. I knew that static was trouble.'},
  {speaker:'Tenna',text:'First, take these. Three TP Elixirs, on the house. Try not to make a habit of it!'},
  {speaker:'Narrator',text:'You received 3 TP Elixirs!'},
];
export const storageRepeatConversation=[
  {speaker:'Tenna',text:'Those three elixirs should help you keep the show going. Use them wisely, my stars!'},
];

export function giveTennaElixirs(story,inventory) {
  if(story.tennaElixirsReceived)return 0;
  inventory.items.tpElixir=(inventory.items.tpElixir||0)+3;
  story.tennaElixirsReceived=true;
  return 3;
}
export function createStorageRoom(backstageIndex) {
  const map=Array.from({length:12},(_,y)=>Array.from({length:16},(_,x)=>y>=4&&y<=10&&x>=1&&x<=14?0:1));
  map[8][0]=6;
  for(const y of [5,6,9,10])for(const x of [1,2,13,14])map[y][x]=7;
  return {
    name:'Tenna’s Storage',scene:storageScene,theme:'dark',map,
    spawn:{x:3,y:8},flowey:{x:2,y:8},target:backstageIndex,doorLinks:{'0,8':backstageIndex},
    npcs:[{id:'tenna-storage',sprite:'tenna',name:'Tenna',x:9,y:7,speech:['Here you are, my stars. I have something for you.']}],
    trees:[],spikes:[],glitchPoints:[],dialogue:[],savePoints:[{x:4,y:10}],
  };
}
