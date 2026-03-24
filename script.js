const yearNode = document.getElementById("year");
const FALLBACK_YOUTUBE_URL = "./videos.html";

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const page = document.body.dataset.page;
const PRIMARY_GENRE_BADGE_LABEL = "Bass House";
const SECONDARY_GENRE_BADGE_LABEL = "Tech House";
const HOME_BEST_OF_MORE_LINKS = Object.freeze({
  video: "./videos.html",
  audio: "./audio-more.html",
});
const HOME_BEST_OF_MOBILE_QUERY = "(max-width: 639px)";
let mixcloudWidgetApiPromise = null;
let offlineAudioSourcesPromise = null;
let activeAudioController = null;

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

function toConstrainedYoutubeEmbedSrc(src) {
  if (typeof src !== "string" || !src) {
    return "";
  }
  try {
    const parsed = new URL(src);
    if (/youtube\.com$/i.test(parsed.hostname) || /^www\.youtube\.com$/i.test(parsed.hostname)) {
      parsed.hostname = "www.youtube-nocookie.com";
    }
    parsed.searchParams.set("rel", "0");
    parsed.searchParams.set("modestbranding", "1");
    parsed.searchParams.set("iv_load_policy", "3");
    parsed.searchParams.set("playsinline", "1");
    parsed.searchParams.set("enablejsapi", "1");
    parsed.searchParams.set("origin", window.location.origin);
    return parsed.toString();
  } catch {
    return src;
  }
}

function deriveSetNumber(title, fallbackSeed = "") {
  if (typeof title === "string") {
    const setHashMatch = title.match(/#\s*(\d{1,4})\b/i);
    if (setHashMatch?.[1]) {
      return setHashMatch[1];
    }
    const setWordMatch = title.match(/\bset\s*#?\s*(\d{1,4})\b/i);
    if (setWordMatch?.[1]) {
      return setWordMatch[1];
    }
    const plainNumberMatch = title.match(/\b(\d{3,4})\b/);
    if (plainNumberMatch?.[1]) {
      return plainNumberMatch[1];
    }
  }
  const seed = `${title ?? ""}|${fallbackSeed}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 900;
  }
  return String(hash + 100).padStart(3, "0");
}

function extractSetLabel(title, fallbackSeed = "") {
  return `Set #${deriveSetNumber(title, fallbackSeed)}`;
}

function toInlineMixcloudEngineSrc(src) {
  if (typeof src !== "string" || !src) {
    return "";
  }
  try {
    const parsed = new URL(src);
    parsed.searchParams.set("mini", "1");
    parsed.searchParams.set("hide_cover", "1");
    parsed.searchParams.set("autoplay", "0");
    return parsed.toString();
  } catch {
    return src;
  }
}

function loadMixcloudWidgetApi() {
  if (window.Mixcloud?.PlayerWidget) {
    return Promise.resolve(window.Mixcloud.PlayerWidget);
  }
  if (mixcloudWidgetApiPromise) {
    return mixcloudWidgetApiPromise;
  }

  mixcloudWidgetApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mixcloud-widget-api="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Mixcloud?.PlayerWidget));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://widget.mixcloud.com/media/js/widgetApi.js";
    script.async = true;
    script.dataset.mixcloudWidgetApi = "1";
    script.addEventListener("load", () => resolve(window.Mixcloud?.PlayerWidget));
    script.addEventListener("error", reject);
    document.head.appendChild(script);
  });

  return mixcloudWidgetApiPromise;
}

function loadOfflineAudioSources() {
  if (offlineAudioSourcesPromise) {
    return offlineAudioSourcesPromise;
  }
  offlineAudioSourcesPromise = fetch("./offline-media/audio-sources.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        return { tracks: {} };
      }
      return response.json();
    })
    .catch(() => ({ tracks: {} }));
  return offlineAudioSourcesPromise;
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
  const constrained = toConstrainedYoutubeEmbedSrc(src);
  if (!constrained) {
    return "";
  }
  try {
    const parsed = new URL(constrained);
    parsed.searchParams.set("autoplay", "1");
    parsed.searchParams.set("playsinline", "1");
    parsed.searchParams.set("rel", "0");
    return parsed.toString();
  } catch {
    return src;
  }
}

function playTopVideoTile() {
  if (page === "home") {
    const bestSection = document.getElementById("best-of-artist");
    if (bestSection?.dataset.bestMode === "audio") {
      const videoToggle = document.getElementById("best-of-toggle-video");
      videoToggle?.click();
    }
  }

  const topVideoFrame = document.querySelector("#videos-grid .embed-wrap iframe");
  if (!topVideoFrame) {
    return false;
  }
  const videosSection = document.getElementById("best-of-artist");
  videosSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  topVideoFrame.src = withAutoplayEmbedSrc(topVideoFrame.src);
  return true;
}

