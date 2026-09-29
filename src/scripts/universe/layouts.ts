// 六个场景的目标形态。
// 全站只有两种「物质」：粒子（核心尘）与晶片（核心）。每个场景只是它们的一种排列方式，
// 场景之间的过渡就是同一批粒子与晶片从一种排列形变到另一种排列。
import * as THREE from 'three';
import { CORES, EVENTS, FACTIONS, WORLDS, type Route } from './data';
import { X_JOIN, X_MAX, X_MIN, strandPoint, yearToX } from './chrono';
import { Rng, hexRGB, mixRGB } from './rand';

export const STAGES = 6;
export const SHARDS = 720;

type RGB = [number, number, number];
type V3 = [number, number, number];

export const PALETTE = {
  ink: '#1b2233',
  klein: '#1f3fae',
  pale: '#e6ecf8',
  violet: '#7b4fc9',
  amber: '#d99a2b',
  crimson: '#c63b3b',
  bronze: '#8b8574',
  muted: '#6a7388',
};

const C = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, hexRGB(v)])) as Record<keyof typeof PALETTE, RGB>;
const ROUTE_COLOR: Record<Route, RGB> = { wide: C.klein, tear: C.violet, merge: hexRGB('#2c3a6e') };

export interface ParticleLayout {
  pos: Float32Array;
  col: Float32Array; // rgba
}

export interface ShardLayout {
  pos: Float32Array;
  quat: Float32Array;
  scl: Float32Array;
  col: Float32Array;
  group: Int16Array;
  /** 自转：绕 pivot、axis 以 spin 角速度旋转 */
  pivot: Float32Array;
  axis: Float32Array;
  spin: Float32Array;
}

export type HotspotKind = 'point' | 'disc';
export interface Hotspot {
  stage: number;
  id: string;
  group: number;
  kind: HotspotKind;
  pos: THREE.Vector3; // 场景局部坐标（会随场景旋转）
  radius: number;
  label: string;
  sub: string;
  color: string;
  side?: 1 | -1;
  /** 标签锚点相对 pos 的竖直偏移（世界单位） */
  lift?: number;
  /** 额外的标签样式 */
  cls?: string;
  /** 仅作标注，不可点击 */
  tag?: boolean;
}

/* ---------------- 构建工具 ---------------- */

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);

class ShardBuilder {
  L: ShardLayout;
  constructor() {
    const n = SHARDS;
    this.L = {
      pos: new Float32Array(n * 3),
      quat: new Float32Array(n * 4),
      scl: new Float32Array(n * 3),
      col: new Float32Array(n * 3),
      group: new Int16Array(n).fill(-1),
      pivot: new Float32Array(n * 3),
      axis: new Float32Array(n * 3),
      spin: new Float32Array(n),
    };
    for (let i = 0; i < n; i++) {
      this.L.quat[i * 4 + 3] = 1;
      this.L.axis[i * 3 + 1] = 1;
    }
  }
  set(i: number, p: V3, dir: V3, twist: number, s: V3, col: RGB, group = -1) {
    const L = this.L;
    L.pos.set(p, i * 3);
    _v.set(dir[0], dir[1], dir[2]).normalize();
    _q.setFromUnitVectors(_Y, _v);
    _q2.setFromAxisAngle(_Y, twist);
    _q.multiply(_q2);
    L.quat[i * 4] = _q.x;
    L.quat[i * 4 + 1] = _q.y;
    L.quat[i * 4 + 2] = _q.z;
    L.quat[i * 4 + 3] = _q.w;
    L.scl.set(s, i * 3);
    L.col.set(col, i * 3);
    L.group[i] = group;
  }
  spin(i: number, pivot: V3, axis: V3, speed: number) {
    this.L.pivot.set(pivot, i * 3);
    _v.set(axis[0], axis[1], axis[2]).normalize();
    this.L.axis[i * 3] = _v.x;
    this.L.axis[i * 3 + 1] = _v.y;
    this.L.axis[i * 3 + 2] = _v.z;
    this.L.spin[i] = speed;
  }
}

class ParticleBuilder {
  L: ParticleLayout;
  i = 0;
  constructor(public n: number) {
    this.L = { pos: new Float32Array(n * 3), col: new Float32Array(n * 4) };
  }
  add(x: number, y: number, z: number, c: RGB, a: number) {
    if (this.i >= this.n) return;
    const i = this.i++;
    this.L.pos[i * 3] = x;
    this.L.pos[i * 3 + 1] = y;
    this.L.pos[i * 3 + 2] = z;
    this.L.col[i * 4] = c[0];
    this.L.col[i * 4 + 1] = c[1];
    this.L.col[i * 4 + 2] = c[2];
    this.L.col[i * 4 + 3] = a;
  }
  /** 按比例切分剩余粒子数 */
  counts(fracs: number[]): number[] {
    const out = fracs.map((f) => Math.floor(f * this.n));
    out[out.length - 1] += this.n - out.reduce((a, b) => a + b, 0);
    return out;
  }
  fillRest(fn: () => void) {
    while (this.i < this.n) fn();
  }
}

