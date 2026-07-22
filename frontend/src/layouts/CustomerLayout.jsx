import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import CustomerSidebar from "../components/CustomerSidebar";
import AppNavbar from "../components/AppNavbar";
import { apiFetch } from "../services/api";

/* Panel Notifikasi */
function NotifPanel({ onClose }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch("/customer/notifications")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setNotifs(d.notifications ?? d.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = notifs.filter(n => !n.is_read);
  const read   = notifs.filter(n =>  n.is_read);

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

  const NotifCard = ({ n }) => (
    <button onClick={() => markOneRead(n.id)}
      className={`w-full text-left px-6 py-4 hover:bg-[#F6F7FB]
        transition-colors flex items-start gap-4
        ${!n.is_read ? "bg-blue-50/40" : ""}`}>
      {/* Icon */}
      <div className={`mt-0.5 w-9 h-9 rounded-full flex-shrink-0
        flex items-center justify-center
        ${!n.is_read ? "bg-[#233B6E]" : "bg-gray-100"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-4 h-4 ${!n.is_read ? "text-white" : "text-gray-400"}`}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      {/* Konten */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-semibold
            ${!n.is_read ? "text-[#233B6E]" : "text-gray-500"}`}>
            {n.title}
          </p>
          {!n.is_read && (
            <span className="w-2 h-2 rounded-full bg-[#233B6E] flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className={`text-sm mt-1 leading-relaxed
          ${!n.is_read ? "text-gray-600" : "text-gray-400"}`}>
          {n.message}
        </p>
      </div>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-white text-gray-500
              hover:text-[#233B6E] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#233B6E]">Notifikasi</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unread.length > 0 ? `${unread.length} belum dibaca` : "Semua sudah dibaca"}
            </p>
          </div>
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#233B6E]
              bg-white border border-[#233B6E]/20 hover:bg-[#EEF0F8]
              px-3 py-2 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-3.5 h-3.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tandai semua dibaca
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
          flex items-center justify-center gap-2 py-20 text-gray-400 text-sm">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Memuat notifikasi...
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
          flex flex-col items-center justify-center gap-3 py-24 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="w-14 h-14 text-gray-200">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p className="text-sm font-medium text-gray-400">Tidak ada notifikasi</p>
          <p className="text-xs text-gray-300">Notifikasi terbaru akan muncul di sini</p>
        </div>
      ) : (
        <>
          {/* ── Belum Dibaca ── */}
          {unread.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-[#233B6E]" />
              {/* Label grup */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                <span className="text-xs font-bold text-[#233B6E] uppercase tracking-wider">
                  Belum Dibaca
                </span>
                <span className="bg-[#233B6E] text-white text-[10px] font-bold
                  px-1.5 py-0.5 rounded-full">
                  {unread.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {unread.map(n => <NotifCard key={n.id} n={n} />)}
              </div>
            </div>
          )}

          {/* ── Sudah Dibaca ── */}
          {read.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-gray-200" />
              {/* Label grup */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Sudah Dibaca
                </span>
                <span className="bg-gray-100 text-gray-400 text-[10px] font-bold
                  px-1.5 py-0.5 rounded-full">
                  {read.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {read.map(n => <NotifCard key={n.id} n={n} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Layout */
export default function CustomerLayout() {
  const [sidebarOpen,   setSidebarOpen]   = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  const [notifExpanded, setNotifExpanded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let wasDesktop = window.innerWidth >= 1024;
    const onResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop !== wasDesktop) {
        setSidebarOpen(isDesktop);
        wasDesktop = isDesktop;
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#F0F2F8] overflow-hidden">
      <CustomerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppNavbar
          onMenuClick={() => setSidebarOpen(p => !p)}
          onNotifExpand={() => setNotifExpanded(true)}
        />
        <main className="flex-1 overflow-y-auto p-5">
          {notifExpanded
            ? <NotifPanel onClose={() => setNotifExpanded(false)} />
            : <Outlet />
          }
        </main>
      </div>
    </div>
  );
}