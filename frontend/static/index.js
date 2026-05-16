(async function () {
  const list = document.getElementById("project-list");
  const emptyState = document.getElementById("empty-state");
  const panel = document.getElementById("new-project-panel");
  const titleInput = document.getElementById("project-title");
  const descriptionInput = document.getElementById("project-description");
  const newButton = document.getElementById("new-project-button");
  const createButton = document.getElementById("create-project-button");
  const cancelButton = document.getElementById("cancel-project-button");

  function formatDate(value) {
    if (!value) {
      return "未记录";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "未记录";
    }
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function render(projects) {
    list.innerHTML = "";
    UI.setHidden(emptyState, projects.length > 0);

    projects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.innerHTML = `
        <a class="project-cover" href="${Api.buildUrl("project.html", { project_id: project.id })}" aria-label="进入作品">
          <span>${UI.escapeHtml((project.title || "未命名").slice(0, 1))}</span>
        </a>
        <div class="project-card-body">
          <h3>${UI.escapeHtml(project.title)}</h3>
          <p>${UI.escapeHtml(project.description || "没有简介。")}</p>
          <dl class="project-meta">
            <div><dt>创建</dt><dd>${formatDate(project.created_at)}</dd></div>
            <div><dt>更新</dt><dd>${formatDate(project.updated_at)}</dd></div>
          </dl>
          <a class="button soft enter-button" href="${Api.buildUrl("project.html", { project_id: project.id })}">进入作品</a>
        </div>
      `;
      list.appendChild(card);
    });
  }

  async function loadProjects() {
    try {
      const projects = await Api.get("/api/projects");
      render(projects);
    } catch (error) {
      UI.notify(`作品列表载入失败：${error.message}`, "error");
    }
  }

  newButton.addEventListener("click", () => {
    panel.classList.remove("hidden");
    titleInput.focus();
  });

  cancelButton.addEventListener("click", () => {
    panel.classList.add("hidden");
    titleInput.value = "";
    descriptionInput.value = "";
  });

  createButton.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    if (!title) {
      UI.notify("请先写作品名。", "error");
      titleInput.focus();
      return;
    }

    createButton.disabled = true;
    UI.notify("正在新建作品");
    try {
      const project = await Api.post("/api/projects", {
        title,
        description: descriptionInput.value
      });
      UI.notify("新建成功");
      window.location.href = Api.buildUrl("project.html", { project_id: project.id });
    } catch (error) {
      UI.notify(`新建失败：${error.message}`, "error");
    } finally {
      createButton.disabled = false;
    }
  });

  await loadProjects();
})();
