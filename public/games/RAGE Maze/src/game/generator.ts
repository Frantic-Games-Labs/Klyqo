import { RNG } from './rng';
import {
  DIRS, key, type Cell, type Exit, type Hub, type MazeData, type Side, type SignDef, type TrapType, type ExitDecor,
} from './types';
import {
  TRAP_LIST, SAFE_CLAIMS, DEADLY_CLAIMS, NO_INFO_SIGNS, SIDE_WORD,
  SURVIVED_OBEYED, SURVIVED_DISOBEYED, SURVIVED_NEUTRAL,
} from './content';

const SIDES: Side[] = ['left', 'forward', 'right'];
const HUB_COUNT = 100;

export function sideDir(facing: number, side: Side): number {
  if (side === 'forward') return facing;
  if (side === 'left') return (facing + 3) % 4;
  return (facing + 1) % 4;
}

interface Candidate {
  hub: Hub;
  cells: Cell[];
  nextEntry: { cx: number; cz: number; facing: number } | null;
}

function roomCells(cx: number, cz: number): Cell[] {
  const out: Cell[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push({ x: cx + dx, z: cz + dz });
  return out;
}

export function generateMaze(seed: number): MazeData {
  for (let attempt = 0; attempt < 30; attempt++) {
    const res = tryGenerate(seed + attempt * 7919);
    if (res) return res;
  }
  // practically unreachable; relaxed budget fallback
  for (let attempt = 0; attempt < 50; attempt++) {
    const res = tryGenerate(12345 + attempt * 104729, true);
    if (res) return res;
  }
  throw new Error('maze generation failed');
}

function tryGenerate(seed: number, relaxed = false): MazeData | null {
  const rng = new RNG(seed);
  const walkable = new Set<string>();
  const owner = new Map<string, number>();
  const hubs: Hub[] = [];
  const hubCells: Cell[][] = [];
  let budget = relaxed ? 200000 : 40000;

  const addCells = (cells: Cell[], idx: number) => {
    for (const c of cells) {
      walkable.add(key(c.x, c.z));
      owner.set(key(c.x, c.z), idx);
    }
  };
  const removeCells = (cells: Cell[]) => {
    for (const c of cells) {
      walkable.delete(key(c.x, c.z));
      owner.delete(key(c.x, c.z));
    }
  };

  const valid = (cells: Cell[], allowed: Set<string>): boolean => {
    const mine = new Set(cells.map((c) => key(c.x, c.z)));
    for (const c of cells) {
      const k = key(c.x, c.z);
      if (walkable.has(k)) return false;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const nk = key(c.x + dx, c.z + dz);
          if (mine.has(nk)) continue;
          if (walkable.has(nk) && !allowed.has(nk)) return false;
        }
      }
    }
    return true;
  };

  const makeCandidate = (i: number, cx: number, cz: number, facing: number): Candidate => {
    const isFinal = i === HUB_COUNT - 1;
    const cells = roomCells(cx, cz);
    const exits: Exit[] = [];
    let nextEntry: Candidate['nextEntry'] = null;

    if (isFinal) {
      const d = DIRS[facing];
      const ecells: Cell[] = [];
      for (let k = 0; k < 2; k++) ecells.push({ x: cx + d.x * (2 + k), z: cz + d.z * (2 + k) });
      exits.push({ side: 'forward', dir: facing, cells: ecells, deadly: false, trap: null, triggerIndex: 1, scare: null, decor: 'none', label: null, deaths: 0 });
      cells.push(...ecells);
      const hub: Hub = {
        index: i, cx, cz, facing, exits, safeSide: 'forward', signs: [{ lines: ['THE EXIT.', 'FOR REAL THIS TIME.'], style: 'neon' }],
        advice: null, truthful: true, gimmick: 'final', dark: false, isFinal: true,
        surviveQuip: { obeyed: '', disobeyed: '', neutral: '' },
      };
      return { hub, cells, nextEntry: null };
    }

    // exits: early hubs mostly 2 exits, later mostly 3
    const threeChance = i < 3 ? 0.15 : i < 15 ? 0.45 : 0.7;
    let sides: Side[] = rng.chance(threeChance) ? [...SIDES] : rng.shuffle([...SIDES]).slice(0, 2);
    sides = SIDES.filter((s) => sides.includes(s));
    const safeSide = rng.pick(sides);

    for (const side of sides) {
      const dir = sideDir(facing, side);
      const d = DIRS[dir];
      const deadly = side !== safeSide;
      const a = rng.int(3, 5);
      const turnRight = rng.chance(0.5);
      const pdir = turnRight ? (dir + 1) % 4 : (dir + 3) % 4;
      const p = DIRS[pdir];
      const b = deadly ? rng.int(2, 3) : rng.int(2, 4);
      const ecells: Cell[] = [];
      for (let k = 0; k < a; k++) ecells.push({ x: cx + d.x * (2 + k), z: cz + d.z * (2 + k) });
      const last = ecells[ecells.length - 1];
      for (let k = 1; k <= b; k++) ecells.push({ x: last.x + p.x * k, z: last.z + p.z * k });
      const triggerIndex = rng.chance(0.75) ? 2 : rng.int(1, Math.min(3, a - 1));
      exits.push({
        side, dir, cells: ecells, deadly, trap: null, triggerIndex, scare: null, decor: 'none', label: null, deaths: 0,
      });
      cells.push(...ecells);
      if (!deadly) {
        const end = ecells[ecells.length - 1];
        nextEntry = { cx: end.x + p.x * 2, cz: end.z + p.z * 2, facing: pdir };
      }
    }

    const hub: Hub = {
      index: i, cx, cz, facing, exits, safeSide, signs: [], advice: null, truthful: true, gimmick: 'sign', dark: false, isFinal: false,
      surviveQuip: { obeyed: rng.pick(SURVIVED_OBEYED), disobeyed: rng.pick(SURVIVED_DISOBEYED), neutral: rng.pick(SURVIVED_NEUTRAL) },
    };
    return { hub, cells, nextEntry };
  };

  const place = (i: number, cx: number, cz: number, facing: number, allowed: Set<string>): boolean => {
    if (i >= HUB_COUNT) return true;
    const tries = i === HUB_COUNT - 1 ? 1 : 10;
    for (let t = 0; t < tries; t++) {
      if (--budget < 0) return false;
      const cand = makeCandidate(i, cx, cz, facing);
      if (!valid(cand.cells, allowed)) continue;
      addCells(cand.cells, i);
      hubs[i] = cand.hub;
      hubCells[i] = cand.cells;
      if (cand.nextEntry) {
        const safeExit = cand.hub.exits.find((e) => !e.deadly)!;
        const lastCell = safeExit.cells[safeExit.cells.length - 1];
        const nextAllowed = new Set([key(lastCell.x, lastCell.z)]);
        if (place(i + 1, cand.nextEntry.cx, cand.nextEntry.cz, cand.nextEntry.facing, nextAllowed)) return true;
        removeCells(cand.cells);
        hubs.length = i;
        hubCells.length = i;
        continue;
      }
      return true;
    }
    return false;
  };

  if (!place(0, 0, 0, 0, new Set())) return null;

  // wall ownership (8-neighborhood boundary cells)
  const wallOwner = new Map<string, number>();
  for (let i = 0; i < hubs.length; i++) {
    for (const c of hubCells[i]) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const k = key(c.x + dx, c.z + dz);
        if (!walkable.has(k) && !wallOwner.has(k)) wallOwner.set(k, i);
      }
    }
  }

  decorate(hubs, rng);
  return { seed, hubs, walkable, wallOwner };
}

