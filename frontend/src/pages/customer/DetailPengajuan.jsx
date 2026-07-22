import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";

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

function Row({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-[#233B6E] mt-0.5">{value || "-"}</p>
    </div>
  );
}

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

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const TIMELINE_ICONS = [
  // 1. Pengajuan dibuat
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="13" x2="12" y2="18"/>
    <line x1="9" y1="15.5" x2="15" y2="15.5"/>
  </svg>,

  // 2. Diverifikasi admin
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>,

  // 3. Menunggu pembayaran
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>,

  // 4. Sedang diproses lab
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2"/>
    <path d="M9 2h6"/><path d="M6.5 14h11"/>
  </svg>,

  // 5. LHU tersedia 
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 15l2 2 4-4"/>
  </svg>,

  // 6. Berikan Penilaian
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>,
];

function TrackingTimeline({ submissionId, isDone: submissionDone }) {
  const [timeline, setTimeline] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    apiFetch(`/customer/submissions/${submissionId}/tracking`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const rawSteps = d.data?.timeline ?? [];
          const steps = submissionDone
            ? rawSteps.map((s) => ({ ...s, status: "done" }))
            : rawSteps;
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

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-400 text-xs py-3">
      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      Memuat tracking...
    </div>
  );

  if (!timeline.length) return null;

  return (
    <>
      {/* Mobile Tracking */}
      <div className="lg:hidden">
        {timeline.map((t, i) => {
          const isDone    = t.status === "done" || t.status === "completed";
          const isCurrent = t.status === "current";
          const isLast    = i === timeline.length - 1;

          return (
            <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <div className={`absolute left-5 top-10 bottom-0 w-0.5 z-0
                  ${isDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}

              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center
                justify-center flex-shrink-0 transition-all
                ${isDone
                  ? "bg-[#233B6E] text-white"
                  : isCurrent
                    ? "bg-white border-[3px] border-[#233B6E] text-[#233B6E] ring-4 ring-[#233B6E]/10"
                    : "bg-white border-2 border-gray-200 text-gray-300"}`}>
                {TIMELINE_ICONS[i] ?? <span className="text-xs font-bold">{t.step}</span>}
              </div>

              <div className="pt-1.5 min-w-0">
                <p className={`text-sm font-semibold leading-tight
                  ${isDone || isCurrent ? "text-[#233B6E]" : "text-gray-400"}`}>
                  {t.label}
                </p>
                {t.date && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(t.date)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Tracking */}
      <div className="hidden lg:block w-full pb-1">
        <div className="flex items-start justify-between">
          {timeline.map((t, i) => {
            const isDone     = t.status === "done" || t.status === "completed";
            const isCurrent  = t.status === "current";
            const isLast     = i === timeline.length - 1;
            const lineBeforeDone = isDone || isCurrent;

            return (
              <div key={i}
                className="relative flex flex-col items-center flex-1 min-w-0">

                {i > 0 && (
                  <div className={`absolute top-[18px] right-1/2 w-1/2 h-1 z-0
                    ${lineBeforeDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
                )}
                {!isLast && (
                  <div className={`absolute top-[18px] left-1/2 w-1/2 h-1 z-0
                    ${isDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
                )}

                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center
                  justify-center flex-shrink-0 transition-all
                  ${isDone
                    ? "bg-[#233B6E] text-white"
                    : isCurrent
                      ? "bg-white border-[3px] border-[#233B6E] text-[#233B6E] ring-4 ring-[#233B6E]/10"
                      : "bg-white border-2 border-gray-200 text-gray-300"}`}>
                  {TIMELINE_ICONS[i] ?? <span className="text-xs font-bold">{t.step}</span>}
                </div>

                <p className={`relative z-10 w-full text-[10px] text-center mt-2 leading-tight px-1
                  font-semibold break-words
                  ${isDone || isCurrent ? "text-[#233B6E]" : "text-gray-400"}`}>
                  {t.label}
                </p>

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
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-t border-gray-100">
      <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider py-3">{title}</p>
      <div className="pb-4 space-y-3">{children}</div>
    </div>
  );
}

export default function DetailPengajuan() {
  const { id }   = useParams();
  const navigate = useNavigate();

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

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    apiFetch("/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setProfile(data.profile ?? data); })
      .catch(() => {});
  }, []);

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

      if (!subData.billing) {
        try {
          const bRes = await apiFetch(`/customer/billings/${id}`);
          if (bRes.ok) {
            const bJson = await bRes.json();
            const bill  = bJson.billing ?? bJson.data ?? bJson;
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

  const handleUploadProof = async () => {
    if (!proofFile) return;
    if (proofFile.size > 5 * 1024 * 1024) {
      setUploadMsg("✗ Ukuran file terlalu besar (maks 5MB). Perkecil / kompres file lalu coba lagi.");
      return;
    }
    setUploading(true); setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("proof", proofFile);
      const res = await apiFetch(`/customer/billings/${id}/proof`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Gagal mengunggah (kode ${res.status}).`);
      }
      setUploadMsg("✓ Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.");
      setProofFile(null);
      fetchAll();
    } catch (e) {
      const msg = /failed to fetch|load failed|networkerror/i.test(e.message ?? "")
        ? "Gagal terhubung ke server. Cek koneksi internet & pastikan ukuran file tidak terlalu besar (maks 5MB), lalu coba lagi."
        : e.message;
      setUploadMsg(`✗ ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadLHU = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/customer/submissions/${id}/lhu/download`);
      if (!res.ok) throw new Error("Gagal mengunduh LHU.");
      const json = await res.json();
      const downloadUrl = json?.data?.download_url;
      if (!downloadUrl) throw new Error("Tautan LHU tidak tersedia.");
      window.open(resolveFileUrl(downloadUrl), "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };

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

  if (error) return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-5 py-4 flex items-center justify-between">
        <span>Gagal memuat: {error}</span>
        <button onClick={fetchAll} className="text-xs font-bold hover:underline ml-4">Coba Lagi</button>
      </div>
    </div>
  );

  const status        = sub?.process_status;

  const prof = profile ?? {};
  const profUser = prof.fullname || prof.email ? prof : (prof.User ?? {});
  const profCust = prof.fullname || prof.email ? (prof.customer ?? {}) : prof;
  const info = sub?.user_info ?? sub?.user ?? (profile ? profUser : null);
  const cust = info?.customer ?? info?.Customer ?? info?.profile ?? profCust;
  const samples       = sub?.samples ?? [];
  const billing       = sub?.billing;
  const isDone        = status === "done";
  const isAwaitingPay = status === "awaiting_payment";
  const isAwaitingVerif = status === "awaiting_verification";
  const attRaw        = sub?.attachment_doc;
  const attDocs       = Array.isArray(attRaw) ? attRaw : (attRaw ? [attRaw] : []);

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

  return (
    <div className="space-y-4">

      <button onClick={() => navigate("/customer/pengajuan-saya")}
        className="flex items-center gap-1.5 text-sm text-[#233B6E] font-semibold hover:underline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" className="w-4 h-4">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Kembali ke Pengajuan Saya
      </button>

      {/* 1. Tracking Timeline */}
      <Card title={undefined}>
        <div className="pb-4 border-b border-gray-100">
          <div className="flex justify-end mb-2">
            <StatusBadge status={status} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">No. Tiket</p>
              <p className="text-lg sm:text-xl font-extrabold text-[#233B6E] font-mono tracking-wide break-all">
                {sub?.no_ticket ?? "-"}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-400">No. EPI</p>
              <p className="text-lg font-extrabold text-[#233B6E] font-mono tracking-wide break-all">
                {sub?.no_epi ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-4">
            Tracking Pengajuan
          </p>
          <TrackingTimeline submissionId={id} isDone={isDone} />
        </div>
      </Card>

      {/* 2. Informasi Pengajuan */}
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

      {/* 3. Informasi Tagihan */}
      {billing && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#3B82F6]" />
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">
                Informasi Tagihan
              </p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${billing.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {billing.payment_status === "paid" ? "✓ Lunas" : "⏳ Belum Dibayar"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Row label="Kode E-Billing"  value={billing.ebilling_code} />
              <Row label="Total Tagihan"   value={rupiah(billing.total_amount)} />
              <Row label="No. Registrasi"  value={sub?.no_registration} />
              <Row label="No. EPI"         value={sub?.no_epi} />
            </div>

            {/* Rincian estimasi harga pengujian */}
            {estLines.length > 0 && (
              <div className="bg-[#F6F7FB] rounded-xl p-4">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
                  Estimasi Harga Pengujian
                </p>

                <div className="sm:hidden divide-y divide-gray-200/70">
                  {estLines.map((l, i) => (
                    <div key={i} className="py-2.5 flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 break-words">{l.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{rupiah(l.price)} × {l.qty} sampel</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{rupiah(l.price * l.qty)}</span>
                    </div>
                  ))}
                  <div className="py-2 flex justify-between items-center border-t border-gray-200">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Estimasi Total</span>
                    <span className="text-sm font-semibold text-[#233B6E] whitespace-nowrap">{rupiah(estTotal)}</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Tagihan</span>
                    <span className="text-sm font-semibold text-[#233B6E] whitespace-nowrap">{rupiah(billing.total_amount)}</span>
                  </div>
                </div>

                <table className="hidden sm:table w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-200">
                      <th className="py-2 pr-3 font-semibold">Pengujian</th>
                      <th className="py-2 px-3 font-semibold text-right">Harga Satuan</th>
                      <th className="py-2 px-3 font-semibold text-center">Jml Sampel</th>
                      <th className="py-2 pl-3 font-semibold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/70">
                    {estLines.map((l, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 text-gray-700">{l.name}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{rupiah(l.price)}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{l.qty}</td>
                        <td className="py-2 pl-3 text-right font-semibold text-gray-800">{rupiah(l.price * l.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="py-2.5 pr-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Estimasi Total</td>
                      <td className="py-2.5 pl-3 text-right text-sm font-semibold text-[#233B6E]">{rupiah(estTotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1.5 pr-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Tagihan</td>
                      <td className="py-1.5 pl-3 text-right text-sm font-semibold text-[#233B6E]">{rupiah(billing.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="text-[11px] text-gray-400 mt-2 italic">*Estimasi berdasarkan tarif layanan &amp; jumlah sampel. Total tagihan final ditetapkan admin.</p>
              </div>
            )}

            {/* Dokumen invoice & bukti pembayaran */}
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

      {/* 4. Upload Bukri Pembayaran */}
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
          <p className="text-[11px] text-blue-400">Format: PDF/JPG/PNG, maks 5MB.</p>
          {uploadMsg && (
            <p className={`text-xs font-medium ${uploadMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
              {uploadMsg}
            </p>
          )}
        </div>
      )}

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

      {/* 5. Unduh LHU & Penilaian */}
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

      {/* 6. Tinjauan */}
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

        {openReview && (
        <div className="px-5 pb-5 space-y-0">

          {/* Step 1: Data Pengajuan */}
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

          {/* Step 2: Data Sampel */}
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

          {/* Step 3: Data Pelanggan */}
          <Section title="Data Pelanggan">
            {!info && !sub?.user_id ? (
              <p className="text-sm text-gray-400 italic">Data pelanggan tidak tersedia.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Row label="Nama Lengkap"     value={info?.fullname} />
                <Row label="Email"            value={info?.email} />
                <Row label="No. Telepon"      value={info?.phone} />
                <Row label="Institusi"        value={info?.institution} />
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
        </div>
        )}
      </div>
    </div>
  );
}