import {
  subscribeToReports,
  getReportsSnapshot,
  setStatus,
  setPinned,
  setVerified,
  setVoteDelta,
  setDeleted
} from "./reports-store.js";

const BRAND_NAME = "GeoNetra";
const BRAND_TAGLINE = "Intelligent Hazard Monitoring Network";
const VERIFICATION_STORAGE_KEY = "geonetra_verified";
const THEME_STORAGE_KEY = "geonetra_theme";
const DEFAULT_THEME = "dark";
const EMERGENCY_POPUP_DURATION_MS = 10000;
const EMERGENCY_POPUP_DISMISS_MS = 350;
const EMERGENCY_POPUP_SESSION_KEY = "geonetra_emergency_popup_seen";

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home", href: { root: "index.html", html: "../index.html" } },
  { key: "dashboard", label: "Dashboard", icon: "layout-dashboard", href: { root: "HTML/dashboard.html", html: "dashboard.html" } },
  { key: "analytics", label: "Analytics", icon: "activity", href: { root: "HTML/analytics.html", html: "analytics.html" } },
  { key: "globe", label: "3D Globe", icon: "orbit", href: { root: "HTML/globe.html", html: "globe.html" } },
  { key: "advisories", label: "Advisories", icon: "book-open-check", href: { root: "HTML/advisories.html", html: "advisories.html" } },
  { key: "report", label: "Report Hazard", icon: "triangle-alert", href: { root: "HTML/hazard.html", html: "hazard.html" }, isRed: true },
  { key: "map", label: "Map Events", icon: "map-pin", href: { root: "HTML/map.html", html: "map.html" } },
  { key: "shelters", label: "Shelters", icon: "shield-alert", href: { root: "HTML/shelters.html", html: "shelters.html" } }
];

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function getPageKey() {
  const datasetPage = document.body?.dataset?.page;
  if (datasetPage) return datasetPage;
  const pathname = (window.location.pathname || "").replace(/\\/g, "/").toLowerCase();
  if (pathname.includes("admin-dashboard")) return "admin-dashboard";
  if (pathname.includes("manage-reports") || pathname.includes("manage")) return "manage";
  if (pathname.includes("pinned-hazards") || pathname.includes("pinned")) return "pinned";
  if (pathname.includes("verification")) return "verification";
  if (pathname.includes("dashboard")) return "dashboard";
  if (pathname.includes("analytics")) return "analytics";
  if (pathname.includes("globe")) return "globe";
  if (pathname.includes("advisories")) return "advisories";
  if (pathname.includes("hazard")) return "report";
  if (pathname.includes("map")) return "map";
  if (pathname.includes("shelter")) return "shelters";
  if (pathname.includes("profile")) return "profile";
  if (pathname.includes("login")) return "login";
  return "home";
}

function isHomePage() {
  return getPageKey() === "home";
}

function isHtmlPage() {
  const pathname = (window.location.pathname || "").replace(/\\/g, "/").toLowerCase();
  if (pathname.includes("/html/")) return true;
  return getPageKey() !== "home";
}

function isHttpProtocol() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

function getPagePath(filename) {
  if (filename === "index.html") {
    if (isHttpProtocol()) return "/index.html";
    return isHtmlPage() ? "../index.html" : "index.html";
  }
  const cleanName = filename.replace(/^HTML\//i, "");
  if (isHttpProtocol()) return `/HTML/${cleanName}`;
  return isHtmlPage() ? cleanName : `HTML/${cleanName}`;
}

function getAssetPath(assetPath) {
  const cleanPath = assetPath.replace(/^(\.\.\/)+/, "").replace(/^\//, "");
  if (isHttpProtocol()) return `/${cleanPath}`;
  return isHtmlPage() ? `../${cleanPath}` : cleanPath;
}

function getRelativePrefix() {
  return isHtmlPage() ? "" : "HTML/";
}

function getRootPrefix() {
  return isHtmlPage() ? "../" : "";
}

const AUTH_USER_KEY = "geonetra_auth_user";
const REGISTERED_USERS_KEY = "geonetra_registered_users";

function initializeUserDatabase() {
  const existing = localStorage.getItem(REGISTERED_USERS_KEY);
  let users = [];
  try {
    users = existing ? JSON.parse(existing) : [];
  } catch {
    users = [];
  }

  const hasAdmin = users.some((u) => (u.email || "").toLowerCase() === "admin@geonetra.com" || (u.username || "").toLowerCase() === "admin");
  if (!hasAdmin) {
    users.unshift({
      username: "admin",
      email: "admin@geonetra.com",
      phone: "9999999999",
      password: "Admin@1234",
      role: "admin"
    });
  }

  const hasObserver = users.some((u) => (u.email || "").toLowerCase() === "observer@geonetra.gov.in");
  if (!hasObserver) {
    users.push({
      username: "observeradmin",
      email: "observer@geonetra.gov.in",
      phone: "9876543210",
      password: "Password@123",
      role: "Field Monitor"
    });
  }

  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

function getRegisteredUsers() {
  initializeUserDatabase();
  try {
    const raw = JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY) || "[]");
    return raw.map((u) => ({ ...u, username: (u.username || "").toLowerCase() }));
  } catch {
    return [];
  }
}

function getAuthUser() {
  try {
    const data = localStorage.getItem(AUTH_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return !!getAuthUser();
}

const AUTH_TOKEN_KEY = "geonetra_auth_token";
const BACKEND_BASE_URL = "http://localhost:3000";

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function setAuthSession(user, token = null) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(VERIFICATION_STORAGE_KEY, "true");
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(VERIFICATION_STORAGE_KEY);
}

async function ensureAuthToken(currentPassword = null) {
  let token = getAuthToken();
  if (token) return token;

  const user = getAuthUser();
  if (user && currentPassword) {
    try {
      const loginRes = await apiAuthRequest("/api/auth/login", "POST", {
        identifier: user.email || user.username || user.phone,
        password: currentPassword
      });
      if (loginRes?.token) {
        setAuthSession(loginRes.user || user, loginRes.token);
        return loginRes.token;
      }
    } catch {
      // Ignore login error, will be handled by profile endpoint
    }
  }
  return "";
}

async function apiAuthRequest(endpoint, method = "POST", data = null, needsAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (needsAuth) {
    let token = getAuthToken();
    if (!token && data?.currentPassword) {
      token = await ensureAuthToken(data.currentPassword);
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson?.error || `Server request failed with status ${response.status}`);
  }
  return resJson;
}


function isAdminUser() {
  const user = getAuthUser();
  if (!user) return false;
  return user.role === "admin" || (user.email || "").toLowerCase() === "admin@geonetra.com" || (user.username || "").toLowerCase() === "admin";
}

function checkAuthGuard() {
  const pathname = (window.location.pathname || "").replace(/\\/g, "/").toLowerCase();
  const isLoginPage = pathname.includes("login") || document.body?.dataset?.page === "login";
  const authed = isAuthenticated();
  const isAdmin = isAdminUser();
  const requiresAdmin = document.body?.dataset?.adminRequired === "true" || pathname.includes("manage-reports") || pathname.includes("pinned-hazards") || pathname.includes("admin-dashboard") || pathname.includes("verification");

  if (!authed && !isLoginPage) {
    window.location.replace(getPagePath("login.html"));
    return false;
  }

  if (authed && isLoginPage) {
    window.location.replace(isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("index.html"));
    return false;
  }

  if (requiresAdmin && !isAdmin) {
    alert("Administrator privileges required to access this operations console.");
    window.location.replace(getPagePath("index.html"));
    return false;
  }

  return true;
}

// Immediate top-level auth guard execution
initializeUserDatabase();
checkAuthGuard();

const VERIFIED_REPORTERS_KEY = "geonetra_verified_reporters";

async function fetchVerifiedReporters() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/verified-reporters`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn("Using offline verified reporters cache:", err);
  }
  try {
    return JSON.parse(localStorage.getItem(VERIFIED_REPORTERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function getVerifiedReportersSync() {
  try {
    return JSON.parse(localStorage.getItem(VERIFIED_REPORTERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function isEmailVerified(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  if (clean === "admin@geonetra.com") return true;
  const list = getVerifiedReportersSync();
  return list.some((item) => {
    const itemEmail = String(typeof item === "string" ? item : (item.email || "")).trim().toLowerCase();
    return itemEmail === clean;
  });
}

function isVerifiedReporter() {
  const user = getAuthUser();
  if (!user) return false;
  if (isAdminUser()) return true;
  return isEmailVerified(user.email);
}

function isReportVerified(report) {
  if (!report) return false;
  if (report.verified === true || report.isVerifiedReporter === true) return true;
  const email = (report.userEmail || report.email || report.authorEmail || "").trim().toLowerCase();
  if (email && isEmailVerified(email)) return true;
  return false;
}

async function addVerifiedReporterApi(email, verifiedBy = "Operations Administrator") {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) throw new Error("Email address is required.");
  const list = getVerifiedReportersSync();
  if (list.some((item) => (typeof item === "string" ? item.toLowerCase() : (item.email || "").toLowerCase()) === clean)) {
    throw new Error("This email is already in the verified reporters roster.");
  }
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/verified-reporters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: clean, verifiedBy })
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || "Failed to add verified reporter");
    if (Array.isArray(resJson.reporters)) {
      localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(resJson.reporters));
    } else if (resJson.reporter) {
      list.unshift(resJson.reporter);
      localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(list));
    }
    return resJson;
  } catch (err) {
    if (err.message && err.message.includes("already")) throw err;
    const fallbackEntry = { email: clean, verifiedAt: new Date().toISOString(), verifiedBy };
    list.unshift(fallbackEntry);
    localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(list));
    return { success: true, reporter: fallbackEntry };
  }
}

async function removeVerifiedReporterApi(email) {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return;
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/verified-reporters/${encodeURIComponent(clean)}`, {
      method: "DELETE"
    });
    const resJson = await res.json();
    if (Array.isArray(resJson?.reporters)) {
      localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(resJson.reporters));
    } else {
      const list = getVerifiedReportersSync().filter((item) => (typeof item === "string" ? item.toLowerCase() : (item.email || "").toLowerCase()) !== clean);
      localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(list));
    }
    return resJson;
  } catch (err) {
    const list = getVerifiedReportersSync().filter((item) => (typeof item === "string" ? item.toLowerCase() : (item.email || "").toLowerCase()) !== clean);
    localStorage.setItem(VERIFIED_REPORTERS_KEY, JSON.stringify(list));
    return { success: true };
  }
}

function updateHeaderVerificationBadge(isVerified) {
  const pill = document.getElementById("headerVerifiedStatus");
  if (!pill) return;
  pill.className = `verified-pill ${isVerified ? 'verified' : 'unverified'}`;
  pill.innerHTML = `
    <i data-lucide="${isVerified ? 'shield-check' : 'shield-alert'}"></i>
    <span>${isVerified ? 'Verified Reporter' : 'Unverified Reporter'}</span>
  `;
  refreshIcons();
}

function migrateLegacyVerificationState() {
  // Synchronize reporters list from backend asynchronously
  fetchVerifiedReporters().then(() => {
    updateHeaderVerificationBadge(isVerifiedReporter());
  }).catch(() => {});
}

function getStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!storedTheme || storedTheme === "light") {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    return "dark";
  }
  return storedTheme;
}

function updateThemeToggleState(theme) {
  const toggles = document.querySelectorAll("#themeToggle, .theme-toggle-btn");
  toggles.forEach((toggle) => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    toggle.setAttribute("title", `Switch to ${nextTheme} mode`);
    toggle.dataset.theme = theme;
    const iconTarget = toggle.querySelector("[data-theme-icon]");
    if (iconTarget) {
      iconTarget.setAttribute("data-lucide", theme === "dark" ? "sun-medium" : "moon-star");
    }
  });
}

function applyTheme(theme, { persist = true } = {}) {
  document.body.dataset.theme = theme;
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  updateThemeToggleState(theme);
}

function withThemeTransition(callback) {
  document.body.classList.add("theme-transitioning");
  callback();
  window.setTimeout(() => {
    document.body.classList.remove("theme-transitioning");
  }, 320);
}

function getReportDestination() {
  const filename = isAuthenticated() ? "hazard.html" : "login.html";
  return getPagePath(filename);
}

function getNavHref(item) {
  if (item.key === "home") return getPagePath("index.html");
  if (item.key === "report") return getReportDestination();
  if (item.key === "dashboard" && isAdminUser()) return getPagePath("admin-dashboard.html");
  if (item.key === "verification") return getPagePath("verification.html");
  return getPagePath(`${item.key}.html`);
}

