// 跨页形变的接力（样式见 src/styles/handoff.css）。
// 离场：把交接层从页面上某个矩形（一行目录、一张卡片）展开成整屏底色，标题飞到屏幕中央，然后跳转；
// 落地：页面头部的内联脚本读到 kb-handoff 后，首帧就铺好同样的交接状态，再由这里演变成落地页的版面。

export type HandoffFrom = "fiction" | "worlds" | "notes" | "portraits" | "home";
export type HandoffKind = "fiction" | "notes" | "sky" | "built" | "design" | "portraits" | "home";

export interface Handoff {
  /** 落地页路径（不含末尾斜杠） */
  to: string;
  /** 出发的场景 */
  from: HandoffFrom;
  /** 出发页的路径：首页用它找到对应的目录行 / 卡片 */
  path?: string;
  title?: string;
  theme?: string;
  kind?: HandoffKind;
  t: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const KEY = "kb-handoff";
const EASE_IN_OUT = "cubic-bezier(0.7, 0, 0.2, 1)";
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

export const normPath = (path: string) => path.replace(/\/+$/, "") || "/";

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 写入接力信息（下一页头部的内联脚本会读取并删除） */
export function leave(href: string, data: Omit<Handoff, "to" | "t">) {
  try {
    const to = normPath(new URL(href, location.href).pathname);
    sessionStorage.setItem(KEY, JSON.stringify({ ...data, to, t: Date.now() }));
  } catch {}
}

/** 本页首帧由内联脚本接住的接力信息 */
export function incoming(): Handoff | null {
  return (window as unknown as { KB_HANDOFF?: Handoff }).KB_HANDOFF ?? null;
}

/** 交接完成：撤掉首帧铺好的状态 */
export function settle() {
  const html = document.documentElement;
  html.classList.remove("kb-handoff-in", "kb-handoff-reveal", "kb-handoff-fade");
  delete html.dataset.handoff;
  (window as unknown as { KB_HANDOFF?: Handoff | null }).KB_HANDOFF = null;
}

const insetOf = (r: Rect) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return `inset(${r.top.toFixed(1)}px ${(vw - r.left - r.width).toFixed(1)}px ${(vh - r.top - r.height).toFixed(1)}px ${r.left.toFixed(1)}px)`;
};

export class HandoffLayer {
  readonly el: HTMLElement;
  readonly from: HTMLElement;
  readonly bg: HTMLElement;
  readonly title: HTMLElement;
  private running: Animation[] = [];

  private constructor(el: HTMLElement) {
    this.el = el;
    this.from = el.querySelector<HTMLElement>(".kb-handoff-from")!;
    this.bg = el.querySelector<HTMLElement>(".kb-handoff-bg")!;
    this.title = el.querySelector<HTMLElement>(".kb-handoff-title")!;
  }

  static find() {
    const el = document.querySelector<HTMLElement>(".kb-handoff");
    return el && el.querySelector(".kb-handoff-title") ? new HandoffLayer(el) : null;
  }

  configure(o: { kind: HandoffKind; theme?: string; title?: string; fromColor?: string; fromImage?: string }) {
    this.el.dataset.kind = o.kind;
    this.el.className = this.el.className
      .split(/\s+/)
      .filter((c) => c && !c.startsWith("theme-"))
      .concat(o.theme ? [`theme-${o.theme}`] : [])
      .join(" ");
    if (o.title !== undefined) this.title.textContent = o.title;
    this.from.style.setProperty("--from-color", o.fromColor || "#1746d1");
    this.from.style.setProperty("--from-image", o.fromImage || "none");
  }

  show() {
    this.el.style.removeProperty("display");
    this.el.classList.add("is-on");
  }

  /** 收起并清掉所有内联动画状态 */
  hide() {
    this.cancel();
    this.el.classList.remove("is-on");
    for (const el of [this.from, this.bg, this.title]) el.removeAttribute("style");
    // 首帧状态（html.kb-handoff-in）可能还在，显式藏起，避免取消动画后底色闪回
    this.el.setAttribute("style", "display: none");
  }

  cancel() {
    this.running.forEach((a) => a.cancel());
    this.running = [];
  }

  /** 标题在交接层里的自然位置（居中） */
  private titleRect(): Rect {
    const prev = this.title.style.transform;
    this.title.style.transform = "none";
    const r = this.title.getBoundingClientRect();
    this.title.style.transform = prev;
    return r;
  }

  /** 把标题从 a 摆到 b 的变换（以居中的自然位置为基准） */
  private titleTransform(target: Rect | null) {
    if (!target) return "none";
    const home = this.titleRect();
    if (home.height < 1) return "none";
    const s = target.height / home.height;
    return `translate(${(target.left - home.left).toFixed(1)}px, ${(target.top - home.top).toFixed(1)}px) scale(${s.toFixed(4)})`;
  }

