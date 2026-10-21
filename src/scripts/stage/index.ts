// 首页舞台入口：取代原来的 world3d/index.ts。
import { detectQuality } from "../world3d/quality";
import type { StageModule } from "./core";
import type { TrackEntry } from "./director";
import { HandoffLayer, incoming, settle } from "../handoff";

/** 没有三维舞台可以接住返回时：交接层直接淡出 */
async function dismissHandoff() {
  if (!incoming()) return;
  document.documentElement.dataset.handoffClaimed = "1";
  const layer = HandoffLayer.find();
  await layer?.fade(600);
  layer?.hide();
  settle();
}

// 与旧运行时（public/app.js）的天气事件对接：本模块在 DOMContentLoaded 之前注册
let pendingWeather: string | undefined;
let applyWeather: ((kind: string | undefined) => void) | null = null;
window.addEventListener("kb:weather", (event) => {
  const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
  if (applyWeather) applyWeather(kind);
  else pendingWeather = kind;
});

async function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>("#world3d");
  const backdrop = document.querySelector<HTMLElement>("#stageBackdrop");
  const hero = document.querySelector<HTMLElement>("#top");
  const quality = detectQuality();
  if (!canvas || !hero || !quality) {
    dismissHandoff();
    return;
  }

  const [{ Director }, { Plate }, { WorldsModule }, { DomModule, PaperModule }, { FictionModule }, { PortraitsModule }, { NotesWall }, { Snapper }] = await Promise.all([
    import("./director"),
    import("./plate"),
    import("./worlds/worlds"),
    import("./paper"),
    import("./fiction"),
    import("./portraits/portraits"),
    import("./notes/wall"),
    import("./snap"),
  ]);

  const track = (id: string) => document.querySelector<HTMLElement>(`[data-stage="${id}"]`);
  const overlay = (id: string) => track(id)?.querySelector<HTMLElement>("[data-overlay]") ?? null;

  // 液态玻璃（data-glass，数字是同一模块内的绘制顺序）与按背景明暗换色的文字（data-tone），见 plate.ts
  const glass: [string, number][] = [
    [".weather-control", 0],
    [".fl .novel-index", 0], [".fl .preview-surface", 1], [".fl .fiction-collection-nav", 2],
    [".wl-card--core", 0], [".wl-card--built", 1], [".wl-card--jet", 2],
    [".pt .pt-holo", 0],
    [".nt .nt-preview", 0], [".nt .nt-filters", 1],
    [".about-copy", 0], [".about-contact", 1],
  ];
  for (const [sel, n] of glass) document.querySelectorAll<HTMLElement>(sel).forEach((el) => (el.dataset.glass = String(n)));
  const tone = [".hero-note", ".hero-intro", ".scroll-cue", ".fl-head", ".wl-head", ".wl-intro", ".wl-colophon", ".pt-head", ".pt-hint", ".pt-hover", ".nt-head", ".nt-total", ".about-number", ".site-footer"];
  for (const sel of tone) document.querySelectorAll<HTMLElement>(sel).forEach((el) => (el.dataset.tone = ""));

  // 首屏：画布上什么也不画，背景交给背景板；形变粒子落在标题与简介上（DomModule 的 data-sample 取样）
  const plate = backdrop ? new Plate(backdrop) : null;
  plate?.setWeather(pendingWeather ?? hero.dataset.weather);
  applyWeather = (kind) => plate?.setWeather(kind);
  const ink: Record<string, string> = { ".hero-klein": "#1746d1", ".hero-blues": "#11100e", ".hero-intro": "#2a3550", ".hero-note": "#2a3550" };
  for (const [sel, c] of Object.entries(ink)) hero.querySelector<HTMLElement>(sel)?.setAttribute("data-sample", c);
  const heroModule = new DomModule("hero", ["#e9e5dc", "#dcd6ca"], hero);

  const entries: TrackEntry[] = [{ module: heroModule, el: hero, kind: "flow-start" }];
  const add = (id: string, module: StageModule) => {
    const el = track(id);
    if (el) entries.push({ module, el, kind: "pinned", overlay: overlay(id) });
  };
  add("fiction", new FictionModule(overlay("fiction")!));
  add("worlds", new WorldsModule(overlay("worlds")!));
  add("portraits", new PortraitsModule(overlay("portraits")!));
  add("notes", new NotesWall(overlay("notes")!));
  const about = track("about");
  if (about) entries.push({ module: new PaperModule("about", ["#f1eadf", "#e5dccd"]), el: about, kind: "flow-end" });

  document.documentElement.classList.add("stage-on");
  const director = new Director(canvas, backdrop, entries, quality);
  director.plate = plate;
  if (!director.webgl) {
    plate?.dispose();
    document.documentElement.classList.remove("stage-on");
    dismissHandoff();
    return;
  }
  (window as unknown as { KB_STAGE?: unknown }).KB_STAGE = director;
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      director.dispose();
      document.documentElement.classList.remove("has-webgl", "stage-on");
      // 退回普通文档流：撤掉导演写在各叠层上的显隐状态，否则其余模块会一直不可见、不可点
      for (const e of entries) {
        const o = e.overlay;
        if (!o) continue;
        o.inert = false;
        o.classList.remove("is-active", "is-sweep-in", "is-sweep-out", "is-leaving");
        for (const prop of ["visibility", "--stage-in", "--stage-dir", "--sweep"]) o.style.removeProperty(prop);
      }
    },
    { once: true },
  );
  director.start();
  new Snapper(director);

  // 经「返回」链接回来：交接层已经铺满，由出发的模块把它演变回自己的画面
  const handoff = incoming();
  if (handoff) {
    director.receive(handoff);
    return;
  }

  // 其他方式回到某个模块（直接打开 /#xxx、浏览器后退且没有 bfcache）：按 hash 落到对应模块
  const hash = location.hash.replace("#", "");
  const byHash: Record<string, string> = { fiction: "fiction", worldbuildings: "worlds", portraits: "portraits", notes: "notes" };
  if (byHash[hash]) {
    requestAnimationFrame(() => director.scrollToModule(byHash[hash], "auto"));
    // 从子页面点「返回」回来：倒放离场动画
    let back = false;
    try {
      back = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {}
    if (back) requestAnimationFrame(() => director.arrive());
  }
}

boot();
