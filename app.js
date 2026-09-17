"use strict";

/* =========================================================
   기본 설정
   ========================================================= */

const APP_VERSION = "1.1.0";

const STORAGE_KEY =
    "word_memorize_app_final_v1";

const DEFAULT_DATA = {
    files: [],
    testRecords: [],
    theme: "light",
    testTime: 10
};


/* =========================================================
   사용 방법
   버전에 따라 표시할 내용을 관리
   ========================================================= */

const USAGE_GUIDE = [

    {
        since: "1.0.0",
        title: "📁 파일",
        text: "파일은 언어 또는 큰 분류를 기준으로 만들어 사용할 수 있습니다. 예를 들어 영어, 일본어처럼 자유롭게 이름을 정할 수 있습니다."
    },

    {
        since: "1.0.0",
        title: "📖 단어장",
        text: "파일 안에 단어장을 만들 수 있습니다. 1단원, 2단원처럼 원하는 기준으로 단어를 나누어 관리할 수 있습니다."
    },

    {
        since: "1.0.0",
        title: "✏️ 단어 추가",
        text: "단어 빠르게 추가에서 영어:뜻 형식으로 입력합니다. 여러 뜻은 쉼표(,)로 구분하고 여러 단어는 슬래시(/)로 구분합니다."
    },

    {
        since: "1.0.0",
        title: "⭐ 중요 단어",
        text: "테스트에서 자주 틀리는 단어는 자동으로 중요 단어로 표시될 수 있습니다."
    },

    {
        since: "1.1.0",
        title: "📝 일반 테스트",
        text: "파일에 들어 있는 모든 단어를 대상으로 테스트할 수 있습니다. 문제 순서는 매번 완전히 랜덤으로 섞입니다."
    },

    {
        since: "1.1.0",
        title: "🔀 전체 테스트",
        text: "전체 테스트에서는 문제마다 영어 → 뜻 또는 뜻 → 언어 방향이 랜덤으로 결정됩니다."
    },

    {
        since: "1.1.0",
        title: "📚 단어장 테스트",
        text: "단어장 안의 단어 테스트에서는 영어 → 뜻, 뜻 → 언어, 전체 테스트 중 하나를 선택할 수 있습니다. 현재 단어장에 들어 있는 단어만 출제됩니다."
    },

    {
        since: "1.1.0",
        title: "⏱️ 테스트 시간",
        text: "설정에서 한 문제당 제한시간을 5초부터 60초까지 선택할 수 있습니다."
    },

    {
        since: "1.1.0",
        title: "↩️ 뒤로가기",
        text: "단어장에서는 ← 파일, 파일에서는 ← 홈을 눌러 이전 위치로 이동할 수 있습니다. 테스트 중에도 ← 돌아가기를 눌러 테스트를 취소하고 이전 위치로 돌아갈 수 있습니다."
    },

    {
        since: "1.1.0",
        title: "📊 기록",
        text: "완료한 테스트는 날짜, 시간과 점수, 테스트 종류를 포함하여 기록됩니다."
    }

];


/* =========================================================
   상태
   ========================================================= */

let appData = loadData();

let currentFileId = null;
let currentWorkbookId = null;

let draggedFileId = null;
let draggedWorkbookId = null;
let draggedWordId = null;

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

const $ = id =>
    document.getElementById(id);


/* =========================================================
   데이터
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
        Math.random().toString(36).slice(2)
    );

}


function normalizeData(data) {

    if (!data || typeof data !== "object") {

        return {
            ...DEFAULT_DATA
        };

    }


    const normalized = {
        files: Array.isArray(data.files)
            ? data.files
            : [],

        testRecords: Array.isArray(data.testRecords)
            ? data.testRecords
            : [],

        theme:
            data.theme === "dark"
                ? "dark"
                : "light",

        testTime:
            Number.isFinite(Number(data.testTime))
                ? Number(data.testTime)
                : 10
    };


    normalized.testTime =
        normalizeTestTime(
            normalized.testTime
        );


    normalized.files =
        normalized.files.map(file => {

            const normalizedFile = {
                id: file.id || makeId(),
                name: String(file.name || "파일"),
                description:
                    String(
                        file.description || ""
                    ),
                wordbooks:
                    Array.isArray(file.wordbooks)
                        ? file.wordbooks
                        : []
            };


            normalizedFile.wordbooks =
                normalizedFile.wordbooks.map(
                    workbook => {

                        const normalizedWorkbook = {
                            id:
                                workbook.id ||
                                makeId(),

                            name:
                                String(
                                    workbook.name ||
                                    "단어장"
                                ),

                            words:
                                Array.isArray(
                                    workbook.words
                                )
                                    ? workbook.words
                                    : []
                        };


                        normalizedWorkbook.words =
                            normalizedWorkbook.words.map(
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
                                            ),

                                        meanings:
                                            meanings
                                                .map(
                                                    meaning =>
                                                        String(
                                                            meaning
                                                        )
                                                )
                                                .filter(
                                                    Boolean
                                                ),

                                        correct:
                                            Number(
                                                word.correct
                                            ) || 0,

                                        wrong:
                                            Number(
                                                word.wrong
                                            ) || 0,

                                        important:
                                            Boolean(
                                                word.important
                                            )
                                    };

                                }
                            );


                        return normalizedWorkbook;

                    }
                );


            return normalizedFile;

        });


    return normalized;

}


function loadData() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!raw) {

            return {
                ...DEFAULT_DATA
            };

        }


        return normalizeData(
            JSON.parse(raw)
        );

    } catch (error) {

        console.error(
            "데이터 불러오기 실패:",
            error
        );

        return {
            ...DEFAULT_DATA
        };

    }

}


function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(appData)
    );

}


function normalizeTestTime(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {

        return 10;

    }

    return Math.min(
        60,
        Math.max(
            5,
            Math.round(number)
        )
    );

}


function getTestTime() {

    return normalizeTestTime(
        appData.testTime
    );

}


/* =========================================================
   HTML 안전 처리
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
   배열 랜덤 섞기
   ========================================================= */

function shuffle(array) {

    const result =
        [...array];


    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }


    return result;

}


/* =========================================================
   파일 / 단어장 찾기
   ========================================================= */

function getFileById(fileId) {

    return appData.files.find(
        file =>
            file.id === fileId
    );

}


function getWorkbookById(
    fileId,
    workbookId
) {

    const file =
        getFileById(fileId);


    if (!file) {

        return null;

    }


    return file.wordbooks.find(
        workbook =>
            workbook.id === workbookId
    ) || null;

}


