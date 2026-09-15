const APP_VERSION = "1.1.0";
const DB_KEY = "vocab-app-data-v2";
const SETTINGS_KEY = "vocab-app-settings-v2";
const GROUP_PAGE_SIZE = 5;
const WORD_CHUNK = 40;
const STORAGE_SOFT_LIMIT = 4 * 1024 * 1024;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const nowISO = () => new Date().toISOString();
const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const trim = v => String(v ?? "").trim();
const norm = v => trim(v).toLocaleLowerCase("ko-KR");
const clone = v => JSON.parse(JSON.stringify(v));
const escapeHTML = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
const fmtDate = iso => new Intl.DateTimeFormat("ko-KR", {year:"numeric",month:"long",day:"numeric"}).format(new Date(iso));
const fmtTime = iso => new Intl.DateTimeFormat("ko-KR", {hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const fmtDateTime = iso => `${fmtDate(iso)} ${fmtTime(iso)}`;

const CHANGELOG = {
  "1.1.0": {
    added: [
      "묶음 5개 단위 페이지",
      "폴더 안 묶음 선택 추가",
      "묶음 중요 표시와 정렬",
      "묶음 이전/다음 이동",
      "최근 오답 7일 기준",
      "학습 기록 상대형 연/월 그룹",
      "버전별 지원 기능 표시"
    ],
    fixed: [
      "테스트 결과의 홈/단어장 이동",
      "Enter 키 단계별 동작",
      "드래그와 폴더 이동 구조",
      "검색 결과 처리",
      "PWA 캐시 버전 처리"
    ]
  },

  "1.0.0": {
    added: [
      "단어 묶음 및 단어 관리",
      "빠른 테스트",
      "통계",
      "자동 저장",
      "JSON 저장/불러오기",
      "다크 모드",
      "PWA 설치 지원"
    ],
    fixed: []
  }
};

const initialData = () => ({
  version:2,
  groups:[],
  history:[],
  updatedAt:nowISO()
});

const initialSettings = () => ({
  autoNext:false,
  darkMode:false
});

let state = loadState();
let savedSettings = loadSettings();
let draftSettings = {...savedSettings};

let currentPage = "homePage";
let currentBundleId = null;
let bundlePage = 1;
let bundleSort = "manual";

let wordSearch = "";
let wordSort = "order";
let importantFilter = false;

let selectedWordIds = new Set();
let wordVisibleLimit = WORD_CHUNK;

let testSession = null;

let pendingInstallPrompt = null;
let downloadUrl = null;
let lastExportName = "";

function loadState(){
  try{
    const raw = localStorage.getItem(DB_KEY);

    if(!raw){
      return initialData();
    }

    const d = JSON.parse(raw);

    if(
      !d ||
      !Array.isArray(d.groups) ||
      !Array.isArray(d.history)
    ){
      return initialData();
    }

    migrateState(d);

    return d;

  }catch{
    return initialData();
  }
}

function migrateState(d){

  d.groups.forEach((g,i)=>{

    g.type ||= "bundle";

    g.parentId ||= null;

    if(g.type === "folder"){
      g.parentId = null;
    }

    if(
      g.type === "bundle" &&
      g.parentId &&
      d.groups.find(
        x=>x.id===g.parentId
      )?.type !== "folder"
    ){
      g.parentId = null;
    }

    g.order ??= i;
    g.createdAt ||= nowISO();
    g.important = !!g.important;

    g.words =
      Array.isArray(g.words)
        ? g.words
        : [];

    g.words.forEach(w=>{

      w.id ||= uid("w");
      w.createdAt ||= nowISO();
      w.important = !!w.important;

      w.meanings =
        Array.isArray(w.meanings)
          ? w.meanings
          : [];

      w.meanings.forEach(m=>{
        m.id ||= uid("m");
        m.text = trim(m.text);
      });

      w.stats ||= {
        attempts:0,
        wrong:0,
        lastWrong:null
      };

    });

  });

}

function loadSettings(){

  try{

    const d =
      JSON.parse(
        localStorage.getItem(
          SETTINGS_KEY
        ) || "null"
      );

    return {
      autoNext:!!d?.autoNext,
      darkMode:!!d?.darkMode
    };

  }catch{

    return initialSettings();

  }

}

function stateSizeBytes(){

  try{
    return new Blob([
      JSON.stringify(state)
    ]).size;
  }catch{
    return 0;
  }

}

function persistState(){

  const snapshot = clone(state);

  snapshot.updatedAt = nowISO();

  const raw =
    JSON.stringify(snapshot);

  if(raw.length > STORAGE_SOFT_LIMIT){

    toast(
      "❌ 저장 공간이 부족해 변경사항을 저장하지 못했습니다. 기존 데이터는 유지됩니다."
    );

    return false;
  }

  try{

    localStorage.setItem(
      DB_KEY,
      raw
    );

    state = snapshot;

    return true;

  }catch{

    toast(
      "❌ 저장에 실패했습니다. 기존 데이터는 유지됩니다."
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

  const ok = persistState();

  if(ok){
    renderDataStatus();
  }

  return ok;
}

function getGroup(id){
  return (
    state.groups.find(
      g=>g.id===id
    ) || null
  );
}

function getBundle(id){

  const g = getGroup(id);

  return g?.type === "bundle"
    ? g
    : null;
}

function getFolders(){

  return state.groups.filter(
    g=>g.type==="folder"
  );

}

function childrenOf(parentId){

  return state.groups.filter(
    g =>
      g.type==="bundle" &&
      (g.parentId || null) ===
      (parentId || null)
  );

}

function rootItemsRaw(){

  return state.groups.filter(
    g=>
      (g.parentId || null) === null
  );

}

function roots(){

  return rootItemsRaw();

}

function allBundles(){

  return state.groups.filter(
    g=>g.type==="bundle"
  );

}

function groupName(id){

  return (
    getGroup(id)?.name ||
    "삭제된 묶음"
  );

}

function wordRefs(){

  const out = [];

  for(
    const g of allBundles()
  ){

    for(
      const w of g.words
    ){

      out.push({
        group:g,
        word:w
      });

    }

  }

  return out;

}

function meaningTexts(w){

  return (
    w.meanings || []
  )
    .map(m=>trim(m.text))
    .filter(Boolean);

}

function errorRate(w){

  return (
    w.stats?.attempts || 0
  ) > 0
    ? (
        (w.stats?.wrong || 0) /
        (w.stats.attempts || 1)
      ) * 100
    : 0;

}

function ensureStats(w){

  w.stats ||= {
    attempts:0,
    wrong:0,
    lastWrong:null
  };

}

function isValidWord(w){

  return (
    !!trim(w.english) &&
    Array.isArray(w.meanings) &&
    w.meanings.length > 0 &&
    w.meanings.every(
      m=>trim(m.text)
    )
  );

}

function duplicateGroupName(
  name,
  excludeId=null
){

  return state.groups.some(
    g =>
      g.id !== excludeId &&
      norm(g.name) === norm(name)
  );

}

function storageAllows(
  extra=1200
){

  return (
    stateSizeBytes() + extra <
    STORAGE_SOFT_LIMIT
  );

}

function toast(text){

  const d =
    document.createElement("div");

  d.className = "toast";
  d.textContent = text;

  $("#toastContainer")
    .appendChild(d);

  setTimeout(
    ()=>d.remove(),
    3300
  );

}

function setMsg(
  id,
  text,
  kind="info"
){

  const e =
    $("#"+id);

  if(e){

    e.innerHTML =
      `<div class="${kind==="error"?"incorrect":""}">
        ${escapeHTML(text)}
      </div>`;

  }

}

function openModal(
  title,
  body,
  formHTML,
  onConfirm,
  {enter=true}={}
){

  $("#modalTitle")
    .textContent = title;

  $("#modalBody")
    .innerHTML = body || "";

  $("#modalForm")
    .innerHTML = formHTML || "";

  $("#modal")
    .classList.remove("hidden");

  const close = ()=>{
    $("#modal")
      .classList.add("hidden");
  };

  $("#modalCancel").onclick =
    close;

  $("#modalConfirm").onclick =
    ()=>{
      const keep =
        openAction(onConfirm);

      if(keep !== false){
        close();
      }
    };

  if(enter){

    $("#modalForm")
      .querySelectorAll(
        "input:not([type=checkbox]),select"
      )
      .forEach(
        el=>{
          el.addEventListener(
            "keydown",
            e=>{
              if(e.key==="Enter"){
                e.preventDefault();
                $("#modalConfirm").click();
              }
            }
          );
        }
      );

  }

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

function openAction(fn){

  try{

    return fn();

  }catch(e){

    toast(
      "❌ 처리 중 오류가 발생했습니다."
    );

    console.error(e);

    return false;

  }

}

function confirmModal(
  title,
  body,
  fn
){

  openModal(
    title,
    `<p>${escapeHTML(body)}</p>`,
    "",
    ()=>{
      fn();
      return true;
    },
    {enter:false}
  );

}

function promptModal(
  title,
  label,
  value,
  onConfirm
){

  openModal(
    title,
    "",
    `
      <label class="modal-form-label">

        <span>
          ${escapeHTML(label)}
        </span>

        <input
          id="modalInput"
          value="${escapeHTML(value || "")}"
          autocomplete="off"
        >

      </label>
    `,
    ()=>{
      const v =
        trim(
          $("#modalInput").value
        );

      if(!v){

        toast(
          "⚠️ 입력해주세요."
        );

        return false;
      }

      return onConfirm(v);

    }
  );

}

function renderAll(){

  applyTheme();

  renderHome();

  renderDataStatus();

}

function showPage(page){

  currentPage = page;

  $$(".page")
    .forEach(
      p =>
        p.classList.toggle(
          "active",
          p.id===page
        )
    );

  $$(".nav-btn")
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.page===page
        )
    );

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

  if(page==="statsPage"){
    renderStats();
  }

  if(page==="settingsPage"){
    renderSettings();
  }

  if(page==="homePage"){
    renderHome();
  }

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

function navigate(page){

  if(
    hasUnsavedSettings() &&
    currentPage === "settingsPage" &&
    page !== "settingsPage"
  ){

    confirmModal(
      "설정 변경 확인",
      "변경된 설정을 저장하지 않고 이동하시겠습니까?",
      ()=>{
        draftSettings =
          {...savedSettings};

        applyTheme();

        showPage(page);
      }
    );

    return;
  }

  if(
    testSession &&
    currentPage === "testPage" &&
    page !== "testPage"
  ){

    leaveTest(
      ()=>{
        testSession = null;
        showPage(page);
      }
    );

  }else{

    showPage(page);

  }

}

function leaveTest(fn){

  confirmModal(
    "테스트 종료",
    "진행 중인 테스트를 종료하시겠습니까? 현재 테스트 결과는 학습 기록에 저장되지 않습니다.",
    fn
  );

}

function createFolder(){

  const name =
    trim(arguments[0] || "");

  if(!name){

    toast(
      "⚠️ 폴더 이름을 입력해주세요."
    );

    return false;
  }

  if(
    duplicateGroupName(name)
  ){

    toast(
      "⚠️ 이미 같은 이름의 묶음/폴더가 있습니다."
    );

    return false;
  }

  if(!storageAllows()){

    toast(
      "⚠️ 데이터가 커서 새 폴더를 만들 수 없습니다."
    );

    return false;
  }

  const siblings =
    rootItemsRaw();

  state.groups.push({

    id:uid("folder"),

    type:"folder",

    name,

    parentId:null,

    order:siblings.length,

    createdAt:nowISO(),

    important:false,

    words:[]

  });

  autoSave();

  renderHome();

  return true;

}

function promptCreateFolder(){

  promptModal(
    "폴더 추가",
    "폴더 이름",
    "",
    createFolder
  );

}

function createBundle(
  name,
  parentId=null
){

  name = trim(name);

  if(!name){

    toast(
      "⚠️ 묶음 이름을 입력해주세요."
    );

    return false;
  }

  if(
    parentId &&
    getGroup(parentId)?.type !==
    "folder"
  ){

    toast(
      "❌ 묶음은 폴더 안에만 들어갈 수 있습니다."
    );

    return false;
  }

  if(
    duplicateGroupName(name)
  ){

    toast(
      "⚠️ 이미 같은 이름의 묶음/폴더가 있습니다."
    );

    return false;
  }

  if(!storageAllows()){

    toast(
      "⚠️ 데이터가 부족해 새 묶음을 만들 수 없습니다."
    );

    return false;
  }

  const siblings =
    parentId
      ? childrenOf(parentId)
      : rootItemsRaw();

  state.groups.push({

    id:uid("bundle"),

    type:"bundle",

    name,

    parentId:
      parentId || null,

    order:
      siblings.length,

    createdAt:
      nowISO(),

    important:false,

    words:[]

  });

  autoSave();

  renderHome();

  return true;

}
function deleteGroupRecursive(id){

  const children =
    state.groups.filter(
      g=>g.parentId===id
    );

  for(
    const child of children
  ){
    deleteGroupRecursive(child.id);
  }

  state.groups =
    state.groups.filter(
      g=>g.id!==id
    );

}

function moveBundleToFolder(
  bundleId,
  folderId
){

  const bundle =
    getBundle(bundleId);

  const folder =
    getGroup(folderId);

  if(
    !bundle ||
    !folder ||
    folder.type!=="folder"
  ){
    return false;
  }

  bundle.parentId =
    folder.id;

  bundle.order =
    childrenOf(folder.id).length;

  return true;

}

function moveBundleToRoot(
  bundleId
){

  const bundle =
    getBundle(bundleId);

  if(!bundle){
    return false;
  }

  bundle.parentId = null;

  bundle.order =
    rootItemsRaw().length;

  return true;

}

function canDropIntoFolder(
  bundleId,
  folderId
){

  const bundle =
    getBundle(bundleId);

  const folder =
    getGroup(folderId);

  if(
    !bundle ||
    bundle.type!=="bundle" ||
    !folder ||
    folder.type!=="folder"
  ){
    return false;
  }

  return bundle.id!==folder.id;

}

function reorderSiblingBundles(
  parentId,
  orderedIds
){

  orderedIds.forEach(
    (id,index)=>{
      const g =
        getBundle(id);

      if(
        g &&
        (g.parentId || null) ===
        (parentId || null)
      ){
        g.order=index;
      }
    }
  );

}

function manualItems(
  parentId=null
){

  return state.groups
    .filter(
      g =>
        (g.parentId || null) ===
        (parentId || null)
    )
    .sort(
      (a,b)=>
        (a.order ?? 0) -
        (b.order ?? 0)
    );

}

function sortedItems(
  parentId=null
){

  let items =
    [...manualItems(parentId)];

  const sort =
    bundleSort;

  if(sort==="manual"){
    return items;
  }

  if(
    sort==="oldest"
  ){

    return items.sort(
      (a,b)=>
        new Date(a.createdAt) -
        new Date(b.createdAt)
    );

  }

  if(
    sort==="newest"
  ){

    return items.sort(
      (a,b)=>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

  }

  if(
    sort==="important-oldest"
  ){

    return items.sort(
      (a,b)=>
        Number(b.important) -
        Number(a.important) ||
        new Date(a.createdAt) -
        new Date(b.createdAt)
    );

  }

  if(
    sort==="important-newest"
  ){

    return items.sort(
      (a,b)=>
        Number(b.important) -
        Number(a.important) ||
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

  }

  return items;

}

function updateGroupOrders(){

  const parentIds =
    new Set(
      state.groups.map(
        g=>g.parentId || null
      )
    );

  for(
    const parentId
    of parentIds
  ){

    manualItems(parentId)
      .forEach(
        (g,index)=>{
          g.order=index;
        }
      );

  }

}

function renderHome(){

  currentPage =
    "homePage";

  showPageSilent("homePage");

  renderHomeStats();

  renderHomeBreadcrumbs();

  renderSearchResults();

  renderBundles();

}

function showPageSilent(page){

  $$(".page")
    .forEach(
      p =>
        p.classList.toggle(
          "active",
          p.id===page
        )
    );

  $$(".nav-btn")
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.page===page
        )
    );

  currentPage=page;

}

function renderHomeBreadcrumbs(){

  const box =
    $("#homeBreadcrumbs");

  if(!box){
    return;
  }

  box.innerHTML =
    `<span>🏠 홈</span>`;

}

function renderHomeStats(){

  const refs =
    wordRefs();

  const tests =
    state.history.length;

  const totalQuestions =
    state.history.reduce(
      (a,h)=>
        a+(h.questionCount||0),
      0
    );

  const totalCorrect =
    state.history.reduce(
      (a,h)=>
        a+(h.correct||0),
      0
    );

  const accuracy =
    totalQuestions
      ? Math.round(
          totalCorrect /
          totalQuestions *
          100
        )
      : 0;

  $("#homeStats").innerHTML = [

    statCard(
      "묶음",
      allBundles().length
    ),

    statCard(
      "단어",
      refs.length
    ),

    statCard(
      "테스트",
      tests
    ),

    statCard(
      "누적 정확도",
      totalQuestions
        ? `${accuracy}%`
        : "-"
    )

  ].join("");

}

function statCard(
  label,
  value
){

  return `
    <div class="stat-card">
      <b>${escapeHTML(value)}</b>
      <span>${escapeHTML(label)}</span>
    </div>
  `;

}

function getRootPageItems(){

  return sortedItems(null);

}

function renderBundles(){

  const items =
    getRootPageItems();

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
    (bundlePage-1) *
    GROUP_PAGE_SIZE;

  const pageItems =
    items.slice(
      start,
      start+GROUP_PAGE_SIZE
    );

  $("#bundlePageInfo")
    .textContent =
      items.length
        ? `${items.length}개`
        : "";

  const box =
    $("#bundleList");

  if(!pageItems.length){

    box.innerHTML = `
      <div class="empty">

        📚 아직 묶음이 없습니다.

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

    box.innerHTML =
      pageItems
        .map(
          g=>renderGroupNode(g)
        )
        .join("");

  }

  $("#bundlePagination")
    .innerHTML =
      renderPagination(
        pageCount,
        bundlePage
      );

  wireGroupEvents();

  enableGroupDrag();

}

function renderPagination(
  pageCount,
  current
){

  if(pageCount<=1){
    return "";
  }

  let html="";

  for(
    let i=1;
    i<=pageCount;
    i++
  ){

    html += `
      <button
        class="${i===current?"active":""}"
        data-bundle-page="${i}"
      >
        ${i}
      </button>
    `;

  }

  return html;

}

function renderGroupNode(
  g
){

  const isFolder =
    g.type==="folder";

  const children =
    isFolder
      ? sortedItems(g.id)
      : [];

  const open =
    g.open !== false;

  const icon =
    isFolder
      ? "📁"
      : "📚";

  const count =
    isFolder
      ? children.length
      : g.words.length;

  return `
    <div
      class="bundle-wrap"
      data-group-id="${g.id}"
    >

      <div
        class="bundle-row"
        data-row-id="${g.id}"
      >

        <button
          class="drag-handle"
          data-drag-id="${g.id}"
          title="드래그"
        >
          ☷
        </button>

        ${
          isFolder
            ? `
              <button
                class="folder-toggle"
                data-toggle-folder="${g.id}"
                aria-label="폴더 열기"
              >
                ${open ? "▾" : "▸"}
              </button>
            `
            : ""
        }

        <button
          class="bundle-star"
          data-important-group="${g.id}"
          title="중요 표시"
        >
          ${g.important ? "⭐" : "☆"}
        </button>

        <div
          class="bundle-main"
          data-open-group="${g.id}"
        >

          <div class="bundle-name">

            <span>
              ${icon}
            </span>

            <span>
              ${escapeHTML(g.name)}
            </span>

          </div>

          <div class="bundle-meta">
            생성일
            ${fmtDateTime(g.createdAt)}
          </div>

        </div>

        <div class="bundle-count">
          ${
            isFolder
              ? `${count}개 묶음`
              : `${count}개 단어`
          }
        </div>

      </div>

      ${
        isFolder &&
        open
          ? `
            <div
              class="child-list"
              data-parent-folder="${g.id}"
            >

              ${
                children.length
                  ? children
                      .map(
                        child =>
                          renderGroupNode(
                            child
                          )
                      )
                      .join("")
                  : `
                    <div class="child-empty">
                      아직 들어있는 묶음이 없습니다.
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

function wireGroupEvents(){

  $$("[data-open-group]")
    .forEach(
      el=>{
        el.onclick = e=>{

          if(
            el.dataset.dragClicked==="1"
          ){
            return;
          }

          openGroup(
            el.dataset.openGroup
          );

        };
      }
    );

  $$("[data-toggle-folder]")
    .forEach(
      el=>{
        el.onclick = e=>{
          e.stopPropagation();

          const g =
            getGroup(
              el.dataset.toggleFolder
            );

          if(!g){
            return;
          }

          g.open =
            g.open === false;

          autoSave();

          renderBundles();

        };
      }
    );

  $$("[data-important-group]")
    .forEach(
      el=>{
        el.onclick = e=>{
          e.stopPropagation();

          const g =
            getGroup(
              el.dataset.importantGroup
            );

          if(!g){
            return;
          }

          g.important =
            !g.important;

          autoSave();

          renderBundles();

        };
      }
    );

  $$("[data-bundle-page]")
    .forEach(
      el=>{
        el.onclick=()=>{
          bundlePage =
            Number(
              el.dataset.bundlePage
            );

          renderBundles();

          window.scrollTo({
            top:0,
            behavior:"smooth"
          });

        };
      }
    );

}

let dragState = null;

function enableGroupDrag(){

  $$("[data-drag-id]")
    .forEach(
      handle=>{

        handle.onpointerdown =
          e=>{
            e.preventDefault();

            const id =
              handle.dataset.dragId;

            const row =
              document.querySelector(
                `[data-row-id="${id}"]`
              );

            if(!row){
              return;
            }

            dragState = {
              id,
              startX:e.clientX,
              startY:e.clientY,
              active:false,
              row,
              pointerId:e.pointerId,
              lastOverFolder:null
            };

            handle.setPointerCapture?.(
              e.pointerId
            );

            document.body.style.userSelect =
              "none";
          };

        handle.onpointermove =
          e=>{

            if(
              !dragState ||
              dragState.pointerId !==
              e.pointerId
            ){
              return;
            }

            const dx =
              e.clientX -
              dragState.startX;

            const dy =
              e.clientY -
              dragState.startY;

            if(
              !dragState.active &&
              Math.hypot(dx,dy) < 6
            ){
              return;
            }

            dragState.active=true;

            dragState.row
              .classList.add(
                "dragging"
              );

            const target =
              document.elementFromPoint(
                e.clientX,
                e.clientY
              );

            const folderWrap =
              target?.closest(
                '.bundle-wrap[data-group-id]'
              );

            let folder =
              folderWrap
                ? getGroup(
                    folderWrap.dataset.groupId
                  )
                : null;

            if(
              folder &&
              folder.type !== "folder"
            ){
              folder=null;
            }

            $$(
              ".drag-folder-target"
            )
              .forEach(
                x =>
                  x.classList.remove(
                    "drag-folder-target"
                  )
              );

            if(
              folder &&
              folder.id !==
                dragState.id
            ){

              dragState.lastOverFolder =
                folder.id;

              folderWrap
                .querySelector(
                  ".bundle-row"
                )
                ?.classList.add(
                  "drag-folder-target"
                );

              return;

            }

            dragState.lastOverFolder = null;

            const parent =
              dragState.row
                .closest(
                  ".child-list"
                ) ||
              $("#bundleList");

            const candidates =
              [
                ...parent.children
              ].filter(
                el =>
                  el.classList.contains(
                    "bundle-wrap"
                  ) &&
                  el.dataset.groupId !==
                    dragState.id
              );

            const before =
              candidates.find(
                el =>
                  e.clientY <
                    el.getBoundingClientRect()
                      .top +
                    el.getBoundingClientRect()
                      .height/2
              );

            if(before){

              parent.insertBefore(
                dragState.row
                  .parentElement,
                before
              );

            }

          };

        handle.onpointerup =
          e=>{
            if(
              !dragState ||
              dragState.pointerId !==
              e.pointerId
            ){
              return;
            }

            const d =
              dragState;

            dragState=null;

            document.body.style.userSelect =
              "";

            d.row
              .classList.remove(
                "dragging"
              );

            $$(".drag-folder-target")
              .forEach(
                x =>
                  x.classList.remove(
                    "drag-folder-target"
                  )
              );

            if(!d.active){
              return;
            }

            if(
              d.lastOverFolder &&
              canDropIntoFolder(
                d.id,
                d.lastOverFolder
              )
            ){

              moveBundleToFolder(
                d.id,
                d.lastOverFolder
              );

              updateGroupOrders();
              autoSave();
              renderHome();

              return;

            }

            syncRenderedGroupOrder();

          };

        handle.onpointercancel =
          ()=>{
            if(!dragState){
              return;
            }

            dragState=null;

            document.body.style.userSelect =
              "";

            $$(".dragging")
              .forEach(
                x =>
                  x.classList.remove(
                    "dragging"
                  )
              );

            $$(".drag-folder-target")
              .forEach(
                x =>
                  x.classList.remove(
                    "drag-folder-target"
                  )
              );

            renderHome();

          };

      }
    );

}

function syncRenderedGroupOrder(){

  const containers = [
    $("#bundleList"),
    ...$$(
      "#bundleList .child-list"
    )
  ];

  for(
    const container
    of containers
  ){

    if(!container){
      continue;
    }

    const folderParent =
      container.dataset
        ?.parentFolder ||
      null;

    const ids =
      [
        ...container.children
      ]
        .map(
          x=>x.dataset.groupId
        )
        .filter(Boolean);

    ids.forEach(
      (id,index)=>{
        const g =
          getGroup(id);

        if(!g){
          return;
        }

        g.parentId =
          folderParent;

        g.order =
          index;

      }
    );

  }

  autoSave();

  renderHome();

}

function openGroup(
  id,
  focusWordId=null
){

  const g =
    getGroup(id);

  if(!g){
    return;
  }

  if(
    g.type === "folder"
  ){

    g.open=true;

    autoSave();

    return;

  }

  currentBundleId=id;

  showPageSilent(
    "bundlePage"
  );

  renderBundlePage();

  if(focusWordId){

    setTimeout(
      ()=>{
        document
          .querySelector(
            `[data-word-id="${focusWordId}"]`
          )
          ?.scrollIntoView({
            behavior:"smooth",
            block:"center"
          });
      },
      120
    );

  }

}

function renderBreadcrumbsForBundle(
  bundleId
){

  const g =
    getBundle(bundleId);

  if(!g){
    return;
  }

  const chain=[];
  let current=g;

  while(current){

    chain.unshift(current);

    current =
      getGroup(
        current.parentId
      );

  }

  let html = `
    <button
      data-crumb-home
    >
      🏠 홈
    </button>
  `;

  for(
    const item
    of chain
  ){

    html += `
      <span>›</span>
    `;

    html += `
      <button
        data-crumb-id="${item.id}"
      >
        ${escapeHTML(item.name)}
      </button>
    `;

  }

  $("#bundleBreadcrumbs")
    .innerHTML = html;

  $("[data-crumb-home]")
    ?.addEventListener(
      "click",
      ()=>{
        navigate(
          "homePage"
        );
      }
    );

  $$("[data-crumb-id]")
    .forEach(
      b=>{
        b.onclick=()=>{
          const id =
            b.dataset.crumbId;

          const g =
            getGroup(id);

          if(
            g?.type==="bundle"
          ){
            openGroup(id);
          }
        };
      }
    );

}

function renderBundlePage(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){

    navigate(
      "homePage"
    );

    return;

  }

  $("#bundleTitle")
    .textContent =
      g.name;

  $("#bundleInfo")
    .textContent =
      `${g.words.length}개 단어 · 생성일 ${fmtDateTime(g.createdAt)}`;

  renderBreadcrumbsForBundle(
    g.id
  );

  $("#importantBundleBtn")
    .textContent =
      g.important
        ? "⭐ 중요 해제"
        : "☆ 중요";

  renderBundleNavigation();

  $("#folderAddOpenBtn")
    .classList.add(
      "hidden"
    );

  const parent =
    g.parentId
      ? getGroup(g.parentId)
      : null;

  if(parent?.type === "folder"){

    $("#folderAddOpenBtn")
      .classList.remove(
        "hidden"
      );

  }

  renderWords();

}

function siblingBundles(
  bundle
){

  return sortedItems(
    bundle.parentId || null
  )
    .filter(
      g=>g.type==="bundle"
    );

}

function renderBundleNavigation(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  const siblings =
    siblingBundles(g);

  const index =
    siblings.findIndex(
      x=>x.id===g.id
    );

  const prev =
    index > 0
      ? siblings[index-1]
      : null;

  const next =
    index >= 0 &&
    index < siblings.length-1
      ? siblings[index+1]
      : null;

  const prevBtn =
    $("#prevBundleBtn");

  const nextBtn =
    $("#nextBundleBtn");

  prevBtn.disabled =
    !prev;

  nextBtn.disabled =
    !next;

  prevBtn.onclick =
    ()=>{
      if(prev){
        openGroup(
          prev.id
        );
      }
    };

  nextBtn.onclick =
    ()=>{
      if(next){
        openGroup(
          next.id
        );
      }
    };

}

function promptCreateBundle(){

  promptModal(
    "묶음 추가",
    "묶음 이름",
    "",
    val=>{

      const ok =
        createBundle(
          val,
          null
        );

      return ok;

    }
  );

}

function promptRenameCurrent(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  promptModal(
    "묶음 이름 변경",
    "새 이름",
    g.name,
    val=>{

      if(
        duplicateGroupName(
          val,
          g.id
        )
      ){

        toast(
          "⚠️ 이미 같은 이름의 묶음/폴더가 있습니다."
        );

        return false;
      }

      confirmModal(
        "이름 변경",
        `'${val}'로 변경하시겠습니까?`,
        ()=>{
          g.name=val;

          autoSave();

          renderBundlePage();
          renderHome();
        }
      );

      return true;

    }
  );

}

function toggleCurrentBundleImportant(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  g.important =
    !g.important;

  autoSave();

  renderBundlePage();

}

function deleteCurrentGroup(){

  const g =
    getGroup(
      currentBundleId
    );

  if(!g){
    return;
  }

  confirmModal(
    "묶음 삭제",
    `'${g.name}'을(를) 삭제하시겠습니까?`,
    ()=>{
      deleteGroupRecursive(
        g.id
      );

      autoSave();

      currentBundleId=null;

      navigate(
        "homePage"
      );
    }
  );

}

function renderFolderAddCandidates(){

  if(
    !currentBundleId
  ){
    return;
  }

  const folder =
    getGroup(
      currentBundleId
    );

  if(
    !folder ||
    folder.type!=="folder"
  ){
    return;
  }

  const query =
    norm(
      $("#folderBundleSearch")
        ?.value || ""
    );

  const existing =
    new Set(
      childrenOf(folder.id)
        .map(
          g=>g.id
        )
    );

  const candidates =
    allBundles()
      .filter(
        g =>
          !existing.has(g.id) &&
          (
            !g.parentId ||
            g.parentId === null
          ) &&
          (
            !query ||
            norm(g.name)
              .includes(query)
          )
      )
      .sort(
        (a,b)=>
          new Date(a.createdAt) -
          new Date(b.createdAt)
      );

  const box =
    $("#folderBundleCandidates");

  if(!candidates.length){

    box.innerHTML = `
      <div class="empty">
        추가할 묶음이 없습니다.
      </div>
    `;

    $("#folderCandidateCount")
      .textContent="0개";

    return;

  }

  box.innerHTML =
    candidates
      .map(
        g=>`
          <label
            class="candidate-row"
          >

            <input
              type="checkbox"
              class="folder-candidate"
              value="${g.id}"
            >

            <span>

              <b>
                ${escapeHTML(g.name)}
              </b>

              <small class="subtle">
                ${g.words.length}개 단어 ·
                ${fmtDate(g.createdAt)}
              </small>

            </span>

          </label>
        `
      )
      .join("");

  $("#folderCandidateCount")
    .textContent =
      `${candidates.length}개`;

}

function openFolderAdd(){

  const folder =
    getGroup(
      currentBundleId
    );

  if(
    !folder ||
    folder.type!=="folder"
  ){
    return;
  }

  $("#folderAddCard")
    .classList.remove(
      "hidden"
    );

  $("#folderBundleSearch")
    .value="";

  renderFolderAddCandidates();

  setTimeout(
    ()=>{
      $("#folderBundleSearch")
        .focus();
    },
    30
  );

}

function closeFolderAdd(){

  $("#folderAddCard")
    .classList.add(
      "hidden"
    );

}

function selectAllFolderCandidates(
  checked
){

  $$(".folder-candidate")
    .forEach(
      c=>{
        c.checked=checked;
      }
    );

}

function addSelectedToFolder(){

  const folder =
    getGroup(
      currentBundleId
    );

  if(
    !folder ||
    folder.type!=="folder"
  ){
    return;
  }

  const ids =
    $$(
      ".folder-candidate:checked"
    )
      .map(
        c=>c.value
      );

  if(!ids.length){

    toast(
      "⚠️ 추가할 묶음을 선택해주세요."
    );

    return;

  }

  for(
    const id
    of ids
  ){

    moveBundleToFolder(
      id,
      folder.id
    );

  }

  updateGroupOrders();

  autoSave();

  renderHome();

  currentBundleId =
    folder.id;

  closeFolderAdd();

  toast(
    `✅ ${ids.length}개 묶음이 폴더에 추가되었습니다.`
  );

}
function parseBulkInput(text){

  const parts =
    String(text || "")
      .split("/")
      .map(trim);

  if(!parts.length){
    return {
      error:"입력한 단어가 없습니다."
    };
  }

  const result=[];

  for(
    let i=0;
    i<parts.length;
    i++
  ){

    const part=parts[i];

    if(!part){

      return {
        error:`${i+1}번째 단어가 비어 있습니다.`
      };

    }

    const colon =
      part.indexOf(":");

    if(colon<0){

      return {
        error:
          `${i+1}번째 단어에 ':'가 없습니다.`
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
        .slice(colon+1)
        .split(",")
        .map(trim);

    if(!english){

      return {
        error:
          `${i+1}번째 단어의 영어가 비어 있습니다.`
      };

    }

    if(
      meanings.length===0 ||
      meanings.some(
        m=>!m
      )
    ){

      return {
        error:
          `${i+1}번째 단어의 뜻 중 비어 있는 항목이 있습니다.`
      };

    }

    const uniqueMeanings =
      [
        ...new Map(
          meanings.map(
            m=>[
              norm(m),
              {
                id:uid("m"),
                text:m
              }
            ]
          )
        ).values()
      ];

    result.push({
      english,
      meanings:uniqueMeanings
    });

  }

  return {
    items:result
  };

}

function cleanupOtherWord(
  english,
  meaningList
){

  const other =
    state.groups.find(
      g =>
        g.type==="bundle" &&
        g.name==="기타 단어" &&
        !g.parentId
    );

  if(!other){
    return;
  }

  const word =
    other.words.find(
      w =>
        norm(w.english) ===
        norm(english)
    );

  if(!word){
    return;
  }

  word.meanings =
    word.meanings.filter(
      m =>
        !meaningList.some(
          value =>
            norm(value) ===
            norm(m.text)
        )
    );

  if(
    word.meanings.length===0
  ){

    other.words =
      other.words.filter(
        w=>w.id!==word.id
      );

  }

  if(
    other.words.length===0
  ){

    state.groups =
      state.groups.filter(
        g=>g.id!==other.id
      );

  }

}

function getOrCreateOtherBundle(){

  let other =
    state.groups.find(
      g =>
        g.type==="bundle" &&
        g.name==="기타 단어" &&
        !g.parentId
    );

  if(other){
    return other;
  }

  if(!storageAllows()){
    return null;
  }

  other={
    id:uid("bundle"),
    type:"bundle",
    name:"기타 단어",
    parentId:null,
    order:rootItemsRaw().length,
    createdAt:nowISO(),
    important:false,
    words:[]
  };

  state.groups.push(other);

  return other;

}

function addWordsToCurrentBundle(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  const parsed =
    parseBulkInput(
      $("#bulkInput").value
    );

  if(parsed.error){

    setMsg(
      "inputMessage",
      `❌ ${parsed.error}`,
      "error"
    );

    return;
  }

  let added=0;
  let newMeanings=0;

  for(
    const item
    of parsed.items
  ){

    let word =
      g.words.find(
        w =>
          norm(w.english) ===
          norm(item.english)
      );

    if(!word){

      word={
        id:uid("w"),
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

      g.words.push(word);

      added++;

    }

    ensureStats(word);

    for(
      const m
      of item.meanings
    ){

      const exists =
        word.meanings.some(
          current =>
            norm(current.text) ===
            norm(m.text)
        );

      if(!exists){

        word.meanings.push(m);

        newMeanings++;

      }

    }

    cleanupOtherWord(
      item.english,
      item.meanings.map(
        m=>m.text
      )
    );

  }

  autoSave();

  $("#bulkInput")
    .value="";

  setMsg(
    "inputMessage",
    `✅ ${added}개 단어, ${newMeanings}개 뜻이 추가되었습니다.`,
    "ok"
  );

  renderBundlePage();

}

function addStandaloneWord(){

  openModal(
    "단어 및 뜻 추가",
    `
      <p class="muted">
        추가된 단어는 자동으로
        <b>기타 단어</b> 묶음에 들어갑니다.
      </p>
    `,
    `
      <label class="modal-form-label">
        <span>영어</span>

        <input
          id="standaloneEnglish"
          autocomplete="off"
        >
      </label>

      <label class="modal-form-label">
        <span>뜻</span>

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
          $("#standaloneEnglish").value
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
          m=>!m
        )
      ){

        toast(
          "⚠️ 뜻을 모두 입력해주세요."
        );

        return false;
      }

      const other =
        getOrCreateOtherBundle();

      if(!other){

        toast(
          "❌ 저장 공간이 부족해 기타 단어를 만들 수 없습니다."
        );

        return false;
      }

      let word =
        other.words.find(
          w =>
            norm(w.english) ===
            norm(english)
        );

      if(!word){

        word={
          id:uid("w"),
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

        other.words.push(word);

      }

      ensureStats(word);

      for(
        const meaning
        of meanings
      ){

        if(
          !word.meanings.some(
            m =>
              norm(m.text) ===
              norm(meaning)
          )
        ){

          word.meanings.push({
            id:uid("m"),
            text:meaning
          });

        }

      }

      autoSave();

      renderHome();

      toast(
        "✅ 기타 단어에 추가되었습니다."
      );

      return true;

    }
  );

}

function renderWords(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  let words =
    [...g.words];

  const query =
    norm(wordSearch);

  if(query){

    words =
      words.filter(
        w =>
          norm(w.english)
            .includes(query) ||
          meaningTexts(w).some(
            m =>
              norm(m)
                .includes(query)
          )
      );

  }

  if(importantFilter){

    words =
      words.filter(
        w=>w.important
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

  if(wordSort==="recentWrong"){

    words.sort(
      (a,b)=>
        String(
          b.stats?.lastWrong || ""
        ).localeCompare(
          String(
            a.stats?.lastWrong || ""
          )
        )
    );

  }

  if(wordSort==="important"){

    words.sort(
      (a,b)=>
        Number(b.important) -
        Number(a.important)
    );

  }

  if(wordSort==="difficulty"){

    words.sort(
      (a,b)=>
        errorRate(b) -
        errorRate(a)
    );

  }

  $("#visibleWordCount")
    .textContent =
      `${words.length}개`;

  const visible =
    words.slice(
      0,
      wordVisibleLimit
    );

  if(!visible.length){

    $("#wordList")
      .innerHTML = `
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
        visible.map(
          renderWordCard
        ).join("");

  }

  if(
    visible.length <
    words.length
  ){

    $("#wordSentinel")
      .innerHTML = `
        <div
          class="muted"
          style="text-align:center;padding:14px"
        >
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

function renderWordCard(w){

  ensureStats(w);

  const rate =
    errorRate(w).toFixed(1);

  return `
    <div
      class="word-card"
      data-word-id="${w.id}"
    >

      <div class="word-top">

        <input
          type="checkbox"
          class="word-select"
          data-select-word="${w.id}"
          ${selectedWordIds.has(w.id)?"checked":""}
        >

        <button
          class="mini-btn"
          data-important-word="${w.id}"
          title="중요 단어"
        >
          ${w.important ? "⭐" : "☆"}
        </button>

        <div class="word-en">
          ${escapeHTML(w.english)}
        </div>

        <div class="word-stats">
          오답률 ${rate}%
        </div>

        <button
          class="mini-btn"
          data-edit-word="${w.id}"
        >
          ✏️
        </button>

        <button
          class="mini-btn"
          data-delete-word="${w.id}"
        >
          🗑
        </button>

      </div>

      ${
        w.meanings.map(
          m=>`
            <div
              class="meaning-row"
            >

              <div class="meaning-text">
                ${escapeHTML(m.text)}
              </div>

              <div class="meaning-actions">

                <button
                  class="mini-btn"
                  data-edit-meaning="${w.id}"
                  data-meaning-id="${m.id}"
                >
                  ✏️
                </button>

                <button
                  class="mini-btn"
                  data-delete-meaning="${w.id}"
                  data-meaning-id="${m.id}"
                >
                  🗑
                </button>

              </div>

            </div>
          `
        ).join("")
      }

      <button
        class="mini-btn"
        data-add-meaning="${w.id}"
      >
        ＋ 뜻 추가
      </button>

    </div>
  `;

}

function wireWordEvents(){

  $$("[data-select-word]")
    .forEach(
      el=>{
        el.onchange=()=>{

          if(el.checked){

            selectedWordIds.add(
              el.dataset.selectWord
            );

          }else{

            selectedWordIds.delete(
              el.dataset.selectWord
            );

          }

          updateBulkActions();
          updateSelectAll();

        };
      }
    );

  $$("[data-important-word]")
    .forEach(
      el=>{
        el.onclick=()=>{

          const g =
            getBundle(
              currentBundleId
            );

          const w =
            g?.words.find(
              x =>
                x.id ===
                el.dataset.importantWord
            );

          if(!w){
            return;
          }

          w.important =
            !w.important;

          autoSave();

          renderWords();

        };
      }
    );

  $$("[data-edit-word]")
    .forEach(
      el=>{
        el.onclick=()=>{
          editWord(
            el.dataset.editWord
          );
        };
      }
    );

  $$("[data-delete-word]")
    .forEach(
      el=>{
        el.onclick=()=>{
          deleteWord(
            el.dataset.deleteWord
          );
        };
      }
    );

  $$("[data-edit-meaning]")
    .forEach(
      el=>{
        el.onclick=()=>{
          editMeaning(
            el.dataset.editMeaning,
            el.dataset.meaningId
          );
        };
      }
    );

  $$("[data-delete-meaning]")
    .forEach(
      el=>{
        el.onclick=()=>{
          deleteMeaning(
            el.dataset.deleteMeaning,
            el.dataset.meaningId
          );
        };
      }
    );

  $$("[data-add-meaning]")
    .forEach(
      el=>{
        el.onclick=()=>{
          addMeaning(
            el.dataset.addMeaning
          );
        };
      }
    );

}

function updateBulkActions(){

  const n =
    selectedWordIds.size;

  $("#bulkActions")
    .classList.toggle(
      "hidden",
      n===0
    );

  $("#selectedCount")
    .textContent =
      `${n}개 선택`;

}

function updateSelectAll(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  const visibleIds =
    wordsForCurrentView()
      .map(w=>w.id);

  $("#selectAllWords")
    .checked =
      visibleIds.length > 0 &&
      visibleIds.every(
        id =>
          selectedWordIds.has(id)
      );

}

function wordsForCurrentView(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return [];
  }

  let words =
    [...g.words];

  const query =
    norm(wordSearch);

  if(query){

    words =
      words.filter(
        w =>
          norm(w.english)
            .includes(query) ||
          meaningTexts(w).some(
            m =>
              norm(m)
                .includes(query)
          )
      );

  }

  if(importantFilter){

    words =
      words.filter(
        w=>w.important
      );

  }

  return words;

}

function editWord(wordId){

  const g =
    getBundle(
      currentBundleId
    );

  const w =
    g?.words.find(
      x=>x.id===wordId
    );

  if(!w){
    return;
  }

  openModal(
    "단어 수정",
    "",
    `
      <label class="modal-form-label">

        <span>영어</span>

        <input
          id="editWordEnglish"
          value="${escapeHTML(w.english)}"
          autocomplete="off"
        >

      </label>

      <div>
        <b>뜻</b>
      </div>

      <div id="editMeaningList">

        ${
          w.meanings.map(
            m=>`
              <label
                class="modal-form-label"
              >

                <input
                  value="${escapeHTML(m.text)}"
                  data-edit-meaning-input="${m.id}"
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

      const meaningInputs =
        $$(
          "[data-edit-meaning-input]"
        );

      const values =
        meaningInputs.map(
          input=>trim(
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
        g.words.some(
          other =>
            other.id!==w.id &&
            norm(other.english) ===
            norm(english)
        );

      if(duplicate){

        toast(
          "⚠️ 같은 묶음에 같은 단어가 있습니다."
        );

        return false;
      }

      const duplicateMeaning =
        values.some(
          (value,index)=>
            values.findIndex(
              x=>norm(x)===norm(value)
            ) !== index
        );

      if(duplicateMeaning){

        toast(
          "⚠️ 같은 뜻이 중복되어 있습니다."
        );

        return false;
      }

      w.english =
        english;

      w.meanings =
        meaningInputs.map(
          input=>({
            id:
              input.dataset
                .editMeaningInput,
            text:
              trim(input.value)
          })
        );

      cleanupOtherWord(
        w.english,
        meaningTexts(w)
      );

      autoSave();

      renderBundlePage();

      return true;

    }
  );

}

function addMeaning(wordId){

  const g =
    getBundle(
      currentBundleId
    );

  const w =
    g?.words.find(
      x=>x.id===wordId
    );

  if(!w){
    return;
  }

  promptModal(
    "뜻 추가",
    "새 뜻",
    "",
    value=>{

      if(
        w.meanings.some(
          m =>
            norm(m.text) ===
            norm(value)
        )
      ){

        toast(
          "⚠️ 같은 뜻이 이미 있습니다."
        );

        return false;
      }

      w.meanings.push({
        id:uid("m"),
        text:value
      });

      cleanupOtherWord(
        w.english,
        [value]
      );

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

  const g =
    getBundle(
      currentBundleId
    );

  const w =
    g?.words.find(
      x=>x.id===wordId
    );

  const m =
    w?.meanings.find(
      x=>x.id===meaningId
    );

  if(!m){
    return;
  }

  promptModal(
    "뜻 수정",
    "새 뜻",
    m.text,
    value=>{

      if(
        w.meanings.some(
          x =>
            x.id!==m.id &&
            norm(x.text) ===
            norm(value)
        )
      ){

        toast(
          "⚠️ 같은 뜻이 이미 있습니다."
        );

        return false;
      }

      m.text =
        value;

      cleanupOtherWord(
        w.english,
        [value]
      );

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

  const g =
    getBundle(
      currentBundleId
    );

  const w =
    g?.words.find(
      x=>x.id===wordId
    );

  if(!w){
    return;
  }

  if(
    w.meanings.length===1
  ){

    confirmModal(
      "단어 전체 삭제",
      "마지막 뜻을 삭제하면 단어 전체가 삭제됩니다.",
      ()=>{
        deleteWord(wordId);
      }
    );

    return;
  }

  confirmModal(
    "뜻 삭제",
    "이 뜻을 삭제하시겠습니까?",
    ()=>{

      w.meanings =
        w.meanings.filter(
          m=>m.id!==meaningId
        );

      autoSave();

      renderBundlePage();

    }
  );

}

function deleteWord(wordId){

  const g =
    getBundle(
      currentBundleId
    );

  const w =
    g?.words.find(
      x=>x.id===wordId
    );

  if(!w){
    return;
  }

  confirmModal(
    "단어 삭제",
    `'${w.english}' 단어 전체를 삭제하시겠습니까?`,
    ()=>{

      g.words =
        g.words.filter(
          x=>x.id!==wordId
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
  action
){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  const ids =
    [...selectedWordIds];

  if(!ids.length){
    return;
  }

  if(action==="delete"){

    confirmModal(
      "선택 단어 삭제",
      `선택한 ${ids.length}개의 단어를 삭제하시겠습니까?`,
      ()=>{

        g.words =
          g.words.filter(
            w =>
              !selectedWordIds.has(
                w.id
              )
          );

        selectedWordIds.clear();

        autoSave();

        renderBundlePage();

      }
    );

    return;

  }

  for(
    const w
    of g.words
  ){

    if(
      !selectedWordIds.has(
        w.id
      )
    ){
      continue;
    }

    w.important =
      action === "on";

  }

  autoSave();

  renderBundlePage();

}

function openMoveCandidateInfo(){

  /*

    폴더 이동은 별도의 "이동" 버튼을 사용하지 않습니다.
    묶음 간 이동은 드래그 방식으로만 처리합니다.

  */

}

function startBundleTest(){

  const g =
    getBundle(
      currentBundleId
    );

  if(!g){
    return;
  }

  const invalid =
    g.words.find(
      w=>!isValidWord(w)
    );

  if(invalid){

    toast(
      "⚠️ 비어 있는 영어 또는 뜻이 있어 테스트를 시작할 수 없습니다."
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

  if(!g.words.length){

    toast(
      "⚠️ 이 묶음에는 아직 단어가 없습니다."
    );

    return;
  }

  let candidates =
    [...g.words];

  if(
    $("#importantOnly").checked
  ){

    candidates =
      candidates.filter(
        w=>w.important
      );

  }

  if(
    $("#wrongOnly").checked
  ){

    candidates =
      candidates.filter(
        w =>
          (
            w.stats?.wrong ||
            0
          ) > 0
      );

  }

  if(!candidates.length){

    toast(
      "⚠️ 선택한 조건에 해당하는 단어가 없습니다."
    );

    return;
  }

  const selected =
    $("#countSelect")
      .value;

  if(
    selected!=="all" &&
    Number(selected) >
      candidates.length
  ){

    confirmModal(
      "문제 수 확인",
      `현재 선택된 단어는 ${candidates.length}개입니다. ${candidates.length}문제로 테스트하시겠습니까?`,
      ()=>{

        beginTest({
          source:"bundle",
          groupIds:[g.id],
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
    groupIds:[g.id],
    candidates,
    count:selected,
    direction:
      $("#directionSelect")
        .value,
    quickType:null
  });

}

function getRecentWrongWords(){

  const limit =
    Date.now() -
    7 * 24 * 60 * 60 * 1000;

  return wordRefs()
    .filter(
      ({word}) =>
        word.stats?.lastWrong &&
        new Date(
          word.stats.lastWrong
        ).getTime() >= limit
    );

}

function getQuickCandidates(
  type
){

  const refs =
    wordRefs();

  if(type==="all"){

    return refs.map(
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

  if(type==="important"){

    return refs
      .filter(
        ({word}) =>
          word.important
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

  if(type==="difficult"){

    return refs
      .filter(
        ({word}) =>
          errorRate(word)>5
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

  if(type==="wrong"){

    return refs
      .filter(
        ({word}) =>
          (word.stats?.wrong || 0)>0
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

  if(type==="recentWrong"){

    return getRecentWrongWords()
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

  return [];

}

function randomDirection(
  mode
){

  if(mode!=="mixed"){
    return mode;
  }

  return Math.random() < .5
    ? "en-ko"
    : "ko-en";

}

function mergeQuickCandidates(
  candidates
){

  const map =
    new Map();

  for(
    const item
    of candidates
  ){

    const key =
      norm(item.word.english);

    if(!map.has(key)){

      const word =
        clone(
          item.word
        );

      word.meanings = [];

      map.set(
        key,
        {
          word,
          refs:[]
        }
      );

    }

    const target =
      map.get(key);

    for(
      const meaning
      of item.word.meanings
    ){

      if(
        !target.word.meanings.some(
          m =>
            norm(m.text) ===
            norm(meaning.text)
        )
      ){

        target.word.meanings.push(
          clone(meaning)
        );

      }

    }

    target.refs.push(
      ...item.refs
    );

  }

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
    source==="quick"
  ){

    pool =
      mergeQuickCandidates(
        candidates
      );

  }else{

    pool =
      candidates.map(
        word=>({
          word:clone(word),
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
      ()=>Math.random()-.5
    );

  if(
    count!=="all"
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
        id:uid("q"),
        word:item.word,
        refs:item.refs,
        direction:
          randomDirection(
            direction
          )
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
    groupIds,
    quickType,
    questions,
    index:0,
    correct:0,
    wrong:0,
    wrongItems:[],
    answered:false,
    startAt:nowISO(),
    selectedDirection:direction
  };

  showPageSilent(
    "testPage"
  );

  renderTest();

}

function expectedAnswers(q){

  return q.direction==="en-ko"
    ? meaningTexts(q.word)
    : [
        q.word.english
      ];

}

function validEnglish(
  input,
  expected
){

  const value =
    String(input ?? "")
      .trim();

  if(!value){
    return false;
  }

  if(
    expected.includes(" ")
  ){

    if(
      /\s{2,}/.test(value)
    ){
      return false;
    }

  }else{

    if(
      /\s/.test(value)
    ){
      return false;
    }

  }

  const lower =
    expected.toLocaleLowerCase(
      "en-US"
    );

  const firstUpper =
    lower.charAt(0)
      .toUpperCase() +
    lower.slice(1);

  return (
    value === expected ||
    value === lower ||
    value === expected.toUpperCase() ||
    value === firstUpper
  );

}

function answerCorrect(
  q,
  input
){

  const value =
    String(input ?? "")
      .trim();

  if(
    q.direction==="en-ko"
  ){

    return expectedAnswers(q)
      .some(
        answer =>
          value === answer
      );

  }

  return validEnglish(
    value,
    q.word.english
  );

}

function updateStatsForQuestion(
  q,
  correct
){

  const seen =
    new Set();

  for(
    const ref
    of q.refs || []
  ){

    const key =
      `${ref.groupId}:${ref.wordId}`;

    if(seen.has(key)){
      continue;
    }

    seen.add(key);

    const w =
      getBundle(
        ref.groupId
      )
      ?.words.find(
        x=>x.id===ref.wordId
      );

    if(!w){
      continue;
    }

    ensureStats(w);

    w.stats.attempts++;

    if(!correct){

      w.stats.wrong++;

      w.stats.lastWrong =
        nowISO();

    }

  }

  autoSave();

}

function renderTest(){

  const t =
    testSession;

  if(!t){
    return;
  }

  const q =
    t.questions[t.index];

  if(!q){
    return;
  }

  $("#progressText")
    .textContent =
      `${t.index+1} / ${t.questions.length}`;

  $("#progressBar")
    .style.width =
      `${(
        t.index /
        t.questions.length
      ) * 100}%`;

  $("#questionDirection")
    .textContent =
      q.direction==="en-ko"
        ? "영어 → 뜻"
        : "뜻 → 영어";

  $("#questionText")
    .textContent =
      q.direction==="en-ko"
        ? q.word.english
        : meaningTexts(
            q.word
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

  testSession.answered=false;

  renderTestBreadcrumb();

  setTimeout(
    ()=>{
      $("#answerInput")
        .focus();
    },
    50
  );

}

function renderTestBreadcrumb(){

  let html=`
    <button data-test-home>
      🏠 홈
    </button>
    <span>›</span>
  `;

  if(
    testSession.source==="bundle"
  ){

    html += `
      <button
        data-test-source
      >
        📚 ${escapeHTML(
          groupName(
            testSession.groupIds[0]
          )
        )}
      </button>
      <span>›</span>
    `;

  }else{

    html += `
      <button
        data-test-quick
      >
        ⚡ 빠른 테스트
      </button>
      <span>›</span>
    `;

  }

  html += `
    <span>📝 테스트</span>
  `;

  $("#testBreadcrumbs")
    .innerHTML=html;

  $("[data-test-home]")
    ?.addEventListener(
      "click",
      ()=>{
        leaveTest(
          ()=>{
            testSession=null;
            showPage("homePage");
          }
        );
      }
    );

  $("[data-test-source]")
    ?.addEventListener(
      "click",
      ()=>{
        leaveTest(
          ()=>{
            const id =
              testSession.groupIds[0];

            testSession=null;

            openGroup(id);
          }
        );
      }
    );

  $("[data-test-quick]")
    ?.addEventListener(
      "click",
      ()=>{
        leaveTest(
          ()=>{
            testSession=null;
            openQuickTest();
          }
        );
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

  const q =
    testSession.questions[
      testSession.index
    ];

  const input =
    $("#answerInput").value;

  const correct =
    answerCorrect(
      q,
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
      q
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
            expectedAnswers(q)
              .join(" / ")
          )}
        `;

  }

  updateStatsForQuestion(
    q,
    correct
  );

  const last =
    testSession.index ===
    testSession.questions.length-1;

  if(last){

    $("#finishTestBtn")
      .classList.remove(
        "hidden"
      );

  }else{

    $("#nextQuestionBtn")
      .classList.remove(
        "hidden"
      );

    if(
      draftSettings.autoNext
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
    testSession.questions.length-1
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

  const t =
    testSession;

  const record={
    id:uid("history"),
    startedAt:t.startAt,
    endedAt:nowISO(),
    source:t.source,
    quickType:t.quickType,
    groupIds:[
      ...t.groupIds
    ],
    questionCount:
      t.questions.length,
    correct:t.correct,
    wrong:t.wrong,
    accuracy:
      t.questions.length
        ? t.correct /
          t.questions.length
        : 0,

    questions:
      t.questions.map(
        q=>({
          english:q.word.english,
          direction:q.direction,
          groupIds:
            [
              ...new Set(
                (q.refs || [])
                  .map(
                    ref =>
                      ref.groupId
                  )
              )
            ],
          correct:
            !t.wrongItems.some(
              wrong =>
                wrong.id === q.id
            )
        })
      )
  };

  state.history.push(record);

  autoSave();

  showResult();

}

function showResult(){

  const t =
    testSession;

  if(!t){
    return;
  }

  const total =
    t.questions.length;

  const accuracy =
    total
      ? Math.round(
          t.correct /
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
      `${total}문제 · 정답 ${t.correct} · 오답 ${t.wrong}`;

  $("#wrongResultList")
    .innerHTML =
      t.wrongItems.length
        ? t.wrongItems.map(
            q=>`
              <div class="word-card">

                <b>
                  ${escapeHTML(
                    q.word.english
                  )}
                </b>

                <div class="muted">
                  정답:
                  ${escapeHTML(
                    expectedAnswers(q)
                      .join(" / ")
                  )}
                </div>

              </div>
            `
          ).join("")
        : `
          <div class="empty">
            🎉 틀린 단어가 없습니다.
          </div>
        `;

  $("#retryWrongBtn")
    .classList.toggle(
      "hidden",
      !t.wrongItems.length
    );

  $("#returnSourceBtn")
    .textContent =
      t.source==="bundle"
        ? "📚 단어장으로 돌아가기"
        : "⚡ 빠른 테스트로 돌아가기";

  $("#returnSourceBtn")
    .onclick =
      ()=>{
        if(
          t.source==="bundle"
        ){

          const id =
            t.groupIds[0];

          testSession=null;

          openGroup(id);

        }else{

          testSession=null;

          openQuickTest();

        }
      };

  $("#resultHomeBtn")
    .onclick =
      ()=>{
        testSession=null;
        showPage("homePage");
      };

}

function retryWrong(){

  if(
    !testSession ||
    !testSession.wrongItems.length
  ){
    return;
  }

  const wrong =
    testSession.wrongItems.map(
      q=>({
        word:clone(q.word),
        refs:clone(q.refs || [])
      })
    );

  const source =
    testSession.source;

  const groups =
    clone(
      testSession.groupIds
    );

  testSession=null;

  beginTest({
    source,
    groupIds:groups,
    candidates:
      wrong.map(
        x=>x.word
      ),
    count:"all",
    direction:"mixed",
    quickType:null
  });

}

function openQuickTest(){

  openModal(
    "빠른 테스트",
    "",
    `
      <label class="modal-form-label">

        <span>테스트 유형</span>

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

        <span>문제 방향</span>

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

        <span>문제 수</span>

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
        $("#quickType").value;

      const direction =
        $("#quickDirection")
          .value;

      const count =
        $("#quickCount").value;

      const candidates =
        getQuickCandidates(type);

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
          "⚠️ 비어 있는 영어 또는 뜻이 있는 단어가 있어 테스트할 수 없습니다."
        );

        testSession=null;

        openGroup(
          invalid.groupId,
          invalid.word.id
        );

        return false;
      }

      if(
        count!=="all" &&
        Number(count) >
          candidates.length
      ){

        confirmModal(
          "문제 수 확인",
          `현재 선택된 단어는 ${candidates.length}개입니다. ${candidates.length}문제로 테스트하시겠습니까?`,
          ()=>{
            beginTest({
              source:"quick",
              groupIds:[
                ...new Set(
                  candidates.map(
                    x=>x.groupId
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
              x=>x.groupId
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

}

function historyDateKey(
  iso
){

  const d =
    new Date(iso);

  return {
    year:d.getFullYear(),
    month:d.getMonth()+1,
    day:d.getDate()
  };

}

function sameDay(
  a,
  b
){

  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );

}

function sameMonth(
  a,
  b
){

  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth()
  );

}

function renderStats(){

  const period =
    renderStats.period ||
    "all";

  $$(".period-btn")
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.period ===
            period
        )
    );

  const records =
    filteredHistory(
      period
    );

  const questions =
    records.reduce(
      (a,h)=>
        a+(h.questionCount||0),
      0
    );

  const correct =
    records.reduce(
      (a,h)=>
        a+(h.correct||0),
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
              correct/
              questions*
              100
            )}%`
          : "-"
      )

    ].join("");

  renderBundleStats(
    records
  );

  renderHistory(
    records
  );

}

renderStats.period="all";

function filteredHistory(
  period
){

  const now =
    new Date();

  return state.history.filter(
    h=>{

      const d =
        new Date(
          h.startedAt
        );

      if(period==="all"){
        return true;
      }

      if(period==="today"){
        return sameDay(
          d,
          now
        );
      }

      if(period==="week"){

        const limit =
          new Date(now);

        limit.setDate(
          limit.getDate()-6
        );

        limit.setHours(
          0,0,0,0
        );

        return d >= limit;

      }

      if(period==="month"){

        return sameMonth(
          d,
          now
        );

      }

      return true;

    }
  );

}

function renderBundleStats(
  records
){

  const map =
    new Map();

  for(
    const h
    of records
  ){

    for(
      const q
      of h.questions
    ){

      const groups =
        q.groupIds?.length
          ? q.groupIds
          : h.groupIds;

      const label =
        groups?.length
          ? groups.map(
              id =>
                groupName(id)
            ).join(", ")
          : (
              h.quickType
                ? `빠른 테스트 · ${quickTypeLabel(h.quickType)}`
                : "빠른 테스트"
            );

      if(!map.has(label)){

        map.set(
          label,
          {
            total:0,
            correct:0
          }
        );

      }

      const r =
        map.get(label);

      r.total++;

      if(q.correct){
        r.correct++;
      }

    }

  }

  $("#bundleStats")
    .innerHTML =
      map.size
        ? [
            ...map.entries()
          ]
            .map(
              ([name,r])=>`
                <div class="meaning-row">

                  <b>
                    ${escapeHTML(name)}
                  </b>

                  <span class="meaning-text">
                    ${r.total}문제 ·
                    정확도
                    ${Math.round(
                      r.correct/
                      r.total*
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
    }[type] || "빠른 테스트"
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
    now.getMonth()+1;

  /*
    표시 규칙

    현재 달:
      날짜 → 시간

    현재 연도의 이전 달:
      월 → 날짜 → 시간

    이전 연도:
      연도 → 월 → 날짜 → 시간
  */

  const groups = {
    currentMonth:new Map(),
    previousMonths:new Map(),
    previousYears:new Map()
  };

  for(
    const h
    of records
  ){

    const d =
      new Date(h.startedAt);

    const y =
      d.getFullYear();

    const m =
      d.getMonth()+1;

    const day =
      d.getDate();

    if(
      y===currentYear &&
      m===currentMonth
    ){

      const key=
        `${y}-${m}-${day}`;

      if(
        !groups.currentMonth.has(key)
      ){
        groups.currentMonth.set(
          key,
          {
            year:y,
            month:m,
            day,
            records:[]
          }
        );
      }

      groups
        .currentMonth
        .get(key)
        .records
        .push(h);

      continue;

    }

    if(y===currentYear){

      const key =
        `${y}-${m}`;

      if(
        !groups.previousMonths.has(key)
      ){

        groups.previousMonths.set(
          key,
          {
            year:y,
            month:m,
            days:new Map()
          }
        );

      }

      const monthGroup =
        groups.previousMonths
          .get(key);

      const dayKey =
        `${y}-${m}-${day}`;

      if(
        !monthGroup.days.has(dayKey)
      ){

        monthGroup.days.set(
          dayKey,
          {
            year:y,
            month:m,
            day,
            records:[]
          }
        );

      }

      monthGroup.days
        .get(dayKey)
        .records
        .push(h);

      continue;

    }

    if(
      !groups.previousYears.has(y)
    ){

      groups.previousYears.set(
        y,
        {
          year:y,
          months:new Map()
        }
      );

    }

    const yearGroup =
      groups.previousYears
        .get(y);

    const monthKey =
      `${y}-${m}`;

    if(
      !yearGroup.months.has(
        monthKey
      )
    ){

      yearGroup.months.set(
        monthKey,
        {
          year:y,
          month:m,
          days:new Map()
        }
      );

    }

    const monthGroup =
      yearGroup.months.get(
        monthKey
      );

    const dayKey =
      `${y}-${m}-${day}`;

    if(
      !monthGroup.days.has(dayKey)
    ){

      monthGroup.days.set(
        dayKey,
        {
          year:y,
          month:m,
          day,
          records:[]
        }
      );

    }

    monthGroup.days
      .get(dayKey)
      .records
      .push(h);

  }

  let html="";

  const currentDays =
    [
      ...groups.currentMonth.values()
    ]
      .sort(
        (a,b)=>
          new Date(
            b.year,
            b.month-1,
            b.day
          ) -
          new Date(
            a.year,
            a.month-1,
            a.day
          )
      );

  for(
    const day
    of currentDays
  ){

    html +=
      renderHistoryDay(
        `${day.month}월 ${day.day}일`,
        day.records,
        "history-day"
      );

  }

  const currentPreviousMonths =
    [
      ...groups.previousMonths.values()
    ]
      .sort(
        (a,b)=>
          new Date(
            b.year,
            b.month-1
          ) -
          new Date(
            a.year,
            a.month-1
          )
      );

  for(
    const month
    of currentPreviousMonths
  ){

    html += `
      <div class="history-month">

        <button
          data-history-toggle
        >
          <b>
            ${month.month}월
          </b>

          <span>▾</span>
        </button>

        <div>
          ${
            [
              ...month.days.values()
            ]
              .sort(
                (a,b)=>
                  b.day-a.day
              )
              .map(
                day =>
                  renderHistoryDay(
                    `${day.day}일`,
                    day.records,
                    "history-day"
                  )
              )
              .join("")
          }
        </div>

      </div>
    `;

  }

  const previousYears =
    [
      ...groups.previousYears.values()
    ]
      .sort(
        (a,b)=>
          b.year-a.year
      );

  for(
    const year
    of previousYears
  ){

    html += `
      <div class="history-year">

        <button
          data-history-toggle
        >
          <b>
            ${year.year}년
          </b>

          <span>▾</span>
        </button>

        <div>
          ${
            [
              ...year.months.values()
            ]
              .sort(
                (a,b)=>
                  b.month-a.month
              )
              .map(
                month=>`
                  <div class="history-month">

                    <button
                      data-history-toggle
                    >
                      <b>
                        ${month.month}월
                      </b>

                      <span>▾</span>
                    </button>

                    <div>
                      ${
                        [
                          ...month.days.values()
                        ]
                          .sort(
                            (a,b)=>
                              b.day-a.day
                          )
                          .map(
                            day =>
                              renderHistoryDay(
                                `${day.day}일`,
                                day.records,
                                "history-day"
                              )
                          )
                          .join("")
                      }
                    </div>

                  </div>
                `
              )
              .join("")
          }
        </div>

      </div>
    `;

  }

  $("#historyList")
    .innerHTML = html;

  wireHistoryToggles();

}

function renderHistoryDay(
  label,
  records,
  className
){

  const sorted =
    [...records].sort(
      (a,b)=>
        b.startedAt.localeCompare(
          a.startedAt
        )
    );

  return `
    <div class="${className}">

      <button
        data-history-toggle
      >
        <b>
          ${escapeHTML(label)}
        </b>

        <span>▾</span>
      </button>

      <div>
        ${
          sorted.map(
            h=>`
              <div class="history-time">

                <button
                  data-history-record="${h.id}"
                >
                  <span>
                    ${fmtTime(h.startedAt)}
                  </span>

                  <span>
                    ${Math.round(
                      h.accuracy*100
                    )}%
                  </span>
                </button>

                <div
                  id="history-detail-${h.id}"
                  class="history-detail hidden"
                >
                  ${historyDetail(h)}
                </div>

              </div>
            `
          ).join("")
        }
      </div>

    </div>
  `;

}

function historyDetail(h){

  const source =
    h.source==="bundle"
      ? h.groupIds
          .map(groupName)
          .join(", ")
      : `빠른 테스트 · ${
          quickTypeLabel(
            h.quickType
          )
        }`;

  return `
    <b>${escapeHTML(source)}</b>

    <br>

    문제 수:
    ${h.questionCount}

    <br>

    정답:
    ${h.correct}

    ·

    오답:
    ${h.wrong}

    <br>

    정확도:
    ${Math.round(
      h.accuracy*100
    )}%

  `;

}

function wireHistoryToggles(){

  $$("[data-history-toggle]")
    .forEach(
      button=>{
        button.onclick=()=>{

          const content =
            button.nextElementSibling;

          if(!content){
            return;
          }

          content.classList.toggle(
            "hidden"
          );

          const arrow =
            button.querySelector(
              "span"
            );

          if(arrow){

            arrow.textContent =
              content.classList.contains(
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
        button.onclick=()=>{

          const detail =
            $("#history-detail-" +
              button.dataset.historyRecord);

          detail?.classList.toggle(
            "hidden"
          );

        };
      }
    );

}

function renderSettings(){

  $("#autoNextToggle")
    .checked =
      draftSettings.autoNext;

  $("#darkModeToggle")
    .checked =
      draftSettings.darkMode;

  const changed =
    hasUnsavedSettings();

  $("#saveSettingsBtn")
    .classList.toggle(
      "hidden",
      !changed
    );

  $("#cancelSettingsBtn")
    .classList.toggle(
      "hidden",
      !changed
    );

  renderDataStatus();

  renderGuide();

}

function renderDataStatus(){

  const bytes =
    stateSizeBytes();

  const mb =
    (
      bytes /
      1024 /
      1024
    ).toFixed(2);

  const pct =
    Math.min(
      100,
      bytes /
      STORAGE_SOFT_LIMIT *
      100
    );

  $("#dataUsage")
    .innerHTML = `
      <div>
        묶음:
        ${allBundles().length}개
        · 폴더:
        ${getFolders().length}개
        · 단어:
        ${wordRefs().length}개
        · 학습 기록:
        ${state.history.length}개
      </div>

      <div class="storage-bar">
        <div
          style="width:${pct}%"
        ></div>
      </div>

      <div class="muted">
        단어장 데이터 크기:
        ${mb}MB
      </div>
    `;

  $("#lastChanged")
    .innerHTML = `
      <p class="muted">
        마지막 변경:
        ${fmtDateTime(
          state.updatedAt
        )}
      </p>
    `;

}

function renderGuide(){

  const versions =
    Object.entries(
      CHANGELOG
    );

  $("#guideContent")
    .innerHTML = `

      <div class="guide-version">
        단어 암기장 v${APP_VERSION}
      </div>

      <p class="muted">
        현재 지원 기능과 각 버전의 변경 내용을 확인할 수 있습니다.
      </p>

      ${
        versions.map(
          ([version,data],index)=>`
            <div class="guide-change">

              <button
                data-guide-version="${version}"
              >
                <b>
                  v${version}
                </b>

                <span>
                  ${index===0 ? "▾" : "▸"}
                </span>
              </button>

              <div
                class="guide-body ${
                  index===0
                    ? ""
                    : "hidden"
                }"
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
                  현재 지원
                </b>

                <p>
                  묶음 및 폴더 관리,
                  단어 관리,
                  테스트,
                  통계,
                  자동 저장,
                  JSON 저장/불러오기,
                  다크 모드,
                  PWA 설치
                </p>

              </div>

            </div>
          `
        ).join("")
      }

    `;

  $$("[data-guide-version]")
    .forEach(
      button=>{
        button.onclick=()=>{

          const body =
            button
              .nextElementSibling;

          body.classList.toggle(
            "hidden"
          );

          const span =
            button.querySelector(
              "span"
            );

          span.textContent =
            body.classList.contains(
              "hidden"
            )
              ? "▸"
              : "▾";

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

  savedSettings =
    {...draftSettings};

  if(
    persistSettings()
  ){

    applyTheme();

    $("#settingsMessage")
      .innerHTML =
        `
          <div>
            ✅ 변경된 설정이 저장되었습니다.
          </div>
        `;

    renderSettings();

  }

}

function cancelSettings(){

  draftSettings =
    {...savedSettings};

  applyTheme();

  $("#settingsMessage")
    .innerHTML =
      `
        <div>
          변경사항을 취소했습니다.
        </div>
      `;

  renderSettings();

}

function resetSettings(){

  confirmModal(
    "설정 전체 초기화",
    "단어, 묶음, 통계, 학습 기록은 유지되고 설정만 기본값으로 돌아갑니다.",
    ()=>{

      savedSettings =
        initialSettings();

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

  confirmModal(
    "학습 기록 초기화",
    "테스트 기록과 단어별 오답 기록을 모두 초기화합니다.",
    ()=>{

      for(
        const {word}
        of wordRefs()
      ){

        word.stats={
          attempts:0,
          wrong:0,
          lastWrong:null
        };

      }

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

  confirmModal(
    "모든 데이터 삭제",
    "모든 묶음, 단어, 통계, 학습 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    ()=>{

      state =
        initialData();

      selectedWordIds.clear();

      currentBundleId=null;

      autoSave();

      navigate(
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

  const base = {
    format:"vocab-app-backup",
    version:2,
    appVersion:APP_VERSION,
    savedAt:nowISO(),
    data:clone(state),
    settings:clone(savedSettings)
  };

  const hash =
    await sha256(
      JSON.stringify(base)
    );

  const output = {
    ...base,
    integrity:{
      algorithm:"SHA-256",
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
        type:"application/json"
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

  const d =
    new Date();

  const baseName =
    `단어장_${d.getFullYear()}-${
      String(
        d.getMonth()+1
      ).padStart(2,"0")
    }-${
      String(
        d.getDate()
      ).padStart(2,"0")
    }_${
      String(
        d.getHours()
      ).padStart(2,"0")
    }${
      String(
        d.getMinutes()
      ).padStart(2,"0")
    }${
      String(
        d.getSeconds()
      ).padStart(2,"0")
    }`;

  lastExportName =
    `${baseName}.json`;

  const link =
    $("#downloadLink");

  link.href =
    downloadUrl;

  link.download =
    lastExportName;

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
              lastExportName
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

    const obj =
      JSON.parse(text);

    if(
      obj?.format !==
        "vocab-app-backup" ||
      !obj?.data ||
      !obj?.integrity?.hash
    ){

      throw new Error(
        "FORMAT"
      );

    }

    const base = {

      format:obj.format,

      version:obj.version,

      appVersion:obj.appVersion,

      savedAt:obj.savedAt,

      data:obj.data,

      settings:
        obj.settings ||
        initialSettings()

    };

    const calculated =
      await sha256(
        JSON.stringify(base)
      );

    if(
      calculated !==
      obj.integrity.hash
    ){

      throw new Error(
        "CHANGED"
      );

    }

    if(
      !Array.isArray(
        obj.data.groups
      ) ||
      !Array.isArray(
        obj.data.history
      )
    ){

      throw new Error(
        "DATA"
      );

    }

    confirmModal(
      "불러오기 확인",
      "현재 단어장 데이터를 불러온 파일의 데이터로 교체할까요?",
      ()=>{

        const oldState =
          state;

        const oldSettings =
          savedSettings;

        state =
          obj.data;

        migrateState(
          state
        );

        savedSettings =
          {
            ...initialSettings(),
            ...(obj.settings || {})
          };

        draftSettings =
          {...savedSettings};

        if(
          !persistState()
        ){

          state =
            oldState;

          savedSettings =
            oldSettings;

          draftSettings =
            {...oldSettings};

          return;

        }

        persistSettings();

        applyTheme();

        currentBundleId=null;

        renderHome();

        toast(
          "✅ 불러오기가 완료되었습니다."
        );

      }
    );

  }catch(error){

    const message =
      error.message ===
        "CHANGED"
        ? "저장된 파일의 내용이 변경되었거나 손상되었습니다."
        : error.message ===
          "FORMAT"
          ? "올바른 단어장 저장 파일이 아닙니다."
          : error.message ===
            "DATA"
            ? "파일의 데이터 구조가 올바르지 않습니다."
            : "파일을 읽을 수 없습니다.";

    $("#restoreMessage")
      .innerHTML =
        `
          <div class="incorrect">
            ❌ ${escapeHTML(message)}
          </div>
        `;

  }

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

function installApp(){

  if(!pendingInstallPrompt){
    return;
  }

  pendingInstallPrompt
    .prompt();

  pendingInstallPrompt
    .userChoice
    .finally(
      ()=>{
        pendingInstallPrompt=null;
        renderGuide();
      }
    );

}

function handleDarkMode(){

  draftSettings.darkMode =
    !draftSettings.darkMode;

  applyDraftTheme();

  renderSettings();

  $("#settingsMessage")
    .innerHTML =
      `
        <div>
          설정이 변경되었습니다.
          <br>
          <b>
            변경 내용을 저장하시겠습니까?
          </b>
        </div>
      `;

}

function updateSettingsDraft(){

  draftSettings.autoNext =
    $("#autoNextToggle")
      .checked;

  draftSettings.darkMode =
    $("#darkModeToggle")
      .checked;

  applyDraftTheme();

  $("#settingsMessage")
    .innerHTML =
      `
        <div>
          설정이 변경되었습니다.
          <br>
          <b>
            변경 내용을 저장하시겠습니까?
          </b>
        </div>
      `;

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
      openQuickTest;

  $("#bundleSort")
    .onchange =
      ()=>{
        bundleSort =
          $("#bundleSort")
            .value;

        renderBundles();
      };

  $("#globalSearch")
    .oninput =
      ()=>{
        renderSearchResults();
        renderBundles();
      };

  $("#backHomeBtn")
    .onclick =
      ()=>{
        navigate(
          "homePage"
        );
      };

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

        renderWords();
      };

  $("#importantFilterBtn")
    .onclick =
      ()=>{
        importantFilter =
          !importantFilter;

        $("#importantFilterBtn")
          .textContent =
            importantFilter
              ? "⭐ 전체 보기"
              : "⭐ 중요 단어만";

        wordVisibleLimit =
          WORD_CHUNK;

        renderWords();
      };

  $("#selectAllWords")
    .onchange =
      e=>{

        for(
          const w
          of wordsForCurrentView()
        ){

          if(e.target.checked){

            selectedWordIds.add(
              w.id
            );

          }else{

            selectedWordIds.delete(
              w.id
            );

          }

        }

        updateBulkActions();
        updateSelectAll();
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
      promptRenameCurrent;

  $("#importantBundleBtn")
    .onclick =
      toggleCurrentBundleImportant;

  $("#deleteBundleBtn")
    .onclick =
      deleteCurrentGroup;

  $("#folderAddOpenBtn")
    .onclick =
      openFolderAdd;

  $("#closeFolderAddBtn")
    .onclick =
      closeFolderAdd;

  $("#folderBundleSearch")
    .oninput =
      renderFolderAddCandidates;

  $("#selectAllFolderCandidates")
    .onclick =
      ()=>{
        selectAllFolderCandidates(
          true
        );
      };

  $("#clearAllFolderCandidates")
    .onclick =
      ()=>{
        selectAllFolderCandidates(
          false
        );
      };

  $("#addSelectedToFolderBtn")
    .onclick =
      addSelectedToFolder;

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
        leaveTest(
          ()=>{
            testSession=null;
            navigate(
              "homePage"
            );
          }
        );
      };

  $("#answerInput")
    .addEventListener(
      "keydown",
      e=>{

        if(
          e.key !==
          "Enter"
        ){
          return;
        }

        e.preventDefault();

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
          testSession.questions.length-1
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
      e=>{

        const file =
          e.target.files?.[0];

        if(file){
          importBackup(file);
        }

        e.target.value="";

      };

  $("#autoNextToggle")
    .onchange =
      updateSettingsDraft;

  $("#darkModeToggle")
    .onchange =
      updateSettingsDraft;

  $("#darkBtn")
    .onclick =
      handleDarkMode;

  $("#saveSettingsBtn")
    .onclick =
      saveSettings;

  $("#cancelSettingsBtn")
    .onclick =
      cancelSettings;

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
      installApp;

  $$(".nav-btn")
    .forEach(
      btn=>{
        btn.onclick =
          ()=>{
            navigate(
              btn.dataset.page
            );
          };
      }
    );

  $$(".period-btn")
    .forEach(
      btn=>{
        btn.onclick =
          ()=>{
            renderStats.period =
              btn.dataset.period;

            renderStats();
          };
      }
    );

}

function setupInfiniteWordList(){

  const observer =
    new IntersectionObserver(
      entries=>{

        if(
          !entries[0].isIntersecting ||
          currentPage !==
            "bundlePage"
        ){
          return;
        }

        const total =
          wordsForCurrentView()
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

window.addEventListener(
  "beforeinstallprompt",
  e=>{
    e.preventDefault();

    pendingInstallPrompt=e;

    renderGuide();
  }
);

window.addEventListener(
  "appinstalled",
  ()=>{
    pendingInstallPrompt=null;
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

if(
  "serviceWorker" in navigator &&
  location.protocol==="https:"
){

  navigator.serviceWorker
    .register(
      "./sw.js"
    )
    .catch(
      error=>
        console.error(
          "Service Worker 오류:",
          error
        )
    );

}

setupEvents();

setupInfiniteWordList();

applyTheme();

renderHome();

renderDataStatus();
