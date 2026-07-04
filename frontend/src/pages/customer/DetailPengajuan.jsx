import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";
​
const fmtDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });
};
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n ?? 0);
​
/* ── Row info ── */
function Row({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-[#233B6E] mt-0.5">{value || "-"}</p>
    </div>
  );
}
​
/* ── Card wrapper ── */
function Card({ title, accent = "#233B6E", children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1" style={{ background: accent }} />
      <div className="p-5 space-y-4">
        {title && (
          <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
​
/* ── Status badge ── */
const STATUS_MAP = {
  pending:               { label: "Menunggu",                       cls: "bg-gray-100   text-gray-600",     dot: "bg-gray-400"    },
  pending_verification:  { label: "Menunggu Verifikasi",            cls: "bg-yellow-100 text-yellow-700",   dot: "bg-yellow-500"  },
  reviewing:             { label: "Kaji Ulang",                     cls: "bg-orange-100 text-orange-700",   dot: "bg-orange-500"  },
  approved:              { label: "Disetujui",                      cls: "bg-orange-100 text-orange-700",   dot: "bg-orange-500"  },
  awaiting_payment:      { label: "Menunggu Pembayaran",            cls: "bg-blue-100   text-blue-700",     dot: "bg-blue-500"    },
  awaiting_verification: { label: "Menunggu Verifikasi Pembayaran", cls: "bg-cyan-100   text-cyan-700",     dot: "bg-cyan-500"    },
  payment_rejected:      { label: "Pembayaran Ditolak",             cls: "bg-red-100    text-red-600",      dot: "bg-red-500"     },
  paid:                  { label: "Lunas",                          cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  in_process:            { label: "Sedang Diproses",                cls: "bg-purple-100 text-purple-700",   dot: "bg-purple-500"  },
  processed:             { label: "Sedang Proses Pengujian",        cls: "bg-indigo-100 text-indigo-700",   dot: "bg-indigo-500"  },
  done:                  { label: "Selesai",                        cls: "bg-green-100  text-green-700",    dot: "bg-green-500"   },
  completed:             { label: "Selesai",                        cls: "bg-green-100  text-green-700",    dot: "bg-green-500"   },
  rejected:              { label: "Ditolak",                        cls: "bg-red-100    text-red-600",      dot: "bg-red-500"     },
};
​
function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
​
/* ── Icons per step timeline ── */
const TIMELINE_ICONS = [
  // 1. Pengajuan dibuat — dokumen
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="13" x2="12" y2="18"/>
    <line x1="9" y1="15.5" x2="15" y2="15.5"/>
  </svg>,
  // 2. Diverifikasi admin — centang dalam lingkaran
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>,
  // 3. Menunggu pembayaran — kartu/billing
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>,
  // 4. Sedang diproses lab — tabung reaksi
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2"/>
    <path d="M9 2h6"/><path d="M6.5 14h11"/>
  </svg>,
  // 5. LHU tersedia — dokumen + centang
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 15l2 2 4-4"/>
  </svg>,
  // 6. Berikan Penilaian — bintang
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>,
];
​
/* ── Timeline tracking dari API — horizontal solid filled ── */
function TrackingTimeline({ submissionId, isDone: submissionDone }) {
  const [timeline, setTimeline] = useState([]);
  const [loading,  setLoading]  = useState(true);
​
  useEffect(() => {
    apiFetch(`/customer/submissions/${submissionId}/tracking`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const steps = d.data?.timeline ?? [];
          // Tambah step ke-6 "Berikan Penilaian" secara manual
          setTimeline([
            ...steps,
            {
              step: steps.length + 1,
              label: "Berikan Penilaian",
              status: submissionDone ? "current" : "pending",
            },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [submissionId, submissionDone]);
​
  if (loading) return (
    <div className="flex items-center gap-2 text-gray-400 text-xs py-3">
      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      Memuat tracking...
    </div>
  );
​
  if (!timeline.length) return null;
​
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-start justify-center min-w-[540px] mx-auto">
        {timeline.map((t, i) => {
          const isDone     = t.status === "done" || t.status === "completed";
          const isCurrent  = t.status === "current";
          const isLast     = i === timeline.length - 1;
          const lineBeforeDone = isDone || isCurrent;
​
          return (
            <div key={i}
              className={`relative flex flex-col items-center
                ${isLast ? "flex-shrink-0 w-[100px]" : "flex-1 max-w-[110px]"}`}>
​
              {/* Garis kiri — absolute, di belakang lingkaran */}
              {i > 0 && (
                <div className={`absolute top-6 right-1/2 w-1/2 h-1 z-0
                  ${lineBeforeDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
              {/* Garis kanan */}
              {!isLast && (
                <div className={`absolute top-6 left-1/2 w-1/2 h-1 z-0
                  ${isDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
​
              {/* Circle — solid filled saat selesai, outline saat aktif, abu saat pending */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center
                justify-center flex-shrink-0 transition-all
                ${isDone
                  ? "bg-[#233B6E] text-white"
                  : isCurrent
                    ? "bg-white border-[3px] border-[#233B6E] text-[#233B6E] ring-4 ring-[#233B6E]/10"
                    : "bg-white border-2 border-gray-200 text-gray-300"}`}>
                {TIMELINE_ICONS[i] ?? <span className="text-xs font-bold">{t.step}</span>}
              </div>
​
              {/* Label */}
              <p className={`relative z-10 text-[11px] text-center mt-2.5 leading-tight px-1
                font-semibold
                ${isDone || isCurrent ? "text-[#233B6E]" : "text-gray-400"}`}>
                {t.label}
              </p>
​
              {/* Tanggal */}
              {t.date && (
                <p className="relative z-10 text-[10px] text-gray-400 mt-0.5 text-center">
                  {fmtDate(t.date)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
​
/* ── Collapsible section ── */
function Section({ title, children }) {
  return (
    <div className="border-t border-gray-100">
      <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider py-3">{title}</p>
      <div className="pb-4 space-y-3">{children}</div>
    </div>
  );
}
​
/* ══════════════════════════════════════════
   HALAMAN UTAMA
══════════════════════════════════════════ */
export default function DetailPengajuan() {
  const { id }   = useParams();
  const navigate = useNavigate();
​
  const [sub,         setSub]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [proofFile,   setProofFile]   = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadMsg,   setUploadMsg]   = useState("");
  const [downloading, setDownloading] = useState(false);
  const proofRef = useRef();
  const [openReview, setOpenReview] = useState(true);
  const [profile, setProfile] = useState(null);
​
  useEffect(() => { fetchAll(); }, [id]);
​
  // Endpoint detail customer tidak mengirim data pelanggan, jadi ambil dari profil.
  useEffect(() => {
    apiFetch("/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setProfile(data.profile ?? data); })
      .catch(() => {});
  }, []);
​
  const fetchAll = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch(`/customer/submissions/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const subData = json.data ?? json;
      setSub(subData);
​
      // Fetch billing terpisah jika belum ada di response submission
      // API: GET /customer/billings/:submission_id
      if (!subData.billing) {
        try {
          const bRes = await apiFetch(`/customer/billings/${id}`);
          if (bRes.ok) {
            const bJson = await bRes.json();
            const bill  = bJson.billing ?? bJson.data ?? bJson;
            // Pastikan bukan object kosong
            if (bill && bill.ebilling_code) {
              setSub(prev => ({ ...prev, billing: bill }));
            }
          }
        } catch {}
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
​
  const handleUploadProof = async () => {
    if (!proofFile) return;
    setUploading(true); setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("proof", proofFile);
      const res = await apiFetch(`/customer/billings/${id}/proof`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Gagal mengunggah.");
      }
      setUploadMsg("✓ Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.");
      setProofFile(null);
      fetchAll();
    } catch (e) {
      setUploadMsg(`✗ ${e.message}`);
    } finally {
      setUploading(false);
    }
  };
​
  const handleDownloadLHU = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/customer/submissions/${id}/lhu/download`);
      if (!res.ok) throw new Error("Gagal mengunduh LHU.");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: `LHU-${id}.pdf` }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };
​
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Memuat data pengajuan...
      </div>
    </div>
  );
​
  if (error) return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-5 py-4 flex items-center justify-between">
        <span>Gagal memuat: {error}</span>
        <button onClick={fetchAll} className="text-xs font-bold hover:underline ml-4">Coba Lagi</button>
      </div>
    </div>
  );
​
  const status        = sub?.process_status;
  // user_info bisa ada di root atau di dalam "user" / "user_info"
  // Data pelanggan: endpoint detail customer tidak mengirim user_info,
  // jadi pakai profil user yang login sebagai sumbernya.
  const prof = profile ?? {};
  const profUser = prof.fullname || prof.email ? prof : (prof.User ?? {});
  const profCust = prof.fullname || prof.email ? (prof.customer ?? {}) : prof;
  const info = sub?.user_info ?? sub?.user ?? (profile ? profUser : null);
  // data customer detail (alamat, PIC, dll) bisa nested di dalam info
  const cust = info?.customer ?? info?.Customer ?? info?.profile ?? profCust;
  const samples       = sub?.samples ?? [];
  const billing       = sub?.billing;
  const isDone        = status === "done";
  const isAwaitingPay = status === "awaiting_payment";
  const isAwaitingVerif = status === "awaiting_verification";
  const attRaw        = sub?.attachment_doc;
  const attDocs       = Array.isArray(attRaw) ? attRaw : (attRaw ? [attRaw] : []);
​
  // Estimasi harga dari sampel x layanan pengujian (harga x jumlah sampel)
  const estLines = (() => {
    const map = new Map();
    samples.forEach((s) => {
      const qty = Number(s.total_sample) || 0;
      (s.test_requests ?? s.test_services ?? []).forEach((tr) => {
        const svc = tr.test_service ?? tr;
        const key = svc.id ?? svc.test_name;
        if (key == null) return;
        const prev = map.get(key) ?? { name: svc.test_name ?? "-", price: Number(svc.price) || 0, qty: 0 };
        prev.qty += qty;
        map.set(key, prev);
      });
    });
    return Array.from(map.values());
  })();
  const estTotal = estLines.reduce((a, l) => a + l.price * l.qty, 0);
​
  return (
    <div className="max-w-3xl mx-auto space-y-4">
​
      {/* Breadcrumb */}
      <button onClick={() => navigate("/customer/pengajuan-saya")}
        className="flex items-center gap-1.5 text-sm text-[#233B6E] font-semibold hover:underline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" className="w-4 h-4">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Kembali ke Pengajuan Saya
      </button>
​
      {/* ══ 1. TRACKING TIMELINE ══ */}
      <Card title={undefined}>
                        {/* Header tiket */}
        <div className="pb-4 border-b border-gray-100">
          {/* Keterangan status di pojok kanan atas */}
          <div className="flex justify-end mb-2">
            <StatusBadge status={status} />
          </div>
          {/* No. Tiket kiri & No. EPI kanan — sejajar */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-400">No. Tiket</p>
              <p className="text-xl font-extrabold text-[#233B6E] font-mono tracking-wide">
                {sub?.no_ticket ?? "-"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">No. EPI</p>
              <p className="text-lg font-extrabold text-[#233B6E] font-mono tracking-wide">
                {sub?.no_epi ?? "-"}
              </p>
            </div>
          </div>
        </div>
​
        {/* Timeline */}
        <div>
          <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-4">
            Tracking Pengajuan
          </p>
          <TrackingTimeline submissionId={id} isDone={isDone} />
        </div>
      </Card>
​
      {/* ══ 2. INFORMASI PENGAJUAN ══ */}
      <Card title="Informasi Pengajuan">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Row label="Jenis Layanan"    value={sub?.type_service} />
          <Row label="Tujuan Pengujian" value={sub?.purpose_of_test} />
          <Row label="Jumlah Sampel"    value={sub?.samples_count ?? samples.length} />
          <Row label="Tanggal Kirim"    value={fmtDate(sub?.date_of_send)} />
          <Row label="Tanggal Terima"   value={fmtDate(sub?.date_of_receive)} />
          <Row label="Perlu Diagnosis"  value={sub?.diagnosis_required ? "Ya" : "Tidak"} />
          <Row label="Nama Kurir"       value={sub?.courier_name} />
          <Row label="Kontak Kurir"     value={sub?.courier_contact} />
          <Row label="Catatan"          value={sub?.notes} />
        </div>
      </Card>
​
            {/* == 3. INFORMASI TAGIHAN == */}
      {billing && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#3B82F6]" />
          <div className="p-5 space-y-4">
            {/* Header: judul kiri + status pembayaran di pojok kanan sebaris */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">
                Informasi Tagihan
              </p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${billing.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {billing.payment_status === "paid" ? "✓ Lunas" : "⏳ Belum Dibayar"}
              </span>
            </div>
​
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Row label="Kode E-Billing"  value={billing.ebilling_code} />
              <Row label="Total Tagihan"   value={rupiah(billing.total_amount)} />
              <Row label="No. Registrasi"  value={billing.no_registration} />
              <Row label="No. EPI"         value={billing.no_epi} />
            </div>
​
            {/* Rincian estimasi harga pengujian */}
            {estLines.length > 0 && (
              <div className="bg-[#F6F7FB] rounded-xl p-4">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
                  Estimasi Harga Pengujian
                </p>
                <div className="space-y-1.5">
                  {estLines.map((l, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-[#233B6E] font-medium">{l.qty}x {l.name}</span>
                      <span className="text-gray-500 whitespace-nowrap">
                        {rupiah(l.price)} x {l.qty} = <strong className="text-[#233B6E]">{rupiah(l.price * l.qty)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-gray-200 mt-2.5 pt-2.5">
                  <span className="text-sm font-bold text-[#233B6E]">Total</span>
                  <span className="text-sm font-extrabold text-[#233B6E]">{rupiah(estTotal)}</span>
                </div>
              </div>
            )}
​
            {/* Dokumen: invoice & bukti pembayaran tetap tampil walau sudah lunas/terverifikasi */}
            {(billing.invoice_doc || billing.proof_payment) && (
              <div className="flex items-center gap-4 flex-wrap pt-1">
                {billing.invoice_doc && (
                  <a href={resolveFileUrl(billing.invoice_doc)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Lihat Invoice
                  </a>
                )}
                {billing.proof_payment && (
                  <a href={resolveFileUrl(billing.proof_payment)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-green-700 text-xs font-semibold hover:underline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Lihat Bukti Pembayaran
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
​
      {/* ══ 4. UPLOAD BUKTI PEMBAYARAN ══ */}
      {isAwaitingPay && billing && billing.payment_status !== "paid" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-sm font-bold text-blue-800">Unggah Bukti Pembayaran</p>
            <p className="text-xs text-blue-600 mt-1">
              Selesaikan pembayaran sebesar <strong>{rupiah(billing.total_amount)}</strong> dengan
              kode e-billing <strong>{billing.ebilling_code}</strong>, lalu unggah bukti di sini.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => proofRef.current.click()}
              className="border border-dashed border-blue-300 rounded-xl px-4 py-2 text-sm
                flex items-center gap-2 text-blue-600 hover:border-[#233B6E]
                hover:text-[#233B6E] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {proofFile ? proofFile.name : "Pilih File (PDF/JPG/PNG)"}
            </button>
            <input ref={proofRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => setProofFile(e.target.files[0] ?? null)} />
            {proofFile && (
              <button onClick={handleUploadProof} disabled={uploading}
                className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
                  text-sm px-5 py-2 rounded-xl transition-all disabled:opacity-60">
                {uploading ? "Mengunggah..." : "Unggah Sekarang"}
              </button>
            )}
          </div>
          {uploadMsg && (
            <p className={`text-xs font-medium ${uploadMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
              {uploadMsg}
            </p>
          )}
        </div>
      )}
​
      {/* Notif menunggu verifikasi pembayaran */}
      {isAwaitingVerif && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-5 flex items-start gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-cyan-800">Bukti Pembayaran Sedang Diverifikasi</p>
            <p className="text-xs text-cyan-600 mt-0.5">
              Bukti pembayaran Anda sudah diterima dan sedang diperiksa oleh admin.
            </p>
          </div>
        </div>
      )}
​
      {/* ══ 5. UNDUH LHU & BERI PENILAIAN ══ */}
      {isDone && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-sm font-bold text-green-800">Pengujian Selesai</p>
          </div>
          <p className="text-xs text-green-700">
            Sampel telah selesai diuji. Silakan unduh LHU dan berikan penilaian pelayanan.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleDownloadLHU} disabled={downloading}
              className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-5 py-2.5 rounded-xl
                transition-all disabled:opacity-60 shadow-sm">
              {downloading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              {downloading ? "Mengunduh..." : "Unduh LHU"}
            </button>
            <button onClick={() => navigate(`/customer/penilaian/${sub?.id}`, { state: { submission: sub } })}
              className="flex items-center gap-2 border-2 border-[#233B6E] text-[#233B6E]
                font-bold text-sm px-5 py-2.5 rounded-xl
                hover:bg-[#233B6E] hover:text-white transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Berikan Penilaian
            </button>
          </div>
        </div>
      )}
​
      {/* ══ 6. TINJAUAN LENGKAP (Step 1–3) ══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#415F9D]" />
                <button onClick={() => setOpenReview((o) => !o)}
          className="w-full flex items-center justify-between px-5 pt-4 pb-3">
          <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">
            Tinjauan Pengajuan
          </p>
          <span className="flex items-center gap-1 text-xs font-semibold text-[#233B6E]">
            {openReview ? "Sembunyikan" : "Selengkapnya"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" className={`w-3.5 h-3.5 transition-transform ${openReview ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
​
        {openReview && (
        <div className="px-5 pb-5 space-y-0">
​
          {/* ── Step 1: Data Pengajuan ── */}
          <Section title="Data Pengajuan" defaultOpen={true}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Row label="Jenis Layanan"    value={sub?.type_service} />
              <Row label="Tujuan Pengujian" value={sub?.purpose_of_test} />
              <Row label="Tanggal Kirim"    value={fmtDate(sub?.date_of_send)} />
              <Row label="Nama Kurir"       value={sub?.courier_name} />
              <Row label="Kontak Kurir"     value={sub?.courier_contact} />
              <Row label="Perlu Diagnosis"  value={sub?.diagnosis_required ? "Ya" : "Tidak"} />
              <Row label="No. Registrasi"   value={sub?.no_registration} />
              <Row label="No. EPI"          value={sub?.no_epi} />
              <Row label="No. Agenda"       value={sub?.agenda_no} />
              <Row label="No. Surat"        value={sub?.cust_letter_no} />
              <Row label="Catatan"          value={sub?.notes} />
            </div>
            {/* Dokumen pendukung */}
            {attDocs.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">
                  Dokumen Pendukung
                </p>
                <div className="flex flex-col gap-1.5">
                  {attDocs.map((doc, i) => {
                    const raw   = typeof doc === "string" ? doc : (doc?.path ?? doc?.url ?? "");
                    const url   = resolveFileUrl(raw);
                    const fname = raw.split("/").pop() || `Dokumen ${i + 1}`;
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#233B6E] text-sm font-semibold hover:underline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Lihat Dokumen Pendukung{attDocs.length > 1 ? ` ${i + 1}` : ""}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>
​
          {/* ── Step 2: Data Sampel ── */}
          <Section title={`Data Sampel — ${samples.length} sampel`}>
            {samples.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Belum ada data sampel.</p>
            ) : samples.map((s, i) => (
              <div key={s.id ?? i} className="bg-[#F6F7FB] rounded-xl p-4 space-y-3 mb-3 last:mb-0">
                <p className="text-sm font-bold text-[#233B6E]">
                  Sampel {i + 1}{s.sample_code_cust ? ` — ${s.sample_code_cust}` : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Row label="Model Sampel"      value={s.sample_model} />
                  <Row label="Total Sampel"      value={s.total_sample} />
                  <Row label="Kelompok Spesimen" value={s.specimen_group} />
                  <Row label="Jenis Spesimen"    value={s.specimen_type} />
                  <Row label="Species / Hewan"   value={s.species} />
                  <Row label="Pengawet"          value={s.preservative} />
                  <Row label="Kemasan"           value={s.packaging} />
                  <Row label="Tgl. Produksi"     value={fmtDate(s.production_date)} />
                  <Row label="Tgl. Kadaluarsa"   value={fmtDate(s.expired_date)} />
                  <Row label="Jenis Kelamin"     value={s.sex} />
                  <Row label="Umur"              value={s.age ? `${s.age} ${s.unit_age ?? ""}`.trim() : null} />
                  <Row label="Pemilik Hewan"     value={s.owner} />
                  <Row label="Jenis Lokasi"      value={s.location_type} />
                  <Row label="Lokasi Pengambilan" value={s.location_smpl} />
                  <Row label="Telah Divaksin"    value={s.is_vaccinated} />
                </div>
                {/* Jenis Pengujian */}
                {(s.test_requests ?? s.test_services)?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">
                      Jenis Pengujian
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.test_requests ?? s.test_services).map((tr, ti) => (
                        <span key={tr.id ?? ti}
                          className="bg-[#233B6E]/10 text-[#233B6E] text-[11px] font-bold px-2.5 py-1 rounded-full">
                          {tr.test_service?.test_name ?? tr.test_name ?? "-"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Section>
​
          {/* ── Step 3: Data Pelanggan ── */}
          <Section title="Data Pelanggan">
            {/* Tampilkan data yang ada walau nested customer-nya kosong.
                Minimal tampil nama, email, phone dari user_info. */}
            {!info && !sub?.user_id ? (
              <p className="text-sm text-gray-400 italic">Data pelanggan tidak tersedia.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Row label="Nama Lengkap"     value={info?.fullname} />
                <Row label="Email"            value={info?.email} />
                <Row label="No. Telepon"      value={info?.phone} />
                <Row label="Institusi"        value={info?.institution} />
                {/* Data detail (PIC, LHU, alamat) dari nested customer object */}
                <Row label="Nama PIC"            value={cust?.pic_name} />
                <Row label="Kontak PIC"          value={cust?.pic_contact} />
                <Row label="Penerima LHU"        value={cust?.lhu_receiver_name} />
                <Row label="Kontak Penerima LHU" value={cust?.lhu_receiver_contact} />
                <Row label="Provinsi"         value={cust?.province} />
                <Row label="Kota/Kab."        value={cust?.city} />
                <Row label="Kecamatan"        value={cust?.subdistrict} />
                <Row label="Kelurahan/Desa"   value={cust?.village} />
                <Row label="Kode Pos"         value={cust?.zip_code} />
                <Row label="Alamat Lengkap"   value={cust?.address} />
              </div>
            )}
          </Section>
​
        </div>
        )}
      </div>
    </div>
  );
}