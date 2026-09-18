"use strict";

/* =========================================================
   단어 암기장
   앱 버전
   ========================================================= */

const APP_VERSION = "3.4.2";

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
    "8급":30,"7급":50,"6급":70,"준5급":100,"5급":250,"준4급":400,"4급":600,
    "준3급":800,"3급":1000,"준2급":1500,"2급":2000,"준1급":2500,"1급":3500,"사범":5000,"대사범":5000
};

/*
   현재 내장한 대한검정회 배정한자 데이터.
   8급~준5급(총 100자)은 급수표를 기준으로 내장합니다.
   5급 이상은 전체 급수의 구조를 미리 만들어 두고,
   실제 전체 배정한자 데이터를 추가하면 같은 구조로 바로 확장할 수 있습니다.
*/
const HANJA_DATA = [
    ["8급", "九", "아홉", "구"],["8급", "金", "쇠", "금"],["8급", "南", "남녘", "남"],["8급", "男", "사내", "남"],["8급", "女", "여자", "녀"],
    ["8급", "東", "동녘", "동"],["8급", "六", "여섯", "륙"],["8급", "母", "어머니", "모"],["8급", "木", "나무", "목"],["8급", "門", "문", "문"],
    ["8급", "父", "아버지", "부"],["8급", "北", "북녘", "북"],["8급", "四", "넉", "사"],["8급", "三", "석", "삼"],["8급", "西", "서녘", "서"],
    ["8급", "水", "물", "수"],["8급", "十", "열", "십"],["8급", "五", "다섯", "오"],["8급", "月", "달", "월"],["8급", "二", "두", "이"],
    ["8급", "人", "사람", "인"],["8급", "日", "날", "일"],["8급", "一", "한", "일"],["8급", "子", "아들", "자"],["8급", "弟", "아우", "제"],
    ["8급", "七", "일곱", "칠"],["8급", "土", "흙", "토"],["8급", "八", "여덟", "팔"],["8급", "兄", "맏", "형"],["8급", "火", "불", "화"],

    ["7급", "江", "강", "강"],["7급", "口", "입", "구"],["7급", "內", "안", "내"],["7급", "年", "해", "년"],["7급", "大", "큰", "대"],
    ["7급", "目", "눈", "목"],["7급", "白", "흰", "백"],["7급", "山", "메", "산"],["7급", "上", "위", "상"],["7급", "小", "작을", "소"],
    ["7급", "手", "손", "수"],["7급", "外", "바깥", "외"],["7급", "右", "오른", "우"],["7급", "入", "들", "입"],["7급", "足", "발", "족"],
    ["7급", "左", "왼", "좌"],["7급", "中", "가운데", "중"],["7급", "靑", "푸를", "청"],["7급", "出", "날", "출"],["7급", "下", "아래", "하"],

    ["6급", "犬", "개", "견"],["6급", "己", "몸", "기"],["6급", "林", "수풀", "림"],["6급", "馬", "말", "마"],["6급", "名", "이름", "명"],
    ["6급", "百", "일백", "백"],["6급", "生", "날", "생"],["6급", "石", "돌", "석"],["6급", "先", "먼저", "선"],["6급", "姓", "성씨", "성"],
    ["6급", "心", "마음", "심"],["6급", "羊", "양", "양"],["6급", "魚", "물고기", "어"],["6급", "玉", "구슬", "옥"],["6급", "牛", "소", "우"],
    ["6급", "耳", "귀", "이"],["6급", "地", "땅", "지"],["6급", "川", "내", "천"],["6급", "千", "일천", "천"],["6급", "天", "하늘", "천"],

    ["준5급", "車", "수레", "거"],["준5급", "巾", "수건", "건"],["준5급", "古", "예", "고"],["준5급", "工", "장인", "공"],["준5급", "今", "이제", "금"],
    ["준5급", "同", "한가지", "동"],["준5급", "力", "힘", "력"],["준5급", "立", "설", "립"],["준5급", "末", "끝", "말"],["준5급", "文", "글월", "문"],
    ["준5급", "方", "모", "방"],["준5급", "本", "근본", "본"],["준5급", "夫", "지아비", "부"],["준5급", "不", "아니", "불"],["준5급", "士", "선비", "사"],
    ["준5급", "夕", "저녁", "석"],["준5급", "世", "세상", "세"],["준5급", "少", "적을", "소"],["준5급", "食", "먹을", "식"],["준5급", "央", "가운데", "앙"],
    ["준5급", "王", "임금", "왕"],["준5급", "位", "자리", "위"],["준5급", "衣", "옷", "의"],["준5급", "字", "글자", "자"],["준5급", "自", "스스로", "자"],
    ["준5급", "正", "바를", "정"],["준5급", "主", "주인", "주"],["준5급", "寸", "마디", "촌"],["준5급", "向", "향할", "향"],["준5급", "休", "쉴", "휴"]
].map(([level,char,meaning,sound],i)=>({id:`hanja_${i+1}`,level,char,meaning,sound,stars:HANJA_LEVEL_ORDER.indexOf(level)+1}));

