// 舞台导演：整个首页只有一张全屏画布、一条滚动时间线。
// 每个模块是时间线上的一段「停留」，模块之间是一段「形变」。
// 停留时直接渲染该模块；形变时两个模块各渲染到离屏纹理，由 Composer 溶解合成，并由粒子搭桥。
// DOM 层（各模块的文字与控件）固定在视口上，由导演根据时间线控制显隐——页面仍然使用原生滚动。
import * as THREE from "three";
import { Composer } from "./bridge";
import { clamp, smooth, type StageFrame, type StageModule, type StagePresence } from "./core";
import type { QualityProfile } from "../world3d/quality";

export interface TrackEntry {
  module: StageModule;
  /** 时间线上对应的 DOM：固定层模块是占位轨道，流式模块（首屏、关于）是它自己 */
  el: HTMLElement;
  kind: "pinned" | "flow-start" | "flow-end";
  overlay?: HTMLElement | null;
}

interface Segment {
  a: number;
  b: number;
  /** 形变进度；停留时为 0 */
  p: number;
  hold: number;
}

const interactiveSelector = "a, button, input, select, textarea, label, [data-no-stage]";

export class Director {
  readonly renderer: THREE.WebGLRenderer | null;
  readonly frame: StageFrame;
  readonly quality: QualityProfile | null;
  private readonly entries: TrackEntry[];
  private readonly composer: Composer | null;
  private readonly canvas: HTMLCanvasElement | null;
  private readonly backdrop: HTMLElement | null;
  private readonly pointerTarget = new THREE.Vector2();
  private readonly reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private ranges: { start: number; end: number }[] = [];
  private bridgeKey = "";
  private bridgeSeed = 0;
  private lastTime = performance.now();
  private startTime = performance.now();
  private lastScroll = window.scrollY;
  private rafId = 0;
  private pixelRatio = 1;
  private slowFrames = 0;
  private prepared = new Set<StageModule>();
  private presence: StagePresence[] = [];
  private overlayCache: string[] = [];
  private backdropCache = "";
  private segment: Segment = { a: 0, b: 0, p: 0, hold: 0 };
  private layoutDirty = true;
  private firstFrame = true;