/* =========================================================
   페이지
   ========================================================= */

const pageIds = [
    "homePage",
    "filePage",
    "workbookPage",
    "statisticsPage",
    "settingsPage",
    "testPage",
    "resultPage"
];


function showPage(pageId) {

    pageIds.forEach(id => {

        const page =
            $(id);

        if (!page) {

            return;

        }

        page.classList.toggle(
            "active",
            id === pageId
        );

    });

}


function updateNavigation(activePage) {

    document
        .querySelectorAll(
            ".nav-item, .mobile-nav-item"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page ===
                activePage
            );

        });

}


function closeSidebar() {

    $("sidebar")?.classList.remove(
        "open"
    );

}


function showHomePage() {

    stopTimer();

    clearTimeout(
        testState.autoNextTimer
    );

    testState.autoNextTimer =
        null;

    currentFileId = null;
    currentWorkbookId = null;

    showPage(
        "homePage"
    );

    updateNavigation(
        "home"
    );

    closeSidebar();

    renderHome();

}


function showFilePage(fileId) {

    stopTimer();

    const file =
        getFileById(fileId);


    if (!file) {

        showHomePage();

        return;

    }


    currentFileId =
        file.id;

    currentWorkbookId =
        null;


    $("currentFileBreadcrumb")
        .textContent =
        file.name;

    $("currentFileTitle")
        .textContent =
        file.name;

    $("currentFileDescription")
        .textContent =
        file.description ||
        `${file.wordbooks.length}개의 단어장`;


    $("backToHomeButton")
        .textContent =
        "← 홈";


    showPage(
        "filePage"
    );

    updateNavigation(
        "home"
    );

    closeSidebar();

    renderWorkbooks();

}


function showWorkbookPage(
    fileId,
    workbookId
) {

    stopTimer();

    const file =
        getFileById(fileId);

    const workbook =
        getWorkbookById(
            fileId,
            workbookId
        );


    if (!file || !workbook) {

        if (file) {

            showFilePage(
                file.id
            );

        } else {

            showHomePage();

        }

        return;

    }


    currentFileId =
        file.id;

    currentWorkbookId =
        workbook.id;


    $("backToFileButton")
        .textContent =
        `← ${file.name}`;


    $("currentWorkbookBreadcrumb")
        .textContent =
        workbook.name;

    $("currentWorkbookTitle")
        .textContent =
        workbook.name;


    showPage(
        "workbookPage"
    );

    updateNavigation(
        "home"
    );

    closeSidebar();

    renderWords();

}


/* =========================================================
   홈 렌더링
   ========================================================= */

function renderHome() {

    const list =
        $("fileList");

    const empty =
        $("emptyFileState");


    list.innerHTML =
        "";


    if (!appData.files.length) {

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    appData.files.forEach(
        (file, index) => {

            const totalWords =
                file.wordbooks.reduce(
                    (sum, workbook) =>
                        sum +
                        workbook.words.length,
                    0
                );


            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "file-card";

            card.draggable =
                true;

            card.dataset.fileId =
                file.id;


            card.innerHTML = `

                <div
                    class="file-card-main"
                    data-action="open"
                >

                    <div class="file-icon">
                        📁
                    </div>

                    <div class="file-info">

                        <h3>
                            ${escapeHTML(file.name)}
                        </h3>

                        <p>
                            ${file.wordbooks.length}개 단어장 ·
                            ${totalWords}개 단어
                        </p>

                    </div>

                </div>


                <div class="file-actions">

                    <button
                        type="button"
                        data-action="rename"
                        aria-label="이름 변경"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        data-action="delete"
                        aria-label="삭제"
                    >
                        🗑️
                    </button>

                </div>

            `;


            card
                .querySelector(
                    '[data-action="open"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        showFilePage(
                            file.id
                        )
                );


            card
                .querySelector(
                    '[data-action="rename"]'
                )
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        renameFile(
                            file.id
                        );

                    }
                );


            card
                .querySelector(
                    '[data-action="delete"]'
                )
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        deleteFile(
                            file.id
                        );

                    }
                );


            addFileDragEvents(
                card,
                file.id
            );


            list.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   파일 드래그
   ========================================================= */

