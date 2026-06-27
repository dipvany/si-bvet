import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { apiFetch } from "../../services/api";

/**
 * PenilaianKepuasan — halaman penilaian kepuasan pelanggan
 *
 * Alur:
 *   PengajuanSaya / DetailPengajuan (status completed)
 *     → navigate("/customer/penilaian/:submissionId", { state: { submission } })
 *     → halaman ini tampil
 *
 * API: POST /customer/feedbacks
 *   body: { rating: number(1-5), comments: string }
 *
 * Karena API hanya menerima 1 nilai rating, semua jawaban 9 pertanyaan
 * dirata-ratakan menjadi 1 angka (dibulatkan) sebelum dikirim.
 * Jawaban per-pertanyaan + komentar digabung ke field "comments".
 */

/* ── Pertanyaan sesuai gambar ──────────────────────────────────── */
const QUESTIONS = [
  {
    id: "q1",
    label: "Kesesuaian Persyaratan Pelayanan dengan Jenis Layanannya",
    options: ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
  },
  {
    id: "q2",
    label: "Kemudahan Prosedur Disini",
    options: ["Tidak Mudah", "Kurang Mudah", "Mudah", "Sangat Mudah"],
  },
  {
    id: "q3",
    label: "Kecepatan Waktu Dalam Memberikan Layanan",
    options: ["Tidak Cepat", "Kurang Cepat", "Cepat", "Sangat Cepat"],
  },
  {
    id: "q4",
    label: "Kewajaran Biaya/Tarif Pelayanan",
    options: ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
  },
  {
    id: "q5",
    label: "Kesesuaian Produk Pelayanan Antara Yang Tercantum Dalam Standar Pelayanan Dengan Hasil Yang Diberikan",
    options: ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
  },
  {
    id: "q6",
    label: "Kompetensi/Kemampuan Petugas Dalam Pelayanan",
    options: ["Tidak Kompeten", "Kurang Kompeten", "Kompeten", "Sangat Kompeten"],
  },
  {
    id: "q7",
    label: "Perilaku Petugas Dalam Pelayanan",
    options: ["Tidak Sopan", "Kurang Sopan", "Sopan", "Sangat Sopan"],
  },
  {
    id: "q8",
    label: "Kualitas Sarana dan Prasarana",
    options: ["Buruk", "Cukup", "Baik", "Sangat Baik"],
  },
  {
    id: "q9",
    label: "Penanganan Pengaduan Pengguna Layanan",
    options: ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"],
  },
];

