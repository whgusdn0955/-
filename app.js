"use strict";

/* =========================================================
   단어 암기장
   앱 버전
   ========================================================= */

const APP_VERSION = "3.4.5";

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

const HANJA_LEVEL_ORDER = [
    "8급", "7급", "6급", "준5급", "5급", "준4급", "4급", "준3급", "3급",
    "준2급", "2급", "준1급", "1급", "사범", "대사범"
];

const HANJA_LEVEL_COUNTS = {
    "8급": 30,
    "7급": 50,
    "6급": 70,
    "준5급": 100,
    "5급": 250,
    "준4급": 400,
    "4급": 600,
    "준3급": 800,
    "3급": 1000,
    "준2급": 1500,
    "2급": 2000,
    "준1급": 2500,
    "1급": 3500,
    "사범": 5000,
    "대사범": 5000
};

/* 업로드된 대한검정회 선정한자 PDF에서 직접 추출한 급수별 신출 한자 */
const HANJA_LEVEL_NEW = {
    "8급": ["九", "金", "南", "男", "女", "東", "六", "母", "木", "門", "父", "北", "四", "三", "西", "水", "十", "五", "月", "二", "人", "日", "一", "子", "弟", "七", "土", "八", "兄", "火"],
    "7급": ["江", "口", "內", "年", "大", "目", "白", "山", "上", "小", "手", "外", "右", "入", "足", "左", "中", "靑", "出", "下"],
    "6급": ["犬", "己", "林", "馬", "名", "百", "生", "石", "先", "姓", "心", "羊", "魚", "玉", "牛", "耳", "地", "千", "天", "川"],
    "준5급": ["車", "巾", "古", "工", "今", "同", "力", "立", "末", "文", "方", "本", "夫", "不", "士", "夕", "世", "少", "食", "央", "王", "位", "衣", "字", "自", "正", "主", "寸", "向", "休"],
    "5급": ["歌", "家", "各", "間", "强", "開", "去", "見", "京", "計", "高", "功", "空", "共", "科", "光", "敎", "交", "校", "區", "國", "軍", "近", "急", "旗", "記", "氣", "農", "多", "短", "答", "當", "對", "代", "道", "刀", "讀", "冬", "洞", "頭", "等", "登", "樂", "來", "老", "理", "里", "利", "萬", "每", "面", "命", "明", "毛", "無", "聞", "問", "物", "米", "民", "班", "半", "放", "番", "別", "步", "部", "分", "社", "事", "死", "色", "書", "線", "性", "成", "所", "首", "詩", "時", "示", "市", "植", "神", "身", "信", "新", "室", "安", "夜", "弱", "語", "言", "永", "英", "午", "用", "友", "原", "遠", "元", "有", "肉", "育", "銀", "音", "邑", "意", "作", "長", "場", "才", "田", "電", "前", "全", "朝", "祖", "晝", "住", "竹", "重", "直", "草", "村", "秋", "春", "親", "太", "通", "貝", "便", "平", "夏", "學", "韓", "漢", "合", "海", "行", "血", "形", "花", "話", "和", "活", "黃", "會", "孝", "後"],
    "준4급": ["加", "可", "角", "感", "客", "格", "決", "結", "輕", "敬", "界", "考", "告", "苦", "曲", "公", "果", "過", "球", "郡", "貴", "根", "級", "吉", "能", "堂", "待", "德", "度", "圖", "童", "動", "落", "良", "歷", "例", "禮", "路", "勞", "綠", "流", "李", "亡", "買", "賣", "美", "朴", "反", "發", "法", "兵", "病", "福", "服", "奉", "冰", "仕", "史", "思", "使", "算", "相", "席", "雪", "省", "洗", "消", "速", "孫", "樹", "數", "宿", "順", "術", "習", "勝", "始", "式", "臣", "實", "失", "兒", "愛", "野", "藥", "陽", "洋", "漁", "億", "業", "如", "然", "溫", "要", "勇", "雲", "運", "院", "園", "油", "由", "飮", "醫", "以", "因", "任", "者", "昨", "章", "再", "在", "材", "的", "赤", "典", "展", "戰", "定", "庭", "第", "題", "族", "卒", "州", "注", "止", "知", "紙", "集", "參", "窓", "責", "淸", "體", "初", "充", "特", "表", "品", "風", "必", "河", "幸", "現", "號", "化", "畫", "訓", "凶", "黑"],
    "4급": ["價", "甘", "減", "監", "改", "個", "擧", "件", "建", "健", "競", "景", "季", "故", "固", "骨", "課", "觀", "關", "廣", "橋", "久", "求", "救", "舊", "具", "局", "君", "規", "極", "給", "其", "基", "器", "技", "汽", "期", "念", "團", "端", "壇", "談", "到", "都", "島", "獨", "朗", "冷", "兩", "量", "旅", "練", "領", "令", "料", "類", "陸", "律", "望", "妹", "牧", "武", "未", "味", "倍", "變", "報", "婦", "富", "備", "比", "鼻", "費", "貧", "謝", "師", "査", "寫", "産", "賞", "商", "常", "序", "仙", "選", "鮮", "船", "善", "說", "星", "聖", "盛", "聲", "城", "誠", "歲", "勢", "束", "送", "授", "守", "是", "視", "試", "識", "氏", "惡", "眼", "案", "暗", "約", "養", "餘", "熱", "葉", "藝", "屋", "完", "往", "曜", "浴", "雨", "雄", "願", "爲", "偉", "恩", "義", "移", "姊", "將", "財", "災", "爭", "低", "貯", "敵", "傳", "切", "節", "店", "情", "停", "精", "政", "祭", "鳥", "助", "早", "調", "操", "存", "終", "種", "坐", "罪", "週", "增", "志", "至", "支", "進", "眞", "質", "次", "着", "察", "唱", "處", "鐵", "最", "祝", "蟲", "忠", "齒", "致", "則", "他", "打", "卓", "炭", "宅", "統", "退", "波", "板", "敗", "筆", "寒", "限", "香", "害", "許", "協", "惠", "好", "湖", "患", "回", "效"],
    "준3급": ["街", "佳", "假", "干", "看", "甲", "康", "講", "降", "更", "巨", "檢", "儉", "潔", "經", "警", "慶", "庚", "耕", "境", "戒", "癸", "溪", "繼", "庫", "谷", "官", "究", "句", "群", "弓", "權", "歸", "均", "禁", "及", "起", "暖", "難", "納", "乃", "怒", "努", "丹", "單", "斷", "達", "隊", "徒", "斗", "豆", "得", "燈", "略", "連", "烈", "列", "錄", "論", "倫", "莫", "滿", "忘", "卯", "妙", "戊", "務", "尾", "密", "飯", "房", "防", "訪", "背", "拜", "罰", "伐", "丙", "保", "寶", "復", "伏", "否", "佛", "飛", "悲", "非", "舍", "巳", "絲", "寺", "散", "殺", "狀", "想", "床", "舌", "細", "稅", "掃", "笑", "素", "續", "俗", "松", "愁", "收", "修", "受", "純", "戌", "拾", "承", "息", "申", "辛", "若", "與", "逆", "硏", "煙", "營", "榮", "誤", "謠", "容", "遇", "圓", "員", "危", "酉", "遺", "乳", "乙", "陰", "應", "依", "貳", "異", "益", "引", "印", "認", "寅", "壹", "壬", "壯", "適", "專", "絶", "點", "接", "丁", "井", "製", "除", "制", "兆", "造", "尊", "宗", "走", "朱", "衆", "持", "指", "職", "辰", "創", "冊", "聽", "請", "丑", "取", "治", "針", "快", "脫", "探", "討", "破", "判", "片", "布", "暴", "包", "票", "解", "亥", "鄕", "虛", "驗", "賢", "呼", "戶", "貨", "候", "吸", "興", "希"],
    "3급": ["脚", "渴", "敢", "皆", "居", "乾", "堅", "鏡", "驚", "階", "鷄", "孤", "穀", "困", "坤", "窮", "勸", "卷", "勤", "幾", "旣", "但", "段", "卵", "覽", "浪", "郞", "涼", "露", "留", "柳", "晩", "忙", "麥", "免", "勉", "眠", "鳴", "暮", "墓", "茂", "舞", "墨", "勿", "杯", "凡", "犯", "逢", "扶", "浮", "朋", "秘", "私", "射", "傷", "霜", "尙", "喪", "象", "暑", "昔", "惜", "設", "損", "須", "秀", "誰", "雖", "壽", "叔", "淑", "崇", "乘", "施", "深", "甚", "我", "顔", "巖", "仰", "哀", "也", "揚", "讓", "於", "憶", "嚴", "余", "汝", "亦", "域", "硯", "悅", "炎", "迎", "吾", "悟", "烏", "瓦", "臥", "曰", "欲", "于", "宇", "又", "尤", "憂", "云", "源", "怨", "威", "遊", "猶", "儒", "唯", "柔", "幼", "吟", "泣", "矣", "議", "易", "已", "而", "忍", "仁", "慈", "腸", "栽", "哉", "著", "積", "轉", "錢", "靜", "貞", "頂", "淨", "帝", "諸", "從", "鐘", "宙", "酒", "卽", "曾", "證", "只", "枝", "之", "智", "盡", "執", "且", "此", "借", "昌", "採", "菜", "妻", "尺", "泉", "淺", "晴", "招", "推", "追", "就", "吹", "層", "泰", "痛", "投", "篇", "閉", "抱", "楓", "豊", "皮", "彼", "疲", "匹", "賀", "何", "恨", "閑", "恒", "刑", "乎", "虎", "或", "混", "婚", "紅", "華", "歡", "皇", "厚", "胸", "喜"],
    "준2급": ["暇", "架", "覺", "刻", "却", "閣", "刊", "姦", "簡", "鑑", "綱", "鋼", "槪", "介", "蓋", "據", "拒", "距", "傑", "劍", "憩", "擊", "激", "遣", "缺", "兼", "傾", "卿", "硬", "竟", "系", "係", "械", "啓", "契", "稿", "姑", "枯", "孔", "攻", "供", "恭", "恐", "貢", "瓜", "戈", "管", "貫", "冠", "慣", "鑛", "怪", "壞", "較", "巧", "矯", "郊", "構", "拘", "苟", "屈", "宮", "券", "拳", "鬼", "龜", "菌", "劇", "克", "筋", "謹", "斤", "琴", "錦", "禽", "寄", "紀", "奇", "企", "機", "祈", "欺", "畿", "緊", "諾", "娘", "耐", "寧", "奴", "濃", "腦", "茶", "檀", "擔", "淡", "畓", "黨", "糖", "帶", "臺", "貸", "導", "逃", "跳", "盜", "途", "倒", "稻", "禱", "督", "毒", "敦", "豚", "突", "銅", "鈍", "羅", "絡", "亂", "蘭", "藍", "糧", "慮", "麗", "勵", "蓮", "聯", "鍊", "戀", "憐", "劣", "裂", "嶺", "零", "鹿", "弄", "雷", "了", "龍", "累", "樓", "輪", "栗", "陵", "吏", "履", "梨", "裏", "離", "隣", "臨", "麻", "妄", "梅", "脈", "孟", "盟", "盲", "冥", "銘", "慕", "模", "貌", "募", "某", "矛", "謀", "沐", "睦", "夢", "蒙", "廟", "苗", "貿", "黙", "微", "迷", "敏", "博", "薄", "拍", "返", "般", "髮", "妨", "芳", "邦", "配", "培", "排", "輩", "繁", "範", "汎", "壁", "邊", "辯", "辨", "竝", "普", "譜", "補", "卜", "複", "腹", "峰", "付", "府", "副", "負", "憤", "粉", "紛", "奮", "奔", "弗", "拂", "批", "碑", "妃", "婢", "卑", "肥", "賓", "司", "祀", "斯", "捨", "詞", "詐", "辭", "賜", "朔", "削", "森", "像", "償", "祥", "索", "徐", "庶", "恕", "署", "析", "釋", "宣", "涉", "昭", "訴", "蔬", "屬", "率", "頌", "訟", "誦", "刷", "衰", "帥", "囚", "殊", "遂", "需", "輸", "熟", "肅", "旬", "巡", "盾", "述", "濕", "襲", "侍", "矢", "飾", "愼", "審", "雙", "亞", "牙", "雅", "餓", "岸", "壓", "涯", "液", "額", "躍", "壤", "楊", "樣", "輿", "役", "驛", "沿", "演", "宴", "延", "緣", "鉛", "燃", "染", "鹽", "泳", "映", "銳", "豫", "汚", "遙", "辱", "慾", "優", "愚", "羽", "郵", "援", "越", "衛", "圍", "委", "慰", "胃", "悠", "裕", "誘", "維", "隱", "宜", "疑", "儀", "刃", "姻", "逸", "賃", "姿", "資", "雌", "殘", "潛", "雜", "丈", "張", "帳", "臟", "障", "裝", "獎", "底", "抵", "籍", "賊", "績", "跡", "蹟", "折", "占", "廷", "征", "亭", "訂", "整", "程", "堤", "濟", "際", "提", "齊", "條", "組", "潮", "照", "弔", "租", "拙", "佐", "座", "株", "周", "柱", "舟", "俊", "準", "遵", "症", "池", "誌", "織", "陳", "珍", "陣", "鎭", "姪", "秩", "差", "錯", "贊", "讚", "倉", "債", "策", "拓", "戚", "踐", "賤", "哲", "添", "尖", "廳", "妾", "替", "礎", "超", "促", "聰", "銃", "總", "蓄", "畜", "築", "縮", "趣", "醉", "側", "測", "値", "稚", "置", "恥", "侵", "寢", "沈", "浸", "稱", "妥", "濁", "濯", "彈", "歎", "奪", "貪", "塔", "湯", "怠", "態", "澤", "擇", "吐", "兎", "透", "鬪", "派", "播", "版", "販", "編", "評", "肺", "浦", "捕", "砲", "胞", "幅", "爆", "標", "避", "被", "畢", "荷", "割", "咸", "巷", "項", "港", "抗", "航", "核", "享", "響", "獻", "憲", "險", "革", "弦", "絃", "顯", "亨", "護", "昏", "弘", "禾", "禍", "確", "擴", "丸", "換", "環", "況", "灰", "悔", "劃", "揮"],
    "2급": ["幹", "懇", "肝", "諫", "葛", "憾", "剛", "慨", "坑", "乞", "揭", "隔", "肩", "牽", "絹", "訣", "謙", "頃", "徑", "炅", "桂", "繫", "顧", "雇", "鼓", "哭", "寡", "誇", "菓", "郭", "寬", "館", "狂", "卦", "掛", "塊", "愧", "傀", "絞", "僑", "狡", "膠", "丘", "驅", "俱", "鷗", "狗", "懼", "歐", "購", "菊", "窟", "圈", "厥", "闕", "軌", "閨", "叫", "糾", "僅", "槿", "肯", "棄", "忌", "騎", "豈", "飢", "那", "奈", "惱", "尿", "尼", "泥", "匿", "旦", "鍛", "潭", "膽", "踏", "唐", "垈", "戴", "渡", "陶", "挑", "桃", "悼", "塗", "篤", "凍", "桐", "棟", "屯", "謄", "騰", "藤", "洛", "欄", "爛", "濫", "廊", "掠", "梁", "諒", "曆", "煉", "廉", "獵", "靈", "齡", "爐", "虜", "祿", "籠", "賴", "僚", "療", "漏", "淚", "屢", "謬", "隆", "磨", "摩", "魔", "幕", "漠", "慢", "漫", "蠻", "灣", "娩", "罔", "茫", "網", "埋", "媒", "枚", "猛", "綿", "滅", "蔑", "侮", "沒", "霧", "紊", "眉", "憫", "蜜", "迫", "泊", "舶", "盤", "叛", "伴", "搬", "拔", "傍", "倣", "紡", "俳", "賠", "伯", "柏", "魄", "煩", "飜", "閥", "僻", "碧", "屛", "倂", "覆", "鳳", "封", "蜂", "俸", "縫", "腐", "簿", "膚", "賦", "符", "赴", "附", "墳", "崩", "匪", "頻", "聘", "沙", "斜", "似", "蛇", "邪", "唆", "赦", "飼", "酸", "傘", "蔘", "揷", "詳", "裳", "桑", "嘗", "箱", "塞", "緖", "敍", "瑞", "誓", "碩", "旋", "禪", "纖", "攝", "貰", "召", "燒", "蘇", "騷", "疏", "紹", "粟", "遜", "鎖", "洙", "隨", "獸", "睡", "垂", "搜", "孰", "循", "瞬", "殉", "脣", "舜", "升", "僧", "昇", "屍", "殖", "伸", "晨", "腎", "紳", "尋", "阿", "芽", "岳", "握", "鞍", "按", "雁", "晏", "謁", "癌", "押", "殃", "碍", "厄", "惹", "耶", "孃", "御", "抑", "焉", "予", "疫", "譯", "軟", "燕", "閱", "厭", "影", "詠", "譽", "預", "梧", "娛", "傲", "嗚", "獄", "翁", "緩", "歪", "畏", "搖", "腰", "妖", "堯", "庸", "鎔", "傭", "偶", "禹", "韻", "鬱", "苑", "僞", "緯", "違", "謂", "尉", "惟", "幽", "愈", "尹", "潤", "閏", "融", "淫", "凝", "夷", "伊", "翼", "姙", "刺", "紫", "恣", "磁", "玆", "諮", "酌", "爵", "暫", "蠶", "藏", "莊", "葬", "粧", "掌", "墻", "載", "裁", "宰", "摘", "寂", "笛", "滴", "殿", "竊", "漸", "蝶", "偵", "穽", "艇", "劑", "燥", "措", "釣", "彫", "縱", "洲", "奏", "珠", "駐", "鑄", "仲", "蒸", "贈", "憎", "遲", "旨", "脂", "振", "津", "診", "塵", "震", "疾", "輯", "懲", "徵", "遮", "捉", "札", "刹", "慘", "慙", "斬", "蒼", "暢", "滄", "彰", "彩", "悽", "斥", "遷", "薦", "徹", "撤", "諜", "逮", "遞", "滯", "締", "抄", "肖", "哨", "焦", "燭", "觸", "寵", "催", "抽", "趨", "醜", "逐", "軸", "蹴", "衝", "衷", "炊", "臭", "漆", "枕", "墮", "琢", "托", "託", "誕", "殆", "胎", "颱", "把", "罷", "頗", "覇", "偏", "遍", "坪", "廢", "弊", "幣", "蔽", "飽", "抛", "怖", "漂", "豹", "虐", "鶴", "旱", "汗", "翰", "含", "陷", "艦", "奚", "該", "軒", "玄", "縣", "懸", "穴", "嫌", "脅", "峽", "型", "衡", "螢", "兮", "慧", "浩", "互", "豪", "胡", "毫", "惑", "酷", "魂", "忽", "洪", "鴻", "靴", "穫", "還", "幻", "滑", "凰", "荒", "懷", "廻", "獲", "橫", "曉", "侯", "喉", "勳", "毁", "輝", "携", "痕", "熙", "稀", "戲", "噫"],
    "준1급": ["伽", "嘉", "柯", "軻", "賈", "迦", "殼", "珏", "墾", "奸", "杆", "竿", "艮", "艱", "鞨", "堪", "邯", "岬", "鉀", "姜", "彊", "疆", "岡", "腔", "慷", "价", "凱", "塏", "箇", "鍵", "桀", "劫", "甄", "儆", "璟", "瓊", "屆", "皐", "痼", "膏", "昆", "串", "款", "驕", "仇", "灸", "矩", "毆", "舅", "邱", "玖", "鳩", "鞠", "掘", "倦", "眷", "圭", "奎", "揆", "珪", "棘", "瑾", "兢", "矜", "冀", "岐", "棋", "琦", "琪", "璣", "箕", "耆", "騏", "麒", "沂", "驥", "拏", "溺", "湍", "撻", "遝", "塘", "袋", "燾", "濤", "萄", "惇", "燉", "頓", "乭", "董", "杜", "懶", "裸", "剌", "拉", "萊", "亮", "侶", "呂", "廬", "驪", "礪", "斂", "玲", "醴", "魯", "盧", "蘆", "鷺", "聾", "賂", "遼", "劉", "楞", "吝", "鱗", "麟", "粒", "痲", "寞", "膜", "瞞", "靺", "寐", "昧", "魅", "貊", "覓", "冕", "俛", "牟", "帽", "牡", "茅", "耗", "謨", "穆", "描", "昴", "巫", "毋", "汶", "彌", "悶", "旻", "旼", "玟", "珉", "閔", "縛", "磻", "潘", "鉢", "渤", "旁", "龐", "肪", "謗", "裵", "帛", "筏", "笵", "卞", "弁", "昺", "柄", "炳", "秉", "甫", "輔", "僕", "蓬", "剖", "訃", "阜", "賻", "釜", "傅", "敷", "噴", "忿", "焚", "盆", "芬", "鵬", "丕", "匕", "毘", "毖", "譬", "彬", "祠", "泗", "奢", "嗣", "徙", "撒", "庠", "嗇", "牲", "甥", "舒", "棲", "逝", "奭", "晳", "錫", "膳", "瑄", "璇", "璿", "繕", "卨", "薛", "陝", "蟾", "暹", "閃", "燮", "晟", "醒", "巢", "沼", "邵", "逍", "宋", "悚", "碎", "戍", "蒐", "粹", "羞", "繡", "酬", "銖", "隋", "塾", "洵", "淳", "珣", "筍", "荀", "瑟", "繩", "媤", "尸", "弑", "猜", "柴", "湜", "蝕", "軾", "娠", "迅", "瀋", "啞", "嶽", "斡", "閼", "庵", "鴨", "埃", "艾", "隘", "倻", "襄", "禦", "彦", "姸", "淵", "捐", "衍", "閻", "燁", "瑛", "盈", "瑩", "芮", "濊", "伍", "吳", "墺", "沃", "鈺", "邕", "雍", "擁", "甕", "訛", "莞", "旺", "汪", "倭", "夭", "姚", "耀", "溶", "瑢", "茸", "踊", "鏞", "佑", "寓", "祐", "旭", "頊", "昱", "煜", "郁", "芸", "蔚", "熊", "媛", "瑗", "袁", "渭", "韋", "魏", "喩", "庾", "兪", "楡", "癒", "踰", "允", "胤", "鈗", "垠", "殷", "誾", "鷹", "姨", "珥", "怡", "翊", "翌", "咽", "鎰", "佾", "滋", "炙", "疵", "雀", "盞", "匠", "庄", "杖", "樟", "璋", "蔣", "箸", "迹", "甸", "顚", "呈", "鄭", "晶", "珽", "旌", "楨", "汀", "禎", "鼎", "悌", "爪", "趙", "曹", "曺", "祚", "琮", "綜", "做", "廚", "疇", "註", "准", "埈", "峻", "晙", "浚", "濬", "駿", "址", "祉", "芝", "肢", "稙", "稷", "秦", "晉", "叱", "窒", "斟", "叉", "燦", "鑽", "璨", "瓚", "餐", "敞", "昶", "采", "埰", "蔡", "陟", "隻", "釧", "喆", "澈", "瞻", "捷", "秒", "楚", "囑", "蜀", "叢", "崔", "鄒", "椿", "黜", "沖", "聚", "仄", "惻", "侈", "峙", "雉", "勅", "鐸", "呑", "灘", "眈", "兌", "台", "坡", "阪", "牌", "彭", "扁", "鞭", "哺", "葡", "鋪", "鮑", "杓", "馮", "弼", "乏", "瑕", "轄", "函", "陜", "亢", "沆", "懈", "骸", "杏", "赫", "爀", "峴", "炫", "鉉", "狹", "瀅", "炯", "邢", "馨", "昊", "晧", "皓", "壕", "濠", "扈", "鎬", "祜", "泓", "桓", "煥", "猾", "晃", "滉", "淮", "賄", "后", "熏", "壎", "薰", "徽", "烋", "匈", "欠", "欽", "姬", "嬉", "熹", "憙", "犧", "禧", "羲"],
    "1급": ["嫁", "稼", "袈", "苛", "駕", "恪", "侃", "玕", "揀", "澗", "喝", "竭", "碣", "柑", "勘", "瞰", "匣", "堈", "杠", "橿", "糠", "絳", "羌", "襁", "薑", "芥", "愷", "漑", "疥", "羹", "醵", "遽", "渠", "鉅", "愆", "虔", "楗", "杰", "怯", "檄", "譴", "鵑", "抉", "鎌", "倞", "坰", "耿", "梗", "憬", "暻", "擎", "檠", "俓", "涇", "莖", "勁", "痙", "逕", "熲", "鯨", "冏", "烓", "稽", "誡", "叩", "敲", "拷", "羔", "股", "瞽", "睾", "轂", "鵠", "崑", "棍", "琨", "錕", "鯤", "鞏", "拱", "珙", "控", "藿", "廓", "錧", "棺", "灌", "琯", "瓘", "括", "侊", "洸", "珖", "桄", "匡", "曠", "炚", "胱", "魁", "拐", "槐", "虢", "宏", "肱", "喬", "攪", "嬌", "咎", "垢", "寇", "枸", "柩", "銶", "溝", "軀", "耈", "駒", "躬", "蹶", "机", "潰", "詭", "逵", "窺", "葵", "畇", "鈞", "橘", "戟", "剋", "隙", "饉", "墐", "漌", "劤", "衾", "襟", "昑", "衿", "扱", "汲", "亘", "妓", "淇", "璂", "祺", "錤", "玘", "杞", "埼", "崎", "綺", "錡", "圻", "磯", "譏", "嗜", "暣", "伎", "佶", "姞", "桔", "喫", "懦", "娜", "捏", "捺", "楠", "湳", "囊", "柰", "恬", "佞", "膿", "鬧", "紐", "鈕", "緞", "疸", "痰", "譚", "澹", "覃", "曇", "沓", "棠", "撞", "螳", "鐺", "岱", "玳", "擡", "屠", "搗", "堵", "棹", "鍍", "蹈", "瀆", "犢", "墩", "暾", "憧", "潼", "垌", "瞳", "疼", "痘", "枓", "遁", "鄧", "螺", "騾", "烙", "珞", "酪", "瀾", "瓓", "辣", "襤", "籃", "臘", "狼", "琅", "崍", "輛", "倆", "閭", "黎", "戾", "轢", "靂", "漣", "攣", "璉", "輦", "冽", "洌", "濂", "簾", "伶", "鈴", "姈", "昤", "怜", "隷", "撈", "彔", "瀧", "瓏", "儡", "瞭", "壘", "褸", "陋", "琉", "硫", "戮", "崙", "淪", "侖", "綸", "慄", "肋", "凜", "凌", "綾", "菱", "俚", "俐", "痢", "莉", "离", "璃", "悧", "籬", "潾", "璘", "躪", "琳", "霖", "淋", "笠", "瑪", "邈", "挽", "曼", "蔓", "鏋", "沫", "茉", "莽", "邙", "煤", "邁", "罵", "萌", "麵", "棉", "沔", "酩", "溟", "冒", "摸", "歿", "錨", "猫", "憮", "鵡", "拇", "珷", "畝", "撫", "懋", "炆", "蚊", "紋", "渼", "薇", "縻", "靡", "岷", "忞", "慜", "敃", "珀", "撲", "璞", "鉑", "駁", "畔", "頒", "磐", "勃", "跋", "潑", "坊", "彷", "滂", "昉", "膀", "徘", "陪", "湃", "佰", "蕃", "帆", "杋", "氾", "范", "璧", "霹", "闢", "甁", "輧", "鉼", "棅", "餠", "潽", "褓", "堡", "菩", "馥", "鍑", "捧", "琫", "烽", "棒", "鋒", "孵", "斧", "孚", "芙", "溥", "俯", "腑", "糞", "雰", "汾", "泌", "緋", "脾", "臂", "痹", "誹", "庇", "枇", "琵", "扉", "鄙", "斌", "濱", "嬪", "牝", "憑", "紗", "娑", "瀉", "獅", "裟", "肆", "珊", "薩", "杉", "湘", "翔", "爽", "塽", "顙", "璽", "穡", "笙", "嶼", "抒", "曙", "壻", "㥠", "汐", "淅", "䄷", "鉐", "扇", "煽", "渲", "愃", "墡", "琁", "羨", "嬋", "銑", "珗", "腺", "楔", "泄", "渫", "褻", "殲", "珹", "娍", "惺", "瑆", "卲", "嘯", "搔", "炤", "柖", "玿", "韶", "遡", "霄", "飱", "巽", "淞", "灑", "釗", "嫂", "岫", "隧", "狩", "瘦", "袖", "綬", "綏", "琇", "穗", "髓", "讐", "竪", "俶", "琡", "璹", "橚", "夙", "詢", "醇", "焞", "諄", "錞", "馴", "嵩", "膝", "璱", "丞", "陞", "柹", "恃", "熄", "栻", "埴", "寔", "拭", "莘", "薪", "訊", "悉", "沁", "什", "娥", "峨", "衙", "訝", "堊", "愕", "軋", "闇", "菴", "昻", "鴦", "厓", "崖", "曖", "腋", "櫻", "鶯", "鸚", "冶", "爺", "攘", "漾", "瘍", "驤", "飫", "馭", "檍", "諺", "奄", "俺", "掩", "嶪", "晹", "娟", "涓", "沇", "筵", "讌", "琰", "艶", "曄", "渶", "煐", "瀯", "楹", "鍈", "嬰", "穎", "瓔", "塋", "纓", "刈", "叡", "乂", "曳", "裔", "翳", "旿", "珸", "晤", "奧", "寤", "穩", "瑥", "媼", "壅", "渦", "腕", "玩", "垸", "浣", "琬", "婠", "阮", "翫", "梡", "婉", "枉", "猥", "僥", "凹", "寥", "擾", "瑤", "窈", "窯", "饒", "颻", "榕", "蓉", "湧", "埇", "墉", "瑀", "堣", "隅", "玗", "釪", "迂", "虞", "彧", "殞", "沄", "澐", "耘", "猿", "鴛", "垣", "洹", "沅", "嫄", "愿", "轅", "寃", "煒", "瑋", "暐", "孺", "侑", "洧", "宥", "瑜", "猷", "濡", "愉", "秞", "攸", "臾", "游", "帷", "柚", "蹂", "輶", "諭", "堉", "玧", "阭", "奫", "戎", "膺", "擬", "倚", "誼", "毅", "懿", "椅", "弛", "爾", "彞", "貽", "邇", "頤", "瀷", "謚", "溢", "馹", "稔", "仍", "孕", "剩", "仔", "藉", "瓷", "咨", "煮", "灼", "芍", "鵲", "炸", "箴", "奘", "漳", "暲", "薔", "齋", "梓", "縡", "錚", "咀", "沮", "躇", "邸", "楮", "嫡", "迪", "佺", "剪", "廛", "栓", "牋", "詮", "銓", "琠", "塡", "奠", "荃", "雋", "晢", "粘", "挺", "釘", "玎", "町", "桯", "珵", "姃", "湞", "幀", "綎", "晸", "柾", "鉦", "淀", "錠", "鋌", "靖", "靚", "鋥", "炡", "碇", "酊", "梯", "瑅", "蹄", "嘲", "棗", "槽", "窕", "眺", "肇", "遭", "俎", "凋", "糟", "詔", "腫", "倧", "淙", "棕", "悰", "踪", "鍾", "呪", "躊", "冑", "湊", "炷", "遒", "妵", "澍", "嗾", "紂", "誅", "輳", "焌", "竣", "畯", "儁", "埻", "隼", "茁", "櫛", "汁", "烝", "沚", "趾", "祗", "摯", "鋕", "咫", "瑨", "瑱", "軫", "禛", "縝", "賑", "瓆", "嫉", "跌", "潗", "楫", "澄", "蹉", "瑳", "磋", "撰", "纂", "粲", "澯", "纘", "擦", "塹", "懺", "讒", "愴", "菖", "廠", "瘡", "寀", "綵", "凄", "剔", "坧", "滌", "脊", "瘠", "仟", "阡", "凸", "轍", "綴", "僉", "諂", "籤", "牒", "帖", "諦", "樵", "蕉", "誚", "塚", "墜", "楸", "樞", "錐", "錘", "瑃", "賰", "珫", "萃", "娶", "脆", "翠", "熾", "馳", "癡", "琛", "蟄", "秤", "夬", "咤", "唾", "惰", "倬", "琸", "晫", "擢", "嘆", "坦", "憚", "耽", "搭", "蕩", "汰", "邰", "苔", "跆", "垞", "撐", "桶", "筒", "堆", "套", "妬", "婆", "巴", "杷", "芭", "琶", "坂", "浿", "佩", "沛", "澎", "烹", "枰", "陛", "褒", "庖", "泡", "瀑", "輻", "彪", "飄", "驃", "稟", "諷", "披", "珌", "苾", "馝", "鉍", "佖", "逼", "廈", "蝦", "遐", "霞", "壑", "謔", "澣", "閒", "涵", "緘", "鹹", "姮", "偕", "楷", "諧", "邂", "駭", "倖", "饗", "珦", "墟", "奕", "晛", "泫", "玹", "眩", "俠", "挾", "浹", "荊", "珩", "泂", "熒", "蕙", "彗", "嵇", "譿", "憓", "糊", "淏", "灝", "琥", "瑚", "頀", "顥", "壺", "濩", "弧", "狐", "渾", "惚", "烘", "虹", "鉷", "嬅", "樺", "喚", "奐", "渙", "晥", "紈", "鐶", "驩", "闊", "徨", "惶", "堭", "媓", "榥", "煌", "恍", "璜", "簧", "徊", "恢", "晦", "檜", "澮", "繪", "誨", "鐄", "涍", "驍", "斅", "嚆", "逅", "焄", "燻", "鑂", "喧", "暄", "萱", "彙", "暉", "虧", "譎", "欣", "炘", "昕", "屹", "洽", "恰", "翕", "晞", "僖", "凞", "爔", "曦", "詰"],
    "사범": ["呵", "訶", "椵", "哥", "枷", "茄", "珂", "跏", "痂", "慤", "咯", "柬", "癇", "磵", "稈", "旰", "乫", "曷", "蠍", "褐", "羯", "橄", "紺", "龕", "疳", "坎", "歛", "嵌", "瑊", "酣", "戡", "閘", "胛", "鱇", "舡", "畺", "鎧", "喈", "愾", "喀", "粳", "賡", "倨", "祛", "裾", "踞", "据", "鋸", "炬", "褰", "騫", "蹇", "腱", "黔", "瞼", "鈐", "迲", "偈", "覡", "繭", "蠲", "箝", "慊", "鉗", "歉", "裌", "磬", "璥", "絅", "頸", "烱", "罄", "勍", "脛", "悸", "罽", "薊", "髻", "堺", "棨", "誥", "暠", "尻", "翶", "蠱", "錮", "藁", "袴", "栲", "攷", "呱", "苽", "沽", "菰", "辜", "餻", "罟", "嚳", "梏", "斛", "袞", "梱", "閫", "滾", "汨", "鶻", "箜", "栱", "蚣", "顆", "鍋", "裹", "跨", "窠", "槨", "霍", "菅", "罐", "盥", "綰", "恝", "刮", "适", "壙", "筐", "誑", "罫", "乖", "紘", "轟", "轎", "餃", "蛟", "皎", "蕎", "嶠", "鮫", "咬", "翹", "鉤", "裘", "毬", "勾", "絿", "衢", "謳", "扣", "廏", "瞿", "劬", "呴", "屨", "璆", "搆", "臼", "逑", "嫗", "嶇", "蚯", "鞫", "麴", "掬", "窘", "裙", "芎", "穹", "捲", "淃", "蕨", "獗", "饋", "几", "簋", "櫃", "匱", "跪", "晷", "竅", "硅", "槻", "刲", "赳", "蹞", "筠", "勻", "麕", "郤", "亟", "芹", "覲", "懃", "菫", "嫤", "觔", "檎", "擒", "妗", "笒", "芩", "伋", "鬐", "朞", "鰭", "畸", "羈", "耭", "肌", "祁", "跂", "夔", "祇", "拮", "儺", "赧", "枏", "喃", "衲", "曩", "迺", "撚", "涅", "捻", "拈", "獰", "濘", "寗", "駑", "瑙", "弩", "孥", "嫋", "耨", "橈", "撓", "嫩", "訥", "你", "昵", "彖", "簞", "亶", "蛋", "袒", "鄲", "闥", "澾", "獺", "怛", "韃", "聃", "郯", "禫", "啖", "坍", "湛", "蕁", "錟", "憺", "幢", "儻", "倘", "戇", "黛", "坮", "韜", "賭", "櫂", "闍", "滔", "覩", "謟", "淘", "叨", "掉", "䆃", "禿", "牘", "櫝", "纛", "旽", "沌", "咄", "僮", "胴", "竇", "逗", "蠹", "荳", "兜", "遯", "臀", "芚", "嶝", "橙", "滕", "喇", "癩", "邏", "蘿", "駱", "闌", "欒", "鸞", "鑾", "欖", "纜", "嵐", "攬", "蠟", "瑯", "螂", "榔", "徠", "勑", "粱", "厲", "濾", "蠣", "驢", "藜", "癘", "櫚", "儷", "荔", "蠡", "瀝", "櫟", "礫", "殮", "鬣", "逞", "翎", "苓", "笭", "聆", "岺", "羚", "囹", "澧", "櫓", "鹵", "輅", "瀘", "潞", "碌", "麓", "菉", "籙", "隴", "壟", "朧", "誄", "磊", "罍", "瀨", "耒", "賚", "牢", "廖", "寮", "蓼", "燎", "聊", "婁", "瘻", "鏤", "縷", "摟", "蔞", "旒", "瀏", "榴", "溜", "瘤", "瑬", "勒", "廩", "稜", "纚", "螭", "罹", "狸", "釐", "犁", "唎", "羸", "鯉", "浬", "漓", "詈", "涖", "醨", "藺", "燐", "砬", "碼", "媽", "麽", "瘼", "彎", "饅", "卍", "巒", "鰻", "輓", "唜", "抹", "襪", "芒", "輞", "陌", "驀", "氓", "冪", "汨", "緬", "㴐", "眄", "皿", "瞑", "螟", "蓂", "暝", "茗", "椧", "袂", "眸", "耄", "摹", "麰", "瑁", "姆", "芼", "鶩", "曚", "朦", "渺", "竗", "眇", "杳", "蕪", "誣", "繆", "无", "廡", "楙", "們", "刎", "雯", "吻", "沕", "梶", "楣", "湄", "嵋", "謎", "媚", "糜", "弭", "黴", "嵄", "緡", "泯", "閩", "謐", "亳", "箔", "剝", "雹", "粕", "樸", "膊", "搏", "盼", "攀", "礬", "拌", "蟠", "斑", "槃", "絆", "泮", "瘢", "胖", "魃", "撥", "醱", "幇", "枋", "磅", "榜", "蚌", "舫", "髣", "尨", "蒡", "牓", "焙", "褙", "胚", "燔", "幡", "樊", "藩", "泛", "梵", "琺", "甓", "擘", "辟", "癖", "劈", "檗", "蘗", "釆", "抃", "籩", "鱉", "瞥", "鼈", "騈", "洑", "湺", "珤", "黼", "簠", "匐", "幞", "蔔", "輻", "茯", "輹", "宓", "鰒", "熢", "駙", "頫", "埠", "咐", "鮒", "俘", "仆", "鳧", "艀", "缶", "趺", "莩", "祔", "扮", "吩", "賁", "苯", "昐", "彿", "黻", "巿", "繃", "硼", "棚", "沘", "憊", "轡", "沸", "蜚", "霏", "篚", "俾", "裨", "毗", "圮", "翡", "砒", "榧", "痺", "菲", "斐", "妣", "秕", "髀", "玭", "瀕", "浜", "檳", "鬢", "殯", "嚬", "騁", "娉", "俟", "竢", "蓑", "槎", "耜", "梭", "駟", "麝", "柶", "伺", "僿", "乍", "些", "渣", "篩", "莎", "鑠", "蒴", "槊", "刪", "蒜", "疝", "霰", "汕", "繖", "乷", "煞", "芟", "滲", "衫", "澁", "颯", "鈒", "峠", "孀", "橡", "殤", "觴", "廂", "賽", "鰓", "黍", "墅", "犀", "胥", "絮", "噬", "筮", "鼠", "薯", "鋤", "潟", "蓆", "詵", "蟬", "跣", "饍", "鐥", "癬", "蘚", "敾", "僊", "屑", "媟", "偰", "齧", "挈", "剡", "贍", "躡", "筬", "腥", "宬", "猩", "笹", "篠", "瀟", "繰", "銷", "蕭", "宵", "艘", "梳", "甦", "瘙", "塑", "簫", "泝", "疋", "贖", "謖", "涑", "飡", "蓀", "蟀", "瑣", "嗽", "邃", "銹", "叟", "藪", "睟", "燧", "蓚", "鬚", "茱", "漱", "璲", "脩", "溲", "潚", "菽", "倏", "栒", "楯", "橓", "蓴", "恂", "徇", "鉥", "崧", "蝨", "褶", "蠅", "翅", "豕", "屎", "枲", "蒔", "匙", "豺", "緦", "蓍", "嘶", "偲", "塒", "諡", "篒", "侁", "燼", "呻", "蜃", "藎", "宸", "矧", "蟋", "芯", "諶", "鴉", "俄", "鵝", "蛾", "莪", "喔", "渥", "鄂", "鰐", "齷", "顎", "鍔", "幄", "鮟", "遏", "歹", "揠", "唵", "嵒", "黯", "諳", "狎", "盎", "秧", "怏", "靄", "掖", "扼", "縊", "阨", "罌", "椰", "揶", "葯", "蒻", "鑰", "佯", "恙", "瀁", "穰", "釀", "敭", "禳", "煬", "暘", "颺", "痒", "齬", "瘀", "圄", "臆", "堰", "偃", "嫣", "蘖", "孼", "儼", "淹", "渰", "茹", "艅", "礖", "轝", "歟", "璵", "閾", "繹", "縯", "挻", "堧", "吮", "嚥", "椽", "鳶", "涎", "瑌", "髥", "冉", "焰", "苒", "嶸", "潁", "籯", "濚", "瀛", "霙", "蘂", "穢", "霓", "瘞", "汭", "猊", "倪", "詣", "獒", "忤", "澳", "敖", "鼯", "襖", "塢", "俉", "筽", "熬", "鼇", "蜈", "懊", "螯", "圬", "醞", "慍", "蘊", "瘟", "縕", "兀", "顒", "饔", "癰", "嗈", "蛙", "蝸", "窩", "窪", "宛", "碗", "琓", "脘", "頑", "豌", "椀", "娃", "矮", "嵬", "巍", "徭", "拗", "嶢", "繞", "邀", "蟯", "繇", "褥", "縟", "慵", "慂", "冗", "聳", "俑", "甬", "紆", "雩", "㳓", "盂", "禑", "藕", "旴", "芋", "䨒", "栯", "稶", "勖", "橒", "熉", "隕", "蕓", "亐", "湲", "爰", "黿", "鉞", "葦", "蝟", "闈", "萎", "蔿", "葳", "杻", "揄", "逾", "鍮", "萸", "諛", "呦", "釉", "襦", "壝", "楢", "囿", "毓", "贇", "聿", "瀜", "絨", "慇", "訔", "嚚", "听", "狺", "蔭", "挹", "揖", "蟻", "螠", "艤", "薏", "饐", "餌", "迤", "痍", "飴", "肄", "苡", "荑", "靷", "絪", "茵", "湮", "蚓", "靭", "婣", "釰", "佚", "荏", "恁", "卄", "芿", "茨", "觜", "赭", "蔗", "孜", "粢", "勺", "綽", "醋", "斫", "嚼", "潺", "棧", "孱", "岑", "簪", "醬", "萇", "獐", "檣", "仗", "漿", "槳", "瘴", "欌", "贓", "臧", "齎", "纔", "賫", "滓", "諍", "箏", "樗", "氐", "詆", "豬", "疽", "姐", "苧", "紵", "渚", "雎", "杵", "藷", "儲", "齟", "佇", "狙", "這", "詛", "菹", "謫", "翟", "荻", "鏑", "糴", "頔", "狄", "勣", "悛", "輾", "箋", "煎", "腆", "顫", "氈", "癲", "佃", "畋", "塼", "鈿", "鐫", "澱", "纏", "顓", "餞", "篆", "囀", "筌", "箭", "畑", "浙", "截", "癤", "坫", "岾", "霑", "覘", "鮎", "椄", "摺", "楪", "睛", "瀞", "渟", "凊", "菁", "檉", "諪", "霆", "鞓", "霽", "薺", "醍", "臍", "磾", "躋", "啼", "禔", "徂", "粗", "雕", "藻", "璪", "漕", "蚤", "竈", "稠", "躁", "糶", "胙", "殂", "皁", "阻", "簇", "猝", "慫", "踵", "蹤", "挫", "蛛", "侏", "胄", "紬", "姝", "綢", "酎", "籌", "霔", "粥", "鬻", "蠢", "逡", "寯", "樽", "蹲", "皴", "喞", "葺", "拯", "璔", "繒", "甑", "蜘", "芷", "漬", "砥", "枳", "贄", "榛", "搢", "唇", "殄", "蔯", "畛", "溱", "瞋", "縉", "嗔", "臻", "桭", "疹", "袗", "迭", "蛭", "膣", "侄", "礩", "絰", "桎", "帙", "軼", "朕", "戢", "緝", "侘", "嵯", "箚", "嗟", "鑿", "齪", "窄", "搾", "酇", "饌", "簒", "竄", "紮", "扎", "站", "僭", "讖", "譖", "驂", "倡", "搶", "娼", "猖", "脹", "漲", "氅", "艙", "悵", "槍", "鬯", "釵", "寨", "砦", "柵", "萋", "倜", "擲", "蹠", "摭", "蕆", "韆", "穿", "擅", "舛", "闡", "玔", "喘", "輟", "歠", "簽", "甛", "忝", "沾", "詹", "簷", "檐", "疊", "輒", "貼", "堞", "睫", "鯖", "蔕", "涕", "剃", "遆", "禘", "悄", "剿", "梢", "鈔", "苕", "貂", "迢", "稍", "炒", "椒", "綃", "軺", "憔", "礁", "醮", "硝", "酢", "鞘", "髫", "矗", "鏃", "忖", "邨", "摠", "冢", "憁", "悤", "驄", "蔥", "撮", "啐", "摧", "麤", "鞦", "芻", "諏", "瘳", "湫", "酋", "騶", "鰍", "雛", "萩", "鎚", "椎", "惆", "皺", "竺", "蹙", "筑", "顣", "朮", "膵", "悴", "贅", "驟", "嘴", "鷲", "厠", "緇", "淄", "幟", "寘", "緻", "鴟", "蚩", "嗤", "錙", "輜", "梔", "痔", "飭", "柒", "砧", "忱", "楕", "拖", "駝", "朶", "陀", "陁", "舵", "啄", "柝", "坼", "殫", "綻", "頉", "榻", "搨", "帑", "宕", "盪", "迨", "笞", "駄", "橕", "牚", "攄", "菟", "慟", "腿", "槌", "頹", "褪", "偸", "慝", "闖", "爬", "葩", "怕", "擺", "跛", "鈑", "瓣", "辦", "捌", "叭", "孛", "悖", "狽", "唄", "稗", "膨", "愎", "徧", "翩", "騙", "貶", "萍", "斃", "嬖", "吠", "苞", "匍", "逋", "袍", "匏", "蒲", "咆", "圃", "疱", "佈", "脯", "炮", "晡", "曝", "慓", "瓢", "剽", "飇", "俵", "陂", "蹕", "瘧", "罕", "捍", "悍", "狠", "喊", "檻", "銜", "諴", "蛤", "闔", "哈", "盍", "閤", "盒", "杭", "桁", "肛", "伉", "缸", "蟹", "廨", "孩", "咳", "瀣", "醢", "垓", "劾", "覈", "荇", "餉", "嚮", "噓", "歇", "焃", "絢", "舷", "睍", "俔", "衒", "頁", "孑", "夾", "頰", "篋", "鋏", "莢", "逈", "滎", "鎣", "灐", "鞋", "蹊", "醯", "蝴", "葫", "縞", "滸", "岵", "蒿", "芦", "瓠", "琿", "笏", "哄", "訌", "汞", "譁", "鑊", "碻", "攫", "寰", "圜", "宦", "鰥", "豁", "蝗", "篁", "肓", "愰", "晄", "慌", "潢", "貺", "隍", "湟", "遑", "幌", "蟥", "蛔", "獪", "匯", "茴", "膾", "湏", "宖", "淆", "肴", "梟", "爻", "哮", "酵", "篌", "帿", "煦", "嗅", "朽", "珝", "吼", "詡", "暈", "薨", "煊", "喙", "卉", "諱", "麾", "煇", "褘", "畦", "鑴", "恤", "鷸", "洶", "忻", "釁", "吃", "訖", "紇", "歆", "囍"]
};

