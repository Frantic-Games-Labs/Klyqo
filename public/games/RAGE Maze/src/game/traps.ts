import * as THREE from 'three';
import { CELL, DIRS, WALL_H, type Cell, type Exit, type TrapType } from './types';
import { TRAPS } from './content';

export interface FX {
  shake(amount: number): void;
  burst(pos: THREE.Vector3, count: number, color: number, opts?: { speed?: number; spread?: number; up?: number; gravity?: number; life?: number }): void;
  sound(name: 'thud' | 'boom' | 'whoosh' | 'slam' | 'zap' | 'laser' | 'spike' | 'chomp' | 'rumble' | 'fuse' | 'fall' | 'hurt'): void;
}

export interface Mats {
  metal: THREE.MeshStandardMaterial;
  cracked: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
}

export interface TrapInstance {
  group: THREE.Group;
  triggered: boolean;
  t: number;
  trigger(): void;
  update(dt: number): void;
}

interface Frame {
  group: THREE.Group;
  origin: THREE.Vector3;
  fwd: THREE.Vector3;
  right: THREE.Vector3;
  cellLocal(c: Cell): THREE.Vector3; // local-space center of a cell
  cellsIn(from: number, to: number): Cell[];
}

function makeFrame(exit: Exit, triggerIndex: number): Frame {
  const tc = exit.cells[triggerIndex];
  const d = DIRS[exit.dir];
  const r = DIRS[(exit.dir + 1) % 4];
  const group = new THREE.Group();
  group.position.set(tc.x * CELL, 0, tc.z * CELL);
  group.rotation.y = -exit.dir * Math.PI / 2;
  group.updateMatrixWorld(true);
  const origin = group.position.clone();
  const fwd = new THREE.Vector3(d.x, 0, d.z);
  const right = new THREE.Vector3(r.x, 0, r.z);
  return {
    group, origin, fwd, right,
    cellLocal: (c) => group.worldToLocal(new THREE.Vector3(c.x * CELL, 0, c.z * CELL)),
    cellsIn: (from, to) => exit.cells.slice(Math.max(0, from), Math.min(exit.cells.length - 1, to) + 1),
  };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function base(frame: Frame, delay: number, onTrigger: () => void, onUpdate: (t: number, dt: number) => void): TrapInstance {
  const inst: TrapInstance = {
    group: frame.group, triggered: false, t: 0,
    trigger() {
      if (inst.triggered) return;
      inst.triggered = true;
      inst.t = 0;
      onTrigger();
    },
    update(dt) {
      if (!inst.triggered) { onUpdate(-1, dt); return; }
      inst.t += dt;
      onUpdate(inst.t, dt);
    },
  };
  void delay;
  return inst;
}

// ---------------- builders ----------------

function buildFaller(type: TrapType, exit: Exit, triggerIndex: number, mats: Mats, fx: FX, harmless = false): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const info = TRAPS[type];
  const obj = new THREE.Group();
  let restY = 1.6;
  if (type === 'boulder') {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7, 1), mats.rock);
    m.scale.set(1, 0.85, 1.05);
    obj.add(m);
    restY = 1.45;
  } else if (type === 'piano') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.8), mats.dark);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.5), mats.white);
    keys.position.set(0, 0.5, 1.0);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.8), mats.dark);
    lid.position.set(0, 0.9, -0.5); lid.rotation.x = -0.6;
    obj.add(body, keys, lid);
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8), mats.dark);
      leg.position.set(-1 + i, -0.9, i === 1 ? -0.6 : 0.6);
      obj.add(leg);
    }
    restY = 1.3;
  } else if (type === 'anvil') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.0), mats.metal);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), mats.metal);
    mid.position.y = -0.7;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.2), mats.metal);
    foot.position.y = -1.3;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 8), mats.metal);
    horn.rotation.z = Math.PI / 2; horn.position.set(1.7, 0, 0);
    obj.add(top, mid, foot, horn);
    restY = 1.5;
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mats.metal);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12), mats.gold);
    dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.2, 0.95);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), mats.gold);
    handle.position.set(0.5, -0.3, 0.95);
    obj.add(box, dial, handle);
    restY = 0.9;
  }
  const startY = WALL_H + 3.2;
  obj.position.y = startY;
  frame.group.add(obj);
  let rope: THREE.Mesh | null = null;
  if (type !== 'boulder') {
    rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 30), mats.wood);
    rope.position.y = startY + 15;
    frame.group.add(rope);
  }
  const h = startY - restY;
  const g = (2 * h) / (info.delay * info.delay);
  let landed = false;
  let spin = 0;
  const color = type === 'boulder' ? 0x8a8496 : type === 'piano' ? 0x222222 : 0x777788;
  return base(frame, info.delay, () => { if (rope) rope.visible = false; }, (t, dt) => {
    if (t < 0) {
      // idle sway
      obj.rotation.z = Math.sin(performance.now() * 0.0015) * 0.03;
      return;
    }
    if (!landed) {
      const y = startY - 0.5 * g * t * t;
      if (y <= restY) {
        obj.position.y = restY;
        landed = true;
        fx.shake(harmless ? 0.8 : 1.2);
        fx.sound('thud');
        fx.burst(frame.origin.clone().setY(0.4), 60, color, { speed: 6, up: 5, spread: 2.5, life: 1.2 });
        fx.burst(frame.origin.clone().setY(0.4), 30, 0x5a5468, { speed: 3, up: 2, spread: 2, life: 1.6, gravity: 2 });
      } else {
        obj.position.y = y;
        if (type === 'boulder') { spin += dt * 4; obj.rotation.x = spin; }
      }
    } else if (type === 'boulder') {
      // settle wobble
      obj.rotation.z = Math.sin(t * 20) * Math.max(0, 0.15 - (t - info.delay) * 0.3);
    }
  });
}

