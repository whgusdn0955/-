const APP_VERSION = "1.2.0";

const DB_KEY = "vocab-app-data-v3";
const SETTINGS_KEY = "vocab-app-settings-v3";

const GROUP_PAGE_SIZE = 5;
const WORD_CHUNK = 40;

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];

const nowISO = () =>
  new Date().toISOString();

const uid = prefix =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const trim = value =>
  String(value ?? "").trim();

const norm = value =>
  trim(value).toLocaleLowerCase("ko-KR");

const clone = value =>
  JSON.parse(JSON.stringify(value));

const escapeHTML = value =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    char =>
      ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        "'":"&#39;",
        '"':"&quot;"
      }[char])
  );

const fmtDate = iso =>
  new Intl.DateTimeFormat("ko-KR", {
    year:"numeric",
    month:"long",
    day:"numeric"
  }).format(new Date(iso));

const fmtTime = iso =>
  new Intl.DateTimeFormat("ko-KR", {
    hour:"2-digit",
    minute:"2-digit"
  }).format(new Date(iso));

const fmtDateTime = iso =>
  `${fmtDate(iso)} ${fmtTime(iso)}`;

const CHANGELOG = {
  "1.2.0":{
    added:[
      "모바일 화면 최적화",
      "폴더 전용 화면",
      "폴더 안 묶음 선택 추가",
      "묶음 통합 검색",
      "최근 틀린 단어 7일 기준",
      "빠른 테스트의 동일 단어 뜻 통합",
      "다크 모드 확인 절차",
      "묶음 정렬 및 중요 표시"
    ],
    fixed:[
      "홈·통계 다크 모드",
      "폴더 진입 문제",
      "묶음 즉시 갱신",
      "테스트 결과 이동",
      "단어 및 뜻 추가 창 닫힘",
      "Enter 키 동작",
      "학습 기록 접힘 상태"
    ]
  },

  "1.1.0":{
    added:[
      "묶음 5개 페이지",
      "묶음 드래그",
      "폴더 이동",
      "묶음 이전·다음 이동",
      "버전 변경 기록"
    ],
    fixed:[
      "검색 구조",
      "테스트 이동"
    ]
  },

  "1.0.0":{
    added:[
      "단어 및 뜻 관리",
      "묶음 관리",
      "테스트",
      "학습 통계",
      "자동 저장",
      "JSON 저장·불러오기",
      "PWA 지원"
    ],
    fixed:[]
  }
};

const createInitialState = () => ({
  version:3,
  groups:[],
  history:[],
  updatedAt:nowISO()
});

const createInitialSettings = () => ({
  autoNext:false,
  darkMode:false
});

let state = loadState();

let savedSettings =
  loadSettings();

let draftSettings =
  {...savedSettings};

let currentPage = "homePage";

let currentView = {
  type:"home",
  id:null
};

let currentBundleId = null;

let bundlePage = 1;

let bundleSort = "manual";

let wordSearch = "";
let wordSort = "order";
let importantFilter = false;
let wordVisibleLimit = WORD_CHUNK;

let selectedWordIds =
  new Set();

let testSession = null;

let pendingInstallPrompt = null;

let downloadUrl = null;

function loadState(){

  try{

    const raw =
      localStorage.getItem(DB_KEY);

    if(!raw){
      return createInitialState();
    }

    const parsed =
      JSON.parse(raw);

    if(
      !parsed ||
      !Array.isArray(parsed.groups) ||
      !Array.isArray(parsed.history)
    ){

      return createInitialState();
    }

    migrateState(parsed);

    return parsed;

  }catch(error){

    console.error(
      "State load error:",
      error
    );

    return createInitialState();
  }
}

function migrateState(data){

  data.version = 3;

  data.groups.forEach(
    (group,index)=>{

      group.id ||= uid("group");

      group.type ||=
        "bundle";

      group.name =
        trim(group.name) ||
        "이름 없음";

      group.createdAt ||=
        nowISO();

      group.order ??=
        index;

      group.important =
        !!group.important;

      group.open =
        group.open !== false;

      group.words =
        Array.isArray(group.words)
          ? group.words
          : [];

      if(group.type==="folder"){

        group.parentId = null;

        group.words = [];

      }else{

        group.parentId =
          group.parentId ||
          null;

      }

      group.words.forEach(
        word=>{

          word.id ||=
            uid("word");

          word.english =
            trim(word.english);

          word.meanings =
            Array.isArray(
              word.meanings
            )
              ? word.meanings
              : [];

          word.meanings =
            word.meanings
              .map(
                meaning=>({
                  id:
                    meaning.id ||
                    uid("meaning"),
                  text:
                    trim(
                      meaning.text
                    )
                })
              )
              .filter(
                meaning =>
                  meaning.text
              );

          word.createdAt ||=
            nowISO();

          word.important =
            !!word.important;

          word.stats ||= {
            attempts:0,
            wrong:0,
            lastWrong:null
          };

          word.stats.attempts ||=
            0;

          word.stats.wrong ||=
            0;

          word.stats.lastWrong ||=
            null;

        }
      );

    }
  );

  normalizeParentStructure();

}

function normalizeParentStructure(){

  const groupsById =
    new Map(
      state.groups.map(
        group=>[
          group.id,
          group
        ]
      )
    );

  state.groups.forEach(
    group=>{

      if(
        group.type==="folder"
      ){

        group.parentId =
          null;

        return;

      }

      if(
        group.parentId
      ){

        const parent =
          groupsById.get(
            group.parentId
          );

        if(
          !parent ||
          parent.type !== "folder"
        ){

          group.parentId =
            null;

        }

      }

    }
  );

  renumberOrders();

}

function loadSettings(){

  try{

    const raw =
      localStorage.getItem(
        SETTINGS_KEY
      );

    if(!raw){
      return createInitialSettings();
    }

    const parsed =
      JSON.parse(raw);

    return {
      autoNext:
        !!parsed.autoNext,
      darkMode:
        !!parsed.darkMode
    };

  }catch{

    return createInitialSettings();

  }

}

function persistState(){

  const previous =
    localStorage.getItem(
      DB_KEY
    );

  const snapshot =
    clone(state);

  snapshot.updatedAt =
    nowISO();

  try{

    localStorage.setItem(
      DB_KEY,
      JSON.stringify(snapshot)
    );

    state =
      snapshot;

    return true;

  }catch(error){

    if(previous !== null){

      try{

        localStorage.setItem(
          DB_KEY,
          previous
        );

      }catch{}

    }

    console.error(
      "State save error:",
      error
    );

    toast(
      "❌ 데이터 저장에 실패했습니다. 기존 데이터는 유지됩니다."
    );

    return false;
  }

}

function persistSettings(){

  try{

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(
        savedSettings
      )
    );

    return true;

  }catch{

    toast(
      "❌ 설정 저장에 실패했습니다."
    );

    return false;

  }

}

function autoSave(){

  const ok =
    persistState();

  if(ok){
    renderDataStatus();
  }

  return ok;
}

function getGroup(id){

  return (
    state.groups.find(
      group =>
        group.id === id
    ) || null
  );

}

function getBundle(id){

  const group =
    getGroup(id);

  return group?.type === "bundle"
    ? group
    : null;

}

function getFolder(id){

  const group =
    getGroup(id);

  return group?.type === "folder"
    ? group
    : null;

}

function allBundles(){

  return state.groups.filter(
    group =>
      group.type === "bundle"
  );

}

function allFolders(){

  return state.groups.filter(
    group =>
      group.type === "folder"
  );

}

function childrenOf(folderId){

  return allBundles().filter(
    bundle =>
      (
        bundle.parentId ||
        null
      ) ===
      (
        folderId ||
        null
      )
  );

}

function rootItems(){

  return state.groups.filter(
    group =>
      (
        group.parentId ||
        null
      ) === null
  );

}

function siblingBundles(
  bundle
){

  return sortItems(
    childrenOf(
      bundle.parentId ||
      null
    )
  );

}

function sortItems(
  items,
  sortOverride=null
){

  let result =
    [...items];

  const sort =
    sortOverride ||
    bundleSort;

  if(sort==="manual"){

    return result.sort(
      (a,b)=>
        (a.order || 0) -
        (b.order || 0)
    );

  }

  if(sort==="oldest"){

    return result.sort(
      (a,b)=>
        new Date(
          a.createdAt
        ) -
        new Date(
          b.createdAt
        )
    );

  }

  if(sort==="newest"){

    return result.sort(
      (a,b)=>
        new Date(
          b.createdAt
        ) -
        new Date(
          a.createdAt
        )
    );

  }

  if(
    sort==="important-oldest"
  ){

    return result
      .filter(
        group =>
          group.type === "bundle" &&
          group.important
      )
      .sort(
        (a,b)=>
          new Date(
            a.createdAt
          ) -
          new Date(
            b.createdAt
          )
      );

  }

  if(
    sort==="important-newest"
  ){

    return result
      .filter(
        group =>
          group.type === "bundle" &&
          group.important
      )
      .sort(
        (a,b)=>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );

  }

  return result;
}

function renumberOrders(){

  const parents =
    new Set([
      null,
      ...allFolders()
        .map(folder=>folder.id)
    ]);

  for(
    const parentId
    of parents
  ){

    const list =
      rootOrFolderItems(
        parentId
      );

    list.forEach(
      (group,index)=>{
        group.order =
          index;
      }
    );

  }

}

function rootOrFolderItems(
  parentId
){

  return state.groups
    .filter(
      group =>
        (
          group.parentId ||
          null
        ) ===
        (
          parentId ||
          null
        )
    )
    .sort(
      (a,b)=>
        (a.order || 0) -
        (b.order || 0)
    );

}

function wordRefs(){

  const refs = [];

  allBundles().forEach(
    bundle=>{

      bundle.words.forEach(
        word=>{

          refs.push({
            group:bundle,
            word
          });

        }
      );

    }
  );

  return refs;
}

function meaningTexts(
  word
){

  return (
    word.meanings || []
  )
    .map(
      meaning =>
        trim(meaning.text)
    )
    .filter(Boolean);

}

function ensureStats(word){

  word.stats ||= {
    attempts:0,
    wrong:0,
    lastWrong:null
  };

  word.stats.attempts ||=
    0;

  word.stats.wrong ||=
    0;

  word.stats.lastWrong ||=
    null;

}

function errorRate(
  word
){

  ensureStats(word);

  if(
    word.stats.attempts <= 0
  ){

    return 0;

  }

  return (
    word.stats.wrong /
    word.stats.attempts
  ) * 100;

}

function isValidWord(
  word
){

  return (
    !!trim(word.english) &&
    Array.isArray(
      word.meanings
    ) &&
    word.meanings.length > 0 &&
    word.meanings.every(
      meaning =>
        !!trim(meaning.text)
    )
  );

}

function groupName(
  id
){

  return (
    getGroup(id)?.name ||
    "삭제된 묶음"
  );

}

function statCard(
  label,
  value
){

  return `
    <div class="stat-card">

      <b>
        ${escapeHTML(value)}
      </b>

      <span>
        ${escapeHTML(label)}
      </span>

    </div>
  `;

}

function toast(
  message
){

  const container =
    $("#toastContainer");

  if(!container){
    return;
  }

  const element =
    document.createElement(
      "div"
    );

  element.className =
    "toast";

  element.textContent =
    message;

  container.appendChild(
    element
  );

  setTimeout(
    ()=>{
      element.remove();
    },
    3200
  );

}

function setMessage(
  elementId,
  message,
  type="info"
){

  const element =
    $("#"+elementId);

  if(!element){
    return;
  }

  element.innerHTML = `
    <div
      class="${
        type==="error"
          ? "incorrect"
          : ""
      }"
    >
      ${escapeHTML(message)}
    </div>
  `;

}

function showPage(
  page
){

  currentPage =
    page;

  $$(".page")
    .forEach(
      section =>
        section.classList.toggle(
          "active",
          section.id === page
        )
    );

  $$(".nav-btn")
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          button.dataset.page ===
            page
        )
    );

  if(
    page === "homePage"
  ){

    renderHome();

  }

  if(
    page === "statsPage"
  ){

    renderStats();

  }

  if(
    page === "settingsPage"
  ){

    renderSettings();

  }

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}

function showPageSilent(
  page
){

  currentPage =
    page;

  $$(".page")
    .forEach(
      section =>
        section.classList.toggle(
          "active",
          section.id === page
        )
    );

  $$(".nav-btn")
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          button.dataset.page ===
            page
        )
    );

}

function openConfirmModal(
  title,
  message,
  onConfirm
){

  $("#modalTitle")
    .textContent =
    title;

  $("#modalBody")
    .innerHTML =
    `<p>${escapeHTML(message)}</p>`;

  $("#modalForm")
    .innerHTML = "";

  $("#modal")
    .classList.remove(
      "hidden"
    );

  const close =
    ()=>{
      $("#modal")
        .classList.add(
          "hidden"
        );
    };

  $("#modalCancel")
    .onclick =
    close;

  $("#modalConfirm")
    .onclick =
    ()=>{
      close();
      onConfirm();
    };

}

