import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllFeedbacks } from "../../services/adminServices";
​
const answersOf = (f) => f?.answers ?? f?.Answers ?? [];
const questionTextOf = (a) =>
  a?.Question?.question_text ?? a?.question?.question_text ?? "Pertanyaan";
const questionKeyOf = (a, idx) =>
  a?.question_id ?? a?.Question?.id ?? a?.question?.id ?? questionTextOf(a) ?? `Q${idx}`;
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
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
const thisMonthStr = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`; };
​
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const dayNameOf = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return HARI_ID[d.getDay()];
};
​
function makeMatcher(mode, day, month, year) {
  return (dateStr) => {
    if (mode === "all") return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    if (mode === "day") {
      if (!day) return true;
      const [y, m, dd] = day.split("-").map(Number);
      return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === dd;
    }
    if (mode === "month") {
      if (!month) return true;
      const [y, m] = month.split("-").map(Number);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    }
    if (mode === "year") {
      if (!year) return true;
      return d.getFullYear() === Number(year);
    }
    return true;
  };
}
​
const MODE_OPTIONS = [
  { value: "day",   label: "Hari" },
  { value: "month", label: "Bulan" },
  { value: "year",  label: "Tahun" },
  { value: "all",   label: "Semua" },
];
​
const PALETTE = ["#3B82F6", "#F5C400", "#22C55E", "#EF4444", "#6366F1", "#A78BFA", "#F97316", "#14B8A6", "#EC4899"];
​
function DashboardFilter({ mode, setMode, day, setDay, month, setMonth, year, setYear, years }) {
  const inputCls = "border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#233B6E] bg-white outline-none focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]";
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-1 border-b border-gray-100">
        {MODE_OPTIONS.map((m) => (
          <button key={m.value} onClick={() => setMode(m.value)}
            className={`relative px-3 py-2 text-xs font-bold tracking-wide transition-all ${
              mode === m.value ? "text-[#233B6E]" : "text-gray-400 hover:text-[#233B6E]"
            }`}>
            {m.label}
            {mode === m.value && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-[#233B6E]" />
            )}
          </button>
        ))}
      </div>
​
      {mode !== "all" && (
        <div className="flex items-center gap-2">
          {mode === "day" && (
            <>
              {dayNameOf(day) && (
                <span className="text-xs font-semibold text-[#233B6E] bg-white border border-gray-200 rounded-lg px-3 py-1.5">{dayNameOf(day)}</span>
              )}
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} />
            </>
          )}
          {mode === "month" && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
          )}
          {mode === "year" && (
            <div className="relative">
              <select value={year} onChange={(e) => setYear(e.target.value)}
                className="appearance-none border border-gray-200 rounded-lg text-xs font-semibold text-[#233B6E] bg-white pl-3 pr-7 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
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
function QuestionDonut({ segments, overall, selected, onSelect, size = 190 }) {
  const stroke = 22;
  const r = (size - stroke) / 2 - 4;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((t, s) => t + s.avg, 0);
  let acc = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EEF1F6" strokeWidth={stroke} />
        {total > 0 && segments.map((s, i) => {
          const frac = s.avg / total;
          const len = frac * circ;
          const isSel = selected === i;
          const seg = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none"
              stroke={s.color}
              strokeWidth={isSel ? stroke + 5 : stroke}
              strokeDasharray={`${Math.max(len - 2.5, 0)} ${circ - Math.max(len - 2.5, 0)}`}
              strokeDashoffset={-acc}
              className="cursor-pointer"
              style={{ opacity: selected === null || isSel ? 1 : 0.3, transition: "opacity 0.2s ease, stroke-width 0.2s ease" }}
              onClick={() => onSelect(isSel ? null : i)}
            />
          );
          acc += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-[#233B6E] leading-none">{overall.toFixed(1)}</span>
        <span className="text-[11px] text-gray-400 mt-1">rata-rata</span>
      </div>
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
  const [mode, setMode]   = useState("all");
  const [day, setDay]     = useState(() => todayStr());
  const [month, setMonth] = useState(() => thisMonthStr());
  const [year, setYear]   = useState(() => new Date().getFullYear());
  const [selectedQ, setSelectedQ] = useState(null);
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
  const years = useMemo(() => {
    const set = new Set();
    feedbacks.forEach((f) => {
      const ds = dateOf(f);
      if (ds) { const d = new Date(ds); if (!isNaN(d)) set.add(d.getFullYear()); }
    });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [feedbacks]);
​
  const matcher = useMemo(() => makeMatcher(mode, day, month, year), [mode, day, month, year]);
​
  const filtered = useMemo(
    () => feedbacks.filter((f) => matcher(dateOf(f))),
    [feedbacks, matcher]
  );
​
  const overallAvg = filtered.length
    ? filtered.reduce((t, f) => t + avgOf(f), 0) / filtered.length
    : 0;
​
  const questionStats = useMemo(() => {
    const map = new Map();
    let order = 0;
    filtered.forEach((f) => {
      answersOf(f).forEach((a, idx) => {
        const key = questionKeyOf(a, idx);
        if (!map.has(key)) map.set(key, { sum: 0, count: 0, order: order++, text: questionTextOf(a) });
        const e = map.get(key);
        e.sum += a.rating ?? 0;
        e.count += 1;
      });
    });
    return [...map.values()]
      .sort((a, b) => a.order - b.order)
      .map((e, i) => ({
        number: i + 1,
        avg: e.count ? e.sum / e.count : 0,
        text: e.text,
        color: PALETTE[i % PALETTE.length],
      }));
  }, [filtered]);
​
  const sel = selectedQ != null && selectedQ < questionStats.length ? selectedQ : null;
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
      {/* Ringkasan + Filter + Donut */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <DashboardFilter
            mode={mode} setMode={setMode}
            day={day} setDay={setDay}
            month={month} setMonth={setMonth}
            year={year} setYear={setYear}
            years={years}
          />
​
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Belum ada penilaian pada periode ini.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Statistik */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#233B6E] p-4">
                  <p className="text-xs text-white/70 font-semibold mb-1">Total Penilaian</p>
                  <p className="text-2xl font-black text-white">{filtered.length}</p>
                </div>
                <div className="rounded-xl bg-[#233B6E] p-4">
                  <p className="text-xs text-white/70 font-semibold mb-1">Rata-rata Rating</p>
                  <p className="text-2xl font-black text-white">{overallAvg.toFixed(1)}</p>
                  <div className="mt-1"><Stars value={Math.round(overallAvg)} /></div>
                </div>
              </div>
​
              {/* Indeks Kepuasan Masyarakat */}
              <div className="flex flex-col items-start gap-3">
                <h3 className="text-sm font-bold text-[#233B6E] uppercase tracking-wide text-left w-full">
                  Indeks Kepuasan Masyarakat
                </h3>
                <div className="flex items-center gap-5 flex-wrap">
                  <QuestionDonut
                    segments={questionStats}
                    overall={overallAvg}
                    selected={sel}
                    onSelect={setSelectedQ}
                  />
                  <div className="min-h-[70px] w-[190px]">
                    {sel === null ? (
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Klik salah satu warna pada lingkaran untuk melihat rata-rata nilai per pertanyaan.
                      </p>
                    ) : (
                      <div>
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: questionStats[sel].color }} />
                          <span className="text-sm font-bold text-[#233B6E] leading-snug">{questionStats[sel].text}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-5">
                          <span className="text-2xl font-black text-[#233B6E]">{questionStats[sel].avg.toFixed(1)}</span>
                          <Stars value={Math.round(questionStats[sel].avg)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
​
      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 py-12 text-center">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center">
            Belum ada penilaian pada periode ini.
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
                {filtered.map((f, i) => (
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
    </div>
  );
}