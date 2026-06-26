import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { addToCart, removeFromCart, isInCart } from "../../utils/cart";
import logo from "../../assets/logo.png";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n ?? 0);

/* ── Detail modal ── */
function DetailModal({ service, onClose, onCartChange }) {
  if (!service) return null;
  const [inCart, setInCart] = useState(isInCart(service.id));

  const handleCart = () => {
    if (inCart) { removeFromCart(service.id); setInCart(false); }
    else        { addToCart(service);          setInCart(true);  }
    window.dispatchEvent(new Event("cart-updated"));
    onCartChange?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg
        max-h-[85vh] overflow-y-auto">
        <div className="h-1.5 bg-[#233B6E] rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#233B6E] leading-snug">
                {service.test_name}
              </h2>
              <p className="text-xs text-[#415F9D] mt-0.5">{service.unit_lab}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="space-y-2.5 text-sm mb-5">
            {[
              { label: "Target",          val: service.target },
              { label: "Metode",          val: service.method },
              { label: "Tipe Hasil",      val: service.result_type },
              { label: "Acuan Pengujian", val: service.test_reference },
              { label: "Durasi",          val: service.duration },
              { label: "Deskripsi",       val: service.description },
            ].filter(r => r.val).map(row => (
              <div key={row.label} className="flex gap-3">
                <span className="text-gray-400 w-36 flex-shrink-0 text-xs pt-0.5">
                  {row.label}
                </span>
                <span className="text-gray-800 flex-1">{row.val}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Harga</p>
              <p className="text-xl font-extrabold text-[#233B6E]">
                {rupiah(service.price)}
              </p>
            </div>
            <button onClick={handleCart}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5
                rounded-xl transition-all
                ${inCart
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-[#233B6E] text-white hover:bg-[#1a2d56]"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                {inCart
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>
                }
              </svg>
              {inCart ? "Hapus dari Keranjang" : "Tambah ke Keranjang"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Service card ── */
function ServiceCard({ service, onSelect, onCartChange }) {
  const [inCart, setInCart] = useState(isInCart(service.id));

  const handleCart = (e) => {
    e.stopPropagation();
    if (inCart) { removeFromCart(service.id); setInCart(false); }
    else        { addToCart(service);          setInCart(true);  }
    window.dispatchEvent(new Event("cart-updated"));
    onCartChange?.();
  };

  return (
    <div onClick={() => onSelect(service)}
      className="bg-white rounded-xl border-2 border-[#233B6E]/20
        hover:border-[#233B6E]/60 hover:shadow-md transition-all
        cursor-pointer overflow-hidden group">
      <div className="w-full h-20 bg-[#EEF0F8] flex items-center justify-center
        group-hover:bg-[#233B6E]/10 transition-colors p-2">
        <img src={logo} alt="BVET"
          className="h-12 w-auto object-contain opacity-50
            group-hover:opacity-80 transition-opacity" />
      </div>
      <div className="p-2">
        <p className="text-[11px] font-bold text-[#233B6E] leading-snug
          line-clamp-2 min-h-[2.5rem]">
          {service.test_name}
        </p>
        <p className="text-[11px] font-semibold text-[#415F9D] mt-1">
          {rupiah(service.price)}
        </p>
        <button onClick={handleCart}
          className={`mt-1.5 w-full flex items-center justify-center gap-1
            py-1.5 rounded-lg text-[10px] font-bold transition-all
            ${inCart
              ? "bg-red-50 text-red-500 border border-red-200"
              : "bg-[#233B6E] text-white hover:bg-[#1a2d56]"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="w-3 h-3">
            {inCart
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>
            }
          </svg>
          {inCart ? "Hapus" : "Keranjang"}
        </button>
      </div>
    </div>
  );
}

/* ── Unit Lab card ── */
function UnitCard({ unit, count, onClick }) {
  return (
    <div onClick={onClick}
      className="flex-shrink-0 w-36 rounded-xl overflow-hidden cursor-pointer
        border-2 border-[#233B6E]/20 hover:border-[#233B6E] hover:shadow-lg
        transition-all duration-200 group select-none">
      {/* Area gambar — diisi penuh dengan warna + logo centered */}
      <div className="w-full h-28 bg-[#EEF0F8] flex items-center justify-center
        group-hover:bg-[#233B6E]/10 transition-colors">
        <img src={logo} alt={unit}
          className="w-20 h-20 object-contain opacity-50
            group-hover:opacity-80 transition-opacity" />
      </div>
      {/* Label */}
      <div className="bg-white px-3 py-2.5 flex items-center justify-between gap-1
        group-hover:bg-[#EEF0F8] transition-colors">
        <span className="text-xs font-bold text-[#233B6E] leading-tight flex-1 min-w-0">
          {unit}
        </span>
        <div className="w-5 h-5 rounded-full bg-[#233B6E] flex items-center
          justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function CustomerKatalogPengujian() {
  const navigate              = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(null);
  const [, forceUpdate]         = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/customer/test-services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setError("Gagal memuat katalog pengujian.");
    } finally {
      setLoading(false);
    }
  };

  // Daftar unit lab unik
  const units = useMemo(() =>
    [...new Set(services.map(s => s.unit_lab).filter(Boolean))],
    [services]
  );

  // Hitung jumlah per unit
  const unitCount = useMemo(() => {
    const map = {};
    services.forEach(s => {
      if (s.unit_lab) map[s.unit_lab] = (map[s.unit_lab] ?? 0) + 1;
    });
    return map;
  }, [services]);

  // Filter katalog bawah hanya by search (tidak ikut unit)
  const filteredServices = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return services;
    return services.filter(s =>
      s.test_name?.toLowerCase().includes(q) ||
      s.unit_lab?.toLowerCase().includes(q) ||
      s.target?.toLowerCase().includes(q) ||
      s.method?.toLowerCase().includes(q)
    );
  }, [services, search]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Katalog Pengujian</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* ── SECTION 1: Laboratorium — scroll horizontal ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
        overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-5">
          <p className="text-sm font-bold text-[#233B6E] mb-4">Laboratorium</p>
          {loading ? (
            <div className="flex gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex-shrink-0 w-36 h-40 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : units.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada data laboratorium.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1
              scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {units.map(unit => (
                <UnitCard
                  key={unit}
                  unit={unit}
                  count={unitCount[unit] ?? 0}
                  onClick={() =>
                    navigate("/customer/katalog-pengujian/lab/" +
                      encodeURIComponent(unit))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Katalog Jenis Uji Sampel ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
        overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-sm font-bold text-[#233B6E]">
              Katalog Jenis Uji Sampel
            </p>
            {/* Search */}
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2
                  text-gray-400">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari"
                className="w-44 border border-gray-200 rounded-xl pl-9 pr-3
                  py-2 text-sm outline-none bg-[#F6F7FB]
                  focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]" />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5
              xl:grid-cols-6 gap-3">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              {search ? "Tidak ada hasil pencarian." : "Belum ada katalog pengujian."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5
              xl:grid-cols-6 gap-3">
              {filteredServices.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onSelect={setSelected}
                  onCartChange={() => forceUpdate(n => n + 1)}
                />
              ))}
            </div>
          )}

          {!loading && filteredServices.length > 0 && (
            <p className="text-xs text-gray-400 mt-4 text-right">
              {filteredServices.length} pengujian tersedia
            </p>
          )}
        </div>
      </div>

      <DetailModal
        service={selected}
        onClose={() => setSelected(null)}
        onCartChange={() => forceUpdate(n => n + 1)}
      />
    </div>
  );
}