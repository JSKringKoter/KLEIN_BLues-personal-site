// 《构界》游戏设计页的交互：页内目录高亮、秩序核心切换、武器图鉴的筛选 / 搜索 / 排序与详情抽屉。

export function mountTheBuilt(root: HTMLElement) {
  setupRail(root);
  setupOrders(root);
  setupReveal(root);
  setupArsenal(root);
}

/** 左侧目录：当前所在的章节高亮 */
function setupRail(root: HTMLElement) {
  const links = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-tb-nav]").forEach((a) => links.set(a.dataset.tbNav!, a));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a, id) => a.classList.toggle("is-on", id === e.target.id));
      }
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  root.querySelectorAll<HTMLElement>(".tb-sec[id]").forEach((s) => io.observe(s));
}

/** 章节进入视口时浮现（只播一次） */
function setupReveal(root: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const els = root.querySelectorAll<HTMLElement>(".tb-sec");
  root.classList.add("is-reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

/** 秩序核心：点六边形的一块或下方的按钮，切换右侧说明 */
function setupOrders(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>("[data-tb-orders]");
  if (!box) return;
  const tabs = Array.from(box.querySelectorAll<HTMLButtonElement>("[data-order-key]"));
  const select = (key: string, focus = false) => {
    box.dataset.order = key;
    tabs.forEach((t) => {
      const on = t.dataset.orderKey === key;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    box.querySelectorAll<HTMLElement>(".tb-opanel").forEach((p) => (p.hidden = p.id !== `opanel-${key}`));
    box.querySelectorAll<SVGElement>("[data-seg]").forEach((s) => s.classList.toggle("is-on", s.dataset.seg === key));
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t.dataset.orderKey!));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length].dataset.orderKey!, true);
    });
  });
  box.querySelectorAll<SVGElement>("[data-seg]").forEach((s) => s.addEventListener("click", () => select(s.dataset.seg!)));
  select(box.dataset.order ?? tabs[0].dataset.orderKey!);
}

/** 武器图鉴 */
function setupArsenal(root: HTMLElement) {
  const sec = root.querySelector<HTMLElement>("[data-tb-arsenal]");
  const grid = sec?.querySelector<HTMLElement>("[data-tb-grid]");
  if (!sec || !grid) return;
  const cards = Array.from(grid.querySelectorAll<HTMLElement>(".tb-card"));
  const search = sec.querySelector<HTMLInputElement>("[data-tb-search]");
  const sort = sec.querySelector<HTMLSelectElement>("[data-tb-sort]");
  const count = sec.querySelector<HTMLElement>("[data-tb-count]");
  const empty = sec.querySelector<HTMLElement>("[data-tb-empty]");
  const state = { type: "", vol: "", q: "", sort: "order" };

  const group = (attr: string, key: "type" | "vol") => {
    const btns = Array.from(sec.querySelectorAll<HTMLButtonElement>(`[${attr}]`));
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        state[key] = b.getAttribute(attr) ?? "";
        btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        apply();
      }),
    );
  };
  group("data-filter-type", "type");
  group("data-filter-vol", "vol");
  let timer = 0;
  search?.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.q = search.value.trim().toLowerCase();
      apply();
    }, 120);
  });
  sort?.addEventListener("change", () => {
    state.sort = sort.value;
    apply();
  });

  const num = (el: HTMLElement, k: string) => Number(el.dataset[k] ?? -1);
  let visible = cards;
  function apply() {
    const terms = state.q.split(/\s+/).filter(Boolean);
    visible = cards.filter((c) => (!state.type || c.dataset.type === state.type) && (!state.vol || c.dataset.vol === state.vol) && terms.every((t) => (c.dataset.q ?? "").includes(t)));
    const by: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
      order: (a, b) => num(a, "order") - num(b, "order"),
      dmg: (a, b) => num(b, "dmg") - num(a, "dmg") || num(a, "order") - num(b, "order"),
      crit: (a, b) => num(b, "crit") - num(a, "crit") || num(a, "order") - num(b, "order"),
      // 没有冷却的排到最后
      cd: (a, b) => (num(a, "cd") < 0 ? 1e9 : num(a, "cd")) - (num(b, "cd") < 0 ? 1e9 : num(b, "cd")) || num(a, "order") - num(b, "order"),
      name: (a, b) => (a.dataset.name ?? "").localeCompare(b.dataset.name ?? "", "zh-Hans-CN"),
    };
    visible.sort(by[state.sort] ?? by.order);
    const set = new Set(visible);
    cards.forEach((c) => (c.hidden = !set.has(c)));
    // 只在顺序真的变了时重排 DOM
    const now = Array.from(grid!.children);
    if (visible.some((c, i) => now.filter((x) => !(x as HTMLElement).hidden)[i] !== c)) {
      const frag = document.createDocumentFragment();
      visible.forEach((c) => frag.appendChild(c));
      cards.filter((c) => !set.has(c)).forEach((c) => frag.appendChild(c));
      grid!.appendChild(frag);
    }
    if (count) count.textContent = String(visible.length);
    if (empty) empty.hidden = visible.length > 0;
  }

  // 详情抽屉
  const drawer = root.ownerDocument.querySelector<HTMLDialogElement>("[data-tb-drawer]");
  const body = drawer?.querySelector<HTMLElement>("[data-tb-body]");
  const pos = drawer?.querySelector<HTMLElement>("[data-tb-pos]");
  if (!drawer || !body) return;
  let current: HTMLElement | null = null;
  let opener: HTMLElement | null = null;

  const show = (card: HTMLElement) => {
    const tpl = card.querySelector<HTMLTemplateElement>("template[data-tb-dossier]");
    if (!tpl) return;
    current = card;
    body.replaceChildren(tpl.content.cloneNode(true));
    body.scrollTop = 0;
    drawer.style.setProperty("--tc", card.style.getPropertyValue("--tc"));
    const i = visible.indexOf(card);
    if (pos) pos.textContent = `${String(i + 1).padStart(3, "0")} / ${String(visible.length).padStart(3, "0")}`;
  };
  const open = (card: HTMLElement) => {
    opener = card.querySelector<HTMLElement>("[data-tb-open]");
    show(card);
    if (!drawer.open) drawer.showModal();
    document.documentElement.classList.add("tb-drawer-open");
  };
  const close = () => {
    drawer.classList.add("is-closing");
    window.setTimeout(() => {
      drawer.classList.remove("is-closing");
      drawer.close();
    }, 260);
  };
  const step = (d: number) => {
    if (!current || !visible.length) return;
    const i = visible.indexOf(current);
    const next = visible[(i + d + visible.length) % visible.length];
    show(next);
    opener = next.querySelector<HTMLElement>("[data-tb-open]");
  };

  grid.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("[data-tb-open]");
    const card = btn?.closest<HTMLElement>(".tb-card");
    if (card) open(card);
  });
  drawer.querySelector("[data-tb-close]")?.addEventListener("click", close);
  drawer.querySelector("[data-tb-prev]")?.addEventListener("click", () => step(-1));
  drawer.querySelector("[data-tb-next]")?.addEventListener("click", () => step(1));
  // 点到抽屉外的遮罩处关闭
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) close();
  });
  drawer.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
  drawer.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  drawer.addEventListener("close", () => {
    document.documentElement.classList.remove("tb-drawer-open");
    opener?.focus({ preventScroll: true });
  });
}
