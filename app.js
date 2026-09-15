// ================================
// 영어 단어장 앱
// ================================

// 저장 데이터
let data = JSON.parse(localStorage.getItem("vocabularyAppData")) || {
    bundles: []
};

// 현재 선택된 묶음
let currentBundleId = null;

// 현재 테스트 정보
let test = {
    words: [],
    currentIndex: 0,
    correct: 0,
    wrong: 0,
    wrongWords: [],
    mode: "englishToMeaning"
};


// ================================
// 기본 요소
// ================================

const homeScreen = document.getElementById("homeScreen");
const bundleScreen = document.getElementById("bundleScreen");
const testScreen = document.getElementById("testScreen");
const resultScreen = document.getElementById("resultScreen");
const settingsScreen = document.getElementById("settingsScreen");

const bundleList = document.getElementById("bundleList");
const addBundleBtn = document.getElementById("addBundleBtn");

const bundleSearch = document.getElementById("bundleSearch");

const currentBundleName = document.getElementById("currentBundleName");
const currentBundleWordCount = document.getElementById("currentBundleWordCount");

const wordInput = document.getElementById("wordInput");
const addWordsBtn = document.getElementById("addWordsBtn");
const wordInputMessage = document.getElementById("wordInputMessage");

const wordList = document.getElementById("wordList");
const wordSearch = document.getElementById("wordSearch");
const wordSort = document.getElementById("wordSort");

const darkModeBtn = document.getElementById("darkModeBtn");


// ================================
// 저장
// ================================

function saveData() {
    localStorage.setItem(
        "vocabularyAppData",
        JSON.stringify(data)
    );
}


// ================================
// 화면 전환
// ================================

function hideAllScreens() {
    homeScreen.classList.add("hidden");
    bundleScreen.classList.add("hidden");
    testScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    settingsScreen.classList.add("hidden");
}

function showHome() {
    hideAllScreens();
    homeScreen.classList.remove("hidden");
    renderBundles();
    updateSummary();
}

function showBundle() {
    hideAllScreens();
    bundleScreen.classList.remove("hidden");

    const bundle = getCurrentBundle();

    if (!bundle) {
        showHome();
        return;
    }

    currentBundleName.textContent = bundle.name;
    currentBundleWordCount.textContent =
        `단어 ${bundle.words.length}개`;

    renderWords();
}

function showTest() {
    hideAllScreens();
    testScreen.classList.remove("hidden");
}

function showResult() {
    hideAllScreens();
    resultScreen.classList.remove("hidden");
}


// ================================
// 묶음 관련
// ================================

function getCurrentBundle() {
    return data.bundles.find(
        bundle => bundle.id === currentBundleId
    );
}

function createBundle() {

    const name = prompt("묶음 이름을 입력하세요.");

    if (!name || !name.trim()) {
        return;
    }

    const trimmedName = name.trim();

    const duplicate = data.bundles.some(
        bundle => bundle.name === trimmedName
    );

    if (duplicate) {
        alert("같은 이름의 묶음이 이미 있습니다.");
        return;
    }

    const bundle = {
        id: Date.now().toString(),
        name: trimmedName,
        words: []
    };

    data.bundles.push(bundle);

    saveData();
    renderBundles();
    updateSummary();
}

function renameBundle() {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    const newName = prompt(
        "새 묶음 이름을 입력하세요.",
        bundle.name
    );

    if (!newName || !newName.trim()) {
        return;
    }

    const trimmedName = newName.trim();

    const duplicate = data.bundles.some(
        other =>
            other.id !== bundle.id &&
            other.name === trimmedName
    );

    if (duplicate) {
        alert("같은 이름의 묶음이 이미 있습니다.");
        return;
    }

    bundle.name = trimmedName;

    saveData();
    showBundle();
}

function deleteBundle() {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    const confirmed = confirm(
        `"${bundle.name}" 묶음을 삭제할까요?\n모든 단어도 함께 삭제됩니다.`
    );

    if (!confirmed) return;

    data.bundles = data.bundles.filter(
        bundleItem => bundleItem.id !== currentBundleId
    );

    currentBundleId = null;

    saveData();
    showHome();
}


// ================================
// 묶음 표시
// ================================

