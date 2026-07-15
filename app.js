const data = window.SITE_DATA || { novels: [], paintings: [] };
const gsap = window.gsap || null;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const additionalPortraits = [
  { id: "p040", title: "圣诞快乐", group: "九日", src: "assets/images/jiuri/jiuri-14.png", width: 1672, height: 2508, ratio: "1672 / 2508" },
  { id: "p041", title: "圣诞快乐", group: "八月", src: "assets/images/bayue/bayue-27.png", width: 1672, height: 2508, ratio: "1672 / 2508" },
  { id: "p042", title: "初见与你", group: "卡布奇诺", src: "assets/images/cappuccino/cappuccino-01.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p043", title: "初见与晚秋", group: "卡布奇诺", src: "assets/images/cappuccino/cappuccino-02.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p044", title: "去时风", group: "卡布奇诺", src: "assets/images/cappuccino/cappuccino-03.png", width: 1856, height: 1280, ratio: "1856 / 1280" },
  { id: "p045", title: "沉馥", group: "卡布奇诺", src: "assets/images/cappuccino/cappuccino-04.png", width: 896, height: 1344, ratio: "896 / 1344" },
  { id: "p046", title: "行将近", group: "卡布奇诺", src: "assets/images/cappuccino/cappuccino-05.png", width: 1944, height: 2566, ratio: "1944 / 2566" },
  { id: "p047", title: "银杏与晚秋", group: "卡布奇诺", src: "assets/images/cappuccino/cappuccino-06.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p048", title: "斯通古堡的晚宴", group: "琉璃·斯通古", src: "assets/images/liuli-stonegu/liuli-01.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p049", title: "暮光曲", group: "琉璃·斯通古", src: "assets/images/liuli-stonegu/liuli-02.png", width: 2400, height: 1792, ratio: "2400 / 1792" },
  { id: "p050", title: "暮野梦", group: "琉璃·斯通古", src: "assets/images/liuli-stonegu/liuli-03.png", width: 2560, height: 3840, ratio: "2560 / 3840" },
  { id: "p051", title: "紫罗兰与白日梦", group: "琉璃·斯通古", src: "assets/images/liuli-stonegu/liuli-04.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p052", title: "喵步城市中·南京", group: "九日", src: "assets/images/jiuri/jiuri-15.png", width: 2000, height: 2670, ratio: "2000 / 2670" },
  { id: "p053", title: "冬雪", group: "八月", src: "assets/images/bayue/bayue-28.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p054", title: "喵步城市中·伊犁", group: "八月", src: "assets/images/bayue/bayue-29.png", width: 2000, height: 2670, ratio: "2000 / 2670" },
  { id: "p055", title: "喵步城市中·南京", group: "八月", src: "assets/images/bayue/bayue-30.png", width: 2000, height: 2670, ratio: "2000 / 2670" },
  { id: "p056", title: "夏日的呢喃", group: "欧姆", src: "assets/images/ohm/ohm-01.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p057", title: "春花", group: "欧姆", src: "assets/images/ohm/ohm-02.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p058", title: "问雪", group: "欧姆", src: "assets/images/ohm/ohm-03.png", width: 896, height: 1344, ratio: "896 / 1344" },
  { id: "p059", title: "雪后残阳", group: "欧姆", src: "assets/images/ohm/ohm-04.png", width: 1280, height: 1856, ratio: "1280 / 1856" },
  { id: "p060", title: "尘埃深处", group: "羽梦", src: "assets/images/yumeng/yumeng-01.png", width: 1672, height: 2508, ratio: "1672 / 2508" },
  { id: "p061", title: "彼岸之冬", group: "铃·克里斯汀", src: "assets/images/ling-christine/ling-christine-01.png", width: 1280, height: 1856, ratio: "1280 / 1856" }
];
const allPaintings = [...data.paintings, ...additionalPortraits];
const localUnfinishedNovels = [
  { id: "u01", title: "且听风雪", subtitle: "未尽之稿 · KLEIN BLues", charCount: 1155, textSrc: "assets/text/unfinished/qieting-fengxue.txt?v=2", cover: "assets/images/novel-covers/qieting-fengxue.svg", excerpt: "铺开纸笔，墨水饱蘸，本想就此落笔，你却犹豫了。窗外初雪纷飞，旧信与思念都被封存在同一个寒冬。", publication: [{ label: "写于", value: "2022.10.06" }, { label: "文档更新", value: "2026.05.27" }] },
  { id: "u02", title: "南城往事", subtitle: "未尽之稿 · KLEIN BLues", charCount: 391, textSrc: "assets/text/unfinished/nancheng-wangshi.txt?v=2", cover: "assets/images/novel-covers/nancheng-wangshi.svg", excerpt: "太阳晒着港口，运河是绿的。繁华的南城巷在雨幕里一闪而过，只剩破败小楼与一盏没有熄灭的烛。", publication: [{ label: "文档更新", value: "2026.05.27" }] },
  { id: "u03", title: "尘埃深处", subtitle: "天空之梦 · 未尽 · KLEIN BLues", charCount: 26978, textSrc: "assets/text/unfinished/chenai-shenchu.txt?v=2", cover: "assets/images/novel-covers/chenai-shenchu.svg", excerpt: "在没有四季、没有生命的荒漠星球 EHIS-4，人们早已忘记地球与秋天。一点意外出现的生机，却让细雨重新有了可能。", publication: [{ label: "最近修改", value: "2026.07.13" }] },
  { id: "u04", title: "猫屿咖啡屋", subtitle: "未尽之稿 · KLEIN BLues", charCount: 30853, textSrc: "assets/text/unfinished/maoyu-kafeiwu.txt?v=2", cover: "assets/images/novel-covers/maoyu-kafeiwu.svg", excerpt: "旧城还留着最后一口气。那个金黄色的秋天，湖边、雨声与一位有着卡其色长发和猫耳的女孩，共同留下了一间咖啡屋的故事。", publication: [{ label: "最近修改", value: "2026.07.13" }] }
];
const unfinishedNovels = [...localUnfinishedNovels, ...(Array.isArray(data.unfinishedNovels) ? data.unfinishedNovels : [])];
const completedNovelOrder = ["深蓝", "白鸟之泪", "彼岸之冬", "空箱", "山海行人", "黄昏的魔术师", "永远的铁道"];
const completedNovelCovers = {
  "深蓝": "assets/images/novel-covers/deep-blue.jpg",
  "白鸟之泪": "assets/images/novel-covers/white-bird.jpg",
  "彼岸之冬": "assets/images/novel-covers/winter-shore.jpg",
  "空箱": "assets/images/novel-covers/empty-box.jpg",
  "山海行人": "assets/images/novel-covers/mountain-sea.jpg",
  "黄昏的魔术师": "assets/images/novel-covers/twilight-magician.svg",
  "永远的铁道": "assets/images/novel-covers/eternal-railway.jpg"
};
const completedNovelExcerpts = {
  "深蓝": "在北境漫长的极夜里，一位失去记忆的钢琴家与新来的邻居反复相识。未完成的乐曲、被遗忘的约定，以及海岸尽头的深蓝，逐渐拼回一段不愿消失的过去。",
  "白鸟之泪": "持续不断的高原雨季困住了一名白鸟观察者，也让他走近草原上的少年与脆弱的候鸟栖地。当保护与掠夺正面相遇，洁白的羽翼成为信念、牺牲与遗忘的见证。",
  "彼岸之冬": "一颗水仙块茎牵引柯尔利特回到被风雪封存的小镇。教堂、温泉与名为铃的少女在错位的记忆中重现，迫使他面对一场多年以前未曾伸手阻止的灾难。",
  "空箱": "阁楼里的一只嫁妆箱保存着一名女子从少女时代到命运倾覆的全部痕迹。织物、钥匙与逐渐被取空的嫁妆，共同讲述一段被生活耗尽、又被后人轻易抹去的人生。",
  "山海行人": "被家庭遗落的少年在山间遇见一位无人供奉的小神。花茶、竹笛与长明的香火陪伴他们走过短暂岁月，而现代生活的到来，也让神明面对被世人彻底忘却的命运。",
  "黄昏的魔术师": "失意的旅人在斯通古城外遇见继承父亲旧梦的少女。一次筹备于麦田与落日之间的魔术表演，让两个人重新理解离别、承诺，以及平凡生活中仍然存在的奇迹。",
  "永远的铁道": "一条从未迎来列车的铁路穿过常年落雪的小镇。枫与神秘少女白沿着铁轨寻找它的终点，也在现实与时间的缝隙里，追逐一班只为真正想要离开的人停靠的列车。"
};
const completedNovelSubtitles = {
  "山海行人": "The Demigod of Mountain and Sea · KLEIN BLues",
  "永远的铁道": "The Permafrozen Railway · KLEIN BLues"
};
const completedNovelSources = {
  "深蓝": { textSrc: "assets/text/finished/deep-blue.txt?v=2", charCount: 20171, publication: [{ label: "完成", value: "2025.04.21—04.27" }, { label: "第一次修改", value: "2025.05.01" }, { label: "文档更新", value: "2026.07.13" }] },
  "白鸟之泪": { textSrc: "assets/text/finished/white-bird.txt?v=2", charCount: 4067, publication: [{ label: "完成", value: "2026.05.28" }, { label: "文档更新", value: "2026.07.13" }] },
  "彼岸之冬": { textSrc: "assets/text/finished/winter-shore.txt?v=2", charCount: 23477, publication: [{ label: "文档更新", value: "2026.07.13" }] },
  "空箱": { textSrc: "assets/text/finished/empty-box.txt?v=2", charCount: 2675, publication: [{ label: "成稿", value: "2023.08.29" }, { label: "文档更新", value: "2026.07.13" }] },
  "山海行人": { textSrc: "assets/text/finished/mountain-sea.txt?v=2", charCount: 4883, publication: [{ label: "成稿", value: "2023.07.23" }] },
  "黄昏的魔术师": { textSrc: "assets/text/finished/twilight-magician.txt?v=2", charCount: 8693, publication: [{ label: "成稿", value: "2023.09.12" }, { label: "修订", value: "2023.09.18" }, { label: "文档更新", value: "2026.07.13" }] },
  "永远的铁道": { textSrc: "assets/text/finished/eternal-railway.txt?v=2", charCount: 5009, publication: [{ label: "成稿", value: "2023.01.25" }] }
};
const completedNovels = [
  ...completedNovelOrder.map((title) => data.novels.find((novel) => novel.title === title)).filter(Boolean),
  ...data.novels.filter((novel) => !completedNovelOrder.includes(novel.title))
].map((novel) => ({
  ...novel,
  ...(completedNovelSources[novel.title] || {}),
  cover: completedNovelCovers[novel.title] || "",
  excerpt: completedNovelExcerpts[novel.title] || novel.excerpt || "",
  subtitle: completedNovelSubtitles[novel.title] || novel.subtitle || "Original fiction · KLEIN BLues"
}));

