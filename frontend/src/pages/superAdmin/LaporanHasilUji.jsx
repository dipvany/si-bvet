import { useState, useEffect, useMemo, useRef } from "react";
import { getAdminSubmissions, getSubmissionByID, uploadLHU, getLHU } from "../../services/superAdminServices";
import { resolveFileUrl } from "../../utils/fileUrl";
​
const PER_PAGE = 10;
​
const STATUS_DONE = ["done", "completed", "selesai"];
const STATUS_PROCESS = ["processed"];
const STATUS_LHU_LIST = [...STATUS_PROCESS, ...STATUS_DONE];
​
/* Konfigurasi status untuk stepper (alur proses) */
const STATUS_CONFIG = {
  approved: { label: "Disetujui", order: 0 },
  awaiting_payment: { label: "Pembayaran", order: 1 },
  awaiting_verification: { label: "Verifikasi", order: 2 },
  processed: { label: "Sedang Diproses", order: 3, bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  done: { label: "Selesai", order: 4, bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
};
​
const fmtDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};
​
const safeJson = async (res) => {
  try {
    const t = await res.text();
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
};
​
function Spinner({ sm }) {
  return (
    <svg className={`animate-spin ${sm ? "w-4 h-4" : "w-5 h-5"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
​
function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const cls = type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${cls}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  );
}
​
function PaginationBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? "bg-[#233B6E] text-white border-[#233B6E]" : "border-gray-200 hover:bg-gray-100 text-gray-600 bg-white"}`}>
      {children}
    </button>
  );
}
​
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0 min-w-0">
      <span className="text-[11px] text-gray-400 uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-sm font-medium text-gray-800 break-words leading-snug">{value === "" || value == null ? "-" : value}</span>
    </div>
  );
}
​
/* Badge status pengujian */
function PengujianPill({ status }) {
  const done = STATUS_DONE.includes((status ?? "").toLowerCase());
  return done ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Selesai
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
      Sedang Diproses
    </span>
  );
}
​
/* Ikon stepper (urut sesuai STEPS) */
const STEP_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2" /><path d="M9 2h6" /><path d="M6 14h12" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>,
];
​
function StepBar({ status }) {
  const STEPS = [
    { key: "approved", label: "Disetujui" },
    { key: "awaiting_payment", label: "Pembayaran" },
    { key: "awaiting_verification", label: "Verifikasi" },
    { key: "processed", label: "Pengujian" },
    { key: "done", label: "Selesai" },
  ];
  const currentOrder = STATUS_CONFIG[status]?.order ?? 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-5">Alur Proses</p>
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const order = STATUS_CONFIG[step.key]?.order ?? 0;
          const isDone = order < currentOrder;
          const isCurrent = step.key === status;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div className={`absolute top-[18px] right-1/2 w-1/2 h-0.5 ${isDone || isCurrent ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
              {!isLast && (
                <div className={`absolute top-[18px] left-1/2 w-1/2 h-0.5 ${isDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
              <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isDone ? "bg-[#233B6E] text-white shadow-sm" : isCurrent ? "bg-white border-2 border-[#233B6E] text-[#233B6E] ring-4 ring-[#233B6E]/10" : "bg-white border-2 border-gray-200 text-gray-300"}`}>
                {isDone ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  STEP_ICONS[i]
                )}
              </div>
              <p className={`mt-2 text-[11px] font-semibold text-center leading-tight px-1 ${isDone || isCurrent ? "text-[#233B6E]" : "text-gray-400"}`}>
                {step.label}
              </p>
              {isCurrent && (
                <span className="mt-1 text-[9px] font-bold bg-[#233B6E] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Saat Ini
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
​
/* Kartu tinjauan pengajuan (data pengajuan, sampel, pelanggan) */
function TinjauanCard({ full }) {
  if (!full)
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">Tinjauan Pengajuan</p>
        <div className="flex items-center gap-2 text-gray-400 text-xs"><Spinner sm />Memuat tinjauan...</div>
      </div>
    );
​
  const info = full.user_info;
  const cust = info?.customer;
  const samples = full.samples ?? [];
  const attRaw = full.attachment_doc;
  const attDocs = Array.isArray(attRaw) ? attRaw : attRaw ? [attRaw] : [];
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#233B6E] to-[#415F9D]" />
      <div className="p-5 sm:p-6 space-y-6">
        <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">Tinjauan Pengajuan</p>
​
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#233B6E] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">1</span>
            Data Pengajuan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            {[
              { label: "Jenis Layanan", val: full.type_service },
              { label: "Tujuan Pengujian", val: full.purpose_of_test },
              { label: "Tanggal Kirim", val: fmtDate(full.date_of_send) },
              { label: "Pengambil Sampel", val: full.sample_taker },
              { label: "Nama Kurir", val: full.courier_name },
              { label: "Kontak Kurir", val: full.courier_contact },
              { label: "No. Agenda", val: full.agenda_no },
              { label: "No. Surat Cust.", val: full.cust_letter_no },
              { label: "ID iSIKHNAS", val: full.id_isikhnas },
              { label: "Perlu Diagnosis", val: full.diagnosis_required ? "Ya" : "Tidak" },
              { label: "Catatan", val: full.notes },
            ].map((r) => (
              <InfoRow key={r.label} label={r.label} value={r.val} />
            ))}
          </div>
          {attDocs.length > 0 && (
            <div className="mt-2 flex gap-3 py-2.5 border-b border-gray-50">
              <span className="text-xs text-gray-400 w-40 flex-shrink-0">Dokumen Pendukung</span>
              <div className="flex flex-col gap-1">
                {attDocs.map((doc, i) => {
                  const raw = typeof doc === "string" ? doc : doc?.path ?? "";
                  const url = resolveFileUrl(raw);
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#233B6E] text-sm font-semibold hover:underline">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      Lihat Dokumen
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </section>
​
        <section className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#233B6E] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">2</span>
            Data Sampel ({samples.length} sampel)
          </p>
          {samples.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Tidak ada data sampel.</p>
          ) : (
            samples.map((s, i) => (
              <div key={s.id ?? i} className="bg-[#F6F7FB] rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-[#233B6E] mb-2">
                  Sampel {i + 1}{s.sample_code_cust ? ` \u2014 ${s.sample_code_cust}` : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-0">
                  {[
                    { label: "Model", val: s.sample_model },
                    { label: "Species", val: s.species },
                    { label: "Spesimen", val: s.specimen_type },
                    { label: "Kelompok", val: s.specimen_group },
                    { label: "Pengawet", val: s.preservative },
                    { label: "Kemasan", val: s.packaging },
                    { label: "Kondisi", val: s.condition },
                    { label: "Jml Sampel", val: s.total_sample },
                    { label: "Tgl. Produksi", val: fmtDate(s.production_date) },
                    { label: "Tgl. Expired", val: fmtDate(s.expired_date) },
                    { label: "Pemilik", val: s.owner },
                    { label: "Lokasi", val: s.location_smpl },
                  ].map((r) => (
                    <InfoRow key={r.label} label={r.label} value={r.val} />
                  ))}
                </div>
                {s.test_requests?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 mb-1.5">Pengujian Diminta</p>
                    <div className="flex flex-wrap gap-1">
                      {s.test_requests.map((tr, ti) => (
                        <span key={ti} className="bg-[#233B6E]/10 text-[#233B6E] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {tr.test_service?.test_name ?? "-"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
​
        {info && (
          <section className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#233B6E] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">3</span>
              Data Pelanggan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
              {[
                { label: "Nama Lengkap", val: info.fullname },
                { label: "Email", val: info.email },
                { label: "No. Telepon", val: info.phone },
                { label: "Institusi", val: info.institution },
                { label: "Nama PIC", val: cust?.pic_name },
                { label: "Kontak PIC", val: cust?.pic_contact },
                { label: "Penerima LHU", val: cust?.lhu_receiver_name },
                { label: "Kontak Penerima", val: cust?.lhu_receiver_contact },
                { label: "Alamat", val: cust?.address },
                { label: "Kota", val: cust?.city },
                { label: "Provinsi", val: cust?.province },
                { label: "Kode Pos", val: cust?.zip_code },
              ].map((r) => (
                <InfoRow key={r.label} label={r.label} value={r.val} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
​
/* Form unggah LHU (dipakai di kartu tahapan) */
function LhuUploadForm({ submission, existing, onSuccess }) {
  const [noLhu, setNoLhu] = useState(existing?.no_lhu ?? "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();
​
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!noLhu.trim()) return setError("Nomor LHU wajib diisi.");
    if (!file) return setError("File LHU wajib diunggah.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("no_lhu", noLhu.trim());
      fd.append("file", file);
      const res = await uploadLHU(submission.id, fd);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? "Gagal mengunggah LHU.");
      onSuccess("LHU berhasil diunggah. Pengujian ditandai selesai.");
    } catch (err) {
      setError(err.message ?? "Gagal mengunggah LHU.");
    } finally {
      setLoading(false);
    }
  };
​
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert type="error" msg={error} onClose={() => setError("")} />
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Nomor LHU <span className="text-red-400">*</span>
        </label>
        <input value={noLhu} onChange={(e) => setNoLhu(e.target.value)} placeholder="Cth: LHU-2026-001"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          File LHU (PDF) <span className="text-red-400">*</span>
        </label>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setFile(e.target.files[0] ?? null)} />
        <button type="button" onClick={() => fileRef.current.click()}
          className={`w-full border-2 border-dashed rounded-xl px-4 py-6 transition-colors flex flex-col items-center gap-2 text-sm ${file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-[#233B6E] hover:bg-[#EEF0F8]"}`}>
          {file ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="font-semibold text-green-700 text-center break-all">{file.name}</span>
              <span className="text-xs text-green-500">klik untuk ganti</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-gray-500 font-medium">Klik untuk pilih file</span>
              <span className="text-xs text-gray-400">PDF, JPG, PNG - Maks 10MB</span>
            </>
          )}
        </button>
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
        {loading ? (
          <><Spinner sm />Mengunggah...</>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {existing ? "Perbarui LHU & Selesaikan" : "Unggah LHU & Selesaikan Pengujian"}
          </>
        )}
      </button>
    </form>
  );
}
​
/* Halaman detail proses pengujian */
function DetailPengujian({ submission: initialSub, onBack, onUpdated }) {
  const [sub, setSub] = useState(initialSub);
  const [fullSub, setFullSub] = useState(null);
  const [lhu, setLhu] = useState(null);
  const [loadLhu, setLoadLhu] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [showReupload, setShowReupload] = useState(false);
​
  const status = sub.process_status;
  const isProcessed = STATUS_PROCESS.includes((status ?? "").toLowerCase());
  const isDone = STATUS_DONE.includes((status ?? "").toLowerCase());
​
  const refetchLhu = async () => {
    setLoadLhu(true);
    try {
      const res = await getLHU(sub.id);
      const j = await safeJson(res);
      if (res.ok) setLhu(j.lhu ?? j.data ?? j ?? null);
    } catch {
    } finally {
      setLoadLhu(false);
    }
  };
​
  useEffect(() => {
    (async () => {
      try {
        const res = await getSubmissionByID(sub.id);
        const j = await safeJson(res);
        if (res.ok) setFullSub(j.data ?? j);
      } catch {}
      await refetchLhu();
    })();
  }, [sub.id]);
​
  const handleSuccess = async (msg) => {
    setOk(msg);
    setErr("");
    setShowReupload(false);
    setSub((p) => ({ ...p, process_status: "done" }));
    await refetchLhu();
    onUpdated?.();
  };
​
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-[#233B6E] transition-colors flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#233B6E]">Detail Proses Pengujian</h1>
            <PengujianPill status={status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{sub.no_ticket ?? `#${sub.id}`}</p>
        </div>
      </div>
​
      <StepBar status={status} />
​
      <div className="space-y-4">
        <Alert type="error" msg={err} onClose={() => setErr("")} />
        <Alert type="success" msg={ok} onClose={() => setOk("")} />
​
        {isProcessed && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-purple-400" />
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-purple-800">Tahap: Sedang Diproses</p>
                <p className="text-xs text-purple-600 mt-1">Unggah LHU untuk menyelesaikan pengujian. Mengunggah LHU otomatis menandai pengujian sebagai selesai.</p>
              </div>
              <LhuUploadForm submission={sub} existing={null} onSuccess={handleSuccess} />
            </div>
          </div>
        )}
​
        {isDone && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-green-400" />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-sm text-green-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="font-semibold">Pengujian selesai.</span>
              </div>
​
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {loadLhu ? (
                    <div className="flex items-center gap-2 text-gray-400 text-xs"><Spinner sm />Memuat LHU...</div>
                  ) : lhu ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-700 font-semibold break-all min-w-0">No. LHU: {lhu.no_lhu ?? "-"}</p>
                        {lhu.file_path && (
                          <a href={resolveFileUrl(lhu.file_path)} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline mt-0.5 inline-flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                            Lihat dokumen LHU
                          </a>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Tersedia
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Belum ada dokumen LHU.</p>
                  )}
                </div>
​
                <button onClick={() => setShowReupload((p) => !p)}
                  className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {lhu ? (showReupload ? "Batal perbarui" : "Perbarui LHU") : (showReupload ? "Batal unggah" : "Unggah LHU")}
                </button>
              </div>
​
              {showReupload && (
                <div className="pt-2 border-t border-gray-100">
                  <LhuUploadForm submission={sub} existing={lhu} onSuccess={handleSuccess} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
​
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-5">
          <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">Informasi Pengajuan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            <InfoRow label="No. Tiket" value={sub.no_ticket} />
            <InfoRow label="No. Registrasi" value={sub.no_registration} />
            <InfoRow label="No. EPI" value={sub.no_epi} />
            <InfoRow label="Jenis Layanan" value={sub.type_service} />
            <InfoRow label="Tujuan Pengujian" value={sub.purpose_of_test} />
            <InfoRow label="Jumlah Sampel" value={sub.samples_count} />
          </div>
        </div>
      </div>
​
      <TinjauanCard full={fullSub} />
    </div>
  );
}
​
/* Baris tabel */
function RowLHU({ no, submission, onManage }) {
  const [lhuStatus, setLhuStatus] = useState("loading");
​
  useEffect(() => {
    (async () => {
      try {
        const res = await getLHU(submission.id);
        if (res.ok) {
          const data = await safeJson(res);
          const lhu = data.lhu ?? data.data ?? data;
          setLhuStatus(lhu?.file_path ? "ada" : "belum");
        } else {
          setLhuStatus("belum");
        }
      } catch {
        setLhuStatus("belum");
      }
    })();
  }, [submission.id]);
​
  return (
    <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={onManage}>
      <td className="px-4 py-3 text-gray-400 text-xs">{no}.</td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-[#233B6E]">{submission.no_ticket ?? "-"}</span>
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm">{submission.type_service ?? "-"}</td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-[#415F9D]">{submission.no_epi ?? "-"}</span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm max-w-[180px]"><span className="line-clamp-1">{submission.purpose_of_test ?? "-"}</span></td>
      <td className="px-4 py-3 text-center text-gray-700 text-sm">{submission.samples_count ?? "-"}</td>
      <td className="px-4 py-3">
        <PengujianPill status={submission.process_status} />
      </td>
      <td className="px-4 py-3">
        {lhuStatus === "loading" ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap"><Spinner sm />Cek...</span>
        ) : lhuStatus === "ada" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Tersedia
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Belum Ada
          </span>
        )}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={onManage}
          className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Kelola
        </button>
      </td>
    </tr>
  );
}
​
/* Halaman utama */
export default function LaporanHasilUji() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flashOk, setFlashOk] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
​
  useEffect(() => {
    fetchData();
  }, []);
​
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminSubmissions();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const all = body?.data?.data ?? body?.data ?? [];
      const list = all.filter((s) => STATUS_LHU_LIST.includes((s.process_status ?? "").toLowerCase()));
      setSubmissions(list);
    } catch {
      setError("Gagal memuat data proses pengujian.");
    } finally {
      setLoading(false);
    }
  };
​
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter((s) => {
      const st = (s.process_status ?? "").toLowerCase();
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "processed" && STATUS_PROCESS.includes(st)) ||
        (filterStatus === "done" && STATUS_DONE.includes(st));
      const matchSearch =
        !q ||
        s.no_ticket?.toLowerCase().includes(q) ||
        s.no_epi?.toLowerCase().includes(q) ||
        s.type_service?.toLowerCase().includes(q) ||
        s.purpose_of_test?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, search, filterStatus]);