function renderSharedHeader() {
  const header = document.querySelector(".geonetra-header");
  if (!header) return;

  const pageKey = getPageKey();
  const isAdmin = isAdminUser();
  const rootHref = isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("index.html");
  const logoSrc = getAssetPath("assets/geonetra-logo.svg");
  const profileHref = getPagePath("profile.html");
  const mapHref = getPagePath("map.html");
  const advisoriesHref = getPagePath("advisories.html");
  const verified = isVerifiedReporter();
  const authUser = getAuthUser();
  const displayName = authUser?.username || "Observer User";
  const displayEmail = authUser?.email || "observer@geonetra.gov.in";
  const displayRole = isAdmin ? "Chief Incident Commander" : (authUser?.role || "Field Monitor");
  const avatarLetter = (displayName[0] || "U").toUpperCase();

  const adminNavItems = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "verification", label: "Verification", icon: "user-check" },
    { key: "analytics", label: "Analytics", icon: "activity" },
    { key: "globe", label: "3D Globe", icon: "orbit" },
    { key: "advisories", label: "Advisories", icon: "book-open-check" },
    { key: "report", label: "Report Hazard", icon: "triangle-alert", isRed: true },
    { key: "map", label: "Map Events", icon: "map-pin" },
    { key: "shelters", label: "Shelters", icon: "shield-alert" }
  ];
  const navItems = isAdmin ? adminNavItems : NAV_ITEMS;
  const isItemActive = (item) => {
    if (item.key === pageKey) return true;
    if (item.key === "dashboard") {
      if (isAdmin && (pageKey === "admin-dashboard" || pageKey === "manage" || pageKey === "pinned")) return true;
      if (!isAdmin && pageKey === "dashboard") return true;
    }
    if (item.key === "verification" && pageKey === "verification") return true;
    return false;
  };

  header.innerHTML = `
    <!-- Single-Tier Unified Header (Image 2 Specification) -->
    <div class="geonetra-single-header">
      <div class="header-inner-container">
        <!-- Left Group: Circular Eye Logo (Image 1) + GeoNetra Wordmark + Navigation Buttons (Image 2) -->
        <div class="header-left-group">
          <a href="${rootHref}" class="brand-identity-single" title="${BRAND_NAME} - National Monitoring">
            <div class="brand-logo-circle">
              <img src="${logoSrc}" alt="GeoNetra Eye Emblem" class="brand-circle-img" />
            </div>
            <span class="brand-name-single">${BRAND_NAME}</span>
          </a>

          <!-- Primary Navigation Links: Dashboard, Verification (admin), Analytics, Advisories, Report Hazard (red), Map Events -->
          <nav class="single-nav-links" aria-label="Primary Navigation">
            ${navItems.map((item) => `
              <a href="${getNavHref(item)}" 
                 class="nav-text-link${isItemActive(item) ? ' active' : ''}${item.isRed || item.key === 'report' ? ' red-link' : ''}" 
                 data-nav="${item.key}">
                <span>${item.label}</span>
              </a>
            `).join('')}
          </nav>
        </div>

        <!-- Right Group: Live Status, Notifications, Theme, Profile -->
        <div class="header-right-group">
          <!-- Real-time network status pill -->
          <div class="header-status-badge" title="Network active and synchronized 24/7">
            <span class="status-pulse-dot"></span>
            <span class="status-text-label">Live 24/7</span>
          </div>

          <!-- Notification Button & Dropdown -->
          <div class="dropdown-wrapper" id="notifWrapper">
            <button class="icon-utility-btn" id="home-notification-btn" title="Recent Alerts" type="button" aria-label="Notifications">
              <span class="badge">3</span>
              <i data-lucide="bell"></i>
            </button>
            <div class="notification-dropdown" id="home-notification-dropdown">
              <div class="dropdown-header">
                <div class="dropdown-header-title">
                  <i data-lucide="shield-alert"></i>
                  <h4>Hazard Broadcasts</h4>
                </div>
                <span class="badge small">3 Active</span>
              </div>
              <div class="dropdown-content">
                <a href="${mapHref}" class="notification-item unread">
                  <div class="notif-icon severe"><i data-lucide="triangle-alert"></i></div>
                  <div class="notif-text">
                    <p class="notif-title">High Wave Alert</p>
                    <p class="notif-desc">Mumbai coastline seeing unusually severe swell & surge.</p>
                    <p class="notif-time">Just now</p>
                  </div>
                </a>
                <a href="${mapHref}" class="notification-item unread">
                  <div class="notif-icon warning"><i data-lucide="cloud-lightning"></i></div>
                  <div class="notif-text">
                    <p class="notif-title">Cyclone Warning</p>
                    <p class="notif-desc">Deep depression tracking toward Eastern coast corridor.</p>
                    <p class="notif-time">2 hours ago</p>
                  </div>
                </a>
                <a href="${mapHref}" class="notification-item">
                  <div class="notif-icon info"><i data-lucide="info"></i></div>
                  <div class="notif-text">
                    <p class="notif-title">Telemetry Sensor Sync</p>
                    <p class="notif-desc">New marine buoys and seismic radar feeds active.</p>
                    <p class="notif-time">1 day ago</p>
                  </div>
                </a>
              </div>
              <div class="dropdown-footer">
                <a href="${mapHref}"><i data-lucide="map"></i> View all live incidents on map</a>
              </div>
            </div>
          </div>

          <!-- Theme Toggle -->
          <button class="icon-utility-btn" id="themeToggle" type="button" title="Toggle theme" aria-label="Toggle theme">
            <i data-theme-icon data-lucide="sun-medium"></i>
          </button>

          <!-- Profile Button (Existing single profile button preserved & enhanced with dropdown menu) -->
          <div class="profile-dropdown-wrapper" id="profileWrapper">
            <button class="user-profile-btn" id="headerProfileBtn" type="button" aria-label="User Account Menu">
              <div class="avatar">${avatarLetter}</div>
              <span class="profile-name">${displayName}</span>
              <i data-lucide="chevron-down" class="profile-chevron"></i>
            </button>
            <div class="profile-menu-dropdown" id="profileDropdown">
              <div class="profile-menu-header">
                <div class="avatar-lg">${avatarLetter}</div>
                <div>
                  <strong>${displayName}</strong>
                  <span class="email-subtext">${displayEmail}</span>
                  <span class="verified-pill ${verified ? 'verified' : 'unverified'}" id="headerVerifiedStatus">
                    <i data-lucide="${verified ? 'shield-check' : 'shield-alert'}"></i>
                    <span>${verified ? 'Verified Reporter' : 'Unverified Reporter'}</span>
                  </span>
                </div>
              </div>
              <div class="profile-menu-links">
                ${isAdmin ? `
                  <a href="${getPagePath('admin-dashboard.html')}" class="profile-menu-link" style="color:#a5b4fc;font-weight:600;">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Admin Command Center</span>
                  </a>
                  <a href="${getPagePath('verification.html')}" class="profile-menu-link" style="color:#a5b4fc;font-weight:600;">
                    <i data-lucide="user-check"></i>
                    <span>Reporter Verification</span>
                  </a>
                  <a href="${getPagePath('manage-reports.html')}" class="profile-menu-link" style="color:#a5b4fc;font-weight:600;">
                    <i data-lucide="list-checks"></i>
                    <span>Manage Reports Queue</span>
                  </a>
                  <a href="${getPagePath('pinned-hazards.html')}" class="profile-menu-link" style="color:#a5b4fc;font-weight:600;">
                    <i data-lucide="pin"></i>
                    <span>Pinned Priority Board</span>
                  </a>
                ` : ''}
                <a href="${getPagePath('globe.html')}" class="profile-menu-link">
                  <i data-lucide="orbit"></i>
                  <span>3D Threat Globe</span>
                </a>
                <a href="${getPagePath('shelters.html')}" class="profile-menu-link">
                  <i data-lucide="shield-alert"></i>
                  <span>Emergency Shelters</span>
                </a>
                <a href="${profileHref}" class="profile-menu-link" id="btnHeaderEditProfile" aria-label="Edit Profile">
                  <i data-lucide="user-pen"></i>
                  <span>Edit Profile</span>
                </a>
                <a href="${getReportDestination()}" class="profile-menu-link">
                  <i data-lucide="file-plus"></i>
                  <span>File Hazard Report</span>
                </a>
                <a href="${advisoriesHref}" class="profile-menu-link">
                  <i data-lucide="life-buoy"></i>
                  <span>Emergency Safety Hub</span>
                </a>
              </div>
              <div class="profile-menu-footer">
                <button type="button" class="logout-btn" id="logoutActionBtn">
                  <i data-lucide="log-out"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile Hamburger Toggle -->
          <button class="mobile-hamburger-btn" id="mobileMenuToggle" type="button" aria-label="Toggle Navigation Menu">
            <i data-lucide="menu"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  injectMobileDrawer();
}

function injectMobileDrawer() {
  if (document.querySelector(".mobile-nav-drawer")) return;

  const pageKey = getPageKey();
  const isAdmin = isAdminUser();
  const rootHref = isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("index.html");
  const profileHref = getPagePath("profile.html");
  const adminNavItems = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "verification", label: "Verification", icon: "user-check" },
    { key: "analytics", label: "Analytics", icon: "activity" },
    { key: "globe", label: "3D Globe", icon: "orbit" },
    { key: "advisories", label: "Advisories", icon: "book-open-check" },
    { key: "report", label: "Report Hazard", icon: "triangle-alert", isRed: true },
    { key: "map", label: "Map Events", icon: "map-pin" },
    { key: "shelters", label: "Shelters", icon: "shield-alert" }
  ];
  const navItems = isAdmin ? adminNavItems : NAV_ITEMS;
  const isItemActive = (item) => {
    if (item.key === pageKey) return true;
    if (item.key === "dashboard") {
      if (isAdmin && (pageKey === "admin-dashboard" || pageKey === "manage" || pageKey === "pinned")) return true;
      if (!isAdmin && pageKey === "dashboard") return true;
    }
    if (item.key === "verification" && pageKey === "verification") return true;
    return false;
  };

  const backdrop = document.createElement("div");
  backdrop.className = "mobile-nav-backdrop";
  backdrop.id = "mobileNavBackdrop";

  const drawer = document.createElement("aside");
  drawer.className = "mobile-nav-drawer";
  drawer.id = "mobileNavDrawer";
  drawer.innerHTML = `
    <div class="mobile-drawer-header">
      <div class="brand-name-wrap">
        <span class="brand-title">${BRAND_NAME}</span>
      </div>
      <button class="mobile-drawer-close" id="mobileDrawerClose" type="button" aria-label="Close menu">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="mobile-drawer-links">
      ${navItems.map((item) => `
        <a href="${getNavHref(item)}" class="mobile-drawer-link${isItemActive(item) ? ' active' : ''}">
          <i data-lucide="${item.icon}"></i>
          <span>${item.label}</span>
        </a>
      `).join('')}
      <hr style="border:0;border-top:1px solid var(--border-subtle);margin:.5rem 0;">
      <a href="${profileHref}" class="mobile-drawer-link${pageKey === 'profile' ? ' active' : ''}">
        <i data-lucide="user"></i>
        <span>My Profile & Settings</span>
      </a>
    </div>
    <div class="mobile-drawer-footer">
      <div class="emergency-code" style="font-size:0.84rem;margin-bottom:0.5rem;">
        National Helpline: 1078 / 112
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);">&copy; 2026 ${BRAND_NAME}</p>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);
}

function renderSharedFooter() {
  const footerContainer = document.querySelector(".geonetra-footer-container");
  if (!footerContainer) return;

  const isAdmin = isAdminUser();
  const rootHref = isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("index.html");
  const dashboardHref = isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("dashboard.html");
  const analyticsHref = getPagePath("analytics.html");
  const advisoriesHref = getPagePath("advisories.html");
  const mapHref = getPagePath("map.html");
  const hazardHref = getReportDestination();
  const profileHref = getPagePath("profile.html");

  const logoSrc = getAssetPath("assets/geonetra-logo.svg");

  footerContainer.innerHTML = `
    <footer class="geonetra-footer">
      <div class="container-wide">
        <div class="footer-grid">
          <div class="footer-brand-col">
            <div class="footer-logo-wrap">
              <div class="brand-logo-circle" style="width:34px;height:34px;">
                <img src="${logoSrc}" alt="GeoNetra" class="brand-circle-img" />
              </div>
              <span class="brand-title" style="font-size:1.2rem;">${BRAND_NAME}</span>
            </div>
            <p class="footer-desc">
              National Intelligent Hazard Monitoring Network. Crowdsourced situational awareness, high-frequency radar, and verified safety advisories for resilient communities.
            </p>
          </div>
          <div>
            <h4 class="footer-col-title">Platform</h4>
            <div class="footer-nav-list">
              <a href="${rootHref}">Home Portal</a>
              <a href="${dashboardHref}">Overview Dashboard</a>
              <a href="${analyticsHref}">Incident Analytics</a>
              <a href="${getPagePath('globe.html')}">3D Threat Globe</a>
              <a href="${mapHref}">Live Map Events</a>
              <a href="${getPagePath('shelters.html')}">Emergency Shelters</a>
            </div>
          </div>
          <div>
            <h4 class="footer-col-title">Safety & Action</h4>
            <div class="footer-nav-list">
              <a href="${hazardHref}">Report Hazard</a>
              <a href="${advisoriesHref}">Safety Advisories</a>
              <a href="${advisoriesHref}">Emergency Contacts</a>
              <a href="${profileHref}">Observer Verification</a>
            </div>
          </div>
          <div>
            <h4 class="footer-col-title">Emergency Toll-Free</h4>
            <div class="footer-nav-list">
              <a href="tel:1078"><strong>1078</strong> - National Disaster</a>
              <a href="tel:112"><strong>112</strong> - Emergency Response</a>
              <a href="tel:1070"><strong>1070</strong> - State Relief</a>
              <a href="tel:1554"><strong>1554</strong> - Indian Coast Guard</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom-row">
          <p>&copy; 2026 ${BRAND_NAME} · Ministry & Community Safety Network. All rights reserved.</p>
          <p>Official Institutional Platform · Privacy & Disaster Ethics Compliant</p>
        </div>
      </div>
    </footer>
  `;
}

function initializeNavigationEvents() {
  const notifBtn = document.getElementById("home-notification-btn");
  const notifWrapper = document.getElementById("notifWrapper");
  const profileBtn = document.getElementById("headerProfileBtn");
  const profileWrapper = document.getElementById("profileWrapper");
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const drawer = document.getElementById("mobileNavDrawer");
  const backdrop = document.getElementById("mobileNavBackdrop");
  const drawerClose = document.getElementById("mobileDrawerClose");
  const logoutBtn = document.getElementById("logoutActionBtn");

  // Notifications toggle
  notifBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileWrapper?.classList.remove("active");
    notifWrapper?.classList.toggle("active");
  });

  // Profile dropdown toggle
  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    notifWrapper?.classList.remove("active");
    profileWrapper?.classList.toggle("active");
  });

  // Close menus on outside click
  document.addEventListener("click", (e) => {
    if (notifWrapper && !notifWrapper.contains(e.target)) {
      notifWrapper.classList.remove("active");
    }
    if (profileWrapper && !profileWrapper.contains(e.target)) {
      profileWrapper.classList.remove("active");
    }
  });

  // Mobile drawer controls
  const openDrawer = () => {
    drawer?.classList.add("active");
    backdrop?.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeDrawer = () => {
    drawer?.classList.remove("active");
    backdrop?.classList.remove("active");
    document.body.style.overflow = "";
  };

  mobileToggle?.addEventListener("click", openDrawer);
  drawerClose?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      closeDrawer();
    }
  });

  // Logout / Sign out action
  logoutBtn?.addEventListener("click", () => {
    clearAuthSession();
    window.location.replace(getPagePath("login.html"));
  });
}

function initializeThemeToggle() {
  const themeToggles = document.querySelectorAll("#themeToggle, .theme-toggle-btn");
  if (!themeToggles.length) return;
  updateThemeToggleState(document.body.dataset.theme || getStoredTheme());

  themeToggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentTheme = document.body.dataset.theme || DEFAULT_THEME;
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      withThemeTransition(() => applyTheme(nextTheme));
      refreshIcons();
    });
  });
}

function initializeEmergencyPopup() {
  const popup = document.getElementById("emergencyPopup");
  const closeButton = document.getElementById("emergencyPopupClose");
  const timerElement = document.getElementById("emergencyPopupTimer");
  if (!popup || !closeButton || !timerElement) return;
  if (sessionStorage.getItem(EMERGENCY_POPUP_SESSION_KEY) === "true") return;

  let remainingSeconds = 10;
  let intervalId = null;

  const hidePopup = () => {
    popup.classList.add("is-hiding");
    popup.classList.remove("is-visible");
    if (intervalId) {
      window.clearInterval(intervalId);
    }
    window.setTimeout(() => {
      popup.classList.remove("is-hiding");
    }, EMERGENCY_POPUP_DISMISS_MS);
  };

  sessionStorage.setItem(EMERGENCY_POPUP_SESSION_KEY, "true");
  popup.classList.add("is-visible");
  intervalId = window.setInterval(() => {
    remainingSeconds -= 1;
    timerElement.textContent = String(remainingSeconds);
    if (remainingSeconds <= 0) {
      hidePopup();
    }
  }, 1000);

  closeButton.addEventListener("click", hidePopup, { once: true });
  window.setTimeout(() => {
    if (popup.classList.contains("is-visible")) {
      hidePopup();
    }
  }, EMERGENCY_POPUP_DURATION_MS);
}

