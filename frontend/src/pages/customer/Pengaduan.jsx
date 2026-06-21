import { useState, useRef } from "react";
import { apiFetch } from "../../services/api";

/* ── Reusable field row ── */
function Field({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-6">
      <span className="text-sm text-[#415F9D] font-medium sm:w-56 flex-shrink-0 sm:pt-2.5">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ── Text input ── */
function TextInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
        text-gray-800 outline-none transition
        focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
        placeholder-gray-400 disabled:bg-gray-50"
    />
  );
}

/* ── Textarea ── */
function TextArea({ value, onChange, placeholder, label }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-[#415F9D] font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
          text-gray-800 outline-none transition resize-none
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
          placeholder-gray-400"
      />
    </div>
  );
}

export default function Pengaduan() {
  const [form, setForm] = useState({
    fullname:          "",
    address:           "",
    nik:               "",
    date_of_complaint: "",
    subjects:          "",
    description:       "",
  });
  const [attachment, setAttachment] = useState(null);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);
  const fileRef                     = useRef();

  const set = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    if (!form.fullname)           return "Nama lengkap wajib diisi.";
    if (!form.address)            return "Alamat lengkap wajib diisi.";
    if (!form.nik)                return "NIK wajib diisi.";
    if (!form.date_of_complaint)  return "Tanggal melapor wajib diisi.";
    if (!form.subjects)           return "Pelayanan yang tidak sesuai standar wajib diisi.";
    if (!form.description)        return "Saran dan gagasan wajib diisi.";
    if (!agreed)                  return "Anda harus menyetujui pernyataan di bawah.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("subjects",          form.subjects);
      fd.append("description",
        `Nama: ${form.fullname}\nAlamat: ${form.address}\nNIK: ${form.nik}\n\n${form.description}`
      );
      fd.append("date_of_complaint", form.date_of_complaint);
      if (attachment) fd.append("attachment", attachment);

      const res = await apiFetch("/customer/complaints", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal mengirim pengaduan.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success state ── */
  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
            justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#233B6E] mb-2">Pengaduan Terkirim!</h2>
          <p className="text-sm text-gray-500 mb-8">
            Pengaduan Anda telah berhasil dikirim. Tim kami akan segera menindaklanjuti.
          </p>
          <button
            onClick={() => { setSuccess(false); setForm({ fullname:"",address:"",nik:"",date_of_complaint:"",subjects:"",description:"" }); setAgreed(false); setAttachment(null); }}
            className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
              px-8 py-3 rounded-xl transition-all">
            Buat Pengaduan Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Pengaduan</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#233B6E] pb-3 border-b border-gray-100">
            Formulir Pengajuan Pengaduan
          </h2>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600
              text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Nama */}
          <Field label="Nama Lengkap/Perusahaan">
            <TextInput value={form.fullname} onChange={set("fullname")}
              placeholder="Masukkan Nama Lengkap Anda" />
          </Field>

          {/* Alamat */}
          <Field label="Alamat Lengkap">
            <TextInput value={form.address} onChange={set("address")}
              placeholder="Masukkan Alamat Anda" />
          </Field>

          {/* NIK */}
          <Field label="Nomor Induk Kependudukan (NIK)">
            <TextInput value={form.nik} onChange={set("nik")}
              placeholder="Masukkan NIK Anda" />
          </Field>

          {/* Tanggal */}
          <Field label="Tanggal Melapor">
            <div className="relative">
              <input
                type="date"
                value={form.date_of_complaint}
                onChange={set("date_of_complaint")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                  text-gray-800 outline-none transition
                  focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]"
              />
            </div>
          </Field>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-2" />

          {/* Subjects */}
          <TextArea
            label="Pelayanan Yang Tidak Sesuai Standar"
            value={form.subjects}
            onChange={set("subjects")}
            placeholder="Uraian Jawaban Anda Terkait Pelayanan Yang Tidak Sesuai Standar"
          />

          {/* Description */}
          <TextArea
            label="Saran dan Gagasan"
            value={form.description}
            onChange={set("description")}
            placeholder="Sumbang Pikiran, Saran, Gagasan, Permintaan Penyelesaian Masalah yang Diajukan"
          />

          {/* Lampiran */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-[#415F9D] font-medium">
              Lampiran Bukti <span className="text-gray-400 font-normal">(opsional)</span>
            </span>
            <button type="button" onClick={() => fileRef.current.click()}
              className="w-full border border-dashed border-gray-300 rounded-xl
                px-4 py-3 text-sm flex items-center gap-2 text-gray-400
                hover:border-[#233B6E] hover:text-[#233B6E] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {attachment ? attachment.name : "Pilih file bukti pendukung..."}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setAttachment(e.target.files[0] ?? null)} />
            <p className="text-[11px] text-gray-400">Format: PDF, JPG, PNG. Maks 5MB.</p>
          </div>

          {/* Persetujuan */}
          <div className="flex items-start justify-between gap-4 pt-2 pb-1">
            <p className="text-sm text-[#415F9D] font-medium leading-snug flex-1">
              Saya Memahami Bahwa Pelaporan DUMAS Harus
              Disertai Dengan Bukti-Bukti Sebagai Pendukung
            </p>
            <button
              type="button"
              onClick={() => setAgreed(p => !p)}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all
                flex items-center justify-center
                ${agreed
                  ? "bg-[#233B6E] border-[#233B6E]"
                  : "border-gray-400 bg-white"
                }`}
            >
              {agreed && (
                <svg viewBox="0 0 12 12" fill="none" stroke="white"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-3 h-3">
                  <path d="M2 6l3 3 5-5"/>
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tombol Ajukan di luar card, pojok kanan bawah */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
            text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
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
  );
}