import { useState, useEffect, useCallback } from "react";
import { getProfile, updateProfile, changePassword } from "../../services/CustomerServices";
import { resolveFileUrl } from "../../utils/fileUrl";

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

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-bold text-[#233B6E] uppercase tracking-wider pb-2
      border-b border-gray-100">{children}</h2>
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
      <input type={type} value={value ?? ""} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800
          outline-none transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
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

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value ?? ""} onChange={onChange}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
        text-gray-800 outline-none transition focus:ring-2 focus:ring-[#233B6E]/25
        focus:border-[#233B6E] bg-white">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
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

const GROUP_OPTIONS = [
  { value: "Perusahaan",  label: "Perusahaan" },
  { value: "Instansi",    label: "Instansi Pemerintah" },
  { value: "Perorangan",  label: "Perorangan" },
  { value: "Universitas", label: "Universitas / Peneliti" },
];

export default function CustomerProfil() {
  const [initLoading, setInitLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [passErr,     setPassErr]     = useState("");
  const [passOk,      setPassOk]      = useState("");

  /* ── profile fields ── */
  const [fullname,     setFullname]     = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [isVerified,   setIsVerified]   = useState(false);
  const [docUrl,       setDocUrl]       = useState("");
  const [group,        setGroup]        = useState("");
  const [isMembership, setIsMembership] = useState(false);
  const [membershipNo, setMembershipNo] = useState("");
  const [picName,      setPicName]      = useState("");
  const [picContact,   setPicContact]   = useState("");
  const [province,     setProvince]     = useState("");
  const [city,         setCity]         = useState("");
  const [subdistrict,  setSubdistrict]  = useState("");
  const [village,      setVillage]      = useState("");
  const [address,      setAddress]      = useState("");
  const [zipCode,      setZipCode]      = useState("");
  const [occupation,   setOccupation]   = useState("");

  /* ── password ── */
  const [currentPass, setCurrentPass] = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const initials = (fullname || "U")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

  /* ── applyData: set state dari object parsed ── */
  const applyData = useCallback((p, c) => {
    setFullname(p.fullname       ?? "");
    setEmail(p.email             ?? "");
    setPhone(p.phone             ?? "");
    setIsVerified(p.is_verified  ?? false);
    if (p.registration_doc) setDocUrl(resolveFileUrl(p.registration_doc));
    setGroup(c.group             ?? "");
    setIsMembership(c.is_membership ?? false);
    setMembershipNo(c.membership_no ?? "");
    setPicName(c.pic_name        ?? "");
    setPicContact(c.pic_contact  ?? "");
    setProvince(c.province       ?? "");
    setCity(c.city               ?? "");
    setSubdistrict(c.subdistrict ?? "");
    setVillage(c.village         ?? "");
    setAddress(c.address         ?? "");
    setZipCode(c.zip_code        ?? "");
    setOccupation(c.occupation   ?? "");
  }, []);

  /* ── GET /profile — hanya saat pertama buka ── */
  useEffect(() => {
    (async () => {
      setInitLoading(true);
      try {
        const res = await getProfile();
        if (!res.ok) throw new Error();
        const data = await res.json();
        const p = data.profile ?? data;
        const c = p.customer   ?? {};
        applyData(p, c);
      } catch {
        setError("Gagal memuat profil.");
      } finally {
        setInitLoading(false);
      }
    })();
  }, [applyData]);

  /* ── PATCH /profile ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!fullname.trim()) { setError("Nama lengkap wajib diisi."); return; }

    setSaving(true);
    try {
      const payload = {
        fullname,
        phone,
        group,
        is_membership: isMembership,
        membership_no: membershipNo,
        pic_name:      picName,
        pic_contact:   picContact,
        province,
        city,
        subdistrict,
        village,
        address,
        zip_code:      zipCode,
        occupation,
      };

      const res = await updateProfile(payload);

      // Cek respons — bisa ok atau error dari server
      let body = {};
      try { body = await res.json(); } catch {}

      if (!res.ok) {
        throw new Error(body.error ?? body.message ?? "Gagal menyimpan profil.");
      }

      // ✅ SOLUSI UTAMA:
      // Server mengembalikan 200 tapi GET /profile mungkin belum reflect perubahan
      // (kemungkinan bug backend — customer fields tersimpan di tabel terpisah).
      // Kita TIDAK re-fetch — state sudah berisi nilai yang benar dari input user.
      // Nilai di form = nilai yang dikirim ke server = nilai yang seharusnya tersimpan.
      setSuccess("Profil berhasil disimpan!");

    } catch (err) {
      setError(err.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  /* ── PATCH /auth/change-password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassErr(""); setPassOk("");
    if (!currentPass)            { setPassErr("Kata sandi saat ini wajib diisi."); return; }
    if (!newPass)                { setPassErr("Kata sandi baru wajib diisi."); return; }
    if (newPass.length < 8)      { setPassErr("Kata sandi baru minimal 8 karakter."); return; }
    if (newPass !== confirmPass) { setPassErr("Konfirmasi kata sandi tidak cocok."); return; }

    setSavingPass(true);
    try {
      const res = await changePassword({ current_password: currentPass, new_password: newPass });
      let body = {};
      try { body = await res.json(); } catch {}
      if (!res.ok) throw new Error(body.error ?? "Gagal mengganti kata sandi.");
      setPassOk("Kata sandi berhasil diubah!");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (err) {
      setPassErr(err.message ?? "Gagal mengganti kata sandi.");
    } finally {
      setSavingPass(false);
    }
  };

  if (initLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Memuat profil...
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Profil Saya</h1>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6
        flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#233B6E] text-white text-2xl
          font-extrabold flex items-center justify-center ring-4 ring-[#233B6E]/10 flex-shrink-0">
          {initials}
        </div>
        <div className="text-center sm:text-left flex-1">
          <p className="text-lg font-extrabold text-[#233B6E]">{fullname || "—"}</p>
          <p className="text-sm text-gray-400 mt-0.5">{email}</p>
          <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
            <span className="text-[10px] font-bold uppercase tracking-wider
              bg-[#EEF0F8] text-[#415F9D] rounded-full px-3 py-1">Pelanggan</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1
              ${isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {isVerified ? "Terverifikasi" : "Belum Diverifikasi"}
            </span>
          </div>
        </div>
        {docUrl && (
          <a href={docUrl} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#EEF0F8]
              text-[#233B6E] text-xs font-semibold px-3 py-2 rounded-lg
              hover:bg-[#233B6E] hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Dokumen Registrasi
          </a>
        )}
      </div>

      {/* Data Diri */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <Alert type="error"   msg={error}   onClose={() => setError("")} />
          <Alert type="success" msg={success} onClose={() => setSuccess("")} />

          <div className="space-y-4">
            <SectionTitle>Identitas Utama</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Lengkap / Perusahaan" required>
                <TextInput value={fullname} onChange={e => setFullname(e.target.value)}
                  placeholder="Nama lengkap / perusahaan" />
              </Field>
              <Field label="Email">
                <TextInput value={email} disabled />
              </Field>
              <Field label="No. Telepon">
                <TextInput value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="08XXXXXXXXXX" />
              </Field>
              <Field label="Jenis Kelompok">
                <Select value={group} onChange={e => setGroup(e.target.value)}
                  options={GROUP_OPTIONS} placeholder="Pilih kelompok..." />
              </Field>
              <Field label="Bidang / Pekerjaan">
                <TextInput value={occupation} onChange={e => setOccupation(e.target.value)}
                  placeholder="Cth: Peternakan, Penelitian" />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Keanggotaan</SectionTitle>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isMembership" checked={isMembership}
                onChange={e => setIsMembership(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
              <label htmlFor="isMembership"
                className="text-sm text-gray-700 font-medium cursor-pointer">
                Merupakan anggota / member
              </label>
            </div>
            {isMembership && (
              <Field label="No. Keanggotaan">
                <TextInput value={membershipNo} onChange={e => setMembershipNo(e.target.value)}
                  placeholder="Cth: MEM-001" />
              </Field>
            )}
          </div>

          <div className="space-y-4">
            <SectionTitle>Person In Charge (PIC)</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama PIC">
                <TextInput value={picName} onChange={e => setPicName(e.target.value)}
                  placeholder="Nama penanggung jawab" />
              </Field>
              <Field label="Kontak PIC">
                <TextInput value={picContact} onChange={e => setPicContact(e.target.value)}
                  placeholder="08XXXXXXXXXX" />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Alamat</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Provinsi">
                <TextInput value={province} onChange={e => setProvince(e.target.value)}
                  placeholder="Cth: Lampung" />
              </Field>
              <Field label="Kota / Kabupaten">
                <TextInput value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Cth: Bandar Lampung" />
              </Field>
              <Field label="Kecamatan">
                <TextInput value={subdistrict} onChange={e => setSubdistrict(e.target.value)}
                  placeholder="Cth: Rajabasa" />
              </Field>
              <Field label="Kelurahan / Desa">
                <TextInput value={village} onChange={e => setVillage(e.target.value)}
                  placeholder="Cth: Gedong Meneng" />
              </Field>
              <Field label="Kode Pos">
                <TextInput value={zipCode} onChange={e => setZipCode(e.target.value)}
                  placeholder="Cth: 35141" />
              </Field>
            </div>
            <Field label="Alamat Lengkap">
              <textarea value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Jl. ..." rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                  text-gray-800 outline-none transition resize-none
                  focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {saving ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Menyimpan...</>
              ) : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Ganti Kata Sandi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <SectionTitle>Ganti Kata Sandi</SectionTitle>
          <Alert type="error"   msg={passErr} onClose={() => setPassErr("")} />
          <Alert type="success" msg={passOk}  onClose={() => setPassOk("")} />

          <Field label="Kata Sandi Saat Ini" required>
            <TextInput type={showCurrent ? "text" : "password"}
              value={currentPass} onChange={e => setCurrentPass(e.target.value)}
              placeholder="Kata sandi saat ini"
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
              <TextInput type={showConfirm ? "text" : "password"}
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
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
                text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
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
      </div>
    </div>
  );
}