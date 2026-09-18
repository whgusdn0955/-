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
importantWords.length ===
0
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
wrongWords.length ===
0
? "disabled"
: ""
}
onclick="closeModal(); startQuickTest('wrong')"
>

<strong>
❌ 자주 틀린 단어 테스트
</strong>

<span>
오답이 있는 단어 ${wrongWords.length}개
</span>

</button>

</div>
`
);

}

function getRandomDirection() {

return Math.random() < 0.5
? "en-ko"
: "ko-en";

}

function createQuestion(
item,
direction,
typeLabel
) {

const meanings =
Array.isArray(
item.word.meanings
)
? item.word.meanings
: item.word.meaning
? [item.word.meaning]
: [];

return {

word:
item.word.word,

meanings,

direction,

typeLabel,

fileName:
item.fileName ||
"",

workbookName:
item.workbookName ||
""

};

}

function collectFileQuestions(
file,
testType
) {

const items =
getAllWordsFromFile(
file
);

let questions = [];

items.forEach(
item => {

let direction;

if (
testType ===
"all"
) {

direction =
getRandomDirection();

} else if (
testType ===
"file-to-meaning"
) {

direction =
"en-ko";

} else {

direction =
"ko-en";

}

questions.push(
createQuestion(
{
word:
item.word,

fileName:
file.name,

workbookName:
item.workbook.name
},

direction,

getDirectionLabel(
testType,
file
)
)
);

}
);

questions =
shuffle(
questions
);

return questions;

}

function collectWorkbookQuestions(
workbook,
testType
) {

const items =
getWordsFromWorkbook(
workbook
).map(
word => ({

word,

fileName:
getCurrentFile()
?.name ||
"",

workbookName:
workbook.name

})
);

let questions =
items.map(
item =>
createQuestion(
item,

testType ===
"all"
? getRandomDirection()
: testType ===
"meaning-to-word"
? "ko-en"
: "en-ko",

testType
)
);

return shuffle(
questions
);

}

function startFileTest(
testType
) {

const file =
getCurrentFile();

if (!file) {
return;
}

const questions =
collectFileQuestions(
file,
testType
);

if (
questions.length ===
0
) {

showToast(
"테스트할 단어가 없습니다.",
"error"
);

return;

}

startTest(
questions,

testType ===
"all"
? "전체 테스트"
: testType ===
"file-to-meaning"
? `${file.name} → 뜻`
: `뜻 → ${file.name}`,

testType,

currentFileId,

null,

"file"
);

}

function startQuickTest(
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

let filtered = [];

if (
type ===
"important"
) {

filtered =
all.filter(
item =>
item.word.important
);

} else {

filtered =
all.filter(
item =>
item.word.wrong > 0
);

}

if (
filtered.length ===
0
) {

showToast(
"테스트할 단어가 없습니다.",
"error"
);

return;

}

const questions =
shuffle(
filtered.map(
item =>
createQuestion(
{
word:
item.word,

fileName:
file.name,

workbookName:
item.workbook.name
},

getRandomDirection(),

"빠른 테스트"
)
)
);

startTest(
questions,

type ===
"important"
? "중요 단어 테스트"
: "자주 틀린 단어 테스트",

type,

currentFileId,

null,

"file"
);

}

function startWorkbookTest() {

const workbook =
getCurrentWorkbook();

if (!workbook) {
return;
}

const items =
getWordsFromWorkbook(
workbook
);

if (
items.length ===
0
) {

showToast(
"테스트할 단어가 없습니다.",
"error"
);

return;

}

openModal(
"단어 테스트",
`
<div class="test-menu">

<button
class="test-menu-button"
onclick="closeModal(); startWorkbookTestByType('all')"
>

<strong>
📝 전체 테스트
</strong>

<span>
영어/뜻 방향이 문제마다 랜덤으로 출제됩니다.
</span>

</button>

