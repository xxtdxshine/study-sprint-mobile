# Study data model

Use UTF-8 JSON. This file is the source of truth consumed by the validator and bundle builder.

## Top level

```json
{
  "schemaVersion": 1,
  "course": {},
  "lectures": [],
  "papers": [],
  "reviewItems": []
}
```

## Course

Required fields:

- `id`: stable lowercase slug, for example `urban-planning-policy`.
- `title`: full subject name shown in the header.
- `shortTitle`: compact mobile title.
- `subtitle`: optional one-line description.
- `contentLanguage`: detected source language, one of `zh-CN`, `en`, or `mixed`.
- `uiLanguage`: interface language, either `zh-CN` or `en`. For mixed content, set this only after the user chooses.
- `theme`: optional hexadecimal-color overrides for `background`, `surface`, `accent`, `accentDark`, `emphasis`, `text`, `muted`, `line`, `success`, and `selected`. Use only `#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA` values; URLs and arbitrary CSS are rejected.

The app derives its storage key from `course.id` and `schemaVersion`. Do not reuse the same ID for unrelated subjects.

Keep lecture titles, cards, questions, options, answers, and source locators in the source language. `uiLanguage` localizes navigation, controls, status messages, and empty states; it does not translate study content.

## Lectures and cards

```json
{
  "id": "L01",
  "no": "01",
  "title": "完整讲义名称",
  "sourceFile": "原文件名.pdf",
  "pageCount": 42,
  "cards": [
    {
      "id": "L01-C001",
      "tag": "考点类别",
      "title": "单一且可测试的知识点",
      "body": "保留条件、数字、例外和逻辑关系的核心内容。",
      "hook": "易错提醒或记忆钩子。",
      "source": {"file": "原文件名.pdf", "locator": "第12-13页"}
    }
  ]
}
```

Use stable IDs. During an incremental update, do not renumber unchanged cards merely because new cards were inserted; append or allocate a new ID.

## Papers and questions

```json
{
  "id": "P01",
  "no": "01",
  "title": "完整试卷名称",
  "sourceFiles": ["试卷.pdf"],
  "answerFiles": ["答案.pdf"],
  "questions": [
    {
      "id": "P01-Q001",
      "number": "1",
      "type": "single",
      "topic": "考点类别",
      "stem": "题干",
      "options": [
        {"id": "A", "text": "选项文字"},
        {"id": "B", "text": "选项文字"}
      ],
      "answer": ["A"],
      "explanation": "原资料解析，或“原资料未提供解析”。",
      "source": {"files": ["试卷.pdf", "答案.pdf"], "locator": "题册第3页；答案第8页"}
    }
  ]
}
```

Allowed question types:

- `single`: exactly one answer.
- `multi`: one or more answers exactly as supplied by the answer sheet; the interface allows selecting multiple options.
- `truefalse`: exactly two options and one answer; preserve the source labels when possible.

Answers must match option IDs exactly. Do not encode correctness in option text.

## Review items

`reviewItems` records unresolved source issues without contaminating study content:

```json
{
  "severity": "blocking",
  "sourceFile": "试卷三.pdf",
  "locator": "第7页第18题",
  "kind": "ambiguous_answer",
  "message": "答案图像可能为B或D，需要人工确认。"
}
```

Use `blocking` for missing or ambiguous answers, unreadable stems/options, duplicated question numbers that cannot be reconciled, and incomplete page sequences. Use `warning` for missing explanations or cosmetic OCR uncertainty that does not alter meaning.
