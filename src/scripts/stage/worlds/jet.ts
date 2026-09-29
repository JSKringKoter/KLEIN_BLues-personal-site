// 核心战机：由许多金属块借核心的引力连接而成（见《苍穹》设定「结构展开」）。
// assemble = 0：金属块散落在核心周围缓慢公转，只剩蓝图线稿；assemble = 1：金属块归位，展开成实体。
import * as THREE from "three";
import { Rng, clamp, easeInOut } from "../core";

interface Block {
  c: [number, number, number];
  s: [number, number, number];
  r?: [number, number, number];
  /** 沿最长轴切成几块 */
  split?: number;
  mat?: "hull" | "dark" | "glass" | "accent";
  part: JetPart;
}

export type JetPart = "fuselage" | "canopy" | "engine" | "wing" | "canard" | "fin" | "intake";
export const PART_LABELS: Record<JetPart, string> = {
  fuselage: "机身",
  canopy: "座舱",
  engine: "引擎",
  wing: "主翼",
  canard: "鸭翼",
  fin: "垂尾",
  intake: "进气道",
};

// 机头朝 -z
const BLOCKS: Block[] = [
  { c: [0, 0.02, -1.62], s: [0.16, 0.13, 0.44], split: 2, part: "fuselage" },
  { c: [0, 0.03, -1.12], s: [0.28, 0.21, 0.58], split: 3, part: "fuselage" },
  { c: [0, 0.16, -1.02], s: [0.17, 0.1, 0.44], mat: "glass", part: "canopy" },
  { c: [0, 0.02, -0.38], s: [0.42, 0.27, 0.86], split: 3, part: "fuselage" },
  { c: [0, 0.02, 0.4], s: [0.48, 0.29, 0.72], split: 3, part: "fuselage" },
  { c: [-0.17, -0.02, 0.98], s: [0.21, 0.21, 0.58], split: 2, mat: "dark", part: "engine" },
  { c: [0.17, -0.02, 0.98], s: [0.21, 0.21, 0.58], split: 2, mat: "dark", part: "engine" },
  { c: [-0.17, -0.02, 1.34], s: [0.16, 0.16, 0.14], mat: "accent", part: "engine" },
  { c: [0.17, -0.02, 1.34], s: [0.16, 0.16, 0.14], mat: "accent", part: "engine" },
  // 主翼
  { c: [-0.58, -0.01, 0.2], s: [0.62, 0.04, 0.56], r: [0, 0.36, 0], split: 3, part: "wing" },
  { c: [0.58, -0.01, 0.2], s: [0.62, 0.04, 0.56], r: [0, -0.36, 0], split: 3, part: "wing" },
  { c: [-1.02, -0.01, 0.46], s: [0.42, 0.035, 0.36], r: [0, 0.42, 0], split: 2, part: "wing" },
  { c: [1.02, -0.01, 0.46], s: [0.42, 0.035, 0.36], r: [0, -0.42, 0], split: 2, part: "wing" },
  { c: [-1.3, -0.01, 0.6], s: [0.2, 0.03, 0.2], r: [0, 0.45, 0], mat: "accent", part: "wing" },
  { c: [1.3, -0.01, 0.6], s: [0.2, 0.03, 0.2], r: [0, -0.45, 0], mat: "accent", part: "wing" },
  // 鸭翼
  { c: [-0.3, 0.03, -0.9], s: [0.32, 0.028, 0.17], r: [0, 0.3, 0], part: "canard" },
  { c: [0.3, 0.03, -0.9], s: [0.32, 0.028, 0.17], r: [0, -0.3, 0], part: "canard" },
  // 垂尾
  { c: [-0.2, 0.3, 0.84], s: [0.03, 0.4, 0.36], r: [0, 0, 0.26], split: 2, part: "fin" },
  { c: [0.2, 0.3, 0.84], s: [0.03, 0.4, 0.36], r: [0, 0, -0.26], split: 2, part: "fin" },
  // 进气道
  { c: [-0.27, -0.06, -0.4], s: [0.12, 0.16, 0.6], split: 2, mat: "dark", part: "intake" },
  { c: [0.27, -0.06, -0.4], s: [0.12, 0.16, 0.6], split: 2, mat: "dark", part: "intake" },
];

