import { useState, useEffect, useMemo } from "react";
import {
  getAllAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
  verifyUser,
} from "../../services/superAdminServices";
​
const UNIT_LAB_OPTIONS = [
  "Virologi", "Bakteriologi", "Kesmavet", "Bioteknologi",
  "Parasitologi", "Patologi", "Epidemiologi",
];
​
const ROLE_OPTIONS = [
  { value: "admin",      label: "Petugas" },
  { value: "superadmin", label: "Admin" },
];
​
const roleLabel = (role) =>
  role === "superadmin" || role === "superAdmin" ? "Admin" : "Petugas";
​
const VIEW = { LIST: "list", TAMBAH: "tambah", DETAIL: "detail" };
​
function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const cls = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-center
      justify-between gap-3 ${cls}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="w-3.5 h-3.5">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
    </div>
  );
}
​
function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
​
function TextInput({ value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <input type={type} value={value ?? ""} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800
        outline-none transition focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        ${disabled ? "border-gray-200" : "border-gray-300"}`}
    />
  );
}
​
function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select value={value ?? ""} onChange={onChange}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
        text-gray-800 outline-none transition focus:ring-2 focus:ring-[#233B6E]/25
        focus:border-[#233B6E] bg-white">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}
​
function StatusBadge({ verified }) {
  return verified
    ? <span className="inline-flex items-center gap-1.5 text-[11px] font-bold
        bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Sudah Verifikasi
      </span>
    : <span className="inline-flex items-center gap-1.5 text-[11px] font-bold
        bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        Belum Verifikasi
      </span>;
}
​
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}
​
const PER_PAGE = 10;
​
function FormTambah({ onBack, onSuccess }) {
  const [form, setForm] = useState({
    fullname: "", email: "", phone: "",
    password: "", confirmPassword: "",
    position: "", unit_lab: "",
    employee_no: "", role: "admin",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
​
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));
​
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
​
    // validasi
    if (!form.fullname)         return setError("Nama lengkap wajib diisi.");
    if (!form.email)            return setError("Email wajib diisi.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError("Format email tidak valid.");
    if (!form.phone)            return setError("No. telepon wajib diisi.");
    if (!form.unit_lab)         return setError("Unit lab wajib dipilih.");
    if (!form.position)         return setError("Posisi wajib diisi.");
    if (!form.employee_no)      return setError("NIP wajib diisi.");
    if (!form.password)         return setError("Kata sandi wajib diisi.");
    if (form.password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (form.password !== form.confirmPassword) return setError("Konfirmasi kata sandi tidak cocok.");
​
    setSaving(true);
    try {
      const res = await createAdminAccount({
        fullname:    form.fullname,
        email:       form.email,
        phone:       form.phone,
        password:    form.password,
        position:    form.position,
        unit_lab:    form.unit_lab,
        employee_no: form.employee_no,
        role:        form.role,
      });
      let body = {};
      try { body = await res.json(); } catch {}
      if (!res.ok) throw new Error(body.error ?? body.message ?? "Gagal membuat akun.");
      onSuccess("Akun petugas berhasil ditambahkan.");
    } catch (err) {
      setError(err.message ?? "Gagal membuat akun.");
    } finally {
      setSaving(false);
    }
  };
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#233B6E]" />
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="font-bold text-[#233B6E] text-base">Tambah Petugas</h2>
      </div>
​
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Alert type="error" msg={error} onClose={() => setError("")} />
​
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" required>
            <TextInput type="email" value={form.email} onChange={set("email")}
              placeholder="Masukkan Alamat Email" />
          </Field>
          <Field label="Unit Lab" required>
            <SelectInput value={form.unit_lab} onChange={set("unit_lab")}
              options={UNIT_LAB_OPTIONS} placeholder="Masukkan Unit Lab" />
          </Field>
          <Field label="Nama Lengkap" required>
            <TextInput value={form.fullname} onChange={set("fullname")}
              placeholder="Masukkan Nama Lengkap" />
          </Field>
          <Field label="No. Telepon" required>
            <TextInput value={form.phone} onChange={set("phone")}
              placeholder="08XXXXXXXXXX" />
          </Field>
          <Field label="NIP" required>
            <TextInput value={form.employee_no} onChange={set("employee_no")}
              placeholder="Masukkan Nomor NIP Petugas" />
          </Field>
          <Field label="Posisi" required>
            <TextInput value={form.position} onChange={set("position")}
              placeholder="contoh: Kepala Lab" />
          </Field>
          <Field label="Role" required>
            <SelectInput value={form.role} onChange={set("role")}
              options={ROLE_OPTIONS} />
          </Field>
        </div>
​
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Kata Sandi" required>
            <TextInput type="password" value={form.password} onChange={set("password")}
              placeholder="Minimal 8 Karakter" />
          </Field>
          <Field label="Konfirmasi Kata Sandi" required>
            <TextInput type="password" value={form.confirmPassword}
              onChange={set("confirmPassword")} placeholder="Minimal 8 Karakter" />
          </Field>
        </div>
​
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all
              disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {saving ? <><Spinner />Menyimpan...</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Simpan
            </>}
          </button>
        </div>
      </form>
    </div>
  );
}
​
function DetailAkun({ account, onBack, onSuccess }) {
  const [form, setForm] = useState({
    fullname:    account.fullname    ?? "",
    email:       account.email       ?? "",
    phone:       account.phone       ?? "",
    position:    account.position    ?? "",
    unit_lab:    account.unit_lab    ?? "",
    employee_no: account.employee_no ?? "",
    role:        account.role        ?? "admin",
  });
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
​
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));
​
  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await updateAdminAccount(account.id, {
        fullname:    form.fullname,
        email:       form.email,
        phone:       form.phone,
        position:    form.position,
        unit_lab:    form.unit_lab,
        employee_no: form.employee_no,
        role:        form.role,
      });
      let body = {};
      try { body = await res.json(); } catch {}
      if (!res.ok) throw new Error(body.error ?? body.message ?? "Gagal menyimpan perubahan.");
      onSuccess("Perubahan akun berhasil disimpan.");
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };
​
  const handleVerify = async () => {
    if (!window.confirm(`Verifikasi akun ${account.email}?\nPetugas akan mendapatkan email untuk login.`)) return;
    setLoading(true); setError("");
    try {
      const res = await verifyUser(account.id);
      let body = {};
      try { body = await res.json(); } catch {}
      if (!res.ok) throw new Error(body.error ?? body.message ?? "Gagal memverifikasi akun.");
      onSuccess("Akun berhasil diverifikasi. Email login dikirim ke petugas.");
    } catch (err) {
      setError(err.message ?? "Gagal memverifikasi.");
    } finally {
      setLoading(false);
    }
  };
​
  const handleDelete = async () => {
    if (!window.confirm(`Hapus akun ${account.email}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLoading(true); setError("");
    try {
      const res = await deleteAdminAccount(account.id);
      let body = {};
      try { body = await res.json(); } catch {}
      if (!res.ok) throw new Error(body.error ?? "Gagal menghapus akun.");
      onSuccess("Akun berhasil dihapus.");
    } catch (err) {
      setError(err.message ?? "Gagal menghapus.");
    } finally {
      setLoading(false);
    }
  };
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#233B6E]" />
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="font-bold text-[#233B6E] text-base">Detail Petugas</h2>
        </div>
        <StatusBadge verified={account.is_verified} />
      </div>
​
      <div className="p-5 space-y-4">
        <Alert type="error" msg={error} onClose={() => setError("")} />
​
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email">
            <TextInput value={form.email} onChange={set("email")}
              placeholder="Masukkan Alamat Email" />
          </Field>
          <Field label="Unit Lab">
            <SelectInput value={form.unit_lab} onChange={set("unit_lab")}
              options={UNIT_LAB_OPTIONS} placeholder="Masukkan Unit Lab" />
          </Field>
          <Field label="Nama Lengkap">
            <TextInput value={form.fullname} onChange={set("fullname")}
              placeholder="Nama lengkap" />
          </Field>
          <Field label="No. Telepon">
            <TextInput value={form.phone} onChange={set("phone")}
              placeholder="08XXXXXXXXXX" />
          </Field>
          <Field label="NIP">
            <TextInput value={form.employee_no} onChange={set("employee_no")}
              placeholder="Masukkan Nomor NIP Petugas" />
          </Field>
          <Field label="Posisi">
            <TextInput value={form.position} onChange={set("position")}
              placeholder="contoh: Kepala Lab" />
          </Field>
          <Field label="Role">
            <SelectInput value={form.role} onChange={set("role")}
              options={ROLE_OPTIONS} />
          </Field>
          <Field label="Kata Sandi">
            <TextInput type="password" disabled placeholder="Minimal 8 karakter" />
          </Field>
          <Field label="Konfirmasi Kata Sandi">
            <TextInput type="password" disabled placeholder="Minimal 8 karakter" />
          </Field>
        </div>
​
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={handleDelete} disabled={loading}
            className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100
              text-red-600 font-bold text-sm px-5 py-2.5 rounded-xl border border-red-200
              transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <Spinner /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            )}
            Hapus
          </button>
