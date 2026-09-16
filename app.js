const STORAGE_KEY = "memorize_app_data_v1";
const THEME_KEY = "memorize_app_theme_v1";

let state = loadState();

let currentScreen = "home";
let currentFileId = null;
let currentTestId = null;

let quizSession = null;
let quizTimer = null;
let quizTimeLeft = 10;

let quickSource = null;
let confirmCallback = null;

const mainContent = document.getElementById("mainContent");
const backBtn = document.getElementById("backBtn");
const themeBtn = document.getElementById("themeBtn");
const homeBtn = document.getElementById("homeBtn");
const statsBtn = document.getElementById("statsBtn");
const settingsBtn = document.getElementById("settingsBtn");

const quickModal = document.getElementById("quickModal");
const closeQuickModal = document.getElementById("closeQuickModal");
const importantQuickBtn = document.getElementById("importantQuickBtn");
const wrongQuickBtn = document.getElementById("wrongQuickBtn");

const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");

function defaultState() {
  return {
    files: [],
    history: []
  };
}

function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return defaultState();
    }

    const parsed = JSON.parse(data);

    return {
      files: Array.isArray(parsed.files) ? parsed.files : [],
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId(prefix) {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random().toString(36).slice(2)
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findFile(fileId) {
  return state.files.find(file => file.id === fileId);
}

function findTest(file, testId) {
  if (!file) return null;
  return file.tests.find(test => test.id === testId);
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getAllFileWords(file) {
  if (!file) return [];

  const result = [];

  file.tests.forEach(test => {
    test.words.forEach(word => {
      result.push({
        ...word,
        sourceTestId: test.id
      });
    });
  });

  return result;
}

function isEnglishLike(text) {
  return /^[A-Za-z0-9\s.,!?'"()\-_/]+$/.test(text);
}

function isAnswerCorrect(answer, acceptedAnswers) {
  const userAnswer = String(answer || "").trim();

  if (!userAnswer) return false;

  return acceptedAnswers.some(item => {
    const expected = String(item || "").trim();

    if (isEnglishLike(userAnswer) && isEnglishLike(expected)) {
      return userAnswer.toLowerCase() === expected.toLowerCase();
    }

    return userAnswer === expected;
  });
}

function formatDateTime(iso) {
  const date = new Date(iso);

  return (
    (date.getMonth() + 1) +
    "/" +
    date.getDate() +
    " " +
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}

/* 테마 */

function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY);

  if (theme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    themeBtn.textContent = "🌙";
  }
}

function toggleTheme() {
  const dark = document.body.classList.toggle("dark");

  localStorage.setItem(
    THEME_KEY,
    dark ? "dark" : "light"
  );

  themeBtn.textContent = dark ? "☀️" : "🌙";
}

/* 화면 */

function updateNavigation() {
  if (currentScreen === "home") {
    backBtn.classList.add("hidden");
  } else {
    backBtn.classList.remove("hidden");
  }
}

function navigate(screen, options = {}) {
  stopQuizTimer();

  currentScreen = screen;

  if ("fileId" in options) {
    currentFileId = options.fileId;
  }

  if ("testId" in options) {
    currentTestId = options.testId;
  }

  updateNavigation();
  render();
}

function goBack() {
  if (quizSession) {
    showConfirm(
      "테스트 종료",
      "진행 중인 테스트를 종료할까요?",
      () => {
        const fileId = quizSession.fileId;
        const testId = quizSession.testId;
        const isTotal = testId === "__total__";

        clearQuiz();

        if (isTotal) {
          navigate("file", { fileId });
        } else {
          navigate("wordbook", {
            fileId,
            testId
          });
        }
      }
    );

    return;
  }

  if (currentScreen === "file") {
    navigate("home");
  } else if (currentScreen === "wordbook") {
    navigate("file", {
      fileId: currentFileId
    });
  } else if (currentScreen === "quiz") {
    navigate("wordbook", {
      fileId: currentFileId,
      testId: currentTestId
    });
  } else if (currentScreen === "result") {
    navigate("home");
  } else {
    navigate("home");
  }
}

/* 홈 */

function renderHome() {
  const files = state.files;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">홈</h1>
        <p class="page-description">파일을 선택해서 단어장을 관리하세요.</p>
      </div>

      <button id="addFileBtn" class="primary-btn">
        + 파일 추가
      </button>
    </div>

    ${
      files.length
        ? `
          <div id="fileList" class="list">
            ${files.map(renderFileItem).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            아직 파일이 없습니다.<br>
            파일을 추가해서 단어장을 만들어보세요.
          </div>
        `
    }
  `;

  document
    .getElementById("addFileBtn")
    .addEventListener("click", addFile);

  setupFileEvents();
}

function renderFileItem(file) {
  const wordCount = getAllFileWords(file).length;

  return `
    <div class="list-item" draggable="true" data-file-id="${file.id}">
      <div class="drag-handle">⋮⋮</div>

      <div class="item-main" data-open-file="${file.id}">
        <div class="item-title">
          ${escapeHtml(file.name)}
        </div>

        <div class="item-sub">
          ${file.tests.length}개 단어장 · ${wordCount}개 단어
        </div>
      </div>

      <div class="item-actions">
        <button class="small-btn" data-rename-file="${file.id}">
          수정
        </button>

        <button class="small-btn delete" data-delete-file="${file.id}">
          삭제
        </button>
      </div>
    </div>
  `;
}

function addFile() {
  const name = prompt("파일 이름을 입력하세요.");

  if (name === null) return;

  const trimmed = name.trim();

  if (!trimmed) {
    alert("파일 이름을 입력해주세요.");
    return;
  }

  state.files.push({
    id: createId("file"),
    name: trimmed,
    tests: []
  });

  saveState();
  render();
}

function renameFile(fileId) {
  const file = findFile(fileId);

  if (!file) return;

  const name = prompt(
    "파일 이름을 입력하세요.",
    file.name
  );

  if (name === null) return;

  const trimmed = name.trim();

  if (!trimmed) {
    alert("파일 이름을 입력해주세요.");
    return;
  }

  file.name = trimmed;

  saveState();
  render();
}

function deleteFile(fileId) {
  const file = findFile(fileId);

  if (!file) return;

  showConfirm(
    "파일 삭제",
    `"${file.name}" 파일을 삭제할까요?`,
    () => {
      state.files = state.files.filter(
        item => item.id !== fileId
      );

      saveState();
      render();
    }
  );
}

function setupFileEvents() {
  const list = document.getElementById("fileList");

  if (!list) return;

  let draggedId = null;

  list.querySelectorAll("[data-file-id]").forEach(item => {
    item.addEventListener("dragstart", () => {
      draggedId = item.dataset.fileId;
      item.style.opacity = "0.5";
    });

    item.addEventListener("dragend", () => {
      draggedId = null;
      item.style.opacity = "";
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
    });

    item.addEventListener("drop", event => {
      event.preventDefault();

      const targetId = item.dataset.fileId;

      if (!draggedId || draggedId === targetId) return;

      const fromIndex = state.files.findIndex(
        file => file.id === draggedId
      );

      const toIndex = state.files.findIndex(
        file => file.id === targetId
      );

      if (fromIndex < 0 || toIndex < 0) return;

      const moved = state.files.splice(fromIndex, 1)[0];

      state.files.splice(toIndex, 0, moved);

      saveState();
      render();
    });
  });

  list.querySelectorAll("[data-open-file]").forEach(item => {
    item.addEventListener("click", () => {
      navigate("file", {
        fileId: item.dataset.openFile
      });
    });
  });

  list.querySelectorAll("[data-rename-file]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      renameFile(button.dataset.renameFile);
    });
  });

  list.querySelectorAll("[data-delete-file]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      deleteFile(button.dataset.deleteFile);
    });
  });
}

/* 파일 화면 */

function renderFile() {
  const file = findFile(currentFileId);

  if (!file) {
    navigate("home");
    return;
  }

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          ${escapeHtml(file.name)}
        </h1>

        <p class="page-description">
          단어장을 추가하고 관리하세요.
        </p>
      </div>

      <button id="addTestBtn" class="primary-btn">
        + 단어장 생성
      </button>
    </div>

    ${
      file.tests.length
        ? `
          <div id="testList" class="list">
            ${file.tests.map(renderTestItem).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            아직 단어장이 없습니다.<br>
            <b>+ 단어장 생성</b>을 눌러 만들어보세요.
          </div>
        `
    }

    <div class="card total-test-card">
      <div class="total-test-title">총합 테스트</div>

      <div class="total-test-description">
        ${escapeHtml(file.name)} 파일의 모든 단어장을 합쳐서 테스트합니다.
      </div>

      <div class="total-test-buttons">
        <button id="totalAllBtn" class="test-btn">
          전체 테스트
        </button>

        <button id="totalToMeaningBtn" class="test-btn">
          ${escapeHtml(file.name)} → 뜻
        </button>

        <button id="totalToTitleBtn" class="test-btn">
          뜻 → ${escapeHtml(file.name)}
        </button>

        <button id="totalQuickTestBtn" class="test-btn">
          빠른 테스트
        </button>
      </div>
    </div>
  `;

  document
    .getElementById("addTestBtn")
    .addEventListener("click", addTest);

  document
    .getElementById("totalAllBtn")
    .addEventListener("click", () => {
      startTotalQuiz(file, "all");
    });

  document
    .getElementById("totalToMeaningBtn")
    .addEventListener("click", () => {
      startTotalQuiz(file, "term-to-meaning");
    });

  document
    .getElementById("totalToTitleBtn")
    .addEventListener("click", () => {
      startTotalQuiz(file, "meaning-to-term");
    });

  document
    .getElementById("totalQuickTestBtn")
    .addEventListener("click", () => {
      quickSource = {
        type: "total",
        fileId: file.id
      };

      quickModal.classList.remove("hidden");
    });

  setupTestEvents();
}

function renderTestItem(test) {
  return `
    <div class="list-item" draggable="true" data-test-id="${test.id}">
      <div class="drag-handle">⋮⋮</div>

      <div class="item-main" data-open-test="${test.id}">
        <div class="item-title">
          ${escapeHtml(test.name)}
        </div>

        <div class="item-sub">
          ${test.words.length}개 단어
        </div>
      </div>

      <div class="item-actions">
        <button class="small-btn" data-rename-test="${test.id}">
          수정
        </button>

        <button class="small-btn delete" data-delete-test="${test.id}">
          삭제
        </button>
      </div>
    </div>
  `;
}

function addTest() {
  const file = findFile(currentFileId);

  if (!file) return;

  const name = prompt("단어장 이름을 입력하세요.");

  if (name === null) return;

  const trimmed = name.trim();

  if (!trimmed) {
    alert("단어장 이름을 입력해주세요.");
    return;
  }

  file.tests.push({
    id: createId("test"),
    name: trimmed,
    words: []
  });

  saveState();
  render();
}

function renameTest(testId) {
  const file = findFile(currentFileId);
  const test = findTest(file, testId);

  if (!test) return;

  const name = prompt(
    "단어장 이름을 입력하세요.",
    test.name
  );

  if (name === null) return;

  const trimmed = name.trim();

  if (!trimmed) {
    alert("단어장 이름을 입력해주세요.");
    return;
  }

  test.name = trimmed;

  saveState();
  render();
}

function deleteTest(testId) {
  const file = findFile(currentFileId);
  const test = findTest(file, testId);

  if (!test) return;

  showConfirm(
    "단어장 삭제",
    `"${test.name}" 단어장을 삭제할까요?`,
    () => {
      file.tests = file.tests.filter(
        item => item.id !== testId
      );

      saveState();
      render();
    }
  );
}

function setupTestEvents() {
  const list = document.getElementById("testList");

  if (!list) return;

  let draggedId = null;

  list.querySelectorAll("[data-test-id]").forEach(item => {
    item.addEventListener("dragstart", () => {
      draggedId = item.dataset.testId;
      item.style.opacity = "0.5";
    });

    item.addEventListener("dragend", () => {
      draggedId = null;
      item.style.opacity = "";
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
    });

    item.addEventListener("drop", event => {
      event.preventDefault();

      const targetId = item.dataset.testId;

      if (!draggedId || draggedId === targetId) return;

      const file = findFile(currentFileId);

      if (!file) return;

      const fromIndex = file.tests.findIndex(
        test => test.id === draggedId
      );

      const toIndex = file.tests.findIndex(
        test => test.id === targetId
      );

      if (fromIndex < 0 || toIndex < 0) return;

      const moved = file.tests.splice(fromIndex, 1)[0];

      file.tests.splice(toIndex, 0, moved);

      saveState();
      render();
    });
  });

  list.querySelectorAll("[data-open-test]").forEach(item => {
    item.addEventListener("click", () => {
      navigate("wordbook", {
        fileId: currentFileId,
        testId: item.dataset.openTest
      });
    });
  });

  list.querySelectorAll("[data-rename-test]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      renameTest(button.dataset.renameTest);
    });
  });

  list.querySelectorAll("[data-delete-test]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      deleteTest(button.dataset.deleteTest);
    });
  });
}

