// ========================================
// 영어 단어장 완성 버전
// ========================================

const STORAGE_KEY = "vocabularyAppData";
const DARK_MODE_KEY = "vocabularyDarkMode";


// ========================================
// 데이터
// ========================================

function createEmptyData() {

    return {
        version: 2,
        bundles: [],
        tests: []
    };
}


function makeId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );
}


function loadData() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (saved) {

            const parsed =
                JSON.parse(saved);

            if (
                parsed &&
                Array.isArray(parsed.bundles)
            ) {

                if (!Array.isArray(parsed.tests)) {
                    parsed.tests = [];
                }

                parsed.bundles.forEach(
                    bundle => {

                        if (!Array.isArray(bundle.words)) {
                            bundle.words = [];
                        }

                        bundle.words.forEach(
                            word => {

                                if (
                                    word.important ===
                                    undefined
                                ) {
                                    word.important = false;
                                }

                                if (
                                    word.wrongCount ===
                                    undefined
                                ) {
                                    word.wrongCount = 0;
                                }

                                if (
                                    word.correctCount ===
                                    undefined
                                ) {
                                    word.correctCount = 0;
                                }

                                if (
                                    word.lastWrong ===
                                    undefined
                                ) {
                                    word.lastWrong = null;
                                }

                                if (
                                    word.lastCorrect ===
                                    undefined
                                ) {
                                    word.lastCorrect = null;
                                }

                                if (
                                    word.recentCorrect ===
                                    undefined
                                ) {
                                    word.recentCorrect = 0;
                                }

                                if (!word.id) {
                                    word.id = makeId();
                                }
                            }
                        );

                        if (!bundle.id) {
                            bundle.id = makeId();
                        }
                    }
                );

                return parsed;
            }
        }

        // 예전 버전의 bundles 데이터가 있으면 가져오기
        const oldData =
            localStorage.getItem("bundles");

        if (oldData) {

            const oldBundles =
                JSON.parse(oldData);

            if (Array.isArray(oldBundles)) {

                const newData =
                    createEmptyData();

                newData.bundles =
                    oldBundles.map(
                        bundle => ({
                            id: makeId(),
                            name:
                                bundle.name ||
                                "새 단어장",
                            words: []
                        })
                    );

                return newData;
            }
        }

    } catch (error) {

        console.error(
            "데이터 불러오기 오류:",
            error
        );
    }

    return createEmptyData();
}


let data = loadData();

let currentBundleId = null;


// ========================================
// 테스트 상태
// ========================================

let test = {

    words: [],

    currentIndex: 0,

    correct: 0,

    wrong: 0,

    wrongWords: [],

    mode: "englishToMeaning",

    sourceBundleIds: [],

    previousAccuracy: null,

    title: "테스트"
};


// ========================================
// 요소
// ========================================

const homeScreen =
    document.getElementById(
        "homeScreen"
    );

const bundleScreen =
    document.getElementById(
        "bundleScreen"
    );

const testScreen =
    document.getElementById(
        "testScreen"
    );

const resultScreen =
    document.getElementById(
        "resultScreen"
    );

const statsScreen =
    document.getElementById(
        "statsScreen"
    );

const settingsScreen =
    document.getElementById(
        "settingsScreen"
    );

const bundleList =
    document.getElementById(
        "bundleList"
    );

const addBundleBtn =
    document.getElementById(
        "addBundleBtn"
    );

const bundleSearch =
    document.getElementById(
        "bundleSearch"
    );

const currentBundleName =
    document.getElementById(
        "currentBundleName"
    );

const currentBundleWordCount =
    document.getElementById(
        "currentBundleWordCount"
    );

const wordInput =
    document.getElementById(
        "wordInput"
    );

const addWordsBtn =
    document.getElementById(
        "addWordsBtn"
    );

const wordInputMessage =
    document.getElementById(
        "wordInputMessage"
    );

const wordSearch =
    document.getElementById(
        "wordSearch"
    );

const wordSort =
    document.getElementById(
        "wordSort"
    );

const wordList =
    document.getElementById(
        "wordList"
    );

const darkModeBtn =
    document.getElementById(
        "darkModeBtn"
    );


// ========================================
// 저장
// ========================================

function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


// ========================================
// 화면
// ========================================

function hideAllScreens() {

    homeScreen.classList.add("hidden");
    bundleScreen.classList.add("hidden");
    testScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    statsScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
}


function showHome() {

    hideAllScreens();

    homeScreen.classList.remove(
        "hidden"
    );

    renderBundles();

    updateSummary();
}


function showBundle() {

    const bundle =
        getCurrentBundle();

    if (!bundle) {

        showHome();

        return;
    }

    hideAllScreens();

    bundleScreen.classList.remove(
        "hidden"
    );

    currentBundleName.textContent =
        bundle.name;

    currentBundleWordCount.textContent =
        `단어 ${bundle.words.length}개`;

    renderWords();
}


function showTest() {

    hideAllScreens();

    testScreen.classList.remove(
        "hidden"
    );
}


function showResult() {

    hideAllScreens();

    resultScreen.classList.remove(
        "hidden"
    );
}


function showStats() {

    hideAllScreens();

    statsScreen.classList.remove(
        "hidden"
    );

    renderStats();
}


function showSettings() {

    hideAllScreens();

    settingsScreen.classList.remove(
        "hidden"
    );
}


// ========================================
// 묶음
// ========================================

function getCurrentBundle() {

    return data.bundles.find(
        bundle =>
            bundle.id ===
            currentBundleId
    );
}


