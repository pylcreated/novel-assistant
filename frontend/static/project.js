(async function () {
  const projectId = Api.getParam("project_id");
  const initialTab = Api.getParam("tab") || "chapters";
  const titleNode = document.getElementById("project-title");
  const addButton = document.getElementById("add-button");
  const addMenu = document.getElementById("add-menu");
  const newVolumeButton = document.getElementById("new-volume-button");
  const newChapterButton = document.getElementById("new-chapter-button");
  const volumeList = document.getElementById("volume-list");
  const emptyChapters = document.getElementById("empty-chapters");
  const collectionList = document.getElementById("collection-list");
  const modal = document.getElementById("create-modal");
  const modalTitle = document.getElementById("create-modal-title");
  const modalLabel = document.getElementById("create-modal-label");
  const modalInput = document.getElementById("create-modal-input");
  const modalStatus = document.getElementById("create-modal-status");
  const modalConfirm = document.getElementById("create-modal-confirm");
  const modalCancel = document.getElementById("create-modal-cancel");

  const relatedConfigs = [
    {
      kind: "characters",
      title: "人物集",
      titleField: "name",
      itemLabel: "人物",
      defaultTitle: "未命名人物",
      detailPage: "character_detail.html",
      idName: "character_id"
    },
    {
      kind: "foreshadows",
      title: "伏笔集",
      titleField: "title",
      itemLabel: "伏笔",
      defaultTitle: "未命名伏笔",
      detailPage: "foreshadow_detail.html",
      idName: "foreshadow_id"
    },
    {
      kind: "plotlines",
      title: "情节线集",
      titleField: "title",
      itemLabel: "情节线",
      defaultTitle: "未命名情节线",
      detailPage: "plotline_detail.html",
      idName: "plotline_id"
    }
  ];

  let project = null;
  let volumes = [];
  let chapters = [];
  const related = {
    characters: [],
    foreshadows: [],
    plotlines: []
  };
  const expandedCollections = new Set();
  let pendingCreateConfig = null;

  if (!projectId) {
    UI.notify("缺少 project_id", "error");
    return;
  }

  function volumeExpandedKey(volumeId) {
    return `novel:volume:${projectId}:${volumeId}:expanded`;
  }

  function isVolumeExpanded(volumeId) {
    return localStorage.getItem(volumeExpandedKey(volumeId)) !== "false";
  }

  function setVolumeExpanded(volumeId, value) {
    localStorage.setItem(volumeExpandedKey(volumeId), value ? "true" : "false");
  }

  function chapterUrl(chapterId) {
    return Api.buildUrl("chapter.html", { project_id: projectId, chapter_id: chapterId });
  }

  function detailUrl(config, itemId) {
    return Api.buildUrl(config.detailPage, { project_id: projectId, [config.idName]: itemId });
  }

  function relatedItemTitle(config, item) {
    const value = item[config.titleField];
    return typeof value === "string" && value.trim() ? value.trim() : config.defaultTitle;
  }

  function getRelatedConfig(kind) {
    return relatedConfigs.find((config) => config.kind === kind);
  }

  function renderChapters() {
    volumeList.innerHTML = "";
    UI.setHidden(emptyChapters, volumes.length > 0);

    volumes.forEach((volume) => {
      const open = isVolumeExpanded(volume.id);
      const volumeChapters = chapters
        .filter((chapter) => chapter.volume_id === volume.id)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

      const section = document.createElement("section");
      section.className = "volume-card";
      section.innerHTML = `
        <div class="volume-card-head">
          <button class="volume-title" type="button" data-volume-toggle="${volume.id}">
            <span class="chevron">${open ? "⌄" : "›"}</span>
            <span>
              <strong>${UI.escapeHtml(volume.title)}</strong>
              <small>${volumeChapters.length} 个章节</small>
            </span>
          </button>
          <div class="menu-wrap">
            <button class="dots-button" type="button" data-volume-menu="${volume.id}" aria-label="分卷菜单">⋮</button>
            <div class="menu hidden">
              <button type="button" data-rename-volume="${volume.id}">重命名该卷</button>
              <button type="button" data-delete-volume="${volume.id}">删除该卷</button>
            </div>
          </div>
        </div>
        <div class="chapter-list ${open ? "" : "hidden"}" data-volume-body="${volume.id}"></div>
      `;

      const chapterList = section.querySelector("[data-volume-body]");
      if (volumeChapters.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty small";
        empty.textContent = "这一卷还没有章节。";
        chapterList.appendChild(empty);
      }

      volumeChapters.forEach((chapter) => {
        const row = document.createElement("a");
        row.className = "chapter-row";
        row.href = chapterUrl(chapter.id);
        row.innerHTML = `
          <span>${UI.escapeHtml(chapter.title)}</span>
          <small>进入正文</small>
        `;
        chapterList.appendChild(row);
      });

      volumeList.appendChild(section);
    });
  }

  function renderRelatedCollection(config) {
    const items = related[config.kind] || [];
    const isOpen = expandedCollections.has(config.kind);
    const section = document.createElement("section");
    section.className = "collection-card";
    section.dataset.kind = config.kind;
    section.innerHTML = `
      <div class="collection-head">
        <button class="collection-toggle" type="button" data-toggle-kind="${config.kind}">
          <span class="chevron">${isOpen ? "⌄" : "›"}</span>
          <span>
            <strong>${config.title}</strong>
            <small>${items.length} 个条目</small>
          </span>
        </button>
        <button class="collection-add" type="button" data-create-kind="${config.kind}" aria-label="新建${config.itemLabel}">+</button>
      </div>
      <div class="collection-body ${isOpen ? "" : "hidden"}" data-body-kind="${config.kind}"></div>
    `;

    const body = section.querySelector("[data-body-kind]");
    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty small";
      empty.textContent = `还没有${config.itemLabel}。`;
      body.appendChild(empty);
    } else {
      items.forEach((item) => {
        const link = document.createElement("a");
        link.className = "collection-row";
        link.href = detailUrl(config, item.id);
        link.textContent = relatedItemTitle(config, item);
        body.appendChild(link);
      });
    }

    return section;
  }

  function renderRelated() {
    collectionList.innerHTML = "";
    relatedConfigs.forEach((config) => {
      collectionList.appendChild(renderRelatedCollection(config));
    });
  }

  function render() {
    titleNode.textContent = project ? project.title : "作品";
    renderChapters();
    renderRelated();
  }

  async function load() {
    try {
      [project, volumes, chapters, related.characters, related.foreshadows, related.plotlines] = await Promise.all([
        Api.get(`/api/projects/${projectId}`),
        Api.get(`/api/projects/${projectId}/volumes`),
        Api.get(`/api/projects/${projectId}/chapters`),
        Api.get(`/api/projects/${projectId}/characters`),
        Api.get(`/api/projects/${projectId}/foreshadows`),
        Api.get(`/api/projects/${projectId}/plotlines`)
      ]);
      render();
    } catch (error) {
      UI.notify(`载入失败：${error.message}`, "error");
    }
  }

  function activateTab(tabName, updateUrl) {
    document.querySelectorAll("[data-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.tab === tabName);
    });
    document.getElementById("chapters-tab").classList.toggle("hidden", tabName !== "chapters");
    document.getElementById("related-tab").classList.toggle("hidden", tabName !== "related");

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (tabName === "related") {
        url.searchParams.set("tab", "related");
      } else {
        url.searchParams.delete("tab");
      }
      history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }

  function chooseVolume() {
    if (volumes.length === 0) {
      UI.notify("请先新建分卷。", "error");
      return null;
    }
    const volumeText = volumes.map((volume, index) => `${index + 1}. ${volume.title}`).join("\n");
    const choice = prompt(`选择分卷编号：\n${volumeText}`, "1");
    if (choice === null) {
      return null;
    }
    const volume = volumes[Number(choice) - 1];
    if (!volume) {
      UI.notify("分卷编号无效。", "error");
      return null;
    }
    return volume;
  }

  function openCreateModal(config) {
    pendingCreateConfig = config;
    modalTitle.textContent = `新建${config.itemLabel}`;
    modalLabel.textContent = `${config.itemLabel}名称`;
    modalInput.value = "";
    modalInput.placeholder = config.defaultTitle;
    modalStatus.textContent = "";
    modalConfirm.disabled = false;
    modal.classList.remove("hidden");
    modalInput.focus();
  }

  function closeCreateModal() {
    modal.classList.add("hidden");
    pendingCreateConfig = null;
    modalStatus.textContent = "";
  }

  async function createRelatedItem(config, rawTitle) {
    const title = (rawTitle || "").trim() || config.defaultTitle;
    UI.notify(`正在新建${config.itemLabel}`);
    modalStatus.textContent = "正在创建";
    modalConfirm.disabled = true;
    try {
      const body = { content: "" };
      body[config.titleField] = title;
      const item = await Api.post(`/api/projects/${projectId}/${config.kind}`, body);
      UI.notify("新建成功");
      window.location.href = detailUrl(config, item.id);
    } catch (error) {
      modalStatus.textContent = "创建失败";
      modalConfirm.disabled = false;
      UI.notify(`新建失败：${error.message}`, "error");
    }
  }

  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const wasHidden = addMenu.classList.contains("hidden");
    UI.closeMenus();
    addMenu.classList.toggle("hidden", !wasHidden);
  });

  newVolumeButton.addEventListener("click", async () => {
    const title = prompt("分卷名", `第${volumes.length + 1}卷`);
    if (title === null) {
      return;
    }
    UI.notify("正在新建分卷");
    try {
      await Api.post(`/api/projects/${projectId}/volumes`, { title });
      UI.notify("新建成功");
      UI.closeMenus();
      await load();
    } catch (error) {
      UI.notify(`新建失败：${error.message}`, "error");
    }
  });

  newChapterButton.addEventListener("click", async () => {
    const volume = chooseVolume();
    if (!volume) {
      return;
    }
    const title = prompt("章节名", "未命名章节");
    if (title === null) {
      return;
    }

    UI.notify("正在新建章节");
    try {
      const chapter = await Api.post(`/api/projects/${projectId}/chapters`, {
        title,
        volume_id: volume.id
      });
      UI.notify("新建成功");
      window.location.href = chapterUrl(chapter.id);
    } catch (error) {
      UI.notify(`新建失败：${error.message}`, "error");
    }
  });

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab, true));
  });

  volumeList.addEventListener("click", async (event) => {
    const menuButton = event.target.closest("[data-volume-menu]");
    if (menuButton) {
      event.stopPropagation();
      const menu = menuButton.nextElementSibling;
      const wasHidden = menu.classList.contains("hidden");
      UI.closeMenus();
      menu.classList.toggle("hidden", !wasHidden);
      return;
    }

    const toggle = event.target.closest("[data-volume-toggle]");
    if (toggle) {
      const volumeId = toggle.dataset.volumeToggle;
      setVolumeExpanded(volumeId, !isVolumeExpanded(volumeId));
      renderChapters();
      return;
    }

    const renameButton = event.target.closest("[data-rename-volume]");
    if (renameButton) {
      const volume = volumes.find((item) => item.id === renameButton.dataset.renameVolume);
      const title = prompt("新的分卷名", volume ? volume.title : "");
      if (title === null) {
        return;
      }
      UI.notify("正在重命名");
      try {
        await Api.put(`/api/projects/${projectId}/volumes/${renameButton.dataset.renameVolume}`, { title });
        UI.notify("重命名成功");
        await load();
      } catch (error) {
        UI.notify(`重命名失败：${error.message}`, "error");
      }
      return;
    }

    const deleteButton = event.target.closest("[data-delete-volume]");
    if (deleteButton) {
      if (!confirm("确定删除这个分卷吗？该卷下的章节也会一起删除。")) {
        return;
      }
      UI.notify("正在删除");
      try {
        await Api.delete(`/api/projects/${projectId}/volumes/${deleteButton.dataset.deleteVolume}`);
        UI.notify("删除成功");
        await load();
      } catch (error) {
        UI.notify(`删除失败：${error.message}`, "error");
      }
    }
  });

  collectionList.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-kind]");
    if (toggle) {
      const kind = toggle.dataset.toggleKind;
      if (expandedCollections.has(kind)) {
        expandedCollections.delete(kind);
      } else {
        expandedCollections.add(kind);
      }
      renderRelated();
      return;
    }

    const create = event.target.closest("[data-create-kind]");
    if (create) {
      event.preventDefault();
      event.stopPropagation();
      openCreateModal(getRelatedConfig(create.dataset.createKind));
    }
  });

  modalConfirm.addEventListener("click", () => {
    if (pendingCreateConfig) {
      createRelatedItem(pendingCreateConfig, modalInput.value);
    }
  });

  modalCancel.addEventListener("click", closeCreateModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeCreateModal();
    }
  });
  modalInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && pendingCreateConfig) {
      createRelatedItem(pendingCreateConfig, modalInput.value);
    }
    if (event.key === "Escape") {
      closeCreateModal();
    }
  });

  window.addEventListener("pageshow", () => {
    load();
  });

  activateTab(initialTab === "related" ? "related" : "chapters", false);
  await load();
})();