function cumulativeHanjaCharacters(level) {
    if (level === "대사범") {
        level = "사범";
    }

    const targetIndex = HANJA_LEVEL_ORDER.indexOf(level);
    const finalIndex = Math.max(
        0,
        Math.min(
            targetIndex < 0 ? 0 : targetIndex,
            HANJA_LEVEL_ORDER.indexOf("사범")
        )
    );

    const result = [];
    const seen = new Set();

    for (let i = 0; i <= finalIndex; i++) {
        const name = HANJA_LEVEL_ORDER[i];
        for (const char of HANJA_LEVEL_NEW[name] || []) {
            if (seen.has(char)) continue;
            seen.add(char);
            result.push({
                id: "hanja_" + name + "_" + (result.length + 1),
                level: name,
                char
            });
        }
    }

    return result;
}

const HANJA_TEST_EXAMPLES = {
    hun: "예: 父 → 아비",
    eum: "예: 父 → 부",
    hunToChar: "예: 아비 → 父",
    eumToChar: "예: 부 → 父"
};

/* 훈·음 사전: 첫 실행 시 받아서 localStorage에 저장하고 이후에는 캐시 사용 */
const HANJA_DICT_URL = "https://raw.githubusercontent.com/seyoungsong/hanjadict/refs/heads/master/src/hanjadict/table.json";
const HANJA_DICT_CACHE_KEY = "word-memorize-hanja-dictionary-v1";
let hanjaDictionary = null;
let hanjaDictionaryPromise = null;

