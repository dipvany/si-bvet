import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import StatusBadge from "../../components/StatusBadge";

const PER_PAGE = 10;

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

function PaginationBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs
        font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "bg-[#233B6E] text-white border-[#233B6E]"
          : "border-gray-200 hover:bg-gray-100 text-gray-600 bg-white"}`}>
      {children}
    </button>
  );
}

export default function LaporanPengaduan() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState("terbaru");
  const [page, setPage]             = useState(1);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/admin/complaints");
      const data = await res.json();
      setComplaints(data.complaints ?? []);
    } catch {
      setError("Gagal memuat data pengaduan.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = complaints.filter(c =>
      !q ||
      c.user?.fullname?.toLowerCase().includes(q) ||
      c.user?.email?.toLowerCase().includes(q) ||
      c.subjects?.toLowerCase().includes(q)
    );
    return [...base].sort((a, b) => {
      if (sort === "terlama") return new Date(a.date_of_complaint) - new Date(b.date_of_complaint);
      return new Date(b.date_of_complaint) - new Date(a.date_of_complaint);
    });
  }, [complaints, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Laporan Pengaduan</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3 flex justify-between items-center">
          {error}
          <button onClick={fetchData}
            className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap
          items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama atau subjek..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm
                outline-none bg-[#F6F7FB]
                focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]" />
          </div>

          {/* Urutkan */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              Urutkan:
            </span>
            <div className="relative">
              <select value={sort}
                onChange={e => { setSort(e.target.value); setPage(1); }}
                className="appearance-none border border-gray-200 rounded-xl bg-white
                  text-sm font-medium text-gray-700 pl-3 pr-7 py-2 outline-none
                  focus:ring-2 focus:ring-[#233B6E]/20 cursor-pointer">
                <option value="terbaru">Terbaru</option>
                <option value="terlama">Terlama</option>
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "Nama", "NIK", "Tanggal Melapor", "Detail"].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-semibold
                      text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
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
                <tr><td colSpan={5} className="px-4 py-12 text-center
                  text-gray-400 text-sm">
                  {search ? "Tidak ada hasil pencarian." : "Belum ada data pengaduan."}
                </td></tr>
              ) : paginated.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {(page - 1) * PER_PAGE + i + 1}.
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {c.user?.fullname ?? c.description?.split("\n")[0]?.replace("Nama: ","") ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.user?.nik ?? c.description?.match(/NIK: ([^\n]+)/)?.[1] ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(c.date_of_complaint)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(
                        `/superadmin/laporan-pengaduan/${c.id}`,
                        { state: { complaint: c } }
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

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center
          justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Halaman ke {page} dari {totalPages} halaman
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
  );
}