/* =========================================================
   영어 단어장 앱 - app.js
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     기본 설정
     --------------------------------------------------------- */

  const APP_VERSION = "2.0.0";
  const STORAGE_KEY = "vocab_app_data_v2";
  const SETTINGS_KEY = "vocab_app_settings_v2";
  const HISTORY_KEY = "vocab_app_history_v2";
  const THEME_KEY = "vocab_app_theme_v2";

  const ROOT_ITEM_LIMIT = 5;
  const FOLDER_ITEM_LIMIT = 5;

  let currentPage = "home";
  let currentBundleId = null;
  let currentFolderId = null;

  let currentRootPage = 1;
  let currentFolderPage = 1;

  let currentSort = "manual";
  let currentSearch = "";

  let testState = null;
  let quickTestState = null;

  let modalConfirmHandler = null;
  let modalCancelHandler = null;

  let data = {
    folders: [],
    bundles: [],
    words: [],
  };

  let settings = {
    autoNext: true,
    darkMode: false,
  };

  let history = [];

  /* ---------------------------------------------------------
     공통 유틸
     --------------------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function uid(prefix = "id") {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function formatDate(iso) {
    if (!iso) return "";

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function formatTime(iso) {
    if (!iso) return "";

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeEnglish(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function normalizeMeaning(value) {
    return String(value ?? "").trim();
  }

  function sameWord(word, english, meaning) {
    return (
      normalizeEnglish(word.english) === normalizeEnglish(english) &&
      normalizeMeaning(word.meaning) === normalizeMeaning(meaning)
    );
  }

  function getBundle(bundleId) {
    return data.bundles.find((bundle) => bundle.id === bundleId) || null;
  }

  function getFolder(folderId) {
    return data.folders.find((folder) => folder.id === folderId) || null;
  }

  function getWords(bundleId) {
    return data.words.filter((word) => word.bundleId === bundleId);
  }

  function getFolderBundles(folderId) {
    const folder = getFolder(folderId);

    if (!folder) return [];

    return folder.bundleIds
      .map((id) => getBundle(id))
      .filter(Boolean);
  }

  function isBundleImportant(bundle) {
    return Boolean(bundle?.important);
  }

  function getBundleFolder(bundleId) {
    return (
      data.folders.find((folder) => folder.bundleIds.includes(bundleId)) || null
    );
  }

  function saveAll() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          savedAt: nowISO(),
          data,
        })
      );

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      localStorage.setItem(THEME_KEY, settings.darkMode ? "dark" : "light");

      return true;
    } catch (error) {
      console.error("데이터 저장 실패:", error);
      return false;
    }
  }

  function loadAll() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);

      if (savedData) {
        const parsed = JSON.parse(savedData);

        if (parsed?.data) {
          data = {
            folders: Array.isArray(parsed.data.folders)
              ? parsed.data.folders
              : [],
            bundles: Array.isArray(parsed.data.bundles)
              ? parsed.data.bundles
              : [],
            words: Array.isArray(parsed.data.words)
              ? parsed.data.words
              : [],
          };
        }
      }
    } catch (error) {
      console.error("데이터 불러오기 실패:", error);
    }

    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);

        settings = {
          autoNext:
            typeof parsed.autoNext === "boolean" ? parsed.autoNext : true,
          darkMode:
            typeof parsed.darkMode === "boolean" ? parsed.darkMode : false,
        };
      }
    } catch (error) {
      console.error("설정 불러오기 실패:", error);
    }

    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);

      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        history = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error("기록 불러오기 실패:", error);
      history = [];
    }

    normalizeData();
  }

  function normalizeData() {
    data.folders = data.folders.map((folder) => ({
      id: folder.id || uid("folder"),
      name: String(folder.name || "이름 없음"),
      createdAt: folder.createdAt || nowISO(),
      bundleIds: Array.isArray(folder.bundleIds)
        ? [...new Set(folder.bundleIds)]
        : [],
    }));

    data.bundles = data.bundles.map((bundle) => ({
      id: bundle.id || uid("bundle"),
      name: String(bundle.name || "이름 없음"),
      createdAt: bundle.createdAt || nowISO(),
      important: Boolean(bundle.important),
      updatedAt: bundle.updatedAt || bundle.createdAt || nowISO(),
    }));

    data.words = data.words.map((word) => ({
      id: word.id || uid("word"),
      bundleId: word.bundleId,
      english: String(word.english || ""),
      meaning: String(word.meaning || ""),
      correct: Number(word.correct || 0),
      wrong: Number(word.wrong || 0),
      lastWrong: word.lastWrong || null,
      createdAt: word.createdAt || nowISO(),
    }));

    data.folders.forEach((folder) => {
      folder.bundleIds = folder.bundleIds.filter((bundleId) =>
        data.bundles.some((bundle) => bundle.id === bundleId)
      );
    });
  }

  /* ---------------------------------------------------------
     테마
     --------------------------------------------------------- */

  function applyTheme() {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.body.classList.toggle("dark", settings.darkMode);

    document.documentElement.setAttribute(
      "data-theme",
      settings.darkMode ? "dark" : "light"
    );

    const themeButton =
      $("#themeToggleBtn") ||
      $("#darkModeBtn") ||
      $("[data-action='toggle-theme']");

    if (themeButton) {
      themeButton.textContent = settings.darkMode ? "☀️" : "🌙";
    }
  }

  function toggleDarkMode() {
    const nextTheme = !settings.darkMode;

    openConfirmModal(
      `${nextTheme ? "다크 모드" : "라이트 모드"}로 변경할까요?`,
      () => {
        settings.darkMode = nextTheme;
        saveAll();
        applyTheme();
        renderCurrentPage();
      }
    );
  }

  /* ---------------------------------------------------------
     페이지 이동
     --------------------------------------------------------- */

  function getPageElement(pageName) {
    const map = {
      home: ["#homePage", "#home"],
      bundle: ["#bundlePage", "#bundle"],
      folder: ["#folderPage", "#folder"],
      test: ["#testPage", "#test"],
      quickTest: ["#quickTestPage", "#quickTest"],
      stats: ["#statsPage", "#statisticsPage", "#statistics"],
      settings: ["#settingsPage", "#settings"],
    };

    const selectors = map[pageName] || [];

    for (const selector of selectors) {
      const element = $(selector);

      if (element) return element;
    }

    return null;
  }

  function hideAllPages() {
    $$("[data-page]").forEach((element) => {
      element.classList.add("hidden");
    });

    [
      "#homePage",
      "#home",
      "#bundlePage",
      "#bundle",
      "#folderPage",
      "#folder",
      "#testPage",
      "#test",
      "#quickTestPage",
      "#quickTest",
      "#statsPage",
      "#statisticsPage",
      "#statistics",
      "#settingsPage",
      "#settings",
    ].forEach((selector) => {
      const element = $(selector);
      if (element) element.classList.add("hidden");
    });
  }

  function showPage(pageName) {
    currentPage = pageName;

    hideAllPages();

    const page = getPageElement(pageName);

    if (page) {
      page.classList.remove("hidden");
    }

    renderCurrentPage();
    updateNavigation();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function renderCurrentPage() {
    switch (currentPage) {
      case "home":
        renderHome();
        break;

      case "bundle":
        renderBundlePage();
        break;

      case "folder":
        renderFolderPage();
        break;

      case "test":
        renderTestPage();
        break;

      case "quickTest":
        renderQuickTestPage();
        break;

      case "stats":
        renderStatsPage();
        break;

      case "settings":
        renderSettingsPage();
        break;

      default:
        renderHome();
        break;
    }
  }

  function updateNavigation() {
    const pageButtons = $$("[data-page-target]");

    pageButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.pageTarget === currentPage
      );
    });
  }

  /* ---------------------------------------------------------
     브레드크럼
     --------------------------------------------------------- */

  function renderBreadcrumb(items) {
    const containers = [
      $("#breadcrumb"),
      $("#breadcrumbs"),
      $(".breadcrumb"),
    ].filter(Boolean);

    if (!containers.length) return;

    const html = items
      .map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast) {
          return `<span class="breadcrumb-current">${escapeHTML(
            item.label
          )}</span>`;
        }

        return `
          <button
            class="breadcrumb-link"
            type="button"
            data-breadcrumb-page="${escapeHTML(item.page || "home")}"
            data-breadcrumb-id="${escapeHTML(item.id || "")}"
          >
            ${escapeHTML(item.label)}
          </button>
          <span class="breadcrumb-separator">›</span>
        `;
      })
      .join("");

    containers.forEach((container) => {
      container.innerHTML = html;
    });
  }

  function renderHomeBreadcrumb() {
    renderBreadcrumb([
      {
        label: "🏠 홈",
        page: "home",
      },
    ]);
  }

  /* ---------------------------------------------------------
     묶음 정렬
     --------------------------------------------------------- */

  function sortBundles(bundles, sortType = currentSort) {
    const copied = [...bundles];

    switch (sortType) {
      case "oldest":
        return copied.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );

      case "newest":
        return copied.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

      case "importantOldest":
        return copied
          .filter((bundle) => bundle.important)
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()
          );

      case "importantNewest":
        return copied
          .filter((bundle) => bundle.important)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );

      default:
        return copied;
    }
  }

  function filterBundles(bundles) {
    const keyword = currentSearch.trim().toLowerCase();

    if (!keyword) return bundles;

    return bundles.filter((bundle) => {
      const bundleWords = getWords(bundle.id);

      const folder = getBundleFolder(bundle.id);

      const nameMatch = bundle.name.toLowerCase().includes(keyword);

      const folderMatch =
        folder?.name?.toLowerCase().includes(keyword) || false;

      const wordMatch = bundleWords.some(
        (word) =>
          word.english.toLowerCase().includes(keyword) ||
          word.meaning.toLowerCase().includes(keyword)
      );

      return nameMatch || folderMatch || wordMatch;
    });
  }

  /* ---------------------------------------------------------
     홈
     --------------------------------------------------------- */

  function getRootBundles() {
    const folderBundleIds = new Set();

    data.folders.forEach((folder) => {
      folder.bundleIds.forEach((bundleId) => {
        folderBundleIds.add(bundleId);
      });
    });

    return data.bundles.filter((bundle) => !folderBundleIds.has(bundle.id));
  }

  function getRootItems() {
    const rootBundles = sortBundles(getRootBundles());
    const folders = [...data.folders];

    const items = [
      ...folders.map((folder) => ({
        type: "folder",
        id: folder.id,
        createdAt: folder.createdAt,
        name: folder.name,
        important: false,
      })),
      ...rootBundles.map((bundle) => ({
        type: "bundle",
        id: bundle.id,
        createdAt: bundle.createdAt,
        name: bundle.name,
        important: bundle.important,
      })),
    ];

    if (currentSort === "oldest") {
      items.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      );
    } else if (currentSort === "newest") {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
    } else if (
      currentSort === "importantOldest" ||
      currentSort === "importantNewest"
    ) {
      return rootBundles
        .filter((bundle) => bundle.important)
        .map((bundle) => ({
          type: "bundle",
          id: bundle.id,
          createdAt: bundle.createdAt,
          name: bundle.name,
          important: true,
        }));
    }

    return items;
  }

  function renderHome() {
    renderHomeBreadcrumb();

    const list =
      $("#bundleList") ||
      $("#groupList") ||
      $("#wordList") ||
      $("#homeList");

    if (!list) return;

    let items = getRootItems();

    if (currentSearch.trim()) {
      items = items.filter((item) => {
        if (item.type === "folder") {
          return item.name.toLowerCase().includes(currentSearch.toLowerCase());
        }

        const bundle = getBundle(item.id);

        if (!bundle) return false;

        return filterBundles([bundle]).length > 0;
      });
    }

    const totalPages = Math.max(
      1,
      Math.ceil(items.length / ROOT_ITEM_LIMIT)
    );

    currentRootPage = Math.min(currentRootPage, totalPages);

    const start = (currentRootPage - 1) * ROOT_ITEM_LIMIT;

    const pageItems = items.slice(start, start + ROOT_ITEM_LIMIT);

    if (!pageItems.length) {
      list.innerHTML = `
        <div class="empty-state">
          아직 등록된 묶음이나 폴더가 없습니다.
        </div>
      `;
    } else {
      list.innerHTML = pageItems.map(renderRootItem).join("");
    }

    renderPagination("rootPagination", currentRootPage, totalPages);
  }

  function renderRootItem(item) {
    if (item.type === "folder") {
      const folder = getFolder(item.id);

      if (!folder) return "";

      return `
        <div
          class="group-card folder-card"
          draggable="true"
          data-type="folder"
          data-id="${escapeHTML(folder.id)}"
        >
          <button
            class="group-main-button"
            type="button"
            data-action="open-folder"
            data-id="${escapeHTML(folder.id)}"
          >
            <div class="group-icon">📁</div>

            <div class="group-content">
              <div class="group-title">
                ${escapeHTML(folder.name)}
              </div>

              <div class="group-subtitle">
                ${folder.bundleIds.length}개 묶음
              </div>
            </div>
          </button>

          <button
            type="button"
            class="important-button"
            data-action="delete-folder"
            data-id="${escapeHTML(folder.id)}"
            title="폴더 삭제"
          >
            🗑️
          </button>
        </div>
      `;
    }

    const bundle = getBundle(item.id);

    if (!bundle) return "";

    const count = getWords(bundle.id).length;

    return `
      <div
        class="group-card bundle-card"
        draggable="true"
        data-type="bundle"
        data-id="${escapeHTML(bundle.id)}"
      >
        <button
          class="group-main-button"
          type="button"
          data-action="open-bundle"
          data-id="${escapeHTML(bundle.id)}"
        >
          <div class="group-icon">📚</div>

          <div class="group-content">
            <div class="group-title">
              ${escapeHTML(bundle.name)}
              ${bundle.important ? " ⭐" : ""}
            </div>

            <div class="group-subtitle">
              ${count}개 단어 · ${formatDate(bundle.createdAt)}
            </div>
          </div>
        </button>

        <div class="group-actions">
          <button
            type="button"
            data-action="toggle-important"
            data-id="${escapeHTML(bundle.id)}"
            title="중요 묶음"
          >
            ${bundle.important ? "⭐" : "☆"}
          </button>
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     폴더
     --------------------------------------------------------- */

  function renderFolderPage() {
    const folder = getFolder(currentFolderId);

    if (!folder) {
      showPage("home");
      return;
    }

    renderBreadcrumb([
      {
        label: "🏠 홈",
        page: "home",
      },
      {
        label: `📁 ${folder.name}`,
        page: "folder",
        id: folder.id,
      },
    ]);

    const list =
      $("#bundleList") ||
      $("#groupList") ||
      $("#wordList") ||
      $("#folderBundleList");

    if (!list) return;

    let bundles = getFolderBundles(folder.id);

    bundles = sortBundles(bundles);

    const keyword = currentSearch.trim().toLowerCase();

    if (keyword) {
      bundles = bundles.filter((bundle) => {
        const words = getWords(bundle.id);

        return (
          bundle.name.toLowerCase().includes(keyword) ||
          words.some(
            (word) =>
              word.english.toLowerCase().includes(keyword) ||
              word.meaning.toLowerCase().includes(keyword)
          )
        );
      });
    }

    const totalPages = Math.max(
      1,
      Math.ceil(bundles.length / FOLDER_ITEM_LIMIT)
    );

    currentFolderPage = Math.min(currentFolderPage, totalPages);

    const start = (currentFolderPage - 1) * FOLDER_ITEM_LIMIT;

    const pageBundles = bundles.slice(
      start,
      start + FOLDER_ITEM_LIMIT
    );

    if (!pageBundles.length) {
      list.innerHTML = `
        <div class="empty-state">
          아직 이 폴더에 들어있는 묶음이 없습니다.
        </div>
      `;
    } else {
      list.innerHTML = pageBundles.map(renderBundleCard).join("");
    }

    renderPagination(
      "folderPagination",
      currentFolderPage,
      totalPages
    );

    const addButton =
      $("#addBundleToFolderBtn") ||
      $("#addBundleSlotBtn") ||
      $("[data-action='add-bundle-to-folder']");

    if (addButton) {
      addButton.style.display = "inline-flex";
    }
  }

  /* ---------------------------------------------------------
     묶음 카드
     --------------------------------------------------------- */

  function renderBundleCard(bundle) {
    const words = getWords(bundle.id);

    const folder = getBundleFolder(bundle.id);

    return `
      <div
        class="group-card bundle-card"
        draggable="true"
        data-type="bundle"
        data-id="${escapeHTML(bundle.id)}"
      >
        <button
          class="group-main-button"
          type="button"
          data-action="open-bundle"
          data-id="${escapeHTML(bundle.id)}"
        >
          <div class="group-icon">📚</div>

          <div class="group-content">
            <div class="group-title">
              ${escapeHTML(bundle.name)}
              ${bundle.important ? " ⭐" : ""}
            </div>

            <div class="group-subtitle">
              ${words.length}개 단어
              · ${formatDate(bundle.createdAt)}
              ${
                folder
                  ? `<br>📁 ${escapeHTML(folder.name)}`
                  : ""
              }
            </div>
          </div>
        </button>

        <div class="group-actions">
          <button
            type="button"
            data-action="toggle-important"
            data-id="${escapeHTML(bundle.id)}"
          >
            ${bundle.important ? "⭐" : "☆"}
          </button>
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     페이지네이션
     --------------------------------------------------------- */

  function renderPagination(containerId, current, total) {
    const container = $("#" + containerId);

    if (!container) return;

    if (total <= 1) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <button
        type="button"
        data-action="previous-page"
        data-container="${escapeHTML(containerId)}"
        ${current <= 1 ? "disabled" : ""}
      >
        ‹
      </button>

      <span>${current} / ${total}</span>

      <button
        type="button"
        data-action="next-page"
        data-container="${escapeHTML(containerId)}"
        ${current >= total ? "disabled" : ""}
      >
        ›
      </button>
    `;
  }

  /* ---------------------------------------------------------
     묶음 페이지
     --------------------------------------------------------- */

  function renderBundlePage() {
    const bundle = getBundle(currentBundleId);

    if (!bundle) {
      showPage("home");
      return;
    }

    const folder = getBundleFolder(bundle.id);

    if (folder) {
      renderBreadcrumb([
        {
          label: "🏠 홈",
          page: "home",
        },
        {
          label: `📁 ${folder.name}`,
          page: "folder",
          id: folder.id,
        },
        {
          label: `📚 ${bundle.name}`,
          page: "bundle",
          id: bundle.id,
        },
      ]);
    } else {
      renderBreadcrumb([
        {
          label: "🏠 홈",
          page: "home",
        },
        {
          label: `📚 ${bundle.name}`,
          page: "bundle",
          id: bundle.id,
        },
      ]);
    }

    const title =
      $("#bundleTitle") ||
      $("#currentBundleTitle") ||
      $(".bundle-title");

    if (title) {
      title.textContent =
        bundle.name + (bundle.important ? " ⭐" : "");
    }

    const wordList =
      $("#wordList") ||
      $("#bundleWordList") ||
      $("#wordsList");

    if (wordList) {
      const words = getWords(bundle.id);

      if (!words.length) {
        wordList.innerHTML = `
          <div class="empty-state">
            아직 등록된 단어가 없습니다.
          </div>
        `;
      } else {
        wordList.innerHTML = words.map(renderWordRow).join("");
      }
    }

    const count =
      $("#bundleWordCount") ||
      $("#wordCount");

    if (count) {
      count.textContent = getWords(bundle.id).length;
    }

    renderBundleNavigation();
  }

  function renderWordRow(word) {
    return `
      <div
        class="word-row"
        data-word-id="${escapeHTML(word.id)}"
      >
        <div class="word-text">
          <strong>${escapeHTML(word.english)}</strong>
          <span>${escapeHTML(word.meaning)}</span>
        </div>

        <div class="word-actions">
          <button
            type="button"
            data-action="edit-word"
            data-id="${escapeHTML(word.id)}"
          >
            ✏️
          </button>

          <button
            type="button"
            data-action="delete-word"
            data-id="${escapeHTML(word.id)}"
          >
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     묶음 이전/다음
     --------------------------------------------------------- */

  function getCurrentNavigationBundles() {
    if (currentFolderId) {
      return sortBundles(getFolderBundles(currentFolderId));
    }

    return sortBundles(getRootBundles());
  }

  function renderBundleNavigation() {
    const bundles = getCurrentNavigationBundles();

    const index = bundles.findIndex(
      (bundle) => bundle.id === currentBundleId
    );

    const prev = index > 0 ? bundles[index - 1] : null;
    const next =
      index >= 0 && index < bundles.length - 1
        ? bundles[index + 1]
        : null;

    const prevButton =
      $("#prevBundleBtn") ||
      $("[data-action='previous-bundle']");

    const nextButton =
      $("#nextBundleBtn") ||
      $("[data-action='next-bundle']");

    if (prevButton) {
      prevButton.disabled = !prev;
      prevButton.onclick = prev
        ? () => {
            currentBundleId = prev.id;
            renderBundlePage();
          }
        : null;
    }

    if (nextButton) {
      nextButton.disabled = !next;
      nextButton.onclick = next
        ? () => {
            currentBundleId = next.id;
            renderBundlePage();
          }
        : null;
    }
  }

  /* ---------------------------------------------------------
     유효성 검사
     --------------------------------------------------------- */

  function validateWords(words) {
    const invalid = [];

    words.forEach((word, index) => {
      if (!normalizeEnglish(word.english)) {
        invalid.push({
          index,
          reason: "영어 단어가 비어 있습니다.",
        });
      }

      if (!normalizeMeaning(word.meaning)) {
        invalid.push({
          index,
          reason: "뜻이 비어 있습니다.",
        });
      }
    });

    return invalid;
  }

  function scrollToWord(wordId) {
    requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-word-id="${CSS.escape(wordId)}"]`
      );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }

  /* ---------------------------------------------------------
     묶음 추가
     --------------------------------------------------------- */

  function addBundle() {
    openInputModal(
      "새 묶음 추가",
      "묶음 이름",
      "",
      (value) => {
        const name = value.trim();

        if (!name) {
          alert("묶음 이름을 입력해주세요.");
          return false;
        }

        if (
          name === "기타 단어" &&
          data.bundles.some((bundle) => bundle.name === "기타 단어")
        ) {
          alert("‘기타 단어’는 시스템에서 사용하는 이름입니다.");
          return false;
        }

        if (
          data.bundles.some(
            (bundle) =>
              bundle.name.trim().toLowerCase() ===
              name.toLowerCase()
          )
        ) {
          alert("같은 이름의 묶음이 이미 있습니다.");
          return false;
        }

        const bundle = {
          id: uid("bundle"),
          name,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          important: false,
        };

        data.bundles.push(bundle);

        saveAll();
        renderCurrentPage();

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     폴더 추가
     --------------------------------------------------------- */

  function addFolder() {
    openInputModal(
      "새 폴더 추가",
      "폴더 이름",
      "",
      (value) => {
        const name = value.trim();

        if (!name) {
          alert("폴더 이름을 입력해주세요.");
          return false;
        }

        if (
          data.folders.some(
            (folder) =>
              folder.name.trim().toLowerCase() ===
              name.toLowerCase()
          )
        ) {
          alert("같은 이름의 폴더가 이미 있습니다.");
          return false;
        }

        data.folders.push({
          id: uid("folder"),
          name,
          createdAt: nowISO(),
          bundleIds: [],
        });

        saveAll();
        renderCurrentPage();

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     이름 변경
     --------------------------------------------------------- */

  function renameBundle() {
    const bundle = getBundle(currentBundleId);

    if (!bundle) return;

    openInputModal(
      "묶음 이름 변경",
      "묶음 이름",
      bundle.name,
      (value) => {
        const name = value.trim();

        if (!name) {
          alert("묶음 이름을 입력해주세요.");
          return false;
        }

        const duplicate = data.bundles.some(
          (other) =>
            other.id !== bundle.id &&
            other.name.trim().toLowerCase() ===
              name.toLowerCase()
        );

        if (duplicate) {
          alert("같은 이름의 묶음이 이미 있습니다.");
          return false;
        }

        bundle.name = name;
        bundle.updatedAt = nowISO();

        saveAll();
        renderBundlePage();

        return true;
      }
    );
  }

  function renameFolder() {
    const folder = getFolder(currentFolderId);

    if (!folder) return;

    openInputModal(
      "폴더 이름 변경",
      "폴더 이름",
      folder.name,
      (value) => {
        const name = value.trim();

        if (!name) {
          alert("폴더 이름을 입력해주세요.");
          return false;
        }

        const duplicate = data.folders.some(
          (other) =>
            other.id !== folder.id &&
            other.name.trim().toLowerCase() ===
              name.toLowerCase()
        );

        if (duplicate) {
          alert("같은 이름의 폴더가 이미 있습니다.");
          return false;
        }

        folder.name = name;

        saveAll();
        renderFolderPage();

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     중요 묶음
     --------------------------------------------------------- */

  function toggleImportant(bundleId) {
    const bundle = getBundle(bundleId);

    if (!bundle) return;

    bundle.important = !bundle.important;
    bundle.updatedAt = nowISO();

    saveAll();
    renderCurrentPage();
  }

  /* ---------------------------------------------------------
     단어 추가
     --------------------------------------------------------- */

  function addWord(bundleId) {
    const bundle = getBundle(bundleId);

    if (!bundle) return;

    openWordModal(
      "단어 추가",
      "",
      "",
      (english, meaning) => {
        english = english.trim();
        meaning = meaning.trim();

        if (!english) {
          alert("영어 단어를 입력해주세요.");
          return false;
        }

        if (!meaning) {
          alert("뜻을 입력해주세요.");
          return false;
        }

        const duplicate = getWords(bundle.id).some((word) =>
          sameWord(word, english, meaning)
        );

        if (duplicate) {
          alert("같은 영어 단어와 뜻이 이미 있습니다.");
          return false;
        }

        data.words.push({
          id: uid("word"),
          bundleId: bundle.id,
          english,
          meaning,
          correct: 0,
          wrong: 0,
          lastWrong: null,
          createdAt: nowISO(),
        });

        bundle.updatedAt = nowISO();

        saveAll();
        renderBundlePage();

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     단어 수정
     --------------------------------------------------------- */

  function editWord(wordId) {
    const word = data.words.find((item) => item.id === wordId);

    if (!word) return;

    openWordModal(
      "단어 수정",
      word.english,
      word.meaning,
      (english, meaning) => {
        english = english.trim();
        meaning = meaning.trim();

        if (!english) {
          alert("영어 단어를 입력해주세요.");
          return false;
        }

        if (!meaning) {
          alert("뜻을 입력해주세요.");
          return false;
        }

        const duplicate = getWords(word.bundleId).some(
          (other) =>
            other.id !== word.id &&
            sameWord(other, english, meaning)
        );

        if (duplicate) {
          alert("같은 영어 단어와 뜻이 이미 있습니다.");
          return false;
        }

        word.english = english;
        word.meaning = meaning;

        saveAll();
        renderBundlePage();

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     단어 삭제
     --------------------------------------------------------- */

  function deleteWord(wordId) {
    const word = data.words.find((item) => item.id === wordId);

    if (!word) return;

    openConfirmModal(
      `"${word.english}" 단어를 삭제할까요?`,
      () => {
        data.words = data.words.filter(
          (item) => item.id !== wordId
        );

        saveAll();
        renderBundlePage();
      }
    );
  }

  /* ---------------------------------------------------------
     묶음 삭제
     --------------------------------------------------------- */

  function deleteBundle(bundleId) {
    const bundle = getBundle(bundleId);

    if (!bundle) return;

    openConfirmModal(
      `"${bundle.name}" 묶음과 안의 모든 단어를 삭제할까요?`,
      () => {
        data.words = data.words.filter(
          (word) => word.bundleId !== bundleId
        );

        data.folders.forEach((folder) => {
          folder.bundleIds = folder.bundleIds.filter(
            (id) => id !== bundleId
          );
        });

        data.bundles = data.bundles.filter(
          (item) => item.id !== bundleId
        );

        if (currentBundleId === bundleId) {
          currentBundleId = null;
          showPage("home");
        } else {
          saveAll();
          renderCurrentPage();
        }
      }
    );
  }

  /* ---------------------------------------------------------
     폴더 삭제
     --------------------------------------------------------- */

  function deleteFolder(folderId) {
    const folder = getFolder(folderId);

    if (!folder) return;

    openConfirmModal(
      `"${folder.name}" 폴더를 삭제할까요?\n\n폴더 안의 묶음과 단어는 삭제되지 않습니다.`,
      () => {
        data.folders = data.folders.filter(
          (item) => item.id !== folderId
        );

        saveAll();

        if (currentFolderId === folderId) {
          currentFolderId = null;
          showPage("home");
        } else {
          renderCurrentPage();
        }
      }
    );
  }

  /* ---------------------------------------------------------
     폴더에 묶음 추가
     --------------------------------------------------------- */

  function addBundlesToFolder() {
    const folder = getFolder(currentFolderId);

    if (!folder) return;

    const candidates = getRootBundles();

    openMultiSelectModal(
      `${folder.name}에 묶음 추가`,
      candidates.filter(
        (bundle) => !folder.bundleIds.includes(bundle.id)
      ),
      (selectedIds) => {
        selectedIds.forEach((bundleId) => {
          if (!folder.bundleIds.includes(bundleId)) {
            folder.bundleIds.push(bundleId);
          }
        });

        saveAll();
        renderFolderPage();
      }
    );
  }

  /* ---------------------------------------------------------
     묶음 이동
     --------------------------------------------------------- */

  function moveBundleToFolder(bundleId, folderId) {
    const folder = getFolder(folderId);
    const bundle = getBundle(bundleId);

    if (!folder || !bundle) return;

    data.folders.forEach((otherFolder) => {
      otherFolder.bundleIds = otherFolder.bundleIds.filter(
        (id) => id !== bundleId
      );
    });

    if (!folder.bundleIds.includes(bundleId)) {
      folder.bundleIds.push(bundleId);
    }

    saveAll();

    if (currentFolderId === folderId) {
      currentFolderPage = Math.ceil(
        folder.bundleIds.length / FOLDER_ITEM_LIMIT
      );

      renderFolderPage();
    } else {
      renderCurrentPage();
    }
  }

  function removeBundleFromFolder(bundleId) {
    data.folders.forEach((folder) => {
      folder.bundleIds = folder.bundleIds.filter(
        (id) => id !== bundleId
      );
    });

    saveAll();
  }

  /* ---------------------------------------------------------
     검색
     --------------------------------------------------------- */

  function setupSearchInputs() {
    const inputs = [
      $("#globalSearch"),
      $("#homeSearch"),
      $("#bundleSearch"),
      $("#folderSearch"),
      $("#searchInput"),
    ].filter(Boolean);

    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        currentSearch = input.value;

        inputs.forEach((other) => {
          if (other !== input) {
            other.value = input.value;
          }
        });

        currentRootPage = 1;
        currentFolderPage = 1;

        renderCurrentPage();
      });
    });
  }

  /* ---------------------------------------------------------
     정렬
     --------------------------------------------------------- */

  function setupSortSelect() {
    const select =
      $("#sortSelect") ||
      $("#bundleSort") ||
      $("#sortOption");

    if (!select) return;

    select.value = currentSort;

    select.addEventListener("change", () => {
      currentSort = select.value;
      currentRootPage = 1;
      currentFolderPage = 1;
      renderCurrentPage();
    });
  }

  /* ---------------------------------------------------------
     테스트 준비
     --------------------------------------------------------- */

  function validateTestStart(bundleId) {
    const words = getWords(bundleId);

    if (!words.length) {
      alert("이 묶음에는 단어가 없습니다.");
      return false;
    }

    const invalid = validateWords(words);

    if (invalid.length > 0) {
      const firstInvalid = words[invalid[0].index];

      alert(
        `테스트를 시작할 수 없습니다.\n\n${invalid[0].reason}`
      );

      if (firstInvalid) {
        scrollToWord(firstInvalid.id);
      }

      return false;
    }

    return true;
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /* ---------------------------------------------------------
     묶음 테스트
     --------------------------------------------------------- */

  function startBundleTest(bundleId, direction, count) {
    if (!validateTestStart(bundleId)) return;

    const words = getWords(bundleId);

    let candidates = shuffle(words);

    if (count !== "all") {
      const number = Number(count);

      if (
        Number.isFinite(number) &&
        number > 0 &&
        number < candidates.length
      ) {
        candidates = candidates.slice(0, number);
      } else if (
        Number.isFinite(number) &&
        number > candidates.length
      ) {
        const answer = window.confirm(
          `선택한 문제 수(${number})보다 실제 단어 수(${candidates.length})가 적습니다.\n\n사용 가능한 ${candidates.length}개로 테스트할까요?`
        );

        if (!answer) return;
      }
    }

    if (count !== "all") {
      candidates = candidates.slice(0, Number(count));
    }

    testState = {
      source: "bundle",
      bundleId,
      direction,
      words: candidates,
      index: 0,
      answers: [],
      score: 0,
      startTime: nowISO(),
      lastAnswered: false,
    };

    showPage("test");
  }

  /* ---------------------------------------------------------
     테스트 페이지
     --------------------------------------------------------- */

  function renderTestPage() {
    if (!testState) {
      showPage("home");
      return;
    }

    const page = getPageElement("test");

    if (!page) return;

    if (testState.source === "bundle") {
      const bundle = getBundle(testState.bundleId);

      renderBreadcrumb([
        {
          label: "🏠 홈",
          page: "home",
        },
        {
          label: `📚 ${bundle?.name || "묶음"}`,
          page: "bundle",
          id: testState.bundleId,
        },
        {
          label: "📝 테스트",
          page: "test",
        },
      ]);
    }

    if (testState.index >= testState.words.length) {
      renderTestResult();
      return;
    }

    const word = testState.words[testState.index];

    const questionArea =
      $("#testQuestion") ||
      $("#questionArea");

    const answerInput =
      $("#testAnswer") ||
      $("#answerInput");

    const progress =
      $("#testProgress") ||
      $("#questionProgress");

    const submitButton =
      $("#testSubmitBtn") ||
      $("#checkAnswerBtn");

    if (progress) {
      progress.textContent =
        `${testState.index + 1} / ${testState.words.length}`;
    }

    const askMeaning =
      testState.direction === "englishMeaning";

    const askEnglish =
      testState.direction === "meaningEnglish";

    let question = "";
    let placeholder = "";

    if (testState.direction === "mixed") {
      if (testState.currentDirection === undefined) {
        testState.currentDirection =
          Math.random() < 0.5
            ? "englishMeaning"
            : "meaningEnglish";
      }

      if (testState.currentDirection === "englishMeaning") {
        question = word.english;
        placeholder = "뜻을 입력하세요";
      } else {
        question = word.meaning;
        placeholder = "영어를 입력하세요";
      }
    } else if (askMeaning) {
      question = word.english;
      placeholder = "뜻을 입력하세요";
    } else if (askEnglish) {
      question = word.meaning;
      placeholder = "영어를 입력하세요";
    }

    if (questionArea) {
      questionArea.innerHTML = `
        <div class="test-question-text">
          ${escapeHTML(question)}
        </div>
      `;
    }

    if (answerInput) {
      answerInput.placeholder = placeholder;
      answerInput.value = "";
      answerInput.disabled = false;
      answerInput.focus();
    }

    if (submitButton) {
      submitButton.textContent = "정답 확인";
      submitButton.disabled = false;
    }

    testState.lastAnswered = false;
  }

  function normalizeAnswer(answer) {
    return String(answer || "").trim().toLowerCase();
  }

  function checkBundleAnswer() {
    if (!testState) return;

    if (testState.lastAnswered) {
      goNextTestQuestion();
      return;
    }

    const answerInput =
      $("#testAnswer") ||
      $("#answerInput");

    if (!answerInput) return;

    const answer = normalizeAnswer(answerInput.value);

    if (!answer) {
      alert("답을 입력해주세요.");
      return;
    }

    const word = testState.words[testState.index];

    let expectedAnswers = [];

    if (testState.direction === "englishMeaning") {
      expectedAnswers = [word.meaning];
    } else if (testState.direction === "meaningEnglish") {
      expectedAnswers = [word.english];
    } else {
      const direction =
        testState.currentDirection || "englishMeaning";

      expectedAnswers =
        direction === "englishMeaning"
          ? [word.meaning]
          : [word.english];
    }

    const correct = expectedAnswers.some(
      (item) => normalizeAnswer(item) === answer
    );

    testState.answers.push({
      wordId: word.id,
      answer,
      correct,
      expected: expectedAnswers,
    });

    if (correct) {
      testState.score += 1;
      word.correct += 1;
    } else {
      word.wrong += 1;
      word.lastWrong = nowISO();
    }

    saveAll();

    testState.lastAnswered = true;

    const feedback =
      $("#testFeedback") ||
      $("#answerFeedback");

    if (feedback) {
      feedback.innerHTML = correct
        ? `<div class="correct">⭕ 정답입니다!</div>`
        : `
            <div class="wrong">
              ❌ 오답입니다.<br>
              정답: ${expectedAnswers
                .map(escapeHTML)
                .join(", ")}
            </div>
          `;
    }

    answerInput.disabled = true;

    const submitButton =
      $("#testSubmitBtn") ||
      $("#checkAnswerBtn");

    if (submitButton) {
      submitButton.textContent =
        testState.index === testState.words.length - 1
          ? "마치기"
          : "다음";
    }

    if (settings.autoNext && correct) {
      setTimeout(() => {
        if (testState?.lastAnswered) {
          goNextTestQuestion();
        }
      }, 500);
    }
  }

  function goNextTestQuestion() {
    if (!testState) return;

    if (!testState.lastAnswered) {
      checkBundleAnswer();
      return;
    }

    if (
      testState.index >=
      testState.words.length - 1
    ) {
      finishTest();
      return;
    }

    testState.index += 1;

    if (testState.direction === "mixed") {
      testState.currentDirection =
        Math.random() < 0.5
          ? "englishMeaning"
          : "meaningEnglish";
    }

    renderTestPage();
  }

  function finishTest() {
    if (!testState) return;

    const bundleId = testState.bundleId;

    history.push({
      id: uid("history"),
      type: testState.source,
      bundleId: bundleId || null,
      date: nowISO(),
      total: testState.words.length,
      correct: testState.score,
      wrong: testState.words.length - testState.score,
    });

    if (history.length > 1000) {
      history = history.slice(-1000);
    }

    saveAll();

    testState.finished = true;

    renderTestResult();
  }

  /* ---------------------------------------------------------
     테스트 결과
     --------------------------------------------------------- */

  function renderTestResult() {
    const container =
      $("#testResult") ||
      $("#resultArea") ||
      $("#testPage");

    if (!container || !testState) return;

    const total = testState.words.length;
    const correct = testState.score;
    const wrong = total - correct;

    const wrongWords = testState.answers
      .filter((answer) => !answer.correct)
      .map((answer) =>
        testState.words.find(
          (word) => word.id === answer.wordId
        )
      )
      .filter(Boolean);

    const percentage =
      total > 0
        ? Math.round((correct / total) * 100)
        : 0;

    container.innerHTML = `
      <div class="test-result">
        ${testState.source === "bundle" ? "" : ""}

        <h2>테스트 결과</h2>

        <div class="result-score">
          ${correct} / ${total}
        </div>

        <div class="result-percent">
          ${percentage}%
        </div>

        <div class="result-detail">
          정답 ${correct}개 · 오답 ${wrong}개
        </div>

        ${
          wrongWords.length
            ? `
              <div class="wrong-word-list">
                <h3>틀린 단어</h3>
                ${wrongWords
                  .map(
                    (word) => `
                      <div class="wrong-word-item">
                        <strong>${escapeHTML(
                          word.english
                        )}</strong>
                        <span>${escapeHTML(
                          word.meaning
                        )}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `
              <div class="correct-result">
                모든 문제를 맞혔습니다! 🎉
              </div>
            `
        }

        <div class="result-buttons">
          <button
            type="button"
            data-action="retry-test"
          >
            틀린 단어 다시 테스트
          </button>

          ${
            testState.source === "bundle"
              ? `
                <button
                  type="button"
                  data-action="return-bundle"
                >
                  📚 단어장으로 돌아가기
                </button>
              `
              : `
                <button
                  type="button"
                  data-action="return-quick-test"
                >
                  ⚡ 빠른 테스트로 돌아가기
                </button>
              `
          }

          <button
            type="button"
            data-action="go-home"
          >
            🏠 홈으로
          </button>
        </div>
      </div>
    `;
  }

  function retryWrongTest() {
    if (!testState) return;

    const wrongWordIds = new Set(
      testState.answers
        .filter((answer) => !answer.correct)
        .map((answer) => answer.wordId)
    );

    const wrongWords = testState.words.filter((word) =>
      wrongWordIds.has(word.id)
    );

    if (!wrongWords.length) {
      alert("틀린 단어가 없습니다.");
      return;
    }

    const source = testState.source;

    if (source === "bundle") {
      testState = {
        source: "bundle",
        bundleId: testState.bundleId,
        direction: testState.direction,
        words: shuffle(wrongWords),
        index: 0,
        answers: [],
        score: 0,
        startTime: nowISO(),
        lastAnswered: false,
      };

      showPage("test");
      return;
    }

    quickTestState = {
      ...quickTestState,
      words: shuffle(wrongWords),
    };

    startQuickTestFromWords(
      quickTestState.words,
      quickTestState.direction,
      quickTestState.type
    );
  }

  /* ---------------------------------------------------------
     빠른 테스트
     --------------------------------------------------------- */

  function collectQuickTestWords(type) {
    const words = [...data.words];

    let filtered = words;

    switch (type) {
      case "difficult":
        filtered = words.filter(
          (word) => word.wrong > word.correct
        );
        break;

      case "wrong":
        filtered = words.filter(
          (word) => word.wrong > 0
        );
        break;

      case "recentWrong": {
        const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;

        filtered = words.filter((word) => {
          if (!word.lastWrong) return false;

          return (
            new Date(word.lastWrong).getTime() >= limit
          );
        });

        break;
      }

      case "important":
        filtered = words.filter((word) => {
          const bundle = getBundle(word.bundleId);
          return bundle?.important;
        });
        break;

      case "all":
      default:
        filtered = words;
        break;
    }

    return mergeQuickTestWords(filtered);
  }

  function mergeQuickTestWords(words) {
    const map = new Map();

    words.forEach((word) => {
      const key = normalizeEnglish(word.english);

      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          id: uid("quick"),
          english: word.english,
          meanings: [],
          refs: [],
        });
      }

      const item = map.get(key);

      if (
        !item.meanings.some(
          (meaning) =>
            normalizeMeaning(meaning) ===
            normalizeMeaning(word.meaning)
        )
      ) {
        item.meanings.push(word.meaning);
      }

      item.refs.push(word);
    });

    return [...map.values()];
  }

  function startQuickTest(type, direction, count) {
    const candidates = collectQuickTestWords(type);

    if (!candidates.length) {
      alert("조건에 맞는 단어가 없습니다.");
      return;
    }

    let selected = shuffle(candidates);

    if (count !== "all") {
      const number = Number(count);

      if (number > selected.length) {
        const answer = window.confirm(
          `선택한 문제 수(${number})보다 사용할 수 있는 단어가 적습니다.\n\n${selected.length}개로 테스트할까요?`
        );

        if (!answer) return;
      }

      selected = selected.slice(0, number);
    }

    quickTestState = {
      type,
      direction,
      words: selected,
    };

    startQuickTestFromWords(
      selected,
      direction,
      type
    );
  }

  function startQuickTestFromWords(
    words,
    direction,
    type
  ) {
    testState = {
      source: "quick",
      type,
      direction,
      words,
      index: 0,
      answers: [],
      score: 0,
      startTime: nowISO(),
      lastAnswered: false,
    };

    showPage("test");
  }

  function checkQuickAnswer() {
    if (!testState) return;

    if (testState.lastAnswered) {
      goNextTestQuestion();
      return;
    }

    const answerInput =
      $("#testAnswer") ||
      $("#answerInput");

    if (!answerInput) return;

    const answer = normalizeAnswer(answerInput.value);

    if (!answer) {
      alert("답을 입력해주세요.");
      return;
    }

    const item = testState.words[testState.index];

    let correct = false;

    if (
      testState.direction === "englishMeaning"
    ) {
      correct = item.meanings.some(
        (meaning) =>
          normalizeAnswer(meaning) === answer
      );
    } else {
      correct =
        normalizeAnswer(item.english) === answer;
    }

    testState.answers.push({
      wordId: item.id,
      quickItem: item,
      answer,
      correct,
    });

    if (correct) {
      testState.score += 1;

      item.refs.forEach((word) => {
        word.correct += 1;
      });
    } else {
      const currentDate = nowISO();

      item.refs.forEach((word) => {
        word.wrong += 1;
        word.lastWrong = currentDate;
      });
    }

    saveAll();

    testState.lastAnswered = true;

    const feedback =
      $("#testFeedback") ||
      $("#answerFeedback");

    if (feedback) {
      feedback.innerHTML = correct
        ? `<div class="correct">⭕ 정답입니다!</div>`
        : `
            <div class="wrong">
              ❌ 오답입니다.<br>
              정답:
              ${
                testState.direction === "englishMeaning"
                  ? item.meanings
                      .map(escapeHTML)
                      .join(", ")
                  : escapeHTML(item.english)
              }
            </div>
          `;
    }

    answerInput.disabled = true;

    const submitButton =
      $("#testSubmitBtn") ||
      $("#checkAnswerBtn");

    if (submitButton) {
      submitButton.textContent =
        testState.index === testState.words.length - 1
          ? "마치기"
          : "다음";
    }
  }

  /* ---------------------------------------------------------
     빠른 테스트 메뉴
     --------------------------------------------------------- */

  function openQuickTestModal(presetType = null) {
    openFormModal(
      "빠른 테스트",
      `
        <label>
          테스트 종류
          <select id="quickType">
            <option value="all">전체 단어</option>
            <option value="difficult">어려운 단어</option>
            <option value="wrong">틀린 단어</option>
            <option value="recentWrong">최근 틀린 단어</option>
            <option value="important">⭐ 중요 묶음</option>
          </select>
        </label>

        <label>
          출제 방향
          <select id="quickDirection">
            <option value="englishMeaning">영어 → 뜻</option>
            <option value="meaningEnglish">뜻 → 영어</option>
          </select>
        </label>

        <label>
          문제 수
          <select id="quickCount">
            <option value="all">전체</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
        </label>
      `,
      () => {
        const type =
          $("#quickType")?.value || "all";

        const direction =
          $("#quickDirection")?.value ||
          "englishMeaning";

        const count =
          $("#quickCount")?.value || "all";

        startQuickTest(type, direction, count);

        return true;
      },
      () => {},
      () => {
        if (presetType && $("#quickType")) {
          $("#quickType").value = presetType;
        }
      }
    );
  }

  /* ---------------------------------------------------------
     통계
     --------------------------------------------------------- */

  function renderStatsPage() {
    renderBreadcrumb([
      {
        label: "🏠 홈",
        page: "home",
      },
      {
        label: "📊 통계",
        page: "stats",
      },
    ]);

    const totalWords = data.words.length;

    const totalCorrect = data.words.reduce(
      (sum, word) => sum + word.correct,
      0
    );

    const totalWrong = data.words.reduce(
      (sum, word) => sum + word.wrong,
      0
    );

    const totalTests = history.length;

    const correctRate =
      totalCorrect + totalWrong > 0
        ? Math.round(
            (totalCorrect /
              (totalCorrect + totalWrong)) *
              100
          )
        : 0;

    const target =
      $("#statsSummary") ||
      $("#statisticsSummary") ||
      $("#statsPage");

    if (!target) return;

    const historyHtml = renderHistory();

    target.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card">
          <strong>${totalWords}</strong>
          <span>단어 수</span>
        </div>

        <div class="stat-card">
          <strong>${totalTests}</strong>
          <span>테스트 횟수</span>
        </div>

        <div class="stat-card">
          <strong>${totalCorrect}</strong>
          <span>정답 수</span>
        </div>

        <div class="stat-card">
          <strong>${correctRate}%</strong>
          <span>정답률</span>
        </div>
      </div>

      <div class="history-area">
        <h2>최근 학습 기록</h2>

        ${historyHtml}
      </div>
    `;
  }

  function getHistoryGroups() {
    const sorted = [...history].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

    const groups = {};

    sorted.forEach((record) => {
      const date = new Date(record.date);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      if (year === currentYear && month === currentMonth) {
        const key = `${year}-${month}-${day}`;

        if (!groups[key]) {
          groups[key] = {
            type: "date",
            year,
            month,
            day,
            records: [],
          };
        }

        groups[key].records.push(record);
      } else if (year === currentYear) {
        const key = `${year}-${month}-${day}`;

        if (!groups[key]) {
          groups[key] = {
            type: "date",
            year,
            month,
            day,
            records: [],
          };
        }

        groups[key].records.push(record);
      } else {
        const key = `${year}-${month}-${day}`;

        if (!groups[key]) {
          groups[key] = {
            type: "date",
            year,
            month,
            day,
            records: [],
          };
        }

        groups[key].records.push(record);
      }
    });

    return Object.values(groups);
  }

  function renderHistory() {
    if (!history.length) {
      return `
        <div class="empty-state">
          아직 테스트 기록이 없습니다.
        </div>
      `;
    }

    const groups = getHistoryGroups();

    return groups
      .map((group) => {
        const monthText = String(group.month).padStart(
          2,
          "0"
        );

        const dayText = String(group.day).padStart(
          2,
          "0"
        );

        const title =
          `${group.year}년 ${monthText}월 ${dayText}일`;

        return `
          <details class="history-date-group">
            <summary>${title}</summary>

            <div class="history-records">
              ${group.records
                .map((record) => {
                  const bundle = record.bundleId
                    ? getBundle(record.bundleId)
                    : null;

                  const score =
                    record.total > 0
                      ? Math.round(
                          (record.correct /
                            record.total) *
                            100
                        )
                      : 0;

                  return `
                    <details class="history-record">
                      <summary>
                        ${formatTime(record.date)}
                        ·
                        ${
                          record.type === "quick"
                            ? "⚡ 빠른 테스트"
                            : `📚 ${escapeHTML(
                                bundle?.name ||
                                  "묶음 테스트"
                              )}`
                        }
                        · ${score}%
                      </summary>

                      <div class="history-record-content">
                        <div>
                          정답 ${record.correct} /
                          ${record.total}
                        </div>

                        <div>
                          오답 ${record.wrong}
                        </div>
                      </div>
                    </details>
                  `;
                })
                .join("")}
            </div>
          </details>
        `;
      })
      .join("");
  }

  /* ---------------------------------------------------------
     설정
     --------------------------------------------------------- */

  function renderSettingsPage() {
    renderBreadcrumb([
      {
        label: "🏠 홈",
        page: "home",
      },
      {
        label: "⚙️ 설정",
        page: "settings",
      },
    ]);

    const autoNext =
      $("#autoNextToggle") ||
      $("#autoNext");

    if (autoNext) {
      autoNext.checked = settings.autoNext;
    }

    const version =
      $("#appVersion") ||
      $(".app-version");

    if (version) {
      version.textContent = APP_VERSION;
    }

    const lastChanged =
      $("#lastChanged") ||
      $("#lastSavedAt");

    if (lastChanged) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
          const parsed = JSON.parse(saved);

          if (parsed.savedAt) {
            lastChanged.textContent =
              formatDate(parsed.savedAt) +
              " " +
              formatTime(parsed.savedAt);
          }
        }
      } catch {
        lastChanged.textContent = "-";
      }
    }

    const darkToggle =
      $("#darkModeToggle") ||
      $("#darkMode");

    if (darkToggle) {
      const row =
        darkToggle.closest(".setting-row") ||
        darkToggle.parentElement;

      if (row) {
        row.style.display = "none";
      }
    }

    updateStorageInfo();
  }

  function updateStorageInfo() {
    const element =
      $("#storageInfo") ||
      $("#dataSize");

    if (!element) return;

    let bytes = 0;

    try {
      bytes += new Blob([
        JSON.stringify(data),
      ]).size;

      bytes += new Blob([
        JSON.stringify(settings),
      ]).size;
    } catch {
      bytes = 0;
    }

    let text = "";

    if (bytes < 1024) {
      text = `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      text = `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      text = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    element.textContent = text;
  }

  function saveSettings() {
    const autoNext =
      $("#autoNextToggle") ||
      $("#autoNext");

    if (autoNext) {
      settings.autoNext = Boolean(autoNext.checked);
    }

    saveAll();

    alert("설정이 저장되었습니다.");
  }

  /* ---------------------------------------------------------
     JSON 내보내기
     --------------------------------------------------------- */

  async function exportJSON() {
    const payload = {
      version: 2,
      appVersion: APP_VERSION,
      savedAt: nowISO(),

      data,
      settings,

      history,
    };

    const text = JSON.stringify(
      payload,
      null,
      2
    );

    const blob = new Blob([text], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    a.download = `vocabulary-backup-${date}.json`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------
     JSON 가져오기
     --------------------------------------------------------- */

  function importJSON() {
    const input =
      $("#importFileInput") ||
      document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";

    if (!input.parentElement) {
      input.style.display = "none";
      document.body.appendChild(input);
    }

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) return;

      try {
        const text = await file.text();

        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== "object") {
          throw new Error("잘못된 파일입니다.");
        }

        if (
          !parsed.data ||
          !Array.isArray(parsed.data.bundles) ||
          !Array.isArray(parsed.data.folders) ||
          !Array.isArray(parsed.data.words)
        ) {
          throw new Error(
            "단어장 데이터 형식이 올바르지 않습니다."
          );
        }

        openConfirmModal(
          "가져온 파일로 현재 데이터를 교체할까요?\n\n현재 데이터는 저장된 백업 파일이 없으면 되돌릴 수 없습니다.",
          () => {
            data = {
              folders: parsed.data.folders,
              bundles: parsed.data.bundles,
              words: parsed.data.words,
            };

            if (parsed.settings) {
              settings = {
                ...settings,
                ...parsed.settings,
              };
            }

            if (Array.isArray(parsed.history)) {
              history = parsed.history;
            }

            normalizeData();

            saveAll();

            currentBundleId = null;
            currentFolderId = null;

            showPage("home");
          }
        );
      } catch (error) {
        console.error(error);

        alert(
          "가져오기에 실패했습니다.\n\n현재 데이터는 변경되지 않았습니다."
        );
      } finally {
        input.value = "";
      }
    };

    input.click();
  }

  /* ---------------------------------------------------------
     모달
     --------------------------------------------------------- */

  function getModalElements() {
    const modal =
      $("#modal") ||
      $("#commonModal");

    if (!modal) return null;

    return {
      modal,

      title:
        modal.querySelector("#modalTitle") ||
        modal.querySelector(".modal-title"),

      body:
        modal.querySelector("#modalBody") ||
        modal.querySelector(".modal-body"),

      input:
        modal.querySelector("#modalInput") ||
        modal.querySelector("input"),

      confirm:
        modal.querySelector("#modalConfirm") ||
        modal.querySelector("[data-modal-confirm]"),

      cancel:
        modal.querySelector("#modalCancel") ||
        modal.querySelector("[data-modal-cancel]"),
    };
  }

  function openModal({
    title,
    body,
    confirmText = "확인",
    cancelText = "취소",
    onConfirm,
    onCancel,
  }) {
    const elements = getModalElements();

    if (!elements) {
      const result = window.confirm(
        `${title}\n\n${String(body).replace(/<[^>]*>/g, "")}`
      );

      if (result && onConfirm) {
        onConfirm();
      } else if (!result && onCancel) {
        onCancel();
      }

      return;
    }

    const {
      modal,
      title: titleElement,
      body: bodyElement,
      confirm,
      cancel,
    } = elements;

    if (titleElement) {
      titleElement.textContent = title;
    }

    if (bodyElement) {
      bodyElement.innerHTML = body;
    }

    if (confirm) {
      confirm.textContent = confirmText;
      confirm.onclick = () => {
        const result = onConfirm
          ? onConfirm()
          : true;

        if (result !== false) {
          closeModal();
        }
      };
    }

    if (cancel) {
      cancel.textContent = cancelText;
      cancel.onclick = () => {
        if (onCancel) onCancel();
        closeModal();
      };
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    modalConfirmHandler = onConfirm;
    modalCancelHandler = onCancel;
  }

  function openConfirmModal(message, onConfirm) {
    openModal({
      title: "확인",
      body: `
        <div class="confirm-message">
          ${escapeHTML(message).replace(/\n/g, "<br>")}
        </div>
      `,
      confirmText: "확인",
      cancelText: "취소",
      onConfirm,
    });
  }

  function openInputModal(
    title,
    label,
    value,
    onConfirm
  ) {
    openModal({
      title,

      body: `
        <label class="modal-input-label">
          ${escapeHTML(label)}

          <input
            id="modalInput"
            type="text"
            value="${escapeHTML(value)}"
            autocomplete="off"
          />
        </label>
      `,

      confirmText: "확인",
      cancelText: "취소",

      onConfirm: () => {
        const input = $("#modalInput");

        if (!input) return false;

        return onConfirm(input.value);
      },
    });

    requestAnimationFrame(() => {
      $("#modalInput")?.focus();

      $("#modalInput")?.select();

      $("#modalInput")?.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Enter") {
            event.preventDefault();

            const elements = getModalElements();

            elements?.confirm?.click();
          }
        }
      );
    });
  }

  function openWordModal(
    title,
    english,
    meaning,
    onConfirm
  ) {
    openModal({
      title,

      body: `
        <div class="modal-form">

          <label>
            영어
            <input
              id="modalEnglish"
              type="text"
              value="${escapeHTML(english)}"
              autocomplete="off"
            />
          </label>

          <label>
            뜻
            <input
              id="modalMeaning"
              type="text"
              value="${escapeHTML(meaning)}"
              autocomplete="off"
            />
          </label>

        </div>
      `,

      confirmText: "확인",
      cancelText: "취소",

      onConfirm: () => {
        const englishInput =
          $("#modalEnglish");

        const meaningInput =
          $("#modalMeaning");

        if (!englishInput || !meaningInput) {
          return false;
        }

        return onConfirm(
          englishInput.value,
          meaningInput.value
        );
      },
    });

    requestAnimationFrame(() => {
      $("#modalEnglish")?.focus();

      const enterHandler = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();

          const elements = getModalElements();

          elements?.confirm?.click();
        }
      };

      $("#modalEnglish")?.addEventListener(
        "keydown",
        enterHandler
      );

      $("#modalMeaning")?.addEventListener(
        "keydown",
        enterHandler
      );
    });
  }

  function openMultiSelectModal(
    title,
    items,
    onConfirm
  ) {
    if (!items.length) {
      alert("추가할 수 있는 묶음이 없습니다.");
      return;
    }

    openModal({
      title,

      body: `
        <div class="multi-select-tools">
          <button
            type="button"
            id="selectAllBundlesBtn"
          >
            모두 선택
          </button>

          <button
            type="button"
            id="unselectAllBundlesBtn"
          >
            모두 해제
          </button>
        </div>

        <div
          id="bundleMultiSelectList"
          class="bundle-multi-select-list"
        >
          ${items
            .map(
              (bundle) => `
                <label class="multi-select-item">
                  <input
                    type="checkbox"
                    value="${escapeHTML(bundle.id)}"
                    class="bundle-checkbox"
                  />

                  <span>
                    📚 ${escapeHTML(bundle.name)}
                  </span>
                </label>
              `
            )
            .join("")}
        </div>
      `,

      confirmText: "선택한 묶음 추가",
      cancelText: "취소",

      onConfirm: () => {
        const selected = $$(".bundle-checkbox")
          .filter((checkbox) => checkbox.checked)
          .map((checkbox) => checkbox.value);

        onConfirm(selected);

        return true;
      },
    });

    requestAnimationFrame(() => {
      $("#selectAllBundlesBtn")?.addEventListener(
        "click",
        () => {
          $$(".bundle-checkbox").forEach(
            (checkbox) => {
              checkbox.checked = true;
            }
          );
        }
      );

      $("#unselectAllBundlesBtn")?.addEventListener(
        "click",
        () => {
          $$(".bundle-checkbox").forEach(
            (checkbox) => {
              checkbox.checked = false;
            }
          );
        }
      );
    });
  }

  function openFormModal(
    title,
    html,
    onConfirm
  ) {
    openModal({
      title,
      body: html,
      confirmText: "시작",
      cancelText: "취소",
      onConfirm,
    });
  }

  function closeModal() {
    const elements = getModalElements();

    if (!elements) return;

    const { modal } = elements;

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

    modalConfirmHandler = null;
    modalCancelHandler = null;
  }

  /* ---------------------------------------------------------
     묶음 테스트 설정창
     --------------------------------------------------------- */

  function openBundleTestModal(bundleId) {
    if (!validateTestStart(bundleId)) return;

    openFormModal(
      "테스트 시작",
      `
        <div class="modal-form">

          <label>
            문제 유형

            <select id="bundleTestDirection">
              <option value="englishMeaning">
                영어 → 뜻
              </option>

              <option value="meaningEnglish">
                뜻 → 영어
              </option>

              <option value="mixed">
                혼합
              </option>
            </select>
          </label>

          <label>
            문제 수

            <select id="bundleTestCount">
              <option value="all">전체</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
          </label>

        </div>
      `,
      () => {
        const direction =
          $("#bundleTestDirection")?.value ||
          "englishMeaning";

        const count =
          $("#bundleTestCount")?.value ||
          "all";

        startBundleTest(
          bundleId,
          direction,
          count
        );

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     기타 단어
     --------------------------------------------------------- */

  function getOtherBundle() {
    return (
      data.bundles.find(
        (bundle) => bundle.name === "기타 단어"
      ) || null
    );
  }

  function ensureOtherBundle() {
    let bundle = getOtherBundle();

    if (!bundle) {
      bundle = {
        id: uid("bundle"),
        name: "기타 단어",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        important: false,
      };

      data.bundles.push(bundle);

      saveAll();
    }

    return bundle;
  }

  function addStandaloneWord() {
    const bundle = ensureOtherBundle();

    openWordModal(
      "단어 및 뜻 추가",
      "",
      "",
      (english, meaning) => {
        english = english.trim();
        meaning = meaning.trim();

        if (!english) {
          alert("영어 단어를 입력해주세요.");
          return false;
        }

        if (!meaning) {
          alert("뜻을 입력해주세요.");
          return false;
        }

        const duplicate = getWords(bundle.id).some(
          (word) => sameWord(
            word,
            english,
            meaning
          )
        );

        if (duplicate) {
          alert("같은 단어와 뜻이 이미 있습니다.");
          return false;
        }

        data.words.push({
          id: uid("word"),
          bundleId: bundle.id,
          english,
          meaning,
          correct: 0,
          wrong: 0,
          lastWrong: null,
          createdAt: nowISO(),
        });

        bundle.updatedAt = nowISO();

        saveAll();

        return true;
      }
    );
  }

  /* ---------------------------------------------------------
     드래그 앤 드롭
     --------------------------------------------------------- */

  let draggedItem = null;

  function setupDragAndDrop() {
    $$("[draggable='true']").forEach((element) => {
      element.addEventListener(
        "dragstart",
        (event) => {
          draggedItem = {
            type: element.dataset.type,
            id: element.dataset.id,
          };

          event.dataTransfer.effectAllowed =
            "move";

          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify(draggedItem)
          );

          element.classList.add("dragging");
        }
      );

      element.addEventListener(
        "dragend",
        () => {
          element.classList.remove("dragging");
          draggedItem = null;
        }
      );

      element.addEventListener(
        "dragover",
        (event) => {
          if (
            element.dataset.type === "folder" &&
            draggedItem?.type === "bundle"
          ) {
            event.preventDefault();

            element.classList.add("drag-over");
          }
        }
      );

      element.addEventListener(
        "dragleave",
        () => {
          element.classList.remove("drag-over");
        }
      );

      element.addEventListener(
        "drop",
        (event) => {
          event.preventDefault();

          element.classList.remove("drag-over");

          if (
            element.dataset.type === "folder" &&
            draggedItem?.type === "bundle"
          ) {
            moveBundleToFolder(
              draggedItem.id,
              element.dataset.id
            );
          }
        }
      );
    });
  }

  /* ---------------------------------------------------------
     버튼 이벤트
     --------------------------------------------------------- */

  function setupGlobalEvents() {
    document.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest("button");

        if (!button) return;

        const action =
          button.dataset.action;

        if (!action) return;

        switch (action) {
          case "go-home":
            currentBundleId = null;
            currentFolderId = null;
            showPage("home");
            break;

          case "open-bundle": {
            const id = button.dataset.id;

            currentBundleId = id;

            currentFolderId =
              getBundleFolder(id)?.id || null;

            showPage("bundle");
            break;
          }

          case "open-folder":
            currentFolderId =
              button.dataset.id;

            currentFolderPage = 1;

            currentSearch = "";

            showPage("folder");
            break;

          case "add-bundle":
            addBundle();
            break;

          case "add-folder":
            addFolder();
            break;

          case "add-word":
            if (currentBundleId) {
              addWord(currentBundleId);
            }
            break;

          case "edit-word":
            editWord(button.dataset.id);
            break;

          case "delete-word":
            deleteWord(button.dataset.id);
            break;

          case "delete-bundle":
            deleteBundle(button.dataset.id);
            break;

          case "delete-folder":
            deleteFolder(button.dataset.id);
            break;

          case "rename-bundle":
            renameBundle();
            break;

          case "rename-folder":
            renameFolder();
            break;

          case "toggle-important":
            toggleImportant(button.dataset.id);
            break;

          case "add-bundle-to-folder":
            addBundlesToFolder();
            break;

          case "start-bundle-test":
            if (currentBundleId) {
              openBundleTestModal(
                currentBundleId
              );
            }
            break;

          case "quick-test":
            openQuickTestModal();
            break;

          case "toggle-theme":
            toggleDarkMode();
            break;

          case "save-settings":
            saveSettings();
            break;

          case "export-json":
            exportJSON();
            break;

          case "import-json":
            importJSON();
            break;

          case "retry-test":
            retryWrongTest();
            break;

          case "return-bundle":
            if (testState?.bundleId) {
              currentBundleId =
                testState.bundleId;

              currentFolderId =
                getBundleFolder(
                  currentBundleId
                )?.id || null;

              showPage("bundle");
            }
            break;

          case "return-quick-test":
            openQuickTestModal(
              testState?.type || "all"
            );
            break;

          case "previous-page":
            changePage(-1);
            break;

          case "next-page":
            changePage(1);
            break;

          case "previous-bundle":
            navigateBundle(-1);
            break;

          case "next-bundle":
            navigateBundle(1);
            break;
        }
      }
    );

    document.addEventListener(
      "click",
      (event) => {
        const link =
          event.target.closest(
            "[data-page-target]"
          );

        if (!link) return;

        const page =
          link.dataset.pageTarget;

        if (page) {
          showPage(page);
        }
      }
    );

    document.addEventListener(
      "click",
      (event) => {
        const breadcrumb =
          event.target.closest(
            "[data-breadcrumb-page]"
          );

        if (!breadcrumb) return;

        const page =
          breadcrumb.dataset
            .breadcrumbPage;

        const id =
          breadcrumb.dataset
            .breadcrumbId;

        if (page === "home") {
          currentBundleId = null;
          currentFolderId = null;

          showPage("home");
        } else if (page === "bundle") {
          currentBundleId = id;

          currentFolderId =
            getBundleFolder(id)?.id ||
            null;

          showPage("bundle");
        } else if (page === "folder") {
          currentFolderId = id;

          showPage("folder");
        }
      }
    );
  }

  function setupStaticButtons() {
    const homeButtons = [
      ["#homeBtn", "home"],
      ["#navHome", "home"],
    ];

    homeButtons.forEach(([selector, page]) => {
      const button = $(selector);

      if (button) {
        button.addEventListener(
          "click",
          () => showPage(page)
        );
      }
    });

    const themeButton =
      $("#themeToggleBtn") ||
      $("#darkModeBtn");

    if (themeButton) {
      themeButton.addEventListener(
        "click",
        toggleDarkMode
      );
    }

    const testSubmit =
      $("#testSubmitBtn") ||
      $("#checkAnswerBtn");

    if (testSubmit) {
      testSubmit.addEventListener(
        "click",
        () => {
          if (testState?.source === "quick") {
            checkQuickAnswer();
          } else {
            checkBundleAnswer();
          }
        }
      );
    }

    const saveSettingsButton =
      $("#saveSettingsBtn");

    if (saveSettingsButton) {
      saveSettingsButton.addEventListener(
        "click",
        saveSettings
      );
    }
  }

  /* ---------------------------------------------------------
     키보드
     --------------------------------------------------------- */

  function setupKeyboard() {
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          currentPage !== "test" ||
          event.key !== "Enter"
        ) {
          return;
        }

        const target =
          event.target;

        if (
          target &&
          target.matches(
            "input, textarea, select"
          )
        ) {
          if (
            target.id === "testAnswer" ||
            target.id === "answerInput"
          ) {
            event.preventDefault();

            if (testState?.source === "quick") {
              checkQuickAnswer();
            } else {
              checkBundleAnswer();
            }
          }
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Escape" ||
          !getModalElements()
        ) {
          return;
        }

        closeModal();
      }
    );
  }

  /* ---------------------------------------------------------
     테스트 종료 확인
     --------------------------------------------------------- */

  function setupTestLeaveGuard() {
    document.addEventListener(
      "click",
      (event) => {
        if (currentPage !== "test") return;
        if (!testState || testState.finished) return;

        const pageButton =
          event.target.closest(
            "[data-page-target]"
          );

        if (!pageButton) return;

        const target =
          pageButton.dataset.pageTarget;

        if (target === "test") return;

        event.preventDefault();
        event.stopPropagation();

        openConfirmModal(
          "진행 중인 테스트를 그만둘까요?",
          () => {
            testState = null;
            showPage(target);
          }
        );
      },
      true
    );
  }

  /* ---------------------------------------------------------
     페이지 변경
     --------------------------------------------------------- */

  function changePage(direction) {
    if (
      currentPage === "home"
    ) {
      const items = getRootItems();

      const total = Math.max(
        1,
        Math.ceil(
          items.length /
            ROOT_ITEM_LIMIT
        )
      );

      currentRootPage = Math.max(
        1,
        Math.min(
          total,
          currentRootPage + direction
        )
      );

      renderHome();

      return;
    }

    if (
      currentPage === "folder"
    ) {
      const folder =
        getFolder(currentFolderId);

      if (!folder) return;

      const total = Math.max(
        1,
        Math.ceil(
          folder.bundleIds.length /
            FOLDER_ITEM_LIMIT
        )
      );

      currentFolderPage = Math.max(
        1,
        Math.min(
          total,
          currentFolderPage + direction
        )
      );

      renderFolderPage();
    }
  }

  /* ---------------------------------------------------------
     묶음 이동
     --------------------------------------------------------- */

  function navigateBundle(direction) {
    const bundles =
      getCurrentNavigationBundles();

    const index =
      bundles.findIndex(
        (bundle) =>
          bundle.id ===
          currentBundleId
      );

    if (index < 0) return;

    const target =
      bundles[index + direction];

    if (!target) return;

    currentBundleId = target.id;

    currentFolderId =
      getBundleFolder(target.id)?.id ||
      null;

    renderBundlePage();
  }

  /* ---------------------------------------------------------
     기본 버튼 연결
     --------------------------------------------------------- */

  function bindButton(
    selectors,
    handler
  ) {
    selectors.forEach((selector) => {
      const element = $(selector);

      if (!element) return;

      element.addEventListener(
        "click",
        handler
      );
    });
  }

  function setupButtons() {
    bindButton(
      [
        "#addBundleBtn",
        "#addGroupBtn",
      ],
      addBundle
    );

    bindButton(
      [
        "#addFolderBtn",
        "#createFolderBtn",
      ],
      addFolder
    );

    bindButton(
      [
        "#addWordBtn",
        "#addWordButton",
      ],
      () => {
        if (currentBundleId) {
          addWord(currentBundleId);
        }
      }
    );

    bindButton(
      [
        "#renameBundleBtn",
      ],
      renameBundle
    );

    bindButton(
      [
        "#renameFolderBtn",
      ],
      renameFolder
    );

    bindButton(
      [
        "#deleteBundleBtn",
      ],
      () => {
        if (currentBundleId) {
          deleteBundle(currentBundleId);
        }
      }
    );

    bindButton(
      [
        "#deleteFolderBtn",
      ],
      () => {
        if (currentFolderId) {
          deleteFolder(currentFolderId);
        }
      }
    );

    bindButton(
      [
        "#bundleTestBtn",
        "#startTestBtn",
      ],
      () => {
        if (currentBundleId) {
          openBundleTestModal(
            currentBundleId
          );
        }
      }
    );

    bindButton(
      [
        "#quickTestBtn",
        "#quickTestOpenBtn",
      ],
      () => openQuickTestModal()
    );

    bindButton(
      [
        "#addBundleToFolderBtn",
        "#addBundleSlotBtn",
      ],
      addBundlesToFolder
    );

    bindButton(
      [
        "#exportBtn",
        "#saveJsonBtn",
        "#exportJsonBtn",
      ],
      exportJSON
    );

    bindButton(
      [
        "#importBtn",
        "#importJsonBtn",
      ],
      importJSON
    );

    bindButton(
      [
        "#statsBtn",
      ],
      () => showPage("stats")
    );

    bindButton(
      [
        "#settingsBtn",
      ],
      () => showPage("settings")
    );
  }

  /* ---------------------------------------------------------
     페이지 전환 충돌 방지
     --------------------------------------------------------- */

  function preventAccidentalTestExit() {
    window.addEventListener(
      "beforeunload",
      (event) => {
        if (
          currentPage === "test" &&
          testState &&
          !testState.finished
        ) {
          event.preventDefault();
          event.returnValue = "";
        }
      }
    );
  }

  /* ---------------------------------------------------------
     앱 초기화
     --------------------------------------------------------- */

  function initializeApp() {
    loadAll();

    applyTheme();

    setupGlobalEvents();
    setupStaticButtons();
    setupButtons();
    setupKeyboard();
    setupSearchInputs();
    setupSortSelect();
    setupTestLeaveGuard();
    preventAccidentalTestExit();

    currentPage = "home";

    showPage("home");

    requestAnimationFrame(() => {
      setupDragAndDrop();
    });

    window.addEventListener(
      "focus",
      () => {
        normalizeData();
        renderCurrentPage();
      }
    );
  }

  /* ---------------------------------------------------------
     렌더 후 드래그 이벤트 자동 연결
     --------------------------------------------------------- */

  const originalRenderHome = renderHome;
  const originalRenderFolderPage =
    renderFolderPage;
  const originalRenderBundlePage =
    renderBundlePage;

  renderHome = function () {
    originalRenderHome();

    requestAnimationFrame(() => {
      setupDragAndDrop();
    });
  };

  renderFolderPage = function () {
    originalRenderFolderPage();

    requestAnimationFrame(() => {
      setupDragAndDrop();
    });
  };

  renderBundlePage = function () {
    originalRenderBundlePage();

    requestAnimationFrame(() => {
      setupDragAndDrop();
    });
  };

  /* ---------------------------------------------------------
     전역 객체
     --------------------------------------------------------- */

  window.VocabApp = {
    version: APP_VERSION,

    data,

    settings,

    history,

    showPage,

    renderCurrentPage,

    addBundle,

    addFolder,

    addWord,

    editWord,

    deleteWord,

    deleteBundle,

    deleteFolder,

    exportJSON,

    importJSON,

    saveAll,
  };

  /* ---------------------------------------------------------
     실행
     --------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeApp,
      { once: true }
    );
  } else {
    initializeApp();
  }
})();