function openPromptModal(
  title,
  label,
  value,
  onConfirm
){

  $("#modalTitle")
    .textContent =
    title;

  $("#modalBody")
    .innerHTML = "";

  $("#modalForm")
    .innerHTML = `
      <label class="modal-form-label">

        <span>
          ${escapeHTML(label)}
        </span>

        <input
          id="modalInput"
          value="${escapeHTML(value)}"
          autocomplete="off"
        >

      </label>
    `;

  $("#modal")
    .classList.remove(
      "hidden"
    );

  const close =
    ()=>{
      $("#modal")
        .classList.add(
          "hidden"
        );
    };

  $("#modalCancel")
    .onclick =
    close;

  $("#modalConfirm")
    .onclick =
    ()=>{
      const value =
        trim(
          $("#modalInput")
            .value
        );

      const result =
        onConfirm(
          value,
          close
        );

      if(
        result !== false
      ){

        close();

      }

    };

  $("#modalInput")
    .addEventListener(
      "keydown",
      event=>{

        if(
          event.key ===
          "Enter"
        ){

          event.preventDefault();

          $("#modalConfirm")
            .click();

        }

      }
    );

  setTimeout(
    ()=>{
      $("#modalInput")
        ?.focus();
    },
    30
  );

}

function openFormModal(
  title,
  formHTML,
  onConfirm
){

  $("#modalTitle")
    .textContent =
    title;

  $("#modalBody")
    .innerHTML = "";

  $("#modalForm")
    .innerHTML =
    formHTML;

  $("#modal")
    .classList.remove(
      "hidden"
    );

  const close =
    ()=>{
      $("#modal")
        .classList.add(
          "hidden"
        );
    };

  $("#modalCancel")
    .onclick =
    close;

  $("#modalConfirm")
    .onclick =
    ()=>{
      const result =
        onConfirm(
          close
        );

      if(
        result !== false
      ){

        close();

      }

    };

  $("#modalForm")
    .querySelectorAll(
      "input,select"
    )
    .forEach(
      input=>{
        input.addEventListener(
          "keydown",
          event=>{

            if(
              event.key==="Enter" &&
              input.type !==
                "checkbox"
            ){

              event.preventDefault();

              $("#modalConfirm")
                .click();

            }

          }
        );
      }
    );

  setTimeout(
    ()=>{
      $("#modalForm")
        .querySelector(
          "input,select"
        )
        ?.focus();
    },
    30
  );

}

function navigate(
  page
){

  if(
    testSession &&
    currentPage==="testPage" &&
    page!=="testPage"
  ){

    openConfirmModal(
      "테스트 종료",
      "진행 중인 테스트를 종료하시겠습니까? 현재 테스트 결과는 학습 기록에 저장되지 않습니다.",
      ()=>{
        testSession = null;
        showPage(page);
      }
    );

    return;

  }

  if(
    currentPage==="settingsPage" &&
    hasUnsavedSettings() &&
    page!=="settingsPage"
  ){

    openConfirmModal(
      "설정 변경 확인",
      "저장하지 않은 설정 변경사항이 있습니다. 저장하지 않고 이동하시겠습니까?",
      ()=>{
        draftSettings =
          {...savedSettings};

        applyTheme();

        showPage(page);
      }
    );

    return;

  }

  showPage(page);

}

function hasUnsavedSettings(){

  return (
    JSON.stringify(
      draftSettings
    ) !==
    JSON.stringify(
      savedSettings
    )
  );

}

function applyTheme(){

  document.body
    .classList.toggle(
      "dark",
      savedSettings.darkMode
    );

  $("#darkBtn")
    .textContent =
      savedSettings.darkMode
        ? "☀️"
        : "🌙";

}

function applyDraftTheme(){

  document.body
    .classList.toggle(
      "dark",
      draftSettings.darkMode
    );

  $("#darkBtn")
    .textContent =
      draftSettings.darkMode
        ? "☀️"
        : "🌙";

}

function requestDarkModeChange(){

  const next =
    !savedSettings.darkMode;

  const label =
    next
      ? "다크 모드"
      : "일반 모드";

  openConfirmModal(
    "화면 모드 변경",
    `${label}로 변경하시겠습니까?`,
    ()=>{
      savedSettings.darkMode =
        next;

      draftSettings =
        {...savedSettings};

      persistSettings();

      applyTheme();

      if(
        currentPage==="settingsPage"
      ){
        renderSettings();
      }
    }
  );

}

function duplicateGroupName(
  name,
  excludeId=null
){

  const normalized =
    norm(name);

  if(!normalized){
    return false;
  }

  return state.groups.some(
    group =>
      group.id !== excludeId &&
      norm(group.name) ===
        normalized
  );

}

function createFolder(
  name
){

  name =
    trim(name);

  if(!name){

    toast(
      "⚠️ 폴더 이름을 입력해주세요."
    );

    return false;
  }

  if(
    duplicateGroupName(
      name
    )
  ){

    toast(
      "⚠️ 이미 같은 이름의 묶음 또는 폴더가 있습니다."
    );

    return false;
  }

  state.groups.push({

    id:uid("folder"),

    type:"folder",

    name,

    parentId:null,

    order:
      rootItems().length,

    createdAt:
      nowISO(),

    important:false,

    open:true,

    words:[]

  });

  renumberOrders();

  autoSave();

  showPage("homePage");

  return true;

}

function createBundle(
  name,
  parentId=null
){

  name =
    trim(name);

  if(!name){

    toast(
      "⚠️ 묶음 이름을 입력해주세요."
    );

    return false;
  }

  if(
    duplicateGroupName(
      name
    )
  ){

    toast(
      "⚠️ 이미 같은 이름의 묶음 또는 폴더가 있습니다."
    );

    return false;
  }

  if(
    parentId &&
    !getFolder(parentId)
  ){

    toast(
      "❌ 묶음은 폴더 안에만 들어갈 수 있습니다."
    );

    return false;
  }

  const siblingList =
    parentId
      ? childrenOf(parentId)
      : rootItems();

  state.groups.push({

    id:uid("bundle"),

    type:"bundle",

    name,

    parentId:
      parentId ||
      null,

    order:
      siblingList.length,

    createdAt:
      nowISO(),

    important:false,

    open:true,

    words:[]

  });

  renumberOrders();

  autoSave();

  showPage("homePage");

  return true;

}

function promptCreateFolder(){

  openPromptModal(
    "폴더 추가",
    "폴더 이름",
    "",
    value =>
      createFolder(value)
  );

}

function promptCreateBundle(
  parentId=null
){

  openPromptModal(
    "묶음 추가",
    "묶음 이름",
    "",
    value =>
      createBundle(
        value,
        parentId
      )
  );

}

function openGroup(
  id
){

  const group =
    getGroup(id);

  if(!group){
    return;
  }

  if(
    group.type==="folder"
  ){

    currentView = {
      type:"folder",
      id:group.id
    };

    currentBundleId = null;

    showPageSilent(
      "bundlePage"
    );

    renderFolderPage();

    return;

  }

  currentView = {
    type:"bundle",
    id:group.id
  };

  currentBundleId =
    group.id;

  resetWordViewState();

  showPageSilent(
    "bundlePage"
  );

  renderBundlePage();

}

function renderHome(){

  currentView = {
    type:"home",
    id:null
  };

  currentBundleId = null;

  $("#homeBreadcrumbs")
    .innerHTML =
    `<span>🏠 홈</span>`;

  renderHomeStats();

  renderSearchResults();

  renderRootItems();

  renderBundlePagination();

  $("#bundleSort")
    .value =
    bundleSort;

}

function renderHomeStats(){

  const refs =
    wordRefs();

  const questions =
    state.history.reduce(
      (sum,history)=>
        sum +
        (
          history.questionCount ||
          0
        ),
      0
    );

  const correct =
    state.history.reduce(
      (sum,history)=>
        sum +
        (
          history.correct ||
          0
        ),
      0
    );

  const accuracy =
    questions
      ? Math.round(
          correct /
          questions *
          100
        )
      : 0;

  $("#homeStats")
    .innerHTML = [

      statCard(
        "묶음",
        allBundles().length
      ),

      statCard(
        "폴더",
        allFolders().length
      ),

      statCard(
        "단어",
        refs.length
      ),

      statCard(
        "누적 정확도",
        questions
          ? `${accuracy}%`
          : "-"
      )

    ].join("");

}

function getRootDisplayItems(){

  const items =
    rootItems();

  if(
    bundleSort ===
      "important-oldest" ||
    bundleSort ===
      "important-newest"
  ){

    return sortItems(
      items
    );

  }

  return sortItems(
    items
  );

}

function renderRootItems(){

  const items =
    getRootDisplayItems();

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        items.length /
        GROUP_PAGE_SIZE
      )
    );

  bundlePage =
    Math.min(
      bundlePage,
      pageCount
    );

  const start =
    (
      bundlePage - 1
    ) * GROUP_PAGE_SIZE;

  const pageItems =
    items.slice(
      start,
      start +
        GROUP_PAGE_SIZE
    );

  $("#bundlePageInfo")
    .textContent =
    items.length
      ? `${items.length}개`
      : "";

  const list =
    $("#bundleList");

  if(!pageItems.length){

    list.innerHTML =
      `
        <div class="empty">

          📚 표시할 묶음이 없습니다.

          <br><br>

          <button
            id="emptyAddBundle"
            class="primary-btn"
          >
            ＋ 묶음 추가
          </button>

        </div>
      `;

    $("#emptyAddBundle")
      ?.addEventListener(
        "click",
        promptCreateBundle
      );

  }else{

    list.innerHTML =
      pageItems.map(
        group =>
          renderGroupCard(
            group
          )
      ).join("");

  }

  wireGroupCards();

  setupDragAndDrop();

}

function renderGroupCard(
  group
){

  const folder =
    group.type === "folder";

  const folderChildren =
    folder
      ? sortItems(
          childrenOf(group.id)
        )
      : [];

  const count =
    folder
      ? folderChildren.length
      : group.words.length;

  return `
    <div
      class="bundle-wrap"
      data-group-wrap="${group.id}"
    >

      <div
        class="bundle-row"
        data-group-row="${group.id}"
      >

        <button
          class="drag-handle"
          data-drag-id="${group.id}"
          title="드래그"
        >
          ☷
        </button>

        ${
          folder
            ? `
              <button
                class="folder-toggle"
                data-folder-toggle="${group.id}"
              >
                ${
                  group.open === false
                    ? "▸"
                    : "▾"
                }
              </button>
            `
            : ""
        }

        <button
          class="bundle-star"
          data-group-important="${group.id}"
          title="중요 표시"
        >
          ${
            group.important
              ? "⭐"
              : "☆"
          }
        </button>

        <div
          class="bundle-main"
          data-open-group="${group.id}"
        >

          <div class="bundle-name">

            <span>
              ${
                folder
                  ? "📁"
                  : "📚"
              }
            </span>

            <span>
              ${escapeHTML(
                group.name
              )}
            </span>

          </div>

          <div class="bundle-meta">

            생성일:
            ${fmtDateTime(
              group.createdAt
            )}

          </div>

        </div>

        <div class="bundle-count">

          ${
            folder
              ? `${count}개 묶음`
              : `${count}개 단어`
          }

        </div>

      </div>

      ${
        folder &&
        group.open !== false
          ? `
            <div
              class="child-list"
              data-folder-children="${group.id}"
            >

              ${
                folderChildren.length
                  ? folderChildren.map(
                      child =>
                        renderGroupCard(
                          child
                        )
                    ).join("")
                  : `
                    <div class="child-empty">
                      아직 이 폴더에 들어있는 묶음이 없습니다.
                    </div>
                  `
              }

            </div>
          `
          : ""
      }

    </div>
  `;

}

function wireGroupCards(){

  $$("[data-open-group]")
    .forEach(
      element=>{
        element.onclick =
          ()=>{
            openGroup(
              element.dataset
                .openGroup
            );
          };
      }
    );

  $$("[data-folder-toggle]")
    .forEach(
      button=>{
        button.onclick =
          event=>{
            event.stopPropagation();

            const folder =
              getFolder(
                button.dataset
                  .folderToggle
              );

            if(!folder){
              return;
            }

            folder.open =
              folder.open === false;

            autoSave();

            renderRootItems();

          };
      }
    );

  $$("[data-group-important]")
    .forEach(
      button=>{
        button.onclick =
          event=>{
            event.stopPropagation();

            const group =
              getGroup(
                button.dataset
                  .groupImportant
              );

            if(!group){
              return;
            }

            group.important =
              !group.important;

            autoSave();

            if(
              currentView.type ===
              "folder"
            ){

              renderFolderPage();

            }else{

              renderRootItems();

            }

          };
      }
    );

}

let dragData = null;

