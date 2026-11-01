export const backstageScene='glitchBackstage';
export function createBackstageRoom(studioIndex) {
  const map=Array.from({length:12},(_,y)=>Array.from({length:16},(_,x)=>y>=5&&y<=10&&x>=1&&x<=14?0:1));map[3][3]=6;map[4][3]=0;
  return {
    name:'Backstage — Behind the Stars',scene:backstageScene,theme:'dark',map,
    spawn:{x:3,y:5},flowey:{x:3,y:4},target:studioIndex,doorLinks:{'3,3':studioIndex},backstageEntryVersion:1,
    npcs:[{id:'tenna-backstage',sprite:'tenna',name:'Tenna',x:8,y:7,speech:['Welcome backstage, my stars! Tell me about those fusing worlds.']}],
    trees:[],spikes:[],glitchPoints:[],dialogue:[],
  };
}
