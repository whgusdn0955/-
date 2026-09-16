/* =========================================================
   단어장 앱 - app.js
   index.html 기준 전체 코드
   ========================================================= */

"use strict";

/* =========================================================
   저장 데이터
   ========================================================= */

const STORAGE_KEY = "vocab_test_app_v2";

const DEFAULT_DATA = {
    files: [],
    testRecords: [],
    theme: "light"
};

let appData = loadData();

let currentFileId = null;
let currentWorkbookId = null;

let testState = {
    questions: [],
    currentIndex: 0,
    correct: 0,
    wrong: 0,
    wrongQuestions: [],
    testName: "",
    testType: "",
    sourceFileId: null,
    sourceWorkbookId: null,
    answered: false,
    timer: null,
    timeLeft: 10
};

let draggedFileId = null;
let draggedWorkbookId = null;
let draggedWordId = null;


/* =========================================================
   DOM
   ========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   데이터 저장 / 불러오기
   ========================================================= */

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(DEFAULT_DATA);
        }

        const parsed = JSON.parse(saved);

        return normalizeData(parsed);
    } catch (error) {
        console.error("데이터 불러오기 실패:", error);
        return structuredClone(DEFAULT_DATA);
    }
}


function normalizeData(data) {
    const result = {
        files: Array.isArray(data.files) ? data.files : [],
        testRecords: Array.isArray(data.testRecords)
            ? data.testRecords
            : [],
        theme: data.theme === "dark" ? "dark" : "light"
    };

    result.files = result.files.map(file => ({
        id: file.id || makeId(),
        name: file.name || "새 파일",
        createdAt: file.createdAt || new Date().toISOString(),
        wordbooks: Array.isArray(file.wordbooks)
            ? file.wordbooks.map(book => ({
                id: book.id || makeId(),
                name: book.name || "새 단어장",
                createdAt: book.createdAt || new Date().toISOString(),
                words: Array.isArray(book.words)
                    ? book.words.map(word => ({
                        id: word.id || makeId(),
                        word: word.word || "",
                        meaning: word.meaning || "",
                        correct: Number(word.correct) || 0,
                        wrong: Number(word.wrong) || 0,
                        important: Boolean(word.important)
                    }))
                    : []
            }))
            : []
    }));

    return result;
}


function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}


function makeId() {
    return Date.now().toString(36) +
        Math.random().toString(36).substring(2, 9);
}


/* =========================================================
   HTML 보안
   ========================================================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   공통
   ========================================================= */

function getFile(fileId) {
    return appData.files.find(file => file.id === fileId);
}


function getWorkbook(fileId, workbookId) {
    const file = getFile(fileId);

    if (!file) {
        return null;
    }

    return file.wordbooks.find(book => book.id === workbookId);
}


function getCurrentFile() {
    return getFile(currentFileId);
}


function getCurrentWorkbook() {
    return getWorkbook(currentFileId, currentWorkbookId);
}


function getTotalWordCount(file) {
    if (!file) {
        return 0;
    }

    return file.wordbooks.reduce(
        (total, book) => total + book.words.length,
        0
    );
}


function getAttemptCount(word) {
    return (word.correct || 0) + (word.wrong || 0);
}


function updateImportantStatus(word) {
    const attempts = getAttemptCount(word);

    if (attempts === 0) {
        word.important = false;
        return;
    }

    /*
       틀린 비율이 70%를 "초과"해야 중요 단어
       70% 정확히는 중요 단어가 아님
    */
    word.important =
        (word.wrong / attempts) > 0.7;
}


function formatDateTime(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function formatCurrentMonthDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function showToast(message, type = "normal") {
    const container = $("toastContainer");

    if (!container) {
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2500);
}


/* =========================================================
   화면 전환
   ========================================================= */

const pageMap = {
    home: "homePage",
    statistics: "statisticsPage",
    settings: "settingsPage"
};


function hideAllPages() {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });
}


function showPage(pageName) {
    hideAllPages();

    const pageId = pageMap[pageName];

    if (!pageId) {
        return;
    }

    const page = $(pageId);

    if (page) {
        page.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });

    closeSidebar();
}


function showFilePage(fileId) {
    const file = getFile(fileId);

    if (!file) {
        showHomePage();
        return;
    }

    currentFileId = fileId;
    currentWorkbookId = null;

    hideAllPages();

    const page = $("filePage");

    if (page) {
        page.classList.add("active");
    }

    if ($("currentFileTitle")) {
        $("currentFileTitle").textContent = file.name;
    }

    if ($("currentFileBreadcrumb")) {
        $("currentFileBreadcrumb").textContent = file.name;
    }

    if ($("currentFileDescription")) {
        $("currentFileDescription").textContent =
            `단어장 ${file.wordbooks.length}개 · 총 ${getTotalWordCount(file)}개의 단어`;
    }

    renderWorkbookList();
}


function showWorkbookPage(fileId, workbookId) {
    const workbook = getWorkbook(fileId, workbookId);
    const file = getFile(fileId);

    if (!workbook || !file) {
        showHomePage();
        return;
    }

    currentFileId = fileId;
    currentWorkbookId = workbookId;

    hideAllPages();

    const page = $("workbookPage");

    if (page) {
        page.classList.add("active");
    }

    if ($("currentWorkbookTitle")) {
        $("currentWorkbookTitle").textContent =
            workbook.name;
    }

    if ($("currentWorkbookBreadcrumb")) {
        $("currentWorkbookBreadcrumb").textContent =
            workbook.name;
    }

    renderWordList();
}


function showTestPage() {
    hideAllPages();

    const page = $("testPage");

    if (page) {
        page.classList.add("active");
    }

    const input = $("testAnswerInput");

    if (input) {
        input.focus();
    }
}


function showResultPage() {
    hideAllPages();

    const page = $("resultPage");

    if (page) {
        page.classList.add("active");
    }
}


function showHomePage() {
    stopTimer();

    currentFileId = null;
    currentWorkbookId = null;

    showPage("home");

    renderFileList();
}


/* =========================================================
   사이드바 / 모바일 메뉴
   ========================================================= */

function openSidebar() {
    const sidebar = $("sidebar");

    if (sidebar) {
        sidebar.classList.add("open");
    }
}