  private play(el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const a = el.animate(frames, { fill: "both", ...options });
    this.running.push(a);
    return a.finished.catch(() => {});
  }

  /**
   * 离场：交接层从 rect 展开到整屏。
   * fromLook：起点是否显示 .kb-handoff-from（出发元素自己的底色）；否则起点就是目标底色，只是被裁在 rect 里。
   */
  async expand(o: { rect: Rect; titleFrom?: Rect | null; titleColor?: string; fromLook?: boolean; duration?: number }) {
    const d = o.duration ?? 950;
    this.cancel();
    this.show();
    const fromLook = o.fromLook ?? true;
    const jobs = [
      this.play(this.el, [{ clipPath: insetOf(o.rect) }, { clipPath: "inset(0px 0px 0px 0px)" }], { duration: d, easing: EASE_IN_OUT }),
      this.play(this.from, [{ opacity: fromLook ? 1 : 0 }, { opacity: fromLook ? 1 : 0 }], { duration: d }),
      this.play(this.bg, [{ opacity: fromLook ? 0 : 1 }, { opacity: 1 }], { duration: d * 0.6, delay: fromLook ? d * 0.38 : 0, easing: "ease-in-out" }),
    ];
    if (this.title.textContent) {
      jobs.push(
        this.play(
          this.title,
          [
            { transform: this.titleTransform(o.titleFrom ?? null), color: o.titleColor ?? "#11100e", opacity: o.titleFrom ? 1 : 0 },
            { transform: "none", color: "#11100e", opacity: 1 },
          ],
          { duration: d * 1.05, easing: EASE_IN_OUT },
        ),
      );
    }
    await Promise.all(jobs);
  }

  /** 返回：整屏的交接层收拢回 rect（离场的倒放） */
  async collapse(o: { rect: Rect; titleTo?: Rect | null; titleColor?: string; fromLook?: boolean; duration?: number }) {
    const d = o.duration ?? 1000;
    this.cancel();
    this.show();
    const fromLook = o.fromLook ?? true;
    const jobs = [
      this.play(this.el, [{ clipPath: "inset(0px 0px 0px 0px)" }, { clipPath: insetOf(o.rect) }], { duration: d, easing: EASE_IN_OUT }),
      this.play(this.from, [{ opacity: fromLook ? 1 : 0 }, { opacity: fromLook ? 1 : 0 }], { duration: d }),
      this.play(this.bg, [{ opacity: 1 }, { opacity: fromLook ? 0 : 1 }], { duration: d * 0.6, delay: d * 0.05, easing: "ease-in-out" }),
    ];
    if (this.title.textContent) {
      jobs.push(
        this.play(
          this.title,
          [
            { transform: "none", color: "#11100e", opacity: 1 },
            { transform: this.titleTransform(o.titleTo ?? null), color: o.titleColor ?? "#11100e", opacity: o.titleTo ? 1 : 0 },
          ],
          { duration: d * 1.02, easing: EASE_IN_OUT },
        ),
      );
    }
    await Promise.all(jobs);
    // 最后一帧与目标完全重合，再淡掉这一层，避免边缘的亚像素差
    await this.play(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out" });
  }

  /** 落地：居中的标题飞向页面上真实的标题，底色淡出露出页面 */
  async land(target: Rect | null, o: { duration?: number } = {}) {
    const d = o.duration ?? 1000;
    this.cancel();
    const jobs = [this.play(this.bg, [{ opacity: 1 }, { opacity: 0 }], { duration: d * 0.7, delay: d * 0.3, easing: "ease-in-out" })];
    if (this.title.textContent) {
      jobs.push(
        this.play(this.title, [{ transform: "none", opacity: 1 }, { transform: this.titleTransform(target), opacity: target ? 1 : 0 }], {
          duration: d,
          easing: EASE_OUT,
        }),
      );
    }
    await Promise.all(jobs);
  }

  /** 离场：页面上的标题飞到中央，底色铺满 */
  async lift(source: Rect | null, o: { duration?: number } = {}) {
    const d = o.duration ?? 800;
    this.cancel();
    this.show();
    const jobs = [this.play(this.bg, [{ opacity: 0 }, { opacity: 1 }], { duration: d * 0.6, easing: "ease-in-out" })];
    if (this.title.textContent) {
      jobs.push(
        this.play(this.title, [{ transform: this.titleTransform(source), opacity: source ? 1 : 0 }, { transform: "none", opacity: 1 }], {
          duration: d,
          easing: EASE_IN_OUT,
        }),
      );
    }
    await Promise.all(jobs);
  }

  /** 没有对应形变时的兜底：整层淡出 */
  async fade(duration = 700) {
    await this.play(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out" });
  }
}

export { EASE_IN_OUT, EASE_OUT };
export type { Rect };
