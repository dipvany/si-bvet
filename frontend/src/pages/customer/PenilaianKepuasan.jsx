import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import FormPenilaian from "../../components/FormPenilaian";
​
/**
 * PenilaianKepuasan — halaman penilaian kepuasan pelanggan (setelah pengujian selesai).
 *
 * Alur:
 *   DetailPengajuan (status selesai)
 *     → navigate("/customer/penilaian/:submissionId", { state: { submission } })
 *     → halaman ini tampil
 *
 * Pertanyaan diambil dinamis dari backend (GET /feedbacks/questions/active)
 * dan jawaban dikirim ke endpoint publik (POST /feedbacks) melalui
 * komponen bersama <FormPenilaian />.
 */
export default function PenilaianKepuasan() {
  const navigate = useNavigate();
  useParams();
  const { state } = useLocation();
  const submission = state?.submission;
​
  const [success, setSuccess] = useState(false);
​
  const defaultValues = {
    type_service: submission?.type_service ?? "Pengujian Sampel",
  };
​
  if (success) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#233B6E] mb-2">
            Terima Kasih!
          </h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Penilaian Anda telah berhasil dikirim. Masukan Anda sangat berarti
            untuk peningkatan mutu layanan kami.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/customer/pengajuan-saya")}
              className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold px-8 py-3 rounded-xl transition-all"
            >
              Kembali ke Pengajuan Saya
            </button>
            <button
              onClick={() => navigate("/customer/beranda")}
              className="border border-[#233B6E]/30 hover:bg-[#EEF0F8] text-[#233B6E] font-bold px-8 py-3 rounded-xl transition-all"
            >
              Ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }
​
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[#233B6E] hover:opacity-70 flex-shrink-0"
          title="Kembali"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#233B6E]">
            Penilaian Kepuasan Layanan
          </h1>
          <p className="text-sm text-gray-500">
            Sampel telah selesai diuji. Silakan beri penilaian atas pelayanan
            yang Anda terima.
          </p>
        </div>
      </div>
​
      <FormPenilaian
        defaultValues={defaultValues}
        onSuccess={() => setSuccess(true)}
      />
    </div>
  );
}