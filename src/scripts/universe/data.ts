// 《苍穹 The Universe》设定数据
// 统一口径：核心参数以编年史附录为准；平行世界层级以「普朗克常量大小」为准（第三 > 第一 > 第二）。

export type Route = 'wide' | 'tear' | 'merge';

export interface Chapter {
  key: string;
  index: string;
  title: string;
  en: string;
  lead: string;
  body: string;
  hint: string;
}

export const CHAPTERS: Chapter[] = [
  {
    key: 'prologue',
    index: '00',
    title: '苍穹',
    en: 'THE UNIVERSE',
    lead: '一颗晶体，是另一个世界在此处的投影。',
    body: '从二十三世纪人类离开濒死的地球，到三大平行世界崩解、宇宙重启——一切都始于一种会散发烟尘的水晶。',
    hint: '滚动以进入',
  },
  {
    key: 'core',
    index: '01',
    title: '核心',
    en: 'CORE',
    lead: '下一级平行世界的暗物质，在此处凝结成有规则几何外形的晶体。',
    body: '核心与使用者的大脑建立量子连结，读取思想，将暗物质激发为实体。它能供能、具现化，并在小范围内改写自然法则。',
    hint: '点击晶体查看五种核心',
  },
  {
    key: 'chronicle',
    index: '02',
    title: '纪年',
    en: 'CHRONICLE',
    lead: '两条航线自同一片星空出发，在八百七十年后重逢。',
    body: '广域宇宙沿着核心一路走向星海；第一开拓者被黑洞带封死于彼端，建立了泪城。',
    hint: '继续滚动穿越时间 · 点击节点',
  },
  {
    key: 'galaxy',
    index: '03',
    title: '星图',
    en: 'GALAXY',
    lead: '第二次星际战争时期的银河。',
    body: '两条黑洞带横亘旋臂之间。银心的引力撕开超膜，成为通往平行世界的天然裂隙。',
    hint: '点击星系查看阵营',
  },
  {
    key: 'worlds',
    index: '04',
    title: '三界',
    en: 'THREE WORLDS',
    lead: '普朗克常量有三个解，宇宙因此被分隔为三个平行世界。',
    body: '世界之间以超膜相隔。每一次具现化，都在从下一层世界抽取暗物质。',
    hint: '点击世界层查看',
  },
  {
    key: 'convergence',
    index: '05',
    title: '合界',
    en: 'CONVERGENCE',
    lead: '公元3600年，超膜崩塌，三界合而为一。',
    body: '宇宙最本源的力量——秩序，凝结为六块秩序核心，散落于合界各处。当它们重新组合，世界将再次分开，开始下一个循环。',
    hint: '继续滚动 · 进入下一个循环',
  },
];

export interface CoreInfo {
  id: string;
  name: string;
  en: string;
  color: string;
  formula: string;
  minor: string;
  lattice: string;
  origin: string;
  shape: string;
  stats: [number, number, number, number]; // 供能 具现化 技能概率 技能效果
  desc: string;
}

