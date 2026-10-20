// 阅读页大标题永远单行：字号先按 CSS 的 clamp 给一个基准，超出容器宽度时按比例缩到恰好放下。
// 用 --title-size 写回，交接层的 FLIP 只比较标题高度，所以缩放不影响落位。
const MIN_SIZE = 1.6 * 16;

function fitOne(el: HTMLElement) {
  el.style.removeProperty("--title-size");
  const base = parseFloat(getComputedStyle(el).fontSize) || 0;
  if (!base) return;
  // 量文字本身的宽度（nowrap 下等于元素宽度），与可用的行宽比较
  const range = document.createRange();
  range.selectNodeContents(el);
  const need = range.getBoundingClientRect().width;
  const box = el.parentElement;
  const avail = box ? box.clientWidth : window.innerWidth;
  if (!need || !avail || need <= avail) return;
  const size = Math.max(MIN_SIZE, Math.floor(((base * avail) / need) * 9.8) / 10);
  el.style.setProperty("--title-size", `${size}px`);
}

export function setupTitleFit() {
  const titles = Array.from(document.querySelectorAll<HTMLElement>("[data-handoff-target]"));
  if (!titles.length) return;
  const run = () => titles.forEach(fitOne);
  run();
  document.fonts?.ready.then(run);
  let timer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 140);
  }, { passive: true });
}