function setupDragAndDrop(){

  $$("[data-drag-id]")
    .forEach(
      handle=>{

        handle.onpointerdown =
          event=>{

            const id =
              handle.dataset.dragId;

            const group =
              getGroup(id);

            if(
              !group ||
              group.type !==
                "bundle"
            ){

              return;
            }

            dragData = {
              id,
              pointerId:
                event.pointerId,
              active:false,
              startX:
                event.clientX,
              startY:
                event.clientY,
              targetFolder:null
            };

            handle.setPointerCapture?.(
              event.pointerId
            );

            document.body.style.userSelect =
              "none";

          };

        handle.onpointermove =
          event=>{

            if(
              !dragData ||
              dragData.pointerId !==
                event.pointerId
            ){

              return;

            }

            const distance =
              Math.hypot(
                event.clientX -
                  dragData.startX,
                event.clientY -
                  dragData.startY
              );

            if(
              !dragData.active &&
              distance < 7
            ){

              return;

            }

            dragData.active =
              true;

            const row =
              document.querySelector(
                `[data-group-row="${dragData.id}"]`
              );

            row?.classList.add(
              "dragging"
            );

            const element =
              document.elementFromPoint(
                event.clientX,
                event.clientY
              );

            const wrap =
              element?.closest(
                "[data-group-wrap]"
              );

            $$(
              ".drag-folder-target"
            ).forEach(
              item =>
                item.classList.remove(
                  "drag-folder-target"
                )
            );

            dragData.targetFolder =
              null;

            if(wrap){

              const target =
                getGroup(
                  wrap.dataset
                    .groupWrap
                );

              if(
                target &&
                target.type ===
                  "folder" &&
                target.id !==
                  dragData.id
              ){

                dragData.targetFolder =
                  target.id;

                const targetRow =
                  wrap.querySelector(
                    ".bundle-row"
                  );

                targetRow?.classList.add(
                  "drag-folder-target"
                );

                return;
              }

            }

            const parent =
              element?.closest(
                "[data-folder-children]"
              );

            const container =
              parent ||
              $("#bundleList");

            if(!container){
              return;
            }

            const siblings =
              [
                ...container.children
              ]
                .filter(
                  child =>
                    child.dataset
                      .groupWrap &&
                    child.dataset
                      .groupWrap !==
                      dragData.id
                );

            const before =
              siblings.find(
                sibling =>
                  event.clientY <
                  sibling
                    .getBoundingClientRect()
                    .top +
                  sibling
                    .getBoundingClientRect()
                    .height /
                  2
              );

            const draggedWrap =
              document.querySelector(
                `[data-group-wrap="${dragData.id}"]`
              );

            if(
              draggedWrap &&
              before
            ){

              container.insertBefore(
                draggedWrap,
                before
              );

            }else if(
              draggedWrap &&
              !before
            ){

              container.appendChild(
                draggedWrap
              );

            }

          };

        handle.onpointerup =
          event=>{

            if(
              !dragData ||
              dragData.pointerId !==
                event.pointerId
            ){

              return;

            }

            const drag =
              dragData;

            dragData = null;

            document.body.style.userSelect =
              "";

            $$(".dragging")
              .forEach(
                item =>
                  item.classList.remove(
                    "dragging"
                  )
              );

            $$(".drag-folder-target")
              .forEach(
                item =>
                  item.classList.remove(
                    "drag-folder-target"
                  )
              );

            if(!drag.active){
              return;
            }

            const group =
              getBundle(
                drag.id
              );

            if(!group){
              return;
            }

            if(
              drag.targetFolder
            ){

              group.parentId =
                drag.targetFolder;

              const children =
                childrenOf(
                  drag.targetFolder
                ).filter(
                  child =>
                    child.id !==
                    drag.id
                );

              children.push(
                group
              );

              children.forEach(
                (child,index)=>{
                  child.order =
                    index;
                }
              );

            }

            syncOrdersFromDOM();

            autoSave();

            if(
              currentView.type ===
              "folder"
            ){

              renderFolderPage();

            }else{

              renderHome();

            }

          };

        handle.onpointercancel =
          ()=>{
            dragData=null;

            document.body.style.userSelect =
              "";

            renderHome();

          };

      }
    );

}

function syncOrdersFromDOM(){

  const rootContainer =
    $("#bundleList");

  if(rootContainer){

    const rootIds =
      [
        ...rootContainer.children
      ]
        .map(
          element =>
            element.dataset.groupWrap
        )
        .filter(Boolean);

    const rootGroups =
      rootIds.map(
        getGroup
      ).filter(Boolean);

    rootGroups.forEach(
      (group,index)=>{
        group.parentId = null;
        group.order = index;
      }
    );

  }

  $$(
    "[data-folder-children]"
  ).forEach(
    container=>{

      const folderId =
        container.dataset
          .folderChildren;

      const ids =
        [
          ...container.children
        ]
          .map(
            element =>
              element.dataset.groupWrap
          )
          .filter(Boolean);

      ids.forEach(
        (id,index)=>{

          const group =
            getBundle(id);

          if(!group){
            return;
          }

          group.parentId =
            folderId;

          group.order =
            index;

        }
      );

    }
  );

  renumberOrders();

}

function renderBundlePage(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  $("#bundleTitle")
    .textContent =
    bundle.name;

  $("#bundleInfo")
    .textContent =
    `${bundle.words.length}개 단어 · 생성일 ${fmtDateTime(bundle.createdAt)}`;

  renderBundleBreadcrumbs(
    bundle
  );

  $("#bundleWordCard")
    .classList.remove(
      "hidden"
    );

  $("#folderAddOpenBtn")
    .classList.toggle(
      "hidden",
      !bundle.parentId
    );

  $("#importantBundleBtn")
    .textContent =
      bundle.important
        ? "⭐ 중요 해제"
        : "☆ 중요";

  renderBundleNavigation();

  renderWords();

}

function renderFolderPage(){

  const folder =
    getFolder(
      currentView.id
    );

  if(!folder){
    return;
  }

  $("#bundleTitle")
    .textContent =
    folder.name;

  $("#bundleInfo")
    .textContent =
    `폴더 · ${childrenOf(folder.id).length}개 묶음`;

  renderFolderBreadcrumbs(
    folder
  );

  $("#bundleWordCard")
    .classList.add(
      "hidden"
    );

  $("#folderAddOpenBtn")
    .classList.remove(
      "hidden"
    );

  $("#prevBundleBtn")
    .classList.add(
      "hidden"
    );

  $("#nextBundleBtn")
    .classList.add(
      "hidden"
    );

  $("#renameBundleBtn")
    .classList.add(
      "hidden"
    );

  $("#importantBundleBtn")
    .classList.add(
      "hidden"
    );

  $("#deleteBundleBtn")
    .classList.remove(
      "hidden"
    );

  $("#bundleTestMessage")
    .innerHTML = "";

  $("#wordList")
    .innerHTML = "";

  $("#visibleWordCount")
    .textContent = "";

  $("#wordSearch")
    .value = "";

  const children =
    sortItems(
      childrenOf(folder.id)
    );

  if(!children.length){

    $("#folderAddOpenBtn")
      .classList.remove(
        "hidden"
      );

    $("#wordList")
      .innerHTML = `
        <div class="empty">
          아직 이 폴더에 들어있는 묶음이 없습니다.
        </div>
      `;

  }else{

    $("#wordList")
      .innerHTML =
      children.map(
        child =>
          renderGroupCard(
            child
          )
      ).join("");

    wireGroupCards();

    setupDragAndDrop();

  }

}

function renderFolderBreadcrumbs(
  folder
){

  let html = `
    <button data-home-breadcrumb>
      🏠 홈
    </button>

    <span>›</span>

    <span>
      📁 ${escapeHTML(
        folder.name
      )}
    </span>
  `;

  $("#bundleBreadcrumbs")
    .innerHTML =
      html;

  $("#bundleBreadcrumbs")
    .querySelector(
      "[data-home-breadcrumb]"
    )
    ?.addEventListener(
      "click",
      ()=>{
        showPage(
          "homePage"
        );
      }
    );

}

function renderBundleBreadcrumbs(
  bundle
){

  const chain=[];

  let current =
    bundle;

  while(current){

    chain.unshift(
      current
    );

    current =
      current.parentId
        ? getGroup(
            current.parentId
          )
        : null;

  }

  let html = `
    <button data-home-breadcrumb>
      🏠 홈
    </button>
  `;

  chain.forEach(
    item=>{

      html += `
        <span>›</span>
      `;

      html += `
        <button
          data-group-breadcrumb="${item.id}"
        >
          ${
            item.type==="folder"
              ? "📁"
              : "📚"
          }
          ${escapeHTML(
            item.name
          )}
        </button>
      `;

    }
  );

  html += `
    <span>›</span>
    <span>📝 테스트 가능</span>
  `;

  $("#bundleBreadcrumbs")
    .innerHTML =
    html;

  $("#bundleBreadcrumbs")
    .querySelector(
      "[data-home-breadcrumb]"
    )
    ?.addEventListener(
      "click",
      ()=>{
        showPage(
          "homePage"
        );
      }
    );

  $$(
    "[data-group-breadcrumb]"
  ).forEach(
    button=>{
      button.onclick =
        ()=>{
          const group =
            getGroup(
              button.dataset
                .groupBreadcrumb
            );

          if(!group){
            return;
          }

          openGroup(
            group.id
          );

        };
    }
  );

}

function renderBundleNavigation(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  const siblings =
    siblingBundles(
      bundle
    );

  const index =
    siblings.findIndex(
      group =>
        group.id ===
        bundle.id
    );

  const previous =
    index > 0
      ? siblings[index-1]
      : null;

  const next =
    index >= 0 &&
    index < siblings.length-1
      ? siblings[index+1]
      : null;

  $("#prevBundleBtn")
    .classList.remove(
      "hidden"
    );

  $("#nextBundleBtn")
    .classList.remove(
      "hidden"
    );

  $("#prevBundleBtn")
    .disabled =
      !previous;

  $("#nextBundleBtn")
    .disabled =
      !next;

  $("#prevBundleBtn")
    .onclick =
    ()=>{
      if(previous){
        openGroup(
          previous.id
        );
      }
    };

  $("#nextBundleBtn")
    .onclick =
    ()=>{
      if(next){
        openGroup(
          next.id
        );
      }
    };

}

function deleteCurrentView(){

  const group =
    getGroup(
      currentView.id ||
      currentBundleId
    );

  if(!group){
    return;
  }

  if(
    group.type === "folder"
  ){

    const count =
      childrenOf(
        group.id
      ).length;

    openConfirmModal(
      "폴더 삭제",
      `이 폴더와 안에 들어있는 ${count}개의 묶음까지 모두 삭제됩니다. 계속하시겠습니까?`,
      ()=>{

        deleteGroupRecursive(
          group.id
        );

        autoSave();

        currentView = {
          type:"home",
          id:null
        };

        currentBundleId = null;

        showPage(
          "homePage"
        );

      }
    );

    return;

  }

  openConfirmModal(
    "묶음 삭제",
    `'${group.name}' 묶음을 삭제하시겠습니까?`,
    ()=>{

      deleteGroupRecursive(
        group.id
      );

      autoSave();

      currentBundleId = null;

      currentView = {
        type:"home",
        id:null
      };

      showPage(
        "homePage"
      );

    }
  );

}

function deleteGroupRecursive(
  id
){

  const children =
    childrenOf(id);

  children.forEach(
    child=>{
      deleteGroupRecursive(
        child.id
      );
    }
  );

  state.groups =
    state.groups.filter(
      group =>
        group.id !== id
    );

  renumberOrders();

}

function renameCurrentBundle(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  openPromptModal(
    "묶음 이름 변경",
    "새 묶음 이름",
    bundle.name,
    value=>{

      if(!value){

        toast(
          "⚠️ 이름을 입력해주세요."
        );

        return false;

      }

      if(
        duplicateGroupName(
          value,
          bundle.id
        )
      ){

        toast(
          "⚠️ 이미 같은 이름의 묶음 또는 폴더가 있습니다."
        );

        return false;

      }

      bundle.name =
        value;

      autoSave();

      renderBundlePage();

      renderHome();

      return true;

    }
  );

}

function toggleCurrentBundleImportant(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  bundle.important =
    !bundle.important;

  autoSave();

  renderBundlePage();

}

function openFolderAddModal(){

  const folder =
    getFolder(
      currentView.type ===
        "folder"
        ? currentView.id
        : getBundle(
            currentBundleId
          )?.parentId
    );

  if(!folder){
    return;
  }

  openFormModal(
    "폴더에 묶음 추가",
    `
      <div class="search-box small-search">

        <span>🔎</span>

        <input
          id="folderCandidateSearch"
          placeholder="묶음 이름 검색"
          autocomplete="off"
        >

      </div>

      <div class="bulk-actions">

        <button
          type="button"
          id="folderSelectAllBtn"
          class="secondary-btn"
        >
          ☑ 모두 선택
        </button>

        <button
          type="button"
          id="folderClearAllBtn"
          class="secondary-btn"
        >
          ☐ 모두 해제
        </button>

        <span
          id="folderSelectedCount"
          class="muted"
        ></span>

      </div>

      <div
        id="folderCandidateList"
      ></div>
    `,
    ()=>{
      const selected =
        $$(".folder-candidate:checked")
          .map(
            checkbox =>
              checkbox.value
          );

      if(!selected.length){

        toast(
          "⚠️ 추가할 묶음을 선택해주세요."
        );

        return false;

      }

      selected.forEach(
        id=>{
          const bundle =
            getBundle(id);

          if(!bundle){
            return;
          }

          bundle.parentId =
            folder.id;

          bundle.order =
            childrenOf(
              folder.id
            ).length;
        }
      );

      renumberOrders();

      autoSave();

      closeModal();

      if(
        currentView.type ===
        "folder"
      ){

        renderFolderPage();

      }else{

        renderBundlePage();

      }

      toast(
        `✅ ${selected.length}개의 묶음을 추가했습니다.`
      );

      return true;

    }
  );

  renderFolderCandidates(
    folder.id
  );

  const search =
    $("#folderCandidateSearch");

  search?.addEventListener(
    "input",
    ()=>{
      renderFolderCandidates(
        folder.id
      );
    }
  );

  $("#folderSelectAllBtn")
    ?.addEventListener(
      "click",
      ()=>{
        $$(".folder-candidate")
          .forEach(
            checkbox=>{
              checkbox.checked =
                true;
            }
          );

        updateFolderCandidateCount();
      }
    );

  $("#folderClearAllBtn")
    ?.addEventListener(
      "click",
      ()=>{
        $$(".folder-candidate")
          .forEach(
            checkbox=>{
              checkbox.checked =
                false;
            }
          );

        updateFolderCandidateCount();
      }
    );

}

