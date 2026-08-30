# QA and delivery

## Sample approval gate

The first user-facing study app must be `<subject>-小样.html`, not the full version. Build it from `sample-study-data.json` with these hard limits:

- at most 20 knowledge cards in total;
- at most 20 questions in total;
- if the available material contains fewer than either limit, include all available items for that category;
- preserve source order and continue into later lectures or papers only when needed to reach a limit.

Use `<subject>-小样.html` for a Chinese interface and `<subject>-sample.html` for an English interface. Before building, require `course.contentLanguage` and `course.uiLanguage`. For mixed content, verify that `uiLanguage` matches the user's explicit choice.

Validate with `validate_study_data.mjs --data sample-study-data.json --report sample-study-data-validation.json --max-cards 20 --max-questions 20`, then run the normal bundle smoke test. Deliver the sample with its exact counts and ask the user to review content extraction, card style, question display, colors, icons, and interactions.

After delivering the sample, stop. Do not create the full card set, complete question bank, final HTML, or hosted Site until the user explicitly approves the sample. If revisions are requested, update only the sample and repeat this gate. Carry approved sample IDs and decisions into the final version.

## Content gate

Before building the app:

- every supported source file appears in the manifest and extraction report;
- lecture names and paper names match the sources;
- card coverage spans the entire lecture, not just the opening pages;
- all objective questions appear once and remain in source order;
- every graded question has a valid answer drawn from its option IDs;
- blocking review items are resolved or explicitly excluded from the graded bank;
- source locators are present for every card and question.

After sample approval, run `validate_study_data.mjs --data study-data.json --report study-data-validation.json` on the complete dataset. Do not build when it exits with errors.

## App behavior gate

Check the generated file for:

- exact lecture, card, paper, and question counts;
- one visible knowledge card at a time;
- swipe and previous/next navigation;
- automatic advance after first marking a card mastered;
- single, multiple, and true/false grading;
- resume behavior, wrong-answer add/remove, and progress totals;
- distinct storage keys for two different course IDs;
- safe-area spacing and usable controls at narrow mobile widths;
- no external script, stylesheet, font, image, or network dependency.
- the HTML `lang` attribute and every navigation, action, feedback, empty-state, and progress label match `course.uiLanguage`.

Browser clicking, screenshots, DOM inspection, and resize QA are optional and should be performed only when the user explicitly requests browser testing. Static and scripted checks remain mandatory.

After bundling, run `smoke_test_bundle.mjs --html <subject>-手机版.html`. It verifies that the file is self-contained and exercises mastered-card advance, incorrect-answer capture, and correct-retry removal without opening a browser.

## Deliverables

Return the sample offline HTML first. After the user approves it and the full build passes, return the final offline HTML as the primary private artifact. Explain that progress is stored in the current browser/device and does not sync automatically.

For a hosted URL:

1. finish and validate the offline version first;
2. prepare the Site with the same data and behavior;
3. disclose that source-derived study material will be uploaded;
4. obtain explicit authorization immediately before publishing;
5. return both the URL and the offline file.

Do not publish merely because the user asked to create or update the Skill. Authorization applies to each subject site and its contents.

## Version safety

Do not replace previous samples or completed versions by default. Generate a new descriptive filename. For an incremental rebuild, preserve stable IDs so existing progress can survive when the user chooses to keep the same course ID and storage version.
