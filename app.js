"use strict";

/* =========================================================
   단어 암기장
   앱 버전
   ========================================================= */

const APP_VERSION = "3.1.0";

const STORAGE_KEY =
    "word_memorize_app_final_v1";

const DEFAULT_DATA = {

    files: [],

    testRecords: [],

    theme: "light",

    testTime: 10

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

    returnPage: "home",

    answered: false,

    timer: null,

    timeLeft: 10,

    autoNextTimer: null

};


/* =========================================================
   DOM
   ========================================================= */

const $ = id =>
    document.getElementById(id);


/* =========================================================
   ID
   ========================================================= */

function makeId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
        "function"
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
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!saved) {

            return normalizeData(
                structuredClone(
                    DEFAULT_DATA
                )
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
            structuredClone(
                DEFAULT_DATA
            )
        );

    }

}


function normalizeData(data) {

    const testTime =
        Number(
            data?.testTime
        );


    const result = {

        files: [],

        testRecords:
            Array.isArray(
                data?.testRecords
            )
                ? data.testRecords
                : [],

        theme:
            data?.theme === "dark"
                ? "dark"
                : "light",

        testTime:
            [
                5,
                10,
                15,
                20,
                30,
                60
            ].includes(testTime)
                ? testTime
                : 10

    };


    if (
        !Array.isArray(
            data?.files
        )
    ) {

        return result;

    }


    result.files =
        data.files.map(
            file => {

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
                        new Date()
                            .toISOString(),

                    wordbooks: []

                };


                if (
                    Array.isArray(
                        file.wordbooks
                    )
                ) {

                    normalizedFile.wordbooks =
                        file.wordbooks.map(
                            book => {

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
                                        new Date()
                                            .toISOString(),

                                    words: []

                                };


                                if (
                                    Array.isArray(
                                        book.words
                                    )
                                ) {

                                    normalizedBook.words =
                                        book.words
                                            .map(
                                                word => {

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

                                                }
                                            )
                                            .filter(
                                                word =>
                                                    word.word &&
                                                    word.meanings
                                                        .length
                                            );

                                }


                                return normalizedBook;

                            }
                        );

                }


                return normalizedFile;

            }
        );


    return result;

}


function saveData() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                appData
            )
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

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

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
        (
            total,
            workbook
        ) =>
            total +
            workbook.words.length,
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
        getAttemptCount(
            word
        );


    if (
        attempts === 0
    ) {

        word.important =
            false;

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

function normalizeMeanings(
    meanings
) {

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

                result.push(
                    clean
                );

            }

        }
    );


    return result;

}


