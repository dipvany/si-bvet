import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getUser } from "../utils/auth";
import { getCartCount } from "../utils/cart";

export default function AppNavbar({ onMenuClick }) {
  const user       = getUser();
  const isCustomer = user?.role === "customer";

  const [cartCount, setCartCount] = useState(getCartCount());

  // Update cart count saat storage berubah
  useEffect(() => {
    const sync = () => setCartCount(getCartCount());
    window.addEventListener("storage", sync);
    window.addEventListener("cart-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cart-updated", sync);
    };
  }, []);

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

      {/* Kanan: keranjang (customer) + avatar */}
      <div className="flex items-center gap-2">

        {/* Icon keranjang — hanya customer */}
        {isCustomer && (
          <Link to="/customer/keranjang"
            className="relative p-2 rounded-lg text-gray-500
              hover:bg-gray-100 hover:text-[#233B6E] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0
                2-1.61L23 6H6"/>
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

        {/* Avatar / inisial */}
        <Link to={profilePath}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity
            pl-2 border-l border-gray-200">
          {user?.photo_url ? (
            <img src={user.photo_url} alt={user.fullname}
              className="w-8 h-8 rounded-full object-cover
                ring-2 ring-[#233B6E]/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#233B6E] text-white
              text-xs font-bold flex items-center justify-center
              ring-2 ring-[#233B6E]/20">
              {initials}
            </div>
          )}
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-xs font-semibold text-[#233B6E]
              truncate max-w-[120px]">
              {user?.fullname ?? "Pengguna"}
            </span>
            <span className="text-[10px] text-gray-400 capitalize">
              {user?.role ?? ""}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}