function addFileDragEvents(
    element,
    fileId
) {

    element.addEventListener(
        "dragstart",
        () => {

            draggedFileId =
                fileId;

            element.classList.add(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragend",
        () => {

            draggedFileId =
                null;

            element.classList.remove(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    element.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            if (
                !draggedFileId ||
                draggedFileId === fileId
            ) {

                return;

            }


            const from =
                appData.files.findIndex(
                    file =>
                        file.id ===
                        draggedFileId
                );

            const to =
                appData.files.findIndex(
                    file =>
                        file.id ===
                        fileId
                );


            if (
                from === -1 ||
                to === -1
            ) {

                return;

            }


            const [moved] =
                appData.files.splice(
                    from,
                    1
                );


            appData.files.splice(
                to,
                0,
                moved
            );


            saveData();

            renderHome();

        }
    );

}


/* =========================================================
   파일 생성 / 수정 / 삭제
   ========================================================= */

function openFileModal() {

    openModal(
        "새 파일 만들기",
        `
            <input
                id="modalFileName"
                class="modal-input"
                type="text"
                placeholder="예: 영어"
                autocomplete="off"
            >

            <input
                id="modalFileDescription"
                class="modal-input modal-input-spaced"
                type="text"
                placeholder="설명 (선택)"
                autocomplete="off"
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
                만들기
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            createFile
        );


    setTimeout(
        () =>
            $("modalFileName")?.focus(),
        50
    );

}


function createFile() {

    const name =
        $("modalFileName")
            ?.value
            .trim();

    const description =
        $("modalFileDescription")
            ?.value
            .trim() || "";


    if (!name) {

        showToast(
            "파일 이름을 입력해주세요.",
            "error"
        );

        return;

    }


    appData.files.push({
        id: makeId(),
        name,
        description,
        wordbooks: []
    });


    saveData();

    closeModal();

    renderHome();

    showToast(
        "파일을 만들었습니다."
    );

}


function renameFile(fileId) {

    const file =
        getFileById(fileId);


    if (!file) {

        return;

    }


    openModal(
        "파일 이름 변경",
        `
            <input
                id="modalFileName"
                class="modal-input"
                type="text"
                value="${escapeHTML(file.name)}"
                autocomplete="off"
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
                저장
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                const name =
                    $("modalFileName")
                        .value
                        .trim();


                if (!name) {

                    showToast(
                        "파일 이름을 입력해주세요.",
                        "error"
                    );

                    return;

                }


                file.name =
                    name;

                saveData();

                closeModal();

                renderHome();

                if (
                    currentFileId ===
                    fileId
                ) {

                    showFilePage(
                        fileId
                    );

                }

            }
        );


    setTimeout(
        () =>
            $("modalFileName")?.focus(),
        50
    );

}


function deleteFile(fileId) {

    const file =
        getFileById(fileId);


    if (!file) {

        return;

    }


    openModal(
        "파일 삭제",
        `
            <p class="modal-message">
                <strong>${escapeHTML(file.name)}</strong>
                파일을 삭제할까요?<br>
                안에 있는 단어장과 단어도 함께 삭제됩니다.
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
                class="danger-button"
                type="button"
            >
                삭제
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                appData.files =
                    appData.files.filter(
                        item =>
                            item.id !==
                            fileId
                    );


                saveData();

                closeModal();

                if (
                    currentFileId ===
                    fileId
                ) {

                    showHomePage();

                } else {

                    renderHome();

                }


                showToast(
                    "파일을 삭제했습니다."
                );

            }
        );

}


/* =========================================================
   단어장
   ========================================================= */

function openWorkbookModal() {

    openModal(
        "새 단어장 만들기",
        `
            <input
                id="modalWorkbookName"
                class="modal-input"
                type="text"
                placeholder="예: 1단원"
                autocomplete="off"
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
                만들기
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            createWorkbook
        );


    setTimeout(
        () =>
            $("modalWorkbookName")?.focus(),
        50
    );

}


function createWorkbook() {

    const file =
        getFileById(
            currentFileId
        );


    if (!file) {

        return;

    }


    const name =
        $("modalWorkbookName")
            ?.value
            .trim();


    if (!name) {

        showToast(
            "단어장 이름을 입력해주세요.",
            "error"
        );

        return;

    }


    file.wordbooks.push({
        id: makeId(),
        name,
        words: []
    });


    saveData();

    closeModal();

    renderWorkbooks();

    showToast(
        "단어장을 만들었습니다."
    );

}


function renderWorkbooks() {

    const file =
        getFileById(
            currentFileId
        );


    if (!file) {

        return;

    }


    const list =
        $("workbookList");

    const empty =
        $("emptyWorkbookState");


    list.innerHTML =
        "";


    if (!file.wordbooks.length) {

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    file.wordbooks.forEach(
        workbook => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "workbook-card";

            card.draggable =
                true;

            card.dataset.workbookId =
                workbook.id;


            card.innerHTML = `

                <div
                    class="workbook-card-main"
                    data-action="open"
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
                        </p>

                    </div>

                </div>


                <div class="workbook-actions">

                    <button
                        type="button"
                        data-action="rename"
                        aria-label="이름 변경"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        data-action="delete"
                        aria-label="삭제"
                    >
                        🗑️
                    </button>

                </div>

            `;


            card
                .querySelector(
                    '[data-action="open"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        showWorkbookPage(
                            file.id,
                            workbook.id
                        )
                );


            card
                .querySelector(
                    '[data-action="rename"]'
                )
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        renameWorkbook(
                            workbook.id
                        );

                    }
                );


            card
                .querySelector(
                    '[data-action="delete"]'
                )
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        deleteWorkbook(
                            workbook.id
                        );

                    }
                );


            addWorkbookDragEvents(
                card,
                workbook.id
            );


            list.appendChild(
                card
            );

        }
    );

}


