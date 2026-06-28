import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { getCart, clearCart } from "../../utils/cart";
import { getUser } from "../../utils/auth";

/* ─── Konstanta ─── */
const TYPE_SERVICE  = ["Aktif", "Pasif"];
const PURPOSE       = ["Surveilans", "Diagnosa", "Monitoring", "Penelitian", "Ekspor", "Impor", "Lainnya"];
const SAMPLE_MODELS = ["Mamalia", "Unggas", "Rabies", "Model Lain"];
const PRESERVATIVES = ["Segar", "EDTA", "Heparin", "Formalin", "Gliserin", "NaOH", "NaCl", "PBS", "Garam", "Alkohol", "NBF 10%", "Beku", "VTM", "Transport Medium", "Tidak Diketahui"];
const PACKAGES      = ["Microtube", "Kantung Plastik", "Tube", "Egg Tray", "Hematokrit", "Cawan Petri", "Tetrapack", "Botol Steril", "Botol Non-Steril", "Kaleng", "Pot Plastik", "Kotak Slide", "Kardus", "Straw", "Tidak Ada Kemasan"];
const SEXES         = ["Jantan", "Betina", "Tidak diketahui"];
const UNIT_AGES     = ["hari", "minggu", "bulan", "tahun"];
const VACCINATED    = ["Ya", "Tidak", "Tidak Diketahui"];

const EMPTY_SAMPLE = {
  sample_code_cust: "", sample_model: "", specimen_group: "", specimen_type: "",
  species: "", preservative: "", packaging: "", production_date: "",
  expired_date: "", sex: "", age: "", unit_age: "bulan", owner: "",
  sampling: "", location_type: "", location_smpl: "", is_vaccinated: "Tidak Diketahui",
  test_services: [],
};

/* ─── Download template CSV ─── */
const TEMPLATE_HEADERS = [
  "Kode Sampel","Model Sampel","Specimen Group","Specimen",
  "Hewan / Species","Pengawet","Kemasan","Tanggal Produksi",
  "Tanggal Kadaluarsa","Jenis Kelamin","Umur","Unit Umur",
  "Pemilik Hewan","Jenis Uji","Jenis Lokasi","Lokasi Sampel","Telah Divaksin",
];

const downloadTemplate = () => {
  const csvContent = TEMPLATE_HEADERS.join(",") + "\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "template_input_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
};

