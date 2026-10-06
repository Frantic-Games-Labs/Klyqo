import * as THREE from 'three';
import { generateMaze } from './generator';
import { CELL, DIRS, WALL_H, key, type Exit, type Hub, type MazeData, type Side } from './types';
import { WorldBuilder, GATE_DOWN_Y, GATE_UP_Y, type HubView, type LightDef } from './world';
import { Particles } from './particles';
import { input, isTouchDevice } from './input';
import { audio } from './audio';
import {
  TRAPS, SIDE_WORD, DIED_DISOBEYED, DIED_OBEYED, DIED_NEUTRAL, DIED_REPEAT, DODGED, SCARE_QUIPS,
  GREED_QUIPS, CAKE_QUIPS, DAVE_QUIPS, EXIT_QUIPS, HUB_TOASTS, ZONES, type CamFx,
} from './content';

export type GameState = 'idle' | 'playing' | 'paused' | 'dying' | 'dead' | 'over' | 'won';

export interface HudState {
  lives: number;
  room: number;
  score: number;
  streak: number;
  mult: number;
  deaths: number;
  time: number;
  seed: number;
  coins: number;
}

export interface RunResult {
  score: number;
  rooms: number;
  deaths: number;
  time: number;
  seed: number;
  won: boolean;
}

export type GameEvent =
  | { type: 'hud'; hud: HudState }
  | { type: 'state'; state: GameState }
  | { type: 'toast'; text: string; kind: 'info' | 'good' | 'bad' | 'gold' }
  | { type: 'death'; title: string; sub: string; lives: number }
  | { type: 'over'; result: RunResult }
  | { type: 'won'; result: RunResult }
  | { type: 'flash'; color: string }
  | { type: 'score'; delta: number };

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const EYE = 1.65;
const RADIUS = 0.55;
const SPEED = 6.4;

