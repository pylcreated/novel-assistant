(async function () {
  const projectId = Api.getParam("project_id");
  const backLink = document.getElementById("back-link");
  const projectName = document.getElementById("project-name");
  const collectionList = document.getElementById("collection-list");
  const modal = document.getElementById("create-modal");
  const modalTitle = document.getElementById("create-modal-title");
  const modalLabel = document.getElementById("create-modal-label");
  const modalInput = document.getElementById("create-modal-input");
  const modalStatus = document.getElementById("create-modal-status");
  const modalConfirm = document.getElementById("create-modal-confirm");
  const modalCancel = document.getElementById("create-modal-cancel");

  const configs = [
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

  const state = {
    project: null,
    expanded: new Set(),
    characters: [],
    foreshadows: [],
    plotlines: []
  };
  let pendingCreateConfig = null;
  let loadedOnce = false;

  if (!projectId) {
    UI.notify("缺少 project_id", "error");
    return;
  }

  backLink.href = Api.buildUrl("project.html", { project_id: projectId });

  function getConfig(kind) {
    return configs.find((config) => config.kind === kind);
  }

  function itemTitle(config, item) {
    const title = item[config.titleField];
    return typeof title === "string" && title.trim() ? title.trim() : config.defaultTitle;
  }

  function detailUrl(config, itemId) {
    return Api.buildUrl(config.detailPage, { project_id: projectId, [config.idName]: itemId });
  }

  function renderCollection(config) {
    const items = state[config.kind] || [];
    const isOpen = state.expanded.has(config.kind);
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
        link.textContent = itemTitle(config, item);
        body.appendChild(link);
      });
    }

    return section;
  }

  function render() {
    projectName.textContent = state.project ? state.project.title : "作品";
    collectionList.innerHTML = "";
    configs.forEach((config) => {
      collectionList.appendChild(renderCollection(config));
    });
  }

  async function load() {
    try {
      const [project, characters, foreshadows, plotlines] = await Promise.all([
        Api.get(`/api/projects/${projectId}`),
        Api.get(`/api/projects/${projectId}/characters`),
        Api.get(`/api/projects/${projectId}/foreshadows`),
        Api.get(`/api/projects/${projectId}/plotlines`)
      ]);
      state.project = project;
      state.characters = characters;
      state.foreshadows = foreshadows;
      state.plotlines = plotlines;
      loadedOnce = true;
      render();
    } catch (error) {
      UI.notify(`载入失败：${error.message}`, "error");
    }
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

  async function createItem(config, rawTitle) {
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

  modalConfirm.addEventListener("click", () => {
    if (pendingCreateConfig) {
      createItem(pendingCreateConfig, modalInput.value);
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
      createItem(pendingCreateConfig, modalInput.value);
    }
    if (event.key === "Escape") {
      closeCreateModal();
    }
  });

  collectionList.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-kind]");
    if (toggle) {
      const kind = toggle.dataset.toggleKind;
      if (state.expanded.has(kind)) {
        state.expanded.delete(kind);
      } else {
        state.expanded.add(kind);
      }
      render();
      return;
    }

    const create = event.target.closest("[data-create-kind]");
    if (create) {
      event.preventDefault();
      event.stopPropagation();
      openCreateModal(getConfig(create.dataset.createKind));
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted || loadedOnce) {
      load();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && loadedOnce) {
      load();
    }
  });

  await load();
})();