function normalizeHanjaCharacter(char) {
    return String(char || "").normalize("NFKC");
}

function parseHunEumText(text) {
    const value = String(text || "").trim();
    if (!value) return [];

    return value
        .split(",")
        .flatMap(part => part.split("/").map(item => item.trim()))
        .filter(Boolean)
        .map(part => {
            const tokens = part.split(/\s+/).filter(Boolean);
            if (tokens.length < 2) return null;
            const eum = tokens.pop();
            const hun = tokens.join(" ");
            return hun && eum ? { hun, eum } : null;
        })
        .filter(Boolean);
}

function preferredHunEum(text) {
    const pairs = parseHunEumText(text);
    if (!pairs.length) {
        return { hun: "", eum: "", pairs: [] };
    }

    const normalizedEum = value => String(value || "").replace(/\([^)]*\)/g, "");
    const firstEum = normalizedEum(pairs[0].eum);
    const sameSound = pairs.filter(pair => normalizedEum(pair.eum) === firstEum);
    const pool = sameSound.length ? sameSound : pairs;

    /*
       같은 음에 훈이 여러 개라면 짧은 훈을 우선합니다.
       예: 父 = 아버지 부 / 아비 부 -> 아비 부
    */
    const best = [...pool].sort((a, b) => {
        if (a.hun.length !== b.hun.length) return a.hun.length - b.hun.length;
        return a.hun.localeCompare(b.hun, "ko");
    })[0] || pairs[0];

    return {
        hun: best.hun,
        eum: best.eum,
        pairs
    };
}

