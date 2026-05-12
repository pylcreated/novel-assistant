const API_BASE = "http://127.0.0.1:8000/api";

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

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function setupIndexPage() {
  const list = document.getElementById("project-list");
  const form = document.getElementById("create-project-form");
  const msg = document.getElementById("create-message");
  const refreshBtn = document.getElementById("refresh-projects-btn");
  const titleInput = document.getElementById("title");
  const descInput = document.getElementById("description");
  if (!list || !form || !msg || !titleInput || !descInput) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("error")) {
    msg.textContent = params.get("error");
  }
  if (!titleInput.value && params.get("title")) titleInput.value = params.get("title");
  if (!descInput.value && params.get("description")) descInput.value = params.get("description");

  async function renderList() {
    try {
      const data = await requestJson(`${API_BASE}/projects`);
      if (!data.projects?.length) {
        list.innerHTML = '<p class="module-note">还没有项目，先创建一个吧。</p>';
        return;
      }
      list.innerHTML = data.projects
        .map(
          (p) => `
            <article class="project-card">
              <h3>${esc(p.title || "未命名项目")}</h3>
              <div class="story-text">${esc(p.description || "暂无简介")}</div>
              <div class="project-meta">更新时间：${esc(formatDate(p.updated_at))}</div>
              <div class="project-actions">
                <a class="btn btn-secondary" href="./project.html?id=${encodeURIComponent(p.id)}">进入工作台</a>
                <button type="button" class="btn btn-danger" data-action="delete-project" data-id="${esc(p.id)}">删除</button>
              </div>
            </article>
          `,
        )
        .join("");
    } catch (err) {
      list.innerHTML = '<p class="module-note">项目列表加载失败，请确认后端已启动。</p>';
      msg.textContent = `加载失败：${err.message}`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    if (!title) {
      msg.textContent = "请先填写小说标题。";
      titleInput.focus();
      return;
    }

    try {
      const created = await requestJson(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      msg.textContent = "项目已创建，正在进入工作台。";
      await renderList();
      if (created?.id) {
        window.location.href = `./project.html?id=${encodeURIComponent(created.id)}`;
      }
    } catch (err) {
      msg.textContent = `创建失败：${err.message}。请确认后端已启动：py -3 -m uvicorn main:app --reload --port 8000`;
    }
  });

  list.addEventListener("click", async (e) => {
    const btn = e.target.closest('button[data-action="delete-project"]');
    if (!btn) return;
    const projectId = btn.dataset.id;
    if (!projectId) return;
    if (!window.confirm("确认删除这个项目吗？删除后无法恢复。")) return;

    const pid = encodeURIComponent(projectId);
    const attempts = [
      { url: `${API_BASE}/projects/${pid}`, options: { method: "DELETE" } },
      { url: `${API_BASE}/projects/${pid}/`, options: { method: "DELETE" } },
      { url: `${API_BASE}/projects/${pid}/delete`, options: { method: "POST" } },
      { url: `${API_BASE}/projects/${pid}/remove`, options: { method: "POST" } },
    ];

    let ok = false;
    let lastError = null;
    for (const req of attempts) {
      try {
        await requestJson(req.url, req.options);
        ok = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!ok) {
      msg.textContent = `删除失败：${lastError ? lastError.message : "未知错误"}`;
      return;
    }

    msg.textContent = "项目已删除。";
    await renderList();
  });

  refreshBtn?.addEventListener("click", async () => {
    msg.textContent = "";
    await renderList();
  });

  await renderList();
}

setupIndexPage().catch((err) => {
  const msg = document.getElementById("create-message");
  if (msg) msg.textContent = `初始化失败：${err.message}`;
});
