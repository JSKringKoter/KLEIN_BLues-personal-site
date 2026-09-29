import * as THREE from "three";

const box = new THREE.Vector3(36, 20, 15);

// Particles live in a box that wraps around the camera, so they keep parallax without ever running out.
const sharedVertex = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uAmount;
uniform float uFall;
uniform float uDrift;
uniform float uWind;
uniform float uSway;
uniform float uAspect;
uniform float uPush;
uniform vec2 uPointer;
uniform vec3 uBox;
varying float vAlpha;

vec3 fallPosition(float factor) {
  vec3 base = aSeed.xyz * uBox;
  base.y -= uFall * factor;
  base.x += uDrift * factor + sin(uTime * 0.7 + aSeed.w * 40.0) * uSway;
  vec2 rel = mod(base.xy - cameraPosition.xy, uBox.xy);
  float relZ = mod(cameraPosition.z - base.z, uBox.z);
  return vec3(cameraPosition.xy + rel - uBox.xy * 0.5, cameraPosition.z - relZ - 1.5);
}

vec4 pushFromPointer(vec4 clip) {
  vec2 delta = clip.xy / clip.w - uPointer;
  delta.x *= uAspect;
  vec2 push = normalize(delta + 1e-5) * smoothstep(0.32, 0.0, length(delta)) * uPush;
  push.x /= uAspect;
  clip.xy += push * clip.w;
  return clip;
}

float visibleFor(float amount) {
  return step(fract(aSeed.w * 7.13 + aSeed.x * 3.1), amount);
}
`;

const rainVertex = /* glsl */ `
${sharedVertex}
attribute float aEnd;
uniform float uLength;
void main() {
  vec3 world = fallPosition(0.75 + 0.5 * aSeed.w);
  vec3 direction = normalize(vec3(uWind * 0.35, -1.0, 0.0));
  world -= direction * uLength * aEnd * (0.6 + 0.8 * aSeed.w);
  float depth = clamp((cameraPosition.z - world.z) / uBox.z, 0.0, 1.0);
  vAlpha = visibleFor(uAmount) * (1.0 - aEnd) * mix(0.9, 0.3, depth);
  gl_Position = pushFromPointer(projectionMatrix * viewMatrix * vec4(world, 1.0));
}
`;

const rainFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha * 0.55);
  #include <colorspace_fragment>
}
`;

const snowVertex = /* glsl */ `
${sharedVertex}
uniform float uSize;
uniform float uResolutionY;
void main() {
  vec3 world = fallPosition(0.5 + 0.8 * aSeed.w);
  vec4 view = viewMatrix * vec4(world, 1.0);
  vAlpha = visibleFor(uAmount);
  gl_Position = pushFromPointer(projectionMatrix * view);
  gl_PointSize = clamp(uSize * (0.5 + aSeed.w) * projectionMatrix[1][1] * 0.5 * uResolutionY / -view.z, 1.5, 14.0);
}
`;

// Flakes are flat paper discs; a faint cool edge keeps them visible against a pale sky.
const snowFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRim;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.36, d) * vAlpha * 0.9;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(mix(uColor, uRim, smoothstep(0.26, 0.46, d) * 0.45), alpha);
  #include <colorspace_fragment>
}
`;

function sharedUniforms() {
  return {
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uFall: { value: 0 },
    uDrift: { value: 0 },
    uWind: { value: 0 },
    uSway: { value: 0 },
    uAspect: { value: 1 },
    uPush: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uBox: { value: box },
    uColor: { value: new THREE.Color() }
  };
}

function seeds(count: number, perParticle: number) {
  const data = new Float32Array(count * perParticle * 4);
  for (let i = 0; i < count; i += 1) {
    const seed = [Math.random(), Math.random(), Math.random(), Math.random()];
    for (let v = 0; v < perParticle; v += 1) data.set(seed, (i * perParticle + v) * 4);
  }
  return new THREE.BufferAttribute(data, 4);
}

export interface PrecipitationInput {
  time: number;
  delta: number;
  rain: number;
  snow: number;
  wind: number;
  gust: number;
  color: THREE.Color;
  pointer: THREE.Vector2;
  push: number;
  aspect: number;
  resolutionY: number;
}

export class Precipitation {
  readonly rain: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly snow: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  // Fall and drift are integrated here so wind or weather changes never make particles jump.
  private rainFall = 0;
  private rainDrift = 0;
  private snowFall = 0;
  private snowDrift = 0;

  constructor(scale: number) {
    const rainCount = Math.round(2600 * scale);
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(rainCount * 6), 3));
    rainGeometry.setAttribute("aSeed", seeds(rainCount, 2));
    rainGeometry.setAttribute("aEnd", new THREE.BufferAttribute(Float32Array.from({ length: rainCount * 2 }, (_, i) => i % 2), 1));
    this.rain = new THREE.LineSegments(rainGeometry, new THREE.ShaderMaterial({
      vertexShader: rainVertex,
      fragmentShader: rainFragment,
      uniforms: { ...sharedUniforms(), uLength: { value: 0.9 } },
      transparent: true,
      depthWrite: false,
      depthTest: false
    }));

    const snowCount = Math.round(2200 * scale);
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(snowCount * 3), 3));
    snowGeometry.setAttribute("aSeed", seeds(snowCount, 1));
    this.snow = new THREE.Points(snowGeometry, new THREE.ShaderMaterial({
      vertexShader: snowVertex,
      fragmentShader: snowFragment,
      uniforms: {
        ...sharedUniforms(),
        uSize: { value: 0.05 },
        uResolutionY: { value: 1 },
        uRim: { value: new THREE.Color("#9fb3c6") }
      },
      transparent: true,
      depthWrite: false,
      depthTest: false
    }));

    for (const object of [this.rain, this.snow]) {
      object.frustumCulled = false;
      object.renderOrder = 20;
    }
  }

  update(input: PrecipitationInput) {
    const rain = this.rain.material.uniforms;
    const snow = this.snow.material.uniforms;
    for (const uniforms of [rain, snow]) {
      uniforms.uTime.value = input.time;
      uniforms.uAspect.value = input.aspect;
      uniforms.uPointer.value.copy(input.pointer);
      uniforms.uColor.value.copy(input.color);
    }
    const rainWind = input.wind + input.gust * 1.6;
    const snowWind = input.wind * 2.5 + input.gust * 5;
    this.rainFall += 17 * input.delta;
    this.rainDrift += 17 * rainWind * 0.35 * input.delta;
    this.snowFall += 1.1 * input.delta;
    this.snowDrift += 1.1 * snowWind * 0.35 * input.delta;

    rain.uAmount.value = Math.min(1, input.rain);
    rain.uFall.value = this.rainFall;
    rain.uDrift.value = this.rainDrift;
    rain.uWind.value = rainWind;
    rain.uPush.value = input.push * 0.05;
    snow.uAmount.value = input.snow;
    snow.uFall.value = this.snowFall;
    snow.uDrift.value = this.snowDrift;
    snow.uSway.value = 0.8 + input.gust * 1.5;
    snow.uPush.value = input.push * 0.12;
    snow.uResolutionY.value = input.resolutionY;
    this.rain.visible = input.rain > 0.01;
    this.snow.visible = input.snow > 0.01;
  }

  dispose() {
    this.rain.geometry.dispose();
    this.rain.material.dispose();
    this.snow.geometry.dispose();
    this.snow.material.dispose();
  }
}
