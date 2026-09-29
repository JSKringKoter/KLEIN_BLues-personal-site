# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

KLEIN BLues 个人作品站（https://www.kleinblues.site），Astro 静态站点（`output: "static"`，`build.format: "directory"`），部署在 Vercel。内容以中文为主：原创小说、未完成稿、技术笔记、世界观设定、人像画廊与摄影地图。

## 常用命令

```powershell
npm install
npm run dev        # 本地开发
npm run build      # = astro check && astro build，类型检查失败会导致构建失败
npm run preview    # 预览 dist/
npx astro check    # 仅做类型/模板检查
```

- 项目没有测试框架和 lint 配置，`astro check` 是唯一的静态校验。
- 若受限环境下 Astro 遥测无法写入用户目录，加上 `ASTRO_TELEMETRY_DISABLED=1`（Vercel 上不需要）。
- 旧站内容导入脚本（参数为旧站目录的绝对路径，会覆盖写入 `src/content/`）：
  - `npm run import:fiction -- "<旧站>\assets\text\finished"` → `src/content/fiction/`
  - `npm run import:drafts -- "<旧站>\assets\text\unfinished"` → `src/content/drafts/`
  - `npm run import:notes -- "<旧站根目录>"` → `src/content/notes/`（在 `vm` 沙箱中执行旧站的 `notion-notes.js` / `notion-content.js` / `legacy-notes.js` 来读取数据）
  - 作品的 slug、标题、主题等元数据硬编码在各脚本的 `works` 数组里。

## 架构：两套并存的运行时

这是一个“渐进迁移”中的项目，理解这一点最重要：

### 1. 首页 `src/pages/index.astro` —— 保留的旧站运行时
- **不使用** `BaseLayout`，自带完整的 `<html>`/SEO/JSON-LD，直接引用 `public/` 下的原始文件：`styles.css`、`worldbuildings.css`、`vendor/`（gsap、marked、katex）以及 `data.js`、`notion-notes.js`、`notion-content.js`、`legacy-notes.js`、`app.js`，全部为 `is:inline` 脚本。
- `public/app.js`（约 2500 行原生 JS）负责首页全部交互：启动动画、天气（open-meteo）、小说/笔记卡片与弹层阅读器、中国地图摄影集（`assets/maps/china-provinces.json`）、人像画廊等。数据来自全局变量 `window.SITE_DATA`、`window.NOTION_NOTES`、`window.NOTION_NOTE_CONTENT`、`window.LEGACY_NOTES`，并通过 `fetch` 读取 `public/assets/text/**.txt` 原文。
- `app.js` 中有「小说标题 → Astro 路由」的硬编码映射（如 `"深蓝": "/fiction/deep-blue/"`），笔记则跳转到 `/notes/${note.id}/`。**新增/改名作品时，需要同时更新 content collection、`app.js` 中的映射及 `public/*.js` 数据文件**，否则首页与独立页面会不一致。
- 资源用查询字符串做缓存破坏（如 `styles.css?v=71`、`app.js?v=66`），修改这些 public 文件后应递增版本号。同一文件会在多处引用，需一并修改：`styles.css`/`worldbuildings.css` 在 `index.astro` 与 `WorldLayout.astro` 中各引用一次，`app.js` 在 `index.astro` 与 `pages/worldbuildings/portraits.astro` 中各引用一次（目前后者仍是 `?v=65`，与首页不一致）。
- `app.js` 会请求 `/api/netease-track`，但本仓库中没有对应的 API 实现。

