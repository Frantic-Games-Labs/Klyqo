export type Side = 'left' | 'forward' | 'right';

export type TrapType =
  | 'boulder'
  | 'piano'
  | 'anvil'
  | 'safe'
  | 'pit'
  | 'spikes'
  | 'crusher'
  | 'arrows'
  | 'lava'
  | 'bomb'
  | 'laser'
  | 'mimic'
  | 'ceiling'
  | 'gas'
  | 'gravity'
  | 'zap';

export type ScareType = 'boulderBehind' | 'spikesBehind' | 'rumble' | 'lightsOut';

export type ExitDecor =
  | 'none'
  | 'torches'
  | 'exitSign'
  | 'coins'
  | 'cake'
  | 'tape'
  | 'arrow'
  | 'skeleton';

export interface Cell {
  x: number;
  z: number;
}

export interface Exit {
  side: Side;
  dir: number; // 0=N(-z) 1=E(+x) 2=S(+z) 3=W(-x)
  cells: Cell[];
  deadly: boolean;
  trap: TrapType | null;
  triggerIndex: number;
  scare: ScareType | null;
  decor: ExitDecor;
  label: string | null;
  deaths: number;
}

export interface Advice {
  side: Side;
  says: 'safe' | 'deadly';
}

export interface SignDef {
  lines: string[];
  author?: string;
  style: 'wood' | 'metal' | 'neon' | 'paper';
}

export interface Hub {
  index: number;
  cx: number;
  cz: number;
  facing: number;
  exits: Exit[];
  safeSide: Side;
  signs: SignDef[];
  advice: Advice | null;
  truthful: boolean;
  gimmick: string;
  dark: boolean;
  isFinal: boolean;
  surviveQuip: { obeyed: string; disobeyed: string; neutral: string };
}

export interface MazeData {
  seed: number;
  hubs: Hub[];
  walkable: Set<string>;
  wallOwner: Map<string, number>;
}

export const DIRS: Cell[] = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];

export const key = (x: number, z: number) => `${x},${z}`;

export const CELL = 4;
export const WALL_H = 9;
