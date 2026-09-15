const APP_VERSION = "1.0.0";
const DB_KEY = "vocab-app-data-v1";
const SETTINGS_KEY = "vocab-app-settings-v1";
const GROUP_PAGE_SIZE = 12;
const WORD_CHUNK = 40;
const STORAGE_SOFT_LIMIT = 4 * 1024 * 1024;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = p => `${p || "id"}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const nowISO = () => new Date().toISOString();
const escapeHTML = s => String(s ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
const fmtDate = iso => new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric"}).format(new Date(iso));
const fmtTime = iso => new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const fmtDateTime = iso => `${fmtDate(iso)} ${fmtTime(iso)}`;
const normalizeSearch = s => String(s || "").toLocaleLowerCase("ko-KR").trim();
const trimOuter = s => String(s ?? "").trim();

let state = loadState();
let settingsSaved = loadSettings();
let settingsDraft = {...settingsSaved};
let currentPage = "homePage";
let currentBundleId = null;
let currentFolderId = null;
let bundlePage = 1;
let wordFilterImportant = false;
let visibleWordLimit = WORD_CHUNK;
let selectedWordIds = new Set();
let quickConfig = null;
let testSession = null;
let pendingInstallPrompt = null;
let downloadUrl = null;

function defaultState(){
  return {
    version:1,
    groups:[],
    history:[],
    updatedAt:nowISO()
  };
}

function loadState(){
  try{
    const raw=localStorage.getItem(DB_KEY);
    if(!raw) return defaultState();

    const v=JSON.parse(raw);

    return v &&
      Array.isArray(v.groups) &&
      Array.isArray(v.history)
      ? v
      : defaultState();
  }catch{
    return defaultState();
  }
}

function loadSettings(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      autoNext:!!s?.autoNext,
      darkMode:!!s?.darkMode
    };
  }catch{
    return {
      autoNext:false,
      darkMode:false
    };
  }
}

function safeClone(v){
  return JSON.parse(JSON.stringify(v));
}

function persistState(){
  const snapshot = safeClone(state);
  snapshot.updatedAt = nowISO();

  try{
    const raw = JSON.stringify(snapshot);

    if(raw.length > STORAGE_SOFT_LIMIT){
      throw new Error("STORAGE_FULL");
    }

    localStorage.setItem(DB_KEY, raw);
    state = snapshot;
    return true;
  }catch(e){
    toast("❌ 저장에 실패했습니다. 기존 데이터는 유지됩니다.");
    return false;
  }
}

function persistSettings(){
  try{
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(settingsSaved)
    );

    return true;
  }catch{
    toast("❌ 설정 저장에 실패했습니다.");
    return false;
  }
}

function autoSaveState(){
  if(!persistState()) return false;
  updateDataStatus();
  return true;
}

function getAllWordRefs(){
  const out=[];

  for(const g of state.groups){
    if(g.type !== "bundle") continue;

    for(const w of g.words || []){
      out.push({
        group:g,
        word:w
      });
    }
  }

  return out;
}

function getWordsInGroup(groupId){
  const g=state.groups.find(x=>x.id===groupId);
  return g?.words || [];
}

function getGroup(id){
  return state.groups.find(g=>g.id===id);
}

function groupDisplayName(id){
  const g=getGroup(id);
  return g?.name || "삭제된 묶음";
}

function isNameTaken(name, excludeId=null){
  return state.groups.some(
    g =>
      g.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      g.id !== excludeId
  );
}

function sortGroups(list){
  return [...list].sort(
    (a,b)=>
      (a.order??0)-(b.order??0) ||
      String(a.createdAt).localeCompare(String(b.createdAt))
  );
}

function getChildren(parentId){
  return sortGroups(
    state.groups.filter(g=>g.parentId===parentId)
  );
}

function getRoots(){
  return sortGroups(
    state.groups.filter(g=>!g.parentId)
  );
}

function wordHasMissingData(w){
  return !trimOuter(w.english) ||
    !Array.isArray(w.meanings) ||
    w.meanings.length===0 ||
    w.meanings.some(m=>!trimOuter(m.text));
}

function meaningTexts(w){
  return (w.meanings||[])
    .map(m=>trimOuter(m.text))
    .filter(Boolean);
}

function errorRate(w){
  return (w.stats?.attempts||0)>0
    ? ((w.stats?.wrong||0)/(w.stats.attempts||1))*100
    : 0;
}

function ensureWordStats(w){
  w.stats ||= {
    attempts:0,
    wrong:0,
    lastWrong:null
  };

  w.meanings ||= [];

  return w;
}

function createBundle(name,parentId=null,type="bundle"){
  name=trimOuter(name);

  if(!name){
    return toast("⚠️ 이름을 입력해주세요.");
  }

  if(isNameTaken(name)){
    return toast("⚠️ 이미 같은 이름의 묶음이 있습니다.");
  }

  if(!canAllocate(1500)){
    return toast("⚠️ 저장 공간이 부족합니다. 새로운 묶음을 생성할 수 없습니다.");
  }

  const order=getChildren(parentId).length;

  state.groups.push({
    id:uid(type),
    type,
    name,
    parentId,
    order,
    createdAt:nowISO(),
    words:[]
  });

  autoSaveState();
  renderHome();
}

function createFolderFlow(){
  openInputModal(
    "폴더 추가",
    "폴더 이름을 입력하세요",
    val=>createBundle(val,null,"folder")
  );
}

function createBundleFlow(parentId=null){
  openInputModal(
    "묶음 추가",
    parentId
      ? `상위 폴더: ${groupDisplayName(parentId)}`
      : "묶음 이름을 입력하세요",
    val=>createBundle(val,parentId,"bundle")
  );
}

function canAllocate(extra){
  try{
    const size=new Blob([JSON.stringify(state)]).size;
    return size+extra < STORAGE_SOFT_LIMIT;
  }catch{
    return false;
  }
}

function parseBulk(text){
  const parts=text
    .split("/")
    .map(trimOuter);

  if(
    !parts.length ||
    (parts.length===1 && !parts[0])
  ){
    return {
      error:"입력할 단어가 없습니다."
    };
  }

  const parsed=[];

  for(let i=0;i<parts.length;i++){
    const p=parts[i];

    if(!p){
      return {
        error:`${i+1}번째 단어가 비어 있습니다.`
      };
    }

    const idx=p.indexOf(":");

    if(idx<0){
      return {
        error:`${i+1}번째 항목에 ':'가 없습니다.`
      };
    }

    const en=trimOuter(
      p.slice(0,idx)
    );

    const means=p
      .slice(idx+1)
      .split(",")
      .map(trimOuter);

    if(!en){
      return {
        error:`${i+1}번째 단어의 영어가 비어 있습니다.`
      };
    }

    if(
      means.length===0 ||
      means.some(x=>!x)
    ){
      return {
        error:`${i+1}번째 단어의 뜻 중 비어 있는 항목이 있습니다.`
      };
    }

    parsed.push({
      english:en,
      meanings:[
        ...new Set(means)
      ].map(text=>({
        id:uid("m"),
        text
      }))
    });
  }

  return {
    parsed
  };
}

function addWordsToGroup(groupId,text){
  const g=getGroup(groupId);

  if(
    !g ||
    g.type!=="bundle"
  ){
    return;
  }

  const parsed=parseBulk(text);

  if(parsed.error){
    setMessage(
      "inputMessage",
      `❌ ${parsed.error}`,
      "error"
    );

    return;
  }

  let added=0;
  let meaningAdded=0;

  for(const item of parsed.parsed){

    const existing=g.words.find(
      w =>
        normalizeSearch(w.english) ===
        normalizeSearch(item.english)
    );

    if(existing){

      ensureWordStats(existing);

      for(const m of item.meanings){
        if(
          !existing.meanings.some(
            x =>
              normalizeSearch(x.text) ===
              normalizeSearch(m.text)
          )
        ){
          existing.meanings.push(m);
          meaningAdded++;
        }
      }

    }else{

      g.words.push({
        id:uid("w"),
        english:item.english,
        meanings:item.meanings,
        important:false,
        stats:{
          attempts:0,
          wrong:0,
          lastWrong:null
        },
        createdAt:nowISO()
      });

      added++;
    }

    cleanupOtherMeaningIfDuplicated(
      item.english,
      item.meanings.map(m=>m.text)
    );
  }

  autoSaveState();

  $("#bulkInput").value="";

  setMessage(
    "inputMessage",
    `✅ ${added}개 단어, ${meaningAdded}개 뜻이 반영되었습니다.`,
    "ok"
  );

  renderBundlePage();
}

function cleanupEmptyOther(){
  const other=state.groups.find(
    g =>
      g.type==="bundle" &&
      g.name==="기타 단어" &&
      g.parentId===null
  );

  if(
    other &&
    other.words.length===0
  ){
    state.groups=state.groups.filter(
      g=>g.id!==other.id
    );
  }
}

function cleanupOtherMeaningIfDuplicated(
  english,
  meanings
){
  const other=state.groups.find(
    g =>
      g.type==="bundle" &&
      g.name==="기타 단어" &&
      g.parentId===null
  );

  if(!other) return;

  const w=other.words.find(
    x =>
      normalizeSearch(x.english) ===
      normalizeSearch(english)
  );

  if(!w) return;

  w.meanings=w.meanings.filter(
    m =>
      !meanings.some(
        t =>
          normalizeSearch(t) ===
          normalizeSearch(m.text)
      )
  );

  if(w.meanings.length===0){
    other.words=other.words.filter(
      x=>x.id!==w.id
    );
  }

  if(other.words.length===0){
    state.groups=state.groups.filter(
      x=>x.id!==other.id
    );
  }
}

function addStandaloneWord(){
  const form=document.createElement("div");

  form.innerHTML=`
    <label>
      영어
      <input id="mEnglish" autocomplete="off">
    </label>

    <label>
      뜻
      <input
        id="mMeaning"
        autocomplete="off"
        placeholder="뜻은 , 로 여러 개 입력"
      >
    </label>
  `;

  openCustomModal(
    "단어 및 뜻 추가",
    form,
    ()=>{
      const en=trimOuter(
        $("#mEnglish").value
      );

      const ms=$("#mMeaning")
        .value
        .split(",")
        .map(trimOuter);

      if(!en){
        toast("⚠️ 영어 단어를 입력해주세요.");
        return false;
      }

      if(
        ms.length===0 ||
        ms.some(x=>!x)
      ){
        toast("⚠️ 뜻을 빠짐없이 입력해주세요.");
        return false;
      }

      let other=state.groups.find(
        g =>
          g.type==="bundle" &&
          g.name==="기타 단어" &&
          g.parentId===null
      );

      if(!other){
        other={
          id:uid("bundle"),
          type:"bundle",
          name:"기타 단어",
          parentId:null,
          createdAt:nowISO(),
          words:[]
        };

        state.groups.push(other);
      }

      let w=other.words.find(
        x =>
          normalizeSearch(x.english) ===
          normalizeSearch(en)
      );

      if(!w){
        w={
          id:uid("w"),
          english:en,
          meanings:[],
          important:false,
          stats:{
            attempts:0,
            wrong:0,
            lastWrong:null
          },
          createdAt:nowISO()
        };

        other.words.push(w);
      }

      for(const text of ms){
        if(
          !w.meanings.some(
            x =>
              normalizeSearch(x.text) ===
              normalizeSearch(text)
          )
        ){
          w.meanings.push({
            id:uid("m"),
            text
          });
        }
      }

      autoSaveState();
      renderHome();
      toast("✅ 기타 단어에 추가되었습니다.");

      return true;
    },
    true
  );
}

function setMessage(
  id,
  text,
  type="info"
){
  const el=$("#"+id);

  if(!el) return;

  el.innerHTML=
    `<div class="${type==="error"?"danger-msg":""}">
      ${escapeHTML(text)}
    </div>`;
}

function renderHome(){
  currentPage="homePage";

  renderStatsHome();
  renderSearchResults();
  renderBundles();
  renderGuide();

  $("#globalSearch").oninput=()=>{
    renderSearchResults();
    renderBundles();
  };
}

function renderStatsHome(){
  const words=getAllWordRefs().length;
  const tests=state.history.length;

  const q=state.history.reduce(
    (a,h)=>a+h.questions.length,
    0
  );

  const correct=state.history.reduce(
    (a,h)=>a+h.correct,
    0
  );

  $("#homeStats").innerHTML=[
    statCard(
      "묶음",
      state.groups.filter(
        g=>g.type==="bundle"
      ).length
    ),
    statCard(
      "단어",
      words
    ),
    statCard(
      "테스트",
      tests
    ),
    statCard(
      "누적 정확도",
      q
        ? Math.round(correct/q*100)+"%"
        : "-"
    )
  ].join("");
}

function statCard(label,val){
  return `
    <div class="stat-card">
      <b>${escapeHTML(val)}</b>
      <span>${label}</span>
    </div>
  `;
}

function renderSearchResults(){
  const q=normalizeSearch(
    $("#globalSearch")?.value || ""
  );

  const box=$("#searchResults");

  if(!q){
    box.classList.add("hidden");
    box.innerHTML="";
    return;
  }

  box.classList.remove("hidden");

  const groups=state.groups.filter(
    g =>
      normalizeSearch(g.name)
        .includes(q)
  );

  const words=getAllWordRefs()
    .filter(
      ({word}) =>
        normalizeSearch(word.english)
          .includes(q) ||
        meaningTexts(word).some(
          m =>
            normalizeSearch(m)
              .includes(q)
        )
    );

  if(
    !groups.length &&
    !words.length
  ){
    box.innerHTML=`
      <div class="empty">
        🔎 검색 결과가 없습니다.
      </div>
    `;
    return;
  }

  let html="";

  if(groups.length){
    html+=`
      <div class="result-section">
        <h4>📚 단어 묶음</h4>

        ${groups.map(
          g=>`
            <div
              class="result-item"
              data-open-group="${g.id}"
            >
              <b>${escapeHTML(g.name)}</b>
              <div class="muted">
                ${
                  g.type==="folder"
                    ? "폴더"
                    : `${g.words.length}개 단어`
                }
              </div>
            </div>
          `
        ).join("")}

      </div>
    `;
  }

  if(words.length){
    html+=`
      <div class="result-section">
        <h4>📖 단어</h4>

        ${
          words
            .slice(0,80)
            .map(
              ({group,word})=>`
                <div
                  class="result-item"
                  data-open-word="${group.id}"
                  data-word-id="${word.id}"
                >
                  <b>${escapeHTML(word.english)}</b>

                  <div>
                    ${
                      meaningTexts(word)
                        .map(escapeHTML)
                        .join(" · ")
                    }
                  </div>

                  <div class="muted">
                    ${escapeHTML(group.name)}
                  </div>
                </div>
              `
            )
            .join("")
        }

      </div>
    `;
  }

  html+=`
    <div class="result-section">
      <h4>🔎 연관 단어 검색</h4>

      <div class="related-search-grid">
        <input
          id="similarSearch"
          placeholder="유사 단어 검색"
        >

        <input
          id="oppositeSearch"
          placeholder="반대 단어 검색"
        >

        <input
          id="shapeSearch"
          placeholder="형태가 비슷한 단어 검색"
        >
      </div>

      <div id="relatedResults"></div>
    </div>
  `;

  box.innerHTML=html;

  box
    .querySelectorAll("[data-open-group]")
    .forEach(el=>{
      el.onclick=()=>{
        openGroup(
          el.dataset.openGroup
        );
      };
    });

  box
    .querySelectorAll("[data-open-word]")
    .forEach(el=>{
      el.onclick=()=>{
        openGroup(
          el.dataset.openWord,
          el.dataset.wordId
        );
      };
    });

  [
    "similarSearch",
    "oppositeSearch",
    "shapeSearch"
  ].forEach(id=>{
    const el=$("#"+id);

    if(el){
      el.oninput=()=>{
        renderRelatedSearches();
      };
    }
  });
}

function renderRelatedSearches(){
  const terms=[
    ["similarSearch","유사"],
    ["oppositeSearch","반대"],
    ["shapeSearch","형태"]
  ]
    .map(
      ([id,label])=>({
        label,
        q:normalizeSearch(
          $("#"+id)?.value || ""
        )
      })
    )
    .filter(x=>x.q);

  const box=$("#relatedResults");

  if(!box) return;

  if(!terms.length){
    box.innerHTML="";
    return;
  }

  const all=getAllWordRefs();

  const rows=[];

  for(const t of terms){
    const matches=all
      .filter(
        ({word})=>
          normalizeSearch(word.english)
            .includes(t.q) ||
          meaningTexts(word).some(
            m =>
              normalizeSearch(m)
                .includes(t.q)
          )
      )
      .slice(0,20);

    rows.push(`
      <div class="result-section">
        <h5>${t.label} 단어</h5>

        ${
          matches.length
            ? matches.map(
                ({group,word})=>`
                  <div
                    class="result-item"
                    data-open-group="${group.id}"
                    data-word-id="${word.id}"
                  >
                    <b>${escapeHTML(word.english)}</b>

                    <div>
                      ${
                        meaningTexts(word)
                          .map(escapeHTML)
                          .join(" · ")
                      }
                    </div>
                  </div>
                `
              ).join("")
            : `
              <div class="empty">
                검색 결과가 없습니다.
              </div>
            `
        }

      </div>
    `);
  }

  box.innerHTML=rows.join("");

  box
    .querySelectorAll(".result-item")
    .forEach(el=>{
      el.onclick=()=>{
        openGroup(
          el.dataset.openGroup,
          el.dataset.wordId
        );
      };
    });
}

function renderBundles(){
  const q=normalizeSearch(
    $("#globalSearch")?.value || ""
  );

  const roots=getRoots().filter(
    g =>
      !q ||
      normalizeSearch(g.name).includes(q) ||
      g.type==="folder" ||
      getChildren(g.id).some(
        c =>
          normalizeSearch(c.name)
            .includes(q)
      )
  );

  const pageCount=Math.max(
    1,
    Math.ceil(
      roots.length / GROUP_PAGE_SIZE
    )
  );

  bundlePage=Math.min(
    bundlePage,
    pageCount
  );

  const pageItems=roots.slice(
    (bundlePage-1)*GROUP_PAGE_SIZE,
    bundlePage*GROUP_PAGE_SIZE
  );

  $("#bundlePageInfo").textContent=
    roots.length
      ? `${roots.length}개`
      : "";

  const list=$("#bundleList");

  if(!pageItems.length){

    list.innerHTML=`
      <div class="empty">
        📚 아직 묶음이 없습니다.
        <br>
        <button
          class="primary-btn"
          id="emptyAddBundle"
        >
          묶음 추가
        </button>
      </div>
    `;

    $("#emptyAddBundle")?.addEventListener(
      "click",
      ()=>createBundleFlow()
    );

  }else{

    list.innerHTML=
      pageItems
        .map(renderBundleNode)
        .join("");
  }

  enableDragHandles();
  renderBundlePagination(pageCount);
}

function renderBundleNode(g){
  const children=getChildren(g.id);
  const open=g._open!==false;

  const count=
    g.type==="bundle"
      ? g.words.length
      : children.length;

  return `
    <div
      class="bundle-wrap"
      data-group-id="${g.id}"
    >

      <div
        class="bundle-row"
        draggable="false"
      >

        <button
          class="drag-handle"
          title="드래그해서 이동"
          data-drag-handle="${g.id}"
        >
          ☷
        </button>

        ${
          g.type==="folder"
            ? `
              <button
                class="folder-toggle"
                data-toggle-folder="${g.id}"
              >
                ${open?"▾":"▸"}
              </button>
            `
            : ""
        }

        <div
          class="bundle-main"
          data-open-group="${g.id}"
        >

          <div class="bundle-name">
            ${
              g.type==="folder"
                ? "📁"
                : "📚"
            }

            ${escapeHTML(g.name)}
          </div>

          <div class="bundle-meta">
            생성일 ${fmtDateTime(g.createdAt)}
          </div>

        </div>

        <div class="bundle-count">
          ${
            g.type==="folder"
              ? `${count}개 묶음`
              : `${count}개 단어`
          }
        </div>

      </div>

      ${
        g.type==="folder" && open
          ? `
            <div class="child-list">

              ${
                children.length
                  ? children.map(renderBundleNode).join("")
                  : `
                    <div class="empty">
                      이 폴더에는 아직 묶음이 없습니다.
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

function enableDragHandles(){

  $$("[data-open-group]")
    .forEach(el=>{
      el.onclick=()=>{
        openGroup(
          el.dataset.openGroup
        );
      };
    });

  $$("[data-toggle-folder]")
    .forEach(el=>{
      el.onclick=()=>{
        const g=getGroup(
          el.dataset.toggleFolder
        );

        g._open = g._open===false;

        autoSaveState();
        renderHome();
      };
    });

  $$("[data-drag-handle]")
    .forEach(handle=>{

      const id=handle.dataset.dragHandle;

      let startY=0;
      let dragging=false;

      handle.addEventListener(
        "pointerdown",
        e=>{
          e.preventDefault();

          startY=e.clientY;
          dragging=true;

          handle.setPointerCapture?.(
            e.pointerId
          );
        }
      );

      handle.addEventListener(
        "pointermove",
        e=>{
          if(!dragging) return;

          const row=
            handle.closest(".bundle-row");

          row.style.opacity=.5;

          const wrap=
            row.closest(".bundle-wrap");

          const parent=
            wrap.parentElement;

          const siblings=[
            ...parent.querySelectorAll(
              ":scope > .bundle-wrap"
            )
          ];

          let target=siblings.find(
            s =>
              s!==wrap &&
              e.clientY <
                s.getBoundingClientRect().top +
                s.getBoundingClientRect().height/2
          );

          if(target){
            parent.insertBefore(
              wrap,
              target
            );
          }else{
            parent.appendChild(wrap);
          }
        }
      );

      handle.addEventListener(
        "pointerup",
        ()=>{
          if(!dragging) return;

          dragging=false;

          const row=
            handle.closest(".bundle-row");

          row.style.opacity="";

          syncOrderFromDOM();
        }
      );

      handle.addEventListener(
        "pointercancel",
        ()=>{
          dragging=false;

          const row=
            handle.closest(".bundle-row");

          row.style.opacity="";
        }
      );
    });
}

function syncOrderFromDOM(){

  const containers=[
    document.querySelector("#bundleList"),
    ...document.querySelectorAll(
      "#bundleList .child-list"
    )
  ];

  for(const parent of containers){

    const ids=[
      ...parent.children
    ]
      .map(w=>w.dataset.groupId)
      .filter(Boolean);

    if(!ids.length) continue;

    const parentWrap=
      parent.closest(".bundle-wrap");

    const parentId=
      parentWrap?.dataset.groupId || null;

    ids.forEach(
      (id,index)=>{
        const g=getGroup(id);

        if(g){
          g.parentId=parentId;
          g.order=index;
        }
      }
    );
  }

  autoSaveState();
  renderBundles();
}

function renderBundlePagination(pageCount){

  const box=$("#bundlePagination");

  if(pageCount<=1){
    box.innerHTML="";
    return;
  }

  let h="";

  for(
    let i=1;
    i<=pageCount;
    i++
  ){
    h+=`
      <button
        class="${i===bundlePage?"active":""}"
        data-page="${i}"
      >
        ${i}
      </button>
    `;
  }

  box.innerHTML=h;

  box
    .querySelectorAll("button")
    .forEach(
      b=>{
        b.onclick=()=>{
          bundlePage=+b.dataset.page;
          renderBundles();
        };
      }
    );
}

function openGroup(
  id,
  focusWordId=null
){
  const g=getGroup(id);

  if(!g) return;

  if(g.type==="folder"){
    g._open=true;

    currentFolderId=id;
    currentBundleId=null;

    renderHome();

    return;
  }

  currentBundleId=id;

  showPage("bundlePage");
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
      100
    );
  }
}