const JAPANESE_DATA = [
    ["日","にち・じつ","ひ・か"],["月","げつ・がつ","つき"],["火","か","ひ"],["水","すい","みず"],["木","もく","き"],
    ["金","きん","かね"],["土","ど","つち"],["山","さん","やま"],["川","せん","かわ"],["人","じん・にん","ひと"],
    ["大","だい・たい","おお"],["小","しょう","ちい・こ"],["中","ちゅう","なか"],["上","じょう・しょう","うえ・あ"],["下","か・げ","した・さ"],
    ["入","にゅう","い・はい"],["出","しゅつ","で・だ"],["見","けん","み"],["行","こう・ぎょう","い・おこな"],["来","らい","く"],
    ["食","しょく","た・く"],["飲","いん","の"],["学","がく","まな"],["生","せい・しょう","い・う・なま"],["先","せん","さき"],
    ["名","めい・みょう","な"],["女","じょ・にょ","おんな"],["男","だん・なん","おとこ"],["子","し・す","こ"],["友","ゆう","とも"]
].map(([char,on,kun],i)=>({id:`japanese_${i+1}`,char,on,kun}));

function getWorkbookMode(workbook){
    const name=String(workbook?.name||"");
    if(name.includes("한자")) return "hanja";
    return "normal";
}

function specialDataForLevel(level){
    return HANJA_DATA.filter(x=>x.level===level || HANJA_LEVEL_ORDER.indexOf(x.level)<=HANJA_LEVEL_ORDER.indexOf(level));
}

function hanjaAvailable(level){return specialDataForLevel(level).length>0;}

function getSpecialStars(level){return "⭐".repeat(Math.max(1,HANJA_LEVEL_ORDER.indexOf(level)+1));}

function renderSpecialWorkbookPanel(){
    const workbook=getCurrentWorkbook();
    const panel=$("specialWorkbookPanel");
    const normal=$("normalWordInputCard");
    if(!panel||!normal||!workbook)return;
    const mode=getWorkbookMode(workbook);
    panel.classList.toggle("hidden",mode==="normal");
    normal.classList.toggle("hidden",mode!=="normal");
    if(mode==="normal")return;
    if(mode==="hanja"){
        $("specialWorkbookTitle").textContent="🀄 한자 학습";
        $("specialWorkbookDescription").textContent="급수를 선택하고 한자의 뜻과 음을 학습합니다.";
        $("specialLevelArea").classList.remove("hidden");
        $("specialSearchArea").classList.remove("hidden");
        $("specialJapaneseInfo").classList.add("hidden");
        $("specialLevelList").innerHTML=HANJA_LEVEL_ORDER.map((level,index)=>{
            const available=hanjaAvailable(level);
            const stars=getSpecialStars(level);
            const selected=level==="8급" && available;
            return `<button class="special-level-button ${available?'':'disabled'} ${selected?'selected':''}" data-hanja-level="${level}" ${available?'':'disabled'}><strong>${escapeHTML(level)}</strong><span>${stars}</span><small>${HANJA_LEVEL_COUNTS[level]}자${available?' · 내장':''}</small></button>`;
        }).join("");
        $("specialSearch").placeholder="한자·뜻·음 검색";
        renderSpecialList();
    }else{
        $("specialWorkbookTitle").textContent="🇯🇵 일본어 학습";
        $("specialWorkbookDescription").textContent="한자의 음독과 훈독을 기준으로 학습합니다. 뜻은 사용하지 않습니다.";
        $("specialLevelArea").classList.add("hidden");
        $("specialSearchArea").classList.remove("hidden");
        $("specialJapaneseInfo").classList.remove("hidden");
        $("specialSearch").placeholder="한자·음독·훈독 검색";
        renderSpecialList();
    }
}

