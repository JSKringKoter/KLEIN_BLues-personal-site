import { CORES, FACTIONS, WORLDS } from './data';

const STAT_LABELS = ['供能', '具现化', '技能概率', '技能效果'];

function bars(v: number) {
  return `<span class="uv-bars">${[1, 2, 3].map((k) => `<i class="${k <= v ? 'on' : ''}"></i>`).join('')}</span>`;
}

export function panelHTML(stage: number, id: string): string | null {
  if (stage === 1) {
    const c = CORES.find((x) => x.id === id);
    if (!c) return null;
    return `
      <div class="uv-panel-head" style="--c:${c.color}">
        <span class="uv-panel-kicker">核心 · CORE</span>
        <h3>${c.name}</h3>
        <span class="uv-panel-en">${c.en}</span>
      </div>
      <dl class="uv-panel-table">
        <div><dt>主要成分</dt><dd>${c.formula}</dd></div>
        <div><dt>次要成分</dt><dd>${c.minor}</dd></div>
        <div><dt>晶体结构</dt><dd>${c.lattice}</dd></div>
        <div><dt>首次发现</dt><dd>${c.origin}</dd></div>
        <div><dt>颜色形状</dt><dd>${c.shape}</dd></div>
      </dl>
      <div class="uv-panel-stats" style="--c:${c.color}">
        ${c.stats.map((v, k) => `<div><span>${STAT_LABELS[k]}</span>${bars(v)}</div>`).join('')}
      </div>
      <p class="uv-panel-desc">${c.desc}</p>`;
  }
  if (stage === 3) {
    const f = FACTIONS.find((x) => x.id === id);
    if (!f) return null;
    return `
      <div class="uv-panel-head" style="--c:${f.color}">
        <span class="uv-panel-kicker">阵营 · FACTION</span>
        <h3>${f.name}</h3>
        <span class="uv-panel-en">${f.en}</span>
      </div>
      <dl class="uv-panel-table">
        <div><dt>代表核心</dt><dd>${f.core}</dd></div>
      </dl>
      <ul class="uv-panel-list">${f.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      <p class="uv-panel-desc">${f.desc}</p>`;
  }
  if (stage === 4) {
    const w = WORLDS.find((x) => x.id === id);
    if (!w) return null;
    return `
      <div class="uv-panel-head" style="--c:${w.color}">
        <span class="uv-panel-kicker">平行世界 · PARALLEL WORLD</span>
        <h3 class="is-long">${w.name}</h3>
        <span class="uv-panel-en">${w.en}</span>
      </div>
      <p class="uv-panel-desc">${w.desc}</p>`;
  }
  return null;
}
