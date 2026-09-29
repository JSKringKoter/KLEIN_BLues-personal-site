import * as THREE from 'three';
import { SHARDS, type ShardLayout } from './layouts';

export interface Emphasis {
  /** 返回某场景某分组的 [缩放倍率, 褪色程度] */
  (stage: number, group: number): [number, number];
}

const _pA = new THREE.Vector3();
const _pB = new THREE.Vector3();
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _qR = new THREE.Quaternion();
const _qT = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const _axis = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);
const FADE = new THREE.Color().setRGB(0.9, 0.915, 0.94, THREE.SRGBColorSpace);

function shardGeometry() {
  // 六方双锥：拉长即晶柱，压扁即晶片
  const pts = [new THREE.Vector2(0, -0.5), new THREE.Vector2(0.5, -0.2), new THREE.Vector2(0.5, 0.2), new THREE.Vector2(0, 0.5)];
  const g = new THREE.LatheGeometry(pts, 6);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  return ng;
}

export function createShards(layouts: ShardLayout[]) {
  const geo = shardGeometry();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.55,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 520],
    flatShading: true,
    envMapIntensity: 1.15,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, SHARDS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.setColorAt(0, new THREE.Color());
  mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);

  // 颜色转为线性空间
  const linCols = layouts.map((L) => {
    const out = new Float32Array(L.col.length);
    for (let i = 0; i < SHARDS; i++) {
      _c.setRGB(L.col[i * 3], L.col[i * 3 + 1], L.col[i * 3 + 2], THREE.SRGBColorSpace);
      out[i * 3] = _c.r;
      out[i * 3 + 1] = _c.g;
      out[i * 3 + 2] = _c.b;
    }
    return out;
  });

  const rnd = new Float32Array(SHARDS * 8);
  for (let i = 0; i < SHARDS; i++) {
    const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    rnd[i * 8] = Math.random(); // delay
    rnd[i * 8 + 1] = d.x;
    rnd[i * 8 + 2] = d.y;
    rnd[i * 8 + 3] = d.z;
    rnd[i * 8 + 4] = Math.random(); // size factor
    rnd[i * 8 + 5] = Math.random(); // swirl factor
    const t = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    rnd[i * 8 + 6] = Math.atan2(t.z, t.x);
    rnd[i * 8 + 7] = Math.acos(t.y);
  }

  function place(L: ShardLayout, i: number, rot: number, time: number, outP: THREE.Vector3, outQ: THREE.Quaternion) {
    outP.fromArray(L.pos, i * 3);
    outQ.fromArray(L.quat, i * 4);
    const spin = L.spin[i];
    if (spin !== 0) {
      _axis.fromArray(L.axis, i * 3);
      _qR.setFromAxisAngle(_axis, spin * time);
      const px = L.pivot[i * 3];
      const py = L.pivot[i * 3 + 1];
      const pz = L.pivot[i * 3 + 2];
      outP.set(outP.x - px, outP.y - py, outP.z - pz).applyQuaternion(_qR);
      outP.set(outP.x + px, outP.y + py, outP.z + pz);
      outQ.premultiply(_qR);
    }
    if (rot !== 0) {
      _qR.setFromAxisAngle(_Y, rot);
      outP.applyQuaternion(_qR);
      outQ.premultiply(_qR);
    }
  }

  function update(o: {
    from: number;
    to: number;
    mix: number;
    rotFrom: number;
    rotTo: number;
    turb: number;
    time: number;
    intro: number;
    emph: Emphasis;
  }) {
    const A = layouts[o.from];
    const B = layouts[o.to];
    const cA = linCols[o.from];
    const cB = linCols[o.to];
    for (let i = 0; i < SHARDS; i++) {
      const d = rnd[i * 8];
      let m = Math.min(1, Math.max(0, (o.mix - d * 0.42) / 0.58));
      m = m * m * (3 - 2 * m);
      const bell = Math.sin(Math.PI * m);

      place(A, i, o.rotFrom, o.time, _pA, _qA);
      place(B, i, o.rotTo, o.time, _pB, _qB);
      _pA.lerp(_pB, m);
      _qA.slerp(_qB, m);

      if (bell > 0.0001) {
        const k = bell * o.turb * (0.45 + rnd[i * 8 + 4] * 0.9);
        _pA.x += rnd[i * 8 + 1] * k;
        _pA.y += rnd[i * 8 + 2] * k;
        _pA.z += rnd[i * 8 + 3] * k;
        _qR.setFromAxisAngle(_Y, bell * o.turb * 0.22 * (0.4 + rnd[i * 8 + 5]));
        _pA.applyQuaternion(_qR);
        // 翻滚
        const th = rnd[i * 8 + 6];
        const ph = rnd[i * 8 + 7];
        _axis.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        _qT.setFromAxisAngle(_axis, bell * (2.2 + o.turb * 0.6));
        _qA.premultiply(_qT);
      }

      const [eSa, eDa] = o.emph(o.from, A.group[i]);
      const [eSb, eDb] = o.emph(o.to, B.group[i]);
      const es = eSa + (eSb - eSa) * m;
      const ed = eDa + (eDb - eDa) * m;

      // 开场
      let intro = Math.min(1, Math.max(0, (o.intro - d * 0.55) / 0.45));
      intro = 1 - Math.pow(1 - intro, 3);
      if (intro < 1) {
        const far = 26 + 16 * rnd[i * 8 + 4];
        _pB.set(rnd[i * 8 + 1] * far, rnd[i * 8 + 2] * far, rnd[i * 8 + 3] * far);
        _pA.lerp(_pB, 1 - intro);
      }

      _s.set(
        A.scl[i * 3] + (B.scl[i * 3] - A.scl[i * 3]) * m,
        A.scl[i * 3 + 1] + (B.scl[i * 3 + 1] - A.scl[i * 3 + 1]) * m,
        A.scl[i * 3 + 2] + (B.scl[i * 3 + 2] - A.scl[i * 3 + 2]) * m,
      ).multiplyScalar(es * intro);
      _m.compose(_pA, _qA, _s);
      mesh.setMatrixAt(i, _m);

      _c.setRGB(
        cA[i * 3] + (cB[i * 3] - cA[i * 3]) * m,
        cA[i * 3 + 1] + (cB[i * 3 + 1] - cA[i * 3 + 1]) * m,
        cA[i * 3 + 2] + (cB[i * 3 + 2] - cA[i * 3 + 2]) * m,
      );
      if (ed > 0) _c.lerp(FADE, ed);
      mesh.setColorAt(i, _c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
  }

  return { mesh, update };
}