const app = document.querySelector("#app");
const masthead = document.querySelector("#masthead");
const reader = document.querySelector("#reader");
const noteReader = document.querySelector("#noteReader");
const viewer = document.querySelector("#viewer");

const storyColors = ["#1746d1", "#d84c2f", "#2e6659", "#8a5c28", "#633e6b", "#283f66", "#171715"];
const viewerColorCache = new Map();
const photoWorks = [
  { id: "ph01", title: "云际", src: "./assets/images/photography/yunji.jpg", thumb: "./assets/images/photography/yunji-thumb.jpg", width: 3072, height: 4080, group: "沈阳 · 中国", color: "#526b82", exif: { coordinates: "中国 · 沈阳", camera: "Vivo X300 Pro", lens: "516 mm", exposure: "f/2.67 · 1/100 s · ISO 109 · EV 0", captured: "2026.05.07" } },
  { id: "ph02", title: "前路", note: "出发，然后再次出发", src: "./assets/images/photography/qianlu.jpg", thumb: "./assets/images/photography/qianlu-thumb.jpg", width: 4080, height: 3072, group: "扬州 · 中国", color: "#5f6259", exif: { coordinates: "中国 · 扬州", camera: "Vivo X300 Pro", lens: "200 mm", exposure: "f/2.67 · 1/113 s · ISO 50 · EV 0", captured: "2026.04.18" } },
  { id: "ph03", title: "华灯初上", src: "./assets/images/photography/huadeng-chushang.jpg", thumb: "./assets/images/photography/huadeng-chushang-thumb.jpg", width: 3072, height: 4080, group: "南京 · 中国", color: "#735544", exif: { coordinates: "中国 · 南京", camera: "Vivo X300 Pro", lens: "85 mm", exposure: "f/2.67 · 1/238 s · ISO 50 · EV 0", captured: "2026.03.13" } },
  { id: "ph04", title: "人间清醒梦", note: "在中国最东边的小岛上，寻找最深邃的蓝。", src: "./assets/images/photography/renjian-qingxingmeng.jpg", thumb: "./assets/images/photography/renjian-qingxingmeng-thumb.jpg", width: 3072, height: 4096, group: "花鸟岛 · 浙江 · 中国", color: "#3f597d", exif: { coordinates: "中国 · 浙江 · 花鸟岛", camera: "Vivo X300 Pro", lens: "48 mm", exposure: "f/1.57 · 1/25 s · ISO 900 · EV 0", captured: "2026.05.03" } },
  { id: "ph05", title: "江山", note: "于长江畔。", src: "./assets/images/photography/jiangshan.jpg", thumb: "./assets/images/photography/jiangshan-thumb.jpg", width: 4080, height: 3072, group: "扬州 · 中国", color: "#8a7974", exif: { coordinates: "中国 · 扬州", camera: "Vivo X300 Pro", lens: "85 mm", exposure: "f/2.67 · 1/200 s · ISO 7863 · EV 0", captured: "2026.02.08" } }
];
const fallbackTechnicalNotes = [
  { id: "t01", category: "前端", title: "把网页动画留在合成层", date: "2026.06.18", read: "8 MIN", summary: "从一次滚动卡顿出发，整理 transform、opacity、布局抖动与图层提升之间真正值得记住的边界。", tags: ["Performance", "GSAP", "CSS"], code: "const frame = () => {\n  element.style.transform = `translate3d(0, ${offset}px, 0)`;\n  requestAnimationFrame(frame);\n};" },
  { id: "t02", category: "前端", title: "React 并发渲染中的状态优先级", date: "2026.05.27", read: "11 MIN", summary: "用搜索、筛选和昂贵列表渲染作为例子，区分立即反馈与可延迟更新，避免把所有优化都塞进 memo。", tags: ["React", "Concurrency", "UX"], code: "startTransition(() => {\n  setQuery(nextQuery);\n});\n\nconst visible = useDeferredValue(results);" },
  { id: "t03", category: "系统", title: "一次文件描述符泄漏的排查记录", date: "2026.05.09", read: "14 MIN", summary: "连接数缓慢攀升并不总是网络问题。记录从监控曲线、进程句柄到最小复现的完整诊断路径。", tags: ["Linux", "Observability", "Debug"], code: "lsof -p $PID | awk '{print $5}' | sort | uniq -c\ncat /proc/$PID/limits | grep 'open files'" },
  { id: "t04", category: "数据", title: "索引不是越多越好", date: "2026.04.21", read: "9 MIN", summary: "从执行计划看复合索引、选择性与写放大，顺便记录一次看似命中索引却依旧很慢的查询。", tags: ["PostgreSQL", "Index", "SQL"], code: "EXPLAIN (ANALYZE, BUFFERS)\nSELECT id, created_at\nFROM events\nWHERE tenant_id = $1\nORDER BY created_at DESC LIMIT 50;" },
  { id: "t05", category: "AI", title: "RAG 系统里最容易被忽略的召回评估", date: "2026.04.02", read: "12 MIN", summary: "回答质量下降时，先区分检索失败、排序失败和生成失败。没有分层指标，调提示词只是在碰运气。", tags: ["RAG", "Evaluation", "LLM"], code: "recall_at_k = relevant_in_top_k / relevant_total\nfaithfulness = supported_claims / all_claims" },
  { id: "t06", category: "工程", title: "让容器镜像真正可复现", date: "2026.03.16", read: "7 MIN", summary: "固定基础镜像摘要、隔离构建依赖、控制时间与包管理器缓存，让同一份源码在不同机器得到相同产物。", tags: ["Docker", "Build", "CI"], code: "FROM node:24-alpine@sha256:<digest> AS build\nRUN --mount=type=cache,target=/root/.npm npm ci" },
  { id: "t07", category: "前端", title: "容器查询之后，组件才真正响应式", date: "2026.02.28", read: "6 MIN", summary: "断点不必只属于视口。把卡片、侧栏和嵌入式组件的布局决策交还给它们所在的容器。", tags: ["CSS", "Container Query", "Layout"], code: ".card-shell { container-type: inline-size; }\n@container (width > 34rem) {\n  .card { grid-template-columns: 1fr 1fr; }\n}" },
  { id: "t08", category: "系统", title: "Rust 所有权不是语法障碍", date: "2026.02.03", read: "10 MIN", summary: "当所有权被理解为资源生命周期的静态证明，借用检查器给出的就不再是阻碍，而是设计反馈。", tags: ["Rust", "Ownership", "Memory"], code: "fn headline<'a>(post: &'a Post) -> &'a str {\n  post.title.as_str()\n}" },
  { id: "t09", category: "图形", title: "WebGL 中的一次色彩空间误判", date: "2026.01.19", read: "8 MIN", summary: "同一张纹理在设计稿与浏览器里颜色不同，问题可能并不在调色，而在采样、混合与输出编码。", tags: ["WebGL", "Color", "Shader"], code: "vec3 linear = pow(srgb, vec3(2.2));\nvec3 outputColor = pow(linear, vec3(1.0 / 2.2));" },
  { id: "t10", category: "工程", title: "把故障复盘写成可执行的改进", date: "2025.12.30", read: "13 MIN", summary: "好的复盘不寻找一个承担责任的人，而是识别哪些系统条件让错误得以发生，并为每项改进指定验证方式。", tags: ["Incident", "SRE", "Process"], code: "action_item = {\n  owner, deadline,\n  verification, rollback\n};" }
];
const baseTechnicalNotes = Array.isArray(window.NOTION_NOTES) && window.NOTION_NOTES.length
  ? window.NOTION_NOTES
  : fallbackTechnicalNotes;
const notionNoteContent = window.NOTION_NOTE_CONTENT || {};
const technicalNotes = baseTechnicalNotes.map((note) => ({
  ...note,
  content: notionNoteContent[note.title] || ""
}));
const defaultHeroIndices = [0, 6, 13, 22, 31, 38];
const weatherHeroIndices = {
  clear: [1, 13, 19, 23, 31, 36],
  cloud: [5, 12, 16, 25, 28, 30],
  rain: [6, 18, 20, 24, 29, 38],
  fog: [3, 5, 12, 17, 25, 30],
  snow: [0, 14, 26, 32, 34, 35],
  storm: [6, 16, 20, 25, 33, 37],
  night: [11, 21, 22, 26, 33, 38]
};
const manualWeatherOrder = ["default", "clear", "cloud", "rain", "fog", "snow", "storm", "night"];

let activeCharacter = "";
let activeNovelCollection = "complete";
let isSwitchingNovelCollection = false;
let portraitImages = [];
let portraitIndex = 0;
let readerTrigger = null;
let noteReaderTrigger = null;
let viewerTrigger = null;
let viewerImages = [];
let viewerIndex = 0;
let viewerMoving = false;
let characterToken = 0;
let lastScrollY = 0;
let heroPicks = [];
let weatherLoading = false;
let manualWeatherIndex = 0;
let activeTechCategory = "全部";
let activeTechNoteId = technicalNotes[0]?.id || "";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function useMotion() {
  return Boolean(gsap && !reducedMotion.matches);
}

async function ensureImage(image) {
  if (!image) return;
  if (!image.complete) {
    await new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }
  if (image.decode) {
    try {
      await image.decode();
    } catch {
      // A cached or partially decoded image can reject while still being displayable.
    }
  }
}

