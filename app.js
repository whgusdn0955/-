const STORAGE_KEY = "vocab_app_complete_v1";

let data = {
  bundles: [],
  history: [],
  settings: {
    dark: false
  }
};

let currentBundleId = null;

let test = {
  words: [],
  index: 0,
  correct: 0,
  wrong: 0,
  answered: false,
  results: [],
  direction: "en-ko"
};

let lastTestWrong = [];

let modalMode = "add";


// =========================
// 데이터
// =========================

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {

  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch {
      data = {
        bundles: [],
        history: [],
        settings: { dark: false }
      };
    }
  }

  data.bundles ||= [];
  data.history ||= [];
  data.settings ||= {};
  data.settings.dark ||= false;

  data.bundles.forEach(bundle => {
    bundle.words ||= [];
    bundle.createdAt ||= Date.now();

    bundle.words.forEach(word => {
      word.id ||= uid();
      word.wrong ||= 0;
      word.correct ||= 0;
      word.important ||= false;
      word.lastWrong ||= 0;
      word.lastCorrect ||= 0;
      word.recentCorrect ||= 0;
    });
  });

  applyDarkMode();
}

function uid() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}


// =========================
// 기본 화면
// =========================

function showPage(id) {

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.page === id
    );
  });

  if (id === "homePage") renderHome();
  if (id === "statsPage") renderStats();
}

function renderHome() {

  const search =
    document.getElementById("bundleSearch").value
      .trim()
      .toLowerCase();

  const totalWords =
    data.bundles.reduce(
      (sum, b) => sum + b.words.length,
      0
    );

  const learned =
    data.bundles
      .flatMap(b => b.words)
      .filter(w => w.correct > w.wrong && w.correct >= 2)
      .length;

  const difficult =
    data.bundles
      .flatMap(b => b.words)
      .filter(w => difficulty(w) >= 2)
      .length;

  document.getElementById("homeStats").innerHTML = `
    <div class="stat-card">
      <div class="label">묶음</div>
      <div class="value">${data.bundles.length}</div>
    </div>

    <div class="stat-card">
      <div class="label">전체 단어</div>
      <div class="value">${totalWords}</div>
    </div>

    <div class="stat-card">
      <div class="label">암기한 단어</div>
      <div class="value">${learned}</div>
    </div>

    <div class="stat-card">
      <div class="label">어려운 단어</div>
      <div class="value">${difficult}</div>
    </div>
  `;

  const list = data.bundles.filter(b =>
    b.name.toLowerCase().includes(search)
  );

  document.getElementById("bundleList").innerHTML =
    list.length
      ? list.map((bundle, index) => `
        <div class="bundle-item">

          <div
            class="bundle-main"
            onclick="openBundle('${bundle.id}')"
          >
            <div class="bundle-name">
              ${escapeHTML(bundle.name)}
            </div>

            <div class="bundle-count">
              ${bundle.words.length}개
            </div>
          </div>

          <div class="bundle-actions">

            <button
              class="small-btn"
              onclick="moveBundle('${bundle.id}', -1)"
              title="위로"
            >↑</button>

            <button
              class="small-btn"
              onclick="moveBundle('${bundle.id}', 1)"
              title="아래로"
            >↓</button>

          </div>

        </div>
      `).join("")
      : `<div class="card">아직 묶음이 없습니다.</div>`;
}


// =========================
// 묶음
// =========================

function addBundle() {

  modalMode = "add";

  document.getElementById("modalTitle").textContent =
    "묶음 추가";

  document.getElementById("modalInput").value = "";

  document.getElementById("modal").classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("modalInput").focus();
  }, 50);
}

function confirmModal() {

  const input =
    document.getElementById("modalInput");

  const name = input.value.trim();

  if (!name) {
    alert("이름을 입력해주세요.");
    return;
  }

  if (modalMode === "add") {

    data.bundles.push({
      id: uid(),
      name,
      createdAt: Date.now(),
      words: []
    });

    save();
    closeModal();
    renderHome();

  } else if (modalMode === "rename") {

    const bundle = getCurrentBundle();

    if (bundle) {
      bundle.name = name;
      save();
      closeModal();
      renderBundle();
    }
  }
}

