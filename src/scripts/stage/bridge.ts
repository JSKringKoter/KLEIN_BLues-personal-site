// 跨场景形变。
// 两个场景各渲染到离屏纹理，合成时按同一张「溶解场」逐像素替换：来源场景从一侧被剥落，
// 目标场景从同一侧凝结。与此同时，一批粒子从来源场景的表面出发——出发时刻恰好等于
// 它所在像素被溶解的时刻——飞向目标场景的表面，并在目标像素显现的时刻落下。
import * as THREE from "three";
import type { SampleBuffers } from "./core";

export const DISSOLVE_GLSL = /* glsl */ `
float kbHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float kbNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(kbHash(i), kbHash(i + vec2(1.0, 0.0)), u.x), mix(kbHash(i + vec2(0.0, 1.0)), kbHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float kbFbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * kbNoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
// 0..1：数值越小越先溶解。叠加自上而下的走向，让形变像一页纸被从上方揭开。
float kbField(vec2 uv, float aspect, float seed) {
  float n = kbFbm(vec2(uv.x * aspect, uv.y) * 2.6 + seed * 1.7);
  return clamp(mix(n, 1.0 - uv.y, 0.5) * 1.05 - 0.02, 0.0, 1.0);
}
// 与 composite 一致的阈值
float kbDepart(float p) { return p * 1.35 - 0.05; }
float kbArrive(float p) { return (p - 0.3) * 1.45; }
`;

const compositeVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const compositeFragment = /* glsl */ `
#include <tonemapping_pars_fragment>
uniform sampler2D tA;
uniform sampler2D tB;
uniform float uP;
uniform float uAspect;
uniform float uSeed;
uniform float uToneA;
uniform float uToneB;
uniform vec3 uEdge;
varying vec2 vUv;
${DISSOLVE_GLSL}
// 离屏纹理里是预乘、线性、可能超过 1 的颜色
vec4 tone(vec4 c, float on) {
  if (c.a <= 0.0) return vec4(0.0);
  vec3 rgb = c.rgb / c.a;
  rgb = on > 0.5 ? NeutralToneMapping(rgb) : min(rgb, vec3(1.0));
  return vec4(rgb * c.a, c.a);
}
void main() {
  vec4 a = tone(texture2D(tA, vUv), uToneA);
  vec4 b = tone(texture2D(tB, vUv), uToneB);
  float n = kbField(vUv, uAspect, uSeed);
  float da = kbDepart(uP);
  float db = kbArrive(uP);
  float keepA = smoothstep(da - 0.035, da + 0.035, n);
  float showB = 1.0 - smoothstep(db - 0.05, db + 0.05, n);
  // 剥落边缘：一道克莱因蓝的细线
  float edgeA = (1.0 - abs(n - da) / 0.03);
  edgeA = clamp(edgeA, 0.0, 1.0) * step(0.001, uP) * step(uP, 0.999);
  a *= keepA;
  b *= showB;
  vec4 col = b + a * (1.0 - b.a);
  float e = edgeA * 0.55 * max(a.a, 0.35) * (1.0 - showB * 0.6);
  col.rgb = col.rgb * (1.0 - e) + uEdge * e;
  col.a = max(col.a, e);
  // 先还原预乘再转 sRGB，否则半透明像素会溢出成发白的光斑
  gl_FragColor = vec4(col.a > 0.0 ? col.rgb / col.a : vec3(0.0), col.a);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}
`;