function renderSpecialList(){
    const workbook=getCurrentWorkbook(); if(!workbook)return;
    const mode=getWorkbookMode(workbook);
    const query=normalizeSearch($("specialSearch")?.value||"");
    let data=[];
    if(mode==="hanja"){
        const level=$("specialLevelList")?.querySelector(".selected")?.dataset.hanjaLevel||"8급";
        data=specialDataForLevel(level);
        if(query)data=data.filter(x=>normalizeSearch(x.char).includes(query)||normalizeSearch(x.meaning).includes(query)||normalizeSearch(x.sound).includes(query));
        $("specialListTitle").textContent=`${level} 학습 목록`;
        $("specialList").innerHTML=data.length?data.map(x=>`<div class="special-item"><strong>${escapeHTML(x.char)}</strong><span>${escapeHTML(x.meaning)} · ${escapeHTML(x.sound)}</span><small>${getSpecialStars(x.level)}</small></div>`).join(""):`<div class="empty">선택한 조건에 맞는 한자가 없습니다.</div>`;
    }else{
        data=JAPANESE_DATA.filter(x=>!query||normalizeSearch(x.char).includes(query)||normalizeSearch(x.on).includes(query)||normalizeSearch(x.kun).includes(query));
        $("specialListTitle").textContent="일본어 기본 학습 목록";
        $("specialList").innerHTML=data.map(x=>`<div class="special-item"><strong>${escapeHTML(x.char)}</strong><span>음독: ${escapeHTML(x.on)}</span><span>훈독: ${escapeHTML(x.kun)}</span></div>`).join("");
    }
}

function openSpecialTestMenu(){
    const workbook=getCurrentWorkbook(); if(!workbook)return;
    const mode=getWorkbookMode(workbook);
    if(mode==="normal")return startWorkbookTest();
    if(mode==="hanja"){
        const level=$("specialLevelList")?.querySelector(".selected")?.dataset.hanjaLevel||"8급";
        if(!hanjaAvailable(level)){showToast("아직 내장된 데이터가 없는 급수입니다.","error");return;}
        openModal("한자 테스트",`<div class="test-menu">
            <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','mixed')"><strong>📝 전체 테스트</strong><span>한자→뜻 / 한자→음 / 뜻→한자 / 음→한자를 섞어서 출제합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','choice')"><strong>🎯 4지선다 테스트</strong><span>뜻+음 또는 한자를 보고 4개의 보기 중 정답을 고릅니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hanja-meaning')"><strong>한자 → 뜻</strong><span>한자를 보고 뜻을 입력합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','hanja-sound')"><strong>한자 → 음</strong><span>한자를 보고 음을 입력합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','meaning-hanja')"><strong>뜻 → 한자</strong><span>뜻을 보고 한자를 입력합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialHanjaTest('${level}','sound-hanja')"><strong>음 → 한자</strong><span>음을 보고 한자를 입력합니다.</span></button>
        </div>`);
    }else{
        openModal("일본어 테스트",`<div class="test-menu">
            <button class="test-menu-button" onclick="closeModal();startSpecialJapaneseTest('mixed')"><strong>📝 전체 테스트</strong><span>한자→음독 / 한자→훈독 / 음독→한자 / 훈독→한자를 섞어서 출제합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialJapaneseTest('kanji-on')"><strong>한자 → 음독</strong><span>한자를 보고 음독을 입력합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialJapaneseTest('kanji-kun')"><strong>한자 → 훈독</strong><span>한자를 보고 훈독을 입력합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialJapaneseTest('on-kanji')"><strong>음독 → 한자</strong><span>음독을 보고 한자를 입력합니다.</span></button>
            <button class="test-menu-button" onclick="closeModal();startSpecialJapaneseTest('kun-kanji')"><strong>훈독 → 한자</strong><span>훈독을 보고 한자를 입력합니다.</span></button>
        </div>`);
    }
}

