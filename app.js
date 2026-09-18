"use strict";

/* =========================================================
   단어 암기장
   앱 버전
   ========================================================= */

const APP_VERSION = "3.4.13";

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

    hanjaList: "hanjaListPage",

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

function baseShowWorkbookPage(
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
                    event => {

                        draggedFileId =
                            card.dataset.fileId;

                        card.classList.add(
                            "dragging"
                        );

                        if (event.dataTransfer) {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData(
                                "text/plain",
                                draggedFileId
                            );
                        }

                    }
                );


                card.addEventListener(
                    "dragend",
                    () => {

                        draggedFileId =
                            null;

                        document
                            .querySelectorAll(".file-card.drag-over")
                            .forEach(item => item.classList.remove("drag-over"));

                        card.classList.remove(
                            "dragging"
                        );

                    }
                );


                card.addEventListener(
                    "dragover",
                    event => {

                        event.preventDefault();

                        if (event.dataTransfer) {
                            event.dataTransfer.dropEffect = "move";
                        }

                        if (draggedFileId && draggedFileId !== card.dataset.fileId) {
                            card.classList.add("drag-over");
                        }

                    }
                );

                card.addEventListener(
                    "dragleave",
                    event => {
                        if (!card.contains(event.relatedTarget)) {
                            card.classList.remove("drag-over");
                        }
                    }
                );


                card.addEventListener(
                    "drop",
                    event => {

                        event.preventDefault();

                        card.classList.remove("drag-over");

                        const targetId =
                            card.dataset.fileId;

                        if (
                            !draggedFileId ||
                            draggedFileId === targetId
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
                                data-open-workbook="${escapeHTML(workbook.id)}"
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


function showWorkbookPage(
    fileId,
    workbookId
) {

    return baseShowWorkbookPage(
        fileId,
        workbookId
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

    }


    if (
        duplicates > 0
    ) {

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
   단어장 전용 테스트
   + 단어 추가 버튼
   ========================================================= */

function makeQuestion(item, direction, file) {

    return baseMakeQuestion(
        item,
        direction,
        file
    );

}


function baseStartWorkbookTest() {

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
        workbook.words.length ===
        0
    ) {

        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );


        return;

    }


    const questions =
        workbook.words.map(
            word => {

                const direction =
                    Math.random() < 0.5
                        ? "file-to-meaning"
                        : "meaning-to-file";


                return makeQuestion(
                    {
                        word,
                        workbook
                    },
                    direction,
                    file
                );

            }
        );


    startTest(
        questions,
        `${workbook.name} 테스트`,
        "workbook",
        file.id,
        workbook.id,
        "workbook"
    );

}


/* =========================================================
   단어장 테스트 진입점
   일반 단어장 / 한자 단어장 분기
   ========================================================= */

function startWorkbookTest() {

    const workbook = getCurrentWorkbook();

    if (!workbook) {
        return;
    }

    if (getWorkbookMode(workbook) === "hanja") {
        return openSpecialTestMenu();
    }

    return baseStartWorkbookTest();
}


/* =========================================================
   단어 하나 추가
   ========================================================= */

function addSingleWord() {

    startWorkbookTest();

}


/* =========================================================
   단어 목록
   ========================================================= */

function baseRenderWordList() {

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
        words.length ===
        0
    ) {

        list.innerHTML =
            "";


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

    $("wordCountDescription")
        .textContent =
        `${count}개의 단어`;


    $("wordListCount")
        .textContent =
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
                            newMeaningText
                                .split(",")
                        );


                    const duplicateWord =
                        workbook.words.find(
                            item =>
                                item.id !==
                                wordId &&
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
                                    duplicateWord
                                        .meanings
                                        .includes(
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
   일반 테스트 메뉴
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


    if (
        all.length ===
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
                        영어/뜻 방향이 문제마다 랜덤으로 출제됩니다.
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
                        파일의 단어를 보고 뜻을 입력합니다.
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
   문제 생성
   ========================================================= */

function baseMakeQuestion(
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
        "file-to-meaning"
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
   일반 파일 테스트
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


    if (
        all.length ===
        0
    ) {

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
                        Math.random() <
                        0.5
                            ? "file-to-meaning"
                            : "meaning-to-file";


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
        null,
        "file"
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
        "file-to-meaning"
    ) {

        return `${fileName} → 뜻`;

    }


    if (
        type ===
        "meaning-to-file"
    ) {

        return `뜻 → ${fileName}`;

    }


    return `${fileName} 테스트`;

}


/* =========================================================
   빠른 테스트
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
        selected.length ===
        0
    ) {

        showToast(
            "해당 단어가 없습니다.",
            "error"
        );


        return;

    }


    const questions =
        selected.map(
            item => {

                const direction =
                    Math.random() <
                    0.5
                        ? "file-to-meaning"
                        : "meaning-to-file";


                return makeQuestion(
                    item,
                    direction,
                    file
                );

            }
        );


    startTest(
        questions,
        mode === "important"
            ? "⭐ 중요 단어 테스트"
            : "❌ 틀린 단어 테스트",
        "quick",
        file.id,
        null,
        "file"
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
    sourceWorkbookId,
    returnPage = "home"
) {

    if (
        !questions ||
        questions.length ===
        0
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

        returnPage,

        answered:
            false,

        timer:
            null,

        timeLeft:
            Number(
                appData.testTime
            ) || 10,

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

function baseRenderCurrentQuestion() {

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
        Number(
            appData.testTime
        ) || 10;


    $("testQuestionNumber")
        .textContent =
        testState.currentIndex +
        1;


    $("testTotalQuestions")
        .textContent =
        testState.questions.length;


    const fileName =
        question.file?.name ||
        "파일";


    if (
        question.direction ===
        "file-to-meaning"
    ) {

        $("testTypeLabel")
            .textContent =
            `${fileName} → 뜻`;

    } else {

        $("testTypeLabel")
            .textContent =
            `뜻 → ${fileName}`;

    }


    $("testQuestion")
        .textContent =
        question.question;


    $("testTimer")
        .textContent =
        testState.timeLeft;


    const input =
        $("testAnswerInput");


    input.value =
        "";


    input.disabled =
        false;


    const feedback =
        $("testFeedback");


    feedback.classList.add(
        "hidden"
    );


    feedback.innerHTML =
        "";


    $("testSubmitButton")
        .textContent =
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
        Number(
            appData.testTime
        ) || 10;


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

    $("testTimer")
        .textContent =
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

function baseCheckAnswer(
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
        question.answers ||
        [];


    return answers.some(
        answer => {

            const expected =
                String(
                    answer
                ).trim();


            if (
                question.direction ===
                "meaning-to-file"
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
        testState.questions.length -
        1
    ) {

        $("testSubmitButton")
            .textContent =
            "결과 보기";

    } else {

        $("testSubmitButton")
            .textContent =
            "다음 문제";

    }


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

function baseUpdateWordStatistics(
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
            Number(word.correct) +
            1;

    } else {

        word.wrong =
            Number(word.wrong) +
            1;

    }


    updateImportantStatus(
        word
    );


    saveData();

}


/* =========================================================
   피드백
   ========================================================= */

function baseShowAnswerFeedback(
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
                    ${escapeHTML(
                        answerText
                    )}
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
                            ${escapeHTML(
                                userAnswer
                            )}
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
                    ${escapeHTML(
                        answerText
                    )}
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
   테스트 뒤로가기
   ========================================================= */

function leaveTest() {

    stopTimer();


    const returnPage =
        testState.returnPage;


    if (
        returnPage ===
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
        returnPage ===
        "file" &&
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
   테스트 종료
   ========================================================= */

function baseFinishTest() {

    stopTimer();


    const total =
        testState.questions.length;


    const record = {

        id:
            makeId(),

        date:
            new Date()
                .toISOString(),

        fileName:
            getFileNameForTest(),

        testName:
            testState.testName,

        testType:
            testState.testType,

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


    $("resultTestName")
        .textContent =
        testState.testName;


    $("resultCorrect")
        .textContent =
        testState.correct;


    $("resultWrong")
        .textContent =
        testState.wrong;


    $("resultTotal")
        .textContent =
        total;


    $("retryWrongButton")
        .disabled =
        testState.wrongQuestions
            .length === 0;


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
        testState.sourceWorkbookId,
        testState.returnPage
    );

}


/* =========================================================
   기록
   ========================================================= */

function renderStatistics() {

    const records =
        Array.isArray(
            appData.testRecords
        )
            ? appData.testRecords
            : [];


    if (
        records.length ===
        0
    ) {

        $("statisticsSummary")
            .innerHTML =
            "";


        $("statisticsList")
            .innerHTML =
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
   기록 요약
   ========================================================= */

function renderStatisticsSummary(
    records
) {

    let totalQuestions =
        0;


    let totalCorrect =
        0;


    let totalWrong =
        0;


    records.forEach(
        record => {

            totalQuestions +=
                Number(
                    record.total ||
                    0
                );


            totalCorrect +=
                Number(
                    record.correct ||
                    0
                );


            totalWrong +=
                Number(
                    record.wrong ||
                    0
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


    $("statisticsSummary")
        .innerHTML = `

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
   기록 날짜
   날짜 → 시간 → 테스트 종류
   ========================================================= */

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

        return {
            date: "",
            time: ""
        };

    }


    return {

        date:
            `${date.getFullYear()}.${String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            )}.${String(
                date.getDate()
            ).padStart(
                2,
                "0"
            )}`,

        time:
            `${String(
                date.getHours()
            ).padStart(
                2,
                "0"
            )}:${String(
                date.getMinutes()
            ).padStart(
                2,
                "0"
            )}`

    };

}


/* =========================================================
   기록 목록
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


    $("statisticsList")
        .innerHTML =
        sorted
            .map(
                record =>
                    renderStatisticRecord(
                        record
                    )
            )
            .join("");

}


/* =========================================================
   기록 하나
   ========================================================= */

function renderStatisticRecord(
    record
) {

    const dateInfo =
        formatRecordDate(
            record.date
        );


    const testType =
        getTestTypeText(
            record
        );


    return `

        <div class="statistic-record">

            <div class="statistic-record-info">

                <strong>
                    ${escapeHTML(
                        dateInfo.date
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        dateInfo.time
                    )}
                </span>

                <small>
                    ${escapeHTML(
                        testType
                    )}
                </small>

            </div>


            <div class="statistic-record-score">

                <strong>
                    ${Number(
                        record.correct ||
                        0
                    )}
                    /
                    ${Number(
                        record.total ||
                        0
                    )}
                </strong>

                <span>
                    ⭕ ${Number(
                        record.correct ||
                        0
                    )}
                    ·
                    ❌ ${Number(
                        record.wrong ||
                        0
                    )}
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   기록 테스트 종류
   ========================================================= */

function getTestTypeText(
    record
) {

    if (
        record.testType ===
        "workbook"
    ) {

        return `단어장 테스트 · ${record.testName}`;

    }


    if (
        record.testType ===
        "quick"
    ) {

        return record.testName ||
            "빠른 테스트";

    }


    if (
        record.testType ===
        "wrong-retry"
    ) {

        return record.testName ||
            "틀린 문제 다시 풀기";

    }


    return record.testName ||
        "일반 테스트";

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


    document.documentElement
        .dataset.theme =
        dark
            ? "dark"
            : "light";


    if (
        $("darkModeToggle")
    ) {

        $("darkModeToggle")
            .checked =
            dark;

    }


    if (
        $("headerThemeButton")
    ) {

        $("headerThemeButton")
            .textContent =
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


/* =========================================================
   테스트 시간
   ========================================================= */

function applyTestTimeUI() {

    const select =
        $("testTimeSelect");


    if (!select) {
        return;
    }


    select.value =
        String(
            appData.testTime
        );

}


function changeTestTime(
    value
) {

    const allowed =
        [
            5,
            10,
            15,
            20,
            30,
            60
        ];


    const time =
        Number(value);


    if (
        !allowed.includes(
            time
        )
    ) {

        return;

    }


    appData.testTime =
        time;


    saveData();


    showToast(
        `문제 제한시간이 ${time}초로 변경되었습니다.`
    );

}


/* =========================================================
   데이터 내보내기
   ========================================================= */

function exportData() {

    const exportObject = {

        appName:
            "단어 암기장",

        version:
            APP_VERSION,

        exportedAt:
            new Date()
                .toISOString(),

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


    input.value =
        "";


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
   버전 / 업데이트 기록 / 사용 설명서
   ========================================================= */

const VERSION_CHANGELOG = [

    {
        version: "3.1.0",
        date: "2026-09-18",

        added: [
            "버전별 업데이트 기록",
            "업데이트 기록과 현재 기능을 연동하는 설명서 시스템"
        ],

        modified: [
            "현재 버전에 존재하는 기능만 사용 설명서에 표시되도록 개선",
            "설명서에 기능 추가·수정·제거 내역을 함께 표시",
            "일부 화면 요소가 없어도 앱 초기화가 중단되지 않도록 안정성 개선"
        ],

        removed: []
    },

    {
        version: "3.0.0",
        date: "2026-09-18",

        added: [
            "한자 전용 단어장 모드",
            "일본어 전용 단어장 모드",
            "한자 급수 선택 기능",
            "한자 4지선다 테스트",
            "일본어 음독·훈독 테스트",
            "테스트 제한시간 설정"
        ],

        modified: [
            "단어장 테스트를 현재 단어장 기준으로 동작하도록 개선",
            "전체 테스트의 문제 방향을 문제마다 랜덤으로 출제",
            "테스트 결과 기록 기능 개선"
        ],

        removed: []
    },

    {
        version: "1.1.0",
        date: "2026-09-17",

        added: [
            "문제별 제한시간 설정",
            "기록 화면"
        ],

        modified: [
            "테스트 및 사용 방법 안내 개선"
        ],

        removed: []
    },

    {
        version: "1.0.0",
        date: "2026-09-17",

        added: [
            "파일 및 단어장 관리",
            "단어 추가·수정·삭제",
            "일반 테스트",
            "빠른 테스트",
            "중요 단어 표시",
            "테스트 기록",
            "다크 모드",
            "데이터 내보내기 및 가져오기"
        ],

        modified: [],

        removed: []
    }

];


const USAGE_GUIDE = [

    {
        since: "1.0.0",
        until: null,
        title: "📁 파일",
        text: "파일 안에 여러 개의 단어장을 만들 수 있습니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "📖 단어장",
        text: "단어를 추가하고 수정하거나 삭제할 수 있으며, 드래그하여 순서를 변경할 수 있습니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "✏️ 단어 입력",
        text: "<code>:</code>로 단어와 뜻을 구분하고, <code>,</code>로 여러 뜻을 입력하며, <code>/</code>로 여러 단어를 구분합니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "📝 일반 테스트",
        text: "파일에 들어 있는 단어를 대상으로 테스트합니다. 전체 테스트에서는 각 문제의 출제 방향이 랜덤으로 결정됩니다."
    },

    {
        since: "3.0.0",
        until: null,
        title: "📚 단어장 테스트",
        text: "단어장 화면의 <strong>📝 단어 테스트</strong>를 누르면 현재 단어장에 있는 단어만 테스트합니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "⭐ 중요 단어",
        text: "전체 시도 횟수 중 틀린 비율이 70%를 초과하면 해당 단어가 자동으로 중요 단어로 표시됩니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "💾 데이터 백업",
        text: "데이터 내보내기로 백업 파일을 만들고, 데이터 가져오기로 백업한 데이터를 복원할 수 있습니다."
    },

    {
        since: "3.0.0",
        until: null,
        title: "⏱️ 테스트 제한시간",
        text: "설정에서 문제 하나당 제한시간을 5초, 10초, 15초, 20초, 30초, 60초 중에서 선택할 수 있습니다."
    },

    {
        since: "3.0.0",
        until: null,
        title: "🀄 한자 단어장",
        text: "단어장 이름에 <strong>한자</strong>가 포함되면 내장 한자 학습 모드가 사용됩니다. 급수를 선택하고 뜻·음 테스트 또는 4지선다 테스트를 할 수 있습니다."
    },

    {
        since: "3.0.0",
        until: null,
        title: "🇯🇵 일본어 단어장",
        text: "단어장 이름에 <strong>일본어</strong>가 포함되면 일본어 학습 모드가 사용됩니다. 뜻은 사용하지 않고 한자의 음독·훈독을 학습합니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "🌙 다크 모드",
        text: "설정 또는 상단의 테마 버튼으로 화면 테마를 변경할 수 있습니다."
    },

    {
        since: "1.0.0",
        until: null,
        title: "📊 기록",
        text: "완료한 테스트의 날짜, 시간, 테스트 종류와 정답·오답 결과를 확인할 수 있습니다."
    }

];


function compareVersions(a, b) {

    const pa = String(a || "0").split(".").map(Number);
    const pb = String(b || "0").split(".").map(Number);

    for (let i = 0; i < 3; i++) {

        const va = Number.isFinite(pa[i]) ? pa[i] : 0;
        const vb = Number.isFinite(pb[i]) ? pb[i] : 0;

        if (va > vb) return 1;
        if (va < vb) return -1;

    }

    return 0;

}


function isGuideItemVisible(item) {

    const afterSince =
        compareVersions(
            APP_VERSION,
            item.since
        ) >= 0;

    const beforeUntil =
        !item.until ||
        compareVersions(
            APP_VERSION,
            item.until
        ) < 0;

    return afterSince && beforeUntil;

}


function renderChangeList(items) {

    if (!items || items.length === 0) {
        return "<li>없음</li>";
    }

    return items
        .map(
            item => `<li>${escapeHTML(item)}</li>`
        )
        .join("");

}


function renderChangelog() {

    const rows =
        VERSION_CHANGELOG
            .map(
                entry => `

                    <div class="guide-item">

                        <strong>
                            v${escapeHTML(entry.version)}
                            · ${escapeHTML(entry.date)}
                        </strong>

                        <p><strong>추가</strong></p>
                        <ul>
                            ${renderChangeList(entry.added)}
                        </ul>

                        <p><strong>수정</strong></p>
                        <ul>
                            ${renderChangeList(entry.modified)}
                        </ul>

                        <p><strong>제거</strong></p>
                        <ul>
                            ${renderChangeList(entry.removed)}
                        </ul>

                    </div>

                `
            )
            .join("");

    return rows;

}


function getCurrentUsageGuide() {

    return USAGE_GUIDE.filter(
        isGuideItemVisible
    );

}


function renderUsageGuide() {

    const content =
        $("usageGuideContent");


    if (!content) {
        return;
    }


    const guide =
        getCurrentUsageGuide();


    content.innerHTML = `

        <div class="guide-version">
            현재 버전 ${escapeHTML(APP_VERSION)}
        </div>

        ${
            guide
                .map(
                    item => `

                        <div class="guide-item">

                            <strong>
                                ${item.title}
                            </strong>

                            <p>
                                ${item.text}
                            </p>

                        </div>

                    `
                )
                .join("")
        }

        <div class="guide-item">

            <strong>🆕 업데이트 기록</strong>

            <p>
                각 버전에서 추가·수정·제거된 기능을 확인할 수 있습니다.
            </p>

            ${renderChangelog()}

        </div>

    `;

}


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
                ${escapeHTML(
                    description
                )}
            </p>

            <input
                id="modalInputField"
                class="modal-input"
                type="text"
                autocomplete="off"
                value="${escapeHTML(
                    defaultValue
                )}"
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
                ${escapeHTML(
                    message
                )}
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

    $("modalTitle")
        .textContent =
        title;


    $("modalBody")
        .innerHTML =
        body;


    $("modalFooter")
        .innerHTML =
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


                            applyTestTimeUI();

                        }

                    }
                );

            }
        );

}



/* =========================================================
   한자 / 일본어 전용 단어장 모드
   - 단어장 이름에 "한자" 포함 → 한자 모드
   - 단어장 이름에 "일본어" 포함 → 일본어 모드
   ========================================================= */

const HANJA_SOURCE_SITE = "https://hanjasajun.co.kr/index.php?g=80";
const HANJA_DATA_URL = "https://raw.githubusercontent.com/rycont/hanja-grade-dataset/main/hanja.csv";
const HANJA_DATA_FALLBACK_URL = "https://github.com/rycont/hanja-grade-dataset/raw/refs/heads/main/hanja.csv";
const HANJA_CACHE_KEY = "word-memorize-hanja-grade-dataset-v1";

const HANJA_LEVEL_ORDER = [
    "8급", "준7급", "7급", "준6급", "6급", "준5급", "5급",
    "준4급", "4급", "준3급", "3급", "2급", "1급", "준특급", "특급"
];

const HANJA_SOURCE_LEVEL = {
    "8급": "8급",
    "준7급": "7급Ⅱ",
    "7급": "7급",
    "준6급": "6급Ⅱ",
    "6급": "6급",
    "준5급": "5급Ⅱ",
    "5급": "5급",
    "준4급": "4급Ⅱ",
    "4급": "4급",
    "준3급": "3급Ⅱ",
    "3급": "3급",
    "2급": "2급",
    "1급": "1급",
    "준특급": "특급Ⅱ",
    "특급": "특급"
};

/* 한자사전 사이트의 5,978자 누적 범위 */
const HANJA_LEVEL_COUNTS = {
    "8급": 50,
    "준7급": 100,
    "7급": 150,
    "준6급": 225,
    "6급": 300,
    "준5급": 400,
    "5급": 500,
    "준4급": 750,
    "4급": 1000,
    "준3급": 1500,
    "3급": 1817,
    "2급": 2355,
    "1급": 3500,
    "준특급": 4650,
    "특급": 5978
};

const HANJA_TEST_EXAMPLES = {
    hun: "예: 父 → 아비",
    eum: "예: 父 → 부",
    hunToChar: "예: 아비 → 父",
    eumToChar: "예: 부 → 父"
};

let HANJA_DATA = [];
let HANJA_DATA_MAP = new Map();
let HANJA_DATA_BY_LEVEL = new Map();
let hanjaDataPromise = null;
let currentHanjaListMode = "level";
let hanjaListSelectedLevel = "8급";

function normalizeHanjaSourceLevel(level) {
    return String(level || "")
        .normalize("NFKC")
        .replace(/\s+/g, "")
        .replaceAll("2", "II")
        .trim();
}

function mapSourceLevelToDisplay(level) {
    const normalized = normalizeHanjaSourceLevel(level);
    const entry = Object.entries(HANJA_SOURCE_LEVEL)
        .find(([, source]) => normalizeHanjaSourceLevel(source) === normalized);
    return entry ? entry[0] : String(level || "").trim();
}

function parseHanjaMeaning(value) {
    const raw = String(value || "").trim();
    if (!raw) return [];

    try {
        const normalized = raw.replaceAll("'", '"');
        const parsed = JSON.parse(normalized);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(pair => {
                if (!Array.isArray(pair) || pair.length < 2) return null;
                const meanings = Array.isArray(pair[0]) ? pair[0] : [pair[0]];
                const sounds = Array.isArray(pair[1]) ? pair[1] : [pair[1]];
                return {
                    meanings: meanings.map(v => String(v || "").trim()).filter(Boolean),
                    sounds: sounds.map(v => String(v || "").trim()).filter(Boolean)
                };
            })
            .filter(Boolean);
    } catch (error) {
        return [];
    }
}

function parseCSVLine(line) {
    const result = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
            if (quoted && line[i + 1] === '"') {
                field += '"';
                i += 1;
            } else {
                quoted = !quoted;
            }
            continue;
        }
        if (char === "," && !quoted) {
            result.push(field);
            field = "";
            continue;
        }
        field += char;
    }

    result.push(field);
    return result;
}

function parseHanjaCSV(text) {
    const lines = String(text || "")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter(line => line.trim());

    if (lines.length <= 1) return [];

    const rows = [];

    for (let i = 1; i < lines.length; i += 1) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < 7) continue;

        const sourceLevel = String(columns[1] || "").trim();
        const char = String(columns[2] || "").trim();
        const meaningPairs = parseHanjaMeaning(columns[3]);
        const mainSound = String(columns[0] || "").trim();

        if (!char || !sourceLevel) continue;

        const displayLevel = mapSourceLevelToDisplay(sourceLevel);
        if (!displayLevel) continue;

        const flatMeanings = [];
        const hunAnswers = [];
        const eumAnswers = [];

        meaningPairs.forEach(pair => {
            pair.meanings.forEach(value => {
                if (!flatMeanings.includes(value)) flatMeanings.push(value);
                if (!hunAnswers.includes(value)) hunAnswers.push(value);
            });
            pair.sounds.forEach(value => {
                if (!eumAnswers.includes(value)) eumAnswers.push(value);
            });
        });

        const hun = hunAnswers[0] || "";
        const eum = eumAnswers.length
            ? eumAnswers.join(" · ")
            : mainSound;

        rows.push({
            id: `hanja_${char}`,
            char,
            hun,
            eum,
            hunAnswers,
            eumAnswers: eumAnswers.length ? eumAnswers : (mainSound ? [mainSound] : []),
            meaning: flatMeanings.join(", "),
            level: displayLevel,
            sourceLevel,
            radical: String(columns[4] || "").trim(),
            strokes: Number(columns[5]) || 0,
            totalStrokes: Number(columns[6]) || 0,
            pairs: meaningPairs
        });
    }

    return rows;
}

function buildHanjaIndexes(rows) {
    HANJA_DATA = rows;
    HANJA_DATA_MAP = new Map();
    HANJA_DATA_BY_LEVEL = new Map();

    for (const item of rows) {
        if (!HANJA_DATA_MAP.has(item.char)) {
            HANJA_DATA_MAP.set(item.char, item);
        }

        if (!HANJA_DATA_BY_LEVEL.has(item.level)) {
            HANJA_DATA_BY_LEVEL.set(item.level, []);
        }

        HANJA_DATA_BY_LEVEL.get(item.level).push(item);
    }
}

function getHanjaExactLevelData(level) {
    return [...(HANJA_DATA_BY_LEVEL.get(level) || [])];
}

function cumulativeHanjaData(level) {
    const targetIndex = HANJA_LEVEL_ORDER.indexOf(level);
    if (targetIndex < 0) return [];

    const seen = new Set();
    const result = [];

    for (let i = 0; i <= targetIndex; i += 1) {
        const currentLevel = HANJA_LEVEL_ORDER[i];
        for (const item of getHanjaExactLevelData(currentLevel)) {
            if (seen.has(item.char)) continue;
            seen.add(item.char);
            result.push(item);
        }
    }

    return result;
}

function cumulativeHanjaCharacters(level) {
    return cumulativeHanjaData(level);
}

function specialDataForLevel(level) {
    return cumulativeHanjaData(level);
}

function hanjaAvailable(level) {
    return HANJA_LEVEL_ORDER.includes(level) && HANJA_DATA.length > 0;
}

function getSpecialStars(level) {
    const index = HANJA_LEVEL_ORDER.indexOf(level);
    return "⭐".repeat(Math.max(1, Math.min(index + 1, 14)));
}

function getSelectedHanjaLevel() {
    return $("specialLevelList")?.querySelector(".selected")?.dataset.hanjaLevel || "8급";
}

function selectHanjaLevel(level) {
    const buttons = $("specialLevelList")?.querySelectorAll("[data-hanja-level]");
    let selectedButton = null;

    buttons?.forEach(button => {
        const selected = button.dataset.hanjaLevel === level;
        button.classList.toggle("selected", selected);
        if (selected) selectedButton = button;
    });

    if (!selectedButton || selectedButton.disabled) return;

    renderSpecialList();
    renderWordList();
}

function getHanjaLearningItems(level) {
    return cumulativeHanjaData(level);
}

function normalizeHanjaCharacter(value) {
    return String(value || "")
        .normalize("NFKC")
        .trim();
}

function getHanjaInfo(char) {
    const key = normalizeHanjaCharacter(char);
    const item = HANJA_DATA_MAP.get(key);

    if (!item) {
        return {
            hun: "",
            eum: "",
            meaning: "",
            hunAnswers: [],
            eumAnswers: [],
            pairs: []
        };
    }

    return {
        hun: item.hun,
        eum: item.eum,
        meaning: item.meaning,
        hunAnswers: [...item.hunAnswers],
        eumAnswers: [...item.eumAnswers],
        pairs: item.pairs || []
    };
}

async function loadHanjaDictionary() {
    return loadHanjaData();
}

async function loadHanjaData() {
    if (HANJA_DATA.length) return HANJA_DATA;
    if (hanjaDataPromise) return hanjaDataPromise;

    hanjaDataPromise = (async () => {
        const cached = localStorage.getItem(HANJA_CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length) {
                    buildHanjaIndexes(parsed);
                    return HANJA_DATA;
                }
            } catch (error) {
                console.warn("한자 데이터 캐시 읽기 실패:", error);
            }
        }

        let lastError = null;
        const urls = [HANJA_DATA_URL, HANJA_DATA_FALLBACK_URL];

        for (const url of urls) {
            try {
                const response = await fetch(url, {
                    cache: "force-cache"
                });

                if (!response.ok) {
                    throw new Error(`한자 데이터 HTTP ${response.status}`);
                }

                const csv = await response.text();
                const rows = parseHanjaCSV(csv);

                if (rows.length < 5000) {
                    throw new Error(`한자 데이터가 불완전합니다: ${rows.length}자`);
                }

                buildHanjaIndexes(rows);
                localStorage.setItem(HANJA_CACHE_KEY, JSON.stringify(HANJA_DATA));
                return HANJA_DATA;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error("한자 데이터를 불러오지 못했습니다.");
    })();

    try {
        return await hanjaDataPromise;
    } finally {
        hanjaDataPromise = null;
    }
}

function renderSpecialWorkbookPanel() {
    const workbook = getCurrentWorkbook();
    const panel = $("specialWorkbookPanel");
    const normal = $("normalWordInputCard");

    if (!panel || !normal || !workbook) return;

    const mode = getWorkbookMode(workbook);
    panel.classList.toggle("hidden", mode === "normal");
    normal.classList.toggle("hidden", mode !== "normal");

    if (mode !== "hanja") return;

    $("specialWorkbookTitle").textContent = "🀄 한자 학습";
    $("specialWorkbookDescription").textContent = "한자능력시험검정 5,978자를 급수별로 학습합니다.";
    $("specialLevelArea").classList.remove("hidden");
    $("specialSearchArea").classList.remove("hidden");
    $("specialJapaneseInfo").classList.add("hidden");
    $("specialSearch").placeholder = "한자·훈·음·뜻 검색";

    const selected = getSelectedHanjaLevel();
    $("specialLevelList").innerHTML = HANJA_LEVEL_ORDER.map(level => {
        const isSelected = level === selected;
        const count = HANJA_LEVEL_COUNTS[level] || 0;
        return `<button type="button" class="special-level-button ${isSelected ? "selected" : ""}" data-hanja-level="${escapeHTML(level)}"><strong>${escapeHTML(level)}</strong><small>${count.toLocaleString("ko-KR")}자</small></button>`;
    }).join("");

    renderSpecialList();
    renderWordList();

    loadHanjaData()
        .then(() => {
            renderSpecialList();
            renderWordList();
        })
        .catch(() => {
            renderSpecialList();
            showToast("한자 데이터를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.", "error");
        });
}

function renderSpecialList() {
    const workbook = getCurrentWorkbook();
    if (!workbook || getWorkbookMode(workbook) !== "hanja") return;

    const query = normalizeSearch($("specialSearch")?.value || "");
    const level = getSelectedHanjaLevel();
    let data = specialDataForLevel(level);

    if (query) {
        data = data.filter(item => {
            const info = getHanjaInfo(item.char);
            return normalizeSearch(item.char).includes(query)
                || normalizeSearch(info.hun).includes(query)
                || normalizeSearch(info.eum).includes(query)
                || normalizeSearch(info.meaning).includes(query);
        });
    }

    const specialListTitle = $("specialListTitle");
    if (specialListTitle) {
        specialListTitle.textContent = `${level} 학습 목록`;
    }

    $("specialList").innerHTML = data.length
        ? data.map(item => {
            const info = getHanjaInfo(item.char);
            return `<div class="special-item">
                <strong>${escapeHTML(item.char)}</strong>
                <span>훈: ${escapeHTML(info.hun || "-")}</span>
                <span>음: ${escapeHTML(info.eum || "-")}</span>
                <span>뜻: ${escapeHTML(info.meaning || info.hun || "-")}</span>
            </div>`;
        }).join("")
        : '<div class="empty">선택한 조건에 맞는 한자가 없습니다.</div>';
}

async function openSpecialTestMenu() {
    const workbook = getCurrentWorkbook();
    if (!workbook) return;

    if (getWorkbookMode(workbook) === "normal") {
        return startWorkbookTest();
    }

    try {
        await loadHanjaData();
    } catch {
        showToast("한자 데이터를 불러오지 못했습니다.", "error");
        return;
    }

    const level = getSelectedHanjaLevel();
    const data = specialDataForLevel(level);
    if (!data.length) {
        showToast("선택한 급수의 한자가 없습니다.", "error");
        return;
    }

    openModal("한자 테스트", `<div class="test-menu">
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','mixed')">
            <strong>📝 전체 테스트</strong>
            <span>한자 → 훈 / 한자 → 음 / 훈 → 한자 / 음 → 한자를 섞어서 출제합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.hun} · ${HANJA_TEST_EXAMPLES.eum}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hanja-hun')">
            <strong>한자 → 훈</strong>
            <span>한자를 보고 훈을 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.hun}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hanja-eum')">
            <strong>한자 → 음</strong>
            <span>한자를 보고 음을 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.eum}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hun-hanja')">
            <strong>훈 → 한자</strong>
            <span>훈을 보고 한자를 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.hunToChar}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','eum-hanja')">
            <strong>음 → 한자</strong>
            <span>음을 보고 한자를 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.eumToChar}</small>
        </button>
    </div>`);
}

function shuffleArray(arr){
    return [...arr].sort(() => Math.random() - 0.5);
}

function makeSpecialQuestion(item, direction){
    const info = getHanjaInfo(item.char);
    const q = {
        ...item,
        specialMode: "hanja",
        direction,
        wordId: null,
        workbookId: null,
        fileId: null,
        answers: [],
        file: { name: "한자" },
        hun: info.hun,
        eum: info.eum
    };

    if (direction === "hanja-hun") {
        q.question = item.char;
        q.answers = info.hunAnswers.length ? [...info.hunAnswers] : (info.hun ? [info.hun] : []);
        q.label = "한자 → 훈독";
    } else if (direction === "hanja-eum") {
        q.question = item.char;
        q.answers = info.eumAnswers.length ? [...info.eumAnswers] : (info.eum ? [info.eum] : []);
        q.label = "한자 → 음독";
    } else if (direction === "hun-hanja") {
        q.question = info.hun;
        q.answers = [item.char];
        q.label = "훈독 → 한자";
    } else if (direction === "eum-hanja") {
        q.question = info.eumAnswers[0] || info.eum;
        q.answers = [item.char];
        q.label = "음독 → 한자";
    }

    return q;
}

async function startSpecialHanjaTest(level, type = "mixed"){
    const workbook = getCurrentWorkbook();
    if (!workbook) return;

    try {
        await loadHanjaData();
    } catch {
        showToast("한자 데이터를 불러오지 못했습니다.", "error");
        return;
    }

    const data = shuffleArray(specialDataForLevel(level));
    if (!data.length) {
        showToast("해당 급수의 한자 데이터가 없습니다.", "error");
        return;
    }

    const directions = ["hanja-hun", "hanja-eum", "hun-hanja", "eum-hanja"];
    const questions = data
        .map(item => makeSpecialQuestion(
            item,
            type === "mixed"
                ? directions[Math.floor(Math.random() * directions.length)]
                : type
        ))
        .filter(question => question.answers.length > 0 && question.question);

    if (!questions.length) {
        showToast("훈·음 데이터를 찾을 수 없습니다.", "error");
        return;
    }

    startTest(
        questions,
        `한자 ${level} 테스트`,
        "special-hanja",
        currentFileId,
        currentWorkbookId,
        "workbook"
    );
}

/* =========================================================
   한자 목록 페이지
   ========================================================= */

function openHanjaListPage() {
    currentHanjaListMode = "level";
    hanjaListSelectedLevel = getSelectedHanjaLevel();
    showPage("hanjaList");
    renderHanjaListPage();
}

function renderHanjaListPage() {
    const list = $("hanjaList");
    const levelList = $("hanjaListLevelList");
    const search = normalizeSearch($("hanjaListSearch")?.value || "");
    if (!list || !levelList) return;

    levelList.innerHTML = HANJA_LEVEL_ORDER.map(level => {
        const selected = currentHanjaListMode === "level" && level === hanjaListSelectedLevel;
        return `<button type="button" class="hanja-list-level-button ${selected ? "selected" : ""}" data-hanja-list-level="${escapeHTML(level)}">
            <strong>${escapeHTML(level)}</strong>
            <small>${(HANJA_LEVEL_COUNTS[level] || 0).toLocaleString("ko-KR")}자</small>
        </button>`;
    }).join("");

    $("hanjaListLevelArea")?.classList.toggle("hidden", currentHanjaListMode !== "level");
    const hanjaListModeLabel = $("hanjaListModeLabel");
    const hanjaListTitle = $("hanjaListTitle");
    if (hanjaListModeLabel) {
        hanjaListModeLabel.textContent = currentHanjaListMode === "level" ? "급수별 한자 보기" : "전체 한자 보기";
    }
    if (hanjaListTitle) {
        hanjaListTitle.textContent = currentHanjaListMode === "level"
            ? `${hanjaListSelectedLevel} 한자 목록`
            : "전체 한자 목록";
    }

    const render = rows => {
        let data = rows;

        if (search) {
            data = data.filter(item => {
                const info = getHanjaInfo(item.char);
                return normalizeSearch(item.char).includes(search)
                    || normalizeSearch(info.hun).includes(search)
                    || normalizeSearch(info.eum).includes(search)
                    || normalizeSearch(info.meaning).includes(search);
            });
        }

        list.innerHTML = data.length
            ? data.map((item, index) => {
                const info = getHanjaInfo(item.char);
                return `<article class="hanja-list-card">
                    <div class="hanja-list-number">${index + 1}</div>
                    <div class="hanja-list-character">${escapeHTML(item.char)}</div>
                    <div class="hanja-list-info">
                        <div><strong>훈</strong><span>${escapeHTML(info.hun || "-")}</span></div>
                        <div><strong>음</strong><span>${escapeHTML(info.eum || "-")}</span></div>
                        <div><strong>뜻</strong><span>${escapeHTML(info.meaning || info.hun || "-")}</span></div>
                    </div>
                    <span class="hanja-list-level">${escapeHTML(item.level)}</span>
                </article>`;
            }).join("")
            : '<div class="hanja-list-empty">표시할 한자가 없습니다.</div>';
    };

    if (!HANJA_DATA.length) {
        list.innerHTML = '<div class="hanja-list-empty">한자 데이터를 불러오는 중...</div>';
        loadHanjaData()
            .then(renderHanjaListPage)
            .catch(() => {
                list.innerHTML = '<div class="hanja-list-empty">한자 데이터를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.</div>';
            });
        return;
    }

    const rows = currentHanjaListMode === "level"
        ? cumulativeHanjaData(hanjaListSelectedLevel)
        : [...HANJA_DATA];

    render(rows);
}

function setupHanjaListEvents() {
    document.addEventListener("click", event => {
        const modeButton = event.target.closest("[data-hanja-list-mode]");
        if (modeButton) {
            currentHanjaListMode = modeButton.dataset.hanjaListMode;
            document.querySelectorAll("[data-hanja-list-mode]").forEach(button => {
                button.classList.toggle("active", button.dataset.hanjaListMode === currentHanjaListMode);
            });
            renderHanjaListPage();
            return;
        }

        const levelButton = event.target.closest("[data-hanja-list-level]");
        if (levelButton) {
            hanjaListSelectedLevel = levelButton.dataset.hanjaListLevel;
            currentHanjaListMode = "level";
            renderHanjaListPage();
        }
    });

    $("hanjaListSearch")?.addEventListener("input", renderHanjaListPage);
}

function getWorkbookMode(workbook) {
    const name = String(workbook?.name || "");
    if (name.includes("한자")) return "hanja";
    return "normal";
}

const JAPANESE_DATA = [
    ["日","にち・じつ","ひ・か"],["月","げつ・がつ","つき"],["火","か","ひ"],["水","すい","みず"],["木","もく","き"],
    ["金","きん","かね"],["土","ど","つち"],["山","さん","やま"],["川","せん","かわ"],["人","じん・にん","ひと"],
    ["大","だい・たい","おお"],["小","しょう","ちい・こ"],["中","ちゅう","なか"],["上","じょう・しょう","うえ・あ"],["下","か・げ","した・さ"],
    ["入","にゅう","い・はい"],["出","しゅつ","で・だ"],["見","けん","み"],["行","こう・ぎょう","い・おこな"],["来","らい","く"],
    ["食","しょく","た・く"],["飲","いん","の"],["学","がく","まな"],["生","せい・しょう","い・う・なま"],["先","せん","さき"],
    ["名","めい・みょう","な"],["女","じょ・にょ","おんな"],["男","だん・なん","おとこ"],["子","し・す","こ"],["友","ゆう","とも"]
].map(([char,on,kun],i)=>({id:`japanese_${i+1}`,char,on,kun}));

function injectHanjaHandwritingStyles(){
    if(document.getElementById("hanjaHandwritingStyles")) return;

    const style=document.createElement("style");
    style.id="hanjaHandwritingStyles";
    style.textContent=`
        .hanja-writing-area{
            margin-top:16px;
            padding:16px;
            border:1px solid var(--border);
            border-radius:16px;
            background:var(--surface-2);
            text-align:left;
        }
        .hanja-writing-title{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin-bottom:10px;
        }
        .hanja-writing-title strong{font-size:15px}
        .hanja-writing-title span{font-size:12px;color:var(--text-light)}
        .hanja-writing-canvas-wrap{
            display:flex;
            justify-content:center;
            margin:10px 0;
        }
        #hanjaWritingCanvas{
            width:min(100%,280px);
            height:auto;
            aspect-ratio:1;
            border:2px dashed var(--border);
            border-radius:14px;
            background:#fff;
            touch-action:none;
            cursor:crosshair;
        }
        .hanja-writing-actions{
            display:flex;
            flex-wrap:wrap;
            gap:8px;
        }
        .hanja-writing-actions button{
            border:0;
            border-radius:10px;
            padding:9px 12px;
            background:var(--surface);
            color:var(--text);
            cursor:pointer;
            font-weight:700;
        }
        .hanja-writing-actions button.primary{
            background:var(--primary);
            color:#fff;
        }
        .hanja-candidate-title{
            margin:14px 0 8px;
            font-size:12px;
            color:var(--text-light);
        }
        .hanja-candidate-list{
            display:grid;
            grid-template-columns:repeat(8,minmax(0,1fr));
            gap:6px;
        }
        .hanja-candidate-button{
            min-height:48px;
            border:1px solid var(--border);
            background:var(--surface);
            color:var(--text);
            border-radius:10px;
            font-size:25px;
            font-weight:800;
            cursor:pointer;
        }
        .hanja-candidate-button:hover,
        .hanja-candidate-button.selected{
            border-color:var(--primary);
            background:var(--primary-light);
            color:var(--primary);
        }
        .hanja-selected-answer{
            margin-top:10px;
            min-height:34px;
            color:var(--text-light);
            font-size:13px;
        }
        .hanja-selected-answer strong{
            color:var(--primary);
            font-size:21px;
        }
        .hanja-writing-status{
            min-height:18px;
            margin-top:8px;
            color:var(--text-light);
            font-size:12px;
        }
        body.dark-mode #hanjaWritingCanvas{background:#fff;color:#111}
        @media(max-width:600px){
            .hanja-candidate-list{grid-template-columns:repeat(5,minmax(0,1fr))}
        }
    `;
    document.head.appendChild(style);
}

function loadHanjaHandwritingScript(src){
    return new Promise((resolve,reject)=>{
        const existing=document.querySelector(`script[data-hanja-script="${src}"]`);
        if(existing){
            if(existing.dataset.loaded==="true") return resolve();
            existing.addEventListener("load",()=>resolve(),{once:true});
            existing.addEventListener("error",()=>reject(new Error("필기 라이브러리 로드 실패")),{once:true});
            return;
        }

        const script=document.createElement("script");
        script.src=src;
        script.async=true;
        script.dataset.hanjaScript=src;
        script.addEventListener("load",()=>{
            script.dataset.loaded="true";
            resolve();
        },{once:true});
        script.addEventListener("error",()=>reject(new Error("필기 라이브러리 로드 실패")),{once:true});
        document.head.appendChild(script);
    });
}

async function ensureHanjaHandwritingReady(){
    if(hanjaHandwritingReadyPromise) return hanjaHandwritingReadyPromise;

    hanjaHandwritingReadyPromise=(async()=>{
        await loadHanjaHandwritingScript(HANJA_HANDWRITING_SCRIPT_URL);

        if(!window.KanjiCanvas){
            throw new Error("KanjiCanvas를 찾을 수 없습니다.");
        }

        await loadHanjaHandwritingScript(HANJA_HANDWRITING_PATTERNS_URL);
        return true;
    })().catch(error=>{
        hanjaHandwritingReadyPromise=null;
        throw error;
    });

    return hanjaHandwritingReadyPromise;
}

async function initializeHanjaWritingCanvas(){
    const canvas=document.getElementById("hanjaWritingCanvas");
    if(!canvas) return false;

    try{
        await ensureHanjaHandwritingReady();
        window.KanjiCanvas.init("hanjaWritingCanvas");
        return true;
    }catch(error){
        console.error("한자 필기 입력 초기화 실패:",error);
        const status=document.getElementById("hanjaWritingStatus");
        if(status) status.textContent="필기 인식을 불러오지 못했습니다. 키보드 입력을 사용할 수 있습니다.";
        return false;
    }
}

function clearHanjaDrawing(){
    try{
        if(window.KanjiCanvas) window.KanjiCanvas.erase("hanjaWritingCanvas");
    }catch(error){
        console.warn("한자 필기 지우기 실패:",error);
    }

    const list=document.getElementById("hanjaCandidateList");
    if(list) list.innerHTML="";

    const selected=document.getElementById("hanjaSelectedAnswer");
    if(selected) selected.innerHTML="";

    const input=$("testAnswerInput");
    if(input) input.value="";

    const status=document.getElementById("hanjaWritingStatus");
    if(status) status.textContent="한자를 그린 뒤 인식 버튼을 눌러주세요.";

    updateHanjaWritingSubmitState();
}

function undoHanjaStroke(){
    try{
        if(window.KanjiCanvas) window.KanjiCanvas.deleteLast("hanjaWritingCanvas");
    }catch(error){
        console.warn("한자 한 획 지우기 실패:",error);
    }

    const list=document.getElementById("hanjaCandidateList");
    if(list) list.innerHTML="";

    const selected=document.getElementById("hanjaSelectedAnswer");
    if(selected) selected.innerHTML="";

    const input=$("testAnswerInput");
    if(input) input.value="";
    updateHanjaWritingSubmitState();
}

function selectHanjaCandidate(character){
    const buttons=document.querySelectorAll(".hanja-candidate-button");
    buttons.forEach(button=>button.classList.toggle("selected",button.dataset.character===character));

    const input=$("testAnswerInput");
    if(input) input.value=character;

    const selected=document.getElementById("hanjaSelectedAnswer");
    if(selected) selected.innerHTML=`선택한 한자: <strong>${escapeHTML(character)}</strong>`;

    const status=document.getElementById("hanjaWritingStatus");
    if(status) status.textContent="선택했습니다. 아래 확인 버튼을 눌러 채점하세요.";

    updateHanjaWritingSubmitState();
}

function updateHanjaWritingSubmitState(){
    const submit=$("testSubmitButton");
    const input=$("testAnswerInput");
    if(submit && input){
        submit.disabled=!String(input.value||"").trim();
    }
}

async function recognizeHanjaDrawing(){
    const status=document.getElementById("hanjaWritingStatus");
    const list=document.getElementById("hanjaCandidateList");

    if(!window.KanjiCanvas){
        if(status) status.textContent="필기 인식기를 아직 불러오지 못했습니다.";
        return;
    }

    if(status) status.textContent="한자를 인식하는 중...";

    try{
        const raw=window.KanjiCanvas.recognize("hanjaWritingCanvas");
        const characters=Array.from(String(raw||""));
        const level=getSelectedHanjaLevel();
        const validSet=new Set(specialDataForLevel(level).map(item=>item.char));
        const prioritized=[
            ...characters.filter(char=>validSet.has(char)),
            ...characters.filter(char=>!validSet.has(char))
        ].filter((char,index,array)=>array.indexOf(char)===index).slice(0,8);

        if(!list) return;

        if(!prioritized.length){
            list.innerHTML="<span style='font-size:12px;color:var(--text-light)'>후보를 찾지 못했습니다. 다시 그려보세요.</span>";
            if(status) status.textContent="후보를 찾지 못했습니다.";
            return;
        }

        list.innerHTML=prioritized.map(char=>
            `<button type="button" class="hanja-candidate-button" data-character="${escapeHTML(char)}">${escapeHTML(char)}</button>`
        ).join("");

        list.querySelectorAll(".hanja-candidate-button").forEach(button=>{
            button.addEventListener("click",()=>selectHanjaCandidate(button.dataset.character));
        });

        if(status) status.textContent="후보를 선택하세요.";
    }catch(error){
        console.error("한자 필기 인식 실패:",error);
        if(status) status.textContent="인식에 실패했습니다. 다시 그려보거나 키보드 입력을 사용하세요.";
    }
}

function showHanjaKeyboardInput(){
    const input=$("testAnswerInput");
    const area=document.getElementById("hanjaWritingArea");
    if(area) area.classList.add("hidden");
    if(input){
        input.classList.remove("hidden");
        input.disabled=false;
        input.focus();
        updateHanjaWritingSubmitState();
    }
}

function showHanjaWritingInput(){
    const input=$("testAnswerInput");
    const area=document.getElementById("hanjaWritingArea");
    if(input) input.classList.add("hidden");
    if(area){
        area.classList.remove("hidden");
        initializeHanjaWritingCanvas();
    }
    updateHanjaWritingSubmitState();
}

function createHanjaWritingArea(){
    let area=document.getElementById("hanjaWritingArea");
    if(area) return area;

    const card=$("testAnswerInput")?.closest(".test-card");
    if(!card) return null;

    area=document.createElement("div");
    area.id="hanjaWritingArea";
    area.className="hanja-writing-area hidden";
    area.innerHTML=`
        <div class="hanja-writing-title">
            <strong>✍️ 한자 필기 입력</strong>
            <span>마우스·터치·펜으로 한자를 그려주세요.</span>
        </div>
        <div class="hanja-writing-canvas-wrap">
            <canvas id="hanjaWritingCanvas" width="256" height="256"></canvas>
        </div>
        <div class="hanja-writing-actions">
            <button type="button" id="hanjaUndoButton">↩ 한 획 지우기</button>
            <button type="button" id="hanjaClearButton">🗑 모두 지우기</button>
            <button type="button" id="hanjaRecognizeButton" class="primary">🔎 인식</button>
            <button type="button" id="hanjaKeyboardButton">⌨ 키보드 입력</button>
        </div>
        <div id="hanjaWritingStatus" class="hanja-writing-status">한자를 그린 뒤 인식 버튼을 눌러주세요.</div>
        <div class="hanja-candidate-title">인식 후보</div>
        <div id="hanjaCandidateList" class="hanja-candidate-list"></div>
        <div id="hanjaSelectedAnswer" class="hanja-selected-answer"></div>
    `;

    card.insertBefore(area,$("testSubmitButton"));

    $("hanjaUndoButton")?.addEventListener("click",undoHanjaStroke);
    $("hanjaClearButton")?.addEventListener("click",clearHanjaDrawing);
    $("hanjaRecognizeButton")?.addEventListener("click",recognizeHanjaDrawing);
    $("hanjaKeyboardButton")?.addEventListener("click",showHanjaKeyboardInput);

    return area;
}

function handleHanjaAnswerInputMode(question){
    const needsDrawing=question?.direction === "hun-hanja" || question?.direction === "eum-hanja";
    const area=createHanjaWritingArea();
    const input=$("testAnswerInput");

    if(!needsDrawing){
        area?.classList.add("hidden");
        input?.classList.remove("hidden");
        if(input) input.disabled=false;
        return;
    }

    showHanjaWritingInput();
}


function renderCurrentQuestion(){
    const q=testState.questions[testState.currentIndex];
    if(!q?.specialMode) return baseRenderCurrentQuestion();

    stopTimer();
    testState.answered=false;
    testState.timeLeft=Number(appData.testTime)||10;

    const number=$("testQuestionNumber");
    const total=$("testTotalQuestions");
    const timer=$("testTimer");
    const typeLabel=$("testTypeLabel");
    const question=$("testQuestion");
    const answerInput=$("testAnswerInput");
    const choiceArea=$("testChoiceArea");
    const feedback=$("testFeedback");

    if(number) number.textContent=String(testState.currentIndex+1);
    if(total) total.textContent=String(testState.questions.length);
    if(timer) timer.textContent=String(testState.timeLeft);
    if(typeLabel) typeLabel.textContent=q.label||"테스트";
    if(question) question.textContent=q.question||"";
    if(feedback){
        feedback.className="test-feedback hidden";
        feedback.textContent="";
        feedback.innerHTML="";
    }

    if(choiceArea){
        choiceArea.classList.toggle("hidden",!q.choiceOptions);
        choiceArea.innerHTML="";
    }

    if(q.choiceOptions){
        if(answerInput){
            answerInput.classList.add("hidden");
            answerInput.value="";
        }

        choiceArea.innerHTML=q.choiceOptions.map(option=>`
            <button type="button" class="test-choice-button">${escapeHTML(String(option))}</button>
        `).join("");

        choiceArea.querySelectorAll("button").forEach(button=>{
            button.addEventListener("click",()=>submitSpecialChoice(button.textContent||"",q));
        });

        document.getElementById("hanjaWritingArea")?.classList.add("hidden");
    }else{
        if(answerInput){
            answerInput.value="";
            answerInput.disabled=false;
        }

        if(q.direction === "hun-hanja" || q.direction === "eum-hanja"){
            clearHanjaDrawing();
        }

        handleHanjaAnswerInputMode(q);
    }

    const submit=$("testSubmitButton");
    if(submit){
        submit.textContent="확인";
        submit.disabled=!!(q.direction==="hun-hanja"||q.direction==="eum-hanja");
    }

    if(q.direction!=="hun-hanja" && q.direction!=="eum-hanja"){
        setTimeout(()=>answerInput?.focus(),50);
    }

    startTimer();
}

function submitSpecialChoice(userAnswer, question){
    if (testState.answered) {
        return nextQuestion();
    }

    if (!question) return;

    stopTimer();

    const isCorrect = checkAnswer(userAnswer, question);
    testState.answered = true;

    if (isCorrect) {
        testState.correct++;
    } else {
        testState.wrong++;
        testState.wrongQuestions.push(question);
    }

    updateWordStatistics(question, isCorrect);
    showAnswerFeedback(question, isCorrect, userAnswer, false);

    const choiceArea = $("testChoiceArea");
    choiceArea?.querySelectorAll("button").forEach(button => {
        button.disabled = true;
    });

    const submit = $("testSubmitButton");
    if (submit) {
        submit.textContent =
            testState.currentIndex === testState.questions.length - 1
                ? "결과 보기"
                : "다음 문제";
    }
}

function checkAnswer(userAnswer, question){
    if(!question?.specialMode){
        return baseCheckAnswer(userAnswer, question);
    }
    const raw = String(userAnswer || "").trim();
    return question.answers.some(
        answer => String(answer).trim().toLocaleLowerCase() === raw.toLocaleLowerCase()
    );
}

function showAnswerFeedback(question, isCorrect, userAnswer, timeOut){
    if(!question?.specialMode){
        return baseShowAnswerFeedback(question, isCorrect, userAnswer, timeOut);
    }
    const feedback = $("testFeedback");
    if(!feedback) return;
    feedback.classList.remove("hidden");
    const answer = question.answers.join(" / ");
    feedback.innerHTML = isCorrect
        ? `<div class="feedback-correct"><strong>⭕ 정답!</strong><span>${escapeHTML(answer)}</span></div>`
        : `<div class="feedback-wrong"><strong>❌ ${timeOut ? "시간 초과!" : "오답!"}</strong>${userAnswer ? `<span>입력한 답: ${escapeHTML(userAnswer)}</span>` : "<span>입력한 답이 없습니다.</span>"}<span>정답: <strong>${escapeHTML(answer)}</strong></span></div>`;
}

function finishTest(){
    stopTimer();
    document.getElementById("hanjaWritingArea")?.classList.add("hidden");
    return baseFinishTest();
}

function setupSpecialPanelEvents(){
    document.addEventListener("click", event => {
        const levelButton = event.target.closest("[data-hanja-level]");
        if (levelButton) {
            event.preventDefault();
            event.stopPropagation();
            selectHanjaLevel(levelButton.dataset.hanjaLevel);
            return;
        }

        const workbookButton = event.target.closest("[data-open-workbook]");
        if (workbookButton) {
            event.preventDefault();
            event.stopPropagation();
            openWorkbook(currentFileId, workbookButton.dataset.openWorkbook);
        }
    }, { capture: false });

    $("specialSearch")?.addEventListener("input", renderSpecialList);
    $("specialTestButton")?.addEventListener("click", openSpecialTestMenu);
    $("hanjaListButton")?.addEventListener("click", openHanjaListPage);
    $("hanjaListBackButton")?.addEventListener("click", () => showWorkbookPage(currentFileId, currentWorkbookId));
}

/* =========================================================
   버튼
   ========================================================= */

function setupButtons() {

    const on = (id, event, handler) => {

        const el = $(id);

        if (!el) {
            return;
        }

        el.addEventListener(
            event,
            handler
        );
    };


    on(
        "addFileButton",
        "click",
        addFile
    );


    on(
        "emptyAddFileButton",
        "click",
        addFile
    );


    on(
        "backToHomeButton",
        "click",
        goBackToHome
    );


    on(
        "addWorkbookButton",
        "click",
        addWorkbook
    );


    on(
        "emptyAddWorkbookButton",
        "click",
        addWorkbook
    );


    on(
        "backToFileButton",
        "click",
        goBackToFile
    );


    on(
        "addWordButton",
        "click",
        startWorkbookTest
    );


    on(
        "bulkAddWordButton",
        "click",
        addBulkWords
    );


    on(
        "fileTestButton",
        "click",
        openTotalTestMenu
    );


    on(
        "testSubmitButton",
        "click",
        () => submitAnswer(false)
    );


    on(
        "testBackButton",
        "click",
        leaveTest
    );


    on(
        "resultHomeButton",
        "click",
        goToResultHome
    );


    on(
        "resultBackButton",
        "click",
        goToResultBack
    );


    on(
        "retryWrongButton",
        "click",
        retryWrongQuestions
    );


    on(
        "darkModeToggle",
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


    on(
        "headerThemeButton",
        "click",
        toggleTheme
    );


    on(
        "testTimeSelect",
        "change",
        event => changeTestTime(
            event.target.value
        )
    );


    on(
        "exportDataButton",
        "click",
        exportData
    );


    on(
        "importDataButton",
        "click",
        importData
    );


    on(
        "importFileInput",
        "change",
        handleImportFile
    );


    on(
        "usageGuideButton",
        "click",
        toggleUsageGuide
    );


    on(
        "modalCloseButton",
        "click",
        closeModal
    );


    on(
        "modalOverlay",
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


    on(
        "mobileMenuButton",
        "click",
        openSidebar
    );


    on(
        "headerHomeButton",
        "click",
        showHomePage
    );

    setupHanjaListEvents();

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

let __WORD_MEMORIZE_APP_INITIALIZED__ = false;

function initializeApp() {

    if (__WORD_MEMORIZE_APP_INITIALIZED__) {
        return;
    }

    __WORD_MEMORIZE_APP_INITIALIZED__ = true;

    try {
        applyTheme();
    } catch (error) {
        console.error("테마 초기화 실패:", error);
    }

    try {
        applyTestTimeUI();
    } catch (error) {
        console.error("테스트 시간 초기화 실패:", error);
    }

    try {
        renderUsageGuide();
    } catch (error) {
        console.error("사용 방법 초기화 실패:", error);
    }

    const appVersion = $("appVersion");
    if (appVersion) {
        appVersion.textContent = APP_VERSION;
    }

    try {
        setupNavigation();
    } catch (error) {
        console.error("네비게이션 초기화 실패:", error);
    }

    try {
        setupButtons();
    } catch (error) {
        console.error("버튼 초기화 실패:", error);
    }

    try {
        setupKeyboardEvents();
    } catch (error) {
        console.error("키보드 초기화 실패:", error);
    }

    try {
        setupSpecialPanelEvents();
    } catch (error) {
        console.error("특수 학습 초기화 실패:", error);
    }

    try {
        renderFileList();
        showHomePage();
    } catch (error) {
        console.error("화면 초기화 실패:", error);
    }

    registerServiceWorker();

    console.log(
        `단어 암기장이 시작되었습니다. v${APP_VERSION} / 클릭 수정본`
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
window.startSpecialHanjaTest=startSpecialHanjaTest;
window.openSpecialTestMenu=openSpecialTestMenu;
window.selectHanjaLevel=selectHanjaLevel;


/* 한자 필기 입력의 키보드 전환 상태 */
document.addEventListener("input",event=>{
    if(event.target?.id==="testAnswerInput") updateHanjaWritingSubmitState();
});
