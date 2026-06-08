import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { getUnverifiedCustomers } from "../../services/adminServices"; // FIX: adminService → adminServices

const PER_PAGE = 10;

export default function RegistrasiPelanggan() {
  const navigate  = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUnverifiedCustomers();
      const data = await res.json();
      setCustomers(data.customers ?? []);
    } catch {
      setError("Gagal memuat data. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Filter pencarian sisi client
  const filtered = useMemo(() =>
    customers.filter(c =>
      c.fullname.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    ), [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Daftar Akun Registrasi</h1>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3
          flex items-center justify-between">
          {error}
          <button onClick={fetchData}
            className="text-red-600 font-semibold hover:underline text-xs">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
          <div className="relative w-full max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Cari nama atau email..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "Email", "Nama", "Dokumen", "Status", "Detail"].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500
                      uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}
                    className="px-4 py-12 text-center text-gray-400 text-sm">
                    {search ? "Tidak ada hasil pencarian." : "Belum ada data registrasi."}
                  </td>
                </tr>
              ) : paginated.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">
                    {(page - 1) * PER_PAGE + i + 1}.
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.email}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.fullname}</td>

                  {/* Kolom dokumen — buka file di tab baru */}
                  <td className="px-4 py-3">
                    {c.registration_doc ? (
                      <a
                        href={c.registration_doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#233B6E] text-xs
                          font-semibold hover:underline"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          className="w-3.5 h-3.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0
                            2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Lihat Dok
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={c.is_verified ? "approved" : "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(
                        `/admin/registrasi-pelanggan/${c.id}`,
                        { state: { customer: c } }
                      )}
                      className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs
                        font-semibold hover:underline"
                    >
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
          justify-between text-xs text-gray-500">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-7 h-7 flex items-center justify-center rounded border
                border-gray-200 hover:bg-gray-100 disabled:opacity-40
                disabled:cursor-not-allowed transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-7 h-7 flex items-center justify-center rounded border
                  text-xs font-medium transition-colors
                  ${n === page
                    ? "bg-[#233B6E] text-white border-[#233B6E]"
                    : "border-gray-200 hover:bg-gray-100 text-gray-600"
                  }`}
              >
                {n}
              </button>
            ))}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-7 h-7 flex items-center justify-center rounded border
                border-gray-200 hover:bg-gray-100 disabled:opacity-40
                disabled:cursor-not-allowed transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}