function getHanjaInfo(char) {
    const key = normalizeHanjaCharacter(char);
    const raw = hanjaDictionary?.[key];
    if (!raw) return { hun: "", eum: "", pairs: [] };
    return preferredHunEum(raw);
}

async function loadHanjaDictionary() {
    if (hanjaDictionary) return hanjaDictionary;
    if (hanjaDictionaryPromise) return hanjaDictionaryPromise;

    hanjaDictionaryPromise = (async () => {
        try {
            const cached = localStorage.getItem(HANJA_DICT_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object") {
                    hanjaDictionary = parsed;
                    return parsed;
                }
            }
        } catch (error) {
            console.warn("한자 사전 캐시 읽기 실패:", error);
        }

        const response = await fetch(HANJA_DICT_URL, {
            cache: "force-cache"
        });

        if (!response.ok) {
            throw new Error("한자 사전 HTTP 오류: " + response.status);
        }

        const data = await response.json();
        hanjaDictionary = data;

        try {
            localStorage.setItem(HANJA_DICT_CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn("한자 사전 캐시 저장 실패:", error);
        }

        return data;
    })();

    try {
        return await hanjaDictionaryPromise;
    } finally {
        hanjaDictionaryPromise = null;
    }
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
    return cumulativeHanjaCharacters(level);
}

