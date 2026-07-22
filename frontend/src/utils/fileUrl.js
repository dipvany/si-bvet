export function resolveFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api").replace(/\/$/, "");
  const origin = apiBase.replace(/\/api\/?$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanPath.startsWith("/api/")) return `${origin}${cleanPath}`;
  return `${apiBase}${cleanPath}`;
}