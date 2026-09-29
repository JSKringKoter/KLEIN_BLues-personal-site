import * as THREE from "three";
import type { FrameState, Stage } from "../manager";
import type { QualityProfile } from "../quality";
import { createRidgeMaterial, createSkyMaterial } from "./materials";
import { Precipitation } from "./precipitation";
import { cloneWeather, lerpWeather, resolveWeather, type WeatherKind, type WeatherState } from "./presets";

// Far to near. `base`/`amp` are in screen-proportional plane UVs; 0.5 is eye level.
const ridgeLayers = [
  { distance: 260, base: 0.47, amp: 0.085, freq: 3.2, seed: 1.3, haze: 0.16, fog: 0.9, snow: 1 },
  { distance: 170, base: 0.43, amp: 0.07, freq: 4.4, seed: 2.9, haze: 0.08, fog: 0.75, snow: 0.8 },
  { distance: 110, base: 0.39, amp: 0.05, freq: 6, seed: 4.1, haze: 0.03, fog: 0.55, snow: 0 },
  { distance: 60, base: 0.34, amp: 0.035, freq: 8.5, seed: 5.7, haze: 0, fog: 0.35, snow: 0 },
  { distance: 30, base: 0.28, amp: 0.025, freq: 12, seed: 7.2, haze: 0, fog: 0.2, snow: 0 }
];