const JAPANESE_DATA = [
    ["日","にち・じつ","ひ・か"],["月","げつ・がつ","つき"],["火","か","ひ"],["水","すい","みず"],["木","もく","き"],
    ["金","きん","かね"],["土","ど","つち"],["山","さん","やま"],["川","せん","かわ"],["人","じん・にん","ひと"],
    ["大","だい・たい","おお"],["小","しょう","ちい・こ"],["中","ちゅう","なか"],["上","じょう・しょう","うえ・あ"],["下","か・げ","した・さ"],
    ["入","にゅう","い・はい"],["出","しゅつ","で・だ"],["見","けん","み"],["行","こう・ぎょう","い・おこな"],["来","らい","く"],
    ["食","しょく","た・く"],["飲","いん","の"],["学","がく","まな"],["生","せい・しょう","い・う・なま"],["先","せん","さき"],
    ["名","めい・みょう","な"],["女","じょ・にょ","おんな"],["男","だん・なん","おとこ"],["子","し・す","こ"],["友","ゆう","とも"]
].map(([char,on,kun],i)=>({id:`japanese_${i+1}`,char,on,kun}));

function getWorkbookMode(workbook){
    const name = String(workbook?.name || "");
    if (name.includes("한자")) return "hanja";
    return "normal";
}