function getMeaningsText(word) {

    return word.meanings
        .map(
            meaning =>
                escapeHTML(
                    meaning
                )
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

    statistics: "statisticsPage",

    settings: "settingsPage",

    test: "testPage",

    result: "resultPage"

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
        [
            "home",
            "statistics",
            "settings"
        ].includes(
            pageName
        )
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


    currentFileId =
        null;


    currentWorkbookId =
        null;


    showPage(
        "home"
    );


    renderFileList();

}


/* =========================================================
   파일
   ========================================================= */

function showFilePage(
    fileId
) {

    const file =
        getFile(
            fileId
        );


    if (!file) {

        showHomePage();

        return;

    }


    stopTimer();


    currentFileId =
        fileId;


    currentWorkbookId =
        null;


    showPage(
        "file"
    );


    $("currentFileTitle")
        .textContent =
        file.name;


    $("currentFileBreadcrumb")
        .textContent =
        file.name;


    $("currentFileDescription")
        .textContent =
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
        getFile(
            fileId
        );


    const workbook =
        getWorkbook(
            fileId,
            workbookId
        );


    if (
        !file ||
        !workbook
    ) {

        showHomePage();

        return;

    }


    stopTimer();


    currentFileId =
        fileId;


    currentWorkbookId =
        workbookId;


    showPage(
        "workbook"
    );


    $("currentWorkbookTitle")
        .textContent =
        workbook.name;


    $("currentWorkbookBreadcrumb")
        .textContent =
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
        appData.files.length ===
        0
    ) {

        list.innerHTML =
            "";


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
                    new Date()
                        .toISOString(),

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
        getFile(
            fileId
        );


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

                $("currentFileTitle")
                    .textContent =
                    file.name;


                $("currentFileBreadcrumb")
                    .textContent =
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
        getFile(
            fileId
        );


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


/* =========================================================
   파일 순서
   ========================================================= */

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


    if (
        !file ||
        !list
    ) {

        return;

    }


    if (
        file.wordbooks.length ===
        0
    ) {

        list.innerHTML =
            "";


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
                    new Date()
                        .toISOString(),

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

                $("currentWorkbookTitle")
                    .textContent =
                    workbook.name;


                $("currentWorkbookBreadcrumb")
                    .textContent =
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


            if (
                colonIndex === -1
            ) {

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
                    meaningText.split(",")
                );


            if (
                meanings.length ===
                0
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
   단어 일괄 추가
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
        parsed.length ===
        0
    ) {

        showToast(
            "입력 형식을 확인해주세요.",
            "error"
        );


        return;

    }


    let addedWords =
        0;


    let addedMeanings =
        0;


    let duplicates =
        0;


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

                    meanings: [],

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


                    if (
                        duplicate
                    ) {

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


    if (
        addedWords > 0
    ) {

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


   function openSpecialTestMenu(){

    const b=
        book();

    if(!b){
        return;
    }

    const mode=
        getWorkbookMode(
            b
        );

    if(
        mode==="hanja"
    ){

        const level=
            $("specialLevelList")
                ?.querySelector(
                    ".selected"
                )
                ?.dataset
                .hanjaLevel||
            "8급";

        const d=
            specialHanja(
                level
            );

        if(
            !d.length
        ){

            toast(
                "내장 데이터가 없습니다.",
                "error"
            );

            return;
        }

        openModal(
            "한자 테스트",
            `
            <div class="test-menu">

                <button
                    class="test-menu-button"
                    data-special-test="mixed"
                >
                    <strong>
                        📝 전체 테스트
                    </strong>

                    <span>
                        뜻/음 방향을 섞어서 출제합니다.
                    </span>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="hanja-meaning"
                >
                    <strong>
                        한자 → 뜻
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="hanja-sound"
                >
                    <strong>
                        한자 → 음
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="meaning-hanja"
                >
                    <strong>
                        뜻 → 한자
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="sound-hanja"
                >
                    <strong>
                        음 → 한자
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="choice"
                >
                    <strong>
                        4지선다
                    </strong>
                </button>

            </div>
            `
        );

    }else{

        openModal(
            "일본어 테스트",
            `
            <div class="test-menu">

                <button
                    class="test-menu-button"
                    data-special-test="mixed"
                >
                    <strong>
                        📝 전체 테스트
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="kanji-on"
                >
                    <strong>
                        한자 → 음독
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="kanji-kun"
                >
                    <strong>
                        한자 → 훈독
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="on-kanji"
                >
                    <strong>
                        음독 → 한자
                    </strong>
                </button>

                <button
                    class="test-menu-button"
                    data-special-test="kun-kanji"
                >
                    <strong>
                        훈독 → 한자
                    </strong>
                </button>

            </div>
            `
        );
    }
}

function makeSpecialQuestion(
    item,
    type,
    mode
){

    if(
        mode==="hanja"
    ){

        const dirs=[
            "hanja-meaning",
            "hanja-sound",
            "meaning-hanja",
            "sound-hanja"
        ];

        const d=
            type==="mixed"
                ? dirs[
                    Math.floor(
                        Math.random()*
                        dirs.length
                    )
                ]
                : type;

        if(
            d==="hanja-meaning"
        ){

            return{
                specialMode:"hanja",
                direction:d,
                question:item[1],
                answers:[item[2]],
                label:"한자 → 뜻"
            };
        }

        if(
            d==="hanja-sound"
        ){

            return{
                specialMode:"hanja",
                direction:d,
                question:item[1],
                answers:[item[3]],
                label:"한자 → 음"
            };
        }

        if(
            d==="meaning-hanja"
        ){

            return{
                specialMode:"hanja",
                direction:d,
                question:item[2],
                answers:[item[1]],
                label:"뜻 → 한자"
            };
        }

        return{
            specialMode:"hanja",
            direction:d,
            question:item[3],
            answers:[item[1]],
            label:"음 → 한자"
        };
    }

    const dirs=[
        "kanji-on",
        "kanji-kun",
        "on-kanji",
        "kun-kanji"
    ];

    const d=
        type==="mixed"
            ? dirs[
                Math.floor(
                    Math.random()*
                    dirs.length
                )
            ]
            : type;

    if(
        d==="kanji-on"
    ){

        return{
            specialMode:"japanese",
            direction:d,
            question:item[0],
            answers:[
                ...item[1]
                    .split("・")
            ],
            label:"한자 → 음독"
        };
    }

    if(
        d==="kanji-kun"
    ){

        return{
            specialMode:"japanese",
            direction:d,
            question:item[0],
            answers:[
                ...item[2]
                    .split("・")
            ],
            label:"한자 → 훈독"
        };
    }

    if(
        d==="on-kanji"
    ){

        return{
            specialMode:"japanese",
            direction:d,
            question:item[1],
            answers:[item[0]],
            label:"음독 → 한자"
        };
    }

    return{
        specialMode:"japanese",
        direction:d,
        question:item[2],
        answers:[item[0]],
        label:"훈독 → 한자"
    };
}

function startSpecialTest(
    type
){

    const b=
        book();

    const mode=
        getWorkbookMode(
            b
        );

    if(
        mode==="hanja"
    ){

        const level=
            $("specialLevelList")
                ?.querySelector(
                    ".selected"
                )
                ?.dataset
                .hanjaLevel||
            "8급";

        const d=
            specialHanja(
                level
            );

        if(
            type==="choice"
        ){

            const qs=
                shuffle(
                    d.map(
                        item=>
                            makeChoiceQuestion(
                                item
                            )
                    )
                );

            startTest(
                qs,
                "한자 4지선다",
                "special",
                currentFileId,
                currentWorkbookId,
                "workbook"
            );

        }else{

            startTest(
                shuffle(
                    d.map(
                        item=>
                            makeSpecialQuestion(
                                item,
                                type,
                                "hanja"
                            )
                    )
                ),
                `한자 ${level} 테스트`,
                "special",
                currentFileId,
                currentWorkbookId,
                "workbook"
            );
        }

    }else{

        startTest(
            shuffle(
                JAPANESE_DATA.map(
                    item=>
                        makeSpecialQuestion(
                            item,
                            type,
                            "japanese"
                        )
                )
            ),
            "일본어 테스트",
            "special",
            currentFileId,
            currentWorkbookId,
            "workbook"
        );
    }
}

function makeChoiceQuestion(
    item
){

    const askChar=
        Math.random()<.5;

    let pool=
        shuffle(
            HANJA_DATA.filter(
                x=>
                    x[0]===item[0]
            )
        ).slice(
            0,
            4
        );

    if(
        pool.length<4
    ){

        pool=
            shuffle(
                HANJA_DATA
            ).slice(
                0,
                4
            );
    }

    if(
        !pool.some(
            x=>
                x[1]===item[1]
        )
    ){

        pool[3]=item;
    }

    pool=
        shuffle(
            pool
        );

    const correct=
        askChar
            ? `${item[2]} / ${item[3]}`
            : item[1];

    const options=
        pool.map(
            x=>
                askChar
                    ? `${x[2]} / ${x[3]}`
                    : x[1]
        );

    return{

        specialMode:
            "hanja-choice",

        direction:
            askChar
                ? "hanja-choice"
                : "meaning-choice",

        question:
            askChar
                ? item[1]
                : `${item[2]} / ${item[3]}`,

        answers:[
            correct
        ],

        choiceOptions:
            options,

        label:
            askChar
                ? "한자 → 뜻+음"
                : "뜻+음 → 한자"
    };
}

function startTest(
    questions,
    name,
    type,
    fid,
    bid,
    returnPage
){

    stopTestTimer();

    testState={

        questions,

        currentIndex:
            0,

        correct:
            0,

        wrong:
            0,

        wrongQuestions:
            [],

        testName:
            name,

        testType:
            type,

        sourceFileId:
            fid,

        sourceWorkbookId:
            bid,

        returnPage,

        answered:
            false,

        timeLeft:
            Number(data.testTime)||10,

        timer:
            null,

        autoTimer:
            null
    };

    page(
        "test"
    );

    renderQuestion();

    startTimer();
}

function renderQuestion(){

    const q=
        testState
            ?.questions[
                testState.currentIndex
            ];

    if(!q){
        return;
    }

    $("testQuestionNumber")
        .textContent=
        String(
            testState.currentIndex+1
        );

    $("testTotalQuestions")
        .textContent=
        String(
            testState.questions.length
        );

    $("testTypeLabel")
        .textContent=
        q.label||
        q.direction;

    $("testQuestion")
        .textContent=
        q.question;

    $("testFeedback")
        .classList.add(
            "hidden"
        );

    $("testFeedback")
        .innerHTML=
        "";

    const input=
        $("testAnswerInput");

    const choice=
        $("testChoiceArea");

    const submit=
        $("testSubmitButton");

    if(
        q.specialMode===
        "hanja-choice"
    ){

        input
            .classList.add(
                "hidden"
            );

        choice
            .classList.remove(
                "hidden"
            );

        submit
            .classList.add(
                "hidden"
            );

        choice.innerHTML=
            q.choiceOptions
                .map(
                    (x,i)=>
                        `
                        <button
                            type="button"
                            class="test-choice-button"
                            data-choice="${esc(x)}"
                        >
                            ${String.fromCharCode(
                                9312+i
                            )}
                            ${esc(x)}
                        </button>
                        `
                )
                .join("");

    }else{

        input
            .classList.remove(
                "hidden"
            );

        choice
            .classList.add(
                "hidden"
            );

        choice.innerHTML=
            "";

        submit
            .classList.remove(
                "hidden"
            );

        submit.textContent=
            "확인";

        input.value=
            "";

        input.disabled=
            false;

        setTimeout(
            ()=>input.focus(),
            30
        );
    }

    testState.answered=
        false;

    testState.timeLeft=
        Number(data.testTime)||10;

    $("testTimer")
        .textContent=
        String(
            testState.timeLeft
        );
}

function startTimer(){

    stopTestTimer();

    $("testTimer")
        .textContent=
        String(
            testState.timeLeft
        );

    testState.timer=
        setInterval(
            ()=>{

                if(
                    testState.answered
                ){
                    return;
                }

                testState.timeLeft--;

                $("testTimer")
                    .textContent=
                    String(
                        Math.max(
                            0,
                            testState.timeLeft
                        )
                    );

                if(
                    testState.timeLeft<=0
                ){

                    submitAnswer(
                        true
                    );
                }

            },
            1000
        );
}

function answersMatch(
    input,
    answers
){

    return answers.some(
        a=>
            norm(input)===
            norm(a)
    );
}

function updateWordStats(
    q,
    ok
){

    if(
        q.specialMode
    ){
        return;
    }

    const w=
        q.wordRef;

    if(!w){
        return;
    }

    if(ok){

        w.correct++;

    }else{

        w.wrong++;
    }

    const attempts=
        w.correct+
        w.wrong;

    if(attempts){

        w.important=
            w.wrong/
            attempts>
            0.7;
    }

    save();
}

function showFeedback(
    q,
    ok,
    input,
    timedOut
){

    const f=
        $("testFeedback");

    if(!f){
        return;
    }

    f.classList.remove(
        "hidden"
    );

    f.innerHTML=
        ok

            ? `
                <div class="feedback-correct">

                    <strong>
                        ⭕ 정답!
                    </strong>

                    <span>
                        ${esc(
                            q.answers.join(
                                " / "
                            )
                        )}
                    </span>

                </div>
            `

            : `
                <div class="feedback-wrong">

                    <strong>
                        ❌ ${
                            timedOut
                                ? "시간 초과!"
                                : "오답!"
                        }
                    </strong>

                    <span>
                        ${
                            input
                                ? `입력한 답: ${esc(input)}`
                                : "입력한 답이 없습니다."
                        }
                    </span>

                    <span>
                        정답:
                        <strong>
                            ${esc(
                                q.answers.join(
                                    " / "
                                )
                            )}
                        </strong>
                    </span>

                </div>
            `;
}

function submitAnswer(
    timedOut=false
){

    if(
        !testState||
        testState.answered
    ){
        return;
    }

    const q=
        testState.questions[
            testState.currentIndex
        ];

    if(!q){
        return;
    }

    const input=
        $("testAnswerInput")
            .value
            .trim();

    const ok=
        !timedOut&&
        answersMatch(
            input,
            q.answers
        );

    testState.answered=
        true;

    stopTestTimer();

    if(ok){

        testState.correct++;

    }else{

        testState.wrong++;

        testState.wrongQuestions.push(
            q
        );
    }

    updateWordStats(
        q,
        ok
    );

    showFeedback(
        q,
        ok,
        input,
        timedOut
    );

    if(
        q.specialMode===
        "hanja-choice"
    ){

        return;
    }

    $("testAnswerInput")
        .disabled=
        true;

    $("testSubmitButton")
        .textContent=
        testState.currentIndex===
        testState.questions.length-1
            ? "결과 보기"
            : "다음 문제";
}

function submitChoice(
    answer
){

    if(
        !testState||
        testState.answered
    ){
        return;
    }

    const q=
        testState.questions[
            testState.currentIndex
        ];

    const ok=
        q.answers.includes(
            answer
        );

    testState.answered=
        true;

    stopTestTimer();

    if(ok){

        testState.correct++;

    }else{

        testState.wrong++;

        testState.wrongQuestions.push(
            q
        );
    }

    showFeedback(
        q,
        ok,
        answer,
        false
    );

    $$(
        "#testChoiceArea button"
    ).forEach(
        b=>
            b.disabled=
                true
    );

    $("testSubmitButton")
        .classList.remove(
            "hidden"
        );

    $("testSubmitButton")
        .textContent=
        testState.currentIndex===
        testState.questions.length-1
            ? "결과 보기"
            : "다음 문제";
}

function nextQuestion(){

    if(!testState){
        return;
    }

    if(
        !testState.answered
    ){
        return;
    }

    if(
        testState.currentIndex>=
        testState.questions.length-1
    ){

        finishTest();

        return;
    }

    testState.currentIndex++;

    renderQuestion();

    startTimer();
}

function finishTest(){

    if(!testState){
        return;
    }

    stopTestTimer();

    const total=
        testState.questions.length;

    data.testRecords.push({

        id:
            uid(),

        date:
            now(),

        testName:
            testState.testName,

        testType:
            testState.testType,

        total,

        correct:
            testState.correct,

        wrong:
            testState.wrong,

        accuracy:
            total
                ? testState.correct/
                  total
                : 0,

        sourceFileId:
            testState.sourceFileId,

        sourceWorkbookId:
            testState.sourceWorkbookId

    });

    save();

    $("resultTestName")
        .textContent=
        testState.testName;

    $("resultCorrect")
        .textContent=
        testState.correct;

    $("resultWrong")
        .textContent=
        testState.wrong;

    $("resultTotal")
        .textContent=
        total;

    $("retryWrongButton")
        .disabled=
        !testState.wrongQuestions.length;

    page(
        "result"
    );
}

function leaveTest(){

    stopTestTimer();

    if(
        testState?.returnPage===
        "workbook"&&
        testState.sourceFileId&&
        testState.sourceWorkbookId
    ){

        openWorkbook(
            testState.sourceWorkbookId
        );

        return;
    }

    if(
        testState?.sourceFileId
    ){

        openFile(
            testState.sourceFileId
        );

        return;
    }

    showHome();
}

function retryWrongQuestions(){

    if(
        !testState
            ?.wrongQuestions
            ?.length
    ){

        return;
    }

    startTest(
        shuffle(
            testState.wrongQuestions
        ),
        `${testState.testName} - 틀린 문제`,
        "retry",
        testState.sourceFileId,
        testState.sourceWorkbookId,
        testState.returnPage
    );
}

function renderStatistics(){

    const records=
        [
            ...data.testRecords
        ].sort(
            (a,b)=>
                new Date(b.date)-
                new Date(a.date)
        );

    const empty=
        $("emptyStatisticsState");

    const summary=
        $("statisticsSummary");

    const list=
        $("statisticsList");

    if(
        !records.length
    ){

        summary.innerHTML=
            "";

        list.innerHTML=
            "";

        empty.classList.remove(
            "hidden"
        );

        return;
    }

    empty.classList.add(
        "hidden"
    );

    const total=
        records.reduce(
            (n,r)=>
                n+
                (
                    Number(
                        r.total
                    )||0
                ),
            0
        );

    const correct=
        records.reduce(
            (n,r)=>
                n+
                (
                    Number(
                        r.correct
                    )||0
                ),
            0
        );

    summary.innerHTML=`

        <div class="statistics-card">

            <span>
                📝
            </span>

            <strong>
                ${records.length}
            </strong>

            <small>
                테스트
            </small>

        </div>

        <div class="statistics-card">

            <span>
                📚
            </span>

            <strong>
                ${total}
            </strong>

            <small>
                문제
            </small>

        </div>

        <div class="statistics-card">

            <span>
                ⭕
            </span>

            <strong>
                ${correct}
            </strong>

            <small>
                정답
            </small>

        </div>

        <div class="statistics-card">

            <span>
                🎯
            </span>

            <strong>
                ${
                    total
                        ? Math.round(
                            correct/
                            total*
                            100
                        )
                        : 0
                }%
            </strong>

            <small>
                정답률
            </small>

        </div>

    `;

    list.innerHTML=
        records
            .map(
                r=>`

                <div class="statistics-record">

                    <div>

                        <strong>
                            ${esc(
                                r.testName
                            )}
                        </strong>

                        <span>
                            ${new Date(
                                r.date
                            ).toLocaleString(
                                "ko-KR"
                            )}
                        </span>

                    </div>

                    <div>

                        <span>
                            ${r.total}문제
                        </span>

                        <span>
                            정답 ${r.correct}
                        </span>

                        <span>
                            오답 ${r.wrong}
                        </span>

                        <strong>
                            ${Math.round(
                                r.accuracy*100
                            )}%
                        </strong>

                    </div>

                </div>

                `
            )
            .join("");
}

function renderSettings(){

    if(
        $("darkModeToggle")
    ){

        $("darkModeToggle")
            .checked=
            data.theme==="dark";
    }

    applyTheme();

    if(
        $("usageGuideContent")&&
        $("usageGuideContent")
            .dataset.ready!=="1"
    ){

        renderUsageGuide();
    }

    const pageEl=
        $("settingsPage");

    if(
        pageEl&&
        !$("testTimeSettingRow")
    ){

        const card=
            document.createElement(
                "div"
            );

        card.className=
            "settings-card";

        card.id=
            "testTimeSettingRow";

        card.innerHTML=`

            <div class="settings-card-title">

                <span class="settings-icon">
                    ⏱️
                </span>

                <div>

                    <h2>
                        테스트 제한 시간
                    </h2>

                    <p>
                        문제 하나당 제한 시간을 설정합니다.
                    </p>

                </div>

            </div>

            <div class="settings-row">

                <strong>
                    제한 시간
                </strong>

                <select id="testTimeSelect">

                    ${TEST_TIMES
                        .map(
                            t=>
                                `<option value="${t}">${t}초</option>`
                        )
                        .join("")
                    }

                </select>

            </div>

        `;

        pageEl.insertBefore(
            card,
            pageEl.firstElementChild
                .nextElementSibling
        );

        bindClicks();
    }

    if(
        $("testTimeSelect")
    ){

        $("testTimeSelect")
            .value=
            String(
                data.testTime
            );
    }
}

function renderUsageGuide(){

    const box=
        $("usageGuideContent");

    if(!box){
        return;
    }

    box.dataset.ready=
        "1";

    box.innerHTML=`

        <div class="guide-item">

            <strong>
                📁 파일
            </strong>

            <p>
                파일 안에 여러 개의 단어장을 만들 수 있습니다.
            </p>

        </div>

        <div class="guide-item">

            <strong>
                📖 단어장
            </strong>

            <p>
                단어를 추가하고 드래그하여 순서를 변경할 수 있습니다.
            </p>

        </div>

        <div class="guide-item">

            <strong>
                ✏️ 단어 입력
            </strong>

            <p>
                <code>:</code>
                영어/뜻,
                <code>,</code>
                여러 뜻,
                <code>/</code>
                여러 단어.
            </p>

        </div>

        <div class="guide-item">

            <strong>
                📝 테스트
            </strong>

            <p>
                문제마다 제한 시간이 적용되고 Enter로 제출할 수 있습니다.
            </p>

        </div>

        <div class="guide-item">

            <strong>
                🀄 한자
            </strong>

            <p>
                단어장 이름에 한자가 포함되면 내장 한자 학습 모드가 열립니다.
            </p>

        </div>

        <div class="guide-item">

            <strong>
                🇯🇵 일본어
            </strong>

            <p>
                단어장 이름에 일본어가 포함되면 음독·훈독 학습 모드가 열립니다.
            </p>

        </div>

    `;
}

function applyTheme(){

    document.body
        .classList.toggle(
            "dark",
            data.theme==="dark"
        );

    if(
        $("darkModeToggle")
    ){

        $("darkModeToggle")
            .checked=
            data.theme==="dark";
    }

    if(
        $("headerThemeButton")
    ){

        $("headerThemeButton")
            .textContent=
            data.theme==="dark"
                ? "☀️"
                : "🌙";
    }
}

function exportBackup(){

    const blob=
        new Blob(
            [
                JSON.stringify(
                    {
                        app:
                            "단어 암기장",

                        version:
                            APP_VERSION,

                        data
                    },
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const url=
        URL.createObjectURL(
            blob
        );

    const a=
        document.createElement(
            "a"
        );

    a.href=
        url;

    a.download=
        `단어장_백업_${
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                )
        }.json`;

    a.click();

    URL.revokeObjectURL(
        url
    );
}

function importBackup(
    event
){

    const file=
        event.target.files?.[0];

    if(!file){
        return;
    }

    const reader=
        new FileReader();

    reader.onload=
        ()=>{

            try{

                const obj=
                    JSON.parse(
                        reader.result
                    );

                if(
                    !obj.data||
                    !Array.isArray(
                        obj.data.files
                    )
                ){

                    throw 0;
                }

                confirmBox(
                    "데이터 가져오기",
                    "현재 데이터가 백업 파일로 교체됩니다.",
                    ()=>{

                        data=
                            normalizeData(
                                obj.data
                            );

                        save();

                        applyTheme();

                        showHome();

                        toast(
                            "데이터를 가져왔습니다."
                        );
                    }
                );

            }catch{

                toast(
                    "올바른 백업 파일이 아닙니다.",
                    "error"
                );
            }
        };

    reader.readAsText(
        file,
        "UTF-8"
    );

    event.target.value=
        "";
}

function bindClicks(){

    $$("[data-page]")
        .forEach(
            b=>{

                b.onclick=
                    ()=>{

                        closeSidebar();

                        if(
                            b.dataset.page===
                            "home"
                        ){

                            showHome();

                        }else if(
                            b.dataset.page===
                            "statistics"
                        ){

                            stopTestTimer();

                            page(
                                "statistics"
                            );

                            renderStatistics();

                        }else if(
                            b.dataset.page===
                            "settings"
                        ){

                            stopTestTimer();

                            page(
                                "settings"
                            );

                            renderSettings();
                        }
                    };
            }
        );

    if(
        $("headerHomeButton")
    ){

        $("headerHomeButton").onclick=
            showHome;
    }

    if(
        $("mobileMenuButton")
    ){

        $("mobileMenuButton").onclick=
            ()=>
                $("sidebar")
                    ?.classList.add(
                        "open"
                    );
    }

    if(
        $("headerThemeButton")
    ){

        $("headerThemeButton").onclick=
            ()=>{

                data.theme=
                    data.theme==="dark"
                        ? "light"
                        : "dark";

                save();

                applyTheme();
            };
    }

    if(
        $("addFileButton")
    ){

        $("addFileButton").onclick=
            addFile;
    }

    if(
        $("emptyAddFileButton")
    ){

        $("emptyAddFileButton").onclick=
            addFile;
    }

    if(
        $("backToHomeButton")
    ){

        $("backToHomeButton").onclick=
            showHome;
    }

    if(
        $("fileTestButton")
    ){

        $("fileTestButton").onclick=
            openTotalTestMenu;
    }

    if(
        $("addWorkbookButton")
    ){

        $("addWorkbookButton").onclick=
            addWorkbook;
    }

    if(
        $("emptyAddWorkbookButton")
    ){

        $("emptyAddWorkbookButton").onclick=
            addWorkbook;
    }

    if(
        $("backToFileButton")
    ){

        $("backToFileButton").onclick=
            ()=>openFile(
                currentFileId
            );
    }

    if(
        $("addWordButton")
    ){

        $("addWordButton").onclick=
            startWorkbookTest;
    }

    if(
        $("bulkAddWordButton")
    ){

        $("bulkAddWordButton").onclick=
            addBulkWords;
    }

    if(
        $("usageGuideButton")
    ){

        $("usageGuideButton").onclick=
            ()=>
                $("usageGuideContent")
                    ?.classList.toggle(
                        "hidden"
                    );
    }

    if(
        $("darkModeToggle")
    ){

        $("darkModeToggle").onchange=
            e=>{

                data.theme=
                    e.target.checked
                        ? "dark"
                        : "light";

                save();

                applyTheme();
            };
    }

    if(
        $("exportDataButton")
    ){

        $("exportDataButton").onclick=
            exportBackup;
    }

    if(
        $("importDataButton")
    ){

        $("importDataButton").onclick=
            ()=>
                $("importFileInput")
                    ?.click();
    }

    if(
        $("importFileInput")
    ){

        $("importFileInput").onchange=
            importBackup;
    }

    if(
        $("modalCloseButton")
    ){

        $("modalCloseButton").onclick=
            closeModal;
    }

    if(
        $("modalOverlay")
    ){

        $("modalOverlay").onclick=
            e=>{

                if(
                    e.target.id===
                    "modalOverlay"
                ){

                    closeModal();
                }
            };
    }

    if(
        $("retryWrongButton")
    ){

        $("retryWrongButton").onclick=
            retryWrongQuestions;
    }

    if(
        $("resultHomeButton")
    ){

        $("resultHomeButton").onclick=
            showHome;
    }

    if(
        $("resultBackButton")
    ){

        $("resultBackButton").onclick=
            ()=>{

                if(
                    testState
                        ?.sourceWorkbookId
                ){

                    openWorkbook(
                        testState.sourceWorkbookId
                    );

                }else if(
                    testState
                        ?.sourceFileId
                ){

                    openFile(
                        testState.sourceFileId
                    );

                }else{

                    showHome();
                }
            };
    }

    if(
        $("testSubmitButton")
    ){

        $("testSubmitButton").onclick=
            ()=>{

                if(
                    testState
                        ?.answered
                ){

                    nextQuestion();

                }else{

                    submitAnswer(
                        false
                    );
                }
            };
    }

    if(
        $("testAnswerInput")
    ){

        $("testAnswerInput").onkeydown=
            e=>{

                if(
                    e.key===
                    "Enter"
                ){

                    e.preventDefault();

                    if(
                        testState
                            ?.answered
                    ){

                        nextQuestion();

                    }else{

                        submitAnswer(
                            false
                        );
                    }
                }
            };
    }

    if(
        $("specialSearch")
    ){

        $("specialSearch").oninput=
            renderSpecialList;
    }

    if(
        $("specialTestButton")
    ){

        $("specialTestButton").onclick=
            openSpecialTestMenu;
    }

    if(
        $("testTimeSelect")
    ){

        $("testTimeSelect").onchange=
            e=>{

                if(
                    TEST_TIMES.includes(
                        Number(
                            e.target.value
                        )
                    )
                ){

                    data.testTime=
                        Number(
                            e.target.value
                        );

                    save();
                }
            };
    }
}

function dynamicClicks(
    event
){

    const t=
        event.target.closest(
            "button,[data-open-file],[data-open-workbook],[data-file-action],[data-workbook-action],[data-word-action],[data-start-file-test],[data-start-quick],[data-open-quick],[data-hanja-level],[data-special-test],[data-choice]"
        );

    if(!t){
        return;
    }

    if(
        t.dataset.openFile
    ){

        openFile(
            t.dataset.openFile
        );

        return;
    }

    if(
        t.dataset.openWorkbook
    ){

        openWorkbook(
            t.dataset.openWorkbook
        );

        return;
    }

    if(
        t.dataset.fileAction===
        "rename"
    ){

        renameFile(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.fileAction===
        "delete"
    ){

        deleteFile(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.workbookAction===
        "rename"
    ){

        renameWorkbook(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.workbookAction===
        "delete"
    ){

        deleteWorkbook(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.wordAction===
        "edit"
    ){

        editWord(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.wordAction===
        "important"
    ){

        toggleImportant(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.wordAction===
        "delete"
    ){

        deleteWord(
            t.dataset.id
        );

        return;
    }

    if(
        t.dataset.startFileTest
    ){

        closeModal();

        startFileTest(
            t.dataset.startFileTest
        );

        return;
    }

    if(
        t.dataset.openQuick
    ){

        closeModal();

        openQuickTestMenu();

        return;
    }

    if(
        t.dataset.startQuick
    ){

        closeModal();

        startQuickTest(
            t.dataset.startQuick
        );

        return;
    }

    if(
        t.dataset.hanjaLevel
    ){

        $$(
            "[data-hanja-level]"
        ).forEach(
            b=>
                b.classList.toggle(
                    "selected",
                    b===t
                )
        );

        renderSpecialList();

        return;
    }

    if(
        t.dataset.specialTest
    ){

        closeModal();

        startSpecialTest(
            t.dataset.specialTest
        );

        return;
    }

    if(
        t.dataset.choice
    ){

        submitChoice(
            t.dataset.choice
        );

        return;
    }

    if(
        t.dataset.modalClose
    ){

        closeModal();

        return;
    }
}

function setupDrag(){

    document.addEventListener(
        "dragstart",
        e=>{

            const f=
                e.target.closest(
                    "[data-file-id]"
                );

            const b=
                e.target.closest(
                    "[data-workbook-id]"
                );

            const w=
                e.target.closest(
                    "[data-word-id]"
                );

            if(f){
                f.classList.add(
                    "dragging"
                );
            }

            if(b){
                b.classList.add(
                    "dragging"
                );
            }

            if(w){
                w.classList.add(
                    "dragging"
                );
            }
        }
    );

    document.addEventListener(
        "dragend",
        e=>
            e.target
                .closest(
                    "[data-file-id],[data-workbook-id],[data-word-id]"
                )
                ?.classList.remove(
                    "dragging"
                )
    );

    document.addEventListener(
        "dragover",
        e=>{

            if(
                e.target.closest(
                    "[data-file-id],[data-workbook-id],[data-word-id]"
                )
            ){

                e.preventDefault();
            }
        }
    );

    document.addEventListener(
        "drop",
        e=>{

            const targetFile=
                e.target.closest(
                    "[data-file-id]"
                );

            const targetBook=
                e.target.closest(
                    "[data-workbook-id]"
                );

            const targetWord=
                e.target.closest(
                    "[data-word-id]"
                );

            if(
                !targetFile&&
                !targetBook&&
                !targetWord
            ){

                return;
            }

            e.preventDefault();

            const drag=
                document.querySelector(
                    ".dragging"
                );

            if(!drag){
                return;
            }

            if(
                targetFile&&
                drag.dataset.fileId
            ){

                const a=
                    data.files.findIndex(
                        x=>
                            x.id===
                            drag.dataset.fileId
                    );

                const b=
                    data.files.findIndex(
                        x=>
                            x.id===
                            targetFile.dataset.fileId
                    );

                if(
                    a>=0&&
                    b>=0&&
                    a!==b
                ){

                    const [m]=
                        data.files.splice(
                            a,
                            1
                        );

                    data.files.splice(
                        b,
                        0,
                        m
                    );

                    save();

                    renderFiles();
                }
            }

            if(
                targetBook&&
                drag.dataset.workbookId
            ){

                const f=
                    file();

                const a=
                    f?.wordbooks.findIndex(
                        x=>
                            x.id===
                            drag.dataset.workbookId
                    );

                const b=
                    f?.wordbooks.findIndex(
                        x=>
                            x.id===
                            targetBook.dataset.workbookId
                    );

                if(
                    f&&
                    a>=0&&
                    b>=0&&
                    a!==b
                ){

                    const [m]=
                        f.wordbooks.splice(
                            a,
                            1
                        );

                    f.wordbooks.splice(
                        b,
                        0,
                        m
                    );

                    save();

                    renderWorkbooks();
                }
            }

            if(
                targetWord&&
                drag.dataset.wordId
            ){

                const bk=
                    book();

                const a=
                    bk?.words.findIndex(
                        x=>
                            x.id===
                            drag.dataset.wordId
                    );

                const b=
                    bk?.words.findIndex(
                        x=>
                            x.id===
                            targetWord.dataset.wordId
                    );

                if(
                    bk&&
                    a>=0&&
                    b>=0&&
                    a!==b
                ){

                    const [m]=
                        bk.words.splice(
                            a,
                            1
                        );

                    bk.words.splice(
                        b,
                        0,
                        m
                    );

                    save();

                    renderWords();
                }
            }
        }
    );
}

function init(){

    bindClicks();

    document.addEventListener(
        "click",
        dynamicClicks
    );

    setupDrag();

    renderUsageGuide();

    renderFiles();

    applyTheme();

    showHome();

    document.addEventListener(
        "keydown",
        e=>{

            if(
                e.key===
                "Escape"
            ){

                closeModal();
            }
        }
    );

    registerServiceWorker();
}

function registerServiceWorker(){

    if(
        "serviceWorker" in
        navigator
    ){

        navigator.serviceWorker
            .register(
                "./sw.js"
            )
            .catch(
                ()=>{}
            );
    }
}

window.openFile=
    openFile;

window.renameFile=
    renameFile;

window.deleteFile=
    deleteFile;

window.openWorkbook=
    openWorkbook;

window.renameWorkbook=
    renameWorkbook;

window.deleteWorkbook=
    deleteWorkbook;

window.editWord=
    editWord;

window.deleteWord=
    deleteWord;

window.startFileTest=
    startFileTest;

window.startQuickTest=
    startQuickTest;

window.startWorkbookTest=
    startWorkbookTest;

window.openTotalTestMenu=
    openTotalTestMenu;

window.openQuickTestMenu=
    openQuickTestMenu;

window.startSpecialTest=
    startSpecialTest;

window.closeModal=
    closeModal;

window.showHome=
    showHome;

window.leaveTest=
    leaveTest;

window.retryWrongQuestions=
    retryWrongQuestions;

if(
    document.readyState===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

}else{

    init();
}
