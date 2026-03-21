const yearNode = document.getElementById("year");
const FALLBACK_YOUTUBE_URL = "https://m.youtube.com/@dj_urbant";

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const page = document.body.dataset.page;
const GENRE_BADGE_LABEL = "\u{1F50A} Bass House";

function initHeaderVisibilityOnScroll() {
  const siteHeader = document.querySelector(".site-header");
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.add("is-visible");
}

function initHeaderContentOffset() {
  const siteHeader = document.querySelector(".site-header");
  if (!siteHeader) {
    return;
  }

  const applyOffset = () => {
    const headerHeight = Math.ceil(siteHeader.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-offset", `${headerHeight}px`);
  };

  applyOffset();
  window.addEventListener("resize", applyOffset, { passive: true });
  window.addEventListener("orientationchange", applyOffset);

  if ("ResizeObserver" in window) {
    const headerResizeObserver = new ResizeObserver(applyOffset);
    headerResizeObserver.observe(siteHeader);
  }

  document.fonts?.ready?.then(applyOffset).catch(() => {});
}

function formatCount(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function normalizeBrandTitle(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  const token = "__DJ_UrbanT_TOKEN__";
  return value
    .replace(/\bDJ\s*UrbanT\b/gi, token)
    .replace(/\burbant\b/gi, "DJ UrbanT")
    .replace(new RegExp(token, "g"), "DJ UrbanT");
}

function extractSetLabel(title) {
  if (typeof title !== "string") {
    return "#000";
  }
  const setHashMatch = title.match(/#\s*(\d{1,4})\b/i);
  if (setHashMatch?.[1]) {
    return `#${setHashMatch[1]}`;
  }
  const setWordMatch = title.match(/\bset\s*#?\s*(\d{1,4})\b/i);
  if (setWordMatch?.[1]) {
    return `#${setWordMatch[1]}`;
  }
  return "#000";
}

function applyHeroFontVariant() {
  const fontParam = new URLSearchParams(window.location.search).get("heroFont");
  if (!fontParam) {
    return;
  }
  const normalized = fontParam.trim().toLowerCase();
  if (!["current", "montserrat", "russo"].includes(normalized)) {
    return;
  }
  document.body.dataset.heroFont = normalized;
}

function withAutoplayEmbedSrc(src) {
  if (typeof src !== "string" || !src) {
    return "";
  }
  try {
    const parsed = new URL(src);
    parsed.searchParams.set("autoplay", "1");
    parsed.searchParams.set("playsinline", "1");
    parsed.searchParams.set("rel", "0");
    return parsed.toString();
  } catch {
    return src;
  }
}

function playTopVideoTile() {
  const topVideoFrame = document.querySelector("#videos-grid .embed-wrap iframe");
  if (!topVideoFrame) {
    return false;
  }
  const videosSection = document.getElementById("videos");
  videosSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  topVideoFrame.src = withAutoplayEmbedSrc(topVideoFrame.src);
  return true;
}

function createGenreBadge() {
  const badge = document.createElement("span");
  badge.className = "genre-badge";
  badge.textContent = GENRE_BADGE_LABEL;
  return badge;
}

function createMoreMenuCard(label, href, buttonClass = "btn-outline", openInNewTab = false) {
  const article = document.createElement("article");
  article.className = "media-card media-card-more";

  const inner = document.createElement("div");
  inner.className = "media-card-more-inner";

  const link = document.createElement("a");
  link.className = `btn ${buttonClass} media-card-more-link`;
  link.href = href;
  link.textContent = label;
  if (openInNewTab) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  inner.append(link);
  article.append(inner);
  return article;
}

function appendGridActionTile(
  containerId,
  label,
  href,
  buttonClass = "btn-outline",
  openInNewTab = false,
) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.append(createMoreMenuCard(label, href, buttonClass, openInNewTab));
}

function updateHeroLiveCta(data) {
  const liveCta = document.querySelector(".btn-live");
  if (!liveCta) {
    return;
  }

  const youtubeLive = data?.youtubeLive ?? {};
  const latestUrl =
    (typeof youtubeLive.latestUrl === "string" && youtubeLive.latestUrl) ||
    data?.videos?.top3?.[0]?.url ||
    FALLBACK_YOUTUBE_URL;

  if (
    youtubeLive?.isLive &&
    typeof youtubeLive.liveUrl === "string" &&
    youtubeLive.liveUrl
  ) {
    liveCta.textContent = "Join Live Now!";
    liveCta.href = youtubeLive.liveUrl;
    liveCta.target = "_blank";
    liveCta.rel = "noopener noreferrer";
    liveCta.dataset.liveMode = "live";
    return;
  }

  liveCta.textContent = "Watch Latest Video";
  liveCta.href = "#videos";
  liveCta.removeAttribute("target");
  liveCta.removeAttribute("rel");
  liveCta.dataset.liveMode = "latest";
  liveCta.dataset.latestUrl = latestUrl;
}

function bindHeroLiveCtaClick() {
  const liveCta = document.querySelector(".btn-live");
  if (!liveCta || liveCta.dataset.boundClick === "1") {
    return;
  }
  liveCta.dataset.boundClick = "1";
  liveCta.addEventListener("click", (event) => {
    if (liveCta.dataset.liveMode !== "latest") {
      return;
    }
    event.preventDefault();
    const started = playTopVideoTile();
    if (!started) {
      const fallbackUrl = liveCta.dataset.latestUrl || FALLBACK_YOUTUBE_URL;
      window.location.href = fallbackUrl;
    }
  });
}

function createVideoCard(item) {
  const article = document.createElement("article");
  article.className = "media-card";

  const wrap = document.createElement("div");
  wrap.className = "embed-wrap";

  const iframe = document.createElement("iframe");
  iframe.src = item.embedUrl;
  const normalizedTitle = normalizeBrandTitle(item.title);
  iframe.title = normalizedTitle;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  wrap.appendChild(iframe);

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const title = document.createElement("h3");
  title.textContent = normalizedTitle;
  const badge = createGenreBadge();

  const stats = document.createElement("p");
  stats.className = "tile-stats";
  const viewText = item.viewCount ? `${formatCount(item.viewCount)} views` : "";
  const dateText = item.publishedAt ? formatDate(item.publishedAt) : "";
  stats.textContent = [viewText, dateText].filter(Boolean).join(" • ");
  const footer = document.createElement("div");
  footer.className = "media-meta-footer";
  footer.append(stats, badge);

  meta.append(title, footer);
  article.append(wrap, meta);
  return article;
}

function createAudioCard(item) {
  const article = document.createElement("article");
  article.className = "media-card";

  const wrap = document.createElement("div");
  wrap.className = "embed-wrap embed-wrap-audio";

  const normalizedTitle = normalizeBrandTitle(item.title);
  const setLabel = extractSetLabel(normalizedTitle);
  const cover = document.createElement("a");
  cover.className = "audio-set-cover";
  cover.href = item.url;
  cover.target = "_blank";
  cover.rel = "noopener noreferrer";
  cover.setAttribute("aria-label", `Open ${normalizedTitle} on Mixcloud`);
  cover.textContent = setLabel;
  wrap.appendChild(cover);

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const title = document.createElement("h3");
  title.textContent = normalizedTitle;
  const badge = createGenreBadge();

  const stats = document.createElement("p");
  stats.className = "tile-stats";
  const playsText = item.playCount ? `${formatCount(item.playCount)} plays` : "";
  const dateText = item.publishedAt ? formatDate(item.publishedAt) : "";
  stats.textContent = [playsText, dateText].filter(Boolean).join(" • ");
  const footer = document.createElement("div");
  footer.className = "media-meta-footer";
  footer.append(stats, badge);

  meta.append(title, footer);
  article.append(wrap, meta);
  return article;
}

function renderGrid(containerId, items, cardFactory) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "subpage-intro";
    empty.textContent = "No media items available right now.";
    container.appendChild(empty);
    return;
  }
  items.forEach((item) => container.appendChild(cardFactory(item)));
}

async function hydrateMediaWalls() {
  if (!page) {
    return;
  }

  try {
    const response = await fetch("./media-data.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();

    if (page === "home") {
      renderGrid("videos-grid", data?.videos?.top3 ?? [], createVideoCard);
      renderGrid("audio-grid", data?.audio?.top3 ?? [], createAudioCard);
      appendGridActionTile("videos-grid", "More Videos", "./videos.html");
      appendGridActionTile("audio-grid", "More Audio", "./audio.html");
      updateHeroLiveCta(data);
      return;
    }

    if (page === "videos") {
      const videos = (data?.videos?.rest ?? []).length
        ? data.videos.rest
        : data?.videos?.top3 ?? [];
      renderGrid("videos-rest-grid", videos, createVideoCard);
      appendGridActionTile(
        "videos-rest-grid",
        "Subscribe",
        "https://m.youtube.com/@dj_urbant",
        "btn-subscribe",
        true,
      );
      return;
    }

    if (page === "audio") {
      const audio = (data?.audio?.rest ?? []).length
        ? data.audio.rest
        : data?.audio?.top3 ?? [];
      renderGrid("audio-rest-grid", audio, createAudioCard);
      appendGridActionTile(
        "audio-rest-grid",
        "Open Mixcloud",
        "https://www.mixcloud.com/urbant/",
        "btn-outline",
        true,
      );
    }
  } catch {
    // Keep page usable if media-data fetch fails.
  }
}

applyHeroFontVariant();
initHeaderVisibilityOnScroll();
initHeaderContentOffset();
bindHeroLiveCtaClick();
hydrateMediaWalls();