function closeSidebar() {
    const sidebar = $("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }
}


/* =========================================================
   파일 목록
   ========================================================= */

function renderFileList() {
    const list = $("fileList");
    const empty = $("emptyFileState");

    if (!list) {
        return;
    }

    if (appData.files.length === 0) {
        list.innerHTML = "";

        if (empty) {
            empty.classList.remove("hidden");
        }

        return;
    }

    if (empty) {
        empty.classList.add("hidden");
    }

    list.innerHTML = appData.files.map(file => {
        const wordCount = getTotalWordCount(file);

        return `
            <div class="file-card"
                 draggable="true"
                 data-file-id="${file.id}">

                <div class="file-card-main"
                     onclick="openFile('${file.id}')">

                    <div class="file-icon">
                        📁
                    </div>

                    <div class="file-info">
                        <h3>
                            ${escapeHTML(file.name)}
                        </h3>

                        <p>
                            단어장 ${file.wordbooks.length}개 ·
                            단어 ${wordCount}개
                        </p>
                    </div>

                </div>

                <div class="file-actions">

                    <button
                        type="button"
                        title="이름 변경"
                        onclick="event.stopPropagation(); renameFile('${file.id}')">
                        ✏️
                    </button>

                    <button
                        type="button"
                        title="삭제"
                        onclick="event.stopPropagation(); deleteFile('${file.id}')">
                        🗑️
                    </button>

                </div>

            </div>
        `;
    }).join("");

    setupFileDragAndDrop();
}


function addFile() {
    const name = prompt("새 파일 이름을 입력하세요.");

    if (!name || !name.trim()) {
        return;
    }

    const file = {
        id: makeId(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        wordbooks: []
    };

    appData.files.push(file);

    saveData();
    renderFileList();

    showToast("파일이 추가되었습니다.");
}


function renameFile(fileId) {
    const file = getFile(fileId);

    if (!file) {
        return;
    }

    const newName = prompt(
        "새 파일 이름을 입력하세요.",
        file.name
    );

    if (!newName || !newName.trim()) {
        return;
    }

    file.name = newName.trim();

    saveData();
    renderFileList();

    if (currentFileId === fileId) {
        if ($("currentFileTitle")) {
            $("currentFileTitle").textContent = file.name;
        }

        if ($("currentFileBreadcrumb")) {
            $("currentFileBreadcrumb").textContent = file.name;
        }
    }

    showToast("파일 이름이 변경되었습니다.");
}


function deleteFile(fileId) {
    const file = getFile(fileId);

    if (!file) {
        return;
    }

    const confirmed = confirm(
        `"${file.name}" 파일을 삭제할까요?\n\n` +
        "파일 안의 모든 단어장과 단어도 함께 삭제됩니다."
    );

    if (!confirmed) {
        return;
    }

    appData.files = appData.files.filter(
        item => item.id !== fileId
    );

    saveData();

    if (currentFileId === fileId) {
        showHomePage();
    } else {
        renderFileList();
    }

    showToast("파일이 삭제되었습니다.");
}


function openFile(fileId) {
    showFilePage(fileId);
}


/* =========================================================
   파일 드래그 정렬
   ========================================================= */

function setupFileDragAndDrop() {
    const cards = document.querySelectorAll(".file-card");

    cards.forEach(card => {
        card.addEventListener("dragstart", () => {
            draggedFileId = card.dataset.fileId;
            card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
            draggedFileId = null;
            card.classList.remove("dragging");
        });

        card.addEventListener("dragover", event => {
            event.preventDefault();
        });

        card.addEventListener("drop", event => {
            event.preventDefault();

            const targetId = card.dataset.fileId;

            if (!draggedFileId || draggedFileId === targetId) {
                return;
            }

            reorderFiles(draggedFileId, targetId);
        });
    });
}


function reorderFiles(sourceId, targetId) {
    const sourceIndex = appData.files.findIndex(
        file => file.id === sourceId
    );

    const targetIndex = appData.files.findIndex(
        file => file.id === targetId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
        return;
    }

    const [moved] = appData.files.splice(sourceIndex, 1);

    appData.files.splice(targetIndex, 0, moved);

    saveData();
    renderFileList();
}


/* =========================================================
   단어장 목록
   ========================================================= */

function renderWorkbookList() {
    const list = $("workbookList");
    const empty = $("emptyWorkbookState");
    const file = getCurrentFile();

    if (!list || !file) {
        return;
    }

    if (file.wordbooks.length === 0) {
        list.innerHTML = "";

        if (empty) {
            empty.classList.remove("hidden");
        }

        return;
    }

    if (empty) {
        empty.classList.add("hidden");
    }

    list.innerHTML = file.wordbooks.map(book => {
        const importantCount = book.words.filter(
            word => word.important
        ).length;

        return `
            <div class="workbook-card"
                 draggable="true"
                 data-workbook-id="${book.id}">

                <div class="workbook-card-main"
                     onclick="openWorkbook('${file.id}', '${book.id}')">

                    <div class="workbook-icon">
                        📖
                    </div>

                    <div class="workbook-info">

                        <h3>
                            ${escapeHTML(book.name)}
                        </h3>

                        <p>
                            ${book.words.length}개 단어
                            ${
                                importantCount > 0
                                    ? ` · ⭐ 중요 ${importantCount}개`
                                    : ""
                            }
                        </p>

                    </div>

                </div>

                <div class="workbook-actions">

                    <button
                        type="button"
                        title="이름 변경"
                        onclick="event.stopPropagation(); renameWorkbook('${book.id}')">
                        ✏️
                    </button>

                    <button
                        type="button"
                        title="삭제"
                        onclick="event.stopPropagation(); deleteWorkbook('${book.id}')">
                        🗑️
                    </button>

                </div>

            </div>
        `;
    }).join("");

    setupWorkbookDragAndDrop();
}


function addWorkbook() {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const name = prompt("새 단어장 이름을 입력하세요.");

    if (!name || !name.trim()) {
        return;
    }

    file.wordbooks.push({
        id: makeId(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        words: []
    });

    saveData();
    renderWorkbookList();

    showToast("단어장이 추가되었습니다.");
}


function renameWorkbook(workbookId) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const workbook = file.wordbooks.find(
        book => book.id === workbookId
    );

    if (!workbook) {
        return;
    }

    const newName = prompt(
        "새 단어장 이름을 입력하세요.",
        workbook.name
    );

    if (!newName || !newName.trim()) {
        return;
    }

    workbook.name = newName.trim();

    saveData();
    renderWorkbookList();

    if (currentWorkbookId === workbookId) {
        if ($("currentWorkbookTitle")) {
            $("currentWorkbookTitle").textContent =
                workbook.name;
        }

        if ($("currentWorkbookBreadcrumb")) {
            $("currentWorkbookBreadcrumb").textContent =
                workbook.name;
        }
    }

    showToast("단어장 이름이 변경되었습니다.");
}


function deleteWorkbook(workbookId) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const workbook = file.wordbooks.find(
        book => book.id === workbookId
    );

    if (!workbook) {
        return;
    }

    const confirmed = confirm(
        `"${workbook.name}" 단어장을 삭제할까요?\n\n` +
        "단어장 안의 모든 단어도 함께 삭제됩니다."
    );

    if (!confirmed) {
        return;
    }

    file.wordbooks = file.wordbooks.filter(
        book => book.id !== workbookId
    );

    saveData();

    if (currentWorkbookId === workbookId) {
        currentWorkbookId = null;
    }

    renderWorkbookList();

    showToast("단어장이 삭제되었습니다.");
}


function openWorkbook(fileId, workbookId) {
    showWorkbookPage(fileId, workbookId);
}


/* =========================================================
   단어장 드래그 정렬
   ========================================================= */

function setupWorkbookDragAndDrop() {
    const cards = document.querySelectorAll(
        ".workbook-card"
    );

    cards.forEach(card => {
        card.addEventListener("dragstart", () => {
            draggedWorkbookId =
                card.dataset.workbookId;

            card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
            draggedWorkbookId = null;
            card.classList.remove("dragging");
        });

        card.addEventListener("dragover", event => {
            event.preventDefault();
        });

        card.addEventListener("drop", event => {
            event.preventDefault();

            const targetId =
                card.dataset.workbookId;

            if (
                !draggedWorkbookId ||
                draggedWorkbookId === targetId
            ) {
                return;
            }

            reorderWorkbooks(
                draggedWorkbookId,
                targetId
            );
        });
    });
}


function reorderWorkbooks(sourceId, targetId) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const sourceIndex = file.wordbooks.findIndex(
        book => book.id === sourceId
    );

    const targetIndex = file.wordbooks.findIndex(
        book => book.id === targetId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
        return;
    }

    const [moved] =
        file.wordbooks.splice(sourceIndex, 1);

    file.wordbooks.splice(targetIndex, 0, moved);

    saveData();
    renderWorkbookList();
}


