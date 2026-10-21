// 首页背景板（<html class="kb-plate">，舞台入口 stage/index.ts 创建）。
// 色场：一片缓慢流动的蓝，主色随本地时间（清晨月白 / 白天天青 / 傍晚群青 / 夜晚黛蓝）与天气变化，留一缕克莱因蓝；
//       整页都清晰可见，各模块只是看到同一片天空的不同位置（平移、缩放与色相偏移）；
//       镜头不直接绑在滚动上，而是像有惯性一样追过去（弹簧），模块切换时天空缓缓漂移、略微越过再落定。
// 液态玻璃：带 data-glass 的元素由这里的着色器画成一层薄玻璃（细边折射、轻微柔化、极淡的乳白 / 烟灰），不用 backdrop-filter。
//       每个模块只有自己的玻璃，不跨模块移动：入场时随内容就地凝结（自上而下），离场时就地化开。
//       上沿那根高光细线是 DOM（.kb-glass-rims），随玻璃一起凝结、化开。
// 透镜：带 data-lens 的元素（世界观的晶体）里，天空被分成几个刻面折射。
// 对比度：每 0.25 秒在 CPU 上按同一公式算一张 48×30 的亮度图，给 data-tone 与 data-glass 元素写 data-on="light|dark"，
//       亮底配深色字、乳白玻璃；暗底配浅色字、烟灰玻璃（stage.css）。

type RGB = [number, number, number];
type Rect = [number, number, number, number]; // x0 y0 x1 y1（CSS 像素，视口坐标）

interface Palette {
  top: RGB;
  bottom: RGB;
  c1: RGB;
  c2: RGB;
  c3: RGB;
}

interface Look {
  shift: [number, number];
  zoom: number;
  hue: number;
  sat: number;
  lamp: number;
}

interface Pane {
  el: HTMLElement;
  order: number;
  radius: number;
  /** 0 乳白 … 1 烟灰（随取样渐变） */
  tone: number;
  /** 0..1：身后太花、对比度不够时把玻璃加厚 */
  thick: number;
  thickTarget: number;
  /** 元素自身连同祖先的不透明度（例如拿起画中人卡片时淡出的工具条），玻璃随之淡出；fade 为平滑后的值 */
  fadeTarget: number;
  fade: number;
  rect: Rect | null;
  /** 画出来的矩形：追着 rect 平滑过渡（换文集等内容变化时玻璃不跳） */
  shown: Rect | null;
}

interface ToneTarget {
  el: HTMLElement;
  on: "light" | "dark" | "";
  pane: Pane | null;
}

interface MixedPane {
  r: Rect;
  rad: number;
  tone: number;
  thick: number;
  /** 0..1：凝结程度 */
  a: number;
}

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const luma = (c: RGB) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => x * x * (3 - 2 * x);
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

const P = (top: string, bottom: string, c1: string, c2: string, c3: string): Palette => ({ top: hex(top), bottom: hex(bottom), c1: hex(c1), c2: hex(c2), c3: hex(c3) });
// 整体偏浅：天色是「透亮的蓝」而不是深蓝；最深的只有那一缕克莱因蓝（field() 里写死，不随时段变化）
const PALETTES = {
  dawn: P("#d3e1ec", "#f3ebe8", "#f8f4ef", "#bccfe0", "#efd9da"), // 月白 · 藕粉
  day: P("#b9d0e5", "#eef2f5", "#f8f7f2", "#a3bcd7", "#eee4d4"), // 天青 · 纸白
  dusk: P("#6f87b8", "#c3c3d6", "#a8b6da", "#7e95c4", "#f0c7a2"), // 群青 · 杏色
  night: P("#4a5b84", "#6b799d", "#b8c2dc", "#576891", "#7a80a2"), // 黛蓝 · 月光
};
type PaletteName = keyof typeof PALETTES;
const DAY: [number, PaletteName][] = [
  [0, "night"], [4.5, "night"], [6.2, "dawn"], [9, "day"], [15.5, "day"], [18, "dusk"], [19.6, "night"], [24, "night"],
];

const L = (shift: [number, number], zoom: number, hue: number, sat = 1, lamp = 0): Look => ({ shift, zoom, hue, sat, lamp });
const LOOKS: Record<string, Look> = {
  hero: L([0, 0], 1, 0),
  fiction: L([0.16, -0.2], 1.1, -0.05),
  worlds: L([0.34, -0.34], 1.2, 0.07, 1.06),
  portraits: L([0.08, -0.56], 1.16, -0.07, 1, 0.6),
  notes: L([-0.18, -0.72], 1.12, 0.03, 0.92),
  about: L([-0.04, -0.9], 1.04, 0),
};