### 首页 3D 背景层 `src/scripts/world3d/`
- 基于 `three`，是首页唯一经 Astro/Vite 打包的脚本（`index.astro` 末尾的非 inline `<script>` 中 `import "../scripts/world3d"`），在旧运行时脚本之后加载。
- 首页唯一的 WebGL 画布 `#world3d`（`position: fixed`）由 `StageManager`（`manager.ts`）驱动：每帧选出视口中占比最大的 section 对应的 `Stage`，用 `clip-path` 把画布裁到该 section 的可见区域；离开所有注册的 section 或 `body.is-locked`（阅读器/查看器打开）时隐藏画布、不再渲染。
- 每个模块一个 `Stage`（实现 `resize/update/pointerDown/dispose`），目前只有 Hero 的 `sky/SkyStage`（天空穹顶 + 纸雕山峦 + 雨雪粒子）。后续模块照此新增并在 `index.ts` 中 `manager.add()`。
- 与旧运行时通过 DOM 事件通信：`app.js` 的 `applyWeatherTheme`/`resetWeatherTheme` 派发 `kb:weather { kind }`；天气配色参数集中在 `sky/presets.ts`，改 CSS 里的天气配色时要同步这里。
- 降级：只有第一帧渲染后 `<html>` 才会加上 `has-webgl`，`src/styles/world3d.css` 中的所有覆盖都以它为前提，因此无 WebGL 时原 CSS 背景照常工作。`?quality=off|low|mid|high` 可强制画质档位（`quality.ts`），无头浏览器/软件渲染默认会被判为 off。
- 支持 `prefers-reduced-motion`：此时不跑动画，仅在滚动/天气变化时重绘一帧。

### 2. 内容页面 —— Astro 原生
- Content collections 定义在 `src/content.config.ts`（glob loader + zod schema）：
  - `fiction` → `src/pages/fiction/[slug].astro` → `/fiction/[slug]/`
  - `drafts` → `src/pages/unfinished/[slug].astro` → `/unfinished/[slug]/`
  - `notes` → `src/pages/notes/[slug].astro` → `/notes/[slug]/`
  - slug 即 markdown 文件名。`fiction`/`drafts` 的 `theme` 是 zod enum，新主题需先在 schema 中添加，并在 CSS 中提供对应的 `theme-<name>` 样式。
- **小说正文不经 Markdown 渲染**：`[slug].astro` 取 `work.body`，交给 `src/lib/novel.ts` 的 `parseNovelDocument()` 自定义解析为 blocks（段落/空行/章节标题/宫商谱歌词）。解析时会跳过与标题重复的首行、去除署名/日期类落款（`footerPatterns`），`# 标题·English` 会拆成中英文，并对「猫屿咖啡屋」做特例处理。修改小说排版时应改这里，而不是写 Markdown 语法。
- 笔记则走标准 `render()` Markdown 渲染，客户端用 KaTeX auto-render 渲染公式。
- `src/layouts/BaseLayout.astro`：通用 SEO/OG 元数据、自定义光标（任何带 `data-cursor="LABEL"` 的元素悬停时显示标签）、`src/styles/global.css`。可通过 `stylesheets` prop 额外引入 public 下的 CSS。
- 世界观页面（`/worldbuildings/cangqiong/`、`/worldbuildings/portraits/`）使用 `WorldLayout.astro`，样式在 `public/worldbuildings.css`；人像画廊页复用 `public/app.js` 中的画廊运行时，组件在 `PortraitGallery.astro`、`ImageViewer.astro`。首页的世界观入口卡片在 `WorldbuildingEntries.astro`。
- `/worldbuildings/cangqiong/` 是《苍穹》三维交互设定站：组件 `src/components/Universe.astro`（`embedded` 模式下隐藏自带标识），运行时在 `src/scripts/universe/`（设定文字集中在 `data.ts`）。该页的站点光标由 `src/scripts/site-cursor.ts` 驱动，与 `app.js` 的 `setupCursor` 外观一致，但每次移动都重新读取 `data-cursor`；三维场景悬停/拖拽时会在根元素上动态写入 `data-cursor` 并派发 `kb:cursor-refresh`。

## 其他约定

- 所有图片、地图数据与首页媒体都放在 `public/assets/`，frontmatter 中的 `cover` 等使用以 `/assets/...` 开头的绝对路径。
- sitemap 由 `@astrojs/sitemap` 自动生成，依赖 `astro.config.mjs` 中的 `site`。
- 迁移目标是在保持视觉与交互一致的前提下，逐个组件从 `public/app.js` 迁到 Astro；改动首页时优先保证与现有效果一致。
