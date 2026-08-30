(() => {
  "use strict";
  const data = window.STUDY_DATA;
  const app = document.getElementById("study-app");
  const nav = document.getElementById("bottom-nav");
  const toast = document.getElementById("toast");
  const lectures = data.lectures || [];
  const papers = data.papers || [];
  const allQuestions = papers.flatMap((paper) => paper.questions.map((question) => ({ ...question, paperId: paper.id, paperTitle: paper.title })));
  const questionById = new Map(allQuestions.map((question) => [question.id, question]));
  const storageKey = `study-sprint:${data.course.id}:v${data.schemaVersion}`;
  const cardTotal = lectures.reduce((total, lecture) => total + lecture.cards.length, 0);
  const questionTotal = allQuestions.length;
  const locale = data.course.uiLanguage === "en" ? "en" : "zh-CN";
  const strings = {
    "zh-CN": {
      nav: { home: "首页", cards: "重点", papers: "试卷", wrong: "错题", progress: "进度" },
      headerStats: (lectureCount, questionCount) => `${lectureCount}份讲义 · ${questionCount}题`,
      lectureMeta: (pages, cards, known) => `${pages}页 · ${cards}张重点 · 已掌握${known}张`,
      paperMeta: (total, done, correct) => `${total}题 · 已答${done}题 · 答对${correct}题`,
      enter: "进入", continue: "继续", start: "开始",
      homeLibraryLabel: "首页资料选择", chooseLectures: "选择讲义", choosePapers: "选择试卷",
      lectureChoiceMeta: (count, cards) => `${count}份 · ${cards}张重点卡`,
      paperChoiceMeta: (count, questions) => `${count}套 · ${questions}道题`,
      allLectures: (count) => `${count}份全部开放`, allPapers: (count) => `${count}套全部开放`,
      noLectures: "暂时没有讲义", noPapers: "暂时没有试卷", regenerate: "请先完善 study-data.json 后重新生成。",
      lectureMastery: "讲义掌握", markedMastered: "已标记掌握", currentWrong: "当前错题", wrongUnit: "题", retryWrongHint: "可在错题页重练",
      noCards: "暂时没有知识卡", choosePreparedLecture: "请从首页选择一份已整理的讲义。", backHome: "返回首页",
      lectureTitle: (no, title) => `讲义${no}｜${title}`, cardReview: (known, total) => `单卡复习 · 已掌握 ${known}/${total}`,
      swipeSwitch: "左右滑动切换知识卡", mastered: "✓ 已掌握", markMastered: "标记这张已掌握", source: "出处",
      cardAria: (number) => `第${number}张`, previous: "上一张", next: "下一张", nextQuestion: "下一题",
      swipeHint: "在卡片区域向左滑看下一张，向右滑返回上一张",
      papersSubtitle: (count, questions) => `${count}套共${questions}题，支持续答、解析和错题重练`,
      questionTypes: { single: "单选题", multi: "多选题", truefalse: "判断题" },
      noQuestionsRound: "本轮没有可用题目", chooseAgain: "请返回试卷或错题页重新选择。", back: "返回", wrongRetry: "错题重练",
      correct: "回答正确", incorrect: "回答错误", correctAnswer: "正确答案", exitRound: "退出本轮", finish: "完成", submit: "提交答案",
      wrongBook: "错题本", autoRemove: (count) => `答对后自动移出 · 当前 ${count} 题`, noWrong: "暂时没有错题",
      wrongEmptyHint: "完成刷题后，答错的题会自动出现在这里。", goPractice: "去刷题", retryAll: (count) => `重练全部 ${count} 题`,
      progressTitle: "学习进度", progressSubtitle: "讲义掌握与试卷答题情况", lectures: "讲义", papers: "试卷", completed: "已完成",
      cardsRemaining: (count) => `还有 ${count} 张待掌握`, noLectureShort: "暂无讲义", noPaperShort: "暂无试卷",
      wrongCount: (count) => `错题 ${count}`, paperProgress: (done, correct) => `已答${done}题 · 答对${correct}题`,
      noPaperQuestions: "这套试卷暂时没有可用题目", lectureComplete: "本讲义的知识卡已全部看完",
    },
    en: {
      nav: { home: "Home", cards: "Key Points", papers: "Papers", wrong: "Mistakes", progress: "Progress" },
      headerStats: (lectureCount, questionCount) => `${lectureCount} lectures · ${questionCount} questions`,
      lectureMeta: (pages, cards, known) => `${pages} pages · ${cards} key cards · ${known} mastered`,
      paperMeta: (total, done, correct) => `${total} questions · ${done} answered · ${correct} correct`,
      enter: "Open", continue: "Continue", start: "Start",
      homeLibraryLabel: "Study material selection", chooseLectures: "Choose Lectures", choosePapers: "Choose Papers",
      lectureChoiceMeta: (count, cards) => `${count} lectures · ${cards} key cards`,
      paperChoiceMeta: (count, questions) => `${count} papers · ${questions} questions`,
      allLectures: (count) => `${count} available`, allPapers: (count) => `${count} available`,
      noLectures: "No lectures yet", noPapers: "No papers yet", regenerate: "Complete study-data.json and rebuild the app.",
      lectureMastery: "Lecture Mastery", markedMastered: "Marked as mastered", currentWrong: "Current Mistakes", wrongUnit: "questions", retryWrongHint: "Retry them from Mistakes",
      noCards: "No knowledge cards yet", choosePreparedLecture: "Choose a prepared lecture from Home.", backHome: "Back to Home",
      lectureTitle: (no, title) => `Lecture ${no} | ${title}`, cardReview: (known, total) => `Single-card review · ${known}/${total} mastered`,
      swipeSwitch: "Swipe to change cards", mastered: "✓ Mastered", markMastered: "Mark as Mastered", source: "Source",
      cardAria: (number) => `Card ${number}`, previous: "Previous", next: "Next", nextQuestion: "Next Question",
      swipeHint: "Swipe left for the next card and right for the previous card",
      papersSubtitle: (count, questions) => `${count} papers · ${questions} questions · resume, explanations, and retry`,
      questionTypes: { single: "Single Choice", multi: "Multiple Choice", truefalse: "True / False" },
      noQuestionsRound: "No questions are available in this round", chooseAgain: "Return to Papers or Mistakes and choose again.", back: "Back", wrongRetry: "Mistake Retry",
      correct: "Correct", incorrect: "Incorrect", correctAnswer: "Correct answer", exitRound: "Exit Round", finish: "Finish", submit: "Submit Answer",
      wrongBook: "Mistakes", autoRemove: (count) => `Removed after a correct retry · ${count} remaining`, noWrong: "No mistakes yet",
      wrongEmptyHint: "Incorrect answers will appear here after practice.", goPractice: "Practice Now", retryAll: (count) => `Retry All ${count}`,
      progressTitle: "Study Progress", progressSubtitle: "Lecture mastery and paper results", lectures: "Lectures", papers: "Papers", completed: "Completed",
      cardsRemaining: (count) => `${count} cards remaining`, noLectureShort: "No lectures", noPaperShort: "No papers",
      wrongCount: (count) => `${count} mistakes`, paperProgress: (done, correct) => `${done} answered · ${correct} correct`,
      noPaperQuestions: "This paper has no available questions", lectureComplete: "You have reviewed every card in this lecture",
    },
  };
  const t = strings[locale];
  const answerSeparator = locale === "en" ? ", " : "、";
  const fileSeparator = locale === "en" ? "; " : "；";

  const icon = {
    home: '<svg class="nav-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M5.5 15.5 16 6.5l10.5 9v9.5a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 25Z"/><path class="icon-accent" d="M12.5 27.5v-8h7v8"/></svg>',
    cards: '<svg class="nav-icon" viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="8" width="17" height="19" rx="3"/><path class="icon-accent" d="M11 5h12a3 3 0 0 1 3 3v14M11 13h7"/></svg>',
    papers: '<svg class="nav-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 4.5h11l5 5V27H8a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"/><path class="icon-accent" d="M19 4.5v5h5M11 18l3 3 6-7"/></svg>',
    wrong: '<svg class="nav-icon" viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="5" width="20" height="22" rx="4"/><path d="M11 10h10"/><path class="icon-accent" d="M16 14v6m0 3h.01"/></svg>',
    progress: '<svg class="nav-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25V16h5v9M14 25V10h5v15M21 25V6h5v19"/><path class="icon-accent" d="M5 27h23"/></svg>',
    book: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5.5 7.5h7a3.5 3.5 0 0 1 3.5 3.5v16a4 4 0 0 0-4-4H5.5Z"/><path d="M26.5 7.5h-7A3.5 3.5 0 0 0 16 11v16a4 4 0 0 1 4-4h6.5Z"/><path class="icon-accent" d="M16 11v16M9 13h3.5M19.5 13H23"/></svg>',
    paperChoice: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="4.5" width="20" height="23" rx="4"/><path d="M11 10.5h10M11 15.5h7"/><path class="icon-accent" d="m11 22 3 3 7-8"/></svg>',
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  }

  function safeThemeColor(value) {
    const color = String(value ?? "").trim();
    return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? color : "";
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); }
    catch { return {}; }
  }

  const saved = readSaved();
  const state = {
    tab: "home",
    homeLibrary: saved.homeLibrary === "paper" ? "paper" : "lecture",
    lectureId: saved.lectureId || lectures[0]?.id || "",
    cardIndex: Number.isInteger(saved.cardIndex) ? saved.cardIndex : 0,
    known: Array.isArray(saved.known) ? saved.known.filter((id) => typeof id === "string") : [],
    paperId: saved.paperId || papers[0]?.id || "",
    results: saved.results && typeof saved.results === "object" ? saved.results : {},
    wrong: Array.isArray(saved.wrong) ? saved.wrong.filter((id) => questionById.has(id)) : [],
    queue: [],
    questionIndex: 0,
    selected: [],
    revealed: false,
    quizMode: "paper",
    motion: "",
  };

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify({
      homeLibrary: state.homeLibrary,
      lectureId: state.lectureId,
      cardIndex: state.cardIndex,
      known: state.known,
      paperId: state.paperId,
      results: state.results,
      wrong: state.wrong,
    }));
  }

  function applyTheme() {
    const mapping = { background: "--background", surface: "--surface", accent: "--accent", accentDark: "--accent-dark", emphasis: "--emphasis", text: "--text", muted: "--muted", line: "--line", success: "--success", selected: "--selected" };
    for (const [key, cssName] of Object.entries(mapping)) {
      const color = safeThemeColor(data.course.theme?.[key]);
      if (color) document.documentElement.style.setProperty(cssName, color);
    }
  }

  function header() {
    return `<header class="top"><div><p class="eyebrow">STUDY SPRINT</p><h1 class="brand">${escapeHtml(data.course.shortTitle)}</h1></div><span class="pill">${t.headerStats(lectures.length, questionTotal)}</span></header>`;
  }

  function navItems() {
    return ["home", "cards", "papers", "wrong", "progress"]
      .map((tab) => `<button type="button" data-action="go" data-tab="${tab}" class="${effectiveTab() === tab ? "active" : ""}" aria-label="${escapeHtml(t.nav[tab])}">${icon[tab]}<span class="nav-label">${escapeHtml(t.nav[tab])}</span></button>`).join("");
  }

  function effectiveTab() { return state.tab === "quiz" ? (state.quizMode === "wrong" ? "wrong" : "papers") : state.tab; }
  function currentLecture() { return lectures.find((lecture) => lecture.id === state.lectureId) || lectures[0]; }
  function currentPaper() { return papers.find((paper) => paper.id === state.paperId) || papers[0]; }
  function currentQuestion() { return questionById.get(state.queue[state.questionIndex]); }
  function knownFor(lecture) { return lecture.cards.filter((card) => state.known.includes(card.id)).length; }

  function paperStats(paper) {
    const done = paper.questions.filter((question) => Object.prototype.hasOwnProperty.call(state.results, question.id)).length;
    const correct = paper.questions.filter((question) => state.results[question.id] === true).length;
    return { done, correct, total: paper.questions.length };
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function go(tab) {
    state.tab = tab;
    state.revealed = false;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHome() {
    const lectureMode = state.homeLibrary === "lecture";
    const list = lectureMode ? lectures.map((lecture) => `
      <article class="resource-item"><span class="resource-index">${escapeHtml(lecture.no)}</span><div class="resource-body"><h3>${escapeHtml(lecture.title)}</h3><p>${t.lectureMeta(lecture.pageCount || "—", lecture.cards.length, knownFor(lecture))}</p></div><button type="button" class="resource-action" data-action="open-lecture" data-id="${escapeHtml(lecture.id)}">${t.enter}</button></article>`).join("") : papers.map((paper) => {
        const stats = paperStats(paper);
        return `<article class="resource-item"><span class="resource-index">${escapeHtml(paper.no)}</span><div class="resource-body"><h3>${escapeHtml(paper.title)}</h3><p>${t.paperMeta(stats.total, stats.done, stats.correct)}</p><div class="paper-progress"><i style="width:${stats.total ? (stats.done / stats.total) * 100 : 0}%"></i></div></div><button type="button" class="resource-action" data-action="start-paper" data-id="${escapeHtml(paper.id)}">${stats.done ? t.continue : t.start}</button></article>`;
      }).join("");
    return header() + `
      <section class="home-switch" aria-label="${t.homeLibraryLabel}">
        <button type="button" class="home-choice ${lectureMode ? "active" : ""}" data-action="home-library" data-kind="lecture"><span class="choice-icon">${icon.book}</span><strong>${t.chooseLectures}</strong><small>${t.lectureChoiceMeta(lectures.length, cardTotal)}</small></button>
        <button type="button" class="home-choice ${lectureMode ? "" : "active"}" data-action="home-library" data-kind="paper"><span class="choice-icon">${icon.paperChoice}</span><strong>${t.choosePapers}</strong><small>${t.paperChoiceMeta(papers.length, questionTotal)}</small></button>
      </section>
      <div class="section-head"><h2>${lectureMode ? t.chooseLectures : t.choosePapers}</h2><span>${lectureMode ? t.allLectures(lectures.length) : t.allPapers(papers.length)}</span></div>
      ${list ? `<section class="resource-list">${list}</section>` : emptyState(lectureMode ? t.noLectures : t.noPapers, t.regenerate)}
      <section class="stats"><article class="stat"><span>${t.lectureMastery}</span><strong>${state.known.length}<small> / ${cardTotal}</small></strong><small>${t.markedMastered}</small></article><article class="stat"><span>${t.currentWrong}</span><strong>${state.wrong.length}<small> ${t.wrongUnit}</small></strong><small>${t.retryWrongHint}</small></article></section>`;
  }

  function renderCards() {
    const lecture = currentLecture();
    if (!lecture?.cards.length) return header() + emptyState(t.noCards, t.choosePreparedLecture, "home", t.backHome);
    state.lectureId = lecture.id;
    state.cardIndex = Math.max(0, Math.min(state.cardIndex, lecture.cards.length - 1));
    const card = lecture.cards[state.cardIndex];
    const known = state.known.includes(card.id);
    return header() + `<div class="screen-title"><h2>${t.lectureTitle(escapeHtml(lecture.no), escapeHtml(lecture.title))}</h2><p>${t.cardReview(knownFor(lecture), lecture.cards.length)}</p></div>
      <div class="progress"><i style="width:${((state.cardIndex + 1) / lecture.cards.length) * 100}%"></i></div>
      <div class="card-counter"><span>${t.swipeSwitch}</span><strong>${String(state.cardIndex + 1).padStart(2, "0")} / ${lecture.cards.length}</strong></div>
      <article class="flashcard ${state.motion}" id="knowledge-card"><div class="flashcard-head"><span class="tag">${escapeHtml(card.tag)}</span><span class="flashcard-number">CARD ${String(state.cardIndex + 1).padStart(2, "0")}</span></div><div class="flashcard-body"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.body)}</p><p class="hook">${escapeHtml(card.hook)}</p></div><div class="flashcard-foot"><button type="button" class="known ${known ? "on" : ""}" data-action="toggle-known" data-id="${escapeHtml(card.id)}">${known ? t.mastered : t.markMastered}</button><span class="source">${t.source}: ${escapeHtml(card.source.file)} · ${escapeHtml(card.source.locator)}</span></div></article>
      <div class="card-dots">${lecture.cards.map((_, index) => `<button type="button" data-action="go-card" data-index="${index}" class="${index === state.cardIndex ? "active" : ""}" aria-label="${escapeHtml(t.cardAria(index + 1))}"></button>`).join("")}</div>
      <div class="card-nav"><button type="button" class="ghost" data-action="card-step" data-delta="-1" ${state.cardIndex === 0 ? "disabled" : ""}>${t.previous}</button><button type="button" class="secondary" data-action="card-step" data-delta="1" ${state.cardIndex === lecture.cards.length - 1 ? "disabled" : ""}>${t.next}</button></div><p class="swipe-hint">${t.swipeHint}</p>`;
  }

  function renderPapers() {
    const list = papers.map((paper) => {
      const stats = paperStats(paper);
      return `<article class="resource-item"><span class="resource-index">${escapeHtml(paper.no)}</span><div class="resource-body"><h3>${escapeHtml(paper.title)}</h3><p>${t.paperMeta(stats.total, stats.done, stats.correct)}</p><div class="paper-progress"><i style="width:${stats.total ? (stats.done / stats.total) * 100 : 0}%"></i></div></div><button type="button" class="resource-action" data-action="start-paper" data-id="${escapeHtml(paper.id)}">${stats.done ? t.continue : t.start}</button></article>`;
    }).join("");
    return header() + `<div class="screen-title"><h2>${t.choosePapers}</h2><p>${t.papersSubtitle(papers.length, questionTotal)}</p></div>${list ? `<section class="resource-list">${list}</section>` : emptyState(t.noPapers, t.regenerate)}`;
  }

  function questionTypeLabel(type) { return t.questionTypes[type] || type; }
  function sameAnswers(left, right) { return [...left].sort().join("|") === [...right].sort().join("|"); }

  function renderQuiz() {
    const question = currentQuestion();
    if (!question) return header() + emptyState(t.noQuestionsRound, t.chooseAgain, state.quizMode === "wrong" ? "wrong" : "papers", t.back);
    const correct = state.revealed && sameAnswers(state.selected, question.answer);
    return header() + `<div class="screen-title"><h2>${state.quizMode === "wrong" ? t.wrongRetry : escapeHtml(currentPaper()?.title || question.paperTitle)}</h2><p>${state.questionIndex + 1} / ${state.queue.length} · ${escapeHtml(question.topic)}</p></div>
      <div class="progress"><i style="width:${((state.questionIndex + 1) / state.queue.length) * 100}%"></i></div>
      <div class="mini-list">${state.queue.map((id, index) => `<button type="button" data-action="jump-question" data-index="${index}" class="${index === state.questionIndex ? "current " : ""}${state.results[id] === true ? "done" : state.results[id] === false ? "bad" : ""}">${index + 1}</button>`).join("")}</div>
      <section class="quiz-card"><div class="qmeta"><span class="qtype">${questionTypeLabel(question.type)}</span><b>${escapeHtml(question.id)}</b></div><h2 class="question">${escapeHtml(question.stem)}</h2>
      ${question.options.map((option) => {
        const selected = state.selected.includes(option.id);
        const isAnswer = question.answer.includes(option.id);
        let className = selected ? " selected" : "";
        if (state.revealed && isAnswer) className = " correct";
        else if (state.revealed && selected && !isAnswer) className = " wrong";
        return `<button type="button" class="option${className}" data-action="choose" data-id="${escapeHtml(option.id)}"><b>${escapeHtml(option.id)}.</b><span>${escapeHtml(option.text)}</span></button>`;
      }).join("")}
      ${state.revealed ? `<div class="explain ${correct ? "" : "bad"}"><strong>${correct ? t.correct : t.incorrect} · ${t.correctAnswer} ${question.answer.map(escapeHtml).join(answerSeparator)}</strong><p>${escapeHtml(question.explanation)}</p><span class="source">${t.source}: ${escapeHtml((question.source.files || []).join(fileSeparator))} · ${escapeHtml(question.source.locator)}</span></div><div class="actions"><button type="button" class="ghost" data-action="exit-quiz">${t.exitRound}</button><button type="button" class="secondary" data-action="next-question">${state.questionIndex === state.queue.length - 1 ? t.finish : t.nextQuestion}</button></div>` : `<button type="button" class="secondary submit" data-action="submit" ${state.selected.length ? "" : "disabled"}>${t.submit}</button>`}</section>`;
  }

  function renderWrong() {
    const questions = state.wrong.map((id) => questionById.get(id)).filter(Boolean);
    if (!questions.length) return header() + `<div class="screen-title"><h2>${t.wrongBook}</h2><p>${t.autoRemove(0)}</p></div>${emptyState(t.noWrong, t.wrongEmptyHint, "papers", t.goPractice)}`;
    return header() + `<div class="screen-title"><h2>${t.wrongBook}</h2><p>${t.autoRemove(questions.length)}</p></div><button type="button" class="secondary" data-action="start-wrong">${t.retryAll(questions.length)}</button><div style="height:12px"></div>${questions.map((question) => `<article class="wrong-card"><div class="qmeta"><span class="tag">${escapeHtml(question.topic)}</span><b>${escapeHtml(question.id)}</b></div><h3>${escapeHtml(question.stem)}</h3><p>${t.correctAnswer}: ${question.answer.map(escapeHtml).join(answerSeparator)}</p></article>`).join("")}`;
  }

  function renderProgress() {
    return header() + `<div class="screen-title"><h2>${t.progressTitle}</h2><p>${t.progressSubtitle}</p></div>
      <div class="section-head"><h2>${t.lectures}</h2><span>${state.known.length}/${cardTotal}</span></div><section class="panel">${lectures.length ? lectures.map((lecture) => { const known = knownFor(lecture); return `<div class="progress-row" data-action="open-lecture" data-id="${escapeHtml(lecture.id)}"><span class="resource-index">${escapeHtml(lecture.no)}</span><div><h3>${escapeHtml(lecture.title)}</h3><p>${known === lecture.cards.length ? t.completed : t.cardsRemaining(lecture.cards.length - known)}</p></div><span class="score">${known}/${lecture.cards.length}</span></div>`; }).join("") : `<p>${t.noLectureShort}</p>`}</section>
      <div class="section-head"><h2>${t.papers}</h2><span>${t.wrongCount(state.wrong.length)}</span></div><section class="panel">${papers.length ? papers.map((paper) => { const stats = paperStats(paper); return `<div class="progress-row" data-action="start-paper" data-id="${escapeHtml(paper.id)}"><span class="resource-index">${escapeHtml(paper.no)}</span><div><h3>${escapeHtml(paper.title)}</h3><p>${t.paperProgress(stats.done, stats.correct)}</p></div><span class="score">${stats.done}/${stats.total}</span></div>`; }).join("") : `<p>${t.noPaperShort}</p>`}</section>`;
  }

  function emptyState(title, message, tab, label) {
    return `<div class="empty"><b>✓</b><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${tab ? `<button type="button" class="secondary" data-action="go" data-tab="${tab}">${escapeHtml(label)}</button>` : ""}</div>`;
  }

  function render() {
    nav.innerHTML = navItems();
    if (state.tab === "home") app.innerHTML = renderHome();
    else if (state.tab === "cards") app.innerHTML = renderCards();
    else if (state.tab === "papers") app.innerHTML = renderPapers();
    else if (state.tab === "quiz") app.innerHTML = renderQuiz();
    else if (state.tab === "wrong") app.innerHTML = renderWrong();
    else app.innerHTML = renderProgress();
    bindSwipe();
  }

  function goCard(index) {
    const lecture = currentLecture();
    if (!lecture) return;
    const next = Math.max(0, Math.min(lecture.cards.length - 1, index));
    if (next === state.cardIndex) return;
    state.motion = next > state.cardIndex ? "motion-left" : "motion-right";
    state.cardIndex = next;
    persist();
    render();
  }

  function startPaper(paperId) {
    const paper = papers.find((item) => item.id === paperId);
    if (!paper?.questions.length) return showToast(t.noPaperQuestions);
    state.paperId = paper.id;
    state.quizMode = "paper";
    state.queue = paper.questions.map((question) => question.id);
    const firstUnanswered = state.queue.findIndex((id) => !Object.prototype.hasOwnProperty.call(state.results, id));
    state.questionIndex = firstUnanswered < 0 ? 0 : firstUnanswered;
    state.selected = [];
    state.revealed = false;
    state.tab = "quiz";
    persist();
    render();
    window.scrollTo(0, 0);
  }

  function bindSwipe() {
    const card = document.getElementById("knowledge-card");
    if (!card) return;
    let startX = 0;
    let startY = 0;
    card.addEventListener("touchstart", (event) => { const touch = event.changedTouches[0]; startX = touch.clientX; startY = touch.clientY; }, { passive: true });
    card.addEventListener("touchend", (event) => { const touch = event.changedTouches[0]; const dx = touch.clientX - startX; const dy = touch.clientY - startY; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) goCard(state.cardIndex + (dx < 0 ? 1 : -1)); }, { passive: true });
  }

  function handleAction(target) {
    const action = target.dataset.action;
    if (action === "go") return go(target.dataset.tab);
    if (action === "home-library") { state.homeLibrary = target.dataset.kind; persist(); return render(); }
    if (action === "open-lecture") { state.lectureId = target.dataset.id; state.cardIndex = 0; state.motion = ""; persist(); return go("cards"); }
    if (action === "go-card") return goCard(Number(target.dataset.index));
    if (action === "card-step") return goCard(state.cardIndex + Number(target.dataset.delta));
    if (action === "toggle-known") {
      const wasKnown = state.known.includes(target.dataset.id);
      if (wasKnown) state.known = state.known.filter((id) => id !== target.dataset.id);
      else state.known.push(target.dataset.id);
      const lecture = currentLecture();
      if (!wasKnown && state.cardIndex < lecture.cards.length - 1) state.cardIndex += 1;
      persist();
      render();
      if (!wasKnown && state.cardIndex === lecture.cards.length - 1 && state.known.includes(lecture.cards[lecture.cards.length - 1].id)) showToast(t.lectureComplete);
      return;
    }
    if (action === "start-paper") return startPaper(target.dataset.id);
    if (action === "choose") {
      if (state.revealed) return;
      const question = currentQuestion();
      const id = target.dataset.id;
      state.selected = question.type === "multi" ? (state.selected.includes(id) ? state.selected.filter((item) => item !== id) : [...state.selected, id]) : [id];
      return render();
    }
    if (action === "submit") {
      const question = currentQuestion();
      if (!question || !state.selected.length) return;
      const correct = sameAnswers(state.selected, question.answer);
      state.results[question.id] = correct;
      if (correct) state.wrong = state.wrong.filter((id) => id !== question.id);
      else if (!state.wrong.includes(question.id)) state.wrong.push(question.id);
      state.revealed = true;
      persist();
      return render();
    }
    if (action === "next-question") {
      if (state.questionIndex < state.queue.length - 1) { state.questionIndex += 1; state.selected = []; state.revealed = false; render(); window.scrollTo(0, 0); }
      else go(state.quizMode === "wrong" ? "wrong" : "papers");
      return;
    }
    if (action === "jump-question") { state.questionIndex = Number(target.dataset.index); state.selected = []; state.revealed = false; render(); window.scrollTo(0, 0); return; }
    if (action === "exit-quiz") return go(state.quizMode === "wrong" ? "wrong" : "papers");
    if (action === "start-wrong") {
      state.queue = state.wrong.filter((id) => questionById.has(id));
      if (!state.queue.length) return;
      state.quizMode = "wrong";
      state.questionIndex = 0;
      state.selected = [];
      state.revealed = false;
      state.tab = "quiz";
      return render();
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (target && !target.disabled) handleAction(target);
  });
  applyTheme();
  render();
})();
