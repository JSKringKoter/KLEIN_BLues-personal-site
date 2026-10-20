// 画中人：桌上摊开的全息角色卡（首页的独立模块，/worldbuildings/portraits/ 也用同一个类）。
// 悬停：卡片朝镜头浮起、随指针倾斜（只有指针在卡上时才倾斜），右下角显示角色名，光标变成贴合卡片的四角框。
// 点击：卡片被拿到面前，这个角色的其他画作做成同样的镭射卡，从四周飞入，在同一平面上由内向外铺开、互不重叠；
//       铺不下就伸到屏幕外，指针移向边缘时整片画作朝反方向平移（拿起的卡跟得少，形成视差），露出外圈。
//       每张画作卡左下角印着画名（单行，放不下就收字号）。
import * as THREE from "three";
import { Rng, Tween, clamp, damp, easeInOut, easeOut, lerp, type SampleBuffers, type StageFrame, type StageModule, type StagePresence } from "../core";
import { BORDER, CARD_H, CARD_W, cardPixels, createHoloCard, type HoloCard } from "../worlds/holo";

interface Painting {
  id: string;
  title: string;
  group: string;
  src: string;
  width: number;
  height: number;
}

interface KBRuntime {
  allPaintings: Painting[];
  openViewer: (images: Painting[], index: number, trigger: Element) => void;
}

interface Group {
  group: string;
  images: Painting[];
  tint: string;
}

interface Card {
  card: HoloCard;
  slot: THREE.Object3D;
  lift: number;
  tilt: THREE.Vector2;
  hold: Tween;
}

interface Tile {
  card: HoloCard;
  label: THREE.Texture;
  painting: Painting;
  index: number;
  /** 基准镜头坐标系里的位置：x、y 与深度 */
  home: THREE.Vector3;
  from: THREE.Vector3;
  rotZ: number;
  fromRot: number;
  /** 卡的尺寸（卡面单位）与缩放到世界的倍数 */
  w: number;
  h: number;
  scale: number;
  t: Tween;
  hot: number;
  tilt: THREE.Vector2;
}

type Target = { kind: "card"; i: number } | { kind: "tile"; i: number } | null;

const TINTS = ["#1746d1", "#b0643a", "#5b7fb8", "#8a5c28", "#3f7a66", "#9a6a3a", "#6c5a8e"];
const HOLD_DEPTH = 7.2;
const HOLD_SCALE = 1.12;
/** 画作卡所在的深度 */
const TILE_DEPTH = 10.5;
/** 画作卡底边标题条的高度（卡宽为 1） */
const STRIP = 0.15;
const SERIF = `"Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif`;

