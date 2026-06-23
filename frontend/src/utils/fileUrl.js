/**
 * resolveFileUrl — konversi path relatif dari API ke URL lengkap backend.
 *
 * BUG YANG DIPERBAIKI:
 *   Versi lama: return backendOrigin + path
 *   Jika path = "uploads/foo.pdf" (tanpa leading slash) → URL rusak → 404
 *   Perbaikan: pastikan selalu ada "/" antara origin dan path.
 */
export function resolveFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const apiBase       = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";
  const backendOrigin = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
  const cleanPath     = path.startsWith("/") ? path : `/${path}`;

  return `${backendOrigin}${cleanPath}`;
}