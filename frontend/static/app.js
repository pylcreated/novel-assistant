const API_BASE_CANDIDATES = [
  "http://127.0.0.1:8012/api",
  "http://127.0.0.1:8010/api",
  "http://127.0.0.1:8000/api",
];
let activeApiBase = API_BASE_CANDIDATES[0];

const NOTE_TYPE_LABEL = {
  character: "人物档案",
  foreshadow: "伏笔档案",
  plotline: "情节线档案",
  other: "世界观档案",
};

const state = {
  projectId: "",
  project: null,
  chapters: [],
  notes: [],
  activeTab: "chapters",
  notesEditorVisible: false,
  activeChapterId: null,
  activeNoteId: null,
  activeNoteType: "character",
};

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

function getProjectId() {
  return new URLSearchParams(window.location.search).get("id");
}

function withBase(url, base) {
  return String(url || "").replace(/^http:\/\/127\.0\.0\.1:\d+\/api/, base);
}

async function doFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function requestJson(url, options = {}) {
  const tried = [];
  for (const base of API_BASE_CANDIDATES) {
    const candidateUrl = withBase(url, base);
    tried.push(base);
    try {
      const data = await doFetchJson(candidateUrl, options);
      activeApiBase = base;
      return data;
    } catch (err) {
      const msg = String(err.message || "");
      const code = Number(err.status || 0);
      const retryable = msg.includes("Failed to fetch") || msg.includes("404") || msg.includes("Not Found") || code === 404;
      if (!retryable || base === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1]) {
        throw new Error(`无法连接后端服务，请确认已启动（已尝试：${tried.join(", ")}）`);
      }
    }
  }
  throw new Error("无法连接后端服务");
}

function normalizeProject(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    ...p,
    schema_version: p.schema_version || "0.4",
    id: p.id || "",
    title: p.title || "",
    description: p.description || "",
    created_at: p.created_at || "",
    updated_at: p.updated_at || "",
  };
}

function normalizeChapter(raw, idx, projectId) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    ...c,
    id: c.id || `chapter_${idx + 1}`,
    project_id: c.project_id || projectId,
    title: c.title || `第${idx + 1}章`,
    content: c.content || c.notes || c.summary || "",
    order: Number.isFinite(c.order) ? c.order : idx,
    created_at: c.created_at || "",
    updated_at: c.updated_at || "",
  };
}

function noteFromLegacy(item, idx, type, projectId) {
  const x = item && typeof item === "object" ? item : {};
  return {
    id: x.id || `note_${type}_${idx + 1}`,
    project_id: projectId,
    type,
    title: x.title || x.name || "",
    content: x.content || x.description || x.notes || "",
    order: idx,
    created_at: x.created_at || "",
    updated_at: x.updated_at || "",
  };
}

function normalizeNotes(raw, projectId) {
  if (Array.isArray(raw.notes)) {
    return raw.notes.map((n, idx) => ({
      ...n,
      id: n.id || `note_${idx + 1}`,
      project_id: n.project_id || projectId,
      type: n.type || "other",
      title: n.title || "",
      content: n.content || "",
      order: Number.isFinite(n.order) ? n.order : idx,
      created_at: n.created_at || "",
      updated_at: n.updated_at || "",
    }));
  }
  const converted = [];
  (Array.isArray(raw.characters) ? raw.characters : []).forEach((x, idx) => converted.push(noteFromLegacy(x, idx, "character", projectId)));
  (Array.isArray(raw.plot_threads) ? raw.plot_threads : []).forEach((x, idx) => converted.push(noteFromLegacy(x, idx, "plotline", projectId)));
  return converted;
}

function activeChapter() {
  return state.chapters.find((x) => x.id === state.activeChapterId) || null;
}

function visibleNotes() {
  return state.notes.filter((x) => x.type === state.activeNoteType).sort((a, b) => a.order - b.order);
}

function activeNote() {
  return state.notes.find((x) => x.id === state.activeNoteId) || null;
}

function setMessage(text) {
  const box = document.getElementById("save-message");
  if (box) box.textContent = text || "";
}

function renderMeta() {
  document.getElementById("project-title-heading").textContent = state.project?.title || "作品名称";
  document.getElementById("meta-info").textContent = `创建时间：${formatDate(state.project?.created_at)} | 更新时间：${formatDate(state.project?.updated_at)}`;
}

function renderTabs() {
  document.querySelectorAll("#main-tabs .module-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
  });
  document.getElementById("tab-chapters").classList.toggle("hidden", state.activeTab !== "chapters");
  document.getElementById("tab-notes").classList.toggle("hidden", state.activeTab !== "notes");
}

function renderNotesLayout() {
  const layout = document.querySelector("#tab-notes .notes-layout");
  const editorPane = document.getElementById("notes-editor-pane");
  if (!layout || !editorPane) return;
  editorPane.classList.toggle("hidden", !state.notesEditorVisible);
  layout.classList.toggle("notes-layout-list-only", !state.notesEditorVisible);
}

