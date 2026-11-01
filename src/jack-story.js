export const jackRewardConversation=[
 {speaker:'Ralsey',text:'Tenna made us finish some physical challenges...'},
 {speaker:'Tenna',text:'Your 2nd Physical challenge is done!! Now come to the backstage for the Finale!!!'},
 {speaker:'Jackenstein',text:'Well, i dont know whats happening, but i got a Candy...'},
 {speaker:'Narrator',text:'You received Jack.Candy! It restores one teammate to MAX HP.'},
];
export function giveJackCandy(story,inventory){
 if(story.jackCandyReceived)return 0;
 inventory.items.jackCandy=(inventory.items.jackCandy||0)+1;
 story.jackCandyReceived=true;return 1;
}
export const jackRevealConversation=[
 {speaker:'Jackenstein',text:'NOT THE LAAAIght... Oh! You guys! Didnt see ya!'},
 {speaker:'Susie',text:'Jack! Where did you get those swords!?'},
 {speaker:'Jackenstein',text:'Oh! Some TV Man gave me this cool sword, he tell me that he give me 1000 points and a free dark house if i stop someone from pressing this lever! Idk what da points do...'},
 ...jackRewardConversation,
];