  constructor(canvas: HTMLCanvasElement | null, backdrop: HTMLElement | null, entries: TrackEntry[], quality: QualityProfile | null) {
    this.entries = entries;
    this.quality = quality;
    this.backdrop = backdrop;
    this.canvas = canvas;
    this.frame = {
      time: 0,
      delta: 0,
      pointer: new THREE.Vector2(),
      pointerRaw: new THREE.Vector2(),
      pointerInside: false,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: 1,
      reducedMotion: this.reduced.matches,
      scrollVelocity: 0,
    };

    let renderer: THREE.WebGLRenderer | null = null;
    let composer: Composer | null = null;
    if (canvas && quality) {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: quality.tier !== "low",
          alpha: true,
          premultipliedAlpha: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.toneMappingExposure = 1;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio);
        renderer.setPixelRatio(this.pixelRatio);
        const count = quality.tier === "high" ? 16000 : quality.tier === "mid" ? 11000 : 6000;
        composer = new Composer(count, quality.tier === "low" ? 0 : 4);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        for (const e of entries) e.module.attach?.(renderer);
      } catch {
        renderer = null;
        composer = null;
      }
    }
    this.renderer = renderer;
    this.composer = composer;
    this.presence = entries.map(() => ({ presence: 0, hold: 0, active: false, morph: -1, role: 0 }));
    this.overlayCache = entries.map(() => "");

    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("pageshow", (event) => {
      if ((event as PageTransitionEvent).persisted) this.arrive();
    });
    this.reduced.addEventListener("change", () => (this.frame.reducedMotion = this.reduced.matches));
    new ResizeObserver(() => (this.layoutDirty = true)).observe(document.body);
    this.onResize();
  }

  get webgl() {
    return !!this.renderer;
  }

  start() {
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** 把滚动定位到某个模块的停留区间（用于导航与跨页返回） */
  scrollToModule(id: string, behavior: ScrollBehavior = "smooth") {
    this.measure();
    const i = this.entries.findIndex((e) => e.module.id === id);
    if (i < 0) return;
    window.scrollTo({ top: this.snapPoints()[i], behavior: behavior === "auto" ? ("instant" as ScrollBehavior) : behavior });
  }

  /** 整页吸附的落点：首屏顶部、各模块停留区间的中点、「关于」的顶部 */
  snapPoints() {
    this.measure();
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return this.entries.map((e, i) => {
      const r = this.ranges[i];
      if (e.kind === "flow-start") return 0;
      if (e.kind === "flow-end") return Math.min(max, Math.round(e.el.getBoundingClientRect().top + window.scrollY));
      return Math.round((r.start + r.end) / 2);
    });
  }

  /** 从子页面回到首页：各模块撤销离场状态，画面与文字从「被推近」的位置退回原处 */
  arrive() {
    for (const e of this.entries) e.module.arrive?.();
    for (const e of this.entries) e.overlay?.classList.remove("is-leaving");
    const html = document.documentElement;
    html.classList.remove("kb-arrive");
    void html.offsetWidth;
    html.classList.add("kb-arrive");
    window.setTimeout(() => html.classList.remove("kb-arrive"), 1400);
  }

  moduleRange(id: string) {
    this.measure();
    const i = this.entries.findIndex((e) => e.module.id === id);
    return i < 0 ? null : this.ranges[i];
  }

  private onResize = () => {
    this.frame.width = window.innerWidth;
    this.frame.height = window.innerHeight;
    this.layoutDirty = true;
    if (this.renderer) {
      this.renderer.setSize(this.frame.width, this.frame.height, false);
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.composer?.setSize(size.x, size.y);
    }
    this.frame.pixelRatio = this.renderer?.getPixelRatio() ?? 1;
    for (const e of this.entries) e.module.resize(this.frame.width, this.frame.height);
  };

  private onPointerMove = (event: PointerEvent) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.frame.pointerRaw.set(x, y);
    this.frame.pointerInside = true;
    if (event.pointerType !== "touch") this.pointerTarget.set(x, y);
  };

  private onPointerLeave = () => {
    this.pointerTarget.set(0, 0);
    this.frame.pointerInside = false;
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || document.body.classList.contains("is-locked")) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(interactiveSelector)) return;
    const seg = this.segment;
    if (seg.p > 0.02) return;
    const m = this.entries[seg.a].module;
    if (!m.pointerDown) return;
    const ndc = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    m.pointerDown(ndc, this.frame);
  };

  /** 计算每个模块在滚动轴上的停留区间 */
  private measure() {
    if (!this.layoutDirty) return;
    this.layoutDirty = false;
    const vh = this.frame.height;
    const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
    this.ranges = this.entries.map((e) => {
      const t = top(e.el);
      if (e.kind === "flow-start") return { start: t, end: t + e.el.offsetHeight * 0.32 };
      if (e.kind === "flow-end") return { start: t - vh * 0.42, end: Number.POSITIVE_INFINITY };
      return { start: t, end: t + Math.max(1, e.el.offsetHeight) };
    });
  }

  private locate(s: number): Segment {
    const r = this.ranges;
    if (s <= r[0].start) return { a: 0, b: 0, p: 0, hold: 0 };
    for (let i = 0; i < r.length; i++) {
      if (s >= r[i].start && s <= r[i].end) {
        const len = r[i].end - r[i].start;
        return { a: i, b: i, p: 0, hold: Number.isFinite(len) && len > 0 ? (s - r[i].start) / len : 0 };
      }
      const next = r[i + 1];
      if (next && s > r[i].end && s < next.start) {
        return { a: i, b: i + 1, p: (s - r[i].end) / (next.start - r[i].end), hold: 0 };
      }
    }
    return { a: r.length - 1, b: r.length - 1, p: 0, hold: 1 };
  }

  private tick = (now: number) => {
    this.rafId = requestAnimationFrame(this.tick);
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    const f = this.frame;
    f.delta = f.reducedMotion ? Math.min(dt, 0.05) : dt;
    f.time = (now - this.startTime) / 1000;
    f.pointer.lerp(f.reducedMotion ? new THREE.Vector2() : this.pointerTarget, 1 - Math.exp(-dt * 3.2));

    const s = window.scrollY;
    const vel = dt > 0 ? (s - this.lastScroll) / f.height / dt : 0;
    this.lastScroll = s;
    f.scrollVelocity += (vel - f.scrollVelocity) * (1 - Math.exp(-dt * 6));

    this.measure();
    const seg = (this.segment = this.locate(s));
    const inMorph = seg.a !== seg.b && seg.p > 0.0005 && seg.p < 0.9995;
    const primary = !inMorph && seg.a !== seg.b ? (seg.p >= 0.9995 ? seg.b : seg.a) : seg.a;

    // 在场程度与叠层
    this.entries.forEach((entry, i) => {
      const pr = this.presence[i];
      let presence = 0;
      let role: 0 | 1 | -1 = 0;
      if (!inMorph && i === primary) presence = 1;
      else if (inMorph && i === seg.a) {
        presence = 1 - seg.p;
        role = -1;
      } else if (inMorph && i === seg.b) {
        presence = seg.p;
        role = 1;
      }
      pr.presence = presence;
      pr.active = !inMorph && i === primary;
      pr.hold = i === primary && !inMorph ? seg.hold : role === -1 ? 1 : 0;
      pr.morph = inMorph && role !== 0 ? seg.p : -1;
      pr.role = role;
      this.updateOverlay(entry, i, pr, inMorph ? seg.p : 0);

      // 距离当前位置两个视口以内时预加载
      if (!this.prepared.has(entry.module) && entry.module.prepare) {
        const range = this.ranges[i];
        if (s > range.start - f.height * 2.5 && s < range.end + f.height) {
          this.prepared.add(entry.module);
          entry.module.prepare().catch(() => {});
        }
      }
    });

    this.updateBackdrop(seg, inMorph, primary);

    if (!this.renderer || !this.composer) return;
    const locked = document.body.classList.contains("is-locked");
    if (this.canvas) this.canvas.style.visibility = locked ? "hidden" : "visible";
    if (locked) return;

    const r = this.renderer;
    if (!inMorph) {
      const m = this.entries[primary].module;
      m.update(f, this.presence[primary]);
      r.setRenderTarget(null);
      r.toneMapping = m.toneMapped ? THREE.NeutralToneMapping : THREE.NoToneMapping;
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(m.scene, m.camera);
    } else {
      const A = this.entries[seg.a].module;
      const B = this.entries[seg.b].module;
      A.update(f, this.presence[seg.a]);
      B.update(f, this.presence[seg.b]);
      this.ensureBridge(seg.a, seg.b);
      r.toneMapping = THREE.NoToneMapping;
      r.setClearColor(0x000000, 0);
      r.setRenderTarget(this.composer.rtA);
      r.clear();
      r.render(A.scene, A.camera);
      r.setRenderTarget(this.composer.rtB);
      r.clear();
      r.render(B.scene, B.camera);
      r.setRenderTarget(null);
      r.clear();

      const c = this.composer;
      const qu = c.quad.material.uniforms;
      const aspect = f.width / f.height;
      qu.uP.value = seg.p;
      qu.uAspect.value = aspect;
      qu.uSeed.value = this.bridgeSeed;
      qu.uToneA.value = A.toneMapped ? 1 : 0;
      qu.uToneB.value = B.toneMapped ? 1 : 0;
      const pu = c.points.material.uniforms;
      A.camera.updateMatrixWorld();
      B.camera.updateMatrixWorld();
      pu.uVPA.value.multiplyMatrices(A.camera.projectionMatrix, A.camera.matrixWorldInverse);
      pu.uVPB.value.multiplyMatrices(B.camera.projectionMatrix, B.camera.matrixWorldInverse);
      pu.uP.value = seg.p;
      pu.uTime.value = f.time;
      pu.uAspect.value = aspect;
      pu.uSeed.value = this.bridgeSeed;
      pu.uPx.value = r.getPixelRatio() * Math.min(1.3, Math.max(0.75, f.height / 900));
      r.render(c.scene, c.camera);
    }

    if (this.firstFrame) {
      this.firstFrame = false;
      requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("has-webgl")));
    }
    this.adaptPixelRatio(dt);
  };

  private ensureBridge(a: number, b: number) {
    const key = `${a}>${b}`;
    if (key === this.bridgeKey || !this.composer) return;
    this.bridgeKey = key;
    this.bridgeSeed = (a * 3 + b * 7) % 11;
    const c = this.composer;
    this.entries[a].module.sample(c.count, c.buffersA);
    this.entries[b].module.sample(c.count, c.buffersB);
    c.commit();
  }

  private updateOverlay(entry: TrackEntry, i: number, pr: StagePresence, p: number) {
    const el = entry.overlay;
    if (!el) return;
    // 文字比三维场景更早离场、更晚入场，避免与粒子叠在一起
    let vis = 0;
    if (pr.role === -1) vis = 1 - smooth(0.0, 0.3, p);
    else if (pr.role === 1) vis = smooth(0.72, 1.0, p);
    else vis = pr.presence;
    const q = Math.round(vis * 100) / 100;
    const dir = pr.role === -1 ? -1 : 1;
    const key = `${q}|${pr.active ? 1 : 0}`;
    if (key === this.overlayCache[i]) return;
    this.overlayCache[i] = key;
    el.style.setProperty("--stage-in", String(q));
    el.style.setProperty("--stage-dir", String(dir));
    el.style.visibility = q < 0.01 ? "hidden" : "visible";
    el.classList.toggle("is-active", pr.active);
    el.inert = !pr.active;
  }

  private updateBackdrop(seg: Segment, inMorph: boolean, primary: number) {
    if (!this.backdrop) return;
    const A = this.entries[inMorph ? seg.a : primary].module.backdrop;
    const B = this.entries[inMorph ? seg.b : primary].module.backdrop;
    const t = inMorph ? smooth(0.2, 0.8, seg.p) : 0;
    const key = `${A.join()}|${B.join()}|${t.toFixed(3)}`;
    if (key === this.backdropCache) return;
    this.backdropCache = key;
    const mix = (x: string, y: string) => `color-mix(in oklab, ${x} ${((1 - t) * 100).toFixed(1)}%, ${y})`;
    this.backdrop.style.setProperty("--bd-a", mix(A[0], B[0]));
    this.backdrop.style.setProperty("--bd-b", mix(A[1], B[1]));
  }

  private adaptPixelRatio(dt: number) {
    if (!this.renderer || this.frame.reducedMotion || this.pixelRatio <= 0.75) return;
    this.slowFrames = dt > 1 / 38 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
    if (this.slowFrames < 90) return;
    this.slowFrames = 0;
    this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.onResize();
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    for (const e of this.entries) e.module.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}

export { clamp };
