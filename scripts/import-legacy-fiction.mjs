import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDirectory = process.argv[2];

if (!sourceDirectory) {
  throw new Error("Usage: npm run import:fiction -- <legacy finished-text directory>");
}

const works = [
  {
    slug: "deep-blue",
    source: "deep-blue.txt",
    title: "深蓝",
    subtitle: "Original fiction · KLEIN BLues",
    excerpt: "在北境漫长的极夜里，一位失去记忆的钢琴家与新来的邻居反复相识。未完成的乐曲、被遗忘的约定，以及海岸尽头的深蓝，逐渐拼回一段不愿消失的过去。",
    cover: "/assets/images/novel-covers/deep-blue.jpg",
    order: 1,
    charCount: 20171,
    theme: "deepblue",
    publication: [
      { label: "完成", value: "2025.04.21—04.27" },
      { label: "第一次修改", value: "2025.05.01" }
    ],
    music: {
      title: "Falling into Presence",
      artist: "Borrtex",
      url: "https://music.163.com/song?id=1330935435",
      artwork: "https://p1.music.126.net/AvbPQfWgipEno1XWbS3bXw==/109951164518215779.jpg"
    }
  },
  {
    slug: "white-bird-tears",
    source: "white-bird.txt",
    title: "白鸟之泪",
    subtitle: "Original fiction · KLEIN BLues",
    excerpt: "持续不断的高原雨季困住了一名白鸟观察者，也让他走近草原上的少年与脆弱的候鸟栖地。当保护与掠夺正面相遇，洁白的羽翼成为信念、牺牲与遗忘的见证。",
    cover: "/assets/images/novel-covers/white-bird.jpg",
    order: 2,
    charCount: 4067,
    theme: "whitebird",
    publication: [{ label: "完成", value: "2026.05.28" }]
  },
  {
    slug: "winter-of-the-other-shore",
    source: "winter-shore.txt",
    title: "彼岸之冬",
    englishTitle: "Winter of the Other World",
    subtitle: "Original fiction · KLEIN BLues",
    excerpt: "一颗水仙块茎牵引柯尔利特回到被风雪封存的小镇。教堂、温泉与名为铃的少女在错位的记忆中重现，迫使他面对一场多年以前未曾伸手阻止的灾难。",
    cover: "/assets/images/novel-covers/winter-shore.jpg",
    order: 3,
    charCount: 23477,
    theme: "winter",
    publication: []
  },
  {
    slug: "empty-box",
    source: "empty-box.txt",
    title: "空箱",
    subtitle: "Original fiction · KLEIN BLues",
    excerpt: "阁楼里的一只嫁妆箱保存着一名女子从少女时代到命运倾覆的全部痕迹。织物、钥匙与逐渐被取空的嫁妆，共同讲述一段被生活耗尽、又被后人轻易抹去的人生。",
    cover: "/assets/images/novel-covers/empty-box.jpg",
    order: 4,
    charCount: 2675,
    theme: "emptybox",
    publication: [{ label: "成稿", value: "2023.08.29" }]
  },
  {
    slug: "mountain-sea-traveler",
    source: "mountain-sea.txt",
    title: "山海行人",
    englishTitle: "The Demigod of Mountain and Sea",
    subtitle: "The Demigod of Mountain and Sea · KLEIN BLues",
    excerpt: "被家庭遗落的少年在山间遇见一位无人供奉的小神。花茶、竹笛与长明的香火陪伴他们走过短暂岁月，而现代生活的到来，也让神明面对被世人彻底忘却的命运。",
    cover: "/assets/images/novel-covers/mountain-sea.jpg",
    order: 5,
    charCount: 4883,
    theme: "mountainsea",
    publication: [{ label: "成稿", value: "2023.07.23" }]
  },
  {
    slug: "twilight-magician",
    source: "twilight-magician.txt",
    title: "黄昏的魔术师",
    englishTitle: "The Magician of Twilight",
    subtitle: "Original fiction · KLEIN BLues",
    excerpt: "失意的旅人在斯通古城外遇见继承父亲旧梦的少女。一次筹备于麦田与落日之间的魔术表演，让两个人重新理解离别、承诺，以及平凡生活中仍然存在的奇迹。",
    cover: "/assets/images/novel-covers/twilight-magician.svg",
    order: 6,
    charCount: 8693,
    theme: "magician",
    publication: [
      { label: "成稿", value: "2023.09.12" },
      { label: "修订", value: "2023.09.18" }
    ]
  },
  {
    slug: "eternal-railway",
    source: "eternal-railway.txt",
    title: "永远的铁道",
    englishTitle: "The Permafrozen Railway",
    subtitle: "The Permafrozen Railway · KLEIN BLues",
    excerpt: "一条从未迎来列车的铁路穿过常年落雪的小镇。枫与神秘少女白沿着铁轨寻找它的终点，也在现实与时间的缝隙里，追逐一班只为真正想要离开的人停靠的列车。",
    cover: "/assets/images/novel-covers/eternal-railway.jpg",
    order: 7,
    charCount: 5009,
    theme: "railway",
    publication: [{ label: "成稿", value: "2023.01.25" }]
  }
];

const outputDirectory = resolve("src/content/fiction");
await mkdir(outputDirectory, { recursive: true });

const yamlString = (value) => JSON.stringify(value);

for (const work of works) {
  const source = await readFile(resolve(sourceDirectory, work.source), "utf8");
  const fields = [
    `title: ${yamlString(work.title)}`,
    ...(work.englishTitle ? [`englishTitle: ${yamlString(work.englishTitle)}`] : []),
    `subtitle: ${yamlString(work.subtitle)}`,
    `excerpt: ${yamlString(work.excerpt)}`,
    `cover: ${yamlString(work.cover)}`,
    `order: ${work.order}`,
    `charCount: ${work.charCount}`,
    `theme: ${yamlString(work.theme)}`,
    ...(work.publication.length
      ? ["publication:", ...work.publication.flatMap((item) => [
          `  - label: ${yamlString(item.label)}`,
          `    value: ${yamlString(item.value)}`
        ])]
      : ["publication: []"]),
    ...(work.music
      ? [
          "music:",
          `  title: ${yamlString(work.music.title)}`,
          `  artist: ${yamlString(work.music.artist)}`,
          `  url: ${yamlString(work.music.url)}`,
          `  artwork: ${yamlString(work.music.artwork)}`
        ]
      : [])
  ];
  const document = `---\n${fields.join("\n")}\n---\n\n${source.replace(/^\uFEFF/, "").trim()}\n`;
  await writeFile(resolve(outputDirectory, `${work.slug}.md`), document, "utf8");
}

console.log(`Imported ${works.length} fiction documents into ${outputDirectory}`);
