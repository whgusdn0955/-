/* =========================================================
   단어 암기장
   최종 app.js
   ========================================================= */

"use strict";


/* =========================================================
   저장
   ========================================================= */

const STORAGE_KEY = "word_memorize_app_final_v1";

const DEFAULT_DATA = {
    files: [],
    testRecords: [],
    theme: "light"
};


let appData = loadData();

let currentFileId = null;
let currentWorkbookId = null;

let draggedFileId = null;
let draggedWorkbookId = null;
let draggedWordId = null;


/* =========================================================
   테스트 상태
   ========================================================= */

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
    timeLeft: 10,

    autoNextTimer: null
};


/* =========================================================
   DOM
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   ID
   ========================================================= */

function makeId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}


/* =========================================================
   데이터
   ========================================================= */

function loadData() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return normalizeData(
                structuredClone(DEFAULT_DATA)
            );
        }

        return normalizeData(
            JSON.parse(saved)
        );

    } catch (error) {

        console.error(
            "데이터 불러오기 실패:",
            error
        );

        return normalizeData(
            structuredClone(DEFAULT_DATA)
        );
    }
}


function normalizeData(data) {

    const result = {
        files: [],
        testRecords: Array.isArray(data?.testRecords)
            ? data.testRecords
            : [],
        theme:
            data?.theme === "dark"
                ? "dark"
                : "light"
    };


    if (!Array.isArray(data?.files)) {
        return result;
    }


    result.files =
        data.files.map(file => {

            const normalizedFile = {

                id:
                    file.id ||
                    makeId(),

                name:
                    String(
                        file.name ||
                        "새 파일"
                    ),

                createdAt:
                    file.createdAt ||
                    new Date().toISOString(),

                wordbooks: []

            };


            if (
                Array.isArray(
                    file.wordbooks
                )
            ) {

                normalizedFile.wordbooks =
                    file.wordbooks.map(book => {

                        const normalizedBook = {

                            id:
                                book.id ||
                                makeId(),

                            name:
                                String(
                                    book.name ||
                                    "새 단어장"
                                ),

                            createdAt:
                                book.createdAt ||
                                new Date().toISOString(),

                            words: []

                        };


                        if (
                            Array.isArray(
                                book.words
                            )
                        ) {

                            normalizedBook.words =
                                book.words
                                    .map(word => {

                                        const meanings =
                                            Array.isArray(
                                                word.meanings
                                            )
                                                ? word.meanings
                                                : (
                                                    word.meaning
                                                        ? [
                                                            word.meaning
                                                        ]
                                                        : []
                                                );


                                        return {

                                            id:
                                                word.id ||
                                                makeId(),

                                            word:
                                                String(
                                                    word.word ||
                                                    ""
                                                ).trim(),

                                            meanings:
                                                meanings
                                                    .map(
                                                        meaning =>
                                                            String(
                                                                meaning
                                                            ).trim()
                                                    )
                                                    .filter(
                                                        Boolean
                                                    ),

                                            correct:
                                                Math.max(
                                                    0,
                                                    Number(
                                                        word.correct
                                                    ) || 0
                                                ),

                                            wrong:
                                                Math.max(
                                                    0,
                                                    Number(
                                                        word.wrong
                                                    ) || 0
                                                ),

                                            important:
                                                Boolean(
                                                    word.important
                                                )

                                        };

                                    })
                                    .filter(
                                        word =>
                                            word.word &&
                                            word.meanings.length
                                    );

                        }


                        return normalizedBook;

                    });

            }


            return normalizedFile;

        });


    return result;
}


function saveData() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(appData)
        );

    } catch (error) {

        console.error(
            "데이터 저장 실패:",
            error
        );

        showToast(
            "데이터 저장에 실패했습니다.",
            "error"
        );
    }
}


/* =========================================================
   보안
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
   데이터 찾기
   ========================================================= */

function getFile(fileId) {

    return appData.files.find(
        file =>
            file.id === fileId
    );
}


function getWorkbook(
    fileId,
    workbookId
) {

    const file =
        getFile(fileId);

    if (!file) {
        return null;
    }

    return file.wordbooks.find(
        workbook =>
            workbook.id === workbookId
    );
}


function getCurrentFile() {

    return getFile(
        currentFileId
    );
}


function getCurrentWorkbook() {

    return getWorkbook(
        currentFileId,
        currentWorkbookId
    );
}


/* =========================================================
   단어 관련
   ========================================================= */

function getTotalWordCount(file) {

    if (!file) {
        return 0;
    }

    return file.wordbooks.reduce(
        (total, workbook) =>
            total + workbook.words.length,
        0
    );
}


function getAttemptCount(word) {

    return (
        Number(word.correct) +
        Number(word.wrong)
    );
}


function updateImportantStatus(word) {

    const attempts =
        getAttemptCount(word);

    if (attempts === 0) {

        word.important = false;

        return;
    }


    const wrongRate =
        word.wrong /
        attempts;


    word.important =
        wrongRate > 0.7;
}


/* =========================================================
   뜻 정리
   ========================================================= */

function normalizeMeanings(meanings) {

    const result = [];

    meanings.forEach(
        meaning => {

            const clean =
                String(
                    meaning
                ).trim();

            if (!clean) {
                return;
            }

            if (
                !result.includes(
                    clean
                )
            ) {
                result.push(clean);
            }

        }
    );

    return result;
}


function getMeaningsText(word) {

    return word.meanings
        .map(
            meaning =>
                escapeHTML(meaning)
        )
        .join(", ");
}


/* =========================================================
   토스트
   ========================================================= */