// ---------- gimmicks / signs / traps ----------

function fmt(lines: string[], side: Side): string[] {
  return lines.map((l) => l.replace(/\{D\}/g, SIDE_WORD[side])).filter((l) => l.length > 0);
}

const STYLE_TRUTH: Record<SignDef['style'], number> = { wood: 0.62, metal: 0.5, paper: 0.45, neon: 0.36 };

function pickTrap(rng: RNG, avoid: Set<TrapType>): TrapType {
  const pool = TRAP_LIST.filter((t) => !avoid.has(t.type));
  const total = pool.reduce((s, t) => s + t.weight, 0);
  let r = rng.next() * total;
  for (const t of pool) {
    r -= t.weight;
    if (r <= 0) return t.type;
  }
  return pool[pool.length - 1].type;
}

function decorate(hubs: Hub[], rng: RNG) {
  let prevTraps = new Set<TrapType>();
  for (const hub of hubs) {
    if (hub.isFinal) continue;
    const i = hub.index;
    const deadlyExits = hub.exits.filter((e) => e.deadly);
    const deadlySides = deadlyExits.map((e) => e.side);
    const sides = hub.exits.map((e) => e.side);
    const safe = hub.safeSide;

    // traps
    const used = new Set<TrapType>(prevTraps);
    for (const e of deadlyExits) {
      e.trap = i === 0 ? 'boulder' : pickTrap(rng, used);
      used.add(e.trap);
    }
    prevTraps = new Set(deadlyExits.map((e) => e.trap!));

    // scare on safe path
    const safeExit = hub.exits.find((e) => !e.deadly)!;
    if (i > 1 && rng.chance(0.3)) {
      safeExit.scare = rng.pick(['boulderBehind', 'spikesBehind', 'rumble', 'lightsOut'] as const);
    }

    const randomDeadly = () => rng.pick(deadlySides);
    const truthBias = i < 8 ? 0.12 : i < 30 ? 0.04 : 0;
    const setAdvice = (side: Side, says: 'safe' | 'deadly', truthful: boolean) => {
      hub.advice = { side, says };
      hub.truthful = truthful;
    };
    // pick the subject side such that truthfulness holds
    const subjectFor = (says: 'safe' | 'deadly', truthful: boolean): Side =>
      says === 'safe' ? (truthful ? safe : randomDeadly()) : truthful ? randomDeadly() : safe;

    const setDecor = (side: Side, decor: ExitDecor) => {
      const ex = hub.exits.find((e) => e.side === side);
      if (ex) ex.decor = decor;
    };

    type G = { name: string; w: number; need3?: boolean };
    const gs: G[] = [
      { name: 'sign', w: 6 }, { name: 'two_signs', w: 3 }, { name: 'light', w: 2 }, { name: 'exit', w: 2 },
      { name: 'coins', w: 2 }, { name: 'cake', w: 1.5 }, { name: 'tape', w: 1.5 }, { name: 'dave', w: 1.5 },
      { name: 'stats', w: 1.5 }, { name: 'letters', w: 1.5, need3: true }, { name: 'arrow', w: 2 },
      { name: 'silence', w: 1.5 }, { name: 'dark', w: 1 }, { name: 'honest', w: 1 }, { name: 'reverse', w: 1 },
      { name: 'math', w: 1, need3: true },
    ];
    let gimmick = 'sign';
    if (i === 0) gimmick = 'intro';
    else if (i === 1) gimmick = 'sign';
    else {
      const pool = gs.filter((g) => !g.need3 || sides.length === 3);
      const total = pool.reduce((s, g) => s + g.w, 0);
      let r = rng.next() * total;
      for (const g of pool) { r -= g.w; if (r <= 0) { gimmick = g.name; break; } }
    }
    hub.gimmick = gimmick;

    const style = (): SignDef['style'] => rng.pick(['wood', 'wood', 'metal', 'paper', 'neon'] as const);

    switch (gimmick) {
      case 'intro': {
        const s = randomDeadly();
        setAdvice(s, 'deadly', true);
        hub.signs.push({ lines: ['WELCOME TO THE MAZE.', `DON'T GO ${SIDE_WORD[s]}.`], style: 'wood' });
        break;
      }
      case 'sign': {
        const st = style();
        const truthful = rng.chance(STYLE_TRUTH[st] + truthBias);
        const says = rng.chance(0.5) ? 'safe' : 'deadly';
        const s = subjectFor(says, truthful);
        setAdvice(s, says, truthful);
        hub.signs.push({ lines: fmt(rng.pick(says === 'safe' ? SAFE_CLAIMS : DEADLY_CLAIMS), s), style: st });
        break;
      }
      case 'two_signs': {
        const bothLie = sides.length === 3 && rng.chance(0.2);
        let s1: Side, s2: Side;
        if (bothLie) { [s1, s2] = rng.shuffle([...deadlySides]); }
        else { s1 = safe; s2 = randomDeadly(); if (rng.chance(0.5)) [s1, s2] = [s2, s1]; }
        // advice tracked on the first sign
        setAdvice(s1, 'safe', s1 === safe);
        hub.signs.push({ lines: fmt(rng.pick(SAFE_CLAIMS), s1), style: style() });
        hub.signs.push({ lines: fmt(rng.pick(SAFE_CLAIMS), s2), author: 'THE OTHER SIGN', style: style() });
        if (bothLie) hub.surviveQuip.neutral = 'Both signs lied. Welcome to the maze.';
        break;
      }
      case 'light': {
        const truthful = rng.chance(0.5 + truthBias);
        const lightIsSafeClaim = rng.chance(0.7);
        const s = subjectFor(lightIsSafeClaim ? 'safe' : 'deadly', truthful);
        setAdvice(s, lightIsSafeClaim ? 'safe' : 'deadly', truthful);
        setDecor(s, 'torches');
        hub.signs.push({ lines: lightIsSafeClaim ? ['FOLLOW THE LIGHT.', ''] : ['THE LIGHT LIES.', 'STAY IN THE DARK.'], style: style() });
        hub.dark = rng.chance(0.4);
        break;
      }
      case 'exit': {
        const truthful = rng.chance(0.4 + truthBias);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        setDecor(s, 'exitSign');
        if (rng.chance(0.5)) hub.signs.push({ lines: ['LOOK! AN EXIT SIGN!', 'THOSE ARE NEVER WRONG.'], style: 'paper' });
        break;
      }
      case 'coins': {
        const truthful = rng.chance(0.45 + truthBias);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        setDecor(s, 'coins');
        if (rng.chance(0.4)) hub.signs.push({ lines: ['FREE COINS', `${SIDE_WORD[s]}!`], style: 'neon' });
        break;
      }
      case 'cake': {
        const truthful = rng.chance(0.35 + truthBias);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        setDecor(s, 'cake');
        hub.signs.push({ lines: ['FREE CAKE', `${SIDE_WORD[s]} →`], style: 'neon' });
        if (truthful) hub.surviveQuip.obeyed = 'The cake was real. Unbelievable, right?';
        break;
      }
      case 'tape': {
        const truthful = rng.chance(0.4 + truthBias);
        const s = subjectFor('deadly', truthful);
        setAdvice(s, 'deadly', truthful);
        setDecor(s, 'tape');
        if (!truthful) hub.surviveQuip.disobeyed = 'Closed for maintenance. Sure. You knew better.';
        break;
      }
      case 'dave': {
        const truthful = rng.chance(0.4 + truthBias);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        setDecor(s, 'skeleton');
        hub.signs.push({ lines: [`I WENT ${SIDE_WORD[s]}.`, 'I\'M TOTALLY FINE.'], author: '— DAVE', style: 'paper' });
        if (truthful) hub.surviveQuip.obeyed = 'Dave was right. Dave still died though. Different thing.';
        break;
      }
      case 'stats': {
        const truthful = rng.chance(0.45 + truthBias);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        const p = rng.int(61, 97);
        hub.signs.push({ lines: [`${p}% OF PLAYERS`, `WENT ${SIDE_WORD[s]}.`, rng.chance(0.6) ? `(${p}% OF PLAYERS ARE DEAD)` : ''], style: 'metal' });
        break;
      }
      case 'letters': {
        const labels = ['A', 'B', 'C'];
        hub.exits.forEach((e, k) => (e.label = labels[k]));
        const truthful = rng.chance(0.55 + truthBias);
        const s = subjectFor('deadly', truthful);
        setAdvice(s, 'deadly', truthful);
        const L = hub.exits.find((e) => e.side === s)!.label;
        hub.signs.push({ lines: ['PICK A DOOR.', `NOT ${L}.`, rng.chance(0.5) ? 'DEFINITELY NOT ' + L + '.' : ''], style: 'metal' });
        break;
      }
      case 'arrow': {
        const truthful = rng.chance(0.5 + truthBias);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        setDecor(s, 'arrow');
        break;
      }
      case 'silence': {
        hub.signs.push({ lines: rng.pick(NO_INFO_SIGNS), style: style() });
        break;
      }
      case 'dark': {
        hub.dark = true;
        if (rng.chance(0.6)) hub.signs.push({ lines: ['TRUST YOUR INSTINCTS.', '(THEY\'RE WRONG)'], style: 'paper' });
        break;
      }
      case 'honest': {
        const truthful = rng.chance(0.75);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        hub.signs.push({ lines: [`HONESTLY? ${SIDE_WORD[s]}.`, 'I\'M TIRED OF LYING.'], style: 'wood' });
        if (!truthful) hub.surviveQuip.disobeyed = 'It said "honestly". You knew better.';
        break;
      }
      case 'reverse': {
        const truthful = rng.chance(0.55);
        // "This sign is lying. Go D." => advice: D is deadly
        const s = subjectFor('deadly', truthful);
        setAdvice(s, 'deadly', truthful);
        hub.signs.push({ lines: ['THIS SIGN IS LYING.', `GO ${SIDE_WORD[s]}.`], style: 'metal' });
        break;
      }
      case 'math': {
        const truthful = rng.chance(0.6);
        const s = subjectFor('safe', truthful);
        setAdvice(s, 'safe', truthful);
        const target = s === 'left' ? 1 : s === 'forward' ? 2 : 0;
        // find a,b with (a+b)%3 == target
        let a = rng.int(2, 9), b = rng.int(2, 9);
        while ((a + b) % 3 !== target) b++;
        hub.signs.push({ lines: [`SAFE = (${a} + ${b}) MOD 3`, '1 = LEFT · 2 = STRAIGHT · 0 = RIGHT'], style: 'metal' });
        break;
      }
    }
  }
}
