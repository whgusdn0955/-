"use strict";

const STORAGE_KEY = "word_memory_app_v2_default_files";
const DEFAULT_FILE_IDS = {
  japanese: "default-japanese-file",
  kanji: "default-kanji-file"
};

const KANJI_LEVELS = [
  { name: "8급", stars: 1, words: ["人","日","山","川","雨"] },
  { name: "준7급", stars: 2, words: ["空","海","電","車","学"] },
  { name: "7급", stars: 2, words: ["国","語","市","店","食"] },
  { name: "준6급", stars: 3, words: ["水","火","花","木","土"] },
  { name: "6급", stars: 3, words: ["友","家","校","生","先"] },
  { name: "준5급", stars: 4, words: ["道","力","計","風","音"] },
  { name: "5급", stars: 4, words: ["自","然","社","会","話"] },
  { name: "준4급", stars: 5, words: ["案","内","工","業","信"] },
  { name: "4급", stars: 5, words: ["元","気","文","法","辺"] },
  { name: "준3급", stars: 6, words: ["集","体","風","景","解"] },
  { name: "3급", stars: 6, words: ["現","在","事","実","質"] },
  { name: "2급", stars: 7, words: ["規","模","決","定","表"] },
  { name: "1급", stars: 7, words: ["問","題","政","策","論"] },
  { name: "준특급", stars: 8, words: ["政","治","組","織","原"] },
  { name: "특급", stars: 9, words: ["最","高","可","能","理"] }
];

const HIRAGANA_ROWS = [
  { row: "あ행", chars: ["あ","い","う","え","お"] },
  { row: "か행", chars: ["か","き","く","け","こ"] },
  { row: "さ행", chars: ["さ","し","す","せ","そ"] },
  { row: "た행", chars: ["た","ち","つ","て","と"] },
  { row: "な행", chars: ["な","に","ぬ","ね","の"] },
  { row: "は행", chars: ["は","ひ","ふ","へ","ほ"] },
  { row: "ま행", chars: ["ま","み","む","め","も"] },
  { row: "や행", chars: ["や"," ","ゆ"," ","よ"] },
  { row: "ら행", chars: ["ら","り","る","れ","ろ"] },
  { row: "わ행", chars: ["わ"," "," "," ","を"] },
  { row: "ん", chars: ["ん"] }
];

const KATAKANA_ROWS = [
  { row: "ア행", chars: ["ア","イ","ウ","エ","オ"] },
  { row: "カ행", chars: ["カ","キ","ク","ケ","コ"] },
  { row: "サ행", chars: ["サ","シ","ス","セ","ソ"] },
  { row: "タ행", chars: ["タ","チ","ツ","テ","ト"] },
  { row: "ナ행", chars: ["ナ","ニ","ヌ","ネ","ノ"] },
  { row: "ハ행", chars: ["ハ","ヒ","フ","ヘ","ホ"] },
  { row: "マ행", chars: ["マ","ミ","ム","メ","モ"] },
  { row: "ヤ행", chars: ["ヤ"," ","ユ"," ","ヨ"] },
  { row: "ラ행", chars: ["ラ","リ","ル","レ","ロ"] },
  { row: "ワ행", chars: ["ワ"," "," "," ","ヲ"] },
  { row: "ン", chars: ["ン"] }
];

