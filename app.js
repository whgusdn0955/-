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
let inputCallback = null;

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

const inputModal = document.getElementById("inputModal");
const inputModalTitle = document.getElementById("inputModalTitle");
const inputModalField = document.getElementById("inputModalField");
const inputModalClose = document.getElementById("inputModalClose");
const inputModalCancel = document.getElementById("inputModalCancel");
const inputModalConfirm = document.getElementById("inputModalConfirm");

const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");

/* ================================
   데이터
================================ */

function defaultState() {
  return {
    files: [],
    history: []
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return defaultState();
    }

    const parsed = JSON.parse(saved);

    return {
      files: Array.isArray(parsed.files)
        ? parsed.files
        : [],
      history: Array.isArray(parsed.history)
        ? parsed.history
        : []
    };
  } catch (error) {
    console.error(error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
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

function findFile(fileId) {
  return state.files.find(
    file => file.id === fileId
  );
}

function findTest(file, testId) {
  if (!file) return null;

  return file.tests.find(
    test => test.id === testId
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

function shuffle(array) {
  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

/* ================================
   중요 단어
================================ */

function getWrongRate(word) {
  const correct = Number(word.correct || 0);
  const wrong = Number(word.wrong || 0);
  const total = correct + wrong;

  if (total === 0) {
    return 0;
  }

  return wrong / total;
}

function updateImportantStatus(word) {
  const correct = Number(word.correct || 0);
  const wrong = Number(word.wrong || 0);
  const total = correct + wrong;

  if (total === 0) {
    return;
  }

  if (wrong / total > 0.7) {
    word.important = true;
  }
}

function updateAllImportantStatuses() {
  state.files.forEach(file => {
    file.tests.forEach(test => {
      test.words.forEach(word => {
        if (
          typeof word.correct !== "number"
        ) {
          word.correct = 0;
        }

        if (
          typeof word.wrong !== "number"
        ) {
          word.wrong = 0;
        }

        if (
          typeof word.important !== "boolean"
        ) {
          word.important = false;
        }

        if (
          typeof word.lastWrong !== "boolean"
        ) {
          word.lastWrong = false;
        }

        updateImportantStatus(word);
      });
    });
  });
}

function sortWordsByImportance(test) {
  test.words.sort((a, b) => {
    if (
      Boolean(a.important) ===
      Boolean(b.important)
    ) {
      return 0;
    }

    return a.important ? -1 : 1;
  });
}

function sortAllTestsByImportance() {
  state.files.forEach(file => {
    file.tests.forEach(test => {
      sortWordsByImportance(test);
    });
  });
}

/* ================================
   공통
================================ */

function isEnglishLike(text) {
  return /^[A-Za-z0-9\s.,!?'"()\-_/]+$/.test(
    text
  );
}

function isAnswerCorrect(
  userAnswer,
  acceptedAnswers
) {
  const input = String(
    userAnswer || ""
  ).trim();

  if (!input) {
    return false;
  }

  return acceptedAnswers.some(answer => {
    const expected = String(
      answer || ""
    ).trim();

    if (
      isEnglishLike(input) &&
      isEnglishLike(expected)
    ) {
      return (
        input.toLowerCase() ===
        expected.toLowerCase()
      );
    }

    return input === expected;
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

/* ================================
   테마
================================ */

function loadTheme() {
  const theme =
    localStorage.getItem(THEME_KEY);

  if (theme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    themeBtn.textContent = "🌙";
  }
}

function toggleTheme() {
  const isDark =
    document.body.classList.toggle(
      "dark"
    );

  localStorage.setItem(
    THEME_KEY,
    isDark ? "dark" : "light"
  );

  themeBtn.textContent = isDark
    ? "☀️"
    : "🌙";
}

/* ================================
   입력 모달
================================ */

function showInputModal(
  title,
  placeholder,
  defaultValue,
  callback
) {
  inputModalTitle.textContent =
    title;

  inputModalField.placeholder =
    placeholder || "";

  inputModalField.value =
    defaultValue || "";

  inputCallback = callback;

  inputModal.classList.remove(
    "hidden"
  );

  setTimeout(() => {
    inputModalField.focus();
    inputModalField.select();
  }, 0);
}

function closeInputModal() {
  inputModal.classList.add(
    "hidden"
  );

  inputModalField.value = "";
  inputCallback = null;
}

function submitInputModal() {
  if (!inputCallback) {
    return;
  }

  const value =
    inputModalField.value.trim();

  if (!value) {
    alert("내용을 입력해주세요.");
    return;
  }

  const callback = inputCallback;

  closeInputModal();

  callback(value);
}

inputModalConfirm.addEventListener(
  "click",
  submitInputModal
);

inputModalCancel.addEventListener(
  "click",
  closeInputModal
);

inputModalClose.addEventListener(
  "click",
  closeInputModal
);

inputModalField.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitInputModal();
    }
  }
);

inputModal.addEventListener(
  "click",
  event => {
    if (event.target === inputModal) {
      closeInputModal();
    }
  }
);

/* ================================
   확인 모달
================================ */

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

confirmCancelBtn.addEventListener(
  "click",
  closeConfirm
);

confirmOkBtn.addEventListener(
  "click",
  () => {
    const callback =
      confirmCallback;

    closeConfirm();

    if (callback) {
      callback();
    }
  }
);

confirmModal.addEventListener(
  "click",
  event => {
    if (
      event.target ===
      confirmModal
    ) {
      closeConfirm();
    }
  }
);

/* ================================
   화면 이동
================================ */

function updateNavigation() {
  if (currentScreen === "home") {
    backBtn.classList.add("hidden");
  } else {
    backBtn.classList.remove("hidden");
  }
}

function navigate(
  screen,
  options = {}
) {
  stopQuizTimer();

  currentScreen = screen;

  if ("fileId" in options) {
    currentFileId =
      options.fileId;
  }

  if ("testId" in options) {
    currentTestId =
      options.testId;
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
        const fileId =
          quizSession.fileId;

        const testId =
          quizSession.testId;

        clearQuiz();

        if (
          testId ===
          "__total__"
        ) {
          navigate("file", {
            fileId
          });
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
    return;
  }

  if (
    currentScreen === "wordbook"
  ) {
    navigate("file", {
      fileId: currentFileId
    });
    return;
  }

  if (
    currentScreen === "quiz"
  ) {
    navigate("wordbook", {
      fileId: currentFileId,
      testId: currentTestId
    });
    return;
  }

  navigate("home");
}

/* ================================
   홈
================================ */

function renderHome() {
  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          🏠 홈
        </h1>

        <p class="page-description">
          파일을 선택해서 단어장을 관리하세요.
        </p>
      </div>

      <button
        id="addFileBtn"
        class="primary-btn"
      >
        ＋ 파일 추가
      </button>
    </div>

    ${
      state.files.length
        ? `
          <div
            id="fileList"
            class="list"
          >
            ${state.files
              .map(renderFileItem)
              .join("")}
          </div>
        `
        : `
          <div class="empty-state">
            📚 아직 파일이 없습니다.<br>
            파일을 추가해서 단어장을 만들어보세요.
          </div>
        `
    }
  `;

  document
    .getElementById("addFileBtn")
    .addEventListener(
      "click",
      addFile
    );

  setupFileEvents();
}

function renderFileItem(file) {
  const wordCount =
    file.tests.reduce(
      (sum, test) =>
        sum + test.words.length,
      0
    );

  return `
    <div
      class="list-item"
      draggable="true"
      data-file-id="${file.id}"
    >
      <div class="drag-handle">
        ⋮⋮
      </div>

      <div
        class="item-main"
        data-open-file="${file.id}"
      >
        <div class="item-title">
          📁 ${escapeHtml(file.name)}
        </div>

        <div class="item-sub">
          ${file.tests.length}개 단어장
          · ${wordCount}개 단어
        </div>
      </div>

      <div class="item-actions">
        <button
          class="small-btn"
          data-rename-file="${file.id}"
        >
          수정
        </button>

        <button
          class="small-btn delete"
          data-delete-file="${file.id}"
        >
          삭제
        </button>
      </div>
    </div>
  `;
}

function addFile() {
  showInputModal(
    "📁 파일 추가",
    "파일 이름",
    "",
    name => {
      state.files.push({
        id: createId("file"),
        name,
        tests: []
      });

      saveState();
      render();
    }
  );
}

function renameFile(fileId) {
  const file =
    findFile(fileId);

  if (!file) {
    return;
  }

  showInputModal(
    "✏️ 파일 이름 변경",
    "파일 이름",
    file.name,
    name => {
      file.name = name;

      saveState();
      render();
    }
  );
}

function deleteFile(fileId) {
  const file =
    findFile(fileId);

  if (!file) {
    return;
  }

  showConfirm(
    "📁 파일 삭제",
    `"${file.name}" 파일을 삭제할까요?`,
    () => {
      state.files =
        state.files.filter(
          item =>
            item.id !== fileId
        );

      saveState();
      render();
    }
  );
}

function setupFileEvents() {
  const list =
    document.getElementById(
      "fileList"
    );

  if (!list) {
    return;
  }

  let draggedId = null;

  list
    .querySelectorAll(
      "[data-file-id]"
    )
    .forEach(item => {
      item.addEventListener(
        "dragstart",
        () => {
          draggedId =
            item.dataset.fileId;

          item.style.opacity =
            "0.5";
        }
      );

      item.addEventListener(
        "dragend",
        () => {
          draggedId = null;
          item.style.opacity = "";
        }
      );

      item.addEventListener(
        "dragover",
        event => {
          event.preventDefault();
        }
      );

      item.addEventListener(
        "drop",
        event => {
          event.preventDefault();

          const targetId =
            item.dataset.fileId;

          if (
            !draggedId ||
            draggedId === targetId
          ) {
            return;
          }

          const fromIndex =
            state.files.findIndex(
              file =>
                file.id ===
                draggedId
            );

          const toIndex =
            state.files.findIndex(
              file =>
                file.id ===
                targetId
            );

          if (
            fromIndex < 0 ||
            toIndex < 0
          ) {
            return;
          }

          const moved =
            state.files.splice(
              fromIndex,
              1
            )[0];

          state.files.splice(
            toIndex,
            0,
            moved
          );

          saveState();
          render();
        }
      );
    });

  list
    .querySelectorAll(
      "[data-open-file]"
    )
    .forEach(item => {
      item.addEventListener(
        "click",
        () => {
          navigate("file", {
            fileId:
              item.dataset.openFile
          });
        }
      );
    });

  list
    .querySelectorAll(
      "[data-rename-file]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          renameFile(
            button.dataset
              .renameFile
          );
        }
      );
    });

  list
    .querySelectorAll(
      "[data-delete-file]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          deleteFile(
            button.dataset
              .deleteFile
          );
        }
      );
    });
}

/* ================================
   파일
================================ */

function renderFile() {
  const file =
    findFile(currentFileId);

  if (!file) {
    navigate("home");
    return;
  }

  file.tests.forEach(
    sortWordsByImportance
  );

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          📁 ${escapeHtml(file.name)}
        </h1>

        <p class="page-description">
          단어장을 추가하고 관리하세요.
        </p>
      </div>

      <button
        id="addTestBtn"
        class="primary-btn"
      >
        ＋ 단어장 생성
      </button>
    </div>

    ${
      file.tests.length
        ? `
          <div
            id="testList"
            class="list"
          >
            ${file.tests
              .map(renderTestItem)
              .join("")}
          </div>
        `
        : `
          <div class="empty-state">
            📚 아직 단어장이 없습니다.<br>
            <b>＋ 단어장 생성</b>을 눌러 만들어보세요.
          </div>
        `
    }

    <div class="card">
      <div style="padding: 18px;">
        <div class="item-title">
          🎯 총합 테스트
        </div>

        <div class="item-sub">
          ${escapeHtml(file.name)}
          파일의 모든 단어장을 합쳐 테스트합니다.
        </div>

        <div class="test-buttons" style="margin-top: 15px;">
          <button
            id="totalAllBtn"
            class="test-btn"
          >
            🔀 전체 테스트
          </button>

          <button
            id="totalToMeaningBtn"
            class="test-btn"
          >
            📘 ${escapeHtml(file.name)} → 뜻
          </button>

          <button
            id="totalToTitleBtn"
            class="test-btn"
          >
            📖 뜻 → ${escapeHtml(file.name)}
          </button>

          <button
            id="totalQuickTestBtn"
            class="test-btn"
          >
            ⚡ 빠른 테스트
          </button>
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("addTestBtn")
    .addEventListener(
      "click",
      addTest
    );

  document
    .getElementById(
      "totalAllBtn"
    )
    .addEventListener(
      "click",
      () => {
        startTotalQuiz(
          file,
          "mixed"
        );
      }
    );

  document
    .getElementById(
      "totalToMeaningBtn"
    )
    .addEventListener(
      "click",
      () => {
        startTotalQuiz(
          file,
          "term-to-meaning"
        );
      }
    );

  document
    .getElementById(
      "totalToTitleBtn"
    )
    .addEventListener(
      "click",
      () => {
        startTotalQuiz(
          file,
          "meaning-to-term"
        );
      }
    );

  document
    .getElementById(
      "totalQuickTestBtn"
    )
    .addEventListener(
      "click",
      () => {
        quickSource = {
          type: "total",
          fileId: file.id
        };

        quickModal.classList.remove(
          "hidden"
        );
      }
    );

  setupTestEvents();
}

function renderTestItem(test) {
  return `
    <div
      class="list-item"
      draggable="true"
      data-test-id="${test.id}"
    >
      <div class="drag-handle">
        ⋮⋮
      </div>

      <div
        class="item-main"
        data-open-test="${test.id}"
      >
        <div class="item-title">
          📖 ${escapeHtml(test.name)}
        </div>

        <div class="item-sub">
          ${test.words.length}개 단어
        </div>
      </div>

      <div class="item-actions">
        <button
          class="small-btn"
          data-rename-test="${test.id}"
        >
          수정
        </button>

        <button
          class="small-btn delete"
          data-delete-test="${test.id}"
        >
          삭제
        </button>
      </div>
    </div>
  `;
}

function addTest() {
  const file =
    findFile(currentFileId);

  if (!file) {
    return;
  }

  showInputModal(
    "📖 단어장 생성",
    "단어장 이름",
    "",
    name => {
      file.tests.push({
        id: createId("test"),
        name,
        words: []
      });

      saveState();
      render();
    }
  );
}

function renameTest(testId) {
  const file =
    findFile(currentFileId);

  const test =
    findTest(
      file,
      testId
    );

  if (!test) {
    return;
  }

  showInputModal(
    "✏️ 단어장 이름 변경",
    "단어장 이름",
    test.name,
    name => {
      test.name = name;

      saveState();
      render();
    }
  );
}

function deleteTest(testId) {
  const file =
    findFile(currentFileId);

  const test =
    findTest(
      file,
      testId
    );

  if (!test) {
    return;
  }

  showConfirm(
    "📖 단어장 삭제",
    `"${test.name}" 단어장을 삭제할까요?`,
    () => {
      file.tests =
        file.tests.filter(
          item =>
            item.id !== testId
        );

      saveState();
      render();
    }
  );
}

function setupTestEvents() {
  const list =
    document.getElementById(
      "testList"
    );

  if (!list) {
    return;
  }

  let draggedId = null;

  list
    .querySelectorAll(
      "[data-test-id]"
    )
    .forEach(item => {
      item.addEventListener(
        "dragstart",
        () => {
          draggedId =
            item.dataset.testId;

          item.style.opacity =
            "0.5";
        }
      );

      item.addEventListener(
        "dragend",
        () => {
          draggedId = null;
          item.style.opacity = "";
        }
      );

      item.addEventListener(
        "dragover",
        event => {
          event.preventDefault();
        }
      );

      item.addEventListener(
        "drop",
        event => {
          event.preventDefault();

          const targetId =
            item.dataset.testId;

          if (
            !draggedId ||
            draggedId === targetId
          ) {
            return;
          }

          const file =
            findFile(
              currentFileId
            );

          if (!file) {
            return;
          }

          const fromIndex =
            file.tests.findIndex(
              test =>
                test.id ===
                draggedId
            );

          const toIndex =
            file.tests.findIndex(
              test =>
                test.id ===
                targetId
            );

          if (
            fromIndex < 0 ||
            toIndex < 0
          ) {
            return;
          }

          const moved =
            file.tests.splice(
              fromIndex,
              1
            )[0];

          file.tests.splice(
            toIndex,
            0,
            moved
          );

          saveState();
          render();
        }
      );
    });

  list
    .querySelectorAll(
      "[data-open-test]"
    )
    .forEach(item => {
      item.addEventListener(
        "click",
        () => {
          navigate(
            "wordbook",
            {
              fileId:
                currentFileId,
              testId:
                item.dataset.openTest
            }
          );
        }
      );
    });

  list
    .querySelectorAll(
      "[data-rename-test]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          renameTest(
            button.dataset
              .renameTest
          );
        }
      );
    });

  list
    .querySelectorAll(
      "[data-delete-test]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          deleteTest(
            button.dataset
              .deleteTest
          );
        }
      );
    });
}

/* ================================
   단어장
================================ */

function renderWordbook() {
  const file =
    findFile(currentFileId);

  const test =
    findTest(
      file,
      currentTestId
    );

  if (!file || !test) {
    navigate("file", {
      fileId: currentFileId
    });

    return;
  }

  sortWordsByImportance(test);

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          📖 ${escapeHtml(test.name)}
        </h1>

        <p class="page-description">
          단어를 입력해서 단어장을 만들어보세요.
        </p>
      </div>
    </div>

    <div class="input-area">
      <input
        id="wordInput"
        class="word-input"
        type="text"
        placeholder="run:달리다,뛰다/runway:활주로"
        autocomplete="off"
      >
    </div>

    ${
      test.words.length
        ? `
          <div
            id="wordList"
            class="word-list"
          >
            ${test.words
              .map(
                renderWordRow
              )
              .join("")}
          </div>
        `
        : `
          <div class="empty-state">
            📝 아직 단어가 없습니다.<br>
            위 입력창에 단어를 입력해주세요.
          </div>
        `
    }
  `;

  document
    .getElementById(
      "wordInput"
    )
    .addEventListener(
      "keydown",
      event => {
        if (
          event.key !==
          "Enter"
        ) {
          return;
        }

        event.preventDefault();

        addWordsFromInput(
          event.target.value
        );

        event.target.value = "";
      }
    );

  setupWordEvents();
}

function renderWordRow(
  word,
  index
) {
  return `
    <div
      class="word-row"
      draggable="true"
      data-word-index="${index}"
    >
      <div class="drag-handle">
        ⋮⋮
      </div>

      <div class="word-content">
        <div class="word-term">
          ${
            word.important
              ? "⭐ "
              : ""
          }

          ${escapeHtml(
            word.term
          )}
        </div>

        <div class="word-meaning">
          ${word.meanings
            .map(escapeHtml)
            .join(", ")}
        </div>
      </div>

      <div class="word-actions">
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
  const parts =
    input
      .split("/")
      .map(
        item =>
          item.trim()
      )
      .filter(Boolean);

  const result = [];

  parts.forEach(part => {
    const colonIndex =
      part.indexOf(":");

    if (
      colonIndex === -1
    ) {
      return;
    }

    const term =
      part
        .slice(
          0,
          colonIndex
        )
        .trim();

    const meaningText =
      part
        .slice(
          colonIndex + 1
        )
        .trim();

    if (
      !term ||
      !meaningText
    ) {
      return;
    }

    const meanings =
      meaningText
        .split(",")
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);

    if (
      !meanings.length
    ) {
      return;
    }

    result.push({
      term,
      meanings
    });
  });

  return result;
}

function addWordsFromInput(
  input
) {
  const file =
    findFile(currentFileId);

  const test =
    findTest(
      file,
      currentTestId
    );

  if (!file || !test) {
    return;
  }

  const newWords =
    parseWords(input);

  if (!newWords.length) {
    alert(
      "입력 형식을 확인해주세요.\n예: run:달리다,뛰다/runway:활주로"
    );

    return;
  }

  newWords.forEach(
    newWord => {
      const duplicate =
        test.words.some(
          word => {
            if (
              word.term !==
              newWord.term
            ) {
              return false;
            }

            if (
              word.meanings
                .length !==
              newWord.meanings
                .length
            ) {
              return false;
            }

            return word.meanings.every(
              (
                meaning,
                index
              ) =>
                meaning ===
                newWord
                  .meanings[
                  index
                ]
            );
          }
        );

      if (!duplicate) {
        test.words.push({
          id: createId("word"),
          term:
            newWord.term,
          meanings:
            newWord.meanings,
          important: false,
          correct: 0,
          wrong: 0,
          lastWrong: false
        });
      }
    }
  );

  sortWordsByImportance(test);

  saveState();
  render();
}

function deleteWord(index) {
  const file =
    findFile(currentFileId);

  const test =
    findTest(
      file,
      currentTestId
    );

  if (
    !test ||
    !test.words[index]
  ) {
    return;
  }

  showConfirm(
    "🗑 단어 삭제",
    `"${test.words[index].term}" 단어를 삭제할까요?`,
    () => {
      test.words.splice(
        index,
        1
      );

      saveState();
      render();
    }
  );
}

function setupWordEvents() {
  const list =
    document.getElementById(
      "wordList"
    );

  if (!list) {
    return;
  }

  let draggedIndex = null;

  list
    .querySelectorAll(
      "[data-word-index]"
    )
    .forEach(item => {
      item.addEventListener(
        "dragstart",
        () => {
          draggedIndex =
            Number(
              item.dataset
                .wordIndex
            );

          item.style.opacity =
            "0.5";
        }
      );

      item.addEventListener(
        "dragend",
        () => {
          draggedIndex =
            null;

          item.style.opacity =
            "";
        }
      );

      item.addEventListener(
        "dragover",
        event => {
          event.preventDefault();
        }
      );

      item.addEventListener(
        "drop",
        event => {
          event.preventDefault();

          const targetIndex =
            Number(
              item.dataset
                .wordIndex
            );

          if (
            draggedIndex ===
              null ||
            draggedIndex ===
              targetIndex
          ) {
            return;
          }

          const file =
            findFile(
              currentFileId
            );

          const test =
            findTest(
              file,
              currentTestId
            );

          if (!test) {
            return;
          }

          const moved =
            test.words.splice(
              draggedIndex,
              1
            )[0];

          test.words.splice(
            targetIndex,
            0,
            moved
          );

          saveState();
          render();
        }
      );
    });

  list
    .querySelectorAll(
      "[data-delete-word]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          deleteWord(
            Number(
              button.dataset
                .deleteWord
            )
          );
        }
      );
    });
}

/* ================================
   퀴즈
================================ */

function buildQuizWords(
  words,
  mode
) {
  const result = [];

  words.forEach(word => {

    if (
      mode ===
      "term-to-meaning"
    ) {
      result.push({
        id: word.id,
        sourceTestId:
          word.sourceTestId ||
          null,
        question:
          word.term,
        answer:
          word.meanings.join(
            ", "
          ),
        acceptedAnswers:
          word.meanings,
        direction:
          "영어 → 뜻"
      });

      return;
    }

    if (
      mode ===
      "meaning-to-term"
    ) {
      word.meanings.forEach(
        meaning => {
          result.push({
            id: word.id,
            sourceTestId:
              word.sourceTestId ||
              null,
            question:
              meaning,
            answer:
              word.term,
            acceptedAnswers: [
              word.term
            ],
            direction:
              "뜻 → 영어"
          });
        }
      );

      return;
    }

    // 혼합
    if (
      Math.random() <
      0.5
    ) {
      result.push({
        id: word.id,
        sourceTestId:
          word.sourceTestId ||
          null,
        question:
          word.term,
        answer:
          word.meanings.join(
            ", "
          ),
        acceptedAnswers:
          word.meanings,
        direction:
          "영어 → 뜻"
      });
    } else {
      const meaning =
        word.meanings[
          Math.floor(
            Math.random() *
              word.meanings.length
          )
        ];

      result.push({
        id: word.id,
        sourceTestId:
          word.sourceTestId ||
          null,
        question:
          meaning,
        answer:
          word.term,
        acceptedAnswers: [
          word.term
        ],
        direction:
          "뜻 → 영어"
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
  const file =
    findFile(fileId);

  if (!file) {
    return;
  }

  let words = [];

  if (
    testId ===
    "__total__"
  ) {
    words =
      wordsOverride ||
      getAllFileWords(file);
  } else {
    const test =
      findTest(
        file,
        testId
      );

    if (!test) {
      return;
    }

    words =
      wordsOverride ||
      test.words;
  }

  if (!words.length) {
    alert(
      "테스트할 단어가 없습니다."
    );

    return;
  }

  quizSession = {
    fileId,
    testId,
    mode,
    words:
      buildQuizWords(
        words,
        mode
      ),
    index: 0,
    correct: 0,
    wrong: 0,
    answered: false
  };

  currentFileId =
    fileId;

  currentTestId =
    testId;

  navigate("quiz", {
    fileId,
    testId
  });
}

function getAllFileWords(file) {
  const result = [];

  file.tests.forEach(
    test => {
      test.words.forEach(
        word => {
          result.push({
            ...word,
            sourceTestId:
              test.id
          });
        }
      );
    }
  );

  return result;
}

function startTotalQuiz(
  file,
  mode
) {
  const words =
    getAllFileWords(file);

  if (!words.length) {
    alert(
      "테스트할 단어가 없습니다."
    );

    return;
  }

  startQuiz({
    fileId: file.id,
    testId:
      "__total__",
    mode,
    wordsOverride:
      words
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
          ${
            quizSession.index +
            1
          }
          /
          ${
            quizSession.words
              .length
          }
        </div>

        <div>
          ⏱️
          <span id="timerText">
            10
          </span>
          초
        </div>
      </div>

      <div class="quiz-card">

        <div
          id="questionDirection"
          class="question-direction"
        ></div>

        <div
          id="question"
          class="question"
        ></div>

        <input
          id="answerInput"
          class="answer-input"
          type="text"
          placeholder="정답을 입력하세요"
          autocomplete="off"
        >

        <div
          id="feedback"
          class="feedback"
        ></div>

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
    quizSession.words[
      quizSession.index
    ];

  if (!current) {
    finishQuiz();
    return;
  }

  const direction =
    document.getElementById(
      "questionDirection"
    );

  const question =
    document.getElementById(
      "question"
    );

  const input =
    document.getElementById(
      "answerInput"
    );

  const feedback =
    document.getElementById(
      "feedback"
    );

  const nextBtn =
    document.getElementById(
      "nextBtn"
    );

  direction.textContent =
    current.direction;

  question.textContent =
    current.question;

  input.value = "";
  input.disabled = false;

  feedback.textContent = "";
  feedback.className =
    "feedback";

  nextBtn.classList.add(
    "hidden"
  );

  quizSession.answered =
    false;

  input.focus();

  startQuizTimer();

  input.onkeydown =
    event => {
      if (
        event.key !==
        "Enter"
      ) {
        return;
      }

      event.preventDefault();

      if (
        !quizSession.answered
      ) {
        checkAnswer(
          input.value
        );
      } else {
        moveToNextQuestion();
      }
    };

  nextBtn.onclick =
    moveToNextQuestion;
}

function startQuizTimer() {
  stopQuizTimer();

  quizTimeLeft = 10;

  updateTimer();

  quizTimer =
    setInterval(() => {
      quizTimeLeft--;

      updateTimer();

      if (
        quizTimeLeft <= 0
      ) {
        stopQuizTimer();

        if (
          quizSession &&
          !quizSession.answered
        ) {
          checkAnswer("");
        }
      }
    }, 1000);
}

function stopQuizTimer() {
  if (quizTimer) {
    clearInterval(
      quizTimer
    );

    quizTimer = null;
  }
}

function updateTimer() {
  const timer =
    document.getElementById(
      "timerText"
    );

  if (timer) {
    timer.textContent =
      quizTimeLeft;
  }
}

function findOriginalWord(
  item
) {
  const file =
    findFile(
      quizSession.fileId
    );

  if (!file) {
    return null;
  }

  if (
    quizSession.testId ===
    "__total__"
  ) {
    const test =
      findTest(
        file,
        item.sourceTestId
      );

    if (!test) {
      return null;
    }

    return test.words.find(
      word =>
        word.id === item.id
    );
  }

  const test =
    findTest(
      file,
      quizSession.testId
    );

  if (!test) {
    return null;
  }

  return test.words.find(
    word =>
      word.id === item.id
  );
}

function checkAnswer(answer) {
  if (
    !quizSession ||
    quizSession.answered
  ) {
    return;
  }

  stopQuizTimer();

  const current =
    quizSession.words[
      quizSession.index
    ];

  const correct =
    isAnswerCorrect(
      answer,
      current.acceptedAnswers
    );

  quizSession.answered =
    true;

  const original =
    findOriginalWord(
      current
    );

  if (correct) {
    quizSession.correct++;

    if (original) {
      original.correct =
        Number(
          original.correct || 0
        ) + 1;

      original.lastWrong =
        false;

      updateImportantStatus(
        original
      );
    }
  } else {
    quizSession.wrong++;

    if (original) {
      original.wrong =
        Number(
          original.wrong || 0
        ) + 1;

      original.lastWrong =
        true;

      updateImportantStatus(
        original
      );
    }
  }

  saveState();

  const input =
    document.getElementById(
      "answerInput"
    );

  const feedback =
    document.getElementById(
      "feedback"
    );

  const nextBtn =
    document.getElementById(
      "nextBtn"
    );

  input.disabled = true;

  if (correct) {
    feedback.textContent =
      "✅ 정답입니다!";

    feedback.className =
      "feedback correct";
  } else {
    feedback.textContent =
      "❌ 오답입니다. 정답: " +
      current.answer;

    feedback.className =
      "feedback wrong";
  }

  nextBtn.textContent =
    quizSession.index ===
    quizSession.words.length - 1
      ? "결과 보기"
      : "다음 문제";

  nextBtn.classList.remove(
    "hidden"
  );
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

  updateAllImportantStatuses();

  state.history.push({
    id: createId("history"),
    date:
      new Date().toISOString(),
    fileName:
      findFile(
        quizSession.fileId
      )?.name || "",
    testName:
      quizSession.testId ===
      "__total__"
        ? "총합 테스트"
        : findTest(
            findFile(
              quizSession.fileId
            ),
            quizSession.testId
          )?.name || "",
    total:
      quizSession.words.length,
    correct:
      quizSession.correct,
    wrong:
      quizSession.wrong
  });

  sortAllTestsByImportance();

  saveState();

  currentScreen =
    "result";

  updateNavigation();
  render();
}

/* ================================
   결과
================================ */

function renderResult() {
  if (!quizSession) {
    navigate("home");
    return;
  }

  const total =
    quizSession.words.length;

  const correct =
    quizSession.correct;

  const wrong =
    quizSession.wrong;

  const percentage =
    total
      ? Math.round(
          (correct / total) *
            100
        )
      : 0;

  mainContent.innerHTML = `
    <div class="result-card">

      <h2>
        🎉 테스트 결과
      </h2>

      <div class="result-score">
        ${percentage}%
      </div>

      <div class="result-detail">
        ${total}문제 중
        ${correct}개 정답
        ·
        ${wrong}개 오답
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
            quizSession.testId ===
            "__total__"
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
    .getElementById(
      "resultHomeBtn"
    )
    .addEventListener(
      "click",
      () => {
        clearQuiz();
        navigate("home");
      }
    );

  document
    .getElementById(
      "resultReturnBtn"
    )
    .addEventListener(
      "click",
      () => {
        const fileId =
          quizSession.fileId;

        const testId =
          quizSession.testId;

        clearQuiz();

        if (
          testId ===
          "__total__"
        ) {
          navigate("file", {
            fileId
          });
        } else {
          navigate(
            "wordbook",
            {
              fileId,
              testId
            }
          );
        }
      }
    );

  document
    .getElementById(
      "retryWrongBtn"
    )
    .addEventListener(
      "click",
      retryWrong
    );
}

function retryWrong() {
  if (!quizSession) {
    return;
  }

  const wrongWords =
    quizSession.words
      .map(
        item =>
          findOriginalWord(item)
      )
      .filter(
        word =>
          word &&
          word.lastWrong
      );

  if (!wrongWords.length) {
    alert(
      "틀린 문제가 없습니다."
    );

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
    wordsOverride:
      shuffle(wrongWords)
  });
}

function clearQuiz() {
  stopQuizTimer();
  quizSession = null;
}

/* ================================
   빠른 테스트
================================ */

function startQuickTest(
  type
) {
  closeQuick();

  if (!quickSource) {
    return;
  }

  const file =
    findFile(
      quickSource.fileId
    );

  if (!file) {
    return;
  }

  let words = [];
  let testId =
    "__total__";

  if (
    quickSource.type ===
    "total"
  ) {
    words =
      getAllFileWords(
        file
      );
  } else {
    const test =
      findTest(
        file,
        quickSource.testId
      );

    if (!test) {
      return;
    }

    testId = test.id;
    words = test.words;
  }

  if (
    type ===
    "important"
  ) {
    words =
      words.filter(
        word =>
          word.important
      );
  }

  if (
    type ===
    "wrong"
  ) {
    words =
      words.filter(
        word =>
          Number(
            word.wrong || 0
          ) > 0 ||
          word.lastWrong
      );
  }

  if (!words.length) {
    alert(
      type ===
        "important"
        ? "⭐ 중요 단어가 없습니다."
        : "❌ 틀린 단어가 없습니다."
    );

    return;
  }

  startQuiz({
    fileId: file.id,
    testId,
    mode: "mixed",
    wordsOverride:
      shuffle(words)
  });
}

/* ================================
   통계
================================ */

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
        <h1 class="page-title">
          📊 통계
        </h1>

        <p class="page-description">
          테스트 기록을 확인하세요.
        </p>
      </div>

    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <div class="stat-label">
          총 테스트
        </div>

        <div class="stat-value">
          ${totalTests}
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          총 문제
        </div>

        <div class="stat-value">
          ${totalQuestions}
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          정답 수
        </div>

        <div class="stat-value">
          ${totalCorrect}
        </div>
      </div>

    </div>

    ${
      histories.length
        ? renderHistory(
            histories
          )
        : `
          <div class="empty-state">
            아직 테스트 기록이 없습니다.
          </div>
        `
    }
  `;
}

function renderHistory(
  histories
) {
  const now =
    new Date();

  const currentYear =
    now.getFullYear();

  const currentMonth =
    now.getMonth() + 1;

  const currentMonthItems =
    [];

  const currentYearMonths =
    {};

  const previousYears =
    {};

  histories.forEach(
    history => {
      const date =
        new Date(
          history.date
        );

      const year =
        date.getFullYear();

      const month =
        date.getMonth() + 1;

      if (
        year ===
          currentYear &&
        month ===
          currentMonth
      ) {
        currentMonthItems.push(
          history
        );

        return;
      }

      if (
        year ===
        currentYear
      ) {
        if (
          !currentYearMonths[
            month
          ]
        ) {
          currentYearMonths[
            month
          ] = [];
        }

        currentYearMonths[
          month
        ].push(
          history
        );

        return;
      }

      if (
        !previousYears[
          year
        ]
      ) {
        previousYears[
          year
        ] = {};
      }

      if (
        !previousYears[
          year
        ][month]
      ) {
        previousYears[
          year
        ][month] = [];
      }

      previousYears[
        year
      ][month].push(
        history
      );
    }
  );

  let html = "";

  if (
    currentMonthItems.length
  ) {
    html += `
      <div class="history-group">
        ${currentMonthItems
          .map(
            renderHistoryItem
          )
          .join("")}
      </div>
    `;
  }

  Object.keys(
    currentYearMonths
  )
    .map(Number)
    .sort(
      (a, b) => b - a
    )
    .forEach(
      month => {
        html += `
          <div class="history-group">

            <div class="history-month">
              ${month}월
            </div>

            ${currentYearMonths[
              month
            ]
              .map(
                renderHistoryItem
              )
              .join("")}

          </div>
        `;
      }
    );

  Object.keys(
    previousYears
  )
    .map(Number)
    .sort(
      (a, b) => b - a
    )
    .forEach(
      year => {
        html += `
          <div class="history-group">

            <div class="history-year">
              ${year}년
            </div>
        `;

        Object.keys(
          previousYears[
            year
          ]
        )
          .map(Number)
          .sort(
            (a, b) =>
              b - a
          )
          .forEach(
            month => {
              html += `
                <div class="history-month">
                  ${month}월
                </div>

                ${previousYears[
                  year
                ][month]
                  .map(
                    renderHistoryItem
                  )
                  .join("")}
              `;
            }
          );

        html += `
          </div>
        `;
      }
    );

  return html;
}

function renderHistoryItem(
  history
) {
  const percentage =
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
          ${escapeHtml(
            history.fileName
          )}
          ·
          ${escapeHtml(
            history.testName
          )}
        </div>

        <div class="history-sub">
          ${formatDateTime(
            history.date
          )}
        </div>

      </div>

      <div>
        ${history.correct}/${history.total}
        (${percentage}%)
      </div>

    </div>
  `;
}

/* ================================
   설정
================================ */

function renderSettings() {
  mainContent.innerHTML = `
    <div class="page-header">

      <div>
        <h1 class="page-title">
          ⚙️ 설정
        </h1>

        <p class="page-description">
          앱 데이터를 관리하세요.
        </p>
      </div>

    </div>

    <div class="settings-list">

      <div class="settings-item">

        <div class="settings-title">
          💾 데이터 관리
        </div>

        <div class="settings-description">
          단어장 데이터를 저장하거나 불러옵니다.
        </div>

        <div class="data-buttons">

          <button
            id="exportBtn"
            class="secondary-btn"
          >
            📤 데이터 내보내기
          </button>

          <label
            class="secondary-btn"
            style="cursor:pointer;"
          >
            📥 데이터 불러오기

            <input
              id="importInput"
              type="file"
              accept=".json,application/json"
              style="display:none;"
            >
          </label>

        </div>
      </div>

      <div class="guide-card">

        <button
          id="guideToggle"
          class="guide-toggle"
        >
          <span>📖 설명서</span>
          <span id="guideArrow">
            ▼
          </span>
        </button>

        <div
          id="guideContent"
          class="guide-content"
        >

          <div class="guide-line">
            📁 파일을 만들고 파일 안에 단어장을 만들 수 있습니다.
          </div>

          <div class="guide-line">
            📝 단어 입력 예시:
            <b>
              run:달리다,뛰다/runway:활주로
            </b>
          </div>

          <div class="guide-line">
            🔀 전체 테스트는 영어 → 뜻 / 뜻 → 영어가 혼합되어 출제됩니다.
          </div>

          <div class="guide-line">
            ⭐ 오답률이 70%를 초과하면 중요 단어로 자동 분류됩니다.
          </div>

          <div class="guide-line">
            📌 중요 단어는 단어장 목록의 위쪽으로 이동합니다.
          </div>

          <div class="guide-line">
            ⚡ 빠른 테스트에서 중요 단어만 따로 테스트할 수 있습니다.
          </div>

          <div class="guide-line">
            ⏱️ 문제마다 제한 시간은 10초입니다.
          </div>

        </div>
      </div>

      <div class="settings-item">

        <div class="settings-title">
          🗑 데이터 초기화
        </div>

        <div class="settings-description">
          모든 파일, 단어장, 단어, 통계 기록을 삭제합니다.
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
    .getElementById(
      "exportBtn"
    )
    .addEventListener(
      "click",
      exportData
    );

  document
    .getElementById(
      "importInput"
    )
    .addEventListener(
      "change",
      importData
    );

  document
    .getElementById(
      "resetBtn"
    )
    .addEventListener(
      "click",
      resetData
    );

  document
    .getElementById(
      "guideToggle"
    )
    .addEventListener(
      "click",
      () => {
        const content =
          document.getElementById(
            "guideContent"
          );

        const arrow =
          document.getElementById(
            "guideArrow"
          );

        content.classList.toggle(
          "open"
        );

        arrow.textContent =
          content.classList.contains(
            "open"
          )
            ? "▲"
            : "▼";
      }
    );
}

function exportData() {
  const blob =
    new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
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
    "단어암기장.json";

  link.click();

  URL.revokeObjectURL(
    url
  );
}

function importData(event) {
  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {
    try {
      const imported =
        JSON.parse(
          reader.result
        );

      if (
        !imported ||
        !Array.isArray(
          imported.files
        ) ||
        !Array.isArray(
          imported.history
        )
      ) {
        throw new Error(
          "invalid data"
        );
      }

      showConfirm(
        "📥 데이터 불러오기",
        "현재 데이터를 불러온 데이터로 교체할까요?",
        () => {
          state = {
            files:
              imported.files,
            history:
              imported.history
          };

          updateAllImportantStatuses();
          sortAllTestsByImportance();

          saveState();
          navigate("home");
        }
      );
    } catch (error) {
      alert(
        "올바른 데이터 파일이 아닙니다."
      );
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

function resetData() {
  showConfirm(
    "⚠️ 전체 데이터 초기화",
    "모든 데이터를 삭제할까요?",
    () => {
      state =
        defaultState();

      saveState();
      clearQuiz();
      navigate("home");
    }
  );
}

/* ================================
   빠른 테스트 모달
================================ */

function closeQuick() {
  quickModal.classList.add(
    "hidden"
  );

  quickSource = null;
}

closeQuickModal.addEventListener(
  "click",
  closeQuick
);

importantQuickBtn.addEventListener(
  "click",
  () =>
    startQuickTest(
      "important"
    )
);

wrongQuickBtn.addEventListener(
  "click",
  () =>
    startQuickTest(
      "wrong"
    )
);

quickModal.addEventListener(
  "click",
  event => {
    if (
      event.target ===
      quickModal
    ) {
      closeQuick();
    }
  }
);

/* ================================
   상단 메뉴
================================ */

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

/* ================================
   렌더링
================================ */

function render() {
  updateNavigation();

  if (
    currentScreen ===
    "home"
  ) {
    renderHome();
    return;
  }

  if (
    currentScreen ===
    "file"
  ) {
    renderFile();
    return;
  }

  if (
    currentScreen ===
    "wordbook"
  ) {
    renderWordbook();
    return;
  }

  if (
    currentScreen ===
    "quiz"
  ) {
    renderQuiz();
    return;
  }

  if (
    currentScreen ===
    "result"
  ) {
    renderResult();
    return;
  }

  if (
    currentScreen ===
    "stats"
  ) {
    renderStats();
    return;
  }

  if (
    currentScreen ===
    "settings"
  ) {
    renderSettings();
    return;
  }

  navigate("home");
}

/* ================================
   시작
================================ */

updateAllImportantStatuses();
sortAllTestsByImportance();
saveState();

loadTheme();
render();

if (
  "serviceWorker" in
  navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "sw.js"
        )
        .catch(
          error => {
            console.error(
              "Service Worker 오류:",
              error
            );
          }
        );
    }
  );
}
