// 世界观：两张静态的蓝图线稿。平时一动不动；
// 悬停「苍穹」时两道晶环放大到整页尺度，点击后晶体被推近、画面溶进世界观页的底色，再跳转。
// 滚动形变：粒子沿着线稿的真实路径凝结，图纸随 --stage-in 立起、线条被描出来（见 stage.css）。
// 返回：子页面铺满同色幕布后回到这里，先摆回离场的最后一帧，再倒放——晶体退远、晶环收拢、幕布揭开。
import * as THREE from "three";
import { DomModule, type ScreenPoint } from "../paper";
import { HandoffLayer, reducedMotion, settle, type Handoff } from "../../handoff";
import type { Rng } from "../core";

const ROUTES = ["/worldbuildings/cangqiong/", "/worldbuildings/game-design/"];
// 与 WorldLayout 的 variant 对应：落地页用同色的幕布接住这一段过渡
const VEILS = ["sky", "design"];

export class WorldsModule extends DomModule {
  private readonly root: HTMLElement;
  private readonly cards: HTMLAnchorElement[];
  private leaving = false;
  private left = -1;
  private timer = 0;
  private returnTimer = 0;

  constructor(overlay: HTMLElement) {
    super("worlds", ["#f3f4f7", "#dde2ea"], overlay);
    this.root = overlay;
    this.cards = Array.from(overlay.querySelectorAll<HTMLAnchorElement>("[data-wl]"));
    this.cards.forEach((card, k) => {
      card.addEventListener("pointerenter", () => this.hot(k, true));
      card.addEventListener("pointerleave", () => this.hot(k, false));
      card.addEventListener("focus", () => this.hot(k, true));
      card.addEventListener("blur", () => this.hot(k, false));
      card.addEventListener("click", (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        this.go(k);
      });
    });
    window.addEventListener("resize", () => this.measureRings(), { passive: true });
  }

  /** 晶环放大到「整页」：让环的宽度盖过它到页面最远一侧的距离 */
  private measureRings() {
    const rings = this.root.querySelectorAll<SVGGElement>(".wl-ring");
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    rings.forEach((ring, k) => {
      const prev = ring.style.transform;
      ring.style.transition = "none";
      ring.style.transform = "none";
      const r = ring.getBoundingClientRect();
      ring.style.transform = prev;
      void ring.getBoundingClientRect();
      ring.style.transition = "";
      if (r.width < 1) return;
      const cx = r.left + r.width / 2;
      const reach = Math.max(cx, vw - cx);
      // 扁椭圆：横向铺满整页，纵向不超过一屏半
      const scale = Math.min(((reach * 2) / r.width) * (k === 0 ? 1.02 : 1.22), (vh * 1.5) / r.height);
      ring.style.setProperty("--ring-scale", scale.toFixed(3));
    });
  }

  private hot(k: number, on: boolean) {
    if (this.leaving) return;
    if (on && k === 0) this.measureRings();
    this.cards[k].classList.toggle("is-hot", on);
    this.root.classList.toggle(`is-hot-${k}`, on);
  }

  private go(k: number) {
    if (this.leaving) return;
    this.hot(k, true);
    this.leaving = true;
    this.left = k;
    this.root.classList.add("is-leaving");
    this.root.dataset.leaving = String(k);
    document.documentElement.classList.add("kb-busy");
    try {
      sessionStorage.setItem("kb-from", "worlds");
      sessionStorage.setItem("kb-veil", VEILS[k]);
    } catch {}
    this.timer = window.setTimeout(() => location.assign(ROUTES[k]), reducedMotion() ? 0 : k === 0 ? 1150 : 1000);
  }

  /** 倒放离场：先瞬间摆到离场的最后一帧（晶体推近、幕布铺满），下一帧再退回原处 */
  private rewind(k: number, before?: () => void) {
    clearTimeout(this.timer);
    clearTimeout(this.returnTimer);
    const html = document.documentElement;
    html.classList.add("kb-busy");
    this.leaving = false;
    if (k === 0) this.measureRings();
    this.root.classList.add("is-instant", "is-leaving", `is-hot-${k}`);
    this.root.dataset.leaving = String(k);
    this.cards[k].classList.add("is-hot");
    void this.root.offsetWidth;
    this.root.classList.remove("is-instant");
    before?.();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.root.classList.add("is-returning");
        this.root.classList.remove("is-leaving", "is-hot-0", "is-hot-1");
        this.cards.forEach((c) => c.classList.remove("is-hot"));
        html.classList.remove("kb-busy");
        this.returnTimer = window.setTimeout(() => {
          this.root.classList.remove("is-returning");
          delete this.root.dataset.leaving;
        }, 1700);
      }),
    );
    this.left = -1;
  }

  async receive(h: Handoff) {
    const k = VEILS.indexOf(h.kind ?? "");
    if (k < 0 || reducedMotion()) return false;
    const layer = HandoffLayer.find();
    // 叠层里的幕布与交接层同色同形：先让幕布就位，再撤掉交接层，两者交接处看不出来
    this.rewind(k, () => {
      layer?.hide();
      settle();
    });
    return true;
  }

  /** 从子页面后退回来（bfcache）：页面停在离场的最后一帧，原地倒放 */
  arrive() {
    if (this.left < 0) {
      clearTimeout(this.timer);
      this.leaving = false;
      return false;
    }
    this.rewind(this.left);
    return true;
  }

  /** 粒子沿线稿的真实路径落下（其余落在图纸与标题上），凝结出来的就是这两张图 */
  protected points(count: number, rng: Rng): ScreenPoint[] {
    const base = super.points(Math.round(count * 0.3), rng);
    const blue = new THREE.Color("#1746d1");
    const amber = new THREE.Color("#d99a2b");
    const lines: { pts: { x: number; y: number }[]; len: number; c: THREE.Color }[] = [];
    this.root.querySelectorAll<SVGPathElement>(".wl-draw path").forEach((path) => {
      const m = path.getScreenCTM();
      const total = path.getTotalLength();
      if (!m || !(total > 0)) return;
      // 先折成折线，避免对复杂路径反复调用 getPointAtLength
      const n = Math.min(240, Math.max(16, Math.round(total / 6)));
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= n; i++) {
        const q = path.getPointAtLength((total * i) / n);
        pts.push({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f });
      }
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (len < 2) return;
      lines.push({ pts, len, c: path.classList.contains("wl-jet--core") ? amber : blue });
    });
    const total = lines.reduce((a, l) => a + l.len, 0);
    if (!total) return base;
    const out = base;
    const want = count - base.length;
    for (let i = 0; i < want; i++) {
      let pick = rng.next() * total;
      let k = 0;
      while (k < lines.length - 1 && pick > lines[k].len) pick -= lines[k++].len;
      const { pts, c } = lines[k];
      const j = Math.floor(rng.next() * (pts.length - 1));
      const t = rng.next();
      out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * t, y: pts[j].y + (pts[j + 1].y - pts[j].y) * t, c });
    }
    return out;
  }
}