function createGenreBadge(options = {}) {
  const { includeTechHouse = false } = options;
  const badges = document.createElement("span");
  badges.className = "genre-badges";
  const primaryBadge = document.createElement("span");
  primaryBadge.className = "genre-badge";
  primaryBadge.textContent = PRIMARY_GENRE_BADGE_LABEL;
  badges.appendChild(primaryBadge);
  if (includeTechHouse) {
    const secondaryBadge = document.createElement("span");
    secondaryBadge.className = "genre-badge";
    secondaryBadge.textContent = SECONDARY_GENRE_BADGE_LABEL;
    badges.appendChild(secondaryBadge);
  }
  return badges;
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

function getHomeVideoItems(data) {
  return [...(data?.videos?.top3 ?? []), ...(data?.videos?.rest ?? [])];
}

function getHomeAudioItems(data) {
  return [...(data?.audio?.top3 ?? []), ...(data?.audio?.rest ?? [])];
}

function updateHomeBestOfArtistToggle() {
  if (page !== "home") {
    return;
  }
  const bestSection = document.getElementById("best-of-artist");
  const videosGrid = document.getElementById("videos-grid");
  const audioGrid = document.getElementById("audio-grid");
  const videoToggle = document.getElementById("best-of-toggle-video");
  const audioToggle = document.getElementById("best-of-toggle-audio");
  const moreLink = document.getElementById("best-of-more-link");
  if (!bestSection || !videosGrid || !audioGrid || !videoToggle || !audioToggle || !moreLink) {
    return;
  }

  const isMobileViewport = () => window.matchMedia(HOME_BEST_OF_MOBILE_QUERY).matches;

  const applyMode = (mode) => {
    const normalizedMode = mode === "audio" ? "audio" : "video";
    const isVideo = normalizedMode === "video";
    bestSection.dataset.bestMode = isVideo ? "video" : "audio";
    videosGrid.classList.toggle("is-hidden-by-toggle", !isVideo);
    audioGrid.classList.toggle("is-hidden-by-toggle", isVideo);
    videosGrid.setAttribute("aria-hidden", isVideo ? "false" : "true");
    audioGrid.setAttribute("aria-hidden", isVideo ? "true" : "false");

    videoToggle.classList.toggle("is-active", isVideo);
    audioToggle.classList.toggle("is-active", !isVideo);
    videoToggle.setAttribute("aria-pressed", isVideo ? "true" : "false");
    audioToggle.setAttribute("aria-pressed", isVideo ? "false" : "true");

    moreLink.href = HOME_BEST_OF_MORE_LINKS[normalizedMode] ?? HOME_BEST_OF_MORE_LINKS.video;
  };

  const setDesktopTop3Only = () => {
    const desktopOnly = !isMobileViewport();
    const updateGrid = (grid) => {
      const cards = [...grid.querySelectorAll(".media-card")];
      cards.forEach((card, index) => {
        card.hidden = desktopOnly && index >= 3;
        if (!desktopOnly) {
          card.hidden = false;
        }
      });
    };
    updateGrid(videosGrid);
    updateGrid(audioGrid);
  };

  if (videoToggle.dataset.boundClick !== "1") {
    videoToggle.dataset.boundClick = "1";
    audioToggle.dataset.boundClick = "1";
    videoToggle.addEventListener("click", () => {
      applyMode("video");
      setDesktopTop3Only();
    });
    audioToggle.addEventListener("click", () => {
      applyMode("audio");
      setDesktopTop3Only();
    });
    window.addEventListener(
      "resize",
      () => {
        setDesktopTop3Only();
      },
      { passive: true },
    );
  }

  setDesktopTop3Only();
  const initialMode =
    bestSection.dataset.bestMode ||
    (videoToggle.classList.contains("is-active") ? "video" : "audio");
  applyMode(initialMode);
}

function hydrateHomeBestOfArtist(data) {
  renderGrid("videos-grid", getHomeVideoItems(data), createVideoCard);
  renderGrid("audio-grid", getHomeAudioItems(data), createAudioTopTileCard);
  updateHomeBestOfArtistToggle();
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
    liveCta.href = "#best-of-artist";
    liveCta.removeAttribute("target");
    liveCta.removeAttribute("rel");
    liveCta.dataset.liveMode = "live";
    return;
  }

  liveCta.textContent = "Watch Latest Video";
  liveCta.href = "#best-of-artist";
  liveCta.removeAttribute("target");
  liveCta.removeAttribute("rel");
  liveCta.dataset.liveMode = "latest";
  liveCta.dataset.latestUrl = latestUrl;
}