function makeSpecialQuestion(item,direction,mode){
    if(mode==="hanja"){
        const q={...item,specialMode:"hanja",direction,wordId:null,workbookId:null,fileId:null,answers:[],file:{name:"한자"}};
        if(direction==="hanja-meaning"){q.question=item.char;q.answers=[item.meaning];q.label="한자 → 뜻";}
        else if(direction==="hanja-sound"){q.question=item.char;q.answers=[item.sound];q.label="한자 → 음";}
        else if(direction==="meaning-hanja"){q.question=item.meaning;q.answers=[item.char];q.label="뜻 → 한자";}
        else if(direction==="sound-hanja"){q.question=item.sound;q.answers=[item.char];q.label="음 → 한자";}
        return q;
    }
    const q={...item,specialMode:"japanese",direction,wordId:null,workbookId:null,fileId:null,answers:[],file:{name:"일본어"}};
    if(direction==="kanji-on"){q.question=item.char;q.answers=[item.on];q.label="한자 → 음독";}
    else if(direction==="kanji-kun"){q.question=item.char;q.answers=[item.kun];q.label="한자 → 훈독";}
    else if(direction==="on-kanji"){q.question=item.on;q.answers=[item.char];q.label="음독 → 한자";}
    else if(direction==="kun-kanji"){q.question=item.kun;q.answers=[item.char];q.label="훈독 → 한자";}
    return q;
}

function shuffleArray(arr){return [...arr].sort(()=>Math.random()-0.5);}

function startSpecialHanjaTest(level,type="mixed"){
    const workbook=getCurrentWorkbook(); if(!workbook)return;
    let data=specialDataForLevel(level); if(!data.length){showToast("해당 급수의 내장 데이터가 없습니다.","error");return;}
    data=shuffleArray(data);
    let questions=[];
    if(type==="choice") questions=data.map(item=>makeSpecialChoiceQuestion(item,data,"hanja"));
    else questions=data.map(item=>makeSpecialQuestion(item,type==="mixed"?["hanja-meaning","hanja-sound","meaning-hanja","sound-hanja"][Math.floor(Math.random()*4)]:type,"hanja"));
    startTest(questions,`한자 ${level} ${type==="choice"?"4지선다":"테스트"}`,"special-hanja",currentFileId,currentWorkbookId,"workbook");
}

function makeSpecialChoiceQuestion(item,pool){
    const reverse=Math.random()<0.5;
    const distractors=shuffleArray(pool.filter(x=>x.id!==item.id)).slice(0,3);
    if(reverse){
        return {...item,specialMode:"hanja-choice",choiceType:"pair-hanja",direction:"choice",question:`${item.meaning} · ${item.sound}`,answers:[item.char],choiceOptions:shuffleArray([item,...distractors]).map(x=>x.char),file:{name:"한자"},wordId:null,workbookId:null,fileId:null};
    }
    return {...item,specialMode:"hanja-choice",choiceType:"hanja-pair",direction:"choice",question:item.char,answers:[`${item.meaning} · ${item.sound}`],choiceOptions:shuffleArray([item,...distractors]).map(x=>`${x.meaning} · ${x.sound}`),file:{name:"한자"},wordId:null,workbookId:null,fileId:null};
}

function startSpecialJapaneseTest(type="mixed"){
    const workbook=getCurrentWorkbook(); if(!workbook)return;
    const data=shuffleArray(JAPANESE_DATA);
    const dirs=["kanji-on","kanji-kun","on-kanji","kun-kanji"];
    const questions=data.map(item=>makeSpecialQuestion(item,type==="mixed"?dirs[Math.floor(Math.random()*dirs.length)]:type,"japanese"));
    startTest(questions,`일본어 ${type==="mixed"?"전체 테스트":"테스트"}`,"special-japanese",currentFileId,currentWorkbookId,"workbook");
}

