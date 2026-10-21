// 一纸空文：旧站的目录 + 预览卡（DOM，由 public/app.js 的 renderNovels 渲染），画布上不画东西。
// 滚动形变：粒子凝结成一行行目录（每行带 data-sample），各行随 --stage-in 依次就位（见 stage.css）。
// 离场：被点中的一行展开成整屏——行的底色与模糊封面溶进该篇的主题底色，篇名飞到中央，再跳到阅读页，
//       阅读页首帧铺好同一画面，篇名落到它的标题位置（src/scripts/handoff-page.ts）。
// 返回：阅读页把画面收回交接状态后回到这里，整屏再收拢回那一行，篇名落回原处——离场的倒放。
import { DomModule } from "./paper";
import { HandoffLayer, leave, normPath, reducedMotion, settle, type Handoff } from "../handoff";

interface OpenDetail {
  href: string;
  title: string;
  theme: string;
}

const PAPER = "#f1eadf";

/** url(...) 里的相对路径转成绝对地址：交接层的样式在打包后的 /_astro/*.css 里，相对路径会被解析到 /_astro/ 下面 */
const absUrl = (v: string) => v.replace(/url\((['"]?)(.*?)\1\)/g, (_m, _q, u: string) => `url("${new URL(u, location.href).href}")`);

export class FictionModule extends DomModule {
  private readonly root: HTMLElement;
  private readonly layer = HandoffLayer.find();
  private opened: (OpenDetail & { row: HTMLElement }) | null = null;
  private leaving = false;

  constructor(overlay: HTMLElement) {
    super("fiction", ["#f4efe5", "#e6ddcd"], overlay);
    this.root = overlay;
    // 目录不显示滚动条：还能往哪边滚，就让那一侧淡出
    const index = overlay.querySelector<HTMLElement>("#novelIndex");
    if (index) {
      const more = () => {
        const up = index.scrollTop > 2;
        const down = index.scrollTop + index.clientHeight < index.scrollHeight - 2;
        index.dataset.more = [up && "up", down && "down"].filter(Boolean).join(" ");
      };
      index.addEventListener("scroll", more, { passive: true });
      new MutationObserver(more).observe(index, { childList: true });
      new ResizeObserver(more).observe(index);
      more();
    }
    overlay.addEventListener("kb:fiction-open", (event) => {
      const row = (event.target as Element | null)?.closest<HTMLElement>(".novel-row");
      if (!row || !this.layer) return;
      event.preventDefault();
      this.open(row, (event as CustomEvent<OpenDetail>).detail);
    });
  }

  private look(row: HTMLElement, d: { title: string; theme: string }) {
    const cs = getComputedStyle(row);
    this.layer!.configure({
      kind: "fiction",
      theme: d.theme,
      title: d.title,
      fromColor: cs.getPropertyValue("--row-color").trim(),
      fromImage: absUrl(cs.getPropertyValue("--novel-cover").trim()),
    });
  }

  private async open(row: HTMLElement, d: OpenDetail) {
    if (this.leaving) return;
    this.leaving = true;
    this.opened = { ...d, row };
    leave(d.href, { from: "fiction", kind: "fiction", theme: d.theme, title: d.title, path: location.pathname });
    if (reducedMotion()) {
      location.assign(d.href);
      return;
    }
    document.documentElement.classList.add("kb-busy");
    this.look(row, d);
    const titleFrom = row.querySelector("h3")?.getBoundingClientRect() ?? null;
    row.classList.add("is-opening");
    this.root.classList.add("is-leaving");
    await this.layer!.expand({ rect: row.getBoundingClientRect(), titleFrom, titleColor: PAPER });
    // 期间被 bfcache 恢复撤销了就不跳
    if (this.leaving) location.assign(d.href);
  }

  /** 把这一行摆到目录可见处，并设为当前预览 */
  private present(row: HTMLElement) {
    const list = row.parentElement;
    if (list && list.scrollHeight > list.clientHeight + 1) {
      const r = row.getBoundingClientRect();
      const b = list.getBoundingClientRect();
      list.scrollTop += r.top - b.top - (b.height - r.height) / 2;
    }
    row.dispatchEvent(new Event("pointerenter"));
  }

  /** 整屏的交接层收拢回这一行 */
  private async collapse(row: HTMLElement, d: { title: string; theme: string }) {
    const layer = this.layer!;
    const html = document.documentElement;
    html.classList.add("kb-busy");
    this.present(row);
    this.look(row, d);
    row.classList.add("is-opening");
    // 其余版面先瞬间藏起，随交接层收拢再浮现
    this.root.classList.add("is-leaving", "is-instant");
    void this.root.offsetWidth;
    this.root.classList.remove("is-instant", "is-leaving");
    this.root.classList.add("is-returning");
    const titleTo = row.querySelector("h3")?.getBoundingClientRect() ?? null;
    await layer.collapse({ rect: row.getBoundingClientRect(), titleTo, titleColor: PAPER });
    row.classList.remove("is-opening");
    layer.hide();
    settle();
    html.classList.remove("kb-busy");
    window.setTimeout(() => this.root.classList.remove("is-returning"), 1200);
    this.leaving = false;
    this.opened = null;
  }

  async receive(h: Handoff) {
    if (!this.layer || reducedMotion()) return false;
    const path = normPath(h.path ?? "");
    const kb = (window as unknown as { KB?: { showNovelCollection?: (c: string) => void } }).KB;
    kb?.showNovelCollection?.(path.startsWith("/unfinished") ? "unfinished" : "complete");
    const row = Array.from(this.root.querySelectorAll<HTMLElement>(".novel-row[data-route]")).find(
      (r) => normPath(r.dataset.route ?? "") === path,
    );
    if (!row) return false;
    await this.collapse(row, { title: h.title ?? row.querySelector("h3")?.textContent ?? "", theme: h.theme ?? row.dataset.theme ?? "" });
    return true;
  }

  /** 浏览器后退（bfcache）：页面停在离场的最后一帧，原地倒放 */
  arrive() {
    if (!this.opened) return false;
    const { row, title, theme } = this.opened;
    this.collapse(row, { title, theme });
    return true;
  }
}
