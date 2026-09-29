import * as THREE from 'three';
import type { ParticleLayout } from './layouts';

const vertex = /* glsl */ `
attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute vec3 p4; attribute vec3 p5;
attribute vec4 c0; attribute vec4 c1; attribute vec4 c2; attribute vec4 c3; attribute vec4 c4; attribute vec4 c5;
attribute vec4 aRand;

uniform float uFrom;
uniform float uTo;
uniform float uMix;
uniform float uRotFrom;
uniform float uRotTo;
uniform float uTurb;
uniform float uTime;
uniform float uIntro;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uRayO;
uniform vec3 uRayD;
uniform float uPointer;

varying vec4 vColor;

vec3 pickP(float i) {
  if (i < 0.5) return p0;
  if (i < 1.5) return p1;
  if (i < 2.5) return p2;
  if (i < 3.5) return p3;
  if (i < 4.5) return p4;
  return p5;
}
vec4 pickC(float i) {
  if (i < 0.5) return c0;
  if (i < 1.5) return c1;
  if (i < 2.5) return c2;
  if (i < 3.5) return c3;
  if (i < 4.5) return c4;
  return c5;
}
vec3 rotY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

void main() {
  float d = aRand.x;
  float m = clamp((uMix - d * 0.42) / 0.58, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  float bell = sin(3.14159265 * m);

  vec3 a = rotY(pickP(uFrom), uRotFrom);
  vec3 b = rotY(pickP(uTo), uRotTo);
  vec3 p = mix(a, b, m);

  // 形变途中：沿随机方向膨胀并整体涡旋，像被吹散又重新凝结的尘
  vec3 dir = normalize(vec3(sin(aRand.w * 91.7 + 1.3), cos(aRand.w * 47.3 + 0.7), sin(aRand.w * 23.1 + 2.1)) + 1e-4);
  p += dir * bell * uTurb * (0.35 + aRand.y * 0.9);
  p = rotY(p, bell * uTurb * 0.22 * (0.4 + aRand.z));

  // 呼吸
  float tt = uTime;
  p += 0.045 * vec3(sin(tt * 0.7 + aRand.z * 6.283), cos(tt * 0.55 + aRand.w * 6.283), sin(tt * 0.62 + aRand.x * 6.283));

  // 开场：从远方的星尘凝聚
  float ii = clamp((uIntro - d * 0.55) / 0.45, 0.0, 1.0);
  ii = 1.0 - pow(1.0 - ii, 3.0);
  vec3 far = dir * (22.0 + 18.0 * aRand.y);
  p = mix(far, p, ii);

  // 指针：尘粒被视线推开
  vec3 w = p - uRayO;
  float along = dot(w, uRayD);
  vec3 off = w - uRayD * along;
  float dist = length(off);
  float f = uPointer * smoothstep(1.8, 0.0, dist);
  p += (off / max(dist, 1e-3)) * f * 0.85;

  vec4 col = mix(pickC(uFrom), pickC(uTo), m);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float size = uSize * (0.55 + aRand.y * 1.1) * (1.0 + bell * 0.5) * (1.0 + f * 0.8);
  gl_PointSize = max(1.0, size * uPixelRatio * (12.0 / depth));
  float fade = smoothstep(70.0, 22.0, depth) * smoothstep(0.6, 3.0, depth);
  vColor = vec4(col.rgb, col.a * fade * ii);
}
`;

const fragment = /* glsl */ `
varying vec4 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float a = smoothstep(0.5, 0.12, r);
  float alpha = vColor.a * a;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, alpha);
}
`;

export function createParticles(layouts: ParticleLayout[], n: number) {
  const geo = new THREE.BufferGeometry();
  layouts.forEach((L, k) => {
    geo.setAttribute(`p${k}`, new THREE.BufferAttribute(L.pos, 3));
    geo.setAttribute(`c${k}`, new THREE.BufferAttribute(L.col, 4));
  });
  // three 需要 position 来计算包围盒与绘制数量
  geo.setAttribute('position', new THREE.BufferAttribute(layouts[0].pos, 3));
  const rand = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) rand[i] = Math.random();
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const uniforms = {
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uMix: { value: 0 },
    uRotFrom: { value: 0 },
    uRotTo: { value: 0 },
    uTurb: { value: 0 },
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uSize: { value: 2.6 },
    uPixelRatio: { value: 1 },
    uRayO: { value: new THREE.Vector3() },
    uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uPointer: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  return { points, uniforms };
}
