import * as THREE from "three";
import { noiseGlsl } from "../glsl/noise";

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uSunColor;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uShadow;
uniform vec3 uSunDir;
uniform vec3 uPointerDir;
uniform vec3 uRippleDir;
uniform vec2 uCloudOffset;
uniform float uSunSize;
uniform float uSunIntensity;
uniform float uHalo;
uniform float uCloudCover;
uniform float uStars;
uniform float uFog;
uniform float uFlash;
uniform float uPointerStrength;
uniform float uRippleAge;
varying vec3 vDir;
${noiseGlsl}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.5));

  // Sun (or moon): a crisp disc inside stepped halo rings, like layered tissue paper.
  float sd = max(dot(dir, uSunDir), 0.0);
  float halo = pow(sd, 28.0) * 0.55 + pow(sd, 180.0) * 0.45;
  col = mix(col, uGlow, clamp(floor(halo * 5.0) / 5.0, 0.0, 1.0) * uHalo);
  col = mix(col, uSunColor, smoothstep(uSunSize - 0.00004, uSunSize + 0.00004, sd) * uSunIntensity);

  if (uStars > 0.001) {
    vec3 sp = dir * 220.0;
    float r = hash13(floor(sp));
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + r * 2.5) + r * 60.0);
    float star = step(0.985, r) * smoothstep(0.22, 0.02, length(fract(sp) - 0.5)) * twinkle;
    // A faint galactic band: the first glimpse of the Cangqiong galaxy further down the page.
    float band = exp(-pow(dot(dir, normalize(vec3(0.35, 0.55, 0.76))) / 0.16, 2.0));
    float dust = fbm2(dir.xy * 7.0 + dir.z * 3.0);
    col += uGlow * band * smoothstep(0.35, 0.75, dust) * 0.35 * uStars;
    col += vec3(star) * uStars * smoothstep(0.0, 0.12, h);
  }

  // Clouds projected onto a flat ceiling, cut into three stacked paper layers.
  float cloudMask = smoothstep(0.02, 0.2, h) * clamp(uCloudCover * 3.0, 0.0, 1.0);
  if (cloudMask > 0.0) {
    vec2 uv = dir.xz / (h + 0.06) * 0.85 + uCloudOffset;
    float threshold = mix(0.66, 0.3, uCloudCover);
    threshold += smoothstep(0.972, 0.996, dot(dir, uPointerDir)) * uPointerStrength * 0.28;
    float edge = fbm2(uv) - threshold;
    float body = smoothstep(0.0, 0.012, edge) * cloudMask;
    float drop = smoothstep(0.0, 0.012, fbm2(uv + vec2(0.05, 0.11)) - threshold) * (1.0 - body) * cloudMask;
    col = mix(col, uShadow, drop * 0.14);

    float depth = clamp(edge / 0.16, 0.0, 0.999) * 3.0;
    vec3 cloud = mix(uCloudShade, uCloudLit, 0.3 + 0.35 * floor(depth));
    cloud *= 1.0 - (1.0 - smoothstep(0.0, 0.08, fract(depth))) * 0.08 * step(0.02, edge);
    col = mix(col, cloud + uFlash * 0.45, body);
  }

  // Click ripple: two light rings spreading across the sky.
  if (uRippleAge < 2.0) {
    float angle = acos(clamp(dot(dir, uRippleDir), -1.0, 1.0));
    float fade = 1.0 - smoothstep(0.2, 2.0, uRippleAge);
    float ring = smoothstep(0.012, 0.0, abs(angle - uRippleAge * 0.35));
    ring += smoothstep(0.008, 0.0, abs(angle - uRippleAge * 0.22)) * 0.6;
    col = mix(col, uSunColor, ring * fade * 0.5);
  }

  col = mix(col, uHorizon, uFog * (1.0 - smoothstep(-0.05, 0.45, h)));
  col += uFlash * vec3(0.18, 0.2, 0.26);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function createSkyMaterial(octaves: number) {
  return new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    defines: { OCTAVES: octaves },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uCloudLit: { value: new THREE.Color() },
      uCloudShade: { value: new THREE.Color() },
      uShadow: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
      uPointerDir: { value: new THREE.Vector3(0, 0, -1) },
      uRippleDir: { value: new THREE.Vector3(0, 0, -1) },
      uCloudOffset: { value: new THREE.Vector2() },
      uSunSize: { value: 0.9995 },
      uSunIntensity: { value: 1 },
      uHalo: { value: 0.5 },
      uCloudCover: { value: 0.3 },
      uStars: { value: 0 },
      uFog: { value: 0 },
      uFlash: { value: 0 },
      uPointerStrength: { value: 0 },
      uRippleAge: { value: 10 }
    }
  });
}

const ridgeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ridgeFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uSnowColor;
uniform vec3 uHaze;
uniform float uHazeAmount;
uniform float uSnow;
uniform float uFlash;
uniform float uSeed;
uniform float uFreq;
uniform float uAmp;
uniform float uBase;
varying vec2 vUv;
${noiseGlsl}

float ridge(float x) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = uFreq;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise1(x * frequency + uSeed * 31.7);
    frequency *= 2.07;
    amplitude *= 0.48;
  }
  return value;
}

void main() {
  float top = uBase + (ridge(vUv.x) - 0.47) * 2.0 * uAmp;
  // Planes are twice as tall as the layout space so scrolling never reveals their bottom edge.
  float y = 0.5 + (vUv.y - 0.5) * 2.0;
  float dy = y - top;

  // Above the silhouette: a soft drop shadow cast onto the layer behind, like stacked card.
  if (dy > 0.0) {
    float shade = 1.0 - smoothstep(0.0, 0.022, dy);
    shade *= shade;
    if (shade < 0.003) discard;
    gl_FragColor = vec4(uShadow, shade * 0.2);
    #include <colorspace_fragment>
    return;
  }

  vec3 col = uColor * mix(0.9, 1.0, smoothstep(top - 0.3, top, y));
  float cap = top - 0.015 - 0.035 * noise1(vUv.x * uFreq * 11.0 + uSeed);
  col = mix(col, uSnowColor, uSnow * smoothstep(cap - 0.003, cap + 0.003, y));
  col = mix(col, col * 1.1 + 0.025, smoothstep(-0.0035, 0.0, dy));
  col = mix(col, uHaze, uHazeAmount);
  col += uFlash * 0.12;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export interface RidgeShape {
  base: number;
  amp: number;
  freq: number;
  seed: number;
}

export function createRidgeMaterial(shape: RidgeShape) {
  return new THREE.ShaderMaterial({
    vertexShader: ridgeVertex,
    fragmentShader: ridgeFragment,
    defines: { OCTAVES: 1 },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uShadow: { value: new THREE.Color() },
      uSnowColor: { value: new THREE.Color("#f7f9fb") },
      uHaze: { value: new THREE.Color() },
      uHazeAmount: { value: 0 },
      uSnow: { value: 0 },
      uFlash: { value: 0 },
      uSeed: { value: shape.seed },
      uFreq: { value: shape.freq },
      uAmp: { value: shape.amp },
      uBase: { value: shape.base }
    }
  });
}