<button
class="test-menu-button"
onclick="closeModal(); startWorkbookTestByType('word-to-meaning')"
>

<strong>
단어 → 뜻
</strong>

<span>
영어 단어를 보고 뜻을 입력합니다.
</span>

</button>

<button
class="test-menu-button"
onclick="closeModal(); startWorkbookTestByType('meaning-to-word')"
>

<strong>
뜻 → 단어
</strong>

<span>
뜻을 보고 영어 단어를 입력합니다.
</span>

</button>

</div>
`
);

}

function startWorkbookTestByType(
testType
) {

const workbook =
getCurrentWorkbook();

if (!workbook) {
return;
}

const questions =
collectWorkbookQuestions(
workbook,
testType
);

if (
questions.length ===
0
) {

showToast(
"테스트할 단어가 없습니다.",
"error"
);

return;

}

startTest(
questions,

`${workbook.name} 테스트`,

testType,

currentFileId,

currentWorkbookId,

"workbook"
);

}

function startTest(
questions,
testName,
testType,
sourceFileId,
sourceWorkbookId,
returnPage
) {

stopTimer();

testState = {

questions:
shuffle(
questions
),

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

returnPage,

answered:
false,

timer:
null,

timeLeft:
getTestTime(),

autoNextTimer:
null

};

showPage(
"test"
);

renderTestQuestion();

startTimer();

}

function getQuestionAnswers(
question
) {

if (
question.direction ===
"en-ko"
) {

return question.meanings;

}

return [
question.word
];

}

function getQuestionLabel(
question
) {

if (
question.direction ===
"en-ko"
) {

return (
question.typeLabel ||
"영어 → 뜻"
);

}

if (
question.typeLabel ===
"빠른 테스트"
) {

return "뜻 → 영어";

}

return (
question.typeLabel ||
"뜻 → 영어"
);

}

function renderTestQuestion() {

const question =
testState.questions[
testState.currentIndex
];

if (!question) {
return;
}

const total =
testState.questions.length;

const current =
testState.currentIndex +
1;

const questionNumber =
$("testQuestionNumber");

const totalQuestions =
$("testTotalQuestions");

const timer =
$("testTimer");

const label =
$("testTypeLabel");

const questionElement =
$("testQuestion");

const input =
$("testAnswerInput");

const feedback =
$("testFeedback");

const submit =
$("testSubmitButton");

if (questionNumber) {

questionNumber.textContent =
String(
current
);

}

if (totalQuestions) {

totalQuestions.textContent =
String(
total
);

}

if (timer) {

timer.textContent =
String(
getTestTime()
);

}

if (label) {

label.textContent =
getQuestionLabel(
question
);

}

if (questionElement) {

questionElement.textContent =
question.direction ===
"en-ko"

? question.word

: question.meanings.join(
", "
);

}

if (input) {

input.value =
"";

input.disabled =
false;

input.focus();

}

if (feedback) {

feedback.className =
"test-feedback hidden";

feedback.innerHTML =
"";

}

if (submit) {

submit.disabled =
false;

submit.textContent =
"확인";

}

testState.answered =
false;

testState.timeLeft =
getTestTime();

}

function startTimer() {

stopTimer();

const timerElement =
$("testTimer");

testState.timeLeft =
getTestTime();

if (timerElement) {

timerElement.textContent =
String(
testState.timeLeft
);

}

testState.timer =
setInterval(
() => {

if (
testState.answered
) {

return;

}

testState.timeLeft--;

if (timerElement) {

timerElement.textContent =
String(
Math.max(
0,
testState.timeLeft
)
);

}

if (
testState.timeLeft <=
0
) {

submitAnswer(
true
);

}

},
1000
);

}

function submitAnswer(
timedOut = false
) {

if (
testState.answered
) {

return;

}

const question =
testState.questions[
testState.currentIndex
];

if (!question) {
return;
}

const input =
$("testAnswerInput");

const answer =
input
? input.value.trim()
: "";

const expected =
getQuestionAnswers(
question
);

const correct =
!timedOut &&
expected.some(
value =>
String(
value
)
.trim()
.toLowerCase() ===
answer.toLowerCase()
);

testState.answered =
true;

if (input) {

input.disabled =
true;

}

const feedback =
$("testFeedback");

if (correct) {

testState.correct++;

if (feedback) {

feedback.className =
"test-feedback feedback-correct";

feedback.innerHTML =
`
✅ 정답입니다.
<br>
<strong>
${escapeHTML(
expected.join(
", "
)
)}
</strong>
`;

}

updateWordResult(
question.word,
true
);

} else {

testState.wrong++;

testState.wrongQuestions.push(
question
);

updateWordResult(
question.word,
false
);

if (feedback) {

feedback.className =
"test-feedback feedback-wrong";

feedback.innerHTML =
`
❌ ${
timedOut
? "시간 초과"
: "오답"
}