function addWorkbookDragEvents(
    element,
    workbookId
) {

    element.addEventListener(
        "dragstart",
        () => {

            draggedWorkbookId =
                workbookId;

            element.classList.add(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragend",
        () => {

            draggedWorkbookId =
                null;

            element.classList.remove(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    element.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            const file =
                getFileById(
                    currentFileId
                );


            if (
                !file ||
                !draggedWorkbookId ||
                draggedWorkbookId ===
                workbookId
            ) {

                return;

            }


            const from =
                file.wordbooks.findIndex(
                    item =>
                        item.id ===
                        draggedWorkbookId
                );

            const to =
                file.wordbooks.findIndex(
                    item =>
                        item.id ===
                        workbookId
                );


            if (
                from === -1 ||
                to === -1
            ) {

                return;

            }


            const [moved] =
                file.wordbooks.splice(
                    from,
                    1
                );


            file.wordbooks.splice(
                to,
                0,
                moved
            );


            saveData();

            renderWorkbooks();

        }
    );

}


function renameWorkbook(
    workbookId
) {

    const workbook =
        getWorkbookById(
            currentFileId,
            workbookId
        );


    if (!workbook) {

        return;

    }


    openModal(
        "단어장 이름 변경",
        `
            <input
                id="modalWorkbookName"
                class="modal-input"
                type="text"
                value="${escapeHTML(workbook.name)}"
                autocomplete="off"
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
                저장
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                const name =
                    $("modalWorkbookName")
                        .value
                        .trim();


                if (!name) {

                    showToast(
                        "단어장 이름을 입력해주세요.",
                        "error"
                    );

                    return;

                }


                workbook.name =
                    name;

                saveData();

                closeModal();

                renderWorkbooks();

                if (
                    currentWorkbookId ===
                    workbookId
                ) {

                    showWorkbookPage(
                        currentFileId,
                        workbookId
                    );

                }

            }
        );

}


function deleteWorkbook(
    workbookId
) {

    const file =
        getFileById(
            currentFileId
        );


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


    openModal(
        "단어장 삭제",
        `
            <p class="modal-message">
                <strong>${escapeHTML(workbook.name)}</strong>
                단어장을 삭제할까요?<br>
                안에 있는 단어도 함께 삭제됩니다.
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
                class="danger-button"
                type="button"
            >
                삭제
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                file.wordbooks =
                    file.wordbooks.filter(
                        item =>
                            item.id !==
                            workbookId
                    );


                saveData();

                closeModal();

                if (
                    currentWorkbookId ===
                    workbookId
                ) {

                    showFilePage(
                        currentFileId
                    );

                } else {

                    renderWorkbooks();

                }


                showToast(
                    "단어장을 삭제했습니다."
                );

            }
        );

}


/* =========================================================
   단어 추가
   ========================================================= */

function parseBulkInput(
    input
) {

    return input
        .split("/")
        .map(
            item =>
                item.trim()
        )
        .filter(Boolean)
        .map(
            item => {

                const separator =
                    item.indexOf(":");


                if (
                    separator === -1
                ) {

                    return null;

                }


                const word =
                    item
                        .slice(
                            0,
                            separator
                        )
                        .trim();


                const meanings =
                    item
                        .slice(
                            separator + 1
                        )
                        .split(",")
                        .map(
                            meaning =>
                                meaning.trim()
                        )
                        .filter(Boolean);


                if (
                    !word ||
                    !meanings.length
                ) {

                    return null;

                }


                return {
                    word,
                    meanings
                };

            }
        )
        .filter(Boolean);

}


function addBulkWords() {

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


    if (!workbook) {

        return;

    }


    const input =
        $("bulkWordInput")
            .value
            .trim();


    if (!input) {

        showToast(
            "추가할 단어를 입력해주세요.",
            "error"
        );

        return;

    }


    const parsed =
        parseBulkInput(
            input
        );


    if (!parsed.length) {

        showToast(
            "입력 형식을 확인해주세요.",
            "error"
        );

        return;

    }


    let added = 0;
    let merged = 0;


    parsed.forEach(
        item => {

            const existing =
                workbook.words.find(
                    word =>
                        word.word
                            .toLowerCase() ===
                        item.word
                            .toLowerCase()
                );


            if (existing) {

                item.meanings.forEach(
                    meaning => {

                        const already =
                            existing.meanings
                                .some(
                                    current =>
                                        current
                                            .toLowerCase() ===
                                        meaning
                                            .toLowerCase()
                                );


                        if (!already) {

                            existing.meanings.push(
                                meaning
                            );

                            merged++;

                        }

                    }
                );


                return;

            }


            workbook.words.push({
                id: makeId(),
                word: item.word,
                meanings: [
                    ...new Set(
                        item.meanings
                    )
                ],
                correct: 0,
                wrong: 0,
                important: false
            });


            added++;

        }
    );


    saveData();

    $("bulkWordInput")
        .value =
        "";


    renderWords();


    showToast(
        `${added}개 추가, ${merged}개 뜻 병합`
    );

}


function addSingleWord() {

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


    if (!workbook) {

        return;

    }


    openModal(
        "단어 추가",
        `
            <input
                id="modalWord"
                class="modal-input"
                type="text"
                placeholder="단어"
                autocomplete="off"
            >

            <input
                id="modalMeaning"
                class="modal-input modal-input-spaced"
                type="text"
                placeholder="뜻"
                autocomplete="off"
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
                추가
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                const word =
                    $("modalWord")
                        .value
                        .trim();

                const meaning =
                    $("modalMeaning")
                        .value
                        .trim();


                if (
                    !word ||
                    !meaning
                ) {

                    showToast(
                        "단어와 뜻을 모두 입력해주세요.",
                        "error"
                    );

                    return;

                }


                const existing =
                    workbook.words.find(
                        item =>
                            item.word
                                .toLowerCase() ===
                            word
                                .toLowerCase()
                    );


                if (existing) {

                    const duplicate =
                        existing.meanings
                            .some(
                                item =>
                                    item
                                        .toLowerCase() ===
                                    meaning
                                        .toLowerCase()
                            );


                    if (!duplicate) {

                        existing.meanings.push(
                            meaning
                        );

                    }


                } else {

                    workbook.words.push({
                        id: makeId(),
                        word,
                        meanings: [
                            meaning
                        ],
                        correct: 0,
                        wrong: 0,
                        important: false
                    });

                }


                saveData();

                closeModal();

                renderWords();

                showToast(
                    "단어를 추가했습니다."
                );

            }
        );

}


/* =========================================================
   단어 목록
   ========================================================= */

function renderWords() {

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


    if (!workbook) {

        return;

    }


    const list =
        $("wordList");

    const empty =
        $("emptyWordState");


    list.innerHTML =
        "";


    $("wordCountDescription")
        .textContent =
        `${workbook.words.length}개의 단어`;

    $("wordListCount")
        .textContent =
        `${workbook.words.length}개`;


    if (!workbook.words.length) {

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    /*
       중요 단어를 위에 표시하되,
       일반 단어끼리의 저장 순서는 유지
    */

    const words =
        [
            ...workbook.words
        ].sort(
            (a, b) =>
                Number(b.important) -
                Number(a.important)
        );


    words.forEach(
        (word, index) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "word-card";

            if (word.important) {

                card.classList.add(
                    "important-word"
                );

            }


            card.draggable =
                true;

            card.dataset.wordId =
                word.id;


            const attempts =
                word.correct +
                word.wrong;


            card.innerHTML = `

                <div class="word-number">
                    ${index + 1}
                </div>

                <div class="word-main">

                    <div class="word-title">

                        <strong>
                            ${escapeHTML(word.word)}
                        </strong>

                        ${
                            word.important
                                ? `<span class="important-star">⭐</span>`
                                : ""
                        }

                    </div>

                    <div class="word-meaning">
                        ${escapeHTML(
                            word.meanings.join(", ")
                        )}
                    </div>

                    ${
                        attempts > 0
                            ? `
                                <div class="word-stat">
                                    정답 ${word.correct} ·
                                    오답 ${word.wrong}
                                </div>
                            `
                            : ""
                    }

                </div>


                <div class="word-actions">

                    <button
                        type="button"
                        data-action="edit"
                        aria-label="수정"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        data-action="delete"
                        aria-label="삭제"
                    >
                        🗑️
                    </button>

                </div>

            `;


            card
                .querySelector(
                    '[data-action="edit"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        editWord(
                            word.id
                        )
                );


            card
                .querySelector(
                    '[data-action="delete"]'
                )
                .addEventListener(
                    "click",
                    () =>
                        deleteWord(
                            word.id
                        )
                );


            addWordDragEvents(
                card,
                word.id
            );


            list.appendChild(
                card
            );

        }
    );

}


function addWordDragEvents(
    element,
    wordId
) {

    element.addEventListener(
        "dragstart",
        () => {

            draggedWordId =
                wordId;

            element.classList.add(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragend",
        () => {

            draggedWordId =
                null;

            element.classList.remove(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    element.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            const workbook =
                getWorkbookById(
                    currentFileId,
                    currentWorkbookId
                );


            if (
                !workbook ||
                !draggedWordId ||
                draggedWordId ===
                wordId
            ) {

                return;

            }


            const from =
                workbook.words.findIndex(
                    item =>
                        item.id ===
                        draggedWordId
                );

            const to =
                workbook.words.findIndex(
                    item =>
                        item.id ===
                        wordId
                );


            if (
                from === -1 ||
                to === -1
            ) {

                return;

            }


            const [moved] =
                workbook.words.splice(
                    from,
                    1
                );


            workbook.words.splice(
                to,
                0,
                moved
            );


            saveData();

            renderWords();

        }
    );

}


function editWord(wordId) {

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


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


    openModal(
        "단어 수정",
        `
            <input
                id="modalWord"
                class="modal-input"
                type="text"
                value="${escapeHTML(word.word)}"
                autocomplete="off"
            >

            <input
                id="modalMeaning"
                class="modal-input modal-input-spaced"
                type="text"
                value="${escapeHTML(
                    word.meanings.join(",")
                )}"
                autocomplete="off"
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
                저장
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                const newWord =
                    $("modalWord")
                        .value
                        .trim();

                const meanings =
                    $("modalMeaning")
                        .value
                        .split(",")
                        .map(
                            value =>
                                value.trim()
                        )
                        .filter(Boolean);


                if (
                    !newWord ||
                    !meanings.length
                ) {

                    showToast(
                        "단어와 뜻을 입력해주세요.",
                        "error"
                    );

                    return;

                }


                word.word =
                    newWord;

                word.meanings =
                    [
                        ...new Set(
                            meanings
                        )
                    ];


                saveData();

                closeModal();

                renderWords();

                showToast(
                    "단어를 수정했습니다."
                );

            }
        );

}