function closeModal(){

  $("#modal")
    .classList.add(
      "hidden"
    );

}

function renderFolderCandidates(
  folderId
){

  const folder =
    getFolder(
      folderId
    );

  if(!folder){
    return;
  }

  const query =
    norm(
      $("#folderCandidateSearch")
        ?.value || ""
    );

  const existing =
    new Set(
      childrenOf(
        folder.id
      ).map(
        group=>group.id
      )
    );

  const candidates =
    allBundles()
      .filter(
        bundle =>
          !existing.has(
            bundle.id
          ) &&
          !bundle.parentId &&
          (
            !query ||
            norm(bundle.name)
              .includes(query)
          )
      )
      .sort(
        (a,b)=>
          new Date(
            a.createdAt
          ) -
          new Date(
            b.createdAt
          )
      );

  if(!candidates.length){

    $("#folderCandidateList")
      .innerHTML = `
        <div class="empty">
          추가할 수 있는 묶음이 없습니다.
        </div>
      `;

    updateFolderCandidateCount();

    return;

  }

  $("#folderCandidateList")
    .innerHTML =
      candidates.map(
        bundle=>`
          <label
            class="candidate-row"
          >

            <input
              type="checkbox"
              class="folder-candidate"
              value="${bundle.id}"
            >

            <span>

              <b>
                ${escapeHTML(
                  bundle.name
                )}
              </b>

              <small class="subtle">
                ${bundle.words.length}개 단어 ·
                ${fmtDate(
                  bundle.createdAt
                )}
              </small>

            </span>

          </label>
        `
      ).join("");

  $$(".folder-candidate")
    .forEach(
      checkbox=>{
        checkbox.onchange =
          updateFolderCandidateCount;
      }
    );

  updateFolderCandidateCount();

}

function updateFolderCandidateCount(){

  const count =
    $$(".folder-candidate:checked")
      .length;

  if(
    $("#folderSelectedCount")
  ){

    $("#folderSelectedCount")
      .textContent =
      `${count}개 선택`;

  }

}

function renderSearchResults(){

  const query =
    norm(
      $("#globalSearch")
        ?.value || ""
    );

  const box =
    $("#searchResults");

  if(!box){
    return;
  }

  if(!query){

    box.classList.add(
      "hidden"
    );

    box.innerHTML="";

    return;

  }

  const groupResults =
    state.groups.filter(
      group =>
        norm(
          group.name
        ).includes(
          query
        )
    );

  const wordResults =
    wordRefs().filter(
      ({group,word}) =>
        norm(
          word.english
        ).includes(
          query
        ) ||
        meaningTexts(word)
          .some(
            meaning =>
              norm(meaning)
                .includes(query)
          )
    );

  if(
    !groupResults.length &&
    !wordResults.length
  ){

    box.classList.remove(
      "hidden"
    );

    box.innerHTML =
      `
        <div class="empty">
          🔎 검색 결과가 없습니다.
        </div>
      `;

    return;

  }

  let html="";

  if(groupResults.length){

    html += `
      <div class="result-section">

        <h4>
          📚 묶음 및 폴더
        </h4>

        ${
          groupResults
            .map(
              group=>`
                <div
                  class="result-item"
                  data-search-group="${group.id}"
                >

                  <b>
                    ${
                      group.type==="folder"
                        ? "📁"
                        : "📚"
                    }
                    ${escapeHTML(
                      group.name
                    )}
                  </b>

                  <div class="muted">
                    ${
                      group.type==="folder"
                        ? "폴더"
                        : `${group.words.length}개 단어`
                    }
                  </div>

                </div>
              `
            )
            .join("")
        }

      </div>
    `;

  }

  if(wordResults.length){

    html += `
      <div class="result-section">

        <h4>
          📖 단어
        </h4>

        ${
          wordResults
            .slice(0,80)
            .map(
              result=>`
                <div
                  class="result-item"
                  data-search-word-group="${result.group.id}"
                  data-search-word-id="${result.word.id}"
                >

                  <b>
                    ${escapeHTML(
                      result.word.english
                    )}
                  </b>

                  <div>
                    ${meaningTexts(
                      result.word
                    )
                      .map(
                        meaning =>
                          escapeHTML(
                            meaning
                          )
                      )
                      .join(" · ")
                    }
                  </div>

                  <div class="muted">
                    📚 ${escapeHTML(
                      result.group.name
                    )}
                  </div>

                </div>
              `
            )
            .join("")
        }

      </div>
    `;

  }

  box.classList.remove(
    "hidden"
  );

  box.innerHTML =
    html;

  $(
    "[data-search-group]"
  ).forEach(
    item=>{
      item.onclick =
        ()=>{
          openGroup(
            item.dataset
              .searchGroup
          );
        };
    }
  );

  $$(
    "[data-search-word-group]"
  ).forEach(
    item=>{
      item.onclick =
        ()=>{
          const groupId =
            item.dataset
              .searchWordGroup;

          const wordId =
            item.dataset
              .searchWordId;

          openGroup(
            groupId
          );

          setTimeout(
            ()=>{
              document
                .querySelector(
                  `[data-word-id="${wordId}"]`
                )
                ?.scrollIntoView({
                  behavior:"smooth",
                  block:"center"
                });
            },
            150
          );
        };
    }
  );

}

function resetWordViewState(){

  wordSearch="";
  wordSort="order";
  importantFilter=false;
  wordVisibleLimit=WORD_CHUNK;

  selectedWordIds.clear();

  if($("#wordSearch")){
    $("#wordSearch").value="";
  }

  if($("#wordSort")){
    $("#wordSort").value=
      "order";
  }

  if(
    $("#importantFilterBtn")
  ){

    $("#importantFilterBtn")
      .textContent =
        "⭐ 중요 단어만";

  }

}

function wordsForCurrentBundle(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return [];
  }

  let words =
    [...bundle.words];

  const query =
    norm(wordSearch);

  if(query){

    words =
      words.filter(
        word =>
          norm(
            word.english
          ).includes(query) ||
          meaningTexts(word)
            .some(
              meaning =>
                norm(meaning)
                  .includes(query)
            )
      );

  }

  if(importantFilter){

    words =
      words.filter(
        word =>
          word.important
      );

  }

  if(wordSort==="alpha"){

    words.sort(
      (a,b)=>
        a.english.localeCompare(
          b.english
        )
    );

  }

  if(wordSort==="wrong"){

    words.sort(
      (a,b)=>
        (b.stats?.wrong || 0) -
        (a.stats?.wrong || 0)
    );

  }

  if(
    wordSort==="recentWrong"
  ){

    words.sort(
      (a,b)=>
        String(
          b.stats?.lastWrong ||
          ""
        ).localeCompare(
          String(
            a.stats?.lastWrong ||
            ""
          )
        )
    );

  }

  if(
    wordSort==="important"
  ){

    words.sort(
      (a,b)=>
        Number(
          b.important
        ) -
        Number(
          a.important
        )
    );

  }

  if(
    wordSort==="difficulty"
  ){

    words.sort(
      (a,b)=>
        errorRate(b) -
        errorRate(a)
    );

  }

  return words;

}

function renderWords(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  $("#visibleWordCount")
    .textContent =
      `${wordsForCurrentBundle().length}개`;

  const words =
    wordsForCurrentBundle();

  const visible =
    words.slice(
      0,
      wordVisibleLimit
    );

  if(!visible.length){

    $("#wordList")
      .innerHTML =
      `
        <div class="empty">

          ${
            words.length
              ? "검색 결과가 없습니다."
              : "이 묶음에는 아직 단어가 없습니다."
          }

        </div>
      `;

  }else{

    $("#wordList")
      .innerHTML =
      visible
        .map(
          renderWordCard
        )
        .join("");

  }

  if(
    visible.length <
    words.length
  ){

    $("#wordSentinel")
      .innerHTML =
      `
        <div class="muted"
             style="text-align:center;padding:14px;">
          스크롤하면 더 표시됩니다.
        </div>
      `;

  }else{

    $("#wordSentinel")
      .innerHTML="";

  }

  wireWordEvents();

  updateBulkActions();

  updateSelectAll();

}

function renderWordCard(
  word
){

  ensureStats(word);

  return `
    <div
      class="word-card"
      data-word-id="${word.id}"
    >

      <div class="word-top">

        <input
          type="checkbox"
          data-select-word="${word.id}"
          ${
            selectedWordIds.has(
              word.id
            )
              ? "checked"
              : ""
          }
        >

        <button
          class="mini-btn"
          data-important-word="${word.id}"
        >
          ${
            word.important
              ? "⭐"
              : "☆"
          }
        </button>

        <div class="word-en">
          ${escapeHTML(
            word.english
          )}
        </div>

        <div class="word-stats">
          오답률
          ${errorRate(
            word
          ).toFixed(1)}%
        </div>

        <button
          class="mini-btn"
          data-edit-word="${word.id}"
        >
          ✏️
        </button>

        <button
          class="mini-btn"
          data-delete-word="${word.id}"
        >
          🗑
        </button>

      </div>

      ${
        word.meanings
          .map(
            meaning=>`
              <div class="meaning-row">

                <div class="meaning-text">
                  ${escapeHTML(
                    meaning.text
                  )}
                </div>

                <div class="meaning-actions">

                  <button
                    class="mini-btn"
                    data-edit-meaning="${word.id}"
                    data-meaning-id="${meaning.id}"
                  >
                    ✏️
                  </button>

                  <button
                    class="mini-btn"
                    data-delete-meaning="${word.id}"
                    data-meaning-id="${meaning.id}"
                  >
                    🗑
                  </button>

                </div>

              </div>
            `
          )
          .join("")
      }

      <button
        class="mini-btn"
        data-add-meaning="${word.id}"
      >
        ＋ 뜻 추가
      </button>

    </div>
  `;

}

function wireWordEvents(){

  $$("[data-select-word]")
    .forEach(
      checkbox=>{
        checkbox.onchange =
          ()=>{
            if(
              checkbox.checked
            ){

              selectedWordIds.add(
                checkbox.dataset
                  .selectWord
              );

            }else{

              selectedWordIds.delete(
                checkbox.dataset
                  .selectWord
              );

            }

            updateBulkActions();
            updateSelectAll();

          };
      }
    );

  $$("[data-important-word]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{

            const word =
              getBundle(
                currentBundleId
              )
              ?.words.find(
                item =>
                  item.id ===
                  button.dataset
                    .importantWord
              );

            if(!word){
              return;
            }

            word.important =
              !word.important;

            autoSave();

            renderWords();

          };
      }
    );

  $$("[data-edit-word]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            editWord(
              button.dataset
                .editWord
            );
          };
      }
    );

  $$("[data-delete-word]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            deleteWord(
              button.dataset
                .deleteWord
            );
          };
      }
    );

  $$("[data-edit-meaning]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            editMeaning(
              button.dataset
                .editMeaning,
              button.dataset
                .meaningId
            );
          };
      }
    );

  $$("[data-delete-meaning]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            deleteMeaning(
              button.dataset
                .deleteMeaning,
              button.dataset
                .meaningId
            );
          };
      }
    );

  $$("[data-add-meaning]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            addMeaning(
              button.dataset
                .addMeaning
            );
          };
      }
    );

}

function updateBulkActions(){

  const count =
    selectedWordIds.size;

  $("#bulkActions")
    .classList.toggle(
      "hidden",
      count===0
    );

  $("#selectedCount")
    .textContent =
      `${count}개 선택`;

}

function updateSelectAll(){

  const words =
    wordsForCurrentBundle();

  $("#selectAllWords")
    .checked =
      words.length > 0 &&
      words.every(
        word =>
          selectedWordIds.has(
            word.id
          )
      );

}

function editWord(
  wordId
){

  const bundle =
    getBundle(
      currentBundleId
    );

  const word =
    bundle?.words.find(
      item =>
        item.id === wordId
    );

  if(!word){
    return;
  }

  openFormModal(
    "단어 수정",
    `
      <label class="modal-form-label">

        <span>
          영어
        </span>

        <input
          id="editWordEnglish"
          value="${escapeHTML(
            word.english
          )}"
          autocomplete="off"
        >

      </label>

      <div>
        <b>뜻</b>
      </div>

      <div
        id="editMeaningFields"
      >

        ${
          word.meanings.map(
            meaning=>`
              <label
                class="modal-form-label"
              >

                <input
                  data-edit-meaning-input="${meaning.id}"
                  value="${escapeHTML(
                    meaning.text
                  )}"
                  autocomplete="off"
                >

              </label>
            `
          ).join("")
        }

      </div>
    `,
    ()=>{
      const english =
        trim(
          $("#editWordEnglish")
            .value
        );

      const values =
        $$(
          "[data-edit-meaning-input]"
        )
          .map(
            input =>
              trim(
                input.value
              )
          );

      if(!english){

        toast(
          "⚠️ 영어 단어를 입력해주세요."
        );

        return false;
      }

      if(
        !values.length ||
        values.some(
          value=>!value
        )
      ){

        toast(
          "⚠️ 비어 있는 뜻이 있습니다."
        );

        return false;
      }

      const duplicate =
        bundle.words.some(
          other =>
            other.id !== word.id &&
            norm(
              other.english
            ) === norm(
              english
            )
        );

      if(duplicate){

        toast(
          "⚠️ 같은 묶음에 같은 단어가 있습니다."
        );

        return false;
      }

      const duplicateMeanings =
        values.some(
          (value,index)=>
            values.findIndex(
              current =>
                norm(current) ===
                norm(value)
            ) !== index
        );

      if(duplicateMeanings){

        toast(
          "⚠️ 같은 뜻이 중복되어 있습니다."
        );

        return false;
      }

      word.english =
        english;

      word.meanings =
        word.meanings.map(
          (
            meaning,
            index
          )=>({
            id:
              meaning.id,
            text:
              values[index]
          })
        );

      autoSave();

      renderBundlePage();

      return true;
    }
  );

}