<br>

<strong>
정답:
${escapeHTML(
expected.join(
", "
)
)}
</strong>
`;

}

}

saveData();

if (
testState.currentIndex >=
testState.questions.length - 1
) {

completeTest();

return;

}

testState.autoNextTimer =
setTimeout(
() => {

nextTestQuestion();

},
850
);

}

function updateWordResult(
wordText,
correct
) {

const file =
getFile(
testState.sourceFileId
);

if (!file) {
return;
}

file.wordbooks.forEach(
workbook => {

workbook.words.forEach(
word => {

if (
word.word ===
wordText
) {

if (correct) {

word.correct++;

} else {

word.wrong++;

}

updateImportantStatus(
word
);

}

}
);

}
);

}

function nextTestQuestion() {

if (
!testState.answered
) {

return;

}

testState.currentIndex++;

renderTestQuestion();

startTimer();

}

function completeTest() {

stopTimer();

recordTestResult();

showResultPage();

}

function recordTestResult() {

const total =
testState.questions.length;

const record = {

id:
makeId(),

date:
new Date()
.toISOString(),

testName:
testState.testName,

testType:
testState.testType,

sourceFileId:
testState.sourceFileId,

sourceWorkbookId:
testState.sourceWorkbookId,

total,

correct:
testState.correct,

wrong:
testState.wrong,

accuracy:
total
? testState.correct /
total
: 0,

wrongQuestions:
testState.wrongQuestions.map(
question => ({

word:
question.word,

meanings:
question.meanings,

direction:
question.direction

})
)

};

appData.testRecords.push(
record
);

saveData();

}

function showResultPage() {

const total =
testState.questions.length;

const resultTestName =
$("resultTestName");

const resultCorrect =
$("resultCorrect");

const resultWrong =
$("resultWrong");

const resultTotal =
$("resultTotal");

const retryButton =
$("retryWrongButton");

if (resultTestName) {

resultTestName.textContent =
testState.testName;

}

if (resultCorrect) {

resultCorrect.textContent =
String(
testState.correct
);

}

if (resultWrong) {

resultWrong.textContent =
String(
testState.wrong
);

}

if (resultTotal) {

resultTotal.textContent =
String(
total
);

}

if (retryButton) {

retryButton.disabled =
testState.wrongQuestions.length ===
0;

}

showPage(
"result"
);

}

function retryWrongQuestions() {

const questions =
testState.wrongQuestions.map(
question => ({
...question
})
);

if (
questions.length ===
0
) {

showToast(
"틀린 문제가 없습니다.",
"error"
);

return;

}

startTest(
questions,

`${testState.testName} - 틀린 문제`,

"wrong-retry",

testState.sourceFileId,

testState.sourceWorkbookId,

testState.returnPage
);

}

function leaveTest() {

stopTimer();

if (
testState.returnPage ===
"workbook" &&
testState.sourceFileId &&
testState.sourceWorkbookId
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
   테스트 종료 및 페이지 이동
   ========================================================= */

function goBackToHome() {

    showHomePage();

}


function goBackToFile() {

    if (
        currentFileId
    ) {

        showFilePage(
            currentFileId
        );

    } else {

        showHomePage();

    }

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
   테스트 타이머
   ========================================================= */

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
   테스트 시간
   ========================================================= */

function getTestTime() {

    const select =
        $("testTimeSelect");


    if (
        select
    ) {

        const value =
            Number(
                select.value
            );


        if (
            [
                5,
                10,
                15,
                20,
                30,
                60
            ].includes(
                value
            )
        ) {

            return value;

        }

    }


    return (
        Number(
            appData.testTime
        ) || 10
    );

}


function changeTestTime(
    value
) {

    const time =
        Number(
            value
        );


    if (
        [
            5,
            10,
            15,
            20,
            30,
            60
        ].includes(
            time
        )
    ) {

        appData.testTime =
            time;

        saveData();

        testState.timeLeft =
            time;

    }

}


function applyTestTimeUI() {

    const select =
        $("testTimeSelect");


    if (
        select
    ) {

        select.value =
            String(
                appData.testTime ||
                10
            );

    }

}


/* =========================================================
   단어 목록
   ========================================================= */

function getWordsFromWorkbook(
    workbook
) {

    if (
        !workbook ||
        !Array.isArray(
            workbook.words
        )
    ) {

        return [];

    }


    return workbook.words.filter(
        word =>
            word.word &&
            Array.isArray(
                word.meanings
            ) &&
            word.meanings.length >
            0
    );

}


function getAllWordsFromFile(
    file
) {

    if (
        !file ||
        !Array.isArray(
            file.wordbooks
        )
    ) {

        return [];

    }


    const result = [];


    file.wordbooks.forEach(
        workbook => {

            getWordsFromWorkbook(
                workbook
            ).forEach(
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
   테스트 방향 표시
   ========================================================= */

function getDirectionLabel(
    type,
    file
) {

    if (
        type ===
        "file-to-meaning"
    ) {

        return `${file?.name || "단어"} → 뜻`;

    }


    if (
        type ===
        "meaning-to-file"
    ) {

        return `뜻 → ${file?.name || "단어"}`;

    }


    if (
        type ===
        "word-to-meaning"
    ) {

        return "영어 → 뜻";

    }


    if (
        type ===
        "meaning-to-word"
    ) {

        return "뜻 → 영어";

    }


    return "영어 ↔ 뜻";

}


/* =========================================================
   일반 테스트 메뉴
   ========================================================= */

function openTotalTestMenu() {

    const file =
        getCurrentFile();


    if (!file) {

        showToast(
            "파일을 먼저 선택해주세요.",
            "error"
        );

        return;

    }


    const allWords =
        getAllWordsFromFile(
            file
        );


    if (
        allWords.length ===
        0
    ) {

        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );

        return;

    }


    openModal(
        "일반 테스트",
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
                    영어 → 뜻 / 뜻 → 영어가 문제마다 랜덤으로 출제됩니다.
                </span>

            </button>


            <button
                class="test-menu-button"
                onclick="closeModal(); startFileTest('file-to-meaning')"
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
                onclick="closeModal(); startFileTest('meaning-to-file')"
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
                onclick="closeModal(); openQuickTestMenu()"
            >

                <strong>
                    ⚡ 빠른 테스트
                </strong>

                <span>
                    중요 단어 또는 자주 틀린 단어를 테스트합니다.
                </span>

            </button>

        </div>
        `
    );

}


