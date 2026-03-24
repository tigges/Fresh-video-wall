const AUTH_EMAIL = "c@tigges.ch";
const AUTH_SESSION_KEY = "djurbant_admin_session";
const AUTH_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const HOME_TILES_KEY = "djurbant_admin_home_tiles";
const DASHBOARD_TILES_KEY = "djurbant_admin_dashboard_tiles";
const SETTINGS_KEY = "djurbant_admin_settings";

const SOCIALS = [
  { platform: "X/Twitter", url: "https://twitter.com/DJUrbanT", inNav: true },
  { platform: "Instagram", url: "https://www.instagram.com/_urbant_/", inNav: true },
  { platform: "YouTube", url: "./video.html", inNav: true },
  { platform: "TikTok", url: "https://www.tiktok.com/@_urbant_", inNav: true },
  { platform: "Twitch", url: "https://www.twitch.tv/djurbant", inNav: true },
  { platform: "Mixcloud", url: "https://www.mixcloud.com/urbant/", inNav: true },
];

const BOOKINGS = [
  {
    id: "bkg-434",
    venue: "Pulse Club Berlin",
    eventDate: "2026-04-12",
    eventType: "club night",
    budget: "€3,000",
    received: "2026-03-24T14:18:00Z",
    status: "new",
  },
  {
    id: "bkg-435",
    venue: "Neon Fields Festival",
    eventDate: "2026-06-03",
    eventType: "festival",
    budget: "€8,500",
    received: "2026-03-23T11:07:00Z",
    status: "new",
  },
  {
    id: "bkg-436",
    venue: "Private Rooftop Event",
    eventDate: "",
    eventType: "private",
    budget: "",
    received: "2026-03-20T18:42:00Z",
    status: "read",
  },
];

const RECENT_ACTIVITY = [
  { type: "live", title: "YouTube live started", meta: "Set #434", at: "2m ago" },
  { type: "booking", title: "New booking request received", meta: "Pulse Club Berlin", at: "8m ago" },
  { type: "upload", title: "Video uploaded", meta: "Set #429", at: "2h ago" },
  { type: "edit", title: "Page edited", meta: "video.html", at: "5h ago" },
  { type: "edit", title: "Social link updated", meta: "TikTok URL", at: "1d ago" },
];

const app = document.getElementById("admin-app");
const authGate = document.getElementById("admin-auth-gate");
const authMessage = document.getElementById("admin-auth-message");
const accountPicker = document.getElementById("account-picker");
const googleLoginBtn = document.getElementById("google-login-btn");
const logoutBtn = document.getElementById("admin-logout-btn");
const userEmailNode = document.getElementById("admin-user-email");

const navItems = [...document.querySelectorAll(".admin-nav-item")];
const panels = [...document.querySelectorAll("[data-view-panel]")];
const openViewButtons = [...document.querySelectorAll("[data-open-view]")];

const settingsPanel = document.getElementById("settings-panel");
const settingsPanelScrim = document.getElementById("settings-panel-scrim");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");

const sidebar = document.getElementById("admin-sidebar");
const sidebarScrim = document.getElementById("sidebar-scrim");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");

const addPlatformBtn = document.getElementById("add-platform-btn");
const addPlatformForm = document.getElementById("add-platform-form");
const cancelPlatformBtn = document.getElementById("cancel-platform-btn");
const addPlatformName = document.getElementById("add-platform-name");
const addPlatformUrl = document.getElementById("add-platform-url");
const addPlatformInNav = document.getElementById("add-platform-in-nav");
const socialsBody = document.getElementById("social-links-table-body");
const dashboardSocialsBody = document.getElementById("dashboard-social-links-body");

const bookingsBody = document.getElementById("bookings-table-body");
const unreadBadge = document.getElementById("bookings-unread-badge");
const homeBookingsBadge = document.getElementById("home-bookings-badge");
const homeBookingsMeta = document.getElementById("home-bookings-meta");
const unreadStatCard = document.getElementById("unread-stat-card");
const unreadStatValue = document.getElementById("unread-stat-value");
const dashboardBookingsValue = document.getElementById("dashboard-bookings-value");

const recentActivityList = document.getElementById("recent-activity-list");
const homeChips = [...document.querySelectorAll("[data-home-chip]")];
const dashboardChips = [...document.querySelectorAll("[data-dashboard-chip]")];
const homeResetBtn = document.getElementById("home-customize-reset");
const dashboardResetBtn = document.getElementById("dashboard-customize-reset");

const settingFontSize = document.getElementById("setting-font-size");
const settingTimezone = document.getElementById("setting-timezone");
const settingNotifications = document.getElementById("setting-notifications");

