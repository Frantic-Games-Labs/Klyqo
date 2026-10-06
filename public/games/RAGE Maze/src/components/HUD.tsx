import { useEffect, useRef, useState } from 'react';
import type { HudState } from '../game/Game';
import { fmtTime } from '../game/storage';

interface Props {
  hud: HudState;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
  scorePop: { id: number; delta: number } | null;
}

export function HUD({ hud, onPause, muted, onToggleMute, scorePop }: Props) {
  const [heartAnim, setHeartAnim] = useState(0);
  const prevLives = useRef(hud.lives);
  useEffect(() => {
    if (hud.lives !== prevLives.current) { prevLives.current = hud.lives; setHeartAnim((n) => n + 1); }
  }, [hud.lives]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      {/* top-left: lives + room */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <div key={heartAnim} className="anim-heart flex gap-0.5 text-2xl leading-none drop-shadow-[0_2px_0_#0b0a14]">
          {Array.from({ length: Math.max(0, hud.lives) }).map((_, i) => (
            <span key={i} style={{ color: '#ff3b5c' }}>♥</span>
          ))}
          {hud.lives <= 1 && <span className="text-sm self-center ml-2 text-red-300 font-bold animate-pulse">LAST LIFE</span>}
        </div>
        <div className="font-display text-2xl text-outline text-amber-200">
          ROOM <span className="text-white">{hud.room}</span><span className="text-white/50 text-lg"> / 100</span>
        </div>
        <div className="h-1.5 w-40 bg-black/50 rounded-full overflow-hidden border border-white/10">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${(hud.room - 1)}%` }} />
        </div>
      </div>

      {/* top-right: score */}
      <div className="absolute top-3 right-3 text-right">
        <div className="font-display text-4xl text-outline text-white relative">
          {hud.score.toLocaleString()}
          {scorePop && (
            <div key={scorePop.id} className="absolute right-0 -bottom-6 text-xl anim-toast text-amber-300 text-outline">
              +{scorePop.delta}
            </div>
          )}
        </div>
        <div className="text-xs font-semibold text-white/60 mt-1">
          {hud.mult > 1 && <span className="text-amber-300 mr-2">×{hud.mult.toFixed(2)} streak {hud.streak}</span>}
          <span>{fmtTime(hud.time)}</span>
          <span className="ml-2">☠ {hud.deaths}</span>
        </div>
      </div>

      {/* crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/70 shadow-[0_0_6px_rgba(0,0,0,.8)]" />

      {/* bottom-right buttons */}
      <div className="absolute top-16 right-3 flex gap-2 pointer-events-auto">
        <button onClick={onToggleMute} className="w-9 h-9 rounded-lg bg-black/50 border border-white/20 text-sm hover:bg-black/70" title="Mute (M)">
          {muted ? '🔇' : '🔊'}
        </button>
        <button onClick={onPause} className="w-9 h-9 rounded-lg bg-black/50 border border-white/20 text-sm hover:bg-black/70" title="Pause (Esc)">
          ❚❚
        </button>
      </div>

      <div className="vignette absolute inset-0" />
    </div>
  );
}
