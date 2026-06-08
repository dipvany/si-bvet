// Base URL dari env, fallback ke localhost
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api"
).replace(/\/$/, "");

import { getToken, clearAuth } from "../utils/auth";

// Re-export agar import lama tidak rusak
export { getToken, getUser, saveAuth, clearAuth, isAuthenticated, getDashboardPath, getRoleLabel } from "../utils/auth";

// Helper: request dengan token Bearer
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    return res;
  }
  return res;
}
