// 随笔而录：一张坐标纸上摊开的索引卡。
// 「全部」时按时间铺成一条条类别泳道（横轴是年份）；选择类别时，该类卡片起身聚到中央排成网格，其余沉下去。
import * as THREE from "three";
import { Rng, Tween, clamp, damp, easeInOut, easeOut, lerp, setCursor, type SampleBuffers, type StageFrame, type StageModule, type StagePresence } from "../core";

interface Note {
  id: string;
  category: string;
  title: string;
  date: string;
  status?: string;
  tags?: string[];
  summary?: string;
  code?: string;
  read?: string;
}

const CAT_COLORS = ["#1746d1", "#3f7a66", "#b0643a", "#6c5a8e", "#c07a2c", "#5b7fb8", "#8a5c28"];
const CARD_W = 0.86;
const CARD_H = 0.55;
const SERIF = `"Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif`;
const MONO = `Consolas, "JetBrains Mono", monospace`;

function parseDate(s: string) {
  const m = s.match(/(\d{4})[-.](\d{1,2})(?:[-.](\d{1,2}))?/);
  if (!m) return 2024;
  return Number(m[1]) + (Number(m[2]) - 1) / 12 + (Number(m[3] ?? 1) - 1) / 365;
}

function cardTexture(note: Note, color: string, aniso: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round(512 * (CARD_H / CARD_W));
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.fillStyle = "#fdfcf8";
  ctx.fillRect(0, 0, W, H);
  // 横线
  ctx.fillStyle = "rgba(23, 70, 209, 0.08)";
  for (let y = 120; y < H - 20; y += 34) ctx.fillRect(28, y, W - 56, 2);
  ctx.fillStyle = "rgba(216, 76, 47, 0.25)";
  ctx.fillRect(64, 0, 2, H);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 10, H);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.font = `600 20px ${MONO}`;
  ctx.fillText(note.category.toUpperCase(), 84, 52);
  ctx.fillStyle = "#8a847a";
  ctx.textAlign = "right";
  ctx.fillText(note.date.slice(0, 7).replace("-", "."), W - 28, 52);
  ctx.textAlign = "left";
  ctx.fillStyle = "#1d1b17";
  ctx.font = `600 36px ${SERIF}`;
  // 标题折两行
  const chars = Array.from(note.title);
  const lines: string[] = [];
  let cur = "";
  for (const ch of chars) {
    if (ctx.measureText(cur + ch).width > W - 112) {
      lines.push(cur);
      cur = ch;
      if (lines.length === 2) break;
    } else cur += ch;
  }
  if (lines.length < 2 && cur) lines.push(cur);
  else if (lines.length === 2 && cur) lines[1] = lines[1].slice(0, -1) + "…";
  lines.forEach((l, i) => ctx.fillText(l, 84, 112 + i * 46));
  ctx.font = `400 18px ${MONO}`;
  ctx.fillStyle = "#6f695f";
  (note.tags ?? []).slice(0, 3).forEach((t, i) => {
    const x = 84 + i * 120;
    ctx.strokeStyle = "rgba(29, 27, 23, 0.25)";
    ctx.strokeRect(x, H - 58, 110, 30);
    ctx.fillText(t.length > 9 ? t.slice(0, 8) + "…" : t, x + 8, H - 37);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

function gridTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fdfcf9";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i <= 1024; i += 32) {
    const major = i % 128 === 0;
    ctx.fillStyle = major ? "rgba(23, 70, 209, 0.11)" : "rgba(23, 70, 209, 0.045)";
    ctx.fillRect(i, 0, major ? 2 : 1, 1024);
    ctx.fillRect(0, i, 1024, major ? 2 : 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

interface Card {
  note: Note;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial[]>;
  lane: number;
  timeline: THREE.Vector3;
  rotT: number;
  target: THREE.Vector3;
  rotTarget: number;
  lift: Tween;
  dim: number;
}

export class NotesModule implements StageModule {
  readonly id = "notes";
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  readonly toneMapped = true;
  readonly backdrop: [string, string] = ["#f5f4ef", "#e3e2da"];

  private readonly overlay: HTMLElement;
  private readonly hit: HTMLElement;
  private readonly paper: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private cards: Card[] = [];
  private categories: string[] = [];
  private active = "全部";
  private hover = -1;
  private selected = -1;
  private width = 1;
  private height = 1;
  private narrow = false;
  private aniso = 4;
  private pointer = { x: -1, y: -1 };
  private readonly ray = new THREE.Raycaster();
  private readonly tmp = new THREE.Vector3();
  private readonly axis: HTMLElement | null;
  private readonly lanesEl: HTMLElement | null;
  private years: number[] = [];
  private t0 = 2023;
  private t1 = 2026.5;
  private readonly layoutMix = new Tween(0);
  private time = 0;
  private leaving = false;
  private ready = false;

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
    this.hit = overlay.querySelector<HTMLElement>("[data-nt-hit]") ?? overlay;
    this.axis = overlay.querySelector<HTMLElement>("[data-nt-axis]");
    this.lanesEl = overlay.querySelector<HTMLElement>("[data-nt-lanes]");

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xe4e2da, 1.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(-2.5, 7, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    key.shadow.radius = 5;
    key.shadow.bias = -0.0003;
    this.scene.add(key);

    const tex = gridTexture();
    tex.repeat.set(7, 4.5);
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    this.paper.rotation.x = -Math.PI / 2;
    this.paper.position.set(0.4, 0, 0.1);
    this.paper.receiveShadow = true;
    this.scene.add(this.paper);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.ShadowMaterial({ color: "#4a4436", opacity: 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    this.scene.add(floor);


    this.bindDom();
  }

  attach(renderer: THREE.WebGLRenderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  prepare() {
    const kb = (window as unknown as { KB?: { technicalNotes?: Note[] } }).KB;
    const notes = (kb?.technicalNotes ?? []).filter((n) => n.id && n.title);
    this.build(notes);
    return Promise.resolve();
  }

  private build(notes: Note[]) {
    if (this.ready || !notes.length) return;
    this.ready = true;
    this.categories = [...new Set(notes.map((n) => n.category))];
    const dates = notes.map((n) => parseDate(n.date));
    this.t0 = Math.floor(Math.min(...dates));
    this.t1 = Math.max(...dates) + 0.25;
    this.years = [];
    for (let y = this.t0; y <= Math.floor(this.t1); y++) this.years.push(y);
    this.sortedDates = [...dates].sort((a, b) => a - b);
    const rng = new Rng(13);
    const geo = new THREE.BoxGeometry(CARD_W, 0.006, CARD_H);
    const edge = new THREE.MeshStandardMaterial({ color: "#efece4", roughness: 0.9 });
    this.cards = notes.map((note) => {
      const lane = this.categories.indexOf(note.category);
      const color = CAT_COLORS[lane % CAT_COLORS.length];
      const face = new THREE.MeshStandardMaterial({ map: cardTexture(note, color, this.aniso), roughness: 0.85 });
      // 面序 +x -x +y -y +z -z
      const mesh = new THREE.Mesh(geo, [edge, edge, face, edge, edge, edge]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      return {
        note,
        mesh,
        lane,
        timeline: new THREE.Vector3(),
        rotT: rng.gauss() * 0.06,
        target: new THREE.Vector3(),
        rotTarget: 0,
        lift: new Tween(0),
        dim: 0,
      };
    });
    this.renderFilters();
    this.layout();
    this.cards.forEach((c) => c.mesh.position.copy(c.target));
    this.selectNote(this.cards.length - 1);
  }

  /* ---------------- 布局 ---------------- */

  private sortedDates: number[] = [];
  /** 时间与「序号」混合的横轴：避免笔记密集的年份挤成一团 */
  private xOf(t: number) {
    const lo = this.narrow ? -2.1 : -3.3;
    const hi = this.narrow ? 2.1 : 3.4;
    const d = this.sortedDates;
    const lin = (t - this.t0) / (this.t1 - this.t0);
    let rank = 0;
    if (d.length > 1) {
      let i = 0;
      while (i < d.length - 1 && d[i + 1] <= t) i++;
      const a = d[i];
      const b = d[Math.min(i + 1, d.length - 1)];
      rank = (i + (b > a ? clamp((t - a) / (b - a)) : 0)) / (d.length - 1);
    }
    return lerp(lo, hi, 0.3 * lin + 0.7 * rank);
  }

  private laneZ(lane: number) {
    const n = Math.max(1, this.categories.length);
    const depth = this.narrow ? 6.2 : 4.3;
    return lerp(-depth / 2, depth / 2, n === 1 ? 0.5 : lane / (n - 1)) + (this.narrow ? 0 : -0.35);
  }

  private layout() {
    // 时间线：同一泳道内的卡片按时间排开，重叠处像索引卡一样叠放
    const byLane = new Map<number, Card[]>();
    this.cards.forEach((c) => {
      if (!byLane.has(c.lane)) byLane.set(c.lane, []);
      byLane.get(c.lane)!.push(c);
    });
    byLane.forEach((list) => {
      list.sort((a, b) => parseDate(a.note.date) - parseDate(b.note.date));
      let lastX = -Infinity;
      let stack = 0;
      list.forEach((c) => {
        let x = this.narrow ? 0 : this.xOf(parseDate(c.note.date));
        if (this.narrow) {
          x = lerp(-1.8, 1.8, list.length === 1 ? 0.5 : list.indexOf(c) / Math.max(1, list.length - 1));
        }
        // 与前一张太近时向右错开，像一叠扇开的索引卡
        if (x - lastX < CARD_W * 0.36) x = lastX + CARD_W * 0.36;
        stack = x - lastX < CARD_W * 0.9 ? stack + 1 : 0;
        lastX = x;
        c.timeline.set(x, 0.004 + stack * 0.006, this.laneZ(c.lane) + (stack % 2 ? 0.06 : -0.03));
      });
    });
    this.retarget();
  }

  private retarget() {
    const focus = this.active === "全部" ? null : this.active;
    const chosen = focus ? this.cards.filter((c) => c.note.category === focus) : [];
    const cols = this.narrow ? 3 : Math.min(6, Math.max(3, Math.ceil(Math.sqrt(chosen.length * 1.8))));
    const rows = Math.ceil(chosen.length / cols);
    chosen.sort((a, b) => parseDate(a.note.date) - parseDate(b.note.date));
    this.cards.forEach((c) => {
      const k = chosen.indexOf(c);
      if (!focus) {
        c.target.copy(c.timeline);
        c.rotTarget = c.rotT;
        c.dim = 0;
      } else if (k >= 0) {
        const col = k % cols;
        const row = Math.floor(k / cols);
        c.target.set((col - (cols - 1) / 2) * (CARD_W + 0.14) + (this.narrow ? 0 : 1.0), 0.45 + k * 0.001, (row - (rows - 1) / 2) * (CARD_H + 0.16) + (this.narrow ? 0 : 0.2));
        c.rotTarget = 0;
        c.dim = 0;
      } else {
        c.target.copy(c.timeline);
        c.target.y = 0.003;
        c.rotTarget = c.rotT;
        c.dim = 0.7;
      }
    });
    this.layoutMix.set(0);
    this.layoutMix.go(1, 0.9, easeInOut);
  }

  /* ---------------- DOM ---------------- */

  private renderFilters() {
    const wrap = this.overlay.querySelector<HTMLElement>("[data-nt-filters]");
    if (!wrap) return;
    const counts = new Map<string, number>();
    this.cards.forEach((c) => counts.set(c.note.category, (counts.get(c.note.category) ?? 0) + 1));
    const all = ["全部", ...this.categories];
    wrap.innerHTML = all
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
    if (this.lanesEl) {
      this.lanesEl.innerHTML = this.categories
        .map((cat, i) => `<span data-lane="${i}" style="--c:${CAT_COLORS[i % CAT_COLORS.length]}">${cat}</span>`)
        .join("");
    }
    if (this.axis) this.axis.innerHTML = this.years.map((y) => `<span data-year="${y}">${y}</span>`).join("");
    const total = this.overlay.querySelector("[data-nt-total]");
    if (total) total.textContent = `${String(this.cards.length).padStart(2, "0")} NOTES / INDEXED`;
  }

  private selectNote(i: number) {
    this.selected = i;
    const n = this.cards[i]?.note;
    if (!n) return;
    const set = (sel: string, v: string) => {
      const el = this.overlay.querySelector(sel);
      if (el) el.textContent = v;
    };
    const pv = this.overlay.querySelector<HTMLElement>("[data-nt-preview]");
    if (!pv) return;
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

  /** 从笔记页后退回来（bfcache）：撤销离场 */
  arrive() {
    this.leaving = false;
  }

  private open(i: number) {
    if (this.leaving) return;
    this.leaving = true;
    this.selected = i;
    this.overlay.classList.add("is-leaving");
    const url = `/notes/${this.cards[i].note.id}/`;
    setTimeout(() => location.assign(url), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750);
  }

  private pick(x: number, y: number) {
    if (!this.cards.length) return -1;
    this.ray.setFromCamera(new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1), this.camera);
    const hits = this.ray.intersectObjects(this.cards.filter((c) => c.dim < 0.5).map((c) => c.mesh));
    hits.sort((a, b) => b.object.position.y - a.object.position.y || a.distance - b.distance);
    if (!hits.length) return -1;
    return this.cards.findIndex((c) => c.mesh === hits[0].object);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const narrow = width / height < 0.9;
    const changed = narrow !== this.narrow;
    this.narrow = narrow;
    this.camera.aspect = width / height;
    this.camera.fov = narrow ? 40 : 30;
    this.camera.updateProjectionMatrix();
    if (changed && this.ready) this.layout();
  }

  update(f: StageFrame, pr: StagePresence) {
    const dt = f.delta;
    this.time += dt;
    this.layoutMix.step(dt);
    const cam = this.camera;
    const enter = pr.role === 1 ? 1 - easeOut(pr.morph) : 0;
    const dist = this.narrow ? 11.5 : 10.6;
    const tx = this.narrow ? 0 : 1.2;
    cam.position.set(tx + f.pointer.x * 0.4, dist * 0.8 + enter * 2.5 - pr.hold * 0.4, dist * 0.6 + enter * 1.4 - pr.hold * 0.3);
    this.tmp.set(tx, 0, this.narrow ? 0.4 : -0.35);
    if (this.leaving && this.selected >= 0) {
      const c = this.cards[this.selected].mesh.position;
      this.tmp.lerp(c, 0.5);
      cam.position.lerp(new THREE.Vector3(c.x, c.y + 1.4, c.z + 0.6), 0.08);
    }
    cam.lookAt(this.tmp);
    cam.updateMatrixWorld();

    let hover = pr.active && this.pointer.x >= 0 ? this.pick(this.pointer.x, this.pointer.y) : -1;
    if (this.leaving) hover = this.selected;
    if (hover !== this.hover) {
      this.hover = hover;
      if (hover >= 0 && !matchMedia("(pointer: coarse)").matches) this.selectNote(hover);
    }
    setCursor(this.hit, hover >= 0 ? "ENTER" : "");

    const k = 1 - Math.exp(-dt * 6);
    this.cards.forEach((c, i) => {
      c.lift.go(i === hover ? 1 : 0, 0.3, easeOut);
      c.lift.step(dt);
      const m = c.mesh;
      m.position.lerp(c.target, k);
      m.position.y = damp(m.position.y, c.target.y + c.lift.value * 0.22 + (this.leaving && i === this.selected ? 1 : 0), 8, dt);
      const rotY = lerp(m.rotation.y, c.rotTarget + c.lift.value * 0.0, k);
      m.rotation.set(-c.lift.value * 0.18, rotY, 0);
      const face = m.material[2];
      const g = damp(face.color.r, c.dim > 0 ? 0.8 : 1, 6, dt);
      face.color.setRGB(g, g, g * 0.985);
    });

    this.placeLabels(pr);
  }

  private placeLabels(pr: StagePresence) {
    if (pr.presence < 0.01 || !this.ready) return;
    const project = (x: number, z: number) => {
      this.tmp.set(x, 0, z).project(this.camera);
      return { x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height };
    };
    this.axis?.querySelectorAll<HTMLElement>("[data-year]").forEach((el) => {
      const y = Number(el.dataset.year);
      const first = this.sortedDates.find((d) => d >= y) ?? y;
      const p = project(this.xOf(first) - CARD_W * 0.45, this.laneZ(this.categories.length - 1) + 0.55);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    });
    this.lanesEl?.querySelectorAll<HTMLElement>("[data-lane]").forEach((el) => {
      const lane = Number(el.dataset.lane);
      const xs = this.cards.filter((c) => c.lane === lane).map((c) => c.timeline.x);
      const p = project((xs.length ? Math.min(...xs) : 0) - CARD_W * 0.5 - 0.12, this.laneZ(lane));
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    });
  }

  sample(count: number, out: SampleBuffers) {
    const rng = new Rng(41);
    const c = new THREE.Color();
    const paper = new THREE.Color("#f3f2ec");
    const blue = new THREE.Color("#1746d1");
    for (let i = 0; i < count; i++) {
      let p: THREE.Vector3;
      if (this.cards.length && rng.next() < 0.55) {
        const card = this.cards[Math.floor(rng.next() * this.cards.length)];
        p = new THREE.Vector3(rng.range(-CARD_W / 2, CARD_W / 2), 0.004, rng.range(-CARD_H / 2, CARD_H / 2)).applyMatrix4(card.mesh.matrixWorld);
        c.set(rng.next() < 0.3 ? CAT_COLORS[card.lane % CAT_COLORS.length] : "#faf8f2");
      } else {
        // 坐标纸的网格线
        const onX = rng.next() < 0.5;
        const g = Math.round(rng.range(-16, 16)) * 0.25;
        p = onX ? new THREE.Vector3(g * 1.5, 0.001, rng.range(-4.2, 4.2)) : new THREE.Vector3(rng.range(-7.5, 7.5), 0.001, g);
        c.copy(rng.next() < 0.25 ? blue : paper);
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

export { clamp };