/* =========================================================
   모달
   ========================================================= */

function openModal(
    title,
    content
) {

    const overlay =
        $("modalOverlay");


    const titleElement =
        $("modalTitle");


    const body =
        $("modalBody");


    if (
        !overlay
    ) {

        return;

    }


    if (
        titleElement
    ) {

        titleElement.textContent =
            title;

    }


    if (
        body
    ) {

        body.innerHTML =
            content;

    }


    overlay.classList.remove(
        "hidden"
    );

}


function closeModal() {

    const overlay =
        $("modalOverlay");


    if (
        overlay
    ) {

        overlay.classList.add(
            "hidden"
        );

    }

}


function openInputModal(
    title,
    placeholder,
    initialValue,
    onConfirm
) {

    openModal(
        title,
        `
        <div class="modal-form">

            <input
                id="modalInput"
                type="text"
                placeholder="${escapeHTML(placeholder)}"
                value="${escapeHTML(initialValue)}"
                autocomplete="off"
            >

            <div class="modal-actions">

                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeModal()"
                >
                    취소
                </button>

                <button
                    type="button"
                    class="primary-button"
                    id="modalConfirmButton"
                >
                    확인
                </button>

            </div>

        </div>
        `
    );


    const input =
        $("modalInput");


    const button =
        $("modalConfirmButton");


    if (
        input
    ) {

        setTimeout(
            () => {

                input.focus();

                input.select();

            },
            50
        );


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    button?.click();

                }

            }
        );

    }


    button?.addEventListener(
        "click",
        () => {

            const value =
                input
                ? input.value.trim()
                : "";


            if (!value) {

                showToast(
                    "내용을 입력해주세요.",
                    "error"
                );

                return;

            }


            onConfirm(
                value
            );


            closeModal();

        }
    );

}