function createBundle() {

    const name =
        prompt(
            "묶음 이름을 입력하세요."
        );

    if (
        name === null ||
        !name.trim()
    ) {
        return;
    }

    const trimmed =
        name.trim();

    const duplicate =
        data.bundles.some(
            bundle =>
                bundle.name
                    .toLowerCase() ===
                trimmed.toLowerCase()
        );

    if (duplicate) {

        alert(
            "같은 이름의 묶음이 이미 있습니다."
        );

        return;
    }

    data.bundles.push({

        id: makeId(),

        name: trimmed,

        words: []
    });

    saveData();

    renderBundles();

    updateSummary();
}


function renameBundle() {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    const name =
        prompt(
            "새 묶음 이름",
            bundle.name
        );

    if (
        name === null ||
        !name.trim()
    ) {
        return;
    }

    const trimmed =
        name.trim();

    const duplicate =
        data.bundles.some(
            other =>
                other.id !== bundle.id &&
                other.name
                    .toLowerCase() ===
                trimmed.toLowerCase()
        );

    if (duplicate) {

        alert(
            "같은 이름의 묶음이 있습니다."
        );

        return;
    }

    bundle.name =
        trimmed;

    saveData();

    showBundle();
}


function deleteBundle() {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    const confirmed =
        confirm(
            `"${bundle.name}"을 삭제할까요?\n\n단어 ${bundle.words.length}개도 함께 삭제됩니다.`
        );

    if (!confirmed) {
        return;
    }

    data.bundles =
        data.bundles.filter(
            item =>
                item.id !==
                bundle.id
        );

    currentBundleId = null;

    saveData();

    showHome();
}


// ========================================
// 묶음 순서 변경
// ========================================

function moveBundle(
    index,
    direction
) {

    const newIndex =
        index + direction;

    if (
        newIndex < 0 ||
        newIndex >=
        data.bundles.length
    ) {
        return;
    }

    const temp =
        data.bundles[index];

    data.bundles[index] =
        data.bundles[newIndex];

    data.bundles[newIndex] =
        temp;

    saveData();

    renderBundles();
}


// ========================================
// 묶음 표시
// ========================================

function renderBundles() {

    bundleList.innerHTML = "";

    const search =
        bundleSearch.value
            .trim()
            .toLowerCase();

    const visibleBundles =
        data.bundles.filter(
            bundle =>
                !search ||
                bundle.name
                    .toLowerCase()
                    .includes(search)
        );

    if (
        visibleBundles.length === 0
    ) {

        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "help-text";

        empty.textContent =
            search
                ? "검색 결과가 없습니다."
                : "아직 만든 단어장이 없습니다.";

        bundleList.appendChild(
            empty
        );

        return;
    }

    visibleBundles.forEach(
        bundle => {

            const realIndex =
                data.bundles.findIndex(
                    item =>
                        item.id ===
                        bundle.id
                );

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "bundle-item";

            item.innerHTML = `

                <div>
                    <div class="bundle-name">
                        ${escapeHtml(
                            bundle.name
                        )}
                    </div>

                    <div class="bundle-count">
                        단어 ${bundle.words.length}개
                    </div>
                </div>

                <div class="bundle-actions">

                    <button
                        type="button"
                        class="up-btn"
                        title="위로"
                    >
                        ↑
                    </button>

                    <button
                        type="button"
                        class="down-btn"
                        title="아래로"
                    >
                        ↓
                    </button>

                    <button
                        type="button"
                        class="open-btn"
                    >
                        보기
                    </button>

                </div>
            `;

            const up =
                item.querySelector(
                    ".up-btn"
                );

            const down =
                item.querySelector(
                    ".down-btn"
                );

            const open =
                item.querySelector(
                    ".open-btn"
                );

            up.disabled =
                realIndex === 0;

            down.disabled =
                realIndex ===
                data.bundles.length - 1;

            up.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    moveBundle(
                        realIndex,
                        -1
                    );
                }
            );

            down.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    moveBundle(
                        realIndex,
                        1
                    );
                }
            );

            open.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    openBundle(
                        bundle.id
                    );
                }
            );

            item.addEventListener(
                "click",
                () => {

                    openBundle(
                        bundle.id
                    );
                }
            );

            bundleList.appendChild(
                item
            );
        }
    );
}


function openBundle(id) {

    currentBundleId = id;

    wordSearch.value = "";

    wordSort.value = "input";

    wordInputMessage.textContent = "";

    showBundle();
}


// ========================================
// 단어 입력 파싱
// ========================================

function parseWordInput(text) {

    const pieces =
        text
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

    const entries = [];

    let currentEntry = null;

    pieces.forEach(
        piece => {

            const colon =
                piece.indexOf(":");

            if (colon !== -1) {

                const english =
                    piece
                        .slice(
                            0,
                            colon
                        )
                        .trim();

                const meaning =
                    piece
                        .slice(
                            colon + 1
                        )
                        .trim();

                if (
                    english &&
                    meaning
                ) {

                    currentEntry = {

                        english,

                        meanings: [
                            meaning
                        ]
                    };

                    entries.push(
                        currentEntry
                    );
                }

            } else {

                // 콜론이 없는 부분은
                // 바로 앞 단어의 추가 뜻으로 처리
                if (
                    currentEntry &&
                    piece
                ) {

                    currentEntry.meanings.push(
                        piece
                    );
                }
            }
        }
    );

    return entries;
}


// ========================================
// 단어 추가
// ========================================