function renameBundle() {

  const bundle = getCurrentBundle();

  if (!bundle) return;

  modalMode = "rename";

  document.getElementById("modalTitle").textContent =
    "묶음 이름 변경";

  document.getElementById("modalInput").value =
    bundle.name;

  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

function deleteBundle() {

  const bundle = getCurrentBundle();

  if (!bundle) return;

  if (
    !confirm(
      `"${bundle.name}" 묶음을 삭제할까요?\n\n단어와 학습 기록도 함께 삭제됩니다.`
    )
  ) return;

  data.bundles =
    data.bundles.filter(b => b.id !== bundle.id);

  save();

  currentBundleId = null;

  showPage("homePage");
}

function moveBundle(id, direction) {

  const index =
    data.bundles.findIndex(b => b.id === id);

  if (index < 0) return;

  const target = index + direction;

  if (
    target < 0 ||
    target >= data.bundles.length
  ) return;

  [
    data.bundles[index],
    data.bundles[target]
  ] = [
    data.bundles[target],
    data.bundles[index]
  ];

  save();
  renderHome();
}

function openBundle(id) {

  currentBundleId = id;

  document.getElementById("bundleSearch").value = "";

  showPage("bundlePage");

  renderBundle();
}

function getCurrentBundle() {
  return data.bundles.find(
    b => b.id === currentBundleId
  );
}

function renderBundle() {

  const bundle = getCurrentBundle();

  if (!bundle) {
    showPage("homePage");
    return;
  }

  document.getElementById("bundleTitle").textContent =
    bundle.name;

  document.getElementById("bundleInfo").textContent =
    `총 ${bundle.words.length}개 단어`;

  renderWords();
}


// =========================
// 단어 입력
// =========================

function parseWordInput(text) {

  const parts = text
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  const result = [];

  let current = null;

  for (const part of parts) {

    if (part.includes(":")) {

      const [en, ...meaningParts] =
        part.split(":");

      const english = en.trim();

      const meaning =
        meaningParts
          .join(":")
          .trim();

      if (!english || !meaning) continue;

      current = {
        english,
        meanings: [meaning]
      };

      result.push(current);

    } else if (current) {

      current.meanings.push(part);
    }
  }

  return result;
}

function addWords() {

  const bundle = getCurrentBundle();

  if (!bundle) return;

  const textarea =
    document.getElementById("bulkInput");

  const text = textarea.value.trim();

  if (!text) {
    showInputMessage("입력할 단어가 없습니다.", "wrong");
    return;
  }

  const parsed = parseWordInput(text);

  if (!parsed.length) {
    showInputMessage(
      "형식이 올바르지 않습니다.",
      "wrong"
    );
    return;
  }

  let added = 0;
  let duplicated = 0;

  for (const item of parsed) {

    const exists =
      bundle.words.some(
        w =>
          w.english.toLowerCase() ===
          item.english.toLowerCase()
      );

    if (exists) {
      duplicated++;
      continue;
    }

    bundle.words.push({
      id: uid(),
      english: item.english,
      meanings: item.meanings,
      important: false,
      wrong: 0,
      correct: 0,
      recentCorrect: 0,
      lastWrong: 0,
      lastCorrect: 0,
      createdAt: Date.now()
    });

    added++;
  }

  save();

  textarea.value = "";

  let message = `${added}개 단어를 추가했습니다.`;

  if (duplicated) {
    message += ` ${duplicated}개는 중복되어 제외했습니다.`;
  }

  showInputMessage(message, "correct");

  renderBundle();
}

function showInputMessage(text, type) {

  const box =
    document.getElementById("inputMessage");

  box.className =
    `answer-result ${type}`;

  box.textContent = text;

  setTimeout(() => {
    box.textContent = "";
    box.className = "";
  }, 3000);
}


// =========================
// 단어 표시
// =========================

function difficulty(word) {

  const wrong = word.wrong || 0;
  const correct = word.correct || 0;
  const recent = word.recentCorrect || 0;

  let score = wrong - correct * 0.5;

  score -= recent * 0.5;

  if (score >= 5) return 3;
  if (score >= 2) return 2;
  if (score > 0) return 1;

  return 0;
}

function stars(word) {

  const level = difficulty(word);

  if (level === 3) return "⭐⭐⭐";
  if (level === 2) return "⭐⭐";
  if (level === 1) return "⭐";

  return "☆";
}

function renderWords() {

  const bundle = getCurrentBundle();

  if (!bundle) return;

  const search =
    document.getElementById("wordSearch")
      .value
      .trim()
      .toLowerCase();

  const sort =
    document.getElementById("wordSort").value;

  let words = bundle.words.filter(w => {

    const text =
      `${w.english} ${w.meanings.join(" ")}`.toLowerCase();

    return text.includes(search);
  });

  if (sort === "alpha") {
    words.sort((a,b) =>
      a.english.localeCompare(b.english)
    );
  }

  if (sort === "wrong") {
    words.sort((a,b) =>
      (b.wrong || 0) - (a.wrong || 0)
    );
  }

  if (sort === "recentWrong") {
    words.sort((a,b) =>
      (b.lastWrong || 0) - (a.lastWrong || 0)
    );
  }

  if (sort === "important") {
    words.sort((a,b) =>
      Number(b.important) - Number(a.important)
    );
  }

  if (sort === "difficulty") {
    words.sort((a,b) =>
      difficulty(b) - difficulty(a)
    );
  }

  document.getElementById("wordList").innerHTML =
    words.length
      ? words.map(word => `

        <div class="word-item">

          <div class="word-main">

            <div class="word-en">
              ${escapeHTML(word.english)}
            </div>

            <div class="word-ko">
              ${escapeHTML(word.meanings.join(", "))}
            </div>

            <div class="word-meta">
              난이도 ${stars(word)}
              · 오답 ${word.wrong || 0}
              · 정답 ${word.correct || 0}
            </div>

          </div>

          <div class="word-actions">

            <button
              class="small-btn important ${word.important ? "active" : ""}"
              onclick="toggleImportant('${word.id}')"
              title="중요 단어"
            >
              ${word.important ? "⭐" : "☆"}
            </button>

            <button
              class="small-btn"
              onclick="editWord('${word.id}')"
            >
              ✏️
            </button>

            <button
              class="small-btn"
              onclick="deleteWord('${word.id}')"
            >
              🗑️
            </button>

          </div>

        </div>

      `).join("")
      : `<div class="card">검색 결과가 없습니다.</div>`;
}

function toggleImportant(id) {

  const bundle = getCurrentBundle();

  const word =
    bundle.words.find(w => w.id === id);

  if (!word) return;

  word.important = !word.important;

  save();
  renderWords();
}

function editWord(id) {

  const bundle = getCurrentBundle();

  const word =
    bundle.words.find(w => w.id === id);

  if (!word) return;

  const english =
    prompt("영어 단어", word.english);

  if (english === null) return;

  const meaning =
    prompt(
      "뜻 (여러 뜻은 쉼표로 구분)",
      word.meanings.join(", ")
    );

  if (meaning === null) return;

  const cleanEnglish = english.trim();

  const meanings =
    meaning
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

  if (!cleanEnglish || !meanings.length) {
    alert("영어와 뜻을 입력해주세요.");
    return;
  }

  const duplicate =
    bundle.words.some(
      w =>
        w.id !== id &&
        w.english.toLowerCase() ===
        cleanEnglish.toLowerCase()
    );

  if (duplicate) {
    alert("같은 묶음에 같은 단어가 이미 있습니다.");
    return;
  }

  word.english = cleanEnglish;
  word.meanings = meanings;

  save();
  renderWords();
}

function deleteWord(id) {

  const bundle = getCurrentBundle();

  if (!bundle) return;

  const word =
    bundle.words.find(w => w.id === id);

  if (!word) return;

  if (!confirm(`"${word.english}"을 삭제할까요?`)) {
    return;
  }

  bundle.words =
    bundle.words.filter(w => w.id !== id);

  save();
  renderBundle();
}


// =========================
// 테스트 준비
// =========================

function startBundleTest() {

  const bundle = getCurrentBundle();

  if (!bundle || !bundle.words.length) {
    alert("테스트할 단어가 없습니다.");
    return;
  }

  let words = [...bundle.words];

  if (
    document.getElementById("importantOnly").checked
  ) {
    words =
      words.filter(w => w.important);
  }

  if (
    document.getElementById("wrongOnly").checked
  ) {
    words =
      words.filter(w => w.wrong > 0);
  }

  if (!words.length) {
    alert("조건에 맞는 단어가 없습니다.");
    return;
  }

  const count =
    document.getElementById("countSelect").value;

  if (count !== "all") {
    words = shuffle(words)
      .slice(0, Number(count));
  }

  if (
    document.getElementById("randomCheck").checked
  ) {
    words = shuffle(words);
  }

  startTest(
    words,
    document.getElementById("directionSelect").value
  );
}

function startTest(words, direction = "en-ko") {

  if (!words.length) {
    alert("테스트할 단어가 없습니다.");
    return;
  }

  test = {
    words: [...words],
    index: 0,
    correct: 0,
    wrong: 0,
    answered: false,
    results: [],
    direction
  };

  showPage("testPage");

  renderQuestion();
}

function renderQuestion() {

  if (test.index >= test.words.length) {
    finishTest();
    return;
  }

  const word =
    test.words[test.index];

  let direction = test.direction;

  if (direction === "random") {
    direction =
      Math.random() < 0.5
        ? "en-ko"
        : "ko-en";
  }

  test.currentDirection = direction;
  test.answered = false;

  const question =
    direction === "en-ko"
      ? word.english
      : word.meanings.join(", ");

  document.getElementById("questionDirection")
    .textContent =
      direction === "en-ko"
        ? "영어 → 뜻"
        : "뜻 → 영어";

  document.getElementById("questionText")
    .textContent = question;

  document.getElementById("progressText")
    .textContent =
      `${test.index + 1} / ${test.words.length}`;

  document.getElementById("progressBar")
    .style.width =
      `${(test.index / test.words.length) * 100}%`;

  const input =
    document.getElementById("answerInput");

  input.value = "";
  input.disabled = false;

  document.getElementById("answerResult").innerHTML = "";

  document.getElementById("checkAnswerBtn")
    .disabled = false;

  document.getElementById("dontKnowBtn")
    .disabled = false;

  setTimeout(() => input.focus(), 50);
}


// =========================
// 정답 처리
// =========================

function checkAnswer() {

  if (test.answered) return;

  const word =
    test.words[test.index];

  const input =
    document.getElementById("answerInput");

  const userAnswer =
    input.value.trim();

  if (!userAnswer) {
    alert("답을 입력해주세요.");
    return;
  }

  const correct =
    isAnswerCorrect(
      userAnswer,
      word,
      test.currentDirection
    );

  processAnswer(
    correct,
    userAnswer
  );
}

function isAnswerCorrect(
  answer,
  word,
  direction
) {

  const normalized =
    normalize(answer);

  if (direction === "en-ko") {

    return word.meanings.some(
      meaning =>
        normalize(meaning) === normalized
    );
  }

  return normalize(word.english) === normalized;
}

function normalize(text) {

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?]/g, "");
}

