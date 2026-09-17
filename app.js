"use strict";

/* =========================================================
   단어 암기장
   최종 통합 app.js
   ========================================================= */

const APP_VERSION = "1.1.0";
const STORAGE_KEY = "word_memorize_app_final_v1";
const OLD_STORAGE_KEY = "vocab_test_app_v2";
const WORD_PAGE_SIZE = 40;
const STORAGE_SOFT_LIMIT = 4 * 1024 * 1024;

/* =========================================================
   기본 데이터
   ========================================================= */

const DEFAULT_DATA = {
    files: [],
    testRecords: [],
    theme: "light",
    testTime: 10
};

const USAGE_GUIDE = [
    {
        version: "1.0.0",
        since: "1.0.0",
        title: "기본 기능",
        text: "파일과 단어장을 만들고 단어를 추가할 수 있습니다. 단어 입력에서는 :로 영어와 뜻을 구분하고, ,로 여러 뜻을 입력하며, /로 여러 단어를 한 번에 입력할 수 있습니다."
    },
    {
        version: "1.1.0",
        since: "1.1.0",
        title: "테스트 기능 개선",
        text: "일반 테스트와 단어장 테스트에서 문제 순서가 랜덤으로 출제됩니다. 전체 테스트에서는 영어 → 뜻과 뜻 → 영어가 문제마다 랜덤으로 출제됩니다."
    },
    {
        version: "1.1.0",
        since: "1.1.0",
        title: "테스트 시간 설정",
        text: "설정에서 문제당 제한 시간을 5초, 10초, 15초, 20초, 30초, 60초 중에서 선택할 수 있습니다."
    },
    {
        version: "1.1.0",
        since: "1.1.0",
        title: "모바일 화면 개선",
        text: "휴대폰의 기본 화면 영역과 겹치지 않도록 하단 메뉴와 화면 여백을 조정했습니다. 왼쪽 메뉴는 왼쪽으로 밀어서 닫을 수 있습니다."
    }
];

/* =========================================================
   DOM
   ========================================================= */

const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];

/* =========================================================
   공통 함수
   ========================================================= */

function makeId(prefix = "id") {
    if (window.crypto?.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

function nowISO() {
    return new Date().toISOString();
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return map[char];
    });
}

function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function trimText(value) {
    return String(value ?? "").trim();
}

function safeClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function formatDate(iso) {
    try {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

function formatDateTime(iso) {
    try {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

function formatTime(iso) {
    try {
        return new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

/* =========================================================
   데이터 정규화
   ========================================================= */

function normalizeData(raw) {
    const data = raw && typeof raw === "object"
        ? raw
        : safeClone(DEFAULT_DATA);

    if (!Array.isArray(data.files)) {
        data.files = [];
    }

    if (!Array.isArray(data.testRecords)) {
        data.testRecords = [];
    }

    if (!["light", "dark"].includes(data.theme)) {
        data.theme = "light";
    }

    data.testTime = normalizeTestTime(data.testTime);

    data.files = data.files
        .filter(file => file && typeof file === "object")
        .map(file => {
            const normalizedFile = {
                id: file.id || makeId("file"),
                name: trimText(file.name) || "새 파일",
                description: trimText(file.description),
                createdAt: file.createdAt || nowISO(),
                wordbooks: Array.isArray(file.wordbooks)
                    ? file.wordbooks
                    : []
            };

            normalizedFile.wordbooks =
                normalizedFile.wordbooks
                    .filter(workbook =>
                        workbook &&
                        typeof workbook === "object"
                    )
                    .map(workbook => {
                        const normalizedWorkbook = {
                            id: workbook.id || makeId("workbook"),
                            name: trimText(workbook.name) || "새 단어장",
                            createdAt:
                                workbook.createdAt || nowISO(),
                            words: Array.isArray(workbook.words)
                                ? workbook.words
                                : []
                        };

                        normalizedWorkbook.words =
                            normalizedWorkbook.words
                                .filter(word =>
                                    word &&
                                    typeof word === "object"
                                )
                                .map(word => {
                                    const meanings =
                                        Array.isArray(word.meanings)
                                            ? word.meanings
                                            : word.meaning
                                                ? [word.meaning]
                                                : [];

                                    const normalizedMeanings =
                                        meanings
                                            .map(meaning => {
                                                if (
                                                    typeof meaning ===
                                                    "object"
                                                ) {
                                                    return trimText(
                                                        meaning.text
                                                    );
                                                }

                                                return trimText(meaning);
                                            })
                                            .filter(Boolean)
                                            .filter(
                                                (meaning, index, array) =>
                                                    array.findIndex(
                                                        item =>
                                                            normalizeText(
                                                                item
                                                            ) ===
                                                            normalizeText(
                                                                meaning
                                                            )
                                                    ) === index
                                            );

                                    const attempts =
                                        Number(
                                            word.correct || 0
                                        ) +
                                        Number(
                                            word.wrong || 0
                                        );

                                    return {
                                        id:
                                            word.id ||
                                            makeId("word"),
                                        word:
                                            trimText(
                                                word.word ??
                                                word.english
                                            ),
                                        meanings:
                                            normalizedMeanings,
                                        correct:
                                            Number(
                                                word.correct || 0
                                            ),
                                        wrong:
                                            Number(
                                                word.wrong || 0
                                            ),
                                        important:
                                            Boolean(
                                                word.important
                                            ),
                                        createdAt:
                                            word.createdAt ||
                                            nowISO(),
                                        attempts
                                    };
                                })
                                .filter(
                                    word =>
                                        word.word &&
                                        word.meanings.length
                                );

                        return normalizedWorkbook;
                    });

            return normalizedFile;
        });

    return data;
}

/* =========================================================
   저장 / 불러오기
   ========================================================= */

function loadData() {
    try {
        const current =
            localStorage.getItem(STORAGE_KEY);

        if (current) {
            return normalizeData(JSON.parse(current));
        }

        const old =
            localStorage.getItem(OLD_STORAGE_KEY);

        if (old) {
            try {
                const parsed = JSON.parse(old);

                if (parsed && typeof parsed === "object") {
                    return normalizeData(parsed);
                }
            } catch {
                /* 이전 데이터가 잘못된 경우 기본값 사용 */
            }
        }
    } catch {
        /* 기본값 사용 */
    }

    return safeClone(DEFAULT_DATA);
}

function saveData() {
    try {
        const raw = JSON.stringify(appData);

        if (new Blob([raw]).size > STORAGE_SOFT_LIMIT) {
            showToast(
                "저장 공간이 부족합니다.",
                "error"
            );
            return false;
        }

        localStorage.setItem(
            STORAGE_KEY,
            raw
        );

        return true;
    } catch {
        showToast(
            "데이터 저장에 실패했습니다.",
            "error"
        );

        return false;
    }
}

function normalizeTestTime(value) {
    const allowed = [5, 10, 15, 20, 30, 60];
    const number = Number(value);

    return allowed.includes(number)
        ? number
        : 10;
}

function getTestTime() {
    return normalizeTestTime(appData.testTime);
}

/* =========================================================
   전역 상태
   ========================================================= */

let appData = loadData();

let currentFileId = null;
let currentWorkbookId = null;

let currentPage = "homePage";

let draggedFileId = null;
let draggedWorkbookId = null;
let draggedWordId = null;

let selectedWordIds = new Set();

let testState = {
    questions: [],
    currentIndex: 0,
    correct: 0,
    wrong: 0,
    wrongQuestions: [],
    testName: "",
    testType: "all",
    sourceFileId: null,
    sourceWorkbookId: null,
    answered: false,
    timer: null,
    timeLeft: 10,
    autoNextTimer: null
};

let modalConfirmCallback = null;
let modalCancelCallback = null;

/* =========================================================
   데이터 조회
   ========================================================= */

function getFileById(fileId) {
    return appData.files.find(
        file => file.id === fileId
    );
}

function getWorkbookById(fileId, workbookId) {
    const file = getFileById(fileId);

    if (!file) {
        return null;
    }

    return file.wordbooks.find(
        workbook => workbook.id === workbookId
    );
}

function getAllWords() {
    const result = [];

    for (const file of appData.files) {
        for (const workbook of file.wordbooks) {
            for (const word of workbook.words) {
                result.push({
                    file,
                    workbook,
                    word
                });
            }
        }
    }

    return result;
}

function getCurrentFile() {
    return getFileById(currentFileId);
}

function getCurrentWorkbook() {
    return getWorkbookById(
        currentFileId,
        currentWorkbookId
    );
}

function getWordById(wordId) {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return null;
    }

    return workbook.words.find(
        word => word.id === wordId
    );
}

/* =========================================================
   단어 통계
   ========================================================= */

function getAttempts(word) {
    return (
        Number(word.correct || 0) +
        Number(word.wrong || 0)
    );
}

function getWrongRate(word) {
    const attempts = getAttempts(word);

    if (!attempts) {
        return 0;
    }

    return (
        Number(word.wrong || 0) /
        attempts
    );
}

function updateImportantStatus(word) {
    const attempts = getAttempts(word);

    if (!attempts) {
        return;
    }

    word.important =
        Number(word.wrong || 0) /
        attempts >
        0.7;
}

/* =========================================================
   파일 관리
   ========================================================= */

function addFile() {
    openInputModal(
        "파일 추가",
        "파일 이름을 입력하세요",
        name => {
            name = trimText(name);

            if (!name) {
                showToast(
                    "파일 이름을 입력해주세요.",
                    "error"
                );
                return false;
            }

            if (
                appData.files.some(
                    file =>
                        normalizeText(file.name) ===
                        normalizeText(name)
                )
            ) {
                showToast(
                    "같은 이름의 파일이 이미 있습니다.",
                    "error"
                );
                return false;
            }

            appData.files.push({
                id: makeId("file"),
                name,
                description: "",
                createdAt: nowISO(),
                wordbooks: []
            });

            saveData();
            renderHome();

            showToast(
                "파일이 추가되었습니다.",
                "success"
            );

            return true;
        }
    );
}

function renameFile(fileId) {
    const file = getFileById(fileId);

    if (!file) {
        return;
    }

    openInputModal(
        "파일 이름 변경",
        "새 파일 이름을 입력하세요",
        name => {
            name = trimText(name);

            if (!name) {
                showToast(
                    "파일 이름을 입력해주세요.",
                    "error"
                );
                return false;
            }

            if (
                appData.files.some(
                    item =>
                        item.id !== file.id &&
                        normalizeText(item.name) ===
                        normalizeText(name)
                )
            ) {
                showToast(
                    "같은 이름의 파일이 이미 있습니다.",
                    "error"
                );
                return false;
            }

            file.name = name;
            saveData();

            if (currentFileId === file.id) {
                renderFilePage();
            }

            renderHome();

            showToast(
                "파일 이름이 변경되었습니다.",
                "success"
            );

            return true;
        },
        file.name
    );
}

function deleteFile(fileId) {
    const file = getFileById(fileId);

    if (!file) {
        return;
    }

    confirmModal(
        "파일 삭제",
        `"${file.name}" 파일과 안에 있는 모든 단어장을 삭제하시겠습니까?`,
        () => {
            appData.files =
                appData.files.filter(
                    item => item.id !== fileId
                );

            if (currentFileId === fileId) {
                currentFileId = null;
                currentWorkbookId = null;
            }

            saveData();
            renderHome();

            showToast(
                "파일이 삭제되었습니다.",
                "success"
            );
        }
    );
}

/* =========================================================
   파일 페이지
   ========================================================= */

function showFilePage(fileId) {
    const file = getFileById(fileId);

    if (!file) {
        renderHome();
        return;
    }

    currentFileId = fileId;
    currentWorkbookId = null;

    showPage("filePage");
    renderFilePage();
}

function renderFilePage() {
    const file = getCurrentFile();

    if (!file) {
        renderHome();
        return;
    }

    if ($("currentFileBreadcrumb")) {
        $("currentFileBreadcrumb").textContent =
            file.name;
    }

    if ($("currentFileTitle")) {
        $("currentFileTitle").textContent =
            file.name;
    }

    if ($("currentFileDescription")) {
        $("currentFileDescription").textContent =
            file.description ||
            `${file.wordbooks.length}개 단어장`;
    }

    const list = $("workbookList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!file.wordbooks.length) {
        if ($("emptyWorkbookState")) {
            $("emptyWorkbookState").classList.remove(
                "hidden"
            );
        }

        return;
    }

    if ($("emptyWorkbookState")) {
        $("emptyWorkbookState").classList.add(
            "hidden"
        );
    }

    file.wordbooks.forEach(
        (workbook, index) => {
            const row =
                document.createElement("div");

            row.className = "bundle-row";
            row.dataset.workbookId =
                workbook.id;

            row.innerHTML = `
                <button
                    class="drag-handle"
                    type="button"
                    title="드래그해서 순서 변경"
                    data-workbook-drag="${escapeHTML(workbook.id)}"
                >☷</button>

                <div class="bundle-main">
                    <button
                        type="button"
                        class="bundle-main-button"
                        data-open-workbook="${escapeHTML(workbook.id)}"
                    >
                        <div class="bundle-name">
                            📚 ${escapeHTML(workbook.name)}
                        </div>
                        <div class="bundle-meta">
                            ${workbook.words.length}개 단어
                        </div>
                    </button>
                </div>

                <div class="bundle-count">
                    ${workbook.words.length}개
                </div>

                <button
                    class="mini-btn"
                    type="button"
                    data-rename-workbook="${escapeHTML(workbook.id)}"
                >✏️</button>

                <button
                    class="mini-btn danger"
                    type="button"
                    data-delete-workbook="${escapeHTML(workbook.id)}"
                >🗑</button>
            `;

            list.appendChild(row);
        }
    );

    list.querySelectorAll(
        "[data-open-workbook]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () =>
                showWorkbookPage(
                    button.dataset.openWorkbook
                )
        );
    });

    list.querySelectorAll(
        "[data-rename-workbook]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () =>
                renameWorkbook(
                    button.dataset.renameWorkbook
                )
        );
    });

    list.querySelectorAll(
        "[data-delete-workbook]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () =>
                deleteWorkbook(
                    button.dataset.deleteWorkbook
                )
        );
    });

    setupWorkbookDrag();
}

