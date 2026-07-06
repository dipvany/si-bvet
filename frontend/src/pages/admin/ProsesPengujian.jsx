import { useState, useEffect, useMemo, useRef } from "react";
import {
  getAdminSubmissions, getSubmissionByID,
  createBilling, updateBilling,
  getBilling, verifyPayment, rejectPayment,
} from "../../services/adminServices";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";
​
/* ══════════════════════════════
   STATUS CONFIG — sesuai backend
   approved          → billing dibuat         → awaiting_payment
   awaiting_payment  → customer upload proof  → awaiting_verification
   awaiting_verification → admin verify       → processed
   awaiting_verification → admin reject       → payment_rejected
   processed         → admin upload LHU       → done
══════════════════════════════ */
const STATUS_CONFIG = {
  approved:              { label: "Disetujui",                      bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500",  order: 0 },
  awaiting_payment:      { label: "Menunggu Pembayaran",            bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   order: 1 },
  awaiting_verification: { label: "Verifikasi Pembayaran",           bg: "bg-cyan-100",   text: "text-cyan-700",   dot: "bg-cyan-500",   order: 2 },
  processed:             { label: "Pembayaran Diterima",             bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", order: 3 },
  payment_rejected:      { label: "Pembayaran Ditolak",             bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    order: -1 },
  done:                  { label: "Pembayaran Diterima",             bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  order: 4 },
};
​
const ACTIVE_STATUSES = [
  "approved", "awaiting_payment", "awaiting_verification",
  "processed", "payment_rejected", "done"
];
​
const PER_PAGE = 20;
​
const safeJson = async (res) => {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch { return {}; }
};
​
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n ?? 0);
​
/* ── Komponen kecil ── */
function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}
​
function Spinner({ sm }) {
  return (
    <svg className={`animate-spin ${sm ? "w-3.5 h-3.5" : "w-4 h-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}
​
function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const cls = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${cls}`}>
      <span>{msg}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M1 1l12 12M13 1L1 13"/>
          </svg>
        </button>
      )}
    </div>
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
function PBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-medium
        transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active ? "bg-[#233B6E] text-white border-[#233B6E]" : "border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
      {children}
    </button>
  );
}
​
/* ── helpers ── */
const fmtDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};
​
/* ── Stepper icons (sesuai urutan STEPS) ── */
const STEP_ICONS = [
  /* Disetujui */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>,
  /* Pembayaran */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>,
  /* Verifikasi */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>,
  /* Pengujian */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2"/><path d="M9 2h6"/><path d="M6 14h12"/>
  </svg>,
  /* Selesai */
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>,
];
​
function StepBar({ status }) {
  const STEPS = [
    { key: "approved",              label: "Disetujui"  },
    { key: "awaiting_payment",      label: "Pembayaran" },
    { key: "awaiting_verification", label: "Verifikasi" },
    { key: "processed",             label: "Pengujian"  },
    { key: "done",                  label: "Selesai"    },
  ];
​
  const currentOrder = STATUS_CONFIG[status]?.order ?? 0;
​
  if (status === "payment_rejected") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-4">Alur Proses</p>
        <div className="flex items-center gap-2 text-sm text-red-600 font-semibold">
          <span className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          Pembayaran Ditolak — Menunggu Upload Ulang dari Pelanggan
        </div>
      </div>
    );
  }
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-5">Alur Proses</p>
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const order     = STATUS_CONFIG[step.key]?.order ?? 0;
          const isDone    = order < currentOrder;
          const isCurrent = step.key === status;
          const isPending = order > currentOrder;
          const isLast    = i === STEPS.length - 1;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* connecting line — kiri */}
              {i > 0 && (
                <div className={`absolute top-[18px] right-1/2 w-1/2 h-0.5 
                  ${isDone || isCurrent ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
              {/* connecting line — kanan */}
              {!isLast && (
                <div className={`absolute top-[18px] left-1/2 w-1/2 h-0.5 
                  ${isDone ? "bg-[#233B6E]" : "bg-gray-200"}`} />
              )}
              {/* circle icon */}
              <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center
                transition-all flex-shrink-0
                ${isDone    ? "bg-[#233B6E] text-white shadow-sm"
                : isCurrent ? "bg-white border-2 border-[#233B6E] text-[#233B6E] ring-4 ring-[#233B6E]/10"
                :              "bg-white border-2 border-gray-200 text-gray-300"}`}>
                {isDone
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                  : STEP_ICONS[i]
                }
              </div>
              {/* label */}
              <p className={`mt-2 text-[11px] font-semibold text-center leading-tight px-1
                ${isDone || isCurrent ? "text-[#233B6E]" : "text-gray-400"}`}>
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
/* ── Estimasi Harga — card terpisah ── */
function EstimasiCard({ full }) {
  if (!full) return null;
  const samples = full.samples ?? [];
  const estLines = [];
  samples.forEach(s => {
    const qty = Number(s.total_sample) || 0;
    (s.test_requests ?? []).forEach(tr => {
      const svc = tr.test_service ?? tr;
      estLines.push({ name: svc?.test_name ?? "-", price: Number(svc?.price) || 0, qty });
    });
  });
  if (estLines.length === 0) return null;
  const estTotal = estLines.reduce((a, l) => a + l.price * l.qty, 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#233B6E] to-[#415F9D]" />
      <div className="p-5 sm:p-6">
        <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-4">Estimasi Harga Pengujian</p>
        {/* Mobile: daftar bertumpuk biar tak perlu geser */}
        <div className="sm:hidden divide-y divide-gray-100">
          {estLines.map((l, i) => (
            <div key={i} className="py-3 flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 break-words">{l.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{rupiah(l.price)} × {l.qty} sampel</p>
              </div>
              <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{rupiah(l.price * l.qty)}</span>
            </div>
          ))}
          <div className="py-3 flex justify-between items-center border-t border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estimasi Total</span>
            <span className="text-sm font-bold text-[#233B6E] whitespace-nowrap">{rupiah(estTotal)}</span>
          </div>
        </div>
​
        {/* Desktop: tabel */}
        <table className="hidden sm:table w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="py-2 pr-3 font-semibold">Pengujian</th>
              <th className="py-2 px-3 font-semibold text-right">Harga Satuan</th>
              <th className="py-2 px-3 font-semibold text-center">Jml Sampel</th>
              <th className="py-2 pl-3 font-semibold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
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
              <td colSpan={3} className="py-2.5 pr-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Estimasi Total</td>
              <td className="py-2.5 pl-3 text-right text-sm font-semibold text-[#233B6E]">{rupiah(estTotal)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-[11px] text-gray-400 mt-2 italic">*Estimasi berdasarkan tarif layanan &amp; jumlah sampel. Total tagihan final ditetapkan admin.</p>
      </div>
    </div>
  );
}
​
/* ── Tinjauan card — step 1, 2, 3 ── */
function TinjauanCard({ full }) {
  if (!full) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">Tinjauan Pengajuan</p>
      <div className="flex items-center gap-2 text-gray-400 text-xs"><Spinner sm />Memuat tinjauan...</div>
    </div>
  );
​
  const info  = full.user_info;
  const cust  = info?.customer;
  const samples = full.samples ?? [];
  const attRaw  = full.attachment_doc;
  const attDocs = Array.isArray(attRaw) ? attRaw : (attRaw ? [attRaw] : []);
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#233B6E] to-[#415F9D]" />
      <div className="p-5 sm:p-6 space-y-6">
        <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider">Tinjauan Pengajuan</p>
​
        {/* ── STEP 1 — Data Pengajuan ── */}
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#233B6E] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">1</span>
            Data Pengajuan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            {[
              { label: "Jenis Layanan",    val: full.type_service },
              { label: "Tujuan Pengujian", val: full.purpose_of_test },
              { label: "Tanggal Kirim",    val: fmtDate(full.date_of_send) },
              { label: "Pengambil Sampel", val: full.sample_taker },
              { label: "Nama Kurir",       val: full.courier_name },
              { label: "Kontak Kurir",     val: full.courier_contact },
              { label: "No. Agenda",       val: full.agenda_no },
              { label: "No. Surat Cust.",  val: full.cust_letter_no },
              { label: "ID iSIKHNAS",      val: full.id_isikhnas },
              { label: "Perlu Diagnosis",  val: full.diagnosis_required ? "Ya" : "Tidak" },
              { label: "Catatan",          val: full.notes },
            ].map(r => (
              <InfoRow key={r.label} label={r.label} value={r.val} />
            ))}
          </div>
          {attDocs.length > 0 && (
            <div className="mt-2 flex gap-3 py-2.5 border-b border-gray-50">
              <span className="text-xs text-gray-400 w-40 flex-shrink-0">Dokumen Pendukung</span>
              <div className="flex flex-col gap-1">
                {attDocs.map((doc, i) => {
                  const raw  = typeof doc === "string" ? doc : (doc?.path ?? "");
                  const url  = resolveFileUrl(raw);
                  const name = raw.split("/").pop() || `Dokumen ${i + 1}`;
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#233B6E] text-sm font-semibold hover:underline">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
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
        {/* ── STEP 2 — Data Sampel ── */}
        <section className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#233B6E] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">2</span>
            Data Sampel ({samples.length} sampel)
          </p>
          {samples.length === 0
            ? <p className="text-xs text-gray-400 italic">Tidak ada data sampel.</p>
            : samples.map((s, i) => (
              <div key={s.id ?? i} className="bg-[#F6F7FB] rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-[#233B6E] mb-2">
                  Sampel {i + 1}{s.sample_code_cust ? ` — ${s.sample_code_cust}` : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-0">
                  {[
                    { label: "Model",        val: s.sample_model },
                    { label: "Species",      val: s.species },
                    { label: "Spesimen",     val: s.specimen_type },
                    { label: "Kelompok",     val: s.specimen_group },
                    { label: "Pengawet",     val: s.preservative },
                    { label: "Kemasan",      val: s.packaging },
                    { label: "Kondisi",      val: s.condition },
                    { label: "Jml Sampel",   val: s.total_sample },
                    { label: "Tgl. Produksi",val: fmtDate(s.production_date) },
                    { label: "Tgl. Expired", val: fmtDate(s.expired_date) },
                    { label: "Pemilik",      val: s.owner },
                    { label: "Lokasi",       val: s.location_smpl },
                  ].map(r => <InfoRow key={r.label} label={r.label} value={r.val} />)}
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
          ))}
        </section>
​
        {/* ── STEP 3 — Data Pelanggan ── */}
        {info && (
          <section className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#233B6E] text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">3</span>
              Data Pelanggan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
              {[
                { label: "Nama Lengkap",   val: info.fullname },
                { label: "Email",          val: info.email },
                { label: "No. Telepon",    val: info.phone },
                { label: "Institusi",      val: info.institution },
                { label: "Nama PIC",       val: cust?.pic_name },
                { label: "Kontak PIC",     val: cust?.pic_contact },
                { label: "Penerima LHU",   val: cust?.lhu_receiver_name },
                { label: "Kontak Penerima",val: cust?.lhu_receiver_contact },
                { label: "Alamat",         val: cust?.address },
                { label: "Kota",           val: cust?.city },
                { label: "Provinsi",       val: cust?.province },
                { label: "Kode Pos",       val: cust?.zip_code },
              ].map(r => <InfoRow key={r.label} label={r.label} value={r.val} />)}
            </div>
          </section>
        )}
​
      </div>
    </div>
  );
}
​
/* ══════════════════════════════════════════════════════════════════
   DETAIL
══════════════════════════════════════════════════════════════════ */
function DetailProses({ submission: initialSub, onBack, onUpdated }) {
  const [sub,          setSub]          = useState(initialSub);
  const [fullSub,      setFullSub]      = useState(null);   // lengkap dari GET /admin/submissions/:id
  const [billing,      setBilling]      = useState(null);
  const [loadBill,     setLoadBill]     = useState(true);
  const [actionLoad,   setActionLoad]   = useState(false);
  const [savingBill,   setSavingBill]   = useState(false);
  const [uploadingLHU, setUploadingLHU] = useState(false);
  const [err,          setErr]          = useState("");
  const [ok,           setOk]           = useState("");
  const [showBillForm, setShowBillForm] = useState(false);
  const [billForm,     setBillForm]     = useState({
    ebilling_code: "", total_amount: "", no_registration: "", no_epi: "",
  });
  const [lhuForm, setLhuForm] = useState({ no_lhu: "", file: null });
  const lhuRef = useRef();
​
  const status                = sub.process_status;
  const isReviewing           = status === "approved";
  const isAwaitingPay         = status === "awaiting_payment";
  const isAwaitingVerif       = status === "awaiting_verification";
  const isProcessed           = status === "processed";
  const isPaymentRejected     = status === "payment_rejected";
  const isDone                = status === "done";
​
  /* fetch full submission (tinjauan) + billing */
  useEffect(() => {
    (async () => {
      // Full submission — GET /admin/submissions/:id
      // Mengembalikan user_info (+ customer), samples (+ test_requests), billing, lhu
      try {
        const res = await getSubmissionByID(sub.id);
        const j   = await safeJson(res);
        if (res.ok) setFullSub(j.data ?? j);
      } catch {}
​
      // Billing terpisah
      setLoadBill(true);
      try {
        const res = await getBilling(sub.id);
        const j   = await safeJson(res);
        if (res.ok) {
          const b = j.billing ?? j.data ?? j;
          if (b && b.ebilling_code) {
            setBilling(b);
            setBillForm({
              ebilling_code:   b.ebilling_code   ?? "",
              total_amount:    String(b.total_amount ?? ""),
              no_registration: b.no_registration ?? "",
              no_epi:          b.no_epi          ?? "",
            });
          }
        }
      } catch {}
      finally { setLoadBill(false); }
    })();
  }, [sub.id]);
​
  /* Simpan billing → backend otomatis ubah status ke awaiting_payment */
  const handleSaveBilling = async (e) => {
    e.preventDefault();
    if (!billForm.ebilling_code) { setErr("Kode e-billing wajib diisi."); return; }
    if (!billForm.total_amount)  { setErr("Total tagihan wajib diisi."); return; }
    setSavingBill(true); setErr(""); setOk("");
    try {
      const body = {
        ebilling_code:   billForm.ebilling_code,
        total_amount:    Number(billForm.total_amount),
        no_registration: billForm.no_registration,
        no_epi:          billForm.no_epi,
      };
      const res  = billing
        ? await updateBilling(sub.id, body)
        : await createBilling(sub.id, body);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menyimpan tagihan.");
​
      setBilling(json.billing ?? json.data ?? body);
      /* createBilling → backend set process_status = "awaiting_payment" */
      if (!billing) {
        setSub(p => ({ ...p, process_status: "awaiting_payment" }));
        onUpdated(sub.id, "awaiting_payment");
      }
      setOk(billing ? "Tagihan berhasil diperbarui." : "Tagihan disimpan. Status: Menunggu Pembayaran.");
      setShowBillForm(false);
    } catch (e) { setErr(e.message); }
    finally { setSavingBill(false); }
  };
​
  /* Verifikasi pembayaran → backend set process_status = "processed" */
  const handleVerifyPayment = async () => {
    if (!window.confirm("Verifikasi pembayaran? Status akan berubah ke Sedang Diproses.")) return;
    setActionLoad(true); setErr(""); setOk("");
    try {
      const res  = await verifyPayment(sub.id);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal verifikasi.");
      setSub(p => ({ ...p, process_status: "processed" }));
      onUpdated(sub.id, "processed");
      setOk("Pembayaran terverifikasi. Status: Sedang Diproses.");
    } catch (e) { setErr(e.message); }
    finally { setActionLoad(false); }
  };
​
  /* Tolak pembayaran → backend set process_status = "payment_rejected" */
  const handleRejectPayment = async () => {
    if (!window.confirm("Tolak pembayaran? Pelanggan perlu upload ulang.")) return;
    setActionLoad(true); setErr(""); setOk("");
    try {
      const res  = await rejectPayment(sub.id);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menolak.");
      setSub(p => ({ ...p, process_status: "payment_rejected" }));
      onUpdated(sub.id, "payment_rejected");
      setOk("Pembayaran ditolak. Pelanggan perlu upload ulang.");
    } catch (e) { setErr(e.message); }
    finally { setActionLoad(false); }
  };
​
  /* Upload LHU → backend set process_status = "done" */
  const handleUploadLHU = async (e) => {
    e.preventDefault();
    if (!lhuForm.no_lhu) { setErr("Nomor LHU wajib diisi."); return; }
    if (!lhuForm.file)   { setErr("File LHU wajib diunggah."); return; }
    setUploadingLHU(true); setErr(""); setOk("");
    try {
      const fd = new FormData();
      fd.append("no_lhu", lhuForm.no_lhu);
      fd.append("file",   lhuForm.file);
      const res  = await apiFetch(`/admin/submissions/${sub.id}/lhu`, { method: "POST", body: fd });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal upload LHU.");
      setSub(p => ({ ...p, process_status: "done" }));
      onUpdated(sub.id, "done");
      setOk("LHU berhasil diunggah. Pengujian selesai.");
      setLhuForm({ no_lhu: "", file: null });
    } catch (e) { setErr(e.message); }
    finally { setUploadingLHU(false); }
  };
​
  /* ── panel billing ── */
  const BillingPanel = () => loadBill ? (
    <div className="flex items-center gap-2 text-gray-400 text-xs"><Spinner sm />Memuat tagihan...</div>
  ) : billing ? (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-2">Data Tagihan</p>
      <InfoRow label="Kode e-Billing"  value={billing.ebilling_code} />
      <InfoRow label="Total Tagihan"   value={rupiah(billing.total_amount)} />
      <InfoRow label="No. Registrasi"  value={billing.no_registration} />
      <InfoRow label="No. EPI"         value={billing.no_epi} />
      <div className="flex gap-3 py-2.5">
        <span className="text-xs text-gray-400 w-40 flex-shrink-0">Bukti Pembayaran</span>
        <span className="text-sm font-medium flex-1">
          {billing.proof_payment ? (
            <a href={resolveFileUrl(billing.proof_payment)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#233B6E] font-semibold hover:underline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Lihat Bukti Pembayaran
            </a>
          ) : (
            <span className="text-orange-500 text-xs">Belum diunggah pelanggan</span>
          )}
        </span>
      </div>
    </div>
  ) : null;
​
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-[#233B6E] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#233B6E]">Detail Proses Pembayaran</h1>
            <StatusPill status={status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{sub.no_ticket ?? `#${sub.id}`}</p>
        </div>
      </div>
​
      {/* Alur Proses — stepper dengan ikon */}
      <StepBar status={status} />
​
      <div className="space-y-5">
        {/* Panel aksi */}
        <div className="space-y-4">
          <Alert type="error"   msg={err} onClose={() => setErr("")} />
          <Alert type="success" msg={ok}  onClose={() => setOk("")} />
​
          {/* 1. DISETUJUI */}
          {isReviewing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-orange-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-orange-800">Tahap: Kaji Ulang</p>
                  <p className="text-xs text-orange-600 mt-1">Tinjau pengajuan. Isi data tagihan untuk lanjut ke tahap pembayaran.</p>
                </div>
                <button onClick={() => setShowBillForm(p => !p)}
                  className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Lanjut ke Proses Pembayaran
                </button>
                {showBillForm && (
                  <form onSubmit={handleSaveBilling} className="pt-4 border-t border-gray-100 space-y-4">
                    <p className="text-xs font-bold text-[#233B6E] uppercase tracking-wider">Input Data Tagihan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "ebilling_code",   label: "Kode e-Billing",     req: true, ph: "EB-001" },
                        { key: "total_amount",    label: "Total Tagihan (Rp)", req: true, ph: "250000", type: "number" },
                        { key: "no_registration", label: "No. Registrasi",     ph: "REG-001" },
                        { key: "no_epi",          label: "No. EPI",            ph: "EPI-001" },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            {f.label}{f.req && <span className="text-red-400 ml-0.5">*</span>}
                          </label>
                          <input type={f.type ?? "text"} value={billForm[f.key]}
                            onChange={e => setBillForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.ph}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowBillForm(false)}
                        className="px-4 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl">Batal</button>
                      <button type="submit" disabled={savingBill}
                        className="flex items-center gap-2 bg-[#233B6E] text-white font-bold text-sm px-5 py-2 rounded-xl disabled:opacity-60">
                        {savingBill ? <><Spinner sm />Menyimpan...</> : "Simpan & Lanjutkan"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
​
          {/* 2. MENUNGGU PEMBAYARAN */}
          {isAwaitingPay && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-blue-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-blue-800">Tahap: Menunggu Pembayaran</p>
                  <p className="text-xs text-blue-600 mt-1">Menunggu pelanggan mengunggah bukti pembayaran.</p>
                </div>
                <BillingPanel />
              </div>
            </div>
          )}
​
          {/* 3. MENUNGGU VERIFIKASI */}
          {isAwaitingVerif && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-cyan-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-cyan-800">Tahap: Verifikasi Pembayaran</p>
                  <p className="text-xs text-cyan-600 mt-1">Pelanggan sudah mengunggah bukti. Periksa lalu verifikasi atau tolak.</p>
                </div>
                <BillingPanel />
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleVerifyPayment}
                    disabled={actionLoad || !billing?.proof_payment}
                    title={!billing?.proof_payment ? "Belum ada bukti pembayaran" : undefined}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                    {actionLoad ? <Spinner sm /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>}
                    Verifikasi Pembayaran
                  </button>
                  <button onClick={handleRejectPayment} disabled={actionLoad}
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm px-4 py-2.5 rounded-xl border border-red-200 disabled:opacity-60 disabled:cursor-not-allowed">
                    Tolak Pembayaran
                  </button>
                </div>
              </div>
            </div>
          )}
​
          {/* 4. PEMBAYARAN DITOLAK */}
          {isPaymentRejected && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-red-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-red-700">Pembayaran Ditolak</p>
                  <p className="text-xs text-red-500 mt-1">Pelanggan perlu mengunggah ulang bukti pembayaran.</p>
                </div>
                <BillingPanel />
              </div>
            </div>
          )}
​
          {/* 5. SEDANG DIPROSES */}
          {isProcessed && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-purple-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-purple-800">Tahap: Pembayaran Diterima</p>
                  <p className="text-xs text-purple-600 mt-1">Pembayaran sudah diterima. Pengajuan lanjut ke menu Proses Pengujian untuk pengujian dan unggah LHU.</p>
                </div>
                <BillingPanel />
              </div>
            </div>
          )}
​
          {/* 6. SELESAI */}
          {isDone && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-green-400" />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 text-sm text-green-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Pembayaran diterima. Proses pengujian dan unggah LHU dilakukan di menu <strong className="mx-1">Proses Pengujian</strong>.
                </div>
                <BillingPanel />
              </div>
            </div>
          )}
        </div>
        {/* Informasi Pengajuan */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-[#233B6E]" />
            <div className="p-5">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">Informasi Pengajuan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
                <InfoRow label="No. Tiket"        value={sub.no_ticket} />
                <InfoRow label="No. Registrasi"   value={sub.no_registration} />
                <InfoRow label="No. EPI"          value={sub.no_epi} />
                <InfoRow label="Jenis Layanan"    value={sub.type_service} />
                <InfoRow label="Tujuan Pengujian" value={sub.purpose_of_test} />
                <InfoRow label="Jumlah Sampel"    value={sub.samples_count} />
              </div>
            </div>
          </div>
        </div>
​
      </div>
​
      {/* ✅ TINJAUAN PENGAJUAN — FULL WIDTH di bawah grid */}
      <TinjauanCard full={fullSub} />
      <EstimasiCard full={fullSub} />
    </div>
  );
}
​
/* ══════════════════════════════════════════════════════════════════
   HALAMAN UTAMA
══════════════════════════════════════════════════════════════════ */
export default function ProsesPengujian() {
  const [submissions,  setSubmissions]  = useState([]);
  const [meta,         setMeta]         = useState({ page: 1, total: 0, total_pages: 1 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected,     setSelected]     = useState(null);
​
  useEffect(() => { fetchData(page); }, [page]);
​
  const fetchData = async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res  = await getAdminSubmissions(`?page=${p}&per_page=${PER_PAGE}`);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      const inner    = json.data ?? {};
      const filtered = (inner.data ?? []).filter(s => ACTIVE_STATUSES.includes(s.process_status));
      setSubmissions(filtered);
      setMeta(inner.meta ?? { page: p, total: filtered.length, total_pages: 1 });
    } catch (err) {
      setError(err.message ?? "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };
​
  const handleUpdated = (id, newStatus) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, process_status: newStatus } : s));
    setSelected(prev => prev?.id === id ? { ...prev, process_status: newStatus } : prev);
  };
​
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter(s => {
      const matchStatus = filterStatus === "all" || (STATUS_CONFIG[s.process_status]?.label ?? s.process_status) === filterStatus;
      const matchSearch = !q ||
        s.no_ticket?.toLowerCase().includes(q) ||
        s.type_service?.toLowerCase().includes(q) ||
        s.purpose_of_test?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, search, filterStatus]);
​
  const countByStatus = useMemo(() => {
    const map = { all: submissions.length };
    submissions.forEach(s => {
      const key = STATUS_CONFIG[s.process_status]?.label ?? s.process_status;
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [submissions]);
​
  if (selected) {
    return (
      <DetailProses
        submission={selected}
        onBack={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    );
  }
​
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#233B6E]">Proses Pembayaran</h1>
        </div>
        <button onClick={() => fetchData(page)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#233B6E] bg-[#EEF0F8] hover:bg-[#dde0f0] px-3 py-2 rounded-lg transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>
​
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => fetchData(page)} className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
        </div>
      )}
​
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "Semua" }, ...Array.from(new Set(ACTIVE_STATUSES.map(s => STATUS_CONFIG[s]?.label ?? s))).map(lbl => ({ value: lbl, label: lbl }))].map(opt => (
          <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
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
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center gap-3 flex-wrap">
          <p className="text-xs text-gray-400">
            <span className="font-bold text-[#233B6E]">{filtered.length}</span> pengajuan dalam proses
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari no. tiket atau layanan..."
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] w-56" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Status:</span>
              <div className="relative">
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-40 truncate appearance-none border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white pl-3 pr-7 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                  <option value="all">Semua Status</option>
                  {Array.from(new Set(ACTIVE_STATUSES.map(s => STATUS_CONFIG[s]?.label ?? s))).map(lbl => (
                    <option key={lbl} value={lbl}>{lbl}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "No. Tiket", "Jenis Layanan", "Tujuan Pengujian", "Jml Sampel", "Status", "Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center">
                  <span className="flex items-center justify-center gap-2 text-gray-400 text-sm"><Spinner />Memuat data...</span>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center text-gray-400 text-sm">
                  {search || filterStatus !== "all" ? "Tidak ada hasil yang cocok." : "Belum ada pengajuan dalam proses."}
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-[#F6F7FB] transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}.</td>
                  <td className="px-4 py-3"><span className="font-mono font-bold text-[#233B6E] text-xs">{s.no_ticket ?? "-"}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.type_service ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px]"><span className="line-clamp-1">{s.purpose_of_test ?? "-"}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EEF0F8] text-[#233B6E] text-xs font-bold">{s.samples_count ?? 0}</span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={s.process_status} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelected(s)}
                      className="inline-flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold hover:underline whitespace-nowrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                      Kelola
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">Halaman {page} dari {meta.total_pages}</span>
          <div className="flex items-center gap-1">
            <PBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M15 18l-6-6 6-6"/></svg>
            </PBtn>
            {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(meta.total_pages, page + 2))
              .map(n => <PBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PBtn>)}
            <PBtn disabled={page >= meta.total_pages} onClick={() => setPage(p => p + 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M9 18l6-6-6-6"/></svg>
            </PBtn>
          </div>
        </div>
      </div>
    </div>
  );
}