function processAnswer(correct, userAnswer) {

  if (test.answered) return;

  test.answered = true;

  const word =
    test.words[test.index];

  if (correct) {

    test.correct++;

    word.correct++;
    word.recentCorrect++;
    word.lastCorrect = Date.now();

    const result = {
      word,
      correct: true,
      userAnswer
    };

    test.results.push(result);

    showAnswerResult(true, word, userAnswer);

  } else {

    test.wrong++;

    word.wrong++;
    word.recentCorrect = 0;
    word.lastWrong = Date.now();

    const result = {
      word,
      correct: false,
      userAnswer
    };

    test.results.push(result);

    showAnswerResult(false, word, userAnswer);
  }

  save();

  document.getElementById("checkAnswerBtn")
    .disabled = true;

  document.getElementById("dontKnowBtn")
    .disabled = true;

  document.getElementById("answerInput")
    .disabled = true;
}

function dontKnow() {

  if (test.answered) return;

  processAnswer(false, "모르겠어요");
}

function showAnswerResult(
  correct,
  word,
  userAnswer
) {

  const box =
    document.getElementById("answerResult");

  if (correct) {

    box.className =
      "answer-result correct";

    box.innerHTML =
      `⭕ 정답입니다!<br>
       <small>정답: ${escapeHTML(
         test.currentDirection === "en-ko"
           ? word.meanings.join(", ")
           : word.english
       )}</small>`;

  } else {

    box.className =
      "answer-result wrong";

    box.innerHTML =
      `❌ 오답입니다.<br>
       내 답: ${escapeHTML(userAnswer)}<br>
       정답: ${escapeHTML(
         test.currentDirection === "en-ko"
           ? word.meanings.join(", ")
           : word.english
       )}`;
  }

  setTimeout(() => {

    test.index++;

    renderQuestion();

  }, 1200);
}