/* =========================================================
   단어장 관리
   ========================================================= */

function addWorkbook() {
    if (!currentFileId) {
        return;
    }

    openInputModal(
        "단어장 추가",
        "단어장 이름을 입력하세요",
        name => {
            name = trimText(name);

            if (!name) {
                showToast(
                    "단어장 이름을 입력해주세요.",
                    "error"
                );
                return false;
            }

            const file = getCurrentFile();

            if (!file) {
                return false;
            }

            if (
                file.wordbooks.some(
                    workbook =>
                        normalizeText(
                            workbook.name
                        ) ===
                        normalizeText(name)
                )
            ) {
                showToast(
                    "같은 이름의 단어장이 이미 있습니다.",
                    "error"
                );
                return false;
            }

            file.wordbooks.push({
                id: makeId("workbook"),
                name,
                createdAt: nowISO(),
                words: []
            });

            saveData();
            renderFilePage();

            showToast(
                "단어장이 추가되었습니다.",
                "success"
            );

            return true;
        }
    );
}

function renameWorkbook(workbookId) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const workbook =
        file.wordbooks.find(
            item => item.id === workbookId
        );

    if (!workbook) {
        return;
    }

    openInputModal(
        "단어장 이름 변경",
        "새 단어장 이름을 입력하세요",
        name => {
            name = trimText(name);

            if (!name) {
                showToast(
                    "단어장 이름을 입력해주세요.",
                    "error"
                );
                return false;
            }

            if (
                file.wordbooks.some(
                    item =>
                        item.id !== workbook.id &&
                        normalizeText(
                            item.name
                        ) ===
                        normalizeText(name)
                )
            ) {
                showToast(
                    "같은 이름의 단어장이 이미 있습니다.",
                    "error"
                );
                return false;
            }

            workbook.name = name;

            saveData();
            renderFilePage();

            if (
                currentWorkbookId ===
                workbook.id
            ) {
                renderWorkbookPage();
            }

            showToast(
                "단어장 이름이 변경되었습니다.",
                "success"
            );

            return true;
        },
        workbook.name
    );
}

function deleteWorkbook(workbookId) {
    const file = getCurrentFile();

    if (!file) {
        return;
    }

    const workbook =
        file.wordbooks.find(
            item => item.id === workbookId
        );

    if (!workbook) {
        return;
    }

    confirmModal(
        "단어장 삭제",
        `"${workbook.name}" 단어장과 안에 있는 ${workbook.words.length}개 단어를 삭제하시겠습니까?`,
        () => {
            file.wordbooks =
                file.wordbooks.filter(
                    item =>
                        item.id !== workbookId
                );

            if (
                currentWorkbookId ===
                workbookId
            ) {
                currentWorkbookId = null;
            }

            saveData();
            renderFilePage();

            showToast(
                "단어장이 삭제되었습니다.",
                "success"
            );
        }
    );
}

/* =========================================================
   단어장 페이지
   ========================================================= */

function showWorkbookPage(workbookId) {
    const workbook =
        getWorkbookById(
            currentFileId,
            workbookId
        );

    if (!workbook) {
        renderFilePage();
        return;
    }

    currentWorkbookId = workbookId;

    showPage("workbookPage");
    renderWorkbookPage();
}

function renderWorkbookPage() {
    const file = getCurrentFile();
    const workbook = getCurrentWorkbook();

    if (!file || !workbook) {
        renderFilePage();
        return;
    }

    if ($("currentWorkbookBreadcrumb")) {
        $("currentWorkbookBreadcrumb").textContent =
            `${file.name} › ${workbook.name}`;
    }

    if ($("currentWorkbookTitle")) {
        $("currentWorkbookTitle").textContent =
            workbook.name;
    }

    if ($("wordCountDescription")) {
        $("wordCountDescription").textContent =
            `${workbook.words.length}개 단어`;
    }

    renderWords();
}

/* =========================================================
   단어 입력
   ========================================================= */

function parseBulkInput(text) {
    const source = String(text ?? "");

    if (!source.trim()) {
        return {
            error: "입력할 단어가 없습니다."
        };
    }

    const entries = source
        .split("/")
        .map(item => item.trim());

    const result = [];

    for (
        let index = 0;
        index < entries.length;
        index++
    ) {
        const entry = entries[index];

        if (!entry) {
            return {
                error:
                    `${index + 1}번째 단어가 비어 있습니다.`
            };
        }

        const colonIndex =
            entry.indexOf(":");

        if (colonIndex === -1) {
            return {
                error:
                    `${index + 1}번째 항목에 ':'가 없습니다.`
            };
        }

        const word =
            entry
                .slice(0, colonIndex)
                .trim();

        const meanings =
            entry
                .slice(colonIndex + 1)
                .split(",")
                .map(item => item.trim());

        if (!word) {
            return {
                error:
                    `${index + 1}번째 단어의 영어가 비어 있습니다.`
            };
        }

        if (
            !meanings.length ||
            meanings.some(
                meaning => !meaning
            )
        ) {
            return {
                error:
                    `${index + 1}번째 단어의 뜻이 비어 있습니다.`
            };
        }

        const uniqueMeanings = [];

        for (const meaning of meanings) {
            if (
                !uniqueMeanings.some(
                    item =>
                        normalizeText(item) ===
                        normalizeText(meaning)
                )
            ) {
                uniqueMeanings.push(
                    meaning
                );
            }
        }

        result.push({
            word,
            meanings: uniqueMeanings
        });
    }

    return {
        words: result
    };
}

function addBulkWords() {
    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const input =
        $("bulkWordInput")?.value ?? "";

    const parsed =
        parseBulkInput(input);

    if (parsed.error) {
        showToast(
            parsed.error,
            "error"
        );
        return;
    }

    let addedWords = 0;
    let addedMeanings = 0;

    for (const item of parsed.words) {
        let existing =
            workbook.words.find(
                word =>
                    normalizeText(word.word) ===
                    normalizeText(item.word)
            );

        if (!existing) {
            existing = {
                id: makeId("word"),
                word: item.word,
                meanings: [],
                correct: 0,
                wrong: 0,
                important: false,
                createdAt: nowISO()
            };

            workbook.words.push(
                existing
            );

            addedWords++;
        }

        for (const meaning of item.meanings) {
            const exists =
                existing.meanings.some(
                    value =>
                        normalizeText(value) ===
                        normalizeText(meaning)
                );

            if (!exists) {
                existing.meanings.push(
                    meaning
                );

                addedMeanings++;
            }
        }

        updateImportantStatus(
            existing
        );
    }

    saveData();

    if ($("bulkWordInput")) {
        $("bulkWordInput").value = "";
    }

    renderWorkbookPage();

    showToast(
        `${addedWords}개 단어, ${addedMeanings}개 뜻이 추가되었습니다.`,
        "success"
    );
}

/* =========================================================
   단어 카드
   ========================================================= */

function renderWords() {
    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const list = $("wordList");

    if (!list) {
        return;
    }

    let words =
        [...workbook.words];

    const search =
        normalizeText(
            $("wordSearch")?.value || ""
        );

    if (search) {
        words =
            words.filter(word => {
                if (
                    normalizeText(
                        word.word
                    ).includes(search)
                ) {
                    return true;
                }

                return word.meanings.some(
                    meaning =>
                        normalizeText(
                            meaning
                        ).includes(search)
                );
            });
    }

    const sort =
        $("wordSort")?.value ||
        "order";

    if (sort === "alpha") {
        words.sort(
            (a, b) =>
                a.word.localeCompare(
                    b.word,
                    "en"
                )
        );
    }

    if (sort === "wrong") {
        words.sort(
            (a, b) =>
                Number(b.wrong || 0) -
                Number(a.wrong || 0)
        );
    }

    if (sort === "important") {
        words.sort(
            (a, b) =>
                Number(b.important) -
                Number(a.important)
        );
    }

    if (sort === "difficulty") {
        words.sort(
            (a, b) =>
                getWrongRate(b) -
                getWrongRate(a)
        );
    }

    if ($("visibleWordCount")) {
        $("visibleWordCount").textContent =
            `${words.length}개`;
    }

    list.innerHTML = "";

    if (!words.length) {
        list.innerHTML = `
            <div class="empty">
                ${
                    search
                        ? "검색 결과가 없습니다."
                        : "이 단어장에는 아직 단어가 없습니다."
                }
            </div>
        `;

        return;
    }

    for (const word of words) {
        list.appendChild(
            createWordCard(word)
        );
    }

    updateBulkActions();
}