const JAPANESE_50_SOUND_TABLE = [
  { kana: "あ", reading: "아", type: "あ단" },
  { kana: "い", reading: "이", type: "い단" },
  { kana: "う", reading: "우", type: "う단" },
  { kana: "え", reading: "에", type: "え단" },
  { kana: "お", reading: "오", type: "お단" },
  { kana: "か", reading: "카", type: "あ단" },
  { kana: "き", reading: "키", type: "い단" },
  { kana: "く", reading: "쿠", type: "う단" },
  { kana: "け", reading: "케", type: "え단" },
  { kana: "こ", reading: "코", type: "お단" },
  { kana: "さ", reading: "사", type: "あ단" },
  { kana: "し", reading: "시", type: "い단" },
  { kana: "す", reading: "스", type: "う단" },
  { kana: "せ", reading: "세", type: "え단" },
  { kana: "そ", reading: "소", type: "お단" },
  { kana: "た", reading: "타", type: "あ단" },
  { kana: "ち", reading: "치", type: "い단" },
  { kana: "つ", reading: "츠", type: "う단" },
  { kana: "て", reading: "테", type: "え단" },
  { kana: "と", reading: "토", type: "お단" },
  { kana: "な", reading: "나", type: "あ단" },
  { kana: "に", reading: "니", type: "い단" },
  { kana: "ぬ", reading: "누", type: "う단" },
  { kana: "ね", reading: "네", type: "え단" },
  { kana: "の", reading: "노", type: "お단" },
  { kana: "は", reading: "하", type: "あ단" },
  { kana: "ひ", reading: "히", type: "い단" },
  { kana: "ふ", reading: "후", type: "う단" },
  { kana: "へ", reading: "헤", type: "え단" },
  { kana: "ほ", reading: "호", type: "お단" },
  { kana: "ま", reading: "마", type: "あ단" },
  { kana: "み", reading: "미", type: "い단" },
  { kana: "む", reading: "무", type: "う단" },
  { kana: "め", reading: "메", type: "え단" },
  { kana: "も", reading: "모", type: "お단" },
  { kana: "や", reading: "야", type: "あ단" },
  { kana: "ゆ", reading: "유", type: "う단" },
  { kana: "よ", reading: "요", type: "お단" },
  { kana: "ら", reading: "라", type: "あ단" },
  { kana: "り", reading: "리", type: "い단" },
  { kana: "る", reading: "루", type: "う단" },
  { kana: "れ", reading: "레", type: "え단" },
  { kana: "ろ", reading: "로", type: "お단" },
  { kana: "わ", reading: "와", type: "あ단" },
  { kana: "を", reading: "오", type: "お단" },
  { kana: "ん", reading: "응", type: "ん" }
];

function createDefaultFiles() {
  return [
    {
      id: DEFAULT_FILE_IDS.kanji,
      name: "한자",
      description: "기본 제공 한자 학습 파일",
      isDefault: true,
      createdAt: new Date().toISOString(),
      workbooks: [
        {
          id: "default-kanji-level-book",
          name: "급수 선택",
          type: "kanji-level",
          isDefault: true,
          words: KANJI_LEVELS.flatMap((level) => level.words.map((word) => ({
            word,
            meaning: word,
            level: level.name,
            stars: level.stars,
            reading: ""
          })))
        }
      ]
    },
    {
      id: DEFAULT_FILE_IDS.japanese,
      name: "일본어",
      description: "기본 제공 일본어 학습 파일",
      isDefault: true,
      createdAt: new Date().toISOString(),
      workbooks: [
        {
          id: "hiragana-default-book",
          name: "히라가나",
          type: "hiragana",
          isDefault: true,
          words: HIRAGANA_ROWS.flatMap((row) => row.chars.filter((char) => char.trim()).map((char) => ({
            word: char,
            meaning: getJapaneseReading(char),
            level: row.row,
            row: row.row,
            stars: 1
          })))
        },
        {
          id: "katakana-default-book",
          name: "가타카나",
          type: "katakana",
          isDefault: true,
          words: KATAKANA_ROWS.flatMap((row) => row.chars.filter((char) => char.trim()).map((char) => ({
            word: char,
            meaning: getJapaneseReading(char, true),
            level: row.row,
            row: row.row,
            stars: 1
          })))
        }
      ]
    }
  ];
}

