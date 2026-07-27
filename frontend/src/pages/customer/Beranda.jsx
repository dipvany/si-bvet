import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../../utils/auth";
import { getMySubmissions } from "../../services/CustomerServices";
​
const getDate = (o) => o?.created_at ?? o?.createdAt ?? o?.CreatedAt ?? o?.date ?? null;
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
function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">{title}</h2>}
      {children}
    </div>
  );
}
​
function DonutChart({ value, total, color, size = 72 }) {
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? Math.min(value / total, 1) : 0;
  const dash = pct * circ;
  const gap  = circ - dash;
  const cx   = size / 2;
​
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={cx} y={cx + 5} textAnchor="middle"
        fontSize="16" fontWeight="700" fill="white" fontFamily="inherit">
        {value}
      </text>
    </svg>
  );
}
​
function StatCard({ label, value, total, color, loading, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#233B6E] rounded-2xl p-5 flex items-center justify-between
        gap-4 shadow-md transition-all duration-200
        ${onClick ? "hover:bg-[#1a2d56] hover:-translate-y-0.5 cursor-pointer" : "cursor-default"}`}
    >
      <p className="text-white font-bold text-[15px] leading-snug">{label}</p>
      {loading ? (
        <div className="w-[72px] h-[72px] rounded-full bg-white/10 animate-pulse flex-shrink-0" />
      ) : (
        <DonutChart value={value} total={total} color={color} />
      )}
    </div>
  );
}
​
const STATUS_WAITING_PAYMENT = [
  "awaiting_payment",
  "menunggu_pembayaran",
  "awaiting_verification",
  "menunggu_verifikasi_pembayaran",
];
const STATUS_TESTING = ["processed", "diproses"];
const STATUS_COMPLETED = ["done", "selesai", "completed"];
​
function buildStats(submissions) {
  const norm = s => (s.process_status ?? "").toLowerCase();
  return {
    total:                submissions.length,
    pending_verification: submissions.filter(s => norm(s) === "pending_verification").length,
    waiting_payment:      submissions.filter(s => STATUS_WAITING_PAYMENT.includes(norm(s))).length,
    in_process:           submissions.filter(s => STATUS_TESTING.includes(norm(s))).length,
    completed:            submissions.filter(s => STATUS_COMPLETED.includes(norm(s))).length,
    rejected:             submissions.filter(s => norm(s) === "rejected").length,
  };
}
​
export default function CustomerBeranda() {
  const navigate = useNavigate();
  const user     = getUser();
​
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
​
  const [mode, setMode]   = useState("all");
  const [day, setDay]     = useState(() => todayStr());
  const [month, setMonth] = useState(() => thisMonthStr());
  const [year, setYear]   = useState(() => new Date().getFullYear());
​
  useEffect(() => { fetchData(); }, []);
​
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await getMySubmissions();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      const subs = json.data?.data ?? json.data ?? json.submissions ?? [];
      setSubmissions(Array.isArray(subs) ? subs : []);
    } catch (err) {
      setError(err.message ?? "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  };
​
  const years = useMemo(() => {
    const set = new Set();
    submissions.forEach((o) => {
      const ds = getDate(o);
      if (ds) { const d = new Date(ds); if (!isNaN(d)) set.add(d.getFullYear()); }
    });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [submissions]);
​
  const matcher = useMemo(() => makeMatcher(mode, day, month, year), [mode, day, month, year]);
​
  const stats = useMemo(
    () => buildStats(submissions.filter((s) => matcher(getDate(s)))),
    [submissions, matcher]
  );
​
  const CARDS = [
    {
      label: "Total Uji Sampel yang Diajukan",
      key:   "total",
      color: "#F5C400",
      to:    "/customer/pengajuan-saya",
    },
    {
      label: "Sampel Menunggu Verifikasi",
      key:   "pending_verification",
      color: "#F97316",
      to:    "/customer/pengajuan-saya",
    },
    {
      label: "Sampel Menunggu Pembayaran",
      key:   "waiting_payment",
      color: "#A78BFA",
      to:    "/customer/pengajuan-saya",
    },
    {
      label: "Sampel Sedang Pengujian",
      key:   "in_process",
      color: "#3B82F6",
      to:    "/customer/pengajuan-saya",
    },
    {
      label: "Sampel Selesai Pengujian",
      key:   "completed",
      color: "#22C55E",
      to:    "/customer/pengajuan-saya",
    },
    {
      label: "Pengajuan Uji Sampel Ditolak",
      key:   "rejected",
      color: "#EF4444",
      to:    "/customer/pengajuan-saya",
    },
  ];
​
  return (
    <div className="space-y-6">
​
      {user && (
        <div>
          <h2 className="text-xl font-extrabold text-[#233B6E]">
            Selamat datang, {user.fullname}!
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Berikut ringkasan pengajuan uji sampel Anda.
          </p>
        </div>
      )}
​
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
          rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={fetchData}
            className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}
​
      <SectionCard>
        <DashboardFilter
          mode={mode} setMode={setMode}
          day={day} setDay={setDay}
          month={month} setMonth={setMonth}
          year={year} setYear={setYear}
          years={years}
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(card => (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              total={stats.total || 1}
              color={card.color}
              loading={loading}
              onClick={() => navigate(card.to)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}