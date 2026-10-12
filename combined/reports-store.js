// reports-store.js - Central Data Store backed by MongoDB Atlas (with local caching & real-time sync)
const BACKEND_API_BASE = "http://localhost:3000/api/hazards";
const REPORT_OVERRIDES_STORAGE_KEY = "geonetra_report_overrides_v2";
const CACHED_HAZARDS_STORAGE_KEY = "geonetra_atlas_hazards_cache";
const LOCAL_HAZARDS_STORAGE_KEY = "geonetra_local_hazards";
const REPORTS_CHANGED_EVENT = "geonetra:reports-changed";
const listeners = new Set();

let reportCache = [];
let storeInitialized = false;
let syncIntervalId = null;

function readOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_OVERRIDES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeOverrides(overrides) {
  try {
    localStorage.setItem(REPORT_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {}
}

function normalizeTimestamp(timestampValue) {
  if (!timestampValue) return null;
  if (typeof timestampValue.toDate === "function") return timestampValue.toDate();

  const parsed = new Date(timestampValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeHazard(raw) {
  if (!raw) return null;
  const data = typeof raw.data === "function" ? raw.data() : raw;
  const id = raw.id || data.id || data._id || `haz_${Date.now()}`;

  const lat = typeof data.latitude === "number" ? data.latitude : parseFloat(data.latitude);
  const lng = typeof data.longitude === "number" ? data.longitude : parseFloat(data.longitude);

  return {
    id: String(id),
    type: data.type || "other",
    location: data.location || "Unknown location",
    latitude: !isNaN(lat) ? lat : 20.5937,
    longitude: !isNaN(lng) ? lng : 78.9629,
    severity: data.severity || "medium",
    status: data.status || "open",
    pinned: Boolean(data.pinned),
    votes: typeof data.votes === "number" ? data.votes : 1,
    deleted: Boolean(data.deleted),
    phone: data.phone || data.contact || null,
    observerPhone: data.observerPhone || data.phone || null,
    countryCode: data.countryCode || "+91",
    userEmail: data.userEmail || data.email || data.authorEmail || null,
    userName: data.userName || data.username || data.reportedBy || null,
    verified: Boolean(data.verified || data.isVerifiedReporter),
    isVerifiedReporter: Boolean(data.verified || data.isVerifiedReporter),
    rawText: data.rawText || data.description || "No report details available.",
    summaryOriginal: data.summaryOriginal || data.aiSummaryOriginal || null,
    summaryEnglish: data.summaryEnglish || data.aiSummaryEnglish || null,
    summaryHindi: data.summaryHindi || data.aiSummaryHindi || null,
    sourceLanguage: data.sourceLanguage || null,
    photoUrl: data.photoUrl || null,
    timestamp: normalizeTimestamp(data.timestamp || data.createdAt)
  };
}

function getDerivedTitle(report) {
  const labels = {
    earthquake: "Earthquake",
    flood: "Flood",
    cyclone: "Cyclone",
    fire: "Fire",
    landslide: "Landslide",
    storm: "Storm",
    drought: "Drought",
    other: "Hazard"
  };
  const typeLabel = labels[report.type] || "Hazard";
  return `${typeLabel} reported at ${report.location}`;
}

function applyOverrides(report, overrides) {
  const next = overrides[report.id] || {};
  const baseVotes = Number.isFinite(report.votes) ? report.votes : 1;

  return {
    ...report,
    title: getDerivedTitle(report),
    votes: next.voteDelta !== undefined ? baseVotes + next.voteDelta : baseVotes,
    status: next.status || report.status || "open",
    pinned: next.pinned !== undefined ? Boolean(next.pinned) : Boolean(report.pinned),
    deleted: next.deleted !== undefined ? Boolean(next.deleted) : Boolean(report.deleted),
    verified: next.verified !== undefined ? Boolean(next.verified) : Boolean(report.verified),
    isVerifiedReporter: next.isVerifiedReporter !== undefined ? Boolean(next.isVerifiedReporter) : Boolean(report.isVerifiedReporter)
  };
}

function readLocalHazards() {
  try {
    const raw = localStorage.getItem(LOCAL_HAZARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeHazard).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readCachedHazards() {
  try {
    const raw = localStorage.getItem(CACHED_HAZARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeHazard).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function buildMergedReports() {
  const overrides = readOverrides();
  const localHazards = readLocalHazards();

  // Combine MongoDB Atlas reportCache with local submission hazards
  const map = new Map();
  reportCache.forEach((r) => map.set(r.id, r));
  localHazards.forEach((h) => {
    if (!map.has(h.id)) map.set(h.id, h);
  });

  const merged = Array.from(map.values());

  return merged
    .map((report) => applyOverrides(report, overrides))
    .filter((report) => !report.deleted)
    .sort((left, right) => {
      const leftTime = left.timestamp ? left.timestamp.getTime() : 0;
      const rightTime = right.timestamp ? right.timestamp.getTime() : 0;
      return rightTime - leftTime;
    });
}

function emitChange() {
  const reports = buildMergedReports();
  window.dispatchEvent(new CustomEvent(REPORTS_CHANGED_EVENT, { detail: { reports } }));
  listeners.forEach((listener) => {
    try {
      listener(reports);
    } catch (e) {
      console.warn("Report listener callback notice:", e);
    }
  });
}

async function fetchBackendHazards() {
  try {
    const res = await fetch(BACKEND_API_BASE, { cache: "no-store" });
    if (res.ok) {
      const hazards = await res.json();
      if (Array.isArray(hazards)) {
        const normalized = hazards.map(normalizeHazard).filter(Boolean);
        reportCache = normalized;

        // Persist fresh Atlas cache to localStorage
        try {
          localStorage.setItem(CACHED_HAZARDS_STORAGE_KEY, JSON.stringify(normalized));
        } catch {}

        emitChange();
        return;
      }
    }
  } catch (err) {
    console.debug("Backend fetch notice (Atlas sync):", err.message || err);
  }
}

function ensureStoreStarted() {
  if (storeInitialized) return;
  storeInitialized = true;

  // 1. Instantly populate cache from localStorage so UI is immediate
  const initialCache = readCachedHazards();
  if (initialCache.length > 0) {
    reportCache = initialCache;
    emitChange();
  }

  // 2. Fetch fresh live records from MongoDB Atlas backend
  fetchBackendHazards();

  // 3. Keep real-time polling every 3.5 seconds
  if (!syncIntervalId) {
    syncIntervalId = setInterval(fetchBackendHazards, 3500);
  }

  // 4. Refresh on tab focus
  window.addEventListener("focus", () => {
    fetchBackendHazards();
  });
}

function updateOverride(reportId, updater) {
  const overrides = readOverrides();
  const previous = overrides[reportId] || {};
  overrides[reportId] = updater(previous);
  writeOverrides(overrides);
  emitChange();
}

async function setVoteDelta(reportId, deltaChange) {
  updateOverride(reportId, (previous) => ({
    ...previous,
    voteDelta: (previous.voteDelta || 0) + deltaChange
  }));

  try {
    await fetch(`${BACKEND_API_BASE}/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteDelta: deltaChange })
    });
  } catch {}

  try {
    if (db) {
      const current = reportCache.find((r) => r.id === reportId);
      const newVotes = (current?.votes || 1) + deltaChange;
      await updateDoc(doc(db, "hazards", reportId), { votes: newVotes });
    }
  } catch {}
}

async function setStatus(reportId, status) {
  updateOverride(reportId, (previous) => ({
    ...previous,
    status
  }));

  try {
    await fetch(`${BACKEND_API_BASE}/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  } catch {}

  try {
    if (db) {
      await updateDoc(doc(db, "hazards", reportId), { status });
    }
  } catch {}
}

async function setPinned(reportId, pinned) {
  updateOverride(reportId, (previous) => ({
    ...previous,
    pinned
  }));

  try {
    await fetch(`${BACKEND_API_BASE}/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned })
    });
  } catch {}
}

async function setVerified(reportId, verified) {
  const isVer = Boolean(verified);
  updateOverride(reportId, (previous) => ({
    ...previous,
    verified: isVer,
    isVerifiedReporter: isVer
  }));

  try {
    await fetch(`${BACKEND_API_BASE}/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: isVer, isVerifiedReporter: isVer })
    });
  } catch {}
}

async function setDeleted(reportId, deleted) {
  updateOverride(reportId, (previous) => ({
    ...previous,
    deleted
  }));

  // Remove directly from memory cache
  reportCache = reportCache.filter((r) => String(r.id) !== String(reportId));

  // Remove from localStorage caches
  try {
    const rawLocal = localStorage.getItem(LOCAL_HAZARDS_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((h) => String(h.id || h._id) !== String(reportId));
        localStorage.setItem(LOCAL_HAZARDS_STORAGE_KEY, JSON.stringify(filtered));
      }
    }
  } catch {}

  try {
    const rawCached = localStorage.getItem(CACHED_HAZARDS_STORAGE_KEY);
    if (rawCached) {
      const parsed = JSON.parse(rawCached);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((h) => String(h.id || h._id) !== String(reportId));
        localStorage.setItem(CACHED_HAZARDS_STORAGE_KEY, JSON.stringify(filtered));
      }
    }
  } catch {}

  // Delete from MongoDB Atlas via backend API
  try {
    await fetch(`${BACKEND_API_BASE}/${reportId}`, {
      method: "DELETE"
    });
  } catch {}

  emitChange();
}

function subscribeToReports(listener) {
  ensureStoreStarted();
  listeners.add(listener);
  listener(buildMergedReports());

  return () => {
    listeners.delete(listener);
  };
}

function getReportsSnapshot() {
  ensureStoreStarted();
  return buildMergedReports();
}

window.addEventListener("storage", (event) => {
  if (
    event.key === REPORT_OVERRIDES_STORAGE_KEY ||
    event.key === LOCAL_HAZARDS_STORAGE_KEY ||
    event.key === CACHED_HAZARDS_STORAGE_KEY
  ) {
    emitChange();
  }
});

window.addEventListener(REPORTS_CHANGED_EVENT, () => {
  emitChange();
});

export {
  REPORTS_CHANGED_EVENT,
  getReportsSnapshot,
  setDeleted,
  setPinned,
  setStatus,
  setVerified,
  setVoteDelta,
  subscribeToReports
};