function initializeStatCounters() {
  const statNumbers = document.querySelectorAll(".stat-number, .counter");
  if (statNumbers.length === 0) return;

  const animateValue = (element, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const value = Math.floor(eased * (end - start) + start);
      element.textContent = element.classList.contains("counter") && end >= 1000 ? value.toLocaleString() : String(value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const target = Number(entry.target.getAttribute("data-target"));
      if (!Number.isFinite(target)) return;
      animateValue(entry.target, 0, target, 1500);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  statNumbers.forEach((item) => observer.observe(item));
}

function formatRelativeTime(dateValue) {
  if (!dateValue) return "Reported recently";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Reported recently";
  const diffMs = Date.now() - date.getTime();
  const minute = 60000;
  const hour = minute * 60;
  const day = hour * 24;
  if (diffMs < minute) return "Reported just now";
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `Reported ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `Reported ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(diffMs / day);
  return `Reported ${days} day${days === 1 ? "" : "s"} ago`;
}

function formatLanguageName(languageCode) {
  if (!languageCode) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(languageCode) || languageCode;
  } catch {
    return languageCode;
  }
}

async function geocodeAddress(address) {
  try {
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`, { headers: { Accept: "application/json" } });
    if (response.ok) {
      const data = await response.json();
      if (data.features?.length) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        return { lat, lng };
      }
    }
  } catch (error) {
    console.warn("Photon geocoding fallback:", error);
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: Number.parseFloat(data[0].lat), lng: Number.parseFloat(data[0].lon) };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}

const COUNTRIES_DATA = [
  { name: "India", code: "+91", flag: "🇮🇳", iso: "IN" },
  { name: "United States", code: "+1", flag: "🇺🇸", iso: "US" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", iso: "GB" },
  { name: "Australia", code: "+61", flag: "🇦🇺", iso: "AU" },
  { name: "Canada", code: "+1", flag: "🇨🇦", iso: "CA" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱", iso: "NL" },
  { name: "New Caledonia", code: "+687", flag: "🇳🇨", iso: "NC" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿", iso: "NZ" },
  { name: "Nicaragua", code: "+505", flag: "🇳🇮", iso: "NI" },
  { name: "Niger", code: "+227", flag: "🇳🇪", iso: "NE" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬", iso: "NG" },
  { name: "Niue", code: "+683", flag: "🇳🇺", iso: "NU" },
  { name: "Norfolk Island", code: "+672", flag: "🇳🇫", iso: "NF" },
  { name: "North Korea", code: "+850", flag: "🇰🇵", iso: "KP" },
  { name: "North Macedonia", code: "+389", flag: "🇲🇰", iso: "MK" },
  { name: "Northern Mariana Islands", code: "+1", flag: "🇲🇵", iso: "MP" },
  { name: "Norway", code: "+47", flag: "🇳🇴", iso: "NO" },
  { name: "Oman", code: "+968", flag: "🇴🇲", iso: "OM" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰", iso: "PK" },
  { name: "Palau", code: "+680", flag: "🇵🇼", iso: "PW" },
  { name: "Palestine", code: "+970", flag: "🇵🇸", iso: "PS" },
  { name: "Panama", code: "+507", flag: "🇵🇦", iso: "PA" },
  { name: "Papua New Guinea", code: "+675", flag: "🇵🇬", iso: "PG" },
  { name: "Paraguay", code: "+595", flag: "🇵🇾", iso: "PY" },
  { name: "Peru", code: "+51", flag: "🇵🇪", iso: "PE" },
  { name: "Philippines", code: "+63", flag: "🇵🇭", iso: "PH" },
  { name: "Poland", code: "+48", flag: "🇵🇱", iso: "PL" },
  { name: "Portugal", code: "+351", flag: "🇵🇹", iso: "PT" },
  { name: "Qatar", code: "+974", flag: "🇶🇦", iso: "QA" },
  { name: "Romania", code: "+40", flag: "🇷🇴", iso: "RO" },
  { name: "Russia", code: "+7", flag: "🇷🇺", iso: "RU" },
  { name: "Rwanda", code: "+250", flag: "🇷🇼", iso: "RW" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦", iso: "SA" },
  { name: "Singapore", code: "+65", flag: "🇸🇬", iso: "SG" },
  { name: "South Africa", code: "+27", flag: "🇿🇦", iso: "ZA" },
  { name: "South Korea", code: "+82", flag: "🇰🇷", iso: "KR" },
  { name: "Spain", code: "+34", flag: "🇪🇸", iso: "ES" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰", iso: "LK" },
  { name: "Sweden", code: "+46", flag: "🇸🇪", iso: "SE" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭", iso: "CH" },
  { name: "Thailand", code: "+66", flag: "🇹🇭", iso: "TH" },
  { name: "Turkey", code: "+90", flag: "🇹🇷", iso: "TR" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪", iso: "AE" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳", iso: "VN" },
  { name: "Germany", code: "+49", flag: "🇩🇪", iso: "DE" },
  { name: "France", code: "+33", flag: "🇫🇷", iso: "FR" },
  { name: "Italy", code: "+39", flag: "🇮🇹", iso: "IT" },
  { name: "Japan", code: "+81", flag: "🇯🇵", iso: "JP" },
  { name: "Brazil", code: "+55", flag: "🇧🇷", iso: "BR" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩", iso: "BD" },
  { name: "Nepal", code: "+977", flag: "🇳🇵", iso: "NP" },
  { name: "Bhutan", code: "+975", flag: "🇧🇹", iso: "BT" },
  { name: "Maldives", code: "+960", flag: "🇲🇻", iso: "MV" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩", iso: "ID" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾", iso: "MY" },
  { name: "Mexico", code: "+52", flag: "🇲🇽", iso: "MX" },
  { name: "Egypt", code: "+20", flag: "🇪🇬", iso: "EG" },
  { name: "Argentina", code: "+54", flag: "🇦🇷", iso: "AR" },
  { name: "Ireland", code: "+353", flag: "🇮🇪", iso: "IE" },
  { name: "Kenya", code: "+254", flag: "🇰🇪", iso: "KE" }
];

function renderFlagElement(country) {
  if (!country) return "";
  const iso = String(country.iso || "").toLowerCase();
  return `<img src="https://flagcdn.com/20x15/${iso}.png" srcset="https://flagcdn.com/40x30/${iso}.png 2x" width="20" height="15" alt="${country.name}" class="country-flag-img" onerror="this.onerror=null;this.replaceWith('${country.flag}')">`;
}

function setupCountryPicker({
  pickerId,
  btnId,
  flagId,
  codeId,
  dropdownId,
  searchId,
  listId,
  hiddenValId,
  defaultCode = "+91"
}) {
  const pickerEl = document.getElementById(pickerId);
  const btnEl = document.getElementById(btnId);
  const flagEl = document.getElementById(flagId);
  const codeEl = document.getElementById(codeId);
  const dropdownEl = document.getElementById(dropdownId);
  const searchEl = document.getElementById(searchId);
  const listEl = document.getElementById(listId);
  const hiddenInput = document.getElementById(hiddenValId);

  if (!pickerEl || !btnEl || !dropdownEl || !listEl) return null;

  let selectedCountry = COUNTRIES_DATA.find((c) => c.code === defaultCode) || COUNTRIES_DATA[0];

  function renderList(filterText = "") {
    listEl.innerHTML = "";
    const query = filterText.toLowerCase().trim();
    const filtered = COUNTRIES_DATA.filter((item) => {
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.code.includes(query) ||
        item.iso.toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "country-empty-state";
      emptyLi.textContent = "No matching countries found";
      listEl.appendChild(emptyLi);
      return;
    }

    filtered.forEach((country) => {
      const li = document.createElement("li");
      const isCurrent = country.name === selectedCountry.name && country.code === selectedCountry.code;
      li.className = `country-option-item ${isCurrent ? "selected" : ""}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", isCurrent ? "true" : "false");
      li.innerHTML = `
        <div class="country-opt-left">
          <span class="country-opt-flag">${renderFlagElement(country)}</span>
          <span class="country-opt-name">${country.name}</span>
        </div>
        <span class="country-opt-code">${country.code}</span>
      `;
      li.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectCountry(country);
        closeDropdown();
      });
      listEl.appendChild(li);
    });
  }

  function selectCountry(country) {
    if (!country) return;
    selectedCountry = country;
    if (flagEl) flagEl.innerHTML = renderFlagElement(country);
    if (codeEl) codeEl.textContent = country.code;
    if (hiddenInput) hiddenInput.value = country.code;
    btnEl.setAttribute("title", `${country.name} (${country.code})`);
  }

  function openDropdown() {
    document.querySelectorAll(".country-dropdown-popover").forEach((el) => {
      if (el !== dropdownEl) {
        el.hidden = true;
        el.classList.remove("open");
        el.style.display = "none";
        el.closest(".country-prefix-picker")?.classList.remove("open");
        const b = el.closest(".country-prefix-picker")?.querySelector(".country-prefix-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      }
    });

    dropdownEl.hidden = false;
    dropdownEl.classList.add("open");
    dropdownEl.style.display = "flex";
    pickerEl.classList.add("open");
    btnEl.setAttribute("aria-expanded", "true");

    if (searchEl) {
      searchEl.value = "";
      renderList("");
      window.setTimeout(() => searchEl.focus(), 60);
    } else {
      renderList("");
    }
    refreshIcons();
  }

  function closeDropdown() {
    dropdownEl.hidden = true;
    dropdownEl.classList.remove("open");
    dropdownEl.style.display = "none";
    pickerEl.classList.remove("open");
    btnEl.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    const isCurrentlyOpen = pickerEl.classList.contains("open") || 
                           dropdownEl.classList.contains("open") || 
                           (!dropdownEl.hidden && dropdownEl.style.display !== "none");
    if (isCurrentlyOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  btnEl.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  });

  dropdownEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  searchEl?.addEventListener("input", (e) => {
    renderList(e.target.value);
  });

  document.addEventListener("click", (e) => {
    if (!pickerEl.contains(e.target)) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
      btnEl.focus();
    }
  });

  // Always default to India (+91) or specified defaultCode, and ensure closed on start
  selectCountry(selectedCountry);
  closeDropdown();

  return {
    setCountry: (code) => {
      const match = COUNTRIES_DATA.find((c) => c.code === code) || 
                    COUNTRIES_DATA.find((c) => c.iso.toLowerCase() === String(code).toLowerCase());
      if (match) {
        selectCountry(match);
        closeDropdown();
      }
    },
    close: closeDropdown,
    getSelected: () => selectedCountry
  };
}

function initializeHazardPageHelpers() {
  const hazardMapEl = document.getElementById("hazard-map");
  const detectBtn = document.getElementById("detect-location");
  const searchBtn = document.getElementById("loc-btn-search");
  const locInput = document.getElementById("h-location");
  const latInput = document.getElementById("h-lat");
  const lngInput = document.getElementById("h-lng");
  const confirmLocBtn = document.getElementById("confirm-location-btn");
  const submitBtn = document.getElementById("submit-btn");

  if (hazardMapEl && typeof L !== "undefined") {
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;
    if (latInput && !latInput.value) latInput.value = defaultLat.toFixed(6);
    if (lngInput && !lngInput.value) lngInput.value = defaultLng.toFixed(6);

    const map = L.map("hazard-map").setView([defaultLat, defaultLng], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    window.setTimeout(() => map.invalidateSize(), 400);

    const unlockSubmit = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    };

    const updateLocationDetails = (lat, lng, flyTo = false) => {
      if (latInput) latInput.value = lat.toFixed(6);
      if (lngInput) lngInput.value = lng.toFixed(6);
      marker.setLatLng([lat, lng]);
      if (flyTo) map.flyTo([lat, lng], 13, { animate: true });
      if (confirmLocBtn) {
        confirmLocBtn.disabled = false;
        confirmLocBtn.innerHTML = '<i data-lucide="check-circle"></i> <span>Confirm Pinned Location</span>';
      }
      unlockSubmit();
      refreshIcons();
    };

    const syncLocationLabel = async (lat, lng) => {
      if (!locInput) return;
      locInput.value = "Fetching address coordinates...";
      locInput.value = await reverseGeocode(lat, lng) || "Pinned Location";
      unlockSubmit();
    };

    map.on("click", async ({ latlng }) => {
      updateLocationDetails(latlng.lat, latlng.lng);
      await syncLocationLabel(latlng.lat, latlng.lng);
    });

    marker.on("dragend", async () => {
      const position = marker.getLatLng();
      updateLocationDetails(position.lat, position.lng);
      await syncLocationLabel(position.lat, position.lng);
    });

    locInput?.addEventListener("input", () => {
      if (locInput.value.trim().length > 2) {
        unlockSubmit();
      }
    });

    detectBtn?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }
      detectBtn.innerHTML = '<span class="btn-spinner"></span> Detecting...';
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        updateLocationDetails(latitude, longitude, true);
        await syncLocationLabel(latitude, longitude);
        detectBtn.innerHTML = '<i data-lucide="locate"></i> Auto Detect';
        refreshIcons();
      }, () => {
        alert("Could not detect your GPS location. Please search or drop a pin manually.");
        detectBtn.innerHTML = '<i data-lucide="locate"></i> Auto Detect';
        refreshIcons();
      });
    });

    if (searchBtn && locInput) {
      searchBtn.addEventListener("click", async () => {
        const address = locInput.value.trim();
        if (!address) {
          alert("Please enter an address or landmark to search.");
          return;
        }
        searchBtn.innerHTML = '<span class="btn-spinner"></span> Searching...';
        const coords = await geocodeAddress(address);
        searchBtn.innerHTML = '<i data-lucide="search"></i> Search Map';
        refreshIcons();
        if (!coords) {
          alert("Address not found. Please try another query or click directly on the map.");
          return;
        }
        updateLocationDetails(coords.lat, coords.lng, true);
      });
    }

    if (confirmLocBtn) {
      confirmLocBtn.addEventListener("click", () => {
        if (!latInput?.value || !lngInput?.value) {
          alert("Please pin the hazard location first.");
          return;
        }
        confirmLocBtn.innerHTML = '<i data-lucide="check-square"></i> <span>Location Confirmed</span>';
        unlockSubmit();
        refreshIcons();
      });
    }

    // Ensure submit button is enabled if location is prefilled
    if (locInput?.value) {
      unlockSubmit();
    }
  }

  const photoInput = document.getElementById("photoInput");
  const photoPreviewWrap = document.getElementById("photoPreviewWrap");
  const photoPreview = document.getElementById("photoPreview");
  const photoPreviewName = document.getElementById("photoPreviewName");
  const hazardForm = document.getElementById("hazard-form");
  let previewUrl = null;

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    if (photoPreview) photoPreview.removeAttribute("src");
    if (photoPreviewName) photoPreviewName.textContent = "";
    if (photoPreviewWrap) photoPreviewWrap.hidden = true;
  };

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) {
      clearPreview();
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    if (photoPreview) photoPreview.src = previewUrl;
    if (photoPreviewName) photoPreviewName.textContent = file.name;
    if (photoPreviewWrap) photoPreviewWrap.hidden = false;
  });

  const hazardCountryPicker = setupCountryPicker({
    pickerId: "hazard-country-picker",
    btnId: "hazard-country-btn",
    flagId: "hazard-country-flag",
    codeId: "hazard-country-code",
    dropdownId: "hazard-country-dropdown",
    searchId: "hazard-country-search",
    listId: "hazard-country-list",
    hiddenValId: "hazard-country-val",
    defaultCode: "+91"
  });

  const applyAuthContact = () => {
    const authUser = getAuthUser();
    const phoneInput = document.getElementById("h-phone");
    if (authUser && phoneInput) {
      if (authUser.phone) {
        phoneInput.value = authUser.phone;
      }
      if (authUser.countryCode && hazardCountryPicker) {
        hazardCountryPicker.setCountry(authUser.countryCode);
      }
    }
  };

  applyAuthContact();

  hazardForm?.addEventListener("reset", () => {
    window.setTimeout(() => {
      clearPreview();
      applyAuthContact();
    }, 0);
  });
}