const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm3 = (a: V3): V3 => mul3(a, 1 / (len3(a) || 1));
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** 双锥（bipyramid）的三角面，法线朝外 */
function bipyramid(R: number, H: number, sides: number, phase = 0): { tri: [V3, V3, V3]; n: V3 }[] {
  const top: V3 = [0, H, 0];
  const bot: V3 = [0, -H, 0];
  const ring: V3[] = [];
  for (let k = 0; k < sides; k++) {
    const a = phase + (k / sides) * Math.PI * 2;
    ring.push([R * Math.cos(a), 0, R * Math.sin(a)]);
  }
  const faces: { tri: [V3, V3, V3]; n: V3 }[] = [];
  for (let k = 0; k < sides; k++) {
    const a = ring[k];
    const b = ring[(k + 1) % sides];
    for (const tri of [
      [top, a, b],
      [bot, b, a],
    ] as [V3, V3, V3][]) {
      let n = norm3(cross3(sub3(tri[1], tri[0]), sub3(tri[2], tri[0])));
      const c = mul3(add3(add3(tri[0], tri[1]), tri[2]), 1 / 3);
      if (dot3(n, c) < 0) n = mul3(n, -1);
      faces.push({ tri, n });
    }
  }
  return faces;
}

/** 把三角面细分为 n² 个小三角，返回每个小三角的重心 */
function tessellate(tri: [V3, V3, V3], n: number): { cells: V3[]; size: number } {
  const [A, B, Cc] = tri;
  const P = (a: number, b: number): V3 => add3(A, add3(mul3(sub3(B, A), a / n), mul3(sub3(Cc, A), b / n)));
  const cells: V3[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      cells.push(mul3(add3(add3(P(i, j), P(i + 1, j)), P(i, j + 1)), 1 / 3));
      if (i + j <= n - 2) cells.push(mul3(add3(add3(P(i + 1, j), P(i, j + 1)), P(i + 1, j + 1)), 1 / 3));
    }
  }
  const e = Math.min(len3(sub3(B, A)), len3(sub3(Cc, A)), len3(sub3(Cc, B))) / n;
  return { cells, size: e };
}

function ringBasis(normal: V3): [V3, V3] {
  const n = norm3(normal);
  const ref: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm3(cross3(ref, n));
  const w = cross3(n, u);
  return [u, w];
}

function rotYv(p: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}

/* ---------------- 场景 0 · 苍穹之核 ---------------- */

const GEM_R = 2.25;
const GEM_H = 3.3;
const RING_A = { r: 4.6, n: norm3([0, 1, 0.38]) as V3 };
const RING_B = { r: 5.9, n: norm3([0.55, 1, -0.2]) as V3 };

function shards0(): ShardLayout {
  const b = new ShardBuilder();
  const r = new Rng(11);
  const pale = hexRGB('#eef2fb');
  const blue = hexRGB('#9fb1e4');
  let i = 0;
  for (const f of bipyramid(GEM_R, GEM_H, 6, Math.PI / 6)) {
    const { cells, size } = tessellate(f.tri, 6);
    for (const c of cells) {
      const t = (c[1] + GEM_H) / (2 * GEM_H);
      let col = mixRGB(blue, pale, t * 0.9 + r.next() * 0.2);
      const roll = r.next();
      if (roll < 0.12) col = C.klein;
      else if (roll < 0.15) col = C.ink;
      const s = size * 0.95;
      b.set(i, add3(c, mul3(f.n, 0.02)), f.n, r.range(0, 1), [s, 0.07, s], col, 0);
      i++;
    }
  }
  const rings = [
    { ...RING_A, count: 160, speed: 0.16 },
    { ...RING_B, count: SHARDS - i - 160, speed: -0.1 },
  ];
  for (const ring of rings) {
    const [u, w] = ringBasis(ring.n);
    for (let k = 0; k < ring.count; k++) {
      const a = r.range(0, Math.PI * 2);
      const rr = ring.r + r.gauss() * 0.16;
      const p = add3(mul3(u, Math.cos(a) * rr), mul3(w, Math.sin(a) * rr));
      const tan = add3(mul3(u, -Math.sin(a)), mul3(w, Math.cos(a)));
      const roll = r.next();
      const col = roll < 0.55 ? C.klein : roll < 0.8 ? C.ink : hexRGB('#c8d3f0');
      b.set(i, add3(p, mul3(ring.n, r.gauss() * 0.08)), tan, r.range(0, 6), [0.08, r.range(0.2, 0.55), 0.08], col, 1);
      b.spin(i, [0, 0, 0], ring.n, ring.speed);
      i++;
    }
  }
  return b.L;
}

