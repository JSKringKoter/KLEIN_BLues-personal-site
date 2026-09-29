// 首屏：沿用天气天空（SkyStage），只做一层适配，使它成为时间线上的第一个模块。
import * as THREE from "three";
import type { FrameState } from "../world3d/manager";
import type { QualityProfile } from "../world3d/quality";
import { SkyStage } from "../world3d/sky/sky-stage";
import { isWeatherKind, type WeatherKind } from "../world3d/sky/presets";
import { Rng, clamp, type SampleBuffers, type StageFrame, type StageModule, type StagePresence } from "./core";

export class HeroModule implements StageModule {
  readonly id = "hero";
  readonly toneMapped = false;
  readonly backdrop: [string, string] = ["#e9e5dc", "#dcd6ca"];
  readonly sky: SkyStage;
  private readonly section: HTMLElement;
  private readonly legacy: FrameState;
  private lastTime = -1;

  constructor(section: HTMLElement, quality: QualityProfile, initial: string | undefined) {
    this.section = section;
    const kind: WeatherKind = isWeatherKind(initial) ? initial : "default";
    this.sky = new SkyStage(section, quality, () => {}, kind);
    this.legacy = {
      time: 0,
      delta: 0,
      pointer: new THREE.Vector2(),
      scrollProgress: 0,
      scrollVelocity: 0,
      reducedMotion: false,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  get scene() {
    return this.sky.scene;
  }

  get camera() {
    return this.sky.camera;
  }

  setWeather(kind: string | undefined) {
    if (isWeatherKind(kind)) this.sky.setWeather(kind);
  }

  resize(width: number, height: number) {
    this.legacy.width = width;
    this.legacy.height = height;
    this.sky.resize(width, height);
  }

  skipIntro() {
    this.sky.skipIntro();
  }

  update(f: StageFrame, _p: StagePresence) {
    // 离开首屏期间不会调用 update；回来时把错过的时间补上，免得开场动画接着播
    if (this.lastTime >= 0 && f.time - this.lastTime > 0.25) this.sky.advance(f.time - this.lastTime - f.delta);
    this.lastTime = f.time;
    const rect = this.section.getBoundingClientRect();
    const l = this.legacy;
    l.time = f.time;
    l.delta = f.delta;
    l.pointer.copy(f.pointer);
    l.scrollVelocity = f.scrollVelocity;
    l.reducedMotion = f.reducedMotion;
    l.scrollProgress = clamp(-rect.top / Math.max(1, rect.height));
    this.sky.update(l);
  }

  pointerDown(ndc: THREE.Vector2) {
    this.sky.pointerDown(ndc);
  }

  /** 群山与云：在屏幕下半部的山脊和上半部的天空上取点 */
  sample(count: number, out: SampleBuffers) {
    const rng = new Rng(3);
    const pal = this.sky.palette();
    const cam = this.sky.camera;
    cam.updateMatrixWorld();
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const ground = rng.next() < 0.68;
      const x = rng.range(-1.05, 1.05);
      const y = ground ? -1 + Math.pow(rng.next(), 0.8) * 0.95 : rng.range(-0.05, 1.05);
      v.set(x, y, 0.5).unproject(cam).sub(cam.position).normalize();
      const dist = ground ? 40 + (y + 1) * 180 : 260;
      v.multiplyScalar(dist).add(cam.position);
      out.pos[i * 3] = v.x;
      out.pos[i * 3 + 1] = v.y;
      out.pos[i * 3 + 2] = v.z;
      if (ground) {
        const layer = Math.min(pal.ridges.length - 1, Math.floor((1 - (y + 1) / 0.95) * pal.ridges.length));
        c.copy(pal.ridges[pal.ridges.length - 1 - Math.max(0, layer)] ?? pal.horizon);
      } else {
        c.copy(rng.next() < 0.5 ? pal.cloud : pal.horizon).lerp(pal.top, rng.next() * 0.4);
      }
      out.col[i * 3] = c.r;
      out.col[i * 3 + 1] = c.g;
      out.col[i * 3 + 2] = c.b;
      out.size[i] = ground ? 2.2 + rng.next() * 1.4 : 1.6 + rng.next();
    }
  }

  dispose() {
    this.sky.dispose();
  }
}