/** 画名：单行，放不下就收字号；只用 alpha，墨色由着色器给 */
function labelTexture(title: string, cardW = 1) {
  const H = 128;
  const W = Math.round((H * (cardW - BORDER * 2)) / STRIP);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const pad = 6;
  let size = 64;
  ctx.font = `500 ${size}px ${SERIF}`;
  while (size > 18 && ctx.measureText(title).width > W - pad * 2) {
    size -= 2;
    ctx.font = `500 ${size}px ${SERIF}`;
  }
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";
  ctx.fillText(title, pad, H * 0.54);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export class PortraitsModule implements StageModule {
  readonly id = "portraits";
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  readonly toneMapped = false;
  readonly backdrop: [string, string] = ["#f4efe6", "#e3d9c8"];

  private readonly overlay: HTMLElement;
  private readonly hit: HTMLElement;
  private readonly frameEl: HTMLElement | null;
  private readonly holoBtn: HTMLButtonElement | null;
  private readonly heldEl: HTMLElement | null;
  private readonly nameEl: HTMLElement | null;
  private nameIdx = -1;
  /** 拿起时画作平面可以平移的范围，以及当前（平滑后的）平移量；均为基准镜头坐标 */
  private readonly pan = new THREE.Vector2();
  private readonly drift = new THREE.Vector2();
  private readonly kb: KBRuntime | undefined;
  private readonly groups: Group[];
  private cards: Card[] = [];
  private tiles: Tile[] = [];
  private readonly leaving: Tile[] = [];
  private readonly veil: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** 用相机而不是 Object3D：只有相机的 lookAt 是让 -z 朝向目标 */
  private readonly baseCam = new THREE.PerspectiveCamera();
  private readonly ray = new THREE.Raycaster();
  private readonly v = new THREE.Vector3();
  private readonly v2 = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly offset = new THREE.Vector2();
  private width = 1;
  private height = 1;
  private narrow = false;
  private time = 0;
  private active = false;
  private pointer = { x: -1, y: -1 };
  private target: Target = null;
  private held = -1;
  private holo = true;
  private veilAmt = 0;
  private frameKey = "";
  private ready = false;
  private anisotropy = 4;
  /** 背景板原型（/?bg=new）：卡片正对镜头排成一排，直接浮在天空上 */
  private readonly flat = document.documentElement.classList.contains("kb-plate");
  private readonly shelf: HTMLElement | null = null;
  private table: THREE.Mesh | null = null;

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
    this.hit = overlay.querySelector<HTMLElement>("[data-pt-hit]") ?? overlay;
    this.frameEl = overlay.querySelector<HTMLElement>("[data-pt-frame]");
    this.holoBtn = overlay.querySelector<HTMLButtonElement>("[data-pt-holo]");
    this.heldEl = overlay.querySelector<HTMLElement>("[data-pt-held]");
    this.nameEl = overlay.querySelector<HTMLElement>("[data-pt-hover]");
    this.kb = (window as unknown as { KB?: KBRuntime }).KB;
    const all = this.kb?.allPaintings ?? [];
    this.groups = [...new Set(all.map((p) => p.group))].map((group, i) => ({
      group,
      images: all.filter((p) => p.group === group),
      tint: TINTS[i % TINTS.length],
    }));
    const count = overlay.querySelector("[data-pt-count]");
    if (count) count.textContent = `${String(this.groups.length).padStart(2, "0")} CHARACTERS / ${String(all.length).padStart(2, "0")} PORTRAITS`;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfbf, 1.1));
    const key = new THREE.DirectionalLight(0xfff5e6, 1.4);
    key.position.set(-3, 7, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -7;
    key.shadow.camera.right = key.shadow.camera.top = 7;
    key.shadow.radius = 8;
    key.shadow.bias = -0.0004;
    this.scene.add(key);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.ShadowMaterial({ color: "#5c4a33", opacity: 0.16 }));
    table.rotation.x = -Math.PI / 2;
    table.receiveShadow = true;
    table.visible = !this.flat;
    this.table = table;
    this.scene.add(table);


    // 拿起卡片时，桌面退到一层纸色的薄雾后面
    this.veil = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: "#f1ebe1", transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
    );
    this.veil.renderOrder = 20;
    this.veil.visible = false;
    this.scene.add(this.veil);

    try {
      this.holo = localStorage.getItem("kb-holo") !== "off";
    } catch {}
    this.syncHoloButton();
    this.bindDom();
  }

  attach(renderer: THREE.WebGLRenderer) {
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  /** 接近时才创建卡片（加载图片） */
  async prepare() {
    if (this.ready) return;
    this.ready = true;
    this.cards = this.groups.map((g, i) => {
      const card = createHoloCard(`/assets/images/character-cards/${g.images[0].id}.webp`, g.tint, this.anisotropy);
      card.mesh.castShadow = true;
      card.mesh.material.transparent = true;
      card.mesh.renderOrder = i;
      this.scene.add(card.mesh);
      return { card, slot: new THREE.Object3D(), lift: 0, tilt: new THREE.Vector2(), hold: new Tween(0) };
    });
    this.layout();
  }

  private layout() {
    if (this.flat) {
      this.layoutFlat();
      return;
    }
    const n = this.cards.length;
    this.cards.forEach((c, i) => {
      if (this.narrow) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        c.slot.position.set((col - 0.5) * 1.3, 0.02 + i * 0.004, -2.9 + row * 1.5);
        c.slot.rotation.set(-Math.PI / 2, 0, (col - 0.5) * -0.08);
      } else {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5;
        c.slot.position.set(t * 7.6, 0.02 + i * 0.004, Math.abs(t) * 1.6 - 0.2);
        c.slot.rotation.set(-Math.PI / 2, 0, -t * 0.55);
      }
    });
  }

  /** 正对镜头的一排（窄屏两三排）；托板在屏幕上包住整排卡片 */
  private layoutFlat() {
    const n = this.cards.length;
    if (!n) return;
    this.updateBaseCamera(0);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.width / this.height;
    const scale = this.narrow ? 1.05 : 1.2;
    const cw = CARD_W * scale;
    const ch = CARD_H * scale;
    const gap = cw * 0.2;
    const cols = this.narrow ? Math.min(n, 3) : n;
    const rows = Math.ceil(n / cols);
    const rowW = cols * cw + (cols - 1) * gap;
    const colH = rows * ch + (rows - 1) * gap;
    const d = Math.max(rowW / (0.78 * 2 * tan * aspect), colH / ((this.narrow ? 0.62 : 0.5) * 2 * tan));
    const cy = (this.narrow ? -0.12 : -0.1) * d * tan * 2;
    this.cards.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      const x = (col - (inRow - 1) / 2) * (cw + gap);
      const y = cy - (row - (rows - 1) / 2) * (ch + gap);
      this.inBase(x, y, d, c.slot.position);
      c.slot.quaternion.copy(this.baseCam.quaternion);
    });
    if (this.shelf) {
      const pad = 0.34 * cw;
      // 基准镜头坐标 (x, y, -d) → 屏幕像素
      const corner = (x: number, y: number) => [(x / (d * tan * aspect) * 0.5 + 0.5) * this.width, (-y / (d * tan) * 0.5 + 0.5) * this.height];
      const [x0, y0] = corner(-rowW / 2 - pad, cy + colH / 2 + pad);
      const [x1, y1] = corner(rowW / 2 + pad, cy - colH / 2 - pad);
      Object.assign(this.shelf.style, { left: `${x0.toFixed(1)}px`, top: `${y0.toFixed(1)}px`, width: `${(x1 - x0).toFixed(1)}px`, height: `${(y1 - y0).toFixed(1)}px` });
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const narrow = width / height < 0.9;
    const changed = narrow !== this.narrow;
    this.narrow = narrow;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (changed || this.flat) this.layout();
    if (this.held >= 0) this.buildTiles(this.held, false);
  }

  /* ---------------- DOM ---------------- */

  private bindDom() {
    window.addEventListener(
      "pointermove",
      (e) => {
        this.pointer = { x: e.clientX, y: e.clientY };
      },
      { passive: true },
    );
    document.documentElement.addEventListener("pointerleave", () => (this.pointer = { x: -1, y: -1 }));
    const click = (e: MouseEvent) => {
      if (!this.active || e.button !== 0) return;
      this.click(e.clientX, e.clientY, e.currentTarget as Element);
    };
    this.hit.addEventListener("click", click);
    this.frameEl?.addEventListener("click", click);
    this.holoBtn?.addEventListener("click", () => {
      this.holo = !this.holo;
      try {
        localStorage.setItem("kb-holo", this.holo ? "on" : "off");
      } catch {}
      this.syncHoloButton();
    });
    this.overlay.querySelector("[data-pt-close]")?.addEventListener("click", () => this.release());
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.held >= 0 && !document.body.classList.contains("is-locked")) this.release();
    });
    window.addEventListener("kb:release", () => this.release());
  }

  private syncHoloButton() {
    if (!this.holoBtn) return;
    this.holoBtn.setAttribute("aria-pressed", String(this.holo));
    const label = this.holoBtn.querySelector("b");
    if (label) label.textContent = this.holo ? "ON" : "OFF";
  }

  private click(x: number, y: number, trigger: Element) {
    const t = this.pick(x, y);
    if (this.held < 0) {
      if (t?.kind === "card") this.take(t.i);
      return;
    }
    const g = this.groups[this.held];
    if (t?.kind === "tile") this.kb?.openViewer(g.images, this.tiles[t.i].index, trigger);
    else if (t?.kind === "card") this.kb?.openViewer(g.images, 0, trigger);
    else this.release();
  }

  /** 拿起一张卡：其余画作从四周飞入 */
  private take(i: number) {
    if (this.held === i) return;
    if (this.held >= 0) this.release();
    this.held = i;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.cards[i].hold.go(1, reduce ? 0.01 : 1.05, easeInOut);
    this.buildTiles(i, !reduce);
    document.documentElement.classList.add("kb-hold");
    this.overlay.classList.add("is-holding");
    const g = this.groups[i];
    if (this.heldEl) {
      this.heldEl.style.setProperty("--pt-tint", g.tint);
      const meta = this.heldEl.querySelector("[data-pt-meta]");
      if (meta) meta.textContent = g.images.length > 1 ? `${String(g.images.length).padStart(2, "0")} PORTRAITS · 点击画作查看` : "01 PORTRAIT · 点击卡片查看";
    }
  }

  release() {
    if (this.held < 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.cards[this.held].hold.go(0, reduce ? 0.01 : 0.9, easeInOut);
    this.held = -1;
    // 画作向外飞散
    const n = this.tiles.length;
    this.tiles.forEach((tile, k) => {
      tile.t.go(0, reduce ? 0.01 : 0.55 + ((n - k) / Math.max(1, n)) * 0.2, (x) => x * x);
      this.leaving.push(tile);
    });
    this.tiles = [];
    this.pan.set(0, 0);
    document.documentElement.classList.remove("kb-hold");
    this.overlay.classList.remove("is-holding");
  }

  private disposeTile(tile: Tile) {
    this.scene.remove(tile.card.mesh);
    tile.card.mesh.geometry.dispose();
    tile.card.mesh.material.dispose();
    tile.label.dispose();
  }

  /**
   * 在「拿起时」的镜头坐标系里铺开画作：一张网格，按到中心的距离由内向外填，避开拿起的卡；
   * 横幅的画占两格。铺到屏幕外的部分靠平移（this.pan）看到。
   */
  private buildTiles(i: number, animate: boolean) {
    for (const t of this.tiles) this.disposeTile(t);
    this.tiles = [];
    this.pan.set(0, 0);
    const g = this.groups[i];
    const images = g.images.slice(1);
    if (!images.length) return;
    this.updateBaseCamera(0);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.width / this.height;
    const D = TILE_DEPTH;
    const halfH = D * tan;
    const halfW = halfH * aspect;
    // 一屏大约放几行
    const cellH = (2 * halfH) / (this.narrow ? 4.4 : 3.3);
    const gap = cellH * 0.1;
    const boxH = cellH - gap;
    const boxW = boxH * 0.66;
    const cellW = boxW + gap;
    // 拿起的卡在这一深度上占的范围
    const holdDepth = this.narrow ? HOLD_DEPTH + 1 : HOLD_DEPTH;
    const k = D / holdDepth;
    const hs = (this.narrow ? 1.05 : 1.2) * HOLD_SCALE * k;
    const exY = (this.narrow ? 0.35 : 0.05) * k;
    const exW = (CARD_W * hs) / 2 + gap * 0.8;
    const exH = (CARD_H * hs) / 2 + gap * 0.8;
    const blocked = (ix: number, iy: number) =>
      Math.abs(ix * cellW) - cellW / 2 < exW && Math.abs(iy * cellH - exY) - cellH / 2 < exH;
    const cells: { ix: number; iy: number; score: number }[] = [];
    const N = 18;
    for (let iy = -N; iy <= N; iy++)
      for (let ix = -N; ix <= N; ix++) if (!blocked(ix, iy)) cells.push({ ix, iy, score: Math.hypot((ix * cellW) / halfW, (iy * cellH) / halfH) });
    cells.sort((a, b) => a.score - b.score);
    const used = new Set<string>();
    const free = (ix: number, iy: number) => !used.has(`${ix},${iy}`) && !blocked(ix, iy);
    const rng = new Rng(7 + i * 13);
    let ex = 0;
    let ey = 0;
    images.forEach((painting, order) => {
      const ar = painting.width / painting.height;
      const wide = ar > 1.15;
      const cell = cells.find((c) => free(c.ix, c.iy) && (!wide || free(c.ix + 1, c.iy)));
      if (!cell) return;
      used.add(`${cell.ix},${cell.iy}`);
      if (wide) used.add(`${cell.ix + 1},${cell.iy}`);
      const bw = wide ? 2 * cellW - gap : boxW;
      const x = cell.ix * cellW + (wide ? cellW / 2 : 0);
      const y = cell.iy * cellH;
      // 卡面单位：竖幅宽 1，横幅按占的格子加宽，这样所有卡缩放一致、标题字号一致；插画按原比例，底下一条标题条
      const w = wide ? bw / boxW : 1;
      const h = (w - BORDER * 2) / ar + BORDER * 2 + STRIP;
      const scale = Math.min(bw / w, boxH / h);
      ex = Math.max(ex, Math.abs(x) + (w * scale) / 2);
      ey = Math.max(ey, Math.abs(y) + (h * scale) / 2);
      const label = labelTexture(painting.title, w);
      const card = createHoloCard(`/assets/images/portrait-thumbs/${painting.id}.jpg`, g.tint, this.anisotropy, { width: w, height: h, strip: STRIP, label });
      const mat = card.mesh.material;
      mat.transparent = true;
      mat.depthTest = false;
      mat.depthWrite = false;
      card.uniforms.uAlpha.value = 0;
      card.mesh.renderOrder = 30;
      card.mesh.visible = false;
      card.mesh.castShadow = false;
      this.scene.add(card.mesh);
      // 从外侧、更深处飞来
      const dir = new THREE.Vector2(x / halfW, y / halfH);
      if (dir.lengthSq() < 1e-6) dir.set(0, 1);
      dir.normalize();
      const depth = D + (rng.next() - 0.5) * 0.7;
      const tile: Tile = {
        card,
        label,
        painting,
        index: g.images.indexOf(painting),
        home: new THREE.Vector3(x, y, depth),
        from: new THREE.Vector3(x + dir.x * halfW * 0.9, y + dir.y * halfH * 0.9, depth + 4),
        rotZ: (rng.next() - 0.5) * 0.05,
        fromRot: (rng.next() - 0.5) * 0.9,
        w,
        h,
        scale,
        t: new Tween(0),
        hot: 0,
        tilt: new THREE.Vector2(),
      };
      // 先等卡片抬起一半，再由内向外依次飞入
      if (animate) window.setTimeout(() => this.tiles.includes(tile) && tile.t.go(1, 1.1, easeOut), 280 + order * 34);
      else tile.t.set(1);
      this.tiles.push(tile);
    });
    // 能平移多远：让最外圈的卡能完整露出来
    this.pan.set(Math.max(0, ex - halfW * 0.94), Math.max(0, ey - halfH * 0.9));
  }

  /** 基准镜头（不含视差偏移）坐标系里的一点 → 世界坐标 */
  private inBase(x: number, y: number, depth: number, out: THREE.Vector3) {
    this.baseCam.updateMatrixWorld();
    return out.set(x, y, -depth).applyMatrix4(this.baseCam.matrixWorld);
  }

  private updateBaseCamera(enter: number) {
    const dist = this.narrow ? 12 : 12.6;
    this.baseCam.position.set(0, dist * 0.74 + enter * 2.5, dist * 0.67 + enter * 1.2);
    this.look.set(0, 0, this.narrow ? -1 : -1.05);
    this.baseCam.lookAt(this.look);
    this.baseCam.updateMatrixWorld();
  }

  /* ---------------- 拾取 ---------------- */

  private ndc(x: number, y: number) {
    return new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
  }

  private pick(x: number, y: number): Target {
    if (!this.cards.length || x < 0) return null;
    this.ray.setFromCamera(this.ndc(x, y), this.camera);
    if (this.held >= 0) {
      const heldHit = this.ray.intersectObject(this.cards[this.held].card.mesh);
      if (heldHit.length) return { kind: "card", i: this.held };
      // 画作关了深度测试：按绘制顺序（近层在上）取第一张
      let best = -1;
      let order = -1;
      this.tiles.forEach((tile, k) => {
        if (tile.t.value < 0.6) return;
        if (tile.card.mesh.renderOrder > order && this.ray.intersectObject(tile.card.mesh).length) {
          order = tile.card.mesh.renderOrder;
          best = k;
        }
      });
      return best >= 0 ? { kind: "tile", i: best } : null;
    }
    const hits = this.ray.intersectObjects(this.cards.map((c) => c.card.mesh));
    if (!hits.length) return null;
    return { kind: "card", i: this.cards.findIndex((c) => c.card.mesh === hits[0].object) };
  }

  /* ---------------- 每帧 ---------------- */

  update(f: StageFrame, pr: StagePresence) {
    const dt = f.delta;
    this.time += dt;
    this.active = pr.active;
    const cam = this.camera;
    const enter = pr.role === 1 ? 1 - easeOut(pr.morph) : 0;
    this.updateBaseCamera(enter);

    // 视差：拿起时镜头随指针在自己的平面里平移，近处的卡片比远处的画作移得多
    const px = f.pointerInside && this.pointer.x >= 0 ? (this.pointer.x / this.width) * 2 - 1 : 0;
    const py = f.pointerInside && this.pointer.y >= 0 ? -(this.pointer.y / this.height) * 2 + 1 : 0;
    const amp = this.held >= 0 ? 0.42 : 0.22;
    this.offset.set(damp(this.offset.x, px * amp, 3.2, dt), damp(this.offset.y, py * amp * 0.7, 3.2, dt));
    this.right.setFromMatrixColumn(this.baseCam.matrixWorld, 0);
    this.up.setFromMatrixColumn(this.baseCam.matrixWorld, 1);
    this.fwd.set(0, 0, -1).applyQuaternion(this.baseCam.quaternion);
    cam.position.copy(this.baseCam.position).addScaledVector(this.right, this.offset.x).addScaledVector(this.up, this.offset.y);
    cam.quaternion.copy(this.baseCam.quaternion);
    cam.updateMatrixWorld();

    // 悬停
    const target = this.active && f.pointerInside ? this.pick(this.pointer.x, this.pointer.y) : null;
    const changed = (target?.kind ?? "") + (target?.i ?? "") !== (this.target?.kind ?? "") + (this.target?.i ?? "");
    this.target = target;

    // 薄雾
    const heldAmt = this.held >= 0 ? 1 : 0;
    this.veilAmt = damp(this.veilAmt, heldAmt, 4, dt);
    this.veil.visible = this.veilAmt > 0.002;
    if (this.veil.visible) {
      const d = 8.4;
      const hh = d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 2.4;
      this.inBase(0, 0, d, this.veil.position);
      this.veil.quaternion.copy(this.baseCam.quaternion);
      this.veil.scale.set(hh * cam.aspect, hh, 1);
      // 正对镜头时只轻轻压一下背景：天空仍然看得见
      this.veil.material.opacity = this.veilAmt * (this.flat ? 0.22 : 0.84);
    }

    // 平移：指针越靠近边缘，画作平面朝反方向移得越多（中间一圈不动，免得一动鼠标整片都晃）
    const shape = (v: number) => Math.sign(v) * THREE.MathUtils.smoothstep(Math.abs(v), 0.12, 0.92);
    const live = this.held >= 0 && this.active;
    this.drift.set(
      damp(this.drift.x, live ? -shape(px) * this.pan.x : 0, 2.6, dt),
      damp(this.drift.y, live ? -shape(py) * this.pan.y : 0, 2.6, dt),
    );

    // 卡片
    const front = this.inBase(this.drift.x * 0.3, (this.narrow ? 0.35 : 0.05) + this.drift.y * 0.3, this.narrow ? HOLD_DEPTH + 1 : HOLD_DEPTH, this.v2);
    this.cards.forEach((c, i) => {
      const m = c.card.mesh;
      const hovered = target?.kind === "card" && target.i === i;
      c.hold.step(dt);
      const hold = c.hold.value;
      c.lift = damp(c.lift, hovered && this.held < 0 ? 1 : 0, 9, dt);
      // 倾斜目标：指针相对卡片中心的位置
      let tx = 0;
      let ty = 0;
      if (hovered && this.pointer.x >= 0) {
        this.v.copy(m.position).project(cam);
        const n = this.ndc(this.pointer.x, this.pointer.y);
        const reach = hold > 0.5 ? 0.45 : 0.35;
        tx = clamp((n.x - this.v.x) / reach, -1, 1);
        ty = clamp((n.y - this.v.y) / reach, -1, 1);
      }
      c.tilt.set(damp(c.tilt.x, tx, 7, dt), damp(c.tilt.y, ty, 7, dt));

      // 桌面上的姿态
      this.v.copy(c.slot.position);
      if (this.flat) this.v.addScaledVector(this.fwd, -c.lift * 0.9);
      else this.v.y += c.lift * 0.32;
      this.e.copy(c.slot.rotation);
      if (this.flat) {
        // 正对镜头：只在悬停时随指针轻轻偏一点
        this.q.copy(c.slot.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-c.tilt.y * 0.16 * c.lift, c.tilt.x * 0.22 * c.lift, 0)));
      } else {
        this.e.x += c.tilt.y * 0.22 * c.lift;
        this.e.y += c.tilt.x * 0.28 * c.lift;
        this.q.setFromEuler(this.e);
      }
      // 拿起：沿一条上扬的弧线到面前，正对镜头
      if (hold > 0.0001) {
        const face = this.baseCam.quaternion.clone();
        const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-c.tilt.y * 0.16 * hold, c.tilt.x * 0.22 * hold, 0));
        face.multiply(tiltQ);
        this.v.lerp(front, hold);
        this.v.y += Math.sin(Math.PI * hold) * 0.7;
        this.q.slerp(face, hold);
      }
      m.position.copy(this.v);
      m.quaternion.copy(this.q);
      m.scale.setScalar((this.narrow ? 1.05 : 1.2) * lerp(1, HOLD_SCALE, hold));
      m.renderOrder = hold > 0.01 ? 50 : i;
      m.material.depthTest = hold < 0.01;

      const u = c.card.uniforms;
      u.uTime.value = this.time;
      u.uHolo.value = damp(u.uHolo.value, this.holo ? lerp(0.3, 0.95, Math.max(c.lift, hovered ? 1 : 0)) : 0, 6, dt);
      u.uGlare.value.set(0.5 + c.tilt.x * 0.4, 0.5 + c.tilt.y * 0.4);
      u.uGlareAmt.value = damp(u.uGlareAmt.value, (hovered ? 1 : hold * 0.35) * (this.holo ? 1 : 0.55), 6, dt);
      u.uDim.value = damp(u.uDim.value, this.held >= 0 && this.held !== i ? 0.35 : 0, 5, dt);
      // 正对镜头时其余角色卡与画作在同一视野里：拿起一张后其余的淡出，免得在画作缝隙里留下残影
      if (this.flat) {
        u.uAlpha.value = damp(u.uAlpha.value, this.held >= 0 && this.held !== i ? 0 : 1, 6, dt);
        m.visible = u.uAlpha.value > 0.01;
      }
    });

    // 画作
    const hotTile = target?.kind === "tile" ? target.i : -1;
    this.tiles.forEach((tile, k) => this.placeTile(tile, dt, k === hotTile));
    this.syncName(target);
    for (let k = this.leaving.length - 1; k >= 0; k--) {
      const tile = this.leaving[k];
      this.placeTile(tile, dt, false);
      if (!tile.t.running && tile.t.value <= 0.001) {
        this.disposeTile(tile);
        this.leaving.splice(k, 1);
      }
    }

    this.syncFrame(target, changed);
  }

  private placeTile(tile: Tile, dt: number, hot: boolean) {
    tile.t.step(dt);
    const t = tile.t.value;
    tile.hot = damp(tile.hot, hot ? 1 : 0, 10, dt);
    const m = tile.card.mesh;
    // 位置：基准镜头坐标里插值，加上平移；悬停时朝镜头浮起
    const x = lerp(tile.from.x, tile.home.x, t) + this.drift.x;
    const y = lerp(tile.from.y, tile.home.y, t) + this.drift.y;
    const d = lerp(tile.from.z, tile.home.z, t) - tile.hot * 0.7;
    this.inBase(x, y, d, m.position);
    // 倾斜：只在指针落在这张卡上时
    let tx = 0;
    let ty = 0;
    if (hot && this.pointer.x >= 0) {
      this.v.copy(m.position).project(this.camera);
      const n = this.ndc(this.pointer.x, this.pointer.y);
      const tanH = d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const hw = (tile.w * tile.scale) / (2 * tanH * this.camera.aspect);
      const hh = (tile.h * tile.scale) / (2 * tanH);
      tx = clamp((n.x - this.v.x) / Math.max(0.02, hw), -1, 1);
      ty = clamp((n.y - this.v.y) / Math.max(0.02, hh), -1, 1);
    }
    tile.tilt.set(damp(tile.tilt.x, tx, 8, dt), damp(tile.tilt.y, ty, 8, dt));
    m.quaternion.copy(this.baseCam.quaternion);
    m.rotateZ(lerp(tile.fromRot, tile.rotZ, t) * (1 - tile.hot));
    m.rotateX(-tile.tilt.y * 0.2 * tile.hot);
    m.rotateY(tile.tilt.x * 0.26 * tile.hot);
    m.scale.setScalar(tile.scale * (1 + tile.hot * 0.06));
    const alpha = clamp(t * 1.6);
    m.visible = alpha > 0.002;
    m.renderOrder = tile.hot > 0.5 ? 45 : 30;
    const u = tile.card.uniforms;
    u.uAlpha.value = alpha;
    u.uTime.value = this.time;
    u.uHolo.value = damp(u.uHolo.value, this.holo ? lerp(0.3, 0.95, tile.hot) : 0, 6, dt);
    u.uGlare.value.set(0.5 + tile.tilt.x * 0.4, 0.5 + tile.tilt.y * 0.4);
    u.uGlareAmt.value = tile.hot * (this.holo ? 1 : 0.55);
  }

  /** 只有卡片时：悬停的角色名显示在右下角；拿起之后不显示 */
  private syncName(target: Target) {
    const el = this.nameEl;
    if (!el) return;
    const i = this.held < 0 && this.active && target?.kind === "card" ? target.i : -1;
    if (i === this.nameIdx) return;
    this.nameIdx = i;
    if (i >= 0) {
      const g = this.groups[i];
      el.style.setProperty("--pt-tint", g.tint);
      const name = el.querySelector("strong");
      const meta = el.querySelector("span");
      if (name) name.textContent = g.group;
      if (meta) meta.textContent = `${String(g.images.length).padStart(2, "0")} PORTRAITS`;
    }
    el.classList.toggle("is-on", i >= 0);
  }

  /** 把光标的四角框贴到当前悬停对象在屏幕上的外接矩形 */
  private syncFrame(target: Target, changed: boolean) {
    const el = this.frameEl;
    if (!el) return;
    let key = "";
    if (target) {
      const tile = target.kind === "tile" ? this.tiles[target.i] : null;
      const obj = tile ? tile.card.mesh : this.cards[target.i].card.mesh;
      const hw = tile ? tile.w / 2 : CARD_W / 2;
      const hh = tile ? tile.h / 2 : CARD_H / 2;
      obj.updateMatrixWorld();
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        this.v.set(sx * hw, sy * hh, 0).applyMatrix4(obj.matrixWorld).project(this.camera);
        const x = (this.v.x * 0.5 + 0.5) * this.width;
        const y = (-this.v.y * 0.5 + 0.5) * this.height;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      key = `${Math.round(x0)},${Math.round(y0)},${Math.round(x1 - x0)},${Math.round(y1 - y0)}`;
      if (key !== this.frameKey) {
        el.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
        el.style.width = `${(x1 - x0).toFixed(1)}px`;
        el.style.height = `${(y1 - y0).toFixed(1)}px`;
      }
    }
    el.hidden = !target;
    const hitMode = this.held >= 0 ? "CLOSE" : "";
    if ((this.hit.dataset.cursor ?? "") !== hitMode) {
      if (hitMode) this.hit.dataset.cursor = hitMode;
      else delete this.hit.dataset.cursor;
      changed = true;
    }
    if (changed) document.dispatchEvent(new CustomEvent("kb:cursor-refresh"));
    else if (key && key !== this.frameKey) document.dispatchEvent(new CustomEvent("kb:cursor-frame"));
    this.frameKey = key;
  }

  sample(count: number, out: SampleBuffers) {
    const rng = new Rng(53);
    const c = new THREE.Color();
    const paper = new THREE.Color("#efe7da");
    this.scene.updateMatrixWorld(true);
    const images = this.cards.map((card) => cardPixels(card.card, 40));
    for (let i = 0; i < count; i++) {
      const p = this.v;
      if (this.cards.length && rng.next() < 0.8) {
        const ci = Math.floor(rng.next() * this.cards.length);
        const card = this.cards[ci];
        const img = images[ci];
        const u = rng.next();
        const w = rng.next();
        if (img) {
          const px = Math.min(img.width - 1, Math.floor(u * img.width));
          const py = Math.min(img.height - 1, Math.floor(w * img.height));
          const o = (py * img.width + px) * 4;
          c.setRGB(img.data[o] / 255, img.data[o + 1] / 255, img.data[o + 2] / 255, THREE.SRGBColorSpace);
        } else c.copy(this.groups[ci] ? new THREE.Color(this.groups[ci].tint) : paper);
        p.set((u - 0.5) * CARD_W, (0.5 - w) * CARD_H, 0.002).applyMatrix4(card.card.mesh.matrixWorld);
      } else {
        p.set(rng.range(-6, 6), 0.001, rng.range(-3, 3));
        c.copy(paper);
      }
      out.pos[i * 3] = p.x;
      out.pos[i * 3 + 1] = p.y;
      out.pos[i * 3 + 2] = p.z;
      out.col[i * 3] = c.r;
      out.col[i * 3 + 1] = c.g;
      out.col[i * 3 + 2] = c.b;
      out.size[i] = 1.8 + rng.next() * 1.4;
    }
  }

  dispose() {}
}
