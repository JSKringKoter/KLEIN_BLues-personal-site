// 世界观入口的线稿：在构建时把三维的战机块、晶体与晶环投影成 SVG 路径（纯静态，没有动画零件）。
import * as THREE from "three";
import { buildPieces } from "./jet";

const f = (n: number) => n.toFixed(1);

function project(camera: THREE.PerspectiveCamera, p: THREE.Vector3, w: number, h: number) {
  const v = p.clone().project(camera);
  return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h] as const;
}

/** 核心战机：每个金属块的棱，外加核心的小晶体。返回 viewBox 为 w×h 的 path d */
export function jetLinework(w = 600, h = 420) {
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  camera.position.set(0, 0.35, 6.2);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const group = new THREE.Matrix4().compose(
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.62, -0.72, 0.08, "YXZ")),
    new THREE.Vector3(1.05, 1.05, 1.05),
  );
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const src = edges.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  type Seg = [number, number, number, number];
  const main: Seg[] = [];
  const accent: Seg[] = [];
  for (const piece of buildPieces()) {
    const out = piece.mat === "accent" || piece.mat === "glass" ? accent : main;
    for (let i = 0; i < src.count; i += 2) {
      v.fromBufferAttribute(src, i).applyMatrix4(piece.home).applyMatrix4(group);
      const [x0, y0] = project(camera, v, w, h);
      v.fromBufferAttribute(src, i + 1).applyMatrix4(piece.home).applyMatrix4(group);
      const [x1, y1] = project(camera, v, w, h);
      out.push([x0, y0, x1, y1]);
    }
  }
  // 核心：拉长的八面体
  const core = new THREE.OctahedronGeometry(0.1, 0);
  const ce = new THREE.EdgesGeometry(core);
  const cp = ce.getAttribute("position") as THREE.BufferAttribute;
  const cm = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.05, -0.2), new THREE.Quaternion(), new THREE.Vector3(1.4, 2.2, 1.4));
  const coreLines: Seg[] = [];
  for (let i = 0; i < cp.count; i += 2) {
    v.fromBufferAttribute(cp, i).applyMatrix4(cm).applyMatrix4(group);
    const [x0, y0] = project(camera, v, w, h);
    v.fromBufferAttribute(cp, i + 1).applyMatrix4(cm).applyMatrix4(group);
    const [x1, y1] = project(camera, v, w, h);
    coreLines.push([x0, y0, x1, y1]);
  }
  // 把整架战机的外接框挪到画面中央偏下，让它落在底部的图纸上
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [a, b, c, d] of [...main, ...accent]) {
    x0 = Math.min(x0, a, c);
    x1 = Math.max(x1, a, c);
    y0 = Math.min(y0, b, d);
    y1 = Math.max(y1, b, d);
  }
  const dx = w / 2 - (x0 + x1) / 2;
  const dy = h * 0.56 - (y0 + y1) / 2;
  const path = (segs: Seg[]) => segs.map(([a, b, c, d]) => `M${f(a + dx)} ${f(b + dy)}L${f(c + dx)} ${f(d + dy)}`).join("");
  return { main: path(main), accent: path(accent), core: path(coreLines) };
}

/** 椭圆弧：分成前半（靠近观者，实线）与后半（虚线） */
function ringArcs(cx: number, cy: number, rx: number, ry: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const x0 = cx - rx * Math.cos(a);
  const y0 = cy - rx * Math.sin(a);
  const x1 = cx + rx * Math.cos(a);
  const y1 = cy + rx * Math.sin(a);
  return {
    front: `M${f(x0)} ${f(y0)}A${rx} ${ry} ${deg} 0 0 ${f(x1)} ${f(y1)}`,
    back: `M${f(x0)} ${f(y0)}A${rx} ${ry} ${deg} 0 1 ${f(x1)} ${f(y1)}`,
  };
}

/** 苍穹：中心一颗六棱双锥晶体，周围两道晶环 */
export function coreLinework(w = 600, h = 420) {
  const cx = w / 2;
  const cy = h * 0.5;
  const top = cy - h * 0.36;
  const bottom = cy + h * 0.38;
  const eqY = cy - h * 0.02;
  const R = w * 0.15;
  const r = R * 0.26;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const t = (i / 6) * Math.PI * 2 + 0.26;
    return { x: cx + Math.cos(t) * R, y: eqY + Math.sin(t) * r, front: Math.sin(t) > -0.05 };
  });
  const front: string[] = [];
  const back: string[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % 6];
    const d = `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`;
    (p.front && q.front ? front : back).push(d);
    const spokes = `M${f(cx)} ${f(top)}L${f(p.x)} ${f(p.y)}L${f(cx)} ${f(bottom)}`;
    (p.front ? front : back).push(spokes);
  });
  // 内部的一道折光线，让晶体有体积
  const inner = `M${f(cx)} ${f(top + (eqY - top) * 0.35)}L${f(cx - R * 0.42)} ${f(eqY)}L${f(cx)} ${f(bottom - (bottom - eqY) * 0.3)}L${f(cx + R * 0.42)} ${f(eqY)}Z`;
  return {
    viewBox: `0 0 ${w} ${h}`,
    center: { x: cx, y: eqY },
    front: front.join(""),
    back: back.join(""),
    inner,
    rings: [ringArcs(cx, eqY, w * 0.34, h * 0.1, -7), ringArcs(cx, eqY, w * 0.42, h * 0.16, 9)],
    axis: `M${f(cx)} ${f(top - h * 0.06)}L${f(cx)} ${f(bottom + h * 0.05)}`,
  };
}
