import { useState, useEffect, useCallback } from "react";
import { getProfile, updateProfile, changePassword } from "../../services/adminServices";
import { getUser } from "../../utils/auth";

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <path d="M1 1l22 22"/></>
      }
    </svg>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = "text", rightSlot }) {
  return (
    <div className="relative">
      <input type={type} value={value ?? ""} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800
          outline-none transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${disabled ? "border-gray-200" : "border-gray-300"}
          ${rightSlot ? "pr-10" : ""}`}
      />
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const cls = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start
      justify-between gap-3 ${cls}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="w-3.5 h-3.5">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-bold text-[#233B6E] uppercase tracking-wider pb-2
      border-b border-gray-100">{children}</h2>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

export default function AdminProfil() {
  const localUser = getUser();
  const [initLoading, setInitLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [passErr,     setPassErr]     = useState("");
  const [passOk,      setPassOk]      = useState("");

  // Field yang bisa diedit 
  const [fullname, setFullname] = useState("");
  const [phone,    setPhone]    = useState("");

  // Field tidak bisa diedit
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState("");
  const [position, setPosition] = useState("");
  const [unitLab,  setUnitLab]  = useState("");

  // Ganti kata sandi
  const [currentPass, setCurrentPass] = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCur,     setShowCur]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConf,    setShowConf]    = useState(false);

  const initials = (fullname || localUser?.fullname || "A")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

  const applyProfile = useCallback((p) => {
    const adminData = p.admin ?? {};
    const u = p.user_info ?? p.user ?? p;
    setFullname(u.fullname   ?? p.fullname           ?? "");
    setEmail(u.email         ?? p.email              ?? "");
    setPhone(u.phone         ?? p.phone              ?? "");
    setRole(u.role           ?? p.role               ?? "");
    setPosition(p.position   ?? adminData.position  ?? "");
    setUnitLab(p.unit_lab    ?? adminData.unit_lab   ?? "");
  }, []);

  useEffect(() => {
    (async () => {
      setInitLoading(true);
      try {
        const res  = await getProfile();
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal memuat profil.");
        applyProfile(json.profile ?? json);
      } catch (err) {
        setError(err.message ?? "Gagal memuat profil.");
      } finally {
        setInitLoading(false);
      }
    })();
  }, [applyProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!fullname.trim()) { setError("Nama lengkap wajib diisi."); return; }
    setSaving(true);
    try {
      const res  = await updateProfile({ fullname: fullname.trim(), phone });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal menyimpan profil.");
      setSuccess("Profil berhasil disimpan.");
      try {
        const r2 = await getProfile();
        const j2 = await r2.json();
        if (r2.ok) applyProfile(j2.profile ?? j2);
      } catch {
      }
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassErr(""); setPassOk("");
    if (!currentPass)            { setPassErr("Kata sandi saat ini wajib diisi."); return; }
    if (!newPass)                { setPassErr("Kata sandi baru wajib diisi."); return; }
    if (newPass.length < 8)      { setPassErr("Kata sandi baru minimal 8 karakter."); return; }
    if (newPass !== confirmPass) { setPassErr("Konfirmasi kata sandi tidak cocok."); return; }
    setSavingPass(true);
    try {
      const res  = await changePassword({ current_password: currentPass, new_password: newPass });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal mengganti kata sandi.");
      setPassOk("Kata sandi berhasil diubah.");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (err) {
      setPassErr(err.message ?? "Gagal mengganti kata sandi.");
    } finally {
      setSavingPass(false);
    }
  };

  if (initLoading) return (
    <div className="flex items-center justify-center h-64">
      <span className="flex items-center gap-2 text-gray-400 text-sm">
        <Spinner />Memuat profil...
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Profil Saya</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6
        flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#233B6E] text-white text-2xl
          font-extrabold flex items-center justify-center ring-4 ring-[#233B6E]/10 flex-shrink-0">
          {initials}
        </div>
        <div className="text-center sm:text-left flex-1 min-w-0">
          <p className="text-lg font-extrabold text-[#233B6E] truncate">
            {fullname || "—"}
          </p>
          <p className="text-sm text-gray-400 mt-0.5 truncate">{email}</p>
          <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
            <span className="text-[10px] font-bold uppercase tracking-wider
              bg-[#EEF0F8] text-[#415F9D] rounded-full px-3 py-1">Petugas Lab</span>
            {position && (
              <span className="text-[10px] font-bold uppercase tracking-wider
                bg-gray-100 text-gray-600 rounded-full px-3 py-1">{position}</span>
            )}
            {unitLab && (
              <span className="text-[10px] font-bold uppercase tracking-wider
                bg-gray-100 text-gray-600 rounded-full px-3 py-1">{unitLab}</span>
            )}
          </div>
        </div>
      </div>

      {/* Data diri */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <Alert type="error"   msg={error}   onClose={() => setError("")} />
          <Alert type="success" msg={success} onClose={() => setSuccess("")} />
          <SectionTitle>Data Diri</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Bisa diedit */}
            <Field label="Nama Lengkap" required>
              <TextInput value={fullname} onChange={e => setFullname(e.target.value)}
                placeholder="Nama lengkap" />
            </Field>
            <Field label="No. Telepon">
              <TextInput value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="08XXXXXXXXXX" />
            </Field>

            {/* Tidak bisa diedit */}
            <Field label="Email" hint="Email tidak dapat diubah">
              <TextInput value={email} disabled />
            </Field>
            <Field label="Jabatan / Posisi" hint="Diatur oleh Super Admin">
              <TextInput value={position} disabled />
            </Field>
            <Field label="Unit Lab" hint="Diatur oleh Super Admin">
              <TextInput value={unitLab} disabled />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {saving ? <><Spinner />Menyimpan...</> : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Ganti kata sandi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <SectionTitle>Ganti Kata Sandi</SectionTitle>
          <Alert type="error"   msg={passErr} onClose={() => setPassErr("")} />
          <Alert type="success" msg={passOk}  onClose={() => setPassOk("")} />

          <Field label="Kata Sandi Saat Ini" required>
            <TextInput type={showCur ? "text" : "password"}
              value={currentPass} onChange={e => setCurrentPass(e.target.value)}
              placeholder="Kata sandi saat ini"
              rightSlot={
                <button type="button" onClick={() => setShowCur(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showCur} />
                </button>
              }
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kata Sandi Baru" required hint="Minimal 8 karakter">
              <TextInput type={showNew ? "text" : "password"}
                value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Kata sandi baru"
                rightSlot={
                  <button type="button" onClick={() => setShowNew(p => !p)}
                    className="hover:text-[#233B6E] transition-colors">
                    <EyeIcon open={showNew} />
                  </button>
                }
              />
            </Field>
            <Field label="Konfirmasi Kata Sandi Baru" required>
              <TextInput type={showConf ? "text" : "password"}
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                rightSlot={
                  <button type="button" onClick={() => setShowConf(p => !p)}
                    className="hover:text-[#233B6E] transition-colors">
                    <EyeIcon open={showConf} />
                  </button>
                }
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingPass}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {savingPass ? <><Spinner />Menyimpan...</> : "Ganti Kata Sandi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}