function renderBundlePage(){

  const g=getGroup(currentBundleId);

  if(!g){
    return renderHome();
  }

  $("#bundleTitle").textContent=
    g.name;

  $("#bundleInfo").textContent=
    `${g.words.length}개 단어 · 생성일 ${fmtDateTime(g.createdAt)}`;

  $("#bundleBreadcrumbs").innerHTML=
    breadcrumbHTML(g.id);

  renderWords();
}

function breadcrumbHTML(id){

  const arr=[];

  let cur=getGroup(id);

  while(cur){
    arr.unshift(cur);
    cur=getGroup(cur.parentId);
  }

  let h=`
    <button data-crumb-home="1">
      🏠 홈
    </button>
  `;

  for(const g of arr){
    h+=`
      <span>›</span>
      <button data-crumb="${g.id}">
        ${escapeHTML(g.name)}
      </button>
    `;
  }

  setTimeout(
    ()=>{
      $('[data-crumb-home]')
        ?.addEventListener(
          "click",
          renderHome
        );

      $$('[data-crumb]')
        .forEach(
          b=>{
            b.onclick=()=>{
              openGroup(
                b.dataset.crumb
              );
            };
          }
        );
    },
    0
  );

  return h;
}

function wordsForView(){

  const g=getGroup(currentBundleId);

  if(!g) return [];

  let words=[...g.words];

  const q=normalizeSearch(
    $("#wordSearch")?.value || ""
  );

  if(q){
    words=words.filter(
      w =>
        normalizeSearch(w.english)
          .includes(q) ||
        meaningTexts(w).some(
          m =>
            normalizeSearch(m)
              .includes(q)
        )
    );
  }

  if(wordFilterImportant){
    words=words.filter(
      w=>w.important
    );
  }

  const sort=$("#wordSort")?.value || "order";

  if(sort==="alpha"){
    words.sort(
      (a,b)=>
        a.english.localeCompare(
          b.english
        )
    );
  }

  if(sort==="wrong"){
    words.sort(
      (a,b)=>
        (b.stats?.wrong||0) -
        (a.stats?.wrong||0)
    );
  }

  if(sort==="recentWrong"){
    words.sort(
      (a,b)=>
        String(
          b.stats?.lastWrong||""
        ).localeCompare(
          String(
            a.stats?.lastWrong||""
          )
        )
    );
  }

  if(sort==="important"){
    words.sort(
      (a,b)=>
        (Number(b.important) -
          Number(a.important)) ||
        a.english.localeCompare(
          b.english
        )
    );
  }

  if(sort==="difficulty"){
    words.sort(
      (a,b)=>
        errorRate(b)-errorRate(a)
    );
  }

  return words;
}

