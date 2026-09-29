// 世界观独立页面使用的站点光标：与首页 public/app.js 中 setupCursor 的表现一致，
// 但每次指针移动都会重新读取 data-cursor，以支持 WebGL 场景动态切换光标状态。

const LABELS: Record<string, string> = {
  OPEN: "OPEN",
  ENTER: "↗",
  BACK: "←",
  HOME: "↑",
  UP: "↑",
  CLOSE: "×",
  PREV: "←",
  NEXT: "→",
  DOWN: "↓",
  SWITCH: "↔"
};

export function setupSiteCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const cursor = document.querySelector<HTMLElement>("#cursor");
  const label = cursor?.querySelector("span");
  if (!cursor || !label) return;

  let x = 0;
  let y = 0;
  let mode = "";

  const apply = (source: Element | null) => {
    const target = source?.closest<HTMLElement>("[data-cursor]") ?? null;
    const next = target?.dataset.cursor ?? "";
    if (next === mode) return;
    mode = next;
    cursor.classList.toggle("is-active", Boolean(mode));
    if (mode) cursor.dataset.mode = mode;
    else delete cursor.dataset.mode;
    label.textContent = LABELS[mode] ?? "";
    if (mode === "DRAG") {
      cursor.style.setProperty("--drag-frame-width", "2.6rem");
      cursor.style.setProperty("--drag-frame-height", "1.35rem");
    } else {
      cursor.style.removeProperty("--drag-frame-width");
      cursor.style.removeProperty("--drag-frame-height");
    }
  };

  const refresh = () => apply(document.elementFromPoint(x, y));

  window.addEventListener(
    "pointermove",
    (event) => {
      x = event.clientX;
      y = event.clientY;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.classList.add("is-visible");
      refresh();
    },
    { passive: true }
  );
  document.addEventListener("kb:cursor-refresh", refresh);
  document.addEventListener("focusin", (event) => apply(event.target as Element));
  document.documentElement.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
  window.addEventListener("blur", () => cursor.classList.remove("is-visible"));
}
