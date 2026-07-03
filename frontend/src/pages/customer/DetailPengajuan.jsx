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
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-[#233B6E] mt-0.5">{value || "-"}</p>
    </div>
  );
}

/* ── Collapsible Section ── */
function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100 pt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between group"
      >
        <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">
          {title}
        </p>
        <div className="flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold
          group-hover:underline transition-colors">
          {open ? "Sembunyikan" : "Selengkapnya"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>
      {open && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}

/* ── Status Config ── */
const STATUS_MAP = {
  pending_verification:  { label: "Menunggu Verifikasi",          cls: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  approved:              { label: "Disetujui",                    cls: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  awaiting_payment:      { label: "Menunggu Pembayaran",          cls: "bg-blue-100   text-blue-700",   dot: "bg-blue-500"   },
  awaiting_verification: { label: "Menunggu Verifikasi Pembayaran", cls: "bg-cyan-100  text-cyan-700",  dot: "bg-cyan-500"   },
  in_process:            { label: "Sedang Diproses",              cls: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  done:                  { label: "Selesai",                      cls: "bg-green-100  text-green-700",  dot: "bg-green-500"  },
  rejected:              { label: "Ditolak",                      cls: "bg-red-100    text-red-600",    dot: "bg-red-500"    },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold
      px-3 py-1.5 rounded-full ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ── Stepper Alur ── */
const STEPS = [
  { key: "pending_verification",  label: "Verifikasi" },
  { key: "awaiting_payment",      label: "Pembayaran" },
  { key: "awaiting_verification", label: "Konfirmasi" },
  { key: "in_process",            label: "Pengujian"  },
  { key: "done",                  label: "Selesai"    },
];
const STATUS_ORDER = {
  pending_verification: 0, approved: 0,
  awaiting_payment: 1,
  awaiting_verification: 2,
  in_process: 3,
  processed: 3,
  done: 4,
  rejected: -1,
};

function Stepper({ status }) {
  const currentOrder = STATUS_ORDER[status] ?? 0;
  if (status === "rejected") return (
    <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      Pengajuan Ditolak
    </div>
  );
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPS.map((step, i) => {
        const order    = i;
        const isPast   = order < currentOrder;
        const isCurrent = order === currentOrder;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-xs font-semibold transition-all
              ${isCurrent
                ? "bg-[#233B6E] text-white shadow-sm"
                : isPast
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"}`}>
              {isPast && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"
                className={`w-3 h-3 flex-shrink-0 ${isPast ? "text-green-400" : "text-gray-300"}`}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DetailPengajuan() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [sub,       setSub]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const proofRef = useRef();

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch(`/customer/submissions/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSub(json.data ?? json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile) return;
    setUploading(true); setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("proof", proofFile);
      const res = await apiFetch(`/customer/billings/${id}/proof`,
        { method: "POST", body: fd });
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

  const handleDownloadLHU = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/customer/submissions/${id}/lhu/download`);
      if (!res.ok) throw new Error("Gagal mengunduh LHU.");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"),
        { href: url, download: `LHU-${id}.pdf` }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };

  const info    = sub?.user_info;
  const cust    = info?.customer;
  const samples = sub?.samples ?? [];
  const billing = sub?.billing;
  const isDone  = sub?.process_status === "done";
  const isAwaitingPay = sub?.process_status === "awaiting_payment";
  const isAwaitingVerif = sub?.process_status === "awaiting_verification";

  const attRaw  = sub?.attachment_doc;
  const attDocs = Array.isArray(attRaw) ? attRaw : (attRaw ? [attRaw] : []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Memuat data...
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm
        rounded-xl px-5 py-4 flex items-center justify-between">
        <span>Gagal memuat: {error}</span>
        <button onClick={fetchAll}
          className="text-xs font-bold hover:underline ml-4">Coba Lagi</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Breadcrumb */}
      <button onClick={() => navigate("/customer/pengajuan-saya")}
        className="flex items-center gap-1.5 text-sm text-[#233B6E] font-semibold hover:underline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" className="w-4 h-4">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Kembali ke Pengajuan Saya
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-6 space-y-5">

          {/* Header tiket + status */}
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-400">No. Tiket</p>
              <p className="text-lg font-extrabold text-[#233B6E] font-mono">
                {sub?.no_ticket ?? "-"}
              </p>
            </div>
            <StatusBadge status={sub?.process_status} />
          </div>

          {/* Stepper */}
          <div className="bg-[#F6F7FB] rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Alur Proses
            </p>
            <Stepper status={sub?.process_status} />
          </div>

          {/* Ringkasan cepat */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Jenis Layanan",    value: sub?.type_service },
              { label: "Tujuan Pengujian", value: sub?.purpose_of_test },
              { label: "Jumlah Sampel",    value: sub?.samples_count ?? samples.length },
              { label: "Tanggal Ajukan",   value: fmtDate(sub?.created_at) },
            ].map(r => (
              <div key={r.label} className="bg-[#F6F7FB] rounded-xl p-3">
                <p className="text-[10px] text-gray-400">{r.label}</p>
                <p className="text-sm font-bold text-[#233B6E] mt-0.5">{r.value || "-"}</p>
              </div>
            ))}
          </div>

          {/* ── Upload Bukti Pembayaran ──
              Tampil saat status awaiting_payment dan billing sudah ada */}
          {isAwaitingPay && billing && billing.payment_status !== "paid" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-blue-800">Unggah Bukti Pembayaran</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Selesaikan pembayaran sebesar <strong>{rupiah(billing.total_amount)}</strong> dengan
                  kode e-billing <strong>{billing.ebilling_code}</strong>, lalu unggah bukti di sini.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => proofRef.current.click()}
                  className="border border-dashed border-blue-300 rounded-xl
                    px-4 py-2 text-sm flex items-center gap-2 text-blue-600
                    hover:border-[#233B6E] hover:text-[#233B6E] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {proofFile ? proofFile.name : "Pilih File (PDF/JPG/PNG)"}
                </button>
                <input ref={proofRef} type="file"
                  accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => setProofFile(e.target.files[0] ?? null)} />
                {proofFile && (
                  <button onClick={handleUploadProof} disabled={uploading}
                    className="bg-[#233B6E] hover:bg-[#1a2d56] text-white
                      font-bold text-sm px-5 py-2 rounded-xl transition-all
                      disabled:opacity-60 disabled:cursor-not-allowed">
                    {uploading ? "Mengunggah..." : "Unggah Sekarang"}
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

          {/* Notif menunggu verifikasi pembayaran */}
          {isAwaitingVerif && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5 text-cyan-600 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <p className="text-sm font-bold text-cyan-800">Bukti Pembayaran Sedang Diverifikasi</p>
                <p className="text-xs text-cyan-600 mt-0.5">
                  Bukti pembayaran Anda sudah diterima dan sedang diperiksa oleh admin.
                  Harap tunggu konfirmasi.
                </p>
              </div>
            </div>
          )}

          {/* Billing info ringkasan (selalu tampil jika ada) */}
          {billing && (
            <div className="bg-[#F6F7FB] rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Informasi Tagihan
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Row label="Kode E-Billing"  value={billing.ebilling_code} />
                <Row label="Total Tagihan"   value={rupiah(billing.total_amount)} />
                <Row label="No. Registrasi"  value={billing.no_registration} />
                <Row label="No. EPI"         value={billing.no_epi} />
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold
                  px-2.5 py-1 rounded-full
                  ${billing.payment_status === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"}`}>
                  {billing.payment_status === "paid" ? "✓ Lunas" : "Belum Dibayar"}
                </span>
                {billing.invoice_doc && (
                  <a href={resolveFileUrl(billing.invoice_doc)} target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#233B6E]
                      text-xs font-semibold hover:underline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      className="w-3.5 h-3.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Lihat Invoice
                  </a>
                )}
              </div>
            </div>
          )}

          {/* LHU + Penilaian */}
          {isDone && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-green-800">Pengujian Selesai</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleDownloadLHU} disabled={downloading}
                  className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                    text-white font-bold text-sm px-5 py-2 rounded-xl
                    transition-all disabled:opacity-60">
                  {downloading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
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
                  {downloading ? "Mengunduh..." : "Unduh LHU"}
                </button>
                <button
                  onClick={() => navigate(`/customer/penilaian/${sub?.id}`,
                    { state: { submission: sub } })}
                  className="flex items-center gap-2 border-2 border-[#233B6E]
                    text-[#233B6E] font-bold text-sm px-5 py-2 rounded-xl
                    hover:bg-[#233B6E] hover:text-white transition-all">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="w-4 h-4">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Berikan Penilaian
                </button>
              </div>
            </div>
          )}

          {/* ── Collapsible: Step 1 ── */}
          <Section title="Data Pengajuan (Step 1)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Row label="Jenis Layanan"    value={sub?.type_service} />
              <Row label="Tujuan Pengujian" value={sub?.purpose_of_test} />
              <Row label="Tanggal Kirim"    value={fmtDate(sub?.date_of_send)} />
              <Row label="Pengambil Sampel" value={sub?.sample_taker} />
              <Row label="ID iSIKHNAS"      value={sub?.id_isikhnas} />
              <Row label="No. Agenda"       value={sub?.agenda_no} />
              <Row label="No. Surat"        value={sub?.cust_letter_no} />
              <Row label="Nama Kurir"       value={sub?.courier_name} />
              <Row label="Kontak Kurir"     value={sub?.courier_contact} />
              <Row label="Perlu Diagnosis"  value={sub?.diagnosis_required ? "Ya" : "Tidak"} />
              <Row label="Catatan"          value={sub?.notes} />
            </div>
            {attDocs.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] text-gray-400 mb-1.5">Dokumen Pendukung</p>
                <div className="flex flex-col gap-1.5">
                  {attDocs.map((doc, i) => {
                    const raw   = typeof doc === "string" ? doc : (doc?.path ?? doc?.url ?? "");
                    const url   = resolveFileUrl(raw);
                    const fname = raw.split("/").pop() || `Dokumen ${i + 1}`;
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#233B6E]
                          text-sm font-semibold hover:underline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          className="w-4 h-4 flex-shrink-0">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {fname}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* ── Collapsible: Step 2 ── */}
          <Section title={`Data Sampel (Step 2) — ${samples.length} sampel`}>
            {samples.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Belum ada data sampel.</p>
            ) : samples.map((s, i) => (
              <div key={s.id ?? i} className="bg-[#F6F7FB] rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-[#233B6E]">
                  Sampel {i + 1}{s.sample_code_cust ? ` — ${s.sample_code_cust}` : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Row label="Model Sampel"      value={s.sample_model} />
                  <Row label="Species / Hewan"   value={s.species} />
                  <Row label="Kelompok Spesimen" value={s.specimen_group} />
                  <Row label="Jenis Spesimen"    value={s.specimen_type} />
                  <Row label="Pengawet"          value={s.preservative} />
                  <Row label="Kemasan"           value={s.packaging} />
                  <Row label="Tgl. Produksi"     value={fmtDate(s.production_date)} />
                  <Row label="Tgl. Kadaluarsa"   value={fmtDate(s.expired_date)} />
                  <Row label="Jenis Kelamin"     value={s.sex} />
                  <Row label="Umur"
                    value={s.age ? `${s.age} ${s.unit_age ?? ""}`.trim() : null} />
                  <Row label="Pemilik"           value={s.owner} />
                  <Row label="Tipe Lokasi"       value={s.location_type} />
                  <Row label="Lokasi Sampel"     value={s.location_smpl} />
                  <Row label="Sudah Vaksin"      value={s.is_vaccinated} />
                  <Row label="Total Sampel"      value={s.total_sample} />
                </div>
                {s.test_requests?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1.5">Pengujian Diminta</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.test_requests.map((tr, ti) => (
                        <span key={tr.id ?? ti}
                          className="bg-[#233B6E]/10 text-[#233B6E] text-[11px]
                            font-bold px-2.5 py-1 rounded-full">
                          {tr.test_service?.test_name ?? "-"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Section>

          {/* ── Collapsible: Step 3 ── */}
          <Section title="Data Pelanggan (Step 3)">
            {!info ? (
              <p className="text-sm text-gray-400 italic">Data pelanggan tidak tersedia.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Row label="Nama Lengkap"    value={info.fullname} />
                <Row label="Email"           value={info.email} />
                <Row label="No. Telepon"     value={info.phone} />
                <Row label="Institusi"       value={info.institution} />
                <Row label="Nama PIC"        value={cust?.pic_name} />
                <Row label="Kontak PIC"      value={cust?.pic_contact} />
                <Row label="Penerima LHU"    value={cust?.lhu_receiver_name} />
                <Row label="Kontak Penerima" value={cust?.lhu_receiver_contact} />
                <Row label="Alamat"          value={cust?.address} />
                <Row label="Provinsi"        value={cust?.province} />
                <Row label="Kota/Kab."       value={cust?.city} />
                <Row label="Kecamatan"       value={cust?.subdistrict} />
                <Row label="Kelurahan/Desa"  value={cust?.village} />
                <Row label="Kode Pos"        value={cust?.zip_code} />
              </div>
            )}
          </Section>

        </div>
      </div>
    </div>
  );
}