function createWordCard(word) {
    const card =
        document.createElement("div");

    card.className = "word-card";
    card.dataset.wordId =
        word.id;

    const wrongRate =
        getWrongRate(word) * 100;

    const meaningsHTML =
        word.meanings
            .map(
                (meaning, index) => `
                    <div class="meaning-row">
                        <div class="meaning-text">
                            ${escapeHTML(meaning)}
                        </div>

                        <div class="meaning-actions">
                            <button
                                type="button"
                                class="mini-btn"
                                data-edit-meaning="${escapeHTML(word.id)}"
                                data-meaning-index="${index}"
                            >✏️</button>

                            <button
                                type="button"
                                class="mini-btn"
                                data-delete-meaning="${escapeHTML(word.id)}"
                                data-meaning-index="${index}"
                            >🗑</button>
                        </div>
                    </div>
                `
            )
            .join("");

    card.innerHTML = `
        <div class="word-top">

            <button
                type="button"
                class="drag-handle"
                title="드래그해서 순서 변경"
                data-word-drag="${escapeHTML(word.id)}"
            >☷</button>

            <input
                type="checkbox"
                class="word-select"
                data-select-word="${escapeHTML(word.id)}"
                ${
                    selectedWordIds.has(word.id)
                        ? "checked"
                        : ""
                }
            >

            <button
                type="button"
                class="mini-btn important"
                data-important="${escapeHTML(word.id)}"
                title="중요 단어"
            >${word.important ? "⭐" : "☆"}</button>

            <div class="word-en">
                ${escapeHTML(word.word)}
            </div>

            <div class="word-stats">
                오답률 ${wrongRate.toFixed(1)}%
            </div>

            <button
                type="button"
                class="mini-btn"
                data-edit-word="${escapeHTML(word.id)}"
            >✏️</button>

            <button
                type="button"
                class="mini-btn danger"
                data-delete-word="${escapeHTML(word.id)}"
            >🗑</button>
        </div>

        ${meaningsHTML}

        <button
            type="button"
            class="mini-btn"
            data-add-meaning="${escapeHTML(word.id)}"
        >＋ 뜻 추가</button>
    `;

    wireWordCard(card);

    return card;
}

function wireWordCard(card) {
    card.querySelector(
        "[data-select-word]"
    )?.addEventListener(
        "change",
        event => {
            const id =
                event.currentTarget
                    .dataset
                    .selectWord;

            if (
                event.currentTarget.checked
            ) {
                selectedWordIds.add(id);
            } else {
                selectedWordIds.delete(id);
            }

            updateBulkActions();
        }
    );

    card.querySelector(
        "[data-important]"
    )?.addEventListener(
        "click",
        event => {
            const word =
                getWordById(
                    event.currentTarget
                        .dataset
                        .important
                );

            if (!word) {
                return;
            }

            word.important =
                !word.important;

            saveData();
            renderWords();
        }
    );

    card.querySelector(
        "[data-edit-word]"
    )?.addEventListener(
        "click",
        event =>
            editWord(
                event.currentTarget
                    .dataset
                    .editWord
            )
    );

    card.querySelector(
        "[data-delete-word]"
    )?.addEventListener(
        "click",
        event =>
            deleteWord(
                currentWorkbookId,
                event.currentTarget
                    .dataset
                    .deleteWord
            )
    );

    card.querySelectorAll(
        "[data-add-meaning]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () =>
                addMeaning(
                    currentWorkbookId,
                    button.dataset
                        .addMeaning
                )
        );
    });

    card.querySelectorAll(
        "[data-edit-meaning]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () =>
                editMeaning(
                    currentWorkbookId,
                    button.dataset
                        .editMeaning,
                    Number(
                        button.dataset
                            .meaningIndex
                    )
                )
        );
    });

    card.querySelectorAll(
        "[data-delete-meaning]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () =>
                deleteMeaning(
                    currentWorkbookId,
                    button.dataset
                        .deleteMeaning,
                    Number(
                        button.dataset
                            .meaningIndex
                    )
                )
        );
    });
}

/* =========================================================
   단어 수정 / 뜻 수정
   ========================================================= */

function editWord(wordId) {
    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) {
        return;
    }

    const form =
        document.createElement("div");

    form.innerHTML = `
        <label>
            영어
            <input
                id="editWordInput"
                value="${escapeHTML(word.word)}"
                autocomplete="off"
            >
        </label>

        <label>
            뜻
            <input
                id="editMeaningInput"
                value="${escapeHTML(
                    word.meanings.join(", ")
                )}"
                autocomplete="off"
            >
        >

        <p class="help">
            여러 뜻은 , 로 구분할 수 있습니다.
        </p>
    `;

    openCustomModal(
        "단어 수정",
        form,
        () => {
            const newWord =
                trimText(
                    $("editWordInput")
                        ?.value
                );

            const meanings =
                String(
                    $("editMeaningInput")
                        ?.value || ""
                )
                    .split(",")
                    .map(
                        meaning =>
                            trimText(
                                meaning
                            )
                    )
                    .filter(Boolean);

            if (!newWord) {
                showToast(
                    "영어 단어를 입력해주세요.",
                    "error"
                );
                return false;
            }

            if (!meanings.length) {
                showToast(
                    "뜻을 입력해주세요.",
                    "error"
                );
                return false;
            }

            const duplicate =
                workbook.words.some(
                    item =>
                        item.id !== word.id &&
                        normalizeText(
                            item.word
                        ) ===
                        normalizeText(
                            newWord
                        )
                );

            if (duplicate) {
                showToast(
                    "같은 단어가 이미 있습니다.",
                    "error"
                );
                return false;
            }

            word.word = newWord;

            word.meanings = [
                ...new Set(
                    meanings.map(
                        meaning =>
                            normalizeText(
                                meaning
                            )
                    )
                )
            ].map(
                normalized =>
                    meanings.find(
                        meaning =>
                            normalizeText(
                                meaning
                            ) ===
                            normalized
                    ) || normalized
            );

            updateImportantStatus(
                word
            );

            saveData();
            renderWorkbookPage();

            showToast(
                "단어가 수정되었습니다.",
                "success"
            );

            return true;
        }
    );
}

function addMeaning(
    workbookId,
    wordId
) {
    const workbook =
        getWorkbookById(
            currentFileId,
            workbookId
        );

    if (!workbook) {
        return;
    }

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) {
        return;
    }

    openInputModal(
        "뜻 추가",
        "추가할 뜻을 입력하세요",
        meaning => {
            meaning =
                trimText(meaning);

            if (!meaning) {
                return false;
            }

            if (
                word.meanings.some(
                    item =>
                        normalizeText(
                            item
                        ) ===
                        normalizeText(
                            meaning
                        )
                )
            ) {
                showToast(
                    "같은 뜻이 이미 있습니다.",
                    "error"
                );
                return false;
            }

            word.meanings.push(
                meaning
            );

            saveData();
            renderWorkbookPage();

            showToast(
                "뜻이 추가되었습니다.",
                "success"
            );

            return true;
        }
    );
}

function editMeaning(
    workbookId,
    wordId,
    meaningIndex
) {
    const workbook =
        getWorkbookById(
            currentFileId,
            workbookId
        );

    if (!workbook) {
        return;
    }

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) {
        return;
    }

    const oldMeaning =
        word.meanings[
            meaningIndex
        ];

    if (
        oldMeaning === undefined
    ) {
        return;
    }

    openInputModal(
        "뜻 수정",
        "새 뜻을 입력하세요",
        meaning => {
            meaning =
                trimText(meaning);

            if (!meaning) {
                return false;
            }

            if (
                word.meanings.some(
                    (item, index) =>
                        index !==
                            meaningIndex &&
                        normalizeText(
                            item
                        ) ===
                        normalizeText(
                            meaning
                        )
                )
            ) {
                showToast(
                    "같은 뜻이 이미 있습니다.",
                    "error"
                );
                return false;
            }

            word.meanings[
                meaningIndex
            ] = meaning;

            saveData();
            renderWorkbookPage();

            showToast(
                "뜻이 수정되었습니다.",
                "success"
            );

            return true;
        },
        oldMeaning
    );
}

function deleteMeaning(
    workbookId,
    wordId,
    meaningIndex
) {
    const workbook =
        getWorkbookById(
            currentFileId,
            workbookId
        );

    if (!workbook) {
        return;
    }

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) {
        return;
    }

    if (
        word.meanings.length <= 1
    ) {
        confirmModal(
            "단어 전체 삭제",
            "마지막 뜻을 삭제하면 단어 전체가 삭제됩니다. 계속하시겠습니까?",
            () =>
                deleteWord(
                    workbookId,
                    wordId
                )
        );

        return;
    }

    confirmModal(
        "뜻 삭제",
        "이 뜻을 삭제하시겠습니까?",
        () => {
            word.meanings.splice(
                meaningIndex,
                1
            );

            saveData();
            renderWorkbookPage();

            showToast(
                "뜻이 삭제되었습니다.",
                "success"
            );
        }
    );
}

function deleteWord(
    workbookId,
    wordId
) {
    const workbook =
        getWorkbookById(
            currentFileId,
            workbookId
        );

    if (!workbook) {
        return;
    }

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) {
        return;
    }

    confirmModal(
        "단어 삭제",
        `"${word.word}" 단어를 삭제하시겠습니까?`,
        () => {
            workbook.words =
                workbook.words.filter(
                    item =>
                        item.id !== wordId
                );

            selectedWordIds.delete(
                wordId
            );

            saveData();
            renderWorkbookPage();

            showToast(
                "단어가 삭제되었습니다.",
                "success"
            );
        }
    );
}

/* =========================================================
   선택 단어 일괄 처리
   ========================================================= */

function updateBulkActions() {
    const bar =
        $("bulkActions");

    if (!bar) {
        return;
    }

    const count =
        selectedWordIds.size;

    bar.classList.toggle(
        "hidden",
        count === 0
    );

    if ($("selectedCount")) {
        $("selectedCount").textContent =
            `${count}개 선택`;
    }
}

