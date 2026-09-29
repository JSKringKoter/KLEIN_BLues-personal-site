import type * as THREE from "three";

/** 每帧传给各场景的公共状态 */
export interface StageFrame {
  time: number;
  delta: number;
  /** 平滑后的指针（NDC，y 向上）；触屏与减少动态效果时为 0 */
  pointer: THREE.Vector2;
  /** 原始指针（NDC） */
  pointerRaw: THREE.Vector2;
  /** 指针是否在页面内 */
  pointerInside: boolean;
  width: number;
  height: number;
  pixelRatio: number;
  reducedMotion: boolean;
  /** 滚动速度（视口高度/秒） */
  scrollVelocity: number;
}

export interface StagePresence {
  /** 0..1：该场景当前的在场程度 */
  presence: number;
  /** 0..1：在自己的停留区间里滚动到了哪里 */
  hold: number;
  /** 是否为当前主场景（可交互） */
  active: boolean;
  /** 正在进入 / 离开的形变进度（0..1），不在形变中时为 -1 */
  morph: number;
  /** 形变方向：1 = 作为目标进入，-1 = 作为来源离开 */
  role: 0 | 1 | -1;
}

export interface SampleBuffers {
  /** 世界坐标 xyz */
  pos: Float32Array;
  /** 线性 rgb */
  col: Float32Array;
  /** 像素尺寸倍率 */
  size: Float32Array;
}

export interface StageModule {
  readonly id: string;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** 是否对该场景做 Neutral 色调映射 */
  readonly toneMapped: boolean;
  /** CSS 背景（两个色标，浅色） */
  readonly backdrop: [string, string];
  resize(width: number, height: number): void;
  update(frame: StageFrame, presence: StagePresence): void;
  /** 为跨场景形变提供表面采样点（世界坐标） */
  sample(count: number, out: SampleBuffers): void;
  /** 渲染器就绪后调用 */
  attach?(renderer: THREE.WebGLRenderer): void;
  /** 预加载资源（接近时调用一次） */
  prepare?(): Promise<void>;
  /** 指针按下（仅当前主场景，且未落在 DOM 交互元素上） */
  pointerDown?(ndc: THREE.Vector2, frame: StageFrame): void;
  /** 从子页面返回（含浏览器后退的 bfcache 恢复）：撤销离场状态，并倒放离场动画 */
  arrive?(): void;
  dispose(): void;
}

/* ---------------- 数学工具 ---------------- */

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t * t * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
/** 与帧率无关的阻尼 */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next();
  }
  gauss() {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/** 简单的补间：返回一个每帧推进的函数 */
export class Tween {
  value = 0;
  private from = 0;
  private to = 0;
  private t = 1;
  private duration = 1;
  private ease: (t: number) => number = easeInOut;
  constructor(v = 0) {
    this.value = this.from = this.to = v;
  }
  set(v: number) {
    this.value = this.from = this.to = v;
    this.t = 1;
  }
  go(to: number, duration: number, ease: (t: number) => number = easeInOut) {
    this.from = this.value;
    this.to = to;
    this.t = 0;
    this.duration = Math.max(0.001, duration);
    this.ease = ease;
  }
  get running() {
    return this.t < 1;
  }
  get target() {
    return this.to;
  }
  step(dt: number) {
    if (this.t >= 1) return this.value;
    this.t = Math.min(1, this.t + dt / this.duration);
    this.value = lerp(this.from, this.to, this.ease(this.t));
    return this.value;
  }
}

/** 把 DOM 光标状态交给站点光标（public/app.js 的 setupCursor） */
export function setCursor(el: HTMLElement, mode: string) {
  if ((el.dataset.cursor ?? "") === mode) return;
  if (mode) el.dataset.cursor = mode;
  else delete el.dataset.cursor;
  el.dispatchEvent(new CustomEvent("kb:cursor-refresh", { bubbles: true }));
}
