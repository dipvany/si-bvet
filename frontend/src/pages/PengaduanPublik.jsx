import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

/**
 * PengaduanPublik — formulir pengaduan TANPA login.
 *
 * Endpoint: POST /complaints (publik, tidak perlu Authorization header)
 * Field sesuai API resmi: fullname, email, subjects, description,
 * date_of_complaint, attachment (file, opsional).
 */
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

/* ── Field row ── */
function Field({ label, required = true, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-6">
      <span className="text-sm text-[#415F9D] font-medium sm:w-56 flex-shrink-0 sm:pt-2.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
        text-gray-800 outline-none transition placeholder-gray-400
        focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
  );
}

function TextAreaSection({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-[#415F9D] font-semibold">
        {label}<span className="text-red-500 ml-0.5">*</span>
      </span>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={4}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
          text-gray-800 outline-none resize-none transition placeholder-gray-400
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
    </div>
  );
}

export default function PengaduanPublik() {
  const [form, setForm] = useState({
    fullname: "", email: "",
    date_of_complaint: "", subjects: "", description: "",
  });
  const [attachment, setAttachment] = useState(null);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);
  const fileRef                     = useRef();

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    if (!form.fullname)          return "Nama lengkap/perusahaan wajib diisi.";
    if (!form.email)             return "Email wajib diisi (agar kami dapat menghubungi Anda).";
    if (!form.date_of_complaint) return "Tanggal melapor wajib diisi.";
    if (!form.subjects)          return "Subjek pengaduan wajib diisi.";
    if (!form.description)       return "Uraian pengaduan wajib diisi.";
    if (!agreed)                 return "Anda harus menyetujui pernyataan di bawah.";
    return null;
    // Catatan: attachment OPSIONAL sesuai dokumentasi API publik.
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("fullname",           form.fullname);
      fd.append("email",              form.email);
      fd.append("subjects",           form.subjects);
      fd.append("description",        form.description);
      fd.append("date_of_complaint",  form.date_of_complaint); // format YYYY-MM-DD
      if (attachment) fd.append("attachment", attachment);     // opsional

      // Endpoint publik — TIDAK butuh header Authorization
      const res = await fetch(`${API_BASE}/complaints`, {
        method: "POST",
        body:   fd,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? d.message ?? "Gagal mengirim pengaduan.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setForm({ fullname:"", email:"", date_of_complaint:"", subjects:"", description:"" });
    setAttachment(null);
    setAgreed(false);
    setError("");
  };

  /* ── Header sederhana (tanpa sidebar, karena halaman publik) ── */
  const PageHeader = () => (
    <div className="bg-[#233B6E] py-5">
      <div className="max-w-2xl mx-auto px-5 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="SI-BVET" className="h-9 w-auto object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-sm">SI-BVET Lampung</span>
            <span className="text-white/55 text-[10px]">Laboratorium Balai Veteriner Lampung</span>
          </div>
        </Link>
      </div>
    </div>
  );

  /* ── Success ── */
  if (success) {
    return (
      <div className="min-h-screen bg-[#F0F2F8]">
        <PageHeader />
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
              justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#233B6E] mb-2">
              Pengaduan Terkirim!
            </h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Pengaduan Anda telah berhasil dikirim.<br />
              Tim kami akan segera menindaklanjuti melalui email yang Anda berikan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={resetForm}
                className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
                  px-8 py-3 rounded-xl transition-all">
                Buat Pengaduan Baru
              </button>
              <Link to="/"
                className="border border-[#233B6E]/30 hover:bg-[#EEF0F8] text-[#233B6E] font-bold
                  px-8 py-3 rounded-xl transition-all text-center">
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F8]">
      <PageHeader />
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#233B6E]">Pengaduan</h1>
          <Link to="/" className="text-sm font-semibold text-[#233B6E] hover:underline flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>
        </div>

        <p className="text-sm text-[#415F9D] leading-relaxed">
          Sampaikan pengaduan atau keluhan terkait layanan BVET. Anda tidak perlu
          memiliki akun untuk mengirimkan pengaduan ini — pastikan email yang Anda
          isi aktif agar kami dapat menindaklanjuti.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#233B6E]" />
          <div className="p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#233B6E] pb-3 border-b border-gray-100">
              Formulir Pengajuan Pengaduan
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600
                text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Field label="Nama Lengkap/Perusahaan">
              <TextInput value={form.fullname} onChange={set("fullname")}
                placeholder="Masukkan Nama Lengkap Anda" />
            </Field>

            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={set("email")}
                placeholder="Masukkan email aktif Anda" />
            </Field>

            <Field label="Tanggal Melapor">
              <input type="date" value={form.date_of_complaint}
                onChange={set("date_of_complaint")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                  text-sm text-gray-800 outline-none transition
                  focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
            </Field>

            <div className="border-t border-gray-100 pt-1" />

            <Field label="Subjek Pengaduan">
              <TextInput value={form.subjects} onChange={set("subjects")}
                placeholder="Contoh: Keterlambatan hasil pengujian" />
            </Field>

            <TextAreaSection
              label="Uraian Pengaduan"
              value={form.description}
              onChange={set("description")}
              placeholder="Jelaskan detail pengaduan, saran, atau gagasan Anda"
            />

            {/* Lampiran — opsional sesuai dokumentasi API */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-[#415F9D] font-medium">
                Lampiran Bukti <span className="text-gray-400 text-xs">(opsional)</span>
              </span>
              <button type="button" onClick={() => fileRef.current.click()}
                className="w-full border border-dashed border-gray-300 rounded-xl
                  px-4 py-3 text-sm flex items-center gap-2 transition-colors
                  hover:border-[#233B6E] hover:text-[#233B6E]
                  text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="w-4 h-4 flex-shrink-0">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {attachment
                  ? <span className="text-gray-700">{attachment.name}</span>
                  : "Pilih file bukti pendukung (jika ada)..."
                }
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setAttachment(e.target.files[0] ?? null)} />
              <p className="text-[11px] text-gray-400">
                Format: PDF, JPG, PNG. Maks 5MB.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <p className="text-sm text-[#415F9D] font-medium leading-snug flex-1">
                Saya menyatakan bahwa informasi yang saya berikan
                adalah benar dan dapat dipertanggungjawabkan
                <span className="text-red-500 ml-0.5">*</span>
              </p>
              <button type="button" onClick={() => setAgreed(p => !p)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5
                  flex items-center justify-center transition-all
                  ${agreed
                    ? "bg-[#233B6E] border-[#233B6E]"
                    : "border-gray-400 bg-white"}`}>
                {agreed && (
                  <svg viewBox="0 0 12 12" fill="none" stroke="white"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="w-3 h-3">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
              disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {loading ? (
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
                Ajukan
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
    </div>
  );
}