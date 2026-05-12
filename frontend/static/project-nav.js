(function () {
  function switchModule(module) {
    const target = module || "overview";
    document.querySelectorAll(".module-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.module === target);
    });
    document.querySelectorAll(".module").forEach((section) => {
      section.classList.toggle("hidden", section.dataset.module !== target);
    });
  }

  function bindNav() {
    const nav = document.getElementById("module-nav");
    if (!nav) return;

    nav.addEventListener("click", (event) => {
      const btn = event.target.closest(".module-item");
      if (!btn) return;
      event.preventDefault();
      switchModule(btn.dataset.module);
    });

    const first = nav.querySelector(".module-item.active") || nav.querySelector(".module-item");
    switchModule(first ? first.dataset.module : "overview");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindNav);
  } else {
    bindNav();
  }
})();