const bridgeVertex = /* glsl */ `
attribute vec3 posA;
attribute vec3 posB;
attribute vec3 colA;
attribute vec3 colB;
attribute vec2 sizes;
attribute vec4 rand;
uniform mat4 uVPA;
uniform mat4 uVPB;
uniform float uP;
uniform float uTime;
uniform float uAspect;
uniform float uSeed;
uniform float uPx;
varying vec3 vColor;
varying float vAlpha;
${DISSOLVE_GLSL}
vec3 toNdc(mat4 vp, vec3 p) {
  vec4 c = vp * vec4(p, 1.0);
  float w = max(c.w, 0.0001);
  return vec3(c.xy / w, c.w);
}
void main() {
  vec3 a = toNdc(uVPA, posA);
  vec3 b = toNdc(uVPB, posB);
  float na = kbField(a.xy * 0.5 + 0.5, uAspect, uSeed);
  float nb = kbField(b.xy * 0.5 + 0.5, uAspect, uSeed);
  // 反解出发与抵达时刻：像素被溶解 / 显现的瞬间
  float t0 = (na + 0.05) / 1.35;
  float t1 = nb / 1.45 + 0.3;
  t1 = max(t1, t0 + 0.18 + rand.x * 0.12);
  float t = clamp((uP - t0) / (t1 - t0), 0.0, 1.0);
  float e = t * t * (3.0 - 2.0 * t);
  float bell = sin(3.14159265 * t);

  vec2 p = mix(a.xy, b.xy, e);
  // 飞行途中的涡流与上扬
  float ang = rand.y * 6.2831 + uTime * (0.6 + rand.z);
  p += vec2(cos(ang) / uAspect, sin(ang)) * bell * (0.06 + rand.w * 0.16);
  p.y += bell * (0.05 + rand.x * 0.1);

  float behind = step(a.z, 0.0) * (1.0 - e) + step(b.z, 0.0) * e;
  gl_Position = vec4(p, 0.0, 1.0);
  float size = mix(sizes.x, sizes.y, e) * (1.0 + bell * (0.8 + rand.z));
  gl_PointSize = max(1.0, size * uPx);
  vColor = mix(colA, colB, e);
  float live = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.86, 1.0, t));
  vAlpha = live * (1.0 - behind) * (0.55 + 0.45 * rand.w);
}
`;

const bridgeFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float a = smoothstep(0.5, 0.18, r) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= a;
}
`;

export class Composer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly rtA: THREE.WebGLRenderTarget;
  readonly rtB: THREE.WebGLRenderTarget;
  readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly buffersA: SampleBuffers;
  readonly buffersB: SampleBuffers;
  readonly count: number;

  constructor(count: number, samples: number) {
    this.count = count;
    const opts = { type: THREE.HalfFloatType, samples, depthBuffer: true };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, opts);

    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: compositeVertex,
        fragmentShader: compositeFragment,
        uniforms: {
          tA: { value: this.rtA.texture },
          tB: { value: this.rtB.texture },
          uP: { value: 0 },
          uAspect: { value: 1 },
          uSeed: { value: 0 },
          uToneA: { value: 0 },
          uToneB: { value: 0 },
          uEdge: { value: new THREE.Color("#1746d1") },
        },
        depthTest: false,
        depthWrite: false,
        transparent: true,
        premultipliedAlpha: true,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    );
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    const geo = new THREE.BufferGeometry();
    const mk = (n: number) => new Float32Array(count * n);
    this.buffersA = { pos: mk(3), col: mk(3), size: mk(1) };
    this.buffersB = { pos: mk(3), col: mk(3), size: mk(1) };
    geo.setAttribute("position", new THREE.BufferAttribute(mk(3), 3));
    geo.setAttribute("posA", new THREE.BufferAttribute(this.buffersA.pos, 3));
    geo.setAttribute("posB", new THREE.BufferAttribute(this.buffersB.pos, 3));
    geo.setAttribute("colA", new THREE.BufferAttribute(this.buffersA.col, 3));
    geo.setAttribute("colB", new THREE.BufferAttribute(this.buffersB.col, 3));
    geo.setAttribute("sizes", new THREE.BufferAttribute(mk(2), 2));
    const rand = mk(4);
    for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
    geo.setAttribute("rand", new THREE.BufferAttribute(rand, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: bridgeVertex,
        fragmentShader: bridgeFragment,
        uniforms: {
          uVPA: { value: new THREE.Matrix4() },
          uVPB: { value: new THREE.Matrix4() },
          uP: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uSeed: { value: 0 },
          uPx: { value: 1 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        premultipliedAlpha: true,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.scene.add(this.points);
  }

  /** 采样完成后调用，上传缓冲 */
  commit() {
    const g = this.points.geometry;
    for (const name of ["posA", "posB", "colA", "colB"]) g.getAttribute(name).needsUpdate = true;
    const sizes = g.getAttribute("sizes") as THREE.BufferAttribute;
    for (let i = 0; i < this.count; i++) sizes.setXY(i, this.buffersA.size[i], this.buffersB.size[i]);
    sizes.needsUpdate = true;
  }

  setSize(width: number, height: number) {
    this.rtA.setSize(width, height);
    this.rtB.setSize(width, height);
  }

  dispose() {
    this.rtA.dispose();
    this.rtB.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