// =========================
// 테스트 종료
// =========================

function finishTest() {

  document.getElementById("progressBar")
    .style.width = "100%";

  lastTestWrong =
    test.results
      .filter(r => !r.correct)
      .map(r => r.word);

  const total =
    test.words.length;

  const accuracy =
    total
      ? Math.round(test.correct / total * 100)
      : 0;

  data.history.unshift({
    id: uid(),
    date: Date.now(),
    total,
    correct: test.correct,
    wrong: test.wrong,
    accuracy,
    bundleId: currentBundleId
  });

  data.history =
    data.history.slice(0, 100);

  save();

  showResult();
}

function showResult() {

  const total =
    test.words.length;

  const accuracy =
    total
      ? Math.round(test.correct / total * 100)
      : 0;

  document.getElementById("resultScore")
    .textContent = `${accuracy}%`;

  document.getElementById("resultStats")
    .innerHTML = `

      <div class="result-stat">
        <b>${total}</b>
        전체
      </div>

      <div class="result-stat">
        <b>${test.correct}</b>
        정답
      </div>

      <div class="result-stat">
        <b>${test.wrong}</b>
        오답
      </div>

    `;

  const wrongList =
    document.getElementById("wrongResultList");

  wrongList.innerHTML =
    lastTestWrong.length
      ? lastTestWrong.map(word => `
          <div class="history-item">
            <b>${escapeHTML(word.english)}</b>
            <br>
            <span>${escapeHTML(
              word.meanings.join(", ")
            )}</span>
          </div>
        `).join("")
      : `<p class="correct">🎉 모두 맞혔습니다!</p>`;

  document.getElementById("retryWrongBtn")
    .classList.toggle(
      "hidden",
      lastTestWrong.length === 0
    );

  showPage("resultPage");
}

