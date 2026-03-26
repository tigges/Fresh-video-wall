(() => {
  const CONTENT_URL = "./site-content.json";
  const PAGE_MAP = Object.freeze({
    home: "home",
    video: "video",
    "audio-more": "audio",
    contact: "contact",
  });

  function getByPath(source, path) {
    if (!source || !path) {
      return undefined;
    }
    return path.split(".").reduce((value, key) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return value[key];
    }, source);
  }

  function resolvePath(content, pageKey, rawPath) {
    if (!rawPath || typeof rawPath !== "string") {
      return undefined;
    }
    const path = rawPath.trim();
    if (!path) {
      return undefined;
    }
    if (path.startsWith("page.")) {
      return getByPath(content?.pages?.[pageKey], path.slice(5));
    }
    if (path.startsWith("global.")) {
      return getByPath(content?.global, path.slice(7));
    }
    return getByPath(content, path);
  }

  function applyTextBindings(content, pageKey) {
    document.querySelectorAll("[data-cms-text]").forEach((node) => {
      const path = node.getAttribute("data-cms-text");
      const value = resolvePath(content, pageKey, path);
      if (typeof value === "string" && value.trim()) {
        node.textContent = value;
      }
    });
  }

  function applyHrefBindings(content, pageKey) {
    document.querySelectorAll("[data-cms-href]").forEach((node) => {
      const path = node.getAttribute("data-cms-href");
      const value = resolvePath(content, pageKey, path);
      if (!(node instanceof HTMLAnchorElement)) {
        return;
      }
      if (typeof value === "string" && value.trim()) {
        node.href = value;
      }
    });
  }

  function applyActionBindings(content, pageKey) {
    document.querySelectorAll("[data-cms-action]").forEach((node) => {
      const path = node.getAttribute("data-cms-action");
      const value = resolvePath(content, pageKey, path);
      if (!(node instanceof HTMLFormElement)) {
        return;
      }
      if (typeof value === "string" && value.trim()) {
        node.action = value;
      }
    });
  }

  function applyVisibilityBindings(content, pageKey) {
    document.querySelectorAll("[data-cms-visible-if]").forEach((node) => {
      const path = node.getAttribute("data-cms-visible-if");
      const value = resolvePath(content, pageKey, path);
      if (typeof value === "boolean") {
        node.hidden = !value;
      }
    });
  }

  function applySocialBindings(content) {
    document.querySelectorAll("[data-cms-social]").forEach((node) => {
      if (!(node instanceof HTMLAnchorElement)) {
        return;
      }
      const key = node.getAttribute("data-cms-social");
      if (!key) {
        return;
      }
      const social = content?.global?.socialLinks?.[key];
      if (!social || typeof social !== "object") {
        return;
      }
      if (social.enabled === false) {
        node.hidden = true;
        return;
      }
      if (typeof social.url === "string" && social.url.trim()) {
        node.href = social.url;
      }
      if (typeof social.label === "string" && social.label.trim()) {
        node.setAttribute("aria-label", social.label);
      }
      if (social.openInNewTab === true) {
        node.target = "_blank";
        node.rel = "noopener noreferrer";
      } else if (social.openInNewTab === false) {
        node.removeAttribute("target");
        node.removeAttribute("rel");
      }
    });
  }

  async function loadAndApplyContent() {
    const page = document.body?.dataset?.page;
    const pageKey = PAGE_MAP[page] || "";
    if (!pageKey) {
      return;
    }
    try {
      const response = await fetch(CONTENT_URL, { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const content = await response.json();
      window.__SITE_CONTENT = content;
      applyTextBindings(content, pageKey);
      applyHrefBindings(content, pageKey);
      applyActionBindings(content, pageKey);
      applyVisibilityBindings(content, pageKey);
      applySocialBindings(content);
      window.dispatchEvent(
        new CustomEvent("site-content:applied", {
          detail: { page: pageKey },
        }),
      );
    } catch {
      // Preserve static fallbacks when remote content is unavailable.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAndApplyContent, { once: true });
  } else {
    loadAndApplyContent();
  }
})();
