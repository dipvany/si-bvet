// Kunci localStorage — sama dengan yang dipakai backend (si-bvet-token / si-bvet-user)
const TOKEN_KEY = "si-bvet-token";
const USER_KEY  = "si-bvet-user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};

export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => !!getToken();

/**
 * getDashboardPath — mapping role ke path dashboard.
 * Backend mengirimkan role dalam lowercase:
 *   "superadmin" | "admin" | "customer"
 */
export const getDashboardPath = (role) => ({
  customer:   "/customer/beranda",
  admin:      "/admin/beranda",
  superadmin: "/superadmin/beranda",
}[(role ?? "").toLowerCase()] ?? "/login");

export const getRoleLabel = (role) => ({
  customer:   "Pelanggan",
  admin:      "Admin",
  superadmin: "Super Admin",
}[(role ?? "").toLowerCase()] ?? role);