export interface Piece {
  home: THREE.Matrix4;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
  away: THREE.Vector3;
  awayQuat: THREE.Quaternion;
  delay: number;
  mat: NonNullable<Block["mat"]>;
  orbit: number;
  part: JetPart;
}

export function buildPieces(seed = 5): Piece[] {
  const rng = new Rng(seed);
  const pieces: Piece[] = [];
  const e = new THREE.Euler();
  for (const b of BLOCKS) {
    const n = b.split ?? 1;
    const axis = b.s[2] >= b.s[0] ? 2 : 0;
    const q = new THREE.Quaternion().setFromEuler(e.set(...(b.r ?? [0, 0, 0])));
    for (let i = 0; i < n; i++) {
      const s = new THREE.Vector3(...b.s);
      const len = s.getComponent(axis);
      s.setComponent(axis, len / n - 0.012);
      const off = new THREE.Vector3();
      off.setComponent(axis, -len / 2 + (len / n) * (i + 0.5));
      off.applyQuaternion(q);
      const pos = new THREE.Vector3(...b.c).add(off);
      const home = new THREE.Matrix4().compose(pos, q, s);
      // 散开：沿离开核心的方向推出，并加上一点上扬
      const dir = pos.clone().setY(pos.y * 2 + 0.3).normalize();
      if (dir.lengthSq() < 0.01) dir.set(rng.range(-1, 1), 1, rng.range(-1, 1)).normalize();
      const away = pos.clone().addScaledVector(dir, 0.7 + rng.next() * 0.9);
      away.y += rng.gauss() * 0.25;
      const awayQuat = new THREE.Quaternion().setFromEuler(e.set(rng.gauss(), rng.gauss(), rng.gauss()));
      pieces.push({
        home,
        pos,
        quat: q.clone(),
        scale: s,
        away,
        awayQuat,
        delay: clamp(0.55 - pos.length() * 0.18 + rng.next() * 0.25, 0, 0.6),
        mat: b.mat ?? "hull",
        orbit: rng.range(0.6, 1.4),
        part: b.part,
      });
    }
  }
  return pieces;
}

export interface JetOptions {
  hull?: string;
  dark?: string;
  accent?: string;
  line?: string;
  core?: string;
}

export class Jet {
  readonly group = new THREE.Group();
  readonly pieces: Piece[];
  readonly lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  readonly core: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  private readonly meshes: Record<Piece["mat"], THREE.InstancedMesh>;
  private readonly index: { mat: Piece["mat"]; i: number }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly rot = new THREE.Quaternion();
  private readonly Y = new THREE.Vector3(0, 1, 0);
  private readonly dir = new THREE.Vector3();
  assemble = 0;
  /** 0..1：线稿的可见程度 */
  wire = 1;
  /** 当前被「局部展开」的部件 */
  focus: JetPart | null = null;
  private readonly focusAmt = new Map<JetPart, number>();