export const CORES: CoreInfo[] = [
  {
    id: 'planwaze',
    name: '普兰沃兹结晶',
    en: 'THE PLANWAZE CORE',
    color: '#9a5bc4',
    formula: 'α-Al₂O₃',
    minor: '铁 · 钛 · 铬',
    lattice: '六方堆积',
    origin: '普兰沃兹合众国',
    shape: '黄紫 · 多面体',
    stats: [3, 2, 1, 1],
    desc: '人类最早发现的核心。普兰沃兹地区核心丰度高达20%，全银河七成核心由此供应。多数不具核心能力，被作为能源使用；高纯结晶可提升其他核心的具现化能力。',
  },
  {
    id: 'originate',
    name: '源晶石',
    en: 'THE ORIGINATE',
    color: '#d99a2b',
    formula: 'SiO₂',
    minor: '铝 · 铁',
    lattice: '四方堆积',
    origin: '太阳系共和国',
    shape: '澄黄 · 十六面体',
    stats: [2, 3, 2, 2],
    desc: '公元3008年于太阳系发现。具现化灵敏度极高，善于进行结构展开，是融合核心与核心战机的首选材料。',
  },
  {
    id: 'echo',
    name: '回音',
    en: 'THE ECHO',
    color: '#3f63d8',
    formula: 'SiO₂',
    minor: '锰 · 铁(Ⅲ)',
    lattice: '六方堆积',
    origin: '泪城',
    shape: '蓝紫 · 球形',
    stats: [1, 2, 3, 3],
    desc: '出产于第一黑洞带彼端，通常带有球状凝结核。具现化能力平庸，却最常表现出核心技能。泪城正是被回音托举上天空。',
  },
  {
    id: 'ironstone',
    name: '岩铁核晶',
    en: 'THE IRON-STONE CORE',
    color: '#8b8574',
    formula: 'FeS₂',
    minor: '金 · 铜',
    lattice: '八方堆积',
    origin: '维多利亚共和国',
    shape: '金属光泽 · 方形',
    stats: [1, 2, 1, 3],
    desc: '产出于天然黄铁结晶中。供能与具现化能力均弱，无法兼容现有核心设备；可一旦表现出核心技能，效果极强。',
  },
  {
    id: 'nether',
    name: '地狱合晶',
    en: 'THE NETHER CORE',
    color: '#c63b3b',
    formula: '未知',
    minor: '未知',
    lattice: '多种堆积结构',
    origin: '帷幕个体',
    shape: '赤红 · 不定型',
    stats: [2, 2, 3, 2],
    desc: '孕育于每一个帷幕胚胎之中、独一无二的寄生核心。它赋予帷幕近乎不死的自愈能力，也是核心共鸣最初的载体。',
  },
];

export const CORE_ABILITIES = [
  { k: '供能', v: '湮灭暗物质，释放能量' },
  { k: '具现化', v: '将暗物质转化为实体' },
  { k: '核心技能', v: '在小范围内改写法则' },
];

export interface ChronicleEvent {
  year: number;
  route: Route;
  title: string;
  text: string;
}

export const ROUTE_LABEL: Record<Route, string> = {
  wide: '广域宇宙',
  tear: '泪城',
  merge: '合并宇宙',
};