function retryWrong() {

  if (!lastTestWrong.length) return;

  startTest(
    lastTestWrong,
    test.direction
  );
}


// =========================
// 빠른 테스트
// =========================

function quickTest(type) {

  const words =
    data.bundles.flatMap(b => b.words);

  let selected = [];

  if (type === "all") {
    selected = words;
  }

  if (type === "weak") {
    selected =
      words.filter(w => difficulty(w) >= 2);
  }

  if (type === "wrong") {
    selected =
      words.filter(w => w.wrong > 0)
        .sort((a,b) => b.wrong - a.wrong);
  }

  if (type === "important") {
    selected =
      words.filter(w => w.important);
  }

  if (type === "recentWrong") {
    selected =
      words
        .filter(w => w.lastWrong)
        .sort((a,b) =>
          b.lastWrong - a.lastWrong
        );
  }

  if (!selected.length) {
    alert("조건에 맞는 단어가 없습니다.");
    return;
  }

  startTest(
    shuffle(selected).slice(0, 30),
    "random"
  );
}


// =========================
// 통계
// =========================

function renderStats() {

  const words =
    data.bundles.flatMap(b => b.words);

  const total =
    words.length;

  const learned =
    words.filter(
      w => w.correct >= 2 &&
           w.correct > w.wrong
    ).length;

  const difficult =
    words.filter(
      w => difficulty(w) >= 2
    ).length;

  const totalCorrect =
    words.reduce(
      (sum,w) => sum + (w.correct || 0),
      0
    );

  const totalWrong =
    words.reduce(
      (sum,w) => sum + (w.wrong || 0),
      0
    );

  const accuracy =
    totalCorrect + totalWrong
      ? Math.round(
          totalCorrect /
          (totalCorrect + totalWrong) *
          100
        )
      : 0;

  document.getElementById("statsCards")
    .innerHTML = `

      <div class="stat-card">
        <div class="label">전체 단어</div>
        <div class="value">${total}</div>
      </div>

      <div class="stat-card">
        <div class="label">암기한 단어</div>
        <div class="value">${learned}</div>
      </div>

      <div class="stat-card">
        <div class="label">어려운 단어</div>
        <div class="value">${difficult}</div>
      </div>

      <div class="stat-card">
        <div class="label">전체 정확도</div>
        <div class="value">${accuracy}%</div>
      </div>

    `;

  renderBundleStats();
  renderHistory();
}