function addWords() {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    const text =
        wordInput.value.trim();

    if (!text) {

        wordInputMessage.textContent =
            "단어를 입력해주세요.";

        return;
    }

    const entries =
        parseWordInput(text);

    if (entries.length === 0) {

        wordInputMessage.textContent =
            "입력 형식을 확인해주세요.";

        return;
    }

    let added = 0;
    let duplicate = 0;

    entries.forEach(
        entry => {

            const englishKey =
                normalize(
                    entry.english
                );

            const existing =
                bundle.words.find(
                    word =>
                        normalize(
                            word.english
                        ) ===
                        englishKey
                );

            if (existing) {

                duplicate++;

                // 기존 단어에 새로운 뜻 추가
                entry.meanings.forEach(
                    meaning => {

                        if (
                            !existing.meanings
                        ) {

                            existing.meanings =
                                [
                                    existing.meaning
                                ];
                        }

                        const exists =
                            existing.meanings.some(
                                item =>
                                    normalize(
                                        item
                                    ) ===
                                    normalize(
                                        meaning
                                    )
                            );

                        if (!exists) {

                            existing.meanings.push(
                                meaning
                            );

                            existing.meaning =
                                existing.meanings.join(
                                    ", "
                                );
                        }
                    }
                );

                return;
            }

            const meanings =
                uniqueStrings(
                    entry.meanings
                );

            bundle.words.push({

                id: makeId(),

                english:
                    entry.english,

                meaning:
                    meanings.join(", "),

                meanings:

                    meanings,

                important: false,

                wrongCount: 0,

                correctCount: 0,

                lastWrong: null,

                lastCorrect: null,

                recentCorrect: 0,

                createdAt:
                    Date.now()
            });

            added++;
        }
    );

    saveData();

    wordInput.value = "";

    currentBundleWordCount.textContent =
        `단어 ${bundle.words.length}개`;

    renderWords();

    updateSummary();

    let message =
        `${added}개 추가`;

    if (duplicate > 0) {

        message +=
            ` / 기존 단어에 뜻 추가 ${duplicate}개`;
    }

    wordInputMessage.textContent =
        message;
}


// ========================================
// 단어 뜻 가져오기
// ========================================

function getMeanings(word) {

    if (
        Array.isArray(
            word.meanings
        )
    ) {

        return word.meanings;
    }

    return word.meaning
        .split(/[;,/]/)
        .map(
            item =>
                item.trim()
        )
        .filter(Boolean);
}


// ========================================
// 단어 수정
// ========================================

function editWord(id) {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    const word =
        bundle.words.find(
            item =>
                item.id === id
        );

    if (!word) return;

    const english =
        prompt(
            "영어 단어",
            word.english
        );

    if (english === null) {
        return;
    }

    const meaning =
        prompt(
            "뜻\n여러 뜻은 쉼표로 구분하세요.",
            getMeanings(word).join(
                ", "
            )
        );

    if (meaning === null) {
        return;
    }

    if (
        !english.trim() ||
        !meaning.trim()
    ) {

        alert(
            "영어와 뜻을 모두 입력해주세요."
        );

        return;
    }

    const duplicate =
        bundle.words.some(
            item =>
                item.id !== id &&
                normalize(
                    item.english
                ) ===
                normalize(
                    english
                )
        );

    if (duplicate) {

        alert(
            "같은 묶음에 같은 단어가 이미 있습니다."
        );

        return;
    }

    const meanings =
        meaning
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

    word.english =
        english.trim();

    word.meanings =
        uniqueStrings(
            meanings
        );

    word.meaning =
        word.meanings.join(
            ", "
        );

    saveData();

    renderWords();
}


// ========================================
// 단어 삭제
// ========================================

function deleteWord(id) {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    const word =
        bundle.words.find(
            item =>
                item.id === id
        );

    if (!word) return;

    if (
        !confirm(
            `"${word.english}"을 삭제할까요?`
        )
    ) {
        return;
    }

    bundle.words =
        bundle.words.filter(
            item =>
                item.id !== id
        );

    saveData();

    currentBundleWordCount.textContent =
        `단어 ${bundle.words.length}개`;

    renderWords();

    updateSummary();
}


// ========================================
// 중요 단어
// ========================================

function toggleImportant(id) {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    const word =
        bundle.words.find(
            item =>
                item.id === id
        );

    if (!word) return;

    word.important =
        !word.important;

    saveData();

    renderWords();
}


// ========================================
// 난이도
// ========================================

function getDifficulty(word) {

    let score =
        Number(
            word.wrongCount || 0
        );

    const recentCorrect =
        Number(
            word.recentCorrect || 0
        );

    if (recentCorrect >= 3) {

        score -= 1;
    }

    return Math.max(
        0,
        score
    );
}


function getStars(word) {

    const score =
        getDifficulty(word);

    if (score >= 6) {
        return "⭐⭐⭐";
    }

    if (score >= 3) {
        return "⭐⭐";
    }

    if (score >= 1) {
        return "⭐";
    }

    return "";
}


// ========================================
// 단어 목록
// ========================================