function bulkAction(type) {
    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    const ids =
        new Set(selectedWordIds);

    if (!ids.size) {
        return;
    }

    if (type === "delete") {
        confirmModal(
            "선택 단어 삭제",
            `선택한 ${ids.size}개 단어를 삭제하시겠습니까?`,
            () => {
                workbook.words =
                    workbook.words.filter(
                        word =>
                            !ids.has(
                                word.id
                            )
                    );

                selectedWordIds.clear();

                saveData();
                renderWorkbookPage();

                showToast(
                    "선택한 단어가 삭제되었습니다.",
                    "success"
                );
            }
        );

        return;
    }

    workbook.words.forEach(
        word => {
            if (!ids.has(word.id)) {
                return;
            }

            if (type === "on") {
                word.important = true;
            }

            if (type === "off") {
                word.important = false;
            }
        }
    );

    saveData();
    renderWords();

    showToast(
        type === "on"
            ? "중요 단어로 지정했습니다."
            : "중요 표시를 해제했습니다.",
        "success"
    );
}

/* =========================================================
   파일 / 단어장 드래그 순서 변경
   ========================================================= */

function setupFileDrag() {
    const list =
        $("fileList");

    if (!list) {
        return;
    }

    const items =
        [...list.querySelectorAll(
            "[data-file-id]"
        )];

    items.forEach(item => {
        const handle =
            item.querySelector(
                "[data-file-drag]"
            );

        if (!handle) {
            return;
        }

        handle.addEventListener(
            "pointerdown",
            event => {
                draggedFileId =
                    handle.dataset
                        .fileDrag;

                handle.setPointerCapture?.(
                    event.pointerId
                );

                item.style.opacity =
                    "0.5";
            }
        );

        handle.addEventListener(
            "pointermove",
            event => {
                if (
                    !draggedFileId
                ) {
                    return;
                }

                const siblings =
                    [...list.querySelectorAll(
                        "[data-file-id]"
                    )].filter(
                        element =>
                            element !== item
                    );

                const target =
                    siblings.find(
                        sibling =>
                            event.clientY <
                            sibling
                                .getBoundingClientRect()
                                .top +
                            sibling.offsetHeight /
                                2
                    );

                if (target) {
                    list.insertBefore(
                        item,
                        target
                    );
                } else {
                    list.appendChild(
                        item
                    );
                }
            }
        );

        handle.addEventListener(
            "pointerup",
            () => {
                if (
                    !draggedFileId
                ) {
                    return;
                }

                draggedFileId =
                    null;

                item.style.opacity =
                    "";

                syncFileOrder();
            }
        );

        handle.addEventListener(
            "pointercancel",
            () => {
                draggedFileId =
                    null;

                item.style.opacity =
                    "";
            }
        );
    });
}

function syncFileOrder() {
    const list =
        $("fileList");

    if (!list) {
        return;
    }

    const ids =
        [...list.querySelectorAll(
            "[data-file-id]"
        )].map(
            item =>
                item.dataset.fileId
        );

    const ordered =
        ids
            .map(id =>
                getFileById(id)
            )
            .filter(Boolean);

    const remaining =
        appData.files.filter(
            file =>
                !ids.includes(
                    file.id
                )
        );

    appData.files = [
        ...ordered,
        ...remaining
    ];

    saveData();
    renderHome();
}

function setupWorkbookDrag() {
    const list =
        $("workbookList");

    if (!list) {
        return;
    }

    list.querySelectorAll(
        "[data-workbook-drag]"
    ).forEach(handle => {
        const row =
            handle.closest(
                "[data-workbook-id]"
            );

        if (!row) {
            return;
        }

        handle.addEventListener(
            "pointerdown",
            event => {
                draggedWorkbookId =
                    handle.dataset
                        .workbookDrag;

                handle.setPointerCapture?.(
                    event.pointerId
                );

                row.style.opacity =
                    "0.5";
            }
        );

        handle.addEventListener(
            "pointermove",
            event => {
                if (
                    !draggedWorkbookId
                ) {
                    return;
                }

                const siblings =
                    [...list.querySelectorAll(
                        "[data-workbook-id]"
                    )].filter(
                        element =>
                            element !== row
                    );

                const target =
                    siblings.find(
                        sibling =>
                            event.clientY <
                            sibling
                                .getBoundingClientRect()
                                .top +
                            sibling.offsetHeight /
                                2
                    );

                if (target) {
                    list.insertBefore(
                        row,
                        target
                    );
                } else {
                    list.appendChild(
                        row
                    );
                }
            }
        );

        handle.addEventListener(
            "pointerup",
            () => {
                draggedWorkbookId =
                    null;

                row.style.opacity =
                    "";

                syncWorkbookOrder();
            }
        );

        handle.addEventListener(
            "pointercancel",
            () => {
                draggedWorkbookId =
                    null;

                row.style.opacity =
                    "";
            }
        );
    });
}

function syncWorkbookOrder() {
    const file =
        getCurrentFile();

    const list =
        $("workbookList");

    if (!file || !list) {
        return;
    }

    const ids =
        [...list.querySelectorAll(
            "[data-workbook-id]"
        )].map(
            item =>
                item.dataset
                    .workbookId
        );

    const ordered =
        ids
            .map(id =>
                file.wordbooks.find(
                    workbook =>
                        workbook.id ===
                        id
                )
            )
            .filter(Boolean);

    const remaining =
        file.wordbooks.filter(
            workbook =>
                !ids.includes(
                    workbook.id
                )
        );

    file.wordbooks = [
        ...ordered,
        ...remaining
    ];

    saveData();
    renderFilePage();
}

/* =========================================================
   단어 드래그
   ========================================================= */

function setupWordDrag() {
    const list =
        $("wordList");

    const workbook =
        getCurrentWorkbook();

    if (!list || !workbook) {
        return;
    }

    list.querySelectorAll(
        "[data-word-drag]"
    ).forEach(handle => {
        const card =
            handle.closest(
                "[data-word-id]"
            );

        if (!card) {
            return;
        }

        handle.addEventListener(
            "pointerdown",
            event => {
                draggedWordId =
                    handle.dataset
                        .wordDrag;

                handle.setPointerCapture?.(
                    event.pointerId
                );

                card.style.opacity =
                    "0.5";
            }
        );

        handle.addEventListener(
            "pointermove",
            event => {
                if (
                    !draggedWordId
                ) {
                    return;
                }

                const cards =
                    [...list.querySelectorAll(
                        "[data-word-id]"
                    )].filter(
                        element =>
                            element !== card
                    );

                const target =
                    cards.find(
                        element =>
                            event.clientY <
                            element
                                .getBoundingClientRect()
                                .top +
                            element.offsetHeight /
                                2
                    );

                if (target) {
                    list.insertBefore(
                        card,
                        target
                    );
                } else {
                    list.appendChild(
                        card
                    );
                }
            }
        );

        handle.addEventListener(
            "pointerup",
            () => {
                draggedWordId =
                    null;

                card.style.opacity =
                    "";

                syncWordOrder();
            }
        );

        handle.addEventListener(
            "pointercancel",
            () => {
                draggedWordId =
                    null;

                card.style.opacity =
                    "";
            }
        );
    });
}

function syncWordOrder() {
    const workbook =
        getCurrentWorkbook();

    const list =
        $("wordList");

    if (!workbook || !list) {
        return;
    }

    const ids =
        [...list.querySelectorAll(
            "[data-word-id]"
        )].map(
            card =>
                card.dataset.wordId
        );

    const visibleWords =
        ids
            .map(id =>
                workbook.words.find(
                    word =>
                        word.id ===
                        id
                )
            )
            .filter(Boolean);

    if (!visibleWords.length) {
        return;
    }

    const visibleIds =
        new Set(ids);

    let index = 0;

    workbook.words =
        workbook.words.map(
            word => {
                if (
                    visibleIds.has(
                        word.id
                    )
                ) {
                    return visibleWords[
                        index++
                    ];
                }

                return word;
            }
        );

    saveData();
    renderWords();
}

/* =========================================================
   테스트 문제 생성
   ========================================================= */

function shuffle(array) {
    const result = [
        ...array
    ];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}

function buildTestQuestions(
    words,
    file,
    workbook,
    type
) {
    const shuffled =
        shuffle(words);

    return shuffled.map(
        word => {
            let direction =
                type;

            if (type === "all") {
                direction =
                    Math.random() < 0.5
                        ? "english-to-meaning"
                        : "meaning-to-english";
            }

            return {
                word,
                direction,
                fileId: file.id,
                fileName: file.name,
                workbookId:
                    workbook?.id ||
                    null,
                workbookName:
                    workbook?.name ||
                    ""
            };
        }
    );
}

function getDirectionLabel(
    question
) {
    if (
        question.direction ===
        "english-to-meaning"
    ) {
        return `${
            question.fileName ||
            "영어"
        } → 뜻`;
    }

    return `뜻 → ${
        question.fileName ||
        "영어"
    }`;
}

/* =========================================================
   일반 테스트 메뉴
   ========================================================= */

function openTotalTestMenu() {
    const file =
        getCurrentFile();

    if (!file) {
        return;
    }

    const total =
        file.wordbooks.reduce(
            (sum, workbook) =>
                sum +
                workbook.words.length,
            0
        );

    openCustomModal(
        `${file.name} 일반 테스트`,
        createTestMenuElement([
            {
                id: "fileTestAll",
                title: "🔀 전체 테스트",
                description:
                    `${total}개 단어 · 영어 → 뜻 / 뜻 → 영어 랜덤`,
                disabled:
                    total === 0
            },
            {
                id: "fileTestEnglish",
                title:
                    `${file.name} → 뜻`,
                description:
                    `${total}개 단어`,
                disabled:
                    total === 0
            },
            {
                id: "fileTestMeaning",
                title:
                    `뜻 → ${file.name}`,
                description:
                    `${total}개 단어`,
                disabled:
                    total === 0
            },
            {
                id: "fileQuickTest",
                title: "⚡ 빠른 테스트",
                description:
                    "중요 단어·오답 단어 등을 선택",
                disabled:
                    total === 0
            }
        ]),
        () => {
            return false;
        }
    );

    setTimeout(() => {
        $("fileTestAll")?.addEventListener(
            "click",
            () => {
                closeModal();
                startFileTest(
                    "all"
                );
            }
        );

        $("fileTestEnglish")
            ?.addEventListener(
                "click",
                () => {
                    closeModal();
                    startFileTest(
                        "english-to-meaning"
                    );
                }
            );

        $("fileTestMeaning")
            ?.addEventListener(
                "click",
                () => {
                    closeModal();
                    startFileTest(
                        "meaning-to-english"
                    );
                }
            );

        $("fileQuickTest")
            ?.addEventListener(
                "click",
                () => {
                    closeModal();
                    openQuickTestMenu();
                }
            );
    }, 0);
}

function createTestMenuElement(
    items
) {
    const wrapper =
        document.createElement("div");

    wrapper.className =
        "test-menu";

    wrapper.innerHTML =
        items
            .map(
                item => `
                    <button
                        class="test-menu-button"
                        id="${escapeHTML(item.id)}"
                        type="button"
                        ${
                            item.disabled
                                ? "disabled"
                                : ""
                        }
                    >
                        <strong>
                            ${escapeHTML(
                                item.title
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.description
                            )}
                        </span>
                    </button>
                `
            )
            .join("");

    return wrapper;
}

