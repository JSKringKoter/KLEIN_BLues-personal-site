// 整页吸附：滚轮不再「一格一页」，而是像拖着页面走——
//   滚动时页面跟着手（平滑追随），模块之间的形变随之一点点推进，看得见要去哪里；
//   停手后再决定落点：越过当前模块与相邻模块之间约 15% 的距离就滑到下一个模块，否则弹回原处。
//   一次手势最多走到相邻的模块；翻页之后，同方向的惯性尾巴被吞掉，不会连跳几页。
//   没越过阈值时不急着弹回：先停一会儿，慢慢一格一格地滚也能攒够距离；真是误碰，才轻轻弹回原处。
// 方向键 / 触控滑动 / 页内锚点仍然一次走一格，由缓动动画完成。
// 模块之间的形变完全由滚动位置驱动，所以往回滑时形变会倒放。「关于」之后是普通文档流，在那里恢复原生滚动。

export interface SnapHost {
  /** 升序排列的吸附点（scrollY） */
  snapPoints(): number[];
}

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
// 停手后的落点：比 cubic 收得更柔，尾段慢慢落定
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const INSTANT = "instant" as ScrollBehavior;
/** 滚轮一格（约 100px 的 deltaY）让页面走多少 */
const GAIN = 1.5;
/** 越过相邻两点距离的这个比例，停手后就前往下一个模块 */
const THRESHOLD = 0.15;
/** 多久没有新的滚轮输入算作停手（越过阈值时） */
const IDLE_MS = 170;
/** 没越过阈值时，停手多久才弹回（给慢慢一格一格滚的人留时间） */
const RETURN_MS = 650;
/** 翻页之后，同方向的滚轮输入安静多久才重新接受（吞掉触控板惯性） */
const QUIET_MS = 240;

type Mode = "idle" | "drag" | "tween";

export class Snapper {
  private readonly host: SnapHost;
  private readonly reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private mode: Mode = "idle";
  private raf = 0;
  private last = 0;
  /** 我们写入的滚动位置（用来区分自己的滚动与原生滚动） */
  private written = -1;
  private current = 0;
  private target = 0;
  /** 本次手势出发时所在的吸附点 */
  private anchor = 0;
  /** 当前（或正在前往的）吸附点序号 */
  private index = 0;
  private tw = { from: 0, to: 0, start: 0, dur: 1, ease: easeOutQuart };
  private idleTimer = 0;
  private settleTimer = 0;
  private touchY = -1;
  private touchX = -1;
  private touchScrollable = false;
  /** 翻页后锁住的方向：同方向的惯性输入被吞掉，直到安静 QUIET_MS 或明显的新一轮输入 */
  private lockDir = 0;
  private lockAbs = 0;
  private lockTimer = 0;

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
    // kb-busy：跨页形变进行中（离场或接住返回），这时不能动滚动位置
    return document.body.classList.contains("is-locked") || ["kb-reading", "kb-hold", "kb-busy"].some((c) => html.classList.contains(c));
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

  /* ---------------- 动画循环 ---------------- */

  private write(y: number) {
    this.written = y;
    window.scrollTo({ top: y, behavior: INSTANT });
  }