function renderBundles() {

    bundleList.innerHTML = "";

    const search = bundleSearch.value
        .trim()
        .toLowerCase();

    const filteredBundles = data.bundles.filter(
        bundle =>
            bundle.name.toLowerCase().includes(search)
    );

    if (filteredBundles.length === 0) {

        const empty = document.createElement("p");

        empty.textContent =
            search
                ? "검색 결과가 없습니다."
                : "아직 만든 단어장이 없습니다.";

        empty.className = "help-text";

        bundleList.appendChild(empty);

        return;
    }

    filteredBundles.forEach(bundle => {

        const item = document.createElement("div");

        item.className = "bundle-item";

        item.innerHTML = `
            <div>
                <div class="bundle-name">${escapeHtml(bundle.name)}</div>
                <div class="bundle-count">
                    단어 ${bundle.words.length}개
                </div>
            </div>

            <span>›</span>
        `;

        item.addEventListener("click", () => {

            currentBundleId = bundle.id;

            showBundle();
        });

        bundleList.appendChild(item);
    });
}


// ================================
// 단어 추가
// ================================

function addWords() {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    const input = wordInput.value.trim();

    if (!input) {
        wordInputMessage.textContent =
            "단어를 입력해주세요.";

        return;
    }

    const entries = input
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== "");

    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    entries.forEach(entry => {

        const separatorIndex = entry.indexOf(":");

        if (separatorIndex === -1) {
            invalidCount++;
            return;
        }

        const english =
            entry.slice(0, separatorIndex).trim();

        const meaning =
            entry.slice(separatorIndex + 1).trim();

        if (!english || !meaning) {
            invalidCount++;
            return;
        }

        const duplicate = bundle.words.some(
            word =>
                word.english.toLowerCase() ===
                english.toLowerCase()
        );

        if (duplicate) {
            duplicateCount++;
            return;
        }

        bundle.words.push({
            id: Date.now().toString() +
                Math.random().toString(16).slice(2),

            english: english,

            meaning: meaning,

            important: false,

            wrongCount: 0,

            correctCount: 0,

            lastWrong: null,

            recentCorrect: 0
        });

        addedCount++;
    });

    saveData();

    wordInput.value = "";

    currentBundleWordCount.textContent =
        `단어 ${bundle.words.length}개`;

    renderWords();

    let message =
        `${addedCount}개 추가됨`;

    if (duplicateCount > 0) {
        message += ` / 중복 ${duplicateCount}개`;
    }

    if (invalidCount > 0) {
        message += ` / 형식 오류 ${invalidCount}개`;
    }

    wordInputMessage.textContent = message;

    updateSummary();
}


// ================================
// 단어 수정
// ================================

function editWord(wordId) {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    const word = bundle.words.find(
        item => item.id === wordId
    );

    if (!word) return;

    const english = prompt(
        "영어 단어",
        word.english
    );

    if (english === null) return;

    const meaning = prompt(
        "뜻",
        word.meaning
    );

    if (meaning === null) return;

    if (!english.trim() || !meaning.trim()) {
        alert("영어와 뜻을 모두 입력해주세요.");
        return;
    }

    const duplicate = bundle.words.some(
        item =>
            item.id !== word.id &&
            item.english.toLowerCase() ===
            english.trim().toLowerCase()
    );

    if (duplicate) {
        alert("같은 묶음에 같은 단어가 이미 있습니다.");
        return;
    }

    word.english = english.trim();
    word.meaning = meaning.trim();

    saveData();
    renderWords();
}


// ================================
// 단어 삭제
// ================================

function deleteWord(wordId) {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    const word = bundle.words.find(
        item => item.id === wordId
    );

    if (!word) return;

    if (!confirm(`"${word.english}"을 삭제할까요?`)) {
        return;
    }

    bundle.words = bundle.words.filter(
        item => item.id !== wordId
    );

    saveData();

    currentBundleWordCount.textContent =
        `단어 ${bundle.words.length}개`;

    renderWords();
    updateSummary();
}


// ================================
// 중요 단어
// ================================

function toggleImportant(wordId) {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    const word = bundle.words.find(
        item => item.id === wordId
    );

    if (!word) return;

    word.important = !word.important;

    saveData();
    renderWords();
}


// ================================
// 별 계산
// ================================

function getStars(word) {

    let difficulty = word.wrongCount;

    if (word.recentCorrect >= 3) {
        difficulty = Math.max(
            0,
            difficulty - 1
        );
    }

    if (difficulty >= 6) {
        return "⭐⭐⭐";
    }

    if (difficulty >= 3) {
        return "⭐⭐";
    }

    if (difficulty >= 1) {
        return "⭐";
    }

    return "";
}


// ================================
// 단어 표시
// ================================

