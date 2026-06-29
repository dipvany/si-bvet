import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { approveSubmission, rejectSubmission } from "../../services/superAdminServices";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";

/**
 * DetailPengajuanMasuk — lihat detail + approve/reject.
 * Tidak ada alur proses — cukup verifikasi pengajuan.
 * Setelah approve → otomatis masuk Proses Pengujian (status: kaji_ulang).
 */

const STATUS_CONFIG = {
  pending_verification: { label: "Menunggu Verifikasi", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  reviewing:            { label: "Kaji Ulang",          bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  awaiting_payment:     { label: "Menunggu Pembayaran", bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  in_process:           { label: "Proses Pengujian",    bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  done:                 { label: "Pengujian Selesai",   bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  rejected:             { label: "Ditolak",             bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500"    },
};

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function Spinner({ sm }) {
  return (
    <svg className={`animate-spin ${sm ? "w-3.5 h-3.5" : "w-4 h-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const cls = type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${cls}`}>
      <span>{msg}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M1 1l12 12M13 1L1 13"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">{value ?? "-"}</span>
    </div>
  );
}

function SectionCard({ title, accent = "#233B6E", children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1" style={{ background: accent }} />
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-[#233B6E] text-sm">{title}</h2>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function FileIcon({ ext }) {
  const isPdf = ext === "pdf";
  const isImg = ["jpg","jpeg","png","gif","webp"].includes(ext);
  if (isPdf) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-500">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
    </svg>
  );
  if (isImg) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-500">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export default function DetailPengajuanMasuk() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { state } = useLocation();

  const [submission, setSubmission] = useState(state?.submission ?? null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [docs,       setDocs]       = useState([]);
  const [docsLoading,setDocsLoading]= useState(false);

  // Fetch attachment docs
  useEffect(() => {
    if (!id) return;
    setDocsLoading(true);
    apiFetch(`/admin/submissions/${id}`)
      .then(r => r.json())
      .then(d => {
        const raw = d.data ?? d;
        // attachment_doc bisa berupa string path, array of paths, atau array of objects
        const att = raw.attachment_doc ?? raw.attachments ?? raw.documents ?? [];
        if (Array.isArray(att)) setDocs(att);
        else if (typeof att === "string" && att) setDocs([att]);
      })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [id]);

  if (!submission) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-400 text-sm">Data pengajuan tidak ditemukan.</p>
      <button onClick={() => navigate(-1)} className="text-[#233B6E] text-sm font-semibold hover:underline">← Kembali</button>
    </div>
  );

  const status        = submission.process_status;
  const isPending     = status === "pending_verification";
  const isRejected    = status === "rejected";
  const sudahDiproses = !isPending && !isRejected;

  const handleApprove = async () => {
    if (!window.confirm("Setujui pengajuan ini? Data akan otomatis masuk ke menu Proses Pengujian dengan status Kaji Ulang.")) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res  = await approveSubmission(id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menyetujui.");
      setSuccess("Pengajuan berhasil disetujui. Data masuk ke Proses Pengujian (Kaji Ulang).");
      setSubmission(p => ({ ...p, process_status: "reviewing" }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!window.confirm("Tolak pengajuan ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res  = await rejectSubmission(id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menolak.");
      setSuccess("Pengajuan berhasil ditolak.");
      setSubmission(p => ({ ...p, process_status: "rejected" }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#233B6E]">Detail Pengajuan</h1>
            <StatusPill status={status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{submission.no_ticket ?? `ID #${id}`}</p>
        </div>
      </div>

      <Alert type="error"   msg={error}   onClose={() => setError("")} />
      <Alert type="success" msg={success} onClose={() => setSuccess("")} />

      {/* Tombol Aksi — hanya saat pending_verification */}
      {isPending && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#233B6E]" />
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tindakan Verifikasi</p>
            <p className="text-xs text-gray-400 mb-3">
              Tinjau detail pengajuan di bawah, kemudian setujui atau tolak.
              Jika disetujui, pengajuan otomatis masuk ke <strong>Proses Pengujian</strong> dengan status <strong>Kaji Ulang</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleApprove} disabled={loading}
                className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                  text-white font-bold text-sm px-5 py-2.5 rounded-xl
                  transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                {loading ? <Spinner sm /> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                Setujui Pengajuan
              </button>
              <button onClick={handleReject} disabled={loading}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100
                  text-red-600 font-bold text-sm px-5 py-2.5 rounded-xl
                  border border-red-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Spinner sm /> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
                Tolak Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sudah diproses */}
      {sudahDiproses && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3
          text-sm text-blue-700 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Pengajuan ini sudah disetujui. Kelola lanjutan di menu <strong className="mx-1">Proses Pengujian</strong>.
        </div>
      )}

      {/* Ditolak */}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
          text-sm text-red-600 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Pengajuan ini telah ditolak.
        </div>
      )}

      {/* Info Pengajuan */}
      <SectionCard title="Informasi Pengajuan">
        <InfoRow label="No. Tiket"        value={submission.no_ticket} />
        <InfoRow label="User ID"          value={`#${submission.user_id}`} />
        <InfoRow label="Jenis Layanan"    value={submission.type_service} />
        <InfoRow label="Tujuan Pengujian" value={submission.purpose_of_test} />
        <InfoRow label="Jumlah Sampel"    value={submission.samples_count} />
        <InfoRow label="Pengambil Sampel" value={submission.sample_taker} />
        <InfoRow label="No. Registrasi"   value={submission.no_registration} />
        <InfoRow label="No. EPI"          value={submission.no_epi} />
        <InfoRow label="Tanggal Kirim"    value={submission.date_of_send} />
        <InfoRow label="Tanggal Terima"   value={submission.date_of_receive} />
        <InfoRow label="ID iSIKHNAS"      value={submission.id_isikhnas} />
        <InfoRow label="Catatan"          value={submission.notes} />
      </SectionCard>

      {/* Dokumen Pendukung */}
      <SectionCard title="Dokumen Pendukung" accent="#0EA5E9">
        {docsLoading ? (
          <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
            <Spinner sm /> Memuat dokumen...
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">Tidak ada dokumen pendukung yang diupload.</p>
        ) : (
          <div className="space-y-2 py-1">
            {docs.map((doc, i) => {
              const path    = typeof doc === "string" ? doc : (doc.path ?? doc.file_path ?? doc.url ?? "");
              const url     = resolveFileUrl(path);
              const fname   = path.split("/").pop() || `Dokumen ${i + 1}`;
              const ext     = fname.split(".").pop().toLowerCase();
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                    bg-gray-50 hover:bg-[#EEF0F8] border border-gray-100
                    hover:border-[#233B6E]/20 transition-colors group">
                  <FileIcon ext={ext} />
                  <span className="text-sm text-gray-700 font-medium flex-1 min-w-0 truncate
                    group-hover:text-[#233B6E]">
                    {fname}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="w-4 h-4 text-gray-300 group-hover:text-[#233B6E] flex-shrink-0">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}