function addMeaning(
  wordId
){

  const bundle =
    getBundle(
      currentBundleId
    );

  const word =
    bundle?.words.find(
      item =>
        item.id === wordId
    );

  if(!word){
    return;
  }

  openPromptModal(
    "뜻 추가",
    "새 뜻",
    "",
    value=>{

      if(
        word.meanings.some(
          meaning =>
            norm(
              meaning.text
            ) === norm(value)
        )
      ){

        toast(
          "⚠️ 같은 뜻이 이미 있습니다."
        );

        return false;

      }

      word.meanings.push({
        id:uid("meaning"),
        text:value
      });

      autoSave();

      renderBundlePage();

      return true;

    }
  );

}

function editMeaning(
  wordId,
  meaningId
){

  const bundle =
    getBundle(
      currentBundleId
    );

  const word =
    bundle?.words.find(
      item =>
        item.id === wordId
    );

  const meaning =
    word?.meanings.find(
      item =>
        item.id === meaningId
    );

  if(!meaning){
    return;
  }

  openPromptModal(
    "뜻 수정",
    "새 뜻",
    meaning.text,
    value=>{

      if(
        word.meanings.some(
          item =>
            item.id !== meaning.id &&
            norm(item.text) ===
              norm(value)
        )
      ){

        toast(
          "⚠️ 같은 뜻이 이미 있습니다."
        );

        return false;

      }

      meaning.text =
        value;

      autoSave();

      renderBundlePage();

      return true;

    }
  );

}

function deleteMeaning(
  wordId,
  meaningId
){

  const bundle =
    getBundle(
      currentBundleId
    );

  const word =
    bundle?.words.find(
      item =>
        item.id === wordId
    );

  if(!word){
    return;
  }

  if(
    word.meanings.length === 1
  ){

    openConfirmModal(
      "단어 전체 삭제",
      "마지막 뜻을 삭제하면 단어 전체가 삭제됩니다.",
      ()=>{
        deleteWord(
          wordId
        );
      }
    );

    return;

  }

  openConfirmModal(
    "뜻 삭제",
    "이 뜻을 삭제하시겠습니까?",
    ()=>{

      word.meanings =
        word.meanings.filter(
          meaning =>
            meaning.id !==
            meaningId
        );

      autoSave();

      renderBundlePage();

    }
  );

}

function deleteWord(
  wordId
){

  const bundle =
    getBundle(
      currentBundleId
    );

  const word =
    bundle?.words.find(
      item =>
        item.id === wordId
    );

  if(!word){
    return;
  }

  openConfirmModal(
    "단어 삭제",
    `'${word.english}' 단어를 삭제하시겠습니까?`,
    ()=>{

      bundle.words =
        bundle.words.filter(
          item =>
            item.id !== wordId
        );

      selectedWordIds.delete(
        wordId
      );

      autoSave();

      renderBundlePage();

    }
  );

}

function bulkWordAction(
  type
){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  const selected =
    [...selectedWordIds];

  if(!selected.length){
    return;
  }

  if(type==="delete"){

    openConfirmModal(
      "단어 삭제",
      `선택한 ${selected.length}개의 단어를 삭제하시겠습니까?`,
      ()=>{

        bundle.words =
          bundle.words.filter(
            word =>
              !selectedWordIds.has(
                word.id
              )
          );

        selectedWordIds.clear();

        autoSave();

        renderBundlePage();

      }
    );

    return;
  }

  bundle.words.forEach(
    word=>{

      if(
        selectedWordIds.has(
          word.id
        )
      ){

        word.important =
          type === "on";

      }

    }
  );

  autoSave();

  renderBundlePage();

}

function parseBulkInput(
  text
){

  const parts =
    String(text || "")
      .split("/")
      .map(trim);

  if(
    !parts.length ||
    parts.every(
      part=>!part
    )
  ){

    return {
      error:
        "입력한 단어가 없습니다."
    };

  }

  const result=[];

  for(
    let index=0;
    index<parts.length;
    index++
  ){

    const part =
      parts[index];

    if(!part){

      return {
        error:
          `${index+1}번째 항목이 비어 있습니다.`
      };

    }

    const colon =
      part.indexOf(":");

    if(colon < 0){

      return {
        error:
          `${index+1}번째 항목에 ':'가 없습니다.`
      };

    }

    const english =
      trim(
        part.slice(
          0,
          colon
        )
      );

    const meanings =
      part
        .slice(
          colon + 1
        )
        .split(",")
        .map(trim);

    if(!english){

      return {
        error:
          `${index+1}번째 단어의 영어가 비어 있습니다.`
      };

    }

    if(
      !meanings.length ||
      meanings.some(
        meaning=>!meaning
      )
    ){

      return {
        error:
          `${index+1}번째 단어의 뜻 중 비어 있는 항목이 있습니다.`
      };

    }

    const unique =
      [];

    meanings.forEach(
      meaning=>{

        if(
          !unique.some(
            current =>
              norm(current) ===
              norm(meaning)
          )
        ){

          unique.push(
            meaning
          );

        }

      }
    );

    result.push({
      english,
      meanings:unique
    });

  }

  return {
    items:result
  };

}

function addWordsToCurrentBundle(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  const parsed =
    parseBulkInput(
      $("#bulkInput").value
    );

  if(parsed.error){

    setMessage(
      "inputMessage",
      parsed.error,
      "error"
    );

    return;

  }

  let addedWords=0;
  let addedMeanings=0;

  parsed.items.forEach(
    item=>{

      let word =
        bundle.words.find(
          current =>
            norm(
              current.english
            ) ===
            norm(
              item.english
            )
        );

      if(!word){

        word = {
          id:uid("word"),
          english:item.english,
          meanings:[],
          important:false,
          createdAt:nowISO(),
          stats:{
            attempts:0,
            wrong:0,
            lastWrong:null
          }
        };

        bundle.words.push(
          word
        );

        addedWords++;

      }

      ensureStats(word);

      item.meanings.forEach(
        meaning=>{

          if(
            !word.meanings.some(
              current =>
                norm(
                  current.text
                ) ===
                norm(meaning)
            )
          ){

            word.meanings.push({
              id:uid("meaning"),
              text:meaning
            });

            addedMeanings++;

          }

        }
      );

    }
  );

  autoSave();

  $("#bulkInput")
    .value="";

  setMessage(
    "inputMessage",
    `${addedWords}개 단어, ${addedMeanings}개 뜻이 추가되었습니다.`,
    "ok"
  );

  renderBundlePage();

}

function addStandaloneWord(){

  openFormModal(
    "단어 및 뜻 추가",
    `
      <p class="muted">
        입력한 단어는 자동으로
        <b>기타 단어</b> 묶음에 저장됩니다.
      </p>

      <label class="modal-form-label">

        <span>
          영어
        </span>

        <input
          id="standaloneEnglish"
          autocomplete="off"
        >

      </label>

      <label class="modal-form-label">

        <span>
          뜻
        </span>

        <input
          id="standaloneMeanings"
          placeholder="여러 뜻은 , 로 구분"
          autocomplete="off"
        >

      </label>
    `,
    ()=>{
      const english =
        trim(
          $("#standaloneEnglish")
            .value
        );

      const meanings =
        $("#standaloneMeanings")
          .value
          .split(",")
          .map(trim);

      if(!english){

        toast(
          "⚠️ 영어 단어를 입력해주세요."
        );

        return false;

      }

      if(
        !meanings.length ||
        meanings.some(
          meaning=>!meaning
        )
      ){

        toast(
          "⚠️ 뜻을 모두 입력해주세요."
        );

        return false;

      }

      let other =
        state.groups.find(
          group =>
            group.type ===
              "bundle" &&
            group.name ===
              "기타 단어" &&
            !group.parentId
        );

      if(!other){

        other = {
          id:uid("bundle"),
          type:"bundle",
          name:"기타 단어",
          parentId:null,
          order:
            rootItems().length,
          createdAt:nowISO(),
          important:false,
          open:true,
          words:[]
        };

        state.groups.push(
          other
        );

      }

      let word =
        other.words.find(
          current =>
            norm(
              current.english
            ) ===
            norm(english)
        );

      if(!word){

        word = {
          id:uid("word"),
          english,
          meanings:[],
          important:false,
          createdAt:nowISO(),
          stats:{
            attempts:0,
            wrong:0,
            lastWrong:null
          }
        };

        other.words.push(
          word
        );

      }

      meanings.forEach(
        meaning=>{

          if(
            !word.meanings.some(
              current =>
                norm(
                  current.text
                ) ===
                norm(meaning)
            )
          ){

            word.meanings.push({
              id:uid("meaning"),
              text:meaning
            });

          }

        }
      );

      autoSave();

      closeModal();

      renderHome();

      toast(
        "✅ 기타 단어에 추가되었습니다."
      );

      return true;

    }
  );

}

function startBundleTest(){

  const bundle =
    getBundle(
      currentBundleId
    );

  if(!bundle){
    return;
  }

  const invalid =
    bundle.words.find(
      word =>
        !isValidWord(
          word
        )
    );

  if(invalid){

    toast(
      "⚠️ 비어 있는 영어 또는 뜻이 있는 단어가 있어 테스트를 시작할 수 없습니다."
    );

    setTimeout(
      ()=>{
        document
          .querySelector(
            `[data-word-id="${invalid.id}"]`
          )
          ?.scrollIntoView({
            behavior:"smooth",
            block:"center"
          });
      },
      100
    );

    return;

  }

  if(!bundle.words.length){

    toast(
      "⚠️ 이 묶음에는 아직 단어가 없습니다."
    );

    return;

  }

  let candidates =
    [...bundle.words];

  if(
    $("#importantOnly").checked
  ){

    candidates =
      candidates.filter(
        word =>
          word.important
      );

  }

  if(
    $("#wrongOnly").checked
  ){

    candidates =
      candidates.filter(
        word =>
          (
            word.stats?.wrong ||
            0
          ) > 0
      );

  }

  if(!candidates.length){

    toast(
      "⚠️ 선택 조건에 맞는 단어가 없습니다."
    );

    return;

  }

  const count =
    $("#countSelect").value;

  if(
    count !== "all" &&
    Number(count) >
      candidates.length
  ){

    openConfirmModal(
      "문제 수 확인",
      `현재 선택된 단어는 ${candidates.length}개입니다. ${candidates.length}문제로 테스트하시겠습니까?`,
      ()=>{
        beginTest({
          source:"bundle",
          groupIds:[
            bundle.id
          ],
          candidates,
          count:"all",
          direction:
            $("#directionSelect")
              .value,
          quickType:null
        });
      }
    );

    return;

  }

  beginTest({
    source:"bundle",
    groupIds:[
      bundle.id
    ],
    candidates,
    count,
    direction:
      $("#directionSelect")
        .value,
    quickType:null
  });

}

function recentWrongRefs(){

  const limit =
    Date.now() -
    7*24*60*60*1000;

  return wordRefs()
    .filter(
      ({word}) => {

        const lastWrong =
          word.stats?.lastWrong;

        if(!lastWrong){
          return false;
        }

        return (
          new Date(
            lastWrong
          ).getTime() >=
          limit
        );

      }
    );

}

function quickCandidates(
  type
){

  const refs =
    wordRefs();

  if(type==="recentWrong"){

    return recentWrongRefs()
      .map(
        ({group,word})=>({
          word:clone(word),
          groupId:group.id,
          refs:[
            {
              groupId:group.id,
              wordId:word.id
            }
          ]
        })
      );

  }

  return refs
    .filter(
      ({word})=>{

        ensureStats(
          word
        );

        if(
          type === "all"
        ){
          return true;
        }

        if(
          type === "important"
        ){
          return word.important;
        }

        if(
          type === "wrong"
        ){
          return (
            word.stats.wrong ||
            0
          ) > 0;
        }

        if(
          type === "difficult"
        ){
          return (
            errorRate(word)
          ) > 5;
        }

        return false;

      }
    )
    .map(
      ({group,word})=>({
        word:clone(word),
        groupId:group.id,
        refs:[
          {
            groupId:group.id,
            wordId:word.id
          }
        ]
      })
    );

}

function mergeQuickCandidates(
  candidates
){

  const map =
    new Map();

  candidates.forEach(
    item=>{

      const key =
        norm(
          item.word.english
        );

      if(
        !map.has(key)
      ){

        map.set(
          key,
          {
            word:{
              id:uid("merged"),
              english:
                item.word.english,
              meanings:[],
              important:
                item.word.important,
              createdAt:
                item.word.createdAt,
              stats:{
                attempts:0,
                wrong:0,
                lastWrong:null
              }
            },
            refs:[]
          }
        );

      }

      const target =
        map.get(key);

      item.word.meanings
        .forEach(
          meaning=>{

            if(
              !target.word.meanings
                .some(
                  current =>
                    norm(
                      current.text
                    ) ===
                    norm(
                      meaning.text
                    )
                )
            ){

              target.word.meanings.push(
                clone(meaning)
              );

            }

          }
        );

      target.refs.push(
        ...clone(
          item.refs
        )
      );

    }
  );

  return [
    ...map.values()
  ];

}