function buildPit(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const tiles: THREE.Mesh[] = [];
  const hole = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.2, 0.05, CELL * 2 - 0.2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hole.position.set(0, -0.15, -CELL / 2);
  frame.group.add(hole);
  for (let i = 0; i < 2; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, CELL), mats.cracked);
    tile.position.set(0, 0.06, -i * CELL);
    frame.group.add(tile);
    tiles.push(tile);
  }
  return base(frame, 0.05, () => {
    fx.sound('fall');
    fx.burst(frame.origin.clone().setY(0.3), 30, 0x3a3346, { speed: 2, up: 3, spread: 3, life: 1.5 });
  }, (t) => {
    if (t < 0) return;
    tiles.forEach((tile, i) => {
      const local = Math.max(0, t - i * 0.05);
      tile.position.y = 0.06 - 20 * local * local;
      tile.rotation.x = local * 3;
      tile.visible = tile.position.y > -30;
    });
  });
}

function buildSpikes(exit: Exit, triggerIndex: number, mats: Mats, fx: FX, cellsFrom: number, cellsTo: number, delay: number): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const cells = frame.cellsIn(cellsFrom, cellsTo);
  const coneGeo = new THREE.ConeGeometry(0.13, 1.5, 6);
  const holeGeo = new THREE.BoxGeometry(0.22, 0.02, 0.22);
  const count = cells.length * 16;
  const cones = new THREE.InstancedMesh(coneGeo, mats.bone, count);
  const holes = new THREE.InstancedMesh(holeGeo, mats.dark, count);
  const m = new THREE.Matrix4();
  const positions: THREE.Vector3[] = [];
  let idx = 0;
  for (const c of cells) {
    const lc = frame.cellLocal(c);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const p = new THREE.Vector3(lc.x - 1.5 + i + (Math.random() - 0.5) * 0.3, 0, lc.z - 1.5 + j + (Math.random() - 0.5) * 0.3);
      positions.push(p);
      m.makeTranslation(p.x, -0.9, p.z);
      cones.setMatrixAt(idx, m);
      m.makeTranslation(p.x, 0.01, p.z);
      holes.setMatrixAt(idx, m);
      idx++;
    }
  }
  cones.instanceMatrix.needsUpdate = true;
  holes.instanceMatrix.needsUpdate = true;
  frame.group.add(cones, holes);
  return base(frame, delay, () => { fx.sound('spike'); fx.shake(0.4); }, (t) => {
    if (t < 0) return;
    const k = easeOut(clamp01(t / (delay * 0.7)));
    const y = -0.9 + k * 1.6;
    positions.forEach((p, i) => { m.makeTranslation(p.x, y, p.z); cones.setMatrixAt(i, m); });
    cones.instanceMatrix.needsUpdate = true;
  });
}