function deleteWord(wordId) {

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


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


    openModal(
        "단어 삭제",
        `
            <p class="modal-message">
                <strong>${escapeHTML(word.word)}</strong>
                단어를 삭제할까요?
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
                class="danger-button"
                type="button"
            >
                삭제
            </button>
        `
    );


    $("modalConfirmButton")
        .addEventListener(
            "click",
            () => {

                workbook.words =
                    workbook.words.filter(
                        item =>
                            item.id !==
                            wordId
                    );


                saveData();

                closeModal();

                renderWords();

                showToast(
                    "단어를 삭제했습니다."
                );

            }
        );

}


/* =========================================================
   테스트용 문제 생성
   ========================================================= */

function makeQuestion(
    word,
    direction,
    file,
    workbook = null
) {

    return {

        wordId:
            word.id,

        word,

        direction,

        sourceFileId:
            file.id,

        sourceWorkbookId:
            workbook?.id || null,

        fileName:
            file.name,

        workbookName:
            workbook?.name || null

    };

}


/* =========================================================
   테스트 방향
   ========================================================= */

function getDirectionLabel(
    question
) {

    const file =
        getFileById(
            question.sourceFileId
        );


    const language =
        (
            file?.name ||
            question.fileName ||
            "단어"
        ).trim();


    if (
        question.direction ===
        "english-to-meaning"
    ) {

        return `${language} → 뜻`;

    }


    return `뜻 → ${language}`;

}


/* =========================================================
   테스트 문제 만들기
   ========================================================= */

function buildTestQuestions(
    words,
    file,
    workbook,
    type
) {

    const questions =
        words.map(
            word => {

                let direction;


                if (
                    type ===
                    "all"
                ) {

                    direction =
                        Math.random() < 0.5
                            ? "english-to-meaning"
                            : "meaning-to-english";

                } else {

                    direction =
                        type;

                }


                return makeQuestion(
                    word,
                    direction,
                    file,
                    workbook
                );

            }
        );


    /*
       테스트 시작 시 문제 순서를
       완전히 랜덤으로 섞음
    */

    return shuffle(
        questions
    );

}


/* =========================================================
   일반 테스트 메뉴
   ========================================================= */

function openTotalTestMenu() {

    const file =
        getFileById(
            currentFileId
        );


    if (!file) {

        return;

    }


    const totalWords =
        file.wordbooks.reduce(
            (sum, workbook) =>
                sum +
                workbook.words.length,
            0
        );


    openModal(
        "일반 테스트",
        `
            <div class="test-menu">

                <button
                    class="test-menu-button"
                    id="testMenuAll"
                    type="button"
                    ${totalWords ? "" : "disabled"}
                >
                    <strong>📝 전체 테스트</strong>
                    <span>
                        ${file.name}의 모든 단어 · 문제 순서와 방향 랜덤
                    </span>
                </button>


                <button
                    class="test-menu-button"
                    id="testMenuEnglish"
                    type="button"
                    ${totalWords ? "" : "disabled"}
                >
                    <strong>
                        ${escapeHTML(file.name)} → 뜻
                    </strong>
                    <span>
                        모든 단어를 ${escapeHTML(file.name)}에서 뜻으로
                    </span>
                </button>


                <button
                    class="test-menu-button"
                    id="testMenuMeaning"
                    type="button"
                    ${totalWords ? "" : "disabled"}
                >
                    <strong>
                        뜻 → ${escapeHTML(file.name)}
                    </strong>
                    <span>
                        모든 단어를 뜻에서 ${escapeHTML(file.name)}으로
                    </span>
                </button>


                <button
                    class="test-menu-button"
                    id="testMenuQuick"
                    type="button"
                    ${totalWords ? "" : "disabled"}
                >
                    <strong>⚡ 빠른 테스트</strong>
                    <span>
                        중요 단어와 자주 틀린 단어를 빠르게 테스트
                    </span>
                </button>

            </div>
        `,
        ""
    );


    $("testMenuAll")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startFileTest(
                    "all"
                );

            }
        );


    $("testMenuEnglish")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startFileTest(
                    "english-to-meaning"
                );

            }
        );


    $("testMenuMeaning")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startFileTest(
                    "meaning-to-english"
                );

            }
        );


    $("testMenuQuick")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                openQuickTestMenu();

            }
        );

}


/* =========================================================
   파일 전체 테스트
   ========================================================= */

