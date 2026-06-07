/**
 * resolveFileUrl — konversi path relatif ke URL lengkap backend.
 * Sama dengan yang ada di sibvet (fileUrl.ts), versi JS.
 */
export function resolveFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const apiBase =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";
  const backendOrigin = apiBase.replace(/\/api\/?$/, "");
  return `${backendOrigin}${path}`;
}