/* 단어장 */

function renderWordbook() {
  const file = findFile(currentFileId);
  const test = findTest(file, currentTestId);

  if (!file || !test) {
    navigate("file", {
      fileId: currentFileId
    });

    return;
  }

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          ${escapeHtml(test.name)}
        </h1>

        <p class="page-description">
          예: run:달리다,뛰다/runway:활주로
        </p>
      </div>
    </div>

    <div class="input-area">
      <input
        id="wordInput"
        class="word-input"
        type="text"
        placeholder="단어:뜻,뜻/단어:뜻"
        autocomplete="off"
      >
    </div>

    <div class="test-buttons">
      <button id="allTestBtn" class="test-btn">
        전체 테스트
      </button>

      <button id="termToMeaningBtn" class="test-btn">
        ${escapeHtml(file.name)} → 뜻
      </button>

      <button id="meaningToTermBtn" class="test-btn">
        뜻 → ${escapeHtml(file.name)}
      </button>

      <button id="quickTestBtn" class="test-btn">
        빠른 테스트
      </button>
    </div>

    ${
      test.words.length
        ? `
          <div id="wordList" class="word-list">
            ${test.words.map(renderWordRow).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            아직 단어가 없습니다.<br>
            위 입력창에 단어를 입력해주세요.
          </div>
        `
    }
  `;

  const input = document.getElementById("wordInput");

  input.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    addWordsFromInput(input.value);
    input.value = "";
  });

  document
    .getElementById("allTestBtn")
    .addEventListener("click", () => {
      startQuiz({
        fileId: currentFileId,
        testId: currentTestId,
        mode: "all"
      });
    });

  document
    .getElementById("termToMeaningBtn")
    .addEventListener("click", () => {
      startQuiz({
        fileId: currentFileId,
        testId: currentTestId,
        mode: "term-to-meaning"
      });
    });

  document
    .getElementById("meaningToTermBtn")
    .addEventListener("click", () => {
      startQuiz({
        fileId: currentFileId,
        testId: currentTestId,
        mode: "meaning-to-term"
      });
    });

  document
    .getElementById("quickTestBtn")
    .addEventListener("click", () => {
      quickSource = {
        type: "test",
        fileId: currentFileId,
        testId: currentTestId
      };

      quickModal.classList.remove("hidden");
    });

  setupWordEvents();
}

function renderWordRow(word, index) {
  return `
    <div
      class="word-row"
      draggable="true"
      data-word-index="${index}"
    >
      <div class="drag-handle">⋮⋮</div>

      <div class="word-content">
        <div class="word-term">
          ${escapeHtml(word.term)}
        </div>

        <div class="word-meaning">
          ${word.meanings.map(escapeHtml).join(", ")}
        </div>
      </div>

      <div class="word-actions">
        <button
          class="star-btn"
          data-star-word="${index}"
        >
          ${word.important ? "⭐" : "☆"}
        </button>

        <button
          class="small-btn delete"
          data-delete-word="${index}"
        >
          삭제
        </button>
      </div>
    </div>
  `;
}

function parseWords(input) {
  const parts = input
    .split("/")
    .map(item => item.trim())
    .filter(Boolean);

  const result = [];

  for (const part of parts) {
    const colonIndex = part.indexOf(":");

    if (colonIndex === -1) continue;

    const term = part
      .slice(0, colonIndex)
      .trim();

    const meaningText = part
      .slice(colonIndex + 1)
      .trim();

    if (!term || !meaningText) continue;

    const meanings = meaningText
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);

    if (!meanings.length) continue;

    result.push({
      term,
      meanings
    });
  }

  return result;
}

function addWordsFromInput(input) {
  const file = findFile(currentFileId);
  const test = findTest(file, currentTestId);

  if (!file || !test) return;

  const words = parseWords(input);

  if (!words.length) {
    alert(
      "입력 형식을 확인해주세요.\n예: run:달리다,뛰다/runway:활주로"
    );

    return;
  }

  words.forEach(newWord => {
    const exists = test.words.some(word => {
      if (word.term !== newWord.term) return false;

      if (
        word.meanings.length !==
        newWord.meanings.length
      ) {
        return false;
      }

      return word.meanings.every(
        (meaning, index) =>
          meaning === newWord.meanings[index]
      );
    });

    if (!exists) {
      test.words.push({
        id: createId("word"),
        term: newWord.term,
        meanings: newWord.meanings,
        important: false,
        correct: 0,
        wrong: 0,
        lastWrong: false
      });
    }
  });

  saveState();
  render();
}

function toggleImportant(index) {
  const file = findFile(currentFileId);
  const test = findTest(file, currentTestId);

  if (!test || !test.words[index]) return;

  test.words[index].important =
    !test.words[index].important;

  saveState();
  render();
}

function deleteWord(index) {
  const file = findFile(currentFileId);
  const test = findTest(file, currentTestId);

  if (!test || !test.words[index]) return;

  showConfirm(
    "단어 삭제",
    `"${test.words[index].term}" 단어를 삭제할까요?`,
    () => {
      test.words.splice(index, 1);
      saveState();
      render();
    }
  );
}

function setupWordEvents() {
  const list = document.getElementById("wordList");

  if (!list) return;

  let draggedIndex = null;

  list.querySelectorAll("[data-word-index]").forEach(item => {
    item.addEventListener("dragstart", () => {
      draggedIndex = Number(item.dataset.wordIndex);
      item.style.opacity = "0.5";
    });

    item.addEventListener("dragend", () => {
      draggedIndex = null;
      item.style.opacity = "";
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
    });

    item.addEventListener("drop", event => {
      event.preventDefault();

      const targetIndex =
        Number(item.dataset.wordIndex);

      if (
        draggedIndex === null ||
        draggedIndex === targetIndex
      ) {
        return;
      }

      const file = findFile(currentFileId);
      const test = findTest(file, currentTestId);

      if (!test) return;

      const moved = test.words.splice(
        draggedIndex,
        1
      )[0];

      test.words.splice(targetIndex, 0, moved);

      saveState();
      render();
    });
  });

  list.querySelectorAll("[data-star-word]").forEach(button => {
    button.addEventListener("click", () => {
      toggleImportant(
        Number(button.dataset.starWord)
      );
    });
  });

  list.querySelectorAll("[data-delete-word]").forEach(button => {
    button.addEventListener("click", () => {
      deleteWord(
        Number(button.dataset.deleteWord)
      );
    });
  });
}

/* 퀴즈 */

function buildQuizWords(words, mode) {
  const result = [];

  words.forEach(word => {
    if (mode === "meaning-to-term") {
      word.meanings.forEach(meaning => {
        result.push({
          id: word.id,
          sourceTestId: word.sourceTestId || null,
          question: meaning,
          answer: word.term,
          acceptedAnswers: [word.term]
        });
      });
    } else {
      result.push({
        id: word.id,
        sourceTestId: word.sourceTestId || null,
        question: word.term,
        answer: word.meanings.join(", "),
        acceptedAnswers: word.meanings
      });
    }
  });

  return shuffle(result);
}

function startQuiz({
  fileId,
  testId,
  mode,
  wordsOverride = null
}) {
  const file = findFile(fileId);

  if (!file) return;

  let words;

  if (testId === "__total__") {
    words =
      wordsOverride ||
      getAllFileWords(file);
  } else {
    const test = findTest(file, testId);

    if (!test) return;

    words = wordsOverride || test.words;
  }

  if (!words.length) {
    alert("테스트할 단어가 없습니다.");
    return;
  }

  const quizWords =
    buildQuizWords(words, mode);

  currentFileId = fileId;
  currentTestId = testId;

  quizSession = {
    fileId,
    testId,
    mode,
    words: quizWords,
    index: 0,
    correct: 0,
    wrong: 0,
    answered: false
  };

  navigate("quiz", {
    fileId,
    testId
  });
}

function startTotalQuiz(file, mode) {
  const words = getAllFileWords(file);

  if (!words.length) {
    alert("테스트할 단어가 없습니다.");
    return;
  }

  startQuiz({
    fileId: file.id,
    testId: "__total__",
    mode,
    wordsOverride: words
  });
}

function renderQuiz() {
  if (!quizSession) {
    navigate("home");
    return;
  }

  mainContent.innerHTML = `
    <div class="quiz-wrap">
      <div class="quiz-top">
        <div class="quiz-progress">
          ${quizSession.index + 1}
          /
          ${quizSession.words.length}
        </div>

        <div>
          ⏱️ <span id="timerText">10</span>초
        </div>
      </div>

      <div class="quiz-card">
        <div id="question" class="question"></div>

        <input
          id="answerInput"
          class="answer-input"
          type="text"
          placeholder="정답을 입력하세요"
          autocomplete="off"
        >

        <div id="feedback" class="feedback"></div>

        <button
          id="nextBtn"
          class="primary-btn quiz-next hidden"
        >
          다음 문제
        </button>
      </div>
    </div>
  `;

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const current =
    quizSession.words[quizSession.index];

  if (!current) {
    finishQuiz();
    return;
  }

  const question =
    document.getElementById("question");

  const input =
    document.getElementById("answerInput");

  const feedback =
    document.getElementById("feedback");

  const nextBtn =
    document.getElementById("nextBtn");

  question.textContent = current.question;

  input.value = "";
  input.disabled = false;

  feedback.textContent = "";
  feedback.className = "feedback";

  nextBtn.classList.add("hidden");

  quizSession.answered = false;

  input.focus();

  startQuizTimer();

  input.onkeydown = event => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (!quizSession.answered) {
      checkAnswer(input.value);
    } else {
      moveToNextQuestion();
    }
  };

  nextBtn.onclick = () => {
    moveToNextQuestion();
  };
}

function startQuizTimer() {
  stopQuizTimer();

  quizTimeLeft = 10;

  updateTimer();

  quizTimer = setInterval(() => {
    quizTimeLeft--;

    updateTimer();

    if (quizTimeLeft <= 0) {
      stopQuizTimer();

      if (!quizSession.answered) {
        checkAnswer("");
      }
    }
  }, 1000);
}

function stopQuizTimer() {
  if (quizTimer !== null) {
    clearInterval(quizTimer);
    quizTimer = null;
  }
}

function updateTimer() {
  const timer =
    document.getElementById("timerText");

  if (timer) {
    timer.textContent = quizTimeLeft;
  }
}

function findOriginalWord(item) {
  const file = findFile(quizSession.fileId);

  if (!file) return null;

  if (quizSession.testId === "__total__") {
    const test = findTest(
      file,
      item.sourceTestId
    );

    if (!test) return null;

    return test.words.find(
      word => word.id === item.id
    );
  }

  const test = findTest(
    file,
    quizSession.testId
  );

  if (!test) return null;

  return test.words.find(
    word => word.id === item.id
  );
}

function checkAnswer(answer) {
  if (!quizSession || quizSession.answered) {
    return;
  }

  stopQuizTimer();

  const current =
    quizSession.words[quizSession.index];

  const correct =
    isAnswerCorrect(
      answer,
      current.acceptedAnswers
    );

  quizSession.answered = true;

  const original =
    findOriginalWord(current);

  if (correct) {
    quizSession.correct++;

    if (original) {
      original.correct++;
      original.lastWrong = false;
    }
  } else {
    quizSession.wrong++;

    if (original) {
      original.wrong++;
      original.lastWrong = true;
    }
  }

  saveState();

  const input =
    document.getElementById("answerInput");

  const feedback =
    document.getElementById("feedback");

  const nextBtn =
    document.getElementById("nextBtn");

  input.disabled = true;

  if (correct) {
    feedback.textContent = "정답입니다!";
    feedback.className =
      "feedback correct";
  } else {
    feedback.textContent =
      "오답입니다. 정답: " +
      current.answer;

    feedback.className =
      "feedback wrong";
  }

  nextBtn.textContent =
    quizSession.index ===
    quizSession.words.length - 1
      ? "결과 보기"
      : "다음 문제";

  nextBtn.classList.remove("hidden");
}

function moveToNextQuestion() {
  quizSession.index++;

  if (
    quizSession.index >=
    quizSession.words.length
  ) {
    finishQuiz();
    return;
  }

  renderQuizQuestion();
}

function finishQuiz() {
  stopQuizTimer();

  const file =
    findFile(quizSession.fileId);

  state.history.push({
    id: createId("history"),
    date: new Date().toISOString(),
    fileName: file?.name || "",
    testName:
      quizSession.testId === "__total__"
        ? "총합 테스트"
        : findTest(
            file,
            quizSession.testId
          )?.name || "",
    total: quizSession.words.length,
    correct: quizSession.correct,
    wrong: quizSession.wrong
  });

  saveState();

  currentScreen = "result";

  updateNavigation();
  render();
}

/* 결과 */

function renderResult() {
  if (!quizSession) {
    navigate("home");
    return;
  }

  const total = quizSession.words.length;
  const correct = quizSession.correct;
  const wrong = quizSession.wrong;

  const percent = total
    ? Math.round((correct / total) * 100)
    : 0;

  mainContent.innerHTML = `
    <div class="result-card">
      <h2>테스트 결과</h2>

      <div class="result-score">
        ${percent}%
      </div>

      <div class="result-detail">
        ${total}문제 중 ${correct}개 정답 · ${wrong}개 오답
      </div>

      <div class="result-actions">
        <button
          id="resultHomeBtn"
          class="primary-btn"
        >
          🏠 홈으로
        </button>

        <button
          id="resultReturnBtn"
          class="secondary-btn"
        >
          📚 ${
            quizSession.testId === "__total__"
              ? "현재 파일로 돌아가기"
              : "현재 단어장으로 돌아가기"
          }
        </button>

        <button
          id="retryWrongBtn"
          class="secondary-btn"
        >
          ❌ 틀린 문제 다시 풀기
        </button>
      </div>
    </div>
  `;

  document
    .getElementById("resultHomeBtn")
    .addEventListener("click", () => {
      clearQuiz();
      navigate("home");
    });

  document
    .getElementById("resultReturnBtn")
    .addEventListener("click", () => {
      const fileId =
        quizSession.fileId;

      const testId =
        quizSession.testId;

      clearQuiz();

      if (testId === "__total__") {
        navigate("file", {
          fileId
        });
      } else {
        navigate("wordbook", {
          fileId,
          testId
        });
      }
    });

  document
    .getElementById("retryWrongBtn")
    .addEventListener("click", retryWrong);
}

function retryWrong() {
  if (!quizSession) return;

  const wrongWords =
    quizSession.words
      .map(item => findOriginalWord(item))
      .filter(word => word?.lastWrong);

  if (!wrongWords.length) {
    alert("틀린 문제가 없습니다.");
    return;
  }

  const fileId =
    quizSession.fileId;

  const testId =
    quizSession.testId;

  const mode =
    quizSession.mode;

  clearQuiz();

  startQuiz({
    fileId,
    testId,
    mode,
    wordsOverride: shuffle(wrongWords)
  });
}

function clearQuiz() {
  stopQuizTimer();
  quizSession = null;
}

/* 통계 */

function renderStats() {
  const histories =
    [...state.history].sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );

  const totalTests =
    histories.length;

  const totalQuestions =
    histories.reduce(
      (sum, item) =>
        sum + item.total,
      0
    );

  const totalCorrect =
    histories.reduce(
      (sum, item) =>
        sum + item.correct,
      0
    );

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">통계</h1>
        <p class="page-description">
          테스트 기록을 확인하세요.
        </p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">총 테스트</div>
        <div class="stat-value">${totalTests}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">총 문제</div>
        <div class="stat-value">${totalQuestions}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">정답 수</div>
        <div class="stat-value">${totalCorrect}</div>
      </div>
    </div>

    ${
      histories.length
        ? renderHistory(histories)
        : `
          <div class="empty-state">
            아직 테스트 기록이 없습니다.
          </div>
        `
    }
  `;
}