function startFileTest(
    type
) {

    const file =
        getFileById(
            currentFileId
        );


    if (!file) {

        return;

    }


    const words =
        file.wordbooks.flatMap(
            workbook =>
                workbook.words
        );


    if (!words.length) {

        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );

        return;

    }


    const questions =
        buildTestQuestions(
            words,
            file,
            null,
            type
        );


    let testName;


    if (
        type ===
        "all"
    ) {

        testName =
            "전체 테스트";

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
        getFileById(
            currentFileId
        );

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


    if (!file || !workbook) {

        return;

    }


    const total =
        workbook.words.length;


    openModal(
        `${workbook.name} 테스트`,
        `
            <div class="test-menu">

                <button
                    class="test-menu-button"
                    id="workbookTestEnglish"
                    type="button"
                    ${total ? "" : "disabled"}
                >
                    <strong>
                        ${escapeHTML(file.name)} → 뜻
                    </strong>
                    <span>
                        이 단어장에 있는 ${total}개 단어
                    </span>
                </button>


                <button
                    class="test-menu-button"
                    id="workbookTestMeaning"
                    type="button"
                    ${total ? "" : "disabled"}
                >
                    <strong>
                        뜻 → ${escapeHTML(file.name)}
                    </strong>
                    <span>
                        이 단어장에 있는 ${total}개 단어
                    </span>
                </button>


                <button
                    class="test-menu-button"
                    id="workbookTestAll"
                    type="button"
                    ${total ? "" : "disabled"}
                >
                    <strong>
                        🔀 전체 테스트
                    </strong>
                    <span>
                        영어 → 뜻 / 뜻 → ${escapeHTML(file.name)} 랜덤
                    </span>
                </button>

            </div>
        `,
        ""
    );


    $("workbookTestEnglish")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startWorkbookTest(
                    "english-to-meaning"
                );

            }
        );


    $("workbookTestMeaning")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startWorkbookTest(
                    "meaning-to-english"
                );

            }
        );


    $("workbookTestAll")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startWorkbookTest(
                    "all"
                );

            }
        );

}


/* =========================================================
   단어장 테스트
   ========================================================= */

function startWorkbookTest(
    type = "all"
) {

    const file =
        getFileById(
            currentFileId
        );

    const workbook =
        getWorkbookById(
            currentFileId,
            currentWorkbookId
        );


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


    if (
        type ===
        "all"
    ) {

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

    const file =
        getFileById(
            currentFileId
        );


    if (!file) {

        return;

    }


    const words =
        file.wordbooks.flatMap(
            workbook =>
                workbook.words
        );


    const important =
        words.filter(
            word =>
                word.important
        ).length;


    const wrong =
        words.filter(
            word =>
                word.wrong > 0
        ).length;


    openModal(
        "빠른 테스트",
        `
            <div class="test-menu">

                <button
                    id="quickImportantButton"
                    class="test-menu-button"
                    type="button"
                    ${important ? "" : "disabled"}
                >
                    <strong>⭐ 중요 단어</strong>
                    <span>
                        ${important}개의 중요 단어
                    </span>
                </button>


                <button
                    id="quickWrongButton"
                    class="test-menu-button"
                    type="button"
                    ${wrong ? "" : "disabled"}
                >
                    <strong>❌ 틀린 단어</strong>
                    <span>
                        ${wrong}개의 틀린 단어
                    </span>
                </button>

            </div>
        `,
        ""
    );


    $("quickImportantButton")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startQuickTest(
                    "important"
                );

            }
        );


    $("quickWrongButton")
        ?.addEventListener(
            "click",
            () => {

                closeModal();

                startQuickTest(
                    "wrong"
                );

            }
        );

}


function startQuickTest(
    mode
) {

    const file =
        getFileById(
            currentFileId
        );


    if (!file) {

        return;

    }


    const allWords =
        file.wordbooks.flatMap(
            workbook =>
                workbook.words
        );


    let words;


    if (
        mode ===
        "important"
    ) {

        words =
            allWords.filter(
                word =>
                    word.important
            );

    } else {

        words =
            allWords.filter(
                word =>
                    word.wrong > 0
            );

    }


    if (!words.length) {

        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );

        return;

    }


    const questions =
        buildTestQuestions(
            words,
            file,
            null,
            "english-to-meaning"
        );


    startTest(
        questions,
        mode === "important"
            ? "중요 단어 빠른 테스트"
            : "틀린 단어 빠른 테스트",
        "english-to-meaning",
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

        timeLeft: getTestTime(),

        autoNextTimer: null

    };


    closeSidebar();

    showPage(
        "testPage"
    );

    updateNavigation(
        ""
    );

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


    $("testQuestionNumber")
        .textContent =
        testState.currentIndex + 1;

    $("testTotalQuestions")
        .textContent =
        total;


    $("testTypeLabel")
        .textContent =
        getDirectionLabel(
            question
        );


    if (
        question.direction ===
        "english-to-meaning"
    ) {

        $("testQuestion")
            .textContent =
            question.word.word;

        $("testAnswerInput")
            .placeholder =
            "뜻을 입력하세요";

    } else {

        $("testQuestion")
            .textContent =
            question.word.meanings[0] ||
            "";

        $("testAnswerInput")
            .placeholder =
            `${question.fileName || "언어"}를 입력하세요`;

    }


    $("testFeedback")
        .className =
        "test-feedback hidden";

    $("testFeedback")
        .innerHTML =
        "";


    $("testSubmitButton")
        .disabled =
        false;

    $("testSubmitButton")
        .textContent =
        "확인";


    $("testAnswerInput")
        .value =
        "";

    $("testAnswerInput")
        .disabled =
        false;


    $("testHint")
        .textContent =
        `문제당 ${getTestTime()}초 · Enter를 눌러 답을 제출할 수 있습니다.`;


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


    $("testTimer")
        .textContent =
        testState.timeLeft;


    testState.timer =
        setInterval(
            () => {

                testState.timeLeft--;

                $("testTimer")
                    .textContent =
                    testState.timeLeft;


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

            },
            1000
        );

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

}


/* =========================================================
   답안 확인
   ========================================================= */

function normalizeAnswer(
    value
) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}


function isAnswerCorrect(
    question,
    answer
) {

    const normalized =
        normalizeAnswer(
            answer
        );


    if (!normalized) {

        return false;

    }


    if (
        question.direction ===
        "english-to-meaning"
    ) {

        return question.word.meanings
            .some(
                meaning =>
                    normalizeAnswer(
                        meaning
                    ) ===
                    normalized
            );

    }


    return normalizeAnswer(
        question.word.word
    ) ===
    normalized;

}


function handleAnswer(
    answer,
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


    testState.answered =
        true;


    stopTimer();


    const correct =
        !timedOut &&
        isAnswerCorrect(
            question,
            answer
        );


    const word =
        question.word;


    if (correct) {

        testState.correct++;

        word.correct =
            Number(word.correct || 0) + 1;

    } else {

        testState.wrong++;

        word.wrong =
            Number(word.wrong || 0) + 1;


        testState.wrongQuestions.push(
            question
        );

    }


    const attempts =
        word.correct +
        word.wrong;


    if (
        attempts > 0 &&
        word.wrong / attempts > 0.7
    ) {

        word.important =
            true;

    }


    saveData();


    showAnswerFeedback(
        question,
        correct,
        timedOut
    );


    $("testAnswerInput")
        .disabled =
        true;

    $("testSubmitButton")
        .disabled =
        true;


    $("testSubmitButton")
        .textContent =
        "다음 문제";


    testState.autoNextTimer =
        setTimeout(
            nextQuestion,
            900
        );

}