let socials = SOCIALS.map((item) => ({ ...item }));
let bookings = BOOKINGS.map((item) => ({ ...item }));

function nowIso() {
  return new Date().toISOString();
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.startedAt) {
      return null;
    }
    if (Date.now() - parsed.startedAt > AUTH_TIMEOUT_MS) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setSession(email) {
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      email,
      startedAt: Date.now(),
      updatedAt: nowIso(),
    }),
  );
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function showAuthError(message) {
  authMessage.textContent = message;
  authMessage.classList.add("is-error");
}

function showAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.classList.remove("is-error");
}

function openApp(email) {
  authGate.hidden = true;
  app.hidden = false;
  userEmailNode.textContent = email;
  initializeAdminState();
  applyViewFromQuery();
}

function closeAppToLogin() {
  app.hidden = true;
  authGate.hidden = false;
  accountPicker.hidden = true;
}

function handleLogin(email) {
  if (email.toLowerCase() !== AUTH_EMAIL.toLowerCase()) {
    showAuthError("Access restricted to authorised users");
    return;
  }
  setSession(email);
  showAuthMessage("Login successful.");
  openApp(email);
}

function initAuth() {
  const currentSession = getStoredSession();
  if (currentSession?.email?.toLowerCase() === AUTH_EMAIL.toLowerCase()) {
    openApp(currentSession.email);
    return;
  }
  closeAppToLogin();
  showAuthMessage("Sign in with your Google Workspace account.");
}

function setActiveView(view) {
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== view;
  });
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === view);
  });
  const params = new URLSearchParams(window.location.search);
  params.set("view", view);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  sidebar.classList.remove("is-open");
  sidebarScrim.classList.remove("is-visible");
}

function applyViewFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get("view") || "home").trim();
  const knownViews = new Set([
    "home",
    "dashboard",
    "bookings",
    "pages",
    "uploads",
    "socials",
    "youtube",
    "analytics",
    "settings",
  ]);
  setActiveView(knownViews.has(view) ? view : "home");
}

function bindNavigation() {
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setActiveView(item.dataset.view || "home");
    });
  });
  openViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.openView || "home";
      setActiveView(view);
    });
  });
}

function renderSocialRows(targetBody, includeOrder = false) {
  if (!targetBody) {
    return;
  }
  targetBody.innerHTML = "";
  socials.forEach((social, index) => {
    const row = document.createElement("tr");
    const orderCell = includeOrder
      ? `
        <td>
          <div class="order-controls">
            <button type="button" data-order-dir="up" data-order-index="${index}">↑</button>
            <button type="button" data-order-dir="down" data-order-index="${index}">↓</button>
          </div>
        </td>
      `
      : "";
    row.innerHTML = `
      <td>${social.platform}</td>
      <td><a href="${social.url}" target="_blank" rel="noopener noreferrer">${social.url}</a></td>
      <td>
        <label class="admin-switch">
          <input type="checkbox" data-nav-index="${index}" ${social.inNav ? "checked" : ""} />
          <span></span>
        </label>
      </td>
      ${orderCell}
    `;
    targetBody.appendChild(row);
  });
}

function renderSocialTables() {
  renderSocialRows(socialsBody, true);
  renderSocialRows(dashboardSocialsBody, false);
}

function attachSocialTableHandlers() {
  socialsBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const orderBtn = target.closest("button[data-order-dir]");
    if (orderBtn instanceof HTMLButtonElement) {
      const dir = orderBtn.dataset.orderDir;
      const index = Number(orderBtn.dataset.orderIndex);
      if (!Number.isFinite(index)) {
        return;
      }
      const swapIndex = dir === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= socials.length) {
        return;
      }
      const temp = socials[index];
      socials[index] = socials[swapIndex];
      socials[swapIndex] = temp;
      renderSocialTables();
      return;
    }
  });

  [socialsBody, dashboardSocialsBody].forEach((tbody) => {
    tbody?.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (!target.matches("input[data-nav-index]")) {
        return;
      }
      const idx = Number(target.dataset.navIndex);
      if (!Number.isFinite(idx) || !socials[idx]) {
        return;
      }
      socials[idx].inNav = target.checked;
      renderSocialTables();
    });
  });
}

