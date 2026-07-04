import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllFeedbacks } from "../../services/superAdminServices";
​
/* laporan penilaian kepuasan (super admin) */
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
const roundedRatingOf = (f) => Math.round(avgOf(f));
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
export default function PenilaianPengguna() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
​
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllFeedbacks();
        const j = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(j.error ?? j.message ?? "Gagal memuat data penilaian.");
        setFeedbacks(j.feedbacks ?? []);
      } catch (e) {
        setError(e.message ?? "Gagal memuat data penilaian.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
​
  const overallAvg = feedbacks.length
    ? feedbacks.reduce((t, f) => t + avgOf(f), 0) / feedbacks.length
    : 0;
​
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-bold text-[#233B6E]">
            Laporan Penilaian Pengguna
          </h1>
          <p className="text-sm text-gray-500">
            Rekap penilaian kepuasan yang dikirim pelanggan.
          </p>
        </div>
        <button
          onClick={() => navigate("pertanyaan")}
          className="inline-flex items-center gap-2 bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm"
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
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
          </svg>
          Kelola Pertanyaan
        </button>
      </div>
​
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
​
      {/* Ringkasan */}
      {!loading && feedbacks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-semibold mb-1">
              Total Penilaian
            </p>
            <p className="text-2xl font-black text-[#233B6E]">
              {feedbacks.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-semibold mb-1">
              Rata-rata Rating
            </p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-[#233B6E]">
                {overallAvg.toFixed(1)}
              </p>
              <Stars value={Math.round(overallAvg)} />
            </div>
          </div>
        </div>
      )}
​
      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 py-12 text-center">Memuat...</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center">
            Belum ada penilaian yang masuk.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F6F7FB] text-left text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Layanan</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedbacks.map((f, i) => (
                  <tr key={f.id ?? i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDate(dateOf(f))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#233B6E]">
                      {f.fullname ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{f.email ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {f.type_service ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Stars value={roundedRatingOf(f)} />
                        <span className="text-xs text-gray-400">
                          {avgOf(f).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(f)}
                        className="text-xs font-bold text-[#233B6E] hover:underline"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
​
      {/* Modal detail */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-[#233B6E]">Detail Penilaian</h3>
              <button
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
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
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
​
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Nama</p>
                  <p className="font-semibold text-gray-700">
                    {detail.fullname ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-semibold text-gray-700">
                    {detail.email ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Jenis Kelamin</p>
                  <p className="font-semibold text-gray-700">
                    {detail.gender ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pendidikan</p>
                  <p className="font-semibold text-gray-700">
                    {detail.last_education ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pekerjaan</p>
                  <p className="font-semibold text-gray-700">
                    {detail.occupation ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Jenis Layanan</p>
                  <p className="font-semibold text-gray-700">
                    {detail.type_service ?? "-"}
                  </p>
                </div>
              </div>
​
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 mb-3">
                  Jawaban Penilaian
                </p>
                <div className="space-y-3">
                  {answersOf(detail).length === 0 ? (
                    <p className="text-sm text-gray-400">Tidak ada jawaban.</p>
                  ) : (
                    answersOf(detail).map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-gray-600 flex-1">
                          {idx + 1}. {questionTextOf(a)}
                        </span>
                        <Stars value={a.rating ?? 0} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}