type Weather = [number, number, number, number]; // 阴 雨 雪 雾
const WEATHER: Record<string, Weather> = {
  clear: [0, 0, 0, 0],
  cloud: [1, 0, 0, 0],
  rain: [0.4, 1, 0, 0],
  storm: [0.8, 1, 0, 0],
  snow: [0.2, 0, 1, 0],
  fog: [0.3, 0, 0, 1],
};
const weatherOf = (kind?: string): Weather => WEATHER[kind === "default" || kind === "night" || !kind ? "clear" : kind] ?? WEATHER.clear;

/* ---- CPU 版色场：与片元着色器里的 field() 逐项对应，只用于对比度取样 ---- */
const fr = (x: number) => x - Math.floor(x);
function h21(x: number, y: number) {
  x = fr(x * 123.34);
  y = fr(y * 456.21);
  const d = x * (x + 45.32) + y * (y + 45.32);
  return fr((x + d) * (y + d));
}
function vn(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(x: number, y: number) {
  let s = 0, a = 0.5;
  for (let i = 0; i < 4; i++) {
    s += a * vn(x, y);
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 17.1;
    a *= 0.5;
  }
  return s;
}
const blobCPU = (qx: number, qy: number, cx: number, cy: number, r: number) => Math.exp(-((qx - cx) ** 2 + (qy - cy) ** 2) / (r * r));
const sstep = (a: number, b: number, x: number) => smooth(clamp01((x - a) / (b - a)));
function fieldCPU(u: number, v: number, aspect: number, T: number, lk: Look, p: Palette, warp: number, ink: number): RGB {
  let qx = ((u - 0.5) * aspect) / lk.zoom + lk.shift[0];
  let qy = (v - 0.5) / lk.zoom + lk.shift[1];
  const wx = fbm(qx * 1.4, qy * 1.4 + T * 0.012) - 0.5;
  const wy = fbm(qx * 1.4 + 9.2, qy * 1.4 - T * 0.01) - 0.5;
  qx += wx * warp;
  qy += wy * warp;
  const t = T * 0.035;
  let c = mixc(p.bottom, p.top, sstep(-0.75, 0.7, qy));
  c = mixc(c, p.c1, 0.85 * blobCPU(qx, qy, 0.55 + 0.12 * Math.sin(t), 0.3 + 0.06 * Math.cos(t * 1.3), 0.55));
  c = mixc(c, p.c2, 0.7 * blobCPU(qx, qy, -0.6 + 0.1 * Math.cos(t * 0.8), -0.28 + 0.08 * Math.sin(t), 0.62));
  c = mixc(c, p.c3, 0.55 * blobCPU(qx, qy, -0.05 + 0.12 * Math.sin(t * 0.7 + 2), -0.66, 0.42));
  c = mixc(c, p.c1, 0.45 * blobCPU(qx, qy, -0.62 + 0.08 * Math.sin(t * 1.1), 0.42, 0.42));
  let kx = qx - (0.18 + 0.03 * Math.sin(t * 0.9));
  let ky = qy - (0.02 + 0.02 * Math.cos(t * 1.2));
  [kx, ky] = [kx * 0.55 + ky * 0.35, ky * 1.25 - kx * 0.2];
  const kd = Math.exp(-(kx * kx + ky * ky) / 0.04) * (0.35 + 1.1 * fbm(qx * 3.2 + T * 0.015, qy * 3.2));
  c = mixc(c, [0.07, 0.19, 0.66], Math.pow(clamp01(kd), 1.6) * 0.62 * ink);
  const lx = (u - 0.5) * aspect, ly = v - 0.36;
  const lamp = lk.lamp * Math.exp(-(lx * lx + ly * ly) / 0.28);
  c = [c[0] + 0.08 * lamp, c[1] + 0.055 * lamp, c[2] + 0.02 * lamp];
  const y = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
  let i = c[0] * 0.596 - c[1] * 0.274 - c[2] * 0.322;
  let q = c[0] * 0.211 - c[1] * 0.523 + c[2] * 0.312;
  const ch = Math.cos(lk.hue), sh = Math.sin(lk.hue);
  [i, q] = [(ch * i + sh * q) * lk.sat, (-sh * i + ch * q) * lk.sat];
  return [clamp01(y + 0.956 * i + 0.621 * q), clamp01(y - 0.272 * i - 0.647 * q), clamp01(y - 1.106 * i + 1.703 * q)];
}

const MAX_PANES = 6;
const SAMPLE_W = 48;
const SAMPLE_H = 30;

const FS = `#version 300 es
precision highp float;
uniform vec2 R;       // 画布像素
uniform float S;      // 画布像素 / CSS 像素
uniform float T, warp, ink, sat, hue, lamp, zoom;
uniform vec2 shift;
uniform vec3 top, bottom, c1, c2, c3;
uniform vec4 G[${MAX_PANES}];
uniform float GR[${MAX_PANES}];
uniform float GT[${MAX_PANES}];
uniform float GA[${MAX_PANES}];
uniform float GK[${MAX_PANES}];
uniform int GN;
uniform vec4 LZ;      // 透镜：中心 xy、半宽半高（CSS 像素）
uniform float LA;
out vec4 o;

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float blob(vec2 q, vec2 c, float r){ vec2 d = q - c; return exp(-dot(d, d) / (r * r)); }

// 色场：uv（0..1，y 向上）→ 颜色；soft 越大越柔（玻璃里面）
vec3 field(vec2 uv, float soft){
  vec2 q = (uv - .5) * vec2(R.x / R.y, 1.) / zoom + shift;
  vec2 w = vec2(fbm(q * 1.4 + vec2(0., T * .012)), fbm(q * 1.4 + vec2(9.2, -T * .01))) - .5;
  q += w * warp * (1. - soft * .4);
  float s = 1. + soft * .5;
  vec3 col = mix(bottom, top, smoothstep(-.75, .7, q.y));
  float t = T * .035;
  col = mix(col, c1, .85 * blob(q, vec2(.55 + .12 * sin(t), .3 + .06 * cos(t * 1.3)), .55 * s));
  col = mix(col, c2, .7 * blob(q, vec2(-.6 + .1 * cos(t * .8), -.28 + .08 * sin(t)), .62 * s));
  col = mix(col, c3, .55 * blob(q, vec2(-.05 + .12 * sin(t * .7 + 2.), -.66), .42 * s));
  col = mix(col, c1, .45 * blob(q, vec2(-.62 + .08 * sin(t * 1.1), .42), .42 * s));
  // 一缕克莱因蓝
  vec2 kq = q - vec2(.18 + .03 * sin(t * .9), .02 + .02 * cos(t * 1.2));
  kq = vec2(kq.x * .55 + kq.y * .35, kq.y * 1.25 - kq.x * .2);
  float kd = exp(-dot(kq, kq) / pow(.2 * s, 2.)) * (.35 + 1.1 * fbm(q * 3.2 + vec2(T * .015, 0.)));
  col = mix(col, vec3(.07, .19, .66), pow(clamp(kd, 0., 1.), 1.6) * .62 * ink * (1. - soft * .3));
  vec2 lq = (uv - vec2(.5, .36)) * vec2(R.x / R.y, 1.);
  col += lamp * vec3(.08, .055, .02) * exp(-dot(lq, lq) / .28);
  // 色相微转（YIQ）与饱和度
  float y = dot(col, vec3(.299, .587, .114));
  vec2 iq = vec2(dot(col, vec3(.596, -.274, -.322)), dot(col, vec3(.211, -.523, .312)));
  float ch = cos(hue), sh = sin(hue);
  iq = mat2(ch, -sh, sh, ch) * iq * sat;
  return clamp(vec3(y + .956 * iq.x + .621 * iq.y, y - .272 * iq.x - .647 * iq.y, y - 1.106 * iq.x + 1.703 * iq.y), 0., 1.);
}

float rbox(vec2 p, vec4 r, float rad){
  vec2 c = (r.xy + r.zw) * .5, b = max((r.zw - r.xy) * .5 - rad, vec2(0.));
  vec2 q = abs(p - c) - b;
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - rad;
}
float rhomb(vec2 p, vec2 b){
  p = abs(p);
  vec2 e = b * vec2(1., -1.);
  float h = clamp(dot(e, b - 2. * p) / dot(b, b), -1., 1.);
  float d = length(p - .5 * b * vec2(1. - h, 1. + h));
  return d * sign(p.x * b.y + p.y * b.x - b.x * b.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / R;
  vec2 p = vec2(gl_FragCoord.x, R.y - gl_FragCoord.y) / S;     // CSS 像素，左上为原点
  vec2 px2uv = vec2(S, -S) / R;                                  // CSS 像素位移 → uv 位移
  // 找出覆盖这个像素、凝结得最多的那块玻璃
  float aa = 1. / S;
  int bi = -1;
  float cov = 0., bd = 1e5, best = 0.;
  for (int i = 0; i < ${MAX_PANES}; i++){
    if (i >= GN) break;
    float di = rbox(p, G[i], GR[i]);
    float ci = clamp(.5 - di / aa, 0., 1.);
    if (ci * GA[i] > best) { best = ci * GA[i]; cov = ci; bd = di; bi = i; }
  }
  vec3 col = vec3(0.);
  if (cov < 1.) col = field(uv, 0.);
  if (bi >= 0) {
    vec4 r = G[bi];
    float rad = GR[bi], a = GA[bi], tone = GT[bi], th = GK[bi];
    vec2 e = vec2(1., 0.);
    vec2 n = normalize(vec2(rbox(p + e.xy, r, rad) - rbox(p - e.xy, r, rad), rbox(p + e.yx, r, rad) - rbox(p - e.yx, r, rad)) + 1e-5);
    float depth = -bd;
    // 只有一圈很窄的边在折射，内部几乎不变形
    float edge = smoothstep(9., 0., depth);
    vec2 off = -n * edge * edge * 6. * a;
    vec3 g = field(uv + off * px2uv, .25 * a);
    vec3 milky = mix(g, vec3(1.), (.08 + .14 * th) * a);
    vec3 smoky = mix(g, vec3(.045, .06, .11), (.18 + .22 * th) * a);
    g = mix(milky, smoky, tone);
    // 上沿一根高光细线，往两侧渐隐；边缘内侧极淡的一圈光
    float top = smoothstep(.15, 1., -n.y);
    g += (smoothstep(1.6, 0., depth) * top * .16 + edge * .02) * a * mix(1., .6, tone);
    col = mix(col, g, cov);
  }
  // 透镜（世界观的晶体）：每个刻面把身后的天空折向不同方向
  if (LA > .001) {
    vec2 lp = p - LZ.xy;
    float ld = rhomb(lp, LZ.zw);
    float lm = clamp(.5 - ld / aa, 0., 1.) * LA;
    if (lm > 0.) {
      vec2 facet = vec2(lp.x < 0. ? -1. : 1., lp.y < 0. ? -1. : 1.);
      vec2 off = -facet * vec2(LZ.z * .6, LZ.w * .25) - lp * .4;
      vec3 g = field(uv + off * px2uv, .15);
      g = mix(g, g * vec3(.8, .9, 1.14), .45 + .25 * facet.x * facet.y);
      g += smoothstep(3., 0., -ld) * .28;
      col = mix(col, g, lm);
    }
  }
  vec2 v = uv - .5;
  col *= 1. - .05 * dot(v, v);
  o = vec4(col, 1.);
}`;

export class Plate {
  private readonly canvas = document.createElement("canvas");
  private readonly rims = document.createElement("div");
  private readonly gl: WebGL2RenderingContext | null;
  private readonly U: Record<string, WebGLUniformLocation | null> = {};
  private readonly scale = 0.5;
  private raf = 0;
  private last = performance.now();
  private lastDraw = 0;
  private lastSample = 0;
  private lastMeasure = 0;
  private lastScan = -1e9;
  private cur: Palette = { ...PALETTES.day };
  private weatherTarget: Weather = [0, 0, 0, 0];
  private weather: Weather = [0, 0, 0, 0];
  /** 镜头（弹簧）：当前值与速度 */
  private view: Look = { ...LOOKS.hero, shift: [0, 0] };
  private readonly vel = { x: 0, y: 0, zoom: 0, hue: 0, sat: 0, lamp: 0 };
  private flow = 0;
  private dark = false;
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // 模块混合（导演每帧给出）
  private a = "hero";
  private b = "hero";
  private t = 0;
  private dirty = true;
  private panes = new Map<string, Pane[]>();
  private tones: ToneTarget[] = [];
  private lens: { el: HTMLElement; module: string } | null = null;
  private rimEls: HTMLElement[] = [];
  private readonly lum = new Float32Array(SAMPLE_W * SAMPLE_H);
  private observer: ResizeObserver | null = null;
  /** 背景板自身的尺寸（固定定位、不含滚动条槽位）：画布与玻璃坐标都以它为准 */
  private get vw() {
    return this.host.clientWidth || window.innerWidth;
  }
  private get vh() {
    return this.host.clientHeight || window.innerHeight;
  }
  private readonly gBuf = new Float32Array(MAX_PANES * 4);
  private readonly rBuf = new Float32Array(MAX_PANES);
  private readonly tBuf = new Float32Array(MAX_PANES);
  private readonly aBuf = new Float32Array(MAX_PANES);
  private readonly kBuf = new Float32Array(MAX_PANES);

  constructor(private readonly host: HTMLElement) {
    this.cur = this.target();

    this.canvas.className = "kb-plate-canvas";
    this.rims.className = "kb-glass-rims";
    host.append(this.canvas, this.rims);
    this.gl = this.canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false });
    if (this.gl) this.compile(this.gl);
    else this.canvas.remove();
    this.resize();
    window.addEventListener("resize", this.resize);
    // 背景板在舞台启用（html.stage-on）之后才显示，那时才量得到真实尺寸
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    window.addEventListener("kb:layout", () => this.invalidate());
    this.raf = requestAnimationFrame(this.tick);
  }

  setWeather(kind: string | undefined) {
    this.weatherTarget = weatherOf(kind);
  }

  /** 导演每帧调用：当前在模块 a 与 b 之间，进度 t */
  blend(a: string, b: string, t: number) {
    if (a !== this.a || b !== this.b || Math.abs(t - this.t) > 1e-4) this.dirty = true;
    this.a = a;
    this.b = b;
    this.t = t;
  }

  /** 内容变化（换文集、换筛选）后请求重新量玻璃 */
  invalidate() {
    this.lastMeasure = 0;
    this.lastScan = -1e9;
    this.dirty = true;
  }

  /* ---------------- 玻璃与对比度目标 ---------------- */

  private moduleOf(el: Element) {
    const track = el.closest<HTMLElement>("[data-stage]");
    if (track) return track.dataset.stage!;
    return el.closest("#top") ? "hero" : "";
  }

  /** 是否随文档流滚动（首屏与「关于」）；其余模块的叠层固定在视口上 */
  private flows(module: string) {
    return module === "hero" || module === "about";
  }

  private scan() {
    const panes = new Map<string, Pane[]>();
    const prevPanes = [...this.panes.values()].flat();
    document.querySelectorAll<HTMLElement>("[data-glass]").forEach((el) => {
      const m = this.moduleOf(el);
      if (!m) return;
      const pane: Pane = prevPanes.find((p) => p.el === el) ?? { el, order: Number(el.dataset.glass) || 0, radius: 22, tone: 0, thick: 0, thickTarget: 0, fadeTarget: 1, fade: 1, rect: null, shown: null };
      pane.radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      if (!panes.has(m)) panes.set(m, []);
      panes.get(m)!.push(pane);
    });
    panes.forEach((list) => list.sort((x, y) => x.order - y.order).splice(MAX_PANES));
    this.panes = panes;
    const prev = new Map(this.tones.map((t) => [t.el, t]));
    this.tones = [
      ...[...document.querySelectorAll<HTMLElement>("[data-tone]")].map((el) => prev.get(el) ?? { el, on: "" as const, pane: null }),
      ...[...panes.values()].flat().map((p) => prev.get(p.el) ?? { el: p.el, on: "" as const, pane: p }),
    ];
    const lens = document.querySelector<HTMLElement>("[data-lens]");
    this.lens = lens ? { el: lens, module: this.moduleOf(lens) } : null;
    this.lastScan = performance.now();
  }

  /** 元素在视口里的矩形：固定叠层用 offset 链（不受入场位移影响），随文档流的用实时位置 */
  private rectOf(el: HTMLElement, module: string): Rect | null {
    if (!el.isConnected) return null;
    if (this.flows(module)) {
      const r = el.getBoundingClientRect();
      return r.width || r.height ? [r.left, r.top, r.right, r.bottom] : null;
    }
    if (!el.offsetWidth && !el.offsetHeight) return null;
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n) {
      x += n.offsetLeft - (n === el ? 0 : n.scrollLeft);
      y += n.offsetTop - (n === el ? 0 : n.scrollTop);
      const parent = n.offsetParent as HTMLElement | null;
      if (!parent || parent.matches("[data-overlay]")) break;
      n = parent;
    }
    return [x, y, x + el.offsetWidth, y + el.offsetHeight];
  }

  private measure(module: string) {
    for (const p of this.panes.get(module) ?? []) {
      p.rect = this.rectOf(p.el, module);
      // 叠层本身的显隐由 mixPanes 的凝结程度负责，这里只看叠层以内
      let o = 1;
      for (let n: HTMLElement | null = p.el; n && !n.matches("[data-overlay], #top, #about"); n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity) || 0;
      p.fadeTarget = o;
    }
  }

  /**
   * 当前要画的玻璃：只有在场的一两个模块各自的玻璃，原地不动，按凝结程度 a 画。
   * 入场自上而下凝结、离场自上而下化开，与内容的溶解前线同向。
   */
  private mixPanes(): MixedPane[] {
    const out: MixedPane[] = [];
    const H = this.vh || 1;
    const add = (module: string, w: number, leaving: boolean) => {
      for (const pane of this.panes.get(module) ?? []) {
        const r = pane.shown;
        if (!r || out.length >= MAX_PANES) continue;
        const cy = clamp01((r[1] + r[3]) / 2 / H);
        const lag = (leaving ? 1 - cy : cy) * 0.3;
        const a = (this.a === this.b ? 1 : smooth(clamp01((w - 0.12 - lag) / 0.55))) * pane.fade;
        if (a < 0.002) continue;
        out.push({ r, rad: pane.radius, tone: pane.tone, thick: pane.thick, a });
      }
    };
    if (this.a === this.b) add(this.a, 1, false);
    else {
      add(this.a, 1 - this.t, true);
      add(this.b, this.t, false);
    }
    return out;
  }

  /* ---------------- 调色 ---------------- */

  private hour() {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  private target(): Palette {
    const h = this.hour();
    let i = 0;
    while (i < DAY.length - 2 && h >= DAY[i + 1][0]) i++;
    const [h0, n0] = DAY[i];
    const [h1, n1] = DAY[i + 1];
    const k = smooth(clamp01((h - h0) / (h1 - h0)));
    const A = PALETTES[n0];
    const B = PALETTES[n1];
    const keys = Object.keys(A) as (keyof Palette)[];
    const all = keys.map((key) => mixc(A[key], B[key], k));
    const mean = all.reduce<RGB>((s, c) => [s[0] + c[0] / all.length, s[1] + c[1] / all.length, s[2] + c[2] / all.length], [0, 0, 0]);
    const [cloud, rain, snow, fog] = this.weather;
    const out = {} as Palette;
    keys.forEach((key, j) => {
      let c = all[j];
      const g = luma(c);
      c = mixc(c, mixc([g, g, g], hex("#9aa6b3"), 0.45), 0.55 * cloud);
      c = mixc(c, [c[0] * 0.8, c[1] * 0.9, c[2] * 0.93], 0.75 * rain);
      c = mixc(c, mixc(c, hex("#e7f0f6"), 0.6), snow);
      c = mixc(c, mean, 0.6 * fog);
      out[key] = c;
    });
    return out;
  }

  private spring(dt: number) {
    const tgt = this.look();
    const w = 3.4;
    const z = 0.72;
    const v = this.view;
    const step = (cur: number, to: number, key: keyof typeof this.vel) => {
      const a = w * w * (to - cur) - 2 * z * w * this.vel[key];
      this.vel[key] += a * dt;
      return cur + this.vel[key] * dt;
    };
    v.shift = [step(v.shift[0], tgt.shift[0], "x"), step(v.shift[1], tgt.shift[1], "y")];
    v.zoom = step(v.zoom, tgt.zoom, "zoom");
    v.hue = step(v.hue, tgt.hue, "hue");
    v.sat = step(v.sat, tgt.sat, "sat");
    v.lamp = step(v.lamp, tgt.lamp, "lamp");
    const speed = Math.hypot(this.vel.x, this.vel.y) + Math.abs(this.vel.zoom);
    // 漂移得越快，色场里的水流越活跃
    this.flow += (Math.min(1, speed * 2.2) - this.flow) * (1 - Math.exp(-dt * 3));
    if (speed > 1e-4 || this.flow > 1e-3) this.dirty = true;
  }

  private look(): Look {
    const A = LOOKS[this.a] ?? LOOKS.fiction;
    const B = LOOKS[this.b] ?? LOOKS.fiction;
    const t = this.a === this.b ? 0 : this.t;
    const n = (x: number, y: number) => x + (y - x) * t;
    return { shift: [n(A.shift[0], B.shift[0]), n(A.shift[1], B.shift[1])], zoom: n(A.zoom, B.zoom), hue: n(A.hue, B.hue), sat: n(A.sat, B.sat), lamp: n(A.lamp, B.lamp) };
  }

  /* ---------------- WebGL ---------------- */

  private compile(gl: WebGL2RenderingContext) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0,1);}"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["R", "S", "T", "warp", "ink", "sat", "hue", "lamp", "zoom", "GA", "GK", "shift", "top", "bottom", "c1", "c2", "c3", "G", "GR", "GT", "GN", "LZ", "LA"]) this.U[n] = gl.getUniformLocation(prog, n);
  }

  private resize = () => {
    this.canvas.width = Math.max(2, Math.round(this.vw * this.scale));
    this.canvas.height = Math.max(2, Math.round(this.vh * this.scale));
    this.invalidate();
  };

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (now - this.lastScan > 1200) this.scan();

    const k = 1 - Math.exp(-dt * 1.6);
    this.weather = this.weather.map((v, i) => v + (this.weatherTarget[i] - v) * k) as Weather;
    const tgt = this.target();
    (Object.keys(tgt) as (keyof Palette)[]).forEach((key) => (this.cur[key] = mixc(this.cur[key], tgt[key], k)));

    // 量玻璃：随文档流的每帧量；固定叠层每 0.3 秒量一次（内容变化时尺寸会变）
    const remeasure = now - this.lastMeasure > 300;
    if (remeasure) this.lastMeasure = now;
    for (const m of new Set([this.a, this.b])) {
      const list = this.panes.get(m);
      if (list && (this.flows(m) || remeasure || list.some((p) => !p.rect))) this.measure(m);
    }
    // 玻璃矩形：随文档流的直接跟随；固定叠层的追着量到的值走（内容变化时平滑地伸缩）
    const kr = 1 - Math.exp(-dt * 7);
    const live = new Set([this.a, this.b]);
    this.panes.forEach((list, m) => {
      // 不在场的模块：下次出现时直接落在量到的位置
      if (!live.has(m)) for (const pane of list) pane.shown = null;
    });
    for (const m of live)
      for (const pane of this.panes.get(m) ?? []) {
        const r = pane.rect;
        if (!r) pane.shown = null;
        else if (!pane.shown || this.flows(m)) pane.shown = [...r] as Rect;
        else {
          let moving = false;
          for (let i = 0; i < 4; i++) {
            const d = r[i] - pane.shown[i];
            if (Math.abs(d) > 0.3) moving = true;
            pane.shown[i] = Math.abs(d) > 0.3 ? pane.shown[i] + d * kr : r[i];
          }
          if (moving) this.dirty = true;
        }
      }
    // 镜头：欠阻尼弹簧追向滚动给出的位置，约 1.6 秒落定，略微越过一点
    this.spring(dt);
    // 玻璃的乳白 / 烟灰随取样渐变
    const kt = 1 - Math.exp(-dt * 4);
    for (const t of this.tones)
      if (t.pane) {
        t.pane.tone += ((t.on === "dark" ? 1 : 0) - t.pane.tone) * kt;
        t.pane.thick += (t.pane.thickTarget - t.pane.thick) * kt;
      }
    this.panes.forEach((list) =>
      list.forEach((pane) => {
        const d = pane.fadeTarget - pane.fade;
        if (Math.abs(d) > 0.002) {
          pane.fade += d * (1 - Math.exp(-dt * 6));
          this.dirty = true;
        } else pane.fade = pane.fadeTarget;
      }),
    );

    const heroDark = luma(mixc(this.cur.top, this.cur.bottom, 0.5)) < 0.42;
    if (heroDark !== this.dark) {
      this.dark = heroDark;
      document.documentElement.classList.toggle("kb-plate-dark", heroDark);
    }

    const gl = this.gl;
    if (!gl) {
      this.host.style.background = `linear-gradient(rgb(${this.cur.top.map((v) => Math.round(v * 255)).join(",")}), rgb(${this.cur.bottom.map((v) => Math.round(v * 255)).join(",")}))`;
      return;
    }
    // 静止时约 30fps（色场漂得很慢）；滚动、形变、首屏随页面移动时每帧画
    if (!this.dirty && !this.flows(this.a) && !this.flows(this.b) && now - this.lastDraw < 32) return;
    this.dirty = false;
    this.lastDraw = now;

    const panes = this.mixPanes();
    this.draw(now, panes);
    this.placeRims(panes);
    if (now - this.lastSample > 250) {
      this.lastSample = now;
      this.sample(now);
    }
  };

  private draw(now: number, panes: MixedPane[]) {
    const gl = this.gl!;
    const U = this.U;
    const lk = this.view;
    const p = this.cur;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.R, w, h);
    gl.uniform1f(U.S, w / this.vw);
    gl.uniform1f(U.T, this.reduced.matches ? 0 : now / 1000);
    gl.uniform1f(U.warp, 0.42 + 0.25 * this.weather[1] - 0.15 * this.weather[3] + 0.22 * this.flow);
    gl.uniform1f(U.ink, 1 - 0.35 * this.weather[3]);
    gl.uniform1f(U.sat, lk.sat);
    gl.uniform1f(U.hue, lk.hue);
    gl.uniform1f(U.lamp, lk.lamp);
    gl.uniform1f(U.zoom, lk.zoom);
    gl.uniform2f(U.shift, lk.shift[0], lk.shift[1]);
    gl.uniform3fv(U.top, p.top);
    gl.uniform3fv(U.bottom, p.bottom);
    gl.uniform3fv(U.c1, p.c1);
    gl.uniform3fv(U.c2, p.c2);
    gl.uniform3fv(U.c3, p.c3);
    panes.forEach((g, i) => {
      this.gBuf.set(g.r, i * 4);
      this.rBuf[i] = Math.max(0, Math.min(g.rad, (g.r[2] - g.r[0]) / 2, (g.r[3] - g.r[1]) / 2));
      this.tBuf[i] = g.tone;
      this.aBuf[i] = g.a;
      this.kBuf[i] = g.thick;
    });
    gl.uniform1fv(U.GA, this.aBuf);
    gl.uniform1fv(U.GK, this.kBuf);
    gl.uniform4fv(U.G, this.gBuf);
    gl.uniform1fv(U.GR, this.rBuf);
    gl.uniform1fv(U.GT, this.tBuf);
    gl.uniform1i(U.GN, panes.length);
    // 透镜：只在它所属的模块在场时出现
    let la = 0;
    if (this.lens) {
      const m = this.lens.module;
      const wgt = m === this.a ? (this.a === this.b ? 1 : 1 - this.t) : m === this.b ? this.t : 0;
      la = smooth(clamp01(wgt * 1.6 - 0.4));
      // 卡片淡出时（例如点了别的世界观卡、离场时）透镜也一起淡出
      if (la > 0) for (let n: HTMLElement | null = this.lens.el; n && !n.matches("[data-overlay]"); n = n.parentElement) la *= parseFloat(getComputedStyle(n).opacity) || 0;
      const r = la > 0 ? this.rectOf(this.lens.el, m) : null;
      if (r) gl.uniform4f(U.LZ, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, (r[2] - r[0]) / 2, (r[3] - r[1]) / 2);
      else la = 0;
    }
    gl.uniform1f(U.LA, la);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** 玻璃上沿的高光细线（DOM，清晰）：随玻璃一起凝结、化开 */
  private placeRims(panes: MixedPane[]) {
    while (this.rimEls.length < panes.length) this.rimEls.push(this.rims.appendChild(document.createElement("i")));
    this.rimEls.forEach((el, i) => {
      const g = panes[i];
      if (!g || g.a < 0.01 || g.r[2] - g.r[0] < 4) {
        if (el.style.opacity !== "0") el.style.opacity = "0";
        return;
      }
      el.style.opacity = g.a.toFixed(3);
      el.style.transform = `translate3d(${g.r[0].toFixed(1)}px, ${g.r[1].toFixed(1)}px, 0)`;
      el.style.width = `${(g.r[2] - g.r[0]).toFixed(1)}px`;
      el.style.height = `${(g.r[3] - g.r[1]).toFixed(1)}px`;
      el.style.borderRadius = `${Math.max(0, Math.min(g.rad, (g.r[2] - g.r[0]) / 2, (g.r[3] - g.r[1]) / 2)).toFixed(1)}px`;
      el.classList.toggle("is-dark", g.tone > 0.5);
    });
  }

  /**
   * 对比度取样：在 CPU 上按与着色器相同的色场公式算一张 48×30 的亮度图（不读回 GPU，避免停顿），
   * 再按每个目标身后的实际亮度决定深浅。
   */
  private sample(now: number) {
    const T = this.reduced.matches ? 0 : now / 1000;
    const lk = this.view;
    const aspect = this.vw / this.vh;
    const warp = 0.42 + 0.25 * this.weather[1] - 0.15 * this.weather[3];
    const ink = 1 - 0.35 * this.weather[3];
    for (let y = 0; y < SAMPLE_H; y++)
      for (let x = 0; x < SAMPLE_W; x++) {
        const c = fieldCPU((x + 0.5) / SAMPLE_W, 1 - (y + 0.5) / SAMPLE_H, aspect, T, lk, this.cur, warp, ink);
        this.lum[y * SAMPLE_W + x] = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      }
    const W = this.vw;
    const H = this.vh;
    for (const t of this.tones) {
      const m = this.moduleOf(t.el);
      if (m !== this.a && m !== this.b) continue;
      const r = t.pane?.rect ?? this.rectOf(t.el, m);
      if (!r) continue;
      const x0 = Math.max(0, Math.floor((r[0] / W) * SAMPLE_W));
      const x1 = Math.min(SAMPLE_W - 1, Math.floor((r[2] / W) * SAMPLE_W));
      const y0 = Math.max(0, Math.floor((r[1] / H) * SAMPLE_H));
      const y1 = Math.min(SAMPLE_H - 1, Math.floor((r[3] / H) * SAMPLE_H));
      if (x1 < x0 || y1 < y0) continue;
      let sum = 0;
      let cnt = 0;
      let lo = 1;
      let hi = 0;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const Y = this.lum[y * SAMPLE_W + x];
          sum += Y;
          lo = Math.min(lo, Y);
          hi = Math.max(hi, Y);
          cnt++;
        }
      // 相对亮度约 0.2 以上，深色字（#141a2a）才能达到 4.5:1；文字直接压在天空上时偏向最暗处判断，留出余量。
      // 玻璃会把底色往乳白 / 烟灰推，按平均亮度判断即可。
      const Y = t.pane ? sum / cnt : Math.min(sum / cnt, lo + 0.06);
      const want = Y > (t.on === "dark" ? 0.25 : 0.2) ? "light" : "dark";
      if (want !== t.on) {
        t.on = want;
        t.el.dataset.on = want;
      }
      // 薄玻璃默认只混 8% 的白 / 18% 的深色；身后最暗（亮底时）或最亮（暗底时）的地方逼近阈值，就把这块玻璃加厚
      if (t.pane) t.pane.thickTarget = want === "light" ? clamp01((0.34 - lo) / 0.14) : clamp01((hi - 0.1) / 0.12);
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.observer?.disconnect();
    this.canvas.remove();
    this.rims.remove();
  }
}
