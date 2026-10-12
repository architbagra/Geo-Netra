/**
 * GeoNetra Central Configuration
 * Dynamically resolves Backend API URL based on host environment.
 */

const PRODUCTION_BACKEND_URL = "https://geo-netra-backend.onrender.com";

export function getBackendBaseUrl() {
  if (typeof window === "undefined") {
    return PRODUCTION_BACKEND_URL;
  }

  // 1. Manual override from localStorage if set by developer
  const manualOverride = localStorage.getItem("geonetra_backend_url");
  if (manualOverride) {
    return manualOverride.replace(/\/+$/, "");
  }

  // 2. Local development on localhost / 127.0.0.1
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }

  // 3. Deployed environments (e.g. geonetra.vercel.app)
  return PRODUCTION_BACKEND_URL;
}

export const BACKEND_URL = getBackendBaseUrl();
