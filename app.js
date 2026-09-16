(() => {
  "use strict";

  const STORAGE_KEY = "memory_app_v1";

  const state = {
    pages: [],
    tests: 0,
  };

  let currentView = "home";
  let currentPageId = null;
  let currentBundleId = null;

  let testSession = null;
  let testTimer = null;

  let draggedPageId = null;

  function uid(prefix = "id") {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  function load() {
    try {
      const saved = localStorage.getItem(
        STORAGE_KEY
      );

      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (
        parsed &&
        Array.isArray(parsed.pages)
      ) {
        state.pages = parsed.pages;
        state.tests = Number(parsed.tests) || 0;
      }
    } catch (error) {
      console.error(
        "데이터 불러오기 실패:",
        error
      );
    }
  }

  function getPage(pageId) {
    return state.pages.find(
      (page) => page.id === pageId
    );
  }

  function getBundle(bundleId) {
    for (const page of state.pages) {
      const bundle = page.bundles?.find(
        (item) => item.id === bundleId
      );

      if (bundle) return bundle;
    }

    return null;
  }

  function getCurrentPage() {
    return getPage(currentPageId);
  }

  function getCurrentBundle() {
    return getBundle(currentBundleId);
  }

  function getPageTerm() {
    const page = getCurrentPage();

    return page?.name || "단어";
  }

  function showOnly(id) {
    document
      .querySelectorAll(".view")
      .forEach((view) => {
        view.classList.add("hidden");
      });

    document
      .getElementById(id)
      .classList.remove("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function updateNav(pageName) {
    document
      .querySelectorAll(".nav-btn")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.page === pageName
        );
      });
  }

  /* ========================================================
     홈
     ======================================================== */

  function renderHome() {
    currentView = "home";

    showOnly("homeView");
    updateNav("home");

    const list =
      document.getElementById("pageList");

    if (!state.pages.length) {
      list.innerHTML = `
        <div class="empty">
          아직 페이지가 없습니다.<br>
          위의 「＋ 페이지 추가」를 눌러주세요.
        </div>
      `;

      return;
    }

    list.innerHTML = state.pages
      .map(
        (page) => `
          <div
            class="page-card"
            draggable="true"
            data-page-id="${page.id}"
          >
            <div class="drag-handle">
              ☷
            </div>

            <button
              class="page-main"
              type="button"
              data-open-page="${page.id}"
            >
              <div class="page-name">
                ${escapeHTML(page.name)}
              </div>
            </button>

            <div class="page-actions">
              <button
                type="button"
                title="이름 변경"
                data-rename-page="${page.id}"
              >
                ✏️
              </button>

              <button
                type="button"
                title="삭제"
                data-delete-page="${page.id}"
              >
                🗑️
              </button>
            </div>
          </div>
        `
      )
      .join("");

    setupPageDrag();
  }

  function addPage() {
    const name = prompt(
      "새 페이지의 제목을 입력하세요."
    );

    if (name === null) return;

    const cleanName = name.trim();

    if (!cleanName) {
      alert("페이지 제목을 입력해주세요.");
      return;
    }

    if (
      state.pages.some(
        (page) =>
          page.name.toLowerCase() ===
          cleanName.toLowerCase()
      )
    ) {
      alert("같은 이름의 페이지가 이미 있습니다.");
      return;
    }

    state.pages.push({
      id: uid("page"),
      name: cleanName,
      bundles: [],
    });

    save();
    renderHome();
  }

  function renamePage(pageId) {
    const page = getPage(pageId);

    if (!page) return;

    const name = prompt(
      "페이지 제목을 변경하세요.",
      page.name
    );

    if (name === null) return;

    const cleanName = name.trim();

    if (!cleanName) {
      alert("페이지 제목을 입력해주세요.");
      return;
    }

    if (
      state.pages.some(
        (item) =>
          item.id !== pageId &&
          item.name.toLowerCase() ===
            cleanName.toLowerCase()
      )
    ) {
      alert("같은 이름의 페이지가 이미 있습니다.");
      return;
    }

    page.name = cleanName;

    save();
    renderHome();
  }

  function deletePage(pageId) {
    const page = getPage(pageId);

    if (!page) return;

    const answer = confirm(
      `"${page.name}" 페이지를 삭제할까요?\n\n페이지 안의 묶음과 단어도 모두 삭제됩니다.`
    );

    if (!answer) return;

    state.pages = state.pages.filter(
      (item) => item.id !== pageId
    );

    if (currentPageId === pageId) {
      currentPageId = null;
    }

    save();
    renderHome();
  }

  function setupPageDrag() {
    document
      .querySelectorAll(".page-card")
      .forEach((card) => {
        card.addEventListener(
          "dragstart",
          () => {
            draggedPageId =
              card.dataset.pageId;

            card.classList.add("dragging");
          }
        );

        card.addEventListener(
          "dragend",
          () => {
            draggedPageId = null;

            document
              .querySelectorAll(".page-card")
              .forEach((item) => {
                item.classList.remove(
                  "dragging",
                  "drag-over"
                );
              });
          }
        );

        card.addEventListener(
          "dragover",
          (event) => {
            event.preventDefault();

            if (
              draggedPageId &&
              draggedPageId !==
                card.dataset.pageId
            ) {
              card.classList.add("drag-over");
            }
          }
        );

        card.addEventListener(
          "dragleave",
          () => {
            card.classList.remove(
              "drag-over"
            );
          }
        );

        card.addEventListener(
          "drop",
          (event) => {
            event.preventDefault();

            const targetId =
              card.dataset.pageId;

            if (
              !draggedPageId ||
              draggedPageId === targetId
            ) {
              return;
            }

            const fromIndex =
              state.pages.findIndex(
                (page) =>
                  page.id === draggedPageId
              );

            const toIndex =
              state.pages.findIndex(
                (page) =>
                  page.id === targetId
              );

            if (
              fromIndex === -1 ||
              toIndex === -1
            ) {
              return;
            }

            const [moved] =
              state.pages.splice(
                fromIndex,
                1
              );

            state.pages.splice(
              toIndex,
              0,
              moved
            );

            save();
            renderHome();
          }
        );
      });
  }

  /* ========================================================
     페이지
     ======================================================== */

  function openPage(pageId) {
    const page = getPage(pageId);

    if (!page) return;

    currentPageId = pageId;
    currentBundleId = null;

    renderSubject();
  }

  function renderSubject() {
    currentView = "subject";

    const page = getCurrentPage();

    if (!page) {
      renderHome();
      return;
    }

    showOnly("subjectView");
    updateNav("");

    document.getElementById(
      "subjectName"
    ).textContent = page.name;

    document.getElementById(
      "subjectTitle"
    ).textContent = page.name;

    document.getElementById(
      "subjectDescription"
    ).textContent =
      `"${page.name}" 암기 페이지`;

    document.getElementById(
      "subjectTestInfo"
    ).textContent =
      `${page.name} → 뜻 / 뜻 → ${page.name}`;

    const list =
      document.getElementById(
        "bundleList"
      );

    if (!page.bundles.length) {
      list.innerHTML = `
        <div class="empty">
          아직 묶음이 없습니다.<br>
          「＋ 묶음칸 생성」을 눌러주세요.
        </div>
      `;

      return;
    }

    list.innerHTML = page.bundles
      .map(
        (bundle) => `
          <article class="bundle-card">

            <div class="bundle-card-head">
              <div>
                <div class="bundle-card-title">
                  ${escapeHTML(bundle.name)}
                </div>

                <div class="bundle-card-count">
                  ${bundle.words.length}개 단어
                </div>
              </div>
            </div>

            <div class="bundle-actions">

              <button
                class="primary-btn"
                type="button"
                data-open-bundle="${bundle.id}"
              >
                📚 단어장
              </button>

              <button
                class="secondary-btn"
                type="button"
                data-rename-bundle="${bundle.id}"
              >
                ✏️ 이름 변경
              </button>

              <button
                class="danger-btn"
                type="button"
                data-delete-bundle="${bundle.id}"
              >
                🗑️ 삭제
              </button>

            </div>

          </article>
        `
      )
      .join("");
  }

  function addBundle() {
    const page = getCurrentPage();

    if (!page) return;

    const name = prompt(
      "묶음 제목을 입력하세요."
    );

    if (name === null) return;

    const cleanName = name.trim();

    if (!cleanName) {
      alert("묶음 제목을 입력해주세요.");
      return;
    }

    if (
      page.bundles.some(
        (bundle) =>
          bundle.name.toLowerCase() ===
          cleanName.toLowerCase()
      )
    ) {
      alert("같은 이름의 묶음이 이미 있습니다.");
      return;
    }

    page.bundles.push({
      id: uid("bundle"),
      name: cleanName,
      words: [],
    });

    save();
    renderSubject();
  }

  function renameBundle(bundleId) {
    const bundle = getBundle(bundleId);

    if (!bundle) return;

    const name = prompt(
      "묶음 제목을 변경하세요.",
      bundle.name
    );

    if (name === null) return;

    const cleanName = name.trim();

    if (!cleanName) {
      alert("묶음 제목을 입력해주세요.");
      return;
    }

    const page = getCurrentPage();

    if (
      page.bundles.some(
        (item) =>
          item.id !== bundleId &&
          item.name.toLowerCase() ===
            cleanName.toLowerCase()
      )
    ) {
      alert("같은 이름의 묶음이 이미 있습니다.");
      return;
    }

    bundle.name = cleanName;

    save();
    renderSubject();
  }

  function deleteBundle(bundleId) {
    const page = getCurrentPage();

    if (!page) return;

    const bundle =
      page.bundles.find(
        (item) => item.id === bundleId
      );

    if (!bundle) return;

    const answer = confirm(
      `"${bundle.name}" 묶음을 삭제할까요?\n\n안의 단어도 모두 삭제됩니다.`
    );

    if (!answer) return;

    page.bundles =
      page.bundles.filter(
        (item) => item.id !== bundleId
      );

    save();
    renderSubject();
  }

  /* ========================================================
     묶음
     ======================================================== */

  function openBundle(bundleId) {
    const page = getCurrentPage();

    if (!page) return;

    const bundle =
      page.bundles.find(
        (item) => item.id === bundleId
      );

    if (!bundle) return;

    currentBundleId = bundleId;

    renderBundle();
  }

  function renderBundle() {
    currentView = "bundle";

    const page = getCurrentPage();
    const bundle = getCurrentBundle();

    if (!page || !bundle) {
      renderHome();
      return;
    }

    showOnly("bundleView");
    updateNav("");

    document.getElementById(
      "bundleBackSubjectBtn"
    ).textContent = page.name;

    document.getElementById(
      "bundleBreadcrumbName"
    ).textContent = bundle.name;

    document.getElementById(
      "bundleTitle"
    ).textContent = bundle.name;

    document.getElementById(
      "bundleWordCount"
    ).textContent =
      `${bundle.words.length}개 단어`;

    document.getElementById(
      "directTestBtn"
    ).textContent =
      `📝 ${page.name} → 뜻`;

    document.getElementById(
      "reverseTestBtn"
    ).textContent =
      `📝 뜻 → ${page.name}`;

    const list =
      document.getElementById(
        "wordList"
      );

    if (!bundle.words.length) {
      list.innerHTML = `
        <div class="empty">
          아직 단어가 없습니다.
        </div>
      `;

      return;
    }

    list.innerHTML = bundle.words
      .map(
        (word) => `
          <div class="word-row">
            <div class="word-left">
              <div class="word-term">
                ${escapeHTML(word.term)}
              </div>

              <div class="word-meaning">
                ${escapeHTML(word.meaning)}
              </div>
            </div>

            <div class="word-actions">

              <button
                type="button"
                data-toggle-important="${word.id}"
                title="중요"
              >
                ${word.important ? "⭐" : "☆"}
              </button>

              <button
                type="button"
                data-edit-word="${word.id}"
              >
                ✏️
              </button>

              <button
                type="button"
                data-delete-word="${word.id}"
              >
                🗑️
              </button>

            </div>
          </div>
        `
      )
      .join("");
  }

  function addWord() {
    const bundle = getCurrentBundle();

    if (!bundle) return;

    const termInput =
      document.getElementById(
        "wordInput"
      );

    const meaningInput =
      document.getElementById(
        "meaningInput"
      );

    const term = termInput.value.trim();
    const meaning =
      meaningInput.value.trim();

    if (!term) {
      alert("단어를 입력해주세요.");
      termInput.focus();
      return;
    }

    if (!meaning) {
      alert("뜻을 입력해주세요.");
      meaningInput.focus();
      return;
    }

    const duplicate =
      bundle.words.some(
        (word) =>
          normalizeForCompare(
            word.term
          ) ===
            normalizeForCompare(term) &&
          normalizeForCompare(
            word.meaning
          ) ===
            normalizeForCompare(meaning)
      );

    if (duplicate) {
      alert("같은 단어와 뜻이 이미 있습니다.");
      return;
    }

    bundle.words.push({
      id: uid("word"),
      term,
      meaning,
      important: false,
      correct: 0,
      wrong: 0,
      lastWrong: null,
    });

    termInput.value = "";
    meaningInput.value = "";

    save();
    renderBundle();

    termInput.focus();
  }

  function editWord(wordId) {
    const bundle = getCurrentBundle();

    if (!bundle) return;

    const word =
      bundle.words.find(
        (item) => item.id === wordId
      );

    if (!word) return;

    const term = prompt(
      "단어를 수정하세요.",
      word.term
    );

    if (term === null) return;

    const meaning = prompt(
      "뜻을 수정하세요.",
      word.meaning
    );

    if (meaning === null) return;

    const cleanTerm = term.trim();
    const cleanMeaning = meaning.trim();

    if (!cleanTerm || !cleanMeaning) {
      alert("단어와 뜻을 모두 입력해주세요.");
      return;
    }

    const duplicate =
      bundle.words.some(
        (item) =>
          item.id !== wordId &&
          normalizeForCompare(
            item.term
          ) ===
            normalizeForCompare(
              cleanTerm
            ) &&
          normalizeForCompare(
            item.meaning
          ) ===
            normalizeForCompare(
              cleanMeaning
            )
      );

    if (duplicate) {
      alert("같은 단어와 뜻이 이미 있습니다.");
      return;
    }

    word.term = cleanTerm;
    word.meaning = cleanMeaning;

    save();
    renderBundle();
  }

  function deleteWord(wordId) {
    const bundle = getCurrentBundle();

    if (!bundle) return;

    const word =
      bundle.words.find(
        (item) => item.id === wordId
      );

    if (!word) return;

    if (
      !confirm(
        `"${word.term}"을 삭제할까요?`
      )
    ) {
      return;
    }

    bundle.words =
      bundle.words.filter(
        (item) => item.id !== wordId
      );

    save();
    renderBundle();
  }

  function toggleImportant(wordId) {
    const bundle = getCurrentBundle();

    if (!bundle) return;

    const word =
      bundle.words.find(
        (item) => item.id === wordId
      );

    if (!word) return;

    word.important = !word.important;

    save();
    renderBundle();
  }

  /* ========================================================
     정답 비교
     ======================================================== */

  function normalizeForCompare(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function isAnswerCorrect(input, answer) {
    return (
      normalizeForCompare(input) ===
      normalizeForCompare(answer)
    );
  }

  /* ========================================================
     테스트
     ======================================================== */

  function collectAllWords() {
    const page = getCurrentPage();

    if (!page) return [];

    return page.bundles.flatMap(
      (bundle) =>
        bundle.words.map((word) => ({
          ...word,
          bundleId: bundle.id,
        }))
    );
  }

  function startTest(mode) {
    const bundle = getCurrentBundle();

    if (!bundle) return;

    if (!bundle.words.length) {
      alert("테스트할 단어가 없습니다.");
      return;
    }

    let words = [...bundle.words];

    if (mode === "wrong") {
      words = words.filter(
        (word) => word.wrong > 0
      );
    }

    if (mode === "important") {
      words = words.filter(
        (word) => word.important
      );
    }

    if (!words.length) {
      alert("조건에 맞는 단어가 없습니다.");
      return;
    }

    words.sort(
      () => Math.random() - 0.5
    );

    let direction = "mixed";

    if (
      mode === "direct" ||
      mode === "reverse"
    ) {
      direction = mode;
    }

    testSession = {
      pageId: currentPageId,
      bundleId: currentBundleId,
      mode,
      direction,
      words,
      index: 0,
      correct: 0,
      wrong: 0,
      wrongWords: [],
      answered: false,
    };

    renderTestQuestion();
  }

  function renderTestQuestion() {
    if (!testSession) return;

    clearTimer();

    if (
      testSession.index >=
      testSession.words.length
    ) {
      finishTest();
      return;
    }

    currentView = "test";

    showOnly("testView");
    updateNav("");

    const word =
      testSession.words[
        testSession.index
      ];

    let direction =
      testSession.direction;

    if (direction === "mixed") {
      direction =
        Math.random() < 0.5
          ? "direct"
          : "reverse";

      testSession.currentDirection =
        direction;
    }

    if (direction === "direct") {
      document.getElementById(
        "questionDirection"
      ).textContent =
        `${getPageTerm()} → 뜻`;

      document.getElementById(
        "questionText"
      ).textContent =
        word.term;
    } else {
      document.getElementById(
        "questionDirection"
      ).textContent =
        `뜻 → ${getPageTerm()}`;

      document.getElementById(
        "questionText"
      ).textContent =
        word.meaning;
    }

    document.getElementById(
      "testProgress"
    ).textContent =
      `${testSession.index + 1} / ${testSession.words.length}`;

    document.getElementById(
      "answerInput"
    ).value = "";

    document.getElementById(
      "answerInput"
    ).disabled = false;

    document.getElementById(
      "submitAnswerBtn"
    ).disabled = false;

    document.getElementById(
      "answerResult"
    ).textContent = "";

    document
      .getElementById("answerResult")
      .className = "answer-result";

    testSession.answered = false;

    document
      .getElementById("answerInput")
      .focus();

    startTimer();
  }

  function submitAnswer() {
    if (!testSession) return;

    if (testSession.answered) {
      nextQuestion();
      return;
    }

    clearTimer();

    const word =
      testSession.words[
        testSession.index
      ];

    const input =
      document.getElementById(
        "answerInput"
      ).value;

    if (!input.trim()) {
      handleWrong(word, true);
      return;
    }

    const direction =
      testSession.direction ===
      "mixed"
        ? testSession.currentDirection
        : testSession.direction;

    let correctAnswer = "";

    if (direction === "direct") {
      correctAnswer = word.meaning;
    } else {
      correctAnswer = word.term;
    }

    const correct =
      isAnswerCorrect(
        input,
        correctAnswer
      );

    if (correct) {
      handleCorrect(word);
    } else {
      handleWrong(word, false);
    }

    testSession.answered = true;

    document.getElementById(
      "answerInput"
    ).disabled = true;

    document.getElementById(
      "submitAnswerBtn"
    ).disabled = false;
  }

  function handleCorrect(word) {
    word.correct =
      Number(word.correct || 0) + 1;

    testSession.correct += 1;

    const result =
      document.getElementById(
        "answerResult"
      );

    result.textContent = "⭕ 정답!";
    result.className =
      "answer-result correct";

    save();
  }

  function handleWrong(
    word,
    timeout
  ) {
    word.wrong =
      Number(word.wrong || 0) + 1;

    word.lastWrong =
      new Date().toISOString();

    testSession.wrong += 1;
    testSession.wrongWords.push(word);

    const result =
      document.getElementById(
        "answerResult"
      );

    result.textContent = timeout
      ? "⏰ 시간 초과! 오답입니다."
      : "❌ 오답입니다.";

    result.className =
      "answer-result wrong";

    save();
  }

  function nextQuestion() {
    if (!testSession?.answered) {
      submitAnswer();
      return;
    }

    testSession.index += 1;

    renderTestQuestion();
  }

  function startTimer() {
    let seconds = 10;

    const timer =
      document.getElementById(
        "timer"
      );

    timer.textContent =
      seconds;

    testTimer = setInterval(() => {
      seconds -= 1;

      timer.textContent =
        Math.max(seconds, 0);

      if (seconds <= 0) {
        clearTimer();

        if (
          !testSession ||
          testSession.answered
        ) {
          return;
        }

        const word =
          testSession.words[
            testSession.index
          ];

        handleWrong(word, true);

        testSession.answered = true;

        document.getElementById(
          "answerInput"
        ).disabled = true;

        document.getElementById(
          "submitAnswerBtn"
        ).disabled = false;

        setTimeout(() => {
          nextQuestion();
        }, 700);
      }
    }, 1000);
  }

  function clearTimer() {
    if (testTimer) {
      clearInterval(testTimer);
      testTimer = null;
    }
  }

  function finishTest() {
    clearTimer();

    state.tests += 1;
    save();

    showResult();
  }

  function showResult() {
    currentView = "result";

    showOnly("resultView");
    updateNav("");

    const total =
      testSession.words.length;

    const correct =
      testSession.correct;

    document.getElementById(
      "resultScore"
    ).textContent =
      `${correct} / ${total}`;

    const wrongList =
      document.getElementById(
        "wrongList"
      );

    if (
      !testSession.wrongWords.length
    ) {
      wrongList.innerHTML = `
        <div class="empty">
          모든 문제를 맞혔습니다! 🎉
        </div>
      `;
      return;
    }

    wrongList.innerHTML = `
      <h3>틀린 단어</h3>

      ${testSession.wrongWords
        .map(
          (word) => `
            <div class="wrong-item">
              <strong>
                ${escapeHTML(word.term)}
              </strong>

              <div>
                ${escapeHTML(word.meaning)}
              </div>
            </div>
          `
        )
        .join("")}
    `;
  }

  function retryWrongWords() {
    if (
      !testSession ||
      !testSession.wrongWords.length
    ) {
      return;
    }

    const wrongWords = [
      ...testSession.wrongWords,
    ].sort(
      () => Math.random() - 0.5
    );

    testSession = {
      ...testSession,
      words: wrongWords,
      index: 0,
      correct: 0,
      wrong: 0,
      wrongWords: [],
      answered: false,
    };

    renderTestQuestion();
  }

  /* ========================================================
     빠른 테스트
     ======================================================== */

  function startQuickTest(type) {
    const page = getCurrentPage();

    if (!page) return;

    let words = [];

    if (type === "important") {
      words = collectAllWords().filter(
        (word) => word.important
      );
    } else if (type === "wrong") {
      words = collectAllWords().filter(
        (word) => word.wrong > 0
      );
    }

    if (!words.length) {
      alert(
        "조건에 맞는 단어가 없습니다."
      );
      return;
    }

    words.sort(
      () => Math.random() - 0.5
    );

    testSession = {
      pageId: currentPageId,
      bundleId: null,
      mode: type,
      direction: "mixed",
      words,
      index: 0,
      correct: 0,
      wrong: 0,
      wrongWords: [],
      answered: false,
    };

    renderTestQuestion();
  }

  function openQuickTestMenu() {
    const choice = prompt(
      "빠른 테스트를 선택하세요.\n\n1. ⭐ 중요 단어 테스트\n2. ❌ 틀린 단어 테스트"
    );

    if (choice === "1") {
      startQuickTest("important");
    } else if (choice === "2") {
      startQuickTest("wrong");
    }
  }

  /* ========================================================
     통계
     ======================================================== */

  function renderStats() {
    currentView = "stats";

    showOnly("statsView");
    updateNav("stats");

    const bundleCount =
      state.pages.reduce(
        (sum, page) =>
          sum + page.bundles.length,
        0
      );

    const wordCount =
      state.pages.reduce(
        (sum, page) =>
          sum +
          page.bundles.reduce(
            (inner, bundle) =>
              inner + bundle.words.length,
            0
          ),
        0
      );

    document.getElementById(
      "statPages"
    ).textContent =
      state.pages.length;

    document.getElementById(
      "statBundles"
    ).textContent =
      bundleCount;

    document.getElementById(
      "statWords"
    ).textContent =
      wordCount;

    document.getElementById(
      "statTests"
    ).textContent =
      state.tests;
  }

  /* ========================================================
     설정
     ======================================================== */

  function renderSettings() {
    currentView = "settings";

    showOnly("settingsView");
    updateNav("settings");

    document.getElementById(
      "offlineStatus"
    ).textContent =
      navigator.onLine
        ? "온라인"
        : "오프라인";
  }

  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "memory-app-backup.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function importData(file) {
    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const parsed =
          JSON.parse(
            reader.result
          );

        if (
          !parsed ||
          !Array.isArray(
            parsed.pages
          )
        ) {
          throw new Error(
            "잘못된 파일"
          );
        }

        if (
          !confirm(
            "현재 데이터를 불러온 데이터로 교체할까요?"
          )
        ) {
          return;
        }

        state.pages =
          parsed.pages;

        state.tests =
          Number(parsed.tests) || 0;

        save();

        renderHome();
      } catch (error) {
        alert(
          "불러오기에 실패했습니다."
        );
      }
    };

    reader.readAsText(file);
  }

  function resetData() {
    if (
      !confirm(
        "모든 페이지, 묶음, 단어와 기록을 삭제할까요?"
      )
    ) {
      return;
    }

    state.pages = [];
    state.tests = 0;

    currentPageId = null;
    currentBundleId = null;

    save();
    renderHome();
  }

  /* ========================================================
     이벤트
     ======================================================== */

  document.addEventListener(
    "click",
    (event) => {
      const target =
        event.target;

      const nav =
        target.closest(
          ".nav-btn"
        );

      if (nav) {
        const page =
          nav.dataset.page;

        if (page === "home") {
          renderHome();
        } else if (page === "stats") {
          renderStats();
        } else if (
          page === "settings"
        ) {
          renderSettings();
        }

        return;
      }

      if (
        target.closest("#logoBtn")
      ) {
        renderHome();
        return;
      }

      if (
        target.closest("#addPageBtn")
      ) {
        addPage();
        return;
      }

      const openPageButton =
        target.closest(
          "[data-open-page]"
        );

      if (openPageButton) {
        openPage(
          openPageButton.dataset
            .openPage
        );
        return;
      }

      const renamePageButton =
        target.closest(
          "[data-rename-page]"
        );

      if (renamePageButton) {
        renamePage(
          renamePageButton.dataset
            .renamePage
        );
        return;
      }

      const deletePageButton =
        target.closest(
          "[data-delete-page]"
        );

      if (deletePageButton) {
        deletePage(
          deletePageButton.dataset
            .deletePage
        );
        return;
      }

      if (
        target.closest("#backHomeBtn")
      ) {
        renderHome();
        return;
      }

      if (
        target.closest("#addBundleBtn")
      ) {
        addBundle();
        return;
      }

      if (
        target.closest("#renamePageBtn")
      ) {
        renamePage(
          currentPageId
        );
        return;
      }

      if (
        target.closest("#deletePageBtn")
      ) {
        deletePage(
          currentPageId
        );
        return;
      }

      const openBundleButton =
        target.closest(
          "[data-open-bundle]"
        );

      if (openBundleButton) {
        openBundle(
          openBundleButton.dataset
            .openBundle
        );
        return;
      }

      const renameBundleButton =
        target.closest(
          "[data-rename-bundle]"
        );

      if (renameBundleButton) {
        renameBundle(
          renameBundleButton.dataset
            .renameBundle
        );
        return;
      }

      const deleteBundleButton =
        target.closest(
          "[data-delete-bundle]"
        );

      if (deleteBundleButton) {
        deleteBundle(
          deleteBundleButton.dataset
            .deleteBundle
        );
        return;
      }

      if (
        target.closest(
          "#bundleBackHomeBtn"
        )
      ) {
        renderHome();
        return;
      }

      if (
        target.closest(
          "#bundleBackSubjectBtn"
        )
      ) {
        renderSubject();
        return;
      }

      if (
        target.closest("#renameBundleBtn")
      ) {
        renameBundle(
          currentBundleId
        );
        return;
      }

      if (
        target.closest("#deleteBundleBtn")
      ) {
        deleteBundle(
          currentBundleId
        );
        return;
      }

      if (
        target.closest("#addWordBtn")
      ) {
        addWord();
        return;
      }

      const editWordButton =
        target.closest(
          "[data-edit-word]"
        );

      if (editWordButton) {
        editWord(
          editWordButton.dataset
            .editWord
        );
        return;
      }

      const deleteWordButton =
        target.closest(
          "[data-delete-word]"
        );

      if (deleteWordButton) {
        deleteWord(
          deleteWordButton.dataset
            .deleteWord
        );
        return;
      }

      const importantButton =
        target.closest(
          "[data-toggle-important]"
        );

      if (importantButton) {
        toggleImportant(
          importantButton.dataset
            .toggleImportant
        );
        return;
      }

      if (
        target.closest("#allTestBtn")
      ) {
        startTest("mixed");
        return;
      }

      if (
        target.closest("#directTestBtn")
      ) {
        startTest("direct");
        return;
      }

      if (
        target.closest("#reverseTestBtn")
      ) {
        startTest("reverse");
        return;
      }

      if (
        target.closest("#quickTestBtn")
      ) {
        openQuickTestMenu();
        return;
      }

      if (
        target.closest("#submitAnswerBtn")
      ) {
        submitAnswer();
        return;
      }

      if (
        target.closest("#exitTestBtn")
      ) {
        if (
          confirm(
            "진행 중인 테스트를 종료할까요?"
          )
        ) {
          clearTimer();
          testSession = null;
          renderHome();
        }

        return;
      }

      if (
        target.closest("#retryWrongBtn")
      ) {
        retryWrongWords();
        return;
      }

      if (
        target.closest("#resultHomeBtn")
      ) {
        testSession = null;
        renderHome();
        return;
      }

      if (
        target.closest("#exportBtn")
      ) {
        exportData();
        return;
      }

      if (
        target.closest("#importBtn")
      ) {
        document
          .getElementById(
            "importFile"
          )
          .click();

        return;
      }

      if (
        target.closest("#resetBtn")
      ) {
        resetData();
      }
    }
  );

  document
    .getElementById("importFile")
    .addEventListener(
      "change",
      (event) => {
        importData(
          event.target.files[0]
        );

        event.target.value = "";
      }
    );

  document
    .getElementById("answerInput")
    .addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          submitAnswer();
        }
      }
    );

  document
    .getElementById("meaningInput")
    .addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          addWord();
        }
      }
    );

  window.addEventListener(
    "beforeunload",
    () => {
      save();
    }
  );

  /* ========================================================
     PWA
     ======================================================== */

  if (
    "serviceWorker" in navigator
  ) {
    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register("./sw.js")
          .catch((error) => {
            console.error(
              "Service Worker 오류:",
              error
            );
          });
      }
    );
  }

  /* ========================================================
     초기화
     ======================================================== */

  load();
  renderHome();
})();
