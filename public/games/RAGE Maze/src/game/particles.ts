import * as THREE from 'three';

const MAX = 600;

export class Particles {
  points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private head = 0;
  private geo: THREE.BufferGeometry;

  constructor() {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.28, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -100;
  }

  emit(p: THREE.Vector3, count: number, color: THREE.Color | number, opts: { speed?: number; spread?: number; up?: number; gravity?: number; life?: number; jitter?: number } = {}) {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    const speed = opts.speed ?? 4, up = opts.up ?? 3, gravity = opts.gravity ?? 9, life = opts.life ?? 1, jitter = opts.jitter ?? 0.3;
    for (let n = 0; n < count; n++) {
      const i = this.head;
      this.head = (this.head + 1) % MAX;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * (opts.spread ?? 0.5);
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * (opts.spread ?? 0.5);
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * (opts.spread ?? 0.5);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = up * (0.4 + Math.random() * 0.8);
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      const j = 1 + (Math.random() - 0.5) * jitter;
      this.col[i * 3] = Math.min(1, c.r * j);
      this.col[i * 3 + 1] = Math.min(1, c.g * j);
      this.col[i * 3 + 2] = Math.min(1, c.b * j);
      this.life[i] = life * (0.6 + Math.random() * 0.6);
      this.maxLife[i] = this.life[i];
      this.grav[i] = gravity;
    }
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -100;
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.05 && this.grav[i] > 0) {
        this.pos[i * 3 + 1] = 0.05;
        this.vel[i * 3 + 1] *= -0.3;
        this.vel[i * 3] *= 0.7;
        this.vel[i * 3 + 2] *= 0.7;
      }
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
