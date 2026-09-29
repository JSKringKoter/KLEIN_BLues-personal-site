import * as THREE from "three";
import type { QualityProfile } from "./quality";

export interface FrameState {
  time: number;
  delta: number;
  /** Smoothed pointer in NDC (-1..1, y up). Stays at 0 on touch devices and with reduced motion. */
  pointer: THREE.Vector2;
  /** 0 when the section top meets the viewport top, 1 when its bottom does. */
  scrollProgress: number;
  /** Scroll speed in viewport heights per second, smoothed. */
  scrollVelocity: number;
  reducedMotion: boolean;
  width: number;
  height: number;
}

export interface Stage {
  readonly section: HTMLElement;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  resize(width: number, height: number): void;
  update(frame: FrameState): void;
  pointerDown?(ndc: THREE.Vector2, frame: FrameState): void;
  dispose(): void;
}

// Clicks on these keep their normal DOM behaviour and never reach the 3D stage.
const interactiveSelector = "a, button, input, select, textarea, label, [data-cursor], .weather-control";

export class StageManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly quality: QualityProfile;
  private readonly canvas: HTMLCanvasElement;
  private readonly stages: Stage[] = [];
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly pointerTarget = new THREE.Vector2();
  private readonly frame: FrameState;
  private pixelRatio: number;
  private startTime = performance.now();
  private lastTime = performance.now();
  private lastScrollY = window.scrollY;
  private needsRender = true;
  private clip = "";
  private slowFrames = 0;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, quality: QualityProfile) {
    this.canvas = canvas;
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.tier !== "low", alpha: false, powerPreference: "high-performance" });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.frame = {
      time: 0,
      delta: 0,
      pointer: new THREE.Vector2(),
      scrollProgress: 0,
      scrollVelocity: 0,
      reducedMotion: this.reducedMotion.matches,
      width: window.innerWidth,
      height: window.innerHeight
    };

    window.addEventListener("resize", this.resize, { passive: true });
    window.addEventListener("scroll", this.invalidate, { passive: true });
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    this.resize();
  }

  add(stage: Stage) {
    this.stages.push(stage);
    stage.resize(this.frame.width, this.frame.height);
    this.invalidate();
  }

  start() {
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Request a frame; only needed when motion is reduced and the loop idles. */
  invalidate = () => {
    this.needsRender = true;
  };

  dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("scroll", this.invalidate);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    this.stages.forEach((stage) => stage.dispose());
    this.renderer.dispose();
  }

  private resize = () => {
    this.frame.width = window.innerWidth;
    this.frame.height = window.innerHeight;
    this.renderer.setSize(this.frame.width, this.frame.height, false);
    this.stages.forEach((stage) => stage.resize(this.frame.width, this.frame.height));
    this.invalidate();
  };

  private onMotionPreference = () => {
    this.frame.reducedMotion = this.reducedMotion.matches;
    this.invalidate();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    this.pointerTarget.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  };

  private onPointerLeave = () => {
    this.pointerTarget.set(0, 0);
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || document.body.classList.contains("is-locked")) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(interactiveSelector)) return;
    const stage = this.stages.find((item) => item.section.contains(target));
    if (!stage?.pointerDown) return;
    const ndc = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    stage.pointerDown(ndc, this.frame);
    this.invalidate();
  };

  private activeStage() {
    const height = this.frame.height;
    let best: { stage: Stage; top: number; bottom: number; rect: DOMRect } | null = null;
    for (const stage of this.stages) {
      const rect = stage.section.getBoundingClientRect();
      const top = Math.max(0, rect.top);
      const bottom = Math.min(height, rect.bottom);
      if (bottom <= top) continue;
      if (!best || bottom - top > best.bottom - best.top) best = { stage, top, bottom, rect };
    }
    return best;
  }

  private setClip(value: string) {
    if (value === this.clip) return;
    this.clip = value;
    this.canvas.style.clipPath = value;
  }

  private tick = (now: number) => {
    this.rafId = requestAnimationFrame(this.tick);
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    const scrollY = window.scrollY;
    const velocity = delta > 0 ? (scrollY - this.lastScrollY) / this.frame.height / delta : 0;
    this.lastScrollY = scrollY;
    this.frame.scrollVelocity += (velocity - this.frame.scrollVelocity) * (1 - Math.exp(-delta * 6));

    const active = this.activeStage();
    if (!active || document.body.classList.contains("is-locked")) {
      this.canvas.style.visibility = "hidden";
      return;
    }
    this.canvas.style.visibility = "visible";
    this.setClip(`inset(${active.top.toFixed(1)}px 0 ${(this.frame.height - active.bottom).toFixed(1)}px 0)`);
    this.frame.scrollProgress = THREE.MathUtils.clamp(-active.rect.top / active.rect.height, 0, 1);

    if (this.frame.reducedMotion) {
      if (!this.needsRender) return;
      this.frame.delta = 0;
      this.frame.pointer.set(0, 0);
    } else {
      this.frame.delta = delta;
      this.frame.time = (now - this.startTime) / 1000;
      this.frame.pointer.lerp(this.pointerTarget, 1 - Math.exp(-delta * 3.2));
    }

    this.needsRender = false;
    active.stage.update(this.frame);
    this.renderer.render(active.stage.scene, active.stage.camera);
    this.adaptPixelRatio(delta);
  };

  // Drops resolution step by step when frames stay slow, instead of letting the page stutter.
  private adaptPixelRatio(delta: number) {
    if (this.frame.reducedMotion || this.pixelRatio <= 0.75) return;
    this.slowFrames = delta > 1 / 38 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
    if (this.slowFrames < 90) return;
    this.slowFrames = 0;
    this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.frame.width, this.frame.height, false);
  }
}
