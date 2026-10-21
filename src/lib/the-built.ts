// 《构界》游戏设计页（/worldbuildings/the-built/）的数据类型与渲染辅助：
// 武器数据在 src/data/the-built/weapons.json（由武器概念设计 txt 整理而来，武器类型取自 docx 里武器名的颜色），
// 这里把数值与描述转成带图标的 HTML 片段（图标见 src/components/the-built/TbIcons.astro）。

export type WeaponType = "melee" | "bow" | "gun" | "skill";
export type StatKey = "C" | "D" | "A" | "L" | "RL" | "CD";

export interface Stat {
  k: StatKey;
  v: string;
  sub?: string;
}

export interface Block {
  label: string;
  text?: string;
  stats?: Stat[];
  notes?: string[];
}

export interface Weapon {
  id: string;
  vol: string;
  idx: number;
  name: string;
  type: WeaponType;
  quotes?: string[];
  tags?: string[];
  blocks: Block[];
  outro?: string;
}

export const VOLUMES = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];

export const TYPES: Record<WeaponType, { name: string; en: string; color: string; use: string }> = {
  melee: { name: "近战", en: "MELEE", color: "#c4473a", use: "不耗能量，靠连击段数打出效果" },
  bow: { name: "弓弩", en: "BOW", color: "#1f8fbf", use: "每发消耗少量能量，蓄力后有额外效果" },
  gun: { name: "枪械", en: "FIREARM", color: "#3b8a52", use: "按弹匣消耗能量，需要换弹" },
  skill: { name: "技能", en: "SKILL", color: "#7448a8", use: "消耗能量，有冷却时间" },
};

export const STATS: Record<StatKey, { name: string; en: string }> = {
  D: { name: "伤害", en: "DAMAGE" },
  A: { name: "暴击率", en: "CRIT" },
  C: { name: "能量消耗", en: "COST" },
  CD: { name: "冷却", en: "COOLDOWN" },
  L: { name: "弹匣", en: "MAGAZINE" },
  RL: { name: "换弹", en: "RELOAD" },
};

export const TAGS: Record<string, { icon: string; note: string }> = {
  双槽: { icon: "tag-dual", note: "双槽武器：同时占用两个武器栏" },
  消耗型: { icon: "tag-consume", note: "消耗型：使用后消失" },
  一次性: { icon: "tag-once", note: "一次性技能" },
};

const STATUS: Record<string, string> = {
  灼烧: "burn",
  中毒: "poison",
  流血: "bleed",
  冰冻: "freeze",
  眩晕: "stun",
  沉默: "silence",
  禁锢: "bind",
  石化: "petrify",
  时停: "timestop",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const icon = (id: string, cls = "") => `<svg class="tb-i${cls ? " " + cls : ""}" aria-hidden="true"><use href="#tb-${id}"></use></svg>`;

const RICH =
  /(灼烧|中毒|流血|冰冻|眩晕|沉默|禁锢|石化|时停)(?:（([ⅠⅡⅢⅣ]?)\/?([\d.]+)?秒?）)?|(\d+(?:\.\d+)?)（(\d+(?:\.\d+)?)）|(\d+(?:\.\d+)?%)|(\d+(?:\.\d+)?)秒/g;

/** 描述文字：状态效果变成带图标的标签，「普通（暴击）」两档伤害、百分比与秒数加重 */
export function richText(s: string) {
  return esc(s).replace(RICH, (m, st, lv, dur, a, b, pct, sec) => {
    if (st) {
      const extra = (lv ? ` <b>${lv}</b>` : "") + (dur ? `<span>${dur}s</span>` : "");
      return `<span class="tb-st tb-st--${STATUS[st]}">${icon("st-" + STATUS[st])}${st}${extra}</span>`;
    }
    if (a) return `<span class="tb-dmg">${a}<i>${b}</i></span>`;
    if (pct) return `<b class="tb-num">${pct}</b>`;
    if (sec) return `<b class="tb-num">${sec}</b>秒`;
    return m;
  });
}

/** 数值：暴击伤害用强调色，「×8」「/弹匣」「s」等写法统一 */
export function statValue(st: Stat) {
  let v = esc(st.v.trim());
  if (!v || v === "-") return `<span class="tb-none">—</span>`;
  v = v
    .replace(/([\d.~？?]+)（([^）]+)）/g, `$1<i class="tb-crit">$2</i>`)
    .replace(/\*(\d+)/g, `<em>×$1</em>`)
    .replace(/\*/g, "×")
    .replace(/(\d)秒/g, "$1s")
    .replace(/\/(弹匣|发|秒)/g, `<small>/$1</small>`)
    .replace(/(\d)发$/, "$1<small>发</small>");
  return v;
}

const num = (s: string) => {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)(?:%|秒)?$/);
  return m ? Number(m[1]) : null;
};

