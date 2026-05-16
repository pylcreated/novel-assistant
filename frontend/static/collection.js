(async function () {
  const config = window.CollectionConfig;
  const projectId = Api.getParam("project_id");
  const titleNode = document.getElementById("collection-title");
  const backLink = document.getElementById("back-link");
  const list = document.getElementById("item-list");
  const emptyState = document.getElementById("empty-state");
  const newButton = document.getElementById("new-item-button");

  let project = null;
  let items = [];

  if (!projectId || !config) {
    UI.notify("页面参数不完整。", "error");
    return;
  }

  backLink.href = Api.buildUrl("project.html", { project_id: projectId });

  function itemTitle(item) {
    return item[config.titleField] || `未命名${config.itemLabel}`;
  }

  function detailUrl(itemId) {
    return Api.buildUrl(config.detailPage, { project_id: projectId, [config.idName]: itemId });
  }

  function render() {
    titleNode.textContent = `${project.title} · ${config.titleSuffix}`;
    list.innerHTML = "";
    UI.setHidden(emptyState, items.length > 0);

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "chapter-row";
      row.innerHTML = `
        <a href="${detailUrl(item.id)}">${UI.escapeHtml(itemTitle(item))}</a>
        <div class="menu-wrap">
          <button class="dots-button" type="button" data-menu="${item.id}" aria-label="条目菜单">⋮</button>
          <div class="menu hidden">
            <button type="button" data-rename="${item.id}">重命名</button>
            <button type="button" data-delete="${item.id}">删除</button>
          </div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  async function load() {
    try {
      [project, items] = await Promise.all([
        Api.get(`/api/projects/${projectId}`),
        Api.get(`/api/projects/${projectId}/${config.kind}`)
      ]);
      render();
    } catch (error) {
      UI.notify(`载入失败：${error.message}`, "error");
    }
  }

  newButton.addEventListener("click", async () => {
    const title = prompt(`${config.itemLabel}名称`, `未命名${config.itemLabel}`);
    if (title === null) {
      return;
    }
    UI.notify("正在新建");
    try {
      const body = { content: "" };
      body[config.titleField] = title;
      const item = await Api.post(`/api/projects/${projectId}/${config.kind}`, body);
      UI.notify("新建成功");
      window.location.href = detailUrl(item.id);
    } catch (error) {
      UI.notify(`新建失败：${error.message}`, "error");
    }
  });

  list.addEventListener("click", async (event) => {
    const menuButton = event.target.closest("[data-menu]");
    if (menuButton) {
      event.preventDefault();
      event.stopPropagation();
      const menu = menuButton.nextElementSibling;
      const wasHidden = menu.classList.contains("hidden");
      UI.closeMenus();
      menu.classList.toggle("hidden", !wasHidden);
      return;
    }

    const renameButton = event.target.closest("[data-rename]");
    if (renameButton) {
      const item = items.find((entry) => entry.id === renameButton.dataset.rename);
      const title = prompt(`新的${config.itemLabel}名称`, item ? itemTitle(item) : "");
      if (title === null) {
        return;
      }
      UI.notify("正在重命名");
      try {
        const body = {};
        body[config.titleField] = title;
        await Api.put(`/api/projects/${projectId}/${config.kind}/${renameButton.dataset.rename}`, body);
        UI.notify("重命名成功");
        await load();
      } catch (error) {
        UI.notify(`重命名失败：${error.message}`, "error");
      }
      return;
    }

    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      if (!confirm(`确定删除这个${config.itemLabel}吗？`)) {
        return;
      }
      UI.notify("正在删除");
      try {
        await Api.delete(`/api/projects/${projectId}/${config.kind}/${deleteButton.dataset.delete}`);
        UI.notify("删除成功");
        await load();
      } catch (error) {
        UI.notify(`删除失败：${error.message}`, "error");
      }
    }
  });

  await load();
})();
