(() => {
  "use strict";

  const STORAGE_KEY =
    "memorize_app_v4";

  const HISTORY_KEY =
    "memorize_app_history_v1";

  const THEME_KEY =
    "memorize_app_theme";

  const state = {
    files: [],
    quizCount: 0
  };

  let history = [];

  let currentFileId = null;
  let currentTestId = null;

  let quizSession = null;
  let timerId = null;

  let draggedId = null;
  let draggedType = null;


  /* =====================================================
     공통
     ===================================================== */

  const $ = (selector) =>
    document.querySelector(selector);

  const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


  function uid(prefix) {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 9)
    );
  }


  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }


  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function formatDateTime(iso) {
    const date =
      new Date(iso);

    const month =
      date.getMonth() + 1;

    const day =
      date.getDate();

    const hours =
      String(
        date.getHours()
      ).padStart(2, "0");

    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, "0");

    return `${month}/${day} ${hours}:${minutes}`;
  }


  function getDateParts(iso) {
    const date =
      new Date(iso);

    return {
      year:
        date.getFullYear(),

      month:
        date.getMonth() + 1,

      day:
        date.getDate()
    };
  }


  /* =====================================================
     저장
     ===================================================== */

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history)
      );

    } catch (error) {
      console.error(
        "저장 실패:",
        error
      );
    }
  }


  function load() {
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
          Array.isArray(
            parsed.files
          )
        ) {
          state.files =
            parsed.files;

          state.quizCount =
            Number(
              parsed.quizCount
            ) || 0;
        }
      }

    } catch (error) {
      console.error(
        "데이터 불러오기 실패:",
        error
      );
    }


    try {

      const savedHistory =
        localStorage.getItem(
          HISTORY_KEY
        );

      if (savedHistory) {

        const parsed =
          JSON.parse(
            savedHistory
          );

        if (
          Array.isArray(
            parsed
          )
        ) {
          history = parsed;
        }
      }

    } catch (error) {

      console.error(
        "기록 불러오기 실패:",
        error
      );

      history = [];
    }


    normalizeData();
  }


  function normalizeData() {

    state.files =
      state.files.map(
        (file) => ({

          id:
            file.id ||
            uid("file"),

          name:
            String(
              file.name ||
              "파일"
            ),

          tests:
            Array.isArray(
              file.tests
            )
              ? file.tests.map(
                  (test) => ({

                    id:
                      test.id ||
                      uid("test"),

                    name:
                      String(
                        test.name ||
                        "테스트"
                      ),

                    words:
                      Array.isArray(
                        test.words
                      )
                        ? test.words.map(
                            (word) => ({

                              id:
                                word.id ||
                                uid("word"),

                              term:
                                String(
                                  word.term ||
                                  ""
                                ),

                              meanings:
                                Array.isArray(
                                  word.meanings
                                )
                                  ? word.meanings
                                  : [
                                      String(
                                        word.meaning ||
                                        ""
                                      )
                                    ],

                              important:
                                Boolean(
                                  word.important
                                ),

                              correct:
                                Number(
                                  word.correct
                                ) || 0,

                              wrong:
                                Number(
                                  word.wrong
                                ) || 0,

                              lastWrong:
                                word.lastWrong ||
                                null

                            })
                          )
                        : []

                  })
                )
              : []

        })
      );
  }


  function getFile(fileId) {
    return state.files.find(
      (file) =>
        file.id === fileId
    );
  }


  function getCurrentFile() {
    return getFile(
      currentFileId
    );
  }


  function getCurrentTest() {

    const file =
      getCurrentFile();

    if (!file) {
      return null;
    }

    return file.tests.find(
      (test) =>
        test.id === currentTestId
    );
  }


  /* =====================================================
     화면
     ===================================================== */

  function show(viewId) {

    $$(".view").forEach(
      (view) =>
        view.classList.add(
          "hidden"
        )
    );

    const target =
      document.getElementById(
        viewId
      );

    if (target) {
      target.classList.remove(
        "hidden"
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  function updateNav(name) {

    $$("[data-nav]").forEach(
      (button) =>
        button.classList.toggle(
          "active",
          button.dataset.nav === name
        )
    );
  }


  /* =====================================================
     홈
     ===================================================== */

  function renderHome() {

    show("homeView");
    updateNav("home");

    const list =
      $("#fileList");

    if (!state.files.length) {

      list.innerHTML = `
        <div class="empty">
          아직 파일이 없습니다.<br>
          「＋ 파일 추가」를 눌러주세요.
        </div>
      `;

      return;
    }


    list.innerHTML =
      state.files
        .map(
          (file) => `

            <div
              class="file-card"
              draggable="true"
              data-id="${file.id}"
              data-drag-type="file"
            >

              <div class="drag-handle">
                ☷
              </div>


              <button
                class="file-main"
                type="button"
                data-open-file="${file.id}"
              >

                <div class="file-name">
                  📁 ${escapeHTML(
                    file.name
                  )}
                </div>

                <div class="file-sub">
                  ${file.tests.length}개 테스트
                </div>

              </button>


              <div class="file-actions">

                <button
                  type="button"
                  data-rename-file="${file.id}"
                >
                  ✏️
                </button>

                <button
                  type="button"
                  data-delete-file="${file.id}"
                >
                  🗑️
                </button>

              </div>

            </div>
          `
        )
        .join("");


    setupDragAndDrop();
  }


  function addFile() {

    const input =
      prompt(
        "파일 이름을 입력하세요."
      );

    if (input === null) {
      return;
    }

    const name =
      input.trim();

    if (!name) {

      alert(
        "파일 이름을 입력해주세요."
      );

      return;
    }


    if (
      state.files.some(
        (file) =>
          normalize(
            file.name
          ) ===
          normalize(name)
      )
    ) {

      alert(
        "같은 이름의 파일이 있습니다."
      );

      return;
    }


    state.files.push({
      id: uid("file"),
      name,
      tests: []
    });

    save();
    renderHome();
  }


  function renameFile(
    fileId
  ) {

    const file =
      getFile(fileId);

    if (!file) {
      return;
    }

    const input =
      prompt(
        "파일 이름을 변경하세요.",
        file.name
      );

    if (input === null) {
      return;
    }

    const name =
      input.trim();

    if (!name) {

      alert(
        "파일 이름을 입력해주세요."
      );

      return;
    }


    if (
      state.files.some(
        (other) =>
          other.id !== fileId &&
          normalize(
            other.name
          ) ===
          normalize(name)
      )
    ) {

      alert(
        "같은 이름의 파일이 있습니다."
      );

      return;
    }


    file.name =
      name;

    save();
    renderHome();
  }


  function deleteFile(
    fileId
  ) {

    const file =
      getFile(fileId);

    if (!file) {
      return;
    }


    if (
      !confirm(
        `"${file.name}" 파일을 삭제할까요?\n안의 테스트와 단어도 삭제됩니다.`
      )
    ) {
      return;
    }


    state.files =
      state.files.filter(
        (item) =>
          item.id !== fileId
      );


    if (
      currentFileId === fileId
    ) {
      currentFileId = null;
      currentTestId = null;
    }


    save();
    renderHome();
  }


  /* =====================================================
     파일
     ===================================================== */

  function openFile(
    fileId
  ) {

    const file =
      getFile(fileId);

    if (!file) {
      return;
    }

    currentFileId =
      fileId;

    currentTestId =
      null;

    renderFile();
  }


  function getAllFileWords(
    file
  ) {

    const result = [];

    file.tests.forEach(
      (test) => {

        test.words.forEach(
          (word) => {

            result.push({
              ...word,

              sourceTestId:
                test.id,

              sourceTestName:
                test.name
            });

          }
        );

      }
    );

    return result;
  }


  function renderFile() {

    const file =
      getCurrentFile();

    if (!file) {
      renderHome();
      return;
    }


    show("fileView");
    updateNav("");

    $("#fileBreadcrumb")
      .textContent =
      file.name;

    $("#fileTitle")
      .textContent =
      `📁 ${file.name}`;


    const list =
      $("#testList");


    if (!file.tests.length) {

      list.innerHTML = `
        <div class="empty">
          아직 테스트가 없습니다.<br>
          「＋ 테스트 생성」을 눌러주세요.
        </div>
      `;

    } else {

      list.innerHTML =
        file.tests
          .map(
            (test) => `

              <article
                class="test-card"
                draggable="true"
                data-id="${test.id}"
                data-drag-type="test"
              >

                <div class="drag-handle">
                  ☷
                </div>


                <div class="test-card-content">

                  <div class="test-card-head">

                    <button
                      class="file-main"
                      type="button"
                      data-open-test="${test.id}"
                    >

                      <div class="test-name">
                        📝 ${escapeHTML(
                          test.name
                        )}
                      </div>

                      <div class="test-sub">
                        ${test.words.length}개 단어
                      </div>

                    </button>


                    <div class="test-card-actions">

                      <button
                        type="button"
                        data-rename-test="${test.id}"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        data-delete-test="${test.id}"
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                </div>

              </article>

            `
          )
          .join("");
    }


    const allWords =
      getAllFileWords(
        file
      );


    $("#totalTestCount")
      .textContent =
      `${allWords.length}개 단어`;

    $("#totalDirectTestBtn")
      .textContent =
      `${file.name} → 뜻`;

    $("#totalReverseTestBtn")
      .textContent =
      `뜻 → ${file.name}`;


    setupDragAndDrop();
  }


  function addTest() {

    const file =
      getCurrentFile();

    if (!file) {
      return;
    }


    const input =
      prompt(
        "테스트 제목을 입력하세요."
      );

    if (input === null) {
      return;
    }


    const name =
      input.trim();

    if (!name) {

      alert(
        "테스트 제목을 입력해주세요."
      );

      return;
    }


    if (
      file.tests.some(
        (test) =>
          normalize(
            test.name
          ) ===
          normalize(name)
      )
    ) {

      alert(
        "같은 이름의 테스트가 있습니다."
      );

      return;
    }


    file.tests.push({
      id: uid("test"),
      name,
      words: []
    });


    save();
    renderFile();
  }


  function renameTest(
    testId
  ) {

    const file =
      getCurrentFile();

    if (!file) {
      return;
    }


    const test =
      file.tests.find(
        (item) =>
          item.id === testId
      );

    if (!test) {
      return;
    }


    const input =
      prompt(
        "테스트 제목을 변경하세요.",
        test.name
      );

    if (input === null) {
      return;
    }


    const name =
      input.trim();

    if (!name) {

      alert(
        "테스트 제목을 입력해주세요."
      );

      return;
    }


    if (
      file.tests.some(
        (other) =>
          other.id !== testId &&
          normalize(
            other.name
          ) ===
          normalize(name)
      )
    ) {

      alert(
        "같은 이름의 테스트가 있습니다."
      );

      return;
    }


    test.name =
      name;

    save();
    renderFile();
  }


  function deleteTest(
    testId
  ) {

    const file =
      getCurrentFile();

    if (!file) {
      return;
    }


    const test =
      file.tests.find(
        (item) =>
          item.id === testId
      );

    if (!test) {
      return;
    }


    if (
      !confirm(
        `"${test.name}" 테스트를 삭제할까요?\n안의 단어도 삭제됩니다.`
      )
    ) {
      return;
    }


    file.tests =
      file.tests.filter(
        (item) =>
          item.id !== testId
      );


    if (
      currentTestId ===
      testId
    ) {
      currentTestId = null;
    }


    save();
    renderFile();
  }


  /* =====================================================
     총합 테스트
     ===================================================== */

  function startTotalQuiz(
    file,
    mode
  ) {

    const words =
      getAllFileWords(
        file
      );

    if (!words.length) {

      alert(
        "테스트할 단어가 없습니다."
      );

      return;
    }


    const shuffled =
      shuffle(
        words
      );


    quizSession = {

      fileId:
        file.id,

      testId:
        "__total__",

      fileName:
        file.name,

      testName:
        "총합 테스트",

      words:
        shuffled,

      mode,

      index: 0,

      correct: 0,

      wrong: 0,

      wrongWords: [],

      answered: false,

      totalMode: true

    };


    renderQuizQuestion();
  }


  function retryTotalWrong() {

    if (
      !quizSession ||
      !quizSession.wrongWords.length
    ) {
      return;
    }


    quizSession = {

      ...quizSession,

      words:
        shuffle(
          quizSession.wrongWords
        ),

      index: 0,

      correct: 0,

      wrong: 0,

      wrongWords: [],

      answered: false
    };


    renderQuizQuestion();
  }


  /* =====================================================
     단어장
     ===================================================== */

  function openTest(
    testId
  ) {

    const file =
      getCurrentFile();

    if (!file) {
      return;
    }


    const test =
      file.tests.find(
        (item) =>
          item.id === testId
      );

    if (!test) {
      return;
    }


    currentTestId =
      testId;

    renderWordbook();
  }


  function renderWordbook() {

    const file =
      getCurrentFile();

    const test =
      getCurrentTest();

    if (
      !file ||
      !test
    ) {
      renderHome();
      return;
    }


    show("wordbookView");
    updateNav("");


    $("#wordbookFileBtn")
      .textContent =
      file.name;


    $("#wordbookBreadcrumb")
      .textContent =
      test.name;


    $("#wordbookTitle")
      .textContent =
      `📝 ${test.name}`;


    $("#wordbookCount")
      .textContent =
      `${test.words.length}개 단어`;


    $("#directTestBtn")
      .textContent =
      `${file.name} → 뜻`;


    $("#reverseTestBtn")
      .textContent =
      `뜻 → ${file.name}`;


    const list =
      $("#wordList");


    if (!test.words.length) {

      list.innerHTML = `
        <div class="empty">
          아직 단어가 없습니다.
        </div>
      `;

      return;
    }


    list.innerHTML =
      test.words
        .map(
          (word) => `

            <div
              class="word-row"
              draggable="true"
              data-id="${word.id}"
              data-drag-type="word"
            >

              <div class="drag-handle">
                ☷
              </div>


              <div class="word-content">

                <div class="word-term">
                  ${
                    word.important
                      ? "⭐ "
                      : ""
                  }${escapeHTML(
                    word.term
                  )}
                </div>

                <div class="word-meaning">
                  ${escapeHTML(
                    word.meanings.join(
                      ", "
                    )
                  )}
                </div>

              </div>


              <div class="word-actions">

                <button
                  type="button"
                  data-important-word="${word.id}"
                >
                  ${
                    word.important
                      ? "⭐"
                      : "☆"
                  }
                </button>

                <button
                  type="button"
                  data-edit-word="${word.id}"
                >
                  ✏️
                </button>

                <button
                  type="button"
                  data-delete-word="${word.id}"
                >
                  🗑️
                </button>

              </div>

            </div>
          `
        )
        .join("");


    setupDragAndDrop();
  }


  function addWordsFromInput() {

    const test =
      getCurrentTest();

    if (!test) {
      return;
    }


    const input =
      $("#bulkWordInput");

    const value =
      input.value.trim();

    if (!value) {

      alert(
        "단어를 입력해주세요."
      );

      input.focus();
      return;
    }


    const entries =
      value
        .split("/")
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);


    const newWords = [];


    for (
      const entry of entries
    ) {

      const separator =
        entry.indexOf(":");


      if (
        separator === -1
      ) {

        alert(
          `"${entry}"에 :가 없습니다.`
        );

        return;
      }


      const term =
        entry
          .slice(
            0,
            separator
          )
          .trim();


      const meaningText =
        entry
          .slice(
            separator + 1
          )
          .trim();


      if (
        !term ||
        !meaningText
      ) {

        alert(
          `"${entry}"의 단어 또는 뜻이 비어 있습니다.`
        );

        return;
      }


      const meanings =
        meaningText
          .split(",")
          .map(
            item =>
              item.trim()
          )
          .filter(Boolean);


      if (!meanings.length) {

        alert(
          `"${entry}"의 뜻이 없습니다.`
        );

        return;
      }


      const duplicate =
        test.words.some(
          (word) =>
            normalize(
              word.term
            ) ===
            normalize(term) &&
            word.meanings.some(
              (oldMeaning) =>
                meanings.some(
                  (newMeaning) =>
                    normalize(
                      oldMeaning
                    ) ===
                    normalize(
                      newMeaning
                    )
                )
            )
        ) ||
        newWords.some(
          (word) =>
            normalize(
              word.term
            ) ===
            normalize(term) &&
            word.meanings.some(
              (oldMeaning) =>
                meanings.some(
                  (newMeaning) =>
                    normalize(
                      oldMeaning
                    ) ===
                    normalize(
                      newMeaning
                    )
                )
            )
        );


      if (duplicate) {

        alert(
          `"${term}"은 같은 뜻으로 이미 존재합니다.`
        );

        return;
      }


      newWords.push({

        id:
          uid("word"),

        term,

        meanings,

        important:
          false,

        correct:
          0,

        wrong:
          0,

        lastWrong:
          null

      });

    }


    test.words.push(
      ...newWords
    );


    input.value = "";

    save();
    renderWordbook();

    input.focus();
  }


  function editWord(
    wordId
  ) {

    const test =
      getCurrentTest();

    if (!test) {
      return;
    }


    const word =
      test.words.find(
        (item) =>
          item.id === wordId
      );

    if (!word) {
      return;
    }


    const termInput =
      prompt(
        "단어",
        word.term
      );

    if (
      termInput === null
    ) {
      return;
    }


    const meaningInput =
      prompt(
        "뜻 (, 로 여러 뜻 입력)",
        word.meanings.join(",")
      );

    if (
      meaningInput === null
    ) {
      return;
    }


    const term =
      termInput.trim();


    const meanings =
      meaningInput
        .split(",")
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);


    if (
      !term ||
      !meanings.length
    ) {

      alert(
        "단어와 뜻을 모두 입력해주세요."
      );

      return;
    }


    word.term =
      term;

    word.meanings =
      meanings;


    save();
    renderWordbook();
  }


  function deleteWord(
    wordId
  ) {

    const test =
      getCurrentTest();

    if (!test) {
      return;
    }


    const word =
      test.words.find(
        (item) =>
          item.id === wordId
      );

    if (!word) {
      return;
    }


    if (
      !confirm(
        `"${word.term}"을 삭제할까요?`
      )
    ) {
      return;
    }


    test.words =
      test.words.filter(
        (item) =>
          item.id !== wordId
      );


    save();
    renderWordbook();
  }


  function toggleImportant(
    wordId
  ) {

    const test =
      getCurrentTest();

    if (!test) {
      return;
    }


    const word =
      test.words.find(
        (item) =>
          item.id === wordId
      );

    if (!word) {
      return;
    }


    word.important =
      !word.important;


    save();
    renderWordbook();
  }


  /* =====================================================
     섞기
     ===================================================== */

  function shuffle(array) {

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
      ] = [
        result[j],
        result[i]
      ];

    }

    return result;
  }


  /* =====================================================
     일반 테스트
     ===================================================== */

  function startQuiz(
    test,
    mode
  ) {

    if (
      !test ||
      !test.words.length
    ) {

      alert(
        "테스트할 단어가 없습니다."
      );

      return;
    }


    let words =
      [...test.words];


    if (
      mode ===
      "important"
    ) {

      words =
        words.filter(
          (word) =>
            word.important
        );

    }


    if (
      mode ===
      "wrong"
    ) {

      words =
        words.filter(
          (word) =>
            word.wrong > 0
        );

    }


    if (!words.length) {

      alert(
        "조건에 맞는 단어가 없습니다."
      );

      return;
    }


    quizSession = {

      fileId:
        currentFileId,

      testId:
        currentTestId,

      fileName:
        getCurrentFile().name,

      testName:
        test.name,

      words:
        shuffle(words),

      mode,

      index:
        0,

      correct:
        0,

      wrong:
        0,

      wrongWords:
        [],

      answered:
        false,

      totalMode:
        false

    };


    renderQuizQuestion();
  }


  /* =====================================================
     퀴즈
     ===================================================== */

  function renderQuizQuestion() {

    clearTimer();


    if (!quizSession) {
      return;
    }


    if (
      quizSession.index >=
      quizSession.words.length
    ) {

      finishQuiz();
      return;
    }


    show("quizView");
    updateNav("");


    const word =
      quizSession.words[
        quizSession.index
      ];


    let direction;


    if (
      quizSession.mode ===
      "direct"
    ) {

      direction =
        "direct";

    } else if (
      quizSession.mode ===
      "reverse"
    ) {

      direction =
        "reverse";

    } else {

      direction =
        Math.random() < 0.5
          ? "direct"
          : "reverse";
    }


    quizSession.currentDirection =
      direction;


    if (
      direction ===
      "direct"
    ) {

      $("#quizDirection")
        .textContent =
        `${quizSession.fileName} → 뜻`;

      $("#quizQuestion")
        .textContent =
        word.term;

    } else {

      $("#quizDirection")
        .textContent =
        `뜻 → ${quizSession.fileName}`;

      $("#quizQuestion")
        .textContent =
        word.meanings.join(
          ", "
        );
    }


    $("#quizProgress")
      .textContent =
      `${quizSession.index + 1} / ${quizSession.words.length}`;


    $("#quizAnswer")
      .value =
      "";


    $("#quizAnswer")
      .disabled =
      false;


    $("#quizFeedback")
      .textContent =
      "";


    $("#quizFeedback")
      .className =
      "quiz-feedback";


    $("#quizSubmitBtn")
      .textContent =
      "정답 확인";


    $("#quizAnswer")
      .focus();


    startTimer();
  }


  function isCorrect(
    input,
    word,
    direction
  ) {

    const answer =
      normalize(input);


    if (!answer) {
      return false;
    }


    if (
      direction ===
      "direct"
    ) {

      return word.meanings.some(
        (meaning) =>
          normalize(
            meaning
          ) === answer
      );

    }


    return (
      normalize(
        word.term
      ) ===
      answer
    );
  }


  function submitQuizAnswer(
    timeout = false
  ) {

    if (!quizSession) {
      return;
    }


    if (
      quizSession.answered
    ) {

      nextQuestion();
      return;
    }


    clearTimer();


    const input =
      $("#quizAnswer");


    const word =
      quizSession.words[
        quizSession.index
      ];


    const direction =
      quizSession.currentDirection;


    const correct =
      !timeout &&
      isCorrect(
        input.value,
        word,
        direction
      );


    quizSession.answered =
      true;


    input.disabled =
      true;


    if (correct) {

      word.correct =
        Number(
          word.correct
        ) + 1;


      quizSession.correct++;


      $("#quizFeedback")
        .textContent =
        "⭕ 정답입니다.";


      $("#quizFeedback")
        .className =
        "quiz-feedback feedback-correct";


    } else {

      word.wrong =
        Number(
          word.wrong
        ) + 1;


      word.lastWrong =
        new Date().toISOString();


      quizSession.wrong++;


      quizSession.wrongWords.push(
        word
      );


      $("#quizFeedback")
        .textContent =
        timeout
          ? "⏰ 시간 초과! 오답입니다."
          : "❌ 오답입니다.";


      $("#quizFeedback")
        .className =
        "quiz-feedback feedback-wrong";
    }


    save();


    $("#quizSubmitBtn")
      .textContent =
      quizSession.index ===
      quizSession.words.length - 1
        ? "결과 보기"
        : "다음 문제";
  }


  function nextQuestion() {

    if (!quizSession) {
      return;
    }


    if (
      !quizSession.answered
    ) {

      submitQuizAnswer();
      return;
    }


    quizSession.index++;


    renderQuizQuestion();
  }


  function startTimer() {

    let seconds = 10;


    $("#quizTimer")
      .textContent =
      seconds;


    timerId =
      setInterval(
        () => {

          seconds--;


          $("#quizTimer")
            .textContent =
            Math.max(
              0,
              seconds
            );


          if (
            seconds <= 0
          ) {

            clearTimer();


            if (
              !quizSession ||
              quizSession.answered
            ) {
              return;
            }


            submitQuizAnswer(
              true
            );


            setTimeout(
              () => {
                nextQuestion();
              },
              700
            );
          }

        },
        1000
      );
  }


  function clearTimer() {

    if (timerId) {

      clearInterval(
        timerId
      );

      timerId =
        null;
    }
  }


  /* =====================================================
     테스트 기록
     ===================================================== */

  function addHistory() {

    const session =
      quizSession;

    if (!session) {
      return;
    }


    history.push({

      id:
        uid("history"),

      date:
        new Date().toISOString(),

      fileId:
        session.fileId,

      fileName:
        session.fileName,

      testId:
        session.testId,

      testName:
        session.testName,

      total:
        session.words.length,

      correct:
        session.correct,

      wrong:
        session.wrong

    });


    if (
      history.length >
      2000
    ) {

      history =
        history.slice(
          -2000
        );
    }
  }


  function finishQuiz() {

    clearTimer();


    state.quizCount++;


    addHistory();


    save();


    showResult();
  }


  /* =====================================================
     결과
     ===================================================== */

  function showResult() {

    show("resultView");
    updateNav("");


    $("#resultScore")
      .textContent =
      `${quizSession.correct} / ${quizSession.words.length}`;


    const wrong =
      $("#resultWrongWords");


    if (
      !quizSession.wrongWords.length
    ) {

      wrong.innerHTML = `
        <div class="empty">
          모든 문제를 맞혔습니다! 🎉
        </div>
      `;

      return;
    }


    wrong.innerHTML =
      `<h3>틀린 문제</h3>` +

      quizSession
        .wrongWords
        .map(
          (word) => `

            <div class="wrong-item">

              <strong>
                ${escapeHTML(
                  word.term
                )}
              </strong>

              <div>
                ${escapeHTML(
                  word.meanings.join(
                    ", "
                  )
                )}
              </div>

            </div>
          `
        )
        .join("");
  }


  function retryWrong() {

    if (
      !quizSession ||
      !quizSession.wrongWords.length
    ) {

      alert(
        "틀린 문제가 없습니다."
      );

      return;
    }


    quizSession = {

      ...quizSession,

      words:
        shuffle(
          quizSession.wrongWords
        ),

      index:
        0,

      correct:
        0,

      wrong:
        0,

      wrongWords:
        [],

      answered:
        false
    };


    renderQuizQuestion();
  }


  /* =====================================================
     빠른 테스트
     ===================================================== */

  function openQuickModal() {

    $("#quickModal")
      .classList.remove(
        "hidden"
      );
  }


  function closeQuickModal() {

    $("#quickModal")
      .classList.add(
        "hidden"
      );
  }


  /* =====================================================
     드래그
     ===================================================== */

  function setupDragAndDrop() {

    $$("[data-drag-type]")
      .forEach(
        (element) => {

          element.addEventListener(
            "dragstart",
            () => {

              draggedId =
                element.dataset.id;

              draggedType =
                element.dataset.dragType;


              element.classList.add(
                "dragging"
              );
            }
          );


          element.addEventListener(
            "dragend",
            () => {

              draggedId =
                null;

              draggedType =
                null;


              $$(
                "[data-drag-type]"
              )
                .forEach(
                  (item) =>
                    item.classList.remove(
                      "dragging",
                      "drag-over"
                    )
                );
            }
          );


          element.addEventListener(
            "dragover",
            (event) => {

              event.preventDefault();


              if (
                draggedId &&
                draggedType ===
                  element.dataset
                    .dragType &&
                draggedId !==
                  element.dataset
                    .id
              ) {

                element.classList.add(
                  "drag-over"
                );
              }
            }
          );


          element.addEventListener(
            "dragleave",
            () => {

              element.classList.remove(
                "drag-over"
              );
            }
          );


          element.addEventListener(
            "drop",
            (event) => {

              event.preventDefault();


              const targetId =
                element.dataset
                  .id;


              if (
                !draggedId ||
                draggedId ===
                  targetId ||
                draggedType !==
                  element.dataset
                    .dragType
              ) {
                return;
              }


              if (
                draggedType ===
                "file"
              ) {

                reorderFiles(
                  draggedId,
                  targetId
                );
              }


              if (
                draggedType ===
                "test"
              ) {

                reorderTests(
                  draggedId,
                  targetId
                );
              }


              if (
                draggedType ===
                "word"
              ) {

                reorderWords(
                  draggedId,
                  targetId
                );
              }

            }
          );

        }
      );
  }


  function reorderFiles(
    fromId,
    toId
  ) {

    const from =
      state.files.findIndex(
        item =>
          item.id ===
          fromId
      );

    const to =
      state.files.findIndex(
        item =>
          item.id ===
          toId
      );


    if (
      from < 0 ||
      to < 0
    ) {
      return;
    }


    const [
      moved
    ] =
      state.files.splice(
        from,
        1
      );


    state.files.splice(
      to,
      0,
      moved
    );


    save();
    renderHome();
  }


  function reorderTests(
    fromId,
    toId
  ) {

    const file =
      getCurrentFile();

    if (!file) {
      return;
    }


    const from =
      file.tests.findIndex(
        item =>
          item.id ===
          fromId
      );

    const to =
      file.tests.findIndex(
        item =>
          item.id ===
          toId
      );


    if (
      from < 0 ||
      to < 0
    ) {
      return;
    }


    const [
      moved
    ] =
      file.tests.splice(
        from,
        1
      );


    file.tests.splice(
      to,
      0,
      moved
    );


    save();
    renderFile();
  }


  function reorderWords(
    fromId,
    toId
  ) {

    const test =
      getCurrentTest();

    if (!test) {
      return;
    }


    const from =
      test.words.findIndex(
        item =>
          item.id ===
          fromId
      );

    const to =
      test.words.findIndex(
        item =>
          item.id ===
          toId
      );


    if (
      from < 0 ||
      to < 0
    ) {
      return;
    }


    const [
      moved
    ] =
      test.words.splice(
        from,
        1
      );


    test.words.splice(
      to,
      0,
      moved
    );


    save();
    renderWordbook();
  }


  /* =====================================================
     통계
     ===================================================== */

  function renderStats() {

    show("statsView");
    updateNav("stats");


    let testCount = 0;
    let wordCount = 0;


    state.files.forEach(
      (file) => {

        testCount +=
          file.tests.length;


        file.tests.forEach(
          (test) => {

            wordCount +=
              test.words.length;

          }
        );

      }
    );


    $("#statFileCount")
      .textContent =
      state.files.length;


    $("#statTestCount")
      .textContent =
      testCount;


    $("#statWordCount")
      .textContent =
      wordCount;


    $("#statQuizCount")
      .textContent =
      state.quizCount;


    renderHistory();
  }


  function getHistoryContent() {

    const now =
      new Date();

    const currentYear =
      now.getFullYear();

    const currentMonth =
      now.getMonth() + 1;


    const currentMonthRecords =
      [];

    const previousMonthMap =
      new Map();

    const previousYearMap =
      new Map();


    history
      .slice()
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .forEach(
        (record) => {

          const parts =
            getDateParts(
              record.date
            );


          if (
            parts.year ===
              currentYear &&
            parts.month ===
              currentMonth
          ) {

            currentMonthRecords.push(
              record
            );

            return;
          }


          if (
            parts.year ===
            currentYear
          ) {

            const key =
              parts.month;

            if (
              !previousMonthMap.has(
                key
              )
            ) {

              previousMonthMap.set(
                key,
                []
              );
            }


            previousMonthMap
              .get(key)
              .push(record);

            return;
          }


          const key =
            parts.year;

          if (
            !previousYearMap.has(
              key
            )
          ) {

            previousYearMap.set(
              key,
              new Map()
            );
          }


          const monthMap =
            previousYearMap.get(
              key
            );


          if (
            !monthMap.has(
              parts.month
            )
          ) {

            monthMap.set(
              parts.month,
              []
            );
          }


          monthMap
            .get(
              parts.month
            )
            .push(record);

        }
      );


    return {
      currentMonthRecords,
      previousMonthMap,
      previousYearMap
    };
  }


  function renderHistory() {

    const container =
      $("#historyList");


    if (!history.length) {

      container.innerHTML = `
        <div class="history-empty">
          아직 테스트 기록이 없습니다.
        </div>
      `;

      return;
    }


    const {
      currentMonthRecords,
      previousMonthMap,
      previousYearMap
    } =
      getHistoryContent();


    let html = "";


    /* 현재 달 */

    currentMonthRecords.forEach(
      (record) => {

        html +=
          renderHistoryRecord(
            record
          );
      }
    );


    /* 이전 달 */

    [
      ...previousMonthMap.entries()
    ]
      .sort(
        (a, b) =>
          b[0] - a[0]
      )
      .forEach(
        ([month, records]) => {

          html += `
            <details
              class="history-group"
            >

              <summary>
                ${month}월
              </summary>

              <div class="history-records">

                ${records
                  .map(
                    renderHistoryRecord
                  )
                  .join("")}

              </div>

            </details>
          `;
        }
      );


    /* 이전 연도 */

    [
      ...previousYearMap.entries()
    ]
      .sort(
        (a, b) =>
          b[0] - a[0]
      )
      .forEach(
        ([year, monthMap]) => {

          html += `
            <details
              class="history-group"
            >

              <summary>
                ${year}년
              </summary>

              <div class="history-records">

                ${[
                  ...monthMap.entries()
                ]
                  .sort(
                    (a, b) =>
                      b[0] - a[0]
                  )
                  .map(
                    ([month, records]) => `
                      <details
                        class="history-group"
                      >

                        <summary>
                          ${month}월
                        </summary>

                        <div class="history-records">

                          ${records
                            .map(
                              renderHistoryRecord
                            )
                            .join("")}

                        </div>

                      </details>
                    `
                  )
                  .join("")}

              </div>

            </details>
          `;
        }
      );


    container.innerHTML =
      html;
  }


  function renderHistoryRecord(
    record
  ) {

    const score =
      record.total > 0
        ? Math.round(
            (
              record.correct /
              record.total
            ) *
              100
          )
        : 0;


    return `

      <div
        class="history-record"
      >

        <div
          class="history-record-main"
        >

          <div
            class="history-record-title"
          >
            ${formatDateTime(
              record.date
            )}
            ·
            ${escapeHTML(
              record.fileName
            )}
            ·
            ${escapeHTML(
              record.testName
            )}
          </div>

          <div
            class="history-record-sub"
          >
            정답
            ${record.correct}
            /
            ${record.total}
            ·
            오답
            ${record.wrong}
            ·
            ${score}%
          </div>

        </div>

      </div>
    `;
  }


  /* =====================================================
     설정
     ===================================================== */

  function renderSettings() {

    show("settingsView");
    updateNav("settings");


    $("#onlineStatus")
      .textContent =
      navigator.onLine
        ? "온라인"
        : "오프라인";
  }


  function exportData() {

    const backup = {

      version:
        1,

      exportedAt:
        new Date().toISOString(),

      state,

      history

    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          )
        ],
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
      "memory-backup.json";


    document.body.appendChild(
      link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
      url
    );
  }


  function importData(
    file
  ) {

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


          let importedState;
          let importedHistory;


          if (
            parsed &&
            parsed.state &&
            Array.isArray(
              parsed.state.files
            )
          ) {

            importedState =
              parsed.state;

            importedHistory =
              Array.isArray(
                parsed.history
              )
                ? parsed.history
                : [];

          } else if (
            parsed &&
            Array.isArray(
              parsed.files
            )
          ) {

            importedState =
              parsed;

            importedHistory =
              [];

          } else {

            throw new Error(
              "invalid"
            );
          }


          if (
            !confirm(
              "현재 데이터를 불러온 데이터로 교체할까요?"
            )
          ) {
            return;
          }


          state.files =
            importedState.files;

          state.quizCount =
            Number(
              importedState.quizCount
            ) || 0;

          history =
            importedHistory;


          normalizeData();

          save();


          currentFileId =
            null;

          currentTestId =
            null;

          quizSession =
            null;

          clearTimer();


          renderHome();

        } catch {

          alert(
            "잘못된 데이터 파일입니다."
          );

        }

      };


    reader.readAsText(
      file
    );
  }


  function resetAll() {

    if (
      !confirm(
        "모든 파일, 테스트, 단어와 기록을 삭제할까요?"
      )
    ) {
      return;
    }


    state.files = [];

    state.quizCount =
      0;

    history = [];


    currentFileId =
      null;

    currentTestId =
      null;


    quizSession =
      null;

    clearTimer();


    save();

    renderHome();
  }


  /* =====================================================
     뒤로가기
     ===================================================== */

  function goBack() {

    if (quizSession) {

      if (
        !confirm(
          "진행 중인 테스트를 종료할까요?"
        )
      ) {
        return;
      }

      clearTimer();

      quizSession =
        null;
    }


    if (
      !$("#quizView")
        .classList.contains(
          "hidden"
        )
    ) {

      if (
        currentTestId ===
        "__total__"
      ) {

        renderFile();

      } else if (
        currentTestId !==
        null
      ) {

        renderWordbook();

      } else {

        renderHome();
      }

      return;
    }


    if (
      !$("#resultView")
        .classList.contains(
          "hidden"
        )
    ) {

      if (
        currentTestId ===
        "__total__"
      ) {

        renderFile();

      } else {

        renderWordbook();
      }

      return;
    }


    if (
      !$("#wordbookView")
        .classList.contains(
          "hidden"
        )
    ) {

      renderFile();
      return;
    }


    if (
      !$("#fileView")
        .classList.contains(
          "hidden"
        )
    ) {

      renderHome();
      return;
    }


    renderHome();
  }


  /* =====================================================
     다크모드
     ===================================================== */

  function loadTheme() {

    const theme =
      localStorage.getItem(
        THEME_KEY
      );


    const dark =
      theme === "dark";


    document.documentElement
      .classList.toggle(
        "dark",
        dark
      );


    $("#themeBtn")
      .textContent =
      dark
        ? "☀️"
        : "🌙";
  }


  function toggleTheme() {

    const dark =
      !document.documentElement
        .classList.contains(
          "dark"
        );


    document.documentElement
      .classList.toggle(
        "dark",
        dark
      );


    localStorage.setItem(
      THEME_KEY,
      dark
        ? "dark"
        : "light"
    );


    $("#themeBtn")
      .textContent =
      dark
        ? "☀️"
        : "🌙";
  }


  /* =====================================================
     온라인 상태
     ===================================================== */

  function updateOnlineStatus() {

    const status =
      $("#onlineStatus");

    if (!status) {
      return;
    }


    status.textContent =
      navigator.onLine
        ? "온라인"
        : "오프라인";
  }


  window.addEventListener(
    "online",
    updateOnlineStatus
  );


  window.addEventListener(
    "offline",
    updateOnlineStatus
  );


  /* =====================================================
     이벤트
     ===================================================== */

  document.addEventListener(
    "click",
    (event) => {

      const target =
        event.target;


      /* 상단 */

      const nav =
        target.closest(
          "[data-nav]"
        );

      if (nav) {

        const page =
          nav.dataset.nav;


        if (
          page ===
          "home"
        ) {

          renderHome();

        } else if (
          page ===
          "stats"
        ) {

          renderStats();

        } else if (
          page ===
          "settings"
        ) {

          renderSettings();
        }

        return;
      }


      if (
        target.closest(
          "#backBtn"
        )
      ) {

        goBack();
        return;
      }


      if (
        target.closest(
          "#logoBtn"
        )
      ) {

        renderHome();
        return;
      }


      if (
        target.closest(
          "#themeBtn"
        )
      ) {

        toggleTheme();
        return;
      }


      /* 파일 */

      if (
        target.closest(
          "#addFileBtn"
        )
      ) {

        addFile();
        return;
      }


      const openFileButton =
        target.closest(
          "[data-open-file]"
        );

      if (
        openFileButton
      ) {

        openFile(
          openFileButton
            .dataset
            .openFile
        );

        return;
      }


      const renameFileButton =
        target.closest(
          "[data-rename-file]"
        );

      if (
        renameFileButton
      ) {

        renameFile(
          renameFileButton
            .dataset
            .renameFile
        );

        return;
      }


      const deleteFileButton =
        target.closest(
          "[data-delete-file]"
        );

      if (
        deleteFileButton
      ) {

        deleteFile(
          deleteFileButton
            .dataset
            .deleteFile
        );

        return;
      }


      if (
        target.closest(
          "#fileHomeBtn"
        )
      ) {

        renderHome();
        return;
      }


      if (
        target.closest(
          "#addTestBtn"
        )
      ) {

        addTest();
        return;
      }


      if (
        target.closest(
          "#renameFileBtn"
        )
      ) {

        renameFile(
          currentFileId
        );

        return;
      }


      if (
        target.closest(
          "#deleteFileBtn"
        )
      ) {

        deleteFile(
          currentFileId
        );

        return;
      }


      /* 테스트 */

      const openTestButton =
        target.closest(
          "[data-open-test]"
        );

      if (
        openTestButton
      ) {

        openTest(
          openTestButton
            .dataset
            .openTest
        );

        return;
      }


      const renameTestButton =
        target.closest(
          "[data-rename-test]"
        );

      if (
        renameTestButton
      ) {

        renameTest(
          renameTestButton
            .dataset
            .renameTest
        );

        return;
      }


      const deleteTestButton =
        target.closest(
          "[data-delete-test]"
        );

      if (
        deleteTestButton
      ) {

        deleteTest(
          deleteTestButton
            .dataset
            .deleteTest
        );

        return;
      }


      /* 총합 테스트 */

      if (
        target.closest(
          "#totalAllTestBtn"
        )
      ) {

        const file =
          getCurrentFile();

        if (file) {
          startTotalQuiz(
            file,
            "mixed"
          );
        }

        return;
      }


      if (
        target.closest(
          "#totalDirectTestBtn"
        )
      ) {

        const file =
          getCurrentFile();

        if (file) {
          startTotalQuiz(
            file,
            "direct"
          );
        }

        return;
      }


      if (
        target.closest(
          "#totalReverseTestBtn"
        )
      ) {

        const file =
          getCurrentFile();

        if (file) {
          startTotalQuiz(
            file,
            "reverse"
          );
        }

        return;
      }


      if (
        target.closest(
          "#totalQuickTestBtn"
        )
      ) {

        openQuickModal();
        return;
      }


      /* 단어장 */

      if (
        target.closest(
          "#wordbookHomeBtn"
        )
      ) {

        renderHome();
        return;
      }


      if (
        target.closest(
          "#wordbookFileBtn"
        )
      ) {

        renderFile();
        return;
      }


      if (
        target.closest(
          "#renameTestBtn"
        )
      ) {

        renameTest(
          currentTestId
        );

        return;
      }


      if (
        target.closest(
          "#deleteTestBtn"
        )
      ) {

        deleteTest(
          currentTestId
        );

        return;
      }


      if (
        target.closest(
          "#allTestBtn"
        )
      ) {

        const test =
          getCurrentTest();

        if (test) {

          startQuiz(
            test,
            "mixed"
          );
        }

        return;
      }


      if (
        target.closest(
          "#directTestBtn"
        )
      ) {

        const test =
          getCurrentTest();

        if (test) {

          startQuiz(
            test,
            "direct"
          );
        }

        return;
      }


      if (
        target.closest(
          "#reverseTestBtn"
        )
      ) {

        const test =
          getCurrentTest();

        if (test) {

          startQuiz(
            test,
            "reverse"
          );
        }

        return;
      }


      if (
        target.closest(
          "#quickTestBtn"
        )
      ) {

        openQuickModal();
        return;
      }


      const quickMode =
        target.closest(
          "[data-quick-mode]"
        );

      if (
        quickMode
      ) {

        const test =
          currentTestId ===
          "__total__"
            ? null
            : getCurrentTest();


        const mode =
          quickMode.dataset
            .quickMode;


        closeQuickModal();


        if (
          currentTestId ===
          "__total__"
        ) {

          const file =
            getCurrentFile();

          if (!file) {
            return;
          }


          let words =
            getAllFileWords(
              file
            );


          words =
            mode ===
            "important"
              ? words.filter(
                  word =>
                    word.important
                )
              : words.filter(
                  word =>
                    word.wrong > 0
                );


          if (!words.length) {

            alert(
              "조건에 맞는 단어가 없습니다."
            );

            return;
          }


          quizSession = {

            fileId:
              currentFileId,

            testId:
              "__total__",

            fileName:
              file.name,

            testName:
              "총합 테스트",

            words:
              shuffle(words),

            mode,

            index: 0,

            correct: 0,

            wrong: 0,

            wrongWords: [],

            answered: false,

            totalMode: true

          };


          renderQuizQuestion();

        } else if (test) {

          startQuiz(
            test,
            mode
          );
        }

        return;
      }


      /* 단어 */

      if (
        target.closest(
          "#bulkWordInput"
        )
      ) {
        return;
      }


      const importantButton =
        target.closest(
          "[data-important-word]"
        );

      if (
        importantButton
      ) {

        toggleImportant(
          importantButton
            .dataset
            .importantWord
        );

        return;
      }


      const editWordButton =
        target.closest(
          "[data-edit-word]"
        );

      if (
        editWordButton
      ) {

        editWord(
          editWordButton
            .dataset
            .editWord
        );

        return;
      }


      const deleteWordButton =
        target.closest(
          "[data-delete-word]"
        );

      if (
        deleteWordButton
      ) {

        deleteWord(
          deleteWordButton
            .dataset
            .deleteWord
        );

        return;
      }


      /* 퀴즈 */

      if (
        target.closest(
          "#quitQuizBtn"
        )
      ) {

        if (
          !confirm(
            "진행 중인 테스트를 종료할까요?"
          )
        ) {
          return;
        }


        clearTimer();

        quizSession =
          null;


        if (
          currentTestId ===
          "__total__"
        ) {

          renderFile();

        } else {

          renderWordbook();
        }

        return;
      }


      if (
        target.closest(
          "#quizSubmitBtn"
        )
      ) {

        submitQuizAnswer();
        return;
      }


      /* 결과 */

      if (
        target.closest(
          "#goHomeResultBtn"
        )
      ) {

        quizSession =
          null;

        renderHome();

        return;
      }


      if (
        target.closest(
          "#goCurrentBookBtn"
        )
      ) {

        if (!quizSession) {
          return;
        }


        currentFileId =
          quizSession.fileId;


        currentTestId =
          quizSession.testId;


        if (
          currentTestId ===
          "__total__"
        ) {

          renderFile();

        } else {

          renderWordbook();
        }

        return;
      }


      if (
        target.closest(
          "#retryWrongBtn"
        )
      ) {

        retryWrong();
        return;
      }


      /* 빠른 테스트 모달 */

      if (
        target.closest(
          "#closeQuickModalBtn"
        ) ||
        target.closest(
          "#quickModalBackdrop"
        )
      ) {

        closeQuickModal();
        return;
      }


      /* 설정 */

      if (
        target.closest(
          "#exportBtn"
        )
      ) {

        exportData();
        return;
      }


      if (
        target.closest(
          "#importBtn"
        )
      ) {

        $("#importFile").click();
        return;
      }


      if (
        target.closest(
          "#resetBtn"
        )
      ) {

        resetAll();
      }

    }
  );


  /* =====================================================
     Enter
     ===================================================== */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        quizSession &&
        !$("#quizView")
          .classList.contains(
            "hidden"
          ) &&
        event.key ===
          "Enter"
      ) {

        event.preventDefault();


        if (
          quizSession.answered
        ) {

          nextQuestion();

        } else {

          submitQuizAnswer();
        }


        return;
      }


      if (
        !quizSession &&
        document.activeElement ===
          $("#bulkWordInput") &&
        event.key ===
          "Enter"
      ) {

        event.preventDefault();

        addWordsFromInput();
      }

    }
  );


  /* =====================================================
     JSON
     ===================================================== */

  $("#importFile")
    .addEventListener(
      "change",
      (event) => {

        importData(
          event.target.files[0]
        );

        event.target.value =
          "";
      }
    );


  /* =====================================================
     다크모드
     ===================================================== */

  function loadTheme() {

    const theme =
      localStorage.getItem(
        THEME_KEY
      );


    const dark =
      theme === "dark";


    document.documentElement
      .classList.toggle(
        "dark",
        dark
      );


    $("#themeBtn")
      .textContent =
      dark
        ? "☀️"
        : "🌙";
  }


  function toggleTheme() {

    const dark =
      !document.documentElement
        .classList.contains(
          "dark"
        );


    document.documentElement
      .classList.toggle(
        "dark",
        dark
      );


    localStorage.setItem(
      THEME_KEY,
      dark
        ? "dark"
        : "light"
    );


    $("#themeBtn")
      .textContent =
      dark
        ? "☀️"
        : "🌙";
  }


  /* =====================================================
     온라인 상태
     ===================================================== */

  function updateOnlineStatus() {

    const status =
      $("#onlineStatus");

    if (!status) {
      return;
    }


    status.textContent =
      navigator.onLine
        ? "온라인"
        : "오프라인";
  }


  window.addEventListener(
    "online",
    updateOnlineStatus
  );


  window.addEventListener(
    "offline",
    updateOnlineStatus
  );


  /* =====================================================
     PWA
     ===================================================== */

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
            (error) =>
              console.error(
                "Service Worker 오류:",
                error
              )
          );

      }
    );
  }


  /* =====================================================
     초기화
     ===================================================== */

  load();

  loadTheme();

  updateOnlineStatus();

  renderHome();

})();
