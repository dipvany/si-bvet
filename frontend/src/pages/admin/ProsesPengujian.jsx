import { useState, useEffect, useMemo } from "react";
import {
  getAdminSubmissions, createBilling, updateBilling,
  getBilling, verifyPayment, rejectPayment,
} from "../../services/adminServices";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";

const STATUS_CONFIG = {
  approved:         { label: "Disetujui",          bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500",  order: 0 },
  awaiting_payment: { label: "Menunggu Pembayaran", bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   order: 1 },
  in_process:       { label: "Proses Pengujian",    bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", order: 2 },
  processed:        { label: "Selesai Diproses",    bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", order: 3 },
  done:             { label: "Pengujian Selesai",   bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  order: 4 },
};

const ACTIVE_STATUSES = ["approved", "awaiting_payment", "in_process", "processed", "done"];
const PER_PAGE = 20;

// Safe JSON parse — hindari crash kalau backend return HTML/empty
const safeJson = async (res) => {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

const updateSubmissionStatus = (id, status) =>
  apiFetch(`/admin/submissions/${id}/status`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ process_status: status }),
  });

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n ?? 0);

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

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1">{value ?? "-"}</span>
    </div>
  );
}

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

/* ══════════════════════════════════════════════════════════════════
   HALAMAN DETAIL — tampil di area konten, bukan popup
══════════════════════════════════════════════════════════════════ */
function DetailProses({ submission: initialSub, onBack, onUpdated }) {
  const [sub,          setSub]          = useState(initialSub);
  const [billing,      setBilling]      = useState(null);
  const [loadBill,     setLoadBill]     = useState(true);
  const [actionLoad,   setActionLoad]   = useState(false);
  const [savingBill,   setSavingBill]   = useState(false);
  const [err,          setErr]          = useState("");
  const [ok,           setOk]           = useState("");
  const [showBillForm, setShowBillForm] = useState(false);
  const [billForm,     setBillForm]     = useState({
    ebilling_code: "", total_amount: "", no_registration: "", no_epi: "",
  });

  const status                = sub.process_status;
  const isReviewing           = status === "approved";
  const isAwaitingPay         = status === "awaiting_payment";
  const isAwaitingVerification = status === "awaiting_verification";
  const isInProcess           = status === "in_process";
  const isDone                = status === "done";

  useEffect(() => {
    (async () => {
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

  const changeStatus = async (newStatus, confirmMsg) => {
    if (!window.confirm(confirmMsg)) return;
    setActionLoad(true); setErr(""); setOk("");
    try {
      const res  = await updateSubmissionStatus(sub.id, newStatus);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal mengubah status.");
      setSub(p => ({ ...p, process_status: newStatus }));
      setOk("Status berhasil diperbarui.");
      onUpdated(sub.id, newStatus);
    } catch (e) { setErr(e.message); }
    finally { setActionLoad(false); }
  };

  const handleSaveBillingAndNext = async (e) => {
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
      const billRes  = billing
        ? await updateBilling(sub.id, body)
        : await createBilling(sub.id, body);
      const billJson = await safeJson(billRes);
      if (!billRes.ok) throw new Error(billJson.error ?? billJson.message ?? "Gagal menyimpan tagihan.");
      setBilling(billJson.billing ?? billJson.data ?? body);

      const statusRes  = await updateSubmissionStatus(sub.id, "awaiting_payment");
      const statusJson = await safeJson(statusRes);
      if (!statusRes.ok) throw new Error(statusJson.error ?? statusJson.message ?? "Gagal mengubah status.");
      setSub(p => ({ ...p, process_status: "awaiting_payment" }));
      onUpdated(sub.id, "awaiting_payment");
      setOk("Tagihan disimpan. Status diubah ke Menunggu Pembayaran.");
      setShowBillForm(false);
    } catch (e) { setErr(e.message); }
    finally { setSavingBill(false); }
  };

  const handleVerifyPayment = async () => {
    if (!window.confirm("Verifikasi pembayaran ini? Status akan berubah ke Proses Pengujian.")) return;
    setActionLoad(true); setErr(""); setOk("");
    try {
      const res  = await verifyPayment(sub.id);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal verifikasi pembayaran.");
      setSub(p => ({ ...p, process_status: "in_process" }));
      onUpdated(sub.id, "in_process");
      setOk("Pembayaran terverifikasi. Status: Proses Pengujian.");
    } catch (e) { setErr(e.message); }
    finally { setActionLoad(false); }
  };

  const handleRejectPayment = async () => {
    if (!window.confirm("Tolak pembayaran ini? Pelanggan perlu mengunggah bukti ulang.")) return;
    setActionLoad(true); setErr(""); setOk("");
    try {
      const res  = await rejectPayment(sub.id);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menolak pembayaran.");
      setOk("Pembayaran ditolak. Pelanggan perlu unggah ulang.");
    } catch (e) { setErr(e.message); }
    finally { setActionLoad(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-[#233B6E] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#233B6E]">Detail Proses Pengujian</h1>
              <StatusPill status={status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{sub.no_ticket ?? `#${sub.id}`}</p>
          </div>
        </div>
      </div>

      {/* Alur status */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Alur Proses</p>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: "approved",              label: "Disetujui"   },
            { key: "awaiting_payment",      label: "Pembayaran"  },
            { key: "awaiting_verification", label: "Verifikasi"  },
            { key: "in_process",            label: "Pengujian"   },
            { key: "done",                  label: "Selesai"     },
          ].map((step, i, arr) => {
            const order        = STATUS_CONFIG[step.key]?.order ?? 0;
            const currentOrder = STATUS_CONFIG[status]?.order  ?? 0;
            const isCurrent    = step.key === status;
            const isPast       = order < currentOrder;
            return (
              <div key={step.key} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  ${isCurrent ? "bg-[#233B6E] text-white" : isPast ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {isPast && "✓ "}{step.label}
                </div>
                {i < arr.length - 1 && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" className={`w-3 h-3 flex-shrink-0 ${isPast ? "text-green-400" : "text-gray-300"}`}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Kolom kiri — info submission */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-[#233B6E]" />
            <div className="p-5">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Informasi Pengajuan
              </p>
              <InfoRow label="No. Tiket"        value={sub.no_ticket} />
              <InfoRow label="No. Registrasi"   value={sub.no_registration} />
              <InfoRow label="No. EPI"          value={sub.no_epi} />
              <InfoRow label="Jenis Layanan"    value={sub.type_service} />
              <InfoRow label="Tujuan Pengujian" value={sub.purpose_of_test} />
              <InfoRow label="Jumlah Sampel"    value={sub.samples_count} />
            </div>
          </div>
        </div>

        {/* Kolom kanan — aksi */}
        <div className="lg:col-span-2 space-y-4">
          <Alert type="error"   msg={err} onClose={() => setErr("")} />
          <Alert type="success" msg={ok}  onClose={() => setOk("")} />

          {/* 1. KAJI ULANG */}
          {isReviewing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-orange-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-orange-800">Tahap: Kaji Ulang</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Tinjau pengajuan. Jika sudah benar, masuk ke tahap pembayaran dengan mengisi data tagihan.
                  </p>
                </div>
                <button onClick={() => setShowBillForm(p => !p)}
                  className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                    text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Lanjut ke Proses Pembayaran
                </button>

                {showBillForm && (
                  <form onSubmit={handleSaveBillingAndNext}
                    className="pt-4 border-t border-gray-100 space-y-4">
                    <p className="text-xs font-bold text-[#233B6E] uppercase tracking-wider">
                      Input Data Tagihan
                    </p>
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
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                              outline-none focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowBillForm(false)}
                        className="px-4 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl">
                        Batal
                      </button>
                      <button type="submit" disabled={savingBill}
                        className="flex items-center gap-2 bg-[#233B6E] text-white font-bold text-sm
                          px-5 py-2 rounded-xl disabled:opacity-60">
                        {savingBill ? <><Spinner sm />Menyimpan...</> : "Simpan & Lanjutkan"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 2. MENUNGGU PEMBAYARAN */}
          {isAwaitingPay && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-blue-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-blue-800">Tahap: Menunggu Pembayaran</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Pelanggan perlu membayar tagihan. Setelah bukti diunggah, verifikasi di sini.
                  </p>
                </div>

                {loadBill ? (
                  <div className="flex items-center gap-2 text-gray-400 text-xs"><Spinner sm />Memuat tagihan...</div>
                ) : billing ? (
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-0">
                    <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-2">Data Tagihan</p>
                    <InfoRow label="Kode e-Billing"  value={billing.ebilling_code} />
                    <InfoRow label="Total Tagihan"   value={rupiah(billing.total_amount)} />
                    <InfoRow label="No. Registrasi"  value={billing.no_registration} />
                    <InfoRow label="No. EPI"         value={billing.no_epi} />
                    <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-40 flex-shrink-0">Bukti Pembayaran</span>
                      <span className="text-sm font-medium flex-1">
                        {billing.proof_payment ? (
                          <a href={resolveFileUrl(billing.proof_payment)} target="_blank"
                            rel="noopener noreferrer"
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
                ) : (
                  <p className="text-xs text-blue-600">Belum ada data tagihan.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={handleVerifyPayment}
                    disabled={actionLoad || !billing?.proof_payment}
                    title={!billing?.proof_payment ? "Pelanggan belum mengunggah bukti pembayaran" : undefined}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700
                      text-white font-bold text-sm px-4 py-2.5 rounded-xl
                      disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                    {actionLoad ? <Spinner sm /> : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    Verifikasi Pembayaran
                  </button>
                  <button onClick={handleRejectPayment} disabled={actionLoad}
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100
                      text-red-600 font-bold text-sm px-4 py-2.5 rounded-xl
                      border border-red-200 disabled:opacity-60 disabled:cursor-not-allowed">
                    Tolak Pembayaran
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. MENUNGGU VERIFIKASI PEMBAYARAN */}
          {isAwaitingVerification && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-cyan-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-cyan-800">Tahap: Verifikasi Pembayaran</p>
                  <p className="text-xs text-cyan-600 mt-1">
                    Customer sudah mengunggah bukti pembayaran. Periksa dokumen lalu verifikasi atau tolak.
                  </p>
                </div>

                {loadBill ? (
                  <div className="flex items-center gap-2 text-gray-400 text-xs"><Spinner sm />Memuat data tagihan...</div>
                ) : billing ? (
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-0">
                    <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-2">Data Tagihan</p>
                    <InfoRow label="Kode e-Billing"  value={billing.ebilling_code} />
                    <InfoRow label="Total Tagihan"   value={rupiah(billing.total_amount)} />
                    <InfoRow label="No. Registrasi"  value={billing.no_registration} />
                    <InfoRow label="No. EPI"         value={billing.no_epi} />
                    <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-40 flex-shrink-0">Bukti Pembayaran</span>
                      <span className="text-sm font-medium flex-1">
                        {billing.proof_payment ? (
                          <a href={resolveFileUrl(billing.proof_payment)} target="_blank"
                            rel="noopener noreferrer"
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
                ) : (
                  <p className="text-xs text-cyan-600">Belum ada data tagihan.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={handleVerifyPayment}
                    disabled={actionLoad || !billing?.proof_payment}
                    title={!billing?.proof_payment ? "Pelanggan belum mengunggah bukti pembayaran" : undefined}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700
                      text-white font-bold text-sm px-4 py-2.5 rounded-xl
                      disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                    {actionLoad ? <Spinner sm /> : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    Verifikasi Pembayaran
                  </button>
                  <button onClick={handleRejectPayment} disabled={actionLoad}
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100
                      text-red-600 font-bold text-sm px-4 py-2.5 rounded-xl
                      border border-red-200 disabled:opacity-60 disabled:cursor-not-allowed">
                    Tolak Pembayaran
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. PROSES PENGUJIAN */}
          {isInProcess && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-purple-400" />
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-purple-800">Tahap: Proses Pengujian</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Pengujian sedang berjalan. Setelah selesai, ubah status ke Pengujian Selesai.
                  </p>
                </div>
                <button
                  onClick={() => changeStatus("done", "Tandai pengujian ini sebagai selesai?")}
                  disabled={actionLoad}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700
                    text-white font-bold text-sm px-4 py-2.5 rounded-xl
                    disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                  {actionLoad ? <Spinner sm /> : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  )}
                  Selesaikan Pengujian
                </button>
              </div>
            </div>
          )}

          {/* 5. SELESAI */}
          {isDone && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1 bg-green-400" />
              <div className="p-5 flex items-center gap-3 text-sm text-green-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Pengujian selesai. Data sudah masuk ke menu <strong className="mx-1">Laporan Hasil Uji</strong> untuk upload LHU.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [selected,     setSelected]     = useState(null); // null = list, object = detail

  useEffect(() => { fetchData(page); }, [page]);

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

  const handleUpdated = (id, newStatus) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, process_status: newStatus } : s));
    // Update selected juga biar pill status di detail langsung berubah
    setSelected(prev => prev?.id === id ? { ...prev, process_status: newStatus } : prev);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter(s => {
      const matchStatus = filterStatus === "all" || s.process_status === filterStatus;
      const matchSearch = !q ||
        s.no_ticket?.toLowerCase().includes(q) ||
        s.type_service?.toLowerCase().includes(q) ||
        s.purpose_of_test?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, search, filterStatus]);

  const countByStatus = useMemo(() => {
    const map = { all: submissions.length };
    submissions.forEach(s => { map[s.process_status] = (map[s.process_status] ?? 0) + 1; });
    return map;
  }, [submissions]);

  /* ── Tampilkan halaman detail kalau ada yang dipilih ── */
  if (selected) {
    return (
      <DetailProses
        submission={selected}
        onBack={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    );
  }

  /* ── Halaman list ── */
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#233B6E]">Proses Pengujian</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Kelola alur proses pengujian: kaji ulang → pembayaran → pengujian → selesai
          </p>
        </div>
        <button onClick={() => fetchData(page)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#233B6E]
            bg-[#EEF0F8] hover:bg-[#dde0f0] px-3 py-2 rounded-lg transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => fetchData(page)} className="text-xs font-semibold hover:underline ml-4">Coba Lagi</button>
        </div>
      )}

      {/* Filter status */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "Semua" }, ...ACTIVE_STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s]?.label ?? s }))].map(opt => (
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

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center gap-3 flex-wrap">
          <p className="text-xs text-gray-400">
            <span className="font-bold text-[#233B6E]">{filtered.length}</span> pengajuan dalam proses
          </p>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari no. tiket atau layanan..."
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] w-56" />
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
                <tr key={s.id} className="hover:bg-[#F6F7FB] transition-colors cursor-pointer"
                  onClick={() => setSelected(s)}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}.</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#233B6E] text-xs">{s.no_ticket ?? "-"}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.type_service ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                    <span className="line-clamp-1">{s.purpose_of_test ?? "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EEF0F8] text-[#233B6E] text-xs font-bold">
                      {s.samples_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={s.process_status} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelected(s)}
                      className="flex items-center gap-1.5 text-[#233B6E] text-xs font-semibold
                        bg-[#EEF0F8] hover:bg-[#dde0f0] px-2.5 py-1.5 rounded-lg transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
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