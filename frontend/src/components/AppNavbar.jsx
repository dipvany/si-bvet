import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getUser , getRoleLabel } from "../utils/auth";
import { getCartCount } from "../utils/cart";
import { apiFetch } from "../services/api";

export default function AppNavbar({ onMenuClick, onNotifExpand }) {
  const user       = getUser();
  const isCustomer = user?.role === "customer";

  const [cartCount, setCartCount] = useState(getCartCount());
  const [notifs,    setNotifs]    = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const sync = () => setCartCount(getCartCount());
    window.addEventListener("storage", sync);
    window.addEventListener("cart-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cart-updated", sync);
    };
  }, []);

  useEffect(() => {
    if (!isCustomer) return;
    const fetchNotifs = () => {
      apiFetch("/customer/notifications")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setNotifs(d.notifications ?? d.data ?? []); })
        .catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [isCustomer]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await apiFetch("/customer/notifications/read-all", { method: "PATCH" });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const markOneRead = async (id) => {
    try {
      await apiFetch(`/customer/notifications/${id}/read`, { method: "PATCH" });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleExpand = () => {
    setNotifOpen(false);
    onNotifExpand?.();
  };

  const initials = (user?.fullname ?? "U")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

  const profilePath = {
    customer:   "/customer/profil",
    admin:      "/admin/profil",
    superadmin: "/superadmin/profil",
  }[user?.role ?? ""] ?? "/";

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4
      flex items-center justify-between flex-shrink-0 shadow-sm z-10">

      {/* Kiri */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className="w-5 h-5">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <p className="text-sm font-semibold italic text-gray-500 tracking-wide hidden sm:block">
          Laboratorium Balai Veteriner Lampung
        </p>
      </div>

      {/* Kanan */}
      <div className="flex items-center gap-2">

        {/* Keranjang */}
        {isCustomer && (
          <Link to="/customer/keranjang"
            className="relative p-2 rounded-lg text-gray-500
              hover:bg-gray-100 hover:text-[#233B6E] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F5C400]
                text-[#233B6E] text-[10px] font-extrabold rounded-full
                flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
        )}

        {/* Notifikasi */}
        {isCustomer && (
          <div ref={notifRef} className="relative">
            <button onClick={() => setNotifOpen(p => !p)}
              className="relative p-2 rounded-lg text-gray-500
                hover:bg-gray-100 hover:text-[#233B6E] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500
                  text-white text-[10px] font-extrabold rounded-full
                  flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown popup kecil */}
            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl
                border border-gray-200 shadow-xl z-50 overflow-hidden">

                {/* Header popup */}
                <div className="px-4 py-3 border-b border-gray-100
                  flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#233B6E]">Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px]
                        font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead}
                        className="text-xs text-gray-400 hover:text-[#233B6E]
                          px-2 py-1 rounded transition-colors">
                        Baca semua
                      </button>
                    )}
                    {/* Tombol perbesar - tampil di area konten */}
                    <button onClick={handleExpand} title="Lihat semua notifikasi"
                      className="p-1.5 rounded-lg text-gray-400
                        hover:bg-gray-100 hover:text-[#233B6E] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="w-3.5 h-3.5">
                        <polyline points="15 3 21 3 21 9"/>
                        <polyline points="9 21 3 21 3 15"/>
                        <line x1="21" y1="3" x2="14" y2="10"/>
                        <line x1="3" y1="21" x2="10" y2="14"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* List notifikasi (preview singkat) */}
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        className="w-10 h-10 text-gray-200">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      <p className="text-xs text-gray-400">Tidak ada notifikasi</p>
                    </div>
                  ) : (
                    notifs.slice(0, 5).map(n => (
                      <button key={n.id} onClick={() => markOneRead(n.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-[#F6F7FB]
                          transition-colors flex items-start gap-3
                          ${!n.is_read ? "bg-blue-50/50" : ""}`}>
                        <div className={`mt-0.5 w-7 h-7 rounded-full flex-shrink-0
                          flex items-center justify-center
                          ${!n.is_read ? "bg-[#233B6E]" : "bg-gray-100"}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className={`w-3.5 h-3.5 ${!n.is_read ? "text-white" : "text-gray-400"}`}>
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-semibold truncate
                              ${!n.is_read ? "text-[#233B6E]" : "text-gray-600"}`}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#233B6E] flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer: lihat semua */}
                {notifs.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-gray-100">
                    <button onClick={handleExpand}
                      className="w-full text-xs font-semibold text-[#233B6E]
                        hover:underline text-center">
                      Lihat semua notifikasi →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Avatar */}
        <Link to={profilePath}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity
            pl-2 border-l border-gray-200">
          {user?.photo_url ? (
            <img src={user.photo_url} alt={user.fullname}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#233B6E]/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#233B6E] text-white
              text-xs font-bold flex items-center justify-center ring-2 ring-[#233B6E]/20">
              {initials}
            </div>
          )}
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-xs font-semibold text-[#233B6E] truncate max-w-[120px]">
              {user?.fullname ?? "Pengguna"}
            </span>
            <span className="text-[10px] text-gray-400">{getRoleLabel(user?.role)}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}