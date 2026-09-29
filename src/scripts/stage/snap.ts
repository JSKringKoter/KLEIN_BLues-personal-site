// 整页吸附：滚轮 / 触控滑动 / 方向键一次只走一格，由这里接管滚动并以缓动动画滑到上一个或下一个模块。
// 模块之间的形变完全由滚动位置驱动，所以往回滑时形变会倒放——进入与退出同样有过渡。
// 「关于」之后是普通文档流，在那里恢复原生滚动。

export interface SnapHost {
  /** 升序排列的吸附点（scrollY） */
  snapPoints(): number[];
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const INSTANT = "instant" as ScrollBehavior;

export class Snapper {
  private readonly host: SnapHost;
  private readonly reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private anim = 0;
  private animating = false;
  private lastWheel = 0;
  private wheelAcc = 0;
  private settleTimer = 0;
  private selfScroll = false;
  private touchY = -1;
  private touchX = -1;
  private touchScrollable = false;
  /** 当前（或正在前往的）吸附点序号 */
  private index = 0;

  constructor(host: SnapHost) {
    this.host = host;
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    // 导航里的锚点也走同一套动画
    document.addEventListener("click", this.onAnchor);
    this.index = this.nearest(window.scrollY);
  }

  private get blocked() {
    const html = document.documentElement;
    return document.body.classList.contains("is-locked") || html.classList.contains("kb-reading") || html.classList.contains("kb-hold");
  }

  private points() {
    return this.host.snapPoints();
  }

  private nearest(s: number) {
    const p = this.points();
    let best = 0;
    p.forEach((v, i) => {
      if (Math.abs(v - s) < Math.abs(p[best] - s)) best = i;
    });
    return best;
  }

  /** 最后一个吸附点之后是自由滚动区 */
  private inFreeZone(s: number, dir: number) {
    const p = this.points();
    const last = p[p.length - 1];
    return dir > 0 ? s >= last - 2 : s > last + 2;
  }

  /** 事件目标里是否有还能朝该方向滚动的容器（列表、面板） */
  private scrollableAlong(target: EventTarget | null, dy: number) {
    let el = target instanceof Element ? target : null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 1) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll") {
          if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          if (dy < 0 && el.scrollTop > 0) return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }

  go(i: number) {
    const p = this.points();
    const k = Math.max(0, Math.min(p.length - 1, i));
    this.index = k;
    this.animateTo(p[k]);
  }

  step(dir: 1 | -1) {
    const s = window.scrollY;
    const p = this.points();
    // 以当前位置为准重新定位，避免原生滚动后序号过期
    let i = this.animating ? this.index : this.nearest(s);
    if (!this.animating) {
      if (dir > 0 && p[i] > s + 4) i -= 1;
      if (dir < 0 && p[i] < s - 4) i += 1;
    }
    this.go(i + dir);
  }

  private animateTo(target: number) {
    cancelAnimationFrame(this.anim);
    const from = window.scrollY;
    const dist = Math.abs(target - from);
    if (dist < 1) {
      this.animating = false;
      return;
    }
    if (this.reduced.matches) {
      this.selfScroll = true;
      window.scrollTo({ top: target, behavior: INSTANT });
      this.animating = false;
      return;
    }
    const vh = window.innerHeight;
    // 相邻两格约 1.6 秒（中间的形变段约占一秒）；跨越多格时略长，但不拖沓
    const duration = Math.min(2.6, 1.05 + 0.32 * (dist / vh)) * 1000;
    const start = performance.now();
    this.animating = true;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      this.selfScroll = true;
      window.scrollTo({ top: from + (target - from) * easeInOutCubic(t), behavior: INSTANT });
      if (t < 1) this.anim = requestAnimationFrame(tick);
      else {
        this.animating = false;
        this.lastWheel = performance.now();
      }
    };
    this.anim = requestAnimationFrame(tick);
  }

  private onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return;
    if (this.blocked) {
      if (document.documentElement.classList.contains("kb-hold") && e.cancelable) e.preventDefault();
      return;
    }
    const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : 0;
    if (!dy) return;
    if (this.scrollableAlong(e.target, dy)) return;
    const s = window.scrollY;
    if (!this.animating && this.inFreeZone(s, dy)) return;
    e.preventDefault();
    const now = performance.now();
    const gap = now - this.lastWheel;
    this.lastWheel = now;
    // 动画进行中、或触控板惯性的尾巴：吞掉
    if (this.animating) return;
    if (gap < 140) {
      this.wheelAcc = 0;
      return;
    }
    this.wheelAcc += dy;
    if (Math.abs(this.wheelAcc) < 24) {
      // 细小的输入先攒着，等下一次事件
      this.lastWheel = 0;
      return;
    }
    const dir = this.wheelAcc > 0 ? 1 : -1;
    this.wheelAcc = 0;
    this.step(dir);
  };

  private onKey = (e: KeyboardEvent) => {
    if (this.blocked || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest("input, textarea, select, [contenteditable]")) return;
    let dir = 0;
    if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) dir = 1;
    else if (["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey)) dir = -1;
    else if (e.key === "Home") {
      e.preventDefault();
      this.go(0);
      return;
    }
    if (!dir) return;
    if (e.key === " " && t?.closest("button, a")) return;
    if (this.inFreeZone(window.scrollY, dir) && !this.animating) return;
    e.preventDefault();
    if (!this.animating) this.step(dir as 1 | -1);
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    this.touchY = e.touches[0].clientY;
    this.touchX = e.touches[0].clientX;
    this.touchScrollable = false;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.touchY < 0 || this.blocked) return;
    const dy = this.touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 4) return;
    if (this.touchScrollable || this.scrollableAlong(e.target, dy)) {
      this.touchScrollable = true;
      return;
    }
    if (!this.animating && this.inFreeZone(window.scrollY, dy)) return;
    if (e.cancelable) e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.touchY < 0) return;
    const t = e.changedTouches[0];
    const dy = this.touchY - t.clientY;
    const dx = this.touchX - t.clientX;
    this.touchY = -1;
    if (this.blocked || this.touchScrollable || this.animating) return;
    if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
    const dir = dy > 0 ? 1 : -1;
    if (this.inFreeZone(window.scrollY, dir)) return;
    this.step(dir);
  };

  /** 拖动滚动条等原生滚动停下后，就近吸附 */
  private onScroll = () => {
    if (this.selfScroll) {
      this.selfScroll = false;
      return;
    }
    if (this.animating) return;
    clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => {
      if (this.animating || this.blocked) return;
      const s = window.scrollY;
      if (this.inFreeZone(s, -1)) return;
      this.go(this.nearest(s));
    }, 220);
  };

  private onAnchor = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href")!.slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    // 画中人正拿着一张卡：先放下
    if (document.documentElement.classList.contains("kb-hold")) window.dispatchEvent(new Event("kb:release"));
    const top = el.getBoundingClientRect().top + window.scrollY;
    history.replaceState(null, "", `#${id}`);
    const p = this.points();
    // 锚点落在某个吸附点附近就去那个吸附点，否则（例如「关于」之后）直接去锚点
    const i = this.nearest(top);
    if (Math.abs(p[i] - top) < window.innerHeight * 0.9) this.go(i);
    else this.animateTo(top);
  };
}