/* ── Komponen pilihan bintang per pertanyaan ──────────────────── */
function QuestionRow({ question, value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[#233B6E] leading-snug">
        {question.label}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {question.options.map((opt, idx) => {
          const starVal = idx + 1; // 1,2,3,4
          const filled  = (hover || value) >= starVal;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(starVal)}
              onMouseEnter={() => setHover(starVal)}
              onMouseLeave={() => setHover(0)}
              className="flex flex-col items-center gap-1 group transition-transform
                hover:scale-105 focus:outline-none"
            >
              <svg viewBox="0 0 24 24"
                fill={filled ? "#F5C400" : "none"}
                stroke={filled ? "#F5C400" : "#CBD5E1"}
                strokeWidth="1.5"
                className="w-9 h-9 transition-all duration-150">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span className={`text-[10px] font-medium text-center leading-tight w-16
                transition-colors
                ${filled ? "text-[#233B6E]" : "text-gray-400 group-hover:text-gray-500"}`}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Halaman utama ────────────────────────────────────────────── */
export default function PenilaianKepuasan() {
  const navigate  = useNavigate();
  const { id }    = useParams();           // submissionId
  const { state } = useLocation();
  const submission = state?.submission;

  // Jawaban per pertanyaan: { q1: 0, q2: 0, ... } (0 = belum dipilih)
  const [answers, setAnswers] = useState(
    Object.fromEntries(QUESTIONS.map(q => [q.id, 0]))
  );

  // Data diri (kiri)
  const [namaLengkap,   setNamaLengkap]   = useState("");
  const [jenisKelamin,  setJenisKelamin]  = useState("");
  const [pendidikan,    setPendidikan]    = useState("");
  const [pekerjaan,     setPekerjaan]     = useState("");
  const [jenisLayanan,  setJenisLayanan]  = useState(
    submission?.type_service ?? ""
  );

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const allAnswered = QUESTIONS.every(q => answers[q.id] > 0);
  const avgRating   = allAnswered
    ? Math.round(QUESTIONS.reduce((sum, q) => sum + answers[q.id], 0) / QUESTIONS.length)
    : 0;

  const handleSubmit = async () => {
    setError("");
    if (!namaLengkap.trim())  { setError("Nama lengkap wajib diisi."); return; }
    if (!jenisKelamin.trim()) { setError("Jenis kelamin wajib diisi."); return; }
    if (!allAnswered)         { setError("Semua pertanyaan harus dijawab."); return; }

    // Susun komentar detail: data diri + jawaban per pertanyaan
    const detailLines = [
      `Nama: ${namaLengkap}`,
      `Jenis Kelamin: ${jenisKelamin}`,
      `Pendidikan Terakhir: ${pendidikan || "-"}`,
      `Pekerjaan: ${pekerjaan || "-"}`,
      `Jenis Layanan: ${jenisLayanan || "-"}`,
      "",
      ...QUESTIONS.map(q =>
        `${q.label}: ${q.options[answers[q.id] - 1]} (${answers[q.id]}/4)`
      ),
    ];

    setSaving(true);
    try {
      const res  = await apiFetch("/customer/feedbacks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          rating:   avgRating,               // rata-rata semua jawaban (1-4 → dimap ke 1-5 kalau perlu)
          comments: detailLines.join("\n"),  // detail lengkap semua jawaban
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal mengirim penilaian.");
      setSuccess(true);
    } catch (err) {
      setError(err.message ?? "Gagal mengirim penilaian.");
    } finally {
      setSaving(false);
    }
  };

  // ── Halaman sukses ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
          p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center
            justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-[#233B6E]">
            Terima Kasih!
          </h2>
          <p className="text-sm text-gray-500">
            Penilaian Anda telah berhasil dikirim. Masukan Anda sangat berarti
            untuk meningkatkan kualitas layanan kami.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={() => navigate("/customer/pengajuan-saya")}
              className="w-full bg-[#233B6E] hover:bg-[#1a2d56] text-white
                font-bold text-sm py-2.5 rounded-xl transition-colors">
              Kembali ke Pengajuan Saya
            </button>
            <button onClick={() => navigate("/customer/beranda")}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700
                font-semibold text-sm py-2.5 rounded-xl transition-colors">
              Ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#233B6E]">
            Penilaian Kepuasan Layanan
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Balai Veteriner Lampung — Survei Kepuasan Masyarakat
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
          rounded-xl px-4 py-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Layout 2 kolom — kiri: data diri, kanan: pertanyaan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Kiri: Data Diri ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4
          h-fit">
          <h2 className="font-bold text-[#233B6E] text-sm border-b border-gray-100 pb-2">
            Data Responden
          </h2>

          {[
            {
              label: "Nama Lengkap", required: true,
              value: namaLengkap, setValue: setNamaLengkap,
              placeholder: "Masukkan Nama Lengkap Anda",
            },
            {
              label: "Jenis Kelamin", required: true,
              value: jenisKelamin, setValue: setJenisKelamin,
              placeholder: "Masukkan Jawaban Anda",
              type: "select",
              options: ["Laki-laki", "Perempuan"],
            },
            {
              label: "Pendidikan Terakhir",
              value: pendidikan, setValue: setPendidikan,
              placeholder: "Masukkan Jawaban Anda",
            },
            {
              label: "Pekerjaan",
              value: pekerjaan, setValue: setPekerjaan,
              placeholder: "Masukkan Jawaban Anda",
            },
            {
              label: "Jenis Layanan yang Diterima",
              value: jenisLayanan, setValue: setJenisLayanan,
              placeholder: "Masukkan Jawaban Anda",
            },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {field.type === "select" ? (
                <select value={field.value}
                  onChange={e => field.setValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5
                    text-sm bg-[#F6F7FB] outline-none focus:ring-2
                    focus:ring-[#233B6E]/20 focus:border-[#233B6E] text-gray-700">
                  <option value="">Pilih jenis kelamin</option>
                  {field.options.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={field.value}
                  onChange={e => field.setValue(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5
                    text-sm bg-[#F6F7FB] outline-none focus:ring-2
                    focus:ring-[#233B6E]/20 focus:border-[#233B6E]
                    placeholder-gray-400 text-gray-700"
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Kanan: Pertanyaan ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5
          space-y-6">
          <h2 className="font-bold text-[#233B6E] text-sm border-b border-gray-100 pb-2">
            Penilaian Layanan
          </h2>

          {QUESTIONS.map(q => (
            <QuestionRow
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
            />
          ))}

          {/* Progress & submit */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>
                  {QUESTIONS.filter(q => answers[q.id] > 0).length} dari {QUESTIONS.length} dijawab
                </span>
                {allAnswered && (
                  <span className="text-[#233B6E] font-semibold">
                    Rata-rata: {avgRating}/4
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#233B6E] rounded-full transition-all duration-300"
                  style={{
                    width: `${(QUESTIONS.filter(q => answers[q.id] > 0).length / QUESTIONS.length) * 100}%`
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={saving || !allAnswered || !namaLengkap || !jenisKelamin}
                className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56]
                  text-white font-bold text-sm px-8 py-3 rounded-xl transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>Mengirim...</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="w-4 h-4">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Kumpulkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}