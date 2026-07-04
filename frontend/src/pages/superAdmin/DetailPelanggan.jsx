import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { verifyUser, rejectUser } from "../../services/superAdminServices";
​
// Helper: path relatif → full URL dokumen
const getDocUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${clean}`;
};
​
​
​
​
​
​
export default function DetailPelanggan() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const { id }    = useParams();
​
  // Data dikirim via navigate state dari halaman list
  const customer = state?.customer;
​
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
​
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-400 text-sm">Data pelanggan tidak ditemukan.</p>
        <button onClick={() => navigate(-1)}
          className="text-[#233B6E] text-sm font-semibold hover:underline">
          ← Kembali
        </button>
      </div>
    );
  }
​
  const handleAction = async (action) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res  = action === "verify" ? await verifyUser(id) : await rejectUser(id);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Terjadi kesalahan.");
      setSuccess(action === "verify"
        ? "Akun pelanggan berhasil diverifikasi."
        : "Akun pelanggan berhasil ditolak."
      );
      // Kembali ke daftar setelah 1.5 detik
      setTimeout(() => navigate("/superadmin/registrasi-pelanggan"), 1500);
    } catch (err) {
      setError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };
​
  const fields = [
    { label: "Nama Lengkap",  value: customer.fullname },
    { label: "Email",         value: customer.email },
    { label: "No. Telepon",   value: customer.phone ?? "-" },
    { label: "Institusi",     value: customer.institution ?? "-" },
    { label: "Status",        value: customer.is_verified ? "Sudah Diverifikasi" : "Belum Diverifikasi" },
  ];
​
  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-[#233B6E]">Detail Pelanggan</h1>
      </div>
​
      {/* Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-xl px-4 py-3">
          {success}
        </div>
      )}
​
      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#233B6E]">Informasi Akun</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {fields.map(f => (
            <div key={f.label} className="px-5 py-3.5 flex gap-4">
              <span className="text-sm text-gray-400 w-36 flex-shrink-0">{f.label}</span>
              <span className="text-sm font-medium text-gray-800">{f.value}</span>
            </div>
          ))}
        </div>
​
        {/* Dokumen */}
        {customer.registration_doc && (
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-400 mb-2">Dokumen Registrasi</p>
            <a
              href={getDocUrl(customer.registration_doc)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#EEF0F8] text-[#233B6E]
                text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#233B6E]
                hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Buka Dokumen
            </a>
          </div>
        )}
      </div>
​
      {/* Action buttons — hanya tampil jika belum diverifikasi */}
      {!customer.is_verified && (
        <div className="flex gap-3">
          <button
            onClick={() => handleAction("verify")}
            disabled={loading}
            className="flex-1 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
              py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
              text-sm"
          >
            {loading ? "Memproses..." : "✓ Verifikasi Akun"}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold
              py-3 rounded-xl border border-red-200 transition-all
              disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Memproses..." : "✗ Tolak Akun"}
          </button>
        </div>
      )}
​
      {customer.is_verified && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3
          text-green-700 text-sm font-medium text-center">
          Akun ini sudah diverifikasi
        </div>
      )}
    </div>
  );
}