function showAnswerFeedback(
    question,
    correct,
    timedOut
) {

    const feedback =
        $("testFeedback");


    feedback.classList.remove(
        "hidden"
    );


    if (correct) {

        feedback.className =
            "test-feedback feedback-correct";

        feedback.innerHTML =
            `
                <strong>정답입니다! 🎉</strong>
            `;

        return;

    }


    const answerText =
        question.direction ===
        "english-to-meaning"
            ? question.word.meanings.join(", ")
            : question.word.word;


    feedback.className =
        "test-feedback feedback-wrong";


    feedback.innerHTML =
        `
            <strong>
                ${
                    timedOut
                        ? "시간이 초과되었습니다."
                        : "아쉬워요. 오답입니다."
                }
            </strong>

            <span>
                정답: ${escapeHTML(answerText)}
            </span>
        `;

}


/* =========================================================
   다음 문제
   ========================================================= */

function nextQuestion() {

    clearTimeout(
        testState.autoNextTimer
    );

    testState.autoNextTimer =
        null;


    testState.currentIndex++;


    if (
        testState.currentIndex >=
        testState.questions.length
    ) {

        finishTest();

        return;

    }


    renderCurrentQuestion();

}


/* =========================================================
   테스트에서 뒤로가기
   ========================================================= */

