export type NovelHeading = {
  type: "heading";
  level: 1 | 2;
  id: string;
  title: string;
  english: string;
  kicker: string;
};

export type NovelBlock =
  | NovelHeading
  | { type: "paragraph"; text: string }
  | { type: "spacer" }
  | { type: "sign"; lines: string[] }
  | { type: "file"; text: string }
  | { type: "letter"; lines: string[] }
  | { type: "signature"; text: string }
  | { type: "credit"; lines: string[] }
  | { type: "notation"; lyric: string; notation: string; pairs: Array<{ lyric: string; notation: string }> };

/** 用 :::名字 … ::: 包住的版式块，对应原稿里的特殊字体段落 */
const fenceTags = new Set(["sign", "letter", "signature", "credit", "file"]);

const footerPatterns = [
  /^(?:By\s+)?KLEIN\s*BLues\.?$/i,
  /^KringKoter\b.*$/i,
  /^淼然\s*20\d{2}[./年]/,
  /^(?:\(End\)|END)$/i,
  /^20\d{2}[./年-]\d{1,2}(?:[./月-]\d{1,2}日?)?(?:\s*~\s*20\d{2}[./年-]\d{1,2}(?:[./月-]\d{1,2}日?)?)?\s*(?:完成|第.*修改|修订|Revise)?$/i
];

function isFooter(line: string) {
  return footerPatterns.some((pattern) => pattern.test(line));
}

function isNotation(line: string) {
  return /^(?:变?[宫商角徵羽]){2,}$/.test(line.replace(/\s+/g, ""));
}

function parseHeading(raw: string, level: 1 | 2, novelTitle: string) {
  const heading = raw.trim().replace(/^<|>$/g, "").replace(/^[-—]+|[-—]+$/g, "").trim();
  if (novelTitle === "猫屿咖啡屋") {
    if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVXLCDM]+\.?$/i.test(heading)) {
      return { level: 2 as const, title: heading, english: "", kicker: "" };
    }
    if (heading === "来时路") {
      return { level: 1 as const, title: heading, english: "", kicker: "" };
    }
    if (heading === "第二章·行将近" || heading === "行将近") {
      return { level: 1 as const, title: "行将近", english: "Soon to Leave", kicker: "" };
    }
  }
  const divider = heading.indexOf("·");
  const hasEnglishPair = divider > 0 && /[A-Za-z]/.test(heading.slice(divider + 1));

  return {
    level,
    title: hasEnglishPair ? heading.slice(0, divider).trim() : heading,
    english: hasEnglishPair ? heading.slice(divider + 1).trim() : "",
    kicker: ""
  };
}

function pairNotation(lyric: string, notation: string) {
  const lyricUnits = lyric.trim().split(/\s+/).filter(Boolean);
  const notationUnits = notation.match(/变?[宫商角徵羽]/g) ?? [];
  if (lyricUnits.length === 0 || lyricUnits.length !== notationUnits.length) return [];
  return lyricUnits.map((unit, index) => ({ lyric: unit, notation: notationUnits[index] }));
}

export function parseNovelDocument(source: string, title: string) {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: NovelBlock[] = [];
  let firstContentFound = false;
  let headingIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

    if (!line) {
      if (blocks.length && blocks.at(-1)?.type !== "spacer") blocks.push({ type: "spacer" });
      continue;
    }

    if (!firstContentFound) {
      firstContentFound = true;
      if (!line.startsWith("#") && line.startsWith(title)) continue;
    }

    if (isFooter(line)) continue;

    const fenceMatch = line.match(/^:::(\w+)$/);
    if (fenceMatch && fenceTags.has(fenceMatch[1])) {
      const kind = fenceMatch[1];
      const collected: string[] = [];
      while (index + 1 < lines.length && lines[index + 1].trim() !== ":::") {
        index += 1;
        const inner = lines[index].replace(/[​-‍﻿]/g, "").trim();
        if (inner) collected.push(inner);
      }
      index += 1;
      if (kind === "file" || kind === "signature") {
        blocks.push({ type: kind, text: collected.join(" ") });
      } else {
        blocks.push({ type: kind as "sign" | "letter" | "credit", lines: collected });
      }
      continue;
    }

    const headingMatch = line.match(/^(#{1,2})\s+(.+)$/);
    if (headingMatch) {
      if (blocks.at(-1)?.type === "spacer" && blocks.at(-2)?.type === "heading") blocks.pop();
      headingIndex += 1;
      const heading = parseHeading(headingMatch[2], headingMatch[1].length as 1 | 2, title);
      blocks.push({ type: "heading", id: `chapter-${headingIndex}`, ...heading });
      continue;
    }

    const nextLine = (lines[index + 1] ?? "").trim();
    if (nextLine && isNotation(nextLine) && !isNotation(line)) {
      blocks.push({ type: "notation", lyric: line, notation: nextLine, pairs: pairNotation(line, nextLine) });
      index += 1;
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  while (blocks[0]?.type === "spacer") blocks.shift();
  while (blocks.at(-1)?.type === "spacer") blocks.pop();

  return {
    blocks,
    headings: blocks.filter((block): block is NovelHeading => block.type === "heading")
  };
}
