// 阅读页末尾的番外入口：与一纸空文的目录一样，点开时交接层从这一行展开成整屏，标题飞到中央，再跳到番外页
import { HandoffLayer, leave, reducedMotion } from "./handoff";

const PAPER = "#f1eadf";

export function setupExtraLinks() {
  const rows = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-extra-row]"));
  const layer = HandoffLayer.find();
  if (!rows.length || !layer) return;
  // 交接层平时装着本篇的标题（返回首页时要用），展开番外时临时换掉，回到本页再换回来
  const own = { title: document.querySelector("[data-handoff-target]")?.textContent ?? "", kind: layer.el.dataset.kind, theme: layer.el.dataset.theme };
  let leaving = false;

  rows.forEach((row) => {
    row.addEventListener("click", async (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (leaving) return;
      leaving = true;
      const title = row.dataset.title ?? "";
      const theme = row.dataset.theme || undefined;
      leave(row.href, { from: "fiction", kind: "fiction", theme, title, path: location.pathname });
      if (reducedMotion()) {
        location.assign(row.href);
        return;
      }
      const cs = getComputedStyle(row);
      layer.configure({
        kind: "fiction",
        theme,
        title,
        fromColor: cs.getPropertyValue("--row-color").trim(),
        fromImage: cs.getPropertyValue("--row-cover").trim(),
      });
      const titleFrom = row.querySelector("h3")?.getBoundingClientRect() ?? null;
      row.classList.add("is-opening");
      await layer.expand({ rect: row.getBoundingClientRect(), titleFrom, titleColor: PAPER });
      if (leaving) location.assign(row.href);
    });
  });

  // 从番外页按浏览器后退回来（bfcache）：撤掉展开状态，交接层换回本篇
  window.addEventListener("pageshow", (event) => {
    if (!(event as PageTransitionEvent).persisted || !leaving) return;
    leaving = false;
    rows.forEach((row) => row.classList.remove("is-opening"));
    layer.hide();
    layer.configure({ kind: (own.kind as "fiction") ?? "fiction", theme: own.theme, title: own.title });
  });
}