function renderChapterList() {
  const box = document.getElementById("chapter-list");
  if (!state.chapters.length) {
    box.innerHTML = '<p class="module-note">暂无章节，请新建第一章。</p>';
    return;
  }
  box.innerHTML = state.chapters
    .sort((a, b) => a.order - b.order)
    .map(
      (c, idx) => `
      <button class="chapter-item ${c.id === state.activeChapterId ? "active" : ""}" data-action="pick-chapter" data-id="${esc(c.id)}">
        <div class="chapter-item-title">第${idx + 1}章 ${esc(c.title || "未命名章节")}</div>
      </button>
    `,
    )
    .join("");
}

function renderChapterEditor() {
  const c = activeChapter();
  const titleInput = document.getElementById("chapter-title-input");
  const contentInput = document.getElementById("chapter-content-input");
  const saveBtn = document.getElementById("save-chapter-btn");
  const delBtn = document.getElementById("delete-chapter-btn");

  if (!c) {
    titleInput.value = "";
    contentInput.value = "";
    titleInput.disabled = true;
    contentInput.disabled = true;
    saveBtn.disabled = true;
    delBtn.disabled = true;
    return;
  }

  titleInput.disabled = false;
  contentInput.disabled = false;
  saveBtn.disabled = false;
  delBtn.disabled = false;
  titleInput.value = c.title || "";
  contentInput.value = c.content || "";
}

function renderNoteTypeTabs() {
  document.querySelectorAll(".notes-types .module-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.noteType === state.activeNoteType);
  });
  document.getElementById("note-list-title").textContent = NOTE_TYPE_LABEL[state.activeNoteType];
  document.getElementById("note-type-input").value = state.activeNoteType;
}

function renderNoteList() {
  const box = document.getElementById("note-list");
  const list = visibleNotes();
  if (!list.length) {
    box.innerHTML = '<p class="module-note">该分类暂无档案，点击“新增档案”。</p>';
    return;
  }
  box.innerHTML = list
    .map(
      (n) => `
      <button class="chapter-item ${n.id === state.activeNoteId ? "active" : ""}" data-action="pick-note" data-id="${esc(n.id)}">
        <div class="chapter-item-title">${esc(n.title || "未命名档案")}</div>
      </button>
    `,
    )
    .join("");
}

function renderNoteEditor() {
  const n = activeNote();
  const titleInput = document.getElementById("note-title-input");
  const typeInput = document.getElementById("note-type-input");
  const contentInput = document.getElementById("note-content-input");
  const saveBtn = document.getElementById("save-note-btn");
  const delBtn = document.getElementById("delete-note-btn");

  if (!n) {
    titleInput.value = "";
    typeInput.value = state.activeNoteType;
    contentInput.value = "";
    titleInput.disabled = true;
    typeInput.disabled = true;
    contentInput.disabled = true;
    saveBtn.disabled = true;
    delBtn.disabled = true;
    return;
  }

  titleInput.disabled = false;
  typeInput.disabled = false;
  contentInput.disabled = false;
  saveBtn.disabled = false;
  delBtn.disabled = false;
  titleInput.value = n.title || "";
  typeInput.value = n.type || "other";
  contentInput.value = n.content || "";
}

function renderAll() {
  renderMeta();
  renderTabs();
  renderNotesLayout();
  renderChapterList();
  renderChapterEditor();
  renderNoteTypeTabs();
  renderNoteList();
  renderNoteEditor();
}