function renderWords(){

  selectedWordIds=
    new Set(
      [...selectedWordIds].filter(
        id =>
          getWordsInGroup(
            currentBundleId
          ).some(
            w=>w.id===id
          )
      )
    );

  const words=wordsForView();

  $("#visibleWordCount").textContent=
    `${words.length}개`;

  $("#wordList").innerHTML="";

  visibleWordLimit=WORD_CHUNK;

  appendWordChunk(words);

  updateBulkActions();
  updateSelectAll();
}

function appendWordChunk(words){

  const slice=words.slice(
    0,
    visibleWordLimit
  );

  const box=$("#wordList");

  box.innerHTML=
    slice.length
      ? slice.map(renderWordCard).join("")
      : `
        <div class="empty">
          ${
            words.length
              ? "검색 결과가 없습니다."
              : "이 묶음에는 아직 단어가 없습니다."
          }
        </div>
      `;

  if(slice.length<words.length){

    $("#wordSentinel").innerHTML=`
      <div
        class="muted"
        style="text-align:center;padding:12px"
      >
        스크롤하면 더 불러옵니다.
      </div>
    `;

  }else{

    $("#wordSentinel").innerHTML="";
  }

  wireWordEvents();
}

function renderWordCard(w){

  ensureWordStats(w);

  const pct=errorRate(w).toFixed(1);

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
          class="mini-btn important ${w.important?"active":""}"
          data-important="${w.id}"
        >
          ${w.important?"⭐":"☆"}
        </button>

        <div class="word-en">
          ${escapeHTML(w.english)}
        </div>

        <div class="word-stats">
          오답률 ${pct}%
        </div>

        <button
          class="mini-btn"
          data-edit-word="${w.id}"
        >
          ✏️
        </button>

        <button
          class="mini-btn danger"
          data-delete-word="${w.id}"
        >
          🗑
        </button>

      </div>

      ${
        meaningTexts(w)
          .map(
            (m,i)=>{
              const mid=
                w.meanings[i].id;

              return `
                <div class="meaning-row">

                  <div class="meaning-text">
                    ${escapeHTML(m)}
                  </div>

                  <div class="meaning-actions">

                    <button
                      class="mini-btn"
                      data-edit-meaning="${w.id}"
                      data-meaning-id="${mid}"
                    >
                      ✏️
                    </button>

                    <button
                      class="mini-btn"
                      data-delete-meaning="${w.id}"
                      data-meaning-id="${mid}"
                    >
                      🗑
                    </button>

                  </div>

                </div>
              `;
            }
          )
          .join("")
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

  $$("[data-important]")
    .forEach(
      el=>{
        el.onclick=()=>{
          const w=
            getWordsInGroup(
              currentBundleId
            ).find(
              x=>
                x.id===el.dataset.important
            );

          w.important=!w.important;

          autoSaveState();
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
            currentBundleId,
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
            currentBundleId,
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
            currentBundleId,
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
            currentBundleId,
            el.dataset.addMeaning
          );
        };
      }
    );
}