function particles0(n: number): ParticleLayout {
  const b = new ParticleBuilder(n);
  const r = new Rng(12);
  const [nIn, nEdge, nRing, nHalo] = b.counts([0.28, 0.12, 0.24, 0.36]);
  for (let k = 0; k < nIn; k++) {
    const y = GEM_H * (r.next() * 2 - 1) * Math.sqrt(r.next());
    const rad = GEM_R * (1 - Math.abs(y) / GEM_H) * 0.9 * Math.sqrt(r.next());
    const a = r.range(0, Math.PI * 2);
    b.add(Math.cos(a) * rad, y, Math.sin(a) * rad, r.next() < 0.8 ? C.klein : hexRGB('#4d6fe0'), r.range(0.45, 0.9));
  }
  const edges: [V3, V3][] = [];
  const ring: V3[] = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k / 6) * Math.PI * 2;
    ring.push([GEM_R * Math.cos(a), 0, GEM_R * Math.sin(a)]);
  }
  for (let k = 0; k < 6; k++) {
    edges.push([[0, GEM_H, 0], ring[k]], [[0, -GEM_H, 0], ring[k]], [ring[k], ring[(k + 1) % 6]]);
  }
  for (let k = 0; k < nEdge; k++) {
    const [p, q] = edges[k % edges.length];
    const t = r.next();
    b.add(p[0] + (q[0] - p[0]) * t + r.gauss() * 0.025, p[1] + (q[1] - p[1]) * t + r.gauss() * 0.025, p[2] + (q[2] - p[2]) * t + r.gauss() * 0.025, C.ink, r.range(0.6, 0.95));
  }
  for (let k = 0; k < nRing; k++) {
    const ringDef = k % 2 === 0 ? RING_A : RING_B;
    const [u, w] = ringBasis(ringDef.n);
    const a = r.range(0, Math.PI * 2);
    const rr = ringDef.r + r.gauss() * 0.2;
    const p = add3(add3(mul3(u, Math.cos(a) * rr), mul3(w, Math.sin(a) * rr)), mul3(ringDef.n, r.gauss() * 0.06));
    b.add(p[0], p[1], p[2], r.next() < 0.5 ? C.ink : C.klein, r.range(0.3, 0.65));
  }
  const d: V3 = [0, 0, 0];
  for (let k = 0; k < nHalo; k++) {
    r.dir(d);
    const rad = 4.2 + 12 * Math.pow(r.next(), 1.7);
    b.add(d[0] * rad, d[1] * rad * 0.62, d[2] * rad, r.next() < 0.18 ? C.klein : C.ink, r.range(0.12, 0.42));
  }
  return b.L;
}

/* ---------------- 场景 1 · 五种核心 ---------------- */

export const CAROUSEL_R = 6.2;
export function coreCenter(k: number): V3 {
  const a = (k / 5) * Math.PI * 2;
  return [Math.sin(a) * CAROUSEL_R, 0.2, Math.cos(a) * CAROUSEL_R];
}