function buildCrusher(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.crusher.delay;
  const geo = new THREE.BoxGeometry(0.35, WALL_H, CELL * 1.5);
  const l = new THREE.Mesh(geo, mats.metal);
  const r = new THREE.Mesh(geo, mats.metal);
  l.position.set(-CELL / 2 + 0.18, WALL_H / 2, 0);
  r.position.set(CELL / 2 - 0.18, WALL_H / 2, 0);
  frame.group.add(l, r);
  // spikes on plates
  const sg = new THREE.ConeGeometry(0.12, 0.5, 5);
  for (let i = 0; i < 12; i++) {
    const a = new THREE.Mesh(sg, mats.metal);
    a.rotation.z = -Math.PI / 2; a.position.set(0.3, 0.6 + (i % 4) * 0.7, -2 + Math.floor(i / 4) * 2);
    l.add(a);
    const b = new THREE.Mesh(sg, mats.metal);
    b.rotation.z = Math.PI / 2; b.position.set(-0.3, 0.6 + (i % 4) * 0.7, -2 + Math.floor(i / 4) * 2);
    r.add(b);
  }
  let slammed = false;
  return base(frame, delay, () => fx.sound('rumble'), (t) => {
    if (t < 0) return;
    const k = Math.pow(clamp01(t / delay), 2.2);
    const x = (CELL / 2 - 0.18) * (1 - k) + 0.25 * k;
    l.position.x = -x; r.position.x = x;
    if (!slammed && k >= 1) { slammed = true; fx.shake(1.2); fx.sound('slam'); fx.burst(frame.origin.clone().setY(1), 40, 0x9aa0b0, { speed: 5, up: 4, spread: 1 }); }
  });
}

function buildArrows(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.arrows.delay;
  const holeGeo = new THREE.BoxGeometry(0.08, 0.22, 0.22);
  const arrowGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.3, 5);
  const tipGeo = new THREE.ConeGeometry(0.07, 0.22, 5);
  const side = Math.random() < 0.5 ? -1 : 1;
  const arrows: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const y = 0.7 + (i % 4) * 0.45, z = -1.2 + Math.floor(i / 4) * 1.6 + (Math.random() - 0.5) * 0.5;
    const hole = new THREE.Mesh(holeGeo, mats.dark);
    hole.position.set(side * (CELL / 2 - 0.02), y, z);
    frame.group.add(hole);
    const a = new THREE.Group();
    const shaft = new THREE.Mesh(arrowGeo, mats.wood);
    shaft.rotation.z = Math.PI / 2;
    const tip = new THREE.Mesh(tipGeo, mats.metal);
    tip.rotation.z = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    tip.position.x = -side * 0.7;
    a.add(shaft, tip);
    a.position.set(side * (CELL / 2 + 0.8), y, z);
    a.visible = false;
    frame.group.add(a);
    arrows.push(a);
  }
  let fired = false;
  return base(frame, delay, () => { fx.sound('whoosh'); }, (t, dt) => {
    if (t < 0) return;
    if (t > 0.12 && !fired) { fired = true; arrows.forEach((a) => (a.visible = true)); fx.sound('spike'); }
    if (fired) {
      for (const a of arrows) {
        a.position.x -= side * 14 * dt;
        if (Math.abs(a.position.x) > CELL / 2 - 0.2 && Math.sign(a.position.x) !== side) a.position.x = -side * (CELL / 2 - 0.2);
      }
    }
  });
}

function buildLava(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.lava.delay;
  const cells = frame.cellsIn(TRAPS.lava.killFrom, TRAPS.lava.killTo);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b1a1a, emissive: 0xff5a1f, emissiveIntensity: 0.12, roughness: 0.9 });
  const tiles: THREE.Mesh[] = [];
  for (const c of cells) {
    const lc = frame.cellLocal(c);
    const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.3, 0.06, CELL - 0.3), mat);
    tile.position.set(lc.x, 0.04, lc.z);
    frame.group.add(tile);
    tiles.push(tile);
  }
  void mats;
  let emberT = 0;
  return base(frame, delay, () => fx.sound('rumble'), (t, dt) => {
    if (t < 0) { mat.emissiveIntensity = 0.12 + Math.sin(performance.now() * 0.003) * 0.04; return; }
    const k = clamp01(t / delay);
    mat.emissiveIntensity = 0.12 + k * 2.2;
    mat.color.setHex(k > 0.5 ? 0xff7a1f : 0x2b1a1a);
    emberT += dt;
    if (emberT > 0.08) {
      emberT = 0;
      const tile = tiles[Math.floor(Math.random() * tiles.length)];
      const wp = tile.getWorldPosition(new THREE.Vector3());
      fx.burst(wp.setY(0.2), 4, 0xff8c3a, { speed: 1, up: 4, spread: 3, gravity: 3, life: 1 });
    }
  });
}