function specialDataForLevel(level){
    return getHanjaLearningItems(level);
}

function hanjaAvailable(level){
    return !!HANJA_LEVEL_COUNTS[level];
}

function getSpecialStars(level){
    const index = HANJA_LEVEL_ORDER.indexOf(level);
    return "⭐".repeat(Math.max(1, Math.min(index + 1, 14)));
}

function renderSpecialWorkbookPanel(){
    const workbook = getCurrentWorkbook();
    const panel = $("specialWorkbookPanel");
    const normal = $("normalWordInputCard");

    if (!panel || !normal || !workbook) return;

    const mode = getWorkbookMode(workbook);

    panel.classList.toggle("hidden", mode === "normal");
    normal.classList.toggle("hidden", mode !== "normal");

    if (mode === "normal") return;

    if (mode === "hanja") {
        $("specialWorkbookTitle").textContent = "🀄 한자 학습";
        $("specialWorkbookDescription").textContent = "대한검정회 선정한자를 급수별로 학습합니다.";
        $("specialLevelArea").classList.remove("hidden");
        $("specialSearchArea").classList.remove("hidden");
        $("specialJapaneseInfo").classList.add("hidden");
        $("specialSearch").placeholder = "한자·훈·음 검색";

        const selected = getSelectedHanjaLevel();
        $("specialLevelList").innerHTML = HANJA_LEVEL_ORDER.map(level => {
            const isSelected = level === selected;
            const isGrandMaster = level === "대사범";
            const sub = isGrandMaster
                ? "사범 5,000자 포함 · 별도 한문 지문"
                : `${HANJA_LEVEL_COUNTS[level]}자`;

            return `<button type="button" class="special-level-button ${isSelected ? "selected" : ""}" data-hanja-level="${escapeHTML(level)}"><strong>${escapeHTML(level)}</strong><small>${escapeHTML(sub)}</small></button>`;
        }).join("");

        renderSpecialList();
        renderWordList();

        loadHanjaDictionary()
            .then(() => {
                renderSpecialList();
                renderWordList();
            })
            .catch(() => {
                renderSpecialList();
                renderWordList();
                showToast("한자 훈음 데이터를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.", "error");
            });
    }
}

