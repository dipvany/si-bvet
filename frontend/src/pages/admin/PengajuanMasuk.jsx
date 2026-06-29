import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminSubmissions } from "../../services/adminServices";

/**
 * PengajuanMasuk — daftar pengajuan uji sampel dari customer.
 * Admin bisa melihat, filter, dan klik detail untuk approve/reject.
 *
 * API: GET /admin/submissions?page=1&per_page=20
 * Response: { data: { data: [...], meta: { page, per_page, total, total_pages } } }
 */

/* ── Status config ───────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending_verification: { label: "Menunggu Verifikasi", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  awaiting_payment:     { label: "Menunggu Pembayaran", bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  in_process:           { label: "Sedang Diproses",     bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  processed:            { label: "Selesai Diproses",    bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  done:                 { label: "Selesai",             bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  rejected:             { label: "Ditolak",             bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500"    },
};

const ALL_STATUSES = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value, label: cfg.label,
}));

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

function PBtn({ children, active, disabled, onClick }) {
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

const PER_PAGE = 20;

export default function PengajuanMasuk() {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [meta,        setMeta]        = useState({ page: 1, total: 0, total_pages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { fetchData(page); }, [page]);

  const fetchData = async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res  = await getAdminSubmissions(`?page=${p}&per_page=${PER_PAGE}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      const inner = json.data ?? {};
      setSubmissions(inner.data ?? []);
      setMeta(inner.meta ?? { page: p, total: 0, total_pages: 1 });
    } catch (err) {
      setError(err.message ?? "Gagal memuat data pengajuan.");
    } finally {
      setLoading(false);
    }
  };

  // Filter client-side (search + status)
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter(s => {
      const matchStatus = filterStatus === "all" || s.process_status === filterStatus;
      const matchSearch = !q ||
        s.no_ticket?.toLowerCase().includes(q) ||
        s.type_service?.toLowerCase().includes(q) ||
        s.purpose_of_test?.toLowerCase().includes(q) ||
        String(s.user_id).includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, search, filterStatus]);

  // Hitung badge per status
  const countByStatus = useMemo(() => {
    const map = { all: submissions.length };
    submissions.forEach(s => {
      map[s.process_status] = (map[s.process_status] ?? 0) + 1;
    });
    return map;
  }, [submissions]);

  const fmt = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan Masuk</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Tinjauan dan verifikasi pengajuan uji sampel dari pelanggan
          </p>
        </div>
        <button onClick={() => fetchData(page)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#233B6E]
            bg-[#EEF0F8] hover:bg-[#dde0f0] px-3 py-2 rounded-lg transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
          rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => fetchData(page)}
            className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
        </div>
      )}

      {/* Filter status pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
            font-semibold border transition-all
            ${filterStatus === "all"
              ? "bg-[#233B6E] text-white border-[#233B6E]"
              : "bg-white text-gray-500 border-gray-200 hover:border-[#233B6E] hover:text-[#233B6E]"
            }`}>
          Semua
          <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full
            text-[10px] font-bold
            ${filterStatus === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            {countByStatus.all ?? 0}
          </span>
        </button>
        {ALL_STATUSES.map(s => (
          <button key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
              font-semibold border transition-all
              ${filterStatus === s.value
                ? "bg-[#233B6E] text-white border-[#233B6E]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#233B6E] hover:text-[#233B6E]"
              }`}>
            {s.label}
            {(countByStatus[s.value] ?? 0) > 0 && (
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full
                text-[10px] font-bold
                ${filterStatus === s.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {countByStatus[s.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between
          items-center gap-3 flex-wrap">
          <p className="text-xs text-gray-400">
            Total: <span className="font-bold text-[#233B6E]">{meta.total}</span> pengajuan
          </p>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari no. tiket, layanan, tujuan..."
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "No. Tiket", "User ID", "Jenis Layanan", "Tujuan Pengujian",
                  "Jml Sampel", "Status", "Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                    text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center">
                  <span className="flex items-center justify-center gap-2
                    text-gray-400 text-sm">
                    <Spinner />Memuat data...
                  </span>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center
                  text-gray-400 text-sm">
                  {search || filterStatus !== "all"
                    ? "Tidak ada hasil yang cocok."
                    : "Belum ada pengajuan masuk."}
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id}
                  className="hover:bg-[#F6F7FB] transition-colors cursor-pointer"
                  onClick={() => navigate(
                    `detail/${s.id}`,
                    { state: { submission: s } }
                  )}>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {(page - 1) * PER_PAGE + i + 1}.
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#233B6E] text-xs">
                      {s.no_ticket ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    #{s.user_id}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {s.type_service ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                    <span className="line-clamp-1">{s.purpose_of_test ?? "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center
                      w-7 h-7 rounded-full bg-[#EEF0F8] text-[#233B6E]
                      text-xs font-bold">
                      {s.samples_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.process_status} />
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(
                        `detail/${s.id}`,
                        { state: { submission: s } }
                      )}
                      className="inline-flex items-center gap-1.5 text-[#233B6E]
                        text-xs font-semibold hover:underline whitespace-nowrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="w-4 h-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination server-side */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center
          justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Halaman {meta.page} dari {meta.total_pages} · {meta.total} data
          </span>
          <div className="flex items-center gap-1">
            <PBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </PBtn>
            {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(meta.total_pages, page + 2))
              .map(n => (
                <PBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PBtn>
              ))}
            <PBtn disabled={page >= meta.total_pages} onClick={() => setPage(p => p + 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </PBtn>
          </div>
        </div>
      </div>
    </div>
  );
}