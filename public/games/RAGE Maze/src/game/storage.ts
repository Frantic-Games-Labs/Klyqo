export interface ScoreEntry {
  name: string;
  score: number;
  rooms: number;
  deaths: number;
  time: number;
  won: boolean;
  date: number;
}

const KEY = 'trust-nothing-scores-v1';
const NAME_KEY = 'trust-nothing-name';
const MUTE_KEY = 'trust-nothing-muted';

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const arr = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, 10);
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
  return arr;
}

export function isHighScore(score: number): boolean {
  const arr = loadScores();
  return score > 0 && (arr.length < 10 || score > arr[arr.length - 1].score);
}

export function loadName(): string {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
export function saveName(n: string) {
  try { localStorage.setItem(NAME_KEY, n); } catch { /* ignore */ }
}
export function loadMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function saveMuted(m: boolean) {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
