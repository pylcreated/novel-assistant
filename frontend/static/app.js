const API_BASE = "http://127.0.0.1:8000/api";

const PLOT_STATUS = ["未开始", "进行中", "已完成", "卡住"];
const CHAPTER_STATUS = ["未开始", "构思中", "草稿中", "待修改", "已完成", "已发布"];
const FEEDBACK_SOURCE = ["自我复盘", "读者评论", "数据表现", "AI分析", "编辑建议"];
const FEEDBACK_SCOPE = ["单章", "阶段", "整本书"];
const FEEDBACK_STATUS = ["待处理", "已处理"];
const AFFECTS = ["定位层", "背景层", "人物层", "情节层", "章节层"];

const state = {
  projectId: "",
  data: null,
  editing: {
    positioning: false,
    background: false,
    characterId: null,
    plotId: null,
    chapterId: null,
    feedbackId: null,
  },
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

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function getProjectId() {
  return new URLSearchParams(window.location.search).get("id");
}

async function requestJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    const networkErr = new Error("无法连接后端服务，请确认已启动：py -3 -m uvicorn main:app --reload --port 8000");
    networkErr.cause = err;
    throw networkErr;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function normalizeProject(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const plotThreads = Array.isArray(input.plot_threads)
    ? input.plot_threads
    : Array.isArray(input.plotlines)
      ? input.plotlines
      : [];
  const feedbacks = Array.isArray(input.feedbacks)
    ? input.feedbacks
    : Array.isArray(input.feedback_notes)
      ? input.feedback_notes
      : [];

  return {
    schema_version: input.schema_version || "0.4",
    id: input.id || "",
    title: input.title || "",
    description: input.description || "",
    created_at: input.created_at || "",
    updated_at: input.updated_at || "",
    positioning: input.positioning || "",
    background: input.background || "",
    feedback: input.feedback || "",
    update_notes: Array.isArray(input.update_notes) ? input.update_notes : [],
    feedback_notes: Array.isArray(input.feedback_notes) ? input.feedback_notes : feedbacks,
    characters: (Array.isArray(input.characters) ? input.characters : []).map((c, i) => ({
      id: c.id || `char_${i + 1}`,
      name: c.name || "",
      role: c.role || "",
      description: c.description || "",
      motivation: c.motivation || "",
      goal: c.goal || "",
      current_state: c.current_state || "",
      relationship: c.relationship || "",
      notes: c.notes || "",
    })),
    plot_threads: plotThreads.map((p, i) => ({
      id: p.id || `plot_${i + 1}`,
      type: p.type || "",
      title: p.title || "",
      description: p.description || "",
      status: p.status || "进行中",
      related_characters: Array.isArray(p.related_characters) ? p.related_characters : [],
      notes: p.notes || "",
    })),
    chapters: (Array.isArray(input.chapters) ? input.chapters : []).map((c, i) => ({
      id: c.id || `chapter_${i + 1}`,
      title: c.title || "",
      summary: c.summary || "",
      chapter_goal: c.chapter_goal || c.goal || "",
      previous_connection: c.previous_connection || "",
      plot_progress: c.plot_progress || "",
      character_change: c.character_change || "",
      ending_hook: c.ending_hook || "",
      next_setup: c.next_setup || "",
      unresolved_questions: Array.isArray(c.unresolved_questions)
        ? c.unresolved_questions
        : String(c.unresolved_questions || "")
            .split(/\n+/)
            .map((x) => x.trim())
            .filter(Boolean),
      status: c.status || "草稿中",
      characters: Array.isArray(c.characters) ? c.characters : [],
      plotlines: Array.isArray(c.plotlines) ? c.plotlines : [],
      notes: c.notes || "",
    })),
    feedbacks: feedbacks.map((f, i) => ({
      id: f.id || `feedback_${i + 1}`,
      source: f.source || "自我复盘",
      scope: f.scope || "单章",
      target: f.target || "",
      problem: f.problem || "",
      evidence: f.evidence || "",
      decision: f.decision || "",
      affects: Array.isArray(f.affects) ? f.affects : [],
      status: f.status || "待处理",
    })),
  };
}

function resetEditFlags() {
  state.editing = {
    positioning: false,
    background: false,
    characterId: null,
    plotId: null,
    chapterId: null,
    feedbackId: null,
  };
}

function toMap(list, key = "name") {
  const m = new Map();
  list.forEach((x, i) => m.set(x.id, x[key] || `未命名_${i + 1}`));
  return m;
}

function renderMeta() {
  const heading = document.getElementById("project-title-heading");
  const meta = document.getElementById("meta-info");
  if (heading) heading.textContent = state.data.title || "作品名称";
  if (meta) meta.textContent = `创建时间：${formatDate(state.data.created_at)} | 更新时间：${formatDate(state.data.updated_at)}`;
}

function renderOverview() {
  const d = state.data;
  const box = document.getElementById("overview-cards");
  if (!box) return;

  const legacyFeedbackCount = d.feedback ? d.feedback.split(/\n+/).filter((x) => x.trim()).length : 0;
  const items = [
    ["作品名称", d.title || "未命名作品"],
    ["人物档案", `${d.characters.length} 人`],
    ["故事线索", `${d.plot_threads.length} 条`],
    ["章节手稿", `${d.chapters.length} 章`],
    ["读者回声", `${d.feedbacks.length + legacyFeedbackCount} 条`],
  ];

  box.innerHTML = items
    .map(
      ([k, v]) => `
      <article class="story-card">
        <div class="story-sub">${esc(k)}</div>
        <h3 class="story-title">${esc(v)}</h3>
      </article>
    `,
    )
    .join("");

  const updates = document.getElementById("updates-summary");
  if (!updates) return;
  updates.innerHTML = d.chapters.length
    ? d.chapters
        .slice(0, 8)
        .map(
          (c) => `
          <article class="story-card">
            <div class="story-head">
              <h3 class="story-title">${esc(c.title || "未命名章节")}</h3>
              <span class="badge status">${esc(c.status)}</span>
            </div>
            <div class="story-text">承接：${esc(c.previous_connection || "-")}</div>
            <div class="story-text">推进：${esc(c.plot_progress || "-")}</div>
            <div class="story-text">钩子：${esc(c.ending_hook || "-")}</div>
          </article>
        `,
        )
        .join("")
    : '<p class="module-note">暂无连载记录。</p>';
}

function renderSimpleModule(titleLabel, value, editing, editBtnId, formId, textareaId, onSaveAction, onCancelAction, viewId) {
  const view = document.getElementById(viewId);
  const form = document.getElementById(formId);
  const btn = document.getElementById(editBtnId);
  if (!view || !form || !btn) return;

  if (!editing) {
    view.classList.remove("hidden");
    view.innerHTML = `<div class="story-card"><div class="story-text">${esc(value || "暂无内容")}</div></div>`;
    form.classList.add("hidden");
    btn.textContent = "编辑";
    return;
  }

  view.classList.add("hidden");
  view.innerHTML = "";
  form.classList.remove("hidden");
  btn.textContent = "取消";
  form.innerHTML = `
    <div class="editor">
      <textarea id="${textareaId}" rows="10">${esc(value)}</textarea>
      <div class="inline-actions">
        <button type="button" class="btn btn-primary" data-action="${onSaveAction}">保存</button>
        <button type="button" class="btn btn-secondary" data-action="${onCancelAction}">取消</button>
      </div>
    </div>
  `;
}

function actionButtons(editAction, deleteAction, id) {
  return `
    <div class="story-actions">
      <button class="btn btn-secondary" data-action="${editAction}" data-id="${esc(id)}">编辑</button>
      <button class="btn btn-danger" data-action="${deleteAction}" data-id="${esc(id)}">删除</button>
    </div>
  `;
}

function renderCharacters() {
  const box = document.getElementById("characters-list");
  if (!box) return;
  const d = state.data;
  if (!d.characters.length) {
    box.innerHTML = '<p class="module-note">暂无人物档案，点击“添加人物”开始。</p>';
    return;
  }

  box.innerHTML = d.characters.map((c) => {
    const editing = state.editing.characterId === c.id;
    if (!editing) {
      return `
      <article class="story-card" data-id="${esc(c.id)}">
        <div class="story-head">
          <div>
            <h3 class="story-title">${esc(c.name || "未命名人物")}</h3>
            <div class="story-sub">身份：${esc(c.role || "未设定")}</div>
          </div>
          ${actionButtons("edit-character", "delete-character", c.id)}
        </div>
        <div class="story-text">立场 / 目标：${esc(c.goal || c.motivation || "-")}</div>
        <div class="story-text">与主角关系：${esc(c.relationship || "-")}</div>
        <div class="story-text">备注：${esc(c.notes || c.description || "-")}</div>
      </article>`;
    }

    return `
    <article class="story-card" data-id="${esc(c.id)}">
      <div class="editor">
        <label>姓名</label><input data-f="name" value="${esc(c.name)}" />
        <label>身份</label><input data-f="role" value="${esc(c.role)}" />
        <label>性格描述</label><textarea data-f="description" rows="2">${esc(c.description)}</textarea>
        <label>立场 / 目标</label><textarea data-f="goal" rows="2">${esc(c.goal)}</textarea>
        <label>与主角关系</label><textarea data-f="relationship" rows="2">${esc(c.relationship)}</textarea>
        <label>人物备注</label><textarea data-f="notes" rows="2">${esc(c.notes)}</textarea>
        <div class="inline-actions">
          <button class="btn btn-primary" data-action="save-character" data-id="${esc(c.id)}">保存</button>
          <button class="btn btn-secondary" data-action="cancel-character">取消</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function renderPlot() {
  const box = document.getElementById("plot-list");
  if (!box) return;
  const d = state.data;
  const characterMap = toMap(d.characters, "name");

  if (!d.plot_threads.length) {
    box.innerHTML = '<p class="module-note">暂无故事脉络，点击“添加一条线索”开始。</p>';
    return;
  }

  box.innerHTML = d.plot_threads.map((p) => {
    const editing = state.editing.plotId === p.id;
    if (!editing) {
      const charChips = p.related_characters.length
        ? p.related_characters.map((id) => `<span class="chip">${esc(characterMap.get(id) || id)}</span>`).join("")
        : '<span class="chip">暂无牵涉人物</span>';

      return `
      <article class="story-card" data-id="${esc(p.id)}">
        <div class="story-head">
          <div>
            <h3 class="story-title">${esc(p.title || "未命名线索")}</h3>
            <div class="badges">
              <span class="badge type">${esc(p.type || "未分类")}</span>
              <span class="badge status">${esc(p.status || "进行中")}</span>
            </div>
          </div>
          ${actionButtons("edit-plot", "delete-plot", p.id)}
        </div>
        <div class="story-text">${esc(p.description || "暂无描述")}</div>
        <div class="chips">${charChips}</div>
        <div class="story-text">创作札记：${esc(p.notes || "-")}</div>
      </article>`;
    }

    const statusOptions = PLOT_STATUS.map((s) => `<option value="${esc(s)}" ${p.status === s ? "selected" : ""}>${esc(s)}</option>`).join("");
    const charChecks = d.characters.length
      ? d.characters.map((c) => `<label><input type="checkbox" data-f="related_characters" value="${esc(c.id)}" ${p.related_characters.includes(c.id) ? "checked" : ""}/> ${esc(c.name || c.id)}</label>`).join("")
      : '<span class="module-note">暂无人物可关联</span>';

    return `
    <article class="story-card" data-id="${esc(p.id)}">
      <div class="editor">
        <label>标题</label><input data-f="title" value="${esc(p.title)}" />
        <label>类型</label><input data-f="type" value="${esc(p.type)}" placeholder="主线 / 支线 / 暗线" />
        <label>状态</label><select data-f="status">${statusOptions}</select>
        <label>描述正文</label><textarea data-f="description" rows="4">${esc(p.description)}</textarea>
        <label>牵涉人物</label><div class="choice-list">${charChecks}</div>
        <label>创作札记</label><textarea data-f="notes" rows="2">${esc(p.notes)}</textarea>
        <div class="inline-actions">
          <button class="btn btn-primary" data-action="save-plot" data-id="${esc(p.id)}">保存</button>
          <button class="btn btn-secondary" data-action="cancel-plot">取消</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function renderChapters() {
  const box = document.getElementById("chapters-list");
  if (!box) return;
  const d = state.data;
  const plotMap = toMap(d.plot_threads, "title");

  if (!d.chapters.length) {
    box.innerHTML = '<p class="module-note">暂无章节手稿，点击“添加章节手稿”开始。</p>';
    return;
  }

  box.innerHTML = d.chapters.map((c, i) => {
    const editing = state.editing.chapterId === c.id;
    if (!editing) {
      const plotChips = c.plotlines.length
        ? c.plotlines.map((id) => `<span class="chip">${esc(plotMap.get(id) || id)}</span>`).join("")
        : '<span class="chip">暂无关联故事线</span>';
      return `
      <article class="story-card" data-id="${esc(c.id)}">
        <div class="story-head">
          <div>
            <h3 class="story-title">第${i + 1}章 ${esc(c.title || "未命名章节")}</h3>
            <div class="badges"><span class="badge status">${esc(c.status || "草稿中")}</span></div>
          </div>
          ${actionButtons("edit-chapter", "delete-chapter", c.id)}
        </div>
        <div class="story-text">核心事件：${esc(c.plot_progress || c.summary || "-")}</div>
        <div class="chips">${plotChips}</div>
        <div class="story-text">备注：${esc(c.notes || c.ending_hook || "-")}</div>
      </article>`;
    }

    const statusOptions = CHAPTER_STATUS.map((s) => `<option value="${esc(s)}" ${c.status === s ? "selected" : ""}>${esc(s)}</option>`).join("");
    const characterChecks = d.characters.length
      ? d.characters.map((x) => `<label><input type="checkbox" data-f="characters" value="${esc(x.id)}" ${c.characters.includes(x.id) ? "checked" : ""}/> ${esc(x.name || x.id)}</label>`).join("")
      : '<span class="module-note">暂无人物可关联</span>';
    const plotChecks = d.plot_threads.length
      ? d.plot_threads.map((x) => `<label><input type="checkbox" data-f="plotlines" value="${esc(x.id)}" ${c.plotlines.includes(x.id) ? "checked" : ""}/> ${esc(x.title || x.id)}</label>`).join("")
      : '<span class="module-note">暂无故事线可关联</span>';

    return `
    <article class="story-card" data-id="${esc(c.id)}">
      <div class="editor">
        <label>章节标题</label><input data-f="title" value="${esc(c.title)}" />
        <label>章节概要</label><textarea data-f="summary" rows="2">${esc(c.summary)}</textarea>
        <label>本章目标</label><textarea data-f="chapter_goal" rows="2">${esc(c.chapter_goal)}</textarea>
        <label>承接上一章</label><textarea data-f="previous_connection" rows="2">${esc(c.previous_connection)}</textarea>
        <label>情节推进</label><textarea data-f="plot_progress" rows="2">${esc(c.plot_progress)}</textarea>
        <label>人物变化</label><textarea data-f="character_change" rows="2">${esc(c.character_change)}</textarea>
        <label>结尾钩子</label><textarea data-f="ending_hook" rows="2">${esc(c.ending_hook)}</textarea>
        <label>下一章预设</label><textarea data-f="next_setup" rows="2">${esc(c.next_setup)}</textarea>
        <label>未解决问题（一行一个）</label><textarea data-f="unresolved_questions" rows="3">${esc((c.unresolved_questions || []).join("\n"))}</textarea>
        <label>状态</label><select data-f="status">${statusOptions}</select>
        <label>关联人物</label><div class="choice-list">${characterChecks}</div>
        <label>关联故事线</label><div class="choice-list">${plotChecks}</div>
        <div class="inline-actions">
          <button class="btn btn-primary" data-action="save-chapter" data-id="${esc(c.id)}">保存</button>
          <button class="btn btn-secondary" data-action="cancel-chapter">取消</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function renderFeedback() {
  const box = document.getElementById("feedback-list");
  if (!box) return;
  const d = state.data;

  if (!d.feedbacks.length) {
    box.innerHTML = '<p class="module-note">暂无结构化反馈，点击“添加反馈”开始。</p>';
  } else {
    box.innerHTML = d.feedbacks.map((f) => {
      const editing = state.editing.feedbackId === f.id;
      if (!editing) {
        const affects = (f.affects || []).length
          ? f.affects.map((x) => `<span class="chip">${esc(x)}</span>`).join("")
          : '<span class="chip">无影响层级</span>';
        return `
        <article class="story-card" data-id="${esc(f.id)}">
          <div class="story-head">
            <div>
              <h3 class="story-title">${esc(f.target || "未命名反馈")}</h3>
              <div class="badges">
                <span class="badge type">${esc(f.source)}</span>
                <span class="badge status">${esc(f.status)}</span>
              </div>
            </div>
            ${actionButtons("edit-feedback", "delete-feedback", f.id)}
          </div>
          <div class="story-text">问题：${esc(f.problem || "-")}</div>
          <div class="story-text">决策：${esc(f.decision || "-")}</div>
          <div class="chips">${affects}</div>
        </article>`;
      }

      const sourceOptions = FEEDBACK_SOURCE.map((x) => `<option value="${esc(x)}" ${f.source === x ? "selected" : ""}>${esc(x)}</option>`).join("");
      const scopeOptions = FEEDBACK_SCOPE.map((x) => `<option value="${esc(x)}" ${f.scope === x ? "selected" : ""}>${esc(x)}</option>`).join("");
      const statusOptions = FEEDBACK_STATUS.map((x) => `<option value="${esc(x)}" ${f.status === x ? "selected" : ""}>${esc(x)}</option>`).join("");
      const affectChecks = AFFECTS.map((x) => `<label><input type="checkbox" data-f="affects" value="${esc(x)}" ${(f.affects || []).includes(x) ? "checked" : ""}/> ${esc(x)}</label>`).join("");

      return `
      <article class="story-card" data-id="${esc(f.id)}">
        <div class="editor">
          <label>反馈来源</label><select data-f="source">${sourceOptions}</select>
          <label>反馈范围</label><select data-f="scope">${scopeOptions}</select>
          <label>反馈对象</label><input data-f="target" value="${esc(f.target)}" />
          <label>问题判断</label><textarea data-f="problem" rows="2">${esc(f.problem)}</textarea>
          <label>证据依据</label><textarea data-f="evidence" rows="2">${esc(f.evidence)}</textarea>
          <label>调整决策</label><textarea data-f="decision" rows="2">${esc(f.decision)}</textarea>
          <label>影响层级</label><div class="choice-list">${affectChecks}</div>
          <label>处理状态</label><select data-f="status">${statusOptions}</select>
          <div class="inline-actions">
            <button class="btn btn-primary" data-action="save-feedback" data-id="${esc(f.id)}">保存</button>
            <button class="btn btn-secondary" data-action="cancel-feedback">取消</button>
          </div>
        </div>
      </article>`;
    }).join("");
  }

}

function renderAll() {
  renderMeta();
  renderOverview();
  renderSimpleModule("创作定位", state.data.positioning, state.editing.positioning, "edit-positioning-btn", "positioning-form", "positioning-input", "save-positioning", "cancel-positioning", "positioning-view");
  renderSimpleModule("世界设定", state.data.background, state.editing.background, "edit-background-btn", "background-form", "background-input", "save-background", "cancel-background", "background-view");
  renderCharacters();
  renderPlot();
  renderChapters();
  renderFeedback();
}

function updateInList(listKey, id, updater) {
  state.data[listKey] = state.data[listKey].map((x) => (x.id === id ? updater(x) : x));
}

function removeFromList(listKey, id) {
  state.data[listKey] = state.data[listKey].filter((x) => x.id !== id);
}

function bindEvents() {
  document.getElementById("save-project-btn")?.addEventListener("click", saveProject);

  document.getElementById("edit-positioning-btn")?.addEventListener("click", () => {
    state.editing.positioning = !state.editing.positioning;
    renderAll();
  });

  document.getElementById("edit-background-btn")?.addEventListener("click", () => {
    state.editing.background = !state.editing.background;
    renderAll();
  });

  document.getElementById("add-character-btn")?.addEventListener("click", () => {
    const item = normalizeProject({ characters: [{}] }).characters[0];
    item.id = uid("char");
    state.data.characters.push(item);
    state.editing.characterId = item.id;
    renderAll();
  });

  document.getElementById("add-plot-btn")?.addEventListener("click", () => {
    const item = normalizeProject({ plot_threads: [{}] }).plot_threads[0];
    item.id = uid("plot");
    state.data.plot_threads.push(item);
    state.editing.plotId = item.id;
    renderAll();
  });

  document.getElementById("add-chapter-btn")?.addEventListener("click", () => {
    const item = normalizeProject({ chapters: [{}] }).chapters[0];
    item.id = uid("chapter");
    state.data.chapters.push(item);
    state.editing.chapterId = item.id;
    renderAll();
  });

  document.getElementById("add-feedback-btn")?.addEventListener("click", () => {
    const item = normalizeProject({ feedbacks: [{}] }).feedbacks[0];
    item.id = uid("feedback");
    state.data.feedbacks.push(item);
    state.editing.feedbackId = item.id;
    renderAll();
  });

  document.querySelector(".workspace-content")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "save-positioning") {
      state.data.positioning = document.getElementById("positioning-input")?.value || "";
      state.editing.positioning = false;
      renderAll();
      return;
    }
    if (action === "cancel-positioning") {
      state.editing.positioning = false;
      renderAll();
      return;
    }
    if (action === "save-background") {
      state.data.background = document.getElementById("background-input")?.value || "";
      state.editing.background = false;
      renderAll();
      return;
    }
    if (action === "cancel-background") {
      state.editing.background = false;
      renderAll();
      return;
    }

    if (action === "edit-character") { state.editing.characterId = id; renderAll(); return; }
    if (action === "cancel-character") { state.editing.characterId = null; renderAll(); return; }
    if (action === "save-character") {
      const card = btn.closest(".story-card");
      if (!card) return;
      updateInList("characters", id, (x) => ({
        ...x,
        name: card.querySelector('[data-f="name"]')?.value || "",
        role: card.querySelector('[data-f="role"]')?.value || "",
        description: card.querySelector('[data-f="description"]')?.value || "",
        goal: card.querySelector('[data-f="goal"]')?.value || "",
        relationship: card.querySelector('[data-f="relationship"]')?.value || "",
        notes: card.querySelector('[data-f="notes"]')?.value || "",
      }));
      state.editing.characterId = null;
      renderAll();
      return;
    }
    if (action === "delete-character") {
      removeFromList("characters", id);
      state.data.plot_threads = state.data.plot_threads.map((p) => ({ ...p, related_characters: p.related_characters.filter((x) => x !== id) }));
      state.data.chapters = state.data.chapters.map((c) => ({ ...c, characters: c.characters.filter((x) => x !== id) }));
      renderAll();
      return;
    }

    if (action === "edit-plot") { state.editing.plotId = id; renderAll(); return; }
    if (action === "cancel-plot") { state.editing.plotId = null; renderAll(); return; }
    if (action === "save-plot") {
      const card = btn.closest(".story-card");
      if (!card) return;
      const related = Array.from(card.querySelectorAll('[data-f="related_characters"]:checked')).map((x) => x.value);
      updateInList("plot_threads", id, (x) => ({
        ...x,
        title: card.querySelector('[data-f="title"]')?.value || "",
        type: card.querySelector('[data-f="type"]')?.value || "",
        status: card.querySelector('[data-f="status"]')?.value || "进行中",
        description: card.querySelector('[data-f="description"]')?.value || "",
        related_characters: related,
        notes: card.querySelector('[data-f="notes"]')?.value || "",
      }));
      state.editing.plotId = null;
      renderAll();
      return;
    }
    if (action === "delete-plot") {
      removeFromList("plot_threads", id);
      state.data.chapters = state.data.chapters.map((c) => ({ ...c, plotlines: c.plotlines.filter((x) => x !== id) }));
      renderAll();
      return;
    }

    if (action === "edit-chapter") { state.editing.chapterId = id; renderAll(); return; }
    if (action === "cancel-chapter") { state.editing.chapterId = null; renderAll(); return; }
    if (action === "save-chapter") {
      const card = btn.closest(".story-card");
      if (!card) return;
      const characters = Array.from(card.querySelectorAll('[data-f="characters"]:checked')).map((x) => x.value);
      const plotlines = Array.from(card.querySelectorAll('[data-f="plotlines"]:checked')).map((x) => x.value);
      updateInList("chapters", id, (x) => ({
        ...x,
        title: card.querySelector('[data-f="title"]')?.value || "",
        summary: card.querySelector('[data-f="summary"]')?.value || "",
        chapter_goal: card.querySelector('[data-f="chapter_goal"]')?.value || "",
        previous_connection: card.querySelector('[data-f="previous_connection"]')?.value || "",
        plot_progress: card.querySelector('[data-f="plot_progress"]')?.value || "",
        character_change: card.querySelector('[data-f="character_change"]')?.value || "",
        ending_hook: card.querySelector('[data-f="ending_hook"]')?.value || "",
        next_setup: card.querySelector('[data-f="next_setup"]')?.value || "",
        unresolved_questions: (card.querySelector('[data-f="unresolved_questions"]')?.value || "")
          .split(/\n+/)
          .map((t) => t.trim())
          .filter(Boolean),
        status: card.querySelector('[data-f="status"]')?.value || "草稿中",
        characters,
        plotlines,
      }));
      state.editing.chapterId = null;
      renderAll();
      return;
    }
    if (action === "delete-chapter") {
      removeFromList("chapters", id);
      renderAll();
      return;
    }

    if (action === "edit-feedback") { state.editing.feedbackId = id; renderAll(); return; }
    if (action === "cancel-feedback") { state.editing.feedbackId = null; renderAll(); return; }
    if (action === "save-feedback") {
      const card = btn.closest(".story-card");
      if (!card) return;
      const affects = Array.from(card.querySelectorAll('[data-f="affects"]:checked')).map((x) => x.value);
      updateInList("feedbacks", id, (x) => ({
        ...x,
        source: card.querySelector('[data-f="source"]')?.value || "自我复盘",
        scope: card.querySelector('[data-f="scope"]')?.value || "单章",
        target: card.querySelector('[data-f="target"]')?.value || "",
        problem: card.querySelector('[data-f="problem"]')?.value || "",
        evidence: card.querySelector('[data-f="evidence"]')?.value || "",
        decision: card.querySelector('[data-f="decision"]')?.value || "",
        affects,
        status: card.querySelector('[data-f="status"]')?.value || "待处理",
      }));
      state.editing.feedbackId = null;
      renderAll();
      return;
    }
    if (action === "delete-feedback") {
      removeFromList("feedbacks", id);
      renderAll();
    }
  });
}

async function saveProject() {
  const msg = document.getElementById("save-message");
  if (!state.data || !state.projectId) return;

  const payload = {
    schema_version: "0.4",
    title: state.data.title,
    description: state.data.description,
    positioning: state.data.positioning,
    background: state.data.background,
    characters: state.data.characters,
    plot_threads: state.data.plot_threads,
    plotlines: state.data.plot_threads,
    chapters: state.data.chapters,
    feedbacks: state.data.feedbacks,
    feedback_notes: state.data.feedbacks,
    update_notes: Array.isArray(state.data.update_notes) ? state.data.update_notes : [],
    feedback: state.data.feedback || "",
  };

  try {
    const updated = await requestJson(`${API_BASE}/projects/${encodeURIComponent(state.projectId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.data = normalizeProject(updated);
    resetEditFlags();
    renderAll();
    if (msg) msg.textContent = "保存成功。";
  } catch (err) {
    if (msg) msg.textContent = `保存失败：${err.message}`;
  }
}

async function setupProjectPage() {
  state.projectId = getProjectId();
  const msg = document.getElementById("save-message");
  if (!state.projectId) {
    const tip = "缺少项目ID，请从首页项目列表进入。";
    if (msg) msg.textContent = tip;
    const backUrl = `./index.html?error=${encodeURIComponent(tip)}`;
    window.location.href = backUrl;
    return;
  }

  bindEvents();

  try {
    const raw = await requestJson(`${API_BASE}/projects/${encodeURIComponent(state.projectId)}`);
    state.data = normalizeProject(raw);
    resetEditFlags();
    renderAll();
  } catch (err) {
    if (msg) msg.textContent = `加载失败：${err.message}。请确认后端已启动：py -3 -m uvicorn main:app --reload --port 8000`;
  }
}

(function init() {
  const page = document.body.dataset.page;
  if (page === "project") {
    setupProjectPage().catch((err) => {
      const msg = document.getElementById("save-message");
      if (msg) msg.textContent = `初始化失败：${err.message}`;
    });
  }
})();