function updateBulkActions(){
  const bar=$("#bulkActions");
  const n=selectedWordIds.size;

  bar.classList.toggle(
    "hidden",
    n===0
  );

  $("#selectedCount").textContent=
    `${n}개 선택`;
}

function updateSelectAll(){

  const visible=wordsForView();

  const all=
    visible.length>0 &&
    visible.every(
      w=>selectedWordIds.has(w.id)
    );

  $("#selectAllWords").checked=all;
}

async function editWord(wordId){

  const g=getGroup(currentBundleId);
  const w=g.words.find(
    x=>x.id===wordId
  );

  if(!w) return;

  const form=document.createElement("div");

  form.innerHTML=`
    <label>
      영어
      <input
        id="editEn"
        value="${escapeHTML(w.english)}"
      >
    </label>

    <label>
      뜻 하나 수정
      <br>

      <select id="editMeaningSel">

        ${
          w.meanings
            .map(
              m=>`
                <option value="${m.id}">
                  ${escapeHTML(m.text)}
                </option>
              `
            )
            .join("")
        }

      </select>

      <input
        id="editMeaningVal"
        value="${escapeHTML(w.meanings[0]?.text||"")}"
      >

    </label>
  `;

  const sel=()=>{
    const m=
      w.meanings.find(
        m =>
          m.id ===
          $("#editMeaningSel").value
      );

    $("#editMeaningVal").value=
      m?.text || "";
  };

  setTimeout(
    ()=>$("#editMeaningSel")
      ?.addEventListener(
        "change",
        sel
      ),
    0
  );

  openCustomModal(
    "단어 수정",
    form,
    ()=>{
      const en=trimOuter(
        $("#editEn").value
      );

      const val=trimOuter(
        $("#editMeaningVal").value
      );

      if(!en || !val){
        toast("⚠️ 영어와 뜻을 모두 입력해주세요.");
        return false;
      }

      if(
        g.words.some(
          x =>
            x.id!==w.id &&
            normalizeSearch(x.english) ===
            normalizeSearch(en)
        )
      ){
        toast("⚠️ 같은 묶음에 같은 단어가 있습니다.");
        return false;
      }

      w.english=en;

      const m=
        w.meanings.find(
          m =>
            m.id ===
            $("#editMeaningSel").value
        );

      if(m){
        m.text=val;
      }

      cleanupOtherMeaningIfDuplicated(
        en,
        [val]
      );

      autoSaveState();
      renderBundlePage();

      return true;
    },
    true
  );
}

function addMeaning(
  groupId,
  wordId
){
  const g=getGroup(groupId);
  const w=g.words.find(
    x=>x.id===wordId
  );

  openInputModal(
    "뜻 추가",
    "추가할 뜻",
    val=>{
      val=trimOuter(val);

      if(!val){
        toast("⚠️ 뜻을 입력해주세요.");
        return;
      }

      if(
        w.meanings.some(
          m =>
            normalizeSearch(m.text) ===
            normalizeSearch(val)
        )
      ){
        toast("⚠️ 같은 뜻이 이미 있습니다.");
        return;
      }

      w.meanings.push({
        id:uid("m"),
        text:val
      });

      cleanupOtherMeaningIfDuplicated(
        w.english,
        [val]
      );

      autoSaveState();
      renderBundlePage();
    }
  );
}

function editMeaning(
  groupId,
  wordId,
  meaningId
){
  const g=getGroup(groupId);

  const w=g.words.find(
    x=>x.id===wordId
  );

  const m=
    w.meanings.find(
      m=>m.id===meaningId
    );

  if(!m) return;

  openInputModal(
    "뜻 수정",
    "뜻을 입력하세요",
    val=>{
      val=trimOuter(val);

      if(!val){
        toast("⚠️ 뜻을 비워둘 수 없습니다.");
        return;
      }

      if(
        w.meanings.some(
          x =>
            x.id!==m.id &&
            normalizeSearch(x.text) ===
            normalizeSearch(val)
        )
      ){
        toast("⚠️ 같은 뜻이 이미 있습니다.");
        return;
      }

      m.text=val;

      cleanupOtherMeaningIfDuplicated(
        w.english,
        [val]
      );

      autoSaveState();
      renderBundlePage();
    }
  );
}

function deleteMeaning(
  groupId,
  wordId,
  meaningId
){
  const g=getGroup(groupId);
  const w=g.words.find(
    x=>x.id===wordId
  );

  if(w.meanings.length===1){
    confirmModal(
      "단어 전체 삭제",
      "마지막 뜻을 삭제하면 단어 전체가 삭제됩니다.",
      ()=>deleteWord(groupId,wordId)
    );

    return;
  }

  confirmModal(
    "뜻 삭제",
    "이 뜻을 삭제하시겠습니까?",
    ()=>{
      w.meanings=
        w.meanings.filter(
          m=>m.id!==meaningId
        );

      cleanupEmptyOther();

      autoSaveState();
      renderBundlePage();
    }
  );
}

function deleteWord(
  groupId,
  wordId
){
  const g=getGroup(groupId);

  const w=g.words.find(
    x=>x.id===wordId
  );

  if(!w) return;

  confirmModal(
    "단어 삭제",
    `'${w.english}'의 단어 전체를 삭제하시겠습니까?`,
    ()=>{
      g.words=
        g.words.filter(
          x=>x.id!==wordId
        );

      selectedWordIds.delete(
        wordId
      );

      autoSaveState();
      renderBundlePage();
    }
  );
}

function startGroupTest(){

  const g=getGroup(
    currentBundleId
  );

  if(!g) return;

  if(!validateGroup(g)) return;

  let candidates=[
    ...g.words
  ];

  if($("#importantOnly").checked){
    candidates=
      candidates.filter(
        w=>w.important
      );
  }

  if($("#wrongOnly").checked){
    candidates=
      candidates.filter(
        w=>(w.stats?.wrong||0)>0
      );
  }

  const count=
    $("#countSelect").value;

  if(
    count!=="all" &&
    Number(count)>candidates.length
  ){

    confirmModal(
      "문제 수 확인",
      `현재 선택된 단어는 ${candidates.length}개입니다. ${candidates.length}문제로 테스트하시겠습니까?`,
      ()=>{
        beginTest({
          source:"bundle",
          groupIds:[g.id],
          quickType:null,
          candidates,
          direction:$("#directionSelect").value,
          count:"all"
        });
      }
    );

  }else{

    beginTest({
      source:"bundle",
      groupIds:[g.id],
      quickType:null,
      candidates,
      direction:$("#directionSelect").value,
      count
    });
  }
}

function validateGroup(g){

  const bad=
    g.words.find(
      wordHasMissingData
    );

  if(bad){

    toast(
      "⚠️ 비어 있는 단어/뜻이 있어 테스트를 시작할 수 없습니다."
    );

    openGroup(
      g.id,
      bad.id
    );

    setTimeout(
      ()=>{
        document
          .querySelector(
            `[data-word-id="${bad.id}"]`
          )
          ?.scrollIntoView({
            behavior:"smooth",
            block:"center"
          });
      },
      100
    );

    return false;
  }

  if(!g.words.length){
    toast(
      "⚠️ 이 묶음에는 아직 단어가 없습니다."
    );

    return false;
  }

  return true;
}