function buildBomb(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.bomb.delay;
  const barrel = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 1.2, 12), mats.wood);
  const band1 = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.1, 12), mats.metal);
  const band2 = band1.clone();
  band1.position.y = 0.4; band2.position.y = -0.4;
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), mats.dark);
  fuse.position.set(0.15, 0.85, 0); fuse.rotation.z = -0.4;
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), sparkMat);
  spark.position.set(0.27, 1.12, 0);
  barrel.add(body, band1, band2, fuse, spark);
  barrel.position.set(1.2, 0.6, -0.5);
  frame.group.add(barrel);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 }));
  flash.visible = false;
  flash.position.copy(barrel.position);
  frame.group.add(flash);
  let exploded = false, sparkT = 0;
  return base(frame, delay, () => fx.sound('fuse'), (t, dt) => {
    if (t < 0) { spark.visible = Math.floor(performance.now() / 150) % 2 === 0; return; }
    sparkT += dt;
    if (sparkT > 0.05 && !exploded) {
      sparkT = 0;
      fx.burst(spark.getWorldPosition(new THREE.Vector3()), 3, 0xffd166, { speed: 1.5, up: 1.5, spread: 0.1, gravity: 4, life: 0.4 });
    }
    if (!exploded && t >= delay) {
      exploded = true;
      barrel.visible = false;
      flash.visible = true;
      fx.shake(1.6);
      fx.sound('boom');
      const wp = flash.getWorldPosition(new THREE.Vector3());
      fx.burst(wp, 120, 0xff8c3a, { speed: 10, up: 8, spread: 1, life: 1.4 });
      fx.burst(wp, 60, 0x3a3346, { speed: 5, up: 6, spread: 1, life: 2, gravity: 2 });
    }
    if (exploded) {
      const k = clamp01((t - delay) / 0.35);
      flash.scale.setScalar(1 + k * 5);
      (flash.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (k >= 1) flash.visible = false;
    }
  });
}

function buildLaser(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.laser.delay;
  const emitGeo = new THREE.BoxGeometry(0.1, 0.16, 0.16);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2040, transparent: true, opacity: 0.85 });
  const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, CELL, 6);
  const beams: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const y = 0.5 + i * 0.55;
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(emitGeo, mats.red);
      e.position.set(s * (CELL / 2 - 0.05), y, 0);
      frame.group.add(e);
    }
    const b = new THREE.Mesh(beamGeo, beamMat);
    b.rotation.z = Math.PI / 2;
    b.position.set(0, y, 0);
    b.visible = false;
    frame.group.add(b);
    beams.push(b);
  }
  return base(frame, delay, () => { fx.sound('laser'); beams.forEach((b) => (b.visible = true)); }, (t) => {
    if (t < 0) return;
    const k = clamp01(t / delay);
    beams.forEach((b, i) => {
      b.position.z = Math.sin(k * Math.PI * 2 + i) * 1.5;
      b.rotation.y = Math.sin(t * 6 + i) * 0.3;
    });
    beamMat.opacity = 0.6 + Math.sin(t * 40) * 0.3;
  });
}

