// 首页舞台入口：取代原来的 world3d/index.ts。
import { detectQuality } from "../world3d/quality";
import type { StageModule } from "./core";
import type { TrackEntry } from "./director";

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
  if (!canvas || !hero || !quality) return;

  const [{ Director }, { HeroModule }, { WorldsModule }, { PaperModule, DomModule }, { PortraitsModule }, { NotesModule }, { Snapper }] = await Promise.all([
    import("./director"),
    import("./hero"),
    import("./worlds/worlds"),
    import("./paper"),
    import("./portraits/portraits"),
    import("./notes/notes"),
    import("./snap"),
  ]);

  const track = (id: string) => document.querySelector<HTMLElement>(`[data-stage="${id}"]`);
  const overlay = (id: string) => track(id)?.querySelector<HTMLElement>("[data-overlay]") ?? null;

  const heroModule = new HeroModule(hero, quality, pendingWeather ?? hero.dataset.weather);
  // 本次会话已经看过开屏：首屏的镜头推进也不再重播
  if (document.documentElement.classList.contains("kb-seen")) heroModule.skipIntro();
  applyWeather = (kind) => heroModule.setWeather(kind);

  const entries: TrackEntry[] = [{ module: heroModule, el: hero, kind: "flow-start" }];
  const add = (id: string, module: StageModule) => {
    const el = track(id);
    if (el) entries.push({ module, el, kind: "pinned", overlay: overlay(id) });
  };
  add("fiction", new DomModule("fiction", ["#f4efe5", "#e6ddcd"], overlay("fiction")));
  add("worlds", new WorldsModule(overlay("worlds")!));
  add("portraits", new PortraitsModule(overlay("portraits")!));
  add("notes", new NotesModule(overlay("notes")!));
  add("atlas", new PaperModule("atlas", ["#f3eee3", "#e2d9c7"]));
  const about = track("about");
  if (about) entries.push({ module: new PaperModule("about", ["#f1eadf", "#e5dccd"]), el: about, kind: "flow-end" });

  document.documentElement.classList.add("stage-on");
  const director = new Director(canvas, backdrop, entries, quality);
  if (!director.webgl) {
    document.documentElement.classList.remove("stage-on");
    return;
  }
  (window as unknown as { KB_STAGE?: unknown }).KB_STAGE = director;
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      director.dispose();
      document.documentElement.classList.remove("has-webgl", "stage-on");
    },
    { once: true },
  );
  director.start();
  new Snapper(director);

  // 从子页面返回时，按 hash 落到对应模块
  const hash = location.hash.replace("#", "");
  const byHash: Record<string, string> = { fiction: "fiction", worldbuildings: "worlds", portraits: "portraits", notes: "notes", "travel-map": "atlas" };
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