export const EVENTS: ChronicleEvent[] = [
  { year: 2230, route: 'wide', title: '航标计划', text: '四支开拓者编队——每队一万两千人、三艘星际母舰——驶离生态崩溃的地球，寻找可供生存的星球。' },
  { year: 2258, route: 'tear', title: '黑洞带空窗', text: '第一开拓者在航线前方发现成片黑洞，只剩一个恒星系宽的空窗。燃料已不足以返航，舰队驶入空窗，从此与地球断绝联系。' },
  { year: 2265, route: 'wide', title: '复苏计划', text: '地球人口锐减至十二亿，联合政府放弃航标计划，转而倾尽全力恢复地球生态。' },
  { year: 2270, route: 'wide', title: '普兰沃兹', text: '失联五年的第四开拓者传回讯息：殖民地建立成功，那里有一种周围总萦绕着烟尘的水晶，能提供大量能量。' },
  { year: 2286, route: 'wide', title: '核心', text: '水晶被正式命名为核心（Core），新世界被命名为普兰沃兹。次年，核心具现化现象被首次观测到。' },
  { year: 2298, route: 'tear', title: '恒星爆发', text: '空窗星系的恒星提前爆发，γ射线击穿了舰队的智能设备，三艘飞船中储存的科技产物几近全毁。' },
  { year: 2320, route: 'tear', title: '帷幕降临', text: '来自平行世界的帷幕抵达星球，谈判破裂。第一代开拓者被全部歼灭，文明退回农耕时代。' },
  { year: 2389, route: 'wide', title: '可控具现化', text: '核心第一次与人的思维相连，具现化出一个简单的立方体。核心的机理被提升至量子层面。' },
  { year: 2451, route: 'tear', title: '回音', text: '反抗者在地底发现蓝紫色的新型核心，并将其组成大规模核心阵列。这些核心被称作「回音」。' },
  { year: 2481, route: 'tear', title: '帷幕撤离', text: '以全部人口缩减八成为代价，人类迫使帷幕撤离。王剑与王座被铸造出来，守护回音。' },
  { year: 2584, route: 'wide', title: '核心时代', text: '核心网络系统建成，量子计算机成为历史，人类从量子时代迈入核心时代。' },
  { year: 2592, route: 'tear', title: '泪城升空', text: '内战之中，回音被启动，王城周边的大片土地腾空而起。天空之城因海拔与水汽，得名「泪城」。' },
  { year: 2852, route: 'tear', title: '时光学院', text: '为应对帷幕的威胁，时光学院在斯通古城堡外的钟塔处成立，专授核心技艺。钟塔与琉璃尖顶保存至今。' },
  { year: 2930, route: 'tear', title: '地狱行者', text: '帷幕第二次入侵，由九位地狱行者率领。每位地狱行者都拥有两具肉体，可借核心共鸣即时切换。' },
  { year: 2939, route: 'tear', title: '泪城保卫战', text: '哈迪斯战死，帷幕投降。倒戈的摆渡者喀戎受封，于云翼主峰另一侧建立帷幕帝国。' },
  { year: 3008, route: 'wide', title: '源晶石', text: '太阳系共和国辖区内发现具现化能力更强的新型核心，命名为源晶石。' },
  { year: 3040, route: 'wide', title: '融合核心', text: '两种不同的核心首次被熔铸为一，获得超高灵敏度。第一颗融合核心被称为「开物」。' },
  { year: 3041, route: 'wide', title: '第一次星际大战', text: '以太阳系共和国与普兰沃兹合众国为首的两大军事集团开战，双方先后研制出核心物质导弹。' },
  { year: 3053, route: 'wide', title: '银河联盟', text: '太阳系、普兰沃兹、维多利亚、北西西弗斯四国签署《银河联盟宪章》。' },
  { year: 3080, route: 'wide', title: '空间跃迁', text: '人类实现首次跃迁航行，速度可达四百倍光速，黑洞带不再是不可逾越的屏障。' },
  { year: 3099, route: 'wide', title: '重逢', text: '燎原计划开拓者突破第一黑洞带，在彼端的星球上发现了讲着日耳曼—罗曼混合语的人类。' },
  { year: 3102, route: 'merge', title: '人类大统一', text: '广域宇宙、泪城与帷幕在斯通古城堡会晤，于开拓者舰队上再次签署《银河联盟宪章》。' },
  { year: 3104, route: 'merge', title: '核心共鸣', text: '基于帷幕核心共鸣的超距通信问世，五百光年的延时被压缩至一毫秒。' },
  { year: 3145, route: 'merge', title: '核心战机', text: '结构展开技术成熟，一颗核心即可展开为一架星际战机。' },
  { year: 3160, route: 'merge', title: '三个平行世界', text: '科学家证实宇宙分为三个平行世界；具现化所需的暗物质，来自下一级平行世界。' },
  { year: 3235, route: 'merge', title: '古风运动', text: '地球居民开始模仿中国古代的建筑与服饰，仿古建筑逐渐取代现代建筑，运动持续约八十年。' },
  { year: 3323, route: 'merge', title: '第二次星际战争', text: '银河联邦改称银河帝国，向宣布独立的原特别行政区宣战。' },
  { year: 3340, route: 'merge', title: '停战', text: '帝国军队被普兰沃兹、太阳系与泪城—帷幕联军击溃，双方在帝国首都签署条约。' },
  { year: 3422, route: 'merge', title: '帝国解体', text: '经过七十余年的和平，帝国影响力逐渐衰弱，最终解体。' },
  { year: 3428, route: 'merge', title: '第一次界崩危机', text: '长期的具现化从下界抽取物质，平行世界间的物质与能量失衡，超膜承受的压力与日俱增。' },
  { year: 3597, route: 'merge', title: '第二次界崩危机', text: '超膜开始出现无法弥合的破碎。' },
  { year: 3600, route: 'merge', title: '合界', text: '三大平行世界崩解，银河系文明覆灭。宇宙进入合界阶段。' },
];

