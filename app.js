(() => {
  "use strict";

  const STORAGE_KEY = "memorize_app_v2";
  const THEME_KEY = "memorize_app_theme";

  const state = {
    files: [],
    quizCount: 0
  };

  let currentFileId = null;
  let currentTestId = null;

  let quizSession = null;
  let timerId = null;
  let draggedId = null;
  let draggedType = null;

  function uid(prefix) {
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

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  function load() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const saved = JSON.parse(raw);

      if (!saved || !Array.isArray(saved.files)) {
        return;
      }

      state.files = saved.files;
      state.quizCount =
        Number(saved.quizCount) || 0;

      normalizeData();
    } catch (error) {
      console.error(
        "데이터 로딩 오류:",
        error
      );
    }
  }

  function normalizeData() {
    state.files = state.files.map(file => ({
      id: file.id || uid("file"),
      name: String(file.name || "파일"),
      tests: Array.isArray(file.tests)
        ? file.tests.map(test => ({
            id: test.id || uid("test"),
            name: String(test.name || "테스트"),
            words: Array.isArray(test.words)
              ? test.words.map(word => ({
                  id: word.id || uid("word"),
                  term: String(word.term || ""),
                  meaning: String(word.meaning || ""),
                  meanings: Array.isArray(word.meanings)
                    ? word.meanings
                    : [String(word.meaning || "")],
                  important: Boolean(word.important),
                  correct: Number(word.correct) || 0,
                  wrong: Number(word.wrong) || 0,
                  lastWrong:
                    word.lastWrong || null
                }))
              : []
          }))
        : []
    }));
  }

  function getFile(fileId) {
    return state.files.find(
      file => file.id === fileId
    );
  }

  function getCurrentFile() {
    return getFile(currentFileId);
  }

  function getCurrentTest() {
    const file = getCurrentFile();

    if (!file) return null;

    return file.tests.find(
      test => test.id === currentTestId
    );
  }

  function show(viewId) {
    document
      .querySelectorAll(".view")
      .forEach(view =>
        view.classList.add("hidden")
      );

    document
      .getElementById(viewId)
      .classList.remove("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function updateNav(name) {
    document
      .querySelectorAll("[data-nav]")
      .forEach(button =>
        button.classList.toggle(
          "active",
          button.dataset.nav === name
        )
      );
  }

  /* =====================================================
     홈 / 파일
     ===================================================== */

  function renderHome() {
    show("homeView");
    updateNav("home");

    const list =
      document.getElementById("fileList");

    if (!state.files.length) {
      list.innerHTML = `
        <div class="empty">
          아직 파일이 없습니다.<br>
          「＋ 파일 추가」를 눌러주세요.
        </div>
      `;
      return;
    }

    list.innerHTML = state.files
      .map(
        file => `
          <div
            class="file-card"
            draggable="true"
            data-id="${file.id}"
            data-drag-type="file"
          >

            <div class="drag-handle">☷</div>

            <button
              class="file-main"
              type="button"
              data-open-file="${file.id}"
            >
              <div class="file-name">
                📁 ${escapeHTML(file.name)}
              </div>

              <div class="file-sub">
                ${file.tests.length}개 테스트
              </div>
            </button>

            <div class="file-actions">

              <button
                type="button"
                title="이름 변경"
                data-rename-file="${file.id}"
              >
                ✏️
              </button>

              <button
                type="button"
                title="삭제"
                data-delete-file="${file.id}"
              >
                🗑️
              </button>

            </div>

          </div>
        `
      )
      .join("");

    setupDragAndDrop();
  }

  function addFile() {
    const value = prompt(
      "파일 이름을 입력하세요."
    );

    if (value === null) return;

    const name = value.trim();

    if (!name) {
      alert("파일 이름을 입력해주세요.");
      return;
    }

    if (
      state.files.some(
        file =>
          normalize(file.name) ===
          normalize(name)
      )
    ) {
      alert("같은 이름의 파일이 있습니다.");
      return;
    }

    state.files.push({
      id: uid("file"),
      name,
      tests: []
    });

    save();
    renderHome();
  }

  function renameFile(fileId) {
    const file = getFile(fileId);

    if (!file) return;

    const value = prompt(
      "파일 이름을 변경하세요.",
      file.name
    );

    if (value === null) return;

    const name = value.trim();

    if (!name) {
      alert("파일 이름을 입력해주세요.");
      return;
    }

    if (
      state.files.some(
        other =>
          other.id !== fileId &&
          normalize(other.name) ===
            normalize(name)
      )
    ) {
      alert("같은 이름의 파일이 있습니다.");
      return;
    }

    file.name = name;

    save();
    renderHome();
  }

  function deleteFile(fileId) {
    const file = getFile(fileId);

    if (!file) return;

    if (
      !confirm(
        `"${file.name}" 파일을 삭제할까요?\n안의 테스트와 단어도 삭제됩니다.`
      )
    ) {
      return;
    }

    state.files = state.files.filter(
      item => item.id !== fileId
    );

    if (currentFileId === fileId) {
      currentFileId = null;
      currentTestId = null;
    }

    save();
    renderHome();
  }

  /* =====================================================
     파일 내부 테스트
     ===================================================== */

  function openFile(fileId) {
    const file = getFile(fileId);

    if (!file) return;

    currentFileId = fileId;
    currentTestId = null;

    renderFile();
  }

  function renderFile() {
    const file = getCurrentFile();

    if (!file) {
      renderHome();
      return;
    }

    show("fileView");
    updateNav("");

    document.getElementById(
      "fileBreadcrumb"
    ).textContent = file.name;

    document.getElementById(
      "fileTitle"
    ).textContent = `📁 ${file.name}`;

    const list =
      document.getElementById("testList");

    if (!file.tests.length) {
      list.innerHTML = `
        <div class="empty">
          아직 테스트가 없습니다.<br>
          「＋ 테스트 생성」을 눌러주세요.
        </div>
      `;
      return;
    }

    list.innerHTML = file.tests
      .map(
        test => `
          <article
            class="test-card"
            draggable="true"
            data-id="${test.id}"
            data-drag-type="test"
          >

            <div class="drag-handle">☷</div>

            <div style="flex:1">

              <div class="test-card-head">

                <button
                  class="file-main"
                  type="button"
                  data-open-test="${test.id}"
                >
                  <div class="test-name">
                    📝 ${escapeHTML(test.name)}
                  </div>

                  <div class="test-sub">
                    ${test.words.length}개 단어
                  </div>
                </button>

                <div class="test-card-actions">

                  <button
                    type="button"
                    title="이름 변경"
                    data-rename-test="${test.id}"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    title="삭제"
                    data-delete-test="${test.id}"
                  >
                    🗑️
                  </button>

                </div>

              </div>

              <div class="test-card-foot">

                <button
                  class="primary-btn"
                  type="button"
                  data-test-start="${test.id}"
                  data-test-mode="all"
                >
                  전체 테스트
                </button>

                <button
                  class="secondary-btn"
                  type="button"
                  data-test-start="${test.id}"
                  data-test-mode="quick"
                >
                  ⚡ 빠른 테스트
                </button>

              </div>

            </div>

          </article>
        `
      )
      .join("");

    setupDragAndDrop();
  }

  function addTest() {
    const file = getCurrentFile();

    if (!file) return;

    const value = prompt(
      "테스트 제목을 입력하세요."
    );

    if (value === null) return;

    const name = value.trim();

    if (!name) {
      alert("테스트 제목을 입력해주세요.");
      return;
    }

    if (
      file.tests.some(
        test =>
          normalize(test.name) ===
          normalize(name)
      )
    ) {
      alert("같은 이름의 테스트가 있습니다.");
      return;
    }

    file.tests.push({
      id: uid("test"),
      name,
      words: []
    });

    save();
    renderFile();
  }

  function renameTest(testId) {
    const file = getCurrentFile();

    if (!file) return;

    const test = file.tests.find(
      item => item.id === testId
    );

    if (!test) return;

    const value = prompt(
      "테스트 제목을 변경하세요.",
      test.name
    );

    if (value === null) return;

    const name = value.trim();

    if (!name) {
      alert("테스트 제목을 입력해주세요.");
      return;
    }

    if (
      file.tests.some(
        other =>
          other.id !== testId &&
          normalize(other.name) ===
            normalize(name)
      )
    ) {
      alert("같은 이름의 테스트가 있습니다.");
      return;
    }

    test.name = name;

    save();
    renderFile();
  }

  function deleteTest(testId) {
    const file = getCurrentFile();

    if (!file) return;

    const test = file.tests.find(
      item => item.id === testId
    );

    if (!test) return;

    if (
      !confirm(
        `"${test.name}" 테스트를 삭제할까요?\n안의 단어도 삭제됩니다.`
      )
    ) {
      return;
    }

    file.tests = file.tests.filter(
      item => item.id !== testId
    );

    if (currentTestId === testId) {
      currentTestId = null;
    }

    save();
    renderFile();
  }

  /* =====================================================
     단어장/테스트 화면
     ===================================================== */

  function openTest(testId) {
    const file = getCurrentFile();

    if (!file) return;

    const test = file.tests.find(
      item => item.id === testId
    );

    if (!test) return;

    currentTestId = testId;

    renderWordbook();
  }

  function renderWordbook() {
    const file = getCurrentFile();
    const test = getCurrentTest();

    if (!file || !test) {
      renderHome();
      return;
    }

    show("wordbookView");
    updateNav("");

    document.getElementById(
      "wordbookFileBtn"
    ).textContent = file.name;

    document.getElementById(
      "wordbookBreadcrumb"
    ).textContent = test.name;

    document.getElementById(
      "wordbookTitle"
    ).textContent = `📝 ${test.name}`;

    document.getElementById(
      "wordbookCount"
    ).textContent =
      `${test.words.length}개 단어`;

    document.getElementById(
      "directTestBtn"
    ).textContent =
      `${file.name} → 뜻`;

    document.getElementById(
      "reverseTestBtn"
    ).textContent =
      `뜻 → ${file.name}`;

    const list =
      document.getElementById(
        "wordList"
      );

    if (!test.words.length) {
      list.innerHTML = `
        <div class="empty">
          아직 단어가 없습니다.
        </div>
      `;
      return;
    }

    list.innerHTML = test.words
      .map(
        word => `
          <div class="word-row">

            <div>
              <div class="word-term">
                ${word.important ? "⭐ " : ""}
                ${escapeHTML(word.term)}
              </div>

              <div class="word-meaning">
                ${escapeHTML(
                  word.meanings.join(", ")
                )}
              </div>
            </div>

            <div class="word-actions">

              <button
                type="button"
                data-important-word="${word.id}"
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

  /* =====================================================
     단어 추가
     ===================================================== */

  function addWordsFromText() {
    const test = getCurrentTest();

    if (!test) return;

    const input =
      document.getElementById(
        "bulkWordInput"
      );

    const value = input.value.trim();

    if (!value) {
      alert("단어를 입력해주세요.");
      input.focus();
      return;
    }

    const entries = value
      .split("/")
      .map(item => item.trim())
      .filter(Boolean);

    let added = 0;

    for (const entry of entries) {
      const separator =
        entry.indexOf(":");

      if (separator === -1) {
        alert(
          `"${entry}"에 : 구분자가 없습니다.`
        );
        return;
      }

      const term =
        entry
          .slice(0, separator)
          .trim();

      const meaningText =
        entry
          .slice(separator + 1)
          .trim();

      if (!term || !meaningText) {
        alert(
          `"${entry}"의 단어 또는 뜻이 비어 있습니다.`
        );
        return;
      }

      const meanings =
        meaningText
          .split(",")
          .map(item => item.trim())
          .filter(Boolean);

      if (!meanings.length) {
        alert(
          `"${entry}"의 뜻이 없습니다.`
        );
        return;
      }

      const duplicate =
        test.words.some(
          word =>
            normalize(word.term) ===
              normalize(term) &&
            word.meanings.some(
              oldMeaning =>
                meanings.some(
                  newMeaning =>
                    normalize(
                      oldMeaning
                    ) ===
                    normalize(
                      newMeaning
                    )
                )
            )
        );

      if (duplicate) {
        alert(
          `"${term}"과 겹치는 단어가 있습니다.`
        );
        return;
      }

      test.words.push({
        id: uid("word"),
        term,
        meaning: meanings[0],
        meanings,
        important: false,
        correct: 0,
        wrong: 0,
        lastWrong: null
      });

      added++;
    }

    if (added > 0) {
      input.value = "";
      save();
      renderWordbook();
      input.focus();
    }
  }

  function editWord(wordId) {
    const test = getCurrentTest();

    if (!test) return;

    const word = test.words.find(
      item => item.id === wordId
    );

    if (!word) return;

    const term = prompt(
      "단어",
      word.term
    );

    if (term === null) return;

    const meanings = prompt(
      "뜻 (여러 뜻은 , 로 구분)",
      word.meanings.join(",")
    );

    if (meanings === null) return;

    const cleanTerm = term.trim();

    const cleanMeanings = meanings
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);

    if (
      !cleanTerm ||
      !cleanMeanings.length
    ) {
      alert("단어와 뜻을 모두 입력해주세요.");
      return;
    }

    word.term = cleanTerm;
    word.meanings = cleanMeanings;
    word.meaning = cleanMeanings[0];

    save();
    renderWordbook();
  }

  function deleteWord(wordId) {
    const test = getCurrentTest();

    if (!test) return;

    const word = test.words.find(
      item => item.id === wordId
    );

    if (!word) return;

    if (
      !confirm(
        `"${word.term}"을 삭제할까요?`
      )
    ) {
      return;
    }

    test.words = test.words.filter(
      item => item.id !== wordId
    );

    save();
    renderWordbook();
  }

  function toggleImportant(wordId) {
    const test = getCurrentTest();

    if (!test) return;

    const word = test.words.find(
      item => item.id === wordId
    );

    if (!word) return;

    word.important = !word.important;

    save();
    renderWordbook();
  }

  /* =====================================================
     테스트 시작
     ===================================================== */

  function startQuiz(
    test,
    mode
  ) {
    if (!test.words.length) {
      alert("테스트할 단어가 없습니다.");
      return;
    }

    let words = [...test.words];

    if (mode === "important") {
      words = words.filter(
        word => word.important
      );
    }

    if (mode === "wrong") {
      words = words.filter(
        word => word.wrong > 0
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

    let direction =
      mode === "direct"
        ? "direct"
        : mode === "reverse"
          ? "reverse"
          : null;

    quizSession = {
      fileId: currentFileId,
      testId: currentTestId,
      fileName:
        getCurrentFile().name,
      testName: test.name,
      words,
      mode,
      direction,
      index: 0,
      correct: 0,
      wrong: 0,
      wrongWords: [],
      answered: false
    };

    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    clearTimer();

    if (!quizSession) return;

    if (
      quizSession.index >=
      quizSession.words.length
    ) {
      finishQuiz();
      return;
    }

    show("quizView");
    updateNav("");

    const word =
      quizSession.words[
        quizSession.index
      ];

    let direction =
      quizSession.direction;

    if (!direction) {
      direction =
        Math.random() < 0.5
          ? "direct"
          : "reverse";

      quizSession.currentDirection =
        direction;
    } else {
      quizSession.currentDirection =
        direction;
    }

    const fileName =
      quizSession.fileName;

    if (direction === "direct") {
      document.getElementById(
        "quizDirection"
      ).textContent =
        `${fileName} → 뜻`;

      document.getElementById(
        "quizQuestion"
      ).textContent =
        word.term;
    } else {
      document.getElementById(
        "quizDirection"
      ).textContent =
        `뜻 → ${fileName}`;

      document.getElementById(
        "quizQuestion"
      ).textContent =
        word.meanings.join(", ");
    }

    document.getElementById(
      "quizProgress"
    ).textContent =
      `${quizSession.index + 1} / ${quizSession.words.length}`;

    const answer =
      document.getElementById(
        "quizAnswer"
      );

    answer.value = "";
    answer.disabled = false;

    document.getElementById(
      "quizFeedback"
    ).textContent = "";

    document.getElementById(
      "quizFeedback"
    ).className =
      "quiz-feedback";

    document.getElementById(
      "quizSubmitBtn"
    ).textContent =
      "정답 확인";

    answer.focus();

    startTimer();
  }

  function isCorrectAnswer(
    input,
    word,
    direction
  ) {
    const normalized =
      normalize(input);

    if (!normalized) {
      return false;
    }

    if (direction === "direct") {
      return word.meanings.some(
        meaning =>
          normalize(meaning) ===
          normalized
      );
    }

    return (
      normalize(word.term) ===
      normalized
    );
  }

  function submitQuizAnswer(
    fromTimer = false
  ) {
    if (!quizSession) return;

    if (quizSession.answered) {
      nextQuizQuestion();
      return;
    }

    clearTimer();

    const answer =
      document.getElementById(
        "quizAnswer"
      );

    const word =
      quizSession.words[
        quizSession.index
      ];

    const direction =
      quizSession.currentDirection;

    const correct =
      !fromTimer &&
      isCorrectAnswer(
        answer.value,
        word,
        direction
      );

    quizSession.answered = true;

    answer.disabled = true;

    if (correct) {
      word.correct =
        Number(word.correct || 0) +
        1;

      quizSession.correct++;

      const feedback =
        document.getElementById(
          "quizFeedback"
        );

      feedback.textContent =
        "⭕ 정답입니다.";

      feedback.className =
        "quiz-feedback feedback-correct";

      save();
    } else {
      word.wrong =
        Number(word.wrong || 0) +
        1;

      word.lastWrong =
        new Date().toISOString();

      quizSession.wrong++;
      quizSession.wrongWords.push(
        word
      );

      const feedback =
        document.getElementById(
          "quizFeedback"
        );

      feedback.textContent =
        fromTimer
          ? "⏰ 시간 초과! 오답입니다."
          : "❌ 오답입니다.";

      feedback.className =
        "quiz-feedback feedback-wrong";

      save();
    }

    document.getElementById(
      "quizSubmitBtn"
    ).textContent =
      quizSession.index ===
      quizSession.words.length - 1
        ? "결과 보기"
        : "다음 문제";
  }

  function nextQuizQuestion() {
    if (!quizSession) return;

    if (!quizSession.answered) {
      submitQuizAnswer();
      return;
    }

    quizSession.index++;

    renderQuizQuestion();
  }

  function startTimer() {
    let remaining = 10;

    const timer =
      document.getElementById(
        "quizTimer"
      );

    timer.textContent =
      remaining;

    timerId = setInterval(() => {
      remaining--;

      timer.textContent =
        Math.max(0, remaining);

      if (remaining <= 0) {
        clearTimer();

        if (
          !quizSession ||
          quizSession.answered
        ) {
          return;
        }

        submitQuizAnswer(true);

        setTimeout(
          () => {
            nextQuizQuestion();
          },
          700
        );
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function finishQuiz() {
    clearTimer();

    state.quizCount++;
    save();

    showResult();
  }

  /* =====================================================
     결과
     ===================================================== */

  function showResult() {
    show("resultView");
    updateNav("");

    const total =
      quizSession.words.length;

    document.getElementById(
      "resultScore"
    ).textContent =
      `${quizSession.correct} / ${total}`;

    const wrong =
      document.getElementById(
        "resultWrongWords"
      );

    if (
      !quizSession.wrongWords.length
    ) {
      wrong.innerHTML = `
        <div class="empty">
          모든 문제를 맞혔습니다! 🎉
        </div>
      `;
      return;
    }

    wrong.innerHTML = `
      <h3>틀린 문제</h3>

      ${quizSession.wrongWords
        .map(
          word => `
            <div class="wrong-item">
              <strong>
                ${escapeHTML(word.term)}
              </strong>

              <div>
                ${escapeHTML(
                  word.meanings.join(", ")
                )}
              </div>
            </div>
          `
        )
        .join("")}
    `;
  }

  function retryWrong() {
    if (
      !quizSession ||
      !quizSession.wrongWords.length
    ) {
      alert(
        "틀린 문제가 없습니다."
      );
      return;
    }

    const test =
      getCurrentTest();

    if (!test) return;

    quizSession = {
      ...quizSession,
      words: [
        ...quizSession.wrongWords
      ].sort(
        () => Math.random() - 0.5
      ),
      index: 0,
      correct: 0,
      wrong: 0,
      wrongWords: [],
      answered: false,
      direction:
        quizSession.mode === "direct"
          ? "direct"
          : quizSession.mode ===
              "reverse"
            ? "reverse"
            : null
    };

    renderQuizQuestion();
  }

  /* =====================================================
     빠른 테스트
     ===================================================== */

  function openQuickTest() {
    const choice = prompt(
      "빠른 테스트를 선택하세요.\n\n1. ⭐ 중요 단어 테스트\n2. ❌ 틀린 단어 테스트"
    );

    const test =
      getCurrentTest();

    if (!test) return;

    if (choice === "1") {
      startQuiz(
        test,
        "important"
      );
    }

    if (choice === "2") {
      startQuiz(
        test,
        "wrong"
      );
    }
  }

  /* =====================================================
     드래그
     ===================================================== */

  function setupDragAndDrop() {
    document
      .querySelectorAll(
        "[data-drag-type]"
      )
      .forEach(element => {

        element.addEventListener(
          "dragstart",
          () => {
            draggedId =
              element.dataset.id;

            draggedType =
              element.dataset.dragType;

            element.classList.add(
              "dragging"
            );
          }
        );

        element.addEventListener(
          "dragend",
          () => {
            draggedId = null;
            draggedType = null;

            document
              .querySelectorAll(
                "[data-drag-type]"
              )
              .forEach(item =>
                item.classList.remove(
                  "dragging",
                  "drag-over"
                )
              );
          }
        );

        element.addEventListener(
          "dragover",
          event => {
            event.preventDefault();

            if (
              draggedId &&
              draggedType ===
                element.dataset.dragType &&
              draggedId !==
                element.dataset.id
            ) {
              element.classList.add(
                "drag-over"
              );
            }
          }
        );

        element.addEventListener(
          "dragleave",
          () => {
            element.classList.remove(
              "drag-over"
            );
          }
        );

        element.addEventListener(
          "drop",
          event => {
            event.preventDefault();

            const targetId =
              element.dataset.id;

            if (
              !draggedId ||
              draggedId === targetId ||
              draggedType !==
                element.dataset.dragType
            ) {
              return;
            }

            if (
              draggedType === "file"
            ) {
              reorderFiles(
                draggedId,
                targetId
              );
            }

            if (
              draggedType === "test"
            ) {
              reorderTests(
                draggedId,
                targetId
              );
            }
          }
        );
      });
  }

  function reorderFiles(
    fromId,
    toId
  ) {
    const from =
      state.files.findIndex(
        item => item.id === fromId
      );

    const to =
      state.files.findIndex(
        item => item.id === toId
      );

    if (
      from === -1 ||
      to === -1
    ) {
      return;
    }

    const [item] =
      state.files.splice(
        from,
        1
      );

    state.files.splice(
      to,
      0,
      item
    );

    save();
    renderHome();
  }

  function reorderTests(
    fromId,
    toId
  ) {
    const file =
      getCurrentFile();

    if (!file) return;

    const from =
      file.tests.findIndex(
        item => item.id === fromId
      );

    const to =
      file.tests.findIndex(
        item => item.id === toId
      );

    if (
      from === -1 ||
      to === -1
    ) {
      return;
    }

    const [item] =
      file.tests.splice(
        from,
        1
      );

    file.tests.splice(
      to,
      0,
      item
    );

    save();
    renderFile();
  }

  /* =====================================================
     통계
     ===================================================== */

  function renderStats() {
    show("statsView");
    updateNav("stats");

    const testCount =
      state.files.reduce(
        (sum, file) =>
          sum + file.tests.length,
        0
      );

    const wordCount =
      state.files.reduce(
        (sum, file) =>
          sum +
          file.tests.reduce(
            (inner, test) =>
              inner +
              test.words.length,
            0
          ),
        0
      );

    document.getElementById(
      "statFileCount"
    ).textContent =
      state.files.length;

    document.getElementById(
      "statTestCount"
    ).textContent =
      testCount;

    document.getElementById(
      "statWordCount"
    ).textContent =
      wordCount;

    document.getElementById(
      "statQuizCount"
    ).textContent =
      state.quizCount;
  }

  /* =====================================================
     다크모드
     ===================================================== */

  function loadTheme() {
    const theme =
      localStorage.getItem(
        THEME_KEY
      );

    if (theme === "dark") {
      document.documentElement.classList.add(
        "dark"
      );

      document.getElementById(
        "themeBtn"
      ).textContent = "☀️";
    } else {
      document.getElementById(
        "themeBtn"
      ).textContent = "🌙";
    }
  }

  function toggleTheme() {
    const dark =
      document.documentElement.classList.toggle(
        "dark"
      );

    localStorage.setItem(
      THEME_KEY,
      dark ? "dark" : "light"
    );

    document.getElementById(
      "themeBtn"
    ).textContent =
      dark ? "☀️" : "🌙";
  }

  /* =====================================================
     설정
     ===================================================== */

  function renderSettings() {
    show("settingsView");
    updateNav("settings");

    document.getElementById(
      "onlineStatus"
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
        )
      ],
      {
        type: "application/json"
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "memory-app-backup.json";

    document.body.appendChild(
      link
    );

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
            parsed.files
          )
        ) {
          throw new Error();
        }

        if (
          !confirm(
            "현재 데이터를 불러온 데이터로 교체할까요?"
          )
        ) {
          return;
        }

        state.files =
          parsed.files;

        state.quizCount =
          Number(
            parsed.quizCount
          ) || 0;

        normalizeData();
        save();

        currentFileId = null;
        currentTestId = null;

        renderHome();

      } catch {
        alert(
          "잘못된 데이터 파일입니다."
        );
      }
    };

    reader.readAsText(file);
  }

  function resetAll() {
    if (
      !confirm(
        "모든 파일, 테스트, 단어와 기록을 삭제할까요?"
      )
    ) {
      return;
    }

    state.files = [];
    state.quizCount = 0;

    currentFileId = null;
    currentTestId = null;

    save();
    renderHome();
  }

  /* =====================================================
     이벤트
     ===================================================== */

  document.addEventListener(
    "click",
    event => {

      const target =
        event.target;

      const nav =
        target.closest(
          "[data-nav]"
        );

      if (nav) {
        const page =
          nav.dataset.nav;

        if (page === "home") {
          renderHome();
        }

        if (page === "stats") {
          renderStats();
        }

        if (page === "settings") {
          renderSettings();
        }

        return;
      }

      if (
        target.closest("#themeBtn")
      ) {
        toggleTheme();
        return;
      }

      if (
        target.closest("#addFileBtn")
      ) {
        addFile();
        return;
      }

      const openFileButton =
        target.closest(
          "[data-open-file]"
        );

      if (openFileButton) {
        openFile(
          openFileButton.dataset
            .openFile
        );
        return;
      }

      const renameFileButton =
        target.closest(
          "[data-rename-file]"
        );

      if (renameFileButton) {
        renameFile(
          renameFileButton.dataset
            .renameFile
        );
        return;
      }

      const deleteFileButton =
        target.closest(
          "[data-delete-file]"
        );

      if (deleteFileButton) {
        deleteFile(
          deleteFileButton.dataset
            .deleteFile
        );
        return;
      }

      if (
        target.closest("#fileHomeBtn")
      ) {
        renderHome();
        return;
      }

      if (
        target.closest("#addTestBtn")
      ) {
        addTest();
        return;
      }

      if (
        target.closest("#renameFileBtn")
      ) {
        renameFile(
          currentFileId
        );
        return;
      }

      if (
        target.closest("#deleteFileBtn")
      ) {
        deleteFile(
          currentFileId
        );
        return;
      }

      const openTestButton =
        target.closest(
          "[data-open-test]"
        );

      if (openTestButton) {
        openTest(
          openTestButton.dataset
            .openTest
        );
        return;
      }

      const renameTestButton =
        target.closest(
          "[data-rename-test]"
        );

      if (renameTestButton) {
        renameTest(
          renameTestButton.dataset
            .renameTest
        );
        return;
      }

      const deleteTestButton =
        target.closest(
          "[data-delete-test]"
        );

      if (deleteTestButton) {
        deleteTest(
          deleteTestButton.dataset
            .deleteTest
        );
        return;
      }

      const startButton =
        target.closest(
          "[data-test-start]"
        );

      if (startButton) {
        const file =
          getCurrentFile();

        if (!file) return;

        const test =
          file.tests.find(
            item =>
              item.id ===
              startButton.dataset
                .testStart
          );

        if (!test) return;

        const mode =
          startButton.dataset
            .testMode;

        if (
          mode === "quick"
        ) {
          openQuickTestFor(
            test
          );
        } else {
          startQuiz(
            test,
            "mixed"
          );
        }

        return;
      }

      if (
        target.closest(
          "#wordbookHomeBtn"
        )
      ) {
        renderHome();
        return;
      }

      if (
        target.closest(
          "#wordbookFileBtn"
        )
      ) {
        renderFile();
        return;
      }

      if (
        target.closest("#renameTestBtn")
      ) {
        renameTest(
          currentTestId
        );
        return;
      }

      if (
        target.closest("#deleteTestBtn")
      ) {
        deleteTest(
          currentTestId
        );
        return;
      }

      if (
        target.closest("#addWordsBtn")
      ) {
        addWordsFromText();
        return;
      }

      if (
        target.closest("#allTestBtn")
      ) {
        const test =
          getCurrentTest();

        if (test) {
          startQuiz(
            test,
            "mixed"
          );
        }

        return;
      }

      if (
        target.closest("#directTestBtn")
      ) {
        const test =
          getCurrentTest();

        if (test) {
          startQuiz(
            test,
            "direct"
          );
        }

        return;
      }

      if (
        target.closest("#reverseTestBtn")
      ) {
        const test =
          getCurrentTest();

        if (test) {
          startQuiz(
            test,
            "reverse"
          );
        }

        return;
      }

      if (
        target.closest("#quickTestBtn")
      ) {
        openQuickTestFor(
          getCurrentTest()
        );
        return;
      }

      const importantButton =
        target.closest(
          "[data-important-word]"
        );

      if (importantButton) {
        toggleImportant(
          importantButton.dataset
            .importantWord
        );
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

      if (
        target.closest("#quitQuizBtn")
      ) {
        if (
          confirm(
            "진행 중인 테스트를 종료할까요?"
          )
        ) {
          clearTimer();
          quizSession = null;
          renderHome();
        }

        return;
      }

      if (
        target.closest("#quizSubmitBtn")
      ) {
        submitQuizAnswer();
        return;
      }

      if (
        target.closest(
          "#goHomeResultBtn"
        )
      ) {
        quizSession = null;
        renderHome();
        return;
      }

      if (
        target.closest(
          "#goCurrentBookBtn"
        )
      ) {
        if (
          quizSession &&
          getFile(
            quizSession.fileId
          )
        ) {
          currentFileId =
            quizSession.fileId;

          currentTestId =
            quizSession.testId;

          renderWordbook();
        }

        return;
      }

      if (
        target.closest("#retryWrongBtn")
      ) {
        retryWrong();
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
        resetAll();
      }
    }
  );

  /* =====================================================
     키보드
     ===================================================== */

  document.addEventListener(
    "keydown",
    event => {

      if (
        !quizSession ||
        document
          .getElementById(
            "quizView"
          )
          .classList.contains(
            "hidden"
          )
      ) {
        return;
      }

      if (
        event.key !== "Enter"
      ) {
        return;
      }

      event.preventDefault();

      if (
        !quizSession.answered
      ) {
        submitQuizAnswer();
      } else {
        nextQuizQuestion();
      }
    }
  );

  document
    .getElementById(
      "bulkWordInput"
    )
    .addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          addWordsFromText();
        }
      }
    );

  /* =====================================================
     빠른 테스트 메뉴
     ===================================================== */

  function openQuickTestFor(
    test
  ) {
    if (!test) return;

    const choice = prompt(
      "빠른 테스트\n\n1. ⭐ 중요 단어 테스트\n2. ❌ 틀린 단어 테스트"
    );

    if (choice === "1") {
      startQuiz(
        test,
        "important"
      );
    }

    if (choice === "2") {
      startQuiz(
        test,
        "wrong"
      );
    }
  }

  /* =====================================================
     오프라인
     ===================================================== */

  window.addEventListener(
    "online",
    () => {
      const status =
        document.getElementById(
          "onlineStatus"
        );

      if (status) {
        status.textContent = "온라인";
      }
    }
  );

  window.addEventListener(
    "offline",
    () => {
      const status =
        document.getElementById(
          "onlineStatus"
        );

      if (status) {
        status.textContent = "오프라인";
      }
    }
  );

  /* =====================================================
     PWA
     ===================================================== */

  if (
    "serviceWorker" in navigator
  ) {
    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register("./sw.js")
          .catch(error =>
            console.error(
              "Service Worker:",
              error
            )
          );
      }
    );
  }

  /* =====================================================
     초기화
     ===================================================== */

  load();
  loadTheme();
  renderHome();

  const initialStatus =
    document.getElementById(
      "onlineStatus"
    );

  if (initialStatus) {
    initialStatus.textContent =
      navigator.onLine
        ? "온라인"
        : "오프라인";
  }
})();
