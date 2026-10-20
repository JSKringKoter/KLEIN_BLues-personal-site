// 随笔而录（背景板原型 /?bg=new）：一面正对镜头的卡片墙，取代原来坐标纸上按「类别泳道 × 时间」叠放的索引卡。
// 卡片本身就是不透明的纸片，直接浮在天空上，下面不垫玻璃。
// 「全部」：卡片按日期从新到旧排成网格，网格按可用区域自动定行列，互不遮挡，标题都能直接读；卡片左侧的色条是类别。
// 选择类别：该类卡片重新排成更大的网格，其余卡片退到远处、变淡。
// 悬停：卡片朝镜头浮起放大，随指针轻轻偏转；右侧玻璃面板显示摘要。入场时卡片像发牌一样依次翻正。
// 离场 / 返回：沿用原来的接力（src/scripts/handoff.ts）：交接层从卡片的屏幕轮廓展开，返回时收拢回这张卡片。
import * as THREE from "three";
import { HandoffLayer, leave, normPath, reducedMotion, settle, type Handoff } from "../../handoff";
import { Rng, clamp, damp, easeOut, lerp, setCursor, type SampleBuffers, type StageFrame, type StageModule, type StagePresence } from "../core";

interface Note {
  id: string;
  category: string;
  title: string;
  date: string;
  status?: string;
  tags?: string[];
  summary?: string;
  code?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Card {
  note: Note;
  lane: number;
  order: number;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** 「全部」时的位置（屏幕像素） */
  home: Box;
  target: Box & { z: number; alpha: number };
  cur: Box & { z: number; alpha: number };
  lift: number;
  tilt: THREE.Vector2;
}

const CAT_COLORS = ["#1746d1", "#3f7a66", "#b0643a", "#6c5a8e", "#c07a2c", "#5b7fb8", "#8a5c28"];
const ASPECT = 1.75;
const GAP = 10;
const TEX_W = 640;
const TEX_H = Math.round(TEX_W / ASPECT);
const SERIF = `"Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif`;
const MONO = `Consolas, "JetBrains Mono", monospace`;
const DIST = 20;

function cardTexture(note: Note, color: string, aniso: number) {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext("2d")!;
  const r = 30;
  ctx.beginPath();
  ctx.roundRect(2, 2, TEX_W - 4, TEX_H - 4, r);
  ctx.fillStyle = "#fdfcf8";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 14, TEX_H);
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = color;
  ctx.fillText(note.category.toUpperCase(), 52, 72);
  ctx.textAlign = "right";
  ctx.fillStyle = "#8a847a";
  ctx.fillText(note.date.slice(0, 7).replace("-", "."), TEX_W - 40, 72);
  ctx.textAlign = "left";
  // 标题：至多两行，放不下时收字号
  const maxW = TEX_W - 96;
  let size = 84;
  let lines: string[] = [];
  for (; size >= 60; size -= 4) {
    ctx.font = `600 ${size}px ${SERIF}`;
    lines = [];
    let cur = "";
    for (const ch of Array.from(note.title)) {
      if (ctx.measureText(cur + ch).width > maxW) {
        lines.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    if (lines.length <= 2) break;
  }
  if (lines.length > 2) lines = [lines[0], lines[1].slice(0, -1) + "…"];
  ctx.fillStyle = "#1d1b17";
  const top = lines.length === 1 ? 210 : 168;
  lines.forEach((l, i) => ctx.fillText(l, 52, top + i * (size + 12)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

/** 一张柔和的投影（所有卡片共用） */
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 80;
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(10px)";
  ctx.fillStyle = "rgba(14, 20, 40, 1)";
  ctx.beginPath();
  ctx.roundRect(22, 20, 84, 42, 10);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 在 rect 里排 n 张卡片：挑一个让卡片最大的列数 */
function grid(n: number, rect: Box, maxCard = 300): Box[] {
  if (!n) return [];
  let best = { cols: 1, w: 0, h: 0 };
  for (let cols = 1; cols <= Math.min(n, 9); cols++) {
    const rows = Math.ceil(n / cols);
    let w = (rect.w - (cols - 1) * GAP) / cols;
    let h = w / ASPECT;
    if (rows * h + (rows - 1) * GAP > rect.h) {
      h = (rect.h - (rows - 1) * GAP) / rows;
      w = h * ASPECT;
    }
    w = Math.min(w, maxCard);
    if (w > best.w) best = { cols, w, h: w / ASPECT };
  }
  const { cols, w, h } = best;
  const rows = Math.ceil(n / cols);
  const totalH = rows * h + (rows - 1) * GAP;
  const out: Box[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const rowW = inRow * w + (inRow - 1) * GAP;
    const col = i % cols;
    out.push({ x: rect.x + (rect.w - rowW) / 2 + col * (w + GAP), y: rect.y + (rect.h - totalH) / 2 + row * (h + GAP), w, h });
  }
  return out;
}

export class NotesWall implements StageModule {
  readonly id = "notes";
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  readonly toneMapped = false;
  readonly backdrop: [string, string] = ["#f5f4ef", "#e3e2da"];

  private readonly overlay: HTMLElement;
  private readonly hit: HTMLElement;
  private readonly fieldEl: HTMLElement;
  private readonly layer = HandoffLayer.find();
  private readonly ray = new THREE.Raycaster();
  private readonly tmp = new THREE.Vector3();
  private readonly shadowTex = shadowTexture();
  private cards: Card[] = [];
  private categories: string[] = [];
  private active = "全部";
  private hover = -1;
  private selected = -1;
  private width = 1;
  private height = 1;
  /** 视平面（z = 0）上，每个屏幕像素对应的世界长度 */
  private k = 0.01;
  private field: Box = { x: 0, y: 0, w: 1, h: 1 };
  private aniso = 4;
  private pointer = { x: -1, y: -1 };
  private leaving = false;
  private focus = 0;
  private leaveTimer = 0;
  private ready = false;
  private time = 0;

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
    this.overlay.classList.add("nt--wall");
    this.hit = overlay.querySelector<HTMLElement>("[data-nt-hit]") ?? overlay;
    this.fieldEl = document.createElement("div");
    this.fieldEl.className = "nt-field";
    this.fieldEl.setAttribute("aria-hidden", "true");
    overlay.prepend(this.fieldEl);
    this.bindDom();
  }

  attach(renderer: THREE.WebGLRenderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  prepare() {
    const kb = (window as unknown as { KB?: { technicalNotes?: Note[] } }).KB;
    this.build((kb?.technicalNotes ?? []).filter((n) => n.id && n.title));
    return Promise.resolve();
  }

  private build(notes: Note[]) {
    if (this.ready || !notes.length) return;
    this.ready = true;
    const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
    this.categories = [...new Set(sorted.map((n) => n.category))];
    const geo = new THREE.PlaneGeometry(1, 1);
    this.cards = sorted.map((note, order) => {
      const lane = this.categories.indexOf(note.category);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ map: cardTexture(note, CAT_COLORS[lane % CAT_COLORS.length], this.aniso), transparent: true, depthTest: false, depthWrite: false }),
      );
      const shadow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      this.scene.add(shadow, mesh);
      const box = { x: 0, y: 0, w: 0, h: 0 };
      return { note, lane, order, mesh, shadow, home: { ...box }, target: { ...box, z: 0, alpha: 1 }, cur: { ...box, z: 0, alpha: 0 }, lift: 0, tilt: new THREE.Vector2() };
    });
    this.renderFilters();
    this.layout();
    this.cards.forEach((c) => Object.assign(c.cur, c.target));
    this.selectNote(0);
  }

  /* ---------------- 布局（屏幕像素） ---------------- */

  /** 可用区域：标题下方、筛选条上方、详情面板左侧 */
  private measureField() {
    const off = (sel: string) => {
      const el = this.overlay.querySelector<HTMLElement>(sel);
      if (!el || !el.offsetWidth) return null;
      let x = 0;
      let y = 0;
      let n: HTMLElement | null = el;
      while (n && n !== this.overlay) {
        x += n.offsetLeft;
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };
    const head = off(".nt-head");
    const filters = off(".nt-filters");
    const preview = off(".nt-preview");
    const narrow = this.width < 760;
    const pad = 22;
    const x0 = (head?.x ?? 48) + pad;
    const y0 = (head ? head.y + head.h : 220) + 28 + pad;
    const x1 = (narrow || !preview ? this.width - 16 : preview.x - 36) - pad;
    const y1 = (narrow && preview ? preview.y : filters?.y ?? this.height - 80) - 24 - pad;
    this.field = { x: x0, y: y0, w: Math.max(80, x1 - x0), h: Math.max(80, y1 - y0) };
    Object.assign(this.fieldEl.style, {
      left: `${x0 - pad}px`,
      top: `${y0 - pad}px`,
      width: `${this.field.w + pad * 2}px`,
      height: `${this.field.h + pad * 2}px`,
    });
  }

  private layout() {
    this.measureField();
    const homes = grid(this.cards.length, this.field);
    this.cards.forEach((c, i) => (c.home = homes[i]));
    this.retarget();
  }

  private retarget() {
    const all = this.active === "全部";
    const chosen = all ? this.cards : this.cards.filter((c) => c.note.category === this.active);
    const boxes = grid(chosen.length, this.field, 260);
    this.cards.forEach((c) => {
      const k = chosen.indexOf(c);
      if (k >= 0) Object.assign(c.target, boxes[k], { z: 0, alpha: 1 });
      else Object.assign(c.target, c.home, { z: -14, alpha: 0.16 });
    });
  }

  /* ---------------- DOM ---------------- */

  private renderFilters() {
    const wrap = this.overlay.querySelector<HTMLElement>("[data-nt-filters]");
    if (!wrap) return;
    const counts = new Map<string, number>();
    this.cards.forEach((c) => counts.set(c.note.category, (counts.get(c.note.category) ?? 0) + 1));
    wrap.innerHTML = ["全部", ...this.categories]
      .map((cat, i) => {
        const color = i === 0 ? "#1d1b17" : CAT_COLORS[(i - 1) % CAT_COLORS.length];
        const n = i === 0 ? this.cards.length : counts.get(cat) ?? 0;
        return `<button type="button" data-cat="${cat}" aria-pressed="${cat === this.active}" data-cursor="SWITCH" style="--c:${color}"><i></i>${cat}<small>${String(n).padStart(2, "0")}</small></button>`;
      })
      .join("");
    wrap.querySelectorAll<HTMLButtonElement>("button").forEach((b) =>
      b.addEventListener("click", () => {
        this.active = b.dataset.cat ?? "全部";
        wrap.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        this.overlay.classList.toggle("is-filtered", this.active !== "全部");
        this.retarget();
        const first = this.cards.findIndex((c) => this.active === "全部" || c.note.category === this.active);
        if (first >= 0) this.selectNote(first);
      }),
    );
    const total = this.overlay.querySelector("[data-nt-total]");
    if (total) total.textContent = `${String(this.cards.length).padStart(2, "0")} NOTES / INDEXED`;
  }

  private selectNote(i: number) {
    this.selected = i;
    const n = this.cards[i]?.note;
    const pv = this.overlay.querySelector<HTMLElement>("[data-nt-preview]");
    if (!n || !pv) return;
    const set = (sel: string, v: string) => {
      const el = pv.querySelector(sel);
      if (el) el.textContent = v;
    };
    pv.style.setProperty("--c", CAT_COLORS[this.cards[i].lane % CAT_COLORS.length]);
    set("[data-nt-cat]", n.category);
    set("[data-nt-status]", n.status ?? "");
    set("[data-nt-date]", n.date);
    set("[data-nt-title]", n.title);
    set("[data-nt-summary]", n.summary ?? "");
    const tags = pv.querySelector("[data-nt-tags]");
    if (tags) tags.innerHTML = (n.tags ?? []).map((t) => `<span>${t}</span>`).join("");
    const code = pv.querySelector<HTMLElement>("[data-nt-code]");
    if (code) {
      code.textContent = n.code ?? "";
      (code.parentElement as HTMLElement).hidden = !n.code;
    }
    const link = pv.querySelector<HTMLAnchorElement>("[data-nt-open]");
    if (link) link.href = `/notes/${n.id}/`;
    pv.classList.remove("is-swap");
    void pv.offsetWidth;
    pv.classList.add("is-swap");
  }

  private bindDom() {
    this.hit.addEventListener("pointermove", (e) => (this.pointer = { x: e.clientX, y: e.clientY }));
    this.hit.addEventListener("pointerleave", () => (this.pointer = { x: -1, y: -1 }));
    this.hit.addEventListener("click", (e) => {
      const i = this.pick(e.clientX, e.clientY);
      if (i < 0) return;
      if (i === this.selected || !matchMedia("(pointer: coarse)").matches) this.open(i);
      else this.selectNote(i);
    });
  }

  /* ---------------- 屏幕 ↔ 世界 ---------------- */

  private toWorld(x: number, y: number, z: number, out: THREE.Vector3) {
    // 透视：z 越靠前（越大）同样的屏幕位置离中心越近
    const s = (DIST - z) / DIST;
    return out.set((x - this.width / 2) * this.k * s, -(y - this.height / 2) * this.k * s, z);
  }

  /** 卡片在屏幕上的外接矩形 */
  private cardRect(i: number) {
    const m = this.cards[i].mesh;
    m.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const sx of [-0.5, 0.5])
      for (const sy of [-0.5, 0.5]) {
        this.tmp.set(sx, sy, 0).applyMatrix4(m.matrixWorld).project(this.camera);
        const x = (this.tmp.x * 0.5 + 0.5) * this.width;
        const y = (-this.tmp.y * 0.5 + 0.5) * this.height;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }

  private static titleOnCard(r: { left: number; top: number; width: number; height: number }) {
    return { left: r.left + r.width * 0.08, top: r.top + r.height * 0.22, width: r.width * 0.8, height: r.height * 0.2 };
  }

  private pick(x: number, y: number) {
    if (!this.cards.length || x < 0) return -1;
    this.ray.setFromCamera(new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1), this.camera);
    const live = this.cards.filter((c) => c.target.alpha > 0.5);
    const hits = this.ray.intersectObjects(live.map((c) => c.mesh));
    if (!hits.length) return -1;
    hits.sort((a, b) => b.object.position.z - a.object.position.z);
    return this.cards.findIndex((c) => c.mesh === hits[0].object);
  }

  /* ---------------- 离场 / 返回 ---------------- */

  private open(i: number) {
    if (this.leaving) return;
    this.leaving = true;
    this.selected = i;
    this.overlay.classList.add("is-leaving");
    const note = this.cards[i].note;
    const url = `/notes/${note.id}/`;
    leave(url, { from: "notes", kind: "notes", title: note.title, path: location.pathname });
    if (reducedMotion() || !this.layer) {
      location.assign(url);
      return;
    }
    document.documentElement.classList.add("kb-busy");
    // 卡片先朝镜头迎上来一段，再从它的轮廓展开
    this.leaveTimer = window.setTimeout(async () => {
      if (!this.leaving) return;
      const r = this.cardRect(i);
      this.layer!.configure({ kind: "notes", title: note.title, fromColor: "#fdfcf8" });
      await this.layer!.expand({ rect: r, titleFrom: NotesWall.titleOnCard(r), titleColor: "#1d1b17", duration: 900 });
      if (this.leaving) location.assign(url);
    }, 380);
  }

  private async rewind(i: number) {
    const layer = this.layer!;
    const html = document.documentElement;
    html.classList.add("kb-busy");
    clearTimeout(this.leaveTimer);
    this.selected = i;
    this.selectNote(i);
    this.leaving = true;
    this.focus = 1;
    this.overlay.classList.add("is-leaving", "is-instant");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    this.overlay.classList.remove("is-instant");
    const rect = this.cardRect(i);
    layer.configure({ kind: "notes", title: this.cards[i].note.title, fromColor: "#fdfcf8" });
    const done = layer.collapse({ rect, titleTo: NotesWall.titleOnCard(rect), titleColor: "#1d1b17", duration: 900 });
    window.setTimeout(() => {
      this.leaving = false;
      this.overlay.classList.remove("is-leaving");
      this.overlay.classList.add("is-returning");
    }, 650);
    await done;
    layer.hide();
    settle();
    html.classList.remove("kb-busy");
    window.setTimeout(() => this.overlay.classList.remove("is-returning"), 1200);
  }

  async receive(h: Handoff) {
    if (!this.layer || reducedMotion()) return false;
    for (let n = 0; n < 60 && !this.ready; n++) await new Promise((r) => requestAnimationFrame(r));
    const id = normPath(h.path ?? "").split("/").pop();
    const i = this.cards.findIndex((c) => c.note.id === id);
    if (i < 0) return false;
    await this.rewind(i);
    return true;
  }

  arrive() {
    if (!this.leaving || this.selected < 0 || !this.layer) {
      this.leaving = false;
      return false;
    }
    this.rewind(this.selected);
    return true;
  }

  /* ---------------- 每帧 ---------------- */

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.k = (2 * DIST * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / height;
    if (this.ready) {
      this.layout();
      this.cards.forEach((c) => Object.assign(c.cur, c.target));
    }
  }

  update(f: StageFrame, pr: StagePresence) {
    const dt = f.delta;
    this.time += dt;
    if (this.ready && this.time % 1 < dt) this.layout(); // 详情面板高度会随笔记变化：每秒校一次可用区域
    const cam = this.camera;
    cam.position.set(f.pointer.x * 0.35, f.pointer.y * 0.2, DIST);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();

    let hover = pr.active && this.pointer.x >= 0 ? this.pick(this.pointer.x, this.pointer.y) : -1;
    if (this.leaving) hover = this.selected;
    if (hover !== this.hover) {
      this.hover = hover;
      if (hover >= 0 && !matchMedia("(pointer: coarse)").matches) this.selectNote(hover);
    }
    setCursor(this.hit, hover >= 0 ? "ENTER" : "");
    this.focus = damp(this.focus, this.leaving ? 1 : 0, this.leaving ? 3.5 : 2.6, dt);

    // 入场：按序号依次翻正（离场时倒放）
    const presence = pr.role === 0 ? pr.presence : easeOut(pr.presence);
    const kPos = 1 - Math.exp(-dt * 7);
    this.cards.forEach((c, i) => {
      const cur = c.cur;
      const tgt = c.target;
      cur.x = lerp(cur.x, tgt.x, kPos);
      cur.y = lerp(cur.y, tgt.y, kPos);
      cur.w = lerp(cur.w, tgt.w, kPos);
      cur.h = lerp(cur.h, tgt.h, kPos);
      cur.z = lerp(cur.z, tgt.z, kPos);
      cur.alpha = lerp(cur.alpha, tgt.alpha, kPos);
      const hot = i === hover;
      c.lift = damp(c.lift, hot ? 1 : 0, 9, dt);
      const lifted = c.lift + (this.leaving && i === this.selected ? this.focus : 0);
      let tx = 0;
      let ty = 0;
      if (hot && this.pointer.x >= 0) {
        tx = clamp((this.pointer.x - (cur.x + cur.w / 2)) / (cur.w * 0.7), -1, 1);
        ty = clamp((this.pointer.y - (cur.y + cur.h / 2)) / (cur.h * 0.7), -1, 1);
      }
      c.tilt.set(damp(c.tilt.x, tx, 8, dt), damp(c.tilt.y, ty, 8, dt));
      const appear = clamp(presence * 1.7 - c.order * 0.014 - 0.05);
      const z = cur.z + lifted * 2.2;
      const m = c.mesh;
      this.toWorld(cur.x + cur.w / 2, cur.y + cur.h / 2, z, m.position);
      const s = (DIST - z) / DIST;
      const grow = 1 + lifted * 0.38;
      m.scale.set(cur.w * this.k * s * grow, cur.h * this.k * s * grow, 1);
      m.rotation.set(ty * 0.14 * c.lift, (1 - appear) * 1.35 + tx * 0.18 * c.lift, 0);
      m.material.opacity = cur.alpha * clamp(appear * 1.4);
      m.visible = m.material.opacity > 0.004;
      m.renderOrder = hot || (this.leaving && i === this.selected) ? 1000 : Math.round(500 + cur.z * 10) + i * 0.01;
      // 投影：浮得越高越大、越淡
      const sh = c.shadow;
      sh.position.set(m.position.x, m.position.y - cur.h * this.k * s * (0.06 + lifted * 0.12), m.position.z - 0.02);
      sh.scale.set(m.scale.x * (1.25 + lifted * 0.2), m.scale.y * (1.5 + lifted * 0.3), 1);
      sh.rotation.copy(m.rotation);
      sh.material.opacity = m.material.opacity * (0.16 + lifted * 0.1);
      sh.visible = m.visible;
      sh.renderOrder = m.renderOrder - 0.5;
    });
  }

  sample(count: number, out: SampleBuffers) {
    const rng = new Rng(41);
    const c = new THREE.Color();
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      if (!this.cards.length) {
        p.set(rng.range(-6, 6), rng.range(-3, 3), 0);
        c.set("#faf8f2");
      } else {
        const card = this.cards[Math.floor(rng.next() * this.cards.length)];
        const b = card.target.alpha > 0.5 ? card.target : card.home;
        this.toWorld(b.x + rng.next() * b.w, b.y + rng.next() * b.h, 0, p);
        c.set(rng.next() < 0.25 ? CAT_COLORS[card.lane % CAT_COLORS.length] : "#faf8f2");
      }
      out.pos[i * 3] = p.x;
      out.pos[i * 3 + 1] = p.y;
      out.pos[i * 3 + 2] = p.z;
      out.col[i * 3] = c.r;
      out.col[i * 3 + 1] = c.g;
      out.col[i * 3 + 2] = c.b;
      out.size[i] = 1.6 + rng.next() * 1.4;
    }
  }

  dispose() {}
}