function showToast(
    message,
    type = "normal"
) {

    const container =
        $("toastContainer");

    if (!container) {
        return;
    }


    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast-${type}`;

    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.classList.add(
                "hide"
            );

            setTimeout(
                () => {
                    toast.remove();
                },
                300
            );

        },
        2500
    );
}


/* =========================================================
   페이지
   ========================================================= */

const pageMap = {

    home: "homePage",

    file: "filePage",

    workbook: "workbookPage",

    statistics:
        "statisticsPage",

    settings:
        "settingsPage",

    test:
        "testPage",

    result:
        "resultPage"

};


function hideAllPages() {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(
            page =>
                page.classList.remove(
                    "active"
                )
        );
}


function updateMainNavigation(
    pageName
) {

    const mainPage =
        ["home", "statistics", "settings"]
            .includes(pageName)
            ? pageName
            : null;


    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                    mainPage
                );

            }
        );


    document
        .querySelectorAll(
            ".mobile-nav-item"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                    mainPage
                );

            }
        );
}


function showPage(
    pageName
) {

    hideAllPages();

    const pageId =
        pageMap[pageName];

    if (!pageId) {
        return;
    }


    const page =
        $(pageId);

    if (page) {
        page.classList.add(
            "active"
        );
    }


    updateMainNavigation(
        pageName
    );

    closeSidebar();
}


/* =========================================================
   홈
   ========================================================= */

function showHomePage() {

    stopTimer();

    currentFileId = null;

    currentWorkbookId = null;

    showPage("home");

    renderFileList();
}


/* =========================================================
   파일
   ========================================================= */

function showFilePage(
    fileId
) {

    const file =
        getFile(fileId);

    if (!file) {

        showHomePage();

        return;
    }


    stopTimer();

    currentFileId =
        fileId;

    currentWorkbookId =
        null;


    showPage("file");


    $("currentFileTitle").textContent =
        file.name;

    $("currentFileBreadcrumb").textContent =
        file.name;

    $("currentFileDescription").textContent =
        `단어장 ${file.wordbooks.length}개 · 총 ${getTotalWordCount(file)}개의 단어`;


    renderWorkbookList();
}


/* =========================================================
   단어장
   ========================================================= */

function showWorkbookPage(
    fileId,
    workbookId
) {

    const file =
        getFile(fileId);

    const workbook =
        getWorkbook(
            fileId,
            workbookId
        );


    if (!file || !workbook) {

        showHomePage();

        return;
    }


    stopTimer();

    currentFileId =
        fileId;

    currentWorkbookId =
        workbookId;


    showPage("workbook");


    $("currentWorkbookTitle").textContent =
        workbook.name;

    $("currentWorkbookBreadcrumb").textContent =
        workbook.name;


    renderWordList();
}


/* =========================================================
   사이드바
   ========================================================= */

function openSidebar() {

    const sidebar =
        $("sidebar");

    if (sidebar) {
        sidebar.classList.add(
            "open"
        );
    }
}


function closeSidebar() {

    const sidebar =
        $("sidebar");

    if (sidebar) {
        sidebar.classList.remove(
            "open"
        );
    }
}


/* =========================================================
   파일 목록
   ========================================================= */

function renderFileList() {

    const list =
        $("fileList");

    const empty =
        $("emptyFileState");


    if (!list) {
        return;
    }


    if (
        appData.files.length === 0
    ) {

        list.innerHTML = "";

        empty?.classList.remove(
            "hidden"
        );

        return;
    }


    empty?.classList.add(
        "hidden"
    );


    list.innerHTML =
        appData.files
            .map(
                file => {

                    const count =
                        getTotalWordCount(
                            file
                        );


                    return `

                        <div
                            class="file-card"
                            draggable="true"
                            data-file-id="${escapeHTML(file.id)}"
                        >

                            <div
                                class="file-card-main"
                                onclick="openFile('${file.id}')"
                            >

                                <div class="file-icon">
                                    📁
                                </div>

                                <div class="file-info">

                                    <h3>
                                        ${escapeHTML(file.name)}
                                    </h3>

                                    <p>
                                        단어장 ${file.wordbooks.length}개
                                        · 단어 ${count}개
                                    </p>

                                </div>

                            </div>


                            <div class="file-actions">

                                <button
                                    type="button"
                                    title="이름 변경"
                                    onclick="event.stopPropagation(); renameFile('${file.id}')"
                                >
                                    ✏️
                                </button>

                                <button
                                    type="button"
                                    title="삭제"
                                    onclick="event.stopPropagation(); deleteFile('${file.id}')"
                                >
                                    🗑️
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    setupFileDragAndDrop();
}


/* =========================================================
   파일 추가
   ========================================================= */

function addFile() {

    openInputModal(
        "파일 추가",
        "파일 이름을 입력하세요.",
        "",
        name => {

            appData.files.push({

                id:
                    makeId(),

                name:
                    name.trim(),

                createdAt:
                    new Date().toISOString(),

                wordbooks: []

            });


            saveData();

            renderFileList();

            showToast(
                "파일이 추가되었습니다."
            );

        }
    );
}


/* =========================================================
   파일 이름 변경
   ========================================================= */

function renameFile(
    fileId
) {

    const file =
        getFile(fileId);

    if (!file) {
        return;
    }


    openInputModal(
        "파일 이름 변경",
        "새 파일 이름을 입력하세요.",
        file.name,
        name => {

            file.name =
                name.trim();

            saveData();

            renderFileList();


            if (
                currentFileId ===
                fileId
            ) {

                $("currentFileTitle").textContent =
                    file.name;

                $("currentFileBreadcrumb").textContent =
                    file.name;

            }


            showToast(
                "파일 이름이 변경되었습니다."
            );

        }
    );
}


/* =========================================================
   파일 삭제
   ========================================================= */

function deleteFile(
    fileId
) {

    const file =
        getFile(fileId);

    if (!file) {
        return;
    }


    openConfirmModal(
        "파일 삭제",
        `"${file.name}" 파일을 삭제할까요?\n파일 안의 모든 단어장과 단어도 함께 삭제됩니다.`,
        () => {

            appData.files =
                appData.files.filter(
                    item =>
                        item.id !==
                        fileId
                );


            saveData();


            if (
                currentFileId ===
                fileId
            ) {

                showHomePage();

            } else {

                renderFileList();

            }


            showToast(
                "파일이 삭제되었습니다."
            );

        }
    );
}


function openFile(
    fileId
) {

    showFilePage(
        fileId
    );
}


/* =========================================================
   파일 드래그
   ========================================================= */