  private run() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.mode = "idle";
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.mode === "drag") {
      // 平滑追随：滚轮一格一格的输入被抹成连续的移动
      this.current += (this.target - this.current) * (1 - Math.exp(-dt * 6.5));
      if (Math.abs(this.target - this.current) < 0.4) this.current = this.target;
      this.write(this.current);
      if (this.current !== this.target) this.run();
    } else if (this.mode === "tween") {
      const { from, to, start, dur, ease } = this.tw;
      const t = Math.min(1, (now - start) / dur);
      this.current = from + (to - from) * ease(t);
      this.write(this.current);
      if (t < 1) this.run();
      else this.mode = "idle";
    }
  };

  /** 缓动到某个位置 */
  private tweenTo(y: number, ease = easeInOutSine) {
    const from = this.mode === "idle" ? window.scrollY : this.current;
    const dist = Math.abs(y - from);
    clearTimeout(this.idleTimer);
    if (dist < 1) {
      this.stop();
      return;
    }
    if (this.reduced.matches) {
      this.stop();
      this.current = y;
      this.write(y);
      return;
    }
    const vh = window.innerHeight;
    // 已经在动（停手后的落点）用短一些的 ease-out；从静止出发（方向键、锚点）用 ease-in-out
    // 放慢：相邻两页约 1.9～2.2 秒，过渡有足够时间展开
    const base = ease === easeOutQuart ? 0.95 : 1.2;
    const dur = Math.min(2.8, base + 0.6 * (dist / vh)) * 1000;
    this.tw = { from, to: y, start: performance.now(), dur, ease };
    this.current = from;
    this.mode = "tween";
    this.run();
  }

  go(i: number, ease = easeInOutSine) {
    const p = this.points();
    const k = Math.max(0, Math.min(p.length - 1, i));
    this.index = k;
    this.tweenTo(p[k], ease);
  }

  step(dir: 1 | -1) {
    const s = window.scrollY;
    const p = this.points();
    // 以当前位置为准重新定位，避免原生滚动后序号过期
    let i = this.mode === "tween" ? this.index : this.nearest(s);
    if (this.mode !== "tween") {
      if (dir > 0 && p[i] > s + 4) i -= 1;
      if (dir < 0 && p[i] < s - 4) i += 1;
    }
    this.go(i + dir);
  }

  /* ---------------- 滚轮：跟手拖动 + 停手落点 ---------------- */

  private beginDrag(dir: number) {
    if (this.mode === "drag") return;
    if (this.mode === "tween") {
      // 正在滑向某一页时又滚了：出发点算作正在前往的那一页。
      // 同方向：接着往那一页滑（目标先落在那一页，再加上这次的输入），不会被当成往回拖；
      // 反方向：从当前位置开始往回拖。
      this.anchor = this.index;
      const heading = Math.sign(this.tw.to - this.tw.from);
      this.target = heading === dir ? this.tw.to : this.current;
    } else {
      this.current = window.scrollY;
      this.anchor = this.nearest(this.current);
      this.target = this.current;
    }
    this.mode = "drag";
  }

  /** 当前拖动会落到哪个吸附点 */
  private landing() {
    const p = this.points();
    const a = p[this.anchor];
    const d = this.target - a;
    let k = this.anchor;
    if (d > 0 && k < p.length - 1 && d > (p[k + 1] - a) * THRESHOLD) k += 1;
    else if (d < 0 && k > 0 && -d > (a - p[k - 1]) * THRESHOLD) k -= 1;
    return k;
  }

  private release = () => {
    if (this.mode !== "drag") return;
    const k = this.landing();
    if (k !== this.anchor) this.lock(k > this.anchor ? 1 : -1, 0);
    this.go(k, easeOutQuart);
  };

  private lock(dir: number, abs: number) {
    this.lockDir = dir;
    this.lockAbs = abs;
    clearTimeout(this.lockTimer);
    this.lockTimer = window.setTimeout(() => (this.lockDir = 0), QUIET_MS);
  }

  private onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return;
    if (this.blocked) {
      const html = document.documentElement;
      if ((html.classList.contains("kb-hold") || html.classList.contains("kb-busy")) && e.cancelable) e.preventDefault();
      return;
    }
    let dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : 0;
    if (!dy) return;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (this.scrollableAlong(e.target, dy)) return;
    if (this.mode === "idle" && this.inFreeZone(window.scrollY, dy)) return;
    e.preventDefault();
    // 刚翻过一页：同方向、不比上一次更猛的输入是惯性尾巴，吞掉并续上安静计时
    const dir = dy > 0 ? 1 : -1;
    if (this.lockDir === dir) {
      const abs = Math.abs(dy);
      const fresh = this.mode === "idle" && this.lockAbs > 0 && abs > this.lockAbs * 1.6 + 8;
      if (!fresh) {
        this.lock(dir, abs);
        return;
      }
    }
    this.lockDir = 0;
    this.beginDrag(dir);
    const p = this.points();
    // 一次手势最多走到相邻的吸附点
    const lo = p[Math.max(0, this.anchor - 1)];
    const hi = p[Math.min(p.length - 1, this.anchor + 1)];
    this.target = Math.max(lo, Math.min(hi, this.target + dy * GAIN));
    clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(this.release, this.landing() === this.anchor ? RETURN_MS : IDLE_MS);
    this.run();
  };

  /* ---------------- 方向键 / 触控 ---------------- */

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
    if (this.inFreeZone(window.scrollY, dir) && this.mode === "idle") return;
    e.preventDefault();
    if (e.repeat && this.mode === "tween") return;
    this.step(dir as 1 | -1);
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    this.touchY = e.touches[0].clientY;
    this.touchX = e.touches[0].clientX;
    this.touchScrollable = false;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (document.documentElement.classList.contains("kb-busy") && e.cancelable) e.preventDefault();
    if (this.touchY < 0 || this.blocked) return;
    const dy = this.touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 4) return;
    if (this.touchScrollable || this.scrollableAlong(e.target, dy)) {
      this.touchScrollable = true;
      return;
    }
    if (this.mode === "idle" && this.inFreeZone(window.scrollY, dy)) return;
    if (e.cancelable) e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.touchY < 0) return;
    const t = e.changedTouches[0];
    const dy = this.touchY - t.clientY;
    const dx = this.touchX - t.clientX;
    this.touchY = -1;
    if (this.blocked || this.touchScrollable || this.mode === "tween") return;
    if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
    const dir = dy > 0 ? 1 : -1;
    if (this.inFreeZone(window.scrollY, dir)) return;
    this.step(dir);
  };

  /* ---------------- 原生滚动（拖滚动条等）与锚点 ---------------- */

  /** 原生滚动停下后，就近吸附 */
  private onScroll = () => {
    // 自己写入的滚动
    if (Math.abs(window.scrollY - this.written) < 3) return;
    // 动画进行中被原生滚动打断（例如拖了滚动条）：交还给原生，停下后再吸附
    if (this.mode !== "idle") {
      clearTimeout(this.idleTimer);
      this.stop();
    }
    clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => {
      if (this.mode !== "idle" || this.blocked) return;
      const s = window.scrollY;
      if (this.inFreeZone(s, -1)) return;
      this.go(this.nearest(s), easeOutQuart);
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
    else this.tweenTo(top);
  };
}
