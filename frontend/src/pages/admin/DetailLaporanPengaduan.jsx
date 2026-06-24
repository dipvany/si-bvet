import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { resolveFileUrl } from "../../utils/fileUrl";

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

/* ── Read-only field row ── */
function FieldRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
      <span className="text-sm text-[#415F9D] font-medium sm:w-64 flex-shrink-0">
        {label}
      </span>
      <input readOnly value={value ?? ""}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm
          text-gray-800 bg-gray-50 outline-none" />
    </div>
  );
}

/* ── Read-only textarea ── */
function TextAreaRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-[#415F9D] font-semibold">{label}</span>
      <textarea readOnly value={value ?? ""} rows={4}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
          text-gray-800 bg-gray-50 outline-none resize-none" />
    </div>
  );
}

export default function DetailLaporanPengaduan() {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();

  const [complaint, setComplaint] = useState(location.state?.complaint ?? null);
  const [loading, setLoading]     = useState(!location.state?.complaint);
  const [saving, setSaving]       = useState(false);
  const [response, setResponse]   = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  useEffect(() => {
    if (!complaint) fetchDetail();
    else setResponse(complaint.admin_response ?? "");
  }, []);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      // Fallback: ambil semua lalu filter by id
      const res  = await apiFetch("/admin/complaints");
      const data = await res.json();
      const found = (data.complaints ?? []).find(c => String(c.id) === String(id));
      if (found) { setComplaint(found); setResponse(found.admin_response ?? ""); }
    } catch {
      setError("Gagal memuat detail pengaduan.");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!response.trim()) { setError("Tanggapan tidak boleh kosong."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch(`/admin/complaints/${id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_response: response }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal mengirim tanggapan.");
      }
      setSuccess("Tanggapan berhasil dikirim.");
      setComplaint(p => ({ ...p, admin_response: response, status: "resolved" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Parse fields dari description (format: "Nama: ...\nAlamat: ...\nNIK: ...\n\n...")
  const parseField = (text, key) =>
    text?.match(new RegExp(`${key}: ([^\\n]+)`))?.[1]?.trim() ?? "";

  const desc        = complaint?.description ?? "";
  const nama        = complaint?.user?.fullname  ?? parseField(desc, "Nama");
  const alamat      = complaint?.user?.address   ?? parseField(desc, "Alamat");
  const nik         = complaint?.user?.nik        ?? parseField(desc, "NIK");
  const saran       = desc.includes("\n\n") ? desc.split("\n\n").slice(1).join("\n\n") : desc;
  const docUrl      = complaint?.attachment_path
    ? resolveFileUrl(complaint.attachment_path)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Memuat detail...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header dengan tombol back */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/superadmin/laporan-pengaduan")}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-[#233B6E]">Detail Laporan Pengaduan</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />

        <div className="p-6 space-y-5">

          {/* Alert */}
          {error   && <div className="bg-red-50 border border-red-200 text-red-600
            text-sm rounded-xl px-4 py-3">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-600
            text-sm rounded-xl px-4 py-3">{success}</div>}

          {/* Data identitas */}
          <FieldRow label="Nama Lengkap/Perusahaan" value={nama} />
          <FieldRow label="Alamat Lengkap"           value={alamat} />
          <FieldRow label="Nomor Induk Kependudukan (NIK)" value={nik} />
          <FieldRow label="Tanggal Melapor"
            value={formatDate(complaint?.date_of_complaint)} />

          <div className="border-t border-gray-100 pt-2" />

          {/* Isi pengaduan */}
          <TextAreaRow
            label="Pelayanan Yang Tidak Sesuai Standar"
            value={complaint?.subjects}
          />
          <TextAreaRow
            label="Saran dan Gagasan"
            value={saran}
          />

          {/* Lampiran */}
          {docUrl && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-[#415F9D] font-medium">
                Lampiran Bukti
              </span>
              <a href={docUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#233B6E] text-sm
                  font-semibold hover:underline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="w-4 h-4">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Lihat Dokumen
              </a>
            </div>
          )}

          {/* Tanggapan admin */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <span className="text-sm text-[#415F9D] font-semibold">
              Tanggapan Admin
              {complaint?.status === "resolved" && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider
                  bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Sudah Ditanggapi
                </span>
              )}
            </span>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={4}
              placeholder="Tulis tanggapan Anda terhadap pengaduan ini..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                text-gray-800 outline-none resize-none transition
                focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
                placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Tombol Kirim Tanggapan */}
      <div className="flex justify-end">
        <button onClick={handleRespond} disabled={saving}
          className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
            text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Mengirim...
            </>
          ) : (
            <>
              Kirim Tanggapan
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}