function renderSpecialList(){
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
                || normalizeSearch(info.eum).includes(query);
        });
    }

    $("specialListTitle").textContent = `${level} 학습 목록`;

    $("specialList").innerHTML = data.length
        ? data.map(item => {
            const info = getHanjaInfo(item.char);
            return `<div class="special-item">
                <strong>${escapeHTML(item.char)}</strong>
                <span>훈독: ${escapeHTML(info.hun || "불러오는 중...")}</span>
                <span>음독: ${escapeHTML(info.eum || "불러오는 중...")}</span>
            </div>`;
        }).join("")
        : '<div class="empty">선택한 조건에 맞는 한자가 없습니다.</div>';
}

async function openSpecialTestMenu(){
    const workbook = getCurrentWorkbook();
    if (!workbook) return;

    const mode = getWorkbookMode(workbook);
    if (mode === "normal") return startWorkbookTest();

    const level = getSelectedHanjaLevel();
    const data = specialDataForLevel(level);
    if (!data.length) {
        showToast("선택한 급수에 해당하는 한자가 없습니다.", "error");
        return;
    }

    if (!hanjaDictionary) {
        try {
            await loadHanjaDictionary();
        } catch {
            showToast("한자 훈음 데이터를 불러오지 못했습니다.", "error");
            return;
        }
    }

    openModal("한자 테스트", `<div class="test-menu">
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','mixed')">
            <strong>📝 전체 테스트</strong>
            <span>한자 → 훈독 / 한자 → 음독 / 훈독 → 한자 / 음독 → 한자</span>
            <small>${HANJA_TEST_EXAMPLES.hun} · ${HANJA_TEST_EXAMPLES.eum}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','choice')">
            <strong>🎯 4지선다 테스트</strong>
            <span>훈독·음독을 이용해 보기에서 정답을 고릅니다.</span>
            <small>예: 父 → 아비 / 부</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hanja-hun')">
            <strong>한자 → 훈독</strong>
            <span>한자를 보고 훈독을 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.hun}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hanja-eum')">
            <strong>한자 → 음독</strong>
            <span>한자를 보고 음독을 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.eum}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hun-hanja')">
            <strong>훈독 → 한자</strong>
            <span>훈독을 보고 한자를 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.hunToChar}</small>
        </button>
        <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','eum-hanja')">
            <strong>음독 → 한자</strong>
            <span>음독을 보고 한자를 입력합니다.</span>
            <small>${HANJA_TEST_EXAMPLES.eumToChar}</small>
        </button>
    </div>`);
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
        q.answers = info.hun ? [info.hun] : [];
        q.label = "한자 → 훈독";
    } else if (direction === "hanja-eum") {
        q.question = item.char;
        q.answers = info.eum ? [info.eum] : [];
        q.label = "한자 → 음독";
    } else if (direction === "hun-hanja") {
        q.question = info.hun;
        q.answers = [item.char];
        q.label = "훈독 → 한자";
    } else if (direction === "eum-hanja") {
        q.question = info.eum;
        q.answers = [item.char];
        q.label = "음독 → 한자";
    }

    return q;
}

function shuffleArray(arr){
    return [...arr].sort(() => Math.random() - 0.5);
}

async function startSpecialHanjaTest(level, type = "mixed"){
    const workbook = getCurrentWorkbook();
    if (!workbook) return;

    try {
        await loadHanjaDictionary();
    } catch {
        showToast("한자 훈음 데이터를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.", "error");
        return;
    }

    const data = shuffleArray(specialDataForLevel(level));
    if (!data.length) {
        showToast("해당 급수의 한자 데이터가 없습니다.", "error");
        return;
    }

    let questions = [];

    if (type === "choice") {
        questions = data.map(item => makeSpecialChoiceQuestion(item, data));
    } else {
        const directions = ["hanja-hun", "hanja-eum", "hun-hanja", "eum-hanja"];
        questions = data
            .map(item => makeSpecialQuestion(
                item,
                type === "mixed"
                    ? directions[Math.floor(Math.random() * directions.length)]
                    : type
            ))
            .filter(question => question.answers.length > 0 && question.question);
    }

    if (!questions.length) {
        showToast("훈·음 데이터를 찾을 수 없습니다.", "error");
        return;
    }

    startTest(
        questions,
        `한자 ${level} ${type === "choice" ? "4지선다" : "테스트"}`,
        "special-hanja",
        currentFileId,
        currentWorkbookId,
        "workbook"
    );
}

