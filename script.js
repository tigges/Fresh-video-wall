const yearNode = document.getElementById("year");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const page = document.body.dataset.page;
const GENRE_BADGE_LABEL = "\u{1F50A} Bass House";

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

function appendStyledUrbanTText(target, text) {
  target.textContent = "";
  if (typeof text !== "string" || !text) {
    return;
  }

  const matcher = /UrbanT/g;
  let lastIndex = 0;
  let match = matcher.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      target.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const wordmark = document.createElement("span");
    wordmark.className = "urbant-wordmark";

    const urbanU = document.createElement("span");
    urbanU.className = "urbant-u";
    urbanU.textContent = "U";

    const urbanRest = document.createElement("span");
    urbanRest.textContent = "rban";

    const urbanT = document.createElement("span");
    urbanT.className = "urbant-t";
    urbanT.textContent = "T";

    wordmark.append(urbanU, urbanRest, urbanT);
    target.append(wordmark);

    lastIndex = match.index + match[0].length;
    match = matcher.exec(text);
  }

  if (lastIndex < text.length) {
    target.append(document.createTextNode(text.slice(lastIndex)));
  }
}

function createGenreBadge() {
  const badge = document.createElement("span");
  badge.className = "genre-badge";
  badge.textContent = GENRE_BADGE_LABEL;
  return badge;
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
  appendStyledUrbanTText(title, normalizedTitle);
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

  const iframe = document.createElement("iframe");
  iframe.src = item.embedUrl;
  const normalizedTitle = normalizeBrandTitle(item.title);
  iframe.title = normalizedTitle;
  iframe.allow = "autoplay";
  wrap.appendChild(iframe);

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const title = document.createElement("h3");
  appendStyledUrbanTText(title, normalizedTitle);
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
      return;
    }

    if (page === "videos") {
      const videos = (data?.videos?.rest ?? []).length
        ? data.videos.rest
        : data?.videos?.top3 ?? [];
      renderGrid("videos-rest-grid", videos, createVideoCard);
      return;
    }

    if (page === "audio") {
      const audio = (data?.audio?.rest ?? []).length
        ? data.audio.rest
        : data?.audio?.top3 ?? [];
      renderGrid("audio-rest-grid", audio, createAudioCard);
    }
  } catch {
    // Keep page usable if media-data fetch fails.
  }
}

hydrateMediaWalls();
