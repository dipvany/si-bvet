import { useState, useEffect, useMemo } from "react";
import { getAllFeedbacks } from "../../services/adminServices";

/**
 * PenilaianPengguna — halaman laporan penilaian kepuasan untuk admin
 *
 * API: GET /admin/feedbacks
 *   response: { feedbacks: [{ id, user_id, rating, comments, created_at }] }
 *
 * Fitur:
 *   - Ringkasan total rating (chart bar distribusi + angka rata-rata besar)
 *   - Tabel daftar semua feedback
 *   - Filter berdasarkan rating
 *   - Search berdasarkan komentar
 */

const RATING_COLORS = {
  1: { bar: "bg-red-400",    text: "text-red-600",    bg: "bg-red-50",    label: "Sangat Buruk" },
  2: { bar: "bg-orange-400", text: "text-orange-600", bg: "bg-orange-50", label: "Buruk" },
  3: { bar: "bg-yellow-400", text: "text-yellow-600", bg: "bg-yellow-50", label: "Cukup" },
  4: { bar: "bg-blue-400",   text: "text-blue-600",   bg: "bg-blue-50",   label: "Baik" },
  5: { bar: "bg-green-400",  text: "text-green-600",  bg: "bg-green-50",  label: "Sangat Baik" },
};

function StarDisplay({ value, size = "sm" }) {
  const sz = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} viewBox="0 0 24 24"
          fill={value >= s ? "#F5C400" : "none"}
          stroke={value >= s ? "#F5C400" : "#D1D5DB"}
          strokeWidth="1.5" className={sz}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

/* ── Gauge/donut untuk rata-rata ─────────────────────────────── */
function AverageGauge({ avg, total }) {
  const size = 140;
  const r    = 54;
  const cx   = size / 2;
  const circ = 2 * Math.PI * r;
  const pct  = avg / 5;
  const dash = pct * circ * 0.75; // pakai 75% lingkaran
  const gap  = circ - dash;

  // Warna berdasar nilai
  const color = avg >= 4.5 ? "#22C55E"
    : avg >= 3.5 ? "#3B82F6"
    : avg >= 2.5 ? "#F59E0B"
    : avg >= 1.5 ? "#F97316"
    : "#EF4444";

  const label = avg >= 4.5 ? "Sangat Baik"
    : avg >= 3.5 ? "Baik"
    : avg >= 2.5 ? "Cukup"
    : avg >= 1.5 ? "Buruk"
    : "Sangat Buruk";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size * 0.8} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="#F3F4F6" strokeWidth="12"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        {/* Teks angka */}
        <text x={cx} y={cx - 4} textAnchor="middle"
          fontSize="26" fontWeight="800" fill={color} fontFamily="inherit">
          {avg.toFixed(1)}
        </text>
        <text x={cx} y={cx + 16} textAnchor="middle"
          fontSize="11" fill="#9CA3AF" fontFamily="inherit">
          dari 5.0
        </text>
      </svg>
      <div className="text-center -mt-6">
        <p className="text-sm font-bold" style={{ color }}>{label}</p>
        <p className="text-xs text-gray-400">{total} total penilaian</p>
      </div>
    </div>
  );
}