​
          <button onClick={handleSave} disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all
              disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {saving ? <><Spinner />Menyimpan...</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Simpan
            </>}
          </button>
​
          {!account.is_verified && (
            <button onClick={handleVerify} disabled={loading}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all
                disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {loading ? <><Spinner />Memproses...</> : <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Verifikasi
              </>}
            </button>
          )}
        </div>
​
        {account.is_verified && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3
            text-green-700 text-sm font-medium text-center">
            Akun ini sudah diverifikasi — petugas dapat login menggunakan email yang dikirim.
          </div>
        )}
      </div>
    </div>
  );
}
​
export default function ManajemenAkun() {
  const [view,       setView]       = useState(VIEW.LIST);
  const [accounts,   setAccounts]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [flashOk,    setFlashOk]    = useState("");
  const [search,     setSearch]     = useState("");
  const [filterLab,  setFilterLab]  = useState("Semua");
  const [page,       setPage]       = useState(1);
​
  useEffect(() => { fetchAccounts(); }, []);
​
  const fetchAccounts = async () => {
    setLoading(true); setError("");
    try {
      const res = await getAllAdminAccounts();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setError("Gagal memuat daftar akun.");
    } finally {
      setLoading(false);
    }
  };
​
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return accounts.filter(a => {
      const matchSearch = !q ||
        a.email?.toLowerCase().includes(q) ||
        a.fullname?.toLowerCase().includes(q) ||
        a.employee_no?.toLowerCase().includes(q);
      const matchLab = filterLab === "Semua" || a.unit_lab === filterLab;
      return matchSearch && matchLab;
    });
  }, [accounts, search, filterLab]);