async function loadAllData() {
  const p = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}`);
  state.project = normalizeProject(p);

  const chaptersRaw = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/chapters`);
  state.chapters = (Array.isArray(chaptersRaw) ? chaptersRaw : []).map((c, idx) => normalizeChapter(c, idx, state.projectId));

  const notesRaw = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/notes`);
  if (Array.isArray(notesRaw)) {
    state.notes = notesRaw.map((n, idx) => ({
      ...n,
      id: n.id || `note_${idx + 1}`,
      project_id: n.project_id || state.projectId,
      type: n.type || "other",
      title: n.title || "",
      content: n.content || "",
      order: Number.isFinite(n.order) ? n.order : idx,
    }));
  } else {
    state.notes = normalizeNotes(p, state.projectId);
  }

  if (!state.activeChapterId || !state.chapters.some((x) => x.id === state.activeChapterId)) {
    state.activeChapterId = state.chapters[0]?.id || null;
  }
  const notesOfType = visibleNotes();
  if (!state.activeNoteId || !notesOfType.some((x) => x.id === state.activeNoteId)) {
    state.activeNoteId = notesOfType[0]?.id || null;
  }
}

async function saveActiveChapter() {
  const c = activeChapter();
  if (!c) return;
  const title = document.getElementById("chapter-title-input").value.trim() || c.title;
  const content = document.getElementById("chapter-content-input").value;
  const saved = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/chapters/${encodeURIComponent(c.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, order: c.order }),
  });
  const idx = state.chapters.findIndex((x) => x.id === c.id);
  if (idx >= 0) state.chapters[idx] = normalizeChapter(saved, idx, state.projectId);
}

async function saveActiveNote() {
  const n = activeNote();
  if (!n) return;
  const title = document.getElementById("note-title-input").value.trim() || n.title;
  const type = document.getElementById("note-type-input").value || "other";
  const content = document.getElementById("note-content-input").value;
  const saved = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/notes/${encodeURIComponent(n.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, type, content, order: n.order }),
  });
  const idx = state.notes.findIndex((x) => x.id === n.id);
  if (idx >= 0) state.notes[idx] = { ...state.notes[idx], ...saved };
  state.activeNoteType = type;
}

function bindEvents() {
  document.getElementById("main-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".module-item[data-tab]");
    if (!btn) return;
    state.activeTab = btn.dataset.tab;
    if (state.activeTab === "notes") state.notesEditorVisible = false;
    setMessage("");
    renderAll();
  });

  document.getElementById("chapter-list").addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="pick-chapter"]');
    if (!btn) return;
    state.activeChapterId = btn.dataset.id;
    renderChapterList();
    renderChapterEditor();
  });

  document.getElementById("add-chapter-btn").addEventListener("click", async () => {
    try {
      const created = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "新章节" }),
      });
      state.chapters.push(normalizeChapter(created, state.chapters.length, state.projectId));
      state.activeChapterId = created.id;
      renderAll();
      setMessage("已新增章节。")
    } catch (err) {
      setMessage(`新增章节失败：${err.message}`);
    }
  });

  document.getElementById("save-chapter-btn").addEventListener("click", async () => {
    try {
      await saveActiveChapter();
      await loadAllData();
      renderAll();
      setMessage("章节已保存。")
    } catch (err) {
      setMessage(`保存章节失败：${err.message}`);
    }
  });

  document.getElementById("delete-chapter-btn").addEventListener("click", async () => {
    const c = activeChapter();
    if (!c) return;
    if (!window.confirm(`确认删除章节「${c.title || "未命名章节"}」吗？`)) return;
    try {
      await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/chapters/${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      state.chapters = state.chapters.filter((x) => x.id !== c.id);
      state.activeChapterId = state.chapters[0]?.id || null;
      renderAll();
      setMessage("章节已删除。")
    } catch (err) {
      setMessage(`删除章节失败：${err.message}`);
    }
  });

  document.querySelector(".notes-types").addEventListener("click", (e) => {
    const btn = e.target.closest(".module-item[data-note-type]");
    if (!btn) return;
    state.activeNoteType = btn.dataset.noteType;
    const list = visibleNotes();
    state.activeNoteId = list[0]?.id || null;
    state.notesEditorVisible = false;
    renderAll();
  });

  document.getElementById("note-list").addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="pick-note"]');
    if (!btn) return;
    state.activeNoteId = btn.dataset.id;
    state.notesEditorVisible = true;
    renderAll();
  });

  document.getElementById("add-note-btn").addEventListener("click", async () => {
    try {
      const created = await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: state.activeNoteType, title: "新档案", content: "" }),
      });
      state.notes.push({ ...created, type: created.type || state.activeNoteType });
      state.activeNoteType = created.type || state.activeNoteType;
      state.activeNoteId = created.id;
      state.notesEditorVisible = true;
      renderAll();
      setMessage("已新增档案。")
    } catch (err) {
      setMessage(`新增档案失败：${err.message}`);
    }
  });

  document.getElementById("save-note-btn").addEventListener("click", async () => {
    try {
      await saveActiveNote();
      await loadAllData();
      renderAll();
      setMessage("档案已保存。")
    } catch (err) {
      setMessage(`保存档案失败：${err.message}`);
    }
  });

  document.getElementById("delete-note-btn").addEventListener("click", async () => {
    const n = activeNote();
    if (!n) return;
    if (!window.confirm(`确认删除档案「${n.title || "未命名档案"}」吗？`)) return;
    try {
      await requestJson(`${activeApiBase}/projects/${encodeURIComponent(state.projectId)}/notes/${encodeURIComponent(n.id)}`, {
        method: "DELETE",
      });
      state.notes = state.notes.filter((x) => x.id !== n.id);
      state.activeNoteId = visibleNotes()[0]?.id || null;
      renderAll();
      setMessage("档案已删除。")
    } catch (err) {
      setMessage(`删除档案失败：${err.message}`);
    }
  });
}

async function setupProjectPage() {
  state.projectId = getProjectId();
  if (!state.projectId) {
    const tip = "缺少项目ID，请从首页进入。";
    setMessage(tip);
    window.location.href = `./index.html?error=${encodeURIComponent(tip)}`;
    return;
  }

  bindEvents();

  try {
    await loadAllData();
    renderAll();
  } catch (err) {
    setMessage(`加载失败：${err.message}`);
  }
}

(function init() {
  if (document.body.dataset.page === "project") {
    setupProjectPage().catch((err) => setMessage(`初始化失败：${err.message}`));
  }
})();
