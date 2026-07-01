import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID",
    { day: "2-digit", month: "2-digit", year: "numeric" });
};

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n ?? 0);

/* ── Timeline step icon ──
   Urutan & jenis icon disesuaikan dengan makna label timeline:
     1. Pengajuan dibuat    → dokumen (file)
     2. Diverifikasi admin  → centang (check)
     3. Menunggu pembayaran → kartu/billing
     4. Sedang diproses lab → tabung reaksi (mikroskop/lab), BUKAN panah checklist
     5. LHU tersedia        → dokumen selesai (file-check)
     6. Berikan Penilaian   → bintang (rating)
*/
const STEP_ICONS = [
  // 1. Pengajuan dibuat — dokumen
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>,
  // 2. Diverifikasi admin — centang
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>,
  // 3. Menunggu pembayaran — kartu/billing
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>,
  // 4. Sedang diproses lab — tabung reaksi
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2"/>
    <path d="M9 2h6"/>
    <path d="M6 14h12"/>
  </svg>,
  // 5. LHU tersedia — dokumen selesai
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 15l2 2 4-4"/>
  </svg>,
  // 6. Berikan Penilaian — bintang
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>,
];

/* ── Timeline component ── */
function Timeline({ timeline, currentStep, isCompleted, hasRated }) {
  // Tambahkan step ke-6 "Berikan Penilaian" secara manual — API tracking
  // hanya mengembalikan 5 step (sampai LHU tersedia), padahal alur produk
  // punya 1 step tambahan setelah itu.
  const fullSteps = [
    ...timeline,
    {
      step:   timeline.length + 1,
      label:  "Berikan Penilaian",
      status: hasRated
        ? "completed"
        : isCompleted
          ? "current"
          : "pending",
    },
  ];

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex justify-center min-w-[560px] mx-auto">
        {fullSteps.map((step, i) => {
          const isDone     = step.status === "completed" || step.status === "done";
          const isCurrent  = step.status === "current";
          const isLast     = i === fullSteps.length - 1;
          // Garis SEBELUM step ini sudah dilewati kalau step ini sendiri
          // sudah done ATAU sedang current (artinya step sebelumnya pasti selesai)
          const lineBeforeDone = isDone || isCurrent;

          return (
            <div key={step.step}
              className={`relative flex flex-col items-center
                ${isLast ? "flex-shrink-0 w-[110px]" : "flex-1 max-w-[120px]"}`}>

              {/* Garis konektor — absolute, melintang penuh di tengah tinggi lingkaran,
                  ditumpuk DI BELAKANG lingkaran (z-0) supaya nyambung mulus tanpa celah.
                  Separuh kiri nyambung ke step sebelumnya, separuh kanan ke step berikutnya. */}
              {i > 0 && (
                <div className={`absolute top-6 right-1/2 w-1/2 h-1 z-0
                  ${lineBeforeDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
              {!isLast && (
                <div className={`absolute top-6 left-1/2 w-1/2 h-1 z-0
                  ${isDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}

              {/* Circle — z-10 supaya selalu di atas garis, solid filled saat selesai/aktif */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center
                justify-center flex-shrink-0 transition-all
                ${isDone
                  ? "bg-[#233B6E] text-white shadow-sm"
                  : isCurrent
                    ? "bg-white border-2 border-[#233B6E] text-[#233B6E] ring-4 ring-[#233B6E]/10"
                    : "bg-white border-2 border-gray-200 text-gray-300"}`}>
                {STEP_ICONS[i] ?? (
                  <span className="text-xs font-bold">{step.step}</span>
                )}
              </div>

              {/* Label */}
              <p className={`relative z-10 text-[11px] text-center mt-2.5 leading-tight px-1
                font-semibold bg-white
                ${isDone || isCurrent ? "text-[#233B6E]" : "text-gray-400"}`}>
                {step.label}
              </p>

              {/* Tanggal */}
              {step.date && (
                <p className="relative z-10 text-[10px] text-gray-400 mt-0.5 text-center bg-white">
                  {formatDate(step.date)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Star rating ── */
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110">
          <svg viewBox="0 0 24 24"
            fill={(hover || value) >= star ? "#F5C400" : "none"}
            stroke={(hover || value) >= star ? "#F5C400" : "#D1D5DB"}
            strokeWidth="1.5" className="w-7 h-7">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function DetailPengajuan() {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();

  const [submission, setSubmission] = useState(location.state?.submission ?? null);
  const [timeline, setTimeline]     = useState([]);
  const [billing, setBilling]       = useState(null);
  const [lhu, setLhu]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Tinjauan sampel — dibaca dari cache lokal yang disimpan saat submit di
  // PengajuanUjiSampel.jsx. API belum punya endpoint GET untuk detail
  // sampel submission yang sudah tersimpan, jadi ini hanya tersedia kalau
  // pengajuan dibuat dari browser/perangkat yang sama.
  const [tinjauan, setTinjauan] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`tinjauan_sampel_${id}`);
      if (raw) setTinjauan(JSON.parse(raw));
    } catch {
      setTinjauan(null);
    }
  }, [id]);

  // Billing upload
  const [proofFile, setProofFile]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState("");
  const proofRef                    = useRef();

  // Feedback
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg]       = useState("");
  const [hasRated, setHasRated]             = useState(false);

  // LHU download
  const [downloading, setDownloading] = useState(false);

  // FIX: status asli dari backend adalah "done" & "awaiting_payment"
  // (lihat admin/ProsesPengujian.jsx & dokumentasi API), bukan "completed"
  // & "waiting_payment". Karena salah, kolom upload bukti bayar dan
  // bagian LHU/penilaian tidak pernah muncul walau status sudah sesuai.
  const isCompleted = submission?.process_status === "done";
  const isWaitingPayment = submission?.process_status === "awaiting_payment";

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true); setError("");
    try {
      // Tracking timeline — endpoint ini cuma balikin {submission_id,
      // current_step, current_status, timeline}, TIDAK ada no_epi,
      // no_ticket, type_service, dst. Jadi jangan dipakai sebagai
      // sumber data submission utama.
      const tRes  = await apiFetch(`/customer/submissions/${id}/tracking`);
      const tData = await tRes.json();
      setTimeline(tData.data?.timeline ?? []);

      // Detail submission (no_epi, no_ticket, samples, dst) — endpoint ini
      // tidak ada di dokumentasi resmi customer, tapi mengikuti pola yang
      // sudah dipakai di sisi admin (GET /admin/submissions/{id}). Kalau
      // backend memang belum punya rute ini untuk customer, kita fallback
      // ke data dari state navigasi / cache pratinjau lokal seperti semula.
      if (!submission) {
        try {
          const dRes = await apiFetch(`/customer/submissions/${id}`);
          if (dRes.ok) {
            const dJson = await dRes.json();
            const full  = dJson.data ?? dJson;
            if (full && typeof full === "object" && (full.no_ticket || full.samples)) {
              setSubmission(full);
              if (Array.isArray(full.samples) && full.samples.length) {
                setTinjauan({ samples: full.samples });
              }
            } else {
              setSubmission(tData.data);
            }
          } else {
            setSubmission(tData.data);
          }
        } catch {
          setSubmission(tData.data);
        }
      }

      // Billing
      try {
        const bRes  = await apiFetch(`/customer/billings/${id}`);
        if (bRes.ok) setBilling(await bRes.json());
      } catch {}

      // LHU
      try {
        const lRes = await apiFetch(`/customer/submissions/${id}/lhu`);
        if (lRes.ok) setLhu(await lRes.json());
      } catch {}

    } catch {
      setError("Gagal memuat detail pengajuan.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Upload bukti pembayaran ── */
  const handleUploadProof = async () => {
    if (!proofFile) return;
    setUploading(true); setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("proof", proofFile);
      const res = await apiFetch(`/customer/billings/${id}/proof`,
        { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal mengunggah.");
      }
      setUploadMsg("✓ Bukti pembayaran berhasil diunggah.");
      setProofFile(null);
      fetchAll();
    } catch (e) {
      setUploadMsg(`✗ ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  /* ── Download LHU ── */
  const handleDownloadLHU = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/customer/submissions/${id}/lhu/download`);
      if (!res.ok) throw new Error("Gagal mengunduh LHU.");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `LHU-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };

  /* ── Submit feedback ── */
  const handleFeedback = async () => {
    if (!rating) { setFeedbackMsg("✗ Pilih rating terlebih dahulu."); return; }
    setFeedbackSaving(true); setFeedbackMsg("");
    try {
      const res = await apiFetch("/customer/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comments: comment }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal mengirim penilaian.");
      }
      setFeedbackMsg("✓ Terima kasih atas penilaian Anda!");
      setHasRated(true);
    } catch (e) {
      setFeedbackMsg(`✗ ${e.message}`);
    } finally {
      setFeedbackSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Memuat detail pengajuan...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header — tanpa icon back, sudah ada tombol Kembali di dalam card */}
      <h1 className="text-xl font-bold text-[#233B6E]">Riwayat Pengajuan Saya</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Card utama */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-6 space-y-6">

          {/* No. EPI + Kembali */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => navigate("/customer/pengajuan-saya")}
              className="flex items-center gap-1.5 text-sm text-[#233B6E]
                font-semibold hover:underline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Kembali
            </button>
            <span className="text-sm font-mono font-bold text-[#233B6E]">
              No. EPI {submission?.no_epi ?? id}
            </span>
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <Timeline
              timeline={timeline}
              currentStep={submission?.current_step}
              isCompleted={isCompleted}
              hasRated={hasRated}
            />
          )}

          {/* Info pengajuan */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm
            pt-4 border-t border-gray-100">
            {[
              { label: "No. Registrasi",  val: submission?.no_registration ?? "-" },
              { label: "No. Tiket",       val: submission?.no_ticket ?? "-" },
              { label: "Jenis Layanan",   val: submission?.type_service ?? "-" },
              { label: "Tujuan Uji",      val: submission?.purpose_of_test ?? "-" },
              { label: "Jumlah Sampel",   val: submission?.samples_count ?? "-" },
              // FIX: "Pengambil Sampel" dihapus — field ini tidak lagi ada di form
            ].map(r => (
              <div key={r.label}>
                <p className="text-xs text-gray-400">{r.label}</p>
                <p className="font-semibold text-[#233B6E] mt-0.5">{r.val}</p>
              </div>
            ))}
          </div>

          {/* Catatan */}
          {submission?.notes && (
            <div className="bg-[#F6F7FB] rounded-xl p-4 text-sm text-gray-600">
              <p className="text-xs font-semibold text-gray-400 mb-1">Catatan</p>
              {submission.notes}
            </div>
          )}

          {/* ── TINJAUAN SAMPEL ── */}
          {tinjauan && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div>
                <h3 className="font-bold text-[#233B6E] text-sm">
                  Tinjauan Sampel yang Diajukan
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Salinan pratinjau saat pengajuan dibuat ({tinjauan.samples?.length ?? 0} sampel)
                </p>
              </div>
              <div className="space-y-2">
                {(tinjauan.samples ?? []).map((s, i) => (
                  <div key={i} className="bg-[#F6F7FB] rounded-xl p-3 text-sm">
                    <p className="font-bold text-[#233B6E] mb-2">
                      Sampel {i + 1}: {s.sample_code_cust || "-"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "Model Sampel",   val: s.sample_model },
                        { label: "Species/Hewan",  val: s.species },
                        { label: "Jenis Spesimen", val: s.specimen_type },
                        { label: "Pengawet",       val: s.preservative },
                      ].map(r => (
                        <div key={r.label}>
                          <p className="text-[11px] text-gray-400">{r.label}</p>
                          <p className="font-medium text-[#233B6E]">{r.val || "-"}</p>
                        </div>
                      ))}
                    </div>
                    {s.test_services?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.test_services.map(t => (
                          <span key={t.id}
                            className="bg-[#233B6E]/10 text-[#233B6E] text-[10px]
                              font-bold px-2 py-0.5 rounded-full">
                            {t.test_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BILLING ── */}
          {billing && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h3 className="font-bold text-[#233B6E] text-sm">Informasi Pembayaran</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Kode E-Billing</p>
                  <p className="font-bold text-[#233B6E] font-mono mt-0.5">
                    {billing.ebilling_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Tagihan</p>
                  <p className="font-extrabold text-[#233B6E] text-lg mt-0.5">
                    {rupiah(billing.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status Pembayaran</p>
                  <span className={`inline-flex items-center gap-1.5 mt-0.5 px-2.5
                    py-1 rounded-full text-xs font-semibold
                    ${billing.payment_status === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full
                      ${billing.payment_status === "paid"
                        ? "bg-green-500" : "bg-yellow-500"}`} />
                    {billing.payment_status === "paid" ? "Lunas" : "Belum Dibayar"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tanggal Tagihan</p>
                  <p className="font-semibold text-[#233B6E] mt-0.5">
                    {formatDate(billing.issued_at)}
                  </p>
                </div>
              </div>

              {/* Invoice */}
              {billing.invoice_doc && (
                <a href={resolveFileUrl(billing.invoice_doc)} target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#233B6E] text-sm
                    font-semibold hover:underline">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    className="w-4 h-4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0
                      2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Lihat Invoice
                </a>
              )}

              {/* Upload bukti bayar */}
              {billing.payment_status !== "paid" && isWaitingPayment && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-[#415F9D]">
                    Upload Bukti Pembayaran
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => proofRef.current.click()}
                      className="border border-dashed border-gray-300 rounded-xl
                        px-4 py-2 text-sm flex items-center gap-2 text-gray-500
                        hover:border-[#233B6E] hover:text-[#233B6E] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="w-4 h-4">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {proofFile ? proofFile.name : "Pilih File"}
                    </button>
                    <input ref={proofRef} type="file"
                      accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => setProofFile(e.target.files[0] ?? null)} />
                    {proofFile && (
                      <button onClick={handleUploadProof} disabled={uploading}
                        className="bg-[#233B6E] hover:bg-[#1a2d56] text-white
                          font-bold text-sm px-5 py-2 rounded-xl transition-all
                          disabled:opacity-60">
                        {uploading ? "Mengunggah..." : "Unggah"}
                      </button>
                    )}
                  </div>
                  {uploadMsg && (
                    <p className={`text-xs font-medium
                      ${uploadMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                      {uploadMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LHU ── */}
          {isCompleted && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <p className="text-sm text-gray-600">
                Sampel telah selesai diuji silahkan Unduh LHU dan berikan penilaian
                pelayanan.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleDownloadLHU} disabled={downloading}
                  className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                    text-white font-bold text-sm px-5 py-2.5 rounded-xl
                    transition-all disabled:opacity-60">
                  {downloading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"
                      fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="w-4 h-4">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  )}
                  Unduh LHU
                </button>
              </div>
            </div>
          )}

          {/* ── PENILAIAN ── */}
          {isCompleted && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <h3 className="font-bold text-[#233B6E] text-sm">
                Berikan Penilaian Layanan
              </h3>
              <p className="text-xs text-gray-500">
                Bantu kami meningkatkan kualitas layanan dengan mengisi survei kepuasan.
              </p>
              <button
                onClick={() => navigate(
                  `/customer/penilaian/${submission?.id}`,
                  { state: { submission } }
                )}
                className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                  text-white font-bold text-sm px-6 py-2.5 rounded-xl
                  transition-all shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-4 h-4">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Isi Penilaian Kepuasan
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}