function quickDialog(){

  const form=
    document.createElement("div");

  form.innerHTML=`
    <label>
      테스트 유형

      <select id="quickTypeSel">
        <option value="all">
          전체 단어
        </option>

        <option value="difficult">
          어려운 단어
        </option>

        <option value="wrong">
          자주 틀린 단어
        </option>

        <option value="recentWrong">
          최근 틀린 단어
        </option>

        <option value="important">
          ⭐ 중요 단어
        </option>
      </select>
    </label>

    <label>
      문제 방향

      <select id="quickDir">
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

    <label>
      문제 수

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
  `;

  openCustomModal(
    "빠른 테스트 설정",
    form,
    ()=>{
      const type=
        $("#quickTypeSel").value;

      const dir=
        $("#quickDir").value;

      const count=
        $("#quickCount").value;

      const candidates=
        getQuickCandidates(type);

      if(!candidates.length){
        toast(
          "⚠️ 선택한 유형에 해당하는 단어가 없습니다."
        );

        return false;
      }

      const valid=
        candidates.find(
          x=>wordHasMissingData(
            x.word
          )
        );

      if(valid){

        toast(
          "⚠️ 비어 있는 단어/뜻이 있어 테스트를 시작할 수 없습니다."
        );

        openGroup(
          valid.groupId,
          valid.word.id
        );

        return false;
      }

      const groupIds=[
        ...new Set(
          candidates.flatMap(
            x =>
              x.refs?.map(
                r=>r.groupId
              ) ||
              [x.groupId]
          )
        )
      ];

      const picked=
        candidates.map(
          x=>x.word
        );

      const refsMap=
        new Map(
          candidates.map(
            x=>[
              x.word._testKey,
              x.refs || []
            ]
          )
        );

      if(
        count!=="all" &&
        Number(count)>picked.length
      ){

        confirmModal(
          "문제 수 확인",
          `현재 선택된 단어는 ${picked.length}개입니다. ${picked.length}문제로 테스트하시겠습니까?`,
          ()=>{
            beginTest({
              source:"quick",
              groupIds,
              quickType:type,
              candidates:picked,
              refsMap,
              direction:dir,
              count:"all"
            });
          }
        );

      }else{

        beginTest({
          source:"quick",
          groupIds,
          quickType:type,
          candidates:picked,
          refsMap,
          direction:dir,
          count
        });
      }

      return true;
    },
    true
  );
}

function getQuickCandidates(type){

  const map=new Map();

  for(
    const {group,word}
    of getAllWordRefs()
  ){

    ensureWordStats(word);

    let include=false;

    if(type==="all"){
      include=true;
    }

    if(type==="difficult"){
      include=
        errorRate(word)>5;
    }

    if(type==="wrong"){
      include=
        (word.stats.wrong||0)>0;
    }

    if(type==="recentWrong"){
      include=
        !!word.stats.lastWrong;
    }

    if(type==="important"){
      include=
        !!word.important;
    }

    if(!include) continue;

    const key=
      normalizeSearch(
        word.english
      );

    if(!map.has(key)){
      map.set(
        key,
        {
          word:safeClone(word),
          refs:[]
        }
      );
    }

    map.get(key).word.meanings=
      [
        ...new Map(
          [
            ...meaningTexts(
              map.get(key).word
            ),
            ...meaningTexts(word)
          ].map(
            t=>[
              normalizeSearch(t),
              {
                id:uid("m"),
                text:t
              }
            ]
          )
        ).values()
      ];

    map.get(key).word._testKey=key;

    map.get(key).groupId ||= group.id;

    map.get(key).refs.push({
      groupId:group.id,
      wordId:word.id
    });
  }

  return [
    ...map.values()
  ].sort(
    ()=>Math.random()-0.5
  );
}

function beginTest({
  source,
  groupIds,
  quickType,
  candidates,
  direction,
  count,
  refsMap
}){

  const c=
    safeClone(candidates)
      .sort(
        ()=>Math.random()-.5
      );

  if(count!=="all"){
    c.splice(
      Number(count)
    );
  }

  if(!c.length){
    toast(
      "⚠️ 테스트할 단어가 없습니다."
    );

    return;
  }

  const questions=
    c.map(
      (word,i)=>({
        word,
        direction:
          direction==="mixed"
            ? (
                Math.random()<0.5
                  ? "en-ko"
                  : "ko-en"
              )
            : direction,
        refs:
          refsMap?.get(
            word._testKey
          ) || null,
        index:i
      })
    );

  if(source==="quick"){
    for(
      const q
      of questions
    ){
      const key=
        normalizeSearch(
          q.word.english
        );

      q.refs=
        refsMap?.get(key) ||
        null;
    }
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
    count:questions.length
  };

  showPage("testPage");
  renderTest();
}

function renderTest(){

  const t=testSession;
  const q=t.questions[t.index];

  const pct=
    (t.index/t.questions.length)*100;

  $("#progressText").textContent=
    `${t.index+1} / ${t.questions.length}`;

  $("#progressBar").style.width=
    `${pct}%`;

  $("#questionDirection").textContent=
    q.direction==="en-ko"
      ? "영어 → 뜻"
      : "뜻 → 영어";

  $("#questionText").textContent=
    q.direction==="en-ko"
      ? q.word.english
      : meaningTexts(q.word).join(" / ");

  $("#answerInput").value="";
  $("#answerResult").innerHTML="";
  $("#answerResult").className=
    "answer-result";

  $("#nextQuestionBtn")
    .classList.add("hidden");

  $("#finishTestBtn")
    .classList.add("hidden");

  $("#checkAnswerBtn")
    .classList.remove("hidden");

  $("#answerInput").disabled=false;

  testSession.answered=false;

  $("#testBreadcrumbs").innerHTML=
    testBreadcrumb();

  setTimeout(
    ()=>{
      $("#answerInput").focus();
    },
    50
  );
}

function testBreadcrumb(){

  let h=`
    <button data-test-home="1">
      🏠 홈
    </button>
  `;

  if(testSession.source==="bundle"){

    h+=`
      <span>›</span>

      <button
        data-test-group="${testSession.groupIds[0]}"
      >
        ${escapeHTML(
          groupDisplayName(
            testSession.groupIds[0]
          )
        )}
      </button>
    `;

  }else{

    h+=`
      <span>›</span>

      <button data-test-quick="1">
        ⚡ 빠른 테스트
      </button>
    `;
  }

  h+=`
    <span>›</span>
    <span>📝 테스트</span>
  `;

  setTimeout(
    ()=>{
      $("[data-test-home]")
        ?.addEventListener(
          "click",
          ()=>{
            leaveTestConfirm(
              ()=>renderHome()
            );
          }
        );

      $("[data-test-group]")
        ?.addEventListener(
          "click",
          ()=>{
            leaveTestConfirm(
              ()=>openGroup(
                testSession.groupIds[0]
              )
            );
          }
        );

      $("[data-test-quick]")
        ?.addEventListener(
          "click",
          ()=>{
            leaveTestConfirm(
              ()=>quickDialog()
            );
          }
        );
    },
    0
  );

  return h;
}

function expectedAnswers(q){
  return q.direction==="en-ko"
    ? meaningTexts(q.word)
    : [q.word.english];
}

function validEnglishAnswer(
  input,
  expected
){

  const raw=String(input??"");
  const cleaned=raw.trim();

  if(!cleaned) return false;

  if(expected.includes(" ")){

    if(/\s{2,}/.test(cleaned)){
      return false;
    }

  }else{

    if(/\s/.test(cleaned)){
      return false;
    }
  }

  const low=
    expected.toLocaleLowerCase(
      "en-US"
    );

  const inp=cleaned;

  return (
    inp===expected ||
    inp===low ||
    inp===expected.toUpperCase() ||
    inp===
      low.charAt(0).toUpperCase()+
      low.slice(1)
  );
}

function isAnswerCorrect(
  q,
  input
){

  const raw=
    String(input??"").trim();

  if(q.direction==="en-ko"){
    return expectedAnswers(q)
      .some(
        a=>raw===a
      );
  }

  return validEnglishAnswer(
    raw,
    q.word.english
  );
}

