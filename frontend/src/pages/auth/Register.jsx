import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../../components/InputField";
import logo from "../../assets/logo.png";

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api"
).replace(/\/$/, "");

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <path d="M1 1l22 22"/></>
      }
    </svg>
  );
}

function FileUpload({ file, onChange, error }) {
  const ref = useRef();
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#233B6E] font-semibold text-sm">
        Dokumen Pendukung<span className="text-red-500 ml-0.5">*</span>
        <span className="text-gray-400 font-normal text-xs ml-1">(KTM/Surat Instansi/KTP)</span>
      </label>
      <button type="button" onClick={() => ref.current.click()}
        className={`w-full bg-white border rounded-xl px-4 py-3.5 text-sm flex items-center
          justify-between outline-none transition
          focus:ring-2 focus:ring-[#233B6E]/30 focus:border-[#233B6E]
          ${error ? "border-red-400" : "border-gray-200"}
          ${file ? "text-gray-700" : "text-gray-400"}`}>
        <span className="truncate">{file ? file.name : "Tambah Dokumen"}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 text-gray-400">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </button>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={(e) => onChange(e.target.files[0] ?? null)} />
      {error
        ? <p className="text-red-500 text-xs">{error}</p>
        : <p className="text-gray-400 text-xs">Format: PDF, JPG, PNG. Maks 5MB.</p>
      }
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", fullname: "", institution: "",
    password: "", confirmPassword: "", phone: "",
  });
  const [doc, setDoc]                 = useState(null);
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]           = useState({});
  const [apiError, setApiError]       = useState("");
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.email)                            e.email           = "Email wajib diisi.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email           = "Format email tidak valid.";
    if (!form.fullname)                         e.fullname        = "Nama lengkap wajib diisi.";
    if (!form.institution)                      e.institution     = "Nama institusi wajib diisi.";
    if (!form.password)                         e.password        = "Kata sandi wajib diisi.";
    else if (form.password.length < 8)          e.password        = "Minimal 8 karakter.";
    if (!form.confirmPassword)                  e.confirmPassword = "Konfirmasi wajib diisi.";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Kata sandi tidak cocok.";
    if (!form.phone)                            e.phone           = "No. telepon wajib diisi.";
    else if (!/^08\d{8,11}$/.test(form.phone)) e.phone           = "Format: 08XXXXXXXXXX.";
    if (!doc)                                   e.doc             = "Dokumen pendukung wajib diunggah.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const fd = new FormData();
    fd.append("email",            form.email);
    fd.append("fullname",         form.fullname);
    fd.append("phone",            form.phone);
    fd.append("institution",      form.institution);
    fd.append("password",         form.password);
    fd.append("registration_doc", doc);

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Pendaftaran gagal");
      }
      setSuccess(true);
    } catch (err) {
      setApiError(err.message ?? "Pendaftaran gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#233B6E] flex items-center justify-center px-4">
        <div className="w-full max-w-[520px] bg-[#EFF0F4] rounded-3xl px-10 py-14 shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="text-[#233B6E] font-extrabold text-2xl mb-3">Pendaftaran Berhasil!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Akun Anda sedang menunggu verifikasi admin.<br />
            Anda akan dihubungi melalui email setelah diverifikasi.
            Silahkan cek secara berkala kotak masuk atau menu spam email Anda.
          </p>
          <button onClick={() => navigate("/login")}
            className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold px-10 py-3.5 rounded-2xl transition-all">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#233B6E] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[680px] bg-[#EFF0F4] rounded-3xl px-8 sm:px-14 pb-10 shadow-2xl">

        <div className="flex flex-col items-center mb-6 pt-6">
          <Link to="/" className="group">
            <img src={logo} alt="SI-BVET Lampung"
              className="h-20 w-auto object-contain group-hover:opacity-80 transition-opacity" />
          </Link>
          <p className="text-[#233B6E] font-extrabold text-lg tracking-tight mt-2 leading-tight text-center">
            SI-BVET Lampung
          </p>
          <p className="text-[#415F9D] text-m font-medium mt-0.5 text-center">
            Sistem Informasi Balai Veteriner Lampung
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {apiError}
            </div>
          )}

          <InputField label="Email" type="email" placeholder="Masukkan nama@email.com"
            value={form.email} onChange={set("email")} error={errors.email} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Nama Lengkap" placeholder="Masukkan Nama Lengkap"
              value={form.fullname} onChange={set("fullname")} error={errors.fullname} required />
            <InputField label="Nama Institusi/Perusahaan" placeholder="Masukkan Nama Institusi"
              value={form.institution} onChange={set("institution")} error={errors.institution} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Kata Sandi" type={showPass ? "text" : "password"}
              placeholder="Minimal 8 Karakter" value={form.password}
              onChange={set("password")} error={errors.password} required
              rightSlot={
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showPass} />
                </button>
              }
            />
            <InputField label="Konfirmasi Kata Sandi" type={showConfirm ? "text" : "password"}
              placeholder="Ulangi Kata Sandi" value={form.confirmPassword}
              onChange={set("confirmPassword")} error={errors.confirmPassword} required
              rightSlot={
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showConfirm} />
                </button>
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="No. Telepon" placeholder="08XXXXXXXXXX"
              value={form.phone} onChange={set("phone")} error={errors.phone} required />
            <FileUpload file={doc} onChange={setDoc} error={errors.doc} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#233B6E] hover:bg-[#1a2d56] active:scale-[0.98] text-white
              font-bold text-base py-4 rounded-2xl transition-all mt-2
              disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Mendaftar...
              </span>
            ) : "Daftar"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-[#233B6E] font-bold hover:underline">
              Masuk disini
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}