function beginTest({
  source,
  groupIds,
  candidates,
  count,
  direction,
  quickType
}){

  let pool;

  if(
    source === "quick"
  ){

    pool =
      mergeQuickCandidates(
        candidates
      );

  }else{

    pool =
      candidates.map(
        word=>({
          word:
            clone(word),
          refs:[
            {
              groupId:
                groupIds[0],
              wordId:
                word.id
            }
          ]
        })
      );

  }

  pool =
    pool.sort(
      ()=>Math.random()-0.5
    );

  if(
    count !== "all"
  ){

    pool =
      pool.slice(
        0,
        Number(count)
      );

  }

  const questions =
    pool.map(
      item=>({
        id:uid("question"),
        word:item.word,
        refs:item.refs,
        direction:
          direction === "mixed"
            ? (
                Math.random() < .5
                  ? "en-ko"
                  : "ko-en"
              )
            : direction
      })
    );

  if(!questions.length){

    toast(
      "⚠️ 테스트할 문제가 없습니다."
    );

    return;

  }

  testSession={
    source,
    groupIds:[
      ...(groupIds || [])
    ],
    quickType:
      quickType || null,
    originalQuickType:
      quickType || null,
    questions,
    index:0,
    correct:0,
    wrong:0,
    wrongItems:[],
    answered:false,
    startedAt:nowISO(),
    selectedDirection:
      direction
  };

  showPageSilent(
    "testPage"
  );

  renderTest();

}

function expectedAnswers(
  question
){

  return question.direction ===
    "en-ko"

    ? meaningTexts(
        question.word
      )

    : [
        question.word.english
      ];

}

function answerIsCorrect(
  question,
  input
){

  const value =
    trim(input);

  if(!value){
    return false;
  }

  const answers =
    expectedAnswers(
      question
    );

  if(
    question.direction ===
    "en-ko"
  ){

    return answers.some(
      answer =>
        norm(answer) ===
        norm(value)
    );

  }

  const expected =
    question.word.english;

  return (
    norm(expected) ===
    norm(value)
  );

}

function updateQuestionStats(
  question,
  correct
){

  const updated =
    new Set();

  question.refs.forEach(
    ref=>{

      const key =
        `${ref.groupId}:${ref.wordId}`;

      if(
        updated.has(key)
      ){
        return;
      }

      updated.add(key);

      const word =
        getBundle(
          ref.groupId
        )?.words.find(
          item =>
            item.id ===
            ref.wordId
        );

      if(!word){
        return;
      }

      ensureStats(
        word
      );

      word.stats.attempts++;

      if(!correct){

        word.stats.wrong++;

        word.stats.lastWrong =
          nowISO();

      }

    }
  );

  autoSave();

}

function renderTest(){

  if(!testSession){
    return;
  }

  const question =
    testSession.questions[
      testSession.index
    ];

  if(!question){
    return;
  }

  $("#progressText")
    .textContent =
    `${testSession.index + 1} / ${testSession.questions.length}`;

  $("#progressBar")
    .style.width =
    `${
      (
        testSession.index /
        testSession.questions.length
      ) *
      100
    }%`;

  $("#questionDirection")
    .textContent =
      question.direction ===
        "en-ko"
        ? "영어 → 뜻"
        : "뜻 → 영어";

  $("#questionText")
    .textContent =
      question.direction ===
        "en-ko"
        ? question.word.english
        : meaningTexts(
            question.word
          ).join(" / ");

  $("#answerInput")
    .value="";

  $("#answerInput")
    .disabled=false;

  $("#answerResult")
    .className =
      "answer-result";

  $("#answerResult")
    .innerHTML="";

  $("#checkAnswerBtn")
    .classList.remove(
      "hidden"
    );

  $("#nextQuestionBtn")
    .classList.add(
      "hidden"
    );

  $("#finishTestBtn")
    .classList.add(
      "hidden"
    );

  testSession.answered =
    false;

  renderTestBreadcrumbs();

  setTimeout(
    ()=>{
      $("#answerInput")
        ?.focus();
    },
    60
  );

}

function renderTestBreadcrumbs(){

  let html = `
    <button data-test-home>
      🏠 홈
    </button>
  `;

  if(
    testSession.source ===
    "bundle"
  ){

    const bundleId =
      testSession.groupIds[0];

    html += `
      <span>›</span>

      <button
        data-test-source
      >
        📚 ${escapeHTML(
          groupName(
            bundleId
          )
        )}
      </button>
    `;

  }else{

    html += `
      <span>›</span>

      <button
        data-test-quick
      >
        ⚡ 빠른 테스트
      </button>
    `;

  }

  html += `
    <span>›</span>

    <span>
      📝 테스트
    </span>
  `;

  $("#testBreadcrumbs")
    .innerHTML =
    html;

  $("#testBreadcrumbs")
    .querySelector(
      "[data-test-home]"
    )
    ?.addEventListener(
      "click",
      ()=>{
        leaveTestTo(
          "homePage"
        );
      }
    );

  $("#testBreadcrumbs")
    .querySelector(
      "[data-test-source]"
    )
    ?.addEventListener(
      "click",
      ()=>{
        const id =
          testSession
            .groupIds[0];

        openConfirmModal(
          "테스트 종료",
          "진행 중인 테스트를 종료하시겠습니까?",
          ()=>{
            testSession=null;
            openGroup(id);
          }
        );
      }
    );

  $("#testBreadcrumbs")
    .querySelector(
      "[data-test-quick]"
    )
    ?.addEventListener(
      "click",
      ()=>{
        openConfirmModal(
          "테스트 종료",
          "진행 중인 테스트를 종료하시겠습니까?",
          ()=>{
            testSession=null;
            openQuickTest();
          }
        );
      }
    );

}

function leaveTestTo(
  target
){

  if(!testSession){

    showPage(target);

    return;

  }

  openConfirmModal(
    "테스트 종료",
    "진행 중인 테스트를 종료하시겠습니까?",
    ()=>{
      testSession=null;
      showPage(target);
    }
  );

}

function checkAnswer(){

  if(
    !testSession ||
    testSession.answered
  ){
    return;
  }

  const question =
    testSession.questions[
      testSession.index
    ];

  const input =
    $("#answerInput")
      .value;

  const correct =
    answerIsCorrect(
      question,
      input
    );

  testSession.answered =
    true;

  $("#answerInput")
    .disabled=true;

  $("#checkAnswerBtn")
    .classList.add(
      "hidden"
    );

  if(correct){

    testSession.correct++;

    $("#answerResult")
      .className =
      "answer-result correct";

    $("#answerResult")
      .innerHTML =
      "✅ 정답!";

  }else{

    testSession.wrong++;

    testSession.wrongItems.push(
      question
    );

    $("#answerResult")
      .className =
      "answer-result incorrect";

    $("#answerResult")
      .innerHTML =
      `
        ❌ 오답
        <br>
        <b>정답:</b>
        ${escapeHTML(
          expectedAnswers(
            question
          ).join(" / ")
        )}
      `;

  }

  updateQuestionStats(
    question,
    correct
  );

  const last =
    testSession.index ===
    testSession.questions.length - 1;

  if(last){

    $("#finishTestBtn")
      .classList.remove(
        "hidden"
      );

    return;

  }

  $("#nextQuestionBtn")
    .classList.remove(
      "hidden"
    );

  if(
    savedSettings.autoNext
  ){

    setTimeout(
      ()=>{
        if(
          testSession &&
          testSession.answered
        ){
          nextQuestion();
        }
      },
      850
    );

  }

}

function nextQuestion(){

  if(
    !testSession ||
    !testSession.answered
  ){
    return;
  }

  if(
    testSession.index >=
    testSession.questions.length - 1
  ){
    return;
  }

  testSession.index++;

  renderTest();

}

function finishTest(){

  if(
    !testSession ||
    !testSession.answered
  ){
    return;
  }

  const session =
    testSession;

  const record = {

    id:uid("history"),

    startedAt:
      session.startedAt,

    endedAt:
      nowISO(),

    source:
      session.source,

    quickType:
      session.quickType,

    groupIds:[
      ...session.groupIds
    ],

    questionCount:
      session.questions.length,

    correct:
      session.correct,

    wrong:
      session.wrong,

    accuracy:
      session.questions.length
        ? session.correct /
          session.questions.length
        : 0,

    questions:
      session.questions.map(
        question=>({
          id:question.id,
          english:
            question.word.english,
          direction:
            question.direction,
          groupIds:[
            ...new Set(
              question.refs
                .map(
                  ref =>
                    ref.groupId
                )
            )
          ],
          correct:
            !session.wrongItems.some(
              wrong =>
                wrong.id ===
                question.id
            )
        })
      )

  };

  state.history.push(
    record
  );

  autoSave();

  renderResult();

}

function renderResult(){

  const session =
    testSession;

  if(!session){
    return;
  }

  const total =
    session.questions.length;

  const accuracy =
    total
      ? Math.round(
          session.correct /
          total *
          100
        )
      : 0;

  showPageSilent(
    "resultPage"
  );

  $("#resultScore")
    .textContent =
    `${accuracy}%`;

  $("#resultStats")
    .textContent =
    `${total}문제 · 정답 ${session.correct} · 오답 ${session.wrong}`;

  $("#wrongResultList")
    .innerHTML =
      session.wrongItems.length
        ? session.wrongItems
            .map(
              question=>`
                <div class="word-card">

                  <b>
                    ${escapeHTML(
                      question.word
                        .english
                    )}
                  </b>

                  <div class="muted">

                    정답:
                    ${escapeHTML(
                      expectedAnswers(
                        question
                      ).join(" / ")
                    )}

                  </div>

                </div>
              `
            )
            .join("")
        : `
            <div class="empty">
              🎉 틀린 단어가 없습니다.
            </div>
          `;

  $("#retryWrongBtn")
    .classList.toggle(
      "hidden",
      !session.wrongItems.length
    );

  $("#returnSourceBtn")
    .textContent =
      session.source ===
      "bundle"
        ? "📚 단어장으로 돌아가기"
        : "⚡ 빠른 테스트로 돌아가기";

  $("#returnSourceBtn")
    .onclick =
    ()=>{
      if(
        session.source ===
        "bundle"
      ){

        const id =
          session.groupIds[0];

        testSession=null;

        openGroup(id);

      }else{

        const type =
          session.quickType;

        testSession=null;

        openQuickTest(
          type
        );

      }
    };

  $("#resultHomeBtn")
    .onclick =
    ()=>{
      testSession=null;

      showPage(
        "homePage"
      );
    };

}

function retryWrong(){

  if(
    !testSession ||
    !testSession.wrongItems.length
  ){
    return;
  }

  const oldSession =
    testSession;

  const retryItems =
    oldSession.wrongItems
      .map(
        question=>({
          word:clone(
            question.word
          ),
          refs:clone(
            question.refs
          )
        })
      );

  const source =
    oldSession.source;

  const groupIds =
    [
      ...oldSession.groupIds
    ];

  const quickType =
    oldSession.quickType;

  testSession=null;

  beginTest({
    source,
    groupIds,
    candidates:
      retryItems.map(
        item =>
          item.word
      ),
    count:"all",
    direction:"mixed",
    quickType
  });

}

function openQuickTest(
  presetType=null
){

  openFormModal(
    "빠른 테스트",
    `
      <label class="modal-form-label">

        <span>
          테스트 유형
        </span>

        <select id="quickType">

          <option value="all">
            전체 단어
          </option>

          <option value="difficult">
            어려운 단어
          </option>

          <option value="wrong">
            틀린 적 있는 단어
          </option>

          <option value="recentWrong">
            최근 틀린 단어 (7일)
          </option>

          <option value="important">
            ⭐ 중요 단어
          </option>

        </select>

      </label>

      <label class="modal-form-label">

        <span>
          문제 방향
        </span>

        <select id="quickDirection">

          <option value="en-ko">
            영어 → 뜻
          </option>

          <option value="ko-en">
            뜻 → 영어
          </option>

          <option value="mixed">
            영어 ↔ 뜻 혼합
          </option>

        </select>

      </label>

      <label class="modal-form-label">

        <span>
          문제 수
        </span>

        <select id="quickCount">

          <option value="all">
            전체
          </option>

          <option value="10">
            10문제
          </option>

          <option value="20">
            20문제
          </option>

          <option value="30">
            30문제
          </option>

          <option value="50">
            50문제
          </option>

        </select>

      </label>
    `,
    ()=>{
      const type =
        presetType ||
        $("#quickType")
          .value;

      const direction =
        $("#quickDirection")
          .value;

      const count =
        $("#quickCount")
          .value;

      const candidates =
        quickCandidates(
          type
        );

      if(!candidates.length){

        toast(
          "⚠️ 해당하는 단어가 없습니다."
        );

        return false;

      }

      const invalid =
        candidates.find(
          item =>
            !isValidWord(
              item.word
            )
        );

      if(invalid){

        toast(
          "⚠️ 비어 있는 영어 또는 뜻이 있는 단어가 있어 테스트를 시작할 수 없습니다."
        );

        openGroup(
          invalid.groupId
        );

        return false;

      }

      if(
        count !== "all" &&
        Number(count) >
          candidates.length
      ){

        closeModal();

        openConfirmModal(
          "문제 수 확인",
          `현재 선택된 단어는 ${candidates.length}개입니다. ${candidates.length}문제로 테스트하시겠습니까?`,
          ()=>{
            beginTest({
              source:"quick",
              groupIds:[
                ...new Set(
                  candidates.map(
                    item =>
                      item.groupId
                  )
                )
              ],
              candidates,
              count:"all",
              direction,
              quickType:type
            });
          }
        );

        return true;

      }

      beginTest({
        source:"quick",
        groupIds:[
          ...new Set(
            candidates.map(
              item =>
                item.groupId
            )
          )
        ],
        candidates,
        count,
        direction,
        quickType:type
      });

      return true;

    }
  );

  if(
    presetType
  ){

    setTimeout(
      ()=>{
        if(
          $("#quickType")
        ){

          $("#quickType")
            .value =
            presetType;

        }
      },
      0
    );

  }

}

