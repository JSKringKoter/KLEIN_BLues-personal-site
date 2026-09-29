// 世界观：两张静态的蓝图线稿。平时一动不动；
// 悬停「苍穹」时两道晶环放大到整页尺度，点击后晶体被推近、画面溶进世界观页的底色，再跳转。
// 画布上不画东西，形变粒子落在线稿与图纸上（DomModule）。
import { DomModule } from "../paper";

const ROUTES = ["/worldbuildings/cangqiong/", "/worldbuildings/game-design/"];
// 与 WorldLayout 的 variant 对应：落地页用同色的幕布接住这一段过渡
const VEILS = ["sky", "design"];

export class WorldsModule extends DomModule {
  private readonly root: HTMLElement;
  private readonly cards: HTMLAnchorElement[];
  private leaving = false;
  private timer = 0;

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
    this.leaving = true;
    this.hot(k, true);
    this.root.classList.add("is-leaving");
    this.root.dataset.leaving = String(k);
    try {
      sessionStorage.setItem("kb-from", "worlds");
      sessionStorage.setItem("kb-veil", VEILS[k]);
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.timer = window.setTimeout(() => location.assign(ROUTES[k]), reduce ? 0 : k === 0 ? 1150 : 1000);
  }

  /** 从子页面后退回来（bfcache）：撤销离场 */
  arrive() {
    clearTimeout(this.timer);
    this.leaving = false;
    this.root.classList.remove("is-leaving", "is-hot-0", "is-hot-1");
    delete this.root.dataset.leaving;
    this.cards.forEach((c) => c.classList.remove("is-hot"));
  }
}