function renderHistory(histories) {
  const now = new Date();

  const currentYear =
    now.getFullYear();

  const currentMonth =
    now.getMonth() + 1;

  const currentMonthItems = [];

  const currentYearMonths = {};

  const previousYears = {};

  histories.forEach(history => {
    const date = new Date(history.date);

    const year =
      date.getFullYear();

    const month =
      date.getMonth() + 1;

    if (
      year === currentYear &&
      month === currentMonth
    ) {
      currentMonthItems.push(history);
      return;
    }

    if (year === currentYear) {
      if (!currentYearMonths[month]) {
        currentYearMonths[month] = [];
      }

      currentYearMonths[month].push(history);

      return;
    }

    if (!previousYears[year]) {
      previousYears[year] = {};
    }

    if (!previousYears[year][month]) {
      previousYears[year][month] = [];
    }

    previousYears[year][month].push(history);
  });

  let html = "";

  if (currentMonthItems.length) {
    html += `
      <div class="history-group">
        ${currentMonthItems
          .map(renderHistoryItem)
          .join("")}
      </div>
    `;
  }

  Object.keys(currentYearMonths)
    .map(Number)
    .sort((a, b) => b - a)
    .forEach(month => {
      html += `
        <div class="history-group">
          <div class="history-month">
            ${month}월
          </div>

          ${currentYearMonths[month]
            .map(renderHistoryItem)
            .join("")}
        </div>
      `;
    });

  Object.keys(previousYears)
    .map(Number)
    .sort((a, b) => b - a)
    .forEach(year => {
      html += `
        <div class="history-group">
          <div class="history-year">
            ${year}년
          </div>
      `;

      Object.keys(previousYears[year])
        .map(Number)
        .sort((a, b) => b - a)
        .forEach(month => {
          html += `
            <div class="history-month">
              ${month}월
            </div>

            ${previousYears[year][month]
              .map(renderHistoryItem)
              .join("")}
          `;
        });

      html += `
        </div>
      `;
    });

  return html;
}

