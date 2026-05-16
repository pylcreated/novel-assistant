(function () {
  let toastTimer = null;

  function notify(message, tone) {
    const toast = document.getElementById("toast");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.className = `toast show ${tone || ""}`.trim();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = "toast";
    }, 2200);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function closeMenus() {
    document.querySelectorAll(".menu:not(.hidden)").forEach((menu) => {
      menu.classList.add("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-wrap")) {
      closeMenus();
    }
  });

  window.UI = {
    notify,
    escapeHtml,
    closeMenus,
    setHidden(element, hidden) {
      if (element) {
        element.classList.toggle("hidden", hidden);
      }
    }
  };
})();
