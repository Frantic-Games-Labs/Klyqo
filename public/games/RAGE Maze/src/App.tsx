import { useCallback, useEffect, useRef, useState } from 'react';
import { Game, type GameEvent, type GameState, type HudState, type RunResult } from './game/Game';
import { audio } from './game/audio';
import { bindGlobalInput, isTouchDevice } from './game/input';
import { loadScores, saveScore, loadName, saveName, loadMuted, saveMuted, type ScoreEntry } from './game/storage';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { TouchControls } from './components/TouchControls';
import { Toasts, DeathCard, PauseMenu, EndScreen, type Toast } from './components/Overlays';

const initialHud: HudState = { lives: 5, room: 1, score: 0, streak: 0, mult: 1, deaths: 0, time: 0, seed: 0, coins: 0 };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');
  const [state, setState] = useState<GameState>('idle');
  const [hud, setHud] = useState<HudState>(initialHud);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [death, setDeath] = useState<{ title: string; sub: string; lives: number } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [flash, setFlash] = useState<{ id: number; color: string } | null>(null);
  const [scorePop, setScorePop] = useState<{ id: number; delta: number } | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [name, setName] = useState(() => loadName());
  const [saved, setSaved] = useState(false);
  const [savedDate, setSavedDate] = useState<number | undefined>();
  const [muted, setMuted] = useState(() => loadMuted());
  const [locked, setLocked] = useState(false);
  const isTouch = isTouchDevice();

  useEffect(() => {
    // warm up display fonts so in-world sign textures render with the right typeface
    try { document.fonts?.load('40px Bangers'); document.fonts?.load('800 40px Rubik'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onLock = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onLock);
    return () => document.removeEventListener('pointerlockchange', onLock);
  }, []);
  const idRef = useRef(0);
  const stateRef = useRef<GameState>('idle');
  const screenRef = useRef<'menu' | 'game'>('menu');
  stateRef.current = state;
  screenRef.current = screen;

  const onEvent = useCallback((e: GameEvent) => {
    switch (e.type) {
      case 'hud': setHud(e.hud); break;
      case 'state': setState(e.state); break;
      case 'toast': {
        const id = ++idRef.current;
        setToasts((t) => [...t.slice(-2), { id, text: e.text, kind: e.kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
        break;
      }
      case 'death': setDeath({ title: e.title, sub: e.sub, lives: e.lives }); break;
      case 'over': case 'won': setResult(e.result); setSaved(false); setSavedDate(undefined); break;
      case 'flash': setFlash({ id: ++idRef.current, color: e.color }); break;
      case 'score': if (e.delta >= 50) setScorePop({ id: ++idRef.current, delta: e.delta }); break;
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current, onEvent);
    gameRef.current = g;
    audio.setMuted(loadMuted());
    return () => { g.destroy(); gameRef.current = null; };
  }, [onEvent]);

  const startGame = useCallback(() => {
    audio.init();
    audio.play('click');
    setDeath(null);
    setResult(null);
    setToasts([]);
    setScreen('game');
    gameRef.current?.start();
    gameRef.current?.requestLock();
  }, []);

  const continueAfterDeath = useCallback(() => {
    setDeath(null);
    gameRef.current?.continueAfterDeath();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => { const nm = !m; audio.setMuted(nm); saveMuted(nm); return nm; });
  }, []);

  const quitToMenu = useCallback(() => {
    setScreen('menu');
    setState('idle');
    setDeath(null);
    setResult(null);
    gameRef.current?.pause();
    setScores(loadScores());
  }, []);

  const save = useCallback(() => {
    if (!result || saved) return;
    const n = (name.trim() || 'ANON').toUpperCase();
    saveName(n);
    const entry: ScoreEntry = { name: n, score: result.score, rooms: result.rooms, deaths: result.deaths, time: result.time, won: result.won, date: Date.now() };
    setScores(saveScore(entry));
    setSaved(true);
    setSavedDate(entry.date);
    audio.play('ding');
  }, [result, saved, name]);

  // keyboard shortcuts
  useEffect(() => {
    const unbind = bindGlobalInput((code) => {
      const g = gameRef.current;
      if (!g) return;
      const st = stateRef.current;
      if (screenRef.current === 'menu') {
        if (code === 'Enter' || code === 'Space') startGame();
        return;
      }
      if (code === 'Escape') {
        if (st === 'playing') g.pause();
      } else if (code === 'KeyP') {
        if (st === 'playing' || st === 'paused') g.togglePause();
      } else if (code === 'KeyR') {
        if (st === 'over' || st === 'won' || st === 'paused') startGame();
      } else if (code === 'KeyM') {
        toggleMute();
      } else if (code === 'Enter' || code === 'Space') {
        if (st === 'dead') continueAfterDeath();
        else if (st === 'over' || st === 'won') startGame();
      }
    });
    return unbind;
  }, [startGame, toggleMute, continueAfterDeath]);

  const showHud = screen === 'game' && (state === 'playing' || state === 'dying' || state === 'dead' || state === 'paused');

  return (
    <div className="relative w-full h-full bg-[#0b0a14]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {flash && (
        <div key={flash.id} className="absolute inset-0 pointer-events-none anim-flash z-20" style={{ background: flash.color }} />
      )}

      {showHud && <HUD hud={hud} onPause={() => gameRef.current?.pause()} muted={muted} onToggleMute={toggleMute} scorePop={scorePop} />}
      {screen === 'game' && state === 'playing' && isTouch && <TouchControls />}
      {screen === 'game' && state === 'playing' && !isTouch && !locked && (
        <div className="absolute left-1/2 top-[62%] -translate-x-1/2 pointer-events-none text-center">
          <div className="inline-block bg-black/60 border border-white/20 rounded-lg px-4 py-2 text-sm font-semibold text-white/90 animate-pulse">
            Click to capture the mouse · or steer with ← → / Q E
          </div>
        </div>
      )}
      {screen === 'game' && <Toasts toasts={toasts} />}

      {screen === 'game' && state === 'dead' && death && (
        <div className="absolute inset-0 z-30">
          <DeathCard title={death.title} sub={death.sub} lives={death.lives} onContinue={continueAfterDeath} />
        </div>
      )}

      {screen === 'game' && state === 'paused' && (
        <div className="absolute inset-0 z-30">
          <PauseMenu
            onResume={() => gameRef.current?.resume()}
            onRestart={startGame}
            onQuit={quitToMenu}
            muted={muted}
            onToggleMute={toggleMute}
          />
        </div>
      )}

      {screen === 'game' && (state === 'over' || state === 'won') && result && (
        <div className="absolute inset-0 z-30">
          <EndScreen result={result} scores={scores} name={name} setName={setName} saved={saved} onSave={save} onRestart={startGame} onMenu={quitToMenu} highlight={savedDate} />
        </div>
      )}

      {screen === 'menu' && (
        <div className="absolute inset-0 z-40">
          <StartScreen onStart={startGame} scores={scores} isTouch={isTouch} />
        </div>
      )}
    </div>
  );
}
