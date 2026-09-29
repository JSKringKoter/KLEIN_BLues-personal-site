// 画中人：桌上摊开的全息角色卡（首页的独立模块，/worldbuildings/portraits/ 也用同一个类）。
// 悬停：卡片平滑抬起、随指针倾斜，光标变成贴合卡片的四角框。
// 点击：卡片被拿到面前，这个角色的其他画作从四周飞入铺满画面；指针移动时镜头随之平移，前后几层产生视差。
import * as THREE from "three";
import { Rng, Tween, clamp, damp, easeInOut, easeOut, lerp, type SampleBuffers, type StageFrame, type StageModule, type StagePresence } from "../core";
import { CARD_H, CARD_W, cardPixels, createHoloCard, type HoloCard } from "../worlds/holo";

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
  group: THREE.Group;
  image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  back: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  painting: Painting;
  index: number;
  home: THREE.Vector3;
  from: THREE.Vector3;
  rotZ: number;
  fromRot: number;
  w: number;
  h: number;
  t: Tween;
  hot: number;
  layer: number;
}

type Target = { kind: "card"; i: number } | { kind: "tile"; i: number } | null;

const TINTS = ["#1746d1", "#b0643a", "#5b7fb8", "#8a5c28", "#3f7a66", "#9a6a3a", "#6c5a8e"];
const HOLD_DEPTH = 7.2;
const HOLD_SCALE = 1.12;
const LAYERS = [
  { depth: 9.6, cols: 6, rows: 4, jitter: 0.1 },
  { depth: 13.5, cols: 7, rows: 5, jitter: 0.12 },
];

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();
function loadTexture(src: string) {
  let t = textureCache.get(src);
  if (!t) {
    t = textureLoader.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textureCache.set(src, t);
  }
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

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
    this.hit = overlay.querySelector<HTMLElement>("[data-pt-hit]") ?? overlay;
    this.frameEl = overlay.querySelector<HTMLElement>("[data-pt-frame]");
    this.holoBtn = overlay.querySelector<HTMLButtonElement>("[data-pt-holo]");
    this.heldEl = overlay.querySelector<HTMLElement>("[data-pt-held]");
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

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const narrow = width / height < 0.9;
    const changed = narrow !== this.narrow;
    this.narrow = narrow;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (changed) this.layout();
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
      const name = this.heldEl.querySelector("[data-pt-name]");
      const meta = this.heldEl.querySelector("[data-pt-meta]");
      if (name) name.textContent = g.group;
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
    document.documentElement.classList.remove("kb-hold");
    this.overlay.classList.remove("is-holding");
  }

  /** 在「拿起时」的镜头坐标系里排出一圈画作：先近层、由内向外，再远层 */
  private buildTiles(i: number, animate: boolean) {
    for (const t of this.tiles) this.scene.remove(t.group);
    this.tiles = [];
    const g = this.groups[i];
    const images = g.images.slice(1);
    if (!images.length) return;
    this.updateBaseCamera(0);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.width / this.height;
    const rng = new Rng(7 + i * 13);
    const slots: { u: number; v: number; layer: number; cw: number; ch: number; d: number }[] = [];
    // 拿起的卡片在屏幕上占的范围（归一化坐标），画作绕开它
    const holdDepth = this.narrow ? HOLD_DEPTH + 1 : HOLD_DEPTH;
    const cardHalfH = (CARD_H * HOLD_SCALE * (this.narrow ? 1.05 : 1.2)) / 2 / (holdDepth * tan) + 0.05;
    const cardHalfW = (CARD_W * HOLD_SCALE * (this.narrow ? 1.05 : 1.2)) / 2 / (holdDepth * tan * aspect) + 0.03;
    LAYERS.forEach((L, layer) => {
      const cols = this.narrow ? Math.max(3, L.cols - 3) : L.cols;
      const rows = this.narrow ? L.rows + 2 : L.rows;
      const list: typeof slots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const off = layer === 1 ? 0.5 : 0;
          const u = ((c + 0.5 + (r % 2 ? off * 0.5 : -off * 0.5)) / cols) * 2 - 1;
          const v = 1 - ((r + 0.5) / rows) * 2;
          if (Math.abs(u) - 0.4 / cols < cardHalfW && Math.abs(v) - 0.4 / rows < cardHalfH) continue;
          list.push({ u: u + (rng.next() - 0.5) * L.jitter / cols, v: v + (rng.next() - 0.5) * L.jitter / rows, layer, cw: 2 / cols, ch: 2 / rows, d: L.depth });
        }
      }
      // 先填卡片两侧，再往上下铺
      const score = (p: { u: number; v: number }) => Math.hypot(p.u * aspect * 0.75, p.v * 1.4);
      list.sort((a, b) => score(a) - score(b));
      slots.push(...list);
    });
    images.slice(0, slots.length).forEach((painting, k) => {
      const s = slots[k];
      const halfH = s.d * tan;
      const halfW = halfH * aspect;
      const boxW = s.cw * halfW * 0.8;
      const boxH = s.ch * halfH * 0.8;
      const ar = painting.width / painting.height;
      let w = boxW;
      let h = w / ar;
      if (h > boxH) {
        h = boxH;
        w = h * ar;
      }
      const home = this.inBase(s.u * halfW, s.v * halfH, s.d, new THREE.Vector3());
      // 从画面之外、更深处飞来
      const dir = new THREE.Vector2(s.u * aspect, s.v).normalize();
      const from = this.inBase((s.u + dir.x * 1.3) * halfW * 1.1, (s.v + dir.y * 1.3) * halfH * 1.1, s.d + 4, new THREE.Vector3());
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: "#fbf8f2", transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
      );
      const image = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: loadTexture(`/assets/images/portrait-thumbs/${painting.id}.jpg`), transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
      );
      const border = Math.min(w, h) * 0.045;
      back.scale.set(w + border * 2, h + border * 2, 1);
      image.scale.set(w, h, 1);
      image.position.z = 0.001;
      const group = new THREE.Group();
      group.add(back, image);
      back.renderOrder = image.renderOrder = 30 + (1 - s.layer) * 4 + (k % 2);
      this.scene.add(group);
      const t = new Tween(0);
      const tile: Tile = {
        group,
        image,
        back,
        painting,
        index: g.images.indexOf(painting),
        home,
        from,
        rotZ: (rng.next() - 0.5) * 0.12,
        fromRot: (rng.next() - 0.5) * 1.1,
        w,
        h,
        t,
        hot: 0,
        layer: s.layer,
      };
      // 先等卡片抬起一半，再由内向外依次飞入
      if (animate) window.setTimeout(() => this.tiles.includes(tile) && t.go(1, 1.15, easeOut), 280 + k * 38);
      else t.set(1);
      this.tiles.push(tile);
    });
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
        if (this.ray.intersectObject(tile.back).length && tile.back.renderOrder > order) {
          order = tile.back.renderOrder;
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
      this.veil.material.opacity = this.veilAmt * 0.84;
    }

    // 卡片
    const front = this.inBase(0, this.narrow ? 0.35 : 0.05, this.narrow ? HOLD_DEPTH + 1 : HOLD_DEPTH, this.v2);
    this.cards.forEach((c, i) => {
      const m = c.card.mesh;
      const hovered = target?.kind === "card" && target.i === i;
      c.hold.step(dt);
      const hold = c.hold.value;
      c.lift = damp(c.lift, hovered && this.held < 0 ? 1 : 0, 9, dt);
      // 倾斜目标：指针相对卡片中心的位置
      let tx = 0;
      let ty = 0;
      if ((hovered || hold > 0.5) && this.pointer.x >= 0) {
        this.v.copy(m.position).project(cam);
        const n = this.ndc(this.pointer.x, this.pointer.y);
        const reach = hold > 0.5 ? 0.9 : 0.35;
        tx = clamp((n.x - this.v.x) / reach, -1, 1);
        ty = clamp((n.y - this.v.y) / reach, -1, 1);
      }
      c.tilt.set(damp(c.tilt.x, tx, 7, dt), damp(c.tilt.y, ty, 7, dt));

      // 桌面上的姿态
      this.v.copy(c.slot.position);
      this.v.y += c.lift * 0.32;
      this.e.copy(c.slot.rotation);
      this.e.x += c.tilt.y * 0.22 * c.lift;
      this.e.y += c.tilt.x * 0.28 * c.lift;
      this.q.setFromEuler(this.e);
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
      u.uHolo.value = damp(u.uHolo.value, this.holo ? lerp(0.3, 0.95, Math.max(c.lift, hold)) : 0, 6, dt);
      u.uGlare.value.set(0.5 + c.tilt.x * 0.4, 0.5 + c.tilt.y * 0.4);
      u.uGlareAmt.value = damp(u.uGlareAmt.value, Math.max(c.lift, hold * 0.7) * (this.holo ? 1 : 0.55), 6, dt);
      u.uDim.value = damp(u.uDim.value, this.held >= 0 && this.held !== i ? 0.35 : 0, 5, dt);
    });

    // 画作
    const hotTile = target?.kind === "tile" ? target.i : -1;
    this.tiles.forEach((tile, k) => this.placeTile(tile, dt, k === hotTile));
    for (let k = this.leaving.length - 1; k >= 0; k--) {
      const tile = this.leaving[k];
      this.placeTile(tile, dt, false);
      if (!tile.t.running && tile.t.value <= 0.001) {
        this.scene.remove(tile.group);
        tile.back.geometry.dispose();
        tile.back.material.dispose();
        tile.image.geometry.dispose();
        tile.image.material.dispose();
        this.leaving.splice(k, 1);
      }
    }

    this.syncFrame(target, changed);
  }

  private placeTile(tile: Tile, dt: number, hot: boolean) {
    tile.t.step(dt);
    const t = tile.t.value;
    tile.hot = damp(tile.hot, hot ? 1 : 0, 10, dt);
    const g = tile.group;
    g.position.lerpVectors(tile.from, tile.home, t);
    // 悬停：朝镜头浮起一点
    g.position.addScaledVector(this.fwd, -tile.hot * 0.5);
    g.quaternion.copy(this.baseCam.quaternion);
    g.rotateZ(lerp(tile.fromRot, tile.rotZ, t) * (1 - tile.hot));
    g.scale.setScalar(1 + tile.hot * 0.05);
    const alpha = clamp(t * 1.6);
    tile.back.material.opacity = alpha;
    tile.image.material.opacity = alpha;
    const order = tile.hot > 0.5 ? 45 : 30 + (1 - tile.layer) * 4;
    tile.back.renderOrder = order;
    tile.image.renderOrder = order + 1;
  }

  /** 把光标的四角框贴到当前悬停对象在屏幕上的外接矩形 */
  private syncFrame(target: Target, changed: boolean) {
    const el = this.frameEl;
    if (!el) return;
    let key = "";
    if (target) {
      const obj = target.kind === "card" ? this.cards[target.i].card.mesh : this.tiles[target.i].back;
      const hw = target.kind === "card" ? CARD_W / 2 : 0.5;
      const hh = target.kind === "card" ? CARD_H / 2 : 0.5;
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
