import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../services/api";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n ?? 0);

/* ── Detail modal ── */
function DetailModal({ service, onClose }) {
  if (!service) return null;
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
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="space-y-2.5 text-sm">
            {[
              { label: "Target",              val: service.target },
              { label: "Metode",              val: service.method },
              { label: "Tipe Hasil",          val: service.result_type },
              { label: "Acuan Pengujian",     val: service.test_reference },
              { label: "Durasi",              val: service.duration },
              { label: "Persyaratan Sampel",  val: service.sample_reqmt },
              { label: "Deskripsi",           val: service.description },
            ].filter(r => r.val).map(row => (
              <div key={row.label} className="flex gap-3">
                <span className="text-gray-400 w-36 flex-shrink-0 text-xs pt-0.5">
                  {row.label}
                </span>
                <span className="text-gray-800 flex-1 text-sm">{row.val}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Harga</p>
              <p className="text-xl font-extrabold text-[#233B6E]">{rupiah(service.price)}</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5
              py-1 rounded-full
              ${service.result_type === "Kualitatif"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"}`}>
              {service.result_type}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Service card ── */
function ServiceCard({ service, onClick }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm
        hover:shadow-md hover:-translate-y-1 transition-all duration-200
        cursor-pointer overflow-hidden group p-3 flex flex-col gap-2">
      {/* Gambar placeholder */}
      <div className="w-full aspect-square rounded-lg bg-[#EEF0F8] flex items-center
        justify-center group-hover:bg-[#233B6E]/10 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="#233B6E" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 opacity-30">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4M9 14h6"/>
        </svg>
      </div>
      {/* Info */}
      <div>
        <p className="text-xs font-bold text-[#233B6E] leading-snug line-clamp-2">
          {service.test_name}
        </p>
        <p className="text-[11px] font-semibold text-[#415F9D] mt-0.5">
          {rupiah(service.price)}
        </p>
      </div>
      {/* Arrow */}
      <div className="flex justify-end">
        <div className="w-6 h-6 rounded-full bg-[#233B6E] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Unit lab card ── */
function UnitLabCard({ unit, count, active, onClick }) {
  const ICONS = {
    Virologi:     <path d="M12 2a10 10 0 1 0 10 10M12 2v10l4.5 4.5" strokeLinejoin="round"/>,
    Bakteriologi: <><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/></>,
    Parasitologi: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    Patologi:     <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    Kesmavet:     <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
  };

  return (
    <div onClick={onClick}
      className={`rounded-2xl p-4 cursor-pointer transition-all duration-200
        border-2 flex flex-col items-center gap-2 text-center
        ${active
          ? "bg-[#233B6E] border-[#233B6E] text-white shadow-lg"
          : "bg-white border-gray-200 text-[#233B6E] hover:border-[#233B6E] hover:shadow-md"
        }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center
        ${active ? "bg-white/15" : "bg-[#EEF0F8]"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          {ICONS[unit] ?? <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>}
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold leading-tight">{unit}</p>
        <p className={`text-[11px] mt-0.5 ${active ? "text-white/70" : "text-gray-400"}`}>
          {count} pengujian
        </p>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function CustomerKatalogPengujian() {
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);
  const [search, setSearch]       = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/customer/test-services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setError("Gagal memuat katalog.");
    } finally {
      setLoading(false);
    }
  };

  // Grup per unit lab
  const unitGroups = useMemo(() => {
    const map = {};
    services.forEach(s => {
      const u = s.unit_lab ?? "Lainnya";
      if (!map[u]) map[u] = [];
      map[u].push(s);
    });
    return map;
  }, [services]);

  const units = Object.keys(unitGroups);

  // Filtered by active unit + search
  const filteredServices = useMemo(() => {
    const base = activeUnit ? (unitGroups[activeUnit] ?? []) : services;
    const q    = search.toLowerCase();
    return base.filter(s =>
      !q ||
      s.test_name?.toLowerCase().includes(q) ||
      s.target?.toLowerCase().includes(q)
    );
  }, [activeUnit, unitGroups, services, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Memuat katalog...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
        overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="px-5 py-4 flex items-center gap-2">
          {activeUnit && (
            <button onClick={() => { setActiveUnit(null); setSearch(""); }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-[#233B6E]">
            {activeUnit ?? "Katalog Jenis Uji Sampel"}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Unit Lab grid — tampil jika belum pilih unit */}
      {!activeUnit && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Laboratorium
          </p>
          {units.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              Belum ada katalog pengujian.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {units.map(u => (
                <UnitLabCard
                  key={u}
                  unit={u}
                  count={unitGroups[u].length}
                  active={activeUnit === u}
                  onClick={() => setActiveUnit(u)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Service grid — tampil setelah pilih unit */}
      {activeUnit && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          {/* Search */}
          <div className="flex justify-between items-center gap-3 mb-4">
            <p className="text-xs text-gray-400">
              {filteredServices.length} pengujian tersedia
            </p>
            <div className="relative w-48">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2
                  text-sm outline-none bg-[#F6F7FB]
                  focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]" />
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              {search ? "Tidak ada hasil." : "Belum ada pengujian di unit ini."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredServices.map(s => (
                <ServiceCard key={s.id} service={s} onClick={() => setSelected(s)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      <DetailModal service={selected} onClose={() => setSelected(null)} />
    </div>
  );
}