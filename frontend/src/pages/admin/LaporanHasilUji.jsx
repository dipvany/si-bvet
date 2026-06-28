import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminSubmissions, uploadLHU, getLHU } from "../../services/adminServices";
import { resolveFileUrl } from "../../utils/fileUrl";

const PER_PAGE = 10;

const STATUS_DONE = ["done", "completed", "selesai"];

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

function Spinner({ sm }) {
  return (
    <svg className={`animate-spin ${sm ? "w-4 h-4" : "w-5 h-5"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

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

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const cls = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-center
      justify-between gap-3 ${cls}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="w-3.5 h-3.5">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Modal Upload LHU ─────────────────────────────────────────── */
function ModalUploadLHU({ submission, onClose, onSuccess }) {
  const [noLhu,    setNoLhu]    = useState("");
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [existing, setExisting] = useState(null);
  const [fetching, setFetching] = useState(true);
  const fileRef = useRef();

  // GET /admin/submissions/:id/lhu — cek apakah sudah ada LHU
  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const res = await getLHU(submission.id);
        if (res.ok) {
          const data = await res.json();
          // Response: { lhu: { id, no_lhu, file_url, ... } }
          setExisting(data.lhu ?? data.data ?? null);
        }
      } catch {}
      finally { setFetching(false); }
    })();
  }, [submission.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!noLhu.trim()) return setError("Nomor LHU wajib diisi.");
    if (!file)         return setError("File LHU wajib diunggah.");

    setLoading(true);
    try {
      // POST /admin/submissions/:id/lhu
      // form-data: no_lhu (text), file (file)
      const fd = new FormData();
      fd.append("no_lhu", noLhu.trim());
      fd.append("file",   file);

      const res  = await uploadLHU(submission.id, fd);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengunggah LHU.");

      onSuccess("LHU berhasil diunggah.");
    } catch (err) {
      setError(err.message ?? "Gagal mengunggah LHU.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-[#233B6E] text-base">Upload LHU</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              No. EPI: <span className="font-semibold text-[#415F9D]">{submission.no_epi}</span>
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {fetching ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <>
              {/* LHU sudah ada — tampilkan info + opsi upload ulang */}
              {existing && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-blue-700 mb-2">LHU Sudah Diunggah</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 font-medium">No. LHU: {existing.no_lhu}</p>
                      {existing.file_url && (
                        <a href={resolveFileUrl(existing.file_url)} target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline mt-0.5 block truncate">
                          Lihat dokumen LHU
                        </a>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold
                      bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Tersedia
                    </span>
                  </div>
                  <p className="text-xs text-blue-500 mt-2">
                    Anda dapat mengunggah ulang untuk mengganti dokumen LHU.
                  </p>
                </div>
              )}

              <Alert type="error" msg={error} onClose={() => setError("")} />

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* No. LHU */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500
                    uppercase tracking-wide mb-1.5">
                    Nomor LHU <span className="text-red-400">*</span>
                  </label>
                  <input value={noLhu} onChange={e => setNoLhu(e.target.value)}
                    placeholder="Cth: LHU-2026-001"
                    defaultValue={existing?.no_lhu ?? ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                      text-gray-800 outline-none transition focus:ring-2
                      focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
                </div>

                {/* Upload file */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500
                    uppercase tracking-wide mb-1.5">
                    File LHU (PDF) <span className="text-red-400">*</span>
                  </label>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden" onChange={e => setFile(e.target.files[0] ?? null)} />
                  <button type="button" onClick={() => fileRef.current.click()}
                    className={`w-full border-2 border-dashed rounded-xl px-4 py-6 transition-colors
                      flex flex-col items-center gap-2 text-sm
                      ${file
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 hover:border-[#233B6E] hover:bg-[#EEF0F8]"}`}>
                    {file ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span className="font-semibold text-green-700 text-center break-all">
                          {file.name}
                        </span>
                        <span className="text-xs text-green-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB — klik untuk ganti
                        </span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span className="text-gray-500 font-medium">Klik untuk pilih file</span>
                        <span className="text-xs text-gray-400">PDF, JPG, PNG — Maks 10MB</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50
                      font-semibold text-sm py-2.5 rounded-xl transition-colors">
                    Batal
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
                      text-sm py-2.5 rounded-xl transition-all disabled:opacity-60
                      disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                    {loading ? <><Spinner sm />Mengunggah...</> : "Unggah LHU"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Halaman Utama ────────────────────────────────────────────── */
export default function LaporanHasilUji() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [flashOk,     setFlashOk]     = useState("");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [modalData,   setModalData]   = useState(null); // submission yang sedang di-modal

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      // GET /admin/submissions — filter yang status "done"
      const res = await getAdminSubmissions();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      // Response: { data: { data: [...], meta: {...} } }
      const all = body?.data?.data ?? body?.data ?? [];
      // Filter hanya yang sudah selesai (process_status: "done")
      const done = all.filter(s =>
        STATUS_DONE.includes((s.process_status ?? "").toLowerCase())
      );
      setSubmissions(done);
    } catch {
      setError("Gagal memuat data laporan hasil uji.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return submissions;
    return submissions.filter(s =>
      s.no_epi?.toLowerCase().includes(q) ||
      s.type_service?.toLowerCase().includes(q) ||
      s.purpose_of_test?.toLowerCase().includes(q)
    );
  }, [submissions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSuccess = async (msg) => {
    setModalData(null);
    setFlashOk(msg);
    setTimeout(() => setFlashOk(""), 4000);
    await fetchData();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Laporan Hasil Uji</h1>

      <Alert type="error"   msg={error}   onClose={() => setError("")} />
      <Alert type="success" msg={flashOk} onClose={() => setFlashOk("")} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center
          justify-between gap-3 flex-wrap">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari no. tiket / jenis / tujuan..."
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] w-64" />
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {submissions.length} pengujian selesai
          </span>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "No. EPI", "Jenis Layanan", "Tujuan Pengujian",
                  "Jumlah Sampel", "Status LHU", "Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold
                    text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center">
                  <span className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Spinner />Memuat data...
                  </span>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" className="w-10 h-10 opacity-40">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="2"/>
                    </svg>
                    <p className="text-sm">
                      {search ? "Tidak ada hasil pencarian." : "Belum ada pengujian yang selesai."}
                    </p>
                  </div>
                </td></tr>
              ) : paginated.map((s, i) => (
                <RowLHU key={s.id}
                  no={(page - 1) * PER_PAGE + i + 1}
                  submission={s}
                  onUpload={() => setModalData(s)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center
            justify-between flex-wrap gap-2">
            <span className="text-xs text-gray-400">
              Halaman ke {page} dari {totalPages} halaman
            </span>
            <div className="flex items-center gap-1">
              <PaginationBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-3 h-3"><path d="M15 18l-6-6 6-6"/></svg>
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
                  strokeLinecap="round" className="w-3 h-3"><path d="M9 18l6-6-6-6"/></svg>
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* Modal Upload LHU */}
      {modalData && (
        <ModalUploadLHU
          submission={modalData}
          onClose={() => setModalData(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

/* ── Row dengan status LHU ────────────────────────────────────── */
function RowLHU({ no, submission, onUpload }) {
  const [lhuStatus, setLhuStatus] = useState("loading"); // "loading" | "ada" | "belum"
  const [lhuUrl,    setLhuUrl]    = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getLHU(submission.id);
        if (res.ok) {
          const data = await res.json();
          const lhu  = data.lhu ?? data.data;
          if (lhu?.file_url) {
            setLhuUrl(resolveFileUrl(lhu.file_url));
            setLhuStatus("ada");
          } else {
            setLhuStatus("belum");
          }
        } else {
          setLhuStatus("belum");
        }
      } catch {
        setLhuStatus("belum");
      }
    })();
  }, [submission.id]);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-gray-400 text-xs">{no}.</td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-[#233B6E]">
          {submission.no_epi ?? "-"}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm">{submission.type_service ?? "-"}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{submission.purpose_of_test ?? "-"}</td>
      <td className="px-4 py-3 text-center text-gray-700 text-sm">
        {submission.samples_count ?? "-"}
      </td>
      <td className="px-4 py-3">
        {lhuStatus === "loading" ? (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Spinner sm />Cek...
          </span>
        ) : lhuStatus === "ada" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold
            bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            LHU Tersedia
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold
            bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Belum Ada LHU
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Tombol Upload LHU */}
          <button onClick={onUpload}
            className="inline-flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {lhuStatus === "ada" ? "Perbarui" : "Upload"}
          </button>

          {/* Tombol lihat dokumen jika sudah ada */}
          {lhuStatus === "ada" && lhuUrl && (
            <a href={lhuUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200
                text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Lihat
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}