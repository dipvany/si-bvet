import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { parseSubmissionList } from "../../utils/parseList";

const PER_PAGE = 10;

const STATUS_CONFIG = {
  pending:               { label: "Menunggu",                       bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400"    },
  pending_verification:  { label: "Menunggu Verifikasi",            bg: "bg-yellow-100",  text: "text-yellow-700",  dot: "bg-yellow-500"  },
  reviewing:             { label: "Kaji Ulang",                     bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500"  },
  approved:              { label: "Disetujui",                      bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500"  },
  awaiting_payment:      { label: "Menunggu Pembayaran",            bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  awaiting_verification: { label: "Menunggu Verifikasi Pembayaran", bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-500"    },
  payment_rejected:      { label: "Pembayaran Ditolak",             bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500"     },
  paid:                  { label: "Lunas",                          bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  in_process:            { label: "Sedang Diproses",                bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500"  },
  processed:             { label: "Sedang Proses Pengujian",        bg: "bg-indigo-100",  text: "text-indigo-700",  dot: "bg-indigo-500"  },
  done:                  { label: "Selesai",                        bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500"   },
  completed:             { label: "Selesai",                        bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500"   },
  rejected:              { label: "Ditolak",                        bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500"     },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function PBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs
        font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active ? "bg-[#233B6E] text-white border-[#233B6E]"
                 : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"}`}>
      {children}
    </button>
  );
}

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID",
    { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function PengajuanSaya() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/customer/submissions/my");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat data pengajuan.");
      setSubmissions(parseSubmissionList(data));
    } catch (err) {
      setError(err.message ?? "Gagal memuat data pengajuan.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter(s =>
      !q ||
      s.no_ticket?.toLowerCase().includes(q) ||
      s.no_epi?.toLowerCase().includes(q) ||
      s.no_registration?.toLowerCase().includes(q) ||
      s.type_service?.toLowerCase().includes(q)
    );
  }, [submissions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Riwayat Pengajuan Saya</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
          rounded-xl px-4 py-3 flex justify-between items-center">
          {error}
          <button onClick={fetchData}
            className="text-xs font-semibold hover:underline ml-4">
            Coba Lagi
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center
          justify-between gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari No. EPI atau layanan..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2
                text-sm outline-none bg-[#F6F7FB]
                focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]" />
          </div>
          <button onClick={() => navigate("/customer/pengajuan-uji-sampel")}
            className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajukan Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "No. Tiket", "Tanggal Pengajuan", "Nomor EPI", "Status", "Detail"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                    text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <span className="flex items-center justify-center gap-2
                    text-gray-400 text-sm">
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
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search ? "Tidak ada hasil pencarian."
                          : "Belum ada pengajuan. Klik 'Ajukan Baru' untuk memulai."}
                </td></tr>
              ) : paginated.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {(page - 1) * PER_PAGE + i + 1}.
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#233B6E] text-xs">
                      {s.no_ticket ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold
                    text-[#233B6E] whitespace-nowrap">
                    {s.no_epi ?? s.no_registration ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.process_status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(
                        `/customer/pengajuan-saya/${s.id}`,
                        { state: { submission: s } }
                      )}
                      className="inline-flex items-center gap-1.5 text-[#233B6E]
                        text-xs font-semibold hover:underline">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="w-4 h-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 border-t border-gray-100 flex items-center
          justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Halaman ke {page} dari {totalPages} halaman
          </span>
          <div className="flex items-center gap-1">
            <PBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </PBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
              .map(n => (
                <PBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PBtn>
              ))}
            <PBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
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