  constructor(opts: JetOptions = {}) {
    this.pieces = buildPieces();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mats: Record<Piece["mat"], THREE.Material> = {
      hull: new THREE.MeshStandardMaterial({ color: opts.hull ?? "#e9edf5", roughness: 0.42, metalness: 0.35, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: opts.dark ?? "#9aa6bf", roughness: 0.5, metalness: 0.4, flatShading: true }),
      glass: new THREE.MeshStandardMaterial({ color: "#f3c872", roughness: 0.2, metalness: 0.1, emissive: "#d99a2b", emissiveIntensity: 0.35 }),
      accent: new THREE.MeshStandardMaterial({ color: opts.accent ?? "#1746d1", roughness: 0.35, metalness: 0.3, flatShading: true }),
    };
    const counts: Record<Piece["mat"], number> = { hull: 0, dark: 0, glass: 0, accent: 0 };
    this.pieces.forEach((p) => {
      this.index.push({ mat: p.mat, i: counts[p.mat]++ });
    });
    this.meshes = Object.fromEntries(
      (Object.keys(mats) as Piece["mat"][]).map((k) => {
        const mesh = new THREE.InstancedMesh(box, mats[k], Math.max(1, counts[k]));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(mesh);
        return [k, mesh];
      }),
    ) as unknown as Record<Piece["mat"], THREE.InstancedMesh>;

    // 蓝图线稿：每块的棱
    const edges = new THREE.EdgesGeometry(box);
    const src = edges.getAttribute("position") as THREE.BufferAttribute;
    const out: number[] = [];
    const v = new THREE.Vector3();
    for (const p of this.pieces) {
      for (let i = 0; i < src.count; i++) {
        v.fromBufferAttribute(src, i).applyMatrix4(p.home);
        out.push(v.x, v.y, v.z);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: opts.line ?? "#1746d1", transparent: true, opacity: 0.75, depthWrite: false }));
    this.lines.renderOrder = 3;
    this.group.add(this.lines);

    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 0),
      new THREE.MeshStandardMaterial({ color: opts.core ?? "#f2b64a", emissive: "#d99a2b", emissiveIntensity: 0.9, roughness: 0.25, flatShading: true }),
    );
    this.core.position.set(0, 0.05, -0.2);
    this.core.scale.set(1, 1.6, 1);
    this.group.add(this.core);
  }

  update(time: number, dt = 0.016) {
    const a = this.assemble;
    for (const part of Object.keys(PART_LABELS) as JetPart[]) {
      const cur = this.focusAmt.get(part) ?? 0;
      const want = this.focus === part ? 1 : 0;
      this.focusAmt.set(part, cur + (want - cur) * (1 - Math.exp(-dt * 7)));
    }
    this.pieces.forEach((pc, k) => {
      const t = clamp((a - pc.delay * 0.6) / 0.6);
      const e = easeInOut(t);
      const fo = this.focusAmt.get(pc.part) ?? 0;
      // 散开时绕核心缓慢公转
      const ang = time * 0.25 * pc.orbit;
      this.rot.setFromAxisAngle(this.Y, ang * (1 - e));
      this.p.copy(pc.away).sub(this.core.position).applyQuaternion(this.rot).add(this.core.position);
      this.p.lerp(pc.pos, e);
      if (fo > 0.001) {
        // 局部展开：沿离开核心的方向推出一点并抬起
        this.dir.copy(pc.pos).sub(this.core.position).setY(0).normalize();
        this.p.addScaledVector(this.dir, fo * 0.16 * e);
        this.p.y += fo * 0.14 * e;
      }
      this.q.copy(pc.awayQuat).slerp(pc.quat, e);
      const shrink = 0.35 + 0.65 * e;
      this.s.copy(pc.scale).multiplyScalar(shrink);
      this.m.compose(this.p, this.q, this.s);
      const { mat, i } = this.index[k];
      this.meshes[mat].setMatrixAt(i, this.m);
    });
    for (const m of Object.values(this.meshes)) m.instanceMatrix.needsUpdate = true;
    this.lines.material.opacity = 0.75 * this.wire * (1 - a * 0.65);
    this.core.rotation.y = time * 0.9;
    const glow = 0.9 + Math.sin(time * 2.2) * 0.25;
    this.core.material.emissiveIntensity = glow * (1.2 - a * 0.5);
  }

  /** 当前每块的世界坐标（形变采样用） */
  piecePositions(out: THREE.Vector3[]) {
    this.group.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    this.pieces.forEach((_pc, k) => {
      const { mat, i } = this.index[k];
      this.meshes[mat].getMatrixAt(i, this.m);
      p.setFromMatrixPosition(this.m).applyMatrix4(this.group.matrixWorld);
      out.push(p.clone());
    });
    return out;
  }

  colorOf(k: number) {
    const mat = this.pieces[k].mat;
    return (this.meshes[mat].material as THREE.MeshStandardMaterial).color;
  }
}