/* =========================================================
   단어 추가
   ========================================================= */

/*
   입력 형식:

   apple:사과
   apple:사과,과일
   apple:사과 / banana:바나나
*/

function parseBulkInput(input) {
    const results = [];

    const chunks = input
        .split("/")
        .map(item => item.trim())
        .filter(Boolean);

    for (const chunk of chunks) {
        const colonIndex = chunk.indexOf(":");

        if (colonIndex === -1) {
            continue;
        }

        const word = chunk
            .substring(0, colonIndex)
            .trim();

        const meaningText = chunk
            .substring(colonIndex + 1)
            .trim();

        if (!word || !meaningText) {
            continue;
        }

        const meanings = meaningText
            .split(",")
            .map(meaning => meaning.trim())
            .filter(Boolean);

        for (const meaning of meanings) {
            results.push({
                word,
                meaning
            });
        }
    }

    return results;
}


function addBulkWords() {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const input = $("bulkWordInput");

    if (!input) {
        return;
    }

    const text = input.value.trim();

    if (!text) {
        showToast("단어를 입력해주세요.", "error");
        return;
    }

    const parsed = parseBulkInput(text);

    if (parsed.length === 0) {
        showToast(
            "입력 형식을 확인해주세요. 예: apple:사과",
            "error"
        );
        return;
    }

    let added = 0;
    let duplicate = 0;
    let invalid = 0;

    for (const item of parsed) {
        const duplicateExists =
            workbook.words.some(existing =>
                existing.word.trim().toLowerCase() ===
                    item.word.trim().toLowerCase() &&
                existing.meaning.trim() ===
                    item.meaning.trim()
            );

        if (duplicateExists) {
            duplicate++;
            continue;
        }

        if (!item.word || !item.meaning) {
            invalid++;
            continue;
        }

        workbook.words.push({
            id: makeId(),
            word: item.word.trim(),
            meaning: item.meaning.trim(),
            correct: 0,
            wrong: 0,
            important: false
        });

        added++;
    }

    saveData();

    input.value = "";

    renderWordList();

    if (added > 0) {
        showToast(
            `${added}개의 단어가 추가되었습니다.`
        );
    }

    if (duplicate > 0) {
        setTimeout(() => {
            showToast(
                `중복된 단어 ${duplicate}개는 제외되었습니다.`
            );
        }, 300);
    }

    if (invalid > 0) {
        setTimeout(() => {
            showToast(
                `잘못된 입력 ${invalid}개는 제외되었습니다.`,
                "error"
            );
        }, 600);
    }
}


function addSingleWord() {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const word = prompt("영어 단어를 입력하세요.");

    if (!word || !word.trim()) {
        return;
    }

    const meaning = prompt("뜻을 입력하세요.");

    if (!meaning || !meaning.trim()) {
        return;
    }

    const duplicate = workbook.words.some(existing =>
        existing.word.trim().toLowerCase() ===
            word.trim().toLowerCase() &&
        existing.meaning.trim() ===
            meaning.trim()
    );

    if (duplicate) {
        showToast(
            "같은 단어와 뜻이 이미 등록되어 있습니다.",
            "error"
        );
        return;
    }

    workbook.words.push({
        id: makeId(),
        word: word.trim(),
        meaning: meaning.trim(),
        correct: 0,
        wrong: 0,
        important: false
    });

    saveData();
    renderWordList();

    showToast("단어가 추가되었습니다.");
}


/* =========================================================
   단어 목록
   ========================================================= */

function renderWordList() {
    const list = $("wordList");
    const empty = $("emptyWordState");
    const workbook = getCurrentWorkbook();

    if (!list || !workbook) {
        return;
    }

    const words = [...workbook.words].sort((a, b) => {
        if (a.important && !b.important) {
            return -1;
        }

        if (!a.important && b.important) {
            return 1;
        }

        return 0;
    });

    if (words.length === 0) {
        list.innerHTML = "";

        if (empty) {
            empty.classList.remove("hidden");
        }

        updateWordCountUI(0);

        return;
    }

    if (empty) {
        empty.classList.add("hidden");
    }

    updateWordCountUI(workbook.words.length);

    list.innerHTML = words.map((word, index) => {
        const attempts = getAttemptCount(word);

        return `
            <div class="word-card
                        ${word.important ? "important-word" : ""}"
                 draggable="true"
                 data-word-id="${word.id}">

                <div class="word-number">
                    ${index + 1}
                </div>

                <div class="word-main">

                    <div class="word-title">
                        ${
                            word.important
                                ? '<span class="important-star">⭐</span>'
                                : ""
                        }

                        <strong>
                            ${escapeHTML(word.word)}
                        </strong>
                    </div>

                    <div class="word-meaning">
                        ${escapeHTML(word.meaning)}
                    </div>

                    ${
                        attempts > 0
                            ? `
                                <div class="word-stat">
                                    정답 ${word.correct || 0} ·
                                    오답 ${word.wrong || 0}
                                </div>
                            `
                            : ""
                    }

                </div>

                <div class="word-actions">

                    <button
                        type="button"
                        title="수정"
                        onclick="editWord('${word.id}')">
                        ✏️
                    </button>

                    <button
                        type="button"
                        title="삭제"
                        onclick="deleteWord('${word.id}')">
                        🗑️
                    </button>

                </div>

            </div>
        `;
    }).join("");

    setupWordDragAndDrop();
}


