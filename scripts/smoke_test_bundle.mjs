import fs from "node:fs";
import vm from "node:vm";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) if (argv[index].startsWith("--")) args[argv[index].slice(2)] = argv[++index];
  return args;
}

const args = parseArgs(process.argv);
if (!args.html) throw new Error("Usage: smoke_test_bundle.mjs --html subject-mobile.html");
const html = fs.readFileSync(args.html, "utf8");
const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }
check(!/<script\b[^>]*\bsrc\s*=/i.test(html), "Bundle contains an external script");
check(!/<link\b[^>]*\brel=["']?stylesheet/i.test(html), "Bundle contains an external stylesheet");
check(!/\b(?:src|href)=["']https?:\/\//i.test(html), "Bundle contains an external asset URL");
check(/<meta name="viewport"/i.test(html), "Viewport metadata is missing");
check(/env\(safe-area-inset-bottom\)/.test(html), "Safe-area padding is missing");

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
check(scripts.length === 2, `Expected 2 inline scripts, found ${scripts.length}`);
for (const [index, script] of scripts.entries()) {
  try { new vm.Script(script, { filename: `inline-${index}.js` }); }
  catch (error) { failures.push(`Inline script ${index} does not parse: ${error.message}`); }
}

class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
}
class FakeElement {
  constructor() { this.innerHTML = ""; this.textContent = ""; this.classList = new ClassList(); this.disabled = false; this.dataset = {}; }
  closest(selector) { return selector === "[data-action]" ? this : null; }
}

const app = new FakeElement();
const nav = new FakeElement();
const toast = new FakeElement();
const storage = new Map();
let clickHandler;
const document = {
  documentElement: { style: { setProperty() {} } },
  getElementById(id) { if (id === "study-app") return app; if (id === "bottom-nav") return nav; if (id === "toast") return toast; return null; },
  addEventListener(type, handler) { if (type === "click") clickHandler = handler; },
};
const context = {
  window: { scrollTo() {} }, document,
  localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } },
  setTimeout() { return 1; }, clearTimeout() {}, console,
};
context.window.window = context.window;
context.window.document = document;
context.window.localStorage = context.localStorage;
vm.createContext(context);
if (scripts.length === 2 && failures.length === 0) {
  vm.runInContext(scripts[0], context);
  vm.runInContext(scripts[1], context);
  const data = context.window.STUDY_DATA;
  const expectedLanguage = data.course.uiLanguage === "en" ? "en" : "zh-CN";
  check(new RegExp(`<html lang=["']${expectedLanguage}["']`, "i").test(html), `HTML lang does not match ${expectedLanguage}`);
  check(nav.innerHTML.includes(expectedLanguage === "en" ? "Home" : "首页"), "Navigation language does not match course.uiLanguage");
  check(app.innerHTML.includes(expectedLanguage === "en" ? "Choose Lectures" : "选择讲义"), "Home interface language does not match course.uiLanguage");
  if (String(data.course.shortTitle).includes("<")) {
    check(!app.innerHTML.includes(String(data.course.shortTitle)), "Course title was inserted as raw HTML");
    check(app.innerHTML.includes(String(data.course.shortTitle).replaceAll("<", "&lt;").replaceAll(">", "&gt;")), "Course title was not rendered as escaped text");
  }
  const key = `study-sprint:${data.course.id}:v${data.schemaVersion}`;
  const click = (action, dataset = {}) => { const target = new FakeElement(); target.dataset = { action, ...dataset }; clickHandler({ target }); };
  const ui = expectedLanguage === "en" ? {
    cards: "Mark as Mastered", papers: "Choose Papers", wrong: "Mistakes", progress: "Study Progress", submit: "Submit Answer", incorrect: "Incorrect",
  } : {
    cards: "标记这张已掌握", papers: "选择试卷", wrong: "错题本", progress: "学习进度", submit: "提交答案", incorrect: "回答错误",
  };
  click("go", { tab: "cards" });
  check(app.innerHTML.includes(ui.cards), "Knowledge-card interface language does not match course.uiLanguage");
  click("go", { tab: "papers" });
  check(app.innerHTML.includes(ui.papers), "Paper interface language does not match course.uiLanguage");
  click("go", { tab: "wrong" });
  check(app.innerHTML.includes(ui.wrong), "Wrong-answer interface language does not match course.uiLanguage");
  click("go", { tab: "progress" });
  check(app.innerHTML.includes(ui.progress), "Progress interface language does not match course.uiLanguage");
  const firstLecture = data.lectures[0];
  if (firstLecture?.cards.length > 1) {
    click("open-lecture", { id: firstLecture.id });
    click("toggle-known", { id: firstLecture.cards[0].id });
    const saved = JSON.parse(storage.get(key));
    check(saved.known.includes(firstLecture.cards[0].id), "Mastered card was not persisted");
    check(saved.cardIndex === 1, "Mastering a card did not advance to the next card");
  }
  const firstPaper = data.papers.find((paper) => paper.questions.length);
  if (firstPaper) {
    const question = firstPaper.questions[0];
    const wrongOption = question.options.find((option) => !question.answer.includes(option.id));
    click("start-paper", { id: firstPaper.id });
    check(app.innerHTML.includes(ui.submit), "Quiz interface language does not match course.uiLanguage");
    if (wrongOption) {
      click("choose", { id: wrongOption.id });
      click("submit");
      check(app.innerHTML.includes(ui.incorrect), "Quiz result language does not match course.uiLanguage");
      let saved = JSON.parse(storage.get(key));
      check(saved.results[question.id] === false, "Incorrect result was not persisted");
      check(saved.wrong.includes(question.id), "Incorrect question was not added to wrong answers");
      click("start-wrong");
      for (const answer of question.answer) click("choose", { id: answer });
      click("submit");
      saved = JSON.parse(storage.get(key));
      check(saved.results[question.id] === true, "Correct retry was not persisted");
      check(!saved.wrong.includes(question.id), "Correct retry did not remove the wrong answer");
    }
  }
  check(app.innerHTML.length > 0 && nav.innerHTML.length > 0, "App did not render content and navigation");
}

const output = { valid: failures.length === 0, failures };
process.stdout.write(JSON.stringify(output, null, 2) + "\n");
if (failures.length) process.exitCode = 1;
