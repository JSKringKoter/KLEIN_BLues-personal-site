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
- 资源用查询字符串做缓存破坏（如 `styles.css?v=71`、`app.js?v=68`），修改这些 public 文件后应递增版本号。同一文件会在多处引用，需一并修改：`styles.css`/`worldbuildings.css` 在 `index.astro` 与 `WorldLayout.astro` 中各引用一次，`app.js` 在 `index.astro` 与 `pages/worldbuildings/portraits.astro` 中各引用一次。
- 开屏动画（`animateEntrance`）每个会话只播一次：`sessionStorage["kb-booted"]`，`index.astro` 头部脚本据此给 `<html>` 加 `kb-seen`（隐藏开屏幕布、跳过首屏镜头推进）。
- `app.js` 会请求 `/api/netease-track`，但本仓库中没有对应的 API 实现。

### 首页舞台 `src/scripts/stage/`（取代了旧的 world3d/index.ts）
- 整页一张 WebGL 画布 + 一条滚动时间线：`director.ts` 把每个模块（`data-stage` 轨道）映射为一段「停留」，模块之间的 `.stage-band` 是「形变」段（`bridge.ts` 溶解合成 + 粒子搭桥），滚动位置驱动一切，所以往回滚时形变会倒放。
- `snap.ts`：整页吸附。滚轮/触控/方向键一次走一格，缓动滑到 `director.snapPoints()`（首屏顶部、各模块停留区间中点、「关于」顶部）；「关于」之后恢复原生滚动；`html.kb-hold`/`kb-reading`/`body.is-locked` 时不接管。页内 `#锚点` 也走同一套动画。
- 模块：首屏 `hero.ts`（包装 world3d 的 SkyStage）、一纸空文（`DomModule`，内容是旧站的目录 + 预览卡，由 `app.js` 的 `renderNovels` 渲染）、世界观 `worlds/worlds.ts`（`DomModule`，两张静态 SVG 蓝图线稿，线稿在构建时由 `worlds/linework.ts` 投影生成）、画中人 `portraits/portraits.ts`（全息卡桌，`/worldbuildings/portraits/` 通过 `scripts/pages/characters.ts` 复用同一个类）、随笔 `notes/notes.ts`、其余为 `PaperModule` 占位。
- `DomModule`（`paper.ts`）：画布上不画东西；形变粒子落在叠层中带 `data-sample="颜色"` 的元素上。
- 光标：三维对象要显示图片的四角框时，用一个带 `data-cursor="IMAGE"` 的代理 DOM（如 `.pt-frame`）贴在其屏幕外接矩形上，移动时派发 `kb:cursor-frame`，目标切换时派发 `kb:cursor-refresh`。
- 离场/返回：世界观点击后写 `sessionStorage["kb-veil"]`（值为 WorldLayout 的 variant），落地页用同色幕布接住过渡；从子页面经 `/#xxx` 链接或浏览器后退回来时，`director.arrive()` 撤销各模块的离场状态并播放 `kb-arrive` 入场。
- `src/scripts/world3d/` 仍提供 SkyStage、画质检测（`?quality=off|low|mid|high`）与天气预设；天气通过 `kb:weather { kind }` 事件从 `app.js` 传入。

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