function updateLiveStrip(data) {
  const statusNode = document.getElementById("live-strip-status");
  const titleNode = document.getElementById("live-strip-title");
  const subtitleNode = document.getElementById("live-strip-subtitle");
  const linkNode = document.getElementById("live-strip-link");
  if (!statusNode || !titleNode || !subtitleNode || !linkNode) {
    return;
  }

  const youtubeLive = data?.youtubeLive ?? {};
  const topVideo = data?.videos?.top3?.[0] ?? {};
  const topTitle = normalizeBrandTitle(topVideo?.title || "Bass House Set");
  const topSetLabel = extractSetLabel(topTitle, topVideo?.id || topVideo?.url || "434");

  titleNode.textContent = topSetLabel;

  if (
    youtubeLive?.isLive &&
    typeof youtubeLive.liveUrl === "string" &&
    youtubeLive.liveUrl
  ) {
    statusNode.textContent = "Live Now";
    subtitleNode.textContent = "YouTube · streaming now";
    linkNode.textContent = "Join the Stream →";
    linkNode.href = "#best-of-artist";
    linkNode.dataset.liveMode = "live";
    linkNode.dataset.streamUrl = youtubeLive.liveUrl;
    return;
  }

  const latestUrl =
    (typeof youtubeLive.latestUrl === "string" && youtubeLive.latestUrl) ||
    topVideo?.url ||
    FALLBACK_YOUTUBE_URL;

  statusNode.textContent = "Latest Set";
  subtitleNode.textContent = "YouTube · on demand";
  linkNode.textContent = "Watch the Set →";
  linkNode.href = "#best-of-artist";
  linkNode.dataset.liveMode = "latest";
  linkNode.dataset.streamUrl = latestUrl;
}

function bindHeroLiveCtaClick() {
  const liveCta = document.querySelector(".btn-live");
  if (!liveCta || liveCta.dataset.boundClick === "1") {
    return;
  }
  liveCta.dataset.boundClick = "1";
  liveCta.addEventListener("click", (event) => {
    if (!["latest", "live"].includes(liveCta.dataset.liveMode || "")) {
      return;
    }
    event.preventDefault();
    const started = playTopVideoTile();
    if (!started) {
      const fallbackUrl = FALLBACK_YOUTUBE_URL;
      window.location.href = fallbackUrl;
    }
  });
}

function bindLiveStripClick() {
  const linkNode = document.getElementById("live-strip-link");
  if (!linkNode || linkNode.dataset.boundClick === "1") {
    return;
  }
  linkNode.dataset.boundClick = "1";
  linkNode.addEventListener("click", (event) => {
    event.preventDefault();
    const started = playTopVideoTile();
    if (!started) {
      const fallbackUrl = linkNode.dataset.streamUrl || FALLBACK_YOUTUBE_URL;
      window.location.href = fallbackUrl;
    }
  });
}

function createVideoCard(item, index = 0) {
  const article = document.createElement("article");
  article.className = "media-card";

  const wrap = document.createElement("div");
  wrap.className = "embed-wrap";

  const iframe = document.createElement("iframe");
  iframe.src = toConstrainedYoutubeEmbedSrc(item.embedUrl);
  const normalizedTitle = normalizeBrandTitle(item.title);
  iframe.title = normalizedTitle;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  wrap.appendChild(iframe);

  const setLabel = extractSetLabel(normalizedTitle, item?.url || String(index));
  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "audio-top-overlay video-top-overlay";
  overlay.setAttribute("aria-label", `Play ${normalizedTitle}`);
  const number = document.createElement("span");
  number.className = "audio-top-overlay-number video-top-overlay-number";
  number.textContent = setLabel;
  overlay.appendChild(number);
  wrap.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    event.preventDefault();
    overlay.classList.add("is-hidden");
    iframe.src = withAutoplayEmbedSrc(iframe.src);
  });

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const title = document.createElement("h3");
  title.textContent = normalizedTitle;
  const badge = createGenreBadge({ includeTechHouse: index % 2 === 0 });

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