function buildMimic(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.mimic.delay;
  const chest = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.9), mats.wood);
  body.position.y = 0.35;
  const lid = new THREE.Group();
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.9), mats.wood);
  lidMesh.position.set(0, 0.17, 0.45);
  lid.add(lidMesh);
  lid.position.set(0, 0.7, -0.45);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.12, 0.94), mats.gold);
  band.position.y = 0.55;
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.1), mats.gold);
  lock.position.set(0, 0.5, 0.48);
  chest.add(body, lid, band, lock);
  // Readable tells (visible BEFORE it strikes):
  // a greasy grin seam along the lid, and two amber eyes that blink as you approach.
  const grin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.06), mats.dark);
  grin.position.set(0, 0.7, 0.47);
  chest.add(grin);
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * 0.28, 0.86, 0.49);
    chest.add(eye);
    eyes.push(eye);
  }
  const toothGeo = new THREE.ConeGeometry(0.06, 0.25, 4);
  for (let i = 0; i < 7; i++) {
    // small teeth peeking through the seam — always visible if you look closely
    const peekMat = i % 2 === 0 ? mats.bone : mats.dark;
    const t1 = new THREE.Mesh(toothGeo, peekMat);
    t1.scale.setScalar(0.55);
    t1.position.set(-0.48 + i * 0.16, 0.7, 0.49);
    t1.rotation.x = Math.PI;
    chest.add(t1);
    const t2 = new THREE.Mesh(toothGeo, mats.bone);
    t2.position.set(-0.55 + i * 0.18, -0.05, 0.85);
    t2.visible = false;
    lid.add(t2);
  }
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.7), mats.red);
  tongue.position.set(0, 0.72, 0.1);
  tongue.visible = false;
  chest.add(tongue);
  chest.position.set(0, 0, 0.4);
  frame.group.add(chest);
  return base(frame, delay, () => {
    fx.sound('chomp');
    chest.traverse((o) => { o.visible = true; });
    grin.visible = false;
  }, (t) => {
    if (t < 0) {
      // nervous "breathing" + blinking eyes — it's watching you
      const now = performance.now();
      chest.scale.y = 1 + Math.sin(now * 0.004) * 0.035;
      chest.rotation.y = Math.sin(now * 0.0011) * 0.03;
      const blink = (now % 2600) > 2480;
      eyes.forEach((e) => (e.visible = !blink));
      return;
    }
    const k = clamp01(t / delay);
    lid.rotation.x = -easeOut(k) * 1.4;
    chest.position.z = 0.4 + easeOut(k) * 3.2;
    chest.scale.setScalar(1 + k * 1.2);
    if (k >= 1) lid.rotation.x = -0.2 - Math.abs(Math.sin(t * 25)) * 1.2;
  });
}

function buildCeiling(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.ceiling.delay;
  const len = CELL * 3;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.15, 0.8, len), mats.metal);
  slab.position.set(0, WALL_H - 0.5, -CELL / 2);
  frame.group.add(slab);
  const chainGeo = new THREE.CylinderGeometry(0.05, 0.05, 18, 5);
  const chains: THREE.Mesh[] = [];
  for (const [x, z] of [[-1.4, -5], [1.4, -5], [-1.4, 4], [1.4, 4]]) {
    const ch = new THREE.Mesh(chainGeo, mats.dark);
    ch.position.set(x, 9, z);
    slab.add(ch);
    chains.push(ch);
  }
  const spikeGeo = new THREE.ConeGeometry(0.15, 0.6, 5);
  for (let i = 0; i < 18; i++) {
    const s = new THREE.Mesh(spikeGeo, mats.metal);
    s.rotation.x = Math.PI;
    s.position.set(-1.2 + (i % 3) * 1.2, -0.7, -5 + Math.floor(i / 3) * 2);
    slab.add(s);
  }
  let hit = false;
  return base(frame, delay, () => { fx.sound('rumble'); fx.shake(0.3); }, (t) => {
    if (t < 0) return;
    const k = Math.pow(clamp01(t / delay), 1.6);
    slab.position.y = (WALL_H - 0.5) * (1 - k) + 0.5 * k;
    if (!hit && k >= 1) { hit = true; fx.shake(1.4); fx.sound('slam'); fx.burst(frame.origin.clone().setY(0.6), 50, 0x8a8496, { speed: 7, up: 3, spread: 3 }); }
  });
}

function buildGas(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.gas.delay;
  for (const s of [-1, 1]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.9), mats.dark);
    vent.position.set(s * (CELL / 2 - 0.06), 1.0, 0);
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.75), mats.green);
    grill.position.x = -s * 0.05;
    vent.add(grill);
    frame.group.add(vent);
  }
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0x5ee06a, transparent: true, opacity: 0, depthWrite: false });
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), cloudMat);
  cloud.position.set(0, 1.2, -CELL / 2);
  frame.group.add(cloud);
  let pt = 0;
  return base(frame, delay, () => fx.sound('fuse'), (t, dt) => {
    if (t < 0) return;
    const k = clamp01(t / (delay * 1.3));
    cloud.scale.set(2 + k * 2, 1 + k * 3, 3 + k * 8);
    cloudMat.opacity = Math.min(0.55, k * 0.8);
    pt += dt;
    if (pt > 0.05) {
      pt = 0;
      for (const s of [-1, 1]) {
        const wp = frame.group.localToWorld(new THREE.Vector3(s * (CELL / 2 - 0.3), 1.0, 0));
        fx.burst(wp, 4, 0x7be495, { speed: 3, up: 1, spread: 0.3, gravity: -0.5, life: 1.5 });
      }
    }
  });
}

