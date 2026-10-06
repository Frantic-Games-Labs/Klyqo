import { useState } from 'react';
import type { ScoreEntry } from '../game/storage';
import { ScoreTable } from './Overlays';
import { TIPS } from '../game/content';
import menuBg from '../../public/images/menu-bg.jpg';

export function StartScreen({ onStart, scores, isTouch }: { onStart: () => void; scores: ScoreEntry[]; isTouch: boolean }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const best = scores[0];
  return (
    <div className="absolute inset-0 overflow-auto">
      <img src={menuBg} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/90" />
      <div className="relative min-h-full flex flex-col items-center justify-center px-4 py-8 gap-5">
        <div className="text-center anim-pop">
          <div className="font-display text-[3.4rem] sm:text-[6rem] leading-[0.9] text-amber-300 text-outline anim-wobble inline-block">
            TRUST<br />NOTHING
          </div>
          <div className="mt-3 text-white/85 font-semibold text-sm sm:text-lg max-w-md mx-auto text-outline">
            A 3D maze of 100 rooms. Every sign might lie. Every path might kill you. One always doesn't.
          </div>
        </div>

        <button className="btn btn-primary text-3xl px-10 py-3 anim-floaty" onClick={onStart}>
          ENTER THE MAZE
        </button>

        <div className="panel rounded-2xl p-4 sm:p-5 w-full max-w-md text-sm">
          <div className="grid grid-cols-2 gap-3 text-white/85">
            <div>
              <div className="font-display text-xl text-amber-300">HOW TO PLAY</div>
              <ul className="mt-1 space-y-0.5 text-xs sm:text-sm">
                <li>Reach room 100 and escape.</li>
                <li>Read signs. Doubt signs.</li>
                <li>Look for tells: cracks, holes, chains.</li>
                <li>Streaks multiply score. Deaths reset it.</li>
                <li>+1 life every 4 rooms. 5 to start.</li>
              </ul>
            </div>
            <div>
              <div className="font-display text-xl text-amber-300">CONTROLS</div>
              {isTouch ? (
                <ul className="mt-1 space-y-0.5 text-xs sm:text-sm">
                  <li>Left side: virtual joystick</li>
                  <li>Right side: drag to look</li>
                  <li>Tap ❚❚ to pause</li>
                </ul>
              ) : (
                <ul className="mt-1 space-y-0.5 text-xs sm:text-sm">
                  <li><b>WASD</b> move · <b>Mouse</b> look</li>
                  <li><b>← →</b> / <b>Q E</b> turn</li>
                  <li><b>Esc</b> pause · <b>R</b> restart</li>
                  <li><b>M</b> mute</li>
                </ul>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-xl text-amber-300">WALL OF SHAME</div>
              {best && <div className="text-xs text-white/60">Best: {best.score.toLocaleString()} by {best.name}</div>}
            </div>
            <div className="max-h-40 overflow-auto mt-1">
              <ScoreTable scores={scores} />
            </div>
          </div>
        </div>
        <div className="text-xs text-white/50 italic text-center max-w-sm">Tip: {tip}</div>
      </div>
    </div>
  );
}