function updateWordCountUI(count) {
    if ($("wordCountDescription")) {
        $("wordCountDescription").textContent =
            `${count}개의 단어`;
    }

    if ($("wordListCount")) {
        $("wordListCount").textContent =
            `${count}개`;
    }
}


function editWord(wordId) {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const word = workbook.words.find(
        item => item.id === wordId
    );

    if (!word) {
        return;
    }

    const newWord = prompt(
        "영어 단어를 입력하세요.",
        word.word
    );

    if (!newWord || !newWord.trim()) {
        return;
    }

    const newMeaning = prompt(
        "뜻을 입력하세요.",
        word.meaning
    );

    if (!newMeaning || !newMeaning.trim()) {
        return;
    }

    const duplicate = workbook.words.some(item =>
        item.id !== wordId &&
        item.word.trim().toLowerCase() ===
            newWord.trim().toLowerCase() &&
        item.meaning.trim() ===
            newMeaning.trim()
    );

    if (duplicate) {
        showToast(
            "같은 단어와 뜻이 이미 있습니다.",
            "error"
        );
        return;
    }

    word.word = newWord.trim();
    word.meaning = newMeaning.trim();

    saveData();
    renderWordList();

    showToast("단어가 수정되었습니다.");
}


function deleteWord(wordId) {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const word = workbook.words.find(
        item => item.id === wordId
    );

    if (!word) {
        return;
    }

    const confirmed = confirm(
        `"${word.word}" 단어를 삭제할까요?`
    );

    if (!confirmed) {
        return;
    }

    workbook.words = workbook.words.filter(
        item => item.id !== wordId
    );

    saveData();
    renderWordList();

    showToast("단어가 삭제되었습니다.");
}


/* =========================================================
   단어 드래그 정렬
   ========================================================= */

function setupWordDragAndDrop() {
    const cards = document.querySelectorAll(
        ".word-card"
    );

    cards.forEach(card => {
        card.addEventListener("dragstart", () => {
            draggedWordId =
                card.dataset.wordId;

            card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
            draggedWordId = null;
            card.classList.remove("dragging");
        });

        card.addEventListener("dragover", event => {
            event.preventDefault();
        });

        card.addEventListener("drop", event => {
            event.preventDefault();

            const targetId =
                card.dataset.wordId;

            if (
                !draggedWordId ||
                draggedWordId === targetId
            ) {
                return;
            }

            reorderWords(
                draggedWordId,
                targetId
            );
        });
    });
}


function reorderWords(sourceId, targetId) {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const sourceIndex = workbook.words.findIndex(
        word => word.id === sourceId
    );

    const targetIndex = workbook.words.findIndex(
        word => word.id === targetId
    );

    if (
        sourceIndex === -1 ||
        targetIndex === -1
    ) {
        return;
    }

    const [moved] =
        workbook.words.splice(sourceIndex, 1);

    workbook.words.splice(targetIndex, 0, moved);

    saveData();
    renderWordList();
}


/* =========================================================
   총합 테스트 메뉴
   ========================================================= */

function openTotalTestMenu() {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const totalWords = getTotalWordCount(file);

    if (totalWords === 0) {
        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    openModal(
        "총합 테스트",
        `
            <div class="test-menu">

                <button
                    class="test-menu-button"
                    onclick="closeModal(); startFileTest('all')">

                    <strong>📝 전체 테스트</strong>
                    <span>
                        영어 → 뜻 / 뜻 → 영어
                    </span>

                </button>

                <button
                    class="test-menu-button"
                    onclick="closeModal(); startFileTest('english-to-meaning')">

                    <strong>🇬🇧 파일 이름 → 뜻</strong>
                    <span>
                        영어 단어를 보고 뜻을 입력합니다.
                    </span>

                </button>

                <button
                    class="test-menu-button"
                    onclick="closeModal(); startFileTest('meaning-to-english')">

                    <strong>🇰🇷 뜻 → 파일 이름</strong>
                    <span>
                        뜻을 보고 영어 단어를 입력합니다.
                    </span>

                </button>

                <button
                    class="test-menu-button"
                    onclick="closeModal(); openQuickTestMenu()">

                    <strong>⚡ 빠른 테스트</strong>
                    <span>
                        중요 단어 또는 틀린 단어를 테스트합니다.
                    </span>

                </button>

            </div>
        `,
        ""
    );
}


function openQuickTestMenu() {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const allWords = getAllWordsFromFile(file);

    const importantWords =
        allWords.filter(item => item.word.important);

    const wrongWords =
        allWords.filter(item => item.word.wrong > 0);

    openModal(
        "빠른 테스트",
        `
            <div class="test-menu">

                <button
                    class="test-menu-button"
                    ${
                        importantWords.length === 0
                            ? "disabled"
                            : ""
                    }
                    onclick="closeModal(); startQuickTest('important')">

                    <strong>⭐ 중요 단어 테스트</strong>

                    <span>
                        중요 단어 ${importantWords.length}개
                    </span>

                </button>

                <button
                    class="test-menu-button"
                    ${
                        wrongWords.length === 0
                            ? "disabled"
                            : ""
                    }
                    onclick="closeModal(); startQuickTest('wrong')">

                    <strong>❌ 틀린 단어 테스트</strong>

                    <span>
                        틀린 단어 ${wrongWords.length}개
                    </span>

                </button>

            </div>
        `,
        ""
    );
}


/* =========================================================
   파일 전체 단어
   ========================================================= */

function getAllWordsFromFile(file) {
    const result = [];

    file.wordbooks.forEach(book => {
        book.words.forEach(word => {
            result.push({
                word,
                workbook: book
            });
        });
    });

    return result;
}


/* =========================================================
   테스트 시작
   ========================================================= */

function startFileTest(type) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const all = getAllWordsFromFile(file);

    if (all.length === 0) {
        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    let questions = [];

    if (type === "all") {
        const shuffled = shuffle([...all]);

        questions = shuffled.map(item => {
            const direction =
                Math.random() < 0.5
                    ? "english-to-meaning"
                    : "meaning-to-english";

            return makeQuestion(
                item.word,
                item.workbook,
                direction
            );
        });
    } else {
        questions = shuffle([...all]).map(item =>
            makeQuestion(
                item.word,
                item.workbook,
                type
            )
        );
    }

    startTest(
        questions,
        getTestName(type, file.name),
        type,
        file.id,
        null
    );
}


function startWorkbookTest(type = "all") {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    if (workbook.words.length === 0) {
        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    let questions;

    if (type === "all") {
        questions = shuffle([...workbook.words]).map(word => {
            const direction =
                Math.random() < 0.5
                    ? "english-to-meaning"
                    : "meaning-to-english";

            return makeQuestion(
                word,
                workbook,
                direction
            );
        });
    } else {
        questions = shuffle([...workbook.words]).map(
            word =>
                makeQuestion(
                    word,
                    workbook,
                    type
                )
        );
    }

    startTest(
        questions,
        `${workbook.name} 테스트`,
        type,
        currentFileId,
        currentWorkbookId
    );
}


function startQuickTest(mode) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    let selected;

    const all = getAllWordsFromFile(file);

    if (mode === "important") {
        selected =
            all.filter(item => item.word.important);
    } else {
        selected =
            all.filter(item => item.word.wrong > 0);
    }

    if (selected.length === 0) {
        showToast(
            "해당 단어가 없습니다.",
            "error"
        );
        return;
    }

    const questions = shuffle(selected).map(item =>
        makeQuestion(
            item.word,
            item.workbook,
            "english-to-meaning"
        )
    );

    startTest(
        questions,
        mode === "important"
            ? "⭐ 중요 단어 테스트"
            : "❌ 틀린 단어 테스트",
        "quick",
        file.id,
        null
    );
}


function makeQuestion(word, workbook, direction) {
    return {
        wordId: word.id,
        workbookId: workbook.id,
        word,
        workbook,
        direction,
        question:
            direction === "english-to-meaning"
                ? word.word
                : word.meaning,
        answer:
            direction === "english-to-meaning"
                ? word.meaning
                : word.word
    };
}


function getTestName(type, fileName) {
    if (type === "all") {
        return `${fileName} 전체 테스트`;
    }

    if (type === "english-to-meaning") {
        return `${fileName} 영어 → 뜻`;
    }

    if (type === "meaning-to-english") {
        return `${fileName} 뜻 → 영어`;
    }

    return `${fileName} 테스트`;
}


function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}


