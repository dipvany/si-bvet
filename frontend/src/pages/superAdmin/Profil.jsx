import { useState, useEffect } from "react";
import { getProfile, updateProfile, changePassword } from "../../services/superAdminServices";

/* ─── tiny helpers ─────────────────────────────────────────────── */
function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      {open ? (
        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      ) : (
        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <path d="M1 1l22 22"/></>
      )}
    </svg>
  );
}

function Field({ label, required, children, hint }) {
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
      <input
        type={type} value={value ?? ""} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none
          transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${disabled ? "border-gray-200" : "border-gray-300"}
          ${rightSlot ? "pr-10" : ""}`}
      />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {rightSlot}
        </span>
      )}
    </div>
  );
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const s = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${s}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 mt-0.5">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#233B6E]" />
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-[#233B6E] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export default function SuperAdminProfil() {
  /* profile state */
  const [loading,     setLoading]     = useState(true);

  /* editable fields — sesuai API PATCH /profile */
  const [fullname,    setFullname]    = useState("");
  const [phone,       setPhone]       = useState("");
  const [institution, setInstitution] = useState("");

  /* read-only */
  const [email, setEmail] = useState("");

  /* profile save */
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr,    setProfileErr]    = useState("");
  const [profileOk,     setProfileOk]     = useState("");

  /* password — API butuh current_password + new_password */
  const [currentPass,  setCurrentPass]  = useState("");
  const [newPass,      setNewPass]      = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [savingPass,   setSavingPass]   = useState(false);
  const [passErr,      setPassErr]      = useState("");
  const [passOk,       setPassOk]       = useState("");

  const initials = (fullname || "SA")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true); setProfileErr("");
    try {
      const res = await getProfile();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      // API response: { profile: { id, fullname, email, phone, role, institution, ... } }
      const p = body.profile ?? body;
      setFullname(p.fullname       ?? "");
      setEmail(p.email             ?? "");
      setPhone(p.phone             ?? "");
      setInstitution(p.institution ?? "");
    } catch {
      setProfileErr("Gagal memuat profil. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileErr(""); setProfileOk("");
    if (!fullname.trim()) { setProfileErr("Nama lengkap wajib diisi."); return; }

    setSavingProfile(true);
    try {
      const res = await updateProfile({ fullname, phone, institution });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan profil.");
      }
      setProfileOk("Profil berhasil disimpan!");
      await fetchProfile();
    } catch (err) {
      setProfileErr(err.message ?? "Gagal menyimpan.");
    } finally {
      setSavingProfile(false);
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
      // API PATCH /auth/change-password — wajib kirim current_password + new_password
      const res = await changePassword({ current_password: currentPass, new_password: newPass });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal mengganti kata sandi.");
      }
      setPassOk("Kata sandi berhasil diubah!");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (err) {
      setPassErr(err.message ?? "Gagal mengganti kata sandi.");
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Memuat profil...
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Profil Saya</h1>

      {/* ── Avatar Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6
        flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#233B6E] text-white text-2xl
          font-extrabold flex items-center justify-center ring-4 ring-[#233B6E]/10 flex-shrink-0">
          {initials}
        </div>
        <div className="text-center sm:text-left">
          <p className="text-lg font-extrabold text-[#233B6E]">{fullname || "—"}</p>
          <p className="text-sm text-gray-400 mt-0.5">{email}</p>
          <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider
            bg-[#EEF0F8] text-[#415F9D] rounded-full px-3 py-1">
            Admin
          </span>
        </div>
      </div>

      {/* ── Data Diri ── */}
      <Section title="Data Diri">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Alert type="error"   msg={profileErr} onClose={() => setProfileErr("")} />
          <Alert type="success" msg={profileOk}  onClose={() => setProfileOk("")} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Lengkap" required>
              <TextInput value={fullname} onChange={e => setFullname(e.target.value)}
                placeholder="Nama lengkap" />
            </Field>
            <Field label="Email">
              <TextInput value={email} disabled />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="No. Telepon">
              <TextInput value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="08XXXXXXXXXX" />
            </Field>
            <Field label="Institusi / Instansi">
              <TextInput value={institution} onChange={e => setInstitution(e.target.value)}
                placeholder="Nama institusi" />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingProfile}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-7 py-2.5 rounded-xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {savingProfile ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Menyimpan...</>
              ) : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Ganti Kata Sandi ── */}
      <Section title="Ganti Kata Sandi">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Alert type="error"   msg={passErr} onClose={() => setPassErr("")} />
          <Alert type="success" msg={passOk}  onClose={() => setPassOk("")} />

          {/* current_password — wajib sesuai API contract */}
          <Field label="Kata Sandi Saat Ini" required>
            <TextInput
              type={showCurrent ? "text" : "password"}
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              placeholder="Masukkan kata sandi saat ini"
              rightSlot={
                <button type="button" onClick={() => setShowCurrent(p => !p)}
                  className="hover:text-[#233B6E] transition-colors">
                  <EyeIcon open={showCurrent} />
                </button>
              }
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Kata Sandi Baru" required hint="Minimal 8 karakter">
              <TextInput
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
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
              <TextInput
                type={showConfirm ? "text" : "password"}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                rightSlot={
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="hover:text-[#233B6E] transition-colors">
                    <EyeIcon open={showConfirm} />
                  </button>
                }
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingPass}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-7 py-2.5 rounded-xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {savingPass ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Menyimpan...</>
              ) : "Ganti Kata Sandi"}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}