function shards1(): ShardLayout {
  const b = new ShardBuilder();
  const r = new Rng(21);
  let i = 0;
  const PER = SHARDS / 5; // 144
  CORES.forEach((core, k) => {
    const ctr = coreCenter(k);
    const base = hexRGB(core.color);
    const put = (p: V3, dir: V3, twist: number, s: V3, col: RGB) => {
      b.set(i, add3(ctr, p), dir, twist, s, col, k);
      b.spin(i, ctr, [0, 1, 0], k % 2 ? -0.22 : 0.26);
      i++;
    };
    const start = i;
    if (core.id === 'planwaze') {
      // 晶簇：自底部放射生长的六方柱
      const tip = hexRGB('#e3bb5c');
      const deep = hexRGB('#c1507e');
      for (let j = 0; j < PER; j++) {
        const base0: V3 = [r.gauss() * 0.35, -1.1, r.gauss() * 0.35];
        const dir = norm3([r.gauss() * 0.5, 1, r.gauss() * 0.5]);
        const L = 0.5 + 1.7 * Math.pow(r.next(), 1.6);
        const roll = r.next();
        const col = roll < 0.15 ? tip : roll < 0.4 ? deep : roll < 0.55 ? hexRGB('#e6d3f1') : base;
        put(add3(base0, mul3(dir, L / 2)), dir, r.range(0, 6), [r.range(0.12, 0.26), L, r.range(0.12, 0.26)], col);
      }
    } else if (core.id === 'originate') {
      // 十六面体：八方双锥
      const light = hexRGB('#f4d796');
      for (const f of bipyramid(1.25, 1.75, 8, 0)) {
        const { cells, size } = tessellate(f.tri, 3);
        for (const c of cells) {
          const col = r.next() < 0.18 ? hexRGB('#b06f14') : mixRGB(base, light, r.next() * 0.8);
          put(add3(c, mul3(f.n, 0.02)), f.n, r.range(0, 6), [size * 0.95, 0.08, size * 0.95], col);
        }
      }
    } else if (core.id === 'echo') {
      // 球体 + 球状凝结核
      const outer = 110;
      const violet = hexRGB('#8d6ad6');
      for (let j = 0; j < outer; j++) {
        const y = 1 - (2 * (j + 0.5)) / outer;
        const rad = Math.sqrt(1 - y * y);
        const a = j * 2.39996;
        const nrm: V3 = [Math.cos(a) * rad, y, Math.sin(a) * rad];
        const roll = r.next();
        const col = roll < 0.3 ? violet : roll < 0.45 ? hexRGB('#d5dcf6') : base;
        put(mul3(nrm, 1.45), nrm, r.range(0, 6), [0.46, 0.07, 0.46], col);
      }
      for (let j = outer; j < PER; j++) {
        const d = norm3([r.gauss(), r.gauss(), r.gauss()]);
        put(mul3(d, 0.45 + r.next() * 0.12), d, r.range(0, 6), [0.2, 0.2, 0.2], hexRGB('#23307a'));
      }
    } else if (core.id === 'ironstone') {
      // 方形黄铁晶体：带阶梯纹理的立方体，斜立
      const gold = hexRGB('#b89c5a');
      const dark = hexRGB('#57544c');
      const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.62, 0.78, 0.2));
      const faces: [V3, V3, V3][] = [
        [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
        [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
        [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
        [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
        [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
      ];
      const h = 1.05;
      const cell = (2 * h) / 5;
      for (const [nrm, u, w] of faces) {
        let cnt = 0;
        for (let a = 0; a < 5; a++) {
          for (let c2 = 0; c2 < 5; c2++) {
            if (cnt >= 24) break;
            if (a === 2 && c2 === 2) continue;
            const step = (a + c2) % 3 === 0 ? 0.07 : 0;
            const p = add3(add3(mul3(nrm, h + step), mul3(u, -h + cell * (a + 0.5))), mul3(w, -h + cell * (c2 + 0.5)));
            const pv = new THREE.Vector3(...p).applyQuaternion(rot);
            const nv = new THREE.Vector3(...nrm).applyQuaternion(rot);
            const roll = r.next();
            const col = roll < 0.3 ? gold : roll < 0.45 ? dark : base;
            put([pv.x, pv.y, pv.z], [nv.x, nv.y, nv.z], Math.PI / 6, [cell * 1.02, 0.1, cell * 1.02], col);
            cnt++;
          }
        }
      }
    } else {
      // 不定型：从扭曲的核中刺出的晶棘
      const dark = hexRGB('#6e1a22');
      const hot = hexRGB('#e0806f');
      for (let j = 0; j < PER; j++) {
        const d = norm3([r.gauss(), r.gauss() * 1.2, r.gauss()]);
        const r0 = 0.55 + 0.3 * Math.sin(3 * d[0] + 2 * d[1]) * Math.cos(2 * d[2]);
        const L = 0.25 + 1.5 * Math.pow(r.next(), 2.4);
        const roll = r.next();
        const col = roll < 0.35 ? dark : roll < 0.45 ? hot : roll < 0.52 ? C.ink : base;
        put(mul3(d, r0 + L / 2), d, r.range(0, 6), [r.range(0.1, 0.24), L, r.range(0.1, 0.24)], col);
      }
    }
    while (i < start + PER) put([0, 0, 0], [0, 1, 0], 0, [0.001, 0.001, 0.001], base);
  });
  return b.L;
}

function particles1(n: number): ParticleLayout {
  const b = new ParticleBuilder(n);
  const r = new Rng(22);
  const [nAura, nRing, nFloor] = b.counts([0.56, 0.14, 0.3]);
  const d: V3 = [0, 0, 0];
  for (let k = 0; k < nAura; k++) {
    const ci = k % 5;
    const ctr = coreCenter(ci);
    const col = hexRGB(CORES[ci].color);
    r.dir(d);
    const tight = r.next() < 0.25;
    const rad = tight ? r.range(1.5, 1.95) : 1.9 + Math.abs(r.gauss()) * 0.95;
    b.add(ctr[0] + d[0] * rad, ctr[1] + d[1] * rad * 0.9, ctr[2] + d[2] * rad, col, tight ? r.range(0.5, 0.8) : r.range(0.18, 0.5));
  }
  for (let k = 0; k < nRing; k++) {
    let a = r.range(0, Math.PI * 2);
    if ((a * 60) / (Math.PI * 2) % 1 < 0.35) a += 0.05;
    const rad = CAROUSEL_R + r.gauss() * 0.1;
    b.add(Math.sin(a) * rad, -1.9 + r.gauss() * 0.04, Math.cos(a) * rad, C.ink, r.range(0.35, 0.6));
  }
  for (let k = 0; k < nFloor; k++) {
    let rad = 12 * Math.sqrt(r.next());
    if (r.next() < 0.6) rad = Math.round(rad / 1.1) * 1.1 + r.gauss() * 0.03;
    const a = r.range(0, Math.PI * 2);
    b.add(Math.cos(a) * rad, -3.1 + r.gauss() * 0.03, Math.sin(a) * rad, r.next() < 0.12 ? C.klein : C.ink, r.range(0.1, 0.3) * (1 - rad / 14));
  }
  return b.L;
}

/* ---------------- 场景 2 · 纪年 ---------------- */

export const RULER_Y = -2.9;

export function eventNode(e: { route: Route; year: number }): V3 {
  return strandPoint(e.route, yearToX(e.year), [0, 0, 0]);
}

function shards2(): ShardLayout {
  const b = new ShardBuilder();
  const r = new Rng(31);
  let i = 0;
  EVENTS.forEach((e, k) => {
    const p = eventNode(e);
    const col = ROUTE_COLOR[e.route];
    const up = e.route === 'tear' ? -1 : 1;
    b.set(i++, add3(p, [0, 0.42 * up, 0]), [0, up, 0], r.range(0, 6), [0.22, 0.85, 0.22], col, k);
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI * 2 + k;
      const dir = norm3([Math.cos(a) * 0.75, up, Math.sin(a) * 0.75]);
      b.set(i++, add3(p, mul3(dir, 0.28)), dir, r.range(0, 6), [0.11, 0.45, 0.11], mixRGB(col, C.pale, 0.35), k);
    }
  });
  const pt: V3 = [0, 0, 0];
  while (i < SHARDS) {
    const roll = r.next();
    const route: Route = roll < 0.38 ? 'wide' : roll < 0.7 ? 'tear' : 'merge';
    const x = route === 'merge' ? r.range(X_JOIN - 0.5, X_MAX + 1) : r.range(X_MIN - 1, X_JOIN);
    strandPoint(route, x, pt);
    const p: V3 = [pt[0], pt[1] + r.gauss() * 0.32, pt[2] + r.gauss() * 0.32];
    const col = r.next() < 0.3 ? C.pale : ROUTE_COLOR[route];
    b.set(i++, p, norm3([1, r.gauss() * 0.3, r.gauss() * 0.3]), r.range(0, 6), [0.05, r.range(0.12, 0.34), 0.05], col, -1);
  }
  return b.L;
}

function particles2(n: number): ParticleLayout {
  const b = new ParticleBuilder(n);
  const r = new Rng(32);
  const [nWide, nTear, nMerge, nRuler, nDust] = b.counts([0.25, 0.22, 0.22, 0.08, 0.23]);
  const pt: V3 = [0, 0, 0];
  const strand = (route: Route, count: number, x0: number, x1: number) => {
    for (let k = 0; k < count; k++) {
      const x = r.range(x0, x1);
      strandPoint(route, x, pt);
      let rad = 0.26;
      let col = ROUTE_COLOR[route];
      let a = r.range(0.4, 0.8);
      if (route === 'merge') {
        const t = (x - X_JOIN) / (X_MAX - X_JOIN);
        rad = 0.3 + 0.25 * t;
        col = mixRGB(hexRGB('#4b47b8'), C.ink, Math.min(1, t * 1.3));
        if (x > X_MAX - 4) {
          // 3600：界崩的前兆，航线在尽头炸散
          const burst = Math.pow((x - (X_MAX - 4)) / 5, 2) * 4;
          rad += burst;
          if (r.next() < 0.3) col = r.pick([C.crimson, C.amber, C.violet]);
          a *= 0.8;
        }
      }
      b.add(pt[0] + r.gauss() * 0.08, pt[1] + r.gauss() * rad, pt[2] + r.gauss() * rad, col, a);
    }
  };
  strand('wide', nWide, X_MIN - 1.5, X_JOIN);
  strand('tear', nTear, X_MIN - 1.5, X_JOIN);
  strand('merge', nMerge, X_JOIN - 0.3, X_MAX + 1);
  // 年代标尺
  for (let k = 0; k < nRuler; k++) {
    if (r.next() < 0.85) {
      b.add(r.range(X_MIN - 2, X_MAX + 2), RULER_Y + r.gauss() * 0.006, 0, C.ink, r.range(0.2, 0.4));
    } else {
      const yr = 2300 + Math.floor(r.next() * 14) * 100;
      b.add(yearToX(yr), RULER_Y + r.next() * 0.16, 0, C.ink, 0.35);
    }
  }
  for (let k = 0; k < nDust; k++) {
    b.add(r.range(X_MIN - 8, X_MAX + 8), r.range(-7, 7), r.range(-12, 4), r.next() < 0.15 ? C.klein : C.ink, r.range(0.08, 0.26));
  }
  return b.L;
}

/* ---------------- 场景 3 · 星图 ---------------- */

export const FACTION_POLAR: Record<string, [number, number]> = {
  solar: [10.6, 0.35],
  planwaze: [7.6, 1.3],
  tear: [11.4, -1.5],
  curtain: [12.4, -2.05],
  empire: [4.9, 3.3],
};
const BELTS = [
  { r: 9.7, a0: -2.25, a1: -1.15 }, // 第一黑洞带
  { r: 6.4, a0: 0.75, a1: 1.75 }, // 第二黑洞带
];
export function polar(rad: number, a: number, y = 0): V3 {
  return [rad * Math.cos(a), y, rad * Math.sin(a)];
}

function armPoint(r: Rng): { p: V3; rad: number } {
  const major = r.next() < 0.72;
  const arm = major ? (r.next() < 0.5 ? 0 : Math.PI) : (r.next() < 0.5 ? Math.PI / 2 : (3 * Math.PI) / 2);
  const rad = 1.3 + 12.8 * Math.pow(r.next(), 0.85);
  const spread = (major ? 0.26 : 0.34) * (1.1 - rad / 18);
  const a = arm + 2.3 * Math.log(rad / 1.1) + r.gauss() * spread;
  return { p: [rad * Math.cos(a), r.gauss() * 0.22 * (1.2 - rad / 16), rad * Math.sin(a)], rad };
}

function shards3(): ShardLayout {
  const b = new ShardBuilder();
  const r = new Rng(41);
  let i = 0;
  FACTIONS.forEach((f, k) => {
    const [rad, a] = FACTION_POLAR[f.id];
    const ctr = polar(rad, a, 0.35);
    const col = hexRGB(f.color);
    for (let j = 0; j < 12; j++) {
      const dir = j === 0 ? ([0, 1, 0] as V3) : norm3([r.gauss() * 0.7, 1, r.gauss() * 0.7]);
      const L = j === 0 ? 1.1 : r.range(0.3, 0.75);
      b.set(i, add3(ctr, mul3(dir, L / 2 - 0.2)), dir, r.range(0, 6), [j === 0 ? 0.22 : 0.12, L, j === 0 ? 0.22 : 0.12], j % 4 === 3 ? C.pale : col, k);
      b.spin(i, ctr, [0, 1, 0], 0.4);
      i++;
    }
  });
  // 银心
  for (let j = 0; j < 72; j++) {
    const d = norm3([r.gauss(), r.gauss() * 0.45, r.gauss()]);
    const L = r.range(0.35, 1.5);
    b.set(i, mul3(d, 0.3 + L / 2), d, r.range(0, 6), [0.1, L, 0.1], r.next() < 0.5 ? C.amber : C.ink, 5);
    b.spin(i, [0, 0, 0], [0, 1, 0], 0.3);
    i++;
  }
  while (i < SHARDS) {
    const { p, rad } = armPoint(r);
    const s = r.range(0.06, 0.15);
    const col = r.next() < 0.5 ? C.pale : mixRGB(hexRGB('#c89b5a'), C.klein, rad / 14);
    b.set(i++, p, r.dir(), r.range(0, 6), [s, s * 1.6, s], col, -1);
  }
  return b.L;
}

function particles3(n: number): ParticleLayout {
  const b = new ParticleBuilder(n);
  const r = new Rng(42);
  const [nBulge, nArm, nDisk, nBelt, nHalo] = b.counts([0.11, 0.5, 0.15, 0.12, 0.12]);
  const warm = hexRGB('#c89b5a');
  for (let k = 0; k < nBulge; k++) {
    b.add(r.gauss() * 1.25, r.gauss() * 0.55, r.gauss() * 1.25, r.next() < 0.5 ? warm : C.ink, r.range(0.35, 0.75));
  }
  for (let k = 0; k < nArm; k++) {
    const { p, rad } = armPoint(r);
    const roll = r.next();
    const col = roll < 0.55 ? mixRGB(warm, C.klein, Math.min(1, rad / 11)) : roll < 0.85 ? C.ink : hexRGB('#9fb1e4');
    b.add(p[0], p[1], p[2], col, r.range(0.3, 0.72));
  }
  for (let k = 0; k < nDisk; k++) {
    const rad = 15 * Math.sqrt(r.next());
    const a = r.range(0, Math.PI * 2);
    b.add(rad * Math.cos(a), r.gauss() * 0.3, rad * Math.sin(a), C.ink, r.range(0.08, 0.22));
  }
  // 黑洞带：浅色背景上的深色星团
  const dark = hexRGB('#0c0f17');
  const clumps: V3[] = [];
  for (const belt of BELTS) {
    for (let j = 0; j < 9; j++) {
      const a = belt.a0 + ((j + r.next() * 0.6) / 9) * (belt.a1 - belt.a0);
      clumps.push(polar(belt.r + r.gauss() * 0.35, a, 0));
    }
  }
  for (let k = 0; k < nBelt; k++) {
    const c = clumps[k % clumps.length];
    const s = k % 3 === 0 ? 0.45 : 0.2;
    b.add(c[0] + r.gauss() * s, c[1] + r.gauss() * s * 0.4, c[2] + r.gauss() * s, dark, r.range(0.55, 0.95));
  }
  const d: V3 = [0, 0, 0];
  for (let k = 0; k < nHalo; k++) {
    r.dir(d);
    const rad = 13 + r.next() * 9;
    b.add(d[0] * rad, d[1] * rad * 0.5, d[2] * rad, C.ink, r.range(0.06, 0.2));
  }
  return b.L;
}

/* ---------------- 场景 4 · 三界 ---------------- */

export const LAYER_Y = [4.6, 0, -4.6];
export const LAYER_R = 8.9;
const LAYER_COL: [RGB, RGB][] = [
  [hexRGB('#f3ead2'), hexRGB('#c9a557')],
  [hexRGB('#dfe6f7'), C.klein],
  [hexRGB('#5a1a22'), hexRGB('#b8323a')],
];

function shards4(): ShardLayout {
  const b = new ShardBuilder();
  const r = new Rng(51);
  let i = 0;
  const s = 0.72;
  const cells: V3[] = [];
  for (let q = -9; q <= 9; q++) {
    for (let rr = -9; rr <= 9; rr++) {
      const x = s * Math.sqrt(3) * (q + rr / 2);
      const z = s * 1.5 * rr;
      cells.push([x, 0, z]);
    }
  }
  cells.sort((a, c) => Math.hypot(a[0], a[2]) - Math.hypot(c[0], c[2]));
  const PER = 168;
  LAYER_Y.forEach((y, li) => {
    const [c0, c1] = LAYER_COL[li];
    for (let j = 0; j < PER; j++) {
      const c = cells[j + 1];
      const rad = Math.hypot(c[0], c[2]);
      const edge = rad / LAYER_R;
      const roll = r.next();
      const col = roll < 0.12 ? c1 : mixRGB(c0, c1, r.next() * 0.35 + (li === 2 ? 0.2 : 0));
      const sc = 1.3 * (1 - 0.25 * Math.pow(edge, 3));
      b.set(i, [c[0], y + r.gauss() * 0.03, c[2]], [r.gauss() * 0.03, 1, r.gauss() * 0.03], 0, [sc, 0.08, sc], col, li);
      i++;
    }
  });
  // 银心之柱
  for (let j = 0; j < 80; j++) {
    const y = r.range(-7.5, 7.5);
    const a = r.range(0, Math.PI * 2);
    const rad = r.range(0.1, 0.5);
    const L = r.range(0.6, 1.4);
    b.set(i, [Math.cos(a) * rad, y, Math.sin(a) * rad], norm3([r.gauss() * 0.15, 1, r.gauss() * 0.15]), r.range(0, 6), [0.2, L, 0.2], r.next() < 0.7 ? C.ink : C.klein, 3);
    b.spin(i, [0, 0, 0], [0, 1, 0], 0.5);
    i++;
  }
  // 被抽离的暗物质
  while (i < SHARDS) {
    const t = r.next();
    const y = -4.4 + t * 4.2;
    const a = t * 9 + r.gauss() * 0.4;
    const rad = 0.9 + 2.2 * (1 - t) + r.gauss() * 0.2;
    b.set(i, [Math.cos(a) * rad, y, Math.sin(a) * rad], r.dir(), r.range(0, 6), [0.1, 0.18, 0.1], mixRGB(hexRGB('#b8323a'), C.ink, t), -1);
    b.spin(i, [0, 0, 0], [0, 1, 0], -0.6);
    i++;
  }
  return b.L;
}

function particles4(n: number): ParticleLayout {
  const b = new ParticleBuilder(n);
  const r = new Rng(52);
  const [nLayers, nPillar, nFlow] = b.counts([0.78, 0.1, 0.12]);
  for (let k = 0; k < nLayers; k++) {
    const li = k % 3;
    let rad = LAYER_R * 1.08 * Math.sqrt(r.next());
    if (r.next() < 0.6) rad = Math.round(rad / 0.9) * 0.9 + r.gauss() * 0.03;
    const a = r.range(0, Math.PI * 2);
    const col = li === 0 ? hexRGB('#b8913f') : li === 1 ? C.klein : hexRGB('#8e1f2a');
    b.add(Math.cos(a) * rad, LAYER_Y[li] - 0.12 + r.gauss() * 0.04, Math.sin(a) * rad, col, r.range(0.25, 0.6) * (1 - 0.5 * (rad / LAYER_R) ** 4));
  }
  for (let k = 0; k < nPillar; k++) {
    const y = r.range(-8.5, 8.5);
    b.add(r.gauss() * 0.3, y, r.gauss() * 0.3, C.ink, r.range(0.4, 0.8) * (1 - Math.abs(y) / 10));
  }
  for (let k = 0; k < nFlow; k++) {
    const down = r.next() < 0.75;
    const t = r.next();
    const y = down ? -4.6 + t * 4.6 : t * 4.6;
    const a = t * 9 + r.gauss() * 0.3 + (down ? 0 : 1.5);
    const rad = 0.7 + 2.6 * (down ? 1 - t : t) + r.gauss() * 0.15;
    const col = down ? mixRGB(hexRGB('#b8323a'), C.klein, t) : mixRGB(C.klein, hexRGB('#c9a557'), t);
    b.add(Math.cos(a) * rad, y, Math.sin(a) * rad, col, r.range(0.35, 0.7));
  }
  return b.L;
}

/* ---------------- 场景 5 · 合界 ---------------- */

export const ORDER_R = 6.8;
const ORDER_COL = ['#1f3fae', '#d99a2b', '#7b4fc9', '#c63b3b', '#8b8574', '#9aa7c2'];
export function orderCenter(k: number): V3 {
  const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
  return [Math.sin(a) * ORDER_R, 0.6, Math.cos(a) * ORDER_R];
}

function shards5(): ShardLayout {
  const b = new ShardBuilder();
  const r = new Rng(61);
  let i = 0;
  for (let k = 0; k < 6; k++) {
    const ctr = orderCenter(k);
    const col = hexRGB(ORDER_COL[k]);
    for (const f of bipyramid(0.72, 1.9, 4, Math.PI / 4)) {
      const { cells, size } = tessellate(f.tri, 3);
      for (const c of cells) {
        const cc = r.next() < 0.35 ? C.pale : col;
        b.set(i, add3(ctr, add3(c, mul3(f.n, 0.02))), f.n, r.range(0, 6), [size * 0.9, 0.07, size * 0.9], cc, k);
        b.spin(i, ctr, [0, 1, 0], k % 2 ? 0.5 : -0.5);
        i++;
      }
    }
  }
  const d: V3 = [0, 0, 0];
  while (i < SHARDS) {
    r.dir(d);
    const rad = r.range(12, 22);
    const s = r.range(0.12, 0.36);
    const col = r.next() < 0.6 ? mixRGB(C.pale, hexRGB('#c3cbe0'), r.next()) : hexRGB(r.pick(ORDER_COL));
    b.set(i, [d[0] * rad, d[1] * rad * 0.7, d[2] * rad], r.dir(), r.range(0, 6), [s, 0.06, s * r.range(0.5, 1)], col, -1);
    b.spin(i, [0, 0, 0], [0.2, 1, 0], 0.05);
    i++;
  }
  return b.L;
}

function particles5(n: number): ParticleLayout {
  const b = new ParticleBuilder(n);
  const r = new Rng(62);
  const [nVortex, nKnot, nRing, nShell] = b.counts([0.6, 0.15, 0.025, 0.225]);
  const cols = ORDER_COL.map(hexRGB);
  for (let k = 0; k < nVortex; k++) {
    const arm = Math.floor(r.next() * 6);
    const rad = 1.6 + 11 * Math.pow(r.next(), 0.9);
    const a = (arm / 6) * Math.PI * 2 + Math.PI / 6 + 1.6 * Math.log(rad / 1.6) + r.gauss() * 0.2;
    const col = r.next() < 0.5 ? mixRGB(cols[arm], C.ink, 0.25) : C.ink;
    b.add(Math.sin(a) * rad, r.gauss() * 0.25 - 0.6, Math.cos(a) * rad, col, r.range(0.2, 0.6));
  }
  const d: V3 = [0, 0, 0];
  for (let k = 0; k < nKnot; k++) {
    const ci = k % 6;
    const c = orderCenter(ci);
    r.dir(d);
    const rad = 1.3 + Math.abs(r.gauss()) * 0.8;
    b.add(c[0] + d[0] * rad, c[1] + d[1] * rad * 1.4, c[2] + d[2] * rad, cols[ci], r.range(0.3, 0.7));
  }
  for (let k = 0; k < nRing; k++) {
    // 循环的种子：中心缓慢上升的细流
    const y = -0.6 + Math.pow(r.next(), 1.5) * 5;
    const rad = 0.35 * (1 - (y + 0.6) / 6) + Math.abs(r.gauss()) * 0.08;
    const a = r.range(0, Math.PI * 2);
    b.add(Math.sin(a) * rad, y, Math.cos(a) * rad, r.next() < 0.6 ? C.klein : C.ink, r.range(0.15, 0.45) * (1 - (y + 0.6) / 5.6));
  }
  for (let k = 0; k < nShell; k++) {
    r.dir(d);
    const rad = 12 + r.next() * 11;
    b.add(d[0] * rad, d[1] * rad * 0.7, d[2] * rad, r.next() < 0.1 ? C.klein : C.ink, r.range(0.06, 0.22));
  }
  return b.L;
}

/* ---------------- 导出 ---------------- */

export function buildShardLayouts(): ShardLayout[] {
  return [shards0(), shards1(), shards2(), shards3(), shards4(), shards5()];
}

export function buildParticleLayouts(n: number): ParticleLayout[] {
  return [particles0(n), particles1(n), particles2(n), particles3(n), particles4(n), particles5(n)];
}

const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

export function buildHotspots(): Hotspot[] {
  const hs: Hotspot[] = [];
  CORES.forEach((c, k) =>
    hs.push({ stage: 1, id: c.id, group: k, kind: 'point', pos: v3(coreCenter(k)), radius: 1.9, lift: 2.2, label: c.name, sub: c.en, color: c.color }),
  );
  EVENTS.forEach((e, k) => {
    const p = eventNode(e);
    hs.push({
      stage: 2,
      id: `ev${k}`,
      group: k,
      kind: 'point',
      pos: v3(p),
      radius: 0.7,
      label: e.title,
      sub: String(e.year),
      color: e.route === 'tear' ? PALETTE.violet : e.route === 'wide' ? PALETTE.klein : '#2c3a6e',
      side: e.route === 'tear' ? -1 : 1,
      lift: e.route === 'tear' ? -1.05 : 1.05,
    });
  });
  for (let c = 2300; c <= 3600; c += 100) {
    hs.push({ stage: 2, id: `c${c}`, group: -2, kind: 'point', pos: new THREE.Vector3(yearToX(c), RULER_Y, 0), radius: 0, label: String(c), sub: '', color: PALETTE.ink, tag: true, cls: 'tick' });
  }
  FACTIONS.forEach((f, k) => {
    const [rad, a] = FACTION_POLAR[f.id];
    hs.push({ stage: 3, id: f.id, group: k, kind: 'point', pos: v3(polar(rad, a, 0.6)), radius: 1.3, label: f.name, sub: f.en, color: f.color });
  });
  const beltNames = ['第一黑洞带', '第二黑洞带'];
  BELTS.forEach((b, k) => {
    const a = (b.a0 + b.a1) / 2;
    hs.push({ stage: 3, id: `belt${k}`, group: -2, kind: 'point', pos: v3(polar(b.r, a, 0)), radius: 0, label: beltNames[k], sub: k ? 'SECOND BLACK HOLE BELT' : 'FIRST BLACK HOLE BELT', color: '#0c0f17', tag: true });
  });
  hs.push({ stage: 3, id: 'galactic-core', group: -2, kind: 'point', pos: new THREE.Vector3(0, 0.4, 0), radius: 0, label: '银心', sub: 'GALACTIC CORE', color: PALETTE.amber, tag: true });
  WORLDS.forEach((w, k) => {
    if (k < 3) {
      hs.push({ stage: 4, id: w.id, group: k, kind: 'disc', pos: new THREE.Vector3(0, LAYER_Y[k], 0), radius: LAYER_R, label: w.name, sub: w.en, color: w.color });
    } else {
      hs.push({ stage: 4, id: w.id, group: 3, kind: 'point', pos: new THREE.Vector3(0, 7.2, 0), radius: 1.0, label: w.name, sub: w.en, color: w.color });
    }
  });
  const roman = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'];
  for (let k = 0; k < 6; k++) {
    hs.push({ stage: 5, id: `order${k}`, group: k, kind: 'point', pos: v3(orderCenter(k)), radius: 1.6, label: `秩序核心 ${roman[k]}`, sub: 'ORDER CORE', color: ORDER_COL[k] });
  }
  return hs;
}

export { rotYv };