function openConfirmModal(
    title,
    message,
    onConfirm
) {

    openModal(
        title,
        `
        <div class="modal-confirm">

            <p>
                ${escapeHTML(
                    message
                ).replace(
                    /\n/g,
                    "<br>"
                )}
            </p>


            <div class="modal-actions">

                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeModal()"
                >
                    취소
                </button>


                <button
                    type="button"
                    class="danger-button"
                    id="confirmActionButton"
                >
                    확인
                </button>

            </div>

        </div>
        `
    );


    $("confirmActionButton")?.addEventListener(
        "click",
        () => {

            closeModal();

            onConfirm();

        }
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


    const summary =
        $("statisticsSummary");


    const list =
        $("statisticsList");


    const empty =
        $("emptyStatisticsState");


    if (
        records.length ===
        0
    ) {

        if (summary) {
            summary.innerHTML =
                "";
        }


        if (list) {
            list.innerHTML =
                "";
        }


        empty?.classList.remove(
            "hidden"
        );


        return;

    }


    empty?.classList.add(
        "hidden"
    );


    let total =
        0;


    let correct =
        0;


    let wrong =
        0;


    records.forEach(
        record => {

            total +=
                Number(
                    record.total
                ) || 0;


            correct +=
                Number(
                    record.correct
                ) || 0;


            wrong +=
                Number(
                    record.wrong
                ) || 0;

        }
    );


    const accuracy =
        total > 0
            ? Math.round(
                correct /
                total *
                100
            )
            : 0;


    if (
        summary
    ) {

        summary.innerHTML = `

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
                    ${accuracy}%
                </strong>

                <small>
                    정답률
                </small>

            </div>

        `;

    }


    if (
        list
    ) {

        const sorted =
            [...records].sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.date
                    ) -
                    new Date(
                        a.date
                    )
            );


        list.innerHTML =
            sorted
                .map(
                    record => {

                        const date =
                            new Date(
                                record.date
                            );


                        const dateText =
                            Number.isNaN(
                                date.getTime()
                            )
                                ? "-"
                                : date.toLocaleString(
                                    "ko-KR"
                                );


                        return `

                            <div
                                class="statistics-record"
                            >

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            record.testName ||
                                            "테스트"
                                        )}
                                    </strong>

                                    <span>
                                        ${dateText}
                                    </span>

                                </div>


                                <div>

                                    <span>
                                        ${record.total}문제
                                    </span>

                                    <span>
                                        정답 ${record.correct}
                                    </span>

                                    <span>
                                        오답 ${record.wrong}
                                    </span>

                                    <strong>
                                        ${record.accuracy}%
                                    </strong>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }

}


/* =========================================================
   설정
   ========================================================= */

function applyTheme() {

    const dark =
        appData.theme ===
        "dark";


    document.body.classList.toggle(
        "dark",
        dark
    );


    const toggle =
        $("darkModeToggle");


    if (
        toggle
    ) {

        toggle.checked =
            dark;

    }


    const headerButton =
        $("headerThemeButton");


    if (
        headerButton
    ) {

        headerButton.textContent =
            dark
                ? "☀️"
                : "🌙";

    }

}


function toggleTheme() {

    appData.theme =
        appData.theme ===
        "dark"
            ? "light"
            : "dark";


    saveData();

    applyTheme();

}


function toggleUsageGuide() {

    const guide =
        $("usageGuideContent");


    if (
        guide
    ) {

        guide.classList.toggle(
            "hidden"
        );

    }

}


function renderUsageGuide() {

    const guide =
        $("usageGuideContent");


    if (
        !guide
    ) {

        return;

    }


    guide.innerHTML = `

        <div class="usage-guide">

            <h3>
                단어 암기장 사용 방법
            </h3>

            <p>
                <strong>
                    파일
                </strong>
                안에 여러 개의 단어장을 만들 수 있습니다.
            </p>

            <p>
                단어는
                <code>:</code>
                로 영어와 뜻을 구분합니다.
            </p>

            <p>
                여러 뜻은
                <code>,</code>
                로 구분합니다.
            </p>

            <p>
                여러 단어는
                <code>/</code>
                로 구분합니다.
            </p>

            <p>
                예:
                <code>
                    apple:사과,사과나무/banana:바나나
                </code>
            </p>

            <p>
                일반 테스트에서는 출제 방향을 선택할 수 있고,
                전체 테스트에서는 문제마다 방향이 랜덤으로 결정됩니다.
            </p>

            <p>
                테스트 시간은 설정에서
                5초, 10초, 15초, 20초, 30초, 60초 중 선택할 수 있습니다.
            </p>

            <p>
                단어를 자주 틀리면 오답 횟수가 기록되고
                중요 단어로 표시할 수 있습니다.
            </p>

            <hr>

            <h3>
                현재 버전
            </h3>

            <p>
                v${APP_VERSION}
            </p>

            <p>
                현재 버전에서는
                파일/단어장/단어 관리,
                일반 테스트,
                오답 기록,
                중요 단어,
                통계,
                데이터 저장 기능을 제공합니다.
            </p>

        </div>

    `;

}


/* =========================================================
   데이터 내보내기
   ========================================================= */

function exportData() {

    try {

        const data =
            JSON.stringify(
                {
                    app:
                        "단어 암기장",

                    version:
                        APP_VERSION,

                    exportedAt:
                        new Date()
                            .toISOString(),

                    data:
                        appData
                },
                null,
                2
            );


        const blob =
            new Blob(
                [data],
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


        link.href =
            url;


        link.download =
            `단어장_백업_${date.getFullYear()}-${String(
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


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "데이터를 저장했습니다."
        );

    } catch (
        error
    ) {

        console.error(
            error
        );


        showToast(
            "데이터 저장에 실패했습니다.",
            "error"
        );

    }

}


/* =========================================================
   데이터 가져오기
   ========================================================= */

function importData() {

    const input =
        $("importFileInput");


    if (
        input
    ) {

        input.click();

    }

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


                if (
                    !parsed ||
                    !parsed.data ||
                    !Array.isArray(
                        parsed.data.files
                    )
                ) {

                    throw new Error(
                        "INVALID"
                    );

                }


                openConfirmModal(
                    "데이터 가져오기",
                    "현재 데이터가 선택한 백업 데이터로 교체됩니다.\n계속하시겠습니까?",
                    () => {

                        appData =
                            normalizeData(
                                parsed.data
                            );


                        saveData();

                        applyTheme();

                        applyTestTimeUI();

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

            } catch (
                error
            ) {

                console.error(
                    error
                );


                showToast(
                    "올바른 백업 파일이 아닙니다.",
                    "error"
                );

            }

        };


    reader.readAsText(
        file,
        "UTF-8"
    );


    event.target.value =
        "";

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

                            return;

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

                            return;

                        }


                        if (
                            page ===
                            "settings"
                        ) {

                            stopTimer();

                            showPage(
                                "settings"
                            );

                            applyTestTimeUI();

                            renderUsageGuide();

                            return;

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
        ?.addEventListener(
            "click",
            addFile
        );


    $("emptyAddFileButton")
        ?.addEventListener(
            "click",
            addFile
        );


    $("backToHomeButton")
        ?.addEventListener(
            "click",
            goBackToHome
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

                    showHomePage();

                }

            }
        );


    $("addWordButton")
        ?.addEventListener(
            "click",
            startWorkbookTest
        );


    $("bulkAddWordButton")
        ?.addEventListener(
            "click",
            addBulkWords
        );


    $("fileTestButton")
        ?.addEventListener(
            "click",
            openTotalTestMenu
        );


    $("testSubmitButton")
        ?.addEventListener(
            "click",
            () => {

                if (
                    testState.answered
                ) {

                    nextTestQuestion();

                } else {

                    submitAnswer(
                        false
                    );

                }

            }
        );


    $("testBackButton")
        ?.addEventListener(
            "click",
            leaveTest
        );


    $("resultHomeButton")
        ?.addEventListener(
            "click",
            goToResultHome
        );


    $("resultBackButton")
        ?.addEventListener(
            "click",
            goToResultBack
        );


    $("retryWrongButton")
        ?.addEventListener(
            "click",
            retryWrongQuestions
        );


    $("darkModeToggle")
        ?.addEventListener(
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
        ?.addEventListener(
            "click",
            toggleTheme
        );


    $("testTimeSelect")
        ?.addEventListener(
            "change",
            event =>
                changeTestTime(
                    event.target.value
                )
        );


    $("exportDataButton")
        ?.addEventListener(
            "click",
            exportData
        );


    $("importDataButton")
        ?.addEventListener(
            "click",
            importData
        );


    $("importFileInput")
        ?.addEventListener(
            "change",
            handleImportFile
        );


    $("usageGuideButton")
        ?.addEventListener(
            "click",
            toggleUsageGuide
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


    $("mobileMenuButton")
        ?.addEventListener(
            "click",
            openSidebar
        );


    $("headerHomeButton")
        ?.addEventListener(
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


            if (
                document
                    .querySelector(
                        ".page.active"
                    )
                    ?.id !==
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

                nextTestQuestion();

            } else {

                submitAnswer(
                    false
                );

            }

        }
    );

}


/* =========================================================
   초기화
   ========================================================= */

function initializeApp() {

    applyTheme();

    applyTestTimeUI();

    renderUsageGuide();

    setupNavigation();

    setupButtons();

    setupKeyboardEvents();

    renderFileList();

    showHomePage();


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
                    .catch(
                        error =>
                            console.error(
                                "Service Worker 등록 실패:",
                                error
                            )
                    );

            }
        );

    }


    console.log(
        `단어 암기장이 시작되었습니다. v${APP_VERSION}`
    );

}


/* =========================================================
   전역 함수
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

window.startFileTest =
    startFileTest;

window.startQuickTest =
    startQuickTest;

window.startWorkbookTest =
    startWorkbookTest;

window.openTotalTestMenu =
    openTotalTestMenu;

window.openQuickTestMenu =
    openQuickTestMenu;

window.closeModal =
    closeModal;

window.goBackToHome =
    goBackToHome;

window.goBackToFile =
    goBackToFile;

window.retryWrongQuestions =
    retryWrongQuestions;


/* =========================================================
   실행
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
