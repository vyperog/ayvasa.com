import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repo root = one level up from /scripts
const ROOT = path.resolve(__dirname, "..");

const WIKI_INDEX_PATH = path.join(ROOT, "wiki", "index.json");
const OUTPUT_PATH = path.join(ROOT, "wiki", "search-index.json");

function stripMarkdown(md) {
  if (!md) return "";

  let text = md;

  // Remove code fences and inline code
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`]*`/g, " ");

  // Remove images: ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");

  // Replace links with link text: [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, " ");

  // Remove blockquotes
  text = text.replace(/^\s*>\s?/gm, " ");

  // Remove list markers (-, *, 1.)
  text = text.replace(/^\s*[-*]\s+/gm, " ");
  text = text.replace(/^\s*\d+\.\s+/gm, " ");

  // Remove emphasis markers
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/_(.*?)_/g, "$1");

  // Remove horizontal rules
  text = text.replace(/^\s*---\s*$/gm, " ");

  // Collapse whitespace
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n+/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function resolveMdPath(mdPathFromIndexJson) {
  // mdPathFromIndexJson is typically like "/wiki/some-term.md".
  // Convert it to a filesystem path inside the repo.
  const normalized = mdPathFromIndexJson.startsWith("/")
    ? mdPathFromIndexJson.slice(1)
    : mdPathFromIndexJson;
  return path.join(ROOT, normalized);
}

function main() {
  const wikiIndex = readJson(WIKI_INDEX_PATH);
  const entries = Array.isArray(wikiIndex.entries) ? wikiIndex.entries : [];

  const indexedEntries = entries.map((entry) => {
    const mdFilePath = resolveMdPath(entry.md);
    const mdRaw = safeReadText(mdFilePath);
    const bodyText = stripMarkdown(mdRaw);

    return {
      slug: entry.slug,
      title: entry.title,
      category: entry.category,
      summary: entry.summary || "",
      aliases: entry.aliases || [],
      related: entry.related || [],
      md: entry.md,
      body: bodyText
    };
  });

  const out = {
    version: wikiIndex.version ?? 1,
    updated: wikiIndex.updated ?? new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    entryCount: indexedEntries.length,
    entries: indexedEntries
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`✅ Generated wiki/search-index.json (${indexedEntries.length} entries)`);
}

main();
