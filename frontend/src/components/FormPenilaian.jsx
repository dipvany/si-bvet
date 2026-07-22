import { useState, useEffect } from "react";
​
const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api"
).replace(/\/$/, "");
​
const RATING_TEXT = ["", "Sangat Buruk", "Buruk", "Cukup", "Baik", "Sangat Baik"];
​
const LAYANAN_OPTIONS = [
  "Pengajuan Sampel",
  "Bimtek/Magang",
  "Permohonan Informasi Publik",
  "Pengaduan",
];
​
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => {
          const filled = shown >= s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <svg
                viewBox="0 0 24 24"
                fill={filled ? "#F5C400" : "none"}
                stroke={filled ? "#F5C400" : "#CBD5E1"}
                strokeWidth="1.5"
                className="w-8 h-8 transition-all duration-150"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-gray-400 w-24">
        {RATING_TEXT[shown] ?? ""}
      </span>
    </div>
  );
}
​
/* Indikator langkah */
function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: "Data Diri" },
    { n: 2, label: "Penilaian" },
  ];
  return (
    <div className="flex items-center gap-3 mb-5">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s.n
                  ? "bg-[#233B6E] text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s.n}
            </div>
            <span
              className={`text-sm font-semibold ${
                step >= s.n ? "text-[#233B6E]" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 h-0.5 rounded-full ${
                step > s.n ? "bg-[#233B6E]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
​
export default function FormPenilaian({ defaultValues = {}, onSuccess }) {
  const [step, setStep] = useState(1);
​
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [answers, setAnswers] = useState({}); // { [questionId]: rating }
​
  const [form, setForm] = useState({
    fullname: defaultValues.fullname ?? "",
    email: defaultValues.email ?? "",
    gender: defaultValues.gender ?? "",
    last_education: defaultValues.last_education ?? "",
    occupation: defaultValues.occupation ?? "",
    type_service: defaultValues.type_service ?? "",
  });
​
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
​
  useEffect(() => {
    fetch(`${API_BASE}/feedbacks/questions/active`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setError("Gagal memuat pertanyaan penilaian."))
      .finally(() => setLoadingQ(false));
  }, []);
​
  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const answeredCount = questions.filter((q) => answers[q.id] > 0).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
​
  const validateStep1 = () => {
    if (!form.fullname.trim()) return "Nama lengkap wajib diisi.";
    if (!form.email.trim()) return "Email wajib diisi.";
    if (!form.gender) return "Jenis kelamin wajib diisi.";
    if (!form.last_education.trim()) return "Pendidikan terakhir wajib diisi.";
    if (!form.occupation.trim()) return "Pekerjaan wajib diisi.";
    if (!form.type_service.trim()) return "Jenis layanan wajib dipilih.";
    return "";
  };
​
  const handleNext = () => {
    const err = validateStep1();
    if (err) return setError(err);
    setError("");
    setStep(2);
  };
​
  const handleSubmit = async () => {
    setError("");
    const err = validateStep1();
    if (err) {
      setStep(1);
      return setError(err);
    }
    if (questions.length === 0)
      return setError("Belum ada pertanyaan penilaian yang tersedia.");
    if (!allAnswered) return setError("Semua pertanyaan harus dijawab.");
​
    setSaving(true);
    try {
      const payload = {
        ...form,
        answers: questions.map((q) => ({
          question_id: q.id,
          rating: answers[q.id],
        })),
      };
      const res = await fetch(`${API_BASE}/feedbacks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j.error ?? j.message ?? "Gagal mengirim penilaian.");
      onSuccess?.();
    } catch (e) {
      setError(e.message ?? "Gagal mengirim penilaian.");
    } finally {
      setSaving(false);
    }
  };
​
  const inputCls =
    "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-[#F6F7FB] outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E] text-gray-700 placeholder-gray-400";
​
  return (
    <div>
      <StepIndicator step={step} />
​
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
​
      {/* ── LANGKAH 1: DATA RESPONDEN ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-[#233B6E] text-sm border-b border-gray-100 pb-2">
            Data Responden
          </h2>
​
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Nama Lengkap<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={form.fullname}
                onChange={setF("fullname")}
                placeholder="Masukkan nama lengkap Anda"
                className={inputCls}
              />
            </div>
​
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Email<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={setF("email")}
                placeholder="Masukkan email aktif Anda"
                className={inputCls}
              />
            </div>
​
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Jenis Kelamin<span className="text-red-400 ml-0.5">*</span>
              </label>
              <select value={form.gender} onChange={setF("gender")} className={inputCls}>
                <option value="">Pilih jenis kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
​
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Pendidikan Terakhir<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={form.last_education}
                onChange={setF("last_education")}
                placeholder="Contoh: S1, SMA, D3"
                className={inputCls}
              />
            </div>
​
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Pekerjaan<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={form.occupation}
                onChange={setF("occupation")}
                placeholder="Masukkan pekerjaan Anda"
                className={inputCls}
              />
            </div>
​
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Jenis Layanan yang Diterima
                <span className="text-red-400 ml-0.5">*</span>
              </label>
              <select
                value={form.type_service}
                onChange={setF("type_service")}
                className={inputCls}
              >
                <option value="">Pilih jenis layanan</option>
                {LAYANAN_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
​
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm px-8 py-3 rounded-xl transition-all shadow-sm"
            >
              Lanjut ke Penilaian
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
​
      {/* ── LANGKAH 2: PENILAIAN ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-6">
          <h2 className="font-bold text-[#233B6E] text-sm border-b border-gray-100 pb-2">
            Penilaian Layanan
          </h2>
​
          {loadingQ ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Memuat pertanyaan...
            </p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Belum ada pertanyaan penilaian. Silakan hubungi admin.
            </p>
          ) : (
            <>
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-semibold text-[#233B6E] leading-snug">
                    {idx + 1}. {q.question_text}
                  </p>
                  <StarRating
                    value={answers[q.id] ?? 0}
                    onChange={(val) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: val }))
                    }
                  />
                </div>
              ))}
​
              <div className="pt-2 border-t border-gray-100 space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>
                    {answeredCount} dari {questions.length} dijawab
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#233B6E] rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}
​
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                setError("");
                setStep(1);
              }}
              className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-sm px-6 py-3 rounded-xl transition-all"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
​
            <button
              onClick={handleSubmit}
              disabled={saving || !allAnswered}
              className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm px-8 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Mengirim...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Kirim Penilaian
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}