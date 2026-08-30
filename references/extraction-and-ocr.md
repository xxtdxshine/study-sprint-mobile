# Extraction and OCR

## Inventory first

Run `inventory_materials.py <source-folder> --out <material-manifest.json>`. Review its role classification and proposed paper-answer pairings. Filename matching is a starting point, not proof.

The inventory recognizes PDF, DOCX, PPTX, PNG, JPG/JPEG, TIFF, BMP, and WEBP. Legacy `.doc` and `.ppt` files are listed as unsupported and should be converted without overwriting the originals.

## Extraction order

1. Use embedded text when it is usable.
2. Preserve page or slide markers in extracted text.
3. If a PDF page has very little meaningful text, or an image is the source, use OCR.
4. Keep OCR output separate from the source and record the method and confidence in `extraction-report.json`.

Use the available format skill for layout-aware reading:

- PDF skill for PDFs and rendered page inspection.
- Documents skill for Word files.
- Presentations skill for PowerPoint files.

`extract_sources.py` performs deterministic extraction for PDF, DOCX, PPTX, and images. It can use RapidOCR when installed. For PDFs, provide `--pdftoppm <path>` when `pdftoppm` is not on `PATH`. If OCR dependencies are unavailable, the script reports `ocr_required` rather than inventing content.

After extraction, run `detect_language.py <extracted-folder> --out <language-report.json>`. It counts Han characters and Latin letters after removing page/slide marker lines. A Chinese share of at least 80% is `zh-CN`, at most 20% is `en`, and the middle range is `mixed`. This deliberately conservative middle band avoids silently choosing one language when bilingual content is substantial. If meaningful text is insufficient, treat the result as unresolved and ask the user rather than guessing. After the user chooses for `mixed` or unresolved content, rerun with `--ui-language zh-CN` or `--ui-language en`; this records `chosenUiLanguage` and clears `requiresUserChoice`.

## OCR review rules

Always inspect or flag OCR involving:

- numbers, dates, percentages, units, formulas, legal article numbers;
- negatives such as `不`, `未`, `不得`, `错误`, and `不正确`;
- option labels and answer letters;
- words whose change reverses or narrows the meaning;
- headers, footers, watermarks, or two-column layouts that may merge into body text.

Whitespace and obvious punctuation repair is allowed. Meaning-bearing corrections require evidence from the page image or a review item.

## Pairing papers and answers

Match by exact series name and paper number before relying on token similarity. A paper may span several volumes and an answer may span several files; keep those arrays ordered. If two answers score equally or the numbering conflicts, mark the pairing ambiguous.

Never infer an answer from general knowledge when the answer sheet is absent. Mark it blocking, keep the raw question in the audit trail, and omit it from the final graded bank until resolved.
