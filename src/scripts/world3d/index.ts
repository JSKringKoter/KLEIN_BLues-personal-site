import { detectQuality } from "./quality";

// Registered synchronously: this module runs before DOMContentLoaded, when public/app.js
// initialises and may already announce a weather (e.g. `?weather=snow`) while three.js is still loading.
let pendingWeather: string | undefined;
let applyWeather: ((kind: string | undefined) => void) | null = null;
window.addEventListener("kb:weather", (event) => {
  const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
  if (applyWeather) applyWeather(kind);
  else pendingWeather = kind;
});

// The homepage keeps working without this module: the CSS backgrounds stay in place
// until `has-webgl` lands on <html>, which only happens after the first 3D frame.
async function boot() {
  const hero = document.querySelector<HTMLElement>("#top");
  const canvas = document.querySelector<HTMLCanvasElement>("#world3d");
  if (!hero || !canvas) return;

  const quality = detectQuality();
  if (!quality) return;

  const [{ StageManager }, { SkyStage }, { isWeatherKind }] = await Promise.all([
    import("./manager"),
    import("./sky/sky-stage"),
    import("./sky/presets")
  ]);

  let manager: InstanceType<typeof StageManager>;
  try {
    manager = new StageManager(canvas, quality);
  } catch {
    return;
  }

  const initial = pendingWeather ?? hero.dataset.weather;
  const sky = new SkyStage(hero, quality, manager.invalidate, isWeatherKind(initial) ? initial : "default");
  manager.add(sky);
  applyWeather = (kind) => {
    if (isWeatherKind(kind)) sky.setWeather(kind);
  };

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    applyWeather = null;
    document.documentElement.classList.remove("has-webgl");
    manager.dispose();
  }, { once: true });

  manager.start();
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("has-webgl")));
}

boot();