​
  const countByStatus = useMemo(() => {
    const map = { all: submissions.length, processed: 0, done: 0 };
    submissions.forEach((s) => {
      const st = (s.process_status ?? "").toLowerCase();
      if (STATUS_PROCESS.includes(st)) map.processed += 1;
      else if (STATUS_DONE.includes(st)) map.done += 1;
    });
    return map;
  }, [submissions]);
​
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
​
  if (selected) {
    return (
      <DetailPengujian
        submission={selected}
        onBack={() => setSelected(null)}
        onUpdated={fetchData}
      />
    );
  }
​
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#233B6E]">Proses Pengujian</h1>
      </div>
​
      <Alert type="error" msg={error} onClose={() => setError("")} />
      <Alert type="success" msg={flashOk} onClose={() => setFlashOk("")} />
​
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Semua" },
          { value: "processed", label: "Sedang Diproses" },
          { value: "done", label: "Selesai" },
        ].map((opt) => (
          <button key={opt.value} onClick={() => { setFilterStatus(opt.value); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${filterStatus === opt.value
                ? "bg-[#233B6E] text-white border-[#233B6E]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#233B6E] hover:text-[#233B6E]"}`}>
            {opt.label}
            {(countByStatus[opt.value] ?? 0) > 0 && (
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
                ${filterStatus === opt.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {countByStatus[opt.value]}
              </span>
            )}
          </button>
        ))}
      </div>
​
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{submissions.length} pengujian</span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari no. tiket / jenis / tujuan..."
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] w-64" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Status:</span>
              <div className="relative">
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-40 truncate appearance-none border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white pl-3 pr-7 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                  <option value="all">Semua Status</option>
                  <option value="processed">Sedang Diproses</option>
                  <option value="done">Selesai</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
​
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "No. Tiket", "Jenis Layanan", "No. EPI", "Tujuan", "Jml Sampel", "Status Uji", "Status LHU", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-14 text-center">
                  <span className="flex items-center justify-center gap-2 text-gray-400 text-sm"><Spinner />Memuat data...</span>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-10 h-10 opacity-40">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" />
                    </svg>
                    <p className="text-sm">{search ? "Tidak ada hasil pencarian." : "Belum ada pengujian."}</p>
                  </div>
                </td></tr>
              ) : (
                paginated.map((s, i) => (
                  <RowLHU key={s.id} no={(page - 1) * PER_PAGE + i + 1} submission={s} onManage={() => setSelected(s)} />
                ))
              )}
            </tbody>
          </table>
        </div>
​
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-gray-400">Halaman ke {page} dari {totalPages} halaman</span>
            <div className="flex items-center gap-1">
              <PaginationBtn disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M15 18l-6-6 6-6" /></svg>
              </PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                .map((n) => (
                  <PaginationBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PaginationBtn>
                ))}
              <PaginationBtn disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M9 18l6-6-6-6" /></svg>
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}