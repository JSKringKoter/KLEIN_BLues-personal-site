// 内容页（小说、未尽之稿、随笔）的接力：
// 落地——交接层的标题飞到页面真实的标题上，底色淡出，正文各部分依次升起；
// 返回——带 data-handoff-back 的链接：正文沉下，标题飞回中央、底色铺满，再回到首页由对应场景接住。
import { HandoffLayer, incoming, leave, reducedMotion, settle, type HandoffFrom, type HandoffKind } from "./handoff";

export function setupPageHandoff() {
  const layer = HandoffLayer.find();
  const target = document.querySelector<HTMLElement>("[data-handoff-target]");
  if (!layer) return;
  const from = (layer.el.dataset.from || "home") as HandoffFrom;
  const kind = (layer.el.dataset.kind || "home") as HandoffKind;
  const theme = layer.el.dataset.theme || undefined;
  const html = document.documentElement;
  let busy = false;

  const arrive = async () => {
    busy = true;
    // 落地后入场动画由交接层代播，撤掉首帧状态时不能再重播一遍（否则标题落位后会闪一次）
    html.classList.add("kb-arrived");
    // 等两帧：字体与版面就位后再量标题的位置
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    html.classList.add("kb-handoff-reveal");
    await layer.land(target?.getBoundingClientRect() ?? null);
    // 标题落位：真实标题接替交接层
    if (target) target.style.visibility = "visible";
    layer.hide();
    // 正文的升起比标题慢，跑完再撤掉首帧状态（撤掉后各部分本来就在原位，不会跳）
    window.setTimeout(() => {
      settle();
      if (target) target.style.visibility = "";
      busy = false;
    }, 1000);
  };

  if (incoming() && html.classList.contains("kb-handoff-in")) {
    html.dataset.handoffClaimed = "1";
    arrive();
  }

  document.querySelectorAll<HTMLAnchorElement>("a[data-handoff-back]").forEach((a) => {
    a.addEventListener("click", async (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (busy) return;
      busy = true;
      const href = a.href;
      leave(href, { from, kind, theme, path: location.pathname, title: layer.title.textContent ?? "" });
      if (reducedMotion()) {
        location.assign(href);
        return;
      }
      const rect = target?.getBoundingClientRect() ?? null;
      const onScreen = rect && rect.bottom > 0 && rect.top < window.innerHeight ? rect : null;
      html.classList.add("kb-handoff-out");
      if (target) target.style.visibility = "hidden";
      await layer.lift(onScreen);
      location.assign(href);
    });
  });

  // 从首页按「后退」又回到这一页（bfcache）：撤掉离场状态
  window.addEventListener("pageshow", (event) => {
    if (!(event as PageTransitionEvent).persisted) return;
    busy = false;
    html.classList.remove("kb-handoff-out");
    if (target) target.style.visibility = "";
    settle();
    layer.hide();
  });
}
