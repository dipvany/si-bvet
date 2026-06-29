import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { approveSubmission, rejectSubmission } from "../../services/adminServices";

/**
 * DetailPengajuanMasuk — hanya untuk melihat detail + approve/reject.
 * Billing dan proses selanjutnya ada di menu Proses Pengujian.
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

// Alur status setelah disetujui
const STATUS_STEPS = [
  { key: "pending_verification", label: "Menunggu Verifikasi", icon: "📋" },
  { key: "reviewing",            label: "Kaji Ulang",          icon: "🔍" },
  { key: "awaiting_payment",     label: "Menunggu Pembayaran", icon: "💳" },
  { key: "in_process",           label: "Proses Pengujian",    icon: "🔬" },
  { key: "done",                 label: "Pengujian Selesai",   icon: "✅" },
];

export default function DetailPengajuanMasuk() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { state } = useLocation();

  const [submission, setSubmission] = useState(state?.submission ?? null);
  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState("");
  const [success, setSuccess]       = useState("");

  if (!submission) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-400 text-sm">Data pengajuan tidak ditemukan.</p>
      <button onClick={() => navigate(-1)} className="text-[#233B6E] text-sm font-semibold hover:underline">← Kembali</button>
    </div>
  );

  const status          = submission.process_status;
  const isPending       = status === "pending_verification";
  const isRejected      = status === "rejected";
  const sudahDiproses   = !isPending && !isRejected;

  const handleApprove = async () => {
    if (!window.confirm("Setujui pengajuan ini? Data akan masuk ke menu Proses Pengujian dengan status Kaji Ulang.")) return;
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

  const statusOrder = STATUS_STEPS.map(s => s.key);
  const currentIdx  = statusOrder.indexOf(status);

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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tindakan</p>
            <p className="text-xs text-gray-400 mb-3">
              Tinjau detail pengajuan di bawah, kemudian setujui atau tolak.
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

      {/* Sudah diproses — info saja */}
      {sudahDiproses && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3
          text-sm text-blue-700 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Pengajuan ini sudah disetujui dan sedang diproses. Kelola lanjutan di menu <strong className="mx-1">Proses Pengujian</strong>.
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

      {/* Timeline */}
      <SectionCard title="Alur Proses Pengajuan" accent="#8B5CF6">
        <div className="py-2 space-y-0">
          {STATUS_STEPS.map((step, idx) => {
            const stepIdx   = statusOrder.indexOf(step.key);
            const isPast    = stepIdx < currentIdx;
            const isCurrent = step.key === status;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                    ${isCurrent ? "bg-[#233B6E] text-white shadow ring-4 ring-[#233B6E]/20"
                      : isPast ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {isPast ? "✓" : step.icon}
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${isPast ? "bg-green-300" : "bg-gray-200"}`} />
                  )}
                </div>
                <div className="pb-2 pt-1.5 flex-1">
                  <p className={`text-sm font-semibold
                    ${isCurrent ? "text-[#233B6E]" : isPast ? "text-green-600" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  {isCurrent && <p className="text-xs text-gray-400 mt-0.5">Status saat ini</p>}
                </div>
              </div>
            );
          })}
          {isRejected && (
            <div className="flex items-center gap-3 mt-1">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm flex-shrink-0">✗</div>
              <p className="text-sm font-semibold text-red-600">Ditolak</p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}