function renderStats(){

  const period =
    renderStats.period ||
    "all";

  $$(".period-btn")
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          button.dataset.period ===
            period
        )
    );

  const records =
    filterHistory(
      period
    );

  const questions =
    records.reduce(
      (sum,history)=>
        sum +
        (
          history.questionCount ||
          0
        ),
      0
    );

  const correct =
    records.reduce(
      (sum,history)=>
        sum +
        (
          history.correct ||
          0
        ),
      0
    );

  $("#statsCards")
    .innerHTML = [

      statCard(
        "테스트",
        records.length
      ),

      statCard(
        "문제",
        questions
      ),

      statCard(
        "정답",
        correct
      ),

      statCard(
        "정확도",
        questions
          ? `${Math.round(
              correct /
              questions *
              100
            )}%`
          : "-"
      )

    ].join("");

  renderBundleStatistics(
    records
  );

  renderHistory(
    records
  );

}

renderStats.period =
  "all";

function filterHistory(
  period
){

  const now =
    new Date();

  return state.history.filter(
    history=>{

      const date =
        new Date(
          history.startedAt
        );

      if(period==="all"){
        return true;
      }

      if(period==="today"){

        return (
          date.getFullYear() ===
            now.getFullYear() &&
          date.getMonth() ===
            now.getMonth() &&
          date.getDate() ===
            now.getDate()
        );

      }

      if(period==="week"){

        const limit =
          new Date(now);

        limit.setDate(
          limit.getDate() - 6
        );

        limit.setHours(
          0,
          0,
          0,
          0
        );

        return date >= limit;

      }

      if(period==="month"){

        return (
          date.getFullYear() ===
            now.getFullYear() &&
          date.getMonth() ===
            now.getMonth()
        );

      }

      return true;

    }
  );

}

function renderBundleStatistics(
  records
){

  const map =
    new Map();

  records.forEach(
    history=>{

      history.questions
        .forEach(
          question=>{

            const labels =
              question.groupIds?.length
                ? question.groupIds.map(
                    groupName
                  )
                : history.groupIds?.length
                  ? history.groupIds.map(
                      groupName
                    )
                  : [
                      history.quickType
                        ? `빠른 테스트 · ${
                            quickTypeLabel(
                              history.quickType
                            )
                          }`
                        : "빠른 테스트"
                    ];

            labels.forEach(
              label=>{

                if(!map.has(label)){

                  map.set(
                    label,
                    {
                      total:0,
                      correct:0
                    }
                  );

                }

                const value =
                  map.get(label);

                value.total++;

                if(
                  question.correct
                ){

                  value.correct++;

                }

              }
            );

          }
        );

    }
  );

  $("#bundleStats")
    .innerHTML =
      map.size
        ? [...map.entries()]
            .map(
              ([name,value])=>`
                <div class="meaning-row">

                  <b>
                    ${escapeHTML(name)}
                  </b>

                  <span class="meaning-text">
                    ${value.total}문제 ·
                    정확도
                    ${Math.round(
                      value.correct /
                      value.total *
                      100
                    )}%
                  </span>

                </div>
              `
            )
            .join("")
        : `
            <div class="empty">
              아직 학습 기록이 없습니다.
            </div>
          `;

}

function quickTypeLabel(
  type
){

  return (
    {
      all:"전체 단어",
      difficult:"어려운 단어",
      wrong:"틀린 적 있는 단어",
      recentWrong:"최근 틀린 단어",
      important:"⭐ 중요 단어"
    }[type] ||
    "빠른 테스트"
  );

}

function renderHistory(
  records
){

  if(!records.length){

    $("#historyList")
      .innerHTML = `
        <div class="empty">
          아직 학습 기록이 없습니다.
        </div>
      `;

    return;
  }

  const now =
    new Date();

  const currentYear =
    now.getFullYear();

  const currentMonth =
    now.getMonth();

  const currentMonthRecords=[];
  const previousMonthMap=
    new Map();
  const previousYearMap=
    new Map();

  records.forEach(
    history=>{

      const date =
        new Date(
          history.startedAt
        );

      const year =
        date.getFullYear();

      const month =
        date.getMonth();

      const day =
        date.getDate();

      if(
        year===currentYear &&
        month===currentMonth
      ){

        currentMonthRecords.push(
          history
        );

        return;

      }

      if(
        year===currentYear
      ){

        const key =
          `${year}-${month}`;

        if(
          !previousMonthMap.has(
            key
          )
        ){

          previousMonthMap.set(
            key,
            {
              year,
              month,
              records:[]
            }
          );

        }

        previousMonthMap
          .get(key)
          .records
          .push(
            history
          );

        return;

      }

      if(
        !previousYearMap.has(
          year
        )
      ){

        previousYearMap.set(
          year,
          []
        );

      }

      previousYearMap
        .get(year)
        .push(
          history
        );

    }
  );

  let html="";

  html +=
    renderCurrentMonthHistory(
      currentMonthRecords
    );

  [...previousMonthMap.values()]
    .sort(
      (a,b)=>
        new Date(
          b.year,
          b.month
        ) -
        new Date(
          a.year,
          a.month
        )
    )
    .forEach(
      month=>{
        html +=
          renderPreviousMonthHistory(
            month
          );
      }
    );

  [...previousYearMap.entries()]
    .sort(
      (a,b)=>
        b[0]-a[0]
    )
    .forEach(
      ([year, histories])=>{
        html +=
          renderPreviousYearHistory(
            year,
            histories
          );
      }
    );

  $("#historyList")
    .innerHTML =
    html ||
    `
      <div class="empty">
        학습 기록이 없습니다.
      </div>
    `;

  wireHistoryToggles();

}

function renderCurrentMonthHistory(
  histories
){

  const map =
    new Map();

  histories.forEach(
    history=>{

      const date =
        new Date(
          history.startedAt
        );

      const key =
        `${date.getFullYear()}-${
          date.getMonth()
        }-${
          date.getDate()
        }`;

      if(
        !map.has(key)
      ){

        map.set(
          key,
          {
            date,
            histories:[]
          }
        );

      }

      map
        .get(key)
        .histories
        .push(
          history
        );

    }
  );

  return [...map.values()]
    .sort(
      (a,b)=>
        b.date-a.date
    )
    .map(
      group =>
        renderHistoryDay(
          `${group.date.getMonth()+1}월 ${group.date.getDate()}일`,
          group.histories
        )
    )
    .join("");

}

function renderPreviousMonthHistory(
  month
){

  const date =
    new Date(
      month.year,
      month.month
    );

  const dayMap =
    new Map();

  month.records.forEach(
    history=>{

      const d =
        new Date(
          history.startedAt
        );

      const key =
        d.getDate();

      if(
        !dayMap.has(key)
      ){

        dayMap.set(
          key,
          {
            day:key,
            date:d,
            histories:[]
          }
        );

      }

      dayMap
        .get(key)
        .histories
        .push(
          history
        );

    }
  );

  const body =
    [...dayMap.values()]
      .sort(
        (a,b)=>
          b.day-a.day
      )
      .map(
        group =>
          renderHistoryDay(
            `${group.day}일`,
            group.histories
          )
      )
      .join("");

  return `
    <div class="history-month">

      <button
        data-history-toggle
      >
        <b>
          ${date.getMonth()+1}월
        </b>

        <span>▸</span>
      </button>

      <div class="hidden">
        ${body}
      </div>

    </div>
  `;

}

function renderPreviousYearHistory(
  year,
  histories
){

  const monthMap =
    new Map();

  histories.forEach(
    history=>{

      const date =
        new Date(
          history.startedAt
        );

      const key =
        date.getMonth();

      if(
        !monthMap.has(key)
      ){

        monthMap.set(
          key,
          {
            year,
            month:key,
            histories:[]
          }
        );

      }

      monthMap
        .get(key)
        .histories
        .push(
          history
        );

    }
  );

  const body =
    [...monthMap.values()]
      .sort(
        (a,b)=>
          b.month-a.month
      )
      .map(
        renderPreviousMonthHistory
      )
      .join("");

  return `
    <div class="history-year">

      <button
        data-history-toggle
      >
        <b>
          ${year}년
        </b>

        <span>▸</span>
      </button>

      <div class="hidden">
        ${body}
      </div>

    </div>
  `;

}

function renderHistoryDay(
  label,
  histories
){

  const body =
    [...histories]
      .sort(
        (a,b)=>
          b.startedAt.localeCompare(
            a.startedAt
          )
      )
      .map(
        history=>`
          <div class="history-time">

            <button
              data-history-record="${history.id}"
            >

              <span>
                ${fmtTime(
                  history.startedAt
                )}
              </span>

              <span>
                ${Math.round(
                  history.accuracy *
                  100
                )}%
              </span>

            </button>

            <div
              id="history-detail-${history.id}"
              class="history-detail hidden"
            >
              ${historyDetail(
                history
              )}
            </div>

          </div>
        `
      )
      .join("");

  return `
    <div class="history-day">

      <button
        data-history-toggle
      >

        <b>
          ${escapeHTML(label)}
        </b>

        <span>▸</span>

      </button>

      <div class="hidden">
        ${body}
      </div>

    </div>
  `;

}

function historyDetail(
  history
){

  const source =
    history.source ===
      "bundle"

      ? history.groupIds
          .map(groupName)
          .join(", ")

      : `빠른 테스트 · ${
          quickTypeLabel(
            history.quickType
          )
        }`;

  return `
    <b>
      ${escapeHTML(source)}
    </b>

    <br>

    문제:
    ${history.questionCount}

    ·

    정답:
    ${history.correct}

    ·

    오답:
    ${history.wrong}

    <br>

    정확도:
    ${Math.round(
      history.accuracy *
      100
    )}%

  `;

}

function wireHistoryToggles(){

  $$("[data-history-toggle]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            const body =
              button.nextElementSibling;

            if(!body){
              return;
            }

            body.classList.toggle(
              "hidden"
            );

            const arrow =
              button.querySelector(
                "span"
              );

            if(arrow){

              arrow.textContent =
                body.classList.contains(
                  "hidden"
                )
                  ? "▸"
                  : "▾";

            }

          };
      }
    );

  $$("[data-history-record]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            const detail =
              $("#history-detail-" +
                button.dataset
                  .historyRecord);

            if(detail){
              detail.classList.toggle(
                "hidden"
              );
            }
          };
      }
    );

}

function renderSettings(){

  $("#autoNextToggle")
    .checked =
    savedSettings.autoNext;

  $("#darkModeToggle")
    ?.removeAttribute(
      "checked"
    );

  if(
    $("#darkModeToggle")
  ){

    const wrapper =
      $("#darkModeToggle")
        .closest(
          ".setting-row"
        );

    wrapper?.remove();

  }

  $("#saveSettingsBtn")
    .classList.add(
      "hidden"
    );

  $("#cancelSettingsBtn")
    .classList.add(
      "hidden"
    );

  $("#settingsMessage")
    .innerHTML = "";

  renderDataStatus();

  renderGuide();

}

function renderDataStatus(){

  let dataSize = 0;

  try{

    dataSize =
      new Blob([
        JSON.stringify(
          state
        )
      ]).size;

  }catch{}

  $("#dataUsage")
    .innerHTML = `
      <div>
        묶음:
        ${allBundles().length}개
        · 폴더:
        ${allFolders().length}개
        · 단어:
        ${wordRefs().length}개
        · 학습 기록:
        ${state.history.length}개
      </div>

      <div class="muted">
        데이터 크기:
        ${
          (
            dataSize /
            1024 /
            1024
          ).toFixed(2)
        }MB
      </div>
    `;

  $("#lastChanged")
    .innerHTML =
    `
      <p class="muted">
        마지막 변경:
        ${fmtDateTime(
          state.updatedAt
        )}
      </p>
    `;

}

function renderGuide(){

  $("#guideContent")
    .innerHTML =
    Object.entries(
      CHANGELOG
    )
      .map(
        (
          [version,data],
          index
        )=>`
          <div class="guide-change">

            <button
              data-guide-version="${version}"
            >

              <b>
                v${version}
              </b>

              <span>
                ${
                  index===0
                    ? "▾"
                    : "▸"
                }
              </span>

            </button>

            <div
              class="
                guide-body
                ${
                  index===0
                    ? ""
                    : "hidden"
                }
              "
            >

              <b>
                추가된 기능
              </b>

              <ul>
                ${
                  data.added
                    .map(
                      item =>
                        `<li>${escapeHTML(item)}</li>`
                    )
                    .join("")
                }
              </ul>

              ${
                data.fixed.length
                  ? `
                    <b>
                      수정된 기능
                    </b>

                    <ul>
                      ${
                        data.fixed
                          .map(
                            item =>
                              `<li>${escapeHTML(item)}</li>`
                          )
                          .join("")
                      }
                    </ul>
                  `
                  : ""
              }

              <b>
                현재 지원되는 기능
              </b>

              <p>
                단어 및 뜻 관리,
                묶음 관리,
                폴더 관리,
                검색,
                테스트,
                빠른 테스트,
                통계,
                자동 저장,
                JSON 저장·불러오기,
                다크 모드,
                모바일 사용,
                PWA 설치
              </p>

            </div>

          </div>
        `
      )
      .join("");

  $$("[data-guide-version]")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            const body =
              button.nextElementSibling;

            if(!body){
              return;
            }

            body.classList.toggle(
              "hidden"
            );

            const span =
              button.querySelector(
                "span"
              );

            if(span){

              span.textContent =
                body.classList.contains(
                  "hidden"
                )
                  ? "▸"
                  : "▾";

            }

          };
      }
    );

  $("#guideInstallBtn")
    .classList.toggle(
      "hidden",
      !pendingInstallPrompt
    );

}

