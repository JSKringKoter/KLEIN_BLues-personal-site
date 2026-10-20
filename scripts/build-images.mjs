// 生成派生图片（输出提交到仓库，Vercel 构建时不需要运行）：
//   1. 查看器用的中等尺寸 webp：public/assets/images/<组>/<名>.<ext> → public/assets/images/viewer/<组>/<名>.webp（长边 ≤ 2400px）
//   2. 分享图：SVG 封面在社交平台不显示，栅格化为同名 1200×630 的 jpg（public/assets/images/novel-covers/<名>.og.jpg）
// 用法：npm run images（只处理比输出更新的源文件；加 --force 全部重做）
import { readdir, stat, mkdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import sharp from "sharp";

const root = resolve("public/assets/images");
const force = process.argv.includes("--force");
// 原图所在的目录（人物绘画与摄影）；缩略图、卡面、封面等已经是小图，不需要
const viewerGroups = ["bayue", "cappuccino", "jiuri", "ling-christine", "liuli-stonegu", "ohm", "yumeng", "photography"];
const VIEWER_EDGE = 2400;

async function newer(source, output) {
  if (force) return true;
  try {
    return (await stat(source)).mtimeMs > (await stat(output)).mtimeMs;
  } catch {
    return true;
  }
}

let made = 0;
let saved = 0;

for (const group of viewerGroups) {
  const dir = join(root, group);
  for (const name of await readdir(dir)) {
    if (!/\.(png|jpe?g)$/i.test(name) || /-thumb\./i.test(name)) continue;
    const source = join(dir, name);
    const output = join(root, "viewer", group, name.replace(extname(name), ".webp"));
    if (!(await newer(source, output))) continue;
    await mkdir(dirname(output), { recursive: true });
    const info = await sharp(source)
      .rotate()
      .resize({ width: VIEWER_EDGE, height: VIEWER_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, smartSubsample: true, effort: 5 })
      .toFile(output);
    const before = (await stat(source)).size;
    saved += before - info.size;
    made += 1;
    console.log(`viewer  ${relative(root, output)}  ${(before / 1e6).toFixed(1)}MB → ${(info.size / 1e6).toFixed(2)}MB`);
  }
}

const covers = join(root, "novel-covers");
for (const name of await readdir(covers)) {
  if (extname(name) !== ".svg") continue;
  const source = join(covers, name);
  const output = join(covers, name.replace(/\.svg$/, ".og.jpg"));
  if (!(await newer(source, output))) continue;
  await sharp(source, { density: 144 }).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 86, mozjpeg: true }).toFile(output);
  made += 1;
  console.log(`og      ${relative(root, output)}`);
}

console.log(made ? `\n${made} file(s) written, ${(saved / 1e6).toFixed(1)}MB saved on viewer images.` : "Everything is up to date.");