​
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
​
  const handleSearch   = e => { setSearch(e.target.value); setPage(1); };
  const handleFilterLab= e => { setFilterLab(e.target.value); setPage(1); };
​
  const handleSuccess = async (msg) => {
    setFlashOk(msg);
    setView(VIEW.LIST);
    setSelected(null);
    await fetchAccounts();
    setTimeout(() => setFlashOk(""), 4000);
  };
​
  if (view === VIEW.TAMBAH) {
    return (
      <div className="space-y-3 max-w-3xl">
        <h1 className="text-xl font-bold text-[#233B6E]">Manajemen Akun</h1>
        <p className="text-sm text-gray-400">Daftar Akun Petugas</p>
        <FormTambah
          onBack={() => setView(VIEW.LIST)}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }
​
  if (view === VIEW.DETAIL && selected) {
    return (
      <div className="space-y-3 max-w-3xl">
        <h1 className="text-xl font-bold text-[#233B6E]">Manajemen Akun</h1>
        <p className="text-sm text-gray-400">Daftar Akun Petugas</p>
        <DetailAkun
          account={selected}
          onBack={() => { setView(VIEW.LIST); setSelected(null); }}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }
​
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#233B6E]">Manajemen Akun</h1>
​
      <Alert type="error"   msg={error}   onClose={() => setError("")} />
      <Alert type="success" msg={flashOk} onClose={() => setFlashOk("")} />
​
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap
          items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search} onChange={handleSearch}
                placeholder="Cari Pengujian"
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]
                  w-44" />
            </div>
​
            {/* Filter unit lab */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="font-medium">Unit Lab:</span>
              <select value={filterLab} onChange={handleFilterLab}
                className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm
                  outline-none focus:ring-2 focus:ring-[#233B6E]/20 bg-white">
                <option value="Semua">Semua</option>
                {UNIT_LAB_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
​
          {/* Tombol tambah */}
          <button onClick={() => setView(VIEW.TAMBAH)}
            className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Akun
          </button>
        </div>
​
        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["No.", "Email", "Unit Lab", "Role", "Status", "Detail"].map(h => (
                  <th key={h} className={`px-4 py-3 ${h === "Email" ? "text-left" : "text-center"} text-xs font-semibold
                    text-gray-500 uppercase tracking-wide whitespace-nowrap`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <span className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Spinner />Memuat data...
                  </span>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {search || filterLab !== "Semua"
                    ? "Tidak ada hasil pencarian."
                    : "Belum ada akun petugas."}
                </td></tr>
              ) : paginated.map((acc, i) => (
                <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {(page - 1) * PER_PAGE + i + 1}.
                  </td>
                  <td className="px-4 py-3 text-left text-gray-700">{acc.email}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{acc.unit_lab ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      roleLabel(acc.role) === "Admin"
                        ? "bg-[#233B6E]/10 text-[#233B6E]"
                        : "bg-violet-100 text-violet-700"
                    }`}>
                      {roleLabel(acc.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge verified={acc.is_verified} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelected(acc); setView(VIEW.DETAIL); }}
                      className="inline-flex items-center gap-1.5 text-[#233B6E]
                        text-xs font-semibold hover:underline">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className="w-4 h-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
​
        <div className="px-4 py-3 border-t border-gray-100 flex items-center
          justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400">
            Halaman ke {page} dari {totalPages} halaman
          </span>
          <div className="flex items-center gap-1">
            <PBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3"><path d="M15 18l-6-6 6-6"/></svg>
            </PBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
              .map(n => (
                <PBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PBtn>
              ))}
            <PBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-3 h-3"><path d="M9 18l6-6-6-6"/></svg>
            </PBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
​
function PBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded border text-xs
        font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "bg-[#233B6E] text-white border-[#233B6E]"
          : "border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
      {children}
    </button>
  );
}