(function () {
  const PAGES = { video: "/videos", audio: "/audio" };
  const SECTION_SELECTOR = "#best-of-artist";
  const CHANNEL_FALLBACK = "YouTube";
  const AUDIO_FALLBACK = "Mixcloud";

  let currentType = "video";
  let videoData = [];
  let audioData = [];

  function formatCount(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "0";
    }
    return new Intl.NumberFormat("en-US").format(value);
  }

  function formatDurationFromSeconds(seconds) {
    if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds <= 0) {
      return "";
    }
    const totalSeconds = Math.floor(seconds);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function inferDuration(item) {
    if (typeof item?.duration === "string" && item.duration.trim()) {
      return item.duration.trim();
    }
    if (typeof item?.duration === "number") {
      return formatDurationFromSeconds(item.duration);
    }
    return "";
  }

  function normalizeVideoData(source) {
    const youtubeLive = source?.youtubeLive ?? {};
    const topVideos = Array.isArray(source?.videos?.top3) ? source.videos.top3 : [];
    const restVideos = Array.isArray(source?.videos?.rest) ? source.videos.rest : [];
    const allVideos = [...topVideos, ...restVideos];

    const mapped = allVideos.map((item) => ({
      title: item?.title || "DJ UrbanT Video",
      url: item?.url || "#videos",
      duration: inferDuration(item),
      viewCount: item?.viewCount ?? 0,
      isLive: false,
      platform: CHANNEL_FALLBACK,
      thumbnail: item?.thumbnailUrl || "",
    }));

    if (
      youtubeLive?.isLive &&
      typeof youtubeLive.liveUrl === "string" &&
      youtubeLive.liveUrl
    ) {
      mapped.unshift({
        title: "DJ UrbanT Live Stream",
        url: youtubeLive.liveUrl,
        duration: "",
        viewCount: 0,
        isLive: true,
        platform: CHANNEL_FALLBACK,
        thumbnail: "",
      });
    }

    return mapped;
  }

  function normalizeAudioData(source) {
    const topAudio = Array.isArray(source?.audio?.top3) ? source.audio.top3 : [];
    const restAudio = Array.isArray(source?.audio?.rest) ? source.audio.rest : [];
    const allAudio = [...topAudio, ...restAudio];

    return allAudio.map((item) => ({
      title: item?.title || "DJ UrbanT Audio Set",
      url: item?.url || "#music",
      duration: inferDuration(item),
      playCount: item?.playCount ?? 0,
      isLive: false,
      platform: AUDIO_FALLBACK,
    }));
  }

  function escapeHtml(value) {
    const text = String(value ?? "");
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildVideoCard(item) {
    const liveClass = item.isLive ? " boa-card--live" : "";
    const livePill = item.isLive
      ? '<div class="boa-live-pill"><span class="boa-live-dot"></span>Live</div>'
      : "";
    const duration = item.duration || "";
    const plays = `${formatCount(item.viewCount)} plays`;
    const meta = item.isLive
      ? `${item.platform || CHANNEL_FALLBACK} · Live now`
      : `${duration ? `${duration} · ` : ""}${plays}`;
    return `
      <div class="boa-card${liveClass}" data-url="${escapeHtml(item.url)}" role="link" tabindex="0">
        <div class="boa-card-top">
          <div class="boa-play-btn"><div class="boa-tri"></div></div>
          ${livePill}
        </div>
        <div class="boa-card-body">
          <div class="boa-card-title">${escapeHtml(item.title)}</div>
          <div class="boa-card-meta">${escapeHtml(meta)}</div>
        </div>
      </div>`;
  }

  function buildAudioCard(item) {
    const duration = item.duration || "";
    const plays = `${formatCount(item.playCount)} plays`;
    const meta = `${duration ? `${duration} · ` : ""}${plays}`;
    return `
      <div class="boa-card boa-card--audio" data-url="${escapeHtml(item.url)}" role="link" tabindex="0">
        <div class="boa-card-top">
          <div class="boa-audio-icon">
            <span class="boa-bar" style="height:8px"></span>
            <span class="boa-bar" style="height:14px"></span>
            <span class="boa-bar" style="height:10px"></span>
            <span class="boa-bar" style="height:16px"></span>
            <span class="boa-bar" style="height:6px"></span>
          </div>
        </div>
        <div class="boa-card-body">
          <div class="boa-card-title">${escapeHtml(item.title)}</div>
          <div class="boa-card-meta">${escapeHtml(meta)}</div>
        </div>
      </div>`;
  }

  function bindCardNavigation(root) {
    root.querySelectorAll(".boa-card").forEach((card) => {
      if (card.dataset.boundClick === "1") {
        return;
      }
      card.dataset.boundClick = "1";
      const navigate = () => {
        const url = card.dataset.url;
        if (url) {
          window.location.href = url;
        }
      };
      card.addEventListener("click", navigate);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate();
        }
      });
    });
  }

  function render() {
    const items = currentType === "video" ? videoData : audioData;
    const builder = currentType === "video" ? buildVideoCard : buildAudioCard;
    const sorted = [...items].sort((a, b) => Number(Boolean(b.isLive)) - Number(Boolean(a.isLive)));

    const grid = document.getElementById("boa-grid");
    if (grid) {
      grid.innerHTML = sorted.slice(0, 3).map(builder).join("");
      bindCardNavigation(grid);
    }

    const inner = document.getElementById("boa-carousel-inner");
    if (inner) {
      inner.innerHTML = sorted.map(builder).join("");
      bindCardNavigation(inner);
    }

    const more = document.getElementById("boa-more");
    if (more) {
      more.href = PAGES[currentType];
    }
  }

  function switchType(type) {
    currentType = type === "audio" ? "audio" : "video";
    document.querySelectorAll(".boa-tog").forEach((btn) => {
      const isActive = btn.dataset.type === currentType;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    render();
  }

  function attachToggleHandlers() {
    document.querySelectorAll(".boa-tog").forEach((btn) => {
      if (btn.dataset.boundClick === "1") {
        return;
      }
      btn.dataset.boundClick = "1";
      btn.addEventListener("click", () => switchType(btn.dataset.type || "video"));
    });
  }

  function applyData(data) {
    if (!data || typeof data !== "object") {
      return;
    }
    videoData = normalizeVideoData(data);
    audioData = normalizeAudioData(data);
    render();
  }

  function init() {
    const section = document.querySelector(SECTION_SELECTOR);
    if (!section) {
      return;
    }

    attachToggleHandlers();
    applyData(window.__DJURBANT_MEDIA_DATA__);
    window.addEventListener("mediaDataLoaded", (event) => applyData(event?.detail));
  }

  window.initBestOfArtist = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