function renderWords() {

    const bundle =
        getCurrentBundle();

    if (!bundle) return;

    wordList.innerHTML = "";

    const search =
        wordSearch.value
            .trim()
            .toLowerCase();

    let words =
        bundle.words.filter(
            word => {

                const meanings =
                    getMeanings(
                        word
                    ).join(" ");

                return (

                    normalize(
                        word.english
                    ).includes(search)

                    ||

                    normalize(
                        meanings
                    ).includes(search)
                );
            }
        );

    switch (
        wordSort.value
    ) {

        case "alphabetical":

            words.sort(
                (a, b) =>
                    a.english.localeCompare(
                        b.english
                    )
            );

            break;


        case "wrong":

            words.sort(
                (a, b) =>
                    b.wrongCount -
                    a.wrongCount
            );

            break;


        case "recentWrong":

            words.sort(
                (a, b) =>
                    (b.lastWrong || 0) -
                    (a.lastWrong || 0)
            );

            break;


        case "important":

            words.sort(
                (a, b) =>
                    Number(
                        b.important
                    ) -
                    Number(
                        a.important
                    )
            );

            break;


        case "difficulty":

            words.sort(
                (a, b) =>
                    getDifficulty(b) -
                    getDifficulty(a)
            );

            break;


        case "input":
        default:

            words.sort(
                (a, b) =>
                    (a.createdAt || 0) -
                    (b.createdAt || 0)
            );
    }


    if (words.length === 0) {

        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "help-text";

        empty.textContent =
            search
                ? "검색 결과가 없습니다."
                : "아직 단어가 없습니다.";

        wordList.appendChild(
            empty
        );

        return;
    }


    words.forEach(
        word => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "word-item";

            const stars =
                getStars(word);

            const meanings =
                getMeanings(
                    word
                ).join(", ");

            item.innerHTML = `

                <div class="word-main">

                    <div class="word-english">
                        ${escapeHtml(
                            word.english
                        )}
                    </div>

                    <div class="word-meaning">
                        ${escapeHtml(
                            meanings
                        )}
                    </div>

                    ${
                        stars
                            ? `
                                <div class="word-star">
                                    ${stars}
                                </div>
                              `
                            : ""
                    }

                    <div class="word-meta">

                        오답 ${word.wrongCount || 0}회

                        ·

                        정답 ${word.correctCount || 0}회

                        ${
                            word.lastWrong
                                ? " · 최근 오답 있음"
                                : ""
                        }

                    </div>

                </div>


                <div class="word-actions">

                    <button
                        type="button"
                        class="${
                            word.important
                                ? "important-active"
                                : ""
                        }"
                        data-important
                    >
                        ${
                            word.important
                                ? "⭐"
                                : "☆"
                        }
                    </button>

                    <button
                        type="button"
                        data-edit
                    >
                        수정
                    </button>

                    <button
                        type="button"
                        class="danger-btn"
                        data-delete
                    >
                        삭제
                    </button>

                </div>
            `;


            item
                .querySelector(
                    "[data-important]"
                )
                .addEventListener(
                    "click",
                    () =>
                        toggleImportant(
                            word.id
                        )
                );


            item
                .querySelector(
                    "[data-edit]"
                )
                .addEventListener(
                    "click",
                    () =>
                        editWord(
                            word.id
                        )
                );


            item
                .querySelector(
                    "[data-delete]"
                )
                .addEventListener(
                    "click",
                    () =>
                        deleteWord(
                            word.id
                        )
                );


            wordList.appendChild(
                item
            );
        }
    );
}


// ========================================
// 테스트 대상 필터
// ========================================

function getAllWords() {

    const result = [];

    data.bundles.forEach(
        bundle => {

            bundle.words.forEach(
                word => {

                    result.push({

                        word,

                        bundleId:
                            bundle.id,

                        bundleName:
                            bundle.name
                    });
                }
            );
        }
    );

    return result;
}


function getWordsFromCurrentBundle() {

    const bundle =
        getCurrentBundle();

    if (!bundle) {
        return [];
    }

    return bundle.words.map(
        word => ({

            word,

            bundleId:
                bundle.id,

            bundleName:
                bundle.name
        })
    );
}


function filterTestWords(
    type
) {

    let items =
        getWordsFromCurrentBundle();

    if (type === "all") {
        return items;
    }


    if (type === "difficult") {

        return items.filter(
            item =>
                getDifficulty(
                    item.word
                ) >= 2
        );
    }


    if (type === "important") {

        return items.filter(
            item =>
                item.word.important
        );
    }


    if (type === "wrong") {

        return items.filter(
            item =>
                item.word.wrongCount > 0
        );
    }

    return items;
}


function filterGlobalWords(
    type
) {

    let items =
        getAllWords();

    if (type === "all") {
        return items;
    }


    if (type === "difficult") {

        return items.filter(
            item =>
                getDifficulty(
                    item.word
                ) >= 2
        );
    }


    if (type === "wrong") {

        return items.filter(
            item =>
                item.word.wrongCount >= 2
        );
    }


    if (type === "important") {

        return items.filter(
            item =>
                item.word.important
        );
    }


    if (type === "recentWrong") {

        return items
            .filter(
                item =>
                    item.word.lastWrong
            )
            .sort(
                (a, b) =>
                    b.word.lastWrong -
                    a.word.lastWrong
            );
    }

    return items;
}


// ========================================
// 테스트 시작
// ========================================

function startTestWithItems(
    items,
    title
) {

    if (
        !items ||
        items.length === 0
    ) {

        alert(
            "테스트할 단어가 없습니다."
        );

        return;
    }

    const modeElement =
        document.querySelector(
            'input[name="testMode"]:checked'
        );

    const mode =
        modeElement
            ? modeElement.value
            : "englishToMeaning";


    test = {

        words:
            shuffle(
                items.map(
                    item => ({
                        ...item.word,
                        _bundleId:
                            item.bundleId,
                        _bundleName:
                            item.bundleName
                    })
                )
            ),

        currentIndex: 0,

        correct: 0,

        wrong: 0,

        wrongWords: [],

        mode,

        sourceBundleIds:
            [
                ...new Set(
                    items.map(
                        item =>
                            item.bundleId
                    )
                )
            ],

        previousAccuracy:
            getPreviousAccuracy(
                [
                    ...new Set(
                        items.map(
                            item =>
                                item.bundleId
                        )
                    )
                ]
            ),

        title:
            title || "테스트"
    };


    showTest();

    showQuestion();
}


function startCurrentBundleTest(
    type,
    title
) {

    const items =
        filterTestWords(
            type
        );

    const modeElement =
        document.querySelector(
            'input[name="testMode"]:checked'
        );

    if (
        !modeElement
    ) {

        alert(
            "테스트 방향을 선택해주세요."
        );

        return;
    }

    startTestWithItems(
        items,
        title
    );
}


// ========================================
// 문제 표시
// ========================================