function renderBundleStats() {

  document.getElementById("bundleStats").innerHTML =
    data.bundles.length
      ? data.bundles.map(bundle => {

          const correct =
            bundle.words.reduce(
              (s,w) => s + (w.correct || 0),
              0
            );

          const wrong =
            bundle.words.reduce(
              (s,w) => s + (w.wrong || 0),
              0
            );

          const accuracy =
            correct + wrong
              ? Math.round(
                  correct /
                  (correct + wrong) *
                  100
                )
              : 0;

          return `
            <div class="bundle-stat-item">
              <b>${escapeHTML(bundle.name)}</b>
              <br>
              ${bundle.words.length}개 · 정확도 ${accuracy}%
            </div>
          `;

        }).join("")
      : "아직 데이터가 없습니다.";
}

function renderHistory() {

  const list =
    document.getElementById("historyList");

  list.innerHTML =
    data.history.length
      ? data.history.slice(0,20).map(h => {

          const bundle =
            data.bundles.find(
              b => b.id === h.bundleId
            );

          return `
            <div class="history-item">
              <b>${formatDate(h.date)}</b>
              <br>
              ${bundle
                ? escapeHTML(bundle.name)
                : "전체 테스트"}
              · ${h.correct}/${h.total}
              · ${h.accuracy}%
            </div>
          `;

        }).join("")
      : "아직 학습 기록이 없습니다.";
}


// =========================
// 백업
// =========================

function backup() {

  const json =
    JSON.stringify(data, null, 2);

  const blob =
    new Blob(
      [json],
      {type: "application/json"}
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  const date =
    new Date()
      .toISOString()
      .slice(0,10);

  a.href = url;
  a.download = `단어장_백업_${date}.json`;

  a.click();

  URL.revokeObjectURL(url);
}

function restore(file) {

  const reader =
    new FileReader();

  reader.onload = () => {

    try {

      const imported =
        JSON.parse(reader.result);

      if (
        !imported ||
        !Array.isArray(imported.bundles)
      ) {
        throw new Error();
      }

      if (
        !confirm(
          "현재 데이터를 백업 파일로 교체할까요?"
        )
      ) return;

      data = imported;

      data.history ||= [];
      data.settings ||= {};

      save();

      alert("복원이 완료되었습니다.");

      location.reload();

    } catch {

      alert(
        "올바른 단어장 백업 파일이 아닙니다."
      );
    }
  };

  reader.readAsText(file);
}

function resetLearning() {

  if (
    !confirm(
      "모든 단어의 정답/오답 및 학습 기록을 초기화할까요?"
    )
  ) return;

  data.bundles.forEach(bundle => {

    bundle.words.forEach(word => {

      word.wrong = 0;
      word.correct = 0;
      word.recentCorrect = 0;
      word.lastWrong = 0;
      word.lastCorrect = 0;

    });
  });

  data.history = [];

  save();

  alert("학습 기록을 초기화했습니다.");

  renderStats();
}

function deleteAll() {

  if (
    !confirm(
      "정말 모든 데이터를 삭제할까요?"
    )
  ) return;

  if (
    !confirm(
      "삭제하면 복구할 수 없습니다. 계속할까요?"
    )
  ) return;

  localStorage.removeItem(STORAGE_KEY);

  location.reload();
}


// =========================
// 다크 모드
// =========================

function applyDarkMode() {

  document.body.classList.toggle(
    "dark",
    data.settings.dark
  );

  document.getElementById("darkBtn")
    .textContent =
      data.settings.dark
        ? "☀️"
        : "🌙";
}

function toggleDarkMode() {

  data.settings.dark =
    !data.settings.dark;

  save();
  applyDarkMode();
}


// =========================
// 유틸
// =========================

function shuffle(array) {

  const arr = [...array];

  for (
    let i = arr.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] =
      [arr[j], arr[i]];
  }

  return arr;
}

