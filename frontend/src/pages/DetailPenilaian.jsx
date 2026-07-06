import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { apiFetch } from "../services/api";
​
/**
 * DetailPenilaian — halaman detail penilaian kepuasan (feedback).
 * Dipakai bersama oleh Admin & Super Admin.
 * Menggantikan modal popup: kini tampil sebagai halaman penuh seperti menu lain.
 * Endpoint: GET /admin/feedbacks -> { feedbacks: [...] }
 */
​
const answersOf = (f) => f?.answers ?? f?.Answers ?? [];
const questionTextOf = (a) =>
  a?.Question?.question_text ?? a?.question?.question_text ?? "Pertanyaan";
​
const avgOf = (f) => {
  const arr = answersOf(f);
  if (!arr.length) return 0;
  const sum = arr.reduce((t, a) => t + (a.rating ?? 0), 0);
  return sum / arr.length;
};
​
const dateOf = (f) => f?.created_at ?? f?.CreatedAt ?? f?.createdAt ?? null;
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
​
function Stars({ value, size = "w-4 h-4" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = value >= s;
        return (
          <svg
            key={s}
            viewBox="0 0 24 24"
            fill={filled ? "#F5C400" : "none"}
            stroke={filled ? "#F5C400" : "#CBD5E1"}
            strokeWidth="1.5"
            className={size}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </div>
  );
}
​
function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-700 break-words">
        {value || "-"}
      </p>
    </div>
  );
}
​
export default function DetailPenilaian() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
​
  const [feedback, setFeedback] = useState(location.state?.feedback ?? null);
  const [loading, setLoading] = useState(!location.state?.feedback);
  const [error, setError] = useState("");
​
  useEffect(() => {
    if (feedback) return;
    (async () => {
      try {
        const res = await apiFetch("/admin/feedbacks");
        const j = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(j.error ?? j.message ?? "Gagal memuat data penilaian.");
        const list = j.feedbacks ?? [];
        const found = list.find((f) => String(f.id) === String(id));
        if (!found) throw new Error("Data penilaian tidak ditemukan.");
        setFeedback(found);
      } catch (e) {
        setError(e.message ?? "Gagal memuat data penilaian.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, feedback]);
​
  const avg = useMemo(() => avgOf(feedback), [feedback]);
  const answers = answersOf(feedback);
​
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#233B6E] transition-colors"
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
          <h1 className="text-lg font-bold text-[#233B6E]">Detail Penilaian</h1>
          <p className="text-sm text-gray-500">
            Rincian penilaian kepuasan yang dikirim pelanggan.
          </p>
        </div>
      </div>
​
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
​
      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Memuat...</p>
      ) : !feedback ? (
        !error && (
          <p className="text-sm text-gray-400 py-12 text-center">
            Data penilaian tidak ditemukan.
          </p>
        )
      ) : (
        <div className="space-y-5">
          {/* Identitas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-base font-bold text-[#233B6E] break-words">
                  {feedback.fullname ?? "-"}
                </p>
                <p className="text-xs text-gray-400">{fmtDate(dateOf(feedback))}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Stars value={Math.round(avg)} />
                <span className="text-sm font-semibold text-[#233B6E]">
                  {avg.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Info label="Email" value={feedback.email} />
              <Info label="Jenis Layanan" value={feedback.type_service} />
              <Info label="Jenis Kelamin" value={feedback.gender} />
              <Info label="Pendidikan" value={feedback.last_education} />
              <Info label="Pekerjaan" value={feedback.occupation} />
            </div>
          </div>
​
          {/* Jawaban Penilaian */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Jawaban Penilaian
            </p>
            {answers.length === 0 ? (
              <p className="text-sm text-gray-400">Tidak ada jawaban.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {answers.map((a, idx) => (
                  <li
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-gray-600 leading-relaxed sm:flex-1">
                      {idx + 1}. {questionTextOf(a)}
                    </span>
                    <div className="flex-shrink-0">
                      <Stars value={a.rating ?? 0} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}