const transitionSeconds = 1.8;
const introDelay = 0.8;
const introSeconds = 2.6;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export class SkyStage implements Stage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  readonly section: HTMLElement;

  private readonly invalidate: () => void;
  private readonly pixelRatio: number;
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly ridges: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[];
  private readonly precipitation: Precipitation;
  private readonly lookTarget = new THREE.Vector3();
  private readonly cloudOffset = new THREE.Vector2();

  private state: WeatherState;
  private from: WeatherState;
  private to: WeatherState;
  private blend = 1;
  private clock = 0;
  private gust = 0;
  private gustTarget = 0;
  private rippleAge = 10;
  private strikeAge = 10;
  private nextStrike = 2;
  private aspect = 1;
  private height = 1;
  private sectionHeight = 1;

  constructor(section: HTMLElement, quality: QualityProfile, invalidate: () => void, initial: WeatherKind) {
    this.section = section;
    this.invalidate = invalidate;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio);
    this.state = resolveWeather(initial);
    this.from = cloneWeather(this.state);
    this.to = cloneWeather(this.state);

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), createSkyMaterial(quality.cloudOctaves));
    this.sky.frustumCulled = false;
    this.sky.renderOrder = 0;
    this.scene.add(this.sky);

    this.ridges = ridgeLayers.map((layer, index) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), createRidgeMaterial(layer));
      mesh.position.z = -layer.distance;
      mesh.renderOrder = 1 + index;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      return mesh;
    });

    this.precipitation = new Precipitation(quality.particleScale);
    this.scene.add(this.precipitation.rain, this.precipitation.snow);
  }

  setWeather(kind: WeatherKind) {
    this.from = cloneWeather(this.state);
    this.to = resolveWeather(kind);
    this.blend = 0;
    this.invalidate();
  }

  resize(width: number, height: number) {
    this.aspect = width / height;
    this.height = height;
    this.sectionHeight = this.section.offsetHeight || height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // Planes span the frustum at their depth, so ridge UVs stay screen-proportional on any aspect.
    this.ridges.forEach((mesh, index) => {
      const frustumHeight = 2 * ridgeLayers[index].distance * tan;
      mesh.scale.set(frustumHeight * Math.max(this.aspect, 1.2) * 2.6, frustumHeight * 3.2, 1);
    });
  }

  pointerDown(ndc: THREE.Vector2) {
    this.directionFromNdc(ndc, this.sky.material.uniforms.uRippleDir.value);
    this.rippleAge = 0;
    this.gustTarget = 1;
    if (this.state.lightning > 0.5) this.strikeAge = 0;
  }

  update(frame: FrameState) {
    const dt = frame.delta;
    this.clock += dt;

    if (this.blend < 1) {
      this.blend = frame.reducedMotion ? 1 : Math.min(1, this.blend + dt / transitionSeconds);
      lerpWeather(this.state, this.from, this.to, easeInOutCubic(this.blend));
      if (frame.reducedMotion) this.invalidate();
    }
    const state = this.state;

    this.gustTarget *= Math.exp(-dt * 1.4);
    this.gust += (this.gustTarget - this.gust) * (1 - Math.exp(-dt * 8));
    this.rippleAge += dt;
    const flash = this.updateLightning(dt, frame.reducedMotion) * state.lightning;

    this.updateCamera(frame);

    const wind = state.wind + Math.min(1.5, Math.abs(frame.scrollVelocity) * 0.6);
    this.cloudOffset.x += (state.cloudSpeed * (1 + wind) + this.gust * 0.06) * dt;
    this.cloudOffset.y += state.cloudSpeed * 0.3 * dt;
    const pointerMoved = frame.pointer.lengthSq() > 1e-6;

    const sky = this.sky.material.uniforms;
    this.sky.position.copy(this.camera.position);
    sky.uTime.value = frame.time;
    sky.uTop.value.copy(state.skyTop);
    sky.uHorizon.value.copy(state.skyHorizon);
    sky.uGlow.value.copy(state.glow);
    sky.uSunColor.value.copy(state.sunColor);
    sky.uCloudLit.value.copy(state.cloudLit);
    sky.uCloudShade.value.copy(state.cloudShade);
    sky.uShadow.value.copy(state.shadow);
    sky.uSunDir.value.set(
      Math.sin(state.sunAzimuth) * Math.cos(state.sunElevation),
      Math.sin(state.sunElevation),
      -Math.cos(state.sunAzimuth) * Math.cos(state.sunElevation)
    );
    sky.uSunSize.value = state.sunSize;
    sky.uSunIntensity.value = state.sunIntensity;
    sky.uHalo.value = state.halo;
    sky.uCloudCover.value = state.cloudCover;
    sky.uCloudOffset.value.copy(this.cloudOffset);
    sky.uStars.value = state.stars;
    sky.uFog.value = state.fog;
    sky.uFlash.value = flash;
    sky.uPointerStrength.value = pointerMoved ? 1 : 0;
    sky.uRippleAge.value = this.rippleAge;
    this.directionFromNdc(frame.pointer, sky.uPointerDir.value);

    this.ridges.forEach((mesh, index) => {
      const layer = ridgeLayers[index];
      const uniforms = mesh.material.uniforms;
      mesh.position.y = Math.sin(frame.time * 0.25 + index * 1.7) * 0.004 * layer.distance;
      uniforms.uColor.value.copy(state.ridges[index]);
      uniforms.uShadow.value.copy(state.shadow);
      uniforms.uHaze.value.copy(state.skyHorizon);
      uniforms.uHazeAmount.value = Math.min(1, layer.haze + state.fog * layer.fog);
      uniforms.uSnow.value = state.snowCaps * layer.snow;
      uniforms.uFlash.value = flash;
    });

    this.precipitation.update({
      time: frame.time,
      delta: dt,
      rain: state.rain,
      snow: state.snow,
      wind,
      gust: this.gust,
      color: state.precipColor,
      pointer: frame.pointer,
      push: pointerMoved ? 1 : 0,
      aspect: this.aspect,
      resolutionY: this.height * this.pixelRatio
    });
  }

  dispose() {
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.ridges.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.precipitation.dispose();
  }

  // Scrolling moves the view with the page at a slower rate (parallax) while the camera glides
  // forward and tips toward the land, so the ridges rise into the part of the hero still on screen.
  private updateCamera(frame: FrameState) {
    const intro = frame.reducedMotion ? 1 : THREE.MathUtils.clamp((this.clock - introDelay) / introSeconds, 0, 1);
    const approach = 1 - (1 - intro) ** 3;
    const descend = easeInOutSine(frame.scrollProgress);
    const breath = Math.sin(Math.PI * this.blend) * 0.9;
    const { pointer } = frame;

    this.camera.position.set(
      pointer.x * 1.1,
      pointer.y * 0.45 - descend * 1.6 + (1 - approach) * 2.2,
      -descend * 14 + (1 - approach) * 9 - breath
    );
    this.lookTarget.set(pointer.x * 0.4, 3.5 - descend * 9 + (1 - approach) * 6, -100);
    this.camera.lookAt(this.lookTarget);
    const offset = frame.scrollProgress * this.sectionHeight * 0.55;
    this.camera.setViewOffset(frame.width, frame.height, 0, offset, frame.width, frame.height);
    if (intro < 1) this.invalidate();
  }

  private updateLightning(dt: number, reducedMotion: boolean) {
    if (this.state.lightning > 0.5 && !reducedMotion) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.strikeAge = 0;
        this.nextStrike = 3 + Math.random() * 6;
      }
    }
    this.strikeAge += dt;
    const age = this.strikeAge;
    return Math.exp(-age * 9) * (age < 3 ? 1 : 0) + (age > 0.14 && age < 3 ? 0.7 * Math.exp(-(age - 0.14) * 7) : 0);
  }

  private directionFromNdc(ndc: THREE.Vector2, target: THREE.Vector3) {
    this.camera.updateMatrixWorld();
    return target.set(ndc.x, ndc.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
  }
}
