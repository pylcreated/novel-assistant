(function () {
  function createEditor(options) {
    const textarea = document.getElementById("content-editor");
    const titleInput = document.getElementById("title-input");
    const status = document.getElementById("save-status");
    const saveButton = document.getElementById("save-button");
    let saveTimer = null;
    let currentItem = null;
    let currentContent = "";
    let currentTitle = "";

    function setStatus(text, tone) {
      status.textContent = text;
      status.dataset.tone = tone || "";
    }

    function cacheDraft() {
      localStorage.setItem(options.draftKey, JSON.stringify({
        title: titleInput ? titleInput.value : currentTitle,
        content: textarea.value
      }));
    }

    function readDraft() {
      const raw = localStorage.getItem(options.draftKey);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw);
      } catch {
        return { content: raw };
      }
    }

    function clearDraft() {
      localStorage.removeItem(options.draftKey);
    }

    async function save() {
      clearTimeout(saveTimer);
      setStatus("正在保存", "saving");
      saveButton.disabled = true;
      try {
        const payload = { content: textarea.value };
        if (titleInput && options.titleField) {
          payload[options.titleField] = titleInput.value.trim() || options.defaultTitle || "未命名";
        }
        const saved = await options.save(payload);
        currentItem = saved;
        currentContent = saved.content || "";
        currentTitle = options.titleField ? saved[options.titleField] || "" : "";
        if (titleInput) {
          titleInput.value = currentTitle;
        }
        if (options.onTitleChange) {
          options.onTitleChange(currentTitle);
        }
        clearDraft();
        setStatus("已保存", "saved");
        UI.notify("已保存");
      } catch (error) {
        setStatus("保存失败", "error");
        UI.notify(`保存失败：${error.message}`, "error");
      } finally {
        saveButton.disabled = false;
      }
    }

    function markDirty() {
      cacheDraft();
      setStatus("草稿未保存", "dirty");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 1500);
    }

    async function load() {
      try {
        const data = await options.load();
        currentItem = data;
        currentContent = data.content || "";
        currentTitle = options.titleField ? data[options.titleField] || "" : "";

        const draft = readDraft();
        textarea.value = draft && draft.content !== undefined ? draft.content : currentContent;
        if (titleInput) {
          titleInput.value = draft && draft.title !== undefined ? draft.title : currentTitle;
        }

        const hasDraft = Boolean(draft) && (
          textarea.value !== currentContent ||
          (titleInput && titleInput.value !== currentTitle)
        );
        setStatus(hasDraft ? "草稿未保存" : "已保存", hasDraft ? "dirty" : "saved");
        if (titleInput) {
          titleInput.focus();
        } else {
          textarea.focus();
        }
      } catch (error) {
        setStatus("载入失败", "error");
        UI.notify(`载入失败：${error.message}`, "error");
      }
    }

    function getCurrentItem() {
      return currentItem;
    }

    textarea.addEventListener("input", markDirty);
    if (titleInput) {
      titleInput.addEventListener("input", markDirty);
    }
    saveButton.addEventListener("click", save);

    window.addEventListener("beforeunload", () => {
      const dirtyContent = textarea.value !== currentContent;
      const dirtyTitle = titleInput && titleInput.value !== currentTitle;
      if (dirtyContent || dirtyTitle) {
        cacheDraft();
      }
    });

    return { load, save, getCurrentItem };
  }

  async function loadProject(projectId) {
    return Api.get(`/api/projects/${projectId}`);
  }

  function buildBackUrl(listPage, projectId) {
    const [page, query = ""] = listPage.split("?");
    const params = Object.fromEntries(new URLSearchParams(query));
    params.project_id = projectId;
    return Api.buildUrl(page, params);
  }

  async function initChapter() {
    const projectId = Api.getParam("project_id");
    const chapterId = Api.getParam("chapter_id");
    const titleNode = document.getElementById("editor-title");
    const kickerNode = document.getElementById("editor-kicker");
    const backLink = document.getElementById("back-link");
    const deleteButton = document.getElementById("delete-item-button");
    backLink.href = Api.buildUrl("project.html", { project_id: projectId });

    if (!projectId || !chapterId) {
      UI.notify("页面参数不完整。", "error");
      return;
    }

    const editor = createEditor({
      draftKey: `novel:draft:chapter:${projectId}:${chapterId}`,
      load: async () => {
        const [project, chapter] = await Promise.all([
          loadProject(projectId),
          Api.get(`/api/projects/${projectId}/chapters/${chapterId}`)
        ]);
        if (kickerNode) {
          kickerNode.textContent = project.title;
        }
        titleNode.textContent = chapter.title;
        return chapter;
      },
      save: (payload) => Api.put(`/api/projects/${projectId}/chapters/${chapterId}`, {
        content: payload.content
      })
    });

    if (deleteButton) {
      deleteButton.addEventListener("click", async () => {
        if (!confirm("确定删除这个章节吗？")) {
          return;
        }
        try {
          await Api.delete(`/api/projects/${projectId}/chapters/${chapterId}`);
          UI.notify("删除成功");
          window.location.href = Api.buildUrl("project.html", { project_id: projectId });
        } catch (error) {
          UI.notify(`删除失败：${error.message}`, "error");
        }
      });
    }

    await editor.load();
  }

  async function initEntry(config) {
    const projectId = Api.getParam("project_id");
    const itemId = Api.getParam(config.idName);
    const titleNode = document.getElementById("editor-title");
    const kickerNode = document.getElementById("editor-kicker");
    const backLink = document.getElementById("back-link");
    const deleteButton = document.getElementById("delete-item-button");
    backLink.href = buildBackUrl(config.listPage, projectId);

    if (!projectId || !itemId) {
      UI.notify("页面参数不完整。", "error");
      return;
    }

    const editor = createEditor({
      draftKey: `novel:draft:${config.kind}:${projectId}:${itemId}`,
      titleField: config.titleField,
      defaultTitle: `未命名${config.itemLabel}`,
      onTitleChange: (title) => {
        titleNode.textContent = title || `未命名${config.itemLabel}`;
      },
      load: async () => {
        const [project, item] = await Promise.all([
          loadProject(projectId),
          Api.get(`/api/projects/${projectId}/${config.kind}/${itemId}`)
        ]);
        kickerNode.textContent = `${project.title} · ${config.titleSuffix}`;
        titleNode.textContent = item[config.titleField] || `未命名${config.itemLabel}`;
        return item;
      },
      save: (payload) => Api.put(`/api/projects/${projectId}/${config.kind}/${itemId}`, payload)
    });

    deleteButton.addEventListener("click", async () => {
      if (!confirm(`确定删除这个${config.itemLabel}吗？`)) {
        return;
      }
      try {
        await Api.delete(`/api/projects/${projectId}/${config.kind}/${itemId}`);
        UI.notify("删除成功");
        window.location.href = buildBackUrl(config.listPage, projectId);
      } catch (error) {
        UI.notify(`删除失败：${error.message}`, "error");
      }
    });

    await editor.load();
  }

  window.EditorPage = {
    initChapter,
    initEntry
  };
})();