function renderWords() {

    const bundle = getCurrentBundle();

    if (!bundle) return;

    wordList.innerHTML = "";

    const search = wordSearch.value
        .trim()
        .toLowerCase();

    let words = bundle.words.filter(
        word =>
            word.english.toLowerCase().includes(search) ||
            word.meaning.toLowerCase().includes(search)
    );

    const sort = wordSort.value;

    if (sort === "alphabetical") {

        words.sort((a, b) =>
            a.english.localeCompare(
                b.english
            )
        );

    } else if (sort === "wrong") {

        words.sort(
            (a, b) =>
                b.wrongCount - a.wrongCount
        );

    } else if (sort === "recentWrong") {

        words.sort(
            (a, b) =>
                (b.lastWrong || 0) -
                (a.lastWrong || 0)
        );

    } else if (sort === "important") {

        words.sort(
            (a, b) =>
                Number(b.important) -
                Number(a.important)
        );
    }

    if (words.length === 0) {

        const empty = document.createElement("p");

        empty.textContent =
            search
                ? "검색 결과가 없습니다."
                : "아직 단어가 없습니다.";

        empty.className = "help-text";

        wordList.appendChild(empty);

        return;
    }

    words.forEach(word => {

        const item = document.createElement("div");

        item.className = "word-item";

        const stars = getStars(word);

        item.innerHTML = `
            <div class="word-main">

                <div class="word-english">
                    ${escapeHtml(word.english)}
                </div>

                <div class="word-meaning">
                    ${escapeHtml(word.meaning)}
                </div>

                ${
                    stars
                        ? `<div class="word-star">${stars}</div>`
                        : ""
                }

                ${
                    word.wrongCount > 0
                        ? `<small>오답 ${word.wrongCount}회</small>`
                        : ""
                }

            </div>

            <div class="word-actions">

                <button
                    type="button"
                    class="important-btn"
                >
                    ${word.important ? "⭐" : "☆"}
                </button>

                <button
                    type="button"
                    class="edit-btn"
                >
                    수정
                </button>

                <button
                    type="button"
                    class="delete-btn"
                >
                    삭제
                </button>

            </div>
        `;

        item
            .querySelector(".important-btn")
            .addEventListener(
                "click",
                () => toggleImportant(word.id)
            );

        item
            .querySelector(".edit-btn")
            .addEventListener(
                "click",
                () => editWord(word.id)
            );

        item
            .querySelector(".delete-btn")
            .addEventListener(
                "click",
                () => deleteWord(word.id)
            );

        wordList.appendChild(item);
    });
}


// ================================
// 테스트 시작
// ================================

function startTest() {

    const bundle = getCurrentBundle();

    if (!bundle || bundle.words.length === 0) {

        alert("테스트할 단어가 없습니다.");

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
        words: shuffle([...bundle.words]),
        currentIndex: 0,
        correct: 0,
        wrong: 0,
        wrongWords: [],
        mode: mode
    };

    showTest();

    showQuestion();
}


// ================================
// 문제 표시
// ================================

function showQuestion() {

    const question =
        test.words[test.currentIndex];

    if (!question) {
        finishTest();
        return;
    }

    const progress =
        document.getElementById("testProgress");

    const questionType =
        document.getElementById("testQuestionType");

    const questionElement =
        document.getElementById("testQuestion");

    const answer =
        document.getElementById("testAnswer");

    const result =
        document.getElementById("answerResult");

    const next =
        document.getElementById("nextQuestionBtn");

    progress.textContent =
        `${test.currentIndex + 1} / ${test.words.length}`;

    if (test.mode === "englishToMeaning") {

        questionType.textContent =
            "다음 단어의 뜻은?";

        questionElement.textContent =
            question.english;

    } else {

        questionType.textContent =
            "다음 뜻의 영어 단어는?";

        questionElement.textContent =
            question.meaning;
    }

    answer.value = "";

    answer.disabled = false;

    result.className =
        "answer-result hidden";

    result.innerHTML = "";

    next.classList.add("hidden");

    answer.focus();
}


// ================================
// 정답 검사
// ================================

function checkAnswer(isDontKnow = false) {

    const question =
        test.words[test.currentIndex];

    if (!question) return;

    const answerElement =
        document.getElementById("testAnswer");

    let userAnswer =
        answerElement.value.trim();

    let correct = false;

    if (!isDontKnow) {

        if (test.mode === "englishToMeaning") {

            const meanings =
                question.meaning
                    .split(/[;,/]/)
                    .map(item =>
                        item.trim().toLowerCase()
                    )
                    .filter(Boolean);

            correct = meanings.includes(
                userAnswer.toLowerCase()
            );

        } else {

            correct =
                question.english
                    .trim()
                    .toLowerCase() ===
                userAnswer.toLowerCase();
        }
    }

    const result =
        document.getElementById("answerResult");

    answerElement.disabled = true;

    if (correct) {

        test.correct++;

        question.correctCount++;
        question.recentCorrect++;

        result.className =
            "answer-result correct-result";

        result.innerHTML =
            "✅ 정답!";

    } else {

        test.wrong++;

        question.wrongCount++;

        question.recentCorrect = 0;

        question.lastWrong =
            Date.now();

        if (!test.wrongWords.some(
            word => word.id === question.id
        )) {
            test.wrongWords.push(question);
        }

        result.className =
            "answer-result wrong-result";

        const correctAnswer =
            test.mode === "englishToMeaning"
                ? question.meaning
                : question.english;

        result.innerHTML = `
            <strong>❌ 오답</strong>
            <br>
            입력한 답:
            ${escapeHtml(
                userAnswer || "모르겠어요"
            )}
            <br>
            정답:
            ${escapeHtml(correctAnswer)}
        `;
    }

    saveData();

    document
        .getElementById("nextQuestionBtn")
        .classList.remove("hidden");
}