function renderBookings() {
  if (!bookingsBody) {
    return;
  }
  bookingsBody.innerHTML = "";
  bookings
    .slice()
    .sort((a, b) => new Date(b.received).getTime() - new Date(a.received).getTime())
    .forEach((booking) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <span class="booking-status-dot ${booking.status === "new" ? "is-new" : "is-read"}"></span>
          ${booking.status === "new" ? "New" : "Read"}
        </td>
        <td>${booking.venue}</td>
        <td>${booking.eventDate || "—"}</td>
        <td>${booking.eventType || "—"}</td>
        <td>${booking.budget || "—"}</td>
        <td>${new Date(booking.received).toLocaleString()}</td>
        <td>
          <div class="admin-inline-actions">
            <a class="admin-btn admin-btn-outline" href="mailto:${AUTH_EMAIL}?subject=Re:%20${encodeURIComponent(booking.venue)}">Reply</a>
            <button class="admin-btn admin-btn-outline" type="button" data-archive-booking="${booking.id}">
              Archive
            </button>
          </div>
        </td>
      `;
      bookingsBody.appendChild(row);
    });

  const unreadCount = bookings.filter((item) => item.status === "new").length;
  if (unreadBadge) {
    unreadBadge.textContent = String(unreadCount);
    unreadBadge.hidden = unreadCount <= 0;
  }
  if (homeBookingsBadge) {
    homeBookingsBadge.textContent = String(unreadCount);
    homeBookingsBadge.hidden = unreadCount <= 0;
  }
  if (homeBookingsMeta) {
    const unreadVenues = bookings
      .filter((item) => item.status === "new")
      .slice(0, 2)
      .map((item) => item.venue);
    homeBookingsMeta.textContent =
      unreadVenues.length > 0
        ? unreadVenues.join(" • ")
        : "No unread venue requests.";
  }
  if (unreadStatValue) {
    unreadStatValue.textContent = String(unreadCount);
  }
  if (dashboardBookingsValue) {
    dashboardBookingsValue.textContent = String(bookings.length);
  }
  if (unreadStatCard) {
    unreadStatCard.classList.toggle("admin-card-alert", unreadCount > 0);
  }
}

function bindBookingsHandlers() {
  bookingsBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const archiveBtn = target.closest("button[data-archive-booking]");
    if (!(archiveBtn instanceof HTMLButtonElement)) {
      return;
    }
    const id = archiveBtn.dataset.archiveBooking;
    const booking = bookings.find((item) => item.id === id);
    if (!booking) {
      return;
    }
    booking.status = "read";
    renderBookings();
  });
}

function renderActivity() {
  if (!recentActivityList) {
    return;
  }
  recentActivityList.innerHTML = "";
  RECENT_ACTIVITY.slice(0, 10).forEach((item) => {
    const row = document.createElement("li");
    row.className = "admin-activity-row";
    row.innerHTML = `
      <span class="activity-dot is-${item.type}" aria-hidden="true"></span>
      <div class="activity-copy">
        <p>${item.title}</p>
        <p class="activity-meta">${item.meta}</p>
      </div>
      <time>${item.at}</time>
    `;
    recentActivityList.appendChild(row);
  });
}

function setSectionVisibility(sectionId, visible) {
  const node = document.getElementById(sectionId);
  if (node) {
    node.hidden = !visible;
  }
}

function loadLocalJson(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallbackValue;
    }
    return { ...fallbackValue, ...JSON.parse(raw) };
  } catch {
    return fallbackValue;
  }
}

function saveLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function applyHomeChipState() {
  const state = loadLocalJson(HOME_TILES_KEY, { activity: true, socials: true });
  homeChips.forEach((chip) => {
    const key = chip.dataset.homeChip;
    const enabled = Boolean(key && state[key]);
    chip.classList.toggle("is-on", enabled);
    setSectionVisibility(`home-${key}-section`, enabled);
  });
}

function bindHomeChips() {
  homeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.homeChip;
      if (!key) {
        return;
      }
      const state = loadLocalJson(HOME_TILES_KEY, { activity: true, socials: true });
      state[key] = !state[key];
      saveLocalJson(HOME_TILES_KEY, state);
      applyHomeChipState();
    });
  });
  homeResetBtn?.addEventListener("click", () => {
    const reset = { activity: true, socials: true };
    saveLocalJson(HOME_TILES_KEY, reset);
    applyHomeChipState();
  });
}

const dashboardKeyToSectionId = {
  siteStats: "dashboard-site-stats",
  platforms: "dashboard-platforms",
  pages: "dashboard-pages",
  uploads: "dashboard-uploads",
  youtube: "dashboard-youtube",
  bookings: "dashboard-bookings",
  socials: "dashboard-socials",
};

function applyDashboardChipState() {
  const defaults = {
    siteStats: true,
    platforms: true,
    pages: true,
    uploads: true,
    youtube: true,
    bookings: true,
    socials: true,
  };
  const state = loadLocalJson(DASHBOARD_TILES_KEY, defaults);
  dashboardChips.forEach((chip) => {
    const key = chip.dataset.dashboardChip;
    const enabled = Boolean(key && state[key]);
    chip.classList.toggle("is-on", enabled);
    const sectionId = key ? dashboardKeyToSectionId[key] : "";
    if (sectionId) {
      setSectionVisibility(sectionId, enabled);
    }
  });
}

function bindDashboardChips() {
  dashboardChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.dashboardChip;
      if (!key) {
        return;
      }
      const defaults = {
        siteStats: true,
        platforms: true,
        pages: true,
        uploads: true,
        youtube: true,
        bookings: true,
        socials: true,
      };
      const state = loadLocalJson(DASHBOARD_TILES_KEY, defaults);
      state[key] = !state[key];
      saveLocalJson(DASHBOARD_TILES_KEY, state);
      applyDashboardChipState();
    });
  });
  dashboardResetBtn?.addEventListener("click", () => {
    const reset = {
      siteStats: true,
      platforms: true,
      pages: true,
      uploads: true,
      youtube: true,
      bookings: true,
      socials: true,
    };
    saveLocalJson(DASHBOARD_TILES_KEY, reset);
    applyDashboardChipState();
  });
}

function openSettingsPanel() {
  settingsPanel.hidden = false;
  settingsPanelScrim.hidden = false;
  settingsPanel.classList.add("is-open");
  settingsPanelScrim.classList.add("is-visible");
}

function closeSettingsPanel() {
  settingsPanel.classList.remove("is-open");
  settingsPanelScrim.classList.remove("is-visible");
  window.setTimeout(() => {
    settingsPanel.hidden = true;
    settingsPanelScrim.hidden = true;
  }, 140);
}

function bindSettingsPanel() {
  settingsToggleBtn?.addEventListener("click", openSettingsPanel);
  settingsCloseBtn?.addEventListener("click", closeSettingsPanel);
  settingsPanelScrim?.addEventListener("click", closeSettingsPanel);
}

function applySettingsState() {
  const settings = loadLocalJson(SETTINGS_KEY, {
    fontSize: "medium",
    timezone: "Europe/Zurich",
    notifications: true,
  });
  document.documentElement.dataset.adminFontSize = settings.fontSize;
  settingFontSize.value = settings.fontSize;
  settingTimezone.value = settings.timezone;
  settingNotifications.checked = settings.notifications;
}

function saveSettingsState() {
  const next = {
    fontSize: settingFontSize.value,
    timezone: settingTimezone.value,
    notifications: settingNotifications.checked,
  };
  saveLocalJson(SETTINGS_KEY, next);
  document.documentElement.dataset.adminFontSize = next.fontSize;
}

function bindSettingsFields() {
  [settingFontSize, settingTimezone, settingNotifications].forEach((field) => {
    field?.addEventListener("change", saveSettingsState);
  });
}

function bindSidebarToggle() {
  sidebarToggleBtn?.addEventListener("click", () => {
    sidebar.classList.add("is-open");
    sidebarScrim.classList.add("is-visible");
  });
  sidebarScrim?.addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    sidebarScrim.classList.remove("is-visible");
  });
}

function bindAddPlatformFlow() {
  addPlatformBtn?.addEventListener("click", () => {
    addPlatformForm.hidden = false;
    addPlatformBtn.disabled = true;
  });
  cancelPlatformBtn?.addEventListener("click", () => {
    addPlatformForm.hidden = true;
    addPlatformBtn.disabled = false;
    addPlatformForm.reset();
  });
  addPlatformForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const platform = addPlatformName.value.trim();
    const url = addPlatformUrl.value.trim();
    if (!platform || !url) {
      return;
    }
    socials.push({
      platform,
      url,
      inNav: addPlatformInNav.checked,
    });
    renderSocialTables();
    addPlatformForm.reset();
    addPlatformForm.hidden = true;
    addPlatformBtn.disabled = false;
  });
}

function bindLogout() {
  logoutBtn?.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });
}

function bindAuthUi() {
  googleLoginBtn?.addEventListener("click", () => {
    accountPicker.hidden = false;
    showAuthMessage("Select a Google account to continue.");
  });
  accountPicker?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const email = target.dataset.authEmail;
    if (!email) {
      return;
    }
    handleLogin(email);
  });
}

function initializeAdminState() {
  renderSocialTables();
  renderBookings();
  renderActivity();
  applyHomeChipState();
  applyDashboardChipState();
  applySettingsState();
}

function bindAll() {
  bindAuthUi();
  bindNavigation();
  bindSettingsPanel();
  bindSettingsFields();
  bindSidebarToggle();
  bindAddPlatformFlow();
  attachSocialTableHandlers();
  bindBookingsHandlers();
  bindHomeChips();
  bindDashboardChips();
  bindLogout();
}

bindAll();
initAuth();