function showQuestion() {

    const question =
        test.words[
            test.currentIndex
        ];

    if (!question) {

        finishTest();

        return;
    }


    const progress =
        document.getElementById(
            "testProgress"
        );

    const title =
        document.getElementById(
            "testTitle"
        );

    const type =
        document.getElementById(
            "testQuestionType"
        );

    const questionElement =
        document.getElementById(
            "testQuestion"
        );

    const answer =
        document.getElementById(
            "testAnswer"
        );

    const result =
        document.getElementById(
            "answerResult"
        );

    const next =
        document.getElementById(
            "nextQuestionBtn"
        );

    const check =
        document.getElementById(
            "checkAnswerBtn"
        );

    const dontKnow =
        document.getElementById(
            "dontKnowBtn"
        );


    title.textContent =
        test.title;


    progress.textContent =
        `${test.currentIndex + 1} / ${test.words.length}`;


    if (
        test.mode ===
        "englishToMeaning"
    ) {

        type.textContent =
            "다음 단어의 뜻은?";

        questionElement.textContent =
            question.english;

    } else {

        type.textContent =
            "다음 뜻의 영어 단어는?";

        questionElement.textContent =
            getMeanings(
                question
            ).join(", ");
    }


    answer.value = "";

    answer.disabled = false;

    check.disabled = false;

    dontKnow.disabled = false;


    result.className =
        "answer-result hidden";

    result.innerHTML = "";


    next.classList.add(
        "hidden"
    );


    answer.focus();
}


// ========================================
// 정답 검사
// ========================================

function checkAnswer(
    dontKnow = false
) {

    const question =
        test.words[
            test.currentIndex
        ];

    if (!question) {
        return;
    }


    const answer =
        document.getElementById(
            "testAnswer"
        );

    const result =
        document.getElementById(
            "answerResult"
        );

    const check =
        document.getElementById(
            "checkAnswerBtn"
        );

    const dontKnowBtn =
        document.getElementById(
            "dontKnowBtn"
        );


    const userAnswer =
        answer.value.trim();


    let correct = false;


    if (!dontKnow) {

        if (
            test.mode ===
            "englishToMeaning"
        ) {

            const meanings =
                getMeanings(
                    question
                );

            correct =
                meanings.some(
                    meaning =>
                        normalize(
                            meaning
                        ) ===
                        normalize(
                            userAnswer
                        )
                );

        } else {

            correct =
                normalize(
                    question.english
                ) ===
                normalize(
                    userAnswer
                );
        }
    }


    answer.disabled = true;

    check.disabled = true;

    dontKnowBtn.disabled = true;


    if (correct) {

        test.correct++;


        const realWord =
            findRealWord(
                question
            );

        if (realWord) {

            realWord.correctCount =
                Number(
                    realWord.correctCount ||
                    0
                ) + 1;

            realWord.recentCorrect =
                Number(
                    realWord.recentCorrect ||
                    0
                ) + 1;

            realWord.lastCorrect =
                Date.now();
        }


        result.className =
            "answer-result correct-result";

        result.innerHTML =
            `
                <strong>✅ 정답!</strong>
            `;

    } else {

        test.wrong++;


        const realWord =
            findRealWord(
                question
            );


        if (realWord) {

            realWord.wrongCount =
                Number(
                    realWord.wrongCount ||
                    0
                ) + 1;

            realWord.recentCorrect = 0;

            realWord.lastWrong =
                Date.now();
        }


        const wrongWord =
            realWord || question;


        if (
            !test.wrongWords.some(
                item =>
                    item.id ===
                    wrongWord.id
            )
        ) {

            test.wrongWords.push(
                wrongWord
            );
        }


        const correctAnswer =
            test.mode ===
            "englishToMeaning"

                ? getMeanings(
                    question
                ).join(", ")

                : question.english;


        result.className =
            "answer-result wrong-result";


        result.innerHTML = `

            <strong>
                ❌ 오답
            </strong>

            <br>

            입력한 답:
            ${escapeHtml(
                userAnswer ||
                "모르겠어요"
            )}

            <br>

            정답:
            ${escapeHtml(
                correctAnswer
            )}

        `;
    }


    saveData();


    const next =
        document.getElementById(
            "nextQuestionBtn"
        );

    next.classList.remove(
        "hidden"
    );


    if (
        test.currentIndex ===
        test.words.length - 1
    ) {

        next.textContent =
            "결과 보기";

    } else {

        next.textContent =
            "다음 문제";
    }
}


// ========================================
// 다음 문제
// ========================================

function nextQuestion() {

    test.currentIndex++;

    if (
        test.currentIndex >=
        test.words.length
    ) {

        finishTest();

        return;
    }

    showQuestion();
}


// ========================================
// 실제 데이터 단어 찾기
// ========================================

function findRealWord(
    testWord
) {

    for (
        const bundle of data.bundles
    ) {

        const word =
            bundle.words.find(
                item =>
                    item.id ===
                    testWord.id
            );

        if (word) {
            return word;
        }
    }

    return null;
}


// ========================================
// 테스트 결과
// ========================================

