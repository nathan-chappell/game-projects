import { postShowDoorLocked } from '../rooms/post-show/post-show.ts';
import type { Point, Room } from '../world/types.ts';
import { followSpeed, H, maxHP, partyNames, sprintMultiplier, T, tiles, W } from './config.ts';
import type { Follower, GameState } from './types.ts';
interface Dependencies {
  readonly fountainFriends: (r?: Room) => {
    name: string;
    x: number;
    y: number;
  }[];
  readonly state: GameState;
  readonly current: () => Room;
  readonly storyUI: () => void;
  readonly toast: (t: string) => void;
  readonly announce: (t: string) => void;
  readonly friendsWaiting: () => boolean;
  readonly ensureGlitchWaiting: () => void;
  readonly memberInParty: (name: string) => boolean;
}
/** Movement and follower trails use screen pixels; room collision objects use tile coordinates. */
export function createMovement(dependencies: Dependencies) {
  const state = dependencies.state;
  function cellOpen(r: Room, x: number, y: number, avoidFlowey = true) {
    if (state.mode === 'play' && postShowDoorLocked(r, x, y, state.project, state.story.tennaFinaleComplete))
      return false;
    if (roomSpikes(r).some((point) => point.x === x && point.y === y)) return false;
    if (roomTrees(r).some((tree) => tree.x === x && tree.y === y)) return false;
    return (
      !(r.npcs || []).some((n) => n.x === x && n.y === y) &&
      !dependencies.fountainFriends(r).some((n) => Math.floor(n.x / T) === x && Math.floor(n.y / T) === y) &&
      x >= 0 &&
      y >= 0 &&
      x < W &&
      y < H &&
      !tiles[r.map[y][x]].solid &&
      r.map[y][x] !== 6 &&
      (!avoidFlowey ||
        r !== state.project.rooms[1] ||
        state.story.joined ||
        x !== r.flowey.x ||
        y !== r.flowey.y)
    );
  }
  function findStart(r: Room, preferred = r.spawn) {
    const choices = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cellOpen(r, x, y)) choices.push({ x, y });
    choices.sort(
      (a, b) =>
        Math.abs(a.x - preferred.x) +
        Math.abs(a.y - preferred.y) -
        Math.abs(b.x - preferred.x) -
        Math.abs(b.y - preferred.y),
    );
    return choices[0] || null;
  }
  function positionPlayer(r: Room, preferred?: Point) {
    const start = findStart(r, preferred);
    if (!start) return false;
    state.player.x = start.x * T + T / 2;
    state.player.y = start.y * T + T / 2;
    state.player.moving = false;
    state.keys.clear();
    return true;
  }
  function floweyPosition() {
    if (state.mode === 'build')
      return state.roomIndex === 1
        ? { x: dependencies.current().flowey.x * T + 20, y: dependencies.current().flowey.y * T + 24 }
        : null;
    if (state.story.joined) return state.follower;
    if (state.roomIndex === 1 && state.story.reveal > 0)
      return { x: dependencies.current().flowey.x * T + 20, y: dependencies.current().flowey.y * T + 24 };
    return null;
  }
  function nearFlowey() {
    const f = floweyPosition();
    return f && Math.hypot(state.player.x - f.x, state.player.y - f.y) < 82;
  }
  function routeToPlayer(start: Point, target: Point = state.player) {
    const r = dependencies.current(),
      sx = Math.floor(start.x / T),
      sy = Math.floor(start.y / T),
      tx = Math.floor(target.x / T),
      ty = Math.floor(target.y / T);
    const key = (x: number, y: number) => y * W + x,
      queue = [{ x: sx, y: sy }],
      parents = new Map<number, Point | null>([[key(sx, sy), null]]);
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head];
      if (cell.x === tx && cell.y === ty) break;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = cell.x + dx,
          y = cell.y + dy,
          k = key(x, y);
        if (!parents.has(k) && cellOpen(r, x, y, false)) {
          parents.set(k, cell);
          queue.push({ x, y });
        }
      }
    }
    if (!parents.has(key(tx, ty))) return [];
    const route = [];
    let cell: Point | null | undefined = { x: tx, y: ty };
    while (cell) {
      route.unshift({ x: cell.x * T + 20, y: cell.y * T + 20 });
      cell = parents.get(key(cell.x, cell.y));
    }
    route.push({ x: target.x, y: target.y });
    return route;
  }
  function recruitFlowey() {
    const f = floweyPosition() || {
      x: dependencies.current().flowey.x * T + 20,
      y: dependencies.current().flowey.y * T + 24,
    };
    state.follower = { x: f.x, y: f.y, trail: routeToPlayer(f) };
    state.story.met = true;
    state.story.joined = true;
    state.story.emerging = -1;
    state.story.reveal = 1;
    dependencies.storyUI();
    dependencies.toast('Flowey joined you. He will follow your footsteps.');
    dependencies.announce('Flowey joined your party.');
  }
  function resetFollower() {
    const r = dependencies.current(),
      cx = Math.floor(state.player.x / T),
      cy = Math.floor(state.player.y / T);
    const offsets =
      dependencies.current().scene === 'glitchBackstage' && cx === 3 && cy === 5
        ? [
            [0, -1],
            [-1, 0],
            [1, 0],
            [0, 1],
          ]
        : [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
          ];
    const tile = offsets
      .map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }))
      .find((p) => cellOpen(r, p.x, p.y, false));
    const point = tile
      ? { x: tile.x * T + 20, y: tile.y * T + 20 }
      : { x: state.player.x, y: state.player.y };
    state.follower = { x: point.x, y: point.y, trail: routeToPlayer(point) };
    if (state.story.teamJoined && !dependencies.friendsWaiting()) resetCompanions();
    else {
      state.companions = [];
      dependencies.ensureGlitchWaiting();
    }
  }
  function resetCompanions() {
    const used = new Set([
      Math.floor(state.player.x / T) + ',' + Math.floor(state.player.y / T),
      Math.floor(state.follower.x / T) + ',' + Math.floor(state.follower.y / T),
    ]);
    let leader = state.follower;
    state.companions = ['Ralsey', 'Susie'].map((name) => {
      const cx = Math.floor(leader.x / T),
        cy = Math.floor(leader.y / T);
      const tile = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ]
        .map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }))
        .find((p) => cellOpen(dependencies.current(), p.x, p.y, false) && !used.has(p.x + ',' + p.y));
      const start = tile ? { x: tile.x * T + 20, y: tile.y * T + 20 } : { x: leader.x, y: leader.y };
      if (tile) used.add(tile.x + ',' + tile.y);
      const member = { name, ...start, trail: routeToPlayer(start, leader) };
      leader = member;
      return member;
    });
  }
  function followTrail(member: Follower, target: Point, dt: number, gap: number) {
    const last = member.trail.length ? member.trail[member.trail.length - 1] : member;
    if (Math.hypot(last.x - target.x, last.y - target.y) > 1) member.trail.push({ x: target.x, y: target.y });
    let distance = 0,
      previous: Point = member;
    for (const point of member.trail) {
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
    }
    const pace = state.keys.has('sprint') ? sprintMultiplier : 1;
    let budget = Math.min(followSpeed * pace * dt, Math.max(0, distance - gap));
    while (member.trail.length && budget > 0) {
      const point = member.trail[0],
        dx = point.x - member.x,
        dy = point.y - member.y,
        len = Math.hypot(dx, dy);
      if (len < 0.01) {
        member.trail.shift();
        continue;
      }
      const move = Math.min(len, budget);
      member.x += (dx / len) * move;
      member.y += (dy / len) * move;
      budget -= move;
      if (move >= len - 0.001) member.trail.shift();
    }
  }
  function updateFollower(dt: number) {
    if (!state.story.joined) return;
    followTrail(state.follower, state.player, dt, 48);
    if (dependencies.friendsWaiting()) return;
    let leader = state.follower;
    for (const member of state.companions) {
      followTrail(member, leader, dt, 48);
      leader = member;
    }
  }
  function collides(x: number, y: number) {
    const r = dependencies.current(),
      left = x - 10,
      right = x + 10,
      top = y - 7,
      bottom = y + 6;
    if (left < 0 || top < 0 || right >= 640 || bottom >= 480) return true;
    for (let ty = Math.floor(top / T); ty <= Math.floor(bottom / T); ty++)
      for (let tx = Math.floor(left / T); tx <= Math.floor(right / T); tx++)
        if (
          tiles[r.map[ty][tx]].solid ||
          (state.mode === 'play' &&
            postShowDoorLocked(r, tx, ty, state.project, state.story.tennaFinaleComplete))
        )
          return true;
    if (
      roomTrees(r).some((tree) => {
        const cx = tree.x * T + 20,
          cy = tree.y * T + 20;
        return left < cx + 12 && right > cx - 12 && top < cy + 5 && bottom > cy - 12;
      })
    )
      return true;
    if (
      (r.npcs || []).some(
        (n) => left < n.x * T + 33 && right > n.x * T + 7 && top < n.y * T + 30 && bottom > n.y * T + 15,
      )
    )
      return true;
    if (
      dependencies
        .fountainFriends(r)
        .some((n) => left < n.x + 13 && right > n.x - 13 && top < n.y + 6 && bottom > n.y - 9)
    )
      return true;
    if (state.story.joined || state.roomIndex !== 1 || state.story.reveal <= 0) return false;
    const dx = r.flowey.x * T + 20,
      dy = r.flowey.y * T + 24;
    return left < dx + 14 && right > dx - 14 && top < dy + 5 && bottom > dy - 8;
  }
  function roomSpikes(r = dependencies.current()) {
    return r.spikes === undefined ? (r.scene === 'darkDescent' ? [{ x: 9, y: 7 }] : []) : r.spikes;
  }
  function updateSpikeContact(x: number, y: number) {
    const onSpike = roomSpikes().some((point) => point.x === x && point.y === y);
    const contact = onSpike ? state.roomIndex + ':' + x + ',' + y : null;
    if (contact && contact !== state.lastSpikeContact) {
      const eligible = partyNames.filter(
        (name) => dependencies.memberInParty(name) && state.partyHP[name] > 0,
      );
      if (eligible.length) {
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        const damage = Math.min(10, state.partyHP[target]);
        state.partyHP[target] -= damage;
        state.cameraShakeTime = 0.22;
        dependencies.toast(
          'Spike! ' + target + ' lost ' + damage + ' HP. (' + state.partyHP[target] + ' / ' + maxHP + ')',
        );
        dependencies.announce(target + ' was hurt by a spike and lost ' + damage + ' HP.');
      }
    }
    state.lastSpikeContact = contact;
  }
  function roomTrees(r = dependencies.current()) {
    return r.trees === undefined ? (r.scene === 'darkDescent' ? [{ x: 5, y: 9 }] : []) : r.trees;
  }
  return {
    routeToPlayer,
    recruitFlowey,
    resetFollower,
    updateFollower,
    floweyPosition,
    nearFlowey,
    cellOpen,
    findStart,
    positionPlayer,
    collides,
    roomSpikes,
    updateSpikeContact,
    roomTrees,
  };
}
