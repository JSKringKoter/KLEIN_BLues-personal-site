// 纪年轴：年份 ↔ 世界坐标 x 的映射，以及三条航线的空间曲线
import { EVENTS, type Route } from './data';
import { smooth } from './rand';

export const X_MIN = -34;
export const X_MAX = 34;
const Y0 = 2230;
const Y1 = 3600;

const YEARS = Array.from(new Set(EVENTS.map((e) => e.year))).sort((a, b) => a - b);
// 线性时间与「事件序号」混合，避免事件密集处挤在一起
const KNOTS = YEARS.map((y, i) => X_MIN + (X_MAX - X_MIN) * (0.3 * (y - Y0) / (Y1 - Y0) + 0.7 * (i / (YEARS.length - 1))));

export function yearToX(year: number): number {
  if (year <= YEARS[0]) return KNOTS[0] + (year - YEARS[0]) * 0.05;
  const n = YEARS.length - 1;
  if (year >= YEARS[n]) return KNOTS[n] + (year - YEARS[n]) * 0.05;
  let i = 0;
  while (YEARS[i + 1] < year) i++;
  const t = (year - YEARS[i]) / (YEARS[i + 1] - YEARS[i]);
  return KNOTS[i] + (KNOTS[i + 1] - KNOTS[i]) * t;
}

export function xToYear(x: number): number {
  if (x <= KNOTS[0]) return YEARS[0];
  const n = KNOTS.length - 1;
  if (x >= KNOTS[n]) return YEARS[n];
  let i = 0;
  while (KNOTS[i + 1] < x) i++;
  const t = (x - KNOTS[i]) / (KNOTS[i + 1] - KNOTS[i]);
  return YEARS[i] + (YEARS[i + 1] - YEARS[i]) * t;
}

const XS = yearToX(2230);
const XD = yearToX(2262);
const XM = yearToX(3099);
const XJ = yearToX(3102);
export const X_JOIN = XJ;

/** 两条航线分离的程度：出发时重合，3102 年重逢 */
export function separation(x: number): number {
  return smooth(XS, XD, x) * (1 - smooth(XM - 0.6, XJ + 0.2, x));
}

export function strandPoint(route: Route, x: number, out: [number, number, number]): [number, number, number] {
  const s = separation(x);
  const wob = 0.28 * Math.sin(x * 0.5);
  if (route === 'wide') {
    out[0] = x;
    out[1] = 1.3 * s + wob;
    out[2] = 0.9 * s * Math.sin(x * 0.23);
  } else if (route === 'tear') {
    out[0] = x;
    out[1] = -1.3 * s + wob * (1 - s * 0.4);
    out[2] = -0.9 * s * Math.sin(x * 0.23 + 0.8);
  } else {
    out[0] = x;
    out[1] = wob;
    out[2] = 0;
  }
  return out;
}
