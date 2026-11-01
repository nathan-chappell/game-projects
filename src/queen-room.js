export const queenScene='queenPasscode';
export const queenOriginalCode='GIASFELFEBREHBER';
export const queenCode='SFFERFEASLF';
export const queenLetters=['GIAELFSB','ILSFLEAL','AFLRRBIG','SFFEERSI'];
export const queenConversation=[
  {speaker:'Queen',text:'Kris? And A Talking Flower. Well This Is New.'},
  {speaker:'Flowey',text:"It's Flowey. Listen. The Underground and the Dark World are fusing together."},
  {speaker:'Flowey',text:"Rooms are connecting to places they shouldn't. We fell out of the CORE, and now everything keeps glitching."},
  {speaker:'Flowey',text:"It's not just the scenery. The glitches are affecting people, too. We need to find out what's causing them."},
  {speaker:'Susie',text:"Yeah. Even Tenna's show is falling apart. Have you seen anything weird?"},
  {speaker:'Queen',text:'My Terminal Keeps Rewriting Its Own Data. Which Is Rude. I Was Using That.'},
  {speaker:'Flowey',text:'Then you know something is wrong. Can you help us?'},
  {speaker:'Queen',text:'I Can Try. But First I Need Help With The Passcode.'},
  {speaker:'Queen',text:'Watch What Happens When I Enter The Passcode.'},
  {speaker:'Queen',text:'See? Step On The Letters To Enter The Correct Code. Start With S.'},
];
export const queenReminder=[
  {speaker:'Queen',text:'I Still Need Help With The Passcode. These Letters Are Being Extremely Uncooperative.'},
  {speaker:'Flowey',text:"We'll take a look. Just don't let that terminal glitch us into another room."},
];

export function createQueenRoom(rooftopIndex) {
  const map=Array.from({length:12},(_,y)=>Array.from({length:16},(_,x)=>
    y>=4&&y<=9&&x>=2&&x<=13||y>=10&&(x===7||x===8)?0:1));
  map[11][8]=6;
  return{name:'Queen’s Passcode Terminal',scene:queenScene,theme:'dark',map,
    spawn:{x:8,y:10},flowey:{x:8,y:11},target:rooftopIndex,doorLinks:{'8,11':rooftopIndex},
    npcs:[{id:'queen-terminal',name:'Queen',sprite:'queen',x:12,y:7,speech:['I Need Help With The Passcode.']}],
    trees:[],spikes:[],savePoints:[],glitchPoints:[],dialogue:[]};
}

export const queenSuccess=[
 {speaker:'Tenna',text:'Splendid! Your first Physical challenge is done!'},
 {speaker:'Tenna',text:'Come and meet me for the second Physical challenge!'},
 {speaker:'Susie',text:'We do NOT have time for this! The worlds are falling apart!'},
 {speaker:'Queen',text:'Then I Will Take My Flying Chair. Good Luck With The Next Physical Challenge.'},
];