/** 白图纸：浅色纸面上的克莱因蓝网格与标注 */
export function blueprintTexture(width = 1400, height = 1000, title = "KB-01  核心战机") {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#eef2fb";
  ctx.fillRect(0, 0, width, height);
  const blue = "23, 70, 209";
  for (let x = 0; x <= width; x += 20) {
    ctx.fillStyle = `rgba(${blue}, ${x % 100 === 0 ? 0.16 : 0.06})`;
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y <= height; y += 20) {
    ctx.fillStyle = `rgba(${blue}, ${y % 100 === 0 ? 0.16 : 0.06})`;
    ctx.fillRect(0, y, width, 1);
  }
  ctx.strokeStyle = `rgba(${blue}, 0.7)`;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, width - 48, height - 48);
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, width - 72, height - 72);
  // 标题栏
  const tw = 420;
  const th = 120;
  ctx.fillStyle = "rgba(238, 242, 251, 0.95)";
  ctx.fillRect(width - 36 - tw, height - 36 - th, tw, th);
  ctx.strokeRect(width - 36 - tw, height - 36 - th, tw, th);
  ctx.beginPath();
  ctx.moveTo(width - 36 - tw, height - 36 - th / 2);
  ctx.lineTo(width - 36, height - 36 - th / 2);
  ctx.moveTo(width - 36 - tw + 140, height - 36 - th / 2);
  ctx.lineTo(width - 36 - tw + 140, height - 36);
  ctx.stroke();
  ctx.fillStyle = `rgba(${blue}, 0.95)`;
  ctx.font = `600 26px "Noto Serif SC", "Songti SC", SimSun, serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(title, width - 36 - tw + 18, height - 36 - th * 0.75);
  ctx.font = `400 16px Consolas, "JetBrains Mono", monospace`;
  ctx.fillText("SCALE 1:48", width - 36 - tw + 18, height - 36 - th * 0.25);
  ctx.fillText("CONSTRUCTIVE EXPANSION · ORIGINATE CORE", width - 36 - tw + 156, height - 36 - th * 0.25);
  // 尺寸线
  ctx.strokeStyle = `rgba(${blue}, 0.55)`;
  const dim = (x0: number, y0: number, x1: number, y1: number, label: string) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (const [x, y, s] of [
      [x0, y0, 1],
      [x1, y1, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s * 10 * Math.cos(ang - 0.35), y + s * 10 * Math.sin(ang - 0.35));
      ctx.moveTo(x, y);
      ctx.lineTo(x + s * 10 * Math.cos(ang + 0.35), y + s * 10 * Math.sin(ang + 0.35));
      ctx.stroke();
    }
    ctx.save();
    ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
    ctx.rotate(ang);
    ctx.fillStyle = `rgba(${blue}, 0.8)`;
    ctx.font = `400 15px Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -10);
    ctx.restore();
  };
  dim(120, 110, width - 120, 110, "WINGSPAN  12.40 m");
  dim(90, 150, 90, height - 190, "LENGTH  17.20 m");
  // 注释
  ctx.font = `400 15px Consolas, monospace`;
  ctx.fillStyle = `rgba(${blue}, 0.75)`;
  const notes = ["A  源晶石核心 · 融合熔铸", "B  金属块 × 42 · 引力连接", "C  外挂记录位 · 4", "D  展开时间 < 0.8 s"];
  notes.forEach((n, i) => ctx.fillText(n, 70, height - 180 + i * 26));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
