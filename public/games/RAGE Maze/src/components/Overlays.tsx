import { useEffect, useState } from 'react';
import type { RunResult } from '../game/Game';
import { fmtTime, type ScoreEntry } from '../game/storage';
import { TIPS } from '../game/content';

export interface Toast { id: number; text: string; kind: 'info' | 'good' | 'bad' | 'gold' }

export function Toasts({ toasts }: { toasts: Toast[] }) {
  const color = { info: 'text-white', good: 'text-emerald-300', bad: 'text-rose-300', gold: 'text-amber-300' };
  return (
    <div className="absolute left-1/2 bottom-[18%] -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none w-[92vw] max-w-xl">
      {toasts.map((t) => (
        <div key={t.id} className={`anim-toast font-display text-2xl sm:text-3xl text-center text-outline ${color[t.kind]}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function DeathCard({ title, sub, lives, onContinue }: { title: string; sub: string; lives: number; onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setReady(true), 600);
    const t2 = setTimeout(onContinue, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onContinue]);
  return (
    <div className="absolute inset-0 flex items-center justify-center death-vignette" onPointerDown={() => ready && onContinue()}>
      <div className="anim-slam text-center px-6 max-w-2xl">
        <div className="font-display text-5xl sm:text-7xl text-rose-400 text-outline leading-none">{title}</div>
        <div className="mt-4 text-lg sm:text-2xl text-white/90 font-semibold text-outline">{sub}</div>
        <div className="mt-6 text-sm text-white/60">
          {lives > 0 ? <>{lives} {lives === 1 ? 'life' : 'lives'} left · respawning at the last room</> : <>No lives left.</>}
        </div>
      </div>
    </div>
  );
}

export function PauseMenu({ onResume, onRestart, onQuit, muted, onToggleMute }: { onResume: () => void; onRestart: () => void; onQuit: () => void; muted: boolean; onToggleMute: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="panel rounded-2xl p-8 text-center anim-pop w-[90vw] max-w-sm">
        <div className="font-display text-5xl text-amber-300 text-outline">PAUSED</div>
        <div className="text-white/60 text-sm mt-1">The traps are waiting patiently.</div>
        <div className="flex flex-col gap-3 mt-6">
          <button className="btn btn-primary" onClick={onResume}>RESUME</button>
          <button className="btn btn-ghost" onClick={onRestart}>NEW MAZE</button>
          <button className="btn btn-ghost" onClick={onToggleMute}>{muted ? 'UNMUTE' : 'MUTE'}</button>
          <button className="btn btn-danger" onClick={onQuit}>QUIT TO MENU</button>
        </div>
        <div className="text-xs text-white/40 mt-4">Esc / P to resume</div>
      </div>
    </div>
  );
}

export function ScoreTable({ scores, highlight }: { scores: ScoreEntry[]; highlight?: number }) {
  if (!scores.length) return <div className="text-white/50 text-sm italic py-3">No survivors yet. Be the first to fail gloriously.</div>;
  return (
    <table className="w-full text-sm">
      <thead className="text-white/50 text-xs uppercase">
        <tr><th className="text-left py-1">#</th><th className="text-left">Name</th><th className="text-right">Score</th><th className="text-right">Rooms</th><th className="text-right">☠</th><th className="text-right">Time</th></tr>
      </thead>
      <tbody>
        {scores.map((s, i) => (
          <tr key={s.date + i} className={`${highlight === s.date ? 'text-amber-300 font-bold' : 'text-white/85'} border-t border-white/5`}>
            <td className="py-1">{i + 1}</td>
            <td className="truncate max-w-[8rem]">{s.won ? '👑 ' : ''}{s.name}</td>
            <td className="text-right font-semibold">{s.score.toLocaleString()}</td>
            <td className="text-right">{s.rooms}</td>
            <td className="text-right">{s.deaths}</td>
            <td className="text-right">{fmtTime(s.time)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EndScreen({ result, scores, name, setName, saved, onSave, onRestart, onMenu, highlight }: {
  result: RunResult; scores: ScoreEntry[]; name: string; setName: (n: string) => void; saved: boolean; onSave: () => void; onRestart: () => void; onMenu: () => void; highlight?: number;
}) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 overflow-auto">
      <div className="panel rounded-2xl p-6 sm:p-8 text-center anim-pop w-[94vw] max-w-lg my-4">
        {result.won ? (
          <>
            <div className="font-display text-5xl sm:text-6xl text-emerald-300 text-outline">YOU ESCAPED</div>
            <div className="text-white/80 mt-1">Trust no one. Not even the exit. But this one was real.</div>
          </>
        ) : (
          <>
            <div className="font-display text-5xl sm:text-6xl text-rose-400 text-outline">OUT OF LIVES</div>
            <div className="text-white/80 mt-1">The maze wins. It usually does.</div>
          </>
        )}
        <div className="grid grid-cols-4 gap-2 mt-5 text-center">
          <Stat label="Score" value={result.score.toLocaleString()} big />
          <Stat label="Rooms" value={`${result.rooms}/99`} />
          <Stat label="Deaths" value={String(result.deaths)} />
          <Stat label="Time" value={fmtTime(result.time)} />
        </div>
        {!saved ? (
          <div className="flex gap-2 mt-4 justify-center">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 12))}
              placeholder="YOUR NAME"
              className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 font-display text-xl tracking-wider w-44 text-center outline-none focus:border-amber-300"
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') onSave(); }}
            />
            <button className="btn btn-primary text-base!" onClick={onSave}>SAVE</button>
          </div>
        ) : (
          <div className="mt-3 text-emerald-300 text-sm font-semibold">Saved to the wall of shame.</div>
        )}
        <div className="mt-4 text-left max-h-44 overflow-auto rounded-lg bg-black/30 p-2">
          <ScoreTable scores={scores} highlight={highlight} />
        </div>
        <div className="text-xs text-white/50 mt-3 italic">Tip: {tip}</div>
        <div className="flex gap-3 justify-center mt-4">
          <button className="btn btn-primary" onClick={onRestart}>PLAY AGAIN (R)</button>
          <button className="btn btn-ghost" onClick={onMenu}>MENU</button>
        </div>
        <div className="text-[10px] text-white/30 mt-2">Maze #{result.seed.toString(16).toUpperCase()}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="bg-black/30 rounded-lg py-2">
      <div className={`font-display ${big ? 'text-3xl text-amber-300' : 'text-2xl text-white'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}