/* =========================================================
   테스트 실행
   ========================================================= */

function startTest(
    questions,
    testName,
    testType,
    sourceFileId,
    sourceWorkbookId
) {
    if (!questions || questions.length === 0) {
        showToast(
            "테스트할 문제가 없습니다.",
            "error"
        );
        return;
    }

    stopTimer();

    testState = {
        questions,
        currentIndex: 0,
        correct: 0,
        wrong: 0,
        wrongQuestions: [],
        testName,
        testType,
        sourceFileId,
        sourceWorkbookId,
        answered: false,
        timer: null,
        timeLeft: 10
    };

    showTestPage();

    renderCurrentQuestion();
}


function renderCurrentQuestion() {
    stopTimer();

    const question =
        testState.questions[
            testState.currentIndex
        ];

    if (!question) {
        finishTest();
        return;
    }

    testState.answered = false;
    testState.timeLeft = 10;

    if ($("testQuestionNumber")) {
        $("testQuestionNumber").textContent =
            testState.currentIndex + 1;
    }

    if ($("testTotalQuestions")) {
        $("testTotalQuestions").textContent =
            testState.questions.length;
    }

    if ($("testTypeLabel")) {
        $("testTypeLabel").textContent =
            question.direction ===
            "english-to-meaning"
                ? "영어 → 뜻"
                : "뜻 → 영어";
    }

    if ($("testQuestion")) {
        $("testQuestion").textContent =
            question.question;
    }

    if ($("testTimer")) {
        $("testTimer").textContent = "10";
    }

    const input = $("testAnswerInput");

    if (input) {
        input.value = "";
        input.disabled = false;
        input.focus();
    }

    const feedback = $("testFeedback");

    if (feedback) {
        feedback.classList.add("hidden");
        feedback.innerHTML = "";
    }

    if ($("testSubmitButton")) {
        $("testSubmitButton").textContent =
            "확인";
    }

    startTimer();
}


/* =========================================================
   타이머
   ========================================================= */

function startTimer() {
    stopTimer();

    testState.timeLeft = 10;

    updateTimerUI();

    testState.timer = setInterval(() => {
        if (testState.answered) {
            return;
        }

        testState.timeLeft--;

        updateTimerUI();

        if (testState.timeLeft <= 0) {
            stopTimer();
            submitAnswer(true);
        }
    }, 1000);
}


function updateTimerUI() {
    if ($("testTimer")) {
        $("testTimer").textContent =
            testState.timeLeft;
    }
}


function stopTimer() {
    if (testState.timer) {
        clearInterval(testState.timer);
        testState.timer = null;
    }
}


/* =========================================================
   답안 제출
   ========================================================= */

function submitAnswer(timeOut = false) {
    if (testState.answered) {
        nextQuestion();
        return;
    }

    const question =
        testState.questions[
            testState.currentIndex
        ];

    if (!question) {
        return;
    }

    stopTimer();

    const input = $("testAnswerInput");

    const userAnswer =
        input ? input.value.trim() : "";

    let isCorrect = false;

    if (!timeOut) {
        isCorrect = checkAnswer(
            userAnswer,
            question.answer,
            question.direction
        );
    }

    testState.answered = true;

    if (isCorrect) {
        testState.correct++;
    } else {
        testState.wrong++;

        testState.wrongQuestions.push(
            question
        );
    }

    updateWordStatistics(
        question,
        isCorrect
    );

    showAnswerFeedback(
        question,
        isCorrect,
        userAnswer,
        timeOut
    );

    if (input) {
        input.disabled = true;
    }

    if ($("testSubmitButton")) {
        $("testSubmitButton").textContent =
            testState.currentIndex ===
            testState.questions.length - 1
                ? "결과 보기"
                : "다음 문제";
    }
}


function checkAnswer(
    userAnswer,
    correctAnswer,
    direction
) {
    const user = String(
        userAnswer || ""
    ).trim();

    const correct = String(
        correctAnswer || ""
    ).trim();

    /*
       영어 → 뜻:
       앞뒤 공백 제거 후 정확히 비교

       뜻 → 영어:
       앞뒤 공백 제거 후 대소문자 무시
    */

    if (direction === "english-to-meaning") {
        return user === correct;
    }

    return user.toLowerCase() ===
        correct.toLowerCase();
}


