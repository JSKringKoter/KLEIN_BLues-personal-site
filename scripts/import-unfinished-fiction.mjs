import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error("Usage: npm run import:drafts -- <legacy unfinished-text directory>");

const works = [
  { slug: "listen-to-wind-and-snow", source: "qieting-fengxue.txt", title: "且听风雪", subtitle: "未尽之稿 · KLEIN BLues", excerpt: "铺开纸笔，墨水饱蘸，本想就此落笔，你却犹豫了。窗外初雪纷飞，旧信与思念都被封存在同一个寒冬。", cover: "/assets/images/novel-covers/qieting-fengxue.svg", order: 1, theme: "winter", publication: [{ label: "写于", value: "2022.10.06" }] },
  { slug: "south-city-memories", source: "nancheng-wangshi.txt", title: "南城往事", subtitle: "未尽之稿 · KLEIN BLues", excerpt: "太阳晒着港口，运河是绿的。繁华的南城巷在雨幕里一闪而过，只剩破败小楼与一盏没有熄灭的烛。", cover: "/assets/images/novel-covers/nancheng-wangshi.svg", order: 2, theme: "southcity", publication: [] },
  { slug: "in-the-depths-of-dust", source: "chenai-shenchu.txt", title: "尘埃深处", subtitle: "天空之梦 · 未尽 · KLEIN BLues", excerpt: "在没有四季、没有生命的荒漠星球 EHIS-4，人们早已忘记地球与秋天。一点意外出现的生机，却让细雨重新有了可能。", cover: "/assets/images/novel-covers/chenai-shenchu.svg", order: 3, theme: "dust", publication: [{ label: "最近修改", value: "2026.07.13" }] },
  { slug: "cat-island-cafe", source: "maoyu-kafeiwu.txt", title: "猫屿咖啡屋", subtitle: "未尽之稿 · KLEIN BLues", excerpt: "旧城还留着最后一口气。那个金黄色的秋天，湖边、雨声与一位有着卡其色长发和猫耳的女孩，共同留下了一间咖啡屋的故事。", cover: "/assets/images/novel-covers/maoyu-kafeiwu.svg", order: 4, theme: "cafe", publication: [{ label: "最近修改", value: "2026.07.13" }] }
];

const outputDirectory = resolve("src/content/drafts");
await mkdir(outputDirectory, { recursive: true });
for (const work of works) {
  const source = await readFile(resolve(sourceDirectory, work.source), "utf8");
  const frontmatter = [
    `title: ${JSON.stringify(work.title)}`,
    `subtitle: ${JSON.stringify(work.subtitle)}`,
    `excerpt: ${JSON.stringify(work.excerpt)}`,
    `cover: ${JSON.stringify(work.cover)}`,
    `order: ${work.order}`,
    `charCount: ${(source.match(/[^\s]/g) || []).length}`,
    `theme: ${JSON.stringify(work.theme)}`,
    ...(work.publication.length ? ["publication:", ...work.publication.flatMap((item) => [`  - label: ${JSON.stringify(item.label)}`, `    value: ${JSON.stringify(item.value)}`])] : ["publication: []"])
  ];
  await writeFile(resolve(outputDirectory, `${work.slug}.md`), `---\n${frontmatter.join("\n")}\n---\n\n${source.replace(/^\uFEFF/, "").trim()}\n`, "utf8");
}
console.log(`Imported ${works.length} unfinished fiction documents into ${outputDirectory}`);