function finishTest() {

    const total =
        test.words.length;

    const accuracy =
        total === 0
            ? 0
            : Math.round(
                (
                    test.correct /
                    total
                ) * 100
            );


    document.getElementById(
        "resultAccuracy"
    ).textContent =
        `${accuracy}%`;


    document.getElementById(
        "resultTotal"
    ).textContent =
        total;


    document.getElementById(
        "resultCorrect"
    ).textContent =
        test.correct;


    document.getElementById(
        "resultWrong"
    ).textContent =
        test.wrong;


    const comparison =
        document.getElementById(
            "resultComparison"
        );


    if (
        test.previousAccuracy !==
        null
    ) {

        const difference =
            accuracy -
            test.previousAccuracy;


        if (difference > 0) {

            comparison.textContent =
                `이전보다 ${difference}%p 올랐어요! 📈`;

        } else if (
            difference < 0
        ) {

            comparison.textContent =
                `이전보다 ${Math.abs(difference)}%p 내려갔어요.`;

        } else {

            comparison.textContent =
                "이전 테스트와 같은 정답률이에요.";
        }

    } else {

        comparison.textContent =
            "첫 테스트 기록이에요!";
    }


    const wrongContainer =
        document.getElementById(
            "resultWrongWords"
        );

    wrongContainer.innerHTML = "";


    if (
        test.wrongWords.length === 0
    ) {

        wrongContainer.innerHTML =
            `
                <p>
                    오답이 없습니다! 🎉
                </p>
            `;

    } else {

        test.wrongWords.forEach(
            word => {

                const div =
                    document.createElement(
                        "div"
                    );

                div.className =
                    "wrong-result-word";

                div.innerHTML = `

                    <strong>
                        ${escapeHtml(
                            word.english
                        )}
                    </strong>

                    <br>

                    <span>
                        ${escapeHtml(
                            getMeanings(
                                word
                            ).join(", ")
                        )}
                    </span>
                `;

                wrongContainer.appendChild(
                    div
                );
            }
        );
    }


    document.getElementById(
        "retryWrongBtn"
    ).classList.toggle(
        "hidden",
        test.wrongWords.length === 0
    );


    // 테스트 기록 저장
    data.tests.push({

        id: makeId(),

        date:
            Date.now(),

        total,

        correct:
            test.correct,

        wrong:
            test.wrong,

        accuracy,

        bundleIds:
            test.sourceBundleIds,

        title:
            test.title
    });


    // 최근 기록은 100개만 유지
    if (
        data.tests.length > 100
    ) {

        data.tests =
            data.tests.slice(-100);
    }


    saveData();

    showResult();

    updateSummary();
}


// ========================================
// 이전 정답률
// ========================================

function getPreviousAccuracy(
    bundleIds
) {

    const tests =
        data.tests
            .filter(
                record =>
                    record.bundleIds &&
                    record.bundleIds.some(
                        id =>
                            bundleIds.includes(
                                id
                            )
                    )
            )
            .sort(
                (a, b) =>
                    b.date -
                    a.date
            );

    if (
        tests.length === 0
    ) {

        return null;
    }

    return tests[0].accuracy;
}


// ========================================
// 오답 재시험
// ========================================

function retryWrongWords() {

    if (
        test.wrongWords.length === 0
    ) {
        return;
    }


    const items =
        test.wrongWords.map(
            word => ({

                word,

                bundleId:
                    word._bundleId ||
                    currentBundleId,

                bundleName:
                    word._bundleName ||
                    (
                        getCurrentBundle()
                            ?.name ||
                        ""
                    )
            })
        );


    startTestWithItems(
        items,
        "오답 다시 테스트"
    );
}


// ========================================
// 통계
// ========================================

function renderStats() {

    const allWords =
        getAllWords();


    const total =
        allWords.length;


    const memorized =
        allWords.filter(
            item =>
                item.word.correctCount >= 3 &&
                item.word.wrongCount === 0
        ).length;


    const difficult =
        allWords.filter(
            item =>
                getDifficulty(
                    item.word
                ) >= 3
        ).length;


    const testCount =
        data.tests.length;


    let totalQuestions = 0;
    let totalCorrect = 0;


    data.tests.forEach(
        record => {

            totalQuestions +=
                record.total;

            totalCorrect +=
                record.correct;
        }
    );


    const accuracy =
        totalQuestions === 0
            ? 0
            : Math.round(
                (
                    totalCorrect /
                    totalQuestions
                ) * 100
            );


    document.getElementById(
        "statsTotalWords"
    ).textContent =
        total;


    document.getElementById(
        "statsMemorizedWords"
    ).textContent =
        memorized;


    document.getElementById(
        "statsDifficultWords"
    ).textContent =
        difficult;


    document.getElementById(
        "statsTestCount"
    ).textContent =
        testCount;


    document.getElementById(
        "statsAccuracy"
    ).textContent =
        `${accuracy}%`;


    renderBundleStats();

    renderRecentTests();
}


function renderBundleStats() {

    const container =
        document.getElementById(
            "bundleStats"
        );

    container.innerHTML = "";


    if (
        data.bundles.length === 0
    ) {

        container.innerHTML =
            `
                <p class="help-text">
                    아직 단어장이 없습니다.
                </p>
            `;

        return;
    }


    data.bundles.forEach(
        bundle => {

            const records =
                data.tests.filter(
                    record =>
                        record.bundleIds &&
                        record.bundleIds.includes(
                            bundle.id
                        )
                );


            let questions = 0;
            let correct = 0;


            records.forEach(
                record => {

                    questions +=
                        record.total;

                    correct +=
                        record.correct;
                }
            );


            const accuracy =
                questions === 0
                    ? 0
                    : Math.round(
                        (
                            correct /
                            questions
                        ) * 100
                    );


            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "bundle-stat";


            div.innerHTML = `

                <span>
                    ${escapeHtml(
                        bundle.name
                    )}
                </span>

                <strong>
                    ${accuracy}%
                </strong>

            `;


            container.appendChild(
                div
            );
        }
    );
}


function renderRecentTests() {

    const container =
        document.getElementById(
            "recentTests"
        );

    container.innerHTML = "";


    const records =
        [...data.tests]
            .sort(
                (a, b) =>
                    b.date -
                    a.date
            )
            .slice(0, 10);


    if (
        records.length === 0
    ) {

        container.innerHTML =
            `
                <p class="help-text">
                    아직 테스트 기록이 없습니다.
                </p>
            `;

        return;
    }


    records.forEach(
        record => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "recent-test";


            const date =
                new Date(
                    record.date
                );


            div.innerHTML = `

                <strong>
                    ${escapeHtml(
                        record.title
                    )}
                </strong>

                <br>

                <span>
                    ${date.toLocaleDateString(
                        "ko-KR"
                    )}

                    ·

                    ${record.accuracy}%

                    ·

                    ${record.correct}/${record.total}
                </span>

            `;


            container.appendChild(
                div
            );
        }
    );
}