function makeSpecialChoiceQuestion(item, pool){
    const info = getHanjaInfo(item.char);
    const reverse = Math.random() < 0.5;
    const distractors = shuffleArray(pool.filter(x => x.id !== item.id)).slice(0, 3);
    const itemLabel = `${info.hun || "-"} · ${info.eum || "-"}`;

    if (reverse) {
        return {
            ...item,
            specialMode: "hanja-choice",
            choiceType: "pair-hanja",
            direction: "choice",
            question: itemLabel,
            answers: [item.char],
            choiceOptions: shuffleArray([item, ...distractors]).map(x => x.char),
            file: { name: "한자" },
            wordId: null,
            workbookId: null,
            fileId: null
        };
    }

    return {
        ...item,
        specialMode: "hanja-choice",
        choiceType: "hanja-pair",
        direction: "choice",
        question: item.char,
        answers: [itemLabel],
        choiceOptions: shuffleArray([item, ...distractors]).map(x => {
            const selected = getHanjaInfo(x.char);
            return `${selected.hun || "-"} · ${selected.eum || "-"}`;
        }),
        file: { name: "한자" },
        wordId: null,
        workbookId: null,
        fileId: null
    };
}

/* =========================================================
   전용 단어장 연결
   ========================================================= */

function showWorkbookPage(fileId, workbookId){
    baseShowWorkbookPage(fileId, workbookId);
    const workbook = getCurrentWorkbook();
    if (workbook) {
        renderSpecialWorkbookPanel();
        if (getWorkbookMode(workbook) === "hanja") {
            loadHanjaDictionary()
                .then(() => {
                    renderSpecialList();
                    renderWordList();
                })
                .catch(() => {});
        }
    }
}

function renderWordList(){
    const workbook = getCurrentWorkbook();
    const list = $("wordList");
    const empty = $("emptyWordState");

    if (!workbook || !list) return;

    if (getWorkbookMode(workbook) === "hanja") {
        const level = getSelectedHanjaLevel();
        const data = specialDataForLevel(level);

        if (empty) empty.classList.add("hidden");
        updateWordCountUI(data.length);

        list.innerHTML = data.map((item, index) => {
            const info = getHanjaInfo(item.char);
            return `<div class="word-card" data-hanja-char="${escapeHTML(item.char)}">
                <div class="word-number">${index + 1}</div>
                <div class="word-main">
                    <div class="word-title">
                        <strong>${escapeHTML(item.char)}</strong>
                    </div>
                    <div class="word-meaning">
                        훈독: ${escapeHTML(info.hun || "불러오는 중...")} · 음독: ${escapeHTML(info.eum || "불러오는 중...")}
                    </div>
                    <div class="word-stat">급수: ${escapeHTML(item.level)}</div>
                </div>
            </div>`;
        }).join("");

        return;
    }

    baseRenderWordList();
}

function startWorkbookTest(type = "menu") {
    const workbook = getCurrentWorkbook();
    if (!workbook) return;

    const mode = getWorkbookMode(workbook);
    if (mode === "hanja") return openSpecialTestMenu();

    if (type === "file-to-meaning" || type === "meaning-to-file" || type === "all") {
        return startNormalWorkbookTest(type);
    }

    return openWorkbookTestMenu();
}

function openWorkbookTestMenu() {
    const workbook = getCurrentWorkbook();
    if (!workbook) return;
    if (!Array.isArray(workbook.words) || workbook.words.length === 0) {
        showToast("테스트할 단어가 없습니다.", "error");
        return;
    }

    const importantCount = workbook.words.filter(word => word.important).length;
    const wrongCount = workbook.words.filter(word => Number(word.wrong) > 0).length;

    openModal(
        "영어 단어장 테스트",
        `<div class="test-menu">
            <button type="button" class="test-menu-button" onclick="closeModal(); startWorkbookTest('all')">
                <strong>📝 전체 테스트</strong>
                <span>영어 → 뜻 / 뜻 → 영어가 문제마다 랜덤으로 출제됩니다.</span>
                <small>예: apple → 사과 / 사과 → apple</small>
            </button>
            <button type="button" class="test-menu-button" onclick="closeModal(); startWorkbookTest('file-to-meaning')">
                <strong>영어 → 뜻</strong>
                <span>영어 단어를 보고 뜻을 입력합니다.</span>
                <small>예: apple → 사과</small>
            </button>
            <button type="button" class="test-menu-button" onclick="closeModal(); startWorkbookTest('meaning-to-file')">
                <strong>뜻 → 영어</strong>
                <span>뜻을 보고 영어 단어를 입력합니다.</span>
                <small>예: 사과 → apple</small>
            </button>
            <button type="button" class="test-menu-button" onclick="openWorkbookQuickTestMenu()">
                <strong>⚡ 빠른 테스트</strong>
                <span>중요 단어 또는 틀린 기록이 있는 단어만 테스트합니다.</span>
                <small>⭐ 중요 ${importantCount}개 · ❌ 틀린 기록 ${wrongCount}개</small>
            </button>
        </div>`
    );
}

function openWorkbookQuickTestMenu() {
    const workbook = getCurrentWorkbook();
    if (!workbook) return;

    const importantCount = workbook.words.filter(word => word.important).length;
    const wrongCount = workbook.words.filter(word => Number(word.wrong) > 0).length;

    openModal(
        "빠른 테스트",
        `<div class="test-menu">
            <button type="button" class="test-menu-button" ${importantCount === 0 ? "disabled" : ""} onclick="closeModal(); startWorkbookQuickTest('important')">
                <strong>⭐ 중요 단어 테스트</strong>
                <span>중요 표시된 단어만 테스트합니다.</span>
                <small>현재 ${importantCount}개</small>
            </button>
            <button type="button" class="test-menu-button" ${wrongCount === 0 ? "disabled" : ""} onclick="closeModal(); startWorkbookQuickTest('wrong')">
                <strong>❌ 틀린 단어 테스트</strong>
                <span>한 번이라도 틀린 기록이 있는 단어를 테스트합니다.</span>
                <small>현재 ${wrongCount}개</small>
            </button>
            <button type="button" class="test-menu-button" onclick="openWorkbookTestMenu()">
                <strong>← 돌아가기</strong>
                <span>단어장 테스트 메뉴로 돌아갑니다.</span>
            </button>
        </div>`
    );
}

function startNormalWorkbookTest(type = "all") {
    const file = getCurrentFile();
    const workbook = getCurrentWorkbook();
    if (!file || !workbook) return;

    if (!Array.isArray(workbook.words) || workbook.words.length === 0) {
        showToast("테스트할 단어가 없습니다.", "error");
        return;
    }

    const questions = workbook.words.map(word => {
        let direction = type;
        if (type === "all") {
            direction = Math.random() < 0.5 ? "file-to-meaning" : "meaning-to-file";
        }
        return makeQuestion({ word, workbook }, direction, file);
    });

    startTest(
        questions,
        type === "all"
            ? `${workbook.name} 전체 테스트`
            : type === "file-to-meaning"
                ? `${workbook.name} → 뜻`
                : `뜻 → ${workbook.name}`,
        "workbook",
        file.id,
        workbook.id,
        "workbook"
    );
}

function startWorkbookQuickTest(mode) {
    const file = getCurrentFile();
    const workbook = getCurrentWorkbook();
    if (!file || !workbook) return;

    const selected = mode === "important"
        ? workbook.words.filter(word => word.important)
        : workbook.words.filter(word => Number(word.wrong) > 0);

    if (!selected.length) {
        showToast("해당 조건에 맞는 단어가 없습니다.", "error");
        return;
    }

    const questions = selected.map(word => {
        const direction = Math.random() < 0.5 ? "file-to-meaning" : "meaning-to-file";
        return makeQuestion({ word, workbook }, direction, file);
    });

    startTest(
        questions,
        mode === "important"
            ? `${workbook.name} - ⭐ 중요 단어 테스트`
            : `${workbook.name} - ❌ 틀린 단어 테스트`,
        "workbook-quick",
        file.id,
        workbook.id,
        "workbook"
    );
}

function updateWordStatistics(question, isCorrect){
    if(question?.specialMode) return;
    return baseUpdateWordStatistics(question, isCorrect);
}

function makeQuestion(item, direction, file){
    return baseMakeQuestion(item, direction, file);
}



/* =========================================================
   한자 필기 입력
   - 훈독 → 한자 / 음독 → 한자에서 사용
   - 네이버 사전의 필기입력기처럼 한자를 직접 그려 후보를 선택
   - MIT License KanjiCanvas 기반
   ========================================================= */

const HANJA_HANDWRITING_SCRIPT_URL =
    "https://cdn.jsdelivr.net/gh/asdfjkl/kanjicanvas@master/docs/resources/javascript/kanji-canvas.min.js";
const HANJA_HANDWRITING_PATTERNS_URL =
    "https://cdn.jsdelivr.net/gh/asdfjkl/kanjicanvas@master/docs/resources/javascript/ref-patterns.js";

let hanjaHandwritingReadyPromise = null;

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
        `단어 암기장이 시작되었습니다. v${APP_VERSION}`
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
window.startSpecialJapaneseTest=startSpecialJapaneseTest;
window.openSpecialTestMenu=openSpecialTestMenu;
window.selectHanjaLevel=selectHanjaLevel;


/* 한자 필기 입력의 키보드 전환 상태 */
document.addEventListener("input",event=>{
    if(event.target?.id==="testAnswerInput") updateHanjaWritingSubmitState();
});
