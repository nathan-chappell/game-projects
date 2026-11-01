import { isItemId } from '../inventory/identifiers.ts';
import type { ItemId } from '../inventory/types.ts';
import type { Room } from '../world/types.ts';
import { itemDefinitions } from './config.ts';
import type { Elements } from './dom.ts';
import type { GameState } from './types.ts';
interface Dependencies {
  readonly $: Elements;
  readonly state: GameState;
  readonly friendsWaiting: () => boolean;
  readonly current: () => Room;
}
export function createHud(dependencies: Dependencies) {
  const state = dependencies.state;
  function storyUI() {
    dependencies.$('inventorySummary').textContent =
      'Items: ' +
      (Object.entries(state.inventory.items)
        .filter((entry): entry is [ItemId, number] => isItemId(entry[0]) && entry[1] > 0)
        .map(([id, count]) => itemDefinitions[id].name + ' × ' + count)
        .join(', ') || 'none');
    dependencies.$('partyChip').textContent =
      state.story.teamJoined && !dependencies.friendsWaiting()
        ? 'PARTY · KRIS + FLOWEY + RALSEY + SUSIE'
        : state.story.joined
          ? 'PARTY · KRIS + FLOWEY'
          : 'PARTY · KRIS';
    dependencies.$('taskIcon').textContent = state.story.joined ? '✿' : '◇';
    dependencies.$('taskTitle').textContent = state.story.joined
      ? 'Flowey joined you'
      : state.roomIndex === 1
        ? 'A flower in the ruins'
        : 'Explore the old castle';
    dependencies.$('taskDescription').textContent = state.story.joined
      ? 'He follows your footsteps, even between rooms.'
      : state.roomIndex === 1
        ? 'Listen to what Flowey has to say.'
        : 'Walk through the doorway on the right.';
    dependencies.$('storySummary').textContent = state.story.joined
      ? 'The UNDERGROUND and the legend of DELTARUNE have collided. Neither of you knows why.'
      : state.roomIndex === 1
        ? 'Something stirs between the old stones. A golden flower pushes through.'
        : 'You wake among cracked stone and faded banners. Somewhere beyond the doorway, something is waiting.';
    chapterUI();
  }
  function chapterUI() {
    if (dependencies.current().scene === 'collisionChamber') {
      dependencies.$('taskTitle').textContent = 'The Monochrome Chamber';
      dependencies.$('taskDescription').textContent = state.story.jackRevealed
        ? 'Talk to Jackenstein and inspect the lever. The bottom passage returns backstage.'
        : 'Explore the strange room. The bottom passage returns backstage.';
      dependencies.$('storySummary').textContent =
        'Something from another universe stands beneath the spotlight.';
      return;
    }
    if (dependencies.current().scene === 'queenPasscode') {
      dependencies.$('taskTitle').textContent = 'Queen’s Passcode';
      dependencies.$('taskDescription').textContent = state.story.queenBriefed
        ? 'Queen needs help with the passcode on the terminal.'
        : 'Flowey has something to explain to Queen.';
      dependencies.$('storySummary').textContent =
        'A giant letter keyboard sits below a glowing green terminal.';
      return;
    }
    if (dependencies.current().scene === 'neonRooftop') {
      dependencies.$('taskTitle').textContent = 'Neon Rooftops';
      dependencies.$('taskDescription').textContent =
        'Explore the green walkway above the city. Hold F to run.';
      dependencies.$('storySummary').textContent =
        'Cyan windows glow beneath green lights crisscrossing the night sky.';
      return;
    }
    if (dependencies.current().scene === 'storageHallway') {
      dependencies.$('taskTitle').textContent = 'The Long Storage Hall';
      dependencies.$('taskDescription').textContent =
        'Keep following the corridor. A door waits at the far end.';
      dependencies.$('storySummary').textContent = 'Rows of cameras and equipment stretch far into the dark.';
      return;
    }
    if (dependencies.current().scene === 'trafficCrossing') {
      dependencies.$('taskTitle').textContent = 'The Glitched Crossing';
      dependencies.$('taskDescription').textContent =
        'Use C or Z at a stop sign to slow the cars, then cross to the other side.';
      dependencies.$('storySummary').textContent =
        'A car hit sends the party back to the last stop-sign checkpoint.';
      return;
    }
    if (dependencies.current().scene === 'tennaStorage') {
      dependencies.$('taskTitle').textContent = 'Tenna’s Storage';
      dependencies.$('taskDescription').textContent = state.story.tennaElixirsReceived
        ? 'Explore the hanging cameras and equipment.'
        : 'Find Tenna among the stored cameras. Press Z or C to talk.';
      dependencies.$('storySummary').textContent = state.story.tennaElixirsReceived
        ? 'Tenna gave you three TP Elixirs to help with the glitches.'
        : 'Spare cameras hang above a dark room filled with old show equipment.';
      return;
    }
    if (dependencies.current().scene === 'glitchBackstage') {
      dependencies.$('taskTitle').textContent = 'Backstage';
      dependencies.$('taskDescription').textContent = state.story.jackCandyReceived
        ? 'Tenna is waiting here for the Finale. Talk to him to enter the fight.'
        : state.story.tennaStorageInvited
          ? 'Follow Tenna into his storage through the doorway on the right.'
          : 'Flowey has more to explain about the glitches.';
      dependencies.$('storySummary').textContent =
        'Behind the star-covered wings, the host is ready to hear about the fusing worlds.';
      return;
    }
    if (dependencies.current().scene === 'glitchStudio') {
      dependencies.$('taskTitle').textContent = 'The Glitched Studio';
      dependencies.$('taskDescription').textContent = state.story.tennaInvited
        ? 'Meet Tenna backstage. Take the doorway on the right.'
        : 'The scoreboard keeps changing. Stay close to your friends.';
      dependencies.$('storySummary').textContent = state.story.tennaInvited
        ? 'Tenna wants to hear more about the fusing worlds, away from the cameras.'
        : 'Broken lights flicker above the stage. A familiar show is struggling through the static.';
      return;
    }
    if (dependencies.current().scene === 'glitchBoss') {
      if (state.story.noelleEscaped || state.story.noelleGone) {
        dependencies.$('taskTitle').textContent = 'After the battle';
        dependencies.$('taskDescription').textContent =
          'Follow the glowing doorway on the right to the studio.';
        dependencies.$('storySummary').textContent = 'Ralsey and Susie confront Kris about what happened.';
        return;
      }
      dependencies.$('taskTitle').textContent = 'A silent figure';
      dependencies.$('taskDescription').textContent = 'Kris and Flowey face the figure ahead.';
      dependencies.$('storySummary').textContent =
        'The gray road leads to a familiar face in the white silence.';
      return;
    }
    if (dependencies.current().scene === 'glitchWorld') {
      dependencies.$('taskTitle').textContent = 'Glitch World';
      dependencies.$('taskDescription').textContent = dependencies.friendsWaiting()
        ? 'Continue right with Flowey. Susie is staying here to comfort Ralsey.'
        : 'Follow the gray walkway through the white silence. Everyone made it through the fall.';
      dependencies.$('storySummary').textContent =
        'The endless fall is over. The CORE has vanished, leaving a white world and a single gray road.';
      return;
    }
    if (dependencies.current().scene === 'coreDepths') {
      dependencies.$('taskTitle').textContent = 'Deeper into the CORE';
      dependencies.$('taskDescription').textContent =
        'The floor near this spike looks unstable too. Save at the golden star before exploring.';
      dependencies.$('storySummary').textContent =
        'Another floor collapsed. The party has fallen farther beneath the CORE.';
      return;
    }
    if (dependencies.current().scene === 'coreLower') {
      dependencies.$('taskTitle').textContent = 'Below the CORE';
      dependencies.$('taskDescription').textContent =
        'Explore the lower chamber. Its spike is surrounded by unstable flooring. The golden star lets you save your progress.';
      dependencies.$('storySummary').textContent =
        'The floor gave way beneath the party. The entrance above is out of reach.';
      return;
    }
    if (dependencies.current().scene === 'coreEntrance') {
      dependencies.$('taskTitle').textContent = 'Inside the CORE';
      dependencies.$('taskDescription').textContent =
        'Explore the metal walkway. The floor near the spike looks unstable.';
      dependencies.$('storySummary').textContent =
        'The bounce pad carried everyone into the CORE. Warning lights flicker along the pipes.';
      return;
    }
    if (dependencies.current().scene === 'darkFurnace') {
      dependencies.$('taskTitle').textContent = state.story.coreExplained
        ? 'Enter the CORE'
        : 'Explore the furnace chamber';
      dependencies.$('taskDescription').textContent =
        'Pass Froggit and step onto the glowing bounce pad on the right to launch into the CORE. Head left to return to the doors.';
      dependencies.$('storySummary').textContent =
        'Beyond the golden doors, cold darkness gives way to red furnace light and bubbling lava.';
      return;
    }
    if (dependencies.current().scene === 'darkGoldenHall') {
      dependencies.$('taskTitle').textContent = 'Approach the golden door';
      dependencies.$('taskDescription').textContent =
        'Follow the outlined walkway toward the towering golden door.';
      dependencies.$('storySummary').textContent =
        'The purple gives way to black. Golden vines curl around a towering, silent doorway.';
      return;
    }
    if (dependencies.current().scene === 'darkWindingPassage') {
      dependencies.$('taskTitle').textContent = 'Follow the winding path';
      dependencies.$('taskDescription').textContent =
        'Go up, cross the bridge above the gap, then follow the right-hand passage down.';
      dependencies.$('storySummary').textContent =
        'The path folds around a purple chasm. A soft glow marks the way ahead.';
      return;
    }
    if (dependencies.current().scene === 'darkJumpIslands') {
      dependencies.$('taskTitle').textContent = 'Cross the leaping isles';
      dependencies.$('taskDescription').textContent =
        'Step onto the glowing red arrows to jump between the platforms.';
      dependencies.$('storySummary').textContent =
        'Three round islands float in the purple dark. Jump pads point the way across.';
      return;
    }
    if (dependencies.current().scene === 'darkGlowPassage') {
      dependencies.$('taskTitle').textContent = 'Explore the glowing passage';
      dependencies.$('taskDescription').textContent =
        state.player.y > 300
          ? 'You reached the lower platform. The way back is out of reach.'
          : 'Approach the gray hole. Flowey has a warning before you jump.';
      dependencies.$('storySummary').textContent =
        'Violet light traces the edges of the passage, and soft motes drift through the darkness.';
      return;
    }
    if (dependencies.current().scene === 'darkDescent') {
      dependencies.$('taskTitle').textContent = 'Follow the passage down';
      dependencies.$('taskDescription').textContent =
        'Explore the wider ledge below, or head back up to the junction.';
      dependencies.$('storySummary').textContent =
        'A narrow black passage descends through the purple silence of D.G.W, opening into a broad ledge at its base.';
      return;
    }
    if (dependencies.current().scene === 'darkJunction') {
      dependencies.$('taskTitle').textContent = 'Explore the junction';
      dependencies.$('taskDescription').textContent =
        'The black passage branches downward. Where does it lead?';
      dependencies.$('storySummary').textContent =
        'Golden stars are far behind. Purple motes drift across a wide, silent crossroads in D.G.W.';
      return;
    }
    if (dependencies.current().scene === 'darkArrival') {
      dependencies.$('taskTitle').textContent = 'Explore D.G.W';
      dependencies.$('taskDescription').textContent =
        'Follow the black passage to the right. Your friends are with you.';
      dependencies.$('storySummary').textContent =
        'You emerge into a purple world. A black passage stretches ahead. Kris, Flowey, Ralsey and Susie made it through together.';
      return;
    }
    if (!state.story.joined) return;
    if (state.story.teamJoined || state.story.fountainWorse) {
      dependencies.$('taskTitle').textContent = state.story.teamJoined
        ? 'Four friends, one mystery'
        : 'Rude Buster made it worse';
      dependencies.$('taskDescription').textContent = state.story.teamJoined
        ? 'Face the Dark Fountain and press C or Z to investigate it together.'
        : 'The fountain absorbed the attack. Everyone needs to pull back.';
      dependencies.$('storySummary').textContent =
        'Susie’s Rude Buster fed the fountain instead of stopping it. The darkness is stronger. The four of you must find another way together.';
      return;
    }
    if (dependencies.current().scene === 'fountain' || state.story.foundFountain) {
      dependencies.$('taskTitle').textContent = state.story.foundFountain
        ? 'The fountain is still growing'
        : 'Friends at the fountain';
      dependencies.$('taskDescription').textContent = state.story.foundFountain
        ? 'Ralsey and Susie are holding it steady. Talk to them with Z.'
        : 'Ralsey and Susie need your help. Listen to what happened.';
      dependencies.$('storySummary').textContent =
        'The cracks lead to a Dark Fountain. Ralsey’s spell slows its magic while Susie guards the edge. Two worlds are pulling it open.';
      return;
    }
    dependencies.$('taskTitle').textContent = state.story.explained
      ? 'Follow the glowing cracks'
      : dependencies.current().scene === 'worlds'
        ? 'Two worlds, one clue'
        : 'Continue to the Echo Chamber';
    dependencies.$('taskDescription').textContent = state.story.explained
      ? 'Follow the light through the Echo Chamber’s right-hand doorway.'
      : dependencies.current().scene === 'worlds'
        ? 'Kris and Flowey compare what they remember.'
        : 'Take the right-hand doorway in the Silent Hall.';
    dependencies.$('storySummary').textContent = state.story.explained
      ? 'Could a Dark Fountain have touched the Underground’s barrier? You have a theory, but still need to find the source.'
      : dependencies.current().scene === 'worlds'
        ? 'An old altar hums with two different kinds of magic. The crack above it glows.'
        : 'Flowey is with you. A strange light shines from the next chamber.';
  }
  return { storyUI };
}