function checkAnswer(){

  if(
    !testSession ||
    testSession.answered
  ) return;

  const q=
    testSession.questions[
      testSession.index
    ];

  const input=
    $("#answerInput").value;

  const correct=
    isAnswerCorrect(
      q,
      input
    );

  testSession.answered=true;

  $("#answerInput").disabled=true;

  $("#checkAnswerBtn")
    .classList.add("hidden");

  if(correct){

    testSession.correct++;

    $("#answerResult")
      .classList.add("correct");

    $("#answerResult").innerHTML=
      "✅ 정답!";

  }else{

    testSession.wrong++;

    testSession.wrongItems.push(q);

    $("#answerResult")
      .classList.add("incorrect");

    $("#answerResult").innerHTML=
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

  updateWordStats(
    q,
    correct
  );

  updateProgressEndButtons();

  if(
    settingsSaved.autoNext &&
    testSession.index <
      testSession.questions.length-1
  ){
    setTimeout(
      ()=>nextQuestion(),
      850
    );
  }
}

function updateWordStats(
  q,
  correct
){

  const now=nowISO();

  const refs=
    q.refs ||
    (
      testSession.source==="bundle"
        ? [
            {
              groupId:
                testSession.groupIds[0],
              wordId:q.word.id
            }
          ]
        : []
    );

  const unique=[];
  const seen=new Set();

  for(const r of refs){

    const k=
      r.groupId+"/"+r.wordId;

    if(!seen.has(k)){

      seen.add(k);
      unique.push(r);
    }
  }

  if(
    !unique.length &&
    testSession.source==="bundle"
  ){

    unique.push({
      groupId:
        testSession.groupIds[0],
      wordId:q.word.id
    });
  }

  for(const r of unique){

    const w=
      getGroup(r.groupId)
        ?.words
        .find(
          w=>w.id===r.wordId
        );

    if(!w) continue;

    ensureWordStats(w);

    w.stats.attempts++;

    if(!correct){

      w.stats.wrong++;
      w.stats.lastWrong=now;
    }
  }

  autoSaveState();
}

function updateProgressEndButtons(){

  const last=
    testSession.index ===
    testSession.questions.length-1;

  if(last){

    $("#finishTestBtn")
      .classList.remove("hidden");

    $("#nextQuestionBtn")
      .classList.add("hidden");

  }else{

    $("#nextQuestionBtn")
      .classList.remove("hidden");
  }
}

function nextQuestion(){

  if(!testSession.answered){
    return;
  }

  testSession.index++;

  renderTest();
}

function finishTest(){

  if(!testSession.answered){
    return;
  }

  const ended=nowISO();

  const h={
    id:uid("hist"),
    startedAt:testSession.startAt,
    endedAt:ended,
    source:testSession.source,
    quickType:testSession.quickType,
    groupIds:testSession.groupIds,
    questionCount:
      testSession.questions.length,
    correct:testSession.correct,
    wrong:testSession.wrong,
    accuracy:
      testSession.questions.length
        ? testSession.correct /
          testSession.questions.length
        : 0,

    questions:
      testSession.questions.map(
        q=>({
          english:q.word.english,
          answerExpected:
            expectedAnswers(q),
          direction:q.direction,
          correct:
            !testSession.wrongItems.some(
              x =>
                x.word.english===q.word.english &&
                x.direction===q.direction
            )
        })
      )
  };

  state.history.push(h);

  autoSaveState();

  renderResult();
}

function renderResult(){

  showPage("resultPage");

  const t=testSession;
  const q=t.questions.length;

  const acc=
    q
      ? Math.round(
          t.correct/q*100
        )
      : 0;

  $("#resultScore").textContent=
    `${acc}%`;

  $("#resultStats").innerHTML=
    `
      ${q}문제 ·
      정답 ${t.correct} ·
      오답 ${t.wrong}
    `;

  $("#wrongResultList").innerHTML=
    t.wrongItems.length
      ? t.wrongItems
          .map(
            x=>`
              <div class="word-card">
                <b>
                  ${escapeHTML(
                    x.word.english
                  )}
                </b>

                <div class="muted">
                  정답:
                  ${escapeHTML(
                    expectedAnswers(x)
                      .join(" / ")
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
      !t.wrongItems.length
    );
}

function retryWrong(){

  const wrong=
    testSession.wrongItems.map(
      x=>safeClone(x.word)
    );

  if(!wrong.length) return;

  beginTest({
    source:testSession.source,
    groupIds:testSession.groupIds,
    quickType:testSession.quickType,
    candidates:wrong,
    direction:"mixed",
    count:"all"
  });
}

function leaveTestConfirm(action){

  if(
    !testSession?.questions?.length
  ){
    action();
    return;
  }

  confirmModal(
    "테스트 종료",
    "진행 중인 테스트를 종료하시겠습니까? 진행 중인 테스트 결과는 현재 기록에 저장되지 않습니다.",
    ()=>{
      testSession=null;
      action();
    }
  );
}

function openInputModal(
  title,
  placeholder,
  onConfirm
){

  const input=
    document.createElement("input");

  input.id="modalSingleInput";
  input.placeholder=placeholder;

  openCustomModal(
    title,
    input,
    ()=>{
      const val=
        trimOuter(input.value);

      if(!val){
        toast("⚠️ 입력해주세요.");
        return false;
      }

      onConfirm(val);

      return true;
    },
    true
  );
}

function openCustomModal(
  title,
  form,
  onConfirm,
  closeOnTrue=false
){

  $("#modalTitle").textContent=
    title;

  $("#modalBody").innerHTML="";

  $("#modalForm").innerHTML="";

  $("#modalForm")
    .appendChild(form);

  $("#modal")
    .classList.remove("hidden");

  const confirmBtn=
    $("#modalConfirm");

  const cancelBtn=
    $("#modalCancel");

  const cleanup=()=>{
    $("#modal")
      .classList.add("hidden");

    confirmBtn.onclick=null;
    cancelBtn.onclick=null;
  };

  cancelBtn.onclick=cleanup;

  confirmBtn.onclick=()=>{
    const r=onConfirm();

    if(
      closeOnTrue &&
      r!==false
    ){
      cleanup();

    }else if(
      r!==false
    ){
      cleanup();
    }
  };

  setTimeout(
    ()=>form
      .querySelector("input,select")
      ?.focus(),
    50
  );
}

function confirmModal(
  title,
  body,
  onConfirm
){

  $("#modalTitle").textContent=
    title;

  $("#modalBody").innerHTML=
    `<p>${escapeHTML(body)}</p>`;

  $("#modalForm").innerHTML="";

  $("#modal")
    .classList.remove("hidden");

  $("#modalCancel").onclick=
    ()=>$("#modal")
      .classList.add("hidden");

  $("#modalConfirm").onclick=()=>{
    $("#modal")
      .classList.add("hidden");

    onConfirm();
  };
}

function showPage(page){

  if(
    currentPage!==page &&
    currentPage==="testPage" &&
    testSession
  ){
    /* callers use leaveTestConfirm */
  }

  currentPage=page;

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

  if(page==="settingsPage"){
    renderSettings();
  }

  if(page==="statsPage"){
    renderStatsPage();
  }

  if(page==="homePage"){
    renderHome();
  }
}

function navigatePage(page){

  if(
    currentPage==="testPage" &&
    testSession &&
    page!=="testPage"
  ){
    leaveTestConfirm(
      ()=>{
        testSession=null;
        showPage(page);
      }
    );

    return;
  }

  showPage(page);
}

function bulkAction(type){

  const ids=[
    ...selectedWordIds
  ];

  if(!ids.length) return;

  const g=getGroup(
    currentBundleId
  );

  if(!g) return;

  if(type==="delete"){

    confirmModal(
      "선택 단어 삭제",
      `선택한 ${ids.length}개의 단어를 삭제하시겠습니까?`,
      ()=>{
        g.words=
          g.words.filter(
            w=>!selectedWordIds.has(w.id)
          );

        selectedWordIds.clear();

        autoSaveState();

        renderBundlePage();
      }
    );

    return;
  }

  for(const w of g.words){

    if(
      !selectedWordIds.has(w.id)
    ){
      continue;
    }

    if(type==="on"){
      w.important=true;
    }

    if(type==="off"){
      w.important=false;
    }
  }

  autoSaveState();
  renderBundlePage();
}

function renameBundle(){

  const g=getGroup(
    currentBundleId
  );

  openInputModal(
    "묶음 이름 변경",
    "새 묶음 이름",
    val=>{
      if(
        isNameTaken(
          val,
          g.id
        )
      ){
        toast(
          "⚠️ 이미 같은 이름의 묶음이 있습니다."
        );

        return false;
      }

      confirmModal(
        "이름 변경",
        `묶음 이름을 '${val}'로 변경하시겠습니까?`,
        ()=>{
          g.name=val;

          autoSaveState();

          renderBundlePage();
          renderHome();
        }
      );

      return true;
    }
  );
}

function deleteCurrentBundle(){

  const g=getGroup(
    currentBundleId
  );

  if(!g) return;

  const childCount=
    g.type==="folder"
      ? getChildren(g.id).length
      : g.words.length;

  confirmModal(
    "묶음 삭제",
    `${g.name}과(와) 포함된 내용 ${childCount}개를 삭제하시겠습니까?`,
    ()=>{
      deleteGroupRecursive(
        g.id
      );

      currentBundleId=null;

      renderHome();
    }
  );
}

function deleteGroupRecursive(id){

  const children=
    getChildren(id);

  for(const c of children){
    deleteGroupRecursive(c.id);
  }

  state.groups=
    state.groups.filter(
      g=>g.id!==id
    );

  autoSaveState();
}

function moveBundle(){

  const g=getGroup(
    currentBundleId
  );

  if(!g) return;

  const choices=
    state.groups.filter(
      x =>
        x.type==="folder" &&
        x.id!==g.id &&
        x.id!==g.parentId
    );

  const form=
    document.createElement("div");

  form.innerHTML=`
    <label>
      상위 폴더

      <select id="moveTarget">

        <option value="">
          최상위로 이동
        </option>

        ${
          choices
            .map(
              x=>`
                <option
                  value="${x.id}"
                  ${
                    x.id===g.parentId
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHTML(x.name)}
                </option>
              `
            )
            .join("")
        }

      </select>
    </label>
  `;

  openCustomModal(
    "묶음 이동",
    form,
    ()=>{
      const target=
        $("#moveTarget").value ||
        null;

      if(target===g.id){
        return false;
      }

      g.parentId=target;

      autoSaveState();
      renderHome();

      return true;
    },
    true
  );
}

function validateAllCandidateWords(
  candidates
){
  const bad=
    candidates.find(
      w=>wordHasMissingData(w)
    );

  if(!bad) return true;

  return false;
}

function renderStatsPage(){

  const period=
    renderStatsPage.period ||
    "all";

  $$(".period-btn")
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.period===period
        )
    );

  const hs=
    filteredHistory(period);

  const qs=
    hs.reduce(
      (a,h)=>
        a+h.questionCount,
      0
    );

  const correct=
    hs.reduce(
      (a,h)=>
        a+h.correct,
      0
    );

  const wrong=
    hs.reduce(
      (a,h)=>
        a+h.wrong,
      0
    );

  const acc=
    qs
      ? Math.round(
          correct/qs*100
        )
      : 0;

  $("#statsCards").innerHTML=[
    statCard(
      "테스트",
      hs.length
    ),

    statCard(
      "문제",
      qs
    ),

    statCard(
      "정답",
      correct
    ),

    statCard(
      "정확도",
      acc+"%"
    )
  ].join("");

  const by=new Map();

  for(const h of hs){

    for(const q of h.questions){

      const key=
        (h.groupIds||[]).length===1
          ? groupDisplayName(
              h.groupIds[0]
            )
          : (
              h.quickType
                ? `빠른 테스트 · ${quickTypeLabel(h.quickType)}`
                : "빠른 테스트"
            );

      if(!by.has(key)){
        by.set(
          key,
          {
            q:0,
            c:0
          }
        );
      }

      const r=by.get(key);

      r.q++;

      if(q.correct){
        r.c++;
      }
    }
  }

  $("#bundleStats").innerHTML=
    by.size
      ? [
          ...by.entries()
        ]
          .map(
            ([name,v])=>`
              <div class="meaning-row">

                <b>
                  ${escapeHTML(name)}
                </b>

                <span class="meaning-text">
                  ${v.q}문제 ·
                  정확도
                  ${Math.round(
                    v.c/v.q*100
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

  renderHistory(hs);
}

renderStatsPage.period="all";

function filteredHistory(period){

  const now=new Date();

  return state.history.filter(
    h=>{
      const d=new Date(
        h.startedAt
      );

      if(period==="all"){
        return true;
      }

      if(period==="today"){
        return (
          d.toDateString() ===
          now.toDateString()
        );
      }

      if(period==="week"){

        const x=new Date(now);

        x.setDate(
          now.getDate()-6
        );

        x.setHours(
          0,0,0,0
        );

        return d>=x;
      }

      if(period==="month"){

        return (
          d.getFullYear()===
            now.getFullYear() &&
          d.getMonth()===
            now.getMonth()
        );
      }

      return true;
    }
  );
}

function quickTypeLabel(t){

  return (
    {
      all:"전체 단어",
      difficult:"어려운 단어",
      wrong:"자주 틀린 단어",
      recentWrong:"최근 틀린 단어",
      important:"⭐ 중요 단어"
    }[t] || t
  );
}

function renderHistory(hs){

  if(!hs.length){

    $("#historyList").innerHTML=
      `
        <div class="empty">
          아직 학습 기록이 없습니다.
        </div>
      `;

    return;
  }

  const years={};

  for(const h of hs){

    const d=
      new Date(h.startedAt);

    const y=
      d.getFullYear();

    const day=
      `${d.getMonth()+1}월 ${d.getDate()}일`;

    years[y] ??={};
    years[y][day] ??=[];

    years[y][day].push(h);
  }

  let html="";

  for(
    const y
    of Object.keys(years)
      .sort((a,b)=>b-a)
  ){

    html+=`
      <div class="history-year">

        <button
          data-history-year="${y}"
        >
          <b>${y}년</b>
          <span>▾</span>
        </button>

        <div>
          ${
            Object.keys(years[y])
              .sort(
                (a,b)=>
                  dateDayKey(b)
                    .localeCompare(
                      dateDayKey(a)
                    )
              )
              .map(
                day=>{
                  const key=
                    `${y}-${day}`;

                  return `
                    <div class="history-day">

                      <button
                        data-history-day="${key}"
                      >
                        <b>${day}</b>
                        <span>▾</span>
                      </button>

                      <div>

                        ${
                          years[y][day]
                            .sort(
                              (a,b)=>
                                b.startedAt
                                  .localeCompare(
                                    a.startedAt
                                  )
                            )
                            .map(
                              h=>`
                                <div class="history-time">

                                  <button
                                    data-history-time="${h.id}"
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
                                    id="detail-${h.id}"
                                    class="history-detail hidden"
                                  >
                                    ${historyDetail(h)}
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
              )
              .join("")
          }
        </div>

      </div>
    `;
  }

  $("#historyList").innerHTML=html;

  wireHistory();
}

function dateDayKey(s){

  const m=
    s.match(
      /(\d+)월 (\d+)일/
    );

  return `
    ${String(
      m?.[1]||0
    ).padStart(2,"0")}-${
      String(
        m?.[2]||0
      ).padStart(2,"0")
    }
  `;
}

function historyDetail(h){

  const source=
    h.source==="bundle"
      ? `묶음: ${groupDisplayName(
          h.groupIds[0]
        )}`
      : `빠른 테스트: ${
          quickTypeLabel(
            h.quickType
          )
        }`;

  return `
    <b>${source}</b>
    <br>
    문제 방향:
    ${
      h.questions.some(
        q=>q.direction==="en-ko"
      ) &&
      h.questions.some(
        q=>q.direction==="ko-en"
      )
        ? "영어 ↔ 뜻 혼합"
        : (
            h.questions[0]?.direction==="en-ko"
              ? "영어 → 뜻"
              : "뜻 → 영어"
          )
    }

    <br>

    문제 ${h.questionCount} ·
    정답 ${h.correct} ·
    오답 ${h.wrong} ·
    정확도 ${Math.round(
      h.accuracy*100
    )}%
  `;
}

function wireHistory(){

  $$("[data-history-year]")
    .forEach(
      b=>{
        b.onclick=()=>{
          const body=
            b.nextElementSibling;

          body.classList.toggle(
            "hidden"
          );
        };
      }
    );

  $$("[data-history-day]")
    .forEach(
      b=>{
        b.onclick=()=>{
          const body=
            b.nextElementSibling;

          body.classList.toggle(
            "hidden"
          );
        };
      }
    );

  $$("[data-history-time]")
    .forEach(
      b=>{
        b.onclick=()=>{
          $("#detail-"+b.dataset.historyTime)
            .classList.toggle(
              "hidden"
            );
        };
      }
    );
}

function renderSettings(){

  $("#autoNextToggle").checked=
    settingsDraft.autoNext;

  $("#downloadLink")
    .classList.add("hidden");

  $("#saveSettingsBtn")
    .classList.toggle(
      "hidden",
      JSON.stringify(
        settingsDraft
      )===
      JSON.stringify(
        settingsSaved
      )
    );

  updateDataStatus();
  renderGuide();
}

function updateDataStatus(){

  const raw=
    localStorage.getItem(DB_KEY) ||
    "{}";

  const bytes=
    new Blob([raw]).size;

  const mb=
    (bytes/1024/1024)
      .toFixed(2);

  const words=
    getAllWordRefs().length;

  const bundles=
    state.groups.filter(
      g=>g.type==="bundle"
    ).length;

  const folders=
    state.groups.filter(
      g=>g.type==="folder"
    ).length;

  const pct=
    Math.min(
      100,
      bytes/STORAGE_SOFT_LIMIT*100
    );

  $("#dataUsage").innerHTML=
    `
      <div>
        묶음 ${bundles}개 ·
        폴더 ${folders}개 ·
        단어 ${words}개 ·
        학습 기록 ${state.history.length}개
      </div>

      <div class="storage-bar">
        <div
          style="width:${pct}%"
        ></div>
      </div>

      <div class="muted">
        현재 앱 저장량 약 ${mb}MB
      </div>
    `;

  $("#lastChanged").innerHTML=
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

  const changes=[
    [
      "v1.0.0",
      "첫 정식 버전",
      "묶음/폴더 관리, 단어 관리, 테스트, 통계, 자동 저장, 저장·불러오기, PWA 설치를 포함합니다."
    ]
  ];

  $("#guideContent").innerHTML=
    `
      <div class="guide-version">
        단어 암기장 v${APP_VERSION}
      </div>

      <p class="muted">
        입력은 단어 사이에 /,
        영어와 뜻 사이에 :,
        여러 뜻은 ,를 사용합니다.
      </p>

      ${
        changes
          .map(
            (c,i)=>`
              <div class="guide-change">

                <button
                  data-guide-toggle="${i}"
                >
                  ${c[0]} · ${c[1]}
                  <span>▸</span>
                </button>

                <div class="hidden">
                  ${c[2]}
                </div>

              </div>
            `
          )
          .join("")
      }

      <p class="muted">
        묶음은 자동 저장되며,
        저장 버튼은 JSON 파일로 내보낼 때 사용합니다.
      </p>
    `;

  $$("[data-guide-toggle]")
    .forEach(
      b=>{
        b.onclick=()=>{
          const d=
            b.nextElementSibling;

          d.classList.toggle(
            "hidden"
          );

          b.querySelector("span")
            .textContent=
              d.classList.contains("hidden")
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

async function exportBackup(){

  const payload={
    format:"vocab-app-backup",
    version:1,
    appVersion:APP_VERSION,
    savedAt:nowISO(),
    data:safeClone(state),
    settings:safeClone(
      settingsSaved
    )
  };

  const dataForHash=
    JSON.stringify(payload);

  const hashBuf=
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        dataForHash
      )
    );

  const hash=[
    ...new Uint8Array(hashBuf)
  ]
    .map(
      b=>b
        .toString(16)
        .padStart(2,"0")
    )
    .join("");

  const out={
    ...payload,
    integrity:{
      algorithm:"SHA-256",
      hash
    }
  };

  const blob=
    new Blob(
      [
        JSON.stringify(
          out,
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

  downloadUrl=
    URL.createObjectURL(blob);

  const d=new Date();

  const name=
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
    }.json`;

  const link=
    $("#downloadLink");

  link.href=
    downloadUrl;

  link.download=
    name;

  link.classList.remove(
    "hidden"
  );

  $("#saveMessage").innerHTML=
    "<div>✅ 저장되었습니다.</div>";

  toast(
    "✅ 저장 파일이 준비되었습니다. 아래 링크를 눌러 저장하세요."
  );
}

async function importBackup(file){

  try{

    const text=
      await file.text();

    const obj=
      JSON.parse(text);

    if(
      obj?.format!=="vocab-app-backup" ||
      !obj?.data ||
      !obj?.integrity?.hash
    ){
      throw new Error(
        "FORMAT"
      );
    }

    const payload={
      format:obj.format,
      version:obj.version,
      appVersion:obj.appVersion,
      savedAt:obj.savedAt,
      data:obj.data,
      settings:obj.settings
    };

    const calcBuf=
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify(payload)
        )
      );

    const calc=[
      ...new Uint8Array(calcBuf)
    ]
      .map(
        b=>b
          .toString(16)
          .padStart(2,"0")
      )
      .join("");

    if(
      calc!==obj.integrity.hash
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
      "현재 데이터를 불러온 파일의 데이터로 교체할까요?",
      ()=>{
        const old=state;

        state=obj.data;

        settingsSaved=
          obj.settings ||
          settingsSaved;

        settingsDraft={
          ...settingsSaved
        };

        if(!autoSaveState()){
          state=old;
          return;
        }

        persistSettings();
        applyTheme();
        renderHome();

        toast(
          "✅ 불러오기가 완료되었습니다."
        );
      }
    );

  }catch(e){

    const msg=
      e.message==="CHANGED"
        ? "저장된 파일의 내용이 변경되었거나 손상되었습니다."
        : e.message==="FORMAT"
          ? "올바른 단어장 저장 파일이 아닙니다."
          : e.message==="DATA"
            ? "파일 안의 데이터 구조가 올바르지 않습니다."
            : "파일을 읽을 수 없거나 JSON 형식이 아닙니다.";

    $("#restoreMessage").innerHTML=
      `
        <div>
          ❌ 불러오기에 실패했습니다.
          <br>
          ${escapeHTML(msg)}
        </div>
      `;
  }
}

function applyTheme(){

  document.body.classList.toggle(
    "dark",
    settingsSaved.darkMode
  );

  $("#darkBtn").textContent=
    settingsSaved.darkMode
      ? "☀️"
      : "🌙";
}

function settingsChanged(){

  settingsDraft={
    ...settingsDraft
  };

  $("#saveSettingsBtn")
    .classList.remove(
      "hidden"
    );

  $("#settingsMessage").innerHTML=
    `
      <div>
        설정이 변경되었습니다.
        변경 내용을 저장하시겠습니까?
      </div>
    `;
}

function saveSettings(){

  settingsSaved={
    ...settingsDraft
  };

  persistSettings();
  applyTheme();

  $("#saveSettingsBtn")
    .classList.add(
      "hidden"
    );

  $("#settingsMessage").innerHTML=
    `
      <div>
        ✅ 설정이 저장되었습니다.
      </div>
    `;
}

function resetSettings(){

  confirmModal(
    "설정 전체 초기화",
    "학습 데이터는 유지되고 설정만 기본값으로 돌아갑니다.",
    ()=>{
      settingsSaved={
        autoNext:false,
        darkMode:false
      };

      settingsDraft={
        ...settingsSaved
      };

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
    "오답 기록과 최근 학습 기록을 모두 초기화합니다. 단어와 묶음은 유지됩니다.",
    ()=>{
      for(
        const {word}
        of getAllWordRefs()
      ){
        word.stats={
          attempts:0,
          wrong:0,
          lastWrong:null
        };
      }

      state.history=[];

      autoSaveState();
      renderSettings();

      toast(
        "✅ 학습 기록이 초기화되었습니다."
      );
    }
  );
}

function deleteAll(){

  confirmModal(
    "모든 데이터 삭제",
    "모든 묶음, 단어, 학습 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    ()=>{
      state=defaultState();

      autoSaveState();
      renderHome();

      toast(
        "✅ 모든 데이터가 삭제되었습니다."
      );
    }
  );
}

function toast(text){

  const d=
    document.createElement("div");

  d.className="toast";
  d.textContent=text;

  $("#toastContainer")
    .appendChild(d);

  setTimeout(
    ()=>d.remove(),
    3200
  );
}

function detectAppUpdate(){

  const seen=
    localStorage.getItem(
      "vocab-app-seen-version"
    );

  if(
    seen!==APP_VERSION
  ){

    localStorage.setItem(
      "vocab-app-seen-version",
      APP_VERSION
    );

    if(seen){
      toast(
        `🆕 새 버전 v${APP_VERSION}이 적용되었습니다.`
      );
    }
  }
}

$("#addBundleBtn").onclick=
  ()=>createBundleFlow();

$("#addStandaloneWordBtn").onclick=
  addStandaloneWord;

$("#addFolderBtn").onclick=
  createFolderFlow;

$("#quickTestOpenBtn").onclick=
  quickDialog;

$("#backHomeBtn").onclick=
  ()=>navigatePage("homePage");

$("#renameBundleBtn").onclick=
  renameBundle;

$("#deleteBundleBtn").onclick=
  deleteCurrentBundle;

$("#moveBundleBtn").onclick=
  moveBundle;

$("#addWordsBtn").onclick=
  ()=>addWordsToGroup(
    currentBundleId,
    $("#bulkInput").value
  );

$("#wordSearch").oninput=
  ()=>renderWords();

$("#wordSort").onchange=
  ()=>renderWords();

$("#importantFilterBtn").onclick=
  ()=>{
    wordFilterImportant=
      !wordFilterImportant;

    $("#importantFilterBtn").textContent=
      wordFilterImportant
        ? "⭐ 전체 보기"
        : "⭐ 중요 단어만";

    renderWords();
  };

$("#selectAllWords").onchange=
  e=>{
    for(
      const w
      of wordsForView()
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

    renderWords();
  };

$("#bulkImportantOnBtn").onclick=
  ()=>bulkAction("on");

$("#bulkImportantOffBtn").onclick=
  ()=>bulkAction("off");

$("#bulkDeleteBtn").onclick=
  ()=>bulkAction("delete");

$("#startBundleTestBtn").onclick=
  startGroupTest;

$("#checkAnswerBtn").onclick=
  checkAnswer;

$("#nextQuestionBtn").onclick=
  nextQuestion;

$("#finishTestBtn").onclick=
  finishTest;

$("#exitTestBtn").onclick=
  ()=>leaveTestConfirm(
    renderHome
  );

$("#answerInput").addEventListener(
  "keydown",
  e=>{
    if(e.key==="Enter"){
      e.preventDefault();

      if(
        !testSession.answered
      ){
        checkAnswer();
      }
    }
  }
);

$("#retryWrongBtn").onclick=
  retryWrong;

$("#resultHomeBtn").onclick=
  renderHome;

$("#saveBtn").onclick=
  exportBackup;

$("#restoreInput").onchange=
  e=>{
    const f=
      e.target.files?.[0];

    if(f){
      importBackup(f);
    }

    e.target.value="";
  };

$("#resetLearningBtn").onclick=
  resetLearning;

$("#deleteAllBtn").onclick=
  deleteAll;

$("#autoNextToggle").onchange=
  e=>{
    settingsDraft.autoNext=
      e.target.checked;

    settingsChanged();
  };

$("#saveSettingsBtn").onclick=
  saveSettings;

$("#resetSettingsBtn").onclick=
  resetSettings;

$("#darkBtn").onclick=
  ()=>{
    settingsDraft.darkMode=
      !settingsDraft.darkMode;

    applyThemeDraft();
    settingsChanged();
  };

$("#guideInstallBtn").onclick=
  async ()=>{
    if(pendingInstallPrompt){

      pendingInstallPrompt.prompt();

      await pendingInstallPrompt.userChoice;

      pendingInstallPrompt=null;

      renderGuide();
    }
  };

$$(".nav-btn")
  .forEach(
    b=>{
      b.onclick=
        ()=>navigatePage(
          b.dataset.page
        );
    }
  );

$$(".period-btn")
  .forEach(
    b=>{
      b.onclick=
        ()=>{
          renderStatsPage.period=
            b.dataset.period;

          renderStatsPage();
        };
    }
  );

function applyThemeDraft(){

  document.body.classList.toggle(
    "dark",
    settingsDraft.darkMode
  );

  $("#darkBtn").textContent=
    settingsDraft.darkMode
      ? "☀️"
      : "🌙";
}

$("#wordSentinel")
  .addEventListener(
    "mouseenter",
    ()=>{}
  );

const observer=
  new IntersectionObserver(
    entries=>{
      if(
        entries[0].isIntersecting &&
        currentPage==="bundlePage"
      ){
        const words=
          wordsForView();

        if(
          visibleWordLimit <
          words.length
        ){
          visibleWordLimit+=
            WORD_CHUNK;

          appendWordChunk(
            words
          );
        }
      }
    }
  );

observer.observe(
  $("#wordSentinel")
);

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

applyTheme();
detectAppUpdate();
renderHome();

if(
  location.protocol==="https:" &&
  "serviceWorker" in navigator
){
  navigator.serviceWorker
    .register("./sw.js")
    .catch(()=>{});
}
