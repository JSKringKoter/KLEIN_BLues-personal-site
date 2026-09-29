import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const legacyRoot = process.argv[2];
if (!legacyRoot) throw new Error("Usage: npm run import:notes -- <legacy site root>");

function normalizeLegacyFormula(value) {
  const literalLeftBrace = "@@NOTE_LITERAL_LEFT_BRACE@@";
  const literalRightBrace = "@@NOTE_LITERAL_RIGHT_BRACE@@";
  return String(value || "")
    .replace(/\\\\\\\{/g, literalLeftBrace)
    .replace(/\\\\\\\}/g, literalRightBrace)
    .replace(/\\\\/g, "\\")
    .replace(/\\([{}])/g, "$1")
    .replace(/\\\^/g, "^")
    .replace(/\\_/g, "_")
    .replace(/\\infin\b/g, "\\infty")
    .replaceAll(literalLeftBrace, "\\{")
    .replaceAll(literalRightBrace, "\\}")
    .trim();
}

function normalizeNoteMarkdown(markdown) {
  let source = String(markdown || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/\\\$/g, "$");
  source = source.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => `\n$$\n${normalizeLegacyFormula(formula)}\n$$\n`);
  source = source.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => `\\(${normalizeLegacyFormula(formula)}\\)`);
  source = source.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, formula) => `$${normalizeLegacyFormula(formula)}$`);
  return source;
}

const context = vm.createContext({ window: {} });
for (const file of ["notion-notes.js", "notion-content.js", "legacy-notes.js"]) {
  vm.runInContext(await readFile(resolve(legacyRoot, file), "utf8"), context, { filename: file });
}

const notionNotes = context.window.NOTION_NOTES || [];
const notionContent = context.window.NOTION_NOTE_CONTENT || {};
const legacyNotes = context.window.LEGACY_NOTES || [];
const notes = [...notionNotes, ...legacyNotes];
const outputDirectory = resolve("src/content/notes");
await mkdir(outputDirectory, { recursive: true });

for (const [order, note] of notes.entries()) {
  let body = notionContent[note.title] || note.summary || "";
  if (note.contentSrc) body = await readFile(resolve(legacyRoot, note.contentSrc), "utf8");
  body = normalizeNoteMarkdown(body)
    .replace(/\]\(assets\//g, "](/assets/")
    .replace(/src=(["'])assets\//g, "src=$1/assets/")
    .replace(/```C\+\+/g, "```cpp");
  const fields = [
    `sourceId: ${JSON.stringify(note.id)}`,
    `title: ${JSON.stringify(note.title)}`,
    `category: ${JSON.stringify(note.category || "随录")}`,
    `date: ${JSON.stringify(note.date || "")}`,
    `status: ${JSON.stringify(note.status || "归档")}`,
    `summary: ${JSON.stringify(note.summary || "")}`,
    `tags: ${JSON.stringify(note.tags || [])}`,
    `order: ${order}`
  ];
  await writeFile(resolve(outputDirectory, `${note.id}.md`), `---\n${fields.join("\n")}\n---\n\n${body.trim()}\n`, "utf8");
}

console.log(`Imported ${notes.length} technical notes into ${outputDirectory}`);
