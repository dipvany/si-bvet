import { useState } from "react";
import { Link } from "react-router-dom";
import InputField from "../../components/InputField";
import logo from "../../assets/logo.png";

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api"
).replace(/\/$/, "");

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim())                      return setError("Email wajib diisi.");
    if (!/\S+@\S+\.\S+/.test(email.trim())) return setError("Format email tidak valid.");

    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengirim email. Coba lagi.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#233B6E] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px] bg-[#EFF0F4] rounded-3xl px-8 sm:px-12 pt-0 pb-10 shadow-2xl">

        <div className="flex flex-col items-center mb-6 pt-6">
          <img src={logo} alt="SI-BVET Lampung" className="h-20 w-auto object-contain" />
          <p className="text-[#233B6E] font-extrabold text-lg tracking-tight mt-2 leading-tight text-center">
            SI-BVET Lampung
          </p>
          <p className="text-[#415F9D] text-sm font-medium mt-0.5 text-center">
            Sistem Informasi Balai Veteriner Lampung
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#233B6E] text-base">Email Terkirim!</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Silakan cek kotak masuk email Anda atau pada menu spam untuk tautan mereset kata sandi.
              </p>
            </div>
            <Link to="/login"
              className="mt-2 w-full bg-[#233B6E] hover:bg-[#1a2d56] text-white
                font-bold text-sm py-3.5 rounded-2xl transition-all text-center block">
              Kembali ke Halaman Masuk
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            <Link to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-[#415F9D]
                hover:text-[#233B6E] transition-colors w-fit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Kembali ke halaman masuk
            </Link>

            <div>
              <h1 className="text-[#233B6E] font-extrabold text-xl">Lupa Kata Sandi?</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Silahkan masukkan alamat email yang Anda gunakan di bawah ini
                untuk memulihkan kata sandi Anda.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <InputField
              label="Email"
              type="email"
              placeholder="Masukkan Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <button type="submit" disabled={loading}
              className="w-full bg-[#233B6E] hover:bg-[#1a2d56] active:scale-[0.98]
                text-white font-bold text-base py-4 rounded-2xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Mengirim...
                </span>
              ) : "Kirim"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}