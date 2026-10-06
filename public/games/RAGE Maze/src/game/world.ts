import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CELL, DIRS, WALL_H, key, type Cell, type Exit, type Hub, type MazeData, type Side } from './types';
import { GRAFFITI, ZONES } from './content';
import { RNG } from './rng';
import {
  makeBrickTexture, makeFloorTexture, makeCrackedTexture, makeMetalTexture, makeSignTexture, makeTapeTexture,
  makeArrowTexture, makeSkullTexture, makeExitSignTexture, makeLabelTexture, makeGraffitiTexture,
} from './textures';
import { buildTrap, buildScare, type FX, type Mats, type TrapInstance } from './traps';

export interface Coin {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  taken: boolean;
}

export interface LightDef {
  pos: THREE.Vector3;
  color: number;
  intensity: number;
  distance: number;
  decay: number;
  flicker: boolean;
}

export interface HubView {
  hub: Hub;
  group: THREE.Group;
  traps: Map<Side, TrapInstance>;
  scare: TrapInstance | null;
  coins: Coin[];
  lights: LightDef[];
  colliders: { x: number; z: number; r: number }[];
  disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[];
  gate: { mesh: THREE.Group; t: number; done: boolean } | null;
  torchFlames: THREE.Mesh[];
  portal: THREE.Mesh | null;
}

export const ROT_FOR_DIR = (dir: number) => -dir * Math.PI / 2;
export const GATE_UP_Y = WALL_H / 2 + WALL_H + 0.3;
export const GATE_DOWN_Y = WALL_H / 2;

export class WorldBuilder {
  brick: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  mats: Mats;
  tapeTex: THREE.Texture;
  arrowTex: THREE.Texture;
  skullTex: THREE.Texture;
  exitTex: THREE.Texture;
  flameMat: THREE.MeshBasicMaterial;
  coinGeo: THREE.CylinderGeometry;
  private wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
  private floorGeo = new THREE.PlaneGeometry(CELL, CELL);
  private labelCache = new Map<string, THREE.Texture>();
  private graffitiTex: THREE.Texture[] = [];
  private graffitiMat: THREE.MeshBasicMaterial[] = [];
  private zoneMatCache = new Map<number, { brick: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial }>();

  zoneOf(index: number): number {
    return Math.floor(index / 10) % ZONES.length;
  }