function saveSettings(){

  const autoNext =
    $("#autoNextToggle")
      .checked;

  draftSettings.autoNext =
    autoNext;

  savedSettings =
    {
      ...savedSettings,
      autoNext
    };

  if(
    persistSettings()
  ){

    draftSettings =
      {...savedSettings};

    $("#settingsMessage")
      .innerHTML =
      `
        <div>
          ✅ 설정이 저장되었습니다.
        </div>
      `;

    renderSettings();

  }

}

function resetSettings(){

  openConfirmModal(
    "설정 초기화",
    "자동 넘기기 등의 설정만 초기화됩니다. 단어와 학습 기록은 유지됩니다.",
    ()=>{

      savedSettings =
        createInitialSettings();

      draftSettings =
        {...savedSettings};

      persistSettings();

      applyTheme();

      renderSettings();

      toast(
        "✅ 설정이 초기화되었습니다."
      );

    }
  );

}

function resetLearning(){

  openConfirmModal(
    "학습 기록 초기화",
    "모든 테스트 기록과 단어별 오답 기록을 초기화합니다.",
    ()=>{

      wordRefs().forEach(
        ({word})=>{

          word.stats={
            attempts:0,
            wrong:0,
            lastWrong:null
          };

        }
      );

      state.history=[];

      autoSave();

      renderSettings();

      toast(
        "✅ 학습 기록이 초기화되었습니다."
      );

    }
  );

}

function deleteAllData(){

  openConfirmModal(
    "모든 데이터 삭제",
    "모든 폴더, 묶음, 단어, 학습 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    ()=>{

      state =
        createInitialState();

      selectedWordIds.clear();

      currentBundleId=null;

      currentView = {
        type:"home",
        id:null
      };

      autoSave();

      showPage(
        "homePage"
      );

      toast(
        "✅ 모든 데이터가 삭제되었습니다."
      );

    }
  );

}

async function sha256(
  text
){

  const buffer =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        text
      )
    );

  return [
    ...new Uint8Array(
      buffer
    )
  ]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2,"0")
    )
    .join("");

}

async function exportBackup(){

  const data = {
    format:
      "vocab-app-backup",

    version:3,

    appVersion:
      APP_VERSION,

    savedAt:
      nowISO(),

    data:
      clone(state),

    settings:
      clone(savedSettings)
  };

  const hash =
    await sha256(
      JSON.stringify(data)
    );

  const output = {
    ...data,

    integrity:{
      algorithm:
        "SHA-256",

      hash
    }
  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          output,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

  if(downloadUrl){

    URL.revokeObjectURL(
      downloadUrl
    );

  }

  downloadUrl =
    URL.createObjectURL(
      blob
    );

  const date =
    new Date();

  const fileName =
    `단어장_${
      date.getFullYear()
    }-${
      String(
        date.getMonth()+1
      ).padStart(2,"0")
    }-${
      String(
        date.getDate()
      ).padStart(2,"0")
    }_${
      String(
        date.getHours()
      ).padStart(2,"0")
    }${
      String(
        date.getMinutes()
      ).padStart(2,"0")
    }${
      String(
        date.getSeconds()
      ).padStart(2,"0")
    }.json`;

  const link =
    $("#downloadLink");

  link.href =
    downloadUrl;

  link.download =
    fileName;

  link.classList.remove(
    "hidden"
  );

  $("#saveMessage")
    .innerHTML =
    `
      <div>
        ✅ 저장 파일이 준비되었습니다.

        <br>

        <span class="muted">
          ${escapeHTML(
            fileName
          )}
        </span>
      </div>
    `;

}

async function importBackup(
  file
){

  try{

    const text =
      await file.text();

    const object =
      JSON.parse(text);

    if(
      object?.format !==
        "vocab-app-backup" ||
      !object?.data ||
      !object?.integrity?.hash
    ){

      throw new Error(
        "FORMAT"
      );

    }

    const base = {
      format:
        object.format,

      version:
        object.version,

      appVersion:
        object.appVersion,

      savedAt:
        object.savedAt,

      data:
        object.data,

      settings:
        object.settings ||
        createInitialSettings()
    };

    const calculated =
      await sha256(
        JSON.stringify(
          base
        )
      );

    if(
      calculated !==
      object.integrity.hash
    ){

      throw new Error(
        "CHANGED"
      );

    }

    if(
      !Array.isArray(
        object.data.groups
      ) ||
      !Array.isArray(
        object.data.history
      )
    ){

      throw new Error(
        "DATA"
      );

    }

    const newState =
      clone(
        object.data
      );

    const newSettings =
      {
        ...createInitialSettings(),
        ...(object.settings || {})
      };

    migrateState(
      newState
    );

    openConfirmModal(
      "불러오기 확인",
      "현재 단어장 데이터를 불러온 파일의 데이터로 교체하시겠습니까?",
      ()=>{

        const oldState =
          state;

        const oldSettings =
          savedSettings;

        state =
          newState;

        savedSettings =
          newSettings;

        draftSettings =
          {...savedSettings};

        const stateOK =
          persistState();

        const settingsOK =
          persistSettings();

        if(
          !stateOK ||
          !settingsOK
        ){

          state =
            oldState;

          savedSettings =
            oldSettings;

          draftSettings =
            {...oldSettings};

          persistState();
          persistSettings();

          return;

        }

        currentView = {
          type:"home",
          id:null
        };

        currentBundleId=null;

        applyTheme();

        showPage(
          "homePage"
        );

        toast(
          "✅ 데이터 불러오기가 완료되었습니다."
        );

      }
    );

  }catch(error){

    let message =
      "파일을 읽을 수 없습니다.";

    if(
      error.message ===
      "FORMAT"
    ){

      message =
        "올바른 단어장 저장 파일이 아닙니다.";

    }

    if(
      error.message ===
      "CHANGED"
    ){

      message =
        "파일의 내용이 변경되었거나 손상되었습니다.";

    }

    if(
      error.message ===
      "DATA"
    ){

      message =
        "파일의 데이터 구조가 올바르지 않습니다.";

    }

    $("#restoreMessage")
      .innerHTML =
      `
        <div class="incorrect">
          ❌ ${escapeHTML(
            message
          )}
        </div>
      `;

  }

}

function setupEvents(){

  $("#addWordHomeBtn")
    .onclick =
    addStandaloneWord;

  $("#addFolderBtn")
    .onclick =
    promptCreateFolder;

  $("#addBundleBtn")
    .onclick =
    promptCreateBundle;

  $("#quickTestOpenBtn")
    .onclick =
    ()=>openQuickTest();

  $("#bundleSort")
    .onchange =
    ()=>{
      bundleSort =
        $("#bundleSort")
          .value;

      if(
        currentView.type ===
        "folder"
      ){

        renderFolderPage();

      }else{

        renderRootItems();

      }

    };

  $("#globalSearch")
    .oninput =
    renderSearchResults;

  $("#backHomeBtn")
    .onclick =
    ()=>{
      showPage(
        "homePage"
      );
    };

  $("#folderAddOpenBtn")
    .onclick =
    openFolderAddModal;

  $("#addWordsBtn")
    .onclick =
    addWordsToCurrentBundle;

  $("#wordSearch")
    .oninput =
    ()=>{
      wordSearch =
        $("#wordSearch")
          .value;

      wordVisibleLimit =
        WORD_CHUNK;

      renderWords();
    };

  $("#wordSort")
    .onchange =
    ()=>{
      wordSort =
        $("#wordSort")
          .value;

      wordVisibleLimit =
        WORD_CHUNK;

      renderWords();
    };

  $("#importantFilterBtn")
    .onclick =
    ()=>{
      importantFilter =
        !importantFilter;

      wordVisibleLimit =
        WORD_CHUNK;

      $("#importantFilterBtn")
        .textContent =
        importantFilter
          ? "⭐ 전체 보기"
          : "⭐ 중요 단어만";

      renderWords();
    };

  $("#selectAllWords")
    .onchange =
    event=>{

      wordsForCurrentBundle()
        .forEach(
          word=>{

            if(
              event.target.checked
            ){

              selectedWordIds.add(
                word.id
              );

            }else{

              selectedWordIds.delete(
                word.id
              );

            }

          }
        );

      renderWords();

    };

  $("#bulkImportantOnBtn")
    .onclick =
    ()=>{
      bulkWordAction("on");
    };

  $("#bulkImportantOffBtn")
    .onclick =
    ()=>{
      bulkWordAction("off");
    };

  $("#bulkDeleteBtn")
    .onclick =
    ()=>{
      bulkWordAction("delete");
    };

  $("#startBundleTestBtn")
    .onclick =
    startBundleTest;

  $("#renameBundleBtn")
    .onclick =
    ()=>{
      if(
        currentView.type ===
        "bundle"
      ){
        renameCurrentBundle();
      }
    };

  $("#importantBundleBtn")
    .onclick =
    toggleCurrentBundleImportant;

  $("#deleteBundleBtn")
    .onclick =
    deleteCurrentView;

  $("#checkAnswerBtn")
    .onclick =
    checkAnswer;

  $("#nextQuestionBtn")
    .onclick =
    nextQuestion;

  $("#finishTestBtn")
    .onclick =
    finishTest;

  $("#exitTestBtn")
    .onclick =
    ()=>{
      leaveTestTo(
        "homePage"
      );
    };

  $("#answerInput")
    .addEventListener(
      "keydown",
      event=>{

        if(
          event.key !==
          "Enter"
        ){
          return;
        }

        event.preventDefault();

        if(
          !testSession
        ){
          return;
        }

        if(
          !testSession.answered
        ){

          checkAnswer();

          return;

        }

        if(
          testSession.index <
          testSession.questions.length - 1
        ){

          nextQuestion();

          return;

        }

        finishTest();

      }
    );

  $("#retryWrongBtn")
    .onclick =
    retryWrong;

  $("#saveBtn")
    .onclick =
    exportBackup;

  $("#restoreInput")
    .onchange =
    event=>{

      const file =
        event.target.files?.[0];

      if(file){
        importBackup(file);
      }

      event.target.value="";

    };

  $("#autoNextToggle")
    .onchange =
    ()=>{
      draftSettings.autoNext =
        $("#autoNextToggle")
          .checked;
    };

  $("#darkBtn")
    .onclick =
    requestDarkModeChange;

  $("#saveSettingsBtn")
    .onclick =
    saveSettings;

  $("#cancelSettingsBtn")
    .onclick =
    ()=>{
      draftSettings =
        {...savedSettings};

      renderSettings();
    };

  $("#resetSettingsBtn")
    .onclick =
    resetSettings;

  $("#resetLearningBtn")
    .onclick =
    resetLearning;

  $("#deleteAllBtn")
    .onclick =
    deleteAllData;

  $("#guideInstallBtn")
    .onclick =
    installPWA;

  $$(".nav-btn")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            navigate(
              button.dataset.page
            );
          };
      }
    );

  $$(".period-btn")
    .forEach(
      button=>{
        button.onclick =
          ()=>{
            renderStats.period =
              button.dataset.period;

            renderStats();

          };
      }
    );

}

function setupInfiniteScroll(){

  const observer =
    new IntersectionObserver(
      entries=>{

        if(
          !entries[0].isIntersecting
        ){
          return;
        }

        if(
          currentPage !==
          "bundlePage"
        ){
          return;
        }

        const total =
          wordsForCurrentBundle()
            .length;

        if(
          wordVisibleLimit <
          total
        ){

          wordVisibleLimit +=
            WORD_CHUNK;

          renderWords();

        }

      }
    );

  observer.observe(
    $("#wordSentinel")
  );

}

function installPWA(){

  if(
    !pendingInstallPrompt
  ){
    return;
  }

  pendingInstallPrompt
    .prompt();

  pendingInstallPrompt
    .userChoice
    .finally(
      ()=>{
        pendingInstallPrompt =
          null;

        renderGuide();
      }
    );

}

window.addEventListener(
  "beforeinstallprompt",
  event=>{
    event.preventDefault();

    pendingInstallPrompt =
      event;

    renderGuide();
  }
);

window.addEventListener(
  "appinstalled",
  ()=>{
    pendingInstallPrompt =
      null;

    renderGuide();

    toast(
      "✅ 앱이 설치되었습니다."
    );
  }
);

window.addEventListener(
  "beforeunload",
  ()=>{
    try{
      persistState();
    }catch{}
  }
);

document.addEventListener(
  "keydown",
  event=>{

    if(
      event.key !== "Escape"
    ){
      return;
    }

    if(
      !$("#modal")
        .classList.contains(
          "hidden"
        )
    ){

      closeModal();

    }

  }
);

if(
  "serviceWorker" in navigator &&
  location.protocol === "https:"
){

  navigator.serviceWorker
    .register(
      "./sw.js"
    )
    .catch(
      error=>{
        console.error(
          "Service Worker error:",
          error
        );
      }
    );

}

setupEvents();

setupInfiniteScroll();

applyTheme();

renderHome();

renderSettings();

renderDataStatus();