interface CellInfo { hub: number; side: Side | null; index: number }

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private particles = new Particles();
  private lantern: THREE.PointLight;
  private lightPool: THREE.PointLight[] = [];
  private world!: WorldBuilder;
  private maze!: MazeData;
  private views = new Map<number, HubView>();
  private cellInfo = new Map<string, CellInfo>();
  private closed = new Set<string>();
  private takenCoins = new Set<string>();

  state: GameState = 'idle';
  private raf = 0;
  private last = 0;
  private time = 0;
  private hudTimer = 0;
  private isTouch = isTouchDevice();

  // player
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private bobT = 0;
  private bobPhase = 0;
  private trauma = 0;
  private lastCellKey = '';
  private currentHub = 0;
  private chosenSide: Side | null = null;
  private pendingKill: { exit: Exit; at: number } | null = null;
  private pendingToasts: { at: number; text: string; kind: 'info' | 'good' | 'bad' | 'gold' }[] = [];
  private paintedToastDone = new Set<string>();
  private scareDone = new Set<string>();
  private lanternOffUntil = 0;

  // death
  private deathT = 0;
  private deathFx: CamFx = 'tilt';
  private deathRoll = 0;
  private deadExit: Exit | null = null;

  // score
  private lives = 5;
  private score = 0;
  private streak = 0;
  private deaths = 0;
  private coins = 0;
  private hubStartTime = 0;
  private runTime = 0;
  private seed = 0;

  constructor(private canvas: HTMLCanvasElement, private emit: (e: GameEvent) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.isTouch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.camera = new THREE.PerspectiveCamera(this.isTouch ? 80 : 75, 1, 0.1, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.background = new THREE.Color(0x0b0a14);
    this.scene.fog = new THREE.FogExp2(0x0b0a14, 0.03);
    this.scene.add(new THREE.HemisphereLight(0x5a4a9a, 0x0a0810, 0.55));
    this.lantern = new THREE.PointLight(0xffc27a, 10, 16, 1.7);
    this.scene.add(this.lantern);
    // Fixed-size light pool: constant light count avoids shader recompiles when hubs stream in/out.
    const poolSize = this.isTouch ? 5 : 7;
    for (let i = 0; i < poolSize; i++) {
      const l = new THREE.PointLight(0xffa050, 0, 20, 1.6);
      l.position.set(0, -50, 0);
      this.scene.add(l);
      this.lightPool.push(l);
    }
    this.scene.add(this.particles.points);
    this.resize();
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  // ---------- lifecycle ----------

  start(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
    this.clearWorld();
    this.seed = seed;
    this.maze = generateMaze(seed);
    this.world = new WorldBuilder(this.maze, {
      shake: (n) => this.shake(n),
      burst: (p, c, col, o) => this.particles.emit(p, c, col, o),
      sound: (n) => audio.play(n),
    });
    this.cellInfo.clear();
    for (const h of this.maze.hubs) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.cellInfo.set(key(h.cx + dx, h.cz + dz), { hub: h.index, side: null, index: 0 });
      for (const e of h.exits) e.cells.forEach((c, i) => this.cellInfo.set(key(c.x, c.z), { hub: h.index, side: e.side, index: i }));
    }
    this.closed.clear();
    this.takenCoins.clear();
    this.paintedToastDone.clear();
    this.scareDone.clear();
    this.lives = 5; this.score = 0; this.streak = 0; this.deaths = 0; this.coins = 0;
    this.runTime = 0; this.time = 0; this.hubStartTime = 0; this.trauma = 0;
    this.currentHub = 0;
    this.pendingKill = null;
    this.pendingToasts = [];
    this.placeAtHub(0);
    this.ensureLoaded();
    this.setState('playing');
    this.emitHud();
    this.toast('Find the exit. Trust nothing.', 'info');
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.clearWorld();
    this.renderer.dispose();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.setState('paused');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('playing');
    this.last = performance.now();
    this.requestLock();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  requestLock() {
    if (this.isTouch) return;
    if (this.state === 'playing' && !document.pointerLockElement) {
      try {
        const r = this.canvas.requestPointerLock() as unknown;
        if (r instanceof Promise) r.catch(() => { /* denied: fall back to keyboard turning */ });
      } catch { /* ignore */ }
    }
  }

  /** Called by UI after the death card, or on tap/key. */
  continueAfterDeath() {
    if (this.state !== 'dead') return;
    if (this.lives <= 0) {
      this.setState('over');
      this.emit({ type: 'over', result: this.result(false) });
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    this.respawn();
  }

  private result(won: boolean): RunResult {
    return { score: this.score, rooms: this.currentHub, deaths: this.deaths, time: this.runTime, seed: this.seed, won };
  }

  private setState(s: GameState) {
    this.state = s;
    this.emit({ type: 'state', state: s });
  }

  private clearWorld() {
    for (const v of this.views.values()) this.world?.dispose(v);
    this.views.clear();
    this.world?.disposeAll();
  }

  // ---------- events ----------

  private resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onCanvasClick = () => {
    if (this.state === 'playing') this.requestLock();
  };

  private onLockChange = () => {
    input.pointerLocked = document.pointerLockElement === this.canvas;
    if (!input.pointerLocked && this.state === 'playing' && !this.isTouch) this.pause();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!input.pointerLocked) return;
    input.lookDX += e.movementX;
    input.lookDY += e.movementY;
  };

  private onVisibility = () => {
    if (document.hidden && this.state === 'playing') this.pause();
  };

  // ---------- helpers ----------

  private toast(text: string, kind: 'info' | 'good' | 'bad' | 'gold' = 'info') {
    this.emit({ type: 'toast', text, kind });
  }

  private shake(n: number) {
    this.trauma = Math.min(1, this.trauma + n * 0.6);
  }

  private emitHud() {
    this.emit({
      type: 'hud',
      hud: {
        lives: this.lives, room: this.currentHub + 1, score: this.score, streak: this.streak,
        mult: this.mult(), deaths: this.deaths, time: this.runTime, seed: this.seed, coins: this.coins,
      },
    });
  }

  private mult() {
    return Math.min(3, 1 + this.streak * 0.15);
  }

  private addScore(n: number) {
    this.score += n;
    this.emit({ type: 'score', delta: n });
    this.emitHud();
  }

  private placeAtHub(i: number) {
    const h = this.maze.hubs[i];
    this.pos.set(h.cx * CELL, EYE, h.cz * CELL);
    // start slightly behind center so the sign is in view
    const F = DIRS[h.facing];
    this.pos.x -= F.x * 3.5;
    this.pos.z -= F.z * 3.5;
    this.yaw = -h.facing * Math.PI / 2;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.camera.rotation.z = 0;
    this.lastCellKey = '';
    this.chosenSide = null;
  }

  private ensureLoaded() {
    const lo = Math.max(0, this.currentHub - 1);
    const hi = Math.min(this.maze.hubs.length - 1, this.currentHub + 2);
    for (const [i, v] of [...this.views]) {
      if (i < lo || i > hi) { this.world.dispose(v); this.views.delete(i); }
    }
    for (let i = lo; i <= hi; i++) {
      if (!this.views.has(i)) this.buildView(i);
    }
  }

  private buildView(i: number) {
    const v = this.world.build(this.maze.hubs[i]);
    for (let k = 0; k < v.coins.length; k++) {
      if (this.takenCoins.has(`${i}:${k}`)) { v.coins[k].taken = true; v.coins[k].mesh.visible = false; }
    }
    // gates that were already slammed shut stay shut
    if (v.gate && i > 0) {
      const prevSafe = this.maze.hubs[i - 1].exits.find((e) => !e.deadly)!;
      const last = prevSafe.cells[prevSafe.cells.length - 1];
      if (this.closed.has(key(last.x, last.z))) {
        v.gate.done = true;
        v.gate.t = 1;
        v.gate.mesh.position.y = GATE_DOWN_Y;
      }
    }
    this.scene.add(v.group);
    this.views.set(i, v);
  }

  private rebuildCurrent() {
    const v = this.views.get(this.currentHub);
    if (v) { this.world.dispose(v); this.views.delete(this.currentHub); }
    this.buildView(this.currentHub);
  }

  private updateLights() {
    const off = this.time < this.lanternOffUntil;
    const defs: { d: LightDef; dist: number }[] = [];
    for (const v of this.views.values()) {
      if (Math.abs(v.hub.index - this.currentHub) > 1) continue;
      for (const d of v.lights) {
        const dx = d.pos.x - this.pos.x, dz = d.pos.z - this.pos.z;
        defs.push({ d, dist: dx * dx + dz * dz });
      }
    }
    defs.sort((a, b) => a.dist - b.dist);
    for (let i = 0; i < this.lightPool.length; i++) {
      const l = this.lightPool[i];
      const e = defs[i];
      if (!e || off) { l.intensity = 0; continue; }
      l.position.copy(e.d.pos);
      l.color.setHex(e.d.color);
      l.distance = e.d.distance;
      l.decay = e.d.decay;
      l.intensity = e.d.flicker ? e.d.intensity * (0.92 + Math.sin(this.time * 11 + i * 1.7) * 0.05 + Math.random() * 0.06) : e.d.intensity;
    }
  }

  private isWalkable(x: number, z: number) {
    const k = key(x, z);
    return this.maze.walkable.has(k) && !this.closed.has(k);
  }

  // ---------- main loop ----------

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (this.state === 'paused' || this.state === 'idle' || this.state === 'over') {
      // still render (frozen) so pause menu shows the world
      this.render(0);
      return;
    }
    this.time += dt;
    if (this.state === 'playing') {
      this.runTime += dt;
      this.updatePlayer(dt);
      this.checkCell();
      this.checkPending();
    } else if (this.state === 'dying') {
      this.deathT += dt;
      if (this.deathT > 1.1) this.finishDeath();
    }
    this.updateWorld(dt);
    this.particles.update(dt);
    this.render(dt);
    this.hudTimer += dt;
    if (this.hudTimer > 0.25) { this.hudTimer = 0; this.emitHud(); }
    input.lookDX = 0;
    input.lookDY = 0;
  };

  private updatePlayer(dt: number) {
    const k = input.keys;
    // look
    const sens = this.isTouch ? 0.0045 : 0.0022;
    this.yaw -= input.lookDX * sens;
    this.pitch -= input.lookDY * sens;
    const rot = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0) + (k.has('KeyQ') ? 1 : 0) - (k.has('KeyE') ? 1 : 0);
    this.yaw += rot * 2.4 * dt;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));

    // move
    let mx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    let mz = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    mx += input.joy.x;
    mz += input.joy.y;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // forward = (-sin, -cos), right = (cos, -sin)
    const tx = (-sin * mz + cos * mx) * SPEED;
    const tz = (-cos * mz - sin * mx) * SPEED;
    const accel = len > 0.05 ? 18 : 22;
    this.vel.x += (tx - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (tz - this.vel.z) * Math.min(1, accel * dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.collide();

    // head bob & steps
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > 1) {
      this.bobT += dt * speed * 1.7;
      const phase = Math.floor(this.bobT / Math.PI);
      if (phase !== this.bobPhase) { this.bobPhase = phase; audio.play('step'); }
    }
  }

  private collide() {
    const cx = Math.round(this.pos.x / CELL), cz = Math.round(this.pos.z / CELL);
    for (let iter = 0; iter < 2; iter++) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const x = cx + dx, z = cz + dz;
        if (this.isWalkable(x, z)) continue;
        const minX = (x - 0.5) * CELL, maxX = (x + 0.5) * CELL, minZ = (z - 0.5) * CELL, maxZ = (z + 0.5) * CELL;
        const px = Math.max(minX, Math.min(maxX, this.pos.x));
        const pz = Math.max(minZ, Math.min(maxZ, this.pos.z));
        let ddx = this.pos.x - px, ddz = this.pos.z - pz;
        let d = Math.hypot(ddx, ddz);
        if (d >= RADIUS) continue;
        if (d < 1e-4) {
          // inside the box: push toward nearest face
          const toMinX = this.pos.x - minX, toMaxX = maxX - this.pos.x, toMinZ = this.pos.z - minZ, toMaxZ = maxZ - this.pos.z;
          const m = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
          if (m === toMinX) { ddx = -1; ddz = 0; } else if (m === toMaxX) { ddx = 1; ddz = 0; } else if (m === toMinZ) { ddx = 0; ddz = -1; } else { ddx = 0; ddz = 1; }
          d = 0;
        } else { ddx /= d; ddz /= d; }
        const push = RADIUS - d;
        this.pos.x += ddx * push;
        this.pos.z += ddz * push;
      }
      const v = this.views.get(this.currentHub);
      if (v) {
        for (const c of v.colliders) {
          const ddx = this.pos.x - c.x, ddz = this.pos.z - c.z;
          const d = Math.hypot(ddx, ddz);
          const min = c.r + RADIUS * 0.6;
          if (d < min && d > 1e-4) { this.pos.x += (ddx / d) * (min - d); this.pos.z += (ddz / d) * (min - d); }
        }
      }
    }
  }

  private checkCell() {
    const cx = Math.round(this.pos.x / CELL), cz = Math.round(this.pos.z / CELL);
    const k = key(cx, cz);
    // coins (distance based)
    const v = this.views.get(this.currentHub);
    if (v) {
      for (let i = 0; i < v.coins.length; i++) {
        const c = v.coins[i];
        if (c.taken) continue;
        if (Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z) < 1.0) {
          c.taken = true; c.mesh.visible = false;
          this.takenCoins.add(`${this.currentHub}:${i}`);
          this.coins++;
          this.addScore(25);
          audio.play('coin');
          this.particles.emit(c.pos, 14, 0xffd166, { speed: 2, up: 3, spread: 0.3, gravity: 6, life: 0.7 });
        }
      }
    }
    if (k === this.lastCellKey) return;
    this.lastCellKey = k;
    const info = this.cellInfo.get(k);
    if (!info) return;
    const hub = this.maze.hubs[info.hub];

    if (info.hub === this.currentHub + 1 && info.side === null) {
      this.enterHub(info.hub);
      return;
    }
    if (info.hub !== this.currentHub) return;
    if (info.side === null) return;

    const exit = hub.exits.find((e) => e.side === info.side)!;
    if (info.index >= 1 && this.chosenSide === null) this.chosenSide = exit.side;

    if (hub.isFinal) {
      if (info.index >= 1) this.win();
      return;
    }

    if (exit.deadly) {
      const trap = v?.traps.get(exit.side);
      if (trap && !trap.triggered && info.index >= exit.triggerIndex) {
        trap.trigger();
        this.pendingKill = { exit, at: this.time + TRAPS[exit.trap!].delay };
        if (exit.trap === 'gravity') this.shake(0.3);
      }
      if (info.index === exit.cells.length - 1) {
        const pk = `${hub.index}:${exit.side}`;
        if (!this.paintedToastDone.has(pk)) {
          this.paintedToastDone.add(pk);
          this.toast(pick(['The door is painted on. Obviously.', 'Dead end. The door doesn\'t open. It never did.', 'Nice door. It\'s a wall.']), 'bad');
        }
      }
    } else if (exit.scare && info.index >= exit.triggerIndex) {
      const sk = `${hub.index}`;
      if (!this.scareDone.has(sk)) {
        this.scareDone.add(sk);
        if (v?.scare) v.scare.trigger();
        else if (exit.scare === 'rumble') {
          this.shake(1.1); audio.play('rumble');
          this.particles.emit(this.pos.clone().setY(WALL_H), 40, 0x5a5468, { speed: 2, up: -2, spread: 3, gravity: 4, life: 1.5 });
        } else if (exit.scare === 'lightsOut') {
          this.lanternOffUntil = this.time + 1.6;
          audio.play('rumble');
          this.pendingToasts.push({ at: this.time + 0.4, text: 'Who turned off the lights?', kind: 'bad' });
        }
        this.pendingToasts.push({ at: this.time + 1.1, text: pick(SCARE_QUIPS), kind: 'info' });
      }
    }
  }

  private checkPending() {
    if (this.pendingKill && this.time >= this.pendingKill.at) {
      const { exit } = this.pendingKill;
      this.pendingKill = null;
      const info = TRAPS[exit.trap!];
      const cx = Math.round(this.pos.x / CELL), cz = Math.round(this.pos.z / CELL);
      const inZone = exit.cells.some((c, i) => i >= info.killFrom && i <= info.killTo && c.x === cx && c.z === cz);
      if (inZone) this.die(exit);
      else {
        this.toast(pick(DODGED), 'gold');
        this.addScore(75);
        audio.play('ding');
      }
    }
    for (let i = this.pendingToasts.length - 1; i >= 0; i--) {
      if (this.time >= this.pendingToasts[i].at) {
        const t = this.pendingToasts[i];
        this.pendingToasts.splice(i, 1);
        this.toast(t.text, t.kind);
      }
    }
  }

  // ---------- progression ----------

  private enterHub(i: number) {
    const prev = this.maze.hubs[this.currentHub];
    const prevSide = this.chosenSide;
    // close gate
    const safe = prev.exits.find((e) => !e.deadly)!;
    const last = safe.cells[safe.cells.length - 1];
    this.closed.add(key(last.x, last.z));
    this.currentHub = i;
    this.chosenSide = null;
    this.pendingKill = null;
    this.ensureLoaded();
    const v = this.views.get(i);
    if (v?.gate) { v.gate.t = 0.0001; }

    // score
    const hubTime = this.runTime - this.hubStartTime;
    this.hubStartTime = this.runTime;
    this.streak++;
    const timeBonus = Math.max(0, Math.round(60 - hubTime * 4));
    const gained = Math.round(100 * this.mult()) + timeBonus;
    this.addScore(gained);
    audio.play('chime');

    // quip about the previous choice
    const ctx = this.context(prev, prevSide);
    const q = ctx === 'obeyed' ? prev.surviveQuip.obeyed : ctx === 'disobeyed' ? prev.surviveQuip.disobeyed : prev.surviveQuip.neutral;
    this.toast(q, 'good');

    // persistence bonus: suffered heavily in the previous room
    const prevDeaths = prev.exits.reduce((s, e) => s + e.deaths, 0);
    if (prevDeaths >= 3) {
      this.addScore(150);
      this.pendingToasts.push({
        at: this.time + 1.0,
        text: 'Persistence bonus +150. The maze respects stubbornness. Barely.',
        kind: 'gold',
      });
    }

    // the Architect announces new zones
    if (i % 10 === 0 && i > 0) {
      const z = this.world.zoneOf(i);
      this.pendingToasts.push({ at: this.time + 2.2, text: ZONES[z].taunt, kind: 'info' });
    }

    if (i % 4 === 0) {
      this.lives = Math.min(9, this.lives + 1);
      this.pendingToasts.push({ at: this.time + 1.4, text: '+1 life. Don\'t waste it.', kind: 'gold' });
    } else if (Math.random() < 0.35) {
      const t = pick(HUB_TOASTS).replace('{n}', String(i)).replace('{left}', String(this.maze.hubs.length - 1 - i));
      this.pendingToasts.push({ at: this.time + 1.7, text: t, kind: 'info' });
    }
    if (this.maze.hubs[i].isFinal) this.pendingToasts.push({ at: this.time + 1.2, text: 'Is that... the exit? For real?', kind: 'gold' });
    this.emitHud();
  }

  private context(hub: Hub, side: Side | null): 'obeyed' | 'disobeyed' | 'neutral' {
    if (!hub.advice || !side) return 'neutral';
    const a = hub.advice;
    if (a.says === 'safe') return side === a.side ? 'obeyed' : 'disobeyed';
    return side === a.side ? 'disobeyed' : 'obeyed';
  }

  private die(exit: Exit) {
    if (this.state !== 'playing') return;
    this.deadExit = exit;
    exit.deaths++;
    this.deaths++;
    this.lives--;
    this.streak = 0;
    this.deathT = 0;
    this.deathFx = TRAPS[exit.trap!].camFx;
    this.deathRoll = Math.random() < 0.5 ? -1 : 1;
    this.shake(1.2);
    audio.play('hurt');
    this.emit({ type: 'flash', color: 'rgba(255,40,70,0.7)' });
    this.setState('dying');
    if (document.pointerLockElement) document.exitPointerLock();
    this.emitHud();
  }

  private finishDeath() {
    const exit = this.deadExit!;
    const hub = this.maze.hubs[this.currentHub];
    const ctx = this.context(hub, exit.side);
    const dword = SIDE_WORD[exit.side].toLowerCase();
    let title: string;
    if (exit.deaths > 1) title = pick(DIED_REPEAT);
    else if (ctx === 'disobeyed') title = pick(DIED_DISOBEYED).replace('{d}', dword);
    else if (ctx === 'obeyed') {
      title = pick(DIED_OBEYED);
      const lure = hub.advice && hub.advice.side === exit.side;
      if (lure && Math.random() < 0.6) {
        if (hub.gimmick === 'coins') title = pick(GREED_QUIPS);
        else if (hub.gimmick === 'cake') title = pick(CAKE_QUIPS);
        else if (hub.gimmick === 'dave') title = pick(DAVE_QUIPS);
        else if (hub.gimmick === 'exit') title = pick(EXIT_QUIPS);
      }
    } else title = pick(DIED_NEUTRAL);
    const sub = pick(TRAPS[exit.trap!].quips);
    this.setState('dead');
    this.emit({ type: 'death', title, sub, lives: this.lives });
  }

  private respawn() {
    this.placeAtHub(this.currentHub);
    this.rebuildCurrent();
    this.pendingKill = null;
    this.trauma = 0;
    this.setState('playing');
    this.hubStartTime = this.runTime;
    this.emitHud();
    this.requestLock();
  }

  private win() {
    if (this.state !== 'playing') return;
    const bonus = 5000 + this.lives * 500;
    this.addScore(bonus);
    audio.play('win');
    this.particles.emit(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 200, 0x7be495, { speed: 6, up: 8, spread: 2, life: 2.5, gravity: 4 });
    this.setState('won');
    if (document.pointerLockElement) document.exitPointerLock();
    this.emit({ type: 'won', result: this.result(true) });
  }

  // ---------- world update & render ----------

  private updateWorld(dt: number) {
    const flicker = 0.85 + Math.random() * 0.3;
    this.updateLights();
    for (const v of this.views.values()) {
      const near = Math.abs(v.hub.index - this.currentHub) <= 1;
      for (const t of v.traps.values()) t.update(dt);
      v.scare?.update(dt);
      if (near) {
        for (let i = 0; i < v.torchFlames.length; i++) {
          const f = v.torchFlames[i];
          const s = flicker * (0.9 + 0.2 * Math.sin(this.time * 13 + i * 2.1));
          f.scale.set(s, s * (1 + Math.sin(this.time * 17 + i) * 0.15), s);
        }
        for (const c of v.coins) if (!c.taken) { c.mesh.rotation.z += dt * 3; c.mesh.position.y = c.pos.y + Math.sin(this.time * 3 + c.pos.x) * 0.12; }
        if (v.portal) {
          (v.portal.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(this.time * 4) * 0.25;
          v.portal.scale.x = 1 + Math.sin(this.time * 2) * 0.05;
        }
      }
      if (v.gate && v.gate.t > 0 && !v.gate.done) {
        v.gate.t += dt / 0.35;
        const k = Math.min(1, v.gate.t);
        v.gate.mesh.position.y = GATE_UP_Y * (1 - k * k) + GATE_DOWN_Y * k * k;
        if (k >= 1) {
          v.gate.done = true;
          this.shake(0.7);
          audio.play('slam');
          this.particles.emit(v.gate.mesh.position.clone().setY(0.3), 30, 0x8a8496, { speed: 3, up: 2, spread: 3, life: 1 });
        }
      }
    }
    this.lantern.visible = this.time > this.lanternOffUntil;
    this.lantern.intensity = 10 + Math.sin(this.time * 9) * 0.6;
  }

  private render(dt: number) {
    // trauma decay
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma;
    const cam = this.camera;
    let y = this.pos.y;
    let roll = 0;
    let pitch = this.pitch;
    let yaw = this.yaw;
    if (this.state === 'playing') {
      const speed = Math.hypot(this.vel.x, this.vel.z);
      const amp = Math.min(1, speed / SPEED) * 0.06;
      y += Math.sin(this.bobT) * amp;
      roll = Math.sin(this.bobT * 0.5) * amp * 0.5;
    } else if (this.state === 'dying' || this.state === 'dead') {
      const t = Math.min(1.1, this.deathT);
      switch (this.deathFx) {
        case 'fall': y = this.pos.y - 22 * t * t; pitch = this.pitch + t * 1.1; roll = this.deathRoll * t * 0.8; break;
        case 'crush': y = Math.max(0.22, this.pos.y - t * 6); roll = this.deathRoll * Math.min(0.5, t); pitch = this.pitch - t * 0.4; break;
        case 'tilt': { const k = Math.min(1, t / 0.7); y = this.pos.y - k * k * 1.2; roll = this.deathRoll * k * 1.35; pitch = this.pitch + k * 0.2; break; }
        case 'up': y = this.pos.y + 18 * t * t; pitch = this.pitch + t * 1.0; yaw = this.yaw + t * 2; break;
        case 'shake': y = this.pos.y - t * 0.8; roll = this.deathRoll * t * 0.6; pitch = this.pitch - t * 0.5; break;
        case 'flat': { const k = Math.min(1, t / 0.9); y = this.pos.y - k * k * 1.3; pitch = this.pitch - k * 1.3; roll = this.deathRoll * k * 0.4; break; }
      }
    }
    cam.position.set(this.pos.x + (Math.random() - 0.5) * sh * 0.5, y + (Math.random() - 0.5) * sh * 0.4, this.pos.z + (Math.random() - 0.5) * sh * 0.5);
    cam.rotation.set(pitch + (Math.random() - 0.5) * sh * 0.12, yaw + (Math.random() - 0.5) * sh * 0.12, roll + (Math.random() - 0.5) * sh * 0.1);
    this.lantern.position.set(this.pos.x, this.pos.y + 0.6, this.pos.z);
    this.renderer.render(this.scene, this.camera);
  }
}