// ========================================
// 전체 통계
// ========================================

function updateSummary() {

    const allWords =
        getAllWords();


    const difficult =
        allWords.filter(
            item =>
                getDifficulty(
                    item.word
                ) >= 3
        ).length;


    document.getElementById(
        "totalBundleCount"
    ).textContent =
        data.bundles.length;


    document.getElementById(
        "totalWordCount"
    ).textContent =
        allWords.length;


    document.getElementById(
        "difficultWordCount"
    ).textContent =
        difficult;
}


// ========================================
// 데이터 초기화
// ========================================

function resetLearningData() {

    if (
        !confirm(
            "오답 횟수, 정답 횟수, 중요 단어 설정을 제외한 학습 기록을 초기화할까요?"
        )
    ) {
        return;
    }


    data.bundles.forEach(
        bundle => {

            bundle.words.forEach(
                word => {

                    word.wrongCount = 0;

                    word.correctCount = 0;

                    word.lastWrong = null;

                    word.lastCorrect = null;

                    word.recentCorrect = 0;

                    word.important = false;
                }
            );
        }
    );


    data.tests = [];


    saveData();

    alert(
        "학습 기록을 초기화했습니다."
    );

    showHome();
}


// ========================================
// 백업
// ========================================

function exportData() {

    const backup = {

        app:
            "영어 단어장",

        version:
            2,

        exportedAt:
            new Date().toISOString(),

        data
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
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    link.href = url;

    link.download =
        `영어단어장_백업_${date}.json`;


    document.body.appendChild(
        link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );
}


// ========================================
// 복원
// ========================================

function importData(
    file
) {

    const reader =
        new FileReader();


    reader.onload =
        event => {

            try {

                const imported =
                    JSON.parse(
                        event.target.result
                    );


                let newData;


                if (
                    imported.data &&
                    Array.isArray(
                        imported.data.bundles
                    )
                ) {

                    newData =
                        imported.data;

                } else if (
                    Array.isArray(
                        imported.bundles
                    )
                ) {

                    newData =
                        imported;

                } else {

                    throw new Error(
                        "invalid"
                    );
                }


                if (
                    !Array.isArray(
                        newData.tests
                    )
                ) {

                    newData.tests = [];
                }


                data =
                    newData;


                data.bundles.forEach(
                    bundle => {

                        if (!bundle.id) {
                            bundle.id = makeId();
                        }

                        if (
                            !Array.isArray(
                                bundle.words
                            )
                        ) {

                            bundle.words = [];
                        }


                        bundle.words.forEach(
                            word => {

                                if (!word.id) {
                                    word.id = makeId();
                                }

                                if (
                                    !Array.isArray(
                                        word.meanings
                                    )
                                ) {

                                    word.meanings =
                                        word.meaning
                                            ? [
                                                word.meaning
                                            ]
                                            : [];
                                }

                                if (
                                    !word.meaning
                                ) {

                                    word.meaning =
                                        word.meanings.join(
                                            ", "
                                        );
                                }

                                if (
                                    word.wrongCount ===
                                    undefined
                                ) {

                                    word.wrongCount = 0;
                                }

                                if (
                                    word.correctCount ===
                                    undefined
                                ) {

                                    word.correctCount = 0;
                                }

                                if (
                                    word.recentCorrect ===
                                    undefined
                                ) {

                                    word.recentCorrect = 0;
                                }
                            }
                        );
                    }
                );


                saveData();


                currentBundleId =
                    null;


                alert(
                    "데이터를 복원했습니다."
                );


                showHome();

            } catch {

                alert(
                    "올바른 백업 파일이 아닙니다."
                );
            }
        };


    reader.readAsText(
        file
    );
}


// ========================================
// 전체 삭제
// ========================================

function deleteAllData() {

    const confirmed =
        confirm(
            "정말 모든 데이터를 삭제할까요?\n\n단어장, 단어, 오답 기록, 테스트 기록이 모두 삭제됩니다."
        );


    if (!confirmed) {
        return;
    }


    data =
        createEmptyData();


    currentBundleId =
        null;


    saveData();


    alert(
        "모든 데이터를 삭제했습니다."
    );


    showHome();
}


// ========================================
// 다크 모드
// ========================================

function applyDarkMode() {

    const dark =
        localStorage.getItem(
            DARK_MODE_KEY
        ) === "true";


    if (dark) {

        document.body.classList.add(
            "dark"
        );

        darkModeBtn.textContent =
            "☀️";

    } else {

        document.body.classList.remove(
            "dark"
        );

        darkModeBtn.textContent =
            "🌙";
    }
}


darkModeBtn.addEventListener(
    "click",
    () => {

        const dark =
            !document.body.classList.contains(
                "dark"
            );


        if (dark) {

            document.body.classList.add(
                "dark"
            );

        } else {

            document.body.classList.remove(
                "dark"
            );
        }


        localStorage.setItem(
            DARK_MODE_KEY,
            dark
        );


        applyDarkMode();
    }
);


// ========================================
// 유틸리티
// ========================================

function normalize(text) {

    return String(text || "")
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );
}


function uniqueStrings(
    array
) {

    const result = [];

    array.forEach(
        item => {

            const value =
                String(item)
                    .trim();

            if (!value) {
                return;
            }

            const exists =
                result.some(
                    existing =>
                        normalize(
                            existing
                        ) ===
                        normalize(
                            value
                        )
                );

            if (!exists) {

                result.push(
                    value
                );
            }
        }
    );

    return result;
}


