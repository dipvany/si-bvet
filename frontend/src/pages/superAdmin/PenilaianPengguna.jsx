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
                        onClick={() => navigate(String(f.id), { state: { feedback: f } })}
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
    </div>
  );
}