function createAudioCard(item, index = 0) {
  const article = document.createElement("article");
  article.className = "media-card";

  const wrap = document.createElement("div");
  wrap.className = "embed-wrap embed-wrap-audio";

  const normalizedTitle = normalizeBrandTitle(item.title);
  const setLabel = extractSetLabel(normalizedTitle, item?.url || String(index));
  const cover = document.createElement("button");
  cover.type = "button";
  cover.className = "audio-set-cover";
  cover.setAttribute("aria-label", `Play ${normalizedTitle}`);

  const setNumber = document.createElement("span");
  setNumber.className = "audio-set-number";
  setNumber.textContent = setLabel;

  const playIcon = document.createElement("span");
  playIcon.className = "audio-set-play";
  playIcon.setAttribute("aria-hidden", "true");
  playIcon.textContent = "\u25B6";

  const progress = document.createElement("span");
  progress.className = "audio-set-progress";
  progress.setAttribute("aria-hidden", "true");
  const progressFill = document.createElement("span");
  progressFill.className = "audio-set-progress-fill";
  progress.appendChild(progressFill);

  cover.append(setNumber, playIcon, progress);
  wrap.appendChild(cover);

  let mixcloudWidget = null;
  let widgetReadyPromise = null;
  let progressTimer = null;
  let widgetIsReady = false;

  const setProgress = (value) => {
    const clamped = Math.min(1, Math.max(0, value));
    progressFill.style.width = `${Math.round(clamped * 1000) / 10}%`;
  };

  const setPlayingState = (isPlaying) => {
    cover.classList.toggle("is-playing", isPlaying);
    cover.classList.remove("is-loading");
    playIcon.textContent = isPlaying ? "\u275A\u275A" : "\u25B6";
    cover.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${normalizedTitle}`);
    if (!isPlaying && progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  const startProgressLoop = () => {
    if (progressTimer || !mixcloudWidget) {
      return;
    }
    progressTimer = window.setInterval(() => {
      if (!mixcloudWidget) {
        return;
      }
      try {
        mixcloudWidget.getPosition((position) => {
          mixcloudWidget.getDuration((duration) => {
            if (!duration) {
              setProgress(0);
              return;
            }
            setProgress(position / duration);
          });
        });
      } catch {
        // Ignore widget polling errors and keep UI responsive.
      }
    }, 450);
  };

  const ensureWidgetReady = async () => {
    if (mixcloudWidget) {
      return mixcloudWidget;
    }
    if (widgetReadyPromise) {
      return widgetReadyPromise;
    }

    widgetReadyPromise = (async () => {
      await loadMixcloudWidgetApi();
      const frame = document.createElement("iframe");
      frame.className = "audio-engine-frame";
      frame.src = toInlineMixcloudEngineSrc(item.embedUrl);
      frame.title = `${normalizedTitle} audio engine`;
      frame.allow = "autoplay; clipboard-write";
      frame.loading = "lazy";
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      wrap.appendChild(frame);

      mixcloudWidget = window.Mixcloud?.PlayerWidget?.(frame) ?? null;
      if (!mixcloudWidget) {
        throw new Error("Mixcloud widget API unavailable");
      }

      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) {
            return;
          }
          settled = true;
          widgetIsReady = true;
          cover.classList.remove("is-loading");
          resolve();
        };
        if (mixcloudWidget.ready && typeof mixcloudWidget.ready.then === "function") {
          mixcloudWidget.ready.then(done).catch(done);
        } else if (mixcloudWidget.events?.ready?.on) {
          mixcloudWidget.events.ready.on(done);
        }
        window.setTimeout(done, 7000);
      });

      mixcloudWidget.events?.pause?.on(() => {
        if (activeAudioController === controls) {
          activeAudioController = null;
        }
        setPlayingState(false);
      });
      mixcloudWidget.events?.play?.on(() => {
        setPlayingState(true);
        startProgressLoop();
      });
      return mixcloudWidget;
    })().catch((error) => {
      widgetReadyPromise = null;
      throw error;
    });

    return widgetReadyPromise;
  };

  const pauseAudio = () => {
    if (!mixcloudWidget) {
      setPlayingState(false);
      return;
    }
    try {
      mixcloudWidget.pause();
    } catch {
      setPlayingState(false);
    }
  };

  const playAudio = async () => {
    try {
      cover.classList.add("is-loading");
      await ensureWidgetReady();
      if (activeAudioController && activeAudioController !== controls) {
        activeAudioController.pause();
      }
      activeAudioController = controls;
      mixcloudWidget.play();
      setPlayingState(true);
      startProgressLoop();
      if (!widgetIsReady) {
        let retries = 0;
        const retryPlay = () => {
          if (!mixcloudWidget || cover.classList.contains("is-playing") || retries >= 4) {
            return;
          }
          retries += 1;
          try {
            mixcloudWidget.play();
          } catch {
            // Ignore retry errors and keep trying a few times.
          }
          window.setTimeout(retryPlay, 400);
        };
        window.setTimeout(retryPlay, 400);
      }
    } catch {
      // If widget setup fails, keep current tile appearance unchanged.
      cover.classList.remove("is-loading");
    }
  };

  const controls = {
    pause: pauseAudio,
  };

  cover.addEventListener("click", async () => {
    if (cover.classList.contains("is-playing")) {
      pauseAudio();
      return;
    }
    await playAudio();
  });

  ensureWidgetReady().catch(() => {
    cover.classList.remove("is-loading");
  });

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const title = document.createElement("h3");
  title.textContent = normalizedTitle;
  const badge = createGenreBadge({ includeTechHouse: index % 2 === 0 });

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

function toTopTileMixcloudEmbedSrc(src) {
  if (typeof src !== "string" || !src) {
    return "";
  }
  try {
    const parsed = new URL(src);
    parsed.protocol = "https:";
    parsed.hostname = "player-widget.mixcloud.com";
    parsed.pathname = "/widget/iframe/";
    parsed.searchParams.set("hide_cover", "1");
    parsed.searchParams.set("mini", "1");
    parsed.searchParams.set("autoplay", "0");
    return parsed.toString();
  } catch {
    return src;
  }
}

function createAudioTopTileCard(item, index = 0) {
  const article = document.createElement("article");
  article.className = "media-card";

  const wrap = document.createElement("div");
  wrap.className = "embed-wrap embed-wrap-audio";

  const normalizedTitle = normalizeBrandTitle(item.title);
  const setLabel = extractSetLabel(normalizedTitle, item?.url || String(index));

  const iframe = document.createElement("iframe");
  iframe.className = "audio-top-iframe";
  iframe.src = toTopTileMixcloudEmbedSrc(item.embedUrl);
  iframe.title = normalizedTitle;
  iframe.allow = "encrypted-media; fullscreen; autoplay; idle-detection; speaker-selection; web-share";
  iframe.loading = "lazy";
  wrap.appendChild(iframe);

  const logoLinkBlocker = document.createElement("div");
  logoLinkBlocker.className = "audio-top-link-blocker";
  logoLinkBlocker.setAttribute("aria-hidden", "true");
  wrap.appendChild(logoLinkBlocker);

  const overlay = document.createElement("div");
  overlay.className = "audio-top-overlay";
  overlay.setAttribute("aria-hidden", "true");
  const number = document.createElement("span");
  number.className = "audio-top-overlay-number";
  number.textContent = setLabel;
  overlay.appendChild(number);
  wrap.appendChild(overlay);

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const title = document.createElement("h3");
  title.textContent = normalizedTitle;
  const badge = createGenreBadge({ includeTechHouse: index % 2 === 0 });

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

function toProfileMixcloudEmbedSrc(src) {
  if (typeof src !== "string" || !src) {
    return "";
  }
  try {
    const parsed = new URL(src);
    parsed.searchParams.set("mini", "1");
    parsed.searchParams.set("hide_cover", "1");
    parsed.searchParams.set("autoplay", "0");
    return parsed.toString();
  } catch {
    return src;
  }
}

function createMixcloudFeedCard(item) {
  const article = document.createElement("article");
  article.className = "mixcloud-feed-card";
  const detailHref = `./mixcloud-offline-track.html?track=${encodeTrackParam(item)}`;
  const topRow = document.createElement("div");
  topRow.className = "mixcloud-feed-top";

  const playerWrap = document.createElement("div");
  playerWrap.className = "mixcloud-feed-player";

  const iframe = document.createElement("iframe");
  iframe.src = toProfileMixcloudEmbedSrc(item.embedUrl);
  iframe.title = normalizeBrandTitle(item.title);
  iframe.allow = "encrypted-media; fullscreen; autoplay; idle-detection; speaker-selection; web-share";
  iframe.loading = "lazy";
  playerWrap.appendChild(iframe);
  topRow.append(playerWrap);

  const meta = document.createElement("div");
  meta.className = "mixcloud-feed-meta";

  const title = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.className = "mixcloud-feed-title-link";
  titleLink.href = detailHref;
  titleLink.textContent = normalizeBrandTitle(item.title);
  title.appendChild(titleLink);

  const stats = document.createElement("p");
  stats.className = "mixcloud-feed-stats";
  const playsText = item.playCount ? `${formatCount(item.playCount)} plays` : "";
  const dateText = item.publishedAt ? formatDate(item.publishedAt) : "";
  stats.textContent = [playsText, dateText].filter(Boolean).join(" . ");

  const openLink = document.createElement("a");
  openLink.className = "btn btn-outline mixcloud-feed-link";
  openLink.href = detailHref;
  openLink.textContent = "Details";

  const footerRow = document.createElement("div");
  footerRow.className = "mixcloud-feed-footer";
  footerRow.append(stats, openLink);

  meta.append(title, footerRow);
  article.append(topRow, meta);
  return article;
}

function renderMixcloudFeed(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "subpage-intro";
    empty.textContent = "No Mixcloud items available right now.";
    container.appendChild(empty);
    return;
  }
  items.forEach((item) => container.appendChild(createMixcloudFeedCard(item)));
}

function getAudioCatalog(data) {
  return [...(data?.audio?.top3 ?? []), ...(data?.audio?.rest ?? [])];
}

function getAudioTrackIdentity(item) {
  if (!item || typeof item !== "object") {
    return "";
  }
  return item.key || item.url || normalizeBrandTitle(item.title || "");
}

function encodeTrackParam(item) {
  return encodeURIComponent(getAudioTrackIdentity(item));
}

function decodeTrackParam(rawValue) {
  if (typeof rawValue !== "string" || !rawValue) {
    return "";
  }
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function simpleSeedHash(value) {
  const source = String(value || "");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function estimateDurationSeconds(seedValue) {
  const hash = simpleSeedHash(seedValue);
  return 3600 + (hash % 4200);
}

function estimateDurationLabel(seedValue) {
  const totalSeconds = estimateDurationSeconds(seedValue);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatClockLabel(totalSeconds) {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60)
    .toString()
    .padStart(hours > 0 ? 2 : 1, "0");
  const seconds = Math.floor(normalized % 60)
    .toString()
    .padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function createOfflineWaveform(seedValue) {
  const waveform = document.createElement("div");
  waveform.className = "offline-waveform";
  const seed = simpleSeedHash(seedValue);
  for (let i = 0; i < 44; i += 1) {
    const bar = document.createElement("span");
    const variance = ((seed >> (i % 16)) + i * 13) % 100;
    const heightPct = 18 + Math.round((variance / 100) * 76);
    bar.style.height = `${heightPct}%`;
    waveform.appendChild(bar);
  }
  return waveform;
}

function formatRelativeFromNow(dateValue) {
  if (!dateValue) {
    return "recently";
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "recently";
  }
  const days = Math.max(1, Math.round((Date.now() - parsed.getTime()) / 86400000));
  if (days < 30) {
    return `${days}d ago`;
  }
  if (days < 365) {
    return `${Math.round(days / 30)}mo ago`;
  }
  return `${Math.round(days / 365)}y ago`;
}

function buildOfflineComments(item) {
  const normalizedTitle = normalizeBrandTitle(item?.title || "DJ UrbanT Live Set");
  const setLabel = extractSetLabel(normalizedTitle);
  const recency = formatRelativeFromNow(item?.publishedAt);
  return [
    {
      author: "BassLineRider",
      text: `${setLabel} is pure peak-time energy. Replay value is huge.`,
      when: recency,
      likes: 14,
    },
    {
      author: "ClubNightBerlin",
      text: "Transitions are super clean. This one belongs on every warm-up to peak-time arc.",
      when: "1w ago",
      likes: 9,
    },
    {
      author: "TechGrooveFM",
      text: "Signature UrbanT flow all over this set. Great pacing and pressure.",
      when: "2w ago",
      likes: 7,
    },
  ];
}

function createOfflineCloudcastCard(item) {
  const article = document.createElement("article");
  article.className = "offline-cloudcast-card";

  const identity = getAudioTrackIdentity(item);
  const hash = simpleSeedHash(identity);
  const comments = 8 + (hash % 52);
  const favorites = (typeof item.favoriteCount === "number" ? item.favoriteCount : 0) + (hash % 9);
  const reposts = 1 + (hash % 6);

  const thumbLink = document.createElement("a");
  thumbLink.className = "offline-cloudcast-thumb";
  thumbLink.href = `./mixcloud-offline-track.html?track=${encodeTrackParam(item)}`;

  const thumbLogo = document.createElement("img");
  thumbLogo.className = "offline-cloudcast-thumb-logo";
  thumbLogo.src = "./assets/mixcloud-clone/offline/urbant-profile-600x600.png";
  thumbLogo.alt = "";

  const playIcon = document.createElement("span");
  playIcon.className = "offline-cloudcast-thumb-play";
  playIcon.textContent = "\u25B6";

  thumbLink.append(thumbLogo, playIcon);

  const main = document.createElement("div");
  main.className = "offline-cloudcast-main";

  const meta = document.createElement("p");
  meta.className = "offline-cloudcast-meta";
  meta.textContent = `UrbanT • ${formatRelativeFromNow(item.publishedAt)}`;

  const titleLink = document.createElement("a");
  titleLink.className = "offline-cloudcast-title-link";
  titleLink.href = `./mixcloud-offline-track.html?track=${encodeTrackParam(item)}`;
  titleLink.textContent = normalizeBrandTitle(item.title || "");

  const waveRow = document.createElement("div");
  waveRow.className = "offline-cloudcast-wave-row";
  const waveform = createOfflineWaveform(identity);
  const duration = document.createElement("span");
  duration.className = "offline-cloudcast-duration";
  duration.textContent = estimateDurationLabel(identity);
  waveRow.append(waveform, duration);

  const actionRow = document.createElement("div");
  actionRow.className = "offline-cloudcast-action-row";
  ["♡", "↗ Share", "+ Add"].forEach((label) => {
    const action = document.createElement("a");
    action.className = "offline-chip-btn";
    action.href = `./mixcloud-offline-track.html?track=${encodeTrackParam(item)}`;
    action.textContent = label;
    actionRow.appendChild(action);
  });

  const footer = document.createElement("div");
  footer.className = "offline-cloudcast-footer";

  const counts = document.createElement("p");
  counts.className = "offline-cloudcast-counts";
  const plays = item.playCount ? `${formatCount(item.playCount)}` : "0";
  const mobileMeta = document.createElement("p");
  mobileMeta.className = "offline-cloudcast-mobile-meta";
  mobileMeta.textContent = `${estimateDurationLabel(identity)} • ${plays} plays`;
  counts.textContent = `▶ ${plays}   ♡ ${favorites}   💬 ${comments}   ↻ ${reposts}`;

  const tags = document.createElement("div");
  tags.className = "offline-cloudcast-tags";
  ["tech house", "house", "bass house"].forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "offline-cloudcast-tag";
    chip.textContent = label;
    tags.appendChild(chip);
  });

  footer.append(mobileMeta, counts, tags);
  main.append(meta, titleLink, waveRow, actionRow, footer);
  article.append(thumbLink, main);
  return article;
}

function renderOfflineCloneHome(data) {
  const items = getAudioCatalog(data);
  const generatedNode = document.getElementById("offline-generated-at");
  if (generatedNode) {
    const generatedAt = data?.generatedAt ? new Date(data.generatedAt) : null;
    generatedNode.textContent =
      generatedAt && !Number.isNaN(generatedAt.getTime())
        ? `${generatedAt.toLocaleString("en-US", { hour12: false })} UTC`
        : "n/a";
  }
  const listNode = document.getElementById("offline-cloudcast-list");
  if (!listNode) {
    return;
  }
  listNode.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "subpage-intro";
    empty.textContent = "No cloudcasts cached yet.";
    listNode.appendChild(empty);
    return;
  }
  items.forEach((item) => listNode.appendChild(createOfflineCloudcastCard(item)));
}

async function renderOfflineTrackDetail(data) {
  const allItems = getAudioCatalog(data);
  const fallbackItem = allItems[0];
  if (!fallbackItem) {
    return;
  }

  const trackParam = decodeTrackParam(new URLSearchParams(window.location.search).get("track") || "");
  const selected =
    allItems.find((item) => {
      const identity = getAudioTrackIdentity(item);
      return identity === trackParam || item.url === trackParam || item.key === trackParam;
    }) || fallbackItem;

  const titleNode = document.getElementById("offline-track-title");
  if (titleNode) {
    titleNode.textContent = normalizeBrandTitle(selected.title || "DJ UrbanT Live Set");
  }
  const metaNode = document.getElementById("offline-track-meta");
  if (metaNode) {
    const plays = selected.playCount ? `${formatCount(selected.playCount)} plays` : "";
    metaNode.textContent = [plays, formatDate(selected.publishedAt), "Cloudcast"].filter(Boolean).join(" • ");
  }

  const setNode = document.getElementById("offline-track-set");
  if (setNode) {
    setNode.textContent = extractSetLabel(normalizeBrandTitle(selected.title || ""));
  }

  const selectedIdentity = getAudioTrackIdentity(selected);
  const selectedIndex = allItems.findIndex((item) => getAudioTrackIdentity(item) === selectedIdentity);

  const sourceMap = await loadOfflineAudioSources();
  const sourceTracks = sourceMap?.tracks && typeof sourceMap.tracks === "object" ? sourceMap.tracks : {};
  const configuredSource = sourceTracks[selectedIdentity];
  const configuredAudioUrl =
    configuredSource && typeof configuredSource.audioUrl === "string" ? configuredSource.audioUrl.trim() : "";

  const statusNode = document.getElementById("offline-track-status");
  const audioNode = document.getElementById("offline-track-audio");

  const commentsNode = document.getElementById("offline-track-comments");
  if (commentsNode) {
    commentsNode.innerHTML = "";
    buildOfflineComments(selected).forEach((comment) => {
      const item = document.createElement("li");
      item.className = "offline-comment-item";

      const author = document.createElement("p");
      author.className = "offline-comment-author";
      author.textContent = `${comment.author} • ${comment.when}`;

      const text = document.createElement("p");
      text.className = "offline-comment-text";
      text.textContent = comment.text;

      const likes = document.createElement("p");
      likes.className = "offline-comment-likes";
      likes.textContent = `${comment.likes} likes`;

      item.append(author, text, likes);
      commentsNode.appendChild(item);
    });
  }

  const relatedNode = document.getElementById("offline-track-related");
  if (relatedNode) {
    relatedNode.innerHTML = "";
    allItems
      .filter((item) => getAudioTrackIdentity(item) !== getAudioTrackIdentity(selected))
      .slice(0, 4)
      .forEach((item) => {
        const link = document.createElement("a");
        link.className = "offline-related-item";
        link.href = `./mixcloud-offline-track.html?track=${encodeTrackParam(item)}`;
        const title = normalizeBrandTitle(item.title || "");
        const plays = item.playCount ? `${formatCount(item.playCount)} plays` : "";
        link.textContent = [title, plays].filter(Boolean).join(" • ");
        relatedNode.appendChild(link);
      });
  }

  const progressNode = document.getElementById("offline-track-progress");
  const currentNode = document.getElementById("offline-track-current");
  const durationNode = document.getElementById("offline-track-duration");
  const toggleNode = document.getElementById("offline-track-toggle");
  const actionNodes = document.querySelectorAll("[data-offline-action]");

  if (!progressNode || !currentNode || !durationNode || !toggleNode || !actionNodes.length) {
    return;
  }
  if (toggleNode.dataset.boundOffline === "1") {
    return;
  }
  toggleNode.dataset.boundOffline = "1";

  let durationSeconds = estimateDurationSeconds(selectedIdentity);
  let currentSeconds = 0;
  let playing = false;
  let tickTimer = null;
  const hasConfiguredAudio = Boolean(configuredAudioUrl && audioNode);

  if (statusNode) {
    statusNode.textContent = hasConfiguredAudio
      ? "Offline playback from configured local/Dropbox source"
      : "Offline playback simulation (configure audio source to enable real playback)";
  }

  if (hasConfiguredAudio && audioNode) {
    audioNode.src = configuredAudioUrl;
  }

  const refreshPlayerUi = () => {
    const ratio = durationSeconds ? currentSeconds / durationSeconds : 0;
    progressNode.value = String(Math.round(ratio * 1000));
    currentNode.textContent = formatClockLabel(currentSeconds);
    durationNode.textContent = formatClockLabel(durationSeconds);
    toggleNode.textContent = playing ? "❚❚" : "▶";
    toggleNode.setAttribute("aria-label", playing ? "Pause" : "Play");
  };

  const stopTimer = () => {
    if (!tickTimer) {
      return;
    }
    clearInterval(tickTimer);
    tickTimer = null;
  };

  const startTimer = () => {
    if (tickTimer) {
      return;
    }
    tickTimer = window.setInterval(() => {
      if (!playing) {
        return;
      }
      currentSeconds = Math.min(durationSeconds, currentSeconds + 1);
      if (currentSeconds >= durationSeconds) {
        playing = false;
        stopTimer();
      }
      refreshPlayerUi();
    }, 1000);
  };

  const setPosition = (seconds) => {
    currentSeconds = Math.max(0, Math.min(durationSeconds, seconds));
    refreshPlayerUi();
  };

  const navigateRelative = (delta) => {
    if (!allItems.length || selectedIndex < 0) {
      return;
    }
    const nextIndex = Math.max(0, Math.min(allItems.length - 1, selectedIndex + delta));
    const nextItem = allItems[nextIndex];
    if (!nextItem) {
      return;
    }
    window.location.href = `./mixcloud-offline-track.html?track=${encodeTrackParam(nextItem)}`;
  };

  if (hasConfiguredAudio && audioNode) {
    audioNode.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audioNode.duration) && audioNode.duration > 0) {
        durationSeconds = Math.round(audioNode.duration);
      }
      refreshPlayerUi();
    });
    audioNode.addEventListener("timeupdate", () => {
      currentSeconds = audioNode.currentTime || 0;
      refreshPlayerUi();
    });
    audioNode.addEventListener("ended", () => {
      playing = false;
      refreshPlayerUi();
    });
  }

  actionNodes.forEach((node) => {
    node.addEventListener("click", () => {
      const action = node.getAttribute("data-offline-action");
      if (!action) {
        return;
      }
      if (action === "toggle") {
        if (hasConfiguredAudio && audioNode) {
          if (audioNode.paused) {
            audioNode.play().catch(() => {});
            playing = true;
          } else {
            audioNode.pause();
            playing = false;
          }
          refreshPlayerUi();
          return;
        }
        playing = !playing;
        if (playing) {
          startTimer();
        } else {
          stopTimer();
        }
        refreshPlayerUi();
        return;
      }
      if (action === "rewind") {
        if (hasConfiguredAudio && audioNode) {
          audioNode.currentTime = Math.max(0, (audioNode.currentTime || 0) - 30);
          return;
        }
        setPosition(currentSeconds - 30);
        return;
      }
      if (action === "forward") {
        if (hasConfiguredAudio && audioNode) {
          const max = Number.isFinite(audioNode.duration) ? audioNode.duration : durationSeconds;
          audioNode.currentTime = Math.min(max, (audioNode.currentTime || 0) + 30);
          return;
        }
        setPosition(currentSeconds + 30);
        return;
      }
      if (action === "prev") {
        navigateRelative(-1);
        return;
      }
      if (action === "next") {
        navigateRelative(1);
      }
    });
  });

  progressNode.addEventListener("input", () => {
    const value = Number(progressNode.value);
    if (!Number.isFinite(value)) {
      return;
    }
    if (hasConfiguredAudio && audioNode) {
      const nextTime = (value / 1000) * durationSeconds;
      audioNode.currentTime = Math.max(0, Math.min(durationSeconds, nextTime));
      return;
    }
    setPosition((value / 1000) * durationSeconds);
  });

  refreshPlayerUi();
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
  items.forEach((item, index) => container.appendChild(cardFactory(item, index)));
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
      hydrateHomeBestOfArtist(data);
      updateHeroLiveCta(data);
      updateLiveStrip(data);
      return;
    }

    if (page === "videos") {
      const videos = [...(data?.videos?.top3 ?? []), ...(data?.videos?.rest ?? [])];
      renderGrid("videos-rest-grid", videos, createVideoCard);
      appendGridActionTile(
        "videos-rest-grid",
        "Top Videos",
        "./index.html#best-of-artist",
        "btn-outline",
        false,
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
      return;
    }

    if (page === "audio-more") {
      const audio = [...(data?.audio?.top3 ?? []), ...(data?.audio?.rest ?? [])];
      renderGrid("audio-more-grid", audio, createAudioTopTileCard);
      return;
    }

    if (page === "audio-mixcloud") {
      const audioTop = data?.audio?.top3 ?? [];
      const audioRest = data?.audio?.rest ?? [];
      renderMixcloudFeed("audio-mixcloud-list", [...audioTop, ...audioRest]);
      return;
    }

    if (page === "mixcloud-offline-home") {
      renderOfflineCloneHome(data);
      return;
    }

    if (page === "mixcloud-offline-track") {
      await renderOfflineTrackDetail(data);
    }
  } catch {
    // Keep page usable if media-data fetch fails.
  }
}

applyHeroFontVariant();
initHeaderVisibilityOnScroll();
initHeaderContentOffset();
bindHeroLiveCtaClick();
bindLiveStripClick();
hydrateMediaWalls();