function goBackFromTest() {

    stopTimer();

    clearTimeout(
        testState.autoNextTimer
    );

    testState.autoNextTimer =
        null;


    if (
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
   테스트 완료
   ========================================================= */

function finishTest() {

    stopTimer();

    clearTimeout(
        testState.autoNextTimer
    );


    const total =
        testState.questions.length;


    const now =
        new Date();


    const record = {

        id: makeId(),

        date:
            now.toISOString(),

        fileName:
            getFileById(
                testState.sourceFileId
            )?.name ||
            "테스트",

        workbookName:
            getWorkbookById(
                testState.sourceFileId,
                testState.sourceWorkbookId
            )?.name ||
            null,

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
        .classList.toggle(
            "hidden",
            testState.wrongQuestions.length === 0
        );


    showPage(
        "resultPage"
    );


    updateNavigation(
        ""
    );

}


/* =========================================================
   틀린 문제 다시 풀기
   ========================================================= */

function retryWrongQuestions() {

    const questions =
        testState.wrongQuestions;


    if (!questions.length) {

        return;

    }


    const shuffled =
        shuffle(
            questions
        );


    startTest(
        shuffled,
        `${testState.testName} · 오답 다시 풀기`,
        testState.testType,
        testState.sourceFileId,
        testState.sourceWorkbookId
    );

}


/* =========================================================
   결과 이동
   ========================================================= */

function goToResultHome() {

    showHomePage();

}


function goToResultBack() {

    if (
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
   기록
   ========================================================= */

function renderStatistics() {

    const records =
        [...appData.testRecords]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    const totalTests =
        records.length;


    const totalQuestions =
        records.reduce(
            (sum, record) =>
                sum +
                Number(record.total || 0),
            0
        );


    const totalCorrect =
        records.reduce(
            (sum, record) =>
                sum +
                Number(record.correct || 0),
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


    $("statisticsSummary")
        .innerHTML = `

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
                <span>✅</span>
                <strong>${totalCorrect}</strong>
                <small>정답</small>
            </div>

            <div class="statistics-card">
                <span>🎯</span>
                <strong>${accuracy}%</strong>
                <small>정답률</small>
            </div>

        `;


    const list =
        $("statisticsList");


    list.innerHTML =
        "";


    if (!records.length) {

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


    records.forEach(
        record => {

            const date =
                new Date(
                    record.date
                );


            const dateText =
                date.toLocaleDateString(
                    "ko-KR",
                    {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }
                );


            const timeText =
                date.toLocaleTimeString(
                    "ko-KR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            const total =
                Number(
                    record.total || 0
                );


            const correct =
                Number(
                    record.correct || 0
                );


            const score =
                total > 0
                    ? Math.round(
                        correct /
                        total *
                        100
                    )
                    : 0;


            const testType =
                record.testName ||
                record.testType ||
                "테스트";


            const location =
                record.workbookName
                    ? `${record.fileName || ""} · ${record.workbookName}`
                    : record.fileName || "";


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "statistic-record";


            item.innerHTML = `

                <div class="statistic-record-info">

                    <strong class="record-date">
                        ${escapeHTML(dateText)}
                    </strong>

                    <span class="record-time">
                        ${escapeHTML(timeText)}
                        · ${correct}/${total}점
                    </span>

                    <small class="record-test-type">
                        ${escapeHTML(testType)}
                        ${
                            location
                                ? ` · ${escapeHTML(location)}`
                                : ""
                        }
                    </small>

                </div>


                <div class="statistic-record-score">

                    <strong>
                        ${score}%
                    </strong>

                    <span>
                        정답률
                    </span>

                </div>

            `;


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   버전 비교
   ========================================================= */

function compareVersions(
    a,
    b
) {

    const aParts =
        String(a)
            .split(".")
            .map(Number);

    const bParts =
        String(b)
            .split(".")
            .map(Number);


    for (
        let i = 0;
        i < Math.max(
            aParts.length,
            bParts.length
        );
        i++
    ) {

        const av =
            aParts[i] || 0;

        const bv =
            bParts[i] || 0;


        if (av > bv) {

            return 1;

        }

        if (av < bv) {

            return -1;

        }

    }


    return 0;

}


function renderUsageGuide() {

    const visible =
        USAGE_GUIDE.filter(
            item => {

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


                return (
                    afterSince &&
                    beforeUntil
                );

            }
        );


    $("usageGuideContent")
        .innerHTML = `

            <div class="guide-version">
                현재 버전 ${APP_VERSION}
            </div>

            ${visible.map(
                item => `

                    <div class="guide-item">

                        <strong>
                            ${escapeHTML(item.title)}
                        </strong>

                        <p>
                            ${escapeHTML(item.text)}
                        </p>

                    </div>

                `
            ).join("")}

        `;


    $("appVersion")
        .textContent =
        APP_VERSION;

}


/* =========================================================
   설정
   ========================================================= */

function renderSettings() {

    $("darkModeToggle")
        .checked =
        appData.theme === "dark";


    $("testTimeSelect")
        .value =
        String(
            getTestTime()
        );


    renderUsageGuide();

}


function toggleTheme(
    isDark
) {

    appData.theme =
        isDark
            ? "dark"
            : "light";


    applyTheme();

    saveData();

}


function applyTheme() {

    document.body
        .classList.toggle(
            "dark-mode",
            appData.theme ===
            "dark"
        );


    $("headerThemeButton")
        .textContent =
        appData.theme ===
        "dark"
            ? "☀️"
            : "🌙";


    $("darkModeToggle")
        && (
            $("darkModeToggle")
                .checked =
            appData.theme ===
            "dark"
        );

}


/* =========================================================
   데이터 내보내기
   ========================================================= */

function exportData() {

    const data =
        JSON.stringify(
            appData,
            null,
            4
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


    link.href =
        url;

    link.download =
        `단어암기장_${new Date()
            .toISOString()
            .slice(0, 10)}.json`;


    link.click();


    URL.revokeObjectURL(
        url
    );


    showToast(
        "데이터를 내보냈습니다."
    );

}


function importDataFromFile(
    file
) {

    if (!file) {

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        event => {

            try {

                const imported =
                    normalizeData(
                        JSON.parse(
                            event.target.result
                        )
                    );


                openModal(
                    "데이터 가져오기",
                    `
                        <p class="modal-message">
                            현재 데이터 대신 가져온 데이터로
                            교체할까요?
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
                            가져오기
                        </button>
                    `
                );


                $("modalConfirmButton")
                    .addEventListener(
                        "click",
                        () => {

                            appData =
                                imported;

                            saveData();

                            closeModal();

                            applyTheme();

                            renderHome();

                            renderSettings();

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
                    "올바른 JSON 파일이 아닙니다.",
                    "error"
                );

            }

        };


    reader.readAsText(
        file
    );

}


/* =========================================================
   모달
   ========================================================= */

function openModal(
    title,
    body,
    footer
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


    $("modalCancelButton")
        ?.addEventListener(
            "click",
            closeModal
        );

}


function closeModal() {

    $("modalOverlay")
        .classList.add(
            "hidden"
        );

}


/* =========================================================
   토스트
   ========================================================= */

function showToast(
    message,
    type = "normal"
) {

    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${
            type === "error"
                ? "toast-error"
                : ""
        }`;


    toast.textContent =
        message;


    $("toastContainer")
        .appendChild(
            toast
        );


    setTimeout(
        () => {

            toast.classList.add(
                "hide"
            );


            setTimeout(
                () =>
                    toast.remove(),
                300
            );

        },
        2500
    );

}


/* =========================================================
   이벤트
   ========================================================= */

function setupEvents() {

    $("addFileButton")
        .addEventListener(
            "click",
            openFileModal
        );


    $("emptyAddFileButton")
        .addEventListener(
            "click",
            openFileModal
        );


    $("addWorkbookButton")
        .addEventListener(
            "click",
            openWorkbookModal
        );


    $("emptyAddWorkbookButton")
        .addEventListener(
            "click",
            openWorkbookModal
        );


    /*
       중요:
       단어 추가 버튼은 실제로는
       현재 단어장 테스트 메뉴를 엶
    */

    $("addWordButton")
        .addEventListener(
            "click",
            openWorkbookTestMenu
        );


    $("bulkAddWordButton")
        .addEventListener(
            "click",
            addBulkWords
        );


    $("bulkWordInput")
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    addBulkWords();

                }

            }
        );


    $("fileTestButton")
        .addEventListener(
            "click",
            openTotalTestMenu
        );


    $("backToHomeButton")
        .addEventListener(
            "click",
            () =>
                showHomePage()
        );


    $("backToFileButton")
        .addEventListener(
            "click",
            () => {

                if (
                    currentFileId
                ) {

                    showFilePage(
                        currentFileId
                    );

                }

            }
        );


    $("testBackButton")
        .addEventListener(
            "click",
            goBackFromTest
        );


    $("testSubmitButton")
        .addEventListener(
            "click",
            () => {

                if (
                    testState.answered
                ) {

                    nextQuestion();

                    return;

                }


                handleAnswer(
                    $("testAnswerInput")
                        .value
                );

            }
        );


    $("testAnswerInput")
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


                if (
                    testState.answered
                ) {

                    nextQuestion();

                } else {

                    handleAnswer(
                        event.target.value
                    );

                }

            }
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


    $("headerHomeButton")
        .addEventListener(
            "click",
            showHomePage
        );


    $("headerThemeButton")
        .addEventListener(
            "click",
            () =>
                toggleTheme(
                    appData.theme !==
                    "dark"
                )
        );


    $("darkModeToggle")
        .addEventListener(
            "change",
            event =>
                toggleTheme(
                    event.target.checked
                )
        );


    $("testTimeSelect")
        .addEventListener(
            "change",
            event => {

                appData.testTime =
                    normalizeTestTime(
                        event.target.value
                    );


                saveData();

                $("testTimeSelect")
                    .value =
                    String(
                        appData.testTime
                    );


                showToast(
                    `문제 제한시간을 ${appData.testTime}초로 설정했습니다.`
                );

            }
        );


    $("exportDataButton")
        .addEventListener(
            "click",
            exportData
        );


    $("importDataButton")
        .addEventListener(
            "click",
            () =>
                $("importFileInput")
                    .click()
        );


    $("importFileInput")
        .addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];


                if (file) {

                    importDataFromFile(
                        file
                    );

                }


                event.target.value =
                    "";

            }
        );


    $("usageGuideButton")
        .addEventListener(
            "click",
            () => {

                const content =
                    $("usageGuideContent");

                const hidden =
                    content.classList.toggle(
                        "hidden"
                    );


                $("usageGuideArrow")
                    .textContent =
                    hidden
                        ? "⌄"
                        : "⌃";

            }
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

                        } else if (
                            page ===
                            "statistics"
                        ) {

                            stopTimer();

                            showPage(
                                "statisticsPage"
                            );

                            updateNavigation(
                                "statistics"
                            );

                            closeSidebar();

                            renderStatistics();

                        } else if (
                            page ===
                            "settings"
                        ) {

                            stopTimer();

                            showPage(
                                "settingsPage"
                            );

                            updateNavigation(
                                "settings"
                            );

                            closeSidebar();

                            renderSettings();

                        }

                    }
                );

            }
        );


    $("mobileMenuButton")
        .addEventListener(
            "click",
            () => {

                $("sidebar")
                    .classList.toggle(
                        "open"
                    );

            }
        );

}


/* =========================================================
   초기화
   ========================================================= */

function initialize() {

    applyTheme();

    setupEvents();

    renderHome();

    renderSettings();


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

}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


/* =========================================================
   기존 inline 호출 호환
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