function getJapaneseReading(char, katakana = false) {
  const lookup = {
    あ: "아", い: "이", う: "우", え: "에", お: "오",
    か: "카", き: "키", く: "쿠", け: "케", こ: "코",
    さ: "사", し: "시", す: "스", せ: "세", そ: "소",
    た: "타", ち: "치", つ: "츠", て: "테", と: "토",
    な: "나", に: "니", ぬ: "누", ね: "네", の: "노",
    は: "하", ひ: "히", ふ: "후", へ: "헤", ほ: "호",
    ま: "마", み: "미", む: "무", め: "메", も: "모",
    や: "야", ゆ: "유", よ: "요",
    ら: "라", り: "리", る: "루", れ: "레", ろ: "로",
    わ: "와", を: "오", ん: "응",
    ア: "아", イ: "이", ウ: "우", エ: "에", オ: "오",
    カ: "카", キ: "키", ク: "쿠", ケ: "케", コ: "코",
    サ: "사", シ: "시", ス: "스", セ: "세", ソ: "소",
    タ: "타", チ: "치", ツ: "츠", テ: "테", ト: "토",
    ナ: "나", ニ: "니", ヌ: "누", ネ: "네", ノ: "노",
    ハ: "하", ヒ: "히", フ: "후", ヘ: "헤", ホ: "호",
    マ: "마", ミ: "미", ム: "무", メ: "메", モ: "모",
    ヤ: "야", ユ: "유", ヨ: "요",
    ラ: "라", リ: "리", ル: "루", レ: "레", ロ: "로",
    ワ: "와", ヲ: "오", ン: "응"
  };
  return lookup[char] || "";
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getDefaultState() {
  return {
    files: createDefaultFiles(),
    testRecords: []
  };
}

function normalizeData(data) {
  const base = data && Array.isArray(data.files) ? data : getDefaultState();
  const defaults = createDefaultFiles();
  const mergedFiles = [...defaults];

  base.files.forEach((file) => {
    if (!file || file.isDefault) return;
    mergedFiles.push({
      ...file,
      id: file.id || makeId("file"),
      workbooks: (file.workbooks || []).map((wb) => ({
        ...wb,
        id: wb.id || makeId("workbook")
      }))
    });
  });

  return {
    files: mergedFiles,
    testRecords: Array.isArray(data && data.testRecords) ? data.testRecords : []
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    console.warn("데이터 로드 실패", error);
    return getDefaultState();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

let appData = loadData();
let currentFileId = null;
let currentWorkbookId = null;
let selectedLevel = "8급";
let currentHanjaListMode = "level";

function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  const target = document.getElementById(`${pageName}Page`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((button) => {
    const activated = button.dataset.page === pageName;
    button.classList.toggle("active", activated);
  });
}

function updateBackButtonForPage(pageName) {
  const backButton = document.getElementById("pageBackButton");
  if (!backButton) return;
  const allowPage = ["file", "workbook", "test", "result", "hanjaList"];
  backButton.classList.toggle("hidden", !allowPage.includes(pageName));
}

function getFileById(fileId) {
  return appData.files.find((file) => file.id === fileId) || null;
}

function getWorkbookById(fileId, workbookId) {
  const file = getFileById(fileId);
  if (!file) return null;
  return file.workbooks.find((wb) => wb.id === workbookId) || null;
}

function renderHome() {
  const list = document.getElementById("fileList");
  const empty = document.getElementById("emptyFileState");
  if (!list || !empty) return;

  if (appData.files.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = appData.files.map((file) => {
    const wordCount = (file.workbooks || []).reduce((sum, wb) => sum + (wb.words || []).length, 0);
    return `
      <div class="file-card" data-file-id="${file.id}">
        <button type="button" class="file-card-main" data-open-file="${file.id}">
          <div class="file-icon">📁</div>
          <div class="file-info">
            <h3>${file.name}</h3>
            <p>${file.workbooks.length}개 단어장 · ${wordCount}개 단어</p>
          </div>
        </button>
        <div class="file-actions">
          <button type="button" class="icon-button" data-rename-file="${file.id}" title="이름 변경" ${file.isDefault ? "disabled" : ""}>✏️</button>
          <button type="button" class="icon-button danger" data-delete-file="${file.id}" title="삭제" ${file.isDefault ? "disabled" : ""}>🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-open-file]").forEach((button) => {
    button.addEventListener("click", () => openFile(button.dataset.openFile));
  });
  list.querySelectorAll("[data-rename-file]").forEach((button) => {
    button.addEventListener("click", () => renameFile(button.dataset.renameFile));
  });
  list.querySelectorAll("[data-delete-file]").forEach((button) => {
    button.addEventListener("click", () => deleteFile(button.dataset.deleteFile));
  });
}

function renderFilePage() {
  const file = getFileById(currentFileId);
  const title = document.getElementById("currentFileTitle");
  const breadcrumb = document.getElementById("currentFileBreadcrumb");
  const description = document.getElementById("currentFileDescription");
  const list = document.getElementById("workbookList");
  const empty = document.getElementById("emptyWorkbookState");
  const addButton = document.getElementById("addWorkbookButton");

  if (!file) {
    showPage("home");
    return;
  }

  title.textContent = file.name;
  breadcrumb.textContent = file.name;
  description.textContent = `${file.workbooks.length}개 단어장 · ${file.workbooks.reduce((sum, wb) => sum + (wb.words || []).length, 0)}개 단어`;

  if (file.isDefault) {
    addButton.disabled = true;
    addButton.style.opacity = "0.5";
    addButton.style.cursor = "not-allowed";
    addButton.setAttribute("aria-disabled", "true");
  } else {
    addButton.disabled = false;
    addButton.style.opacity = "1";
    addButton.style.cursor = "pointer";
    addButton.setAttribute("aria-disabled", "false");
  }

  if (!file.workbooks.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = file.workbooks.map((wb) => {
    const typeText = wb.type === "hiragana" ? "히라가나" : wb.type === "katakana" ? "가타카나" : wb.type === "kanji-level" ? "급수" : "일반";
    return `
      <div class="workbook-card" data-workbook-id="${wb.id}">
        <button type="button" class="workbook-card-main" data-open-workbook="${wb.id}">
          <div class="workbook-icon">📖</div>
          <div class="workbook-info">
            <h3>${wb.name}</h3>
            <p>${typeText} · ${(wb.words || []).length}개 단어</p>
          </div>
        </button>
        <div class="workbook-actions">
          <button type="button" class="icon-button" data-rename-workbook="${wb.id}" ${file.isDefault ? "disabled" : ""}>✏️</button>
          <button type="button" class="icon-button danger" data-delete-workbook="${wb.id}" ${file.isDefault ? "disabled" : ""}>🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-open-workbook]").forEach((button) => {
    button.addEventListener("click", () => openWorkbook(currentFileId, button.dataset.openWorkbook));
  });
  list.querySelectorAll("[data-rename-workbook]").forEach((button) => {
    button.addEventListener("click", () => renameWorkbook(currentFileId, button.dataset.renameWorkbook));
  });
  list.querySelectorAll("[data-delete-workbook]").forEach((button) => {
    button.addEventListener("click", () => deleteWorkbook(currentFileId, button.dataset.deleteWorkbook));
  });
}

function renderWorkbookPage() {
  const file = getFileById(currentFileId);
  const workbook = getWorkbookById(currentFileId, currentWorkbookId);
  if (!file || !workbook) {
    openFile(currentFileId);
    return;
  }

  document.getElementById("currentWorkbookTitle").textContent = workbook.name;
  document.getElementById("currentWorkbookBreadcrumb").textContent = workbook.name;
  document.getElementById("wordCountDescription").textContent = `${(workbook.words || []).length}개의 단어`;

  const isDefaultJapaneseBook = ["hiragana-default-book", "katakana-default-book"].includes(workbook.id);
  const isKanjiLevelBook = workbook.type === "kanji-level";
  const specialPanel = document.getElementById("specialWorkbookPanel");
  const normalInputCard = document.getElementById("normalWordInputCard");

  if (isDefaultJapaneseBook || isKanjiLevelBook) {
    normalInputCard.classList.add("hidden");
    specialPanel.classList.remove("hidden");
    renderSpecialWorkbook(workbook);
  } else {
    normalInputCard.classList.remove("hidden");
    specialPanel.classList.add("hidden");
  }

  const wordList = document.getElementById("wordList");
  const emptyWordState = document.getElementById("emptyWordState");

  if (!(workbook.words || []).length) {
    wordList.innerHTML = "";
    emptyWordState.classList.remove("hidden");
    return;
  }

  emptyWordState.classList.add("hidden");
  wordList.innerHTML = (workbook.words || []).map((word, index) => {
    const meanings = Array.isArray(word.meaning) ? word.meaning : [word.meaning || ""];
    const meaningText = meanings.join(", ");
    return `
      <div class="word-card" data-word-index="${index}">
        <div class="word-main">
          <div class="word-text">${word.word}</div>
          <div class="word-meaning">${meaningText}</div>
        </div>
        <div class="word-actions">
          <button type="button" class="icon-button" data-edit-word="${index}" ${isDefaultJapaneseBook || isKanjiLevelBook ? "disabled" : ""}>✏️</button>
          <button type="button" class="icon-button danger" data-delete-word="${index}" ${isDefaultJapaneseBook || isKanjiLevelBook ? "disabled" : ""}>🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  wordList.querySelectorAll("[data-delete-word]").forEach((button) => {
    button.addEventListener("click", () => deleteWord(currentFileId, currentWorkbookId, Number(button.dataset.deleteWord)));
  });
}

function renderSpecialWorkbook(workbook) {
  const panel = document.getElementById("specialWorkbookPanel");
  const title = document.getElementById("specialWorkbookTitle");
  const description = document.getElementById("specialWorkbookDescription");
  const levelArea = document.getElementById("specialLevelArea");
  const levelList = document.getElementById("specialLevelList");
  const listTitle = document.getElementById("specialListTitle");
  const specialList = document.getElementById("specialList");
  const specialTestButton = document.getElementById("specialTestButton");

  if (workbook.type === "hiragana" || workbook.type === "katakana") {
    title.textContent = workbook.name;
    description.textContent = "50음도 표에 따라 미리 구성된 기본 제공 단어장입니다.";
    levelArea.classList.remove("hidden");
    levelList.innerHTML = [
      { name: "50음도", stars: 1 },
      { name: "기본", stars: 2 }
    ].map((item) => `
      <button type="button" class="special-level-button active" data-special-level="${item.name}">
        <strong>${item.name}</strong>
        <span>${"⭐".repeat(item.stars)}</span>
      </button>
    `).join("");
    listTitle.textContent = `${workbook.name} 50음도 표`;
    specialList.classList.remove("hidden");
    specialList.innerHTML = renderJapaneseTable(workbook.type);
    specialTestButton.textContent = "📝 테스트";
    specialTestButton.onclick = () => startJapaneseWorkbookTest(workbook);
    return;
  }

  if (workbook.type === "kanji-level") {
    title.textContent = "한자 급수";
    description.textContent = "급수를 선택하면 해당 급수의 한자 목록과 테스트가 표시됩니다.";
    levelArea.classList.remove("hidden");
    levelList.innerHTML = KANJI_LEVELS.map((level) => `
      <button type="button" class="special-level-button ${level.name === selectedLevel ? "active" : ""}" data-special-level="${level.name}">
        <strong>${level.name}</strong>
        <span>${"⭐".repeat(level.stars)}</span>
      </button>
    `).join("");
    levelList.querySelectorAll("[data-special-level]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedLevel = button.dataset.specialLevel;
        renderSpecialWorkbook(workbook);
      });
    });

    listTitle.textContent = `${selectedLevel} 한자 목록`;
    specialList.classList.remove("hidden");
    specialList.innerHTML = renderKanjiLevelList(selectedLevel);
    specialTestButton.textContent = "📝 테스트";
    specialTestButton.onclick = () => startKanjiLevelTest(selectedLevel);
  }
}

function renderJapaneseTable(type) {
  const rows = type === "hiragana" ? HIRAGANA_ROWS : KATAKANA_ROWS;
  const columns = ["あ단", "い단", "う단", "え단", "お단"];
  const header = columns.map((col) => `<th>${col}</th>`).join("");
  const rowsHtml = rows.map((row) => {
    const cells = row.chars.map((char) => {
      if (!char || char.trim() === "") {
        return `<td class="empty-cell"></td>`;
      }
      const reading = getJapaneseReading(char);
      return `<td><div>${char}</div><small>${reading}</small></td>`;
    }).join("");
    return `<tr><th>${row.row}</th>${cells}</tr>`;
  }).join("");
  return `<table class="japanese-50-table"><thead><tr><th></th>${header}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function renderKanjiLevelList(levelName) {
  const target = KANJI_LEVELS.find((level) => level.name === levelName) || KANJI_LEVELS[0];
  return `
    <div class="kanji-level-grid">
      ${target.words.map((word) => `<div class="kanji-chip">${word}</div>`).join("")}
    </div>
  `;
}

function startJapaneseWorkbookTest(workbook) {
  const questions = (workbook.words || []).slice(0, 10).map((word) => ({
    prompt: word.word,
    answer: word.meaning,
    type: "문자 → 발음"
  }));
  startTest(questions, `${workbook.name} 테스트`);
}

function startKanjiLevelTest(levelName) {
  const target = KANJI_LEVELS.find((level) => level.name === levelName) || KANJI_LEVELS[0];
  const questions = target.words.slice(0, 10).map((word) => ({
    prompt: word,
    answer: word,
    type: `${levelName} 한자 테스트`
  }));
  startTest(questions, `${levelName} 테스트`);
}

function startTest(questions, label) {
  if (!questions.length) {
    showToast("테스트를 진행할 문제가 없습니다.", "error");
    return;
  }

  const total = questions.length;
  const testState = {
    questions: questions.map((q, index) => ({ ...q, index })),
    currentIndex: 0,
    correct: 0,
    wrong: 0,
    total,
    label
  };

  const testQuestion = document.getElementById("testQuestion");
  const testTypeLabel = document.getElementById("testTypeLabel");
  const testQuestionNumber = document.getElementById("testQuestionNumber");
  const testTotalQuestions = document.getElementById("testTotalQuestions");
  const testAnswerInput = document.getElementById("testAnswerInput");

  function renderCurrentQuestion() {
    const current = testState.questions[testState.currentIndex];
    if (!current) return;
    testTypeLabel.textContent = current.type || "테스트";
    testQuestion.textContent = current.prompt;
    testQuestionNumber.textContent = String(testState.currentIndex + 1);
    testTotalQuestions.textContent = String(testState.total);
    testAnswerInput.value = "";
    testAnswerInput.focus();
  }

  document.getElementById("testSubmitButton").onclick = () => {
    const current = testState.questions[testState.currentIndex];
    const answer = testAnswerInput.value.trim();
    if (!answer) return;

    const isCorrect = answer === current.answer;
    if (isCorrect) testState.correct += 1;
    else testState.wrong += 1;

    testState.currentIndex += 1;
    if (testState.currentIndex >= testState.total) {
      document.getElementById("resultCorrect").textContent = String(testState.correct);
      document.getElementById("resultWrong").textContent = String(testState.wrong);
      document.getElementById("resultTotal").textContent = String(testState.total);
      document.getElementById("resultTestName").textContent = label;
      showPage("result");
      return;
    }

    renderCurrentQuestion();
  };

  document.getElementById("testAnswerInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      document.getElementById("testSubmitButton").click();
    }
  });

  renderCurrentQuestion();
  showPage("test");
}

function addFile() {
  const name = window.prompt("새 파일 이름을 입력하세요", "새 파일");
  if (!name || !name.trim()) return;

  const trimmed = name.trim();
  if (appData.files.some((file) => file.name === trimmed)) {
    showToast("같은 이름의 파일이 이미 있습니다.", "error");
    return;
  }

  const newFile = {
    id: makeId("file"),
    name: trimmed,
    description: "사용자가 만든 파일",
    isDefault: false,
    createdAt: new Date().toISOString(),
    workbooks: []
  };

  appData.files.push(newFile);
  saveData();
  renderHome();
  showToast("파일이 추가되었습니다.");
}

function addWorkbook() {
  const file = getFileById(currentFileId);
  if (!file || file.isDefault) return;
  const name = window.prompt("새 단어장 이름을 입력하세요", "새 단어장");
  if (!name || !name.trim()) return;

  const trimmed = name.trim();
  if (file.workbooks.some((wb) => wb.name === trimmed)) {
    showToast("같은 이름의 단어장이 이미 있습니다.", "error");
    return;
  }

  file.workbooks.push({
    id: makeId("workbook"),
    name: trimmed,
    type: "normal",
    isDefault: false,
    words: []
  });

  saveData();
  renderFilePage();
  showToast("단어장이 추가되었습니다.");
}

function renameFile(fileId) {
  const file = getFileById(fileId);
  if (!file || file.isDefault) return;
  const next = window.prompt("새 이름을 입력하세요", file.name);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  file.name = trimmed;
  saveData();
  renderHome();
  if (currentFileId === fileId) renderFilePage();
}

function renameWorkbook(fileId, workbookId) {
  const file = getFileById(fileId);
  if (!file || file.isDefault) return;
  const workbook = getWorkbookById(fileId, workbookId);
  if (!workbook || workbook.isDefault) return;
  const next = window.prompt("새 단어장 이름을 입력하세요", workbook.name);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  workbook.name = trimmed;
  saveData();
  renderFilePage();
  if (currentWorkbookId === workbookId) renderWorkbookPage();
}

function deleteFile(fileId) {
  const file = getFileById(fileId);
  if (!file || file.isDefault) return;
  const ok = window.confirm(`"${file.name}" 파일을 삭제할까요?`);
  if (!ok) return;
  appData.files = appData.files.filter((item) => item.id !== fileId);
  saveData();
  renderHome();
  if (currentFileId === fileId) {
    currentFileId = null;
    showPage("home");
  }
  showToast("파일이 삭제되었습니다.");
}

function deleteWorkbook(fileId, workbookId) {
  const file = getFileById(fileId);
  if (!file || file.isDefault) return;
  const workbook = getWorkbookById(fileId, workbookId);
  if (!workbook || workbook.isDefault) return;
  const ok = window.confirm(`"${workbook.name}" 단어장을 삭제할까요?`);
  if (!ok) return;
  file.workbooks = file.workbooks.filter((wb) => wb.id !== workbookId);
  saveData();
  renderFilePage();
  if (currentWorkbookId === workbookId) {
    currentWorkbookId = null;
    showPage("file");
  }
  showToast("단어장이 삭제되었습니다.");
}

function deleteWord(fileId, workbookId, index) {
  const workbook = getWorkbookById(fileId, workbookId);
  if (!workbook || workbook.isDefault) return;
  workbook.words.splice(index, 1);
  saveData();
  renderWorkbookPage();
}

function openFile(fileId) {
  currentFileId = fileId;
  currentWorkbookId = null;
  renderFilePage();
  showPage("file");
}

function openWorkbook(fileId, workbookId) {
  currentFileId = fileId;
  currentWorkbookId = workbookId;
  renderWorkbookPage();
  showPage("workbook");
}

function deleteAllUserFiles() {
  const userFiles = appData.files.filter((file) => !file.isDefault);
  if (!userFiles.length) {
    showToast("삭제할 사용자 파일이 없습니다.");
    return;
  }

  const ok = window.confirm("현재 만들어진 모든 사용자 파일을 삭제할까요?\n기본 제공 파일은 유지됩니다.");
  if (!ok) return;

  appData.files = createDefaultFiles();
  currentFileId = DEFAULT_FILE_IDS.japanese;
  saveData();
  renderHome();
  showPage("home");
  showToast("사용자 파일만 삭제되었고, 기본 파일은 유지됩니다.");
}

function resetAllData() {
  const ok = window.confirm("전체 기록을 초기화할까요?\n기본 제공 파일과 단어장은 유지됩니다.");
  if (!ok) return;
  appData = { ...getDefaultState(), files: createDefaultFiles() };
  currentFileId = DEFAULT_FILE_IDS.japanese;
  saveData();
  renderHome();
  showPage("home");
  showToast("기본 제공 데이터는 유지되고, 사용자 데이터만 초기화되었습니다.");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function bindStaticEvents() {
  document.getElementById("headerHomeButton")?.addEventListener("click", () => {
    currentFileId = null;
    currentWorkbookId = null;
    renderHome();
    showPage("home");
  });

  document.getElementById("addFileButton")?.addEventListener("click", addFile);
  document.getElementById("emptyAddFileButton")?.addEventListener("click", addFile);
  document.getElementById("deleteAllUserFilesButton")?.addEventListener("click", deleteAllUserFiles);
  document.getElementById("backToHomeButton")?.addEventListener("click", () => {
    currentFileId = null;
    currentWorkbookId = null;
    showPage("home");
  });
  document.getElementById("backToFileButton")?.addEventListener("click", () => {
    if (currentFileId) {
      openFile(currentFileId);
    }
  });

  document.getElementById("addWorkbookButton")?.addEventListener("click", addWorkbook);
  document.getElementById("emptyAddWorkbookButton")?.addEventListener("click", addWorkbook);

  document.getElementById("resetAllDataButton")?.addEventListener("click", resetAllData);
  document.getElementById("specialTestButton")?.addEventListener("click", () => {
    const file = getFileById(currentFileId);
    const workbook = getWorkbookById(currentFileId, currentWorkbookId);
    if (!file || !workbook) return;
    if (workbook.type === "hiragana" || workbook.type === "katakana") startJapaneseWorkbookTest(workbook);
    if (workbook.type === "kanji-level") startKanjiLevelTest(selectedLevel);
  });

  document.getElementById("hanjaListButton")?.addEventListener("click", () => {
    currentHanjaListMode = "level";
    document.getElementById("hanjaListPage")?.classList.add("active");
    renderHanjaListPage();
  });

  document.getElementById("hanjaListBackButton")?.addEventListener("click", () => {
    openWorkbook(currentFileId, currentWorkbookId);
  });

  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;
      if (page === "home") {
        currentFileId = null;
        currentWorkbookId = null;
      }
      showPage(page);
    });
  });
}

function renderHanjaListPage() {
  const levelList = document.getElementById("hanjaListLevelList");
  const titleLabel = document.getElementById("hanjaListTitle");
  const list = document.getElementById("hanjaList");
  if (!levelList || !titleLabel || !list) return;

  levelList.innerHTML = KANJI_LEVELS.map((level) => `
    <button type="button" class="hanja-level-button ${level.name === selectedLevel ? "active" : ""}" data-hanja-level="${level.name}">
      <strong>${level.name}</strong>
      <span>${"⭐".repeat(level.stars)}</span>
    </button>
  `).join("");

  levelList.querySelectorAll("[data-hanja-level]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedLevel = button.dataset.hanjaLevel;
      renderHanjaListPage();
    });
  });

  titleLabel.textContent = `${selectedLevel} 한자 목록`;
  const target = KANJI_LEVELS.find((level) => level.name === selectedLevel) || KANJI_LEVELS[0];
  list.innerHTML = target.words.map((word) => `<div class="hanja-item">${word}</div>`).join("");
}

function initializeDefaultApp() {
  currentFileId = DEFAULT_FILE_IDS.japanese;
  currentWorkbookId = "hiragana-default-book";
  renderHome();
  renderHanjaListPage();
  showPage("home");
}

document.addEventListener("DOMContentLoaded", () => {
  bindStaticEvents();
  initializeDefaultApp();

  const deleteAllButton = document.createElement("button");
  deleteAllButton.id = "deleteAllUserFilesButton";
  deleteAllButton.type = "button";
  deleteAllButton.className = "secondary-button";
  deleteAllButton.textContent = "🗑️ 파일 전체 삭제";
  const addButton = document.getElementById("addFileButton");
  if (addButton && addButton.parentNode) {
    addButton.parentNode.insertBefore(deleteAllButton, addButton.nextSibling);
  }

  deleteAllButton.addEventListener("click", deleteAllUserFiles);

  renderHome();
  renderHanjaListPage();
  showPage("home");
});