/* =========================================================
   파일 테스트
   ========================================================= */

function startFileTest(
    type = "all"
) {
    const file =
        getCurrentFile();

    if (!file) {
        return;
    }

    const words = [];

    for (
        const workbook of
        file.wordbooks
    ) {
        for (
            const word of
            workbook.words
        ) {
            words.push({
                ...word,
                _workbookId:
                    workbook.id,
                _workbookName:
                    workbook.name
            });
        }
    }

    if (!words.length) {
        showToast(
            "이 파일에는 테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    const questions =
        shuffle(words).map(
            word => {
                let direction =
                    type;

                if (type === "all") {
                    direction =
                        Math.random() < 0.5
                            ? "english-to-meaning"
                            : "meaning-to-english";
                }

                return {
                    word,
                    direction,
                    fileId: file.id,
                    fileName:
                        file.name,
                    workbookId:
                        word._workbookId,
                    workbookName:
                        word._workbookName
                };
            }
        );

    let testName;

    if (type === "all") {
        testName =
            `${file.name} · 전체 테스트`;
    } else if (
        type ===
        "english-to-meaning"
    ) {
        testName =
            `${file.name} → 뜻`;
    } else {
        testName =
            `뜻 → ${file.name}`;
    }

    startTest(
        questions,
        testName,
        type,
        file.id,
        null
    );
}

/* =========================================================
   단어장 테스트 메뉴
   ========================================================= */

function openWorkbookTestMenu() {
    const file =
        getCurrentFile();

    const workbook =
        getCurrentWorkbook();

    if (!file || !workbook) {
        return;
    }

    const total =
        workbook.words.length;

    const menu =
        createTestMenuElement([
            {
                id:
                    "workbookTestEnglish",
                title:
                    `${file.name} → 뜻`,
                description:
                    `이 단어장에 있는 ${total}개 단어`,
                disabled:
                    total === 0
            },
            {
                id:
                    "workbookTestMeaning",
                title:
                    `뜻 → ${file.name}`,
                description:
                    `이 단어장에 있는 ${total}개 단어`,
                disabled:
                    total === 0
            },
            {
                id:
                    "workbookTestAll",
                title:
                    "🔀 전체 테스트",
                description:
                    `영어 → 뜻 / 뜻 → ${file.name} 랜덤`,
                disabled:
                    total === 0
            }
        ]);

    openCustomModal(
        `${workbook.name} 테스트`,
        menu,
        () => false
    );

    setTimeout(() => {
        $(
            "workbookTestEnglish"
        )?.addEventListener(
            "click",
            () => {
                closeModal();
                startWorkbookTest(
                    "english-to-meaning"
                );
            }
        );

        $(
            "workbookTestMeaning"
        )?.addEventListener(
            "click",
            () => {
                closeModal();
                startWorkbookTest(
                    "meaning-to-english"
                );
            }
        );

        $(
            "workbookTestAll"
        )?.addEventListener(
            "click",
            () => {
                closeModal();
                startWorkbookTest(
                    "all"
                );
            }
        );
    }, 0);
}

/* =========================================================
   단어장 테스트
   ========================================================= */

function startWorkbookTest(
    type = "all"
) {
    const file =
        getCurrentFile();

    const workbook =
        getCurrentWorkbook();

    if (!file || !workbook) {
        return;
    }

    if (!workbook.words.length) {
        showToast(
            "이 단어장에는 테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    const questions =
        buildTestQuestions(
            workbook.words,
            file,
            workbook,
            type
        );

    let testName;

    if (type === "all") {
        testName =
            `${workbook.name} · 전체 테스트`;
    } else if (
        type ===
        "english-to-meaning"
    ) {
        testName =
            `${workbook.name} · ${file.name} → 뜻`;
    } else {
        testName =
            `${workbook.name} · 뜻 → ${file.name}`;
    }

    startTest(
        questions,
        testName,
        type,
        file.id,
        workbook.id
    );
}

/* =========================================================
   빠른 테스트
   ========================================================= */

function openQuickTestMenu() {
    const form =
        document.createElement("div");

    form.innerHTML = `
        <label>
            테스트 범위
            <select id="quickTestMode">
                <option value="all">
                    전체 단어
                </option>

                <option value="important">
                    ⭐ 중요 단어
                </option>

                <option value="wrong">
                    오답이 있는 단어
                </option>

                <option value="difficult">
                    오답률이 높은 단어
                </option>
            </select>
        </label>

        <label>
            문제 방향
            <select id="quickTestDirection">
                <option value="all">
                    🔀 영어 ↔ 뜻 랜덤
                </option>

                <option value="english-to-meaning">
                    영어 → 뜻
                </option>

                <option value="meaning-to-english">
                    뜻 → 영어
                </option>
            </select>
        </label>

        <label>
            문제 수
            <select id="quickTestCount">
                <option value="all">
                    전체
                </option>

                <option value="10">
                    10문제
                </option>

                <option value="20">
                    20문제
                </option>

                <option value="30">
                    30문제
                </option>

                <option value="50">
                    50문제
                </option>
            </select>
        </label>
    `;

    openCustomModal(
        "빠른 테스트",
        form,
        () => {
            const mode =
                $("quickTestMode")
                    ?.value ||
                "all";

            const direction =
                $("quickTestDirection")
                    ?.value ||
                "all";

            const count =
                $("quickTestCount")
                    ?.value ||
                "all";

            startQuickTest(
                mode,
                direction,
                count
            );

            return true;
        }
    );
}

function startQuickTest(
    mode = "all",
    direction = "all",
    count = "all"
) {
    let candidates =
        getAllWords();

    if (mode === "important") {
        candidates =
            candidates.filter(
                ({ word }) =>
                    word.important
            );
    }

    if (mode === "wrong") {
        candidates =
            candidates.filter(
                ({ word }) =>
                    Number(
                        word.wrong || 0
                    ) > 0
            );
    }

    if (mode === "difficult") {
        candidates =
            candidates.filter(
                ({ word }) =>
                    getWrongRate(
                        word
                    ) > 0.7
            );
    }

    if (!candidates.length) {
        showToast(
            "선택한 조건에 해당하는 단어가 없습니다.",
            "error"
        );
        return;
    }

    candidates =
        shuffle(candidates);

    if (
        count !== "all"
    ) {
        candidates =
            candidates.slice(
                0,
                Number(count)
            );
    }

    const questions =
        candidates.map(
            item => {
                let qDirection =
                    direction;

                if (
                    direction ===
                    "all"
                ) {
                    qDirection =
                        Math.random() <
                        0.5
                            ? "english-to-meaning"
                            : "meaning-to-english";
                }

                return {
                    word:
                        safeClone(
                            item.word
                        ),
                    direction:
                        qDirection,
                    fileId:
                        item.file.id,
                    fileName:
                        item.file.name,
                    workbookId:
                        item.workbook.id,
                    workbookName:
                        item.workbook.name
                };
            }
        );

    startTest(
        questions,
        `빠른 테스트 · ${getQuickTestModeName(
            mode
        )}`,
        direction,
        null,
        null
    );
}

function getQuickTestModeName(
    mode
) {
    const names = {
        all: "전체 단어",
        important: "⭐ 중요 단어",
        wrong: "오답이 있는 단어",
        difficult: "오답률이 높은 단어"
    };

    return (
        names[mode] ||
        "빠른 테스트"
    );
}

/* =========================================================
   테스트 시작
   ========================================================= */

function startTest(
    questions,
    testName,
    testType,
    sourceFileId,
    sourceWorkbookId
) {
    if (!questions.length) {
        showToast(
            "테스트할 문제가 없습니다.",
            "error"
        );
        return;
    }

    stopTimer();

    clearTimeout(
        testState.autoNextTimer
    );

    testState = {
        questions:
            shuffle(questions),
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
        timeLeft: getTestTime(),
        autoNextTimer: null
    };

    closeSidebar();

    showPage("testPage");

    renderCurrentQuestion();
}

/* =========================================================
   테스트 문제 표시
   ========================================================= */

function renderCurrentQuestion() {
    const question =
        testState.questions[
            testState.currentIndex
        ];

    if (!question) {
        finishTest();
        return;
    }

    stopTimer();

    clearTimeout(
        testState.autoNextTimer
    );

    testState.answered =
        false;

    const total =
        testState.questions.length;

    if ($("testQuestionNumber")) {
        $("testQuestionNumber")
            .textContent =
            testState.currentIndex +
            1;
    }

    if ($("testTotalQuestions")) {
        $("testTotalQuestions")
            .textContent =
            total;
    }

    if ($("testTypeLabel")) {
        $("testTypeLabel")
            .textContent =
            getDirectionLabel(
                question
            );
    }

    if (
        question.direction ===
        "english-to-meaning"
    ) {
        if ($("testQuestion")) {
            $("testQuestion")
                .textContent =
                question.word.word;
        }

        if ($("testAnswerInput")) {
            $("testAnswerInput")
                .placeholder =
                "뜻을 입력하세요";
        }
    } else {
        if ($("testQuestion")) {
            $("testQuestion")
                .textContent =
                question.word
                    .meanings?.[0] ||
                "";
        }

        if ($("testAnswerInput")) {
            $("testAnswerInput")
                .placeholder =
                `${
                    question.fileName ||
                    "언어"
                }를 입력하세요`;
        }
    }

    if ($("testFeedback")) {
        $("testFeedback")
            .className =
            "test-feedback hidden";

        $("testFeedback")
            .innerHTML = "";
    }

    if ($("testSubmitButton")) {
        $("testSubmitButton")
            .disabled = false;

        $("testSubmitButton")
            .textContent =
            "확인";
    }

    if ($("testAnswerInput")) {
        $("testAnswerInput")
            .value = "";

        $("testAnswerInput")
            .disabled = false;
    }

    if ($("testHint")) {
        $("testHint")
            .textContent =
            `문제당 ${getTestTime()}초 · Enter를 눌러 답을 제출할 수 있습니다.`;
    }

    startTimer();

    setTimeout(
        () =>
            $("testAnswerInput")
                ?.focus(),
        50
    );
}

/* =========================================================
   타이머
   ========================================================= */

function startTimer() {
    stopTimer();

    testState.timeLeft =
        getTestTime();

    if ($("testTimer")) {
        $("testTimer")
            .textContent =
            testState.timeLeft;
    }

    testState.timer =
        setInterval(() => {
            testState.timeLeft--;

            if ($("testTimer")) {
                $("testTimer")
                    .textContent =
                    Math.max(
                        0,
                        testState.timeLeft
                    );
            }

            if (
                testState.timeLeft <=
                0
            ) {
                stopTimer();

                if (
                    !testState.answered
                ) {
                    handleAnswer(
                        "",
                        true
                    );
                }
            }
        }, 1000);
}

function stopTimer() {
    if (testState.timer) {
        clearInterval(
            testState.timer
        );

        testState.timer = null;
    }
}

/* =========================================================
   답안 확인
   ========================================================= */

function normalizeAnswer(
    value
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}

function isAnswerCorrect(
    question,
    answer
) {
    const normalized =
        normalizeAnswer(answer);

    if (!normalized) {
        return false;
    }

    if (
        question.direction ===
        "english-to-meaning"
    ) {
        return question.word.meanings.some(
            meaning =>
                normalizeAnswer(
                    meaning
                ) === normalized
        );
    }

    return (
        normalizeAnswer(
            question.word.word
        ) === normalized
    );
}

function handleAnswer(
    answer,
    timedOut = false
) {
    if (testState.answered) {
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

    testState.answered =
        true;

    const correct =
        !timedOut &&
        isAnswerCorrect(
            question,
            answer
        );

    if ($("testAnswerInput")) {
        $("testAnswerInput")
            .disabled = true;
    }

    if ($("testSubmitButton")) {
        $("testSubmitButton")
            .disabled = true;
    }

    if (correct) {
        testState.correct++;

        if ($("testFeedback")) {
            $("testFeedback")
                .className =
                "test-feedback correct";

            $("testFeedback")
                .innerHTML =
                "✅ 정답!";
        }
    } else {
        testState.wrong++;

        testState.wrongQuestions.push(
            question
        );

        if ($("testFeedback")) {
            $("testFeedback")
                .className =
                "test-feedback incorrect";

            $("testFeedback")
                .innerHTML = `
                    ${
                        timedOut
                            ? "⏰ 시간 초과!"
                            : "❌ 오답!"
                    }
                    <br>
                    <b>정답:</b>
                    ${escapeHTML(
                        question.word.meanings.join(
                            " / "
                        )
                    )}
                `;

            if (
                question.direction ===
                "meaning-to-english"
            ) {
                $("testFeedback")
                    .innerHTML = `
                        ${
                            timedOut
                                ? "⏰ 시간 초과!"
                                : "❌ 오답!"
                        }
                        <br>
                        <b>정답:</b>
                        ${escapeHTML(
                            question.word.word
                        )}
                    `;
            }
        }
    }

    updateWordTestRecord(
        question,
        correct
    );

    if (
        testState.currentIndex <
        testState.questions.length -
            1
    ) {
        testState.autoNextTimer =
            setTimeout(
                () =>
                    nextQuestion(),
                900
            );
    } else {
        testState.autoNextTimer =
            setTimeout(
                () =>
                    finishTest(),
                900
            );
    }
}

/* =========================================================
   단어 테스트 기록 업데이트
   ========================================================= */

function updateWordTestRecord(
    question,
    correct
) {
    const wordId =
        question.word.id;

    const targets = [];

    if (
        question.fileId &&
        question.workbookId
    ) {
        targets.push({
            fileId:
                question.fileId,
            workbookId:
                question.workbookId,
            wordId
        });
    } else if (
        question.fileId
    ) {
        const file =
            getFileById(
                question.fileId
            );

        if (file) {
            for (
                const workbook of
                file.wordbooks
            ) {
                const word =
                    workbook.words.find(
                        item =>
                            item.id ===
                            wordId
                    );

                if (word) {
                    targets.push({
                        fileId:
                            file.id,
                        workbookId:
                            workbook.id,
                        wordId
                    });
                }
            }
        }
    }

    if (!targets.length) {
        const matches =
            getAllWords().filter(
                item =>
                    item.word.id ===
                    wordId
            );

        matches.forEach(
            item =>
                targets.push({
                    fileId:
                        item.file.id,
                    workbookId:
                        item.workbook.id,
                    wordId:
                        item.word.id
                })
        );
    }

    const unique =
        new Set();

    for (
        const target of targets
    ) {
        const key =
            `${target.fileId}:${target.workbookId}:${target.wordId}`;

        if (unique.has(key)) {
            continue;
        }

        unique.add(key);

        const workbook =
            getWorkbookById(
                target.fileId,
                target.workbookId
            );

        const word =
            workbook?.words.find(
                item =>
                    item.id ===
                    target.wordId
            );

        if (!word) {
            continue;
        }

        if (correct) {
            word.correct =
                Number(
                    word.correct || 0
                ) + 1;
        } else {
            word.wrong =
                Number(
                    word.wrong || 0
                ) + 1;
        }

        updateImportantStatus(
            word
        );
    }

    saveData();
}

/* =========================================================
   다음 문제
   ========================================================= */

function nextQuestion() {
    if (!testState.answered) {
        return;
    }

    clearTimeout(
        testState.autoNextTimer
    );

    if (
        testState.currentIndex >=
        testState.questions.length -
            1
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
    if (
        !testState.questions.length
    ) {
        return;
    }

    if (
        !testState.answered
    ) {
        return;
    }

    stopTimer();

    clearTimeout(
        testState.autoNextTimer
    );

    const total =
        testState.questions.length;

    const record = {
        id: makeId("record"),
        date: nowISO(),
        fileName:
            getFileById(
                testState.sourceFileId
            )?.name ||
            "빠른 테스트",
        workbookName:
            getWorkbookById(
                testState.sourceFileId,
                testState.sourceWorkbookId
            )?.name ||
            "",
        testName:
            testState.testName,
        testType:
            testState.testType,
        total,
        correct:
            testState.correct,
        wrong:
            testState.wrong,
        questions:
            testState.questions.map(
                question => ({
                    word:
                        question.word.word,
                    meanings:
                        [...question.word.meanings],
                    direction:
                        question.direction,
                    correct:
                        !testState.wrongQuestions.some(
                            wrongQuestion =>
                                wrongQuestion.word.id ===
                                    question.word.id &&
                                wrongQuestion.direction ===
                                    question.direction
                        )
                })
            )
    };

    appData.testRecords.push(
        record
    );

    saveData();

    showPage("resultPage");

    renderResultPage();
}

/* =========================================================
   테스트 뒤로가기
   ========================================================= */

function leaveTest() {
    if (!testState.questions.length) {
        returnToTestOrigin();
        return;
    }

    confirmModal(
        "테스트 종료",
        "진행 중인 테스트를 종료하시겠습니까? 현재 진행 중인 결과는 기록되지 않습니다.",
        () => {
            stopTimer();

            clearTimeout(
                testState.autoNextTimer
            );

            testState = {
                questions: [],
                currentIndex: 0,
                correct: 0,
                wrong: 0,
                wrongQuestions: [],
                testName: "",
                testType: "all",
                sourceFileId: null,
                sourceWorkbookId: null,
                answered: false,
                timer: null,
                timeLeft:
                    getTestTime(),
                autoNextTimer: null
            };

            returnToTestOrigin();
        }
    );
}

function returnToTestOrigin() {
    if (
        currentFileId &&
        currentWorkbookId
    ) {
        showWorkbookPage(
            currentWorkbookId
        );
        return;
    }

    if (currentFileId) {
        showFilePage(
            currentFileId
        );
        return;
    }

    showPage("homePage");
}

/* =========================================================
   테스트 결과
   ========================================================= */

function renderResultPage() {
    const total =
        testState.questions.length;

    const accuracy =
        total
            ? Math.round(
                  testState.correct /
                      total *
                      100
              )
            : 0;

    if ($("resultTestName")) {
        $("resultTestName")
            .textContent =
            testState.testName;
    }

    if ($("resultCorrect")) {
        $("resultCorrect")
            .textContent =
            testState.correct;
    }

    if ($("resultWrong")) {
        $("resultWrong")
            .textContent =
            testState.wrong;
    }

    if ($("resultTotal")) {
        $("resultTotal")
            .textContent =
            total;
    }

    if ($("resultScore")) {
        $("resultScore")
            .textContent =
            `${accuracy}%`;
    }

    const wrongList =
        $("wrongResultList");

    if (wrongList) {
        if (
            !testState.wrongQuestions
                .length
        ) {
            wrongList.innerHTML = `
                <div class="empty">
                    🎉 틀린 단어가 없습니다.
                </div>
            `;
        } else {
            wrongList.innerHTML =
                testState.wrongQuestions
                    .map(
                        question => `
                            <div class="word-card">
                                <div class="word-top">
                                    <div class="word-en">
                                        ${escapeHTML(
                                            question.word.word
                                        )}
                                    </div>
                                </div>

                                <div class="meaning-row">
                                    <div class="meaning-text">
                                        정답:
                                        ${escapeHTML(
                                            question.word.meanings.join(
                                                " / "
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        `
                    )
                    .join("");
        }
    }

    if ($("retryWrongButton")) {
        $("retryWrongButton")
            .classList.toggle(
                "hidden",
                !testState
                    .wrongQuestions
                    .length
            );
    }

    if ($("retryWrongBtn")) {
        $("retryWrongBtn")
            .classList.toggle(
                "hidden",
                !testState
                    .wrongQuestions
                    .length
            );
    }
}

function retryWrongQuestions() {
    const wrong =
        testState.wrongQuestions;

    if (!wrong.length) {
        return;
    }

    const questions =
        shuffle(
            wrong.map(
                question => ({
                    ...question,
                    word:
                        safeClone(
                            question.word
                        )
                })
            )
        );

    const oldTestName =
        testState.testName;

    const oldFileId =
        testState.sourceFileId;

    const oldWorkbookId =
        testState.sourceWorkbookId;

    startTest(
        questions,
        `${oldTestName} · 오답 재시험`,
        "wrong-retry",
        oldFileId,
        oldWorkbookId
    );
}

/* =========================================================
   기록 / 통계
   ========================================================= */

function renderStatistics() {
    const records =
        appData.testRecords;

    const totalTests =
        records.length;

    const totalQuestions =
        records.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total || 0
                ),
            0
        );

    const totalCorrect =
        records.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.correct ||
                        0
                ),
            0
        );

    const accuracy =
        totalQuestions
            ? Math.round(
                  totalCorrect /
                      totalQuestions *
                      100
              )
            : 0;

    if ($("statisticsSummary")) {
        $("statisticsSummary")
            .innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <b>
                            ${totalTests}
                        </b>
                        <span>
                            테스트
                        </span>
                    </div>

                    <div class="stat-card">
                        <b>
                            ${totalQuestions}
                        </b>
                        <span>
                            문제
                        </span>
                    </div>

                    <div class="stat-card">
                        <b>
                            ${totalCorrect}
                        </b>
                        <span>
                            정답
                        </span>
                    </div>

                    <div class="stat-card">
                        <b>
                            ${accuracy}%
                        </b>
                        <span>
                            정확도
                        </span>
                    </div>
                </div>
            `;
    }

    const list =
        $("statisticsList");

    if (!list) {
        return;
    }

    if (!records.length) {
        list.innerHTML = `
            <div class="empty">
                아직 테스트 기록이 없습니다.
            </div>
        `;

        return;
    }

    const sorted =
        [...records].sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );

    list.innerHTML =
        sorted
            .map(record => {
                const total =
                    Number(
                        record.total || 0
                    );

                const correct =
                    Number(
                        record.correct ||
                            0
                    );

                const percent =
                    total
                        ? Math.round(
                              correct /
                                  total *
                                  100
                          )
                        : 0;

                return `
                    <div class="card">
                        <div class="section-title">
                            <div>
                                <strong>
                                    ${escapeHTML(
                                        record.testName ||
                                            "테스트"
                                    )}
                                </strong>

                                <div class="muted">
                                    ${formatDateTime(
                                        record.date
                                    )}
                                </div>
                            </div>

                            <strong>
                                ${percent}%
                            </strong>
                        </div>

                        <div class="muted">
                            ${total}문제 ·
                            정답 ${correct} ·
                            오답 ${
                                Number(
                                    record.wrong ||
                                        0
                                )
                            }
                        </div>
                    </div>
                `;
            })
            .join("");
}

/* =========================================================
   설정
   ========================================================= */

function renderSettings() {
    if ($("darkModeToggle")) {
        $("darkModeToggle")
            .checked =
            appData.theme ===
            "dark";
    }

    if ($("testTimeSelect")) {
        $("testTimeSelect")
            .value =
            String(
                getTestTime()
            );
    }

    if ($("appVersion")) {
        $("appVersion")
            .textContent =
            `v${APP_VERSION}`;
    }

    renderUsageGuide();
}

function saveTheme(theme) {
    appData.theme =
        theme === "dark"
            ? "dark"
            : "light";

    saveData();
    applyTheme();
}

function applyTheme() {
    document.body.classList.toggle(
        "dark",
        appData.theme === "dark"
    );

    if ($("darkModeToggle")) {
        $("darkModeToggle")
            .checked =
            appData.theme ===
            "dark";
    }

    if ($("headerThemeButton")) {
        $("headerThemeButton")
            .textContent =
            appData.theme ===
            "dark"
                ? "☀️"
                : "🌙";
    }
}

function changeTestTime(value) {
    appData.testTime =
        normalizeTestTime(value);

    saveData();

    showToast(
        `문제당 제한 시간이 ${appData.testTime}초로 설정되었습니다.`,
        "success"
    );
}

/* =========================================================
   사용 방법
   ========================================================= */

function versionInRange(
    item
) {
    const current =
        APP_VERSION;

    if (
        item.since &&
        compareVersions(
            current,
            item.since
        ) < 0
    ) {
        return false;
    }

    if (
        item.until &&
        compareVersions(
            current,
            item.until
        ) > 0
    ) {
        return false;
    }

    return true;
}

function compareVersions(
    a,
    b
) {
    const aa =
        String(a)
            .split(".")
            .map(Number);

    const bb =
        String(b)
            .split(".")
            .map(Number);

    for (
        let i = 0;
        i < 3;
        i++
    ) {
        const x =
            aa[i] || 0;

        const y =
            bb[i] || 0;

        if (x !== y) {
            return x > y
                ? 1
                : -1;
        }
    }

    return 0;
}

function renderUsageGuide() {
    const container =
        $("usageGuideContent");

    if (!container) {
        return;
    }

    const items =
        USAGE_GUIDE.filter(
            versionInRange
        );

    container.innerHTML = `
        <div class="guide-version">
            단어 암기장 v${APP_VERSION}
        </div>

        <p class="muted">
            현재 버전에 포함된 기능입니다.
        </p>

        ${items
            .map(
                (item, index) => `
                    <div class="guide-change">
                        <button
                            type="button"
                            data-guide-index="${index}"
                        >
                            ${escapeHTML(
                                item.version
                            )}
                            ·
                            ${escapeHTML(
                                item.title
                            )}
                            <span>
                                ▸
                            </span>
                        </button>

                        <div class="hidden">
                            ${escapeHTML(
                                item.text
                            )}
                        </div>
                    </div>
                `
            )
            .join("")}
    `;

    container
        .querySelectorAll(
            "[data-guide-index]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const content =
                        button.nextElementSibling;

                    content.classList.toggle(
                        "hidden"
                    );

                    const arrow =
                        button.querySelector(
                            "span"
                        );

                    if (arrow) {
                        arrow.textContent =
                            content.classList.contains(
                                "hidden"
                            )
                                ? "▸"
                                : "▾";
                    }
                }
            );
        });
}

/* =========================================================
   백업 / 복원
   ========================================================= */

async function exportBackup() {
    const backup = {
        format:
            "word-memorize-app-backup",
        version: 1,
        appVersion:
            APP_VERSION,
        savedAt: nowISO(),
        data: safeClone(
            appData
        )
    };

    const json =
        JSON.stringify(
            backup,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
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

    const date =
        new Date();

    const filename =
        `단어장_${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        )}-${String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )}.json`;

    link.href = url;
    link.download =
        filename;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1000
    );

    showToast(
        "백업 파일이 저장되었습니다.",
        "success"
    );
}

async function importBackup(
    file
) {
    try {
        const text =
            await file.text();

        const parsed =
            JSON.parse(text);

        if (
            !parsed ||
            parsed.format !==
                "word-memorize-app-backup" ||
            !parsed.data
        ) {
            throw new Error(
                "FORMAT"
            );
        }

        const normalized =
            normalizeData(
                parsed.data
            );

        confirmModal(
            "백업 불러오기",
            "현재 단어장과 기록을 백업 파일의 내용으로 교체하시겠습니까?",
            () => {
                appData =
                    normalized;

                saveData();
                applyTheme();
                renderHome();
                renderSettings();

                showToast(
                    "백업 파일을 불러왔습니다.",
                    "success"
                );
            }
        );
    } catch {
        showToast(
            "올바른 단어장 백업 파일이 아닙니다.",
            "error"
        );
    }
}

/* =========================================================
   모달
   ========================================================= */

function openInputModal(
    title,
    placeholder,
    onConfirm,
    initialValue = ""
) {
    const input =
        document.createElement(
            "input"
        );

    input.type = "text";
    input.placeholder =
        placeholder;
    input.value =
        initialValue;

    openCustomModal(
        title,
        input,
        () => {
            const value =
                trimText(
                    input.value
                );

            if (!value) {
                showToast(
                    "입력해주세요.",
                    "error"
                );
                return false;
            }

            return onConfirm(
                value
            );
        }
    );
}

function openCustomModal(
    title,
    body,
    onConfirm
) {
    const overlay =
        $("modalOverlay");

    const modalTitle =
        $("modalTitle");

    const modalBody =
        $("modalBody");

    const modalFooter =
        $("modalFooter");

    if (
        !overlay ||
        !modalTitle ||
        !modalBody
    ) {
        return;
    }

    modalTitle.textContent =
        title;

    modalBody.innerHTML =
        "";

    if (
        typeof body ===
        "string"
    ) {
        modalBody.innerHTML =
            body;
    } else {
        modalBody.appendChild(
            body
        );
    }

    if (modalFooter) {
        modalFooter.innerHTML = `
            <button
                type="button"
                class="secondary-btn"
                id="modalCancelButton"
            >
                취소
            </button>

            <button
                type="button"
                class="primary-btn"
                id="modalConfirmButton"
            >
                확인
            </button>
        `;
    }

    overlay.classList.remove(
        "hidden"
    );

    modalConfirmCallback =
        onConfirm;

    modalCancelCallback =
        null;

    $("modalConfirmButton")
        ?.addEventListener(
            "click",
            () => {
                const result =
                    modalConfirmCallback?.();

                if (
                    result !== false
                ) {
                    closeModal();
                }
            }
        );

    $("modalCancelButton")
        ?.addEventListener(
            "click",
            closeModal
        );

    setTimeout(
        () => {
            modalBody
                .querySelector(
                    "input, select, textarea, button"
                )
                ?.focus();
        },
        50
    );
}

function confirmModal(
    title,
    message,
    onConfirm
) {
    const overlay =
        $("modalOverlay");

    if (!overlay) {
        return;
    }

    const modalTitle =
        $("modalTitle");

    const modalBody =
        $("modalBody");

    const modalFooter =
        $("modalFooter");

    modalTitle.textContent =
        title;

    modalBody.innerHTML = `
        <p>
            ${escapeHTML(
                message
            )}
        </p>
    `;

    modalFooter.innerHTML = `
        <button
            type="button"
            class="secondary-btn"
            id="modalCancelButton"
        >
            취소
        </button>

        <button
            type="button"
            class="primary-btn"
            id="modalConfirmButton"
        >
            확인
        </button>
    `;

    overlay.classList.remove(
        "hidden"
    );

    $("modalCancelButton")
        ?.addEventListener(
            "click",
            closeModal
        );

    $("modalConfirmButton")
        ?.addEventListener(
            "click",
            () => {
                closeModal();

                if (
                    typeof onConfirm ===
                    "function"
                ) {
                    onConfirm();
                }
            }
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

    modalConfirmCallback =
        null;

    modalCancelCallback =
        null;
}

/* =========================================================
   페이지 이동
   ========================================================= */

function showPage(pageId) {
    currentPage =
        pageId;

    $$(".page").forEach(
        page => {
            page.classList.toggle(
                "active",
                page.id ===
                    pageId
            );
        }
    );

    updateNavigation(
        pageId
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (
        pageId ===
        "homePage"
    ) {
        renderHome();
    }

    if (
        pageId ===
        "filePage"
    ) {
        renderFilePage();
    }

    if (
        pageId ===
        "workbookPage"
    ) {
        renderWorkbookPage();
    }

    if (
        pageId ===
        "statisticsPage"
    ) {
        renderStatistics();
    }

    if (
        pageId ===
        "settingsPage"
    ) {
        renderSettings();
    }
}

function updateNavigation(
    pageId
) {
    $$(".nav-btn").forEach(
        button => {
            button.classList.toggle(
                "active",
                button.dataset.page ===
                    pageId
            );
        }
    );
}

/* =========================================================
   홈
   ========================================================= */

function renderHome() {
    showPageWithoutRender(
        "homePage"
    );

    const list =
        $("fileList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!appData.files.length) {
        if ($("emptyFileState")) {
            $("emptyFileState")
                .classList.remove(
                    "hidden"
                );
        }

        return;
    }

    if ($("emptyFileState")) {
        $("emptyFileState")
            .classList.add(
                "hidden"
            );
    }

    appData.files.forEach(
        file => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "bundle-row";

            row.dataset.fileId =
                file.id;

            const totalWords =
                file.wordbooks.reduce(
                    (
                        sum,
                        workbook
                    ) =>
                        sum +
                        workbook
                            .words
                            .length,
                    0
                );

            row.innerHTML = `
                <button
                    type="button"
                    class="drag-handle"
                    data-file-drag="${escapeHTML(file.id)}"
                    title="드래그해서 순서 변경"
                >
                    ☷
                </button>

                <div
                    class="bundle-main"
                    data-open-file="${escapeHTML(file.id)}"
                >
                    <div class="bundle-name">
                        📁 ${escapeHTML(
                            file.name
                        )}
                    </div>

                    <div class="bundle-meta">
                        ${
                            escapeHTML(
                                file.description ||
                                    `${file.wordbooks.length}개 단어장`
                            )
                        }
                    </div>
                </div>

                <div class="bundle-count">
                    ${totalWords}개 단어
                </div>

                <button
                    type="button"
                    class="mini-btn"
                    data-rename-file="${escapeHTML(file.id)}"
                >
                    ✏️
                </button>

                <button
                    type="button"
                    class="mini-btn danger"
                    data-delete-file="${escapeHTML(file.id)}"
                >
                    🗑
                </button>
            `;

            list.appendChild(
                row
            );
        }
    );

    list.querySelectorAll(
        "[data-open-file]"
    ).forEach(element => {
        element.addEventListener(
            "click",
            () =>
                showFilePage(
                    element.dataset
                        .openFile
                )
        );
    });

    list.querySelectorAll(
        "[data-rename-file]"
    ).forEach(element => {
        element.addEventListener(
            "click",
            () =>
                renameFile(
                    element.dataset
                        .renameFile
                )
        );
    });

    list.querySelectorAll(
        "[data-delete-file]"
    ).forEach(element => {
        element.addEventListener(
            "click",
            () =>
                deleteFile(
                    element.dataset
                        .deleteFile
                )
        );
    });

    setupFileDrag();
}

function showPageWithoutRender(
    pageId
) {
    currentPage =
        pageId;

    $$(".page").forEach(
        page =>
            page.classList.toggle(
                "active",
                page.id ===
                    pageId
            )
    );

    updateNavigation(
        pageId
    );
}

/* =========================================================
   사이드바
   ========================================================= */

function openSidebar() {
    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (!sidebar) {
        return;
    }

    sidebar.classList.add(
        "open"
    );

    document.body.classList.add(
        "sidebar-open"
    );
}

function closeSidebar() {
    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (!sidebar) {
        return;
    }

    sidebar.classList.remove(
        "open"
    );

    document.body.classList.remove(
        "sidebar-open"
    );
}

function setupSidebarSwipe() {
    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (!sidebar) {
        return;
    }

    let startX = 0;
    let startY = 0;
    let tracking = false;

    sidebar.addEventListener(
        "touchstart",
        event => {
            if (
                !sidebar.classList.contains(
                    "open"
                )
            ) {
                return;
            }

            const touch =
                event.touches[0];

            if (!touch) {
                return;
            }

            startX =
                touch.clientX;

            startY =
                touch.clientY;

            tracking = true;
        },
        {
            passive: true
        }
    );

    sidebar.addEventListener(
        "touchend",
        event => {
            if (!tracking) {
                return;
            }

            const touch =
                event.changedTouches[0];

            tracking = false;

            if (!touch) {
                return;
            }

            const dx =
                touch.clientX -
                startX;

            const dy =
                touch.clientY -
                startY;

            if (
                dx < -60 &&
                Math.abs(dx) >
                    Math.abs(dy)
            ) {
                closeSidebar();
            }
        },
        {
            passive: true
        }
    );

    sidebar.addEventListener(
        "touchcancel",
        () => {
            tracking = false;
        },
        {
            passive: true
        }
    );
}

/* =========================================================
   이벤트 설정
   ========================================================= */

function setupEvents() {
    $("addFileButton")
        ?.addEventListener(
            "click",
            addFile
        );

    $("emptyAddFileButton")
        ?.addEventListener(
            "click",
            addFile
        );

    $("addWorkbookButton")
        ?.addEventListener(
            "click",
            addWorkbook
        );

    $("emptyAddWorkbookButton")
        ?.addEventListener(
            "click",
            addWorkbook
        );

    $("backToHomeButton")
        ?.addEventListener(
            "click",
            () =>
                showPage(
                    "homePage"
                )
        );

    $("backToFileButton")
        ?.addEventListener(
            "click",
            () => {
                if (
                    currentFileId
                ) {
                    showFilePage(
                        currentFileId
                    );
                } else {
                    showPage(
                        "homePage"
                    );
                }
            }
        );

    $("fileTestButton")
        ?.addEventListener(
            "click",
            openTotalTestMenu
        );

    $("addWordButton")
        ?.addEventListener(
            "click",
            openWorkbookTestMenu
        );

    $("bulkAddWordButton")
        ?.addEventListener(
            "click",
            addBulkWords
        );

    $("wordSearch")
        ?.addEventListener(
            "input",
            renderWords
        );

    $("wordSort")
        ?.addEventListener(
            "change",
            renderWords
        );

    $("selectAllWords")
        ?.addEventListener(
            "change",
            event => {
                const workbook =
                    getCurrentWorkbook();

                if (!workbook) {
                    return;
                }

                const checked =
                    event.currentTarget
                        .checked;

                workbook.words.forEach(
                    word => {
                        if (checked) {
                            selectedWordIds.add(
                                word.id
                            );
                        } else {
                            selectedWordIds.delete(
                                word.id
                            );
                        }
                    }
                );

                renderWords();
            }
        );

    $("bulkImportantOnButton")
        ?.addEventListener(
            "click",
            () =>
                bulkAction(
                    "on"
                )
        );

    $("bulkImportantOffButton")
        ?.addEventListener(
            "click",
            () =>
                bulkAction(
                    "off"
                )
        );

    $("bulkDeleteButton")
        ?.addEventListener(
            "click",
            () =>
                bulkAction(
                    "delete"
                )
        );

    $("testSubmitButton")
        ?.addEventListener(
            "click",
            () =>
                handleAnswer(
                    $("testAnswerInput")
                        ?.value ||
                        ""
                )
        );

    $("testAnswerInput")
        ?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    if (
                        !testState
                            .answered
                    ) {
                        handleAnswer(
                            event
                                .currentTarget
                                .value
                        );
                    }
                }
            }
        );

    $("testBackButton")
        ?.addEventListener(
            "click",
            leaveTest
        );

    $("retryWrongButton")
        ?.addEventListener(
            "click",
            retryWrongQuestions
        );

    $("retryWrongBtn")
        ?.addEventListener(
            "click",
            retryWrongQuestions
        );

    $("resultHomeButton")
        ?.addEventListener(
            "click",
            () => {
                testState =
                    createEmptyTestState();

                showPage(
                    "homePage"
                );
            }
        );

    $("resultHomeBtn")
        ?.addEventListener(
            "click",
            () => {
                testState =
                    createEmptyTestState();

                showPage(
                    "homePage"
                );
            }
        );

    $("resultCurrentButton")
        ?.addEventListener(
            "click",
            () => {
                const fileId =
                    testState
                        .sourceFileId;

                const workbookId =
                    testState
                        .sourceWorkbookId;

                testState =
                    createEmptyTestState();

                if (
                    workbookId &&
                    fileId
                ) {
                    showWorkbookPage(
                        workbookId
                    );
                } else if (
                    fileId
                ) {
                    showFilePage(
                        fileId
                    );
                } else {
                    showPage(
                        "homePage"
                    );
                }
            }
        );

    $("testTimeSelect")
        ?.addEventListener(
            "change",
            event =>
                changeTestTime(
                    event
                        .currentTarget
                        .value
                )
        );

    $("darkModeToggle")
        ?.addEventListener(
            "change",
            event =>
                saveTheme(
                    event
                        .currentTarget
                        .checked
                        ? "dark"
                        : "light"
                )
        );

    $("headerThemeButton")
        ?.addEventListener(
            "click",
            () =>
                saveTheme(
                    appData.theme ===
                        "dark"
                        ? "light"
                        : "dark"
                )
        );

    $("mobileMenuButton")
        ?.addEventListener(
            "click",
            () => {
                const sidebar =
                    document.querySelector(
                        ".sidebar"
                    );

                if (
                    sidebar?.classList.contains(
                        "open"
                    )
                ) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            }
        );

    $("headerHomeButton")
        ?.addEventListener(
            "click",
            () => {
                closeSidebar();

                if (
                    currentPage ===
                    "testPage"
                ) {
                    leaveTest();
                    return;
                }

                showPage(
                    "homePage"
                );
            }
        );

    $("modalCloseButton")
        ?.addEventListener(
            "click",
            closeModal
        );

    $("modalOverlay")
        ?.addEventListener(
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

    $("usageGuideButton")
        ?.addEventListener(
            "click",
            () => {
                const content =
                    $("usageGuideContent");

                const arrow =
                    $("usageGuideArrow");

                if (!content) {
                    return;
                }

                content.classList.toggle(
                    "hidden"
                );

                if (arrow) {
                    arrow.textContent =
                        content.classList.contains(
                            "hidden"
                        )
                            ? "▸"
                            : "▾";
                }
            }
        );

    $("exportButton")
        ?.addEventListener(
            "click",
            exportBackup
        );

    $("importInput")
        ?.addEventListener(
            "change",
            event => {
                const file =
                    event
                        .currentTarget
                        .files?.[0];

                if (file) {
                    importBackup(
                        file
                    );
                }

                event.currentTarget
                    .value = "";
            }
        );

    $("saveDataButton")
        ?.addEventListener(
            "click",
            exportBackup
        );

    $("restoreInput")
        ?.addEventListener(
            "change",
            event => {
                const file =
                    event
                        .currentTarget
                        .files?.[0];

                if (file) {
                    importBackup(
                        file
                    );
                }

                event.currentTarget
                    .value = "";
            }
        );

    $$(".nav-btn").forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    closeSidebar();

                    const page =
                        button.dataset
                            .page;

                    if (
                        currentPage ===
                            "testPage" &&
                        testState
                            .questions
                            .length
                    ) {
                        leaveTest();
                        return;
                    }

                    showPage(
                        page
                    );
                }
            );
        }
    );
}

/* =========================================================
   테스트 상태 초기화
   ========================================================= */

function createEmptyTestState() {
    return {
        questions: [],
        currentIndex: 0,
        correct: 0,
        wrong: 0,
        wrongQuestions: [],
        testName: "",
        testType: "all",
        sourceFileId: null,
        sourceWorkbookId: null,
        answered: false,
        timer: null,
        timeLeft:
            getTestTime(),
        autoNextTimer: null
    };
}

/* =========================================================
   서비스 워커
   ========================================================= */

function registerServiceWorker() {
    if (
        location.protocol !==
            "https:" ||
        !("serviceWorker" in
            navigator)
    ) {
        return;
    }

    navigator.serviceWorker
        .register("./sw.js")
        .catch(() => {});
}

/* =========================================================
   초기화
   ========================================================= */

function initialize() {
    appData =
        normalizeData(
            appData
        );

    applyTheme();

    setupEvents();

    setupSidebarSwipe();

    renderHome();

    renderSettings();

    registerServiceWorker();
}

/* =========================================================
   전역 함수
   ========================================================= */

window.openFile =
    showFilePage;

window.renameFile =
    renameFile;

window.deleteFile =
    deleteFile;

window.openWorkbook =
    showWorkbookPage;

window.renameWorkbook =
    renameWorkbook;

window.deleteWorkbook =
    deleteWorkbook;

window.editWord =
    editWord;

window.deleteWord =
    deleteWord;

window.closeModal =
    closeModal;

window.openQuickTestMenu =
    openQuickTestMenu;

window.startFileTest =
    startFileTest;

window.startWorkbookTest =
    startWorkbookTest;

window.startQuickTest =
    startQuickTest;

/* =========================================================
   실행
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);
