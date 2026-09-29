import * as THREE from "three";
import { Rng, type SampleBuffers, type StageFrame, type StageModule, type StagePresence } from "./core";

/** 尚未接入的模块：一张空纸 */
export class PaperModule implements StageModule {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  readonly toneMapped = false;
  constructor(
    readonly id: string,
    readonly backdrop: [string, string],
  ) {
    this.camera.position.set(0, 0, 10);
  }
  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  update(_f: StageFrame, _p: StagePresence) {}
  sample(count: number, out: SampleBuffers) {
    const rng = new Rng(9);
    const c = new THREE.Color("#c9bfae");
    for (let i = 0; i < count; i++) {
      out.pos[i * 3] = rng.range(-8, 8);
      out.pos[i * 3 + 1] = rng.range(-5, 5);
      out.pos[i * 3 + 2] = rng.range(-3, 1);
      out.col[i * 3] = c.r;
      out.col[i * 3 + 1] = c.g;
      out.col[i * 3 + 2] = c.b;
      out.size[i] = 1.4 + rng.next() * 1.4;
    }
  }
  dispose() {}
}

/**
 * 纯 DOM 模块：画布上什么也不画，内容全在叠层里。
 * 形变时，粒子落在叠层中带 data-sample 的元素上（颜色取 data-sample 的值），
 * 看起来就像粒子凝结成了这一页的版面。
 */
export class DomModule extends PaperModule {
  private width = 1;
  private height = 1;
  constructor(
    id: string,
    backdrop: [string, string],
    private readonly overlay: HTMLElement | null,
  ) {
    super(id, backdrop);
  }

  resize(w: number, h: number) {
    super.resize(w, h);
    this.width = w;
    this.height = h;
  }

  sample(count: number, out: SampleBuffers) {
    const els = Array.from(this.overlay?.querySelectorAll<HTMLElement>("[data-sample]") ?? []);
    const rects = els
      .map((el) => ({ r: el.getBoundingClientRect(), c: new THREE.Color(el.dataset.sample || "#1d1b17") }))
      .filter(({ r }) => r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < this.height);
    if (!rects.length) return super.sample(count, out);
    const areas = rects.map(({ r }) => Math.sqrt(r.width * r.height));
    const total = areas.reduce((a, b) => a + b, 0);
    const rng = new Rng(17);
    const cam = this.camera;
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const v = new THREE.Vector3();
    const paper = new THREE.Color("#f4efe5");
    for (let i = 0; i < count; i++) {
      let pick = rng.next() * total;
      let k = 0;
      while (k < rects.length - 1 && pick > areas[k]) pick -= areas[k++];
      const { r, c } = rects[k];
      // 偏向边框：版面的轮廓比内部更容易被认出来
      const edge = rng.next() < 0.45;
      let x = r.left + rng.next() * r.width;
      let y = r.top + rng.next() * r.height;
      if (edge) {
        if (rng.next() < 0.5) y = rng.next() < 0.5 ? r.top : r.bottom;
        else x = rng.next() < 0.5 ? r.left : r.right;
      }
      v.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0.5).unproject(cam).sub(cam.position);
      v.multiplyScalar(-cam.position.z / v.z).add(cam.position);
      const col = rng.next() < 0.75 ? c : paper;
      out.pos[i * 3] = v.x;
      out.pos[i * 3 + 1] = v.y;
      out.pos[i * 3 + 2] = v.z;
      out.col[i * 3] = col.r;
      out.col[i * 3 + 1] = col.g;
      out.col[i * 3 + 2] = col.b;
      out.size[i] = 1.5 + rng.next() * 1.4;
    }
  }
}