function shuffle(
    array
) {

    const result =
        [...array];


    for (
        let i =
            result.length - 1;
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
        ] =
        [
            result[j],
            result[i]
        ];
    }


    return result;
}


function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;
}


// ========================================
// 이벤트
// ========================================

addBundleBtn.addEventListener(
    "click",
    createBundle
);


bundleSearch.addEventListener(
    "input",
    renderBundles
);


document.getElementById(
    "backHomeBtn"
).addEventListener(
    "click",
    showHome
);


document.getElementById(
    "renameBundleBtn"
).addEventListener(
    "click",
    renameBundle
);


document.getElementById(
    "deleteBundleBtn"
).addEventListener(
    "click",
    deleteBundle
);


addWordsBtn.addEventListener(
    "click",
    addWords
);


wordSearch.addEventListener(
    "input",
    renderWords
);


wordSort.addEventListener(
    "change",
    renderWords
);


// ========================================
// 묶음 테스트
// ========================================

document.getElementById(
    "startTestBtn"
).addEventListener(
    "click",
    () =>
        startCurrentBundleTest(
            "all",
            "전체 테스트"
        )
);


document.getElementById(
    "startDifficultTestBtn"
).addEventListener(
    "click",
    () =>
        startCurrentBundleTest(
            "difficult",
            "어려운 단어 테스트"
        )
);


document.getElementById(
    "startImportantTestBtn"
).addEventListener(
    "click",
    () =>
        startCurrentBundleTest(
            "important",
            "중요 단어 테스트"
        )
);


document.getElementById(
    "startWrongTestBtn"
).addEventListener(
    "click",
    () =>
        startCurrentBundleTest(
            "wrong",
            "오답 단어 테스트"
        )
);


// ========================================
// 테스트
// ========================================

document.getElementById(
    "checkAnswerBtn"
).addEventListener(
    "click",
    () =>
        checkAnswer(false)
);


document.getElementById(
    "dontKnowBtn"
).addEventListener(
    "click",
    () =>
        checkAnswer(true)
);


document.getElementById(
    "nextQuestionBtn"
).addEventListener(
    "click",
    nextQuestion
);


document.getElementById(
    "exitTestBtn"
).addEventListener(
    "click",
    () => {

        if (
            confirm(
                "테스트를 종료할까요?"
            )
        ) {

            showBundle();
        }
    }
);


// ========================================
// 결과
// ========================================

document.getElementById(
    "retryWrongBtn"
).addEventListener(
    "click",
    retryWrongWords
);


document.getElementById(
    "resultHomeBtn"
).addEventListener(
    "click",
    showBundle
);


// ========================================
// 빠른 테스트
// ========================================

document.getElementById(
    "quickAllTestBtn"
).addEventListener(
    "click",
    () => {

        const items =
            filterGlobalWords(
                "all"
            );


        startTestWithItems(
            items,
            "전체 단어 테스트"
        );
    }
);


document.getElementById(
    "quickDifficultTestBtn"
).addEventListener(
    "click",
    () => {

        const items =
            filterGlobalWords(
                "difficult"
            );


        startTestWithItems(
            items,
            "어려운 단어 테스트"
        );
    }
);


document.getElementById(
    "quickWrongTestBtn"
).addEventListener(
    "click",
    () => {

        const items =
            filterGlobalWords(
                "wrong"
            );


        startTestWithItems(
            items,
            "자주 틀린 단어 테스트"
        );
    }
);


document.getElementById(
    "quickImportantTestBtn"
).addEventListener(
    "click",
    () => {

        const items =
            filterGlobalWords(
                "important"
            );


        startTestWithItems(
            items,
            "중요 단어 테스트"
        );
    }
);


document.getElementById(
    "quickRecentWrongTestBtn"
).addEventListener(
    "click",
    () => {

        const items =
            filterGlobalWords(
                "recentWrong"
            );


        startTestWithItems(
            items,
            "최근 오답 테스트"
        );
    }
);


// ========================================
// Enter 키
// ========================================

document.getElementById(
    "testAnswer"
).addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Enter" ||
            event.shiftKey
        ) {
            return;
        }


        event.preventDefault();


        const next =
            document.getElementById(
                "nextQuestionBtn"
            );


        if (
            !next.classList.contains(
                "hidden"
            )
        ) {

            nextQuestion();

        } else {

            checkAnswer(false);
        }
    }
);


// ========================================
// 하단 메뉴
// ========================================

document.getElementById(
    "homeNavBtn"
).addEventListener(
    "click",
    showHome
);


document.getElementById(
    "statsNavBtn"
).addEventListener(
    "click",
    showStats
);


document.getElementById(
    "settingsNavBtn"
).addEventListener(
    "click",
    showSettings
);


document.getElementById(
    "backHomeFromStatsBtn"
).addEventListener(
    "click",
    showHome
);


document.getElementById(
    "backHomeFromSettingsBtn"
).addEventListener(
    "click",
    showHome
);


// ========================================
// 백업 / 복원
// ========================================

document.getElementById(
    "exportDataBtn"
).addEventListener(
    "click",
    exportData
);


document.getElementById(
    "importDataBtn"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "importFile"
        ).click();
    }
);


document.getElementById(
    "importFile"
).addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];


        if (file) {

            importData(file);
        }


        event.target.value = "";
    }
);


// ========================================
// 데이터 초기화
// ========================================

document.getElementById(
    "resetLearningBtn"
).addEventListener(
    "click",
    resetLearningData
);


document.getElementById(
    "deleteAllDataBtn"
).addEventListener(
    "click",
    deleteAllData
);


// ========================================
// 초기 실행
// ========================================

applyDarkMode();

showHome();
