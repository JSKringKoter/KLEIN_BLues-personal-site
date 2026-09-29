import * as THREE from 'three';
import { LAYER_R, type Hotspot } from './layouts';

export function createGuides() {
  const group = new THREE.Group();
  const guides: { obj: THREE.Line | THREE.LineSegments; stage: number; count: number; opacity: number; segments: boolean; rotate: boolean }[] = [];
  const mk = (pts: THREE.Vector3[], stage: number, opacity: number, opts: { segments?: boolean; color?: string; rotate?: boolean } = {}) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: opts.color ?? '#1b2233', transparent: true, opacity: 0, depthWrite: false });
    const obj = opts.segments ? new THREE.LineSegments(geo, mat) : new THREE.Line(geo, mat);
    obj.frustumCulled = false;
    group.add(obj);
    guides.push({ obj, stage, count: pts.length, opacity, segments: !!opts.segments, rotate: opts.rotate ?? true });
  };
  const circle = (r: number, y: number, n = 160, a0 = 0, a1 = Math.PI * 2) => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    return out;
  };
  // 场景 3：星图的坐标环
  for (const r of [4, 8, 12, 16]) mk(circle(r, -0.05, 200), 3, 0.16);
  const spokes: THREE.Vector3[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    spokes.push(new THREE.Vector3(Math.cos(a) * 2, -0.05, Math.sin(a) * 2), new THREE.Vector3(Math.cos(a) * 16.5, -0.05, Math.sin(a) * 16.5));
  }
  mk(spokes, 3, 0.08, { segments: true });
  // 场景 4：三层超膜的边界与银心之柱
  for (const y of [4.6, 0, -4.6]) mk(circle(LAYER_R + 0.9, y - 0.12, 200), 4, 0.3);
  mk([new THREE.Vector3(0, -9, 0), new THREE.Vector3(0, 9, 0)], 4, 0.5);
  // 场景 5：六块秩序核心之间的连线
  const hex: THREE.Vector3[] = [];
  for (let k = 0; k <= 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    hex.push(new THREE.Vector3(Math.sin(a) * 6.8, 0.6, Math.cos(a) * 6.8));
  }
  mk(hex, 5, 0.25);
  const star: THREE.Vector3[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const b = ((k + 2) / 6) * Math.PI * 2 + Math.PI / 6;
    star.push(new THREE.Vector3(Math.sin(a) * 6.8, 0.6, Math.cos(a) * 6.8), new THREE.Vector3(Math.sin(b) * 6.8, 0.6, Math.cos(b) * 6.8));
  }
  mk(star, 5, 0.12, { segments: true });

  function update(weights: number[], rots: number[]) {
    for (const g of guides) {
      const w = weights[g.stage];
      const mat = g.obj.material as THREE.LineBasicMaterial;
      g.obj.visible = w > 0.01;
      if (!g.obj.visible) continue;
      const grow = 1 - Math.pow(1 - Math.min(1, w * 1.4), 3);
      let cnt = Math.floor(g.count * grow);
      if (g.segments) cnt -= cnt % 2;
      g.obj.geometry.setDrawRange(0, cnt);
      mat.opacity = g.opacity * w;
      if (g.rotate) g.obj.rotation.y = rots[g.stage];
    }
  }
  return { group, update };
}

/* ---------------- 悬浮标签 ---------------- */

export interface LabelItem {
  hs: Hotspot;
  el: HTMLElement;
  x: number;
  y: number;
  visible: number;
  cur: number;
}

export function createLabels(container: HTMLElement, hotspots: Hotspot[]): LabelItem[] {
  return hotspots.map((hs) => {
    const el = document.createElement('div');
    el.className = `uv-label uv-label--s${hs.stage}${hs.side === -1 ? ' uv-label--below' : ''}${hs.kind === 'disc' ? ' uv-label--disc' : ''}${hs.cls ? ` uv-label--${hs.cls}` : ''}`;
    el.style.setProperty('--c', hs.color);
    el.innerHTML = `<i class="uv-label-dot"></i><i class="uv-label-line"></i><span class="uv-label-t">${hs.label}</span><span class="uv-label-s">${hs.sub}</span>`;
    container.appendChild(el);
    return { hs, el, x: 0, y: 0, visible: 0, cur: -1 };
  });
}

export function placeLabel(it: LabelItem, x: number, y: number, vis: number, hover: boolean, selected: boolean, flip = false) {
  it.x = x;
  it.y = y;
  it.visible = vis;
  const v = Math.round(vis * 100) / 100;
  it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  if (v !== it.cur) {
    it.el.style.opacity = String(v);
    it.el.style.visibility = v < 0.02 ? 'hidden' : 'visible';
    it.cur = v;
  }
  it.el.classList.toggle('is-hover', hover);
  it.el.classList.toggle('is-selected', selected);
  if (it.hs.kind === 'point' && it.hs.stage !== 2) it.el.classList.toggle('uv-label--flip', flip);
}

