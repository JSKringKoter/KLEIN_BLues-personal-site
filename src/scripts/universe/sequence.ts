// 连续叙事轨道：整个站点只有一个标量 S（旅程位置），所有视觉都是 S 的函数。
// 轨道首尾相接——合界之后自然回到苍穹之核，进入下一个循环。

export type Segment =
  | { type: 'hold'; stage: number; len: number }
  | { type: 'morph'; from: number; to: number; len: number; turb: number };

export const SEGMENTS: Segment[] = [
  { type: 'hold', stage: 0, len: 0.9 },
  { type: 'morph', from: 0, to: 1, len: 1.1, turb: 1.2 },
  { type: 'hold', stage: 1, len: 1.0 },
  { type: 'morph', from: 1, to: 2, len: 1.2, turb: 1.6 },
  { type: 'hold', stage: 2, len: 5.5 },
  { type: 'morph', from: 2, to: 3, len: 1.3, turb: 1.8 },
  { type: 'hold', stage: 3, len: 1.1 },
  { type: 'morph', from: 3, to: 4, len: 1.2, turb: 1.3 },
  { type: 'hold', stage: 4, len: 1.1 },
  { type: 'morph', from: 4, to: 5, len: 1.5, turb: 4.2 },
  { type: 'hold', stage: 5, len: 1.1 },
  { type: 'morph', from: 5, to: 0, len: 1.5, turb: 2.4 },
];

const STARTS: number[] = [];
let acc = 0;
for (const s of SEGMENTS) {
  STARTS.push(acc);
  acc += s.len;
}
export const TOTAL = acc;

export interface TrackState {
  s: number; // 归一到 [0, TOTAL)
  seg: number;
  from: number;
  to: number;
  mix: number; // 形变进度 0..1（停留段为 0）
  local: number; // 停留段内进度 0..1（形变段为 0）
  turb: number;
  weights: number[]; // 各场景的在场程度
  dominant: number;
}

export const wrap = (s: number) => ((s % TOTAL) + TOTAL) % TOTAL;

export function evaluate(sRaw: number, out?: TrackState): TrackState {
  const s = wrap(sRaw);
  let i = SEGMENTS.length - 1;
  for (let k = 0; k < SEGMENTS.length; k++) {
    if (s < STARTS[k] + SEGMENTS[k].len) {
      i = k;
      break;
    }
  }
  const seg = SEGMENTS[i];
  const t = Math.min(1, Math.max(0, (s - STARTS[i]) / seg.len));
  const st: TrackState = out ?? { s: 0, seg: 0, from: 0, to: 0, mix: 0, local: 0, turb: 0, weights: [0, 0, 0, 0, 0, 0], dominant: 0 };
  st.s = s;
  st.seg = i;
  st.weights.fill(0);
  if (seg.type === 'hold') {
    st.from = st.to = seg.stage;
    st.mix = 0;
    st.local = t;
    st.turb = 0;
    st.weights[seg.stage] = 1;
    st.dominant = seg.stage;
  } else {
    st.from = seg.from;
    st.to = seg.to;
    st.mix = t;
    st.local = 0;
    st.turb = seg.turb;
    st.weights[seg.from] = 1 - t;
    st.weights[seg.to] = t;
    st.dominant = t < 0.5 ? seg.from : seg.to;
  }
  return st;
}

/** 场景的停留区间 [start, end) */
export function holdRange(stage: number): [number, number] {
  const i = SEGMENTS.findIndex((s) => s.type === 'hold' && s.stage === stage);
  return [STARTS[i], STARTS[i] + SEGMENTS[i].len];
}

/** 导航锚点：短场景取中点，纪年取起点附近 */
export function anchorOf(stage: number): number {
  const [a, b] = holdRange(stage);
  return stage === 2 ? a + 0.06 : (a + b) / 2;
}

/** 距离当前位置最近的休止点；形变段中按滚动方向倾向吸附 */
export function restTarget(sRaw: number, dir: number): number | null {
  const s = wrap(sRaw);
  const base = sRaw - s;
  const st = evaluate(s);
  const seg = SEGMENTS[st.seg];
  if (seg.type === 'hold') return null;
  const start = STARTS[st.seg];
  const end = start + seg.len;
  const threshold = dir > 0 ? 0.28 : dir < 0 ? 0.72 : 0.5;
  return base + (st.mix > threshold ? end + 0.02 : start - 0.02);
}

/** 从 from 到 to 在环形轨道上的最短位移 */
export function shortestDelta(from: number, to: number): number {
  let d = wrap(to) - wrap(from);
  if (d > TOTAL / 2) d -= TOTAL;
  if (d < -TOTAL / 2) d += TOTAL;
  return d;
}

export function nextAnchor(sRaw: number, dir: 1 | -1): number {
  const s = wrap(sRaw);
  const anchors = [0, 1, 2, 3, 4, 5].map(anchorOf).sort((a, b) => a - b);
  if (dir > 0) {
    const nxt = anchors.find((a) => a > s + 0.05);
    return sRaw + ((nxt ?? anchors[0] + TOTAL) - s);
  }
  const prv = [...anchors].reverse().find((a) => a < s - 0.05);
  return sRaw + ((prv ?? anchors[anchors.length - 1] - TOTAL) - s);
}
