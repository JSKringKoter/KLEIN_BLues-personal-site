// 全息角色卡：插画 + 随视角变色的镭射箔 + 闪粉 + 跟随指针的高光。
// 首页的「Original Characters」入口与 /worldbuildings/portraits/ 的卡桌共用。
import * as THREE from "three";

export const CARD_W = 1;
export const CARD_H = 1.45;
const BORDER = 0.045;

const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewW;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewW = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragment = /* glsl */ `
uniform sampler2D map;
uniform sampler2D backMap;
uniform float uImageAspect;
uniform float uHolo;
uniform float uTime;
uniform vec2 uGlare;
uniform float uGlareAmt;
uniform vec3 uTint;
uniform float uDim;
uniform float uHasMap;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewW;

float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(${CARD_W.toFixed(3)}, ${CARD_H.toFixed(3)});
  float d = roundBox(p, vec2(${(CARD_W / 2).toFixed(3)}, ${(CARD_H / 2).toFixed(3)}), 0.05);
  if (d > 0.0) discard;
  bool front = gl_FrontFacing;
  vec3 paper = vec3(0.985, 0.975, 0.955);
  vec3 col = paper;

  // 插画窗口（带白边）
  vec2 inner = vec2(${(CARD_W / 2 - BORDER).toFixed(3)}, ${(CARD_H / 2 - BORDER).toFixed(3)});
  float di = roundBox(p, inner, 0.025);
  float inImg = 1.0 - smoothstep(-0.002, 0.002, di);
  // 按封面比例裁切
  vec2 box = inner * 2.0;
  float boxAspect = box.x / box.y;
  vec2 q = (p / box) + 0.5;
  if (!front) q.x = 1.0 - q.x;
  if (uImageAspect > boxAspect) q.x = (q.x - 0.5) * boxAspect / uImageAspect + 0.5;
  else q.y = (q.y - 0.5) * uImageAspect / boxAspect + 0.5;
  vec3 imgF = texture2D(map, q).rgb;
  vec3 imgB = texture2D(backMap, q).rgb;
  vec3 img = uHasMap > 0.5 ? (front ? imgF : imgB) : vec3(0.85, 0.87, 0.93);
  col = mix(paper, img, inImg);

  // 镭射箔：颜色随视角与卡面位置流动
  vec3 n = normalize(vNormalW) * (front ? 1.0 : -1.0);
  float facing = dot(n, normalize(vViewW));
  vec3 tilt = cross(n, normalize(vViewW));
  float band = vUv.x * 1.2 + vUv.y * 0.9 + tilt.x * 2.4 + tilt.y * 1.6 + uTime * 0.02;
  vec3 rainbow = 0.55 + 0.45 * cos(6.2831 * (band + vec3(0.0, 0.33, 0.67)));
  float lum = dot(img, vec3(0.299, 0.587, 0.114));
  // 箔面的纹理：斜向细纹 + 同心光栅
  float lines = 0.5 + 0.5 * sin((vUv.x + vUv.y) * 180.0 + tilt.x * 20.0);
  float rings = 0.5 + 0.5 * sin(length(p - vec2(0.1, 0.2)) * 90.0 - tilt.y * 14.0);
  float foil = mix(lines, rings, 0.5);
  float mask = (smoothstep(0.35, 0.95, lum) * 0.75 + 0.25) * inImg + (1.0 - inImg) * 0.9;
  col = mix(col, col * 0.72 + rainbow * 0.42, uHolo * mask * (0.35 + 0.35 * foil));
  // 闪粉
  vec2 gv = vUv * vec2(110.0, 160.0);
  vec2 cell = floor(gv);
  float g = h21(cell);
  float dot = smoothstep(0.42, 0.1, length(fract(gv) - 0.5));
  float tw = pow(max(0.0, sin(g * 40.0 + tilt.x * 30.0 + tilt.y * 22.0 + uTime * 0.8)), 24.0);
  float spark = smoothstep(0.4, 0.9, uHolo);
  col += vec3(1.0) * step(0.9, g) * dot * tw * spark * 0.8;
  // 指针高光
  float gd = length(vUv - uGlare);
  col += vec3(1.0, 0.99, 0.96) * exp(-gd * gd * 9.0) * uGlareAmt * 0.35;
  // 边缘描线
  float edge = smoothstep(0.004, 0.0, abs(d + 0.006));
  col = mix(col, uTint, edge * 0.5);
  // 卡背：若没有背面图，印一个 KB 的纹章
  if (!front && uHasMap < 0.5) col = mix(col, uTint, 0.6);
  col = mix(col, vec3(0.94, 0.94, 0.95), uDim);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export interface HoloCard {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  uniforms: {
    map: { value: THREE.Texture | null };
    backMap: { value: THREE.Texture | null };
    uImageAspect: { value: number };
    uHolo: { value: number };
    uTime: { value: number };
    uGlare: { value: THREE.Vector2 };
    uGlareAmt: { value: number };
    uTint: { value: THREE.Color };
    uDim: { value: number };
    uHasMap: { value: number };
  };
  image: HTMLImageElement | null;
}

const loader = new THREE.TextureLoader();

export function createHoloCard(src: string | null, tint = "#1746d1", anisotropy = 4): HoloCard {
  const uniforms = {
    map: { value: null as THREE.Texture | null },
    backMap: { value: null as THREE.Texture | null },
    uImageAspect: { value: 0.69 },
    uHolo: { value: 0.35 },
    uTime: { value: 0 },
    uGlare: { value: new THREE.Vector2(0.5, 0.7) },
    uGlareAmt: { value: 0 },
    uTint: { value: new THREE.Color(tint) },
    uDim: { value: 0 },
    uHasMap: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 1), mat);
  mesh.castShadow = true;
  const card: HoloCard = { mesh, uniforms, image: null };
  if (src) setCardImage(card, src, anisotropy);
  return card;
}

export function setCardImage(card: HoloCard, src: string, anisotropy = 4) {
  loader.load(src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    const img = tex.image as HTMLImageElement;
    card.image = img;
    card.uniforms.map.value = tex;
    card.uniforms.backMap.value = card.uniforms.backMap.value ?? tex;
    card.uniforms.uImageAspect.value = img.width / img.height;
    card.uniforms.uHasMap.value = 1;
  });
}

/** 读取卡面像素（用于形变粒子） */
export function cardPixels(card: HoloCard, size = 64): ImageData | null {
  if (!card.image) return null;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = Math.round(size * (CARD_H / CARD_W));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fbf8f2";
  ctx.fillRect(0, 0, c.width, c.height);
  const b = Math.round(size * BORDER);
  ctx.drawImage(card.image, b, b, c.width - 2 * b, c.height - 2 * b);
  return ctx.getImageData(0, 0, c.width, c.height);
}
