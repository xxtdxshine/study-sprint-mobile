import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.data || !args.out) throw new Error("Usage: build_mobile_bundle.mjs --data study-data.json --out subject-mobile.html");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "..", "assets", "mobile-study-template");
const dataPath = path.resolve(args.data);
const outPath = path.resolve(args.out);
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
if (data.schemaVersion !== 1 || !data.course?.title || !Array.isArray(data.lectures) || !Array.isArray(data.papers)) {
  throw new Error("study-data.json is incomplete; run validate_study_data.mjs first");
}
if ((data.reviewItems || []).some((item) => item?.severity === "blocking")) throw new Error("Blocking review items must be resolved before bundling");

const html = fs.readFileSync(path.join(templateDir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(templateDir, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(templateDir, "app.js"), "utf8");
const title = String(data.course.title).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const pageLanguage = data.course.uiLanguage === "en" ? "en" : "zh-CN";
const pageSuffix = pageLanguage === "en" ? "Mobile Study" : "手机版";
const serialized = JSON.stringify(data).replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const output = html
  .replaceAll("__PAGE_LANG__", pageLanguage)
  .replaceAll("__PAGE_TITLE__", `${title} · ${pageSuffix}`)
  .replace("/*__INLINE_STYLE__*/", css)
  .replace("/*__INLINE_DATA__*/", `window.STUDY_DATA=${serialized};`)
  .replace("/*__INLINE_APP__*/", app);
if (/__PAGE_(?:TITLE|LANG)__|__INLINE_(?:STYLE|DATA|APP)__/.test(output)) throw new Error("Template placeholders were not fully replaced");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, "utf8");
process.stdout.write(JSON.stringify({ output: outPath, bytes: Buffer.byteLength(output), lectures: data.lectures.length, cards: data.lectures.reduce((n, item) => n + item.cards.length, 0), papers: data.papers.length, questions: data.papers.reduce((n, item) => n + item.questions.length, 0) }, null, 2) + "\n");
