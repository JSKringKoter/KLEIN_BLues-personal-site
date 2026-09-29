// /worldbuildings/portraits/：与首页「画中人」模块同一套卡桌（src/scripts/stage/portraits），这里给它一个独立的画布与渲染循环。
import * as THREE from "three";
import type { StageFrame, StagePresence } from "../stage/core";
import { PortraitsModule } from "../stage/portraits/portraits";

export function mountPortraits(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>(".pt-canvas");
  const overlay = root.querySelector<HTMLElement>("[data-pt]");
  if (!canvas || !overlay) return;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    root.classList.add("is-static");
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  const module = new PortraitsModule(overlay);
  module.attach(renderer);
  module.prepare();

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const frame: StageFrame = {
    time: 0,
    delta: 0,
    pointer: new THREE.Vector2(),
    pointerRaw: new THREE.Vector2(),
    pointerInside: false,
    width: 1,
    height: 1,
    pixelRatio: renderer.getPixelRatio(),
    reducedMotion: reduced.matches,
    scrollVelocity: 0,
  };
  const presence: StagePresence = { presence: 1, hold: 0, active: true, morph: -1, role: 0 };

  const resize = () => {
    frame.width = root.clientWidth;
    frame.height = root.clientHeight;
    renderer.setSize(frame.width, frame.height, false);
    module.resize(frame.width, frame.height);
  };
  new ResizeObserver(resize).observe(root);
  resize();

  window.addEventListener("pointermove", (e) => {
    frame.pointerInside = true;
    frame.pointerRaw.set((e.clientX / frame.width) * 2 - 1, -(e.clientY / frame.height) * 2 + 1);
  });
  document.documentElement.addEventListener("pointerleave", () => (frame.pointerInside = false));

  let last = performance.now();
  const start = last;
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.body.classList.contains("is-locked")) return;
    frame.delta = dt;
    frame.time = (now - start) / 1000;
    frame.reducedMotion = reduced.matches;
    module.update(frame, presence);
    renderer.render(module.scene, module.camera);
  };
  requestAnimationFrame(tick);
  root.classList.add("is-ready");
}