function setupFileDragAndDrop() {

    document
        .querySelectorAll(
            ".file-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "dragstart",
                    () => {

                        draggedFileId =
                            card.dataset.fileId;

                        card.classList.add(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragend",
                    () => {

                        draggedFileId =
                            null;

                        card.classList.remove(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragover",
                    event => {

                        event.preventDefault();

                    }
                );


                card.addEventListener(
                    "drop",
                    event => {

                        event.preventDefault();


                        const targetId =
                            card.dataset.fileId;


                        if (
                            !draggedFileId ||
                            draggedFileId ===
                            targetId
                        ) {
                            return;
                        }


                        reorderFiles(
                            draggedFileId,
                            targetId
                        );

                    }
                );

            }
        );
}


function reorderFiles(
    sourceId,
    targetId
) {

    const sourceIndex =
        appData.files.findIndex(
            file =>
                file.id ===
                sourceId
        );


    const targetIndex =
        appData.files.findIndex(
            file =>
                file.id ===
                targetId
        );


    if (
        sourceIndex < 0 ||
        targetIndex < 0
    ) {
        return;
    }


    const [
        moved
    ] =
        appData.files.splice(
            sourceIndex,
            1
        );


    appData.files.splice(
        targetIndex,
        0,
        moved
    );


    saveData();

    renderFileList();
}


/* =========================================================
   단어장 목록
   ========================================================= */

function renderWorkbookList() {

    const file =
        getCurrentFile();

    const list =
        $("workbookList");

    const empty =
        $("emptyWorkbookState");


    if (!file || !list) {
        return;
    }


    if (
        file.wordbooks.length === 0
    ) {

        list.innerHTML = "";

        empty?.classList.remove(
            "hidden"
        );

        return;
    }


    empty?.classList.add(
        "hidden"
    );


    list.innerHTML =
        file.wordbooks
            .map(
                workbook => {

                    const importantCount =
                        workbook.words.filter(
                            word =>
                                word.important
                        ).length;


                    return `

                        <div
                            class="workbook-card"
                            draggable="true"
                            data-workbook-id="${escapeHTML(workbook.id)}"
                        >

                            <div
                                class="workbook-card-main"
                                onclick="openWorkbook('${file.id}', '${workbook.id}')"
                            >

                                <div class="workbook-icon">
                                    📖
                                </div>

                                <div class="workbook-info">

                                    <h3>
                                        ${escapeHTML(workbook.name)}
                                    </h3>

                                    <p>
                                        ${workbook.words.length}개 단어

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
                                    onclick="event.stopPropagation(); renameWorkbook('${workbook.id}')"
                                >
                                    ✏️
                                </button>

                                <button
                                    type="button"
                                    title="삭제"
                                    onclick="event.stopPropagation(); deleteWorkbook('${workbook.id}')"
                                >
                                    🗑️
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    setupWorkbookDragAndDrop();
}


/* =========================================================
   단어장 추가
   ========================================================= */

function addWorkbook() {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    openInputModal(
        "단어장 추가",
        "단어장 이름을 입력하세요.",
        "",
        name => {

            file.wordbooks.push({

                id:
                    makeId(),

                name:
                    name.trim(),

                createdAt:
                    new Date().toISOString(),

                words: []

            });


            saveData();

            renderWorkbookList();

            showToast(
                "단어장이 추가되었습니다."
            );

        }
    );
}


/* =========================================================
   단어장 이름 변경
   ========================================================= */

function renameWorkbook(
    workbookId
) {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const workbook =
        file.wordbooks.find(
            item =>
                item.id ===
                workbookId
        );


    if (!workbook) {
        return;
    }


    openInputModal(
        "단어장 이름 변경",
        "새 단어장 이름을 입력하세요.",
        workbook.name,
        name => {

            workbook.name =
                name.trim();

            saveData();

            renderWorkbookList();


            if (
                currentWorkbookId ===
                workbookId
            ) {

                $("currentWorkbookTitle").textContent =
                    workbook.name;

                $("currentWorkbookBreadcrumb").textContent =
                    workbook.name;

            }


            showToast(
                "단어장 이름이 변경되었습니다."
            );

        }
    );
}


/* =========================================================
   단어장 삭제
   ========================================================= */

function deleteWorkbook(
    workbookId
) {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const workbook =
        file.wordbooks.find(
            item =>
                item.id ===
                workbookId
        );


    if (!workbook) {
        return;
    }


    openConfirmModal(
        "단어장 삭제",
        `"${workbook.name}" 단어장을 삭제할까요?\n단어장 안의 모든 단어도 함께 삭제됩니다.`,
        () => {

            file.wordbooks =
                file.wordbooks.filter(
                    item =>
                        item.id !==
                        workbookId
                );


            saveData();


            if (
                currentWorkbookId ===
                workbookId
            ) {

                currentWorkbookId =
                    null;

                showFilePage(
                    file.id
                );

            } else {

                renderWorkbookList();

            }


            showToast(
                "단어장이 삭제되었습니다."
            );

        }
    );
}


function openWorkbook(
    fileId,
    workbookId
) {

    showWorkbookPage(
        fileId,
        workbookId
    );
}


/* =========================================================
   단어장 드래그
   ========================================================= */

function setupWorkbookDragAndDrop() {

    document
        .querySelectorAll(
            ".workbook-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "dragstart",
                    () => {

                        draggedWorkbookId =
                            card.dataset.workbookId;

                        card.classList.add(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragend",
                    () => {

                        draggedWorkbookId =
                            null;

                        card.classList.remove(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragover",
                    event => {

                        event.preventDefault();

                    }
                );


                card.addEventListener(
                    "drop",
                    event => {

                        event.preventDefault();


                        const targetId =
                            card.dataset.workbookId;


                        if (
                            !draggedWorkbookId ||
                            draggedWorkbookId ===
                            targetId
                        ) {
                            return;
                        }


                        reorderWorkbooks(
                            draggedWorkbookId,
                            targetId
                        );

                    }
                );

            }
        );
}


function reorderWorkbooks(
    sourceId,
    targetId
) {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const sourceIndex =
        file.wordbooks.findIndex(
            book =>
                book.id ===
                sourceId
        );


    const targetIndex =
        file.wordbooks.findIndex(
            book =>
                book.id ===
                targetId
        );


    if (
        sourceIndex < 0 ||
        targetIndex < 0
    ) {
        return;
    }


    const [
        moved
    ] =
        file.wordbooks.splice(
            sourceIndex,
            1
        );


    file.wordbooks.splice(
        targetIndex,
        0,
        moved
    );


    saveData();

    renderWorkbookList();
}


/* =========================================================
   단어 입력
   ========================================================= */

function parseBulkInput(
    input
) {

    const results = [];


    const chunks =
        input
            .split("/")
            .map(
                chunk =>
                    chunk.trim()
            )
            .filter(Boolean);


    chunks.forEach(
        chunk => {

            const colonIndex =
                chunk.indexOf(":");


            if (colonIndex === -1) {
                return;
            }


            const word =
                chunk
                    .slice(
                        0,
                        colonIndex
                    )
                    .trim();


            const meaningText =
                chunk
                    .slice(
                        colonIndex + 1
                    )
                    .trim();


            if (
                !word ||
                !meaningText
            ) {
                return;
            }


            const meanings =
                normalizeMeanings(
                    meaningText
                        .split(",")
                );


            if (
                meanings.length === 0
            ) {
                return;
            }


            results.push({

                word,

                meanings

            });

        }
    );


    return results;
}


/* =========================================================
   단어 추가
   ========================================================= */

function addBulkWords() {

    const workbook =
        getCurrentWorkbook();

    const input =
        $("bulkWordInput");


    if (
        !workbook ||
        !input
    ) {
        return;
    }


    const text =
        input.value.trim();


    if (!text) {

        showToast(
            "단어를 입력해주세요.",
            "error"
        );

        return;
    }


    const parsed =
        parseBulkInput(
            text
        );


    if (
        parsed.length === 0
    ) {

        showToast(
            "입력 형식을 확인해주세요.",
            "error"
        );

        return;
    }


    let addedWords = 0;

    let addedMeanings = 0;

    let duplicates = 0;


    parsed.forEach(
        item => {

            let existing =
                workbook.words.find(
                    word =>
                        word.word
                            .toLowerCase() ===
                        item.word
                            .toLowerCase()
                );


            if (!existing) {

                existing = {

                    id:
                        makeId(),

                    word:
                        item.word,

                    meanings:
                        [],

                    correct:
                        0,

                    wrong:
                        0,

                    important:
                        false

                };


                workbook.words.push(
                    existing
                );


                addedWords++;

            }


            item.meanings.forEach(
                meaning => {

                    const duplicate =
                        existing.meanings.some(
                            current =>
                                current ===
                                meaning
                        );


                    if (duplicate) {

                        duplicates++;

                        return;
                    }


                    existing.meanings.push(
                        meaning
                    );


                    addedMeanings++;

                }
            );

        }
    );


    saveData();

    input.value = "";

    renderWordList();


    if (addedWords > 0) {

        showToast(
            `단어 ${addedWords}개가 추가되었습니다.`
        );

    } else if (
        addedMeanings > 0
    ) {

        showToast(
            `새로운 뜻 ${addedMeanings}개가 추가되었습니다.`
        );

    } else {

        showToast(
            "새롭게 추가된 내용이 없습니다.",
            "error"
        );

    }


    if (duplicates > 0) {

        setTimeout(
            () => {

                showToast(
                    `중복된 뜻 ${duplicates}개는 제외되었습니다.`
                );

            },
            350
        );

    }

}


/* =========================================================
   단어 하나 추가
   ========================================================= */

function addSingleWord() {

    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }


    openInputModal(
        "단어 추가",
        "영어 단어를 입력하세요.",
        "",
        word => {

            openInputModal(
                "뜻 입력",
                "뜻을 입력하세요.",
                "",
                meaning => {

                    const cleanWord =
                        word.trim();

                    const cleanMeaning =
                        meaning.trim();


                    let existing =
                        workbook.words.find(
                            item =>
                                item.word
                                    .toLowerCase() ===
                                cleanWord
                                    .toLowerCase()
                        );


                    if (!existing) {

                        workbook.words.push({

                            id:
                                makeId(),

                            word:
                                cleanWord,

                            meanings:
                                [cleanMeaning],

                            correct:
                                0,

                            wrong:
                                0,

                            important:
                                false

                        });

                    } else {

                        if (
                            existing.meanings.includes(
                                cleanMeaning
                            )
                        ) {

                            showToast(
                                "같은 단어와 뜻이 이미 등록되어 있습니다.",
                                "error"
                            );

                            return;
                        }


                        existing.meanings.push(
                            cleanMeaning
                        );

                    }


                    saveData();

                    renderWordList();

                    showToast(
                        "단어가 추가되었습니다."
                    );

                }
            );

        }
    );
}


/* =========================================================
   단어 목록
   ========================================================= */

function renderWordList() {

    const workbook =
        getCurrentWorkbook();

    const list =
        $("wordList");

    const empty =
        $("emptyWordState");


    if (
        !workbook ||
        !list
    ) {
        return;
    }


    const words =
        workbook.words
            .map(
                (
                    word,
                    index
                ) => ({
                    word,
                    index
                })
            )
            .sort(
                (a, b) => {

                    if (
                        a.word.important &&
                        !b.word.important
                    ) {
                        return -1;
                    }

                    if (
                        !a.word.important &&
                        b.word.important
                    ) {
                        return 1;
                    }

                    return (
                        a.index -
                        b.index
                    );

                }
            );


    if (
        words.length === 0
    ) {

        list.innerHTML = "";

        empty?.classList.remove(
            "hidden"
        );

        updateWordCountUI(
            0
        );

        return;
    }


    empty?.classList.add(
        "hidden"
    );


    updateWordCountUI(
        workbook.words.length
    );


    list.innerHTML =
        words
            .map(
                (
                    item,
                    displayIndex
                ) => {

                    const word =
                        item.word;

                    const attempts =
                        getAttemptCount(
                            word
                        );


                    return `

                        <div
                            class="
                                word-card
                                ${
                                    word.important
                                        ? "important-word"
                                        : ""
                                }
                            "
                            draggable="true"
                            data-word-id="${escapeHTML(word.id)}"
                        >

                            <div class="word-number">
                                ${displayIndex + 1}
                            </div>


                            <div class="word-main">

                                <div class="word-title">

                                    ${
                                        word.important
                                            ? `<span class="important-star">⭐</span>`
                                            : ""
                                    }

                                    <strong>
                                        ${escapeHTML(word.word)}
                                    </strong>

                                </div>


                                <div class="word-meaning">
                                    ${getMeaningsText(word)}
                                </div>


                                ${
                                    attempts > 0
                                        ? `
                                            <div class="word-stat">
                                                정답 ${word.correct}
                                                · 오답 ${word.wrong}
                                            </div>
                                        `
                                        : ""
                                }

                            </div>


                            <div class="word-actions">

                                <button
                                    type="button"
                                    title="수정"
                                    onclick="editWord('${word.id}')"
                                >
                                    ✏️
                                </button>

                                <button
                                    type="button"
                                    title="삭제"
                                    onclick="deleteWord('${word.id}')"
                                >
                                    🗑️
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    setupWordDragAndDrop();
}


function updateWordCountUI(
    count
) {

    $("wordCountDescription").textContent =
        `${count}개의 단어`;

    $("wordListCount").textContent =
        `${count}개`;
}


/* =========================================================
   단어 수정
   ========================================================= */

function editWord(
    wordId
) {

    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }


    const word =
        workbook.words.find(
            item =>
                item.id ===
                wordId
        );


    if (!word) {
        return;
    }


    openInputModal(
        "단어 수정",
        "영어 단어를 입력하세요.",
        word.word,
        newWord => {

            openInputModal(
                "뜻 수정",
                "뜻을 입력하세요. 여러 뜻은 쉼표로 입력할 수 있습니다.",
                word.meanings.join(","),
                newMeaningText => {

                    const cleanWord =
                        newWord.trim();

                    const meanings =
                        normalizeMeanings(
                            newMeaningText.split(",")
                        );


                    const duplicateWord =
                        workbook.words.find(
                            item =>
                                item.id !== wordId &&
                                item.word
                                    .toLowerCase() ===
                                cleanWord
                                    .toLowerCase()
                        );


                    if (
                        duplicateWord
                    ) {

                        const duplicateMeaning =
                            meanings.some(
                                meaning =>
                                    duplicateWord.meanings.includes(
                                        meaning
                                    )
                            );


                        if (
                            duplicateMeaning
                        ) {

                            showToast(
                                "같은 단어와 뜻이 이미 있습니다.",
                                "error"
                            );

                            return;
                        }

                    }


                    word.word =
                        cleanWord;

                    word.meanings =
                        meanings;


                    saveData();

                    renderWordList();

                    showToast(
                        "단어가 수정되었습니다."
                    );

                }
            );

        }
    );
}


/* =========================================================
   단어 삭제
   ========================================================= */

function deleteWord(
    wordId
) {

    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }


    const word =
        workbook.words.find(
            item =>
                item.id ===
                wordId
        );


    if (!word) {
        return;
    }


    openConfirmModal(
        "단어 삭제",
        `"${word.word}" 단어를 삭제할까요?`,
        () => {

            workbook.words =
                workbook.words.filter(
                    item =>
                        item.id !==
                        wordId
                );


            saveData();

            renderWordList();

            showToast(
                "단어가 삭제되었습니다."
            );

        }
    );
}


/* =========================================================
   단어 드래그
   ========================================================= */

function setupWordDragAndDrop() {

    document
        .querySelectorAll(
            ".word-card"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "dragstart",
                    () => {

                        draggedWordId =
                            card.dataset.wordId;

                        card.classList.add(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragend",
                    () => {

                        draggedWordId =
                            null;

                        card.classList.remove(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragover",
                    event => {

                        event.preventDefault();

                    }
                );


                card.addEventListener(
                    "drop",
                    event => {

                        event.preventDefault();


                        const targetId =
                            card.dataset.wordId;


                        if (
                            !draggedWordId ||
                            draggedWordId ===
                            targetId
                        ) {
                            return;
                        }


                        reorderWords(
                            draggedWordId,
                            targetId
                        );

                    }
                );

            }
        );
}


function reorderWords(
    sourceId,
    targetId
) {

    const workbook =
        getCurrentWorkbook();

    if (!workbook) {
        return;
    }


    const sourceIndex =
        workbook.words.findIndex(
            word =>
                word.id ===
                sourceId
        );


    const targetIndex =
        workbook.words.findIndex(
            word =>
                word.id ===
                targetId
        );


    if (
        sourceIndex < 0 ||
        targetIndex < 0
    ) {
        return;
    }


    const [
        moved
    ] =
        workbook.words.splice(
            sourceIndex,
            1
        );


    workbook.words.splice(
        targetIndex,
        0,
        moved
    );


    saveData();

    renderWordList();
}


/* =========================================================
   파일 전체 단어
   ========================================================= */

function getAllWordsFromFile(
    file
) {

    const result = [];


    file.wordbooks.forEach(
        workbook => {

            workbook.words.forEach(
                word => {

                    result.push({

                        word,

                        workbook

                    });

                }
            );

        }
    );


    return result;
}


/* =========================================================
   총합 테스트 메뉴
   ========================================================= */

function openTotalTestMenu() {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const all =
        getAllWordsFromFile(
            file
        );


    if (all.length === 0) {

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
                    onclick="closeModal(); startFileTest('all')"
                >

                    <strong>
                        📝 전체 테스트
                    </strong>

                    <span>
                        영어 → 뜻 / 뜻 → 영어
                    </span>

                </button>


                <button
                    class="test-menu-button"
                    onclick="closeModal(); startFileTest('english-to-meaning')"
                >

                    <strong>
                        ${escapeHTML(file.name)} → 뜻
                    </strong>

                    <span>
                        단어를 보고 뜻을 입력합니다.
                    </span>

                </button>


                <button
                    class="test-menu-button"
                    onclick="closeModal(); startFileTest('meaning-to-english')"
                >

                    <strong>
                        뜻 → ${escapeHTML(file.name)}
                    </strong>

                    <span>
                        뜻을 보고 단어를 입력합니다.
                    </span>

                </button>


                <button
                    class="test-menu-button"
                    onclick="openQuickTestMenu()"
                >

                    <strong>
                        ⚡ 빠른 테스트
                    </strong>

                    <span>
                        중요 단어 또는 틀린 단어를 테스트합니다.
                    </span>

                </button>

            </div>

        `
    );
}


/* =========================================================
   빠른 테스트
   ========================================================= */

function openQuickTestMenu() {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const all =
        getAllWordsFromFile(
            file
        );


    const importantWords =
        all.filter(
            item =>
                item.word.important
        );


    const wrongWords =
        all.filter(
            item =>
                item.word.wrong > 0
        );


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
                    onclick="closeModal(); startQuickTest('important')"
                >

                    <strong>
                        ⭐ 중요 단어 테스트
                    </strong>

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
                    onclick="closeModal(); startQuickTest('wrong')"
                >

                    <strong>
                        ❌ 틀린 단어 테스트
                    </strong>

                    <span>
                        틀린 기록이 있는 단어 ${wrongWords.length}개
                    </span>

                </button>

            </div>

        `
    );
}


/* =========================================================
   테스트 문제 생성
   ========================================================= */

function makeQuestion(
    item,
    direction,
    file
) {

    const word =
        item.word;

    const workbook =
        item.workbook;


    const meanings =
        word.meanings;


    let question;

    let answers;


    if (
        direction ===
        "english-to-meaning"
    ) {

        question =
            word.word;

        answers =
            meanings;

    } else {

        question =
            meanings[0];

        answers =
            [word.word];

    }


    return {

        wordId:
            word.id,

        workbookId:
            workbook.id,

        fileId:
            file.id,

        word,

        workbook,

        file,

        direction,

        question,

        answers

    };
}


/* =========================================================
   전체 테스트
   ========================================================= */

function startFileTest(
    type
) {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const all =
        getAllWordsFromFile(
            file
        );


    if (all.length === 0) {

        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );

        return;
    }


    let questions = [];


    if (
        type === "all"
    ) {

        questions =
            all.map(
                item => {

                    const direction =
                        Math.random() < 0.5
                            ? "english-to-meaning"
                            : "meaning-to-english";


                    return makeQuestion(
                        item,
                        direction,
                        file
                    );

                }
            );

    } else {

        questions =
            all.map(
                item =>
                    makeQuestion(
                        item,
                        type,
                        file
                    )
            );

    }


    startTest(
        questions,

        getTestName(
            type,
            file.name
        ),

        type,

        file.id,

        null
    );
}


/* =========================================================
   테스트 이름
   ========================================================= */

function getTestName(
    type,
    fileName
) {

    if (
        type === "all"
    ) {

        return `${fileName} 전체 테스트`;

    }


    if (
        type ===
        "english-to-meaning"
    ) {

        return `${fileName} → 뜻`;

    }


    if (
        type ===
        "meaning-to-english"
    ) {

        return `뜻 → ${fileName}`;

    }


    return `${fileName} 테스트`;
}


/* =========================================================
   단어장 전체 테스트
   ========================================================= */

function startWorkbookTest(
    type = "all"
) {

    const file =
        getCurrentFile();

    const workbook =
        getCurrentWorkbook();


    if (
        !file ||
        !workbook
    ) {
        return;
    }


    if (
        workbook.words.length === 0
    ) {

        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );

        return;
    }


    const all =
        workbook.words.map(
            word => ({
                word,
                workbook
            })
        );


    let questions;


    if (
        type === "all"
    ) {

        questions =
            all.map(
                item => {

                    const direction =
                        Math.random() < 0.5
                            ? "english-to-meaning"
                            : "meaning-to-english";


                    return makeQuestion(
                        item,
                        direction,
                        file
                    );

                }
            );

    } else {

        questions =
            all.map(
                item =>
                    makeQuestion(
                        item,
                        type,
                        file
                    )
            );

    }


    startTest(
        questions,
        `${workbook.name} 테스트`,
        type,
        file.id,
        workbook.id
    );
}


/* =========================================================
   빠른 테스트 시작
   ========================================================= */

function startQuickTest(
    mode
) {

    const file =
        getCurrentFile();

    if (!file) {
        return;
    }


    const all =
        getAllWordsFromFile(
            file
        );


    let selected;


    if (
        mode === "important"
    ) {

        selected =
            all.filter(
                item =>
                    item.word.important
            );

    } else {

        selected =
            all.filter(
                item =>
                    item.word.wrong > 0
            );

    }


    if (
        selected.length === 0
    ) {

        showToast(
            "해당 단어가 없습니다.",
            "error"
        );

        return;
    }


    const questions =
        selected.map(
            item =>
                makeQuestion(
                    item,
                    "english-to-meaning",
                    file
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

    if (
        !questions ||
        questions.length === 0
    ) {

        showToast(
            "테스트할 문제가 없습니다.",
            "error"
        );

        return;
    }


    stopTimer();


    testState = {

        questions,

        currentIndex:
            0,

        correct:
            0,

        wrong:
            0,

        wrongQuestions:
            [],

        testName,

        testType,

        sourceFileId,

        sourceWorkbookId,

        answered:
            false,

        timer:
            null,

        timeLeft:
            10,

        autoNextTimer:
            null

    };


    showPage(
        "test"
    );


    renderCurrentQuestion();
}


/* =========================================================
   현재 문제
   ========================================================= */

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


    testState.answered =
        false;

    testState.timeLeft =
        10;


    $("testQuestionNumber").textContent =
        testState.currentIndex + 1;


    $("testTotalQuestions").textContent =
        testState.questions.length;


    const fileName =
        question.file?.name ||
        "파일";


    if (
        question.direction ===
        "english-to-meaning"
    ) {

        $("testTypeLabel").textContent =
            `${fileName} → 뜻`;

    } else {

        $("testTypeLabel").textContent =
            `뜻 → ${fileName}`;

    }


    $("testQuestion").textContent =
        question.question;


    $("testTimer").textContent =
        "10";


    const input =
        $("testAnswerInput");


    input.value = "";

    input.disabled = false;


    const feedback =
        $("testFeedback");


    feedback.classList.add(
        "hidden"
    );

    feedback.innerHTML = "";


    $("testSubmitButton").textContent =
        "확인";


    setTimeout(
        () => input.focus(),
        50
    );


    startTimer();
}


/* =========================================================
   타이머
   ========================================================= */

function startTimer() {

    stopTimer();


    testState.timeLeft =
        10;


    updateTimerUI();


    testState.timer =
        setInterval(
            () => {

                if (
                    testState.answered
                ) {
                    return;
                }


                testState.timeLeft--;


                updateTimerUI();


                if (
                    testState.timeLeft <=
                    0
                ) {

                    stopTimer();

                    submitAnswer(
                        true
                    );

                }

            },
            1000
        );
}


function updateTimerUI() {

    $("testTimer").textContent =
        testState.timeLeft;
}


function stopTimer() {

    if (
        testState.timer
    ) {

        clearInterval(
            testState.timer
        );

        testState.timer =
            null;

    }


    if (
        testState.autoNextTimer
    ) {

        clearTimeout(
            testState.autoNextTimer
        );

        testState.autoNextTimer =
            null;

    }
}


/* =========================================================
   정답 확인
   ========================================================= */

function checkAnswer(
    userAnswer,
    question
) {

    const user =
        String(
            userAnswer || ""
        ).trim();


    if (!user) {
        return false;
    }


    const answers =
        question.answers || [];


    return answers.some(
        answer => {

            const expected =
                String(
                    answer
                ).trim();


            if (
                question.direction ===
                "meaning-to-english"
            ) {

                return (
                    user.toLowerCase() ===
                    expected.toLowerCase()
                );

            }


            return (
                user ===
                expected
            );

        }
    );
}


/* =========================================================
   답안 제출
   ========================================================= */

function submitAnswer(
    timeOut = false
) {

    if (
        testState.answered
    ) {

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


    const input =
        $("testAnswerInput");


    const userAnswer =
        input.value.trim();


    const isCorrect =
        !timeOut &&
        checkAnswer(
            userAnswer,
            question
        );


    testState.answered =
        true;


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


    input.disabled =
        true;


    if (
        testState.currentIndex ===
        testState.questions.length - 1
    ) {

        $("testSubmitButton").textContent =
            "결과 보기";

    } else {

        $("testSubmitButton").textContent =
            "다음 문제";

    }


    /*
       시간 초과는 기획에 따라
       자동으로 다음 문제로 이동한다.
    */

    if (
        timeOut
    ) {

        testState.autoNextTimer =
            setTimeout(
                () => {

                    nextQuestion();

                },
                900
            );

    }
}


/* =========================================================
   단어 통계
   ========================================================= */

function updateWordStatistics(
    question,
    isCorrect
) {

    const file =
        getFile(
            question.fileId
        );


    if (!file) {
        return;
    }


    const workbook =
        getWorkbook(
            file.id,
            question.workbookId
        );


    if (!workbook) {
        return;
    }


    const word =
        workbook.words.find(
            item =>
                item.id ===
                question.wordId
        );


    if (!word) {
        return;
    }


    if (isCorrect) {

        word.correct =
            Number(word.correct) + 1;

    } else {

        word.wrong =
            Number(word.wrong) + 1;

    }


    updateImportantStatus(
        word
    );


    saveData();
}


/* =========================================================
   정답 피드백
   ========================================================= */

function showAnswerFeedback(
    question,
    isCorrect,
    userAnswer,
    timeOut
) {

    const feedback =
        $("testFeedback");


    if (!feedback) {
        return;
    }


    feedback.classList.remove(
        "hidden"
    );


    const answerText =
        question.answers.join(
            ", "
        );


    if (isCorrect) {

        feedback.innerHTML = `

            <div class="feedback-correct">

                <strong>
                    ⭕ 정답!
                </strong>

                <span>
                    ${escapeHTML(answerText)}
                </span>

            </div>

        `;

        return;
    }


    feedback.innerHTML = `

        <div class="feedback-wrong">

            <strong>
                ❌ ${
                    timeOut
                        ? "시간 초과!"
                        : "오답!"
                }
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
                    ${escapeHTML(answerText)}
                </strong>
            </span>

        </div>

    `;
}


/* =========================================================
   다음 문제
   ========================================================= */

function nextQuestion() {

    if (
        !testState.answered
    ) {

        submitAnswer(
            false
        );

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


    const record = {

        id:
            makeId(),

        date:
            new Date().toISOString(),

        fileName:
            getFileNameForTest(),

        testName:
            testState.testName,

        total,

        correct:
            testState.correct,

        wrong:
            testState.wrong

    };


    appData.testRecords.unshift(
        record
    );


    saveData();


    $("resultTestName").textContent =
        testState.testName;


    $("resultCorrect").textContent =
        testState.correct;


    $("resultWrong").textContent =
        testState.wrong;


    $("resultTotal").textContent =
        total;


    $("retryWrongButton").disabled =
        testState.wrongQuestions.length === 0;


    showPage(
        "result"
    );
}


function getFileNameForTest() {

    const file =
        getFile(
            testState.sourceFileId
        );


    return file
        ? file.name
        : "알 수 없는 파일";
}


/* =========================================================
   틀린 문제 다시 풀기
   ========================================================= */

function retryWrongQuestions() {

    if (
        !testState.wrongQuestions.length
    ) {

        showToast(
            "틀린 문제가 없습니다."
        );

        return;
    }


    const questions =
        testState.wrongQuestions.map(
            question => ({
                ...question,

                word:
                    question.word,

                answers:
                    [...question.answers]
            })
        );


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

    const records =
        Array.isArray(
            appData.testRecords
        )
            ? appData.testRecords
            : [];


    if (
        records.length === 0
    ) {

        $("statisticsSummary").innerHTML =
            "";

        $("statisticsList").innerHTML =
            "";

        $("emptyStatisticsState")
            .classList.remove(
                "hidden"
            );

        return;
    }


    $("emptyStatisticsState")
        .classList.add(
            "hidden"
        );


    renderStatisticsSummary(
        records
    );


    renderStatisticsList(
        records
    );
}


/* =========================================================
   통계 요약
   ========================================================= */

function renderStatisticsSummary(
    records
) {

    let totalQuestions = 0;

    let totalCorrect = 0;

    let totalWrong = 0;


    records.forEach(
        record => {

            totalQuestions +=
                Number(
                    record.total || 0
                );

            totalCorrect +=
                Number(
                    record.correct || 0
                );

            totalWrong +=
                Number(
                    record.wrong || 0
                );

        }
    );


    const accuracy =
        totalQuestions > 0
            ? Math.round(
                totalCorrect /
                totalQuestions *
                100
            )
            : 0;


    $("statisticsSummary").innerHTML = `

        <div class="statistics-card">

            <span>📝</span>

            <strong>
                ${records.length}
            </strong>

            <small>
                테스트
            </small>

        </div>


        <div class="statistics-card">

            <span>📚</span>

            <strong>
                ${totalQuestions}
            </strong>

            <small>
                문제
            </small>

        </div>


        <div class="statistics-card">

            <span>⭕</span>

            <strong>
                ${totalCorrect}
            </strong>

            <small>
                정답
            </small>

        </div>


        <div class="statistics-card">

            <span>🎯</span>

            <strong>
                ${accuracy}%
            </strong>

            <small>
                정답률
            </small>

        </div>

    `;
}


/* =========================================================
   통계 날짜
   ========================================================= */

function formatCurrentMonthDate(
    dateString
) {

    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    return `${date.getMonth() + 1}/${date.getDate()} ${String(
        date.getHours()
    ).padStart(2, "0")}:${String(
        date.getMinutes()
    ).padStart(2, "0")}`;
}


function formatRecordDate(
    dateString
) {

    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    return `${date.getFullYear()}/${String(
        date.getMonth() + 1
    ).padStart(2, "0")}/${String(
        date.getDate()
    ).padStart(2, "0")} ${String(
        date.getHours()
    ).padStart(2, "0")}:${String(
        date.getMinutes()
    ).padStart(2, "0")}`;
}


/* =========================================================
   통계 목록
   ========================================================= */

function renderStatisticsList(
    records
) {

    const sorted =
        [...records].sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


    const now =
        new Date();


    const currentYear =
        now.getFullYear();

    const currentMonth =
        now.getMonth();


    const currentRecords = [];

    const previousMonths = {};

    const previousYears = {};


    sorted.forEach(
        record => {

            const date =
                new Date(
                    record.date
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return;
            }


            const year =
                date.getFullYear();

            const month =
                date.getMonth();


            if (
                year === currentYear &&
                month === currentMonth
            ) {

                currentRecords.push(
                    record
                );

                return;
            }


            if (
                year === currentYear
            ) {

                const key =
                    `${year}-${month}`;


                if (
                    !previousMonths[key]
                ) {
                    previousMonths[key] =
                        [];
                }


                previousMonths[key].push(
                    record
                );

                return;
            }


            const yearKey =
                String(
                    year
                );


            if (
                !previousYears[yearKey]
            ) {
                previousYears[yearKey] =
                    {};
            }


            const monthKey =
                `${year}-${month}`;


            if (
                !previousYears[yearKey][monthKey]
            ) {

                previousYears[yearKey][monthKey] =
                    [];

            }


            previousYears[yearKey][monthKey]
                .push(record);

        }
    );


    let html = "";


    /* 현재 달 */

    currentRecords.forEach(
        record => {

            html +=
                renderStatisticRecord(
                    record,
                    true
                );

        }
    );


    /* 이전 달 */

    Object.keys(
        previousMonths
    )
        .sort()
        .reverse()
        .forEach(
            key => {

                const [
                    year,
                    month
                ] =
                    key.split("-");


                html += `

                    <div class="statistics-group">

                        <h2>
                            ${Number(month) + 1}월
                        </h2>

                        ${previousMonths[key]
                            .map(
                                record =>
                                    renderStatisticRecord(
                                        record,
                                        false
                                    )
                            )
                            .join("")}

                    </div>

                `;

            }
        );


    /* 이전 연도 */

    Object.keys(
        previousYears
    )
        .sort()
        .reverse()
        .forEach(
            year => {

                html += `

                    <div class="statistics-year-group">

                        <h2>
                            ${year}년
                        </h2>

                `;


                Object.keys(
                    previousYears[year]
                )
                    .sort()
                    .reverse()
                    .forEach(
                        key => {

                            const month =
                                Number(
                                    key.split("-")[1]
                                );


                            html += `

                                <div class="statistics-month-group">

                                    <h3>
                                        ${month + 1}월
                                    </h3>

                                    ${previousYears[year][key]
                                        .map(
                                            record =>
                                                renderStatisticRecord(
                                                    record,
                                                    false
                                                )
                                        )
                                        .join("")}

                                </div>

                            `;

                        }
                    );


                html += `
                    </div>
                `;

            }
        );


    $("statisticsList").innerHTML =
        html ||
        `
            <div class="empty-state">
                <p>통계 기록이 없습니다.</p>
            </div>
        `;
}


/* =========================================================
   통계 기록 하나
   ========================================================= */

function renderStatisticRecord(
    record,
    currentMonth
) {

    const dateText =
        currentMonth
            ? formatCurrentMonthDate(
                record.date
            )
            : formatRecordDate(
                record.date
            );


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
                    ${Number(record.correct || 0)}
                    /
                    ${Number(record.total || 0)}
                </strong>

                <span>
                    ⭕ ${Number(record.correct || 0)}
                    ·
                    ❌ ${Number(record.wrong || 0)}
                </span>

            </div>

        </div>

    `;
}


/* =========================================================
   테마
   ========================================================= */

function applyTheme() {

    const dark =
        appData.theme ===
        "dark";


    document.body.classList.toggle(
        "dark-mode",
        dark
    );


    document.documentElement.dataset.theme =
        dark
            ? "dark"
            : "light";


    $("darkModeToggle").checked =
        dark;


    $("headerThemeButton").textContent =
        dark
            ? "☀️"
            : "🌙";
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

        appName:
            "단어 암기장",

        version:
            1,

        exportedAt:
            new Date().toISOString(),

        data:
            appData

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
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    link.href =
        url;

    link.download =
        `단어장_백업_${date}.json`;


    document.body.appendChild(
        link
    );


    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );


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


function handleImportFile(
    event
) {

    const file =
        event.target.files?.[0];


    if (!file) {
        return;
    }


    const reader =
        new FileReader();


    reader.onload =
        () => {

            try {

                const parsed =
                    JSON.parse(
                        reader.result
                    );


                const imported =
                    parsed?.data &&
                    typeof parsed.data ===
                    "object"
                        ? parsed.data
                        : parsed;


                if (
                    !imported ||
                    !Array.isArray(
                        imported.files
                    )
                ) {

                    throw new Error(
                        "올바른 백업 파일이 아닙니다."
                    );

                }


                openConfirmModal(
                    "데이터 가져오기",
                    "현재 데이터가 가져온 데이터로 교체됩니다.\n계속하시겠습니까?",
                    () => {

                        appData =
                            normalizeData(
                                imported
                            );


                        saveData();

                        applyTheme();


                        currentFileId =
                            null;

                        currentWorkbookId =
                            null;


                        renderFileList();

                        showHomePage();


                        showToast(
                            "데이터를 가져왔습니다."
                        );

                    }
                );

            } catch (error) {

                console.error(
                    error
                );


                showToast(
                    "데이터 파일을 읽을 수 없습니다.",
                    "error"
                );

            }

        };


    reader.readAsText(
        file,
        "UTF-8"
    );
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


    const hidden =
        content.classList.contains(
            "hidden"
        );


    content.classList.toggle(
        "hidden",
        !hidden
    );


    if (arrow) {

        arrow.textContent =
            hidden
                ? "⌃"
                : "⌄";

    }
}


/* =========================================================
   입력 모달
   ========================================================= */

function openInputModal(
    title,
    description,
    defaultValue,
    onConfirm
) {

    openModal(
        title,

        `

            <p
                style="
                    margin-top:0;
                    color:var(--text-light);
                    font-size:13px;
                "
            >
                ${escapeHTML(description)}
            </p>

            <input
                id="modalInputField"
                class="modal-input"
                type="text"
                autocomplete="off"
                value="${escapeHTML(defaultValue)}"
            >

        `,

        `

            <button
                id="modalCancelButton"
                class="secondary-button"
                type="button"
            >
                취소
            </button>

            <button
                id="modalConfirmButton"
                class="primary-button"
                type="button"
            >
                확인
            </button>

        `
    );


    const input =
        $("modalInputField");


    setTimeout(
        () => {

            input.focus();

            input.select();

        },
        30
    );


    const confirm =
        () => {

            const value =
                input.value.trim();


            if (!value) {

                showToast(
                    "내용을 입력해주세요.",
                    "error"
                );

                input.focus();

                return;
            }


            closeModal();

            onConfirm(
                value
            );

        };


    $("modalConfirmButton")
        .addEventListener(
            "click",
            confirm
        );


    $("modalCancelButton")
        .addEventListener(
            "click",
            closeModal
        );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                confirm();

            }

        }
    );
}


/* =========================================================
   확인 모달
   ========================================================= */

function openConfirmModal(
    title,
    message,
    onConfirm
) {

    openModal(
        title,

        `

            <p
                style="
                    white-space:pre-line;
                    line-height:1.6;
                    margin:0;
                    color:var(--text-light);
                "
            >
                ${escapeHTML(message)}
            </p>

        `,

        `

            <button
                id="modalCancelButton"
                class="secondary-button"
                type="button"
            >
                취소
            </button>

            <button
                id="modalConfirmButton"
                class="primary-button"
                type="button"
            >
                확인
            </button>

        `
    );


    $("modalCancelButton")
        .addEventListener(
            "click",
            closeModal
        );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                closeModal();

                onConfirm();

            }
        );
}


/* =========================================================
   일반 모달
   ========================================================= */

function openModal(
    title,
    body,
    footer = ""
) {

    $("modalTitle").textContent =
        title;

    $("modalBody").innerHTML =
        body;

    $("modalFooter").innerHTML =
        footer;

    $("modalOverlay")
        .classList.remove(
            "hidden"
        );
}


function closeModal() {

    $("modalOverlay")
        .classList.add(
            "hidden"
        );
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


    if (
        testState.sourceFileId
    ) {

        showFilePage(
            testState.sourceFileId
        );

        return;
    }


    showHomePage();
}


/* =========================================================
   네비게이션
   ========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            ".nav-item, .mobile-nav-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.page;


                        if (
                            page ===
                            "home"
                        ) {

                            showHomePage();

                        }


                        if (
                            page ===
                            "statistics"
                        ) {

                            stopTimer();

                            showPage(
                                "statistics"
                            );

                            renderStatistics();

                        }


                        if (
                            page ===
                            "settings"
                        ) {

                            stopTimer();

                            showPage(
                                "settings"
                            );

                        }

                    }
                );

            }
        );
}


/* =========================================================
   버튼
   ========================================================= */

function setupButtons() {

    $("addFileButton")
        .addEventListener(
            "click",
            addFile
        );


    $("emptyAddFileButton")
        .addEventListener(
            "click",
            addFile
        );


    $("backToHomeButton")
        .addEventListener(
            "click",
            goBackToHome
        );


    $("addWorkbookButton")
        .addEventListener(
            "click",
            addWorkbook
        );


    $("emptyAddWorkbookButton")
        .addEventListener(
            "click",
            addWorkbook
        );


    $("backToFileButton")
        .addEventListener(
            "click",
            goBackToFile
        );


    $("addWordButton")
        .addEventListener(
            "click",
            addSingleWord
        );


    $("bulkAddWordButton")
        .addEventListener(
            "click",
            addBulkWords
        );


    $("fileTestButton")
        .addEventListener(
            "click",
            openTotalTestMenu
        );


    $("testSubmitButton")
        .addEventListener(
            "click",
            () =>
                submitAnswer(false)
        );


    $("resultHomeButton")
        .addEventListener(
            "click",
            goToResultHome
        );


    $("resultBackButton")
        .addEventListener(
            "click",
            goToResultBack
        );


    $("retryWrongButton")
        .addEventListener(
            "click",
            retryWrongQuestions
        );


    $("darkModeToggle")
        .addEventListener(
            "change",
            event => {

                appData.theme =
                    event.target.checked
                        ? "dark"
                        : "light";


                saveData();

                applyTheme();

            }
        );


    $("headerThemeButton")
        .addEventListener(
            "click",
            toggleTheme
        );


    $("exportDataButton")
        .addEventListener(
            "click",
            exportData
        );


    $("importDataButton")
        .addEventListener(
            "click",
            importData
        );


    $("importFileInput")
        .addEventListener(
            "change",
            handleImportFile
        );


    $("usageGuideButton")
        .addEventListener(
            "click",
            toggleUsageGuide
        );


    $("modalCloseButton")
        .addEventListener(
            "click",
            closeModal
        );


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


    $("mobileMenuButton")
        .addEventListener(
            "click",
            openSidebar
        );


    $("headerHomeButton")
        .addEventListener(
            "click",
            showHomePage
        );
}


/* =========================================================
   키보드
   ========================================================= */

function setupKeyboardEvents() {

    document.addEventListener(
        "keydown",
        event => {

            /*
               단어 입력창:
               Enter = 등록
               Shift + Enter = 줄바꿈
            */

            if (
                event.target ===
                $("bulkWordInput")
            ) {

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    addBulkWords();

                }

                return;
            }


            const activePage =
                document.querySelector(
                    ".page.active"
                );


            if (
                !activePage ||
                activePage.id !==
                "testPage"
            ) {
                return;
            }


            if (
                event.key !==
                "Enter"
            ) {
                return;
            }


            event.preventDefault();


            if (
                testState.answered
            ) {

                nextQuestion();

            } else {

                submitAnswer(
                    false
                );

            }

        }
    );
}


/* =========================================================
   PWA
   ========================================================= */

function registerServiceWorker() {

    if (
        "serviceWorker" in
        navigator
    ) {

        window.addEventListener(
            "load",
            () => {

                navigator.serviceWorker
                    .register(
                        "./sw.js"
                    )
                    .then(
                        registration => {

                            console.log(
                                "Service Worker 등록 완료:",
                                registration.scope
                            );

                        }
                    )
                    .catch(
                        error => {

                            console.error(
                                "Service Worker 등록 실패:",
                                error
                            );

                        }
                    );

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
        "단어 암기장이 시작되었습니다."
    );
}


/* =========================================================
   시작
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}


/* =========================================================
   HTML onclick 전역 등록
   ========================================================= */

window.openFile =
    openFile;

window.renameFile =
    renameFile;

window.deleteFile =
    deleteFile;

window.openWorkbook =
    openWorkbook;

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

window.startQuickTest =
    startQuickTest;