function updateWordStatistics(
    question,
    isCorrect
) {
    const file = getFile(
        question.sourceFileId ||
        testState.sourceFileId
    );

    const targetFile =
        file ||
        getFile(testState.sourceFileId);

    if (!targetFile) {
        return;
    }

    const workbook =
        getWorkbook(
            targetFile.id,
            question.workbookId
        );

    if (!workbook) {
        return;
    }

    const word = workbook.words.find(
        item => item.id === question.wordId
    );

    if (!word) {
        return;
    }

    if (isCorrect) {
        word.correct =
            (word.correct || 0) + 1;
    } else {
        word.wrong =
            (word.wrong || 0) + 1;
    }

    updateImportantStatus(word);

    saveData();
}


function showAnswerFeedback(
    question,
    isCorrect,
    userAnswer,
    timeOut
) {
    const feedback = $("testFeedback");

    if (!feedback) {
        return;
    }

    feedback.classList.remove("hidden");

    if (isCorrect) {
        feedback.innerHTML = `
            <div class="feedback-correct">
                <strong>⭕ 정답!</strong>
                <span>${escapeHTML(question.answer)}</span>
            </div>
        `;
    } else {
        feedback.innerHTML = `
            <div class="feedback-wrong">
                <strong>
                    ❌ ${timeOut ? "시간 초과!" : "오답!"}
                </strong>

                ${
                    userAnswer
                        ? `
                            <span>
                                입력한 답:
                                ${escapeHTML(userAnswer)}
                            </span>
                        `
                        : `
                            <span>
                                입력한 답이 없습니다.
                            </span>
                        `
                }

                <span>
                    정답:
                    <strong>
                        ${escapeHTML(question.answer)}
                    </strong>
                </span>
            </div>
        `;
    }
}


/* =========================================================
   다음 문제
   ========================================================= */

function nextQuestion() {
    if (!testState.answered) {
        submitAnswer(false);
        return;
    }

    if (
        testState.currentIndex >=
        testState.questions.length - 1
    ) {
        finishTest();
        return;
    }

    testState.currentIndex++;

    renderCurrentQuestion();
}


/* =========================================================
   테스트 종료
   ========================================================= */

function finishTest() {
    stopTimer();

    const total =
        testState.questions.length;

    const correct =
        testState.correct;

    const wrong =
        testState.wrong;

    const record = {
        id: makeId(),
        date: new Date().toISOString(),
        fileName: getFileNameForTest(),
        testName: testState.testName,
        total,
        correct,
        wrong
    };

    appData.testRecords.unshift(record);

    saveData();

    if ($("resultTestName")) {
        $("resultTestName").textContent =
            testState.testName;
    }

    if ($("resultCorrect")) {
        $("resultCorrect").textContent =
            correct;
    }

    if ($("resultWrong")) {
        $("resultWrong").textContent =
            wrong;
    }

    if ($("resultTotal")) {
        $("resultTotal").textContent =
            total;
    }

    showResultPage();
}


function getFileNameForTest() {
    const file =
        getFile(testState.sourceFileId);

    if (file) {
        return file.name;
    }

    return "알 수 없는 파일";
}


/* =========================================================
   틀린 문제 다시 풀기
   ========================================================= */

function retryWrongQuestions() {
    if (
        !testState.wrongQuestions ||
        testState.wrongQuestions.length === 0
    ) {
        showToast(
            "틀린 문제가 없습니다."
        );
        return;
    }

    const questions =
        shuffle(
            [...testState.wrongQuestions]
        ).map(question => ({
            ...question
        }));

    startTest(
        questions,
        `${testState.testName} - 틀린 문제`,
        "wrong-retry",
        testState.sourceFileId,
        testState.sourceWorkbookId
    );
}


/* =========================================================
   통계
   ========================================================= */

function renderStatistics() {
    const summary = $("statisticsSummary");
    const list = $("statisticsList");
    const empty = $("emptyStatisticsState");

    const records = appData.testRecords;

    if (records.length === 0) {
        if (summary) {
            summary.innerHTML = "";
        }

        if (list) {
            list.innerHTML = "";
        }

        if (empty) {
            empty.classList.remove("hidden");
        }

        return;
    }

    if (empty) {
        empty.classList.add("hidden");
    }

    renderStatisticsSummary(records);
    renderStatisticsList(records);
}


function renderStatisticsSummary(records) {
    const summary = $("statisticsSummary");

    if (!summary) {
        return;
    }

    const totalTests = records.length;

    const totalQuestions =
        records.reduce(
            (sum, record) =>
                sum + Number(record.total || 0),
            0
        );

    const totalCorrect =
        records.reduce(
            (sum, record) =>
                sum + Number(record.correct || 0),
            0
        );

    const totalWrong =
        records.reduce(
            (sum, record) =>
                sum + Number(record.wrong || 0),
            0
        );

    const accuracy =
        totalQuestions > 0
            ? Math.round(
                totalCorrect /
                totalQuestions *
                100
            )
            : 0;

    summary.innerHTML = `
        <div class="statistics-card">
            <span>📝</span>
            <strong>${totalTests}</strong>
            <small>테스트</small>
        </div>

        <div class="statistics-card">
            <span>📚</span>
            <strong>${totalQuestions}</strong>
            <small>문제</small>
        </div>

        <div class="statistics-card">
            <span>⭕</span>
            <strong>${totalCorrect}</strong>
            <small>정답</small>
        </div>

        <div class="statistics-card">
            <span>🎯</span>
            <strong>${accuracy}%</strong>
            <small>정답률</small>
        </div>
    `;
}