/* ── Bar chart distribusi rating ──────────────────────────────── */
function RatingDistribution({ feedbacks }) {
  const counts = [1, 2, 3, 4, 5].map(r => ({
    rating: r,
    count: feedbacks.filter(f => f.rating === r).length,
    ...RATING_COLORS[r],
  }));
  const maxCount = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="space-y-2">
      {counts.reverse().map(c => (
        <div key={c.rating} className="flex items-center gap-3">
          {/* Bintang label */}
          <div className="flex items-center gap-1 w-24 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 w-3">{c.rating}</span>
            <svg viewBox="0 0 24 24" fill="#F5C400" stroke="#F5C400"
              strokeWidth="1.5" className="w-3.5 h-3.5 flex-shrink-0">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-[10px] text-gray-400 truncate">{c.label}</span>
          </div>
          {/* Bar */}
          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${c.bar} rounded-full transition-all duration-700`}
              style={{ width: `${(c.count / maxCount) * 100}%` }}
            />
          </div>
          {/* Count */}
          <span className="text-xs font-bold text-gray-600 w-6 text-right flex-shrink-0">
            {c.count}
          </span>
        </div>
      ))}
    </div>
  );
}

const PER_PAGE = 10;

export default function PenilaianPengguna() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await getAllFeedbacks();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat data penilaian.");
      setFeedbacks(json.feedbacks ?? []);
    } catch (err) {
      setError(err.message ?? "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const avg = useMemo(() => {
    if (!feedbacks.length) return 0;
    return feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length;
  }, [feedbacks]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return feedbacks.filter(f => {
      const matchRating = filterRating === "all" || f.rating === Number(filterRating);
      const matchSearch = !q ||
        f.comments?.toLowerCase().includes(q) ||
        String(f.user_id).includes(q);
      return matchRating && matchSearch;
    });
  }, [feedbacks, search, filterRating]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const fmt = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#233B6E]">Laporan Penilaian Pengguna</h1>
        <button onClick={fetchData}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl
          px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={fetchData}
            className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
        </div>
      )}

      {/* ── Ringkasan Rating ─────────────────────────────────── */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#233B6E]" />
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#233B6E] text-sm">
              Ringkasan Penilaian Keseluruhan
            </h2>
          </div>
          <div className="p-5">
            {feedbacks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Belum ada data penilaian.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Gauge kiri */}
                <div className="flex-shrink-0">
                  <AverageGauge avg={avg} total={feedbacks.length} />
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-32 bg-gray-100" />

                {/* Bar chart distribusi */}
                <div className="flex-1 w-full">
                  <p className="text-xs font-semibold text-gray-400 uppercase
                    tracking-wider mb-3">Distribusi Rating</p>
                  <RatingDistribution feedbacks={feedbacks} />
                </div>

                {/* Stat cards kanan */}
                <div className="hidden lg:flex flex-col gap-2 flex-shrink-0">
                  {[
                    { label: "Total Penilaian", value: feedbacks.length, icon: "📊" },
                    { label: "Rating Tertinggi", value: Math.max(...feedbacks.map(f=>f.rating), 0), icon: "⭐" },
                    { label: "Rating Terendah", value: Math.min(...feedbacks.map(f=>f.rating), 6), icon: "📉" },
                  ].map(s => (
                    <div key={s.label} className="bg-[#F6F7FB] rounded-xl px-4 py-3
                      min-w-[140px]">
                      <p className="text-xs text-gray-400">{s.icon} {s.label}</p>
                      <p className="text-xl font-extrabold text-[#233B6E] mt-0.5">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabel Daftar Feedback ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap
          items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari komentar..."
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] w-52"
            />
          </div>

          {/* Filter bintang */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", 5, 4, 3, 2, 1].map(r => (
              <button key={r}
                onClick={() => { setFilterRating(String(r)); setPage(1); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                  font-semibold border transition-all
                  ${filterRating === String(r)
                    ? "bg-[#233B6E] text-white border-[#233B6E]"
                    : "border-gray-200 text-gray-500 hover:border-[#233B6E] hover:text-[#233B6E]"
                  }`}>
                {r === "all" ? "Semua" : (
                  <><svg viewBox="0 0 24 24" fill="#F5C400" stroke="#F5C400"
                    strokeWidth="1.5" className="w-3 h-3">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>{r}</>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "Tanggal", "User ID", "Rating", "Komentar"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                    text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <span className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Memuat data...
                  </span>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search || filterRating !== "all"
                    ? "Tidak ada hasil yang cocok."
                    : "Belum ada data penilaian."}
                </td></tr>
              ) : paginated.map((f, i) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {(page - 1) * PER_PAGE + i + 1}.
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {fmt(f.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    #{f.user_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StarDisplay value={f.rating} />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${RATING_COLORS[f.rating]?.bg ?? "bg-gray-100"}
                        ${RATING_COLORS[f.rating]?.text ?? "text-gray-600"}`}>
                        {RATING_COLORS[f.rating]?.label ?? f.rating}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    {f.comments
                      ? <span className="line-clamp-2 text-xs leading-relaxed">
                          {f.comments}
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center
          justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            {filtered.length} penilaian · Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <PBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3"><path d="M15 18l-6-6 6-6"/></svg>
            </PBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
              .map(n => (
                <PBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PBtn>
              ))}
            <PBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3"><path d="M9 18l6-6-6-6"/></svg>
            </PBtn>
          </div>
        </div>
      </div>
    </div>
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