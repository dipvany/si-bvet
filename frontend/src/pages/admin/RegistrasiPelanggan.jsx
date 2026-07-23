import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUnverifiedCustomers, verifyUser, rejectUser } from "../../services/adminServices";
import StatusBadge from "../../components/StatusBadge";
​
const getDocUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api").replace(/\/$/, "");
  const origin = apiBase.replace(/\/api\/?$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
​
  if (clean.startsWith("/api/")) return `${origin}${clean}`;
  return `${apiBase}${clean}`;
};
​
const PER_PAGE = 10;
​
const FILTER_OPTIONS = [
  { value: "all",      label: "Semua" },
  { value: "pending",  label: "Belum Verifikasi" },
  { value: "approved", label: "Sudah Verifikasi" },
  { value: "rejected", label: "Ditolak" },
];
​
function getStatusKey(customer) {
  if (customer._localRejected) return "rejected";
  if (customer._localVerified || customer.is_verified) return "approved";
  return "pending";
}
​
function PaginationBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs
        font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "bg-[#233B6E] text-white border-[#233B6E]"
          : "border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
      {children}
    </button>
  );
}
​
export default function RegistrasiPelanggan() {
  const navigate = useNavigate();
​
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [filter, setFilter]             = useState("all");
  const [page, setPage]                 = useState(1);
  const [sort, setSort]                 = useState("terbaru");
  const [actionStatus, setActionStatus] = useState({});
  const [actionMsg, setActionMsg]       = useState({});
​
  useEffect(() => { fetchData(); }, []);
​
  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await getUnverifiedCustomers();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      setAllCustomers(json.customers ?? json.data ?? []);
    } catch (err) {
      setError(err.message ?? "Gagal memuat data registrasi.");
    } finally {
      setLoading(false);
    }
  };