function renderStatisticsList(records) {
    const list = $("statisticsList");

    if (!list) {
        return;
    }

    const sorted = [...records].sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );

    const now = new Date();

    const currentMonthKey =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}`;

    const currentYear =
        now.getFullYear();

    const currentMonthRecords = [];
    const previousMonthGroups = {};
    const previousYearGroups = {};

    sorted.forEach(record => {
        const date = new Date(record.date);

        if (Number.isNaN(date.getTime())) {
            return;
        }

        const year =
            date.getFullYear();

        const month =
            String(date.getMonth() + 1)
                .padStart(2, "0");

        const monthKey =
            `${year}-${month}`;

        if (monthKey === currentMonthKey) {
            currentMonthRecords.push(record);
            return;
        }

        if (year === currentYear) {
            if (!previousMonthGroups[monthKey]) {
                previousMonthGroups[monthKey] = [];
            }

            previousMonthGroups[monthKey].push(
                record
            );

            return;
        }

        const yearKey = String(year);

        if (!previousYearGroups[yearKey]) {
            previousYearGroups[yearKey] = {};
        }

        if (!previousYearGroups[yearKey][monthKey]) {
            previousYearGroups[yearKey][monthKey] = [];
        }

        previousYearGroups[yearKey][monthKey].push(
            record
        );
    });

    let html = "";

    /* 현재 달 */

    if (currentMonthRecords.length > 0) {
        html += `
            <div class="statistics-group">
                <h2>이번 달</h2>

                ${currentMonthRecords
                    .map(record =>
                        renderStatisticRecord(
                            record,
                            true
                        )
                    )
                    .join("")}
            </div>
        `;
    }

    /* 이전 달 */

    const monthKeys =
        Object.keys(previousMonthGroups)
            .sort()
            .reverse();

    monthKeys.forEach(monthKey => {
        const [year, month] =
            monthKey.split("-");

        html += `
            <div class="statistics-group">

                <h2>
                    ${year}년 ${Number(month)}월
                </h2>

                ${previousMonthGroups[monthKey]
                    .map(record =>
                        renderStatisticRecord(
                            record,
                            false
                        )
                    )
                    .join("")}

            </div>
        `;
    });

    /* 이전 연도 */

    const yearKeys =
        Object.keys(previousYearGroups)
            .sort()
            .reverse();

    yearKeys.forEach(year => {
        const months =
            Object.keys(
                previousYearGroups[year]
            )
            .sort()
            .reverse();

        html += `
            <div class="statistics-year-group">

                <h2>${year}년</h2>
        `;

        months.forEach(monthKey => {
            const month =
                Number(
                    monthKey.split("-")[1]
                );

            html += `
                <div class="statistics-month-group">

                    <h3>
                        ${month}월
                    </h3>

                    ${previousYearGroups[year][monthKey]
                        .map(record =>
                            renderStatisticRecord(
                                record,
                                false
                            )
                        )
                        .join("")}

                </div>
            `;
        });

        html += `
            </div>
        `;
    });

    list.innerHTML =
        html ||
        `
            <div class="empty-state">
                <p>통계 기록이 없습니다.</p>
            </div>
        `;
}


function renderStatisticRecord(
    record,
    isCurrentMonth
) {
    const dateText =
        isCurrentMonth
            ? formatCurrentMonthDate(record.date)
            : formatDateTime(record.date);

    return `
        <div class="statistic-record">

            <div class="statistic-record-info">

                <strong>
                    ${escapeHTML(
                        record.testName ||
                        "단어 테스트"
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        record.fileName ||
                        "파일 없음"
                    )}
                </span>

                <small>
                    ${dateText}
                </small>

            </div>

            <div class="statistic-record-score">

                <strong>
                    ${record.correct || 0}
                    /
                    ${record.total || 0}
                </strong>

                <span>
                    ⭕ ${record.correct || 0}
                    ·
                    ❌ ${record.wrong || 0}
                </span>

            </div>

        </div>
    `;
}


/* =========================================================
   설정 - 테마
   ========================================================= */

function applyTheme() {
    const isDark =
        appData.theme === "dark";

    document.documentElement.dataset.theme =
        isDark ? "dark" : "light";

    document.body.classList.toggle(
        "dark-mode",
        isDark
    );

    const toggle =
        $("darkModeToggle");

    if (toggle) {
        toggle.checked = isDark;
    }

    const button =
        $("headerThemeButton");

    if (button) {
        button.textContent =
            isDark ? "☀️" : "🌙";
    }
}


function toggleTheme() {
    appData.theme =
        appData.theme === "dark"
            ? "light"
            : "dark";

    saveData();
    applyTheme();
}


/* =========================================================
   데이터 내보내기
   ========================================================= */

function exportData() {
    const exportObject = {
        appName: "단어장",
        version: 2,
        exportedAt: new Date().toISOString(),
        data: appData
    };

    const json =
        JSON.stringify(
            exportObject,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            {
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    const date =
        new Date()
            .toISOString()
            .slice(0, 10);

    link.href = url;
    link.download =
        `단어장_백업_${date}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showToast(
        "데이터를 내보냈습니다."
    );
}


/* =========================================================
   데이터 가져오기
   ========================================================= */

function importData() {
    const input =
        $("importFileInput");

    if (!input) {
        return;
    }

    input.value = "";
    input.click();
}


function handleImportFile(event) {
    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload = () => {
        try {
            const parsed =
                JSON.parse(
                    reader.result
                );

            let importedData;

            if (
                parsed &&
                parsed.data &&
                typeof parsed.data === "object"
            ) {
                importedData =
                    parsed.data;
            } else {
                importedData =
                    parsed;
            }

            if (
                !importedData ||
                !Array.isArray(
                    importedData.files
                )
            ) {
                throw new Error(
                    "올바른 단어장 백업 파일이 아닙니다."
                );
            }

            const confirmed =
                confirm(
                    "현재 데이터가 가져온 데이터로 교체됩니다.\n\n" +
                    "계속하시겠습니까?"
                );

            if (!confirmed) {
                return;
            }

            appData =
                normalizeData(
                    importedData
                );

            saveData();
            applyTheme();

            currentFileId = null;
            currentWorkbookId = null;

            renderFileList();

            showHomePage();

            showToast(
                "데이터를 가져왔습니다."
            );

        } catch (error) {
            console.error(error);

            showToast(
                "데이터 파일을 읽을 수 없습니다.",
                "error"
            );
        }
    };

    reader.readAsText(file, "UTF-8");
}


/* =========================================================
   사용 방법
   ========================================================= */

function toggleUsageGuide() {
    const content =
        $("usageGuideContent");

    const arrow =
        $("usageGuideArrow");

    if (!content) {
        return;
    }

    const isHidden =
        content.classList.contains(
            "hidden"
        );

    content.classList.toggle(
        "hidden",
        !isHidden
    );

    if (arrow) {
        arrow.textContent =
            isHidden ? "⌃" : "⌄";
    }
}


/* =========================================================
   모달
   ========================================================= */

function openModal(
    title,
    body,
    footer = ""
) {
    const overlay =
        $("modalOverlay");

    if (!overlay) {
        return;
    }

    if ($("modalTitle")) {
        $("modalTitle").textContent =
            title;
    }

    if ($("modalBody")) {
        $("modalBody").innerHTML =
            body;
    }

    if ($("modalFooter")) {
        $("modalFooter").innerHTML =
            footer;
    }

    overlay.classList.remove(
        "hidden"
    );
}