/* =========================================================
   전용 단어장 연결
   ========================================================= */

function showWorkbookPage(fileId, workbookId){
    baseShowWorkbookPage(fileId, workbookId);
    const workbook = getCurrentWorkbook();
    if(workbook) renderSpecialWorkbookPanel();
}

function renderWordList(){
    const workbook = getCurrentWorkbook();
    if(workbook && getWorkbookMode(workbook) !== "normal"){
        renderSpecialWorkbookPanel();
        const list = $("wordList");
        const empty = $("emptyWordState");
        if(list) list.innerHTML = "";
        if(empty){
            empty.classList.remove("hidden");
            empty.innerHTML = '<div class="empty-icon">📚</div><h2>내장 학습 자료를 사용합니다.</h2><p>이 단어장은 사용자가 단어를 직접 추가하지 않습니다.</p>';
        }
        const count = $("wordListCount");
        if(count) count.textContent = "내장 자료";
        return;
    }
    baseRenderWordList();
}

function startWorkbookTest(){
    const workbook = getCurrentWorkbook();
    if(workbook && getWorkbookMode(workbook) === "hanja") return openSpecialTestMenu();
    return baseStartWorkbookTest();
}

function updateWordStatistics(question, isCorrect){
    if(question?.specialMode) return;
    return baseUpdateWordStatistics(question, isCorrect);
}

function makeQuestion(item, direction, file){
    return baseMakeQuestion(item, direction, file);
}

function renderCurrentQuestion(){
    const q = testState.questions[testState.currentIndex];
    if(!q?.specialMode) return baseRenderCurrentQuestion();
    stopTimer();
    testState.answered = false;
    testState.timeLeft = Number(appData.testTime) || 10;

    const number = $("testQuestionNumber");
    const total = $("testTotalQuestions");
    const timer = $("testTimer");
    const typeLabel = $("testTypeLabel");
    const question = $("testQuestion");
    const answerInput = $("testAnswerInput");
    const choiceArea = $("testChoiceArea");
    const feedback = $("testFeedback");

    if(number) number.textContent = String(testState.currentIndex + 1);
    if(total) total.textContent = String(testState.questions.length);
    if(timer) timer.textContent = String(testState.timeLeft);
    if(typeLabel) typeLabel.textContent = q.label || "테스트";
    if(question) question.textContent = q.question || "";
    if(feedback){ feedback.className = "test-feedback hidden"; feedback.textContent = ""; }

    if(choiceArea) choiceArea.classList.toggle("hidden", !q.choiceOptions);
    if(q.choiceOptions){
        if(answerInput) answerInput.classList.add("hidden");
        if(choiceArea){
            choiceArea.innerHTML = q.choiceOptions.map(option => `
                <button type="button" class="test-choice-button">${escapeHTML(String(option))}</button>
            `).join("");
            choiceArea.querySelectorAll("button").forEach(button=>{
                button.addEventListener("click", ()=> submitSpecialChoice(button.textContent || "", q));
            });
        }
    } else {
        if(answerInput){
            answerInput.classList.remove("hidden");
            answerInput.value = "";
            answerInput.focus();
        }
    }

    const submit = $("testSubmitButton");
    if(submit) submit.textContent = "확인";
    startTimer();
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
    document.addEventListener("click",event=>{
        const levelButton=event.target.closest("[data-hanja-level]");
        if(levelButton){
            selectHanjaLevel(levelButton.dataset.hanjaLevel);
            return;
        }

        const workbookButton=event.target.closest("[data-open-workbook]");
        if(workbookButton){
            event.preventDefault();
            event.stopPropagation();
            openWorkbook(currentFileId, workbookButton.dataset.openWorkbook);
            return;
        }
    }, {capture:false});

    $("specialSearch")?.addEventListener("input",renderSpecialList);
    $("specialTestButton")?.addEventListener("click",openSpecialTestMenu);
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
