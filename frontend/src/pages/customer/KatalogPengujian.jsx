import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../services/api";

const PER_PAGE = 9;

/* ── Format harga ── */
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/* ── Badge result type ── */
function ResultBadge({ type }) {
  const color = type === "Kualitatif"
    ? "bg-blue-100 text-blue-700"
    : "bg-purple-100 text-purple-700";
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${color}`}>
      {type}
    </span>
  );
}

/* ── Modal detail ── */
function DetailModal({ service, onClose }) {
  if (!service) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg
        max-h-[85vh] overflow-y-auto">
        <div className="h-1.5 bg-[#233B6E] rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#233B6E] leading-snug">
                {service.test_name}
              </h2>
              <p className="text-xs text-[#415F9D] mt-0.5">{service.unit_lab}</p>
            </div>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {[
              { label: "Target",        val: service.target },
              { label: "Metode",        val: service.method },
              { label: "Jenis Hasil",   val: service.result_type },
              { label: "Referensi",     val: service.test_reference },
              { label: "Durasi",        val: service.duration },
              { label: "Sampel",        val: service.sample_reqmt },
              { label: "Deskripsi",     val: service.description },
            ].filter(r => r.val).map(row => (
              <div key={row.label} className="flex gap-3">
                <span className="text-gray-400 w-28 flex-shrink-0">{row.label}</span>
                <span className="text-gray-800 flex-1">{row.val}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Harga</p>
              <p className="text-xl font-extrabold text-[#233B6E]">
                {rupiah(service.price)}
              </p>
            </div>
            <ResultBadge type={service.result_type} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function KatalogPengujian() {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [unitFilter, setUnit]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [page, setPage]         = useState(1);

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

  // Daftar unit lab unik untuk filter
  const units = useMemo(() =>
    ["all", ...new Set(services.map(s => s.unit_lab).filter(Boolean))],
    [services]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter(s => {
      const matchSearch = !q ||
        s.test_name?.toLowerCase().includes(q) ||
        s.target?.toLowerCase().includes(q) ||
        s.method?.toLowerCase().includes(q) ||
        s.unit_lab?.toLowerCase().includes(q);
      const matchUnit = unitFilter === "all" || s.unit_lab === unitFilter;
      return matchSearch && matchUnit;
    });
  }, [services, search, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const handleUnit   = (e) => { setUnit(e.target.value); setPage(1); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#233B6E]">Katalog Pengujian</h1>
        <span className="text-sm text-gray-400">
          {filtered.length} layanan tersedia
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3 flex justify-between items-center">
          {error}
          <button onClick={fetchData}
            className="text-xs font-semibold hover:underline ml-4">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" className="w-4 h-4 absolute left-3
              top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={handleSearch}
            placeholder="Cari nama uji, target, metode..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5
              text-sm outline-none bg-white
              focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]" />
        </div>

        {/* Filter unit lab */}
        <div className="relative">
          <select value={unitFilter} onChange={handleUnit}
            className="appearance-none border border-gray-200 rounded-xl bg-white
              text-sm font-medium text-gray-700 pl-3 pr-8 py-2.5 outline-none
              focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] cursor-pointer">
            {units.map(u => (
              <option key={u} value={u}>
                {u === "all" ? "Semua Unit Lab" : u}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" className="w-3.5 h-3.5 absolute right-2.5
              top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Memuat katalog...
          </div>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center
          text-gray-400 text-sm">
          {search || unitFilter !== "all"
            ? "Tidak ada hasil pencarian."
            : "Belum ada katalog pengujian."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((s) => (
            <div key={s.id}
              onClick={() => setSelected(s)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm
                hover:shadow-md hover:-translate-y-1 transition-all duration-200
                cursor-pointer overflow-hidden group">
              <div className="h-1 bg-[#233B6E]" />
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#233B6E] text-sm leading-snug
                      group-hover:text-[#1a2d56] transition-colors line-clamp-2">
                      {s.test_name}
                    </h3>
                    <p className="text-[11px] text-[#415F9D] mt-0.5">{s.unit_lab}</p>
                  </div>
                  <ResultBadge type={s.result_type} />
                </div>

                {/* Info rows */}
                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  {s.target && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-14 flex-shrink-0">Target</span>
                      <span className="text-gray-700 truncate">{s.target}</span>
                    </div>
                  )}
                  {s.method && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-14 flex-shrink-0">Metode</span>
                      <span className="text-gray-700">{s.method}</span>
                    </div>
                  )}
                  {s.duration && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-14 flex-shrink-0">Durasi</span>
                      <span className="text-gray-700">{s.duration}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3
                  border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400">Harga</p>
                    <p className="text-sm font-extrabold text-[#233B6E]">
                      {rupiah(s.price)}
                    </p>
                  </div>
                  <span className="text-xs text-[#233B6E] font-semibold
                    group-hover:underline">
                    Lihat Detail →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            {[
              { label: "←", action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
              ...Array.from({ length: totalPages }, (_, i) => ({
                label: i + 1, action: () => setPage(i + 1), active: page === i + 1,
              })),
              { label: "→", action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} disabled={btn.disabled}
                className={`w-8 h-8 flex items-center justify-center rounded-lg
                  text-xs font-medium transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${btn.active
                    ? "bg-[#233B6E] text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal detail */}
      <DetailModal service={selected} onClose={() => setSelected(null)} />
    </div>
  );
}