function closeModal() {
    const overlay =
        $("modalOverlay");

    if (overlay) {
        overlay.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   뒤로가기
   ========================================================= */

function goBackToHome() {
    showHomePage();
}


function goBackToFile() {
    if (!currentFileId) {
        showHomePage();
        return;
    }

    showFilePage(
        currentFileId
    );
}


function goToResultHome() {
    showHomePage();
}


function goToResultBack() {
    if (
        testState.sourceWorkbookId &&
        testState.sourceFileId
    ) {
        showWorkbookPage(
            testState.sourceFileId,
            testState.sourceWorkbookId
        );

        return;
    }

    if (testState.sourceFileId) {
        showFilePage(
            testState.sourceFileId
        );

        return;
    }

    showHomePage();
}


/* =========================================================
   네비게이션 이벤트
   ========================================================= */

function setupNavigation() {
    document.querySelectorAll(
        ".nav-item, .mobile-nav-item"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const page =
                    button.dataset.page;

                if (page === "home") {
                    showHomePage();
                }

                if (page === "statistics") {
                    showPage("statistics");
                    renderStatistics();
                }

                if (page === "settings") {
                    showPage("settings");
                }
            }
        );
    });
}


/* =========================================================
   키보드 이벤트
   ========================================================= */

function setupKeyboardEvents() {
    document.addEventListener(
        "keydown",
        event => {
            const activePage =
                document.querySelector(
                    ".page.active"
                );

            if (!activePage) {
                return;
            }

            if (
                activePage.id !==
                "testPage"
            ) {
                return;
            }

            if (
                event.key !== "Enter"
            ) {
                return;
            }

            event.preventDefault();

            if (testState.answered) {
                nextQuestion();
            } else {
                submitAnswer(false);
            }
        }
    );
}


/* =========================================================
   클릭 이벤트
   ========================================================= */

function setupButtons() {
    /* 파일 추가 */

    if ($("addFileButton")) {
        $("addFileButton")
            .addEventListener(
                "click",
                addFile
            );
    }

    if ($("emptyAddFileButton")) {
        $("emptyAddFileButton")
            .addEventListener(
                "click",
                addFile
            );
    }


    /* 파일 이동 */

    if ($("backToHomeButton")) {
        $("backToHomeButton")
            .addEventListener(
                "click",
                goBackToHome
            );
    }


    /* 단어장 추가 */

    if ($("addWorkbookButton")) {
        $("addWorkbookButton")
            .addEventListener(
                "click",
                addWorkbook
            );
    }

    if ($("emptyAddWorkbookButton")) {
        $("emptyAddWorkbookButton")
            .addEventListener(
                "click",
                addWorkbook
            );
    }


    /* 단어장 이동 */

    if ($("backToFileButton")) {
        $("backToFileButton")
            .addEventListener(
                "click",
                goBackToFile
            );
    }


    /* 단어 추가 */

    if ($("addWordButton")) {
        $("addWordButton")
            .addEventListener(
                "click",
                addSingleWord
            );
    }

    if ($("bulkAddWordButton")) {
        $("bulkAddWordButton")
            .addEventListener(
                "click",
                addBulkWords
            );
    }


    /* 총합 테스트 */

    if ($("fileTestButton")) {
        $("fileTestButton")
            .addEventListener(
                "click",
                openTotalTestMenu
            );
    }


    /* 테스트 */

    if ($("testSubmitButton")) {
        $("testSubmitButton")
            .addEventListener(
                "click",
                () => submitAnswer(false)
            );
    }


    /* 결과 */

    if ($("resultHomeButton")) {
        $("resultHomeButton")
            .addEventListener(
                "click",
                goToResultHome
            );
    }

    if ($("resultBackButton")) {
        $("resultBackButton")
            .addEventListener(
                "click",
                goToResultBack
            );
    }

    if ($("retryWrongButton")) {
        $("retryWrongButton")
            .addEventListener(
                "click",
                retryWrongQuestions
            );
    }


    /* 테마 */

    if ($("darkModeToggle")) {
        $("darkModeToggle")
            .addEventListener(
                "change",
                () => {
                    appData.theme =
                        $("darkModeToggle").checked
                            ? "dark"
                            : "light";

                    saveData();
                    applyTheme();
                }
            );
    }

    if ($("headerThemeButton")) {
        $("headerThemeButton")
            .addEventListener(
                "click",
                toggleTheme
            );
    }


    /* 데이터 */

    if ($("exportDataButton")) {
        $("exportDataButton")
            .addEventListener(
                "click",
                exportData
            );
    }

    if ($("importDataButton")) {
        $("importDataButton")
            .addEventListener(
                "click",
                importData
            );
    }

    if ($("importFileInput")) {
        $("importFileInput")
            .addEventListener(
                "change",
                handleImportFile
            );
    }


    /* 사용 방법 */

    if ($("usageGuideButton")) {
        $("usageGuideButton")
            .addEventListener(
                "click",
                toggleUsageGuide
            );
    }


    /* 모달 */

    if ($("modalCloseButton")) {
        $("modalCloseButton")
            .addEventListener(
                "click",
                closeModal
            );
    }

    if ($("modalOverlay")) {
        $("modalOverlay")
            .addEventListener(
                "click",
                event => {
                    if (
                        event.target ===
                        $("modalOverlay")
                    ) {
                        closeModal();
                    }
                }
            );
    }


    /* 모바일 메뉴 */

    if ($("mobileMenuButton")) {
        $("mobileMenuButton")
            .addEventListener(
                "click",
                openSidebar
            );
    }


    /* 헤더 홈 */

    if ($("headerHomeButton")) {
        $("headerHomeButton")
            .addEventListener(
                "click",
                showHomePage
            );
    }
}


/* =========================================================
   PWA 서비스 워커
   ========================================================= */

function registerServiceWorker() {
    if (
        "serviceWorker" in navigator
    ) {
        window.addEventListener(
            "load",
            () => {
                navigator.serviceWorker
                    .register("./sw.js")
                    .then(registration => {
                        console.log(
                            "Service Worker 등록 완료:",
                            registration.scope
                        );
                    })
                    .catch(error => {
                        console.error(
                            "Service Worker 등록 실패:",
                            error
                        );
                    });
            }
        );
    }
}


/* =========================================================
   초기화
   ========================================================= */

function initializeApp() {
    applyTheme();

    setupNavigation();

    setupButtons();

    setupKeyboardEvents();

    renderFileList();

    showHomePage();

    registerServiceWorker();

    console.log(
        "단어장 앱이 정상적으로 시작되었습니다."
    );
}


/* =========================================================
   시작
   ========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );
} else {
    initializeApp();
}


/* =========================================================
   HTML onclick에서 사용할 함수 전역 등록
   ========================================================= */

window.openFile = openFile;
window.renameFile = renameFile;
window.deleteFile = deleteFile;

window.openWorkbook = openWorkbook;
window.renameWorkbook = renameWorkbook;
window.deleteWorkbook = deleteWorkbook;

window.editWord = editWord;
window.deleteWord = deleteWord;

window.closeModal = closeModal;

window.openQuickTestMenu =
    openQuickTestMenu;

window.startFileTest =
    startFileTest;

window.startQuickTest =
    startQuickTest;