export interface FactionInfo {
  id: string;
  name: string;
  en: string;
  color: string;
  core: string;
  lines: string[];
  desc: string;
}

export const FACTIONS: FactionInfo[] = [
  {
    id: 'solar',
    name: '太阳系共和国',
    en: 'THE REPUBLIC OF SOLAR SYSTEM',
    color: '#d99a2b',
    core: '源晶石',
    lines: ['太阳系近卫军团 · 唐', '东林书会', '天工集团', '日冕军事学院'],
    desc: '人类星际时代成立的第一个国家。拥有全银河最先进的战机、核心引擎与防御系统，曾击溃银河帝国的入侵。',
  },
  {
    id: 'planwaze',
    name: '普兰沃兹合众国',
    en: 'THE UNITED STATES OF PLANWAZE',
    color: '#9a5bc4',
    core: '普兰沃兹结晶',
    lines: ['常备军团 · 猎户座', '议会', '联邦科学院'],
    desc: '位于第二黑洞带附近，人类最早发现核心的星系。GDP占全银河35%，即使遭受帝国制裁，仍是银河经济最发达的地区。',
  },
  {
    id: 'tear',
    name: '泪城',
    en: 'THE CITY BEYOND TEAR',
    color: '#3f63d8',
    core: '回音',
    lines: ['皇室', '皇家科学院', '时光学院', '荷尔特属国'],
    desc: '第一开拓者的后裔在第一黑洞带彼端建立的天空之城。荷尔特属国以天鹅为图腾，保留着后哥特式的建筑风格。',
  },
  {
    id: 'curtain',
    name: '帷幕帝国',
    en: 'CURTAIN EMPIRE',
    color: '#c63b3b',
    core: '地狱合晶',
    lines: ['皇室', '皇家科学院', '防卫军团 · 地狱行者'],
    desc: '来自第二平行世界的核心生物，外貌近似神话中的恶魔。他们在黑暗中力量倍增，在光照下特征会部分隐藏。',
  },
  {
    id: 'empire',
    name: '银河帝国',
    en: 'THE UNITED KINGDOM OF UNIVERSE',
    color: '#4a5064',
    core: '无',
    lines: ['天启军团', '帝国重工业星组 · EHIS', '明义集团'],
    desc: '由腐化的银河联邦改制而来，等级森严。重工业星组的环境遭到极大破坏，种植任何绿色植物都被视为非法。',
  },
];

export interface WorldInfo {
  id: string;
  name: string;
  en: string;
  color: string;
  desc: string;
}

export const WORLDS: WorldInfo[] = [
  {
    id: 'heaven',
    name: '第三平行世界 · 天堂',
    en: 'HEAVEN',
    color: '#c9a557',
    desc: '普朗克常量最大的一层。几乎只有常物质与少量能量，蕴藏着丰富的核心物质，至今未发现生命。',
  },
  {
    id: 'prime',
    name: '第一平行世界 · 主世界',
    en: 'PRIME',
    color: '#1f3fae',
    desc: '人类生存的世界。常物质与反物质均较少，能量相对浓郁，物质之间维持着相对的平衡。',
  },
  {
    id: 'nether',
    name: '第二平行世界 · 下界',
    en: 'NETHER',
    color: '#b8323a',
    desc: '普朗克常量最小的一层。暗物质与反物质居多，全银河具现化所需的暗物质多取自此处。帷幕的故乡。',
  },
  {
    id: 'core',
    name: '银心',
    en: 'GALACTIC CORE',
    color: '#1b2233',
    desc: '贯穿三界的巨大星体。在它的引力下三界相互紧贴、保持稳定，周围的超膜被撕开，形成通往平行世界的天然裂隙。',
  },
];
