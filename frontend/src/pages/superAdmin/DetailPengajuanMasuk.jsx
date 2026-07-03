import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { approveSubmission, rejectSubmission } from "../../services/superAdminServices";
import { apiFetch } from "../../services/api";

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID",
    { day: "2-digit", month: "2-digit", year: "numeric" });
};

const getDocUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api")
    .replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const STATUS_CFG = {
  pending_verification: { label: "Menunggu Verifikasi", bg: "bg-yellow-100 text-yellow-700" },
  reviewing:            { label: "Kaji Ulang",          bg: "bg-orange-100 text-orange-700" },
  awaiting_payment:     { label: "Menunggu Pembayaran", bg: "bg-blue-100 text-blue-700"   },
  in_process:           { label: "Proses Pengujian",    bg: "bg-purple-100 text-purple-700" },
  done:                 { label: "Selesai",             bg: "bg-green-100 text-green-700"  },
  rejected:             { label: "Ditolak",             bg: "bg-red-100 text-red-600"      },
};

/* ── Sub-components ───────────────────────────────────────────── */
function Row({ label, value }) {
  return (
    <div className="px-5 py-3.5 flex gap-4 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-48 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1 break-words">{value ?? "-"}</span>
    </div>
  );
}

function Card({ title, accent = "#233B6E", children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1" style={{ background: accent }} />
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-[#233B6E] text-sm">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

function DocLink({ path }) {
  const url = getDocUrl(path);
  if (!url) return null;
  const fname = path.split("/").pop() || "Dokumen";
  const ext   = fname.split(".").pop().toLowerCase();
  const isPdf = ext === "pdf";
  const isImg = ["jpg","jpeg","png","gif","webp"].includes(ext);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-[#EEF0F8] text-[#233B6E]
        text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#233B6E]
        hover:text-white transition-colors">
      {isPdf ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
        </svg>
      ) : isImg ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )}
      Buka Dokumen
    </a>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function DetailPengajuanMasuk() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { state } = useLocation();

  const [submission, setSubmission] = useState(state?.submission ?? null);
  const [fetching,   setFetching]   = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");

  useEffect(() => {
    if (!id) return;
    setFetching(true);
    apiFetch(`/admin/submissions/${id}`)
      .then(r => r.json())
      .then(d => { const raw = d.data ?? d; if (raw?.id) setSubmission(raw); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [id]);

  if (fetching && !submission) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Memuat detail pengajuan...
      </div>
    </div>
  );

  if (!submission) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-400 text-sm">Data pengajuan tidak ditemukan.</p>
      <button onClick={() => navigate(-1)}
        className="text-[#233B6E] text-sm font-semibold hover:underline">← Kembali</button>
    </div>
  );

  const status    = submission.process_status;
  const isPending = status === "pending_verification";
  const sCfg      = STATUS_CFG[status] ?? { label: status, bg: "bg-gray-100 text-gray-600" };

  const userInfo = submission.user_info ?? {};
  const customer = userInfo.customer   ?? {};
  const samples  = Array.isArray(submission.samples) ? submission.samples : [];

  // Dokumen lampiran — bisa string atau array
  const attRaw  = submission.attachment_doc;
  const attDocs = Array.isArray(attRaw) ? attRaw : (attRaw ? [attRaw] : []);

  const handleApprove = async () => {
    if (!window.confirm("Setujui pengajuan ini? Otomatis masuk ke Proses Pengujian.")) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res  = await approveSubmission(id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menyetujui.");
      setSuccess("Pengajuan berhasil disetujui.");
      setSubmission(p => ({ ...p, process_status: "reviewing" }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!window.confirm("Tolak pengajuan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const res  = await rejectSubmission(id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menolak.");
      setSuccess("Pengajuan berhasil ditolak.");
      setSubmission(p => ({ ...p, process_status: "rejected" }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[#233B6E]">Detail Pengajuan Masuk</h1>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${sCfg.bg}`}>
            {sCfg.label}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-400">{submission.no_ticket}</span>
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          {success}
        </div>
      )}

      {/* ── STEP 1: Data Pengajuan ── */}
      <Card title="Data Pengajuan (Step 1)">
        <Row label="No. Tiket"            value={submission.no_ticket} />
        <Row label="No. Registrasi"       value={submission.no_registration} />
        <Row label="No. EPI"              value={submission.no_epi} />
        <Row label="Jenis Layanan"        value={submission.type_service} />
        <Row label="Tujuan Pengujian"     value={submission.purpose_of_test} />
        <Row label="Tanggal Kirim"        value={fmt(submission.date_of_send)} />
        <Row label="Tanggal Terima"       value={fmt(submission.date_of_receive)} />
        <Row label="Nama Kurir"           value={submission.courier_name} />
        <Row label="Kontak Kurir"         value={submission.courier_contact} />
        <Row label="No. Surat Pelanggan"  value={submission.cust_letter_no} />
        <Row label="ID iSIKHNAS"          value={submission.id_isikhnas} />
        <Row label="No. Agenda"           value={submission.agenda_no} />
        <Row label="Perlu Diagnosa"       value={submission.diagnosis_required ? "Ya" : "Tidak"} />
        <Row label="Jumlah Sampel"        value={submission.samples_count} />
        {submission.notes && <Row label="Catatan" value={submission.notes} />}

        {/* Dokumen Pendukung */}
        {attDocs.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-400 mb-3">Dokumen Pendukung</p>
            <div className="flex flex-wrap gap-2">
              {attDocs.map((doc, i) => {
                const path = typeof doc === "string"
                  ? doc : (doc.path ?? doc.file_path ?? doc.url ?? "");
                return <DocLink key={i} path={path} />;
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── STEP 2: Data Sampel ── */}
      <Card title={`Data Sampel / Step 2 (${samples.length} sampel)`} accent="#7C3AED">
        {samples.length === 0 ? (
          <div className="px-5 py-4 text-sm text-gray-400">Tidak ada data sampel.</div>
        ) : samples.map((s, i) => (
          <div key={s.id ?? i}
            className="px-5 py-4 border-b border-gray-50 last:border-0">
            <p className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-3">
              Sampel {i + 1} — {s.sample_code_cust || "-"}
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">
              {[
                ["Kode Sampel Pelanggan", s.sample_code_cust],
                ["Model Sampel",          s.sample_model],
                ["Kelompok Spesimen",     s.specimen_group],
                ["Jenis Spesimen",        s.specimen_type],
                ["Species / Hewan",       s.species],
                ["Pengawet",              s.preservative],
                ["Kemasan",               s.packaging],
                ["Tanggal Produksi",      fmt(s.production_date)],
                ["Tanggal Kadaluarsa",    fmt(s.expired_date)],
                ["Jenis Kelamin",         s.sex],
                ["Umur",                  s.age ? `${s.age} ${s.unit_age ?? ""}`.trim() : "-"],
                ["Pemilik",               s.owner],
                ["Jenis Pengujian",       s.test_type],
                ["Tipe Lokasi",           s.location_type],
                ["Lokasi Sampel",         s.location_smpl],
                ["Sudah Vaksin",          s.is_vaccinated],
                ["Volume",                s.volume],
                ["Kondisi",               s.condition],
                ["Total Sampel",          s.total_sample],
              ].map(([label, val]) => (
                <div key={label}
                  className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 w-44 flex-shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{val || "-"}</span>
                </div>
              ))}
            </div>
            {/* Badge pengujian yang diminta */}
            {Array.isArray(s.test_requests) && s.test_requests.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">Pengujian Diminta</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.test_requests.map((tr, j) => (
                    <span key={tr.id ?? j}
                      className="bg-[#7C3AED]/10 text-[#7C3AED] text-[11px]
                        font-bold px-2.5 py-1 rounded-full">
                      {tr.test_service?.test_name ?? tr.test_service?.name
                        ?? `Test #${tr.test_service_id}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* ── STEP 3: Data Pelanggan ── */}
      <Card title="Data Pelanggan (Step 3)" accent="#0EA5E9">
        <Row label="Nama Lengkap"          value={userInfo.fullname} />
        <Row label="Email"                 value={userInfo.email} />
        <Row label="No. Telepon"           value={userInfo.phone} />
        <Row label="Institusi"             value={userInfo.institution} />
        <Row label="Nama PIC"              value={customer.pic_name} />
        <Row label="Kontak PIC"            value={customer.pic_contact} />
        <Row label="Penerima LHU"          value={customer.lhu_receiver_name} />
        <Row label="Kontak Penerima LHU"   value={customer.lhu_receiver_contact} />
        <Row label="Alamat"                value={customer.address} />
        <Row label="Provinsi"              value={customer.province} />
        <Row label="Kota"                  value={customer.city} />
        <Row label="Kecamatan"             value={customer.subdistrict} />
        <Row label="Kelurahan"             value={customer.village} />
        <Row label="Kode Pos"              value={customer.zip_code} />
        <Row label="Membership"
          value={customer.is_membership
            ? `Ya (${customer.membership_no || "-"})` : "Tidak"} />
      </Card>

      {/* ── Tombol Verifikasi — di bawah setelah baca semua info ── */}
      {isPending && (
        <div className="flex gap-3">
          <button onClick={handleApprove} disabled={loading}
            className="flex-1 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
              py-3 rounded-xl transition-all disabled:opacity-60
              disabled:cursor-not-allowed text-sm">
            {loading ? "Memproses..." : "✓ Setujui Pengajuan"}
          </button>
          <button onClick={handleReject} disabled={loading}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold
              py-3 rounded-xl border border-red-200 transition-all
              disabled:opacity-60 disabled:cursor-not-allowed text-sm">
            {loading ? "Memproses..." : "✗ Tolak Pengajuan"}
          </button>
        </div>
      )}

      {status === "rejected" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
          text-red-600 text-sm font-medium text-center">
          Pengajuan ini telah ditolak.
        </div>
      )}

      {!isPending && status !== "rejected" && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3
          text-green-700 text-sm font-medium text-center">
          Pengajuan ini sudah disetujui — kelola lanjutan di menu <strong>Proses Pengujian</strong>.
        </div>
      )}

    </div>
  );
}