import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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

export default function ResetPasswordPage() {
  const navigate                    = useNavigate();
  const { userId, token }           = useParams();
  const [searchParams]              = useSearchParams();

  // Query params dari link email: ?expires=...&signature=...
  const expires   = searchParams.get("expires")   ?? "";
  const signature = searchParams.get("signature") ?? "";

  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);
  const [loading,         setLoading]         = useState(false);

  // Validasi link — pastikan semua param ada
  const isLinkValid = userId && token && expires && signature;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password)                    return setError("Kata sandi wajib diisi.");
    if (password.length < 8)          return setError("Kata sandi minimal 8 karakter.");
    if (password !== confirmPassword) return setError("Konfirmasi kata sandi tidak cocok.");

    setLoading(true);
    try {
      // POST /auth/reset-password/:userId/:token?expires=...&signature=...
      // body: { password }
      const url = `${BASE_URL}/auth/reset-password/${userId}/${token}?expires=${expires}&signature=${signature}`;

      const res  = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Response error: { "error": "password reset link invalid" }
        throw new Error(data.error ?? "Link reset tidak valid atau sudah kedaluwarsa.");
      }

      // Response success: { "message": "Password reset successfully" }
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch (err) {
      setError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#233B6E] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px] bg-[#EFF0F4] rounded-3xl px-8 sm:px-12 pt-0 pb-10 shadow-2xl">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 pt-6">
          <img src={logo} alt="SI-BVET Lampung" className="h-20 w-auto object-contain" />
          <p className="text-[#233B6E] font-extrabold text-lg tracking-tight mt-2 leading-tight text-center">
            SI-BVET Lampung
          </p>
          <p className="text-[#415F9D] text-sm font-medium mt-0.5 text-center">
            Sistem Informasi Balai Veteriner Lampung
          </p>
        </div>

        {/* Link tidak valid */}
        {!isLinkValid ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#233B6E] text-base">Link Tidak Valid</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Link reset kata sandi tidak valid atau sudah kedaluwarsa.
                Silakan minta link baru.
              </p>
            </div>
            <Link to="/forgot-password"
              className="mt-2 w-full bg-[#233B6E] hover:bg-[#1a2d56] text-white
                font-bold text-sm py-3.5 rounded-2xl transition-all text-center block">
              Minta Link Baru
            </Link>
          </div>

        ) : success ? (
          /* ── Sukses ── */
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#233B6E] text-base">Kata Sandi Berhasil Direset!</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Kata sandi Anda telah berhasil diubah. Anda akan diarahkan ke halaman login...
              </p>
            </div>
            <Link to="/login"
              className="mt-2 w-full bg-[#233B6E] hover:bg-[#1a2d56] text-white
                font-bold text-sm py-3.5 rounded-2xl transition-all text-center block">
              Ke Halaman Masuk
            </Link>
          </div>

        ) : (
          /* ── Form Reset ── */
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div>
              <h1 className="text-[#233B6E] font-extrabold text-xl">Reset Kata Sandi</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Silahkan masukkan kata sandi baru yang akan digunakan pada kolom di bawah ini.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <InputField
              label="Kata Sandi"
              type={showPass ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={e => setPassword(e.target.value)}
              rightSlot={
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showPass} />
                </button>
              }
            />

            <InputField
              label="Konfirmasi Kata Sandi"
              type={showConfirm ? "text" : "password"}
              placeholder="Ulangi Kata Sandi"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              rightSlot={
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showConfirm} />
                </button>
              }
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
                  Memproses...
                </span>
              ) : "Kirim"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}