/** 暴击率：一圈刻度环，按百分比填满 */
function critGauge(v: string) {
  const p = num(v);
  if (p === null) return icon("crit");
  return `<svg class="tb-i tb-gauge" viewBox="0 0 24 24" aria-hidden="true"><circle class="bg" cx="12" cy="12" r="8.5"/><circle class="fg" cx="12" cy="12" r="8.5" pathLength="100" stroke-dasharray="${Math.min(100, p)} 100" transform="rotate(-90 12 12)"/><circle class="pip" cx="12" cy="12" r="2"/></svg>`;
}

/** 冷却：扇形时钟，冷却越长扇形越满（两分钟封顶） */
function cdPie(v: string) {
  const s = num(v);
  if (s === null) return icon("cd");
  const f = Math.max(0.04, Math.min(1, s / 120));
  const a = f * Math.PI * 2;
  const x = 12 + 8.5 * Math.sin(a);
  const y = 12 - 8.5 * Math.cos(a);
  const sector = f >= 0.999 ? `<circle class="fill" cx="12" cy="12" r="8.5"/>` : `<path class="fill" d="M12 12V3.5A8.5 8.5 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z"/>`;
  return `<svg class="tb-i tb-pie" viewBox="0 0 24 24" aria-hidden="true">${sector}<circle class="ring" cx="12" cy="12" r="8.5"/><path class="hand" d="M12 12V6.5"/></svg>`;
}

export function statIcon(st: Stat) {
  if (st.k === "A") return critGauge(st.v);
  if (st.k === "CD") return cdPie(st.v);
  return icon({ C: "energy", D: "damage", L: "mag", RL: "reload" }[st.k] ?? "energy");
}

const PRIORITY: StatKey[] = ["D", "A", "C", "CD", "L", "RL"];

/** 卡片上的数值徽章：取第一组数值，每种最多一个，按伤害、暴击、能量、冷却、弹匣、换弹排列 */
export function cardStats(w: Weapon, max = 4) {
  const first = w.blocks.find((b) => b.stats?.length)?.stats ?? [];
  const seen = new Set<StatKey>();
  const pick: Stat[] = [];
  for (const k of PRIORITY)
    for (const s of first)
      if (s.k === k && !seen.has(k)) {
        seen.add(k);
        pick.push(s);
      }
  return pick.slice(0, max);
}

/** 卡片上的一句话：优先用题记，否则取第一段描述 */
export function cardLine(w: Weapon) {
  if (w.quotes?.length) return { quote: true, text: w.quotes[0] };
  const t = w.blocks.find((b) => b.text)?.text ?? "";
  return { quote: false, text: t.length > 34 ? t.slice(0, 33) + "…" : t };
}

export function blockKind(label: string) {
  if (label === "被动" || /被动$/.test(label)) return /up/.test(label) ? "up" : "passive";
  if (label === "主动" || /主动$/.test(label) || label === "六朣断") return /up/.test(label) ? "up" : "active";
  if (/^Rank|up/.test(label)) return "up";
  if (label === "描述") return "desc";
  return "attack";
}

/** 六边形：中心 (cx, cy)、外接圆半径 r，尖角朝上 */
export function hexPoints(cx: number, cy: number, r: number, rot = -90) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i + rot) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
}

export const pts = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