// ================================
// 다음 문제
// ================================

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


// ================================
// 테스트 종료
// ================================

function finishTest() {

    const total = test.words.length;

    const accuracy =
        total === 0
            ? 0
            : Math.round(
                (test.correct / total) * 100
            );

    document.getElementById(
        "resultAccuracy"
    ).textContent = `${accuracy}%`;

    document.getElementById(
        "resultTotal"
    ).textContent = total;

    document.getElementById(
        "resultCorrect"
    ).textContent = test.correct;

    document.getElementById(
        "resultWrong"
    ).textContent = test.wrong;

    const wrongContainer =
        document.getElementById(
            "resultWrongWords"
        );

    wrongContainer.innerHTML = "";

    if (test.wrongWords.length === 0) {

        wrongContainer.innerHTML =
            "<p>오답이 없습니다! 🎉</p>";

    } else {

        test.wrongWords.forEach(word => {

            const item =
                document.createElement("p");

            item.textContent =
                `${word.english} — ${word.meaning}`;

            wrongContainer.appendChild(item);
        });
    }

    document.getElementById(
        "retryWrongBtn"
    ).classList.toggle(
        "hidden",
        test.wrongWords.length === 0
    );

    showResult();

    updateSummary();
}


// ================================
// 오답 재시험
// ================================

function retryWrongWords() {

    if (test.wrongWords.length === 0) {
        return;
    }

    test = {
        words: shuffle([...test.wrongWords]),
        currentIndex: 0,
        correct: 0,
        wrong: 0,
        wrongWords: [],
        mode: test.mode
    };

    showTest();
    showQuestion();
}


// ================================
// 유틸리티
// ================================

function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ================================
// 전체 통계
// ================================

function updateSummary() {

    let totalWords = 0;
    let difficultWords = 0;

    data.bundles.forEach(bundle => {

        totalWords += bundle.words.length;

        bundle.words.forEach(word => {

            if (word.wrongCount >= 3) {
                difficultWords++;
            }
        });
    });

    document.getElementById(
        "totalBundleCount"
    ).textContent =
        data.bundles.length;

    document.getElementById(
        "totalWordCount"
    ).textContent =
        totalWords;

    document.getElementById(
        "difficultWordCount"
    ).textContent =
        difficultWords;
}


// ================================
// 다크 모드
// ================================

darkModeBtn.addEventListener(
    "click",
    () => {

        document.body.classList.toggle("dark");

        const dark =
            document.body.classList.contains(
                "dark"
            );

        localStorage.setItem(
            "darkMode",
            dark
        );

        darkModeBtn.textContent =
            dark ? "☀️" : "🌙";
    }
);

if (
    localStorage.getItem("darkMode") === "true"
) {

    document.body.classList.add("dark");

    darkModeBtn.textContent = "☀️";
}


// ================================
// 버튼 이벤트
// ================================

addBundleBtn.addEventListener(
    "click",
    createBundle
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

document.getElementById(
    "startTestBtn"
).addEventListener(
    "click",
    startTest
);

document.getElementById(
    "checkAnswerBtn"
).addEventListener(
    "click",
    () => checkAnswer(false)
);

document.getElementById(
    "dontKnowBtn"
).addEventListener(
    "click",
    () => checkAnswer(true)
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
    showBundle
);

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

bundleSearch.addEventListener(
    "input",
    renderBundles
);

wordSearch.addEventListener(
    "input",
    renderWords
);

wordSort.addEventListener(
    "change",
    renderWords
);


// ================================
// Enter 키
// ================================

document.getElementById(
    "testAnswer"
).addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            const nextButton =
                document.getElementById(
                    "nextQuestionBtn"
                );

            if (
                !nextButton.classList.contains(
                    "hidden"
                )
            ) {

                nextQuestion();

            } else {

                checkAnswer(false);
            }
        }
    }
);


// ================================
// 초기 실행
// ================================

showHome();