​
  const handleVerify = async (customer) => {
    setActionStatus(p => ({ ...p, [customer.id]: "loading" }));
    setActionMsg(p => ({ ...p, [customer.id]: "" }));
    try {
      const res  = await verifyUser(customer.id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memverifikasi.");
      setAllCustomers(prev =>
        prev.map(c => c.id === customer.id
          ? { ...c, _localVerified: true, _localRejected: false } : c)
      );
      setActionStatus(p => ({ ...p, [customer.id]: "verified" }));
      setActionMsg(p => ({ ...p, [customer.id]: "Berhasil diverifikasi" }));
    } catch (err) {
      setActionStatus(p => ({ ...p, [customer.id]: "error" }));
      setActionMsg(p => ({ ...p, [customer.id]: err.message }));
    }
  };
​
  const handleReject = async (customer) => {
    setActionStatus(p => ({ ...p, [customer.id]: "loading" }));
    setActionMsg(p => ({ ...p, [customer.id]: "" }));
    try {
      const res  = await rejectUser(customer.id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menolak.");
      setAllCustomers(prev =>
        prev.map(c => c.id === customer.id
          ? { ...c, _localRejected: true, _localVerified: false } : c)
      );
      setActionStatus(p => ({ ...p, [customer.id]: "rejected" }));
      setActionMsg(p => ({ ...p, [customer.id]: "Akun ditolak" }));
    } catch (err) {
      setActionStatus(p => ({ ...p, [customer.id]: "error" }));
      setActionMsg(p => ({ ...p, [customer.id]: err.message }));
    }
  };
​
  const filtered = useMemo(() => {
    const base = allCustomers.filter(c => {
      const status = getStatusKey(c);
      const matchFilter = filter === "all" || status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.fullname?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.institution?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
    return [...base].sort((a, b) => {
      if (sort === "az") return (a.fullname ?? "").localeCompare(b.fullname ?? "");
      if (sort === "za") return (b.fullname ?? "").localeCompare(a.fullname ?? "");
      if (sort === "terlama") return (a.id ?? 0) - (b.id ?? 0);
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }, [allCustomers, filter, search, sort]);
​
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
​
  const counts = useMemo(() => ({
    all:      allCustomers.length,
    pending:  allCustomers.filter(c => getStatusKey(c) === "pending").length,
    approved: allCustomers.filter(c => getStatusKey(c) === "approved").length,
    rejected: allCustomers.filter(c => getStatusKey(c) === "rejected").length,
  }), [allCustomers]);
​
  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-[#233B6E]">Daftar Akun Registrasi</h1>
          <button onClick={fetchData}
            className="flex items-center gap-2 text-xs font-semibold text-[#233B6E]
              bg-[#EEF0F8] hover:bg-[#dde0f0] px-3 py-2 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
​
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm
            rounded-xl px-4 py-3 flex justify-between items-center">
            {error}
            <button onClick={fetchData}
              className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
          </div>
        )}
​
        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => { setFilter(opt.value); setPage(1); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs
                font-semibold border transition-all
                ${filter === opt.value
                  ? "bg-[#233B6E] text-white border-[#233B6E] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#233B6E] hover:text-[#233B6E]"}`}>
              {opt.label}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full
                text-[10px] font-bold
                ${filter === opt.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>
​
        {/* Tabel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
​
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari nama atau email pelanggan..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]
                  bg-[#F6F7FB]" />
            </div>
​
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Status:</span>
              <div className="relative">
                <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
                  className="appearance-none border border-gray-200 rounded-xl text-sm font-medium
                    text-gray-700 bg-white pl-3 pr-7 py-2 outline-none cursor-pointer
                    focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                  <option value="all">Semua Status</option>
                  <option value="pending">Belum Verifikasi</option>
                  <option value="approved">Sudah Verifikasi</option>
                  <option value="rejected">Ditolak</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2
                    text-gray-400 pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
​
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Urutkan:</span>
              <div className="relative">
                <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
                  className="appearance-none border border-gray-200 rounded-xl text-sm font-medium
                    text-gray-700 bg-white pl-3 pr-7 py-2 outline-none cursor-pointer
                    focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                  <option value="terbaru">Terbaru</option>
                  <option value="terlama">Terlama</option>
                  <option value="az">A–Z</option>
                  <option value="za">Z–A</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2
                    text-gray-400 pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
​
          {/* Tabel */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["No.", "Nama", "Email", "Institusi", "Dokumen", "Status", "Aksi"].map(h => (
                    <th key={h} className={`px-4 py-3 ${h === "No." ? "text-center" : "text-left"} text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-14 text-center">
                    <span className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Memuat data...
                    </span>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7}
                    className="px-4 py-14 text-center text-gray-400 text-sm">
                    {search ? "Tidak ada hasil pencarian."
                      : filter !== "all"
                        ? `Tidak ada pelanggan dengan status "${FILTER_OPTIONS.find(o => o.value === filter)?.label}".`
                        : "Belum ada data registrasi."}
                  </td></tr>
                ) : paginated.map((c, i) => {
                  const status    = getStatusKey(c);
                  const actSt     = actionStatus[c.id];
                  const actMsg    = actionMsg[c.id];
                  const isLoading = actSt === "loading";
​
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">
                        {(page - 1) * PER_PAGE + i + 1}.
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 min-w-[140px]">
                        {c.fullname}
                      </td>
                      <td className="px-4 py-3 text-gray-600 min-w-[160px]">{c.email}</td>
                      <td className="px-4 py-3 text-gray-500 min-w-[160px]">{c.institution ?? "-"}</td>
                      <td className="px-4 py-3">
                        {c.registration_doc ? (
                          <a href={getDocUrl(c.registration_doc)} target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#233B6E]
                              text-xs font-semibold hover:underline">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              className="w-3.5 h-3.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12
                                a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            Lihat
                          </a>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 min-w-[150px]">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {actMsg && (
                          <p className={`text-[11px] font-semibold mb-1
                            ${actSt === "error" ? "text-red-500"
                            : actSt === "verified" ? "text-green-600"
                            : "text-gray-500"}`}>
                            {actMsg}
                          </p>
                        )}
                        {status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleVerify(c)} disabled={isLoading}
                              className="flex items-center gap-1 text-xs font-semibold
                                text-green-700 bg-green-50 hover:bg-green-100
                                border border-green-200 px-2.5 py-1.5 rounded-lg
                                transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              {isLoading ? (
                                <svg className="animate-spin w-3.5 h-3.5"
                                  viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10"
                                    stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"/>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  className="w-3.5 h-3.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                              Verifikasi
                            </button>
                            <button onClick={() => handleReject(c)} disabled={isLoading}
                              className="flex items-center gap-1 text-xs font-semibold
                                text-red-600 bg-red-50 hover:bg-red-100
                                border border-red-200 px-2.5 py-1.5 rounded-lg
                                transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="w-3.5 h-3.5">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                              Tolak
                            </button>
                            <button onClick={() => navigate(
                              `/admin/registrasi-pelanggan/${c.id}`,
                              { state: { customer: c } })}
                              className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                className="w-3.5 h-3.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              Detail
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => navigate(
                            `/admin/registrasi-pelanggan/${c.id}`,
                            { state: { customer: c } })}
                            className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              className="w-3.5 h-3.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
​
          <div className="px-4 py-3 border-t border-gray-100 flex items-center
            justify-between flex-wrap gap-2">
            <span className="text-xs text-gray-400">
              {filtered.length} data · Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <PaginationBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-3 h-3">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                .map(n => (
                  <PaginationBtn key={n} active={n === page} onClick={() => setPage(n)}>
                    {n}
                  </PaginationBtn>
                ))}
              <PaginationBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-3 h-3">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </PaginationBtn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}