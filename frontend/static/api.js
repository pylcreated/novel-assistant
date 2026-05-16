(function () {
  async function request(path, options) {
    const init = options || {};
    const headers = new Headers(init.headers || {});
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(path, { ...init, headers });
    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data && data.detail ? data.detail : "请求失败";
      throw new Error(message);
    }
    return data;
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function buildUrl(page, params) {
    const url = new URL(page, window.location.href);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    return `${url.pathname.split("/").pop()}${url.search}`;
  }

  window.Api = {
    getParam,
    buildUrl,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: "DELETE" })
  };
})();
