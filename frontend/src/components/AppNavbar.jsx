import { Link } from "react-router-dom";
import { getUser } from "../utils/auth";

/**
 * AppNavbar — navbar atas yang dipakai semua role.
 * Props:
 *   onMenuClick : fn — buka sidebar mobile
 */
export default function AppNavbar({ onMenuClick }) {
  const user     = getUser();

  // Inisial dari nama user (maks 2 huruf)
  const initials = (user?.fullname ?? "U")
    .split(" ")
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");

  // Path profil sesuai role
  const profilePath = {
    customer:   "/customer/profil",
    admin:      "/admin/profil",
    superadmin: "/superadmin/profil",
  }[user?.role ?? ""] ?? "/";

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4
      flex items-center justify-between flex-shrink-0 shadow-sm z-10">

      {/* Kiri: hamburger + judul */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="p-1.5 rounded-lg text-gray-500
            hover:bg-gray-100 transition-colors" aria-label="Buka menu">
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

      {/* Kanan: avatar profil */}
      <div className="flex items-center gap-3">

        {/* Avatar / inisial — klik ke halaman profil */}
        <Link to={profilePath}
          className="flex items-center gap-2
            hover:opacity-80 transition-opacity">
          {user?.photo_url ? (
            <img src={user.photo_url} alt={user.fullname}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#233B6E]/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#233B6E] text-white text-xs
              font-bold flex items-center justify-center ring-2 ring-[#233B6E]/20">
              {initials}
            </div>
          )}
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-xs font-semibold text-[#233B6E] truncate max-w-[120px]">
              {user?.fullname ?? "Pengguna"}
            </span>
            <span className="text-[10px] text-gray-400 capitalize">{user?.role ?? ""}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}