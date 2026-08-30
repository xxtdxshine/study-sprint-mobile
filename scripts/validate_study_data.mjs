import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.data) throw new Error("Usage: validate_study_data.mjs --data study-data.json [--report report.json]");
const dataPath = path.resolve(args.data);
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const errors = [];
const warnings = [];
const ids = new Map();

function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") errors.push(`${label} is required`);
}

function unique(id, label) {
  required(id, `${label}.id`);
  if (!id) return;
  if (ids.has(id)) errors.push(`Duplicate id ${id}: ${ids.get(id)} and ${label}`);
  else ids.set(id, label);
}

if (data.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (!data.course || typeof data.course !== "object") errors.push("course must be an object");
else {
  required(data.course.id, "course.id");
  required(data.course.title, "course.title");
  required(data.course.shortTitle, "course.shortTitle");
  if (!["zh-CN", "en", "mixed"].includes(data.course.contentLanguage)) errors.push("course.contentLanguage must be zh-CN, en, or mixed");
  if (!["zh-CN", "en"].includes(data.course.uiLanguage)) errors.push("course.uiLanguage must be zh-CN or en");
  if (data.course.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.course.id)) errors.push("course.id must be a lowercase slug");
  if (data.course.theme !== undefined) {
    if (!data.course.theme || typeof data.course.theme !== "object" || Array.isArray(data.course.theme)) errors.push("course.theme must be an object");
    else {
      const allowedThemeKeys = new Set(["background", "surface", "accent", "accentDark", "emphasis", "text", "muted", "line", "success", "selected"]);
      for (const [key, value] of Object.entries(data.course.theme)) {
        if (!allowedThemeKeys.has(key)) warnings.push(`course.theme.${key} is not a supported theme field`);
        else if (typeof value !== "string" || !/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim())) errors.push(`course.theme.${key} must be a hexadecimal color`);
      }
    }
  }
}
if (!Array.isArray(data.lectures)) errors.push("lectures must be an array");
if (!Array.isArray(data.papers)) errors.push("papers must be an array");

let cardCount = 0;
let questionCount = 0;
for (const [lectureIndex, lecture] of (data.lectures || []).entries()) {
  const label = `lectures[${lectureIndex}]`;
  unique(lecture.id, label);
  required(lecture.no, `${label}.no`);
  required(lecture.title, `${label}.title`);
  required(lecture.sourceFile, `${label}.sourceFile`);
  if (!Array.isArray(lecture.cards) || lecture.cards.length === 0) warnings.push(`${label} has no cards`);
  for (const [cardIndex, card] of (lecture.cards || []).entries()) {
    cardCount += 1;
    const cardLabel = `${label}.cards[${cardIndex}]`;
    unique(card.id, cardLabel);
    required(card.tag, `${cardLabel}.tag`);
    required(card.title, `${cardLabel}.title`);
    required(card.body, `${cardLabel}.body`);
    required(card.hook, `${cardLabel}.hook`);
    required(card.source?.file, `${cardLabel}.source.file`);
    required(card.source?.locator, `${cardLabel}.source.locator`);
  }
}

const allowedTypes = new Set(["single", "multi", "truefalse"]);
for (const [paperIndex, paper] of (data.papers || []).entries()) {
  const label = `papers[${paperIndex}]`;
  unique(paper.id, label);
  required(paper.no, `${label}.no`);
  required(paper.title, `${label}.title`);
  if (!Array.isArray(paper.sourceFiles) || paper.sourceFiles.length === 0) errors.push(`${label}.sourceFiles must not be empty`);
  if (!Array.isArray(paper.answerFiles) || paper.answerFiles.length === 0) warnings.push(`${label}.answerFiles is empty`);
  if (!Array.isArray(paper.questions) || paper.questions.length === 0) warnings.push(`${label} has no questions`);
  const numbers = new Set();
  for (const [questionIndex, question] of (paper.questions || []).entries()) {
    questionCount += 1;
    const questionLabel = `${label}.questions[${questionIndex}]`;
    unique(question.id, questionLabel);
    required(question.number, `${questionLabel}.number`);
    if (numbers.has(String(question.number))) errors.push(`${label} has duplicate question number ${question.number}`);
    numbers.add(String(question.number));
    if (!allowedTypes.has(question.type)) errors.push(`${questionLabel}.type must be single, multi, or truefalse`);
    required(question.topic, `${questionLabel}.topic`);
    required(question.stem, `${questionLabel}.stem`);
    if (!Array.isArray(question.options) || question.options.length < 2) errors.push(`${questionLabel}.options must contain at least two options`);
    const optionIds = new Set();
    for (const [optionIndex, option] of (question.options || []).entries()) {
      required(option.id, `${questionLabel}.options[${optionIndex}].id`);
      required(option.text, `${questionLabel}.options[${optionIndex}].text`);
      if (optionIds.has(option.id)) errors.push(`${questionLabel} has duplicate option id ${option.id}`);
      optionIds.add(option.id);
    }
    if (!Array.isArray(question.answer) || question.answer.length === 0) errors.push(`${questionLabel}.answer must not be empty`);
    for (const answer of question.answer || []) if (!optionIds.has(answer)) errors.push(`${questionLabel}.answer ${answer} is not an option id`);
    if ((question.type === "single" || question.type === "truefalse") && question.answer?.length !== 1) errors.push(`${questionLabel} must have exactly one answer`);
    if (question.type === "truefalse" && question.options?.length !== 2) errors.push(`${questionLabel} truefalse question must have exactly two options`);
    required(question.explanation, `${questionLabel}.explanation`);
    if (!question.source || !Array.isArray(question.source.files) || question.source.files.length === 0) errors.push(`${questionLabel}.source.files must not be empty`);
    required(question.source?.locator, `${questionLabel}.source.locator`);
  }
}

for (const [index, item] of (data.reviewItems || []).entries()) {
  if (item?.severity === "blocking") errors.push(`reviewItems[${index}] is blocking: ${item.message || item.kind || "unresolved source issue"}`);
}
if (!(data.lectures || []).length) warnings.push("No lectures were provided");
if (!(data.papers || []).length) warnings.push("No papers were provided");

const report = {
  valid: errors.length === 0,
  counts: {
    lectures: (data.lectures || []).length,
    cards: cardCount,
    papers: (data.papers || []).length,
    questions: questionCount,
    reviewItems: (data.reviewItems || []).length,
  },
  errors,
  warnings,
};
const maxCards = args["max-cards"] === undefined ? null : Number(args["max-cards"]);
const maxQuestions = args["max-questions"] === undefined ? null : Number(args["max-questions"]);
if (maxCards !== null) {
  if (!Number.isInteger(maxCards) || maxCards < 0) errors.push("--max-cards must be a non-negative integer");
  else if (cardCount > maxCards) errors.push(`Card count ${cardCount} exceeds sample limit ${maxCards}`);
}
if (maxQuestions !== null) {
  if (!Number.isInteger(maxQuestions) || maxQuestions < 0) errors.push("--max-questions must be a non-negative integer");
  else if (questionCount > maxQuestions) errors.push(`Question count ${questionCount} exceeds sample limit ${maxQuestions}`);
}
report.valid = errors.length === 0;
if (args.report) {
  const reportPath = path.resolve(args.report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
}
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (!report.valid) process.exitCode = 1;