async function preload(src) {
  const image = new Image();
  image.src = src;
  await ensureImage(image);
  return image;
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
}

function extractViewerColor(image, cacheKey) {
  if (viewerColorCache.has(cacheKey)) return viewerColorCache.get(cacheKey);
  const fallback = "hsl(222 52% 18%)";

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let weightTotal = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 180) continue;
      const pixelRed = pixels[index];
      const pixelGreen = pixels[index + 1];
      const pixelBlue = pixels[index + 2];
      const brightness = (pixelRed + pixelGreen + pixelBlue) / 3;
      if (brightness < 10 || brightness > 247) continue;
      const spread = Math.max(pixelRed, pixelGreen, pixelBlue) - Math.min(pixelRed, pixelGreen, pixelBlue);
      const weight = 0.35 + spread / 255;
      red += pixelRed * weight;
      green += pixelGreen * weight;
      blue += pixelBlue * weight;
      weightTotal += weight;
    }

    if (!weightTotal) return fallback;
    const color = rgbToHsl(red / weightTotal, green / weightTotal, blue / weightTotal);
    const saturation = Math.max(28, Math.min(62, color.saturation * 1.15));
    const lightness = Math.max(15, Math.min(25, color.lightness * 0.48));
    const result = `hsl(${color.hue} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
    viewerColorCache.set(cacheKey, result);
    return result;
  } catch {
    return fallback;
  }
}

function setInterfaceLocked(locked, activeOverlay) {
  document.body.classList.toggle("is-locked", locked);
  app.inert = locked;
  masthead.inert = locked;
  if (activeOverlay !== reader) reader.inert = locked;
  if (activeOverlay !== noteReader) noteReader.inert = locked;
  if (activeOverlay !== viewer) viewer.inert = locked;
}

function renderHero(indices = defaultHeroIndices, weatherTransition = false) {
  const picks = indices
    .map((index) => data.paintings[index])
    .filter(Boolean);
  heroPicks = picks;
  const collage = document.querySelector("#heroCollage");

  collage.innerHTML = picks.map((item, index) => `
    <button class="hero-card${weatherTransition ? " is-weather-entering" : ""}" type="button" data-hero-image="${item.id}" data-index="${index}" data-cursor="OPEN" style="--weather-order:${index}" aria-label="查看${escapeHtml(item.title)}">
      <img src="${item.src}" alt="" ${index < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} />
    </button>
  `).join("");

  collage.querySelectorAll("[data-hero-image]").forEach((card) => {
    card.addEventListener("click", () => {
      const index = heroPicks.findIndex((item) => item.id === card.dataset.heroImage);
      openViewer(heroPicks, index, card);
    });
  });
}

function weatherKindFromCode(code) {
  if ([95, 96, 99].includes(code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([1, 2, 3].includes(code)) return "cloud";
  return "clear";
}

function weatherLabel(kind) {
  return {
    clear: "晴朗，光线充足",
    cloud: "多云，光线柔和",
    rain: "正在下雨",
    fog: "雾气弥漫",
    snow: "正在下雪",
    storm: "雷雨正在靠近",
    night: "晴朗的夜晚"
  }[kind] || "当地天气";
}

function buildWeatherParticles(kind) {
  const container = document.querySelector("#weatherParticles");
  container.innerHTML = "";
  if (!["rain", "storm", "snow"].includes(kind)) return;
  const count = kind === "snow" ? 54 : kind === "storm" ? 92 : 76;

  container.innerHTML = Array.from({ length: count }, (_, index) => {
    const x = (index * 47 + 13) % 101;
    const delay = -((index * 31) % 90) / 10;
    const duration = kind === "snow" ? 7 + (index % 8) * 0.72 : 0.72 + (index % 7) * 0.09;
    const size = kind === "snow" ? 3 + (index % 5) * 1.15 : 28 + (index % 6) * 8;
    const opacity = kind === "snow" ? 0.34 + (index % 6) * 0.09 : 0.18 + (index % 5) * 0.1;
    const drift = `${-28 + (index % 9) * 7}px`;
    return `<i class="weather-particle" style="--particle-x:${x}%;--particle-delay:${delay}s;--particle-duration:${duration}s;--particle-size:${size}px;--particle-opacity:${opacity};--particle-drift:${drift}"></i>`;
  }).join("");
}

async function transitionHeroImages(indices) {
  const images = indices.map((index) => data.paintings[index]).filter(Boolean);
  await Promise.all(images.map((item) => preload(item.src)));

  if (useMotion() && document.querySelectorAll(".hero-card").length) {
    await new Promise((resolve) => gsap.to(".hero-card", {
      autoAlpha: 0,
      scale: 0.86,
      y: (index) => index % 2 ? -18 : 18,
      duration: 0.34,
      stagger: 0.035,
      ease: "power2.in",
      onComplete: resolve
    }));
  }
  renderHero(indices, true);
}

async function applyWeatherTheme(kind, weather = {}) {
  const hero = document.querySelector(".hero");
  const isNight = weather.isDay === false;
  const visualKind = isNight && ["clear", "cloud"].includes(kind) ? "night" : kind;
  const indices = weatherHeroIndices[visualKind] || defaultHeroIndices;
  await transitionHeroImages(indices);
  hero.dataset.weather = visualKind;
  buildWeatherParticles(visualKind);
  document.querySelector('meta[name="theme-color"]').content = visualKind === "night" || visualKind === "storm" ? "#111b31" : "#e4e3dc";
}

async function resetWeatherTheme() {
  await transitionHeroImages(defaultHeroIndices);
  const hero = document.querySelector(".hero");
  delete hero.dataset.weather;
  buildWeatherParticles("default");
  document.querySelector('meta[name="theme-color"]').content = "#f1eadf";
  document.querySelector("#weatherReading").hidden = true;
}

function setWeatherReading({ temperature, label, place, badge = "LIVE" }) {
  document.querySelector("#weatherReading").hidden = false;
  document.querySelector("#weatherTemperature").textContent = Number.isFinite(temperature) ? `${Math.round(temperature)}°` : badge;
  document.querySelector("#weatherCondition").textContent = label;
  document.querySelector("#weatherPlace").textContent = place;
}

function updateWeatherCycleLabel(kind) {
  const labels = { default: "默认", clear: "晴", cloud: "云", rain: "雨", fog: "雾", snow: "雪", storm: "雷", night: "夜" };
  const button = document.querySelector("#weatherCycle");
  document.querySelector("#weatherCycleLabel").textContent = kind === "default" ? "切换天气" : labels[kind];
  button.setAttribute("aria-label", `当前${labels[kind]}天气，点击切换`);
}

async function cycleWeather() {
  if (weatherLoading) return;
  weatherLoading = true;
  const button = document.querySelector("#weatherCycle");
  button.disabled = true;
  const current = document.querySelector(".hero").dataset.weather || "default";
  const currentIndex = Math.max(0, manualWeatherOrder.indexOf(current));
  manualWeatherIndex = (currentIndex + 1) % manualWeatherOrder.length;
  const next = manualWeatherOrder[manualWeatherIndex];

  try {
    if (next === "default") {
      await resetWeatherTheme();
    } else {
      await applyWeatherTheme(next, { isDay: next !== "night" });
      setWeatherReading({
        temperature: NaN,
        label: `${weatherLabel(next)} · 手动模式`,
        place: "点击右侧按钮继续切换",
        badge: "MODE"
      });
    }
    updateWeatherCycleLabel(next);
  } finally {
    button.disabled = false;
    weatherLoading = false;
  }
}

function formatWeatherPlace(timezone) {
  const resolved = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  return resolved.replace(/_/g, " ").replace("/", " · ");
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 10 * 60 * 1000
    });
  });
}

async function fetchCurrentWeather(latitude, longitude) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: "temperature_2m,apparent_temperature,is_day,weather_code,cloud_cover,precipitation,rain,snowfall,wind_speed_10m",
    timezone: "auto"
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestLocalWeather() {
  if (weatherLoading) return;
  weatherLoading = true;
  setWeatherReading({ temperature: NaN, label: "正在读取当地天空", place: "浏览器将请求定位权限", badge: "···" });

  if (!navigator.geolocation) {
    setWeatherReading({ temperature: NaN, label: "默认天气", place: "浏览器不支持定位 · 可手动切换", badge: "--" });
    weatherLoading = false;
    return;
  }

  try {
    const position = await getPosition();
    setWeatherReading({ temperature: NaN, label: "正在匹配作品与天气", place: "已获得当地天空", badge: "···" });
    const result = await fetchCurrentWeather(position.coords.latitude, position.coords.longitude);
    const current = result.current || {};
    const kind = weatherKindFromCode(Number(current.weather_code));
    await applyWeatherTheme(kind, { isDay: Number(current.is_day) === 1 });
    setWeatherReading({
      temperature: Number(current.temperature_2m),
      label: weatherLabel(Number(current.is_day) === 0 && ["clear", "cloud"].includes(kind) ? "night" : kind),
      place: `${formatWeatherPlace(result.timezone)} · 实时天气策展`
    });
  } catch (error) {
    const denied = error?.code === 1;
    setWeatherReading({
      temperature: NaN,
      label: "默认天气",
      place: denied ? "定位未开启 · 可手动切换" : "天气暂时不可用 · 可手动切换",
      badge: "--"
    });
  } finally {
    weatherLoading = false;
  }
}

async function initWeather() {
  document.querySelector("#weatherCycle").addEventListener("click", cycleWeather);
  const preview = new URLSearchParams(location.search).get("weather");
  if (weatherHeroIndices[preview]) {
    await applyWeatherTheme(preview, { isDay: preview !== "night" });
    setWeatherReading({ temperature: NaN, label: `${weatherLabel(preview)} · Preview`, place: "Weather art direction" });
    updateWeatherCycleLabel(preview);
    return;
  }

  requestLocalWeather();
}

const readerThemes = {
  "白鸟之泪": "whitebird",
  "彼岸之冬": "winter",
  "黄昏的魔术师": "magician",
  "空箱": "emptybox",
  "山海行人": "mountainsea",
  "深蓝": "deepblue",
  "永远的铁道": "railway"
};

const readerThemeClasses = Object.values(readerThemes).map((theme) => `is-${theme}`);

function renderReaderOrnaments(novel) {
  const ornaments = document.querySelector("#readerOrnaments");
  const theme = readerThemes[String(novel.title).trim()] || "default";
  reader.classList.remove(...readerThemeClasses);
  ornaments.innerHTML = "";
  reader.dataset.phase = "opening";
  if (theme !== "deepblue") return [];
  reader.classList.add("is-deepblue");

  const positions = [
    ["4%", "14%", "-12deg", "0s"],
    ["91%", "23%", "11deg", "-3.1s"],
    ["8%", "42%", "17deg", "-6.4s"],
    ["87%", "57%", "-15deg", "-1.8s"],
    ["3%", "75%", "8deg", "-4.7s"],
    ["93%", "84%", "-9deg", "-7.2s"],
    ["16%", "27%", "21deg", "-9.1s"],
    ["80%", "73%", "-19deg", "-5.6s"],
    ["12%", "88%", "-7deg", "-2.4s"],
    ["84%", "11%", "14deg", "-8.3s"]
  ];
  const floating = (className, symbols = [], count = 7) => positions.slice(0, count).map(([x, y, rotate, delay], index) => {
    const symbol = symbols[index % symbols.length] || "";
    const tag = symbol ? "span" : "i";
    return `<${tag} class="story-float ${className}" style="--float-x:${x};--float-y:${y};--float-rotate:${rotate};--float-delay:${delay};--float-index:${index}">${symbol}</${tag}>`;
  }).join("");
  const deepBlueNotes = [
    ["♪", "3%", "16%", "4.8rem", "-8deg", "0.32", "8.5s", "-1.2s", "20px", "-24px", false],
    ["♫", "8%", "39%", "7rem", "12deg", "0.2", "10s", "-4s", "-16px", "28px", true],
    ["♩", "2%", "72%", "5.4rem", "-15deg", "0.26", "9s", "-2s", "24px", "-18px", false],
    ["♬", "14%", "86%", "3.4rem", "9deg", "0.22", "7.8s", "-5s", "-18px", "-20px", false],
    ["♪", "88%", "12%", "5.8rem", "14deg", "0.28", "9.6s", "-3s", "-22px", "24px", false],
    ["♩", "94%", "34%", "3.8rem", "-11deg", "0.3", "8.2s", "-1s", "18px", "-22px", true],
    ["♫", "84%", "58%", "7.2rem", "7deg", "0.18", "11s", "-6s", "20px", "26px", false],
    ["♪", "93%", "82%", "4.6rem", "-8deg", "0.26", "8.8s", "-2.8s", "-16px", "-24px", false],
    ["♩", "18%", "27%", "2.6rem", "17deg", "0.16", "7.2s", "-4.5s", "14px", "18px", true],
    ["♪", "78%", "76%", "2.9rem", "-12deg", "0.18", "7.6s", "-3.4s", "-14px", "16px", true]
  ];

  const templates = {
    whitebird: `${floating("float-feather")}<i class="motif-echo rain-score echo-a"></i><i class="motif-echo rain-score echo-b"></i>`,
    winter: `${floating("float-snow", ["❄"])}<i class="motif-echo frost-trace echo-a"></i><i class="motif-echo frost-trace echo-b"></i>`,
    magician: `${floating("float-crystal")}<i class="motif-echo prism-rays echo-a"></i><i class="motif-echo prism-rays echo-b"></i>`,
    emptybox: `${floating("float-thread")}<i class="motif-echo woven-trace echo-a"></i><i class="motif-echo woven-trace echo-b"></i>`,
    mountainsea: `${floating("float-maple")}<i class="motif-echo mountain-contour echo-a"></i><i class="motif-echo mountain-contour echo-b"></i>`,
    deepblue: `
      <div class="music-staff staff-a"></div>
      <div class="music-staff staff-b"></div>
      ${deepBlueNotes.map(([symbol, x, y, size, rotate, opacity, duration, delay, driftX, driftY, outline]) => `
        <span class="music-note${outline ? " note-outline" : ""}" style="--note-x:${x};--note-y:${y};--note-size:${size};--note-rotate:${rotate};--note-opacity:${opacity};--note-duration:${duration};--note-delay:${delay};--note-drift-x:${driftX};--note-drift-y:${driftY}">${symbol}</span>
      `).join("")}
    `,
    railway: `${floating("float-ticket")}<i class="motif-echo rail-trace echo-a"></i><i class="motif-echo rail-trace echo-b"></i>`
  };

  ornaments.innerHTML = templates.deepblue;
  return Array.from(ornaments.children);
}

function renderNovels() {
  const novels = activeNovelCollection === "unfinished" ? unfinishedNovels : completedNovels;
  const unfinished = activeNovelCollection === "unfinished";
  const index = document.querySelector("#novelIndex");
  const layout = document.querySelector(".fiction-layout");
  const collectionNav = document.querySelector("#fictionCollectionNav");
  const nextCollection = unfinished ? "complete" : "unfinished";

  layout.classList.toggle("is-unfinished", unfinished);
  collectionNav.dataset.fictionCollection = nextCollection;
  collectionNav.setAttribute("aria-label", unfinished ? "返回一纸空文" : "进入一纸空文·未尽");
  document.querySelector("#fictionCollectionNavLabel").textContent = unfinished ? "一纸空文" : "一纸空文·未尽";
  document.querySelector("#fictionCollectionNavArrow").textContent = unfinished ? "←" : "→";
  document.querySelector("#fictionTitleSuffix").textContent = unfinished ? "未尽" : "";
  document.querySelector("#fictionDeck").innerHTML = unfinished
    ? "未完成的文字，<br />以及未完成的念想"
    : "已经完成的文字，<br />以及仍在回响的故事。";
  document.querySelector("#fictionArchiveCount").textContent = `${String(novels.length).padStart(2, "0")} ${unfinished ? "DRAFTS" : "WORKS"} / ARCHIVED`;
  if (!novels.length) {
    index.innerHTML = `
      <div class="novel-empty">
        <span>未尽之稿</span>
        <strong>这里暂时没有文字。</strong>
        <p>未完成的故事会留在这里，保留它尚未决定的方向。</p>
      </div>
    `;
    updateEmptyNovelPreview();
    return;
  }

  index.innerHTML = novels.map((novel, position) => `
    <button class="novel-row" type="button" data-novel="${novel.id}" data-cursor="ENTER" style="--row-color:${storyColors[position % storyColors.length]};--novel-cover:${novel.cover ? `url(&quot;${novel.cover}&quot;)` : "none"}" aria-label="阅读《${escapeHtml(novel.title)}》">
      <span class="novel-no">${String(position + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(novel.title)}</h3>
      <small>${Number(novel.charCount || 0).toLocaleString("zh-CN")} 字</small>
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25 25 7M12 7h13v13" /></svg>
    </button>
  `).join("");

  index.querySelectorAll("[data-novel]").forEach((row, position) => {
    const novel = novels[position];
    row.addEventListener("pointerenter", () => updateNovelPreview(novel, position));
    row.addEventListener("focus", () => updateNovelPreview(novel, position));
    row.addEventListener("click", () => openReader(novel, row, position, novels.length));
  });

  updateNovelPreview(novels[0], 0);
}

function updateEmptyNovelPreview() {
  const surface = document.querySelector(".preview-surface");
  surface.style.setProperty("--preview-color", "#283f66");
  document.querySelector("#previewNumber").textContent = "—";
  document.querySelector("#previewExcerpt").textContent = "有些故事还没有找到结尾。它们停在这里，等待下一次被继续。";
  document.querySelector("#previewCount").textContent = "DRAFT ARCHIVE";
}

async function switchNovelCollection(collection) {
  if (!["complete", "unfinished"].includes(collection) || collection === activeNovelCollection || isSwitchingNovelCollection) return;
  isSwitchingNovelCollection = true;
  const direction = collection === "unfinished" ? 1 : -1;
  const targets = ["#novelIndex", "#novelPreview", "#fictionDeck", "#fictionTitleSuffix", "#fictionArchiveCount"];

  try {
    if (useMotion()) {
      await new Promise((resolve) => gsap.to(targets, {
        autoAlpha: 0,
        x: direction * -54,
        duration: 0.32,
        stagger: 0.025,
        ease: "power3.in",
        onComplete: resolve
      }));
    }
    activeNovelCollection = collection;
    renderNovels();
    if (useMotion()) {
      await new Promise((resolve) => gsap.fromTo(targets,
        { autoAlpha: 0, x: direction * 54 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.58,
          stagger: 0.035,
          ease: "power4.out",
          clearProps: "opacity,visibility,transform",
          onComplete: resolve
        }
      ));
    }
  } finally {
    isSwitchingNovelCollection = false;
  }
}

function setupFictionSwitch() {
  const collectionNav = document.querySelector("#fictionCollectionNav");
  collectionNav.addEventListener("click", () => switchNovelCollection(collectionNav.dataset.fictionCollection));
}

function updateNovelPreview(novel, position) {
  document.querySelectorAll(".novel-row").forEach((row) => row.classList.toggle("is-active", row.dataset.novel === novel.id));
  const surface = document.querySelector(".preview-surface");
  const excerpt = String(novel.excerpt || novel.paragraphs?.[0] || "").replace(/\s+/g, " ").trim();
  surface.style.setProperty("--preview-color", storyColors[position % storyColors.length]);
  surface.style.setProperty("--preview-image", novel.cover ? `url("${novel.cover}")` : "none");
  document.querySelector("#previewNumber").textContent = String(position + 1).padStart(2, "0");
  document.querySelector("#previewExcerpt").textContent = excerpt.length > 150 ? `${excerpt.slice(0, 150)}…` : excerpt;
  document.querySelector("#previewCount").textContent = `${Number(novel.charCount || 0).toLocaleString("zh-CN")} characters`;

  if (useMotion()) {
    gsap.fromTo(["#previewNumber", "#previewExcerpt", ".preview-meta"],
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.045, ease: "power3.out", overwrite: true }
    );
  }
}

function getCharacters() {
  return [...new Set(allPaintings.map((item) => item.group))].map((group) => ({
    group,
    images: allPaintings.filter((item) => item.group === group)
  }));
}

function applyPortraitFrame(item) {
  if (!item) return;
  const width = Number(item.width) || 1;
  const height = Number(item.height) || 1;
  const media = document.querySelector("#portraitMedia");
  media.style.setProperty("--portrait-ratio", `${width} / ${height}`);
  media.classList.toggle("is-landscape", width > height);
}

function portraitThumbnailSrc(item) {
  return `assets/images/portrait-thumbs/${item.id}.jpg`;
}

function characterCardSrc(item) {
  return `assets/images/character-cards/${item.id}.webp`;
}

function renderCharacters() {
  const characters = getCharacters();
  const tabs = document.querySelector("#characterTabs");
  tabs.innerHTML = characters.map((character, index) => `
    <button class="character-tab${index === 0 ? " is-active" : ""}" type="button" role="tab" data-character="${escapeHtml(character.group)}" data-cursor="ENTER" aria-selected="${index === 0}">
      <span class="character-visual">
        <img src="${characterCardSrc(character.images[0])}" alt="${escapeHtml(character.group)}角色代表图" loading="${index < 4 ? "eager" : "lazy"}" decoding="async" />
        <i aria-hidden="true">${String(index + 1).padStart(2, "0")}</i>
      </span>
      <span class="character-meta">
        <strong>${escapeHtml(character.group)}</strong>
        <small>${String(character.images.length).padStart(2, "0")} 幅作品</small>
      </span>
      <span class="character-enter" aria-hidden="true">进入画廊 <b>↗</b></span>
    </button>
  `).join("");

  tabs.querySelectorAll("[data-character]").forEach((tab) => {
    tab.addEventListener("click", () => enterCharacter(tab));
  });

  if (characters[0]) setCharacter(characters[0].group, true);
}

async function enterCharacter(tab) {
  if (!tab || tabsAreMoving()) return;
  const tabs = document.querySelector("#characterTabs");
  tabs.classList.add("is-moving");

  if (useMotion()) {
    const others = [...tabs.querySelectorAll(".character-tab")].filter((item) => item !== tab);
    await new Promise((resolve) => {
      gsap.timeline({ onComplete: resolve })
        .to(others, { autoAlpha: 0.32, scale: 0.97, duration: 0.28, ease: "power2.out" }, 0)
        .to(tab, { y: -12, rotation: 0, scale: 1.025, duration: 0.42, ease: "power3.out" }, 0);
    });
  }

  await setCharacter(tab.dataset.character);
  document.querySelector("#portraitStage").scrollIntoView({ behavior: useMotion() ? "smooth" : "auto", block: "start" });

  if (useMotion()) {
    gsap.to(tabs.querySelectorAll(".character-tab"), {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      rotation: 0,
      duration: 0.55,
      ease: "power3.out",
      clearProps: "opacity,visibility,transform",
      onComplete: () => tabs.classList.remove("is-moving")
    });
  } else {
    tabs.classList.remove("is-moving");
  }
}

function tabsAreMoving() {
  return document.querySelector("#characterTabs")?.classList.contains("is-moving");
}

async function setCharacter(group, instant = false) {
  const token = ++characterToken;
  const character = getCharacters().find((item) => item.group === group);
  if (!character) return;

  const stage = document.querySelector("#portraitStage");
  if (!instant && useMotion()) {
    await new Promise((resolve) => gsap.to(stage, { autoAlpha: 0, y: 24, duration: 0.28, ease: "power2.in", onComplete: resolve }));
  }
  if (token !== characterToken) return;

  activeCharacter = character.group;
  portraitImages = character.images;
  portraitIndex = 0;
  document.querySelectorAll(".character-tab").forEach((tab) => {
    const active = tab.dataset.character === group;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  const cover = document.querySelector("#portraitCoverImage");
  const first = portraitImages[0];
  if (first) {
    await preload(first.src);
    if (token !== characterToken) return;
    applyPortraitFrame(first);
    cover.src = first.src;
    cover.alt = first.title;
  }
  document.querySelector("#characterName").textContent = first?.title || group;
  document.querySelector("#characterCount").textContent = `${portraitImages.length} portraits / selected archive`;
  document.querySelector("#coverIndex").textContent = `01 / ${String(portraitImages.length).padStart(2, "0")}`;

  const rail = document.querySelector("#portraitRail");
  rail.scrollLeft = 0;
  rail.innerHTML = portraitImages.map((item, index) => `
    <button class="portrait-thumb${index === 0 ? " is-current" : ""}" type="button" data-portrait="${item.id}" data-index="${index}" data-cursor="OPEN" style="--thumb-ratio:${Number(item.width) || 1} / ${Number(item.height) || 1}" aria-label="查看${escapeHtml(item.title)}">
      <img src="${portraitThumbnailSrc(item)}" alt="" loading="${index < 4 ? "eager" : "lazy"}" />
      <span>${String(index + 1).padStart(2, "0")}</span>
    </button>
  `).join("");

  rail.querySelectorAll("[data-portrait]").forEach((thumb) => {
    const index = Number(thumb.dataset.index);
    thumb.addEventListener("pointerenter", () => selectPortrait(index));
    thumb.addEventListener("focus", () => selectPortrait(index));
    thumb.addEventListener("click", () => {
      selectPortrait(index);
      openViewer(portraitImages, index, thumb);
    });
  });

  if (instant || !useMotion()) {
    stage.style.opacity = "1";
    stage.style.transform = "none";
  } else {
    gsap.fromTo(stage, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.72, ease: "expo.out" });
    gsap.fromTo(".portrait-thumb", { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.65, stagger: 0.035, ease: "power3.out", clearProps: "opacity,visibility,transform" });
  }
}

async function selectPortrait(index) {
  if (!portraitImages[index] || portraitIndex === index) return;
  portraitIndex = index;
  const item = portraitImages[index];
  const cover = document.querySelector("#portraitCoverImage");
  document.querySelector("#characterName").textContent = item.title;
  document.querySelectorAll(".portrait-thumb").forEach((thumb, position) => thumb.classList.toggle("is-current", position === index));
  document.querySelector("#coverIndex").textContent = `${String(index + 1).padStart(2, "0")} / ${String(portraitImages.length).padStart(2, "0")}`;
  await preload(item.src);
  if (portraitIndex !== index) return;

  if (!useMotion()) {
    applyPortraitFrame(item);
    cover.src = item.src;
    cover.alt = item.title;
    return;
  }

  gsap.to(cover, {
    autoAlpha: 0,
    scale: 0.985,
    duration: 0.18,
    ease: "power2.in",
    onComplete: () => {
      applyPortraitFrame(item);
      cover.src = item.src;
      cover.alt = item.title;
      gsap.to(cover, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out" });
    }
  });
}

function renderPhotography() {
  const grid = document.querySelector("#photoGrid");
  grid.innerHTML = photoWorks.map((item, index) => `
    <button class="photo-card reveal" type="button" data-photo-index="${index}" data-cursor="OPEN" aria-label="查看摄影作品《${escapeHtml(item.title)}》">
      <span class="photo-frame" style="--photo-ratio:${item.width} / ${item.height}"><img src="${item.thumb || item.src}" alt="${escapeHtml(item.title)}" loading="${index < 2 ? "eager" : "lazy"}" /></span>
      <span class="photo-card-meta"><b>${String(index + 1).padStart(2, "0")}</b><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.group)}</small></span>
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25 25 7M12 7h13v13" /></svg>
    </button>
  `).join("");

  grid.querySelectorAll("[data-photo-index]").forEach((card) => {
    card.addEventListener("click", () => openViewer(photoWorks, Number(card.dataset.photoIndex), card));
  });
}

function setupHorizontalWheel(scroller) {
  scroller.addEventListener("wheel", (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 1) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const atStart = delta < 0 && scroller.scrollLeft <= 0;
    const atEnd = delta > 0 && scroller.scrollLeft >= max - 1;
    if (max <= 1 || atStart || atEnd) return;
    event.preventDefault();
    scroller.scrollLeft += delta;
  }, { passive: false });
}

function renderNoteInline(value) {
  const codeTokens = [];
  const linkTokens = [];
  let source = String(value || "")
    .replace(/`([^`]+)`/g, (_, code) => {
      const token = `@@CODE${codeTokens.length}@@`;
      codeTokens.push(`<code>${escapeHtml(code)}</code>`);
      return token;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const token = `@@LINK${linkTokens.length}@@`;
      const safeHref = /^(https?:\/\/|mailto:|#|assets\/)/i.test(href) ? href : "#";
      linkTokens.push(`<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
      return token;
    });

  source = escapeHtml(source)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, "$1<em>$2</em>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br />");

  codeTokens.forEach((html, index) => { source = source.replace(`@@CODE${index}@@`, html); });
  linkTokens.forEach((html, index) => { source = source.replace(`@@LINK${index}@@`, html); });
  return source;
}

function renderNoteMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const output = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];
  let listType = "";

  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = "";
  };

  for (const originalLine of lines) {
    const line = originalLine.trimEnd();
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^```(.*)$/);

    if (fence) {
      if (inCode) {
        output.push(`<pre><code data-language="${escapeHtml(codeLanguage)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLanguage = "";
        codeLines = [];
      } else {
        closeList();
        inCode = true;
        codeLanguage = fence[1].trim();
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line.replace(/^\s{0,4}/, ""));
      continue;
    }
    if (!trimmed) {
      closeList();
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      closeList();
      const safeSrc = /^(https?:\/\/|assets\/)/i.test(imageMatch[2]) ? imageMatch[2] : "";
      if (safeSrc) output.push(`<figure><img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(imageMatch[1])}" loading="lazy" /></figure>`);
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(4, heading[1].length + 1);
      output.push(`<h${level}>${renderNoteInline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      closeList();
      output.push("<hr />");
      continue;
    }
    if (trimmed.startsWith("> ")) {
      closeList();
      output.push(`<blockquote>${renderNoteInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${renderNoteInline((unordered || ordered)[1])}</li>`);
      continue;
    }

    closeList();
    output.push(`<p>${renderNoteInline(trimmed)}</p>`);
  }

  if (inCode) output.push(`<pre><code data-language="${escapeHtml(codeLanguage)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  closeList();
  return output.join("");
}

function updateNoteReaderProgress() {
  const max = noteReader.scrollHeight - noteReader.clientHeight;
  const progress = max > 0 ? Math.min(1, noteReader.scrollTop / max) : 0;
  document.querySelector("#noteReaderProgress").style.transform = `scaleX(${progress})`;
  document.querySelector("#noteReaderPosition").textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
}

function openTechNoteReader(note, trigger) {
  if (!note?.content || noteReader.classList.contains("is-open")) return;
  noteReaderTrigger = trigger;
  document.querySelector("#noteReaderCategory").textContent = note.category;
  document.querySelector("#noteReaderStatus").textContent = note.status || "已同步";
  document.querySelector("#noteReaderDate").textContent = note.date;
  document.querySelector("#noteReaderTitle").textContent = note.title;
  document.querySelector("#noteReaderTags").innerHTML = note.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  document.querySelector("#noteReaderBody").innerHTML = renderNoteMarkdown(note.content);
  noteReader.scrollTop = 0;
  updateNoteReaderProgress();

  if (useMotion()) gsap.set(noteReader, { autoAlpha: 1, xPercent: 100 });
  noteReader.classList.add("is-open");
  noteReader.setAttribute("aria-hidden", "false");
  noteReader.inert = false;
  setInterfaceLocked(true, noteReader);

  if (!useMotion()) {
    document.querySelector("#noteReaderClose").focus({ preventScroll: true });
    return;
  }
  gsap.to(noteReader, { xPercent: 0, duration: 0.72, ease: "power4.out", onComplete: () => document.querySelector("#noteReaderClose").focus({ preventScroll: true }) });
}

function closeTechNoteReader() {
  if (!noteReader.classList.contains("is-open")) return;
  const finish = () => {
    noteReader.classList.remove("is-open");
    noteReader.setAttribute("aria-hidden", "true");
    if (gsap) gsap.set(noteReader, { clearProps: "opacity,visibility,transform" });
    setInterfaceLocked(false);
    noteReaderTrigger?.focus({ preventScroll: true });
  };
  if (!useMotion()) finish();
  else gsap.to(noteReader, { xPercent: 100, duration: 0.55, ease: "power3.in", onComplete: finish });
}

function updateTechPreview(note, instant = false) {
  if (!note) return;
  const preview = document.querySelector("#techPreview");
  const applyContent = () => {
    const codeBlock = document.querySelector("#techPreviewCode").closest("pre");
    const openButton = document.querySelector("#techPreviewOpen");
    document.querySelector("#techPreviewCategory").textContent = note.category;
    document.querySelector("#techPreviewDate").textContent = note.date;
    document.querySelector("#techPreviewStatus").textContent = note.status || "已同步";
    document.querySelector("#techPreviewTitle").textContent = note.title;
    document.querySelector("#techPreviewSummary").textContent = note.summary;
    document.querySelector("#techPreviewTags").innerHTML = note.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    document.querySelector("#techPreviewCode").textContent = note.code || "";
    codeBlock.hidden = !note.code;
    document.querySelector("#techPreviewRead").textContent = note.status || note.read || "NOTION";
    openButton.hidden = !note.content;
    openButton.setAttribute("aria-label", `阅读《${note.title}》全文`);
  };

  if (instant || !useMotion()) {
    applyContent();
    return;
  }

  gsap.killTweensOf(preview);
  gsap.to(preview, {
    autoAlpha: 0,
    x: 16,
    duration: 0.16,
    ease: "power2.in",
    onComplete: () => {
      applyContent();
      gsap.fromTo(preview, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: "power3.out", clearProps: "opacity,visibility,transform" });
    }
  });
}

function selectTechNote(id, instant = false) {
  const note = technicalNotes.find((item) => item.id === id);
  if (!note) return;
  activeTechNoteId = id;
  document.querySelectorAll("[data-tech-note]").forEach((button) => {
    const active = button.dataset.techNote === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  updateTechPreview(note, instant);
}

function renderTechIndex(category, instant = false) {
  activeTechCategory = category;
  const notes = category === "全部" ? technicalNotes : technicalNotes.filter((note) => note.category === category);
  const index = document.querySelector("#techIndex");
  document.querySelectorAll("[data-tech-filter]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.techFilter === category)));
  document.querySelector("#techTotal").textContent = `${String(notes.length).padStart(2, "0")} NOTES / INDEXED`;
  index.innerHTML = notes.map((note, position) => `
    <button class="tech-note-row${note.id === activeTechNoteId ? " is-active" : ""}" type="button" data-tech-note="${note.id}" aria-selected="${note.id === activeTechNoteId}">
      <span>${String(position + 1).padStart(2, "0")}</span>
      <small>${escapeHtml(note.category)}</small>
      <strong>${escapeHtml(note.title)}</strong>
      <time>${note.date.slice(0, 7)}</time>
    </button>
  `).join("");

  index.querySelectorAll("[data-tech-note]").forEach((button) => {
    button.addEventListener("click", () => selectTechNote(button.dataset.techNote));
  });

  if (!notes.some((note) => note.id === activeTechNoteId)) activeTechNoteId = notes[0]?.id || "";
  selectTechNote(activeTechNoteId, instant);
}

function renderTechnicalNotes() {
  const categories = ["全部", ...new Set(technicalNotes.map((note) => note.category))];
  const filters = document.querySelector("#techFilters");
  filters.innerHTML = categories.map((category) => `
    <button type="button" data-tech-filter="${escapeHtml(category)}" aria-pressed="${category === activeTechCategory}">${escapeHtml(category)}</button>
  `).join("");
  filters.querySelectorAll("[data-tech-filter]").forEach((button) => {
    button.addEventListener("click", () => renderTechIndex(button.dataset.techFilter));
  });
  renderTechIndex(activeTechCategory, true);
}

function setupPortraitRail() {
  const rail = document.querySelector("#portraitRail");
  setupHorizontalWheel(document.querySelector("#characterTabs"));
  setupHorizontalWheel(document.querySelector("#photoGrid"));
  setupHorizontalWheel(rail);

  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  rail.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startScroll = rail.scrollLeft;
    rail.setPointerCapture(event.pointerId);
  });
  rail.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    rail.scrollLeft = startScroll - (event.clientX - startX);
  });
  rail.addEventListener("pointerup", () => { dragging = false; });
  rail.addEventListener("pointercancel", () => { dragging = false; });
}

function syncReaderBackdropHeight() {
  const curtain = document.querySelector(".reader-curtain");
  const sheet = document.querySelector(".reader-sheet");
  const head = document.querySelector(".reader-head");
  curtain.style.height = `${Math.max(reader.clientHeight, head.offsetHeight + sheet.offsetHeight)}px`;
}

function isNovelFooterLine(line) {
  return /^(?:By\s+)?KLEIN\s*BLues\.?$/i.test(line)
    || /^KringKoter\b.*$/i.test(line)
    || /^淼然\s*20\d{2}[./年]/.test(line)
    || /^(?:\(End\)|END)$/i.test(line)
    || /^20\d{2}[./年-]\d{1,2}(?:[./月-]\d{1,2}日?)?(?:\s*~\s*20\d{2}[./年-]\d{1,2}(?:[./月-]\d{1,2}日?)?)?\s*(?:完成|第.*修改|修订|Revise)?$/i.test(line);
}

function isMusicNotationLine(line) {
  const compact = String(line).replace(/\s+/g, "");
  return /^(?:变?[宫商角徵羽]){2,}$/.test(compact);
}

function parseNovelHeading(rawHeading, level, novel) {
  let heading = rawHeading.trim().replace(/^<|>$/g, "").trim();
  heading = heading.replace(/^[-—]+|[-—]+$/g, "").trim();
  let resolvedLevel = level;
  let title = heading;
  let english = "";
  let kicker = "";

  if (novel.title === "猫屿咖啡屋") {
    if (heading === "来时路") resolvedLevel = 1;
    if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVXLCDM]+\.?$/i.test(heading)) resolvedLevel = 2;
  }

  if (novel.title === "猫屿咖啡屋" && heading === "第二章·行将近") {
    kicker = "第二章";
    title = "行将近";
    english = "Soon to Leave";
  } else {
    const divider = heading.indexOf("·");
    if (divider > 0 && /[A-Za-z]/.test(heading.slice(divider + 1))) {
      title = heading.slice(0, divider).trim();
      english = heading.slice(divider + 1).trim();
    }
  }

  return { type: "heading", level: resolvedLevel, title, english, kicker };
}

function parseNovelDocument(source, novel) {
  const lines = String(source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let firstContentFound = false;
  let headingIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const original = lines[index].replace(/[\u200B-\u200D\uFEFF]/g, "");
    const line = original.trim();
    if (!line) {
      if (blocks.length && blocks[blocks.length - 1].type !== "spacer") blocks.push({ type: "spacer" });
      continue;
    }

    if (!firstContentFound) {
      firstContentFound = true;
      if (!line.startsWith("#") && line.startsWith(novel.title)) continue;
    }
    if (isNovelFooterLine(line)) continue;

    const headingMatch = line.match(/^(#{1,2})\s+(.+)$/);
    if (headingMatch) {
      if (blocks.at(-1)?.type === "spacer" && blocks.at(-2)?.type === "heading") blocks.pop();
      const heading = parseNovelHeading(headingMatch[2], headingMatch[1].length, novel);
      headingIndex += 1;
      blocks.push({ ...heading, id: `novel-chapter-${headingIndex}` });
      continue;
    }

    const nextLine = (lines[index + 1] || "").trim();
    if (nextLine && isMusicNotationLine(nextLine) && !isMusicNotationLine(line)) {
      blocks.push({ type: "notation", lyric: line, notation: nextLine });
      index += 1;
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  while (blocks[0]?.type === "spacer") blocks.shift();
  while (blocks.at(-1)?.type === "spacer") blocks.pop();
  return { blocks, headings: blocks.filter((block) => block.type === "heading") };
}

function renderNovelDocument(documentData) {
  return documentData.blocks.map((block) => {
    if (block.type === "spacer") return '<div class="reader-spacer" aria-hidden="true"></div>';
    if (block.type === "notation") {
      const lyricUnits = block.lyric.trim().split(/\s+/).filter(Boolean);
      const notationUnits = block.notation.match(/变?[宫商角徵羽]/g) || [];
      const paired = lyricUnits.length > 0 && lyricUnits.length === notationUnits.length;
      return `<figure class="reader-notation" aria-label="古典音律歌词">
        <figcaption><span>宫商谱</span><small>pentatonic verse</small></figcaption>
        ${paired ? `<div class="reader-notation-score" style="--notation-count:${lyricUnits.length}">
          ${lyricUnits.map((lyric, index) => `<span class="reader-notation-pair"><b>${escapeHtml(lyric)}</b><i>${escapeHtml(notationUnits[index])}</i></span>`).join("")}
        </div>` : `<div class="reader-notation-raw"><p>${escapeHtml(block.lyric)}</p><small>${escapeHtml(block.notation)}</small></div>`}
      </figure>`;
    }
    if (block.type === "heading") {
      const tag = block.level === 1 ? "h2" : "h3";
      const chapterClass = block.level === 1 ? "reader-chapter--major" : "reader-chapter--minor";
      return `<header class="reader-chapter ${chapterClass}" id="${block.id}">
        <div>
          ${block.kicker ? `<small>${escapeHtml(block.kicker)}</small>` : ""}
          <${tag}>${escapeHtml(block.title)}</${tag}>
          ${block.english ? `<em lang="en">${escapeHtml(block.english)}</em>` : ""}
        </div>
      </header>`;
    }
    return `<p>${escapeHtml(block.text)}</p>`;
  }).join("");
}

function renderReaderPublication(novel) {
  const publication = document.querySelector("#readerPublication");
  const details = Array.isArray(novel.publication) ? novel.publication : [];
  publication.hidden = details.length === 0;
  publication.innerHTML = details.map((item) => `<span><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></span>`).join("");
}

function renderReaderToc(headings) {
  const toc = document.querySelector("#readerToc");
  toc.hidden = headings.length === 0;
  toc.innerHTML = headings.map((heading, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-reader-chapter="${heading.id}">
    <strong>${escapeHtml(heading.kicker ? `${heading.kicker} · ${heading.title}` : heading.title)}</strong>
  </button>`).join("");
  toc.querySelectorAll("[data-reader-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`#${button.dataset.readerChapter}`)?.scrollIntoView({ behavior: useMotion() ? "smooth" : "auto", block: "start" });
    });
  });
}

async function loadNovelDocument(novel) {
  if (novel.documentData) return novel.documentData;
  if (novel.textSrc) {
    const response = await fetch(novel.textSrc);
    if (!response.ok) throw new Error(`Unable to load ${novel.textSrc}`);
    novel.documentData = parseNovelDocument(await response.text(), novel);
    return novel.documentData;
  }
  const fallback = Array.isArray(novel.paragraphs) ? novel.paragraphs.join("\n") : novel.excerpt || "";
  novel.documentData = parseNovelDocument(fallback, novel);
  return novel.documentData;
}

async function openReader(novel, trigger, position, total = completedNovels.length) {
  if (reader.classList.contains("is-open")) return;
  trigger.classList.add("is-loading");
  trigger.setAttribute("aria-busy", "true");
  let documentData;
  try {
    documentData = await loadNovelDocument(novel);
  } catch {
    documentData = parseNovelDocument(novel.excerpt || "正文暂时无法加载。", novel);
  } finally {
    trigger.classList.remove("is-loading");
    trigger.removeAttribute("aria-busy");
  }
  readerTrigger = trigger;
  document.querySelector("#readerMeta").textContent = `${String(position + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")} · ${Number(novel.charCount).toLocaleString("zh-CN")} 字`;
  document.querySelector("#readerTitle").textContent = novel.title;
  document.querySelector("#readerSubtitle").textContent = novel.subtitle || "Original fiction · KLEIN BLues";
  renderReaderPublication(novel);
  renderReaderToc(documentData.headings);
  document.querySelector("#readerBody").innerHTML = renderNovelDocument(documentData);
  const readerOrnaments = renderReaderOrnaments(novel);
  reader.scrollTop = 0;
  updateReaderProgress();

  const head = document.querySelector(".reader-head");
  const sheet = document.querySelector(".reader-sheet");
  const titleItems = Array.from(document.querySelectorAll(".reader-title-block > *"));

  if (useMotion()) {
    gsap.killTweensOf([reader, head, sheet, ...titleItems]);
    gsap.set(reader, { autoAlpha: 1, yPercent: 100 });
    gsap.set(head, { autoAlpha: 0, y: -14 });
    gsap.set(titleItems, { autoAlpha: 0, y: 28 });
    if (readerOrnaments.length) gsap.set(readerOrnaments, { autoAlpha: 0 });
  }

  reader.classList.add("is-open");
  reader.setAttribute("aria-hidden", "false");
  reader.inert = false;
  setInterfaceLocked(true, reader);
  syncReaderBackdropHeight();

  if (!useMotion()) {
    document.querySelector("#readerClose").focus({ preventScroll: true });
    return;
  }

  const timeline = gsap.timeline({ onComplete: () => {
    window.requestAnimationFrame(() => {
      gsap.set(reader, { clearProps: "transform" });
      syncReaderBackdropHeight();
      document.querySelector("#readerClose").focus({ preventScroll: true });
    });
  } })
    .to(reader, { yPercent: 0, duration: 0.82, ease: "power3.out" }, 0)
    .to(head, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.2)
    .to(titleItems, { autoAlpha: 1, y: 0, duration: 0.64, stagger: 0.07, ease: "power3.out" }, 0.28);
  if (readerOrnaments.length) {
    timeline.to(readerOrnaments, { autoAlpha: 1, duration: 0.8, stagger: 0.045, ease: "power2.out" }, 0.34);
  }
}

function closeReader() {
  if (!reader.classList.contains("is-open")) return;
  const finish = () => {
    reader.classList.remove("is-open");
    reader.classList.remove(...readerThemeClasses);
    delete reader.dataset.phase;
    document.querySelector("#readerOrnaments").innerHTML = "";
    reader.setAttribute("aria-hidden", "true");
    if (gsap) gsap.set(reader, { clearProps: "opacity,visibility,transform" });
    setInterfaceLocked(false);
    readerTrigger?.focus({ preventScroll: true });
  };

  if (!useMotion()) {
    finish();
    return;
  }
  gsap.to(reader, { yPercent: 100, duration: 0.62, ease: "power3.in", onComplete: finish });
}

function updateReaderProgress() {
  const max = reader.scrollHeight - reader.clientHeight;
  const progress = max > 0 ? Math.min(1, reader.scrollTop / max) : 0;
  const phase = progress < 0.34 ? "opening" : progress < 0.72 ? "middle" : "ending";
  if (reader.dataset.phase !== phase) reader.dataset.phase = phase;
  reader.style.setProperty("--reading-progress", progress.toFixed(4));
  document.querySelector("#readerProgress").style.transform = `scaleX(${progress})`;
  document.querySelector("#readerPosition").textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
  const chapterButtons = Array.from(document.querySelectorAll("#readerToc [data-reader-chapter]"));
  if (chapterButtons.length) {
    const readingLine = reader.scrollTop + reader.clientHeight * 0.34;
    let activeChapter = chapterButtons[0].dataset.readerChapter;
    chapterButtons.forEach((button) => {
      const chapter = document.querySelector(`#${button.dataset.readerChapter}`);
      if (chapter && chapter.offsetTop <= readingLine) activeChapter = button.dataset.readerChapter;
    });
    chapterButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.readerChapter === activeChapter));
  }
}

function getViewerSize(item) {
  const mobile = window.innerWidth < 700;
  const isPhotography = Boolean(item.exif);
  const maxWidth = window.innerWidth * (mobile ? 0.9 : isPhotography ? 0.62 : 0.74);
  const maxHeight = window.innerHeight * (mobile ? (isPhotography ? 0.48 : 0.64) : isPhotography ? 0.68 : 0.76);
  const width = Number(item.width) || maxWidth;
  const height = Number(item.height) || maxHeight;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function setViewerContent(index) {
  const item = viewerImages[index];
  if (!item) return;
  const sampledImage = await preload(item.src);
  viewerIndex = index;
  const image = document.querySelector("#viewerImage");
  const figure = document.querySelector(".viewer-figure");
  const size = getViewerSize(item);
  figure.style.width = `${size.width}px`;
  figure.style.height = `${size.height}px`;
  image.src = item.src;
  image.alt = item.title;
  document.querySelector("#viewerBlur").src = item.src;
  document.querySelector("#viewerTitle").textContent = item.title;
  document.querySelector("#viewerGroup").textContent = item.note || item.group || "Selected work";
  const exif = document.querySelector("#viewerExif");
  const isPhotography = Boolean(item.exif);
  viewer.classList.toggle("is-photography", isPhotography);
  document.querySelector("#viewerArchive").textContent = isPhotography ? "浮光记 · Photographic notes" : "Portrait archive";
  exif.hidden = !isPhotography;
  if (isPhotography) {
    document.querySelector("#viewerCoordinates").textContent = item.exif.coordinates;
    document.querySelector("#viewerCamera").textContent = item.exif.camera;
    document.querySelector("#viewerLens").textContent = item.exif.lens;
    document.querySelector("#viewerExposure").textContent = item.exif.exposure;
    document.querySelector("#viewerCaptured").textContent = item.exif.captured;
  }
  document.querySelector("#viewerCounter").textContent = `${String(index + 1).padStart(2, "0")} / ${String(viewerImages.length).padStart(2, "0")}`;
  document.querySelector("#viewerPrev").disabled = index === 0;
  document.querySelector("#viewerNext").disabled = index === viewerImages.length - 1;
  document.querySelector("#viewerColor").style.setProperty("--viewer-color", extractViewerColor(sampledImage, item.src));
  await ensureImage(image);
}

async function openViewer(images, index, trigger) {
  if (!images[index] || viewer.classList.contains("is-open")) return;
  viewerImages = images;
  viewerTrigger = trigger;
  const figure = document.querySelector(".viewer-figure");
  const head = document.querySelector(".viewer-head");
  const caption = document.querySelector(".viewer-caption");
  const controls = document.querySelector(".viewer-controls");
  const exif = document.querySelector("#viewerExif");

  if (useMotion()) {
    gsap.killTweensOf([viewer, figure, head, caption, controls, exif]);
    gsap.set(viewer, { autoAlpha: 0 });
    gsap.set(figure, { autoAlpha: 0, y: 26, clipPath: "inset(8% 8% 8% 8% round 2px)" });
    gsap.set([head, caption, controls, exif], { autoAlpha: 0, y: 12 });
  }

  await setViewerContent(index);
  viewer.classList.add("is-open");
  viewer.setAttribute("aria-hidden", "false");
  viewer.inert = false;
  setInterfaceLocked(true, viewer);

  if (!useMotion()) {
    document.querySelector("#viewerClose").focus({ preventScroll: true });
    return;
  }

  gsap.timeline({ onComplete: () => document.querySelector("#viewerClose").focus({ preventScroll: true }) })
    .to(viewer, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0)
    .to(figure, { autoAlpha: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 0.78, ease: "expo.out" }, 0.08)
    .to([head, caption, controls, exif], { autoAlpha: 1, y: 0, duration: 0.48, stagger: 0.06, ease: "power3.out" }, 0.28);
}

async function moveViewer(direction) {
  if (viewerMoving) return;
  const next = Math.max(0, Math.min(viewerImages.length - 1, viewerIndex + direction));
  if (next === viewerIndex) return;
  viewerMoving = true;
  const figure = document.querySelector(".viewer-figure");

  if (useMotion()) {
    await new Promise((resolve) => gsap.to(figure, { autoAlpha: 0, x: -direction * 36, duration: 0.22, ease: "power2.in", onComplete: resolve }));
  }
  await setViewerContent(next);
  if (useMotion()) {
    gsap.fromTo(figure,
      { autoAlpha: 0, x: direction * 42, clipPath: "inset(5% 5% 5% 5%)" },
      { autoAlpha: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power3.out", onComplete: () => { viewerMoving = false; } }
    );
  } else {
    viewerMoving = false;
  }
}

function closeViewer() {
  if (!viewer.classList.contains("is-open")) return;
  const figure = document.querySelector(".viewer-figure");
  const finish = () => {
    viewer.classList.remove("is-open");
    viewer.setAttribute("aria-hidden", "true");
    if (gsap) gsap.set([viewer, figure], { clearProps: "opacity,visibility,transform,clipPath" });
    setInterfaceLocked(false);
    viewerTrigger?.focus({ preventScroll: true });
  };

  if (!useMotion()) {
    finish();
    return;
  }
  gsap.timeline({ onComplete: finish })
    .to(figure, { autoAlpha: 0, y: 18, clipPath: "inset(7% 7% 7% 7%)", duration: 0.3, ease: "power2.in" }, 0)
    .to(viewer, { autoAlpha: 0, duration: 0.36, ease: "power2.in" }, 0.08);
}

function setupReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5%" });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function setupHeroMotion() {
  const hero = document.querySelector(".hero");
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frame = 0;

  const render = () => {
    currentX += (targetX - currentX) * 0.025;
    currentY += (targetY - currentY) * 0.025;
    hero.style.setProperty("--mx", currentX.toFixed(4));
    hero.style.setProperty("--my", currentY.toFixed(4));

    if (Math.abs(targetX - currentX) > 0.0005 || Math.abs(targetY - currentY) > 0.0005) {
      frame = window.requestAnimationFrame(render);
    } else {
      currentX = targetX;
      currentY = targetY;
      hero.style.setProperty("--mx", currentX.toFixed(4));
      hero.style.setProperty("--my", currentY.toFixed(4));
      frame = 0;
    }
  };

  const moveToward = (x, y) => {
    targetX = x;
    targetY = y;
    if (!frame) frame = window.requestAnimationFrame(render);
  };

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reducedMotion.matches) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 0.34;
    const y = (event.clientY / window.innerHeight - 0.5) * 0.34;
    moveToward(x, y);
  });
  hero.addEventListener("pointerleave", () => {
    moveToward(0, 0);
  });
}

function setupCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const cursor = document.querySelector("#cursor");
  const label = cursor.querySelector("span");
  const cursorLabels = {
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

  const setCursorTarget = (source) => {
    const target = source?.closest?.("[data-cursor]");
    const mode = target?.dataset.cursor || "";
    cursor.classList.toggle("is-active", Boolean(mode));
    if (mode) cursor.dataset.mode = mode;
    else delete cursor.dataset.mode;
    label.textContent = cursorLabels[mode] || "";
  };

  window.addEventListener("pointermove", (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    cursor.classList.add("is-visible");
  });
  document.addEventListener("pointerover", (event) => {
    setCursorTarget(event.target);
  });
  document.addEventListener("pointerout", (event) => {
    setCursorTarget(event.relatedTarget);
  });
  document.addEventListener("focusin", (event) => setCursorTarget(event.target));
  document.addEventListener("focusout", (event) => setCursorTarget(event.relatedTarget));
  window.addEventListener("blur", () => cursor.classList.remove("is-visible"));
}

function setupGlobalEvents() {
  document.querySelector("#readerClose").addEventListener("click", closeReader);
  document.querySelector("#noteReaderClose").addEventListener("click", closeTechNoteReader);
  document.querySelector("#techPreviewOpen").addEventListener("click", (event) => {
    const note = technicalNotes.find((item) => item.id === activeTechNoteId);
    openTechNoteReader(note, event.currentTarget);
  });
  document.querySelector("#viewerClose").addEventListener("click", closeViewer);
  document.querySelector("#viewerPrev").addEventListener("click", () => moveViewer(-1));
  document.querySelector("#viewerNext").addEventListener("click", () => moveViewer(1));
  document.querySelector("#portraitCover").addEventListener("click", (event) => openViewer(portraitImages, portraitIndex, event.currentTarget));
  reader.addEventListener("scroll", updateReaderProgress, { passive: true });
  noteReader.addEventListener("scroll", updateNoteReaderProgress, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (viewer.classList.contains("is-open")) closeViewer();
      else if (noteReader.classList.contains("is-open")) closeTechNoteReader();
      else if (reader.classList.contains("is-open")) closeReader();
    }
    if (!viewer.classList.contains("is-open")) return;
    if (event.key === "ArrowLeft") moveViewer(-1);
    if (event.key === "ArrowRight") moveViewer(1);
  });

  window.addEventListener("resize", () => {
    if (viewer.classList.contains("is-open")) setViewerContent(viewerIndex);
    if (reader.classList.contains("is-open")) syncReaderBackdropHeight();
  });

  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    masthead.classList.toggle("is-hidden", current > lastScrollY && current > 180);
    lastScrollY = current;
  }, { passive: true });
}