function formatDate(timestamp) {

  return new Date(timestamp)
    .toLocaleString("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
}

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =========================
// 이벤트
// =========================

document.addEventListener("DOMContentLoaded", () => {

  load();

  renderHome();


  document.getElementById("addBundleBtn")
    .onclick = addBundle;

  document.getElementById("modalConfirm")
    .onclick = confirmModal;

  document.getElementById("modalCancel")
    .onclick = closeModal;


  document.getElementById("renameBundleBtn")
    .onclick = renameBundle;

  document.getElementById("deleteBundleBtn")
    .onclick = deleteBundle;

  document.getElementById("backHomeBtn")
    .onclick = () => showPage("homePage");


  document.getElementById("addWordsBtn")
    .onclick = addWords;

  document.getElementById("startBundleTestBtn")
    .onclick = startBundleTest;


  document.getElementById("checkAnswerBtn")
    .onclick = checkAnswer;

  document.getElementById("dontKnowBtn")
    .onclick = dontKnow;

  document.getElementById("exitTestBtn")
    .onclick = () => {
      if (
        confirm("테스트를 종료할까요?")
      ) {
        showPage("homePage");
      }
    };


  document.getElementById("retryWrongBtn")
    .onclick = retryWrong;

  document.getElementById("resultHomeBtn")
    .onclick = () => showPage("homePage");


  document.getElementById("darkBtn")
    .onclick = toggleDarkMode;


  document.getElementById("backupBtn")
    .onclick = backup;

  document.getElementById("restoreInput")
    .onchange = e => {

      if (e.target.files[0]) {
        restore(e.target.files[0]);
      }

      e.target.value = "";
    };


  document.getElementById("resetLearningBtn")
    .onclick = resetLearning;

  document.getElementById("deleteAllBtn")
    .onclick = deleteAll;


  document.getElementById("bundleSearch")
    .oninput = renderHome;

  document.getElementById("wordSearch")
    .oninput = renderWords;

  document.getElementById("wordSort")
    .onchange = renderWords;


  document.querySelectorAll(".quick-card")
    .forEach(button => {

      button.onclick = () =>
        quickTest(button.dataset.quick);

    });


  document.querySelectorAll(".nav-btn")
    .forEach(button => {

      button.onclick = () =>
        showPage(button.dataset.page);

    });


  document.getElementById("answerInput")
    .addEventListener("keydown", e => {

      if (e.key === "Enter") {
        e.preventDefault();

        if (!test.answered) {
          checkAnswer();
        }
      }

    });


  document.getElementById("modalInput")
    .addEventListener("keydown", e => {

      if (e.key === "Enter") {
        confirmModal();
      }

    });


  window.addEventListener(
    "beforeunload",
    save
  );

  registerServiceWorker();

});


// =========================
// PWA
// =========================

function registerServiceWorker() {

  if ("serviceWorker" in navigator) {

    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => {});

  }
}


// 설치 이벤트
let deferredInstallPrompt = null;

window.addEventListener(
  "beforeinstallprompt",
  e => {

    e.preventDefault();

    deferredInstallPrompt = e;

    document
      .getElementById("installBtn")
      .classList.remove("hidden");

  }
);

document
  .getElementById("installBtn")
  .onclick = async () => {

    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();

    await deferredInstallPrompt.userChoice;

    deferredInstallPrompt = null;

    document
      .getElementById("installBtn")
      .classList.add("hidden");
  };