function buildGravity(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.gravity.delay;
  const pebGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const pebbles: { m: THREE.Mesh; base: number; ph: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(pebGeo, mats.rock);
    const base = 0.8 + Math.random() * 1.5;
    m.position.set((Math.random() - 0.5) * 3, base, (Math.random() - 0.5) * 3);
    frame.group.add(m);
    pebbles.push({ m, base, ph: Math.random() * 6 });
  }
  return base(frame, delay, () => fx.sound('whoosh'), (t, dt) => {
    const now = performance.now() * 0.002;
    for (const p of pebbles) {
      if (t < 0) { p.m.position.y = p.base + Math.sin(now + p.ph) * 0.2; p.m.rotation.y += dt; }
      else { p.m.position.y += (8 + p.ph) * dt; p.m.rotation.x += dt * 3; }
    }
  });
}

function buildZap(exit: Exit, triggerIndex: number, mats: Mats, fx: FX): TrapInstance {
  const frame = makeFrame(exit, triggerIndex);
  const delay = TRAPS.zap.delay;
  const cells = frame.cellsIn(TRAPS.zap.killFrom, TRAPS.zap.killTo);
  for (const c of cells) {
    const lc = frame.cellLocal(c);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.4, 0.06, CELL - 0.4), mats.metal);
    plate.position.set(lc.x, 0.03, lc.z);
    frame.group.add(plate);
  }
  const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, mats.metal);
    post.position.set(s * (CELL / 2 - 0.2), 1.1, 0);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.metal);
    ball.position.y = 1.15;
    post.add(ball);
    frame.group.add(post);
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0x7ee8ff, transparent: true, opacity: 0.95 });
  const lines: THREE.Line[] = [];
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3));
    const line = new THREE.Line(geo, lineMat);
    line.visible = false;
    frame.group.add(line);
    lines.push(line);
  }
  return base(frame, delay, () => { fx.sound('zap'); lines.forEach((l) => (l.visible = true)); }, (t) => {
    if (t < 0) return;
    lineMat.opacity = 0.6 + Math.random() * 0.4;
    for (const l of lines) {
      const arr = (l.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const z0 = (Math.random() - 0.5) * 6;
      for (let i = 0; i < 10; i++) {
        const k = i / 9;
        arr[i * 3] = -CELL / 2 + k * CELL + (Math.random() - 0.5) * 0.4;
        arr[i * 3 + 1] = 0.2 + Math.random() * 2.0;
        arr[i * 3 + 2] = z0 + (Math.random() - 0.5) * 1.5;
      }
      (l.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });
}

export function buildTrap(type: TrapType, exit: Exit, mats: Mats, fx: FX): TrapInstance {
  const ti = exit.triggerIndex;
  switch (type) {
    case 'boulder': case 'piano': case 'anvil': case 'safe': return buildFaller(type, exit, ti, mats, fx);
    case 'pit': return buildPit(exit, ti, mats, fx);
    case 'spikes': return buildSpikes(exit, ti, mats, fx, TRAPS.spikes.killFrom, TRAPS.spikes.killTo, TRAPS.spikes.delay);
    case 'crusher': return buildCrusher(exit, ti, mats, fx);
    case 'arrows': return buildArrows(exit, ti, mats, fx);
    case 'lava': return buildLava(exit, ti, mats, fx);
    case 'bomb': return buildBomb(exit, ti, mats, fx);
    case 'laser': return buildLaser(exit, ti, mats, fx);
    case 'mimic': return buildMimic(exit, ti, mats, fx);
    case 'ceiling': return buildCeiling(exit, ti, mats, fx);
    case 'gas': return buildGas(exit, ti, mats, fx);
    case 'gravity': return buildGravity(exit, ti, mats, fx);
    case 'zap': return buildZap(exit, ti, mats, fx);
  }
}

// Harmless scares on the safe path, placed behind the trigger point.
export function buildScare(exit: Exit, mats: Mats, fx: FX): TrapInstance | null {
  if (!exit.scare) return null;
  const behind = Math.max(0, exit.triggerIndex - 1);
  if (exit.scare === 'boulderBehind') return buildFaller('boulder', { ...exit, triggerIndex: behind }, behind, mats, fx, true);
  if (exit.scare === 'spikesBehind') return buildSpikes({ ...exit, triggerIndex: behind }, behind, mats, fx, behind - 1, behind, 0.4);
  return null;
}