function animateEntrance() {
  const boot = document.querySelector("#boot");
  if (!useMotion()) {
    boot.remove();
    return;
  }

  gsap.set([".hero-klein", ".hero-blues", ".hero-note", ".hero-intro", ".scroll-cue", ".masthead"], { autoAlpha: 0 });
  gsap.set(".hero-card", { autoAlpha: 0, scale: 0.82 });
  const bootPrimary = document.querySelector("#bootPrimary");
  const bootSecondary = document.querySelector("#bootSecondary");
  bootPrimary.textContent = "";
  bootSecondary.textContent = "";
  gsap.set(".boot-gap", { width: 0 });
  gsap.set(".boot-caret", { autoAlpha: 1 });
  gsap.set(".boot p", { autoAlpha: 0, y: 5 });
  gsap.timeline()
    .call(() => { bootPrimary.textContent = "K"; }, null, 0)
    .call(() => { bootPrimary.textContent = "KL"; }, null, 0.04)
    .call(() => { bootPrimary.textContent = "KLE"; }, null, 0.08)
    .call(() => { bootPrimary.textContent = "KLEI"; }, null, 0.12)
    .call(() => { bootPrimary.textContent = "KLEIN"; }, null, 0.16)
    .to(".boot-caret", { autoAlpha: 0.28, duration: 0.06, repeat: 1, yoyo: true, ease: "sine.inOut" }, 0.23)
    .set(".boot-gap", { width: "0.2em" }, 0.32)
    .call(() => { bootSecondary.textContent = "B"; }, null, 0.32)
    .call(() => { bootSecondary.textContent = "BL"; }, null, 0.36)
    .call(() => { bootSecondary.textContent = "BLu"; }, null, 0.4)
    .call(() => { bootSecondary.textContent = "BLue"; }, null, 0.44)
    .call(() => { bootSecondary.textContent = "BLues"; }, null, 0.48)
    .to(".boot p", { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" }, 0.2)
    .to(".boot-caret", { autoAlpha: 0, duration: 0.09, ease: "power2.in" }, 0.56)
    .to(".boot", { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, 0.65)
    .add(() => boot.remove())
    .fromTo(".hero-klein", { autoAlpha: 0, y: 90 }, { autoAlpha: 1, y: 0, duration: 1.05, ease: "expo.out" }, 1.05)
    .fromTo(".hero-blues", { autoAlpha: 0, y: -70 }, { autoAlpha: 1, y: 0, duration: 1.05, ease: "expo.out" }, 1.16)
    .to(".hero-card", { autoAlpha: 1, scale: 1, duration: 0.9, stagger: 0.075, ease: "expo.out" }, 1.28)
    .to([".hero-note", ".hero-intro", ".scroll-cue", ".masthead"], { autoAlpha: 1, duration: 0.65, stagger: 0.055, ease: "power3.out" }, 1.55);
}

function init() {
  renderHero();
  renderNovels();
  setupFictionSwitch();
  renderCharacters();
  renderPhotography();
  renderTechnicalNotes();
  setupPortraitRail();
  setupReveals();
  setupHeroMotion();
  setupCursor();
  setupGlobalEvents();
  animateEntrance();
  initWeather();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