function initializeMapPage() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const map = L.map("map", { maxBoundsViscosity: 1, minZoom: 3, maxZoom: 19 }).setView([20.5937, 78.9629], 5);
  const bounds = [[-90, -180], [90, 180]];
  map.setMaxBounds(bounds);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", noWrap: true, bounds }).addTo(map);

  const hazardLayer = L.layerGroup().addTo(map);
  const socialRadarLayer = L.layerGroup().addTo(map);
  const socialRadarBtn = document.getElementById("social-radar-btn");
  const socialRadarStatus = document.getElementById("social-radar-status");
  const hazardPanel = document.getElementById("hazard-panel");
  const closePanelBtn = document.getElementById("close-panel");
  const summarySection = document.getElementById("panel-summary-section");
  const summaryText = document.getElementById("panel-summary-text");
  const summaryLangSelect = document.getElementById("summary-lang-select");
  let currentSummary = null;
  let activeReportId = null;
  let activeReportRawText = "";
  const translationCache = new Map();

  const languageLabelsMap = {
    english: "English",
    hindi: "Hindi",
    original: "Original",
    marathi: "Marathi",
    bengali: "Bengali",
    gujarati: "Gujarati",
    tamil: "Tamil",
    telugu: "Telugu",
    kannada: "Kannada",
    malayalam: "Malayalam",
    punjabi: "Punjabi",
    urdu: "Urdu",
    spanish: "Spanish",
    french: "French",
    arabic: "Arabic",
    german: "German",
    japanese: "Japanese"
  };

  const getHazardIcon = (type) => {
    const normalized = String(type || "").toLowerCase();
    if (normalized.includes("flood") || normalized.includes("water")) return "🌊";
    if (normalized.includes("wave") || normalized.includes("coast")) return "💨";
    if (normalized.includes("cyclone") || normalized.includes("storm")) return "🌪️";
    if (normalized.includes("fire") || normalized.includes("heat")) return "🔥";
    if (normalized.includes("earthquake")) return "🌋";
    return "⚠️";
  };

  const createMarkerIcon = (icon, color) => L.divIcon({
    className: "custom-marker",
    html: `<div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${color};border:2px solid #fff;box-shadow:0 8px 20px rgba(0,0,0,.3);font-size:17px;">${icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  const updateSummaryPanel = async (language = "english") => {
    if (!summarySection || !summaryText) return;
    summarySection.hidden = false;

    if (summaryLangSelect && summaryLangSelect.value !== language) {
      summaryLangSelect.value = language;
    }

    // 1. Direct match from pre-existing report summary object
    if (language === "english" && currentSummary?.english) {
      summaryText.textContent = currentSummary.english;
      summaryText.style.fontStyle = "normal";
      summaryText.style.opacity = "1";
      return;
    }

    if (language === "hindi" && currentSummary?.hindi) {
      summaryText.textContent = currentSummary.hindi;
      summaryText.style.fontStyle = "normal";
      summaryText.style.opacity = "1";
      return;
    }

    if (language === "original" && currentSummary?.original) {
      summaryText.textContent = currentSummary.original;
      summaryText.style.fontStyle = "normal";
      summaryText.style.opacity = "1";
      return;
    }

    // 2. Check local memory translation cache
    const cacheKey = `${activeReportId || 'active'}_${language}`;
    if (translationCache.has(cacheKey)) {
      summaryText.textContent = translationCache.get(cacheKey);
      summaryText.style.fontStyle = "normal";
      summaryText.style.opacity = "1";
      return;
    }

    // Determine base text to translate
    const baseSourceText = currentSummary?.english || currentSummary?.original || activeReportRawText;
    if (!baseSourceText || baseSourceText === "No notes provided.") {
      summaryText.textContent = "[AI summary of the note appears here, in the selected language]";
      summaryText.style.fontStyle = "normal";
      summaryText.style.opacity = "0.7";
      return;
    }

    // 3. On-demand translation via Gemini 2.5 Flash
    const targetLangName = languageLabelsMap[language] || language;
    summaryText.innerHTML = `<span class="btn-spinner" style="margin-right:0.4rem;display:inline-block;vertical-align:middle;"></span> Translating summary to ${targetLangName}...`;
    summaryText.style.opacity = "0.8";

    try {
      const res = await fetch("http://localhost:3000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: baseSourceText,
          targetLanguage: targetLangName
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.translatedText) {
          translationCache.set(cacheKey, data.translatedText);
          if (!summaryLangSelect || summaryLangSelect.value === language) {
            summaryText.textContent = data.translatedText;
            summaryText.style.fontStyle = "normal";
            summaryText.style.opacity = "1";
          }
          return;
        }
      }
      throw new Error("Translation returned empty data");
    } catch (err) {
      console.warn("Translation notice:", err);
      if (!summaryLangSelect || summaryLangSelect.value === language) {
        summaryText.textContent = baseSourceText;
        summaryText.style.fontStyle = "normal";
        summaryText.style.opacity = "0.95";
      }
    }
  };

  summaryLangSelect?.addEventListener("change", (e) => {
    updateSummaryPanel(e.target.value);
  });

  // Evidence Photo Lightbox Carousel State
  let currentEvidencePhotos = [];
  let currentLightboxIndex = 0;
  let currentIncidentTitle = "Hazard";
  let currentIncidentLocation = "";

  const lightboxModal = document.getElementById("photo-lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxIncidentType = document.getElementById("lightbox-incident-type");
  const lightboxLocation = document.getElementById("lightbox-location-text");
  const lightboxPrevBtn = document.getElementById("lightbox-prev");
  const lightboxNextBtn = document.getElementById("lightbox-next");
  const lightboxDotsWrap = document.getElementById("lightbox-dots-wrap");
  const lightboxCloseBtn = document.getElementById("lightbox-close");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");

  function extractPhotoList(details) {
    if (!details) return [];
    if (Array.isArray(details.photoUrls) && details.photoUrls.length > 0) {
      return details.photoUrls.filter(Boolean);
    }
    if (Array.isArray(details.photos) && details.photos.length > 0) {
      return details.photos.filter(Boolean);
    }
    if (typeof details.photoUrl === "string" && details.photoUrl.trim()) {
      const raw = details.photoUrl.trim();
      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch {}
      }
      if (raw.includes(",")) {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [raw];
    }
    return [];
  }

  function showLightbox(index = 0) {
    if (!lightboxModal || currentEvidencePhotos.length === 0) return;
    currentLightboxIndex = (index + currentEvidencePhotos.length) % currentEvidencePhotos.length;

    if (lightboxImg) {
      lightboxImg.style.opacity = "0";
      lightboxImg.src = currentEvidencePhotos[currentLightboxIndex];
      lightboxImg.onload = () => {
        lightboxImg.style.opacity = "1";
      };
    }

    if (lightboxCounter) {
      lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentEvidencePhotos.length}`;
    }

    if (lightboxIncidentType) {
      lightboxIncidentType.textContent = `${currentIncidentTitle} Evidence`;
    }

    if (lightboxLocation) {
      lightboxLocation.textContent = currentIncidentLocation || "Incident Location";
    }

    const hasMultiple = currentEvidencePhotos.length > 1;
    if (lightboxPrevBtn) lightboxPrevBtn.hidden = !hasMultiple;
    if (lightboxNextBtn) lightboxNextBtn.hidden = !hasMultiple;

    if (lightboxDotsWrap) {
      if (hasMultiple) {
        lightboxDotsWrap.innerHTML = currentEvidencePhotos
          .map((_, i) => `<span class="lightbox-dot ${i === currentLightboxIndex ? 'active' : ''}" data-idx="${i}"></span>`)
          .join("");
        lightboxDotsWrap.querySelectorAll(".lightbox-dot").forEach((dot) => {
          dot.addEventListener("click", () => {
            const idx = parseInt(dot.dataset.idx, 10);
            if (!isNaN(idx)) showLightbox(idx);
          });
        });
        lightboxDotsWrap.hidden = false;
      } else {
        lightboxDotsWrap.innerHTML = "";
        lightboxDotsWrap.hidden = true;
      }
    }

    lightboxModal.hidden = false;
    refreshIcons();
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.hidden = true;
    if (lightboxImg) lightboxImg.src = "";
  }

  lightboxCloseBtn?.addEventListener("click", closeLightbox);
  lightboxBackdrop?.addEventListener("click", closeLightbox);

  lightboxPrevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    showLightbox(currentLightboxIndex - 1);
  });

  lightboxNextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    showLightbox(currentLightboxIndex + 1);
  });

  document.addEventListener("keydown", (e) => {
    if (!lightboxModal || lightboxModal.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showLightbox(currentLightboxIndex - 1);
    if (e.key === "ArrowRight") showLightbox(currentLightboxIndex + 1);
  });

  const photoBadgeBtn = document.getElementById("panel-photo-badge");
  photoBadgeBtn?.addEventListener("click", () => {
    if (currentEvidencePhotos.length > 0) {
      showLightbox(0);
    }
  });

  const heroBackdrop = document.getElementById("panel-hero-backdrop");
  heroBackdrop?.addEventListener("click", () => {
    if (currentEvidencePhotos.length > 0) {
      showLightbox(0);
    }
  });

  const openHazardPanel = (details) => {
    const actualPanel = hazardPanel || document.getElementById("hazard-panel");
    if (!actualPanel) return;

    actualPanel.classList.remove("collapsed");

    try {
      const elType = document.getElementById("panel-type");
      const elLoc = document.getElementById("panel-location");
      const elTime = document.getElementById("panel-time");
      const elSev = document.getElementById("panel-severity");
      const elSevInd = document.getElementById("panel-severity-indicator");

      // Format hazard title (e.g. "cyclone" -> "Cyclone")
      const rawType = String(details.type || "Hazard").trim();
      const cleanType = rawType.replace(/^(hazard:\s*|social radar:\s*)/i, "");
      const formattedTitle = cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
      if (elType) elType.textContent = formattedTitle;

      if (elLoc) elLoc.textContent = details.title || "Unknown Location";
      if (elTime) elTime.textContent = details.timeStr || "Recently reported";

      // Severity indicator matching mockup: e.g. "LOW SEVERITY" with dot
      const sev = (details.severity || "medium").toLowerCase();
      if (elSev) {
        elSev.textContent = `${sev.toUpperCase()} SEVERITY`;
      }
      if (elSevInd) {
        elSevInd.className = `panel-severity-indicator sev-${sev}`;
      }

      currentIncidentTitle = formattedTitle;
      currentIncidentLocation = details.title || "";
      currentEvidencePhotos = extractPhotoList(details);

      // Hero backdrop image in the top background of the panel
      const heroBackdropImg = document.getElementById("hero-backdrop-img");
      if (heroBackdropImg) {
        if (currentEvidencePhotos.length > 0) {
          heroBackdropImg.style.backgroundImage = `url("${currentEvidencePhotos[0]}")`;
          heroBackdropImg.style.display = "block";
        } else {
          heroBackdropImg.style.backgroundImage = "none";
          heroBackdropImg.style.display = "none";
        }
      }

      // Inline photo count badge in timing row
      const photoCountEl = document.getElementById("panel-photo-count");
      const photoBadge = document.getElementById("panel-photo-badge");
      if (photoCountEl) {
        const count = currentEvidencePhotos.length;
        if (count === 0) {
          photoCountEl.textContent = "No photo";
        } else if (count === 1) {
          photoCountEl.textContent = "1 photo";
        } else {
          photoCountEl.textContent = `${count} photos`;
        }
      }
      if (photoBadge) {
        if (currentEvidencePhotos.length === 0) {
          photoBadge.style.opacity = "0.45";
          photoBadge.style.cursor = "default";
        } else {
          photoBadge.style.opacity = "1";
          photoBadge.style.cursor = "pointer";
        }
      }

      const rawTextEl = document.getElementById("panel-raw-text");
      if (rawTextEl) {
        rawTextEl.textContent = details.rawText || "No notes provided.";
      }

      // Verification status badge on right side of Observer Note (Image 1 Specification)
      const elVerification = document.getElementById("panel-report-verification");
      const elVerificationText = document.getElementById("panel-verification-text");
      const isVerified = Boolean(details.isVerified);

      if (elVerification) {
        elVerification.className = `panel-report-verification ${isVerified ? 'verified' : 'unverified'}`;
      }
      if (elVerificationText) {
        elVerificationText.textContent = isVerified ? "VERIFIED REPORT" : "UNVERIFIED REPORT";
      }

      activeReportId = details.id || details.title || Date.now().toString();
      activeReportRawText = details.rawText || "";
      currentSummary = details.summary || null;

      // Default language is English as requested
      if (summaryLangSelect) {
        summaryLangSelect.value = "english";
      }
      updateSummaryPanel("english");

      if (map && details.latlng) {
        map.flyTo(details.latlng, 12, { animate: true, duration: 1 });
      }
      refreshIcons();
    } catch (err) {
      console.warn("Error updating hazard panel content:", err);
    }
  };

  closePanelBtn?.addEventListener("click", () => hazardPanel?.classList.add("collapsed"));

  const setSocialRadarStatus = (message, tone = "neutral") => {
    if (!socialRadarStatus) return;
    socialRadarStatus.hidden = !message;
    socialRadarStatus.textContent = message || "";
    socialRadarStatus.dataset.tone = tone;
  };

  socialRadarBtn?.addEventListener("click", async () => {
    socialRadarBtn.disabled = true;
    socialRadarBtn.innerHTML = '<span class="btn-spinner"></span> Scanning Jaipur Radar...';
    refreshIcons();
    socialRadarLayer.clearLayers();
    setSocialRadarStatus("Scanning social posts for emergency signals via Gemini AI...");
    try {
      const response = await fetch("http://localhost:3000/api/scan-reddit?mode=demo");
      const hazards = await response.json();
      if (!response.ok) {
        throw new Error(hazards?.error || "Social radar scan failed.");
      }

      let count = 0;
      for (const hazard of hazards) {
        const coords = await geocodeAddress(`${hazard.location_clues}, Jaipur, Rajasthan, India`);
        if (!coords) continue;
        const marker = L.marker([coords.lat, coords.lng], { icon: createMarkerIcon(getHazardIcon(hazard.hazard_type), "#2C3480") });
        marker.on("click", () => {
          openHazardPanel({
            type: `Social Radar: ${hazard.hazard_type}`,
            title: hazard.location_clues,
            rawText: hazard.description,
            severity: "medium",
            iconStr: getHazardIcon(hazard.hazard_type),
            latlng: [coords.lat, coords.lng],
            timeStr: "Detected just now",
            photoUrl: null,
            isVerified: false,
            summary: null
          });
        });
        marker.addTo(socialRadarLayer);
        count += 1;
      }

      setSocialRadarStatus(count ? `Social Radar added ${count} AI-detected hazard marker${count === 1 ? "" : "s"} to map.` : "No emergency hazard posts identified in recent feeds.", count ? "success" : "neutral");
    } catch (error) {
      console.error("Social radar scan failed:", error);
      setSocialRadarStatus("Social Radar scan failed. (Ensure backend server is running at :3000).", "error");
    } finally {
      socialRadarBtn.disabled = false;
      socialRadarBtn.innerHTML = '<i data-lucide="radio-tower"></i> <span>Scan Social Radar</span>';
      refreshIcons();
    }
  });

  // Render live incident pins from all sources (Firestore + Central Backend DB + Local Cache)
  try {
    let hasCenteredInitial = false;

    subscribeToReports((reports) => {
      hazardLayer.clearLayers();
      if (!Array.isArray(reports) || reports.length === 0) return;

      const validLatLngs = [];

      reports.forEach((report) => {
        const lat = parseFloat(report.latitude);
        const lng = parseFloat(report.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        validLatLngs.push([lat, lng]);

        const reportedAt = report.timestamp instanceof Date ? report.timestamp : (report.timestamp ? new Date(report.timestamp) : null);
        const isResolved = report.status === "resolved";
        const isPinned = Boolean(report.pinned);
        const sevLower = (report.severity || "medium").toLowerCase();

        let severityColor = "#059669"; // low / default green
        if (isResolved) {
          severityColor = "#10b981"; // resolved emerald
        } else if (isPinned) {
          severityColor = "#7c3aed"; // priority purple
        } else if (sevLower === "high" || sevLower === "severe") {
          severityColor = "#dc2626"; // high red
        } else if (sevLower === "medium") {
          severityColor = "#d97706"; // medium amber
        }

        const iconEmoji = getHazardIcon(report.type);
        const marker = L.marker([lat, lng], {
          icon: createMarkerIcon(iconEmoji, severityColor)
        });

        marker.bindTooltip(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:3px 2px;line-height:1.4;">
            <strong style="color:#ffffff;display:flex;align-items:center;gap:0.35rem;font-size:0.86rem;">
              <span>${iconEmoji}</span>
              <span>${(report.type || "Hazard").toUpperCase()}</span>
              ${isPinned ? '<span style="background:#7c3aed;color:#fff;font-size:0.65rem;padding:1px 5px;border-radius:4px;font-weight:700;">PINNED</span>' : ''}
              ${isResolved ? '<span style="background:#059669;color:#fff;font-size:0.65rem;padding:1px 5px;border-radius:4px;font-weight:700;">SOLVED</span>' : ''}
            </strong>
            <span style="color:#cbd5e1;font-size:0.78rem;display:block;margin-top:2px;">${report.location}</span>
            <em style="color:#94a3b8;font-size:0.72rem;">${formatRelativeTime(reportedAt)}</em>
          </div>
        `, {
          direction: "top",
          offset: [0, -12],
          opacity: 0.98
        });

        const isVerified = isReportVerified(report);
        const reportDetails = {
          id: report.id,
          type: report.type,
          title: report.location,
          rawText: report.rawText || report.description || "No additional details available.",
          severity: report.severity || "medium",
          iconStr: iconEmoji,
          latlng: [lat, lng],
          timeStr: reportedAt && !isNaN(reportedAt.getTime()) ? reportedAt.toLocaleString() : "Recently reported",
          photoUrl: report.photoUrl || null,
          userEmail: report.userEmail || report.email || null,
          isVerified: isVerified,
          summary: {
            original: report.summaryOriginal || report.aiSummaryOriginal || null,
            english: report.summaryEnglish || report.aiSummaryEnglish || null,
            hindi: report.summaryHindi || report.aiSummaryHindi || null,
            sourceLanguage: report.sourceLanguage || null
          }
        };

        marker.on("click", () => {
          openHazardPanel(reportDetails);
        });

        marker.addTo(hazardLayer);

        const urlParams = new URLSearchParams(window.location.search);
        const focusId = urlParams.get("focus") || urlParams.get("id");
        if (focusId && report.id === focusId && !hasCenteredInitial) {
          hasCenteredInitial = true;
          window.setTimeout(() => {
            map.flyTo([lat, lng], 13, { animate: true, duration: 1.2 });
            marker.openTooltip();
            openHazardPanel(reportDetails);
          }, 300);
        }
      });

      // Automatically fly to latest report if newly loaded and within bounds
      if (!hasCenteredInitial && validLatLngs.length > 0) {
        hasCenteredInitial = true;
        const latest = validLatLngs[0];
        map.flyTo(latest, 10, { animate: true, duration: 1.2 });
      }
    });
  } catch (error) {
    console.warn("Realtime hazard store listener failed on map:", error);
  }
}

function initializeAuthPage() {
  const signInSection = document.getElementById("signInSection");
  const registerSection = document.getElementById("registerSection");
  const btnGoToRegister = document.getElementById("btnGoToRegister");
  const btnGoToSignIn = document.getElementById("btnGoToSignIn");
  const authAlert = document.getElementById("authAlert");
  const alertIcon = document.getElementById("alertIcon");
  const alertMessage = document.getElementById("alertMessage");

  if (!signInSection || !registerSection) return;

  const regCountryPicker = setupCountryPicker({
    pickerId: "reg-country-picker",
    btnId: "reg-country-btn",
    flagId: "reg-country-flag",
    codeId: "reg-country-code",
    dropdownId: "reg-country-dropdown",
    searchId: "reg-country-search",
    listId: "reg-country-list",
    hiddenValId: "reg-country-val",
    defaultCode: "+91"
  });

  function showAlert(message, type = "error") {
    if (!authAlert || !alertMessage) return;
    authAlert.className = `auth-alert visible ${type}`;
    alertMessage.textContent = message;
    if (alertIcon) {
      alertIcon.setAttribute("data-lucide", type === "error" ? "alert-circle" : "check-circle");
      refreshIcons();
    }
  }

  function hideAlert() {
    if (!authAlert) return;
    authAlert.className = "auth-alert";
  }

  // Switch between Sign In and Create Account
  btnGoToRegister?.addEventListener("click", () => {
    hideAlert();
    signInSection.style.display = "none";
    registerSection.style.display = "block";
    refreshIcons();
    document.getElementById("reg-username")?.focus();
  });

  btnGoToSignIn?.addEventListener("click", () => {
    hideAlert();
    registerSection.style.display = "none";
    signInSection.style.display = "block";
    refreshIcons();
    document.getElementById("signin-identifier")?.focus();
  });

  // Automatically enforce small letters (lowercase) on username typing
  const regUsernameInput = document.getElementById("reg-username");
  regUsernameInput?.addEventListener("input", (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  });

  // Password visibility toggles (White eye icon, visible only when user writes text)
  const setupToggle = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    const updateVisibility = () => {
      const hasText = input.value.length > 0;
      if (hasText) {
        btn.classList.add("visible");
        btn.style.display = "flex";
      } else {
        btn.classList.remove("visible");
        btn.style.display = "none";
      }
    };

    updateVisibility();
    input.addEventListener("input", updateVisibility);
    input.addEventListener("change", updateVisibility);
    input.addEventListener("keyup", updateVisibility);

    btn.addEventListener("click", () => {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) {
        icon.setAttribute("data-lucide", isPwd ? "eye-off" : "eye");
        refreshIcons();
      }
    });
  };

  setupToggle("toggleSignInPassword", "signin-password");
  setupToggle("toggleRegPassword", "reg-password");
  setupToggle("toggleRegConfirm", "reg-confirm");

  // Forgot password handler
  document.getElementById("btnForgotPassword")?.addEventListener("click", () => {
    alert("For GeoNetra network security, contact your nodal coordinator or use default demo credentials:\n\nEmail: observer@geonetra.gov.in\nPhone: 9876543210\nPassword: Password@123");
  });

  // Live password requirements validation (Image 2 Recreation)
  const regPasswordInput = document.getElementById("reg-password");
  const reqLength = document.getElementById("req-length");
  const reqUpper = document.getElementById("req-upper");
  const reqLower = document.getElementById("req-lower");
  const reqNumSym = document.getElementById("req-numsym");

  function validatePasswordCriteria(pwd) {
    const lengthValid = pwd.length >= 8;
    const upperValid = /[A-Z]/.test(pwd);
    const lowerValid = /[a-z]/.test(pwd);
    const numSymValid = /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd);

    if (reqLength) reqLength.classList.toggle("valid", lengthValid);
    if (reqUpper) reqUpper.classList.toggle("valid", upperValid);
    if (reqLower) reqLower.classList.toggle("valid", lowerValid);
    if (reqNumSym) reqNumSym.classList.toggle("valid", numSymValid);

    return lengthValid && upperValid && lowerValid && numSymValid;
  }

  regPasswordInput?.addEventListener("input", (e) => {
    validatePasswordCriteria(e.target.value);
  });

  // Sign In Form Submission (Connected to Backend Database + JWT)
  const signInForm = document.getElementById("signInForm");
  signInForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const identifier = document.getElementById("signin-identifier")?.value.trim();
    const password = document.getElementById("signin-password")?.value;
    const btnSubmit = document.getElementById("btnSignInSubmit");

    if (!identifier || !password) {
      showAlert("Please enter your email or phone number and password.");
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="auth-spinner"></span> <span>Signing In...</span>';
    }

    try {
      // Authenticate with central backend database using JWT
      const res = await apiAuthRequest("/api/auth/login", "POST", { identifier, password });
      setAuthSession(res.user, res.token);

      // Keep local cache synced
      const users = getRegisteredUsers();
      if (!users.some((u) => (u.username || "").toLowerCase() === (res.user.username || "").toLowerCase())) {
        users.push({ ...res.user, password });
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      }

      const isAdmin = (res.user?.role === "admin") || (res.user?.email || "").toLowerCase() === "admin@geonetra.com" || (res.user?.username || "").toLowerCase() === "admin";
      showAlert("Authentication successful! Loading dashboard...", "success");
      window.setTimeout(() => {
        window.location.replace(isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("index.html"));
      }, 500);
    } catch (err) {
      // Fallback check against local cache if server is unreachable
      const users = getRegisteredUsers();
      const cleanInput = identifier.replace(/[\s-]/g, "");
      const matchedUser = users.find((u) => {
        const userPhoneClean = (u.phone || "").replace(/[\s-]/g, "");
        const userFullPhone = `${u.countryCode || ""}${userPhoneClean}`.replace(/[\s+-]/g, "");
        const inputPhoneClean = cleanInput.replace(/[\s+-]/g, "");
        const matchId = (u.email && u.email.toLowerCase() === identifier.toLowerCase()) || 
                        (userPhoneClean && (userPhoneClean === cleanInput || userFullPhone === inputPhoneClean)) ||
                        (u.username && u.username.toLowerCase() === identifier.toLowerCase());
        return matchId && u.password === password;
      });

      if (matchedUser) {
        setAuthSession(matchedUser);
        const isAdmin = (matchedUser.role === "admin") || (matchedUser.email || "").toLowerCase() === "admin@geonetra.com" || (matchedUser.username || "").toLowerCase() === "admin";
        showAlert("Authentication successful! Loading dashboard...", "success");
        window.setTimeout(() => {
          window.location.replace(isAdmin ? getPagePath("admin-dashboard.html") : getPagePath("index.html"));
        }, 500);
        return;
      }

      showAlert(err.message || "Invalid email, phone number, or password. Please try again.");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Sign In</span> <i data-lucide="arrow-right"></i>';
        refreshIcons();
      }
    }
  });

  // Create Account Form Submission (Connected to Backend Database + JWT)
  const registerForm = document.getElementById("registerForm");
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const username = (document.getElementById("reg-username")?.value || "").trim().toLowerCase();
    const email = document.getElementById("reg-email")?.value.trim().toLowerCase();
    const phone = document.getElementById("reg-phone")?.value.trim();
    const countryCode = document.getElementById("reg-country-val")?.value || "+91";
    const password = document.getElementById("reg-password")?.value;
    const confirmPassword = document.getElementById("reg-confirm")?.value;
    const btnSubmit = document.getElementById("btnRegisterSubmit");

    if (!username || username.length < 3) {
      showAlert("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-z0-9_.]+$/.test(username)) {
      showAlert("Username must be in lowercase and contain only small letters, numbers, underscores, or periods.");
      return;
    }

    // Client-side uniqueness check
    const localUsers = getRegisteredUsers();
    const duplicateUser = localUsers.find((u) => (u.username || "").toLowerCase() === username);
    if (duplicateUser) {
      showAlert(`Username '${username}' is already taken. Please choose another username.`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("Please enter a valid email address.");
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!/^[0-9]{7,15}$/.test(cleanPhone)) {
      showAlert("Please enter a valid phone number (7-15 digits).");
      return;
    }

    if (!validatePasswordCriteria(password)) {
      showAlert("Password does not meet all security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("Passwords do not match. Please re-enter.");
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="auth-spinner"></span> <span>Creating Account...</span>';
    }

    try {
      // Register in central database with JWT
      const res = await apiAuthRequest("/api/auth/register", "POST", {
        username,
        email,
        phone: cleanPhone,
        countryCode,
        password
      });

      setAuthSession(res.user, res.token);

      // Cache locally
      const users = getRegisteredUsers();
      users.push({ ...res.user, password });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));

      showAlert("Account created successfully in database! Connecting to network...", "success");
      window.setTimeout(() => {
        window.location.replace(getPagePath("index.html"));
      }, 600);
    } catch (err) {
      showAlert(err.message || "Failed to create account. Please try again.");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Create Account</span> <i data-lucide="arrow-right"></i>';
        refreshIcons();
      }
    }
  });
}

/* ═════════════════════════════════════════════════════════════════════
   ACCOUNT SETTINGS & PROFILE MODALS (Images 1, 2, 3 Reference)
   ═════════════════════════════════════════════════════════════════════ */

function maskEmailString(email) {
  if (!email) return "••••••••••••@••••.•••";
  const parts = String(email).trim().split("@");
  if (parts.length < 2) return "••••••••••••";
  const [user, domain] = parts;
  const starCount = Math.max(13, user.length);
  return `${"*".repeat(starCount)}@${domain}`;
}

function maskPhoneString(phone) {
  if (!phone) return "••••••••••";
  const clean = String(phone).replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  const starCount = Math.max(9, clean.length - 4);
  return `${"*".repeat(starCount)}${last4}`;
}

function showAccountToast(message, type = "success") {
  document.querySelectorAll(".account-toast").forEach((el) => el.remove());
  const toast = document.createElement("div");
  toast.className = `account-toast ${type}`;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i> <span>${message}</span>`;
  document.body.appendChild(toast);
  refreshIcons();
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    window.setTimeout(() => toast.remove(), 350);
  }, 3200);
}

function ensureAccountModalsInDom() {
  if (document.getElementById("accountModalsRoot")) return;

  const root = document.createElement("div");
  root.id = "accountModalsRoot";
  root.innerHTML = `
    <!-- Modal 1: Update Password (Image 2 Reference) -->
    <div class="account-modal-overlay" id="modalAccountPassword" hidden>
      <div class="account-modal-card" role="dialog" aria-modal="true" aria-labelledby="modalPwdTitle">
        <div class="account-modal-header">
          <div>
            <h2 class="account-modal-title" id="modalPwdTitle">Update your password</h2>
            <p class="account-modal-subtitle">Enter your current password and a new password.</p>
          </div>
          <button type="button" class="account-modal-close" data-modal-close="modalAccountPassword" aria-label="Close dialog">
            <i data-lucide="x"></i>
          </button>
        </div>
        <form class="account-modal-form" id="formUpdatePassword" novalidate>
          <div class="account-modal-alert" id="alertUpdatePassword"></div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-current-password">Current Password *</label>
            <div class="password-input-wrap">
              <input type="password" id="edit-current-password" class="auth-input" placeholder="Enter current password" required autocomplete="current-password">
              <button type="button" class="password-toggle-btn" id="toggleEditCurPassword" aria-label="Toggle password visibility">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-new-password">New Password *</label>
            <div class="password-input-wrap">
              <input type="password" id="edit-new-password" class="auth-input" placeholder="Create new password" required autocomplete="new-password">
              <button type="button" class="password-toggle-btn" id="toggleEditNewPassword" aria-label="Toggle password visibility">
                <i data-lucide="eye"></i>
              </button>
            </div>
            <p class="input-hint-subtext">Must contain at least 8 characters, an uppercase letter, lowercase letter, and a number or symbol.</p>
          </div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-confirm-password">Confirm New Password *</label>
            <div class="password-input-wrap">
              <input type="password" id="edit-confirm-password" class="auth-input" placeholder="Re-enter new password" required autocomplete="new-password">
              <button type="button" class="password-toggle-btn" id="toggleEditConfPassword" aria-label="Toggle password visibility">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <div class="account-modal-actions">
            <button type="button" class="btn-modal-cancel" data-modal-close="modalAccountPassword">Cancel</button>
            <button type="submit" class="btn-modal-done" id="btnSubmitPassword">Done</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 3: Change Username (Image 3 Reference) -->
    <div class="account-modal-overlay" id="modalAccountUsername" hidden>
      <div class="account-modal-card" role="dialog" aria-modal="true" aria-labelledby="modalUserTitle">
        <div class="account-modal-header">
          <div>
            <h2 class="account-modal-title" id="modalUserTitle">Change your username</h2>
            <p class="account-modal-subtitle">Enter a new username and your existing password.</p>
          </div>
          <button type="button" class="account-modal-close" data-modal-close="modalAccountUsername" aria-label="Close dialog">
            <i data-lucide="x"></i>
          </button>
        </div>
        <form class="account-modal-form" id="formUpdateUsername" novalidate>
          <div class="account-modal-alert" id="alertUpdateUsername"></div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-username-input">Username</label>
            <input type="text" id="edit-username-input" class="auth-input" placeholder="Enter unique username (small letters)" required autocomplete="username" style="text-transform: lowercase;" autocapitalize="none">
            <p class="input-hint-subtext">Must be unique and always in small letters (lowercase). Letters, numbers, underscores _ , or periods.</p>
          </div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-username-curpass">Current Password</label>
            <div class="password-input-wrap">
              <input type="password" id="edit-username-curpass" class="auth-input" placeholder="Enter current password" required autocomplete="current-password">
              <button type="button" class="password-toggle-btn" id="toggleEditUserCurPass" aria-label="Toggle password visibility">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <div class="account-modal-actions">
            <button type="button" class="btn-modal-cancel" data-modal-close="modalAccountUsername">Cancel</button>
            <button type="submit" class="btn-modal-done" id="btnSubmitUsername">Done</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 4: Change Email -->
    <div class="account-modal-overlay" id="modalAccountEmail" hidden>
      <div class="account-modal-card" role="dialog" aria-modal="true" aria-labelledby="modalEmailTitle">
        <div class="account-modal-header">
          <div>
            <h2 class="account-modal-title" id="modalEmailTitle">Change your email</h2>
            <p class="account-modal-subtitle">Enter a new email address and your existing password.</p>
          </div>
          <button type="button" class="account-modal-close" data-modal-close="modalAccountEmail" aria-label="Close dialog">
            <i data-lucide="x"></i>
          </button>
        </div>
        <form class="account-modal-form" id="formUpdateEmail" novalidate>
          <div class="account-modal-alert" id="alertUpdateEmail"></div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-email-input">Email address</label>
            <input type="email" id="edit-email-input" class="auth-input" placeholder="name@example.com" required autocomplete="email">
          </div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-email-curpass">Current Password</label>
            <div class="password-input-wrap">
              <input type="password" id="edit-email-curpass" class="auth-input" placeholder="Enter current password" required autocomplete="current-password">
              <button type="button" class="password-toggle-btn" id="toggleEditEmailCurPass" aria-label="Toggle password visibility">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <div class="account-modal-actions">
            <button type="button" class="btn-modal-cancel" data-modal-close="modalAccountEmail">Cancel</button>
            <button type="submit" class="btn-modal-done" id="btnSubmitEmail">Done</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 5: Change Phone Number -->
    <div class="account-modal-overlay" id="modalAccountPhone" hidden>
      <div class="account-modal-card" role="dialog" aria-modal="true" aria-labelledby="modalPhoneTitle">
        <div class="account-modal-header">
          <div>
            <h2 class="account-modal-title" id="modalPhoneTitle">Change your phone number</h2>
            <p class="account-modal-subtitle">Enter a new phone number and your existing password.</p>
          </div>
          <button type="button" class="account-modal-close" data-modal-close="modalAccountPhone" aria-label="Close dialog">
            <i data-lucide="x"></i>
          </button>
        </div>
        <form class="account-modal-form" id="formUpdatePhone" novalidate>
          <div class="account-modal-alert" id="alertUpdatePhone"></div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-phone-input">Phone number</label>
            <div class="phone-input-group">
              <div class="country-prefix-picker" id="edit-phone-country-picker">
                <button type="button" class="country-prefix-btn" id="edit-phone-country-btn" aria-haspopup="listbox" aria-expanded="false" title="Select country prefix">
                  <span class="country-flag" id="edit-phone-country-flag"></span>
                  <span class="country-code" id="edit-phone-country-code">+91</span>
                  <i data-lucide="chevron-down" class="country-chevron"></i>
                </button>
                <div class="country-dropdown-popover" id="edit-phone-country-dropdown" hidden>
                  <div class="country-search-wrap">
                    <i data-lucide="search" class="search-icon"></i>
                    <input type="text" class="country-search-input" id="edit-phone-country-search" placeholder="Search country or code..." autocomplete="off">
                  </div>
                  <div class="country-options-list" id="edit-phone-country-list" role="listbox"></div>
                </div>
                <input type="hidden" id="edit-phone-country-val" value="+91">
              </div>
              <input type="tel" id="edit-phone-input" class="auth-input phone-main-input" placeholder="9876543210" required autocomplete="tel">
            </div>
          </div>
          <div class="auth-field-group">
            <label class="auth-label" for="edit-phone-curpass">Current Password</label>
            <div class="password-input-wrap">
              <input type="password" id="edit-phone-curpass" class="auth-input" placeholder="Enter current password" required autocomplete="current-password">
              <button type="button" class="password-toggle-btn" id="toggleEditPhoneCurPass" aria-label="Toggle password visibility">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <div class="account-modal-actions">
            <button type="button" class="btn-modal-cancel" data-modal-close="modalAccountPhone">Cancel</button>
            <button type="submit" class="btn-modal-done" id="btnSubmitPhone">Done</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(root);
}

function initializeAccountSettings() {
  ensureAccountModalsInDom();

  let isEmailRevealed = false;
  let isPhoneRevealed = false;
  let callerModalId = null;

  const phonePicker = setupCountryPicker({
    pickerId: "edit-phone-country-picker",
    btnId: "edit-phone-country-btn",
    flagId: "edit-phone-country-flag",
    codeId: "edit-phone-country-code",
    dropdownId: "edit-phone-country-dropdown",
    searchId: "edit-phone-country-search",
    listId: "edit-phone-country-list",
    hiddenValId: "edit-phone-country-val",
    defaultCode: "+91"
  });

  const setupInputPasswordToggle = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    const updateVisibility = () => {
      const hasText = input.value.length > 0;
      if (hasText) {
        btn.classList.add("visible");
        btn.style.display = "flex";
      } else {
        btn.classList.remove("visible");
        btn.style.display = "none";
      }
    };

    updateVisibility();
    input.addEventListener("input", updateVisibility);
    input.addEventListener("change", updateVisibility);
    input.addEventListener("keyup", updateVisibility);

    btn.addEventListener("click", () => {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) {
        icon.setAttribute("data-lucide", isPwd ? "eye-off" : "eye");
        refreshIcons();
      }
    });
  };

  setupInputPasswordToggle("toggleEditCurPassword", "edit-current-password");
  setupInputPasswordToggle("toggleEditNewPassword", "edit-new-password");
  setupInputPasswordToggle("toggleEditConfPassword", "edit-confirm-password");
  setupInputPasswordToggle("toggleEditUserCurPass", "edit-username-curpass");
  setupInputPasswordToggle("toggleEditEmailCurPass", "edit-email-curpass");
  setupInputPasswordToggle("toggleEditPhoneCurPass", "edit-phone-curpass");

  // Automatically enforce small letters (lowercase) on edit username input
  const editUsernameInput = document.getElementById("edit-username-input");
  editUsernameInput?.addEventListener("input", (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  });

  function refreshAccountViews() {
    const user = getAuthUser();
    if (!user) return;

    // Update values in all account cards (page or modals)
    document.querySelectorAll('[data-account-field="username"]').forEach((el) => {
      el.textContent = user.username || "Observer";
    });

    document.querySelectorAll('[data-account-field="email"]').forEach((el) => {
      el.textContent = isEmailRevealed ? (user.email || "") : maskEmailString(user.email);
    });

    document.querySelectorAll('[data-account-field="phone"]').forEach((el) => {
      const fullPhone = `${user.countryCode ? user.countryCode + ' ' : ''}${user.phone || ''}`;
      el.textContent = isPhoneRevealed ? fullPhone : maskPhoneString(user.phone);
    });

    document.querySelectorAll('[data-reveal-trigger="email"]').forEach((btn) => {
      btn.textContent = isEmailRevealed ? "Hide" : "Reveal";
    });

    document.querySelectorAll('[data-reveal-trigger="phone"]').forEach((btn) => {
      btn.textContent = isPhoneRevealed ? "Hide" : "Reveal";
    });

    // Update Header Avatar, Name, Email
    const avatarLetter = (user.username || user.email || "O").charAt(0).toUpperCase();
    document.querySelectorAll(".user-profile-btn .avatar, .profile-menu-header .avatar-lg").forEach((el) => {
      el.textContent = avatarLetter;
    });
    document.querySelectorAll(".profile-name, .profile-menu-header strong").forEach((el) => {
      el.textContent = user.username || "Observer";
    });
    document.querySelectorAll(".email-subtext").forEach((el) => {
      el.textContent = user.email || "";
    });
  }

  function setModalAlert(alertId, message, type = "error") {
    const alertEl = document.getElementById(alertId);
    if (!alertEl) return;
    if (!message) {
      alertEl.className = "account-modal-alert";
      alertEl.textContent = "";
      return;
    }
    alertEl.className = `account-modal-alert visible ${type}`;
    alertEl.textContent = message;
  }

  function openModal(modalId, fromModal = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (fromModal) {
      callerModalId = fromModal;
      const prev = document.getElementById(fromModal);
      if (prev) {
        prev.hidden = true;
        prev.style.display = "none";
      }
    } else {
      callerModalId = null;
    }

    const user = getAuthUser() || {};
    // Pre-populate fields based on modal
    if (modalId === "modalAccountUsername") {
      const input = document.getElementById("edit-username-input");
      if (input) input.value = user.username || "";
      const pass = document.getElementById("edit-username-curpass");
      if (pass) pass.value = "";
      setModalAlert("alertUpdateUsername", "");
    } else if (modalId === "modalAccountEmail") {
      const input = document.getElementById("edit-email-input");
      if (input) input.value = user.email || "";
      const pass = document.getElementById("edit-email-curpass");
      if (pass) pass.value = "";
      setModalAlert("alertUpdateEmail", "");
    } else if (modalId === "modalAccountPhone") {
      const input = document.getElementById("edit-phone-input");
      if (input) input.value = user.phone || "";
      const pass = document.getElementById("edit-phone-curpass");
      if (pass) pass.value = "";
      if (phonePicker && user.countryCode) {
        phonePicker.setCountry(user.countryCode);
      }
      setModalAlert("alertUpdatePhone", "");
    } else if (modalId === "modalAccountPassword") {
      const curInput = document.getElementById("edit-current-password");
      const newInput = document.getElementById("edit-new-password");
      const confInput = document.getElementById("edit-confirm-password");
      if (curInput) curInput.value = "";
      if (newInput) newInput.value = "";
      if (confInput) confInput.value = "";
      setModalAlert("alertUpdatePassword", "");
    }

    modal.hidden = false;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    refreshIcons();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.hidden = true;
    modal.style.display = "none";

    if (callerModalId) {
      const prev = document.getElementById(callerModalId);
      if (prev) {
        prev.hidden = false;
        prev.style.display = "flex";
        callerModalId = null;
        return;
      }
    }

    const openModals = Array.from(document.querySelectorAll(".account-modal-overlay")).filter((m) => !m.hidden && m.style.display !== "none");
    if (openModals.length === 0) {
      document.body.style.overflow = "";
    }
  }

  // Header "Edit Profile" link click
  const btnHeaderEditProfile = document.getElementById("btnHeaderEditProfile");
  btnHeaderEditProfile?.addEventListener("click", (e) => {
    // Close profile dropdown
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileDropdown) profileDropdown.classList.remove("open");

    // If on profile page, smooth scroll to card
    const isProfilePage = document.body?.dataset?.page === "profile";
    if (isProfilePage) {
      e.preventDefault();
      const card = document.getElementById("pageAccountCard");
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";
        card.style.borderColor = "var(--brand-indigo, #2C3480)";
        card.style.boxShadow = "0 0 0 3px rgba(44, 52, 128, 0.35)";
        window.setTimeout(() => {
          card.style.borderColor = "";
          card.style.boxShadow = "";
        }, 1500);
      }
      return;
    }

    // If on any other page, navigate directly to full profile page
    window.location.href = getPagePath("profile.html");
  });

  // Reveal toggles
  document.addEventListener("click", (e) => {
    const revealEmailBtn = e.target.closest('[data-reveal-trigger="email"]');
    if (revealEmailBtn) {
      e.preventDefault();
      isEmailRevealed = !isEmailRevealed;
      refreshAccountViews();
      return;
    }

    const revealPhoneBtn = e.target.closest('[data-reveal-trigger="phone"]');
    if (revealPhoneBtn) {
      e.preventDefault();
      isPhoneRevealed = !isPhoneRevealed;
      refreshAccountViews();
      return;
    }

    // Modal close triggers
    const closeBtn = e.target.closest("[data-modal-close]");
    if (closeBtn) {
      e.preventDefault();
      const targetId = closeBtn.getAttribute("data-modal-close");
      if (targetId) closeModal(targetId);
      return;
    }

    // Modal backdrop click
    if (e.target.classList.contains("account-modal-overlay")) {
      closeModal(e.target.id);
      return;
    }

    // Edit triggers
    const editBtn = e.target.closest("[data-edit-trigger]");
    if (editBtn) {
      e.preventDefault();
      const field = editBtn.getAttribute("data-edit-trigger");
      const parentModal = editBtn.closest(".account-modal-overlay");
      const fromModal = parentModal ? parentModal.id : null;

      if (field === "username") openModal("modalAccountUsername", fromModal);
      else if (field === "password") openModal("modalAccountPassword", fromModal);
      else if (field === "email") openModal("modalAccountEmail", fromModal);
      else if (field === "phone") openModal("modalAccountPhone", fromModal);
    }
  });

  // Escape key handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = Array.from(document.querySelectorAll(".account-modal-overlay")).filter((m) => !m.hidden && m.style.display !== "none");
      if (openModals.length > 0) {
        const topModal = openModals[openModals.length - 1];
        closeModal(topModal.id);
      }
    }
  });

  // Form Submissions
  // 1. Password Update (Image 2 Recreation - Connected to Database + JWT)
  const formUpdatePassword = document.getElementById("formUpdatePassword");
  formUpdatePassword?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const curPass = document.getElementById("edit-current-password")?.value || "";
    const newPass = document.getElementById("edit-new-password")?.value || "";
    const confPass = document.getElementById("edit-confirm-password")?.value || "";
    const btnSubmit = document.getElementById("btnSubmitPassword");

    const user = getAuthUser();
    if (!user) return;

    if (!curPass) {
      setModalAlert("alertUpdatePassword", "Please enter your current password.");
      return;
    }

    if (newPass.length < 8) {
      setModalAlert("alertUpdatePassword", "New password must be at least 8 characters long.");
      return;
    }

    const hasUpper = /[A-Z]/.test(newPass);
    const hasLower = /[a-z]/.test(newPass);
    const hasNumOrSym = /[0-9]/.test(newPass) || /[^A-Za-z0-9]/.test(newPass);
    if (!hasUpper || !hasLower || !hasNumOrSym) {
      setModalAlert("alertUpdatePassword", "New password must include uppercase, lowercase, and a number or symbol.");
      return;
    }

    if (newPass === curPass) {
      setModalAlert("alertUpdatePassword", "New password cannot be the same as your current password.");
      return;
    }

    if (newPass !== confPass) {
      setModalAlert("alertUpdatePassword", "Confirmation password does not match new password.");
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Updating...";
    }

    try {
      const res = await apiAuthRequest("/api/auth/profile", "PUT", {
        currentPassword: curPass,
        newPassword: newPass
      }, true);

      // Update session and local cache
      user.password = newPass;
      setAuthSession(res.user || user, res.token);
      const users = getRegisteredUsers();
      const idx = users.findIndex((u) => u.username === user.username || u.email === user.email);
      if (idx !== -1) {
        users[idx].password = newPass;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      }

      closeModal("modalAccountPassword");
      showAccountToast("Password updated in database successfully!");
    } catch (err) {
      setModalAlert("alertUpdatePassword", err.message || "Failed to update password in database.");
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Done";
      }
    }
  });

  // 2. Username Update (Image 3 Recreation - Connected to Database + JWT)
  const formUpdateUsername = document.getElementById("formUpdateUsername");
  formUpdateUsername?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newUsername = (document.getElementById("edit-username-input")?.value || "").trim().toLowerCase();
    const curPass = document.getElementById("edit-username-curpass")?.value || "";
    const btnSubmit = document.getElementById("btnSubmitUsername");

    const user = getAuthUser();
    if (!user) return;

    if (!curPass) {
      setModalAlert("alertUpdateUsername", "Please enter your current password to confirm.");
      return;
    }

    if (!newUsername || newUsername.length < 3) {
      setModalAlert("alertUpdateUsername", "Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-z0-9_.]+$/.test(newUsername)) {
      setModalAlert("alertUpdateUsername", "Username must be in lowercase and contain only small letters, numbers, underscores, or periods.");
      return;
    }

    if (newUsername === (user.username || "").toLowerCase()) {
      setModalAlert("alertUpdateUsername", "New username cannot be the same as your current username.");
      return;
    }

    // Client-side uniqueness check across local registered users
    const localUsers = getRegisteredUsers();
    const duplicate = localUsers.find(
      (u) => (u.username || "").toLowerCase() === newUsername && (u.username || "").toLowerCase() !== (user.username || "").toLowerCase()
    );
    if (duplicate) {
      setModalAlert("alertUpdateUsername", `Username '${newUsername}' is already taken. Please choose another username.`);
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Updating...";
    }

    try {
      const res = await apiAuthRequest("/api/auth/profile", "PUT", {
        currentPassword: curPass,
        newUsername: newUsername
      }, true);

      const oldUsername = user.username;
      user.username = newUsername;
      setAuthSession(res.user || user, res.token);

      const users = getRegisteredUsers();
      const idx = users.findIndex((u) => u.username === oldUsername || u.email === user.email);
      if (idx !== -1) {
        users[idx].username = newUsername;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      }

      refreshAccountViews();
      closeModal("modalAccountUsername");
      showAccountToast("Username updated in database successfully!");
    } catch (err) {
      setModalAlert("alertUpdateUsername", err.message || "Failed to update username in database.");
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Done";
      }
    }
  });

  // 3. Email Update (Connected to Database + JWT)
  const formUpdateEmail = document.getElementById("formUpdateEmail");
  formUpdateEmail?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById("edit-email-input")?.value.trim().toLowerCase() || "";
    const curPass = document.getElementById("edit-email-curpass")?.value || "";
    const btnSubmit = document.getElementById("btnSubmitEmail");

    const user = getAuthUser();
    if (!user) return;

    if (!curPass) {
      setModalAlert("alertUpdateEmail", "Please enter your current password to confirm.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setModalAlert("alertUpdateEmail", "Please enter a valid email address.");
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Updating...";
    }

    try {
      const res = await apiAuthRequest("/api/auth/profile", "PUT", {
        currentPassword: curPass,
        newEmail: newEmail
      }, true);

      user.email = newEmail;
      setAuthSession(res.user || user, res.token);

      const users = getRegisteredUsers();
      const idx = users.findIndex((u) => u.username === user.username || u.email === user.email);
      if (idx !== -1) {
        users[idx].email = newEmail;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      }

      refreshAccountViews();
      closeModal("modalAccountEmail");
      showAccountToast("Email updated in database successfully!");
    } catch (err) {
      setModalAlert("alertUpdateEmail", err.message || "Failed to update email in database.");
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Done";
      }
    }
  });

  // 4. Phone Update (Connected to Database + JWT)
  const formUpdatePhone = document.getElementById("formUpdatePhone");
  formUpdatePhone?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPhone = (document.getElementById("edit-phone-input")?.value || "").replace(/[\s-]/g, "");
    const countryCode = document.getElementById("edit-phone-country-val")?.value || "+91";
    const curPass = document.getElementById("edit-phone-curpass")?.value || "";
    const btnSubmit = document.getElementById("btnSubmitPhone");

    const user = getAuthUser();
    if (!user) return;

    if (!curPass) {
      setModalAlert("alertUpdatePhone", "Please enter your current password to confirm.");
      return;
    }

    if (!/^[0-9]{7,15}$/.test(newPhone)) {
      setModalAlert("alertUpdatePhone", "Please enter a valid phone number (7-15 digits).");
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Updating...";
    }

    try {
      const res = await apiAuthRequest("/api/auth/profile", "PUT", {
        currentPassword: curPass,
        newPhone: newPhone,
        newCountryCode: countryCode
      }, true);

      user.phone = newPhone;
      user.countryCode = countryCode;
      setAuthSession(res.user || user, res.token);

      const users = getRegisteredUsers();
      const idx = users.findIndex((u) => u.username === user.username || u.email === user.email);
      if (idx !== -1) {
        users[idx].phone = newPhone;
        users[idx].countryCode = countryCode;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      }

      refreshAccountViews();
      closeModal("modalAccountPhone");
      showAccountToast("Phone number updated in database successfully!");
    } catch (err) {
      setModalAlert("alertUpdatePhone", err.message || "Failed to update phone in database.");
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Done";
      }
    }
  });

  // Initial population of views
  refreshAccountViews();
}

function getHazardEmojiIcon(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("flood") || normalized.includes("water")) return "🌊";
  if (normalized.includes("wave") || normalized.includes("coast")) return "💨";
  if (normalized.includes("cyclone") || normalized.includes("storm")) return "🌪️";
  if (normalized.includes("fire") || normalized.includes("heat")) return "🔥";
  if (normalized.includes("earthquake")) return "🌋";
  if (normalized.includes("landslide")) return "⛰️";
  return "⚠️";
}

function initializeAdminPages() {
  const pageKey = getPageKey();
  if (pageKey !== "manage" && pageKey !== "pinned" && pageKey !== "admin-dashboard") {
    return;
  }

  let activeFilter = "all";
  let activeSearch = "";
  let cachedReports = [];

  const updateKpis = (reports) => {
    const total = reports.length;
    const active = reports.filter((r) => r.status !== "resolved").length;
    const severe = reports.filter((r) => {
      const s = String(r.severity || "").toLowerCase();
      return s === "high" || s === "severe";
    }).length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const pinned = reports.filter((r) => Boolean(r.pinned)).length;

    const elTotal = document.getElementById("kpi-total");
    const elActive = document.getElementById("kpi-active");
    const elSevere = document.getElementById("kpi-severe");
    const elResolved = document.getElementById("kpi-resolved");
    const elPinned = document.getElementById("kpi-pinned");

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elSevere) elSevere.textContent = severe;
    if (elResolved) elResolved.textContent = resolved;
    if (elPinned) elPinned.textContent = pinned;

    const countAll = document.getElementById("count-all");
    const countOpen = document.getElementById("count-open");
    const countSevere = document.getElementById("count-severe");
    const countPinned = document.getElementById("count-pinned");
    const countResolved = document.getElementById("count-resolved");

    if (countAll) countAll.textContent = total;
    if (countOpen) countOpen.textContent = active;
    if (countSevere) countSevere.textContent = severe;
    if (countPinned) countPinned.textContent = pinned;
    if (countResolved) countResolved.textContent = resolved;
  };

  const escapeHtml = (str) => {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const getHazardLucideName = (type) => {
    const norm = String(type || "").toLowerCase();
    if (norm.includes("storm") || norm.includes("thunder")) return "cloud-lightning";
    if (norm.includes("flood") || norm.includes("water") || norm.includes("tsunami")) return "waves";
    if (norm.includes("cyclone") || norm.includes("wind")) return "wind";
    if (norm.includes("fire") || norm.includes("heat")) return "flame";
    if (norm.includes("earthquake") || norm.includes("quake")) return "activity";
    if (norm.includes("landslide")) return "mountain";
    return "alert-triangle";
  };

  const formatHazardTitle = (type) => {
    if (!type) return "Hazard Alert";
    const norm = String(type).trim().toLowerCase();
    if (norm === "storm" || norm.includes("thunder")) return "Thunderstorm";
    if (norm.includes("flood")) return "Flood Alert";
    if (norm.includes("cyclone")) return "Cyclone Warning";
    if (norm.includes("fire")) return "Wildfire";
    if (norm.includes("earthquake") || norm.includes("quake")) return "Earthquake";
    if (norm.includes("landslide")) return "Landslide";
    return norm.charAt(0).toUpperCase() + norm.slice(1);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    const clean = String(phone).trim();
    const compact = clean.replace(/\s+/g, "");
    if (/^\+91\d{10}$/.test(compact)) {
      return `+91 ${compact.slice(3, 8)} ${compact.slice(8)}`;
    }
    return clean;
  };

  const getHazardIllustrationSvg = (type) => {
    const norm = String(type || "").toLowerCase();
    if (norm.includes("storm") || norm.includes("thunder") || norm.includes("cyclone")) {
      return `
        <svg class="hazard-vector-art" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#182234"/>
          <ellipse cx="160" cy="85" rx="100" ry="50" fill="#243048"/>
          <ellipse cx="230" cy="100" rx="85" ry="42" fill="#2b3954"/>
          <ellipse cx="120" cy="120" rx="80" ry="40" fill="#1e293f"/>
          <polygon points="180,90 155,140 172,140 148,200 198,135 174,135" fill="#facc15" filter="drop-shadow(0 0 10px rgba(250,204,21,0.5))"/>
        </svg>
      `;
    }
    if (norm.includes("flood") || norm.includes("water") || norm.includes("wave")) {
      return `
        <svg class="hazard-vector-art" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#10233d"/>
          <path d="M0,130 C60,110 100,150 160,130 C220,110 260,150 320,130 L320,240 L0,240 Z" fill="#1d3b66"/>
          <path d="M0,165 C70,145 120,180 180,165 C240,150 280,175 320,165 L320,240 L0,240 Z" fill="#2563eb"/>
          <circle cx="160" cy="75" r="32" fill="#38bdf8" opacity="0.3"/>
          <path d="M160,45 C150,70 142,88 160,105 C178,88 170,70 160,45 Z" fill="#38bdf8"/>
        </svg>
      `;
    }
    if (norm.includes("fire") || norm.includes("heat")) {
      return `
        <svg class="hazard-vector-art" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#2d1515"/>
          <circle cx="160" cy="140" r="70" fill="#dc2626" opacity="0.3"/>
          <path d="M160,60 C180,100 205,125 190,165 C175,195 145,195 130,165 C115,125 140,100 160,60 Z" fill="#ef4444"/>
          <path d="M160,100 C172,125 185,140 178,165 C170,185 150,185 142,165 C135,140 148,125 160,100 Z" fill="#f97316"/>
          <path d="M160,135 C166,150 172,160 168,172 C164,180 156,180 152,172 C148,160 154,150 160,135 Z" fill="#fde047"/>
        </svg>
      `;
    }
    return `
      <svg class="hazard-vector-art" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="240" fill="#192231"/>
        <circle cx="160" cy="120" r="55" fill="#f59e0b" opacity="0.15"/>
        <path d="M160,75 L205,155 L115,155 Z" stroke="#f59e0b" stroke-width="8" stroke-linejoin="round" fill="none"/>
        <rect x="156" y="105" width="8" height="26" rx="4" fill="#f59e0b"/>
        <circle cx="160" cy="142" r="4" fill="#f59e0b"/>
      </svg>
    `;
  };

  const createAdminReportCardHtml = (r) => {
    const rawSev = String(r.severity || "medium").toLowerCase();
    const severityClass = (rawSev === "high" || rawSev === "severe") ? "high" : (rawSev === "low" ? "low" : "medium");
    const severityLevel = severityClass === "high" ? 3 : (severityClass === "medium" ? 2 : 1);
    const severityTitle = severityClass === "high" ? "High" : (severityClass === "medium" ? "Medium" : "Low");
    const isPinned = Boolean(r.pinned);
    const isResolved = r.status === "resolved";
    const isVerified = isReportVerified(r);
    const hazardIcon = getHazardLucideName(r.type);
    const hazardTitle = formatHazardTitle(r.type);
    const timeStr = formatRelativeTime(r.timestamp);
    const formattedPhone = formatPhoneNumber(r.phone);

    return `
      <article class="report-admin-card severity-${severityClass} ${isPinned ? 'pinned-card' : ''} ${isResolved ? 'resolved-card' : ''}" data-id="${escapeHtml(r.id)}">
        <!-- Left Content Area -->
        <div class="report-card-content">
          <!-- Top Bar: Icon Box + Title/Location + Status Badge -->
          <div class="report-card-topbar">
            <div class="report-identity-lockup">
              <div class="report-hazard-icon-box severity-${severityClass}">
                <i data-lucide="${hazardIcon}"></i>
              </div>
              <div class="report-title-meta">
                <h3 class="report-hazard-title">${escapeHtml(hazardTitle)}</h3>
                <p class="report-location-line">
                  <i data-lucide="map-pin"></i>
                  <span>${escapeHtml(r.location)}</span>
                </p>
              </div>
            </div>
            <div class="report-status-badge ${isResolved ? 'status-resolved' : 'status-active'}">
              <span class="status-dot"></span>
              <span>${isResolved ? 'Resolved' : 'Active'}</span>
            </div>
          </div>

          <!-- Description Text -->
          <p class="report-description-text">${escapeHtml(r.rawText || 'No additional field remarks provided.')}</p>

          <!-- Segmented Severity Indicator (Image 2) -->
          <div class="report-severity-row">
            <div class="severity-bars severity-${severityClass}">
              <span class="sev-bar ${severityLevel >= 1 ? 'active' : ''}"></span>
              <span class="sev-bar ${severityLevel >= 2 ? 'active' : ''}"></span>
              <span class="sev-bar ${severityLevel >= 3 ? 'active' : ''}"></span>
            </div>
            <span class="severity-text-label">
              <strong class="sev-name">${severityTitle}</strong> severity
            </span>
          </div>

          <!-- Metadata Pills: Time & Phone -->
          <div class="report-metadata-pills">
            <div class="meta-pill">
              <i data-lucide="clock"></i>
              <span>${escapeHtml(timeStr)}</span>
            </div>
            ${formattedPhone ? `
              <div class="meta-pill">
                <i data-lucide="phone"></i>
                <span>${escapeHtml(formattedPhone)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Action Buttons (Image 2) -->
          <div class="report-card-actions">
            ${isResolved ? `
              <button type="button" class="btn-action-solved is-reopen" data-id="${escapeHtml(r.id)}" data-action="reopen" title="Reopen active hazard">
                <i data-lucide="rotate-ccw"></i>
                <span>Reopen incident</span>
              </button>
            ` : `
              <button type="button" class="btn-action-solved" data-id="${escapeHtml(r.id)}" data-action="resolve" title="Mark hazard as addressed">
                <i data-lucide="check"></i>
                <span>Mark as solved</span>
              </button>
            `}

            ${isVerified ? `
              <button type="button" class="btn-action-verify is-verified" data-id="${escapeHtml(r.id)}" data-action="unverify" title="Report is verified. Click to revoke verification.">
                <i data-lucide="shield-check"></i>
                <span>Verified report</span>
              </button>
            ` : `
              <button type="button" class="btn-action-verify" data-id="${escapeHtml(r.id)}" data-action="verify" title="Verify report authenticity">
                <i data-lucide="shield-check"></i>
                <span>Verify report</span>
              </button>
            `}

            ${isPinned ? `
              <button type="button" class="btn-action-pin is-pinned" data-id="${escapeHtml(r.id)}" data-action="unpin" title="Remove from priority map">
                <i data-lucide="pin-off"></i>
                <span>Unpin from map</span>
              </button>
            ` : `
              <button type="button" class="btn-action-pin" data-id="${escapeHtml(r.id)}" data-action="pin" title="Pin as priority alert">
                <i data-lucide="pin"></i>
                <span>Pin to map</span>
              </button>
            `}

            <button type="button" class="btn-action-trash" data-id="${escapeHtml(r.id)}" data-action="delete" title="Purge incident record">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>

        <!-- Right Media / Evidence Panel (Image 2) -->
        <div class="report-media-panel">
          ${r.photoUrl ? `
            <a href="${escapeHtml(r.photoUrl)}" target="_blank" rel="noopener noreferrer" class="report-media-link" title="Click to view full photo">
              <img src="${escapeHtml(r.photoUrl)}" alt="Hazard Evidence" class="report-media-img" loading="lazy" />
            </a>
          ` : `
            <div class="report-media-graphic">
              ${getHazardIllustrationSvg(r.type)}
            </div>
          `}
        </div>
      </article>
    `;
  };

  const renderManageReports = (reports) => {
    const container = document.getElementById("manageReportsContainer");
    if (!container) return;

    let filtered = reports.filter((r) => {
      if (activeFilter === "open") return r.status !== "resolved";
      if (activeFilter === "severe") {
        const s = String(r.severity || "").toLowerCase();
        return s === "high" || s === "severe";
      }
      if (activeFilter === "pinned") return Boolean(r.pinned);
      if (activeFilter === "resolved") return r.status === "resolved";
      return true;
    });

    if (activeSearch) {
      const queryLower = activeSearch.toLowerCase();
      filtered = filtered.filter((r) => {
        return (
          (r.location || "").toLowerCase().includes(queryLower) ||
          (r.type || "").toLowerCase().includes(queryLower) ||
          (r.rawText || "").toLowerCase().includes(queryLower) ||
          (r.phone || "").toLowerCase().includes(queryLower)
        );
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="admin-empty-state">
          <i data-lucide="inbox"></i>
          <h3>No Incident Reports Match Filter</h3>
          <p>There are no reports matching "${escapeHtml(activeFilter)}" with search query "${escapeHtml(activeSearch)}".</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    container.innerHTML = filtered.map((r) => createAdminReportCardHtml(r)).join("");
    refreshIcons();

    const urlParams = new URLSearchParams(window.location.search);
    const targetReportId = urlParams.get("id");
    if (targetReportId && !window._scrolledToTargetReport) {
      window._scrolledToTargetReport = true;
      setTimeout(() => {
        const card = container.querySelector(`[data-id="${targetReportId}"]`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("highlight-pulse");
          setTimeout(() => card.classList.remove("highlight-pulse"), 4000);
        }
      }, 150);
    }
  };

  const renderPinnedBoard = (reports) => {
    const container = document.getElementById("pinnedReportsContainer");
    if (!container) return;

    const pinnedReports = reports.filter((r) => Boolean(r.pinned));

    if (pinnedReports.length === 0) {
      container.innerHTML = `
        <div class="admin-empty-state">
          <i data-lucide="pin-off"></i>
          <h3>No Hazards Currently Pinned</h3>
          <p>Pin critical or high-severity hazards from the <a href="manage-reports.html" style="color:#60a5fa;text-decoration:underline;">Manage Reports</a> queue to feature them here.</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    container.innerHTML = pinnedReports.map((r) => createAdminReportCardHtml(r)).join("");
    refreshIcons();
  };

  const renderDashboardTable = (reports) => {
    const tbody = document.getElementById("adminRecentTableBody");
    if (!tbody) return;

    if (reports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:#64748b;padding:2rem;">No recent incident reports submitted yet.</td>
        </tr>
      `;
      return;
    }

    const recents = reports.slice(0, 10);
    tbody.innerHTML = recents.map((r) => {
      const severityClass = (r.severity || "medium").toLowerCase();
      const isResolved = r.status === "resolved";
      const icon = getHazardEmojiIcon(r.type);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(r.location)}</strong>
            <div style="font-size:0.75rem;color:#64748b;">${formatRelativeTime(r.timestamp)}</div>
          </td>
          <td>
            <span>${icon} ${escapeHtml(r.type)}</span>
          </td>
          <td>
            <span class="report-chip chip-${severityClass}">${escapeHtml(severityClass)}</span>
          </td>
          <td>
            <span class="report-chip chip-${isResolved ? 'resolved' : 'open'}">
              ${isResolved ? 'Resolved' : 'Active'}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:0.4rem;align-items:center;">
              ${isResolved ? `
                <button type="button" class="action-btn btn-reopen" style="padding:0.3rem 0.6rem;font-size:0.75rem;" data-id="${escapeHtml(r.id)}" data-action="reopen" title="Reopen">
                  <i data-lucide="rotate-ccw"></i>
                </button>
              ` : `
                <button type="button" class="action-btn btn-resolve" style="padding:0.3rem 0.6rem;font-size:0.75rem;" data-id="${escapeHtml(r.id)}" data-action="resolve" title="Mark Solved">
                  <i data-lucide="check"></i>
                </button>
              `}
              <a href="manage-reports.html?id=${encodeURIComponent(r.id)}" class="action-btn btn-overview" style="padding:0.3rem 0.6rem;font-size:0.75rem;text-decoration:none;" title="Overview: View Detailed Report Card">
                <i data-lucide="eye"></i>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    refreshIcons();
  };

  // Wire filter tab clicks
  const filterTabs = document.querySelectorAll(".filter-tab-btn");
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.dataset.filter || "all";
      renderManageReports(cachedReports);
    });
  });

  // Wire search input
  const searchInput = document.getElementById("adminSearchInput");
  searchInput?.addEventListener("input", (e) => {
    activeSearch = e.target.value.trim();
    renderManageReports(cachedReports);
  });

  // Action event delegation
  const handleActionClick = async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    e.preventDefault();

    const action = btn.dataset.action;
    const reportId = btn.dataset.id;
    if (!reportId || !action) return;

    btn.disabled = true;

    try {
      if (action === "upvote") {
        await setVoteDelta(reportId, 1);
      } else if (action === "downvote") {
        await setVoteDelta(reportId, -1);
      } else if (action === "resolve") {
        await setStatus(reportId, "resolved");
      } else if (action === "reopen") {
        await setStatus(reportId, "open");
      } else if (action === "verify") {
        await setVerified(reportId, true);
      } else if (action === "unverify") {
        await setVerified(reportId, false);
      } else if (action === "pin") {
        await setPinned(reportId, true);
      } else if (action === "unpin") {
        await setPinned(reportId, false);
      } else if (action === "delete") {
        if (confirm("Are you sure you want to delete this incident report from the operations queue?")) {
          await setDeleted(reportId, true);
        }
      }
    } catch (err) {
      console.error(`Failed to execute admin action ${action}:`, err);
      alert(`Action failed: ${err.message || 'Unknown error'}`);
    } finally {
      btn.disabled = false;
    }
  };

  document.addEventListener("click", handleActionClick);

  // Subscribe to live reports store
  subscribeToReports((reports) => {
    cachedReports = reports;
    updateKpis(reports);
    if (pageKey === "manage") {
      renderManageReports(reports);
    } else if (pageKey === "pinned") {
      renderPinnedBoard(reports);
    } else if (pageKey === "admin-dashboard") {
      renderDashboardTable(reports);
    }
  });
}

function initializeVerificationPage() {
  if (getPageKey() !== "verification") return;

  const form = document.getElementById("formVerifyReporter");
  const emailInput = document.getElementById("inputVerifyEmail");
  const btnSubmit = document.getElementById("btnVerifySubmit");
  const alertEl = document.getElementById("alertVerifyReporter");
  const searchInput = document.getElementById("inputSearchVerified");
  const tbody = document.getElementById("tbodyVerifiedReporters");
  const kpiCount = document.getElementById("kpi-verified-count");

  let reportersList = [];

  const showAlert = (message, type = "success") => {
    if (!alertEl) return;
    if (!message) {
      alertEl.className = "verification-alert";
      alertEl.textContent = "";
      alertEl.style.display = "none";
      return;
    }
    alertEl.className = `verification-alert visible ${type}`;
    alertEl.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i> <span>${escapeHtml(message)}</span>`;
    alertEl.style.display = "flex";
    refreshIcons();
    if (type === "success") {
      setTimeout(() => {
        if (alertEl.classList.contains("success")) {
          alertEl.style.display = "none";
          alertEl.className = "verification-alert";
        }
      }, 5000);
    }
  };

  const escapeHtml = (str) => {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const renderRoster = () => {
    if (!tbody) return;
    const q = (searchInput?.value || "").trim().toLowerCase();
    const filtered = reportersList.filter((r) => {
      const email = (r.email || (typeof r === "string" ? r : "")).toLowerCase();
      return !q || email.includes(q);
    });

    if (kpiCount) kpiCount.textContent = reportersList.length;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: #64748b;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
              <i data-lucide="users" style="width:32px;height:32px;opacity:0.4;"></i>
              <p style="margin:0;font-size:0.95rem;">${q ? `No verified reporters matching "${escapeHtml(q)}"` : 'No verified reporters yet. Authorize an email using the form above.'}</p>
            </div>
          </td>
        </tr>
      `;
      refreshIcons();
      return;
    }

    tbody.innerHTML = filtered.map((r) => {
      const email = typeof r === "string" ? r : (r.email || "");
      const verifiedBy = typeof r === "object" && r.verifiedBy ? r.verifiedBy : "Operations Admin";
      const rawDate = typeof r === "object" && r.verifiedAt ? r.verifiedAt : null;
      const dateStr = rawDate ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Active";
      const initial = (email[0] || "U").toUpperCase();

      return `
        <tr>
          <td>
            <div class="reporter-email-cell">
              <div class="reporter-avatar-circle">${escapeHtml(initial)}</div>
              <div>
                <strong style="color:#ffffff;display:block;">${escapeHtml(email)}</strong>
                <span style="font-size:0.75rem;color:#64748b;">Authenticated Citizen Profile</span>
              </div>
            </div>
          </td>
          <td>
            <span class="verified-pill verified" style="margin:0;">
              <i data-lucide="shield-check"></i>
              <span>Verified Reporter</span>
            </span>
          </td>
          <td style="color:#94a3b8;font-size:0.84rem;">
            ${escapeHtml(dateStr)}
          </td>
          <td style="color:#cbd5e1;font-size:0.84rem;">
            ${escapeHtml(verifiedBy)}
          </td>
          <td style="text-align: right;">
            <button type="button" class="btn-action-revoke" data-revoke-email="${escapeHtml(email)}" title="Revoke verification badge">
              <i data-lucide="user-x"></i>
              <span>Revoke</span>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    refreshIcons();
  };

  const loadData = async () => {
    reportersList = await fetchVerifiedReporters();
    renderRoster();
  };

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (emailInput?.value || "").trim().toLowerCase();
    if (!email) {
      showAlert("Please enter an email address.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("Please enter a valid email address.", "error");
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i data-lucide="loader"></i> <span>Authorizing...</span>`;
    refreshIcons();

    try {
      const authUser = getAuthUser();
      const adminIdentity = authUser?.email || "admin@geonetra.com";
      await addVerifiedReporterApi(email, adminIdentity);
      showAlert(`Success! ${email} has been authorized as a Verified Reporter (Green Badge).`, "success");
      if (emailInput) emailInput.value = "";
      reportersList = await fetchVerifiedReporters();
      renderRoster();

      const currentAuth = getAuthUser();
      if (currentAuth && (currentAuth.email || "").toLowerCase() === email) {
        updateHeaderVerificationBadge(true);
      }
    } catch (err) {
      showAlert(err.message || "Failed to authorize reporter.", "error");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i data-lucide="shield-check"></i> <span>Verify Reporter</span>`;
      refreshIcons();
    }
  });

  searchInput?.addEventListener("input", renderRoster);

  tbody?.addEventListener("click", async (e) => {
    const revokeBtn = e.target.closest("[data-revoke-email]");
    if (!revokeBtn) return;
    const targetEmail = revokeBtn.getAttribute("data-revoke-email");
    if (!targetEmail) return;

    if (!confirm(`Are you sure you want to revoke verification for ${targetEmail}?\n\nTheir status will revert to Unverified Reporter (Red Badge).`)) {
      return;
    }

    revokeBtn.disabled = true;
    try {
      await removeVerifiedReporterApi(targetEmail);
      showAlert(`Verification revoked for ${targetEmail}. Status reverted to Unverified Reporter.`, "success");
      reportersList = await fetchVerifiedReporters();
      renderRoster();

      const currentAuth = getAuthUser();
      if (currentAuth && (currentAuth.email || "").toLowerCase() === targetEmail.toLowerCase()) {
        updateHeaderVerificationBadge(false);
      }
    } catch (err) {
      showAlert(err.message || "Failed to revoke verification.", "error");
    } finally {
      revokeBtn.disabled = false;
    }
  });

  loadData();
}

function initializeHomeRecentReports() {
  const tbody = document.getElementById("home-reports-tbody");
  if (!tbody) return;

  const escapeText = (str) => String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  try {
    subscribeToReports((reports) => {
      if (!Array.isArray(reports) || reports.length === 0) return;
      const activeReports = reports.filter((r) => !r.deleted);
      if (activeReports.length === 0) return;

      const topReports = activeReports.slice(0, 4);
      tbody.innerHTML = topReports.map((r) => {
        const sev = String(r.severity || "medium").toLowerCase();
        const sevClass = sev === "high" || sev === "severe" ? "badge-red"
          : sev === "low" ? "badge-green" : "badge-orange";
        const sevLabel = sev === "high" || sev === "severe" ? "High Risk"
          : sev === "low" ? "Low Risk" : "Medium";
        const isResolved = r.status === "resolved";
        const statusClass = isResolved ? "status-resolved" : r.status === "monitoring" ? "status-monitoring" : "status-active";
        const statusLabel = isResolved ? "Resolved" : r.status === "monitoring" ? "Monitoring" : "Active";
        const timeStr = r.timestamp ? formatRelativeTime(r.timestamp) : "Recently";

        return `
          <tr>
            <td class="cell-location">${escapeText(r.location || "Coastal Sector")}</td>
            <td class="cell-hazard">${escapeText(r.type || "Hazard Warning")}</td>
            <td><span class="badge-neon ${sevClass}">${escapeText(sevLabel)}</span></td>
            <td class="cell-time">${escapeText(timeStr)}</td>
            <td class="status-cell"><span class="status-indicator ${statusClass}">${escapeText(statusLabel)}</span></td>
          </tr>
        `;
      }).join("");
    });
  } catch (err) {
    console.warn("Home recent reports subscription unavailable:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  migrateLegacyVerificationState();
  if (!checkAuthGuard()) return;

  applyTheme(getStoredTheme(), { persist: false });
  renderSharedHeader();
  renderSharedFooter();
  initializeNavigationEvents();
  initializeThemeToggle();
  initializeEmergencyPopup();
  initializeStatCounters();
  initializeHazardPageHelpers();
  initializeMapPage();
  initializeAuthPage();
  initializeAccountSettings();
  initializeAdminPages();
  initializeVerificationPage();
  initializeHomeRecentReports();

  refreshIcons();
});

