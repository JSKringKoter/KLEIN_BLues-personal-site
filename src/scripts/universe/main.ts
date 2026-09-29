import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CHAPTERS, EVENTS, ROUTE_LABEL } from './data';
import { X_MAX, X_MIN, xToYear, yearToX } from './chrono';
import { LAYER_R, buildHotspots, buildParticleLayouts, buildShardLayouts } from './layouts';
import { createParticles } from './particles';
import { createShards } from './shards';
import { createGuides, createLabels, placeLabel } from './guides';
import { panelHTML } from './panel';
import { TOTAL, anchorOf, evaluate, holdRange, nextAnchor, restTarget, shortestDelta } from './sequence';
import { clamp01, easeInOut, lerp, smooth } from './rand';

/* ---------------- 镜头 ---------------- */

interface Cam {
  pos: THREE.Vector3;
  tgt: THREE.Vector3;
  fov: number;
}
const mkCam = (): Cam => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 40 });

const TL_A = X_MIN + 2.5;
const TL_B = X_MAX - 1.5;
const focusXOf = (local: number) => lerp(TL_A, TL_B, local) + 0.6;
const localOfX = (x: number) => clamp01((x - 0.6 - TL_A) / (TL_B - TL_A));

function camFor(stage: number, local: number, out: Cam) {
  switch (stage) {
    case 0:
      out.pos.set(-0.9, lerp(0.9, 0.3, local), lerp(17.2, 15.8, local));
      out.tgt.set(-2.9, 0.1, 0);
      out.fov = 38;
      break;
    case 1:
      out.pos.set(-2.4, lerp(4.2, 3.6, local), lerp(18.6, 17.8, local));
      out.tgt.set(-2.4, -0.5, 0);
      out.fov = 40;
      break;
    case 2: {
      const cx = lerp(TL_A, TL_B, local);
      out.pos.set(cx - 2.6, 1.6, 13.6);
      out.tgt.set(cx + 0.6, -1.2, 0);
      out.fov = 42;
      break;
    }
    case 3: {
      const a = lerp(-0.12, 0.12, local);
      out.pos.set(Math.sin(a) * 20.5 - 2.6, 18.6, Math.cos(a) * 20.5 + 1);
      out.tgt.set(-2.6, -1.8, 1);
      out.fov = 40;
      break;
    }
    case 4:
      out.pos.set(-4.6, lerp(8.4, 7, local), lerp(28.5, 27.5, local));
      out.tgt.set(-4.6, -0.6, 0);
      out.fov = 40;
      break;
    default:
      out.pos.set(-2.4, lerp(7.4, 6.2, local), lerp(20.5, 19.2, local));
      out.tgt.set(-2.4, -0.2, 0);
      out.fov = 40;
  }
  return out;
}

// 各场景为左下文字预留的镜头横向偏移
const SHIFT = [-2.9, -2.4, 0, -2.6, -4.6, -2.4];

const STAGE_BG: [string, string][] = [
  ['#f7f8fb', '#d9dfec'],
  ['#f9f7f3', '#e3ded4'],
  ['#f6f7f9', '#dde2ea'],
  ['#f4f6fa', '#d6dcea'],
  ['#f8f6f6', '#e0dbe1'],
  ['#f9f6f1', '#e2dbd1'],
];
const hexToArr = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const BG = STAGE_BG.map(([a, b]) => [hexToArr(a), hexToArr(b)]);

/* ---------------- 挂载 ---------------- */

export function mountUniverse(root: HTMLElement) {
  const host = root as HTMLElement & { __uv?: boolean };
  if (host.__uv) return;
  host.__uv = true;

  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel) as T;
  const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const canvas = $<HTMLCanvasElement>('.uv-canvas');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = matchMedia('(max-width: 760px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = small || coarse ? 18000 : 42000;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('uv--nogl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc3cbe0, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(6, 10, 8);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);

  const { points, uniforms } = createParticles(buildParticleLayouts(N), N);
  scene.add(points);
  const shards = createShards(buildShardLayouts());
  scene.add(shards.mesh);
  const guides = createGuides();
  scene.add(guides.group);
  const hotspots = buildHotspots();
  const labels = createLabels($('.uv-labels'), hotspots);

  /* DOM */
  const chapterEls = $$('[data-chapter]');
  const railBtns = $$<HTMLButtonElement>('[data-go]');
  const railCursor = $('[data-rail-cursor]');
  const readStage = $('[data-read-stage]');
  const readCoord = $('[data-read-coord]');
  const readCycle = $('[data-read-cycle]');
  const hintEl = $('[data-hint]');
  const era = $('[data-era]');
  const eraYear = $('[data-era-year]');
  const eraRoute = $('[data-era-route]');
  const eraTitle = $('[data-era-title]');
  const eraText = $('[data-era-text]');
  const eraBar = $('[data-era-bar]');
  const panel = $('[data-panel]');
  const panelBody = $('[data-panel-body]');

  /* 状态 */
  let W = 1;
  let H = 1;
  let S = 0;
  let target = 0;
  let lastInput = 0;
  let lastDir = 1;
  const track = evaluate(0);
  const rot = [0, 0, 0, 0, 0, 0];
  const userRot = [0, 0, 0, 0, 0, 0];
  let userVel = 0;
  let carousel = 0;
  let carouselTarget = 0;
  let autoSpin = 0;
  type Sel = { stage: number; group: number; id: string } | null;
  let hover: Sel = null;
  let selected: Sel = null;
  let focusAmt = 0;
  const emS = Array.from({ length: 6 }, () => new Float32Array(40).fill(1));
  const emD = Array.from({ length: 6 }, () => new Float32Array(40));
  let intro = 0;
  let introStart = -1;
  let introSkip = false;
  const ptr = { nx: 0, ny: 0, sx: 0, sy: 0, x: 0, y: 0, inside: false, down: false, moved: 0, lx: 0, ly: 0, id: -1 };
  let pointerAmt = 0;
  let inView = true;
  let running = true;

  const camA = mkCam();
  const camB = mkCam();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const now = () => performance.now();
  const [H2a, H2b] = holdRange(2);

  const emph = (stage: number, group: number): [number, number] => {
    const k = group + 1;
    if (k < 0) return [1, 0];
    return [emS[stage][k], emD[stage][k]];
  };

  function go(stage: number) {
    target = S + shortestDelta(S, anchorOf(stage));
    lastDir = Math.sign(target - S) || 1;
    lastInput = now();
  }

  function goTimelineX(x: number) {
    const s = H2a + localOfX(x) * (H2b - H2a);
    target = S + shortestDelta(S, s);
    lastDir = Math.sign(target - S) || 1;
    lastInput = now();
  }

  function select(sel: Sel) {
    selected = sel;
    const html = sel ? panelHTML(sel.stage, sel.id) : null;
    if (html) {
      panelBody.innerHTML = html;
      panel.classList.add('is-open');
      panel.style.setProperty('--c', hotspots.find((h) => h.stage === sel!.stage && h.id === sel!.id)?.color ?? '#1f3fae');
    } else {
      panel.classList.remove('is-open');
    }
    if (sel && sel.stage === 1) {
      const a = -(sel.group / 5) * Math.PI * 2;
      const turns = Math.round((carouselTarget - a) / (Math.PI * 2));
      carouselTarget = a + turns * Math.PI * 2;
    }
  }

  /* ---------------- 输入 ---------------- */

  root.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= H;
      d = Math.max(-140, Math.min(140, d));
      target += d * 0.0014;
      lastDir = Math.sign(d) || lastDir;
      lastInput = now();
    },
    { passive: false },
  );

  const setPtr = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.nx = (ptr.x / W) * 2 - 1;
    ptr.ny = -(ptr.y / H) * 2 + 1;
  };

  root.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button, a, [data-panel]')) return;
    setPtr(e);
    ptr.down = true;
    ptr.moved = 0;
    ptr.lx = e.clientX;
    ptr.ly = e.clientY;
    ptr.id = e.pointerId;
    root.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
  });
  root.addEventListener('pointermove', (e) => {
    setPtr(e);
    ptr.inside = true;
    if (!ptr.down || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.lx;
    const dy = e.clientY - ptr.ly;
    ptr.lx = e.clientX;
    ptr.ly = e.clientY;
    ptr.moved += Math.abs(dx) + Math.abs(dy);
    if (ptr.moved < 6) return;
    const d = track.dominant;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (horizontal) {
      if (d === 1) {
        carouselTarget += dx * 0.006;
        if (selected?.stage === 1) select(null);
      } else if (d === 2 && track.from === track.to) {
        target -= dx * 0.0042;
        lastDir = Math.sign(-dx) || lastDir;
      } else {
        userVel = dx * 0.004;
      }
    } else {
      target -= dy * (e.pointerType === 'mouse' ? 0.003 : 0.0045);
      lastDir = Math.sign(-dy) || lastDir;
    }
    lastInput = now();
  });
  const endDrag = (e: PointerEvent) => {
    if (!ptr.down || e.pointerId !== ptr.id) return;
    ptr.down = false;
    root.classList.remove('is-dragging');
    if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    if (ptr.moved < 6 && e.type === 'pointerup') {
      setPtr(e);
      pickHover();
      onClick();
    }
    if (e.pointerType !== 'mouse') ptr.inside = false;
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('pointerleave', () => {
    if (!ptr.down) ptr.inside = false;
  });

  function onClick() {
    if (!hover) {
      if (selected) select(null);
      return;
    }
    const h = hover;
    if (h.stage === 2) {
      const e = EVENTS[h.group];
      goTimelineX(yearToX(e.year));
      return;
    }
    if (selected && selected.stage === h.stage && selected.id === h.id) select(null);
    else select({ ...h });
  }

  railBtns.forEach((b) =>
    b.addEventListener('click', () => {
      select(null);
      go(Number(b.dataset.go));
    }),
  );
  $('[data-panel-close]')?.addEventListener('click', () => select(null));

  window.addEventListener('keydown', (e) => {
    if (!inView) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const fwd = ['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key);
    const back = ['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key);
    if (e.key === 'Escape') return select(null);
    if (!fwd && !back) return;
    e.preventDefault();
    lastInput = now();
    if (track.from === 2 && track.to === 2) {
      const fx = focusXOf(evaluate(target).local);
      const xs = Array.from(new Set(EVENTS.map((ev) => yearToX(ev.year)))).sort((a, b) => a - b);
      const nx = fwd ? xs.find((x) => x > fx + 0.3) : [...xs].reverse().find((x) => x < fx - 0.3);
      if (nx !== undefined) {
        goTimelineX(nx);
        return;
      }
    }
    target = nextAnchor(target, fwd ? 1 : -1);
    lastDir = fwd ? 1 : -1;
  });

  /* ---------------- 尺寸与可见性 ---------------- */

  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = renderer.getPixelRatio() * Math.min(1.25, Math.max(0.8, H / 900));
  }
  new ResizeObserver(resize).observe(root);
  resize();

  new IntersectionObserver((ents) => {
    inView = ents[0].isIntersecting;
    if (inView && !running) {
      running = true;
      last = now();
      requestAnimationFrame(frame);
    }
  }).observe(root);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !running) {
      running = true;
      last = now();
      requestAnimationFrame(frame);
    }
  });

  /* ---------------- 悬停拾取 ---------------- */

  function screenOf(p: THREE.Vector3) {
    tmp2.copy(p).project(camera);
    return { x: (tmp2.x * 0.5 + 0.5) * W, y: (-tmp2.y * 0.5 + 0.5) * H, behind: tmp2.z > 1 };
  }

  function worldOf(stage: number, p: THREE.Vector3, out: THREE.Vector3) {
    const a = rot[stage];
    const c = Math.cos(a);
    const s = Math.sin(a);
    return out.set(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  function pickHover() {
    hover = null;
    const d = track.dominant;
    if (!ptr.inside || track.weights[d] < 0.7) return;
    let best = Infinity;
    for (const it of labels) {
      const hs = it.hs;
      if (hs.stage !== d || hs.tag || hs.kind !== 'point') continue;
      worldOf(d, hs.pos, tmp);
      const sc = screenOf(tmp);
      if (sc.behind) continue;
      const dist = camera.position.distanceTo(tmp);
      const pr = (hs.radius * H) / (2 * Math.tan((camera.fov * Math.PI) / 360) * dist);
      const r = Math.max(22, pr);
      const dd = Math.hypot(sc.x - ptr.x, sc.y - ptr.y);
      if (d === 2 && it.visible < 0.3) continue;
      if (dd < r && dd / r < best) {
        best = dd / r;
        hover = { stage: d, group: hs.group, id: hs.id };
      }
    }
    if (hover || d !== 4) return;
    ndc.set(ptr.nx, ptr.ny);
    ray.setFromCamera(ndc, camera);
    let bestT = Infinity;
    for (const it of labels) {
      const hs = it.hs;
      if (hs.stage !== 4 || hs.kind !== 'disc') continue;
      plane.constant = -hs.pos.y;
      const hit = ray.ray.intersectPlane(plane, tmp);
      if (!hit) continue;
      if (Math.hypot(hit.x, hit.z) > hs.radius) continue;
      const t = hit.distanceTo(ray.ray.origin);
      if (t < bestT) {
        bestT = t;
        hover = { stage: 4, group: hs.group, id: hs.id };
      }
    }
  }

  /* ---------------- 帧循环 ---------------- */

  let last = now();
  let t = 0;
  let lastFocusIdx = -1;
  let lastYear = -1;
  let lastHint = -1;
  const chapterCache = chapterEls.map(() => -1);
  let bgCache = '';

  function frame() {
    if (!inView || document.hidden) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
    const nowT = now();
    const dt = Math.min(0.05, (nowT - last) / 1000);
    last = nowT;
    t += dt * (reduced ? 0.35 : 1);

    if (introStart < 0) {
      introStart = nowT;
      root.classList.add('is-ready');
    }
    intro = reduced || introSkip ? 1 : clamp01((nowT - introStart) / 3600);
    const introE = easeInOut(intro);

    // 吸附
    if (!ptr.down && nowT - lastInput > 260 && Math.abs(target - S) < 0.03) {
      const rest = restTarget(target, lastDir);
      if (rest !== null) target = rest;
    }
    const diff = target - S;
    const maxStep = 7 * dt;
    S += Math.max(-maxStep, Math.min(maxStep, diff * (1 - Math.exp(-dt * 3.4))));
    evaluate(S, track);
    const W6 = track.weights;

    // 旋转
    userRot[track.dominant] += userVel;
    userVel *= Math.pow(0.9, dt * 60);
    if (!selected || selected.stage !== 1) {
      if (!ptr.down) autoSpin += dt * 0.05 * (reduced ? 0.3 : 1);
    }
    carousel += (carouselTarget + (selected?.stage === 1 ? 0 : autoSpin) - carousel) * (1 - Math.exp(-dt * 3));
    rot[0] = t * 0.1 + userRot[0];
    rot[1] = carousel;
    rot[2] = 0;
    rot[3] = t * 0.018 + userRot[3];
    rot[4] = t * 0.05 + userRot[4];
    rot[5] = t * 0.04 + userRot[5];

    // 选择随场景离开而清除
    if (selected && W6[selected.stage] < 0.5) select(null);
    focusAmt += ((selected ? 1 : 0) - focusAmt) * (1 - Math.exp(-dt * 2.5));

    // 镜头
    if (track.from === track.to) {
      camFor(track.from, track.local, camA);
    } else {
      camFor(track.from, 1, camA);
      camFor(track.to, 0, camB);
      const e = easeInOut(track.mix);
      camA.pos.lerp(camB.pos, e);
      camA.tgt.lerp(camB.tgt, e);
      camA.fov = lerp(camA.fov, camB.fov, e);
      const bell = Math.sin(Math.PI * e);
      tmp.subVectors(camA.pos, camA.tgt).normalize();
      camA.pos.addScaledVector(tmp, bell * (2.5 + track.turb * 0.5));
    }
    const aspect = W / H;
    if (aspect < 1.2) {
      const k = lerp(1, 1.85, clamp01((1.2 - aspect) / 0.7));
      tmp.subVectors(camA.pos, camA.tgt).multiplyScalar(k);
      camA.pos.copy(camA.tgt).add(tmp);
      // 竖屏：取消为左侧文字预留的横向偏移，场景居中
      let sh = 0;
      for (let k = 0; k < 6; k++) sh += SHIFT[k] * W6[k];
      camA.tgt.x -= sh;
      camA.pos.x -= sh;
      // 文字占据下半屏，场景上移
      const up = 2.2 * clamp01((1.2 - aspect) / 0.7);
      camA.tgt.y -= up;
      camA.pos.y -= up;
    }
    if (selected && focusAmt > 0.001) {
      const hs = hotspots.find((h) => h.stage === selected!.stage && h.id === selected!.id);
      if (hs) {
        worldOf(hs.stage, hs.pos, tmp);
        const f = focusAmt * W6[hs.stage];
        camA.tgt.lerp(tmp, 0.4 * f);
        camA.pos.lerp(tmp, 0.2 * f);
        // 为右侧面板让出空间
        if (aspect > 1.1) {
          tmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
          camA.tgt.addScaledVector(tmp, 2.2 * f);
          camA.pos.addScaledVector(tmp, 2.2 * f);
        }
      }
    }
    ptr.sx += ((ptr.inside ? ptr.nx : 0) - ptr.sx) * (1 - Math.exp(-dt * 2));
    ptr.sy += ((ptr.inside ? ptr.ny : 0) - ptr.sy) * (1 - Math.exp(-dt * 2));
    camA.pos.x += ptr.sx * 0.8;
    camA.pos.y += ptr.sy * 0.5;
    // 开场：镜头自远处推入
    camA.pos.z += (1 - introE) * 10;
    camA.pos.y += (1 - introE) * 3;
    camera.position.copy(camA.pos);
    camera.lookAt(camA.tgt);
    if (Math.abs(camera.fov - camA.fov) > 0.01) {
      camera.fov = camA.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    // 指针
    if (!ptr.down) pickHover();
    root.classList.toggle('is-pointing', !!hover);
    // 宿主站点的自定义光标读取 data-cursor
    const cursorMode = ptr.down && ptr.moved >= 6 ? 'DRAG' : hover ? (hover.stage === 2 ? 'ENTER' : 'OPEN') : '';
    if ((root.dataset.cursor ?? '') !== cursorMode) {
      if (cursorMode) root.dataset.cursor = cursorMode;
      else delete root.dataset.cursor;
      root.dispatchEvent(new CustomEvent('kb:cursor-refresh', { bubbles: true }));
    }
    ndc.set(ptr.nx, ptr.ny);
    ray.setFromCamera(ndc, camera);
    uniforms.uRayO.value.copy(ray.ray.origin);
    uniforms.uRayD.value.copy(ray.ray.direction);
    pointerAmt += ((ptr.inside && !reduced ? 1 : 0) - pointerAmt) * (1 - Math.exp(-dt * 4));

    // 强调
    const ek = 1 - Math.exp(-dt * 6);
    for (let s = 1; s < 6; s++) {
      const selHere = selected?.stage === s;
      const es = emS[s];
      const ed = emD[s];
      for (let g = 0; g < 40; g++) {
        const grp = g - 1;
        const isSel = selHere && selected!.group === grp && grp >= 0;
        const isHov = hover?.stage === s && hover.group === grp && grp >= 0;
        const ts = isSel ? 1.22 : isHov ? 1.12 : 1;
        const td = selHere && !isSel ? (grp < 0 ? 0.3 : 0.55) : 0;
        es[g] += (ts - es[g]) * ek;
        ed[g] += (td - ed[g]) * ek;
      }
    }

    // 物质
    const turb = track.turb * (reduced ? 0.3 : 1);
    uniforms.uFrom.value = track.from;
    uniforms.uTo.value = track.to;
    uniforms.uMix.value = track.mix;
    uniforms.uRotFrom.value = rot[track.from];
    uniforms.uRotTo.value = rot[track.to];
    uniforms.uTurb.value = turb;
    uniforms.uTime.value = t;
    uniforms.uIntro.value = introE;
    uniforms.uPointer.value = pointerAmt;
    shards.update({ from: track.from, to: track.to, mix: track.mix, rotFrom: rot[track.from], rotTo: rot[track.to], turb, time: t, intro: introE, emph });
    guides.update(W6, rot);

    renderer.render(scene, camera);

    updateHUD(introE);
  }

  function updateHUD(introE: number) {
    const W6 = track.weights;
    const inTL = track.from === 2 && track.to === 2;
    const tlLocal = inTL ? track.local : track.from === 2 ? 1 : 0;

    // 背景
    const bg = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < 6; s++) {
      if (!W6[s]) continue;
      for (let k = 0; k < 3; k++) {
        bg[k] += BG[s][0][k] * W6[s];
        bg[k + 3] += BG[s][1][k] * W6[s];
      }
    }
    const bgStr = `${bg.map((v) => Math.round(v)).join(',')}`;
    if (bgStr !== bgCache) {
      bgCache = bgStr;
      root.style.setProperty('--uv-bg-a', `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`);
      root.style.setProperty('--uv-bg-b', `rgb(${bg[3] | 0},${bg[4] | 0},${bg[5] | 0})`);
    }

    // 章节文字：随形变连续淡入淡出
    chapterEls.forEach((el, c) => {
      let w = W6[c];
      if (c === 2) {
        if (inTL) w = 1 - smooth(0.012, 0.05, track.local);
        else if (track.from === 2) w = 0;
      }
      w = smooth(0.35, 1, w) * smooth(0.45, 0.9, introE);
      const q = Math.round(w * 200) / 200;
      if (q === chapterCache[c]) return;
      chapterCache[c] = q;
      const incoming = track.to === c && track.from !== c;
      const dy = (1 - q) * (incoming ? 28 : -28);
      el.style.opacity = String(q);
      el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`;
      el.style.filter = q > 0.99 ? 'none' : `blur(${((1 - q) * 8).toFixed(1)}px)`;
      el.style.visibility = q < 0.01 ? 'hidden' : 'visible';
    });

    // 纪年：年份与当前事件
    let eraW = 0;
    if (inTL) eraW = smooth(0.03, 0.07, track.local);
    else if (track.from === 2) eraW = 1 - smooth(0, 0.35, track.mix);
    era.style.opacity = String(eraW.toFixed(3));
    era.style.visibility = eraW < 0.01 ? 'hidden' : 'visible';
    if (eraW > 0.01) {
      const fx = focusXOf(tlLocal);
      const yr = Math.round(xToYear(fx));
      if (yr !== lastYear) {
        lastYear = yr;
        eraYear.textContent = String(yr);
      }
      let idx = 0;
      let bd = Infinity;
      EVENTS.forEach((ev, k) => {
        const d = Math.abs(yearToX(ev.year) - fx);
        if (d < bd) {
          bd = d;
          idx = k;
        }
      });
      if (idx !== lastFocusIdx) {
        lastFocusIdx = idx;
        const ev = EVENTS[idx];
        era.classList.remove('is-swap');
        void era.offsetWidth;
        era.classList.add('is-swap');
        eraRoute.textContent = `${ev.year} · ${ROUTE_LABEL[ev.route]}`;
        eraRoute.dataset.route = ev.route;
        eraTitle.textContent = ev.title;
        eraText.textContent = ev.text;
      }
      eraBar.style.transform = `scaleX(${tlLocal.toFixed(4)})`;
    }

    // 标签
    const fx = focusXOf(tlLocal);
    for (const it of labels) {
      const hs = it.hs;
      let vis = smooth(0.55, 1, W6[hs.stage]) * introE;
      if (vis < 0.01) {
        if (it.cur !== 0) placeLabel(it, it.x, it.y, 0, false, false);
        continue;
      }
      if (hs.kind === 'disc') tmp.set(-(LAYER_R + 1.1), hs.pos.y - 0.1, 1.2);
      else worldOf(hs.stage, hs.pos, tmp);
      if (hs.lift) tmp.y += hs.lift;
      if (hs.stage === 1) {
        const R = 6.2;
        vis *= lerp(0.28, 1, clamp01((tmp.z + R) / (2 * R)));
      }
      if (hs.stage === 2) vis *= 1 - smooth(7, 12, Math.abs(hs.pos.x - fx));
      if (hs.tag) vis *= 0.8;
      if (selected && selected.stage === hs.stage && selected.id !== hs.id && !hs.tag) vis *= 0.45;
      const sc = screenOf(tmp);
      if (sc.behind) vis = 0;
      const isHov = hover?.stage === hs.stage && hover.id === hs.id;
      const isSel = selected?.stage === hs.stage && selected.id === hs.id;
      placeLabel(it, sc.x, sc.y, vis, isHov, isSel, sc.x > W - (W > 760 ? 330 : 150));
    }

    // 面板
    if (selected) panel.style.opacity = String(smooth(0.5, 1, W6[selected.stage]).toFixed(3));

    // 导轨与读数
    let c = track.from + (track.to - track.from) * easeInOut(track.mix);
    if (track.from === 5 && track.to === 0) c = 5 * (1 - easeInOut(track.mix));
    railCursor.style.translate = `0 calc(${c.toFixed(4)} * var(--uv-rail-step))`;
    railBtns.forEach((b, i) => b.classList.toggle('is-active', i === track.dominant));
    readStage.textContent = CHAPTERS[track.dominant].index;
    readCoord.textContent = (track.s).toFixed(3).padStart(6, '0');
    readCycle.textContent = String(Math.max(1, Math.floor(S / TOTAL) + 1)).padStart(2, '0');
    if (lastHint !== track.dominant) {
      lastHint = track.dominant;
      hintEl.classList.remove('is-swap');
      void hintEl.offsetWidth;
      hintEl.classList.add('is-swap');
      hintEl.textContent = CHAPTERS[track.dominant].hint;
    }
  }

  if (location.search.includes('debug')) {
    (window as unknown as { __uv: object }).__uv = {
      jump(v: number) {
        S = target = v;
        lastInput = now() + 1e6;
      },
      hover(nx: number, ny: number) {
        ptr.inside = true;
        ptr.nx = nx;
        ptr.ny = ny;
        ptr.x = ((nx + 1) / 2) * W;
        ptr.y = ((1 - ny) / 2) * H;
      },
      click() {
        pickHover();
        onClick();
      },
      state() {
        return { S, target, track: { ...track }, intro, cam: camera.position.toArray(), u: { mix: uniforms.uMix.value, from: uniforms.uFrom.value, to: uniforms.uTo.value, intro: uniforms.uIntro.value, turb: uniforms.uTurb.value }, ch: chapterEls.map((e) => e.style.cssText) };
      },
      skipIntro() {
        introSkip = true;
      },
    };
  }

  requestAnimationFrame(frame);
}
