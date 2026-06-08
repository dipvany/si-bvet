import { NavLink, useNavigate } from "react-router-dom";
import { clearAuth, getUser, getRoleLabel } from "../utils/auth";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  {
    to: "/admin/beranda",
    label: "Beranda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M3 9.75L12 3l9 6.75V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.75z"/>
        <path d="M9 22V12h6v10"/>
      </svg>
    ),
  },
  {
    to: "/admin/registrasi-pelanggan",
    label: "Registrasi Pelanggan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4"/>
        <path d="M16 11l2 2 4-4"/>
      </svg>
    ),
  },
  {
    to: "/admin/pengajuan-masuk",
    label: "Pengajuan Masuk",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    to: "/admin/proses-pengujian",
    label: "Proses Pengujian",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v4"/>
        <path d="M9 14h10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      </svg>
    ),
  },
  {
    to: "/admin/profil",
    label: "Profil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function AdminSidebar({ isOpen }) {
  const navigate = useNavigate();
  const user     = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <aside className={`
      flex-shrink-0 flex flex-col bg-[#1E3A5F] text-white shadow-sm
      transition-all duration-300 ease-in-out overflow-hidden
      ${isOpen ? "w-64" : "w-0"}
    `}>
      <div className="flex flex-col h-full w-64">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <img src={logo} alt="SI-BVET" className="h-9 w-auto object-contain flex-shrink-0" />
          <span className="font-bold text-white text-sm whitespace-nowrap">SI-BVET</span>
        </div>

        {/* Info user */}
        {user && (
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-[11px] text-white/45 uppercase tracking-widest mb-1">Masuk sebagai</p>
            <p className="text-sm font-semibold text-white truncate">{user.fullname}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase
              tracking-wider bg-white/15 text-white/75 rounded-full px-2.5 py-0.5">
              {getRoleLabel(user.role)}
            </span>
          </div>
        )}

        {/* Navigasi */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-150 group
                 ${isActive
                   ? "bg-white text-[#1E3A5F] shadow-sm"
                   : "text-white/65 hover:bg-white/10 hover:text-white"
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-[#1E3A5F]" : "text-white/50 group-hover:text-white transition-colors"}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Keluar */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-sm font-medium text-white/55 hover:bg-white/10 hover:text-white
              transition-all duration-150"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="whitespace-nowrap">Keluar</span>
          </button>
        </div>

      </div>
    </aside>
  );
}