  constructor(private maze: MazeData, private fx: FX) {
    const brickTex = makeBrickTexture();
    brickTex.repeat.set(1, 2.25);
    this.brick = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95, metalness: 0.02 });
    const floorTex = makeFloorTexture();
    this.floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 });
    const crackedTex = makeCrackedTexture();
    const metalTex = makeMetalTexture();
    this.mats = {
      metal: new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.5, metalness: 0.7 }),
      cracked: new THREE.MeshStandardMaterial({ map: crackedTex, roughness: 0.95 }),
      rock: new THREE.MeshStandardMaterial({ color: 0x8a8496, roughness: 1, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: 0x141118, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.3, metalness: 0.8, emissive: 0x553300, emissiveIntensity: 0.4 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.6 }),
      red: new THREE.MeshStandardMaterial({ color: 0xff3b5c, emissive: 0xff1030, emissiveIntensity: 0.8 }),
      green: new THREE.MeshStandardMaterial({ color: 0x7be495, emissive: 0x2fae5a, emissiveIntensity: 0.8 }),
      bone: new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.7 }),
    };
    this.tapeTex = makeTapeTexture();
    this.arrowTex = makeArrowTexture();
    this.skullTex = makeSkullTexture();
    this.exitTex = makeExitSignTexture();
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
    // shared pool of graffiti textures (blood-red / chalk / ectoplasm scrawls)
    const rng = new RNG(maze.seed ^ 0x5f3759df);
    const pool = rng.shuffle([...GRAFFITI]);
    const colors = ['#ff6a4d', '#e8e4d8', '#9fe8a8', '#ffb347'];
    for (let i = 0; i < 16; i++) {
      const tex = makeGraffitiTexture(pool[i % pool.length], colors[i % colors.length], rng.chance(0.7));
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      this.graffitiTex.push(tex);
      this.graffitiMat.push(mat);
    }
  }

  private zoneMats(zone: number) {
    let m = this.zoneMatCache.get(zone);
    if (!m) {
      const tint = new THREE.Color(ZONES[zone].tint);
      const brick = this.brick.clone();
      brick.color.copy(tint);
      const floor = this.floor.clone();
      floor.color.copy(tint).multiplyScalar(0.9);
      m = { brick, floor };
      this.zoneMatCache.set(zone, m);
    }
    return m;
  }

  hubCells(hub: Hub): Cell[] {
    const cells: Cell[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) cells.push({ x: hub.cx + dx, z: hub.cz + dz });
    for (const e of hub.exits) cells.push(...e.cells);
    return cells;
  }

  build(hub: Hub): HubView {
    const group = new THREE.Group();
    const view: HubView = {
      hub, group, traps: new Map(), scare: null, coins: [], lights: [], colliders: [], disposables: [], gate: null, torchFlames: [], portal: null,
    };
    const cells = this.hubCells(hub);
    const i = hub.index;

    // ---- walls (merged). Shared boundary cells between hubs are drawn by both;
    // identical geometry produces identical depth so there is no z-fighting.
    const wallGeos: THREE.BufferGeometry[] = [];
    const seen = new Set<string>();
    for (const c of cells) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const k = key(c.x + dx, c.z + dz);
        if (this.maze.walkable.has(k) || seen.has(k)) continue;
        seen.add(k);
        const g = this.wallGeo.clone();
        g.translate((c.x + dx) * CELL, WALL_H / 2, (c.z + dz) * CELL);
        wallGeos.push(g);
      }
    }
    const zm = this.zoneMats(this.zoneOf(i));
    if (wallGeos.length) {
      const merged = mergeGeometries(wallGeos, false)!;
      wallGeos.forEach((g) => g.dispose());
      const walls = new THREE.Mesh(merged, zm.brick);
      group.add(walls);
      view.disposables.push(merged);
    }

    // ---- floor (merged) ----
    const floorGeos: THREE.BufferGeometry[] = [];
    for (const c of cells) {
      const g = this.floorGeo.clone();
      g.rotateX(-Math.PI / 2);
      g.translate(c.x * CELL, 0, c.z * CELL);
      floorGeos.push(g);
    }
    const fmerged = mergeGeometries(floorGeos, false)!;
    floorGeos.forEach((g) => g.dispose());
    group.add(new THREE.Mesh(fmerged, zm.floor));
    view.disposables.push(fmerged);

    const center = new THREE.Vector3(hub.cx * CELL, 0, hub.cz * CELL);
    const F = DIRS[hub.facing];
    const R = DIRS[(hub.facing + 1) % 4];

    // ---- room light + torches ----
    view.lights.push({ pos: center.clone().setY(4.2), color: hub.dark ? 0x4a3f7a : 0xffa050, intensity: hub.dark ? 4 : 24, distance: 28, decay: 1.6, flicker: !hub.dark });
    if (!hub.dark) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const p = center.clone().add(new THREE.Vector3(sx * (CELL * 1.5 - 0.35), 2.6, sz * (CELL * 1.5 - 0.35)));
        this.addTorch(group, view, p);
      }
    }

    // ---- signs ----
    hub.signs.forEach((sign, si) => {
      const n = hub.signs.length;
      const off = (si - (n - 1) / 2) * 2.6;
      const pos = center.clone()
        .add(new THREE.Vector3(F.x, 0, F.z).multiplyScalar(0.6))
        .add(new THREE.Vector3(R.x, 0, R.z).multiplyScalar(off));
      this.addSign(group, view, sign, pos, hub.facing);
    });

    // ---- exits ----
    for (const e of hub.exits) this.buildExit(hub, e, view);

    // ---- graffiti scrawled on the walls ----
    this.placeGraffiti(hub, view, cells);

    // ---- gate (drops behind the player when entering) ----
    if (i > 0) {
      const prev = this.maze.hubs[i - 1];
      const safe = prev.exits.find((x) => !x.deadly)!;
      const last = safe.cells[safe.cells.length - 1];
      const d = DIRS[hub.facing];
      const gate = this.makeGate();
      gate.position.set((last.x + d.x * 0.5) * CELL, GATE_UP_Y, (last.z + d.z * 0.5) * CELL);
      gate.rotation.y = ROT_FOR_DIR(hub.facing);
      group.add(gate);
      view.gate = { mesh: gate, t: 0, done: false };
    }

    // ---- final portal ----
    if (hub.isFinal) {
      const e = hub.exits[0];
      const last = e.cells[e.cells.length - 1];
      const d = DIRS[e.dir];
      const portalMat = new THREE.MeshBasicMaterial({ color: 0x7be495, transparent: true, opacity: 0.85 });
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5), portalMat);
      portal.position.set((last.x + d.x * 0.45) * CELL, 2.5, (last.z + d.z * 0.45) * CELL);
      portal.rotation.y = ROT_FOR_DIR(e.dir);
      group.add(portal);
      view.portal = portal;
      view.disposables.push(portalMat);
      view.lights.push({ pos: portal.position.clone(), color: 0x7be495, intensity: 30, distance: 30, decay: 1.5, flicker: false });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.8, 5.6, 0.3), this.mats.gold);
      frame.position.copy(portal.position).add(new THREE.Vector3(d.x, 0, d.z).multiplyScalar(0.25));
      frame.rotation.y = ROT_FOR_DIR(e.dir);
      group.add(frame);
    }

    return view;
  }

  private addTorch(group: THREE.Group, view: HubView, p: THREE.Vector3) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.9, 6), this.mats.wood);
    stick.position.copy(p);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 7), this.flameMat);
    flame.position.copy(p).add(new THREE.Vector3(0, 0.65, 0));
    group.add(stick, flame);
    view.torchFlames.push(flame);
  }

  private addSign(group: THREE.Group, view: HubView, sign: Hub['signs'][number], pos: THREE.Vector3, facing: number) {
    const tex = makeSignTexture(sign);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: sign.style === 'neon' ? 0xff4fd8 : 0x000000, emissiveMap: sign.style === 'neon' ? tex : null, emissiveIntensity: 0.6 });
    view.disposables.push(tex, mat);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), this.mats.wood);
    post.position.copy(pos).setY(0.8);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 0.1), this.mats.wood);
    board.position.copy(pos).setY(1.85);
    board.rotation.y = ROT_FOR_DIR(facing);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), mat);
    face.position.z = 0.06;
    board.add(face);
    group.add(post, board);
    view.colliders.push({ x: pos.x, z: pos.z, r: 0.55 });
  }

  private makeGate(): THREE.Group {
    const g = new THREE.Group();
    const barGeo = new THREE.BoxGeometry(0.14, WALL_H, 0.14);
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const b = barGeo.clone();
      b.translate(-CELL / 2 + 0.3 + i * ((CELL - 0.6) / 6), 0, 0);
      geos.push(b);
    }
    for (let j = 0; j < 4; j++) {
      const h = new THREE.BoxGeometry(CELL, 0.14, 0.14);
      h.translate(0, -WALL_H / 2 + 0.6 + j * 2.4, 0);
      geos.push(h);
    }
    const merged = mergeGeometries(geos, false)!;
    geos.forEach((x) => x.dispose());
    g.add(new THREE.Mesh(merged, this.mats.metal));
    return g;
  }

  private buildExit(hub: Hub, e: Exit, view: HubView) {
    const group = view.group;
    const d = DIRS[e.dir];
    const dv = new THREE.Vector3(d.x, 0, d.z);
    const rv = new THREE.Vector3(DIRS[(e.dir + 1) % 4].x, 0, DIRS[(e.dir + 1) % 4].z);
    const center = new THREE.Vector3(hub.cx * CELL, 0, hub.cz * CELL);
    const doorway = center.clone().add(dv.clone().multiplyScalar(CELL * 1.5));
    const c0 = new THREE.Vector3(e.cells[0].x * CELL, 0, e.cells[0].z * CELL);

    // trap / scare
    if (e.deadly && e.trap) {
      const t = buildTrap(e.trap, e, this.mats, this.fx);
      group.add(t.group);
      view.traps.set(e.side, t);
      // fake door at dead end
      const last = e.cells[e.cells.length - 1];
      const prev = e.cells[e.cells.length - 2];
      const ld = new THREE.Vector3(last.x - prev.x, 0, last.z - prev.z);
      const door = new THREE.Mesh(new THREE.BoxGeometry(2, 3.4, 0.12), this.mats.dark);
      door.position.set(last.x * CELL, 1.7, last.z * CELL).add(ld.clone().multiplyScalar(CELL / 2 - 0.08));
      const ldir = DIRS.findIndex((x) => x.x === ld.x && x.z === ld.z);
      door.rotation.y = ROT_FOR_DIR(ldir);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), this.mats.gold);
      knob.position.set(0.7, 0, 0.1);
      door.add(knob);
      group.add(door);
    } else if (!hub.isFinal) {
      const s = buildScare(e, this.mats, this.fx);
      if (s) { group.add(s.group); view.scare = s; }
    }

    // already-known-deadly marker (after death)
    if (e.deaths > 0) this.addSkull(view, e);

    // label plaque
    if (e.label) {
      let tex = this.labelCache.get(e.label);
      if (!tex) { tex = makeLabelTexture(e.label); this.labelCache.set(e.label, tex); }
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      plaque.position.copy(doorway).sub(dv.clone().multiplyScalar(0.06)).setY(3.6);
      plaque.rotation.y = ROT_FOR_DIR(e.dir);
      group.add(plaque);
    }

    switch (e.decor) {
      case 'torches': {
        for (const s of [-1, 1]) {
          const p = c0.clone().add(rv.clone().multiplyScalar(s * (CELL / 2 - 0.35))).setY(2.6);
          this.addTorch(group, view, p);
        }
        view.lights.push({ pos: c0.clone().setY(3), color: 0xffa050, intensity: 14, distance: 16, decay: 1.6, flicker: true });
        break;
      }
      case 'exitSign': {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.75), new THREE.MeshBasicMaterial({ map: this.exitTex }));
        m.position.copy(doorway).sub(dv.clone().multiplyScalar(0.06)).setY(3.7);
        m.rotation.y = ROT_FOR_DIR(e.dir);
        group.add(m);
        view.lights.push({ pos: m.position.clone().sub(dv.clone().multiplyScalar(0.8)), color: 0x7be495, intensity: 6, distance: 10, decay: 1.6, flicker: false });
        break;
      }
      case 'coins': {
        const n = Math.min(4, e.cells.length);
        for (let k = 0; k < n; k++) {
          const c = e.cells[k];
          const pos = new THREE.Vector3(c.x * CELL, 1.0, c.z * CELL).add(rv.clone().multiplyScalar(Math.sin(k * 1.7) * 0.8));
          const mesh = new THREE.Mesh(this.coinGeo, this.mats.gold);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.copy(pos);
          group.add(mesh);
          view.coins.push({ mesh, pos, taken: false });
        }
        break;
      }
      case 'cake': {
        const c = e.cells[Math.min(1, e.cells.length - 1)];
        const p = new THREE.Vector3(c.x * CELL, 0, c.z * CELL);
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.0, 10), this.mats.rock);
        ped.position.copy(p).setY(0.5);
        const cakeMat = new THREE.MeshStandardMaterial({ color: 0xff9ccf, roughness: 0.7 });
        const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16), cakeMat);
        cake.position.copy(p).setY(1.18);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 16), this.mats.white);
        top.position.copy(p).setY(1.48);
        const candle = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), this.flameMat);
        candle.position.copy(p).setY(1.78);
        view.disposables.push(cakeMat);
        group.add(ped, cake, top, candle);
        view.torchFlames.push(candle);
        view.colliders.push({ x: p.x, z: p.z, r: 0.7 });
        break;
      }
      case 'tape': {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL, 0.5), new THREE.MeshBasicMaterial({ map: this.tapeTex, side: THREE.DoubleSide }));
        m.position.copy(doorway).setY(1.1);
        m.rotation.y = ROT_FOR_DIR(e.dir);
        const m2 = m.clone();
        m2.position.setY(2.0);
        m2.rotation.z = 0.08;
        group.add(m, m2);
        break;
      }
      case 'arrow': {
        const g = new THREE.Group();
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: this.arrowTex, transparent: true, depthWrite: false }));
        plane.rotation.x = -Math.PI / 2;
        g.add(plane);
        g.position.copy(center).add(dv.clone().multiplyScalar(3.2)).setY(0.03);
        g.rotation.y = ROT_FOR_DIR(e.dir);
        group.add(g);
        break;
      }
      case 'skeleton': {
        const p = center.clone().add(rv.clone().multiplyScalar(-2.2)).add(dv.clone().multiplyScalar(-1.5));
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), this.mats.bone);
        skull.position.copy(p).setY(0.28);
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.5), this.mats.bone);
        rib.position.copy(p).add(new THREE.Vector3(0.7, 0.1, 0.1));
        const bone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), this.mats.bone);
        bone1.rotation.z = Math.PI / 2; bone1.rotation.y = 0.5;
        bone1.position.copy(p).add(new THREE.Vector3(1.4, 0.06, -0.3));
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 4), this.mats.red);
        hat.position.copy(skull.position).add(new THREE.Vector3(0, 0.35, 0));
        group.add(skull, rib, bone1, hat);
        break;
      }
    }
  }

  private placeGraffiti(hub: Hub, view: HubView, cells: Cell[]) {
    const rng = new RNG((this.maze.seed ^ (hub.index * 211 + 77)) >>> 0);
    let placed = 0;
    const max = hub.index === 0 ? 2 : rng.int(1, 3);
    for (const c of cells) {
      if (placed >= max) break;
      for (const d of DIRS) {
        if (placed >= max) break;
        const wk = key(c.x + d.x, c.z + d.z);
        if (this.maze.walkable.has(wk)) continue;
        // walls painted by this hub only, and not on doorway through-passages
        if (this.maze.wallOwner.get(wk) !== hub.index) continue;
        const behind = key(c.x - d.x, c.z - d.z);
        if (this.maze.walkable.has(behind)) continue;
        if (!rng.chance(0.06)) continue;
        const w = rng.int(0, 15);
        const mat = this.graffitiMat[w];
        const width = 1.6 + rng.next() * 1.6;
        const g = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.5), mat);
        const y = 0.9 + rng.next() * 1.9;
        g.position.set((c.x + d.x) * CELL - d.x * (CELL / 2 + 0.03), y, (c.z + d.z) * CELL - d.z * (CELL / 2 + 0.03));
        g.rotation.y = Math.atan2(-d.x, -d.z);
        g.renderOrder = 1;
        view.group.add(g);
        placed++;
      }
    }
  }

  addSkull(view: HubView, e: Exit) {
    const c = e.cells[0];
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.skullTex, transparent: true, depthWrite: false }));
    spr.position.set(c.x * CELL, 2.4, c.z * CELL);
    spr.scale.set(1.4, 1.4, 1);
    view.group.add(spr);
    view.lights.push({ pos: spr.position.clone(), color: 0xff3b5c, intensity: 6, distance: 8, decay: 2, flicker: true });
  }

  dispose(view: HubView) {
    view.group.traverse((o) => {
      if ((o as THREE.Sprite).isSprite) return;
      const m = o as THREE.Mesh;
      if (m.geometry && !(m.geometry === this.wallGeo || m.geometry === this.floorGeo || m.geometry === this.coinGeo)) {
        m.geometry.dispose();
      }
    });
    view.disposables.forEach((d) => d.dispose());
    view.group.removeFromParent();
  }

  disposeAll() {
    this.brick.map?.dispose(); this.brick.dispose();
    this.floor.map?.dispose(); this.floor.dispose();
    for (const m of Object.values(this.mats)) { m.map?.dispose(); m.dispose(); }
    this.tapeTex.dispose(); this.arrowTex.dispose(); this.skullTex.dispose(); this.exitTex.dispose();
    this.flameMat.dispose(); this.coinGeo.dispose(); this.wallGeo.dispose(); this.floorGeo.dispose();
    for (const t of this.labelCache.values()) t.dispose();
    this.graffitiTex.forEach((t) => t.dispose());
    this.graffitiMat.forEach((m) => m.dispose());
    for (const z of this.zoneMatCache.values()) { z.brick.dispose(); z.floor.dispose(); }
    this.zoneMatCache.clear();
  }
}