/* ─── Parse CSV yang diupload ─── */
const parseExcelFile = (file, cartItems, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text  = e.target.result;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { callback(null, "File kosong atau tidak valid."); return; }
      const rows = lines.slice(1).map(line => {
        const cols = [];
        let current = "", inQuote = false;
        for (const ch of line) {
          if (ch === '"') inQuote = !inQuote;
          else if (ch === "," && !inQuote) { cols.push(current.trim()); current = ""; }
          else current += ch;
        }
        cols.push(current.trim());
        return cols;
      }).filter(r => r[0]);
      const samples = rows.map(r => ({
        sample_code_cust: r[0]  ?? "",
        sample_model:     r[1]  ?? "",
        specimen_group:   r[2]  ?? "",
        specimen_type:    r[3]  ?? "",
        species:          r[4]  ?? "",
        preservative:     r[5]  ?? "",
        packaging:        r[6]  ?? "",
        production_date:  r[7]  ?? "",
        expired_date:     r[8]  ?? "",
        sex:              r[9]  ?? "",
        age:              r[10] ?? "",
        unit_age:         r[11] ?? "bulan",
        owner:            r[12] ?? "",
        jenis_uji_text:   r[13] ?? "",
        location_type:    r[14] ?? "",
        location_smpl:    r[15] ?? "",
        is_vaccinated:    r[16] ?? "Tidak Diketahui",
        test_services:    [],
        sampling:         "",
      }));
      callback(samples, null);
    } catch (err) {
      callback(null, "Gagal membaca file: " + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
};

/* ─── Helper komponen ─── */
const STEP_ICONS = [
  // Icon dokumen/pengajuan
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>,
  // Icon sampel/refresh
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>,
  // Icon pelanggan
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>,
];

function StepBar({ step }) {
  const steps = ["Data Pengajuan", "Data Sampel", "Data Pelanggan"];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const n      = i + 1;
        const done   = step > n;
        const active = step === n;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center
                border-2 transition-all
                ${done   ? "bg-[#233B6E] border-[#233B6E] text-white"
                : active ? "bg-white border-[#233B6E] text-[#233B6E]"
                         : "bg-white border-gray-200 text-gray-300"}`}>
                {done
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                      strokeLinecap="round" className="w-5 h-5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  : STEP_ICONS[i]
                }
              </div>
              <span className={`text-xs whitespace-nowrap font-semibold
                ${active || done ? "text-[#233B6E]" : "text-gray-400"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-20 mx-3 mb-6 transition-colors
                ${step > n ? "bg-[#233B6E]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#233B6E]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  return (
    <input type={type} value={value ?? ""} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none
        transition placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500
        focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select value={value ?? ""} onChange={onChange}
        className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2.5
          text-sm outline-none bg-white pr-9 text-gray-800
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]">
        <option value="">{placeholder ?? "Pilih..."}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round"
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
          text-gray-400 pointer-events-none">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

function NavButtons({ step, onBack, onNext, onSubmit, submitting, isLastStep }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
      <p className="text-xs text-gray-400 italic">
        {isLastStep
          ? "Silahkan periksa kembali data yang dimasukkan sebelum pengajuan"
          : `Silahkan isi data ${step === 1 ? "pengajuan" : step === 2 ? "sampel" : "pelanggan"} untuk lanjut ke tahap berikutnya`
        }
      </p>
      <div className="flex gap-2">
        {step > 1 && (
          <button onClick={onBack}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600
              hover:bg-gray-100 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Kembali
          </button>
        )}
        {!isLastStep ? (
          <button onClick={onNext}
            className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-sm font-bold px-5 py-2 rounded-xl transition-all">
            Lanjut
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ) : (
          <button onClick={onSubmit} disabled={submitting}
            className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-sm font-bold px-6 py-2 rounded-xl transition-all
              disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Mengirim...
              </>
            ) : "Ajukan"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function PengajuanUjiSampel() {
  const navigate  = useNavigate();
  const user      = getUser();
  const cartItems = getCart();

  const [step, setStep]             = useState(1);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dokumen pendukung (attachment_doc)
  const [docFiles, setDocFiles] = useState([]);

  // Step 1 — Data Pengajuan
  const [step1, setStep1] = useState({
    type_service:      "",
    purpose_of_test:   "",
    date_of_send:      "",
    courier_name:      "",
    courier_contact:   "",
    diagnosis_required: false,
    notes:             "",
  });

  // Step 2 — Data Sampel
  const [samples, setSamples]       = useState([{ ...EMPTY_SAMPLE }]);
  const [parseMsg, setParseMsg]     = useState("");
  const [showImport, setShowImport] = useState(false);
  const xlsxRef                     = useRef();

  // Step 3 — Data Pelanggan
  const [profile, setProfile] = useState(null);
  const [step3, setStep3]     = useState({
    fullname: "", phone: "", institution: "", address: "",
    province: "", city: "", subdistrict: "", village: "",
    zip_code: "", pic_name: "", pic_contact: "",
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res  = await apiFetch("/profile");
      const data = await res.json();
      const p    = data.profile ?? data;
      const c    = p.customer ?? {};
      setProfile(p);
      setStep3({
        fullname:    p.fullname      ?? "",
        phone:       p.phone         ?? "",
        institution: p.institution   ?? "",
        address:     c.address       ?? "",
        province:    c.province      ?? "",
        city:        c.city          ?? "",
        subdistrict: c.subdistrict   ?? "",
        village:     c.village       ?? "",
        zip_code:    c.zip_code      ?? "",
        pic_name:    c.pic_name      ?? "",
        pic_contact: c.pic_contact   ?? "",
      });
    } catch {}
  };

  const setS1 = (k) => (e) =>
    setStep1(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setS3 = (k) => (e) => setStep3(p => ({ ...p, [k]: e.target.value }));

  /* ── Sample helpers ── */
  const setSample    = (i, k, v) => setSamples(prev => {
    const next = [...prev]; next[i] = { ...next[i], [k]: v }; return next;
  });
  const addSample    = () => setSamples(p => [...p, { ...EMPTY_SAMPLE }]);
  const removeSample = (i) => setSamples(p => p.filter((_, idx) => idx !== i));

  const toggleTestService = (sampleIdx, svc) => {
    setSamples(prev => {
      const next = [...prev];
      const cur  = next[sampleIdx].test_services ?? [];
      const has  = cur.find(x => x.id === svc.id);
      next[sampleIdx] = {
        ...next[sampleIdx],
        test_services: has ? cur.filter(x => x.id !== svc.id) : [...cur, svc],
      };
      return next;
    });
  };

  /* ── Validasi ── */
  const validate = () => {
    if (step === 1) {
      if (!step1.type_service)    return "Jenis layanan wajib dipilih.";
      if (!step1.purpose_of_test) return "Tujuan pengujian wajib dipilih.";
      if (!step1.date_of_send)    return "Tanggal kirim wajib diisi.";
    }
    if (step === 2) {
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (!s.sample_code_cust)      return `Sampel ${i+1}: Kode sampel wajib diisi.`;
        if (!s.sample_model)          return `Sampel ${i+1}: Model sampel wajib dipilih.`;
        if (!s.specimen_type)         return `Sampel ${i+1}: Jenis spesimen wajib diisi.`;
        if (!s.species)               return `Sampel ${i+1}: Hewan/Species wajib diisi.`;
        if (!s.test_services?.length) return `Sampel ${i+1}: Pilih minimal 1 jenis pengujian.`;
      }
    }
    if (step === 3) {
      if (!step3.fullname)    return "Nama lengkap wajib diisi.";
      if (!step3.phone)       return "No. telepon wajib diisi.";
      if (!step3.institution) return "Institusi/Perusahaan wajib diisi.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    if (step < 3) setStep(s => s + 1);
    else setShowPreview(true);
  };

  const handleBack = () => {
    setError("");
    if (showPreview) setShowPreview(false);
    else setStep(s => s - 1);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      const fd = new FormData();
      // Field teks step 1
      fd.append("type_service",      step1.type_service);
      fd.append("purpose_of_test",   step1.purpose_of_test);
      fd.append("date_of_send",      step1.date_of_send);
      if (step1.courier_name)    fd.append("courier_name",    step1.courier_name);
      if (step1.courier_contact) fd.append("courier_contact", step1.courier_contact);
      fd.append("diagnosis_required", String(step1.diagnosis_required));
      if (step1.notes)           fd.append("notes",           step1.notes);
      fd.append("samples_count", String(samples.reduce((a, s) =>
        a + (Number(s.total_sample) || 1), 0)));

      // Samples sebagai JSON
      fd.append("samples", JSON.stringify(samples.map(s => ({
        sample_code_cust: s.sample_code_cust,
        sample_model:     s.sample_model,
        specimen_group:   s.specimen_group,
        specimen_type:    s.specimen_type,
        species:          s.species,
        preservative:     s.preservative,
        packaging:        s.packaging,
        production_date:  s.production_date,
        expired_date:     s.expired_date,
        sex:              s.sex,
        age:              s.age ? Number(s.age) : undefined,
        unit_age:         s.unit_age,
        owner:            s.owner,
        sampling:         s.sampling,
        location_type:    s.location_type,
        location_smpl:    s.location_smpl,
        is_vaccinated:    s.is_vaccinated,
        test_services:    s.test_services?.map(t => t.id),
      }))));

      // Dokumen pendukung
      docFiles.forEach(f => fd.append("attachment_doc", f));

      const res = await apiFetch("/customer/submissions", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? d.message ?? "Gagal mengirim pengajuan.");
      }

      clearCart();
      navigate("/customer/pengajuan-saya");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── PREVIEW ─── */
  if (showPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan Uji Sampel</h1>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#233B6E]" />
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <button onClick={handleBack}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h2 className="font-bold text-[#233B6E]">Pratinjau Pengajuan Sampel</h2>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600
                text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            {/* Data Pengajuan */}
            <section>
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Pengajuan
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Jenis Layanan",      val: step1.type_service },
                  { label: "Tujuan Pengujian",   val: step1.purpose_of_test },
                  { label: "Tanggal Kirim",       val: step1.date_of_send },
                                  { label: "Nama Kurir",          val: step1.courier_name || "-" },
                  { label: "Kontak Kurir",        val: step1.courier_contact || "-" },
                  { label: "Perlu Diagnosis",     val: step1.diagnosis_required ? "Ya" : "Tidak" },
                  { label: "Catatan",             val: step1.notes || "-" },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="font-semibold text-[#233B6E] mt-0.5">{r.val}</p>
                  </div>
                ))}
                {docFiles.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Dokumen Pendukung</p>
                    <div className="flex flex-wrap gap-1.5">
                      {docFiles.map((f, i) => (
                        <span key={i} className="text-xs bg-[#EEF0F8] text-[#233B6E]
                          font-medium px-2.5 py-1 rounded-full">{f.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Data Sampel */}
            <section className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Sampel ({samples.length} sampel)
              </p>
              {samples.map((s, i) => (
                <div key={i} className="bg-[#F6F7FB] rounded-xl p-3 mb-2 text-sm">
                  <p className="font-bold text-[#233B6E] mb-2">Sampel {i+1}: {s.sample_code_cust}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Model Sampel",   val: s.sample_model },
                      { label: "Species/Hewan",  val: s.species },
                      { label: "Jenis Spesimen", val: s.specimen_type },
                      { label: "Pengawet",       val: s.preservative },
                    ].map(r => (
                      <div key={r.label}>
                        <p className="text-[11px] text-gray-400">{r.label}</p>
                        <p className="font-medium text-[#233B6E]">{r.val || "-"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.test_services?.map(t => (
                      <span key={t.id} className="bg-[#233B6E]/10 text-[#233B6E]
                        text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {t.test_name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Data Pelanggan */}
            <section className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Pelanggan
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Nama Lengkap",  val: step3.fullname },
                  { label: "No. Telepon",   val: step3.phone },
                  { label: "Institusi",     val: step3.institution },
                  { label: "Alamat",        val: step3.address || "-" },
                  { label: "Kota",          val: step3.city || "-" },
                  { label: "Provinsi",      val: step3.province || "-" },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="font-semibold text-[#233B6E] mt-0.5">{r.val}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 italic">
            Silahkan periksa kembali data yang dimasukkan sebelum pengajuan
          </p>
          <div className="flex gap-2">
            <button onClick={handleBack}
              className="border border-gray-300 text-gray-600 hover:bg-gray-100
                text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
              Kembali
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
                text-sm px-6 py-2 rounded-xl transition-all disabled:opacity-60
                flex items-center gap-1.5">
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Mengirim...
                </>
              ) : "Ajukan"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── STEP FORMS ─── */
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan Uji Sampel</h1>

      {/* Card Step Indicator — terpisah */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <StepBar step={step} />
      </div>

      {/* Card Formulir */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600
              text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* ── STEP 1: Data Pengajuan ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-[#233B6E]">1. Formulir Data Pengajuan</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Jenis Layanan" required>
                  <Select value={step1.type_service}
                    onChange={setS1("type_service")}
                    options={TYPE_SERVICE}
                    placeholder="Pilih jenis layanan" />
                </Field>
                <Field label="Tujuan Pengujian" required>
                  <Select value={step1.purpose_of_test}
                    onChange={setS1("purpose_of_test")}
                    options={PURPOSE}
                    placeholder="Pilih tujuan pengujian" />
                </Field>
                <Field label="Tanggal Kirim" required>
                  <Input type="date" value={step1.date_of_send}
                    onChange={setS1("date_of_send")} />
                </Field>

                <Field label="Nama Kurir">
                  <Input value={step1.courier_name}
                    onChange={setS1("courier_name")}
                    placeholder="cth: JNE, TIKI, Pribadi" />
                </Field>
                <Field label="Kontak Kurir">
                  <Input value={step1.courier_contact}
                    onChange={setS1("courier_contact")}
                    placeholder="No. HP kurir" />
                </Field>
                <Field label="Perlu Diagnosis">
                  <div className="flex items-center gap-3 h-10">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        checked={step1.diagnosis_required}
                        onChange={setS1("diagnosis_required")}
                        className="w-4 h-4 accent-[#233B6E] cursor-pointer" />
                      <span className="text-sm text-gray-700">
                        Ya, diperlukan diagnosis
                      </span>
                    </label>
                  </div>
                </Field>
              </div>

              <Field label="Catatan">
                <textarea value={step1.notes} onChange={setS1("notes")}
                  rows={3} placeholder="Catatan tambahan (opsional)..."
                  className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                    outline-none resize-none transition placeholder-gray-400
                    focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
              </Field>

              <Field label="Dokumen Pendukung"
                hint="Upload surat pengantar, dokumen kesehatan hewan, dll (PDF/JPG/PNG, maks 5MB tiap file)">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 border border-dashed
                    border-gray-300 rounded-xl px-4 py-3 cursor-pointer
                    hover:border-[#233B6E] hover:text-[#233B6E] text-gray-400
                    text-sm transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      className="w-4 h-4 flex-shrink-0">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Pilih file dokumen pendukung...</span>
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files);
                        setDocFiles(p => [...p, ...files]);
                        e.target.value = "";
                      }} />
                  </label>
                  {docFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {docFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between
                          bg-[#F6F7FB] rounded-lg px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#233B6E"
                              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              className="w-4 h-4 flex-shrink-0">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12
                                a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span className="text-[#233B6E] font-medium truncate">{f.name}</span>
                            <span className="text-gray-400 text-xs flex-shrink-0">
                              ({(f.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button onClick={() =>
                            setDocFiles(p => p.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 transition-colors ml-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* ── STEP 2: Data Sampel ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-[#233B6E]">2. Formulir Data Sampel</h2>
                {cartItems.length === 0 && (
                  <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">
                    Keranjang kosong — tambah pengujian dari katalog
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Masukkan sampel (untuk multi sampel, jumlah sampel = jumlah baris/template).
              </p>

              <div className="border border-gray-200 rounded-xl px-4 py-3
                flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={showImport}
                    onChange={e => setShowImport(e.target.checked)}
                    className="w-4 h-4 accent-[#233B6E] cursor-pointer" />
                  <span className="text-sm text-gray-600">
                    Memasukkan sampel dengan jumlah banyak (unggah template)
                  </span>
                </label>
                {showImport && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={downloadTemplate}
                      className="flex items-center gap-1.5 bg-[#EEF0F8]
                        hover:bg-[#dde0ee] text-[#233B6E] text-xs font-bold
                        px-4 py-2 rounded-xl transition-colors border border-[#233B6E]/20">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="w-3.5 h-3.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Unduh
                    </button>
                    <button type="button" onClick={() => xlsxRef.current.click()}
                      className="flex items-center gap-1.5 bg-[#233B6E]
                        hover:bg-[#1a2d56] text-white text-xs font-bold
                        px-4 py-2 rounded-xl transition-colors shadow-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="w-3.5 h-3.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Unggah
                    </button>
                    <input ref={xlsxRef} type="file" accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setParseMsg("Membaca file...");
                        parseExcelFile(file, cartItems, (parsed, err) => {
                          if (err) { setParseMsg("✗ " + err); return; }
                          setSamples(parsed.length > 0 ? parsed : [{ ...EMPTY_SAMPLE }]);
                          setParseMsg(`✓ ${parsed.length} sampel berhasil diimpor.`);
                        });
                        e.target.value = "";
                      }} />
                  </div>
                )}
              </div>

              {parseMsg && (
                <p className={`text-xs font-medium px-1
                  ${parseMsg.startsWith("✓") ? "text-green-600"
                  : parseMsg.startsWith("✗") ? "text-red-500"
                  : "text-gray-500"}`}>
                  {parseMsg}
                </p>
              )}

              {samples.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#233B6E] text-sm">Sampel {i + 1}</h3>
                    {samples.length > 1 && (
                      <button onClick={() => removeSample(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium
                          flex items-center gap-1 transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          className="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Kode Sampel Pelanggan" required>
                      <Input value={s.sample_code_cust}
                        onChange={e => setSample(i, "sample_code_cust", e.target.value)}
                        placeholder="Masukkan kode sampel Anda" />
                    </Field>
                    <Field label="Model Sampel" required>
                      <Select value={s.sample_model}
                        onChange={e => setSample(i, "sample_model", e.target.value)}
                        options={SAMPLE_MODELS}
                        placeholder="Silahkan pilih model sampel Anda" />
                    </Field>
                    <Field label="Total Sampel">
                      <Input value={s.total_sample}
                        onChange={e => setSample(i, "total_sample", e.target.value)}
                        type="number" placeholder="Jumlah total sampel" />
                    </Field>
                    <Field label="Jenis Spesimen" required>
                      <Input value={s.specimen_type}
                        onChange={e => setSample(i, "specimen_type", e.target.value)}
                        placeholder="cth: Oropharyngeal, Swab Nasal" />
                    </Field>
                    <Field label="Hewan / Species" required>
                      <Input value={s.species}
                        onChange={e => setSample(i, "species", e.target.value)}
                        placeholder="cth: Ayam Broiler" />
                    </Field>
                    <Field label="Kelompok Spesimen">
                      <Input value={s.specimen_group}
                        onChange={e => setSample(i, "specimen_group", e.target.value)}
                        placeholder="cth: Unggas" />
                    </Field>
                    <Field label="Pengawet">
                      <Select value={s.preservative}
                        onChange={e => setSample(i, "preservative", e.target.value)}
                        options={PRESERVATIVES}
                        placeholder="Pilih pengawet" />
                    </Field>
                    <Field label="Kemasan">
                      <Select value={s.packaging}
                        onChange={e => setSample(i, "packaging", e.target.value)}
                        options={PACKAGES}
                        placeholder="Pilih kemasan" />
                    </Field>
                    <Field label="Tanggal Produksi">
                      <Input type="date" value={s.production_date}
                        onChange={e => setSample(i, "production_date", e.target.value)} />
                    </Field>
                    <Field label="Tanggal Kadaluarsa">
                      <Input type="date" value={s.expired_date}
                        onChange={e => setSample(i, "expired_date", e.target.value)} />
                    </Field>
                    <Field label="Jenis Kelamin">
                      <Select value={s.sex}
                        onChange={e => setSample(i, "sex", e.target.value)}
                        options={SEXES}
                        placeholder="Pilih jenis kelamin" />
                    </Field>
                    <Field label="Umur">
                      <div className="flex gap-2">
                        <Input value={s.age}
                          onChange={e => setSample(i, "age", e.target.value)}
                          type="number" placeholder="Umur" />
                        <div className="w-32">
                          <Select value={s.unit_age}
                            onChange={e => setSample(i, "unit_age", e.target.value)}
                            options={UNIT_AGES} placeholder="" />
                        </div>
                      </div>
                    </Field>
                    <Field label="Pemilik Hewan">
                      <Input value={s.owner}
                        onChange={e => setSample(i, "owner", e.target.value)}
                        placeholder="Nama pemilik hewan" />
                    </Field>
                    <Field label="Telah Divaksin">
                      <Select value={s.is_vaccinated}
                        onChange={e => setSample(i, "is_vaccinated", e.target.value)}
                        options={VACCINATED}
                        placeholder="Status vaksinasi" />
                    </Field>
                    <Field label="Lokasi Pengambilan">
                      <Input value={s.location_smpl}
                        onChange={e => setSample(i, "location_smpl", e.target.value)}
                        placeholder="cth: Bandar Lampung" />
                    </Field>
                    <Field label="Jenis Lokasi">
                      <Input value={s.location_type}
                        onChange={e => setSample(i, "location_type", e.target.value)}
                        placeholder="cth: Peternakan Ayam Broiler" />
                    </Field>
                  </div>

                  <Field label="Jenis Pengujian Sampel" required
                    hint="Pilih pengujian yang akan dilakukan (dari keranjang Anda)">
                    {cartItems.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-xl p-4
                        text-center text-sm text-gray-400">
                        Keranjang kosong.{" "}
                        <button onClick={() => navigate("/customer/katalog-pengujian")}
                          className="text-[#233B6E] font-semibold hover:underline">
                          Tambah dari katalog
                        </button>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-xl p-3 space-y-2
                        max-h-48 overflow-y-auto">
                        {cartItems.map(svc => {
                          const checked = s.test_services?.some(x => x.id === svc.id);
                          return (
                            <label key={svc.id}
                              className="flex items-center gap-3 cursor-pointer
                                hover:bg-gray-50 rounded-lg p-1.5 transition-colors">
                              <input type="checkbox" checked={checked ?? false}
                                onChange={() => toggleTestService(i, svc)}
                                className="w-4 h-4 accent-[#233B6E] cursor-pointer" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#233B6E] truncate">
                                  {svc.test_name}
                                </p>
                                <p className="text-xs text-gray-400">{svc.unit_lab}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </Field>
                </div>
              ))}

              <button onClick={addSample}
                className="w-full border-2 border-dashed border-[#233B6E]/30
                  hover:border-[#233B6E] text-[#233B6E] text-sm font-semibold
                  py-3 rounded-2xl transition-all flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Sampel
              </button>
            </div>
          )}

          {/* ── STEP 3: Data Pelanggan ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-[#233B6E]">3. Formulir Data Pelanggan</h2>
              <p className="text-xs text-gray-500">
                Data diambil dari profil Anda. Field yang masih kosong harap dilengkapi.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap/Perusahaan" required>
                  <Input value={step3.fullname} onChange={setS3("fullname")}
                    placeholder="Nama lengkap" />
                </Field>
                <Field label="Email">
                  <Input value={profile?.email ?? ""} disabled />
                </Field>
                <Field label="No. Telepon" required>
                  <Input value={step3.phone} onChange={setS3("phone")}
                    placeholder="08XXXXXXXXXX" />
                </Field>
                <Field label="Institusi/Perusahaan" required>
                  <Input value={step3.institution} onChange={setS3("institution")}
                    placeholder="Nama institusi atau perusahaan" />
                </Field>
                <Field label="Alamat">
                  <Input value={step3.address} onChange={setS3("address")}
                    placeholder="Alamat lengkap" />
                </Field>
                <Field label="Kode Pos">
                  <Input value={step3.zip_code} onChange={setS3("zip_code")}
                    placeholder="cth: 35141" />
                </Field>
                <Field label="Provinsi">
                  <Input value={step3.province} onChange={setS3("province")}
                    placeholder="cth: Lampung" />
                </Field>
                <Field label="Kabupaten/Kota">
                  <Input value={step3.city} onChange={setS3("city")}
                    placeholder="cth: Bandar Lampung" />
                </Field>
                <Field label="Kecamatan">
                  <Input value={step3.subdistrict} onChange={setS3("subdistrict")}
                    placeholder="cth: Rajabasa" />
                </Field>
                <Field label="Kelurahan/Desa">
                  <Input value={step3.village} onChange={setS3("village")}
                    placeholder="cth: Gedong Meneng" />
                </Field>
                <Field label="Nama PIC">
                  <Input value={step3.pic_name} onChange={setS3("pic_name")}
                    placeholder="Nama narahubung" />
                </Field>
                <Field label="Kontak PIC">
                  <Input value={step3.pic_contact} onChange={setS3("pic_contact")}
                    placeholder="No. HP narahubung" />
                </Field>
              </div>
            </div>
          )}

          <NavButtons
            step={step}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            submitting={submitting}
            isLastStep={false}
          />
        </div>
      </div>
    </div>
  );
}