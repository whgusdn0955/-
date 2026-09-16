/* =========================================================
   단어장 앱 - app.js
   ========================================================= */

"use strict";

/* =========================================================
   저장소
   ========================================================= */

const STORAGE_KEY = "vocabularyAppData";
const THEME_KEY = "vocabularyAppTheme";

const defaultData = {
    files: [],
    testRecords: []
};

let appData = loadData();

let currentFileId = null;
let currentWorkbookId = null;

let testState = null;
let testTimerInterval = null;

let draggedFileId = null;
let draggedWorkbookId = null;
let draggedWordId = null;


/* =========================================================
   초기화
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});


function initializeApp() {
    applySavedTheme();
    registerServiceWorker();
    bindEvents();

    renderHome();
    showPage("home");
}


/* =========================================================
   localStorage
   ========================================================= */

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(defaultData);
        }

        const parsed = JSON.parse(saved);

        return {
            files: Array.isArray(parsed.files) ? parsed.files : [],
            testRecords: Array.isArray(parsed.testRecords)
                ? parsed.testRecords
                : []
        };
    } catch (error) {
        console.error("데이터 불러오기 실패:", error);

        return structuredClone(defaultData);
    }
}


function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (error) {
        console.error("데이터 저장 실패:", error);
        showToast("데이터 저장에 실패했습니다.", "error");
    }
}


/* =========================================================
   ID 생성
   ========================================================= */

function createId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}


/* =========================================================
   DOM
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   이벤트 연결
   ========================================================= */

function bindEvents() {

    /* 헤더 */
    $("headerHomeButton").addEventListener("click", () => {
        closeMobileSidebar();
        renderHome();
        showPage("home");
    });

    $("headerThemeButton").addEventListener("click", toggleTheme);

    $("mobileMenuButton").addEventListener("click", () => {
        $("sidebar").classList.toggle("mobile-open");
    });


    /* 네비게이션 */
    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            const page = button.dataset.page;

            closeMobileSidebar();

            if (page === "home") {
                renderHome();
            }

            if (page === "statistics") {
                renderStatistics();
            }

            showPage(page);
        });
    });


    document.querySelectorAll(".mobile-nav-item").forEach(button => {
        button.addEventListener("click", () => {
            const page = button.dataset.page;

            if (page === "home") {
                renderHome();
            }

            if (page === "statistics") {
                renderStatistics();
            }

            showPage(page);
        });
    });


    /* 홈 */
    $("addFileButton").addEventListener("click", openAddFileModal);

    $("emptyAddFileButton").addEventListener("click", openAddFileModal);


    /* 파일 */
    $("backToHomeButton").addEventListener("click", () => {
        renderHome();
        showPage("home");
    });

    $("addWorkbookButton").addEventListener(
        "click",
        openAddWorkbookModal
    );

    $("emptyAddWorkbookButton").addEventListener(
        "click",
        openAddWorkbookModal
    );

    $("fileTestButton").addEventListener(
        "click",
        openFileTestSelection
    );


    /* 단어장 */
    $("backToFileButton").addEventListener("click", () => {
        renderFilePage();
        showPage("file");
    });

    $("addWordButton").addEventListener("click", openAddWordModal);

    $("bulkAddWordButton").addEventListener(
        "click",
        handleBulkWordAdd
    );


    /* 설정 */
    $("darkModeToggle").addEventListener(
        "change",
        handleThemeToggle
    );

    $("exportDataButton").addEventListener(
        "click",
        exportData
    );

    $("importDataButton").addEventListener(
        "click",
        () => $("importFileInput").click()
    );

    $("importFileInput").addEventListener(
        "change",
        importData
    );

    $("usageGuideButton").addEventListener(
        "click",
        toggleUsageGuide
    );


    /* 테스트 */
    $("testSubmitButton").addEventListener(
        "click",
        handleTestSubmit
    );

    $("testAnswerInput").addEventListener(
        "keydown",
        handleTestEnter
    );


    /* 결과 */
    $("resultHomeButton").addEventListener("click", () => {
        renderHome();
        showPage("home");
    });

    $("resultBackButton").addEventListener("click", () => {
        if (currentWorkbookId) {
            renderWorkbookPage();
            showPage("workbook");
        } else if (currentFileId) {
            renderFilePage();
            showPage("file");
        } else {
            renderHome();
            showPage("home");
        }
    });

    $("retryWrongButton").addEventListener(
        "click",
        retryWrongQuestions
    );


    /* 모달 */
    $("modalCloseButton").addEventListener(
        "click",
        closeModal
    );

    $("modalOverlay").addEventListener("click", event => {
        if (event.target === $("modalOverlay")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}


/* =========================================================
   페이지
   ========================================================= */

function showPage(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    const target = $(`${page}Page`);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    document.querySelectorAll(".mobile-nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function closeMobileSidebar() {
    $("sidebar").classList.remove("mobile-open");
}


/* =========================================================
   홈
   ========================================================= */

function renderHome() {
    const list = $("fileList");
    const empty = $("emptyFileState");

    list.innerHTML = "";

    if (appData.files.length === 0) {
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    appData.files.forEach((file, index) => {
        const card = document.createElement("div");

        card.className = "file-card";
        card.draggable = true;
        card.dataset.fileId = file.id;

        const workbookCount = file.workbooks.length;

        const wordCount = file.workbooks.reduce(
            (total, workbook) =>
                total + workbook.words.length,
            0
        );

        card.innerHTML = `
            <div class="file-card-main">
                <div class="file-icon">📁</div>

                <div class="file-card-content">
                    <div class="file-card-title">
                        ${escapeHTML(file.name)}
                    </div>

                    <div class="file-card-meta">
                        단어장 ${workbookCount}개 · 단어 ${wordCount}개
                    </div>
                </div>
            </div>

            <div class="file-card-actions">

                <button
                    class="small-icon-button"
                    data-action="rename-file"
                    title="이름 변경"
                >
                    ✏️
                </button>

                <button
                    class="small-icon-button danger"
                    data-action="delete-file"
                    title="삭제"
                >
                    🗑️
                </button>

                <span class="drag-handle" title="드래그하여 순서 변경">
                    ⋮⋮
                </span>
            </div>
        `;

        card.querySelector(".file-card-main").addEventListener(
            "click",
            () => openFile(file.id)
        );

        card.querySelector(
            '[data-action="rename-file"]'
        ).addEventListener(
            "click",
            event => {
                event.stopPropagation();
                openRenameFileModal(file.id);
            }
        );

        card.querySelector(
            '[data-action="delete-file"]'
        ).addEventListener(
            "click",
            event => {
                event.stopPropagation();
                deleteFile(file.id);
            }
        );

        addFileDragEvents(card, file.id);

        list.appendChild(card);
    });
}


function openFile(fileId) {
    currentFileId = fileId;
    currentWorkbookId = null;

    renderFilePage();
    showPage("file");
}


function getCurrentFile() {
    return appData.files.find(
        file => file.id === currentFileId
    );
}


/* =========================================================
   파일 CRUD
   ========================================================= */

function openAddFileModal() {
    openModal(
        "새 파일",
        `
            <div class="form-group">
                <label class="form-label" for="fileNameInput">
                    파일 이름
                </label>

                <input
                    id="fileNameInput"
                    class="form-input"
                    type="text"
                    placeholder="예: 영어 단어"
                    maxlength="100"
                    autocomplete="off"
                >
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="primary-button"
                data-modal-action="save"
            >
                만들기
            </button>
        `
    );

    $("fileNameInput").focus();

    bindModalAction("cancel", closeModal);

    bindModalAction("save", () => {
        const name = $("fileNameInput").value.trim();

        if (!name) {
            showToast("파일 이름을 입력해주세요.", "error");
            return;
        }

        const file = {
            id: createId("file"),
            name,
            workbooks: [],
            createdAt: Date.now()
        };

        appData.files.push(file);

        saveData();
        closeModal();
        renderHome();

        showToast("파일이 추가되었습니다.", "success");
    });

    $("fileNameInput").addEventListener("keydown", event => {
        if (event.key === "Enter") {
            document
                .querySelector('[data-modal-action="save"]')
                ?.click();
        }
    });
}


function openRenameFileModal(fileId) {
    const file = appData.files.find(
        item => item.id === fileId
    );

    if (!file) return;

    openModal(
        "파일 이름 변경",
        `
            <div class="form-group">
                <label class="form-label" for="renameFileInput">
                    파일 이름
                </label>

                <input
                    id="renameFileInput"
                    class="form-input"
                    type="text"
                    value="${escapeAttribute(file.name)}"
                    maxlength="100"
                    autocomplete="off"
                >
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="primary-button"
                data-modal-action="save"
            >
                저장
            </button>
        `
    );

    $("renameFileInput").focus();
    $("renameFileInput").select();

    bindModalAction("cancel", closeModal);

    bindModalAction("save", () => {
        const name = $("renameFileInput").value.trim();

        if (!name) {
            showToast("파일 이름을 입력해주세요.", "error");
            return;
        }

        file.name = name;

        saveData();
        closeModal();
        renderHome();

        if (currentFileId === fileId) {
            renderFilePage();
        }

        showToast("파일 이름이 변경되었습니다.", "success");
    });
}


function deleteFile(fileId) {
    const file = appData.files.find(
        item => item.id === fileId
    );

    if (!file) return;

    openConfirmModal(
        "파일 삭제",
        `"${file.name}" 파일을 삭제할까요?<br><br>
         파일 안의 모든 단어장과 단어도 함께 삭제됩니다.`,
        () => {
            appData.files = appData.files.filter(
                item => item.id !== fileId
            );

            if (currentFileId === fileId) {
                currentFileId = null;
                currentWorkbookId = null;
            }

            saveData();
            renderHome();

            showToast("파일이 삭제되었습니다.", "success");
        }
    );
}


/* =========================================================
   파일 드래그 앤 드롭
   ========================================================= */

function addFileDragEvents(card, fileId) {

    card.addEventListener("dragstart", event => {
        draggedFileId = fileId;

        card.classList.add("dragging");

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
            "text/plain",
            fileId
        );
    });

    card.addEventListener("dragend", () => {
        draggedFileId = null;

        document.querySelectorAll(".file-card").forEach(item => {
            item.classList.remove(
                "dragging",
                "drag-over"
            );
        });
    });

    card.addEventListener("dragover", event => {
        event.preventDefault();

        if (
            draggedFileId &&
            draggedFileId !== fileId
        ) {
            card.classList.add("drag-over");
        }
    });

    card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
    });

    card.addEventListener("drop", event => {
        event.preventDefault();

        card.classList.remove("drag-over");

        if (
            !draggedFileId ||
            draggedFileId === fileId
        ) {
            return;
        }

        reorderFiles(
            draggedFileId,
            fileId
        );
    });
}


function reorderFiles(fromId, toId) {
    const fromIndex = appData.files.findIndex(
        file => file.id === fromId
    );

    const toIndex = appData.files.findIndex(
        file => file.id === toId
    );

    if (fromIndex === -1 || toIndex === -1) {
        return;
    }

    const [moved] = appData.files.splice(
        fromIndex,
        1
    );

    appData.files.splice(
        toIndex,
        0,
        moved
    );

    saveData();
    renderHome();
}


/* =========================================================
   파일 상세
   ========================================================= */

function renderFilePage() {
    const file = getCurrentFile();

    if (!file) {
        renderHome();
        showPage("home");
        return;
    }

    $("currentFileTitle").textContent = file.name;
    $("currentFileBreadcrumb").textContent = file.name;

    const wordCount = file.workbooks.reduce(
        (total, workbook) =>
            total + workbook.words.length,
        0
    );

    $("currentFileDescription").textContent =
        `단어장 ${file.workbooks.length}개 · 단어 ${wordCount}개`;

    const list = $("workbookList");
    const empty = $("emptyWorkbookState");

    list.innerHTML = "";

    if (file.workbooks.length === 0) {
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const sortedWorkbooks = [...file.workbooks].sort(
        (a, b) => {
            const aImportant = getImportantWordCount(a);
            const bImportant = getImportantWordCount(b);

            if (aImportant > 0 && bImportant === 0) {
                return -1;
            }

            if (aImportant === 0 && bImportant > 0) {
                return 1;
            }

            return 0;
        }
    );

    sortedWorkbooks.forEach(workbook => {
        const card = document.createElement("div");

        card.className = "workbook-card";
        card.draggable = true;
        card.dataset.workbookId = workbook.id;

        const importantCount =
            getImportantWordCount(workbook);

        const wrongCount =
            workbook.words.filter(
                word => word.wrongCount > 0
            ).length;

        card.innerHTML = `
            <div class="workbook-icon">📖</div>

            <div class="workbook-main">
                <div class="workbook-title">
                    ${escapeHTML(workbook.name)}
                </div>

                <div class="workbook-meta">
                    ${workbook.words.length}개 단어
                    ${
                        importantCount
                            ? ` · ⭐ ${importantCount}`
                            : ""
                    }
                    ${
                        wrongCount
                            ? ` · ❌ ${wrongCount}`
                            : ""
                    }
                </div>
            </div>

            <div class="workbook-actions">

                <button
                    class="small-icon-button"
                    data-action="test"
                    title="테스트"
                >
                    📝
                </button>

                <button
                    class="small-icon-button"
                    data-action="rename"
                    title="이름 변경"
                >
                    ✏️
                </button>

                <button
                    class="small-icon-button danger"
                    data-action="delete"
                    title="삭제"
                >
                    🗑️
                </button>

                <span
                    class="drag-handle"
                    title="드래그하여 순서 변경"
                >
                    ⋮⋮
                </span>

            </div>
        `;

        card.querySelector(".workbook-main")
            .addEventListener(
                "click",
                () => openWorkbook(workbook.id)
            );

        card.querySelector(
            '[data-action="test"]'
        ).addEventListener(
            "click",
            event => {
                event.stopPropagation();
                openWorkbookTestSelection(
                    workbook.id
                );
            }
        );

        card.querySelector(
            '[data-action="rename"]'
        ).addEventListener(
            "click",
            event => {
                event.stopPropagation();
                openRenameWorkbookModal(
                    workbook.id
                );
            }
        );

        card.querySelector(
            '[data-action="delete"]'
        ).addEventListener(
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

        list.appendChild(card);
    });
}


function openWorkbook(workbookId) {
    currentWorkbookId = workbookId;

    renderWorkbookPage();
    showPage("workbook");
}


function getCurrentWorkbook() {
    const file = getCurrentFile();

    if (!file) return null;

    return file.workbooks.find(
        workbook =>
            workbook.id === currentWorkbookId
    );
}


/* =========================================================
   단어장 CRUD
   ========================================================= */

function openAddWorkbookModal() {
    const file = getCurrentFile();

    if (!file) return;

    openModal(
        "새 단어장",
        `
            <div class="form-group">
                <label class="form-label" for="workbookNameInput">
                    단어장 이름
                </label>

                <input
                    id="workbookNameInput"
                    class="form-input"
                    type="text"
                    placeholder="예: 수능 필수 단어"
                    maxlength="100"
                    autocomplete="off"
                >
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="primary-button"
                data-modal-action="save"
            >
                만들기
            </button>
        `
    );

    $("workbookNameInput").focus();

    bindModalAction("cancel", closeModal);

    bindModalAction("save", () => {
        const name =
            $("workbookNameInput").value.trim();

        if (!name) {
            showToast(
                "단어장 이름을 입력해주세요.",
                "error"
            );
            return;
        }

        file.workbooks.push({
            id: createId("workbook"),
            name,
            words: [],
            createdAt: Date.now()
        });

        saveData();
        closeModal();
        renderFilePage();

        showToast(
            "단어장이 추가되었습니다.",
            "success"
        );
    });
}


function openRenameWorkbookModal(workbookId) {
    const workbook =
        getCurrentFile()?.workbooks.find(
            item => item.id === workbookId
        );

    if (!workbook) return;

    openModal(
        "단어장 이름 변경",
        `
            <div class="form-group">
                <label class="form-label" for="renameWorkbookInput">
                    단어장 이름
                </label>

                <input
                    id="renameWorkbookInput"
                    class="form-input"
                    type="text"
                    value="${escapeAttribute(workbook.name)}"
                    maxlength="100"
                    autocomplete="off"
                >
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="primary-button"
                data-modal-action="save"
            >
                저장
            </button>
        `
    );

    $("renameWorkbookInput").focus();
    $("renameWorkbookInput").select();

    bindModalAction("cancel", closeModal);

    bindModalAction("save", () => {
        const name =
            $("renameWorkbookInput").value.trim();

        if (!name) {
            showToast(
                "단어장 이름을 입력해주세요.",
                "error"
            );
            return;
        }

        workbook.name = name;

        saveData();
        closeModal();
        renderFilePage();

        showToast(
            "단어장 이름이 변경되었습니다.",
            "success"
        );
    });
}


function deleteWorkbook(workbookId) {
    const file = getCurrentFile();

    if (!file) return;

    const workbook =
        file.workbooks.find(
            item => item.id === workbookId
        );

    if (!workbook) return;

    openConfirmModal(
        "단어장 삭제",
        `"${workbook.name}" 단어장을 삭제할까요?<br><br>
         단어장 안의 모든 단어도 함께 삭제됩니다.`,
        () => {
            file.workbooks =
                file.workbooks.filter(
                    item => item.id !== workbookId
                );

            if (
                currentWorkbookId === workbookId
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
   단어장 드래그 앤 드롭
   ========================================================= */

function addWorkbookDragEvents(
    card,
    workbookId
) {
    card.addEventListener(
        "dragstart",
        event => {
            draggedWorkbookId = workbookId;

            card.classList.add("dragging");

            event.dataTransfer.effectAllowed =
                "move";

            event.dataTransfer.setData(
                "text/plain",
                workbookId
            );
        }
    );

    card.addEventListener(
        "dragend",
        () => {
            draggedWorkbookId = null;

            document
                .querySelectorAll(".workbook-card")
                .forEach(item => {
                    item.classList.remove(
                        "dragging",
                        "drag-over"
                    );
                });
        }
    );

    card.addEventListener(
        "dragover",
        event => {
            event.preventDefault();

            if (
                draggedWorkbookId &&
                draggedWorkbookId !== workbookId
            ) {
                card.classList.add("drag-over");
            }
        }
    );

    card.addEventListener(
        "dragleave",
        () => {
            card.classList.remove(
                "drag-over"
            );
        }
    );

    card.addEventListener(
        "drop",
        event => {
            event.preventDefault();

            card.classList.remove(
                "drag-over"
            );

            if (
                !draggedWorkbookId ||
                draggedWorkbookId === workbookId
            ) {
                return;
            }

            reorderWorkbooks(
                draggedWorkbookId,
                workbookId
            );
        }
    );
}


function reorderWorkbooks(
    fromId,
    toId
) {
    const file = getCurrentFile();

    if (!file) return;

    const fromIndex =
        file.workbooks.findIndex(
            item => item.id === fromId
        );

    const toIndex =
        file.workbooks.findIndex(
            item => item.id === toId
        );

    if (
        fromIndex === -1 ||
        toIndex === -1
    ) {
        return;
    }

    const [moved] =
        file.workbooks.splice(
            fromIndex,
            1
        );

    file.workbooks.splice(
        toIndex,
        0,
        moved
    );

    saveData();
    renderFilePage();
}


/* =========================================================
   단어장 상세
   ========================================================= */

function renderWorkbookPage() {
    const workbook = getCurrentWorkbook();

    if (!workbook) {
        renderFilePage();
        showPage("file");
        return;
    }

    $("currentWorkbookTitle").textContent =
        workbook.name;

    $("currentWorkbookBreadcrumb").textContent =
        workbook.name;

    $("wordCountDescription").textContent =
        `${workbook.words.length}개의 단어`;

    $("wordListCount").textContent =
        `${workbook.words.length}개`;

    const list = $("wordList");
    const empty = $("emptyWordState");

    list.innerHTML = "";

    if (workbook.words.length === 0) {
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    workbook.words.forEach(
        (word, index) => {
            const item =
                document.createElement("div");

            item.className = "word-item";
            item.draggable = true;
            item.dataset.wordId = word.id;

            const important =
                isImportantWord(word);

            item.innerHTML = `
                <span class="word-drag">
                    ⋮⋮
                </span>

                <span class="word-index">
                    ${index + 1}
                </span>

                <div class="word-content">

                    <div class="word-english">
                        ${escapeHTML(word.english)}
                    </div>

                    <div class="word-meaning">
                        ${escapeHTML(
                            word.meanings.join(", ")
                        )}
                    </div>

                    <div class="word-badges">

                        ${
                            important
                                ? `
                                    <span class="badge badge-important">
                                        ⭐ 중요
                                    </span>
                                `
                                : ""
                        }

                        ${
                            word.wrongCount > 0
                                ? `
                                    <span class="badge badge-wrong">
                                        ❌ ${word.wrongCount}회
                                    </span>
                                `
                                : ""
                        }

                    </div>

                </div>

                <div class="word-actions">

                    <button
                        class="small-icon-button"
                        data-action="edit"
                        title="수정"
                    >
                        ✏️
                    </button>

                    <button
                        class="small-icon-button danger"
                        data-action="delete"
                        title="삭제"
                    >
                        🗑️
                    </button>

                </div>
            `;

            item.querySelector(
                '[data-action="edit"]'
            ).addEventListener(
                "click",
                () => openEditWordModal(word.id)
            );

            item.querySelector(
                '[data-action="delete"]'
            ).addEventListener(
                "click",
                () => deleteWord(word.id)
            );

            addWordDragEvents(
                item,
                word.id
            );

            list.appendChild(item);
        }
    );
}


/* =========================================================
   단어 추가
   ========================================================= */

function openAddWordModal() {
    openModal(
        "단어 추가",
        `
            <div class="form-group">
                <label class="form-label">
                    영어
                </label>

                <input
                    id="wordEnglishInput"
                    class="form-input"
                    type="text"
                    placeholder="apple"
                    autocomplete="off"
                >
            </div>

            <div class="form-group">
                <label class="form-label">
                    뜻
                </label>

                <input
                    id="wordMeaningInput"
                    class="form-input"
                    type="text"
                    placeholder="사과, 과일"
                    autocomplete="off"
                >
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="primary-button"
                data-modal-action="save"
            >
                추가
            </button>
        `
    );

    $("wordEnglishInput").focus();

    bindModalAction("cancel", closeModal);

    bindModalAction("save", () => {
        const english =
            $("wordEnglishInput").value.trim();

        const meaning =
            $("wordMeaningInput").value.trim();

        addSingleWord(
            english,
            meaning
        );
    });
}


function addSingleWord(
    english,
    meaning
) {
    const workbook = getCurrentWorkbook();

    if (!workbook) return;

    if (!english || !meaning) {
        showToast(
            "영어와 뜻을 모두 입력해주세요.",
            "error"
        );
        return;
    }

    const meanings = parseMeanings(meaning);

    if (meanings.length === 0) {
        showToast(
            "뜻을 입력해주세요.",
            "error"
        );
        return;
    }

    if (
        isDuplicateWord(
            workbook,
            english,
            meanings
        )
    ) {
        showToast(
            "같은 단어와 뜻이 이미 등록되어 있습니다.",
            "error"
        );
        return;
    }

    workbook.words.push(
        createWord(
            english,
            meanings
        )
    );

    saveData();
    closeModal();
    renderWorkbookPage();

    showToast(
        "단어가 추가되었습니다.",
        "success"
    );
}


/* =========================================================
   여러 단어 한 번에 추가
   ========================================================= */

function handleBulkWordAdd() {
    const input =
        $("bulkWordInput").value.trim();

    if (!input) {
        showToast(
            "입력할 단어를 작성해주세요.",
            "error"
        );
        return;
    }

    const workbook = getCurrentWorkbook();

    if (!workbook) return;

    const entries = input
        .split("/")
        .map(item => item.trim())
        .filter(Boolean);

    let added = 0;
    let duplicated = 0;
    let invalid = 0;

    entries.forEach(entry => {
        const separatorIndex =
            entry.indexOf(":");

        if (separatorIndex === -1) {
            invalid++;
            return;
        }

        const english =
            entry
                .slice(0, separatorIndex)
                .trim();

        const meaningText =
            entry
                .slice(separatorIndex + 1)
                .trim();

        if (
            !english ||
            !meaningText
        ) {
            invalid++;
            return;
        }

        const meanings =
            parseMeanings(meaningText);

        if (meanings.length === 0) {
            invalid++;
            return;
        }

        if (
            isDuplicateWord(
                workbook,
                english,
                meanings
            )
        ) {
            duplicated++;
            return;
        }

        workbook.words.push(
            createWord(
                english,
                meanings
            )
        );

        added++;
    });

    saveData();

    $("bulkWordInput").value = "";

    renderWorkbookPage();

    let message =
        `${added}개의 단어를 추가했습니다.`;

    if (duplicated > 0) {
        message +=
            ` 중복 ${duplicated}개`;
    }

    if (invalid > 0) {
        message +=
            ` · 형식 오류 ${invalid}개`;
    }

    showToast(
        message,
        added > 0 ? "success" : "error"
    );
}


function createWord(
    english,
    meanings
) {
    return {
        id: createId("word"),
        english: english.trim(),
        meanings: meanings
            .map(item => item.trim())
            .filter(Boolean),
        attemptCount: 0,
        wrongCount: 0,
        createdAt: Date.now()
    };
}


function parseMeanings(text) {
    return text
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}


function isDuplicateWord(
    workbook,
    english,
    meanings
) {
    const normalizedEnglish =
        normalizeEnglish(english);

    const normalizedMeanings =
        meanings.map(normalizeText);

    return workbook.words.some(word => {

        if (
            normalizeEnglish(word.english) !==
            normalizedEnglish
        ) {
            return false;
        }

        if (
            word.meanings.length !==
            normalizedMeanings.length
        ) {
            return false;
        }

        return word.meanings.every(
            (meaning, index) =>
                normalizeText(meaning) ===
                normalizedMeanings[index]
        );
    });
}


/* =========================================================
   단어 수정
   ========================================================= */

function openEditWordModal(wordId) {
    const workbook = getCurrentWorkbook();

    if (!workbook) return;

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) return;

    openModal(
        "단어 수정",
        `
            <div class="form-group">
                <label class="form-label">
                    영어
                </label>

                <input
                    id="editWordEnglishInput"
                    class="form-input"
                    type="text"
                    value="${escapeAttribute(word.english)}"
                    autocomplete="off"
                >
            </div>

            <div class="form-group">
                <label class="form-label">
                    뜻
                </label>

                <input
                    id="editWordMeaningInput"
                    class="form-input"
                    type="text"
                    value="${escapeAttribute(
                        word.meanings.join(", ")
                    )}"
                    autocomplete="off"
                >
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="primary-button"
                data-modal-action="save"
            >
                저장
            </button>
        `
    );

    $("editWordEnglishInput").focus();

    bindModalAction("cancel", closeModal);

    bindModalAction("save", () => {
        const english =
            $("editWordEnglishInput")
                .value
                .trim();

        const meaning =
            $("editWordMeaningInput")
                .value
                .trim();

        if (!english || !meaning) {
            showToast(
                "영어와 뜻을 모두 입력해주세요.",
                "error"
            );
            return;
        }

        const meanings =
            parseMeanings(meaning);

        const duplicate =
            workbook.words.some(
                other =>
                    other.id !== word.id &&
                    isSameWordData(
                        other,
                        english,
                        meanings
                    )
            );

        if (duplicate) {
            showToast(
                "같은 단어와 뜻이 이미 존재합니다.",
                "error"
            );
            return;
        }

        word.english = english;
        word.meanings = meanings;

        saveData();
        closeModal();
        renderWorkbookPage();

        showToast(
            "단어가 수정되었습니다.",
            "success"
        );
    });
}


function isSameWordData(
    word,
    english,
    meanings
) {
    if (
        normalizeEnglish(word.english) !==
        normalizeEnglish(english)
    ) {
        return false;
    }

    if (
        word.meanings.length !==
        meanings.length
    ) {
        return false;
    }

    return word.meanings.every(
        (meaning, index) =>
            normalizeText(meaning) ===
            normalizeText(meanings[index])
    );
}


function deleteWord(wordId) {
    const workbook = getCurrentWorkbook();

    if (!workbook) return;

    const word =
        workbook.words.find(
            item => item.id === wordId
        );

    if (!word) return;

    openConfirmModal(
        "단어 삭제",
        `"${word.english}" 단어를 삭제할까요?`,
        () => {
            workbook.words =
                workbook.words.filter(
                    item => item.id !== wordId
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
   단어 드래그 앤 드롭
   ========================================================= */

function addWordDragEvents(
    item,
    wordId
) {
    item.addEventListener(
        "dragstart",
        event => {
            draggedWordId = wordId;

            item.classList.add("dragging");

            event.dataTransfer.effectAllowed =
                "move";

            event.dataTransfer.setData(
                "text/plain",
                wordId
            );
        }
    );

    item.addEventListener(
        "dragend",
        () => {
            draggedWordId = null;

            document
                .querySelectorAll(".word-item")
                .forEach(element => {
                    element.classList.remove(
                        "dragging",
                        "drag-over"
                    );
                });
        }
    );

    item.addEventListener(
        "dragover",
        event => {
            event.preventDefault();

            if (
                draggedWordId &&
                draggedWordId !== wordId
            ) {
                item.classList.add(
                    "drag-over"
                );
            }
        }
    );

    item.addEventListener(
        "dragleave",
        () => {
            item.classList.remove(
                "drag-over"
            );
        }
    );

    item.addEventListener(
        "drop",
        event => {
            event.preventDefault();

            item.classList.remove(
                "drag-over"
            );

            if (
                !draggedWordId ||
                draggedWordId === wordId
            ) {
                return;
            }

            reorderWords(
                draggedWordId,
                wordId
            );
        }
    );
}


function reorderWords(
    fromId,
    toId
) {
    const workbook = getCurrentWorkbook();

    if (!workbook) return;

    const fromIndex =
        workbook.words.findIndex(
            word => word.id === fromId
        );

    const toIndex =
        workbook.words.findIndex(
            word => word.id === toId
        );

    if (
        fromIndex === -1 ||
        toIndex === -1
    ) {
        return;
    }

    const [moved] =
        workbook.words.splice(
            fromIndex,
            1
        );

    workbook.words.splice(
        toIndex,
        0,
        moved
    );

    saveData();
    renderWorkbookPage();
}


/* =========================================================
   중요 단어
   ========================================================= */

function isImportantWord(word) {
    if (!word) return false;

    if (
        !Number.isFinite(word.attemptCount) ||
        word.attemptCount <= 0
    ) {
        return false;
    }

    const ratio =
        word.wrongCount /
        word.attemptCount;

    return ratio > 0.7;
}


function getImportantWordCount(workbook) {
    return workbook.words.filter(
        word => isImportantWord(word)
    ).length;
}


/* =========================================================
   테스트 선택
   ========================================================= */

function openFileTestSelection() {
    const file = getCurrentFile();

    if (!file) return;

    const allWords = getAllFileWords(file);

    if (allWords.length === 0) {
        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    openModal(
        "총합 테스트",
        `
            <div class="test-option-list">

                <button
                    class="test-option"
                    data-test-type="all"
                >
                    <span class="test-option-icon">
                        🔀
                    </span>

                    <span class="test-option-text">
                        <strong>전체 테스트</strong>
                        <span>
                            영어 → 뜻과 뜻 → 영어가 섞여 출제됩니다.
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-test-type="file-to-meaning"
                >
                    <span class="test-option-icon">
                        🇬🇧
                    </span>

                    <span class="test-option-text">
                        <strong>파일 이름 → 뜻</strong>
                        <span>
                            영어 단어를 보고 뜻을 입력합니다.
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-test-type="meaning-to-file"
                >
                    <span class="test-option-icon">
                        💭
                    </span>

                    <span class="test-option-text">
                        <strong>뜻 → 파일 이름</strong>
                        <span>
                            뜻을 보고 영어 단어를 입력합니다.
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-test-type="quick"
                >
                    <span class="test-option-icon">
                        ⚡
                    </span>

                    <span class="test-option-text">
                        <strong>빠른 테스트</strong>
                        <span>
                            중요 단어와 틀린 단어만 테스트합니다.
                        </span>
                    </span>
                </button>

            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>
        `
    );

    document.querySelectorAll(
        "[data-test-type]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const type =
                    button.dataset.testType;

                if (type === "quick") {
                    openQuickTestSelection();
                    return;
                }

                closeModal();

                startTest(
                    type,
                    allWords,
                    `${file.name} - ${getTestTypeName(type)}`
                );
            }
        );
    });

    bindModalAction(
        "cancel",
        closeModal
    );
}


function openWorkbookTestSelection(
    workbookId
) {
    const file = getCurrentFile();

    if (!file) return;

    const workbook =
        file.workbooks.find(
            item => item.id === workbookId
        );

    if (!workbook) return;

    if (workbook.words.length === 0) {
        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    currentWorkbookId = workbookId;

    openModal(
        `${workbook.name} 테스트`,
        `
            <div class="test-option-list">

                <button
                    class="test-option"
                    data-test-type="all"
                >
                    <span class="test-option-icon">
                        🔀
                    </span>

                    <span class="test-option-text">
                        <strong>전체 테스트</strong>
                        <span>
                            영어 → 뜻과 뜻 → 영어가 섞여 출제됩니다.
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-test-type="file-to-meaning"
                >
                    <span class="test-option-icon">
                        🇬🇧
                    </span>

                    <span class="test-option-text">
                        <strong>영어 → 뜻</strong>
                        <span>
                            영어 단어를 보고 뜻을 입력합니다.
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-test-type="meaning-to-file"
                >
                    <span class="test-option-icon">
                        💭
                    </span>

                    <span class="test-option-text">
                        <strong>뜻 → 영어</strong>
                        <span>
                            뜻을 보고 영어 단어를 입력합니다.
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-test-type="quick"
                >
                    <span class="test-option-icon">
                        ⚡
                    </span>

                    <span class="test-option-text">
                        <strong>빠른 테스트</strong>
                        <span>
                            중요 단어와 틀린 단어를 선택합니다.
                        </span>
                    </span>
                </button>

            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>
        `
    );

    document.querySelectorAll(
        "[data-test-type]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const type =
                    button.dataset.testType;

                if (type === "quick") {
                    openQuickTestSelection();
                    return;
                }

                closeModal();

                startTest(
                    type,
                    [...workbook.words],
                    `${workbook.name} - ${getTestTypeName(type)}`
                );
            }
        );
    });

    bindModalAction(
        "cancel",
        closeModal
    );
}


function openQuickTestSelection() {
    const workbook = getCurrentWorkbook();

    let words = [];

    if (workbook) {
        words = [...workbook.words];
    } else {
        const file = getCurrentFile();

        if (file) {
            words = getAllFileWords(file);
        }
    }

    const importantWords =
        words.filter(isImportantWord);

    const wrongWords =
        words.filter(
            word => word.wrongCount > 0
        );

    openModal(
        "빠른 테스트",
        `
            <div class="test-option-list">

                <button
                    class="test-option"
                    data-quick-type="important"
                    ${
                        importantWords.length === 0
                            ? "disabled"
                            : ""
                    }
                >
                    <span class="test-option-icon">
                        ⭐
                    </span>

                    <span class="test-option-text">
                        <strong>중요 단어 테스트</strong>
                        <span>
                            ${importantWords.length}개의 중요 단어
                        </span>
                    </span>
                </button>

                <button
                    class="test-option"
                    data-quick-type="wrong"
                    ${
                        wrongWords.length === 0
                            ? "disabled"
                            : ""
                    }
                >
                    <span class="test-option-icon">
                        ❌
                    </span>

                    <span class="test-option-text">
                        <strong>틀린 단어 테스트</strong>
                        <span>
                            ${wrongWords.length}개의 틀린 단어
                        </span>
                    </span>
                </button>

            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>
        `
    );

    document.querySelectorAll(
        "[data-quick-type]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const type =
                    button.dataset.quickType;

                const selectedWords =
                    type === "important"
                        ? importantWords
                        : wrongWords;

                if (
                    selectedWords.length === 0
                ) {
                    return;
                }

                closeModal();

                startTest(
                    "quick",
                    selectedWords,
                    type === "important"
                        ? "⭐ 중요 단어 테스트"
                        : "❌ 틀린 단어 테스트"
                );
            }
        );
    });

    bindModalAction(
        "cancel",
        closeModal
    );
}


function getTestTypeName(type) {
    switch (type) {
        case "all":
            return "전체 테스트";

        case "file-to-meaning":
            return "영어 → 뜻";

        case "meaning-to-file":
            return "뜻 → 영어";

        case "quick":
            return "빠른 테스트";

        default:
            return "테스트";
    }
}


/* =========================================================
   테스트 데이터
   ========================================================= */

function getAllFileWords(file) {
    const result = [];

    file.workbooks.forEach(workbook => {
        workbook.words.forEach(word => {
            result.push({
                ...word,
                sourceFileId: file.id,
                sourceFileName: file.name,
                sourceWorkbookId: workbook.id,
                sourceWorkbookName: workbook.name
            });
        });
    });

    return result;
}


function startTest(
    type,
    words,
    testName
) {
    if (!words || words.length === 0) {
        showToast(
            "테스트할 단어가 없습니다.",
            "error"
        );
        return;
    }

    clearTestTimer();

    let questions = [];

    words.forEach(word => {

        if (type === "all") {
            const direction =
                Math.random() < 0.5
                    ? "english-to-meaning"
                    : "meaning-to-english";

            questions.push(
                createQuestion(
                    word,
                    direction
                )
            );

            return;
        }

        if (
            type === "file-to-meaning"
        ) {
            questions.push(
                createQuestion(
                    word,
                    "english-to-meaning"
                )
            );

            return;
        }

        if (
            type === "meaning-to-file"
        ) {
            questions.push(
                createQuestion(
                    word,
                    "meaning-to-english"
                )
            );

            return;
        }

        if (type === "quick") {
            const direction =
                Math.random() < 0.5
                    ? "english-to-meaning"
                    : "meaning-to-english";

            questions.push(
                createQuestion(
                    word,
                    direction
                )
            );
        }
    });

    questions = shuffle(questions);

    testState = {
        testName,
        type,
        questions,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        answered: false,
        currentCorrect: false,
        wrongQuestions: [],
        startedAt: Date.now()
    };

    showPage("test");

    renderCurrentQuestion();
}


function createQuestion(
    word,
    direction
) {
    const meaning =
        word.meanings[
            Math.floor(
                Math.random() *
                word.meanings.length
            )
        ];

    return {
        wordId: word.id,
        fileId: word.sourceFileId || currentFileId,
        workbookId:
            word.sourceWorkbookId ||
            currentWorkbookId,
        english: word.english,
        meanings: [...word.meanings],
        questionMeaning: meaning,
        direction,
        answered: false,
        userAnswer: "",
        correct: false,
        timeout: false
    };
}


/* =========================================================
   현재 문제 렌더링
   ========================================================= */

function renderCurrentQuestion() {
    if (!testState) return;

    const question =
        testState.questions[
            testState.currentIndex
        ];

    if (!question) {
        finishTest();
        return;
    }

    testState.answered = false;
    testState.currentCorrect = false;

    $("testQuestionNumber").textContent =
        testState.currentIndex + 1;

    $("testTotalQuestions").textContent =
        testState.questions.length;

    const isEnglishQuestion =
        question.direction ===
        "english-to-meaning";

    $("testTypeLabel").textContent =
        isEnglishQuestion
            ? "영어 → 뜻"
            : "뜻 → 영어";

    $("testQuestion").textContent =
        isEnglishQuestion
            ? question.english
            : question.questionMeaning;

    $("testAnswerInput").value = "";
    $("testAnswerInput").disabled = false;

    $("testAnswerInput").classList.remove(
        "correct",
        "wrong"
    );

    $("testFeedback").className =
        "test-feedback hidden";

    $("testFeedback").textContent = "";

    $("testSubmitButton").textContent =
        "확인";

    startQuestionTimer();

    setTimeout(() => {
        $("testAnswerInput").focus();
    }, 50);
}


/* =========================================================
   테스트 타이머
   ========================================================= */

function startQuestionTimer() {
    clearTestTimer();

    let remaining = 10;

    updateTimerDisplay(remaining);

    testTimerInterval = setInterval(() => {
        remaining--;

        updateTimerDisplay(remaining);

        if (remaining <= 0) {
            clearTestTimer();

            if (
                testState &&
                !testState.answered
            ) {
                submitTestAnswer(
                    "",
                    true
                );
            }
        }
    }, 1000);
}


function updateTimerDisplay(seconds) {
    const timer = $("testTimer");
    const container =
        document.querySelector(
            ".timer-container"
        );

    timer.textContent =
        Math.max(0, seconds);

    container.classList.remove(
        "warning",
        "danger"
    );

    if (seconds <= 3) {
        container.classList.add(
            "danger"
        );
    } else if (seconds <= 5) {
        container.classList.add(
            "warning"
        );
    }
}


function clearTestTimer() {
    if (testTimerInterval) {
        clearInterval(
            testTimerInterval
        );

        testTimerInterval = null;
    }
}


/* =========================================================
   테스트 답안
   ========================================================= */

function handleTestEnter(event) {
    if (event.key !== "Enter") {
        return;
    }

    event.preventDefault();

    handleTestSubmit();
}


function handleTestSubmit() {
    if (!testState) return;

    if (!testState.answered) {
        const answer =
            $("testAnswerInput").value;

        submitTestAnswer(
            answer,
            false
        );

        return;
    }

    goToNextQuestion();
}


function submitTestAnswer(
    answer,
    timeout
) {
    if (!testState) return;

    if (testState.answered) {
        return;
    }

    clearTestTimer();

    const question =
        testState.questions[
            testState.currentIndex
        ];

    const normalizedAnswer =
        normalizeAnswer(
            answer,
            question.direction
        );

    const correct =
        checkAnswer(
            question,
            normalizedAnswer
        );

    question.userAnswer =
        answer.trim();

    question.correct = correct;
    question.timeout = timeout;
    question.answered = true;

    testState.answered = true;
    testState.currentCorrect =
        correct;

    updateWordStatistics(
        question,
        correct
    );

    if (correct) {
        testState.correctCount++;
    } else {
        testState.wrongCount++;

        testState.wrongQuestions.push(
            question
        );
    }

    const input =
        $("testAnswerInput");

    const feedback =
        $("testFeedback");

    input.disabled = true;

    input.classList.toggle(
        "correct",
        correct
    );

    input.classList.toggle(
        "wrong",
        !correct
    );

    feedback.className =
        `test-feedback ${
            correct
                ? "correct"
                : timeout
                    ? "timeout"
                    : "wrong"
        }`;

    if (correct) {
        feedback.textContent =
            "✅ 정답입니다!";
    } else if (timeout) {
        feedback.textContent =
            `⏰ 시간 초과! 정답: ${getCorrectAnswerText(question)}`;
    } else {
        feedback.textContent =
            `❌ 오답입니다. 정답: ${getCorrectAnswerText(question)}`;
    }

    $("testSubmitButton").textContent =
        testState.currentIndex ===
        testState.questions.length - 1
            ? "결과 보기"
            : "다음 문제";
}


function checkAnswer(
    question,
    answer
) {
    if (!answer) {
        return false;
    }

    if (
        question.direction ===
        "english-to-meaning"
    ) {
        return question.meanings.some(
            meaning =>
                normalizeText(meaning) ===
                answer
        );
    }

    return (
        normalizeEnglish(
            question.english
        ) === answer
    );
}


function getCorrectAnswerText(question) {
    if (
        question.direction ===
        "english-to-meaning"
    ) {
        return question.meanings.join(", ");
    }

    return question.english;
}


function normalizeAnswer(
    answer,
    direction
) {
    const trimmed =
        answer.trim();

    if (
        direction ===
        "meaning-to-english"
    ) {
        return normalizeEnglish(
            trimmed
        );
    }

    return normalizeText(trimmed);
}


function normalizeText(text) {
    return String(text)
        .trim()
        .replace(/\s+/g, " ");
}


function normalizeEnglish(text) {
    return normalizeText(text)
        .toLowerCase();
}


/* =========================================================
   단어 통계 업데이트
   ========================================================= */

function updateWordStatistics(
    question,
    correct
) {
    let workbook = null;
    let word = null;

    const file =
        appData.files.find(
            item => item.id === question.fileId
        );

    if (!file) return;

    workbook =
        file.workbooks.find(
            item =>
                item.id === question.workbookId
        );

    if (!workbook) return;

    word =
        workbook.words.find(
            item =>
                item.id === question.wordId
        );

    if (!word) return;

    word.attemptCount =
        Number(word.attemptCount || 0) + 1;

    if (!correct) {
        word.wrongCount =
            Number(word.wrongCount || 0) + 1;
    }

    saveData();
}


/* =========================================================
   다음 문제
   ========================================================= */

function goToNextQuestion() {
    if (!testState) return;

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
    if (!testState) return;

    clearTestTimer();

    const total =
        testState.questions.length;

    const correct =
        testState.correctCount;

    const wrong =
        testState.wrongCount;

    const record = {
        id: createId("record"),
        date: Date.now(),
        testName: testState.testName,
        fileName: getTestFileName(),
        total,
        correct,
        wrong
    };

    appData.testRecords.push(record);

    saveData();

    $("resultTestName").textContent =
        testState.testName;

    $("resultCorrect").textContent =
        correct;

    $("resultWrong").textContent =
        wrong;

    $("resultTotal").textContent =
        total;

    $("retryWrongButton").classList.toggle(
        "hidden",
        testState.wrongQuestions.length === 0
    );

    showPage("result");
}


function getTestFileName() {
    if (!testState) {
        return "";
    }

    const question =
        testState.questions[0];

    if (!question) {
        return "";
    }

    const file =
        appData.files.find(
            item =>
                item.id === question.fileId
        );

    return file
        ? file.name
        : "";
}


/* =========================================================
   틀린 문제 다시 풀기
   ========================================================= */

function retryWrongQuestions() {
    if (!testState) return;

    const wrongQuestions =
        testState.wrongQuestions;

    if (
        wrongQuestions.length === 0
    ) {
        showToast(
            "틀린 문제가 없습니다.",
            "error"
        );
        return;
    }

    const questions =
        wrongQuestions.map(question => ({
            ...question,
            answered: false,
            correct: false,
            timeout: false,
            userAnswer: ""
        }));

    testState = {
        testName:
            `${testState.testName} - 오답 다시 풀기`,
        type: "retry",
        questions: shuffle(questions),
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        answered: false,
        currentCorrect: false,
        wrongQuestions: [],
        startedAt: Date.now()
    };

    showPage("test");

    renderCurrentQuestion();
}


/* =========================================================
   통계
   ========================================================= */

function renderStatistics() {
    const records =
        [...appData.testRecords]
            .sort(
                (a, b) =>
                    b.date - a.date
            );

    renderStatisticsSummary(records);

    const list =
        $("statisticsList");

    const empty =
        $("emptyStatisticsState");

    list.innerHTML = "";

    if (records.length === 0) {
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const groups =
        groupStatistics(records);

    groups.forEach(group => {
        const section =
            document.createElement("div");

        section.className =
            "statistics-group";

        section.innerHTML = `
            <h2 class="statistics-group-title">
                ${escapeHTML(group.title)}
            </h2>
        `;

        group.records.forEach(record => {
            const item =
                document.createElement("div");

            item.className =
                "statistics-record";

            item.innerHTML = `
                <div class="statistics-date">
                    ${formatRecordDate(record.date)}
                </div>

                <div>
                    <div class="statistics-test-name">
                        ${escapeHTML(record.testName)}
                    </div>

                    <div class="statistics-file-name">
                        ${escapeHTML(record.fileName || "알 수 없음")}
                    </div>
                </div>

                <div class="statistics-number">
                    총 ${record.total}
                </div>

                <div class="statistics-number correct">
                    정답 ${record.correct}
                </div>

                <div class="statistics-number wrong">
                    오답 ${record.wrong}
                </div>
            `;

            section.appendChild(item);
        });

        list.appendChild(section);
    });
}


function renderStatisticsSummary(records) {
    const totalQuestions =
        records.reduce(
            (sum, record) =>
                sum + record.total,
            0
        );

    const totalCorrect =
        records.reduce(
            (sum, record) =>
                sum + record.correct,
            0
        );

    const totalWrong =
        records.reduce(
            (sum, record) =>
                sum + record.wrong,
            0
        );

    $("statisticsSummary").innerHTML = `
        <div class="stat-summary-card">
            <span>테스트 횟수</span>
            <strong>${records.length}</strong>
        </div>

        <div class="stat-summary-card">
            <span>총 문제 수</span>
            <strong>${totalQuestions}</strong>
        </div>

        <div class="stat-summary-card">
            <span>총 정답 수</span>
            <strong>${totalCorrect}</strong>
        </div>
    `;
}


function groupStatistics(records) {
    const now = new Date();

    const currentYear =
        now.getFullYear();

    const currentMonth =
        now.getMonth();

    const groups = [];

    const currentMonthRecords = [];

    const previousMonthMap =
        new Map();

    const previousYearMap =
        new Map();

    records.forEach(record => {
        const date =
            new Date(record.date);

        const year =
            date.getFullYear();

        const month =
            date.getMonth();

        if (
            year === currentYear &&
            month === currentMonth
        ) {
            currentMonthRecords.push(
                record
            );
            return;
        }

        if (year === currentYear) {
            const key =
                `${year}-${month}`;

            if (!previousMonthMap.has(key)) {
                previousMonthMap.set(
                    key,
                    {
                        title:
                            `${year}년 ${month + 1}월`,
                        records: []
                    }
                );
            }

            previousMonthMap
                .get(key)
                .records.push(record);

            return;
        }

        const key = String(year);

        if (!previousYearMap.has(key)) {
            previousYearMap.set(
                key,
                {
                    title:
                        `${year}년`,
                    records: []
                }
            );
        }

        previousYearMap
            .get(key)
            .records.push(record);
    });

    if (currentMonthRecords.length > 0) {
        groups.push({
            title:
                "이번 달",
            records:
                currentMonthRecords
        });
    }

    const monthGroups =
        [...previousMonthMap.values()]
            .sort(
                (a, b) =>
                    getGroupSortDate(b) -
                    getGroupSortDate(a)
            );

    groups.push(...monthGroups);

    const yearGroups =
        [...previousYearMap.values()]
            .sort(
                (a, b) =>
                    Number(
                        b.title.replace(
                            "년",
                            ""
                        )
                    ) -
                    Number(
                        a.title.replace(
                            "년",
                            ""
                        )
                    )
            );

    yearGroups.forEach(yearGroup => {
        const year =
            Number(
                yearGroup.title.replace(
                    "년",
                    ""
                )
            );

        const recordsByMonth =
            {};

        yearGroup.records.forEach(record => {
            const month =
                new Date(
                    record.date
                ).getMonth();

            if (
                !recordsByMonth[month]
            ) {
                recordsByMonth[month] = [];
            }

            recordsByMonth[month].push(
                record
            );
        });

        Object.keys(recordsByMonth)
            .sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            )
            .forEach(month => {
                groups.push({
                    title:
                        `${year}년 ${Number(month) + 1}월`,
                    records:
                        recordsByMonth[month]
                });
            });
    });

    return groups;
}


function getGroupSortDate(group) {
    const match =
        group.title.match(
            /(\d+)년 (\d+)월/
        );

    if (!match) return 0;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        1
    ).getTime();
}


function formatRecordDate(timestamp) {
    const date =
        new Date(timestamp);

    return date.toLocaleString(
        "ko-KR",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   설정 - 테마
   ========================================================= */

function applySavedTheme() {
    const theme =
        localStorage.getItem(
            THEME_KEY
        );

    if (theme === "dark") {
        document.body.classList.add(
            "dark"
        );

        if ($("darkModeToggle")) {
            $("darkModeToggle").checked =
                true;
        }

        updateThemeButton(true);
    } else {
        document.body.classList.remove(
            "dark"
        );

        if ($("darkModeToggle")) {
            $("darkModeToggle").checked =
                false;
        }

        updateThemeButton(false);
    }
}


function toggleTheme() {
    const isDark =
        document.body.classList.toggle(
            "dark"
        );

    localStorage.setItem(
        THEME_KEY,
        isDark ? "dark" : "light"
    );

    if ($("darkModeToggle")) {
        $("darkModeToggle").checked =
            isDark;
    }

    updateThemeButton(isDark);
}


function handleThemeToggle(event) {
    const isDark =
        event.target.checked;

    document.body.classList.toggle(
        "dark",
        isDark
    );

    localStorage.setItem(
        THEME_KEY,
        isDark ? "dark" : "light"
    );

    updateThemeButton(isDark);
}


function updateThemeButton(isDark) {
    $("headerThemeButton").textContent =
        isDark ? "☀️" : "🌙";
}


/* =========================================================
   사용 방법
   ========================================================= */

function toggleUsageGuide() {
    const content =
        $("usageGuideContent");

    const arrow =
        $("usageGuideArrow");

    const isHidden =
        content.classList.toggle(
            "hidden"
        );

    arrow.textContent =
        isHidden
            ? "⌄"
            : "⌃";
}


/* =========================================================
   데이터 내보내기
   ========================================================= */

function exportData() {
    const exportObject = {
        app: "단어장",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: appData,
        theme:
            localStorage.getItem(
                THEME_KEY
            ) || "light"
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
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    const date =
        new Date()
            .toISOString()
            .slice(0, 10);

    link.download =
        `단어장_백업_${date}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showToast(
        "데이터를 내보냈습니다.",
        "success"
    );
}


/* =========================================================
   데이터 가져오기
   ========================================================= */

function importData(event) {
    const file =
        event.target.files?.[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload = () => {
        try {
            const imported =
                JSON.parse(
                    reader.result
                );

            const importedData =
                imported.data || imported;

            if (
                !importedData ||
                !Array.isArray(
                    importedData.files
                ) ||
                !Array.isArray(
                    importedData.testRecords
                )
            ) {
                throw new Error(
                    "올바른 단어장 데이터가 아닙니다."
                );
            }

            openConfirmModal(
                "데이터 가져오기",
                "현재 데이터를 가져온 데이터로 교체할까요?<br><br>현재 데이터는 덮어쓰여집니다.",
                () => {
                    appData = normalizeImportedData(
                        importedData
                    );

                    if (
                        imported.theme ===
                        "dark"
                    ) {
                        localStorage.setItem(
                            THEME_KEY,
                            "dark"
                        );
                    }

                    saveData();
                    applySavedTheme();

                    currentFileId = null;
                    currentWorkbookId = null;

                    renderHome();
                    showPage("home");

                    showToast(
                        "데이터를 가져왔습니다.",
                        "success"
                    );
                }
            );
        } catch (error) {
            console.error(error);

            showToast(
                "데이터 파일을 읽을 수 없습니다.",
                "error"
            );
        }

        event.target.value = "";
    };

    reader.readAsText(file);
}


function normalizeImportedData(data) {
    return {
        files:
            data.files.map(file => ({
                id:
                    file.id ||
                    createId("file"),

                name:
                    file.name ||
                    "이름 없는 파일",

                createdAt:
                    file.createdAt ||
                    Date.now(),

                workbooks:
                    Array.isArray(
                        file.workbooks
                    )
                        ? file.workbooks.map(
                            workbook => ({
                                id:
                                    workbook.id ||
                                    createId("workbook"),

                                name:
                                    workbook.name ||
                                    "이름 없는 단어장",

                                createdAt:
                                    workbook.createdAt ||
                                    Date.now(),

                                words:
                                    Array.isArray(
                                        workbook.words
                                    )
                                        ? workbook.words.map(
                                            word => ({
                                                id:
                                                    word.id ||
                                                    createId("word"),

                                                english:
                                                    word.english ||
                                                    "",

                                                meanings:
                                                    Array.isArray(
                                                        word.meanings
                                                    )
                                                        ? word.meanings
                                                        : [],

                                                attemptCount:
                                                    Number(
                                                        word.attemptCount ||
                                                        0
                                                    ),

                                                wrongCount:
                                                    Number(
                                                        word.wrongCount ||
                                                        0
                                                    ),

                                                createdAt:
                                                    word.createdAt ||
                                                    Date.now()
                                            })
                                        )
                                        : []
                            })
                        )
                        : []
            })),

        testRecords:
            data.testRecords.map(record => ({
                id:
                    record.id ||
                    createId("record"),

                date:
                    Number(
                        record.date ||
                        Date.now()
                    ),

                testName:
                    record.testName ||
                    "테스트",

                fileName:
                    record.fileName ||
                    "",

                total:
                    Number(
                        record.total ||
                        0
                    ),

                correct:
                    Number(
                        record.correct ||
                        0
                    ),

                wrong:
                    Number(
                        record.wrong ||
                        0
                    )
            }))
    };
}


/* =========================================================
   모달
   ========================================================= */

function openModal(
    title,
    body,
    footer
) {
    $("modalTitle").textContent =
        title;

    $("modalBody").innerHTML =
        body;

    $("modalFooter").innerHTML =
        footer;

    $("modalOverlay").classList.remove(
        "hidden"
    );
}


function closeModal() {
    $("modalOverlay").classList.add(
        "hidden"
    );

    $("modalBody").innerHTML = "";
    $("modalFooter").innerHTML = "";
}


function bindModalAction(
    action,
    callback
) {
    const button =
        document.querySelector(
            `[data-modal-action="${action}"]`
        );

    if (button) {
        button.addEventListener(
            "click",
            callback
        );
    }
}


function openConfirmModal(
    title,
    message,
    onConfirm
) {
    openModal(
        title,
        `
            <div style="
                color: var(--text-secondary);
                font-size: 14px;
                line-height: 1.7;
            ">
                ${message}
            </div>
        `,
        `
            <button
                class="secondary-button"
                data-modal-action="cancel"
            >
                취소
            </button>

            <button
                class="danger-button"
                data-modal-action="confirm"
            >
                삭제
            </button>
        `
    );

    bindModalAction(
        "cancel",
        closeModal
    );

    bindModalAction(
        "confirm",
        () => {
            closeModal();
            onConfirm();
        }
    );
}


/* =========================================================
   토스트
   ========================================================= */

function showToast(
    message,
    type = ""
) {
    const container =
        $("toastContainer");

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3200);
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
   유틸리티
   ========================================================= */

function shuffle(array) {
    const result = [...array];

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


function escapeHTML(value) {
    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(value) {
    return escapeHTML(value);
}


/* =========================================================
   페이지 이탈 방지
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {
        clearTestTimer();

        if (testState) {
            saveData();
        }
    }
);