function renderHistoryItem(history) {
  const percent =
    history.total
      ? Math.round(
          (history.correct /
            history.total) *
            100
        )
      : 0;

  return `
    <div class="history-item">
      <div class="history-main">
        <div class="history-name">
          ${escapeHtml(history.fileName)}
          ·
          ${escapeHtml(history.testName)}
        </div>

        <div class="history-sub">
          ${formatDateTime(history.date)}
        </div>
      </div>

      <div>
        ${history.correct}/${history.total}
        (${percent}%)
      </div>
    </div>
  `;
}

/* 설정 */

function renderSettings() {
  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">설정</h1>
        <p class="page-description">
          앱 데이터를 관리하세요.
        </p>
      </div>
    </div>

    <div class="settings-list">
      <div class="settings-item">
        <div class="settings-title">
          데이터 내보내기
        </div>

        <div class="settings-description">
          현재 단어장과 통계 데이터를 저장합니다.
        </div>

        <button
          id="exportBtn"
          class="secondary-btn"
        >
          데이터 내보내기
        </button>
      </div>

      <div class="settings-item">
        <div class="settings-title">
          데이터 가져오기
        </div>

        <div class="settings-description">
          저장한 데이터를 불러옵니다.
        </div>

        <input
          id="importInput"
          type="file"
          accept=".json,application/json"
        >
      </div>

      <div class="settings-item">
        <div class="settings-title">
          데이터 초기화
        </div>

        <div class="settings-description">
          모든 데이터를 삭제합니다.
        </div>

        <button
          id="resetBtn"
          class="danger-btn"
        >
          전체 데이터 초기화
        </button>
      </div>
    </div>
  `;

  document
    .getElementById("exportBtn")
    .addEventListener(
      "click",
      exportData
    );

  document
    .getElementById("importInput")
    .addEventListener(
      "change",
      importData
    );

  document
    .getElementById("resetBtn")
    .addEventListener(
      "click",
      resetData
    );
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
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "단어암기장.json";

  link.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const file =
    event.target.files?.[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = () => {
    try {
      const imported =
        JSON.parse(reader.result);

      if (
        !imported ||
        !Array.isArray(imported.files) ||
        !Array.isArray(imported.history)
      ) {
        throw new Error();
      }

      showConfirm(
        "데이터 가져오기",
        "현재 데이터를 가져온 데이터로 교체할까요?",
        () => {
          state = {
            files: imported.files,
            history: imported.history
          };

          saveState();
          navigate("home");
        }
      );
    } catch {
      alert(
        "올바른 데이터 파일이 아닙니다."
      );
    }
  };

  reader.readAsText(file);
}

function resetData() {
  showConfirm(
    "전체 데이터 초기화",
    "모든 데이터를 삭제할까요?",
    () => {
      state = defaultState();
      saveState();
      clearQuiz();
      navigate("home");
    }
  );
}

/* 모달 */

function showConfirm(
  title,
  message,
  callback
) {
  confirmTitle.textContent =
    title;

  confirmMessage.textContent =
    message;

  confirmCallback = callback;

  confirmModal.classList.remove(
    "hidden"
  );
}

function closeConfirm() {
  confirmModal.classList.add(
    "hidden"
  );

  confirmCallback = null;
}

function closeQuick() {
  quickModal.classList.add(
    "hidden"
  );

  quickSource = null;
}

function startQuickTest(type) {
  closeQuick();

  if (!quickSource) return;

  const file =
    findFile(quickSource.fileId);

  if (!file) return;

  let words = [];
  let testId = "__total__";

  if (quickSource.type === "total") {
    words = getAllFileWords(file);
  } else {
    const test =
      findTest(
        file,
        quickSource.testId
      );

    if (!test) return;

    testId = test.id;
    words = test.words;
  }

  if (type === "important") {
    words = words.filter(
      word => word.important
    );
  }

  if (type === "wrong") {
    words = words.filter(
      word =>
        word.wrong > 0 ||
        word.lastWrong
    );
  }

  if (!words.length) {
    alert(
      type === "important"
        ? "중요 단어가 없습니다."
        : "틀린 단어가 없습니다."
    );

    return;
  }

  startQuiz({
    fileId: file.id,
    testId,
    mode: "all",
    wordsOverride: shuffle(words)
  });
}

closeQuickModal.addEventListener(
  "click",
  closeQuick
);

importantQuickBtn.addEventListener(
  "click",
  () => startQuickTest("important")
);

wrongQuickBtn.addEventListener(
  "click",
  () => startQuickTest("wrong")
);

quickModal.addEventListener(
  "click",
  event => {
    if (event.target === quickModal) {
      closeQuick();
    }
  }
);

confirmCancelBtn.addEventListener(
  "click",
  closeConfirm
);

confirmOkBtn.addEventListener(
  "click",
  () => {
    const callback = confirmCallback;

    closeConfirm();

    if (callback) {
      callback();
    }
  }
);

confirmModal.addEventListener(
  "click",
  event => {
    if (event.target === confirmModal) {
      closeConfirm();
    }
  }
);

/* 상단 메뉴 */

backBtn.addEventListener(
  "click",
  goBack
);

themeBtn.addEventListener(
  "click",
  toggleTheme
);

homeBtn.addEventListener(
  "click",
  () => {
    if (quizSession) {
      showConfirm(
        "테스트 종료",
        "진행 중인 테스트를 종료할까요?",
        () => {
          clearQuiz();
          navigate("home");
        }
      );

      return;
    }

    navigate("home");
  }
);

statsBtn.addEventListener(
  "click",
  () => {
    if (quizSession) {
      showConfirm(
        "테스트 종료",
        "진행 중인 테스트를 종료하고 통계로 이동할까요?",
        () => {
          clearQuiz();
          navigate("stats");
        }
      );

      return;
    }

    navigate("stats");
  }
);

settingsBtn.addEventListener(
  "click",
  () => {
    if (quizSession) {
      showConfirm(
        "테스트 종료",
        "진행 중인 테스트를 종료하고 설정으로 이동할까요?",
        () => {
          clearQuiz();
          navigate("settings");
        }
      );

      return;
    }

    navigate("settings");
  }
);

/* 렌더링 */

function render() {
  updateNavigation();

  if (currentScreen === "home") {
    renderHome();
    return;
  }

  if (currentScreen === "file") {
    renderFile();
    return;
  }

  if (currentScreen === "wordbook") {
    renderWordbook();
    return;
  }

  if (currentScreen === "quiz") {
    renderQuiz();
    return;
  }

  if (currentScreen === "result") {
    renderResult();
    return;
  }

  if (currentScreen === "stats") {
    renderStats();
    return;
  }

  if (currentScreen === "settings") {
    renderSettings();
    return;
  }

  navigate("home");
}

/* 시작 */

loadTheme();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("sw.js")
        .catch(error => {
          console.error(
            "Service Worker 오류:",
            error
          );
        });
    }
  );
}
