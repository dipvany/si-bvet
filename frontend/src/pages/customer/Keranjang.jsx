import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCart, removeFromCart } from "../../utils/cart";
import logo from "../../assets/logo.png";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n ?? 0);

export default function Keranjang() {
  const navigate           = useNavigate();
  const [cart, setCart]    = useState(getCart());

  const refresh = () => {
    setCart(getCart());
    window.dispatchEvent(new Event("cart-updated"));
  };

  const handleRemove = (id) => {
    removeFromCart(id);
    refresh();
  };

  const total = cart.reduce((sum, s) => sum + (s.price ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#233B6E]">Keranjang Pengujian</h1>
        <span className="text-sm text-gray-400">{cart.length} item</span>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
          p-12 text-center">
          <div className="w-16 h-16 bg-[#EEF0F8] rounded-full flex items-center
            justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#233B6E" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 opacity-40">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0
                2-1.61L23 6H6"/>
            </svg>
          </div>
          <p className="text-gray-400 text-sm mb-6">Keranjang Anda masih kosong.</p>
          <button onClick={() => navigate("/customer/katalog-pengujian")}
            className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
              px-6 py-2.5 rounded-xl transition-all text-sm">
            Lihat Katalog Pengujian
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
            overflow-hidden">
            <div className="h-1 bg-[#233B6E]" />
            <div className="divide-y divide-gray-50">
              {cart.map((s) => (
                <div key={s.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50
                    transition-colors">
                  <div className="w-14 h-14 bg-[#EEF0F8] rounded-xl flex items-center
                    justify-center flex-shrink-0 p-2">
                    <img src={logo} alt="BVET"
                      className="h-10 w-auto object-contain opacity-70" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#233B6E] text-sm leading-snug
                      truncate">
                      {s.test_name}
                    </p>
                    <p className="text-xs text-[#415F9D] mt-0.5">{s.unit_lab}</p>
                    {s.duration && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Durasi: {s.duration}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-sm font-extrabold text-[#233B6E]">
                      {rupiah(s.price)}
                    </span>
                    <button onClick={() => handleRemove(s.id)}
                      className="text-xs text-red-400 hover:text-red-600
                        transition-colors font-medium">
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50
              flex items-center justify-between">
              <span className="text-sm font-bold text-[#233B6E]">Total Estimasi</span>
              <span className="text-lg font-extrabold text-[#233B6E]">
                {rupiah(total)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button onClick={() => navigate("/customer/katalog-pengujian")}
              className="flex items-center gap-2 text-sm font-semibold text-[#233B6E]
                hover:underline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Tambah Pengujian Lain
            </button>
            <button onClick={() => navigate("/customer/pengajuan-uji-sampel",
              { state: { cart } })}
              className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-8 py-3 rounded-xl
                transition-all shadow-sm">
              Ajukan Pengujian
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}