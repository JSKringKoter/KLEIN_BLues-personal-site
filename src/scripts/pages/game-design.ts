// 游戏设计：一张可以旋转、局部展开的白图纸。
// 从首页点进来时，镜头从贴近图纸的位置拉远——与首页「推向图纸」的镜头首尾相接。
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Tween, clamp, damp, easeInOut, easeOut, setCursor } from "../stage/core";
import { Jet, PART_LABELS, blueprintTexture, type JetPart } from "../stage/worlds/jet";

export function mountGameDesign(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>(".gd-canvas")!;
  const hit = root.querySelector<HTMLElement>(".gd-hit")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    root.classList.add("is-static");
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd6dcea, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-2, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 4),
    new THREE.MeshStandardMaterial({ map: blueprintTexture(2100, 1500, "KB-01  核心战机 · 设计图纸"), roughness: 0.92 }),
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.receiveShadow = true;
  scene.add(sheet);

  const jet = new Jet();
  jet.group.scale.setScalar(1.25);
  jet.group.position.set(0, 0.55, 0);
  scene.add(jet.group);

  // 地面上的投影轮廓
  const assemble = new Tween(reduced ? 1 : 0);
  const intro = new Tween(0);
  const fromHome = (() => {
    try {
      const v = sessionStorage.getItem("kb-from") === "worlds";
      sessionStorage.removeItem("kb-from");
      return v;
    } catch {
      return false;
    }
  })();
  intro.go(1, reduced ? 0.01 : fromHome ? 2.4 : 1.8, easeInOut);
  setTimeout(() => assemble.go(1, 1.6, easeInOut), reduced ? 0 : fromHome ? 900 : 500);

  let yaw = -0.6;
  let pitch = 0.62;
  let yawTarget = yaw;
  let pitchTarget = pitch;
  let dragging: { x: number; y: number } | null = null;
  let W = 1;
  let H = 1;
  let time = 0;
  let last = performance.now();
  let autoSpin = true;

  const resize = () => {
    W = root.clientWidth;
    H = root.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = W / H < 0.9 ? 42 : 30;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(root);
  resize();

  hit.addEventListener("pointerdown", (e) => {
    dragging = { x: e.clientX, y: e.clientY };
    autoSpin = false;
    hit.setPointerCapture(e.pointerId);
    setCursor(hit, "DRAG");
  });
  hit.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yawTarget += (e.clientX - dragging.x) * 0.006;
    pitchTarget = clamp(pitchTarget + (e.clientY - dragging.y) * 0.004, 0.15, 1.25);
    dragging = { x: e.clientX, y: e.clientY };
  });
  const end = (e: PointerEvent) => {
    dragging = null;
    if (hit.hasPointerCapture(e.pointerId)) hit.releasePointerCapture(e.pointerId);
    setCursor(hit, "SWITCH");
  };
  hit.addEventListener("pointerup", end);
  hit.addEventListener("pointercancel", end);
  setCursor(hit, "SWITCH");

  const toggle = root.querySelector<HTMLButtonElement>("[data-gd-toggle]");
  toggle?.addEventListener("click", () => {
    const next = assemble.target > 0.5 ? 0 : 1;
    assemble.go(next, 1.4, easeInOut);
    toggle.dataset.state = next ? "assembled" : "expanded";
    toggle.querySelector("span")!.textContent = next ? "结构展开" : "收拢";
  });

  // 部件标注：悬停时该部件从机体上局部展开
  const callouts = Array.from(root.querySelectorAll<HTMLElement>("[data-part]"));
  callouts.forEach((el) => {
    el.addEventListener("pointerenter", () => (jet.focus = el.dataset.part as JetPart));
    el.addEventListener("pointerleave", () => (jet.focus = null));
    el.addEventListener("focus", () => (jet.focus = el.dataset.part as JetPart));
    el.addEventListener("blur", () => (jet.focus = null));
  });
  const partCenters = new Map<JetPart, THREE.Vector3>();
  for (const part of Object.keys(PART_LABELS) as JetPart[]) {
    const ps = jet.pieces.filter((p) => p.part === part);
    if (!ps.length) continue;
    const c = new THREE.Vector3();
    ps.forEach((p) => c.add(p.pos));
    partCenters.set(part, c.divideScalar(ps.length));
  }
  const lines = root.querySelector<SVGSVGElement>(".gd-leaders");
  const v = new THREE.Vector3();

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    intro.step(dt);
    assemble.step(dt);
    if (autoSpin && !reduced) yawTarget += dt * 0.08;
    yaw = damp(yaw, yawTarget, 5, dt);
    pitch = damp(pitch, pitchTarget, 5, dt);

    const i = easeOut(intro.value);
    const narrow = W / H < 0.9;
    const dist = (narrow ? 9.5 : 7.4) + (1 - i) * -4.6;
    const p = pitch + (1 - i) * 0.5;
    camera.position.set(Math.sin(yaw) * Math.cos(p) * dist, Math.sin(p) * dist + 0.2, Math.cos(yaw) * Math.cos(p) * dist);
    camera.lookAt(narrow ? 0 : -0.4, 0.35, 0);

    jet.assemble = assemble.value;
    jet.update(time, dt);
    jet.group.position.y = 0.55 + Math.sin(time * 0.9) * 0.04 + assemble.value * 0.1;
    renderer.render(scene, camera);

    // 引线
    if (lines && !narrow) {
      jet.group.updateMatrixWorld();
      let d = "";
      let dh = "";
      callouts.forEach((el) => {
        const c = partCenters.get(el.dataset.part as JetPart);
        if (!c) return;
        v.copy(c).applyMatrix4(jet.group.matrixWorld).project(camera);
        const x = (v.x * 0.5 + 0.5) * W;
        const y = (-v.y * 0.5 + 0.5) * H;
        const r = el.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        const lx = r.right - rr.left + 6;
        const ly = r.top - rr.top + r.height / 2;
        const seg = `M${lx.toFixed(1)},${ly.toFixed(1)}L${(lx + 26).toFixed(1)},${ly.toFixed(1)}L${x.toFixed(1)},${y.toFixed(1)}`;
        if (el.dataset.part === jet.focus) dh += seg;
        else d += seg;
      });
      const paths = lines.querySelectorAll("path");
      paths[0]?.setAttribute("d", d);
      paths[1]?.setAttribute("d", dh);
      lines.style.opacity = String(clamp(assemble.value * 1.4 - 0.4) * i);
    }
  };
  requestAnimationFrame(frame);
  root.classList.add("is-ready");
}
