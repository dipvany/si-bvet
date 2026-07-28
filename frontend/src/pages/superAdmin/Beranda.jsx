import { useState, useEffect, useMemo } from "react";
import { getAdminSubmissions, getActivityLogs, getAllComplaints, getUnverifiedCustomers, getAllFeedbacks } from "../../services/superAdminServices";
​
const CARD_CONFIG = [
  { key: "total",                label: "Total Pengajuan Masuk", color: "#F5C400" },
  { key: "pending_verification", label: "Menunggu Verifikasi",   color: "#F5C400" },
  { key: "waiting_payment",      label: "Menunggu Pembayaran",   color: "#22C55E" },
  { key: "in_process",           label: "Sedang Pengujian",      color: "#EF4444" },
  { key: "completed",            label: "Selesai Pengujian",     color: "#3B82F6" },
];
​
const STAR_POINTS = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";
​
const getDate = (o) => o?.created_at ?? o?.createdAt ?? o?.CreatedAt ?? o?.date ?? null;
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
const answersOf = (f) => f?.answers ?? f?.Answers ?? [];
const avgOf = (f) => {
  const arr = answersOf(f);
  if (!arr.length) return 0;
  return arr.reduce((t, a) => t + (a.rating ?? 0), 0) / arr.length;
};
​
const MODE_OPTIONS = [
  { value: "day",   label: "Hari" },
  { value: "month", label: "Bulan" },
  { value: "year",  label: "Tahun" },
  { value: "all",   label: "Semua" },
];
​
const ACTION_COLOR = {
  login:    { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   icon: "\uD83D\uDD11" },
  logout:   { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   icon: "\uD83D\uDEAA" },
  create:   { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  icon: "\u2795" },
  update:   { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", icon: "\u270F\uFE0F" },
  delete:   { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500",    icon: "\uD83D\uDDD1\uFE0F" },
  verify:   { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", icon: "\u2705" },
  reject:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", icon: "\u274C" },
  approve:  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",   icon: "\uD83D\uDC4D" },
  upload:   { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", icon: "\uD83D\uDCE4" },
  default:  { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   icon: "\uD83D\uDCCB" },
};
​
function getActionStyle(log) {
  const raw = (
    log.action ?? log.event ?? log.type ?? log.description ?? log.activity ?? ""
  ).toLowerCase();
  for (const key of Object.keys(ACTION_COLOR)) {
    if (key !== "default" && raw.includes(key)) return ACTION_COLOR[key];
  }
  return ACTION_COLOR.default;
}
​
function formatTime(val) {
  if (!val) return "\u2014";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
​
function getInitials(name) {
  if (!name || name === "\u2014") return "?";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return initials || "?";
}
​
function getDesc(log) {
  return log.description ?? log.activity ?? log.action ?? log.event ?? log.message ?? "Aktivitas sistem";
}
​
function getUserName(log) {
  return (
    log.actor_name ??
    log.actor ??
    log.user?.fullname ??
    log.user?.name ??
    log.user_fullname ??
    log.user_name ??
    log.username ??
    log.performed_by ??
    log.admin?.fullname ??
    log.admin?.name ??
    null
  );
}
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
                className="appearance-none border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white pl-3 pr-7 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-[#233B6E]/20 focus:border-[#233B6E]">
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
function DonutChart({ value = 0, max, color, size = 64 }) {
  const r = size / 2 - 8, cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = circumference * pct;
  const gap  = circumference - dash;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circumference * 0.25}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="white">
        {value}
      </text>
    </svg>
  );
}
​
function StatCard({ label, value, total, color, loading, size = 64, dense = false }) {
  return (
    <div className={`bg-gradient-to-br from-[#233B6E] to-[#2d4d8f] rounded-xl flex items-center justify-between shadow-sm min-w-0 ${dense ? "p-3" : "p-4"}`}>
      <p className={`font-semibold text-white leading-snug ${dense ? "text-xs" : "text-sm max-w-[110px]"}`}>{label}</p>
      {loading
        ? <div style={{ width: size, height: size }} className="rounded-full bg-white/10 animate-pulse flex-shrink-0" />
        : <DonutChart value={value} max={total || 1} color={color} size={size} />
      }
    </div>
  );
}
​
function Stars({ value, size = "w-4 h-4", empty = "#CBD5E1" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = value >= s;
        return (
          <svg key={s} viewBox="0 0 24 24" fill={filled ? "#F5C400" : "none"}
            stroke={filled ? "#F5C400" : empty} strokeWidth="1.5" className={size}>
            <polygon points={STAR_POINTS} />
          </svg>
        );
      })}
    </div>
  );
}
​
function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col ${className}`}>
      <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">{title}</h2>
      <div className="flex-1">{children}</div>
    </div>
  );
}
​
function PenilaianPanel({ data, loading }) {
  return (
    <div className="flex flex-col h-full">
      <div className="rounded-xl bg-gradient-to-br from-[#233B6E] to-[#2d4d8f] p-5 flex items-center gap-4 mb-4 shadow-sm">
        {loading ? (
          <div className="h-14 w-full bg-white/10 rounded animate-pulse" />
        ) : (
          <>
            <span className="text-5xl font-black text-white leading-none">{data.avg.toFixed(1)}</span>
            <div>
              <Stars value={Math.round(data.avg)} size="w-5 h-5" empty="rgba(255,255,255,0.35)" />
              <p className="text-xs text-white/60 mt-1.5">dari {data.total} penilaian</p>
            </div>
          </>
        )}
      </div>
​
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-2.5 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : data.total === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-[#233B6E]/20 p-4">
          <p className="text-sm text-gray-400 text-center">Belum ada penilaian pada periode ini.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center space-y-3 rounded-xl border border-[#233B6E]/20 p-4">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.dist[star] ?? 0;
            const pct = data.total ? (count / data.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-3">{star}</span>
                <svg viewBox="0 0 24 24" fill="#F5C400" className="w-3.5 h-3.5 flex-shrink-0">
                  <polygon points={STAR_POINTS} />
                </svg>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#F5C400] rounded-full" style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
​
function ActivityLogSection({ logs, loading, error }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? logs : logs.slice(0, 10);
​
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="font-bold text-[#233B6E] text-base">Log Aktivitas Sistem</h2>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1 font-medium">
          {logs.length} aktivitas
        </span>
      </div>
​
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
          {error}
        </div>
      )}
​
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/5" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/5" />
              </div>
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-3 opacity-40">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586 a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
          </svg>
          <p className="text-sm font-medium">Belum ada log aktivitas</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {displayed.map((log, i) => {
              const style    = getActionStyle(log);
              const name     = getUserName(log);
              const desc     = getDesc(log);
              const time     = formatTime(
                log.created_at ?? log.timestamp ?? log.time ?? log.date
              );
              const actor    = log.actor ?? name ?? "Sistem";
              const initials = getInitials(actor);
              const method   = log.method ?? log.http_method ?? null;
              const endpoint = log.endpoint ?? log.path ?? log.url ?? null;
​
              const methodColor = (
                { GET: "bg-blue-100 text-blue-700", POST: "bg-green-100 text-green-700",
                  PATCH: "bg-yellow-100 text-yellow-700", PUT: "bg-yellow-100 text-yellow-700",
                  DELETE: "bg-red-100 text-red-600" }[method?.toUpperCase()] ?? "bg-gray-100 text-gray-600"
              );
​
              return (
                <div key={log.id ?? i}
                  className="flex items-start gap-4 px-6 py-3.5 hover:bg-[#F8F9FC] transition-colors">
                  <span className="text-xs text-gray-300 font-medium w-4 flex-shrink-0 mt-1 text-right">
                    {i + 1}
                  </span>
​
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${style.bg} ${style.text}`}>
                    {initials}
                  </div>
​
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{actor}</p>
​
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {desc}
                    </p>
​
                    {(method || endpoint) && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {method && (
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${methodColor}`}>
                            {method.toUpperCase()}
                          </span>
                        )}
                        {endpoint && (
                          <span className="text-[10px] font-mono text-gray-400 truncate max-w-[220px]">
                            {endpoint}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
​
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{time}</span>
                  </div>
                </div>
              );
            })}
          </div>
​
          {logs.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-100 text-center">
              <button onClick={() => setShowAll((p) => !p)}
                className="text-xs font-semibold text-[#233B6E] hover:underline">
                {showAll
                  ? "Tampilkan lebih sedikit"
                  : `Lihat semua ${logs.length} aktivitas`
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
​
export default function SuperAdminBeranda() {
  const [submissions, setSubmissions] = useState([]);
  const [customers, setCustomers]     = useState([]);
  const [complaints, setComplaints]   = useState([]);
  const [feedbacks, setFeedbacks]     = useState([]);
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [logLoading, setLogLoading]   = useState(true);
  const [error, setError]             = useState("");
  const [logError, setLogError]       = useState("");
​
  const [mode, setMode]   = useState("all");
  const [day, setDay]     = useState(() => todayStr());
  const [month, setMonth] = useState(() => thisMonthStr());
  const [year, setYear]   = useState(() => new Date().getFullYear());
​
  useEffect(() => {
    fetchData();
    fetchLogs();
  }, []);
​
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      try {
        const res  = await getAdminSubmissions();
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
        const data = json.data?.data ?? json.data ?? [];
        setSubmissions(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message ?? "Gagal memuat statistik.");
      }
​
      try {
        const res  = await getUnverifiedCustomers();
        const json = await res.json();
        setCustomers(json.customers ?? json.data ?? []);
      } catch (e) { console.warn("Customers fetch error:", e.message); }
​
      try {
        const res  = await getAllComplaints();
        const json = await res.json();
        setComplaints(json.complaints ?? []);
      } catch (e) { console.warn("Complaints fetch error:", e.message); }
​
      try {
        const res  = await getAllFeedbacks();
        const json = await res.json();
        setFeedbacks(json.feedbacks ?? []);
      } catch (e) { console.warn("Feedbacks fetch error:", e.message); }
    } finally {
      setLoading(false);
    }
  };
​
  const fetchLogs = async () => {
    setLogLoading(true);
    setLogError("");
    try {
      const res  = await getActivityLogs();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat log.");
      const data = json.logs ?? json.data ?? json.activity_logs ?? (Array.isArray(json) ? json : []);
      setLogs(data);
    } catch (err) {
      setLogError(err.message ?? "Gagal memuat log aktivitas.");
    } finally {
      setLogLoading(false);
    }
  };
​
  const years = useMemo(() => {
    const set = new Set();
    [...submissions, ...customers, ...complaints, ...feedbacks].forEach((o) => {
      const ds = getDate(o);
      if (ds) { const d = new Date(ds); if (!isNaN(d)) set.add(d.getFullYear()); }
    });
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [submissions, customers, complaints, feedbacks]);
​
  const matcher = useMemo(() => makeMatcher(mode, day, month, year), [mode, day, month, year]);
​
  const stats = useMemo(() => {
    const subs = submissions.filter((s) => matcher(getDate(s)));
    const counts = { total: subs.length, pending_verification: 0, waiting_payment: 0, in_process: 0, completed: 0 };
    subs.forEach((s) => {
      const st = (s.process_status ?? "").toLowerCase();
      if (st === "pending_verification") counts.pending_verification++;
      else if (["awaiting_payment", "menunggu_pembayaran", "awaiting_verification", "menunggu_verifikasi_pembayaran"].includes(st)) counts.waiting_payment++;
      else if (["processed", "diproses"].includes(st)) counts.in_process++;
      else if (["done", "selesai", "completed"].includes(st)) counts.completed++;
    });
    return counts;
  }, [submissions, matcher]);
​
  // Akun pelanggan selalu menampilkan total keseluruhan (tidak ikut filter tanggal),
  // karena data akun belum menyertakan tanggal daftar dari backend.
  const accounts = useMemo(() => {
    const verified = customers.filter((c) => c.is_verified).length;
    return { total: customers.length, verified, unverified: customers.length - verified };
  }, [customers]);
​
  const complaintStats = useMemo(() => {
    const list = complaints.filter((c) => matcher(getDate(c)));
    const belum = list.filter((c) => c.status !== "resolved" && !c.admin_response).length;
    return { total: list.length, belum };
  }, [complaints, matcher]);
​
  const penilaian = useMemo(() => {
    const list = feedbacks.filter((f) => matcher(getDate(f)));
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    list.forEach((f) => {
      const a = avgOf(f);
      sum += a;
      const r = Math.round(a);
      if (r >= 1 && r <= 5) dist[r]++;
    });
    return { total: list.length, avg: list.length ? sum / list.length : 0, dist };
  }, [feedbacks, matcher]);
​
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold text-[#233B6E]">Beranda</h1>
        <DashboardFilter
          mode={mode} setMode={setMode}
          day={day} setDay={setDay}
          month={month} setMonth={setMonth}
          year={year} setYear={setYear}
          years={years}
        />
      </div>
​
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={fetchData}
            className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}
​
      {/* Pengajuan */}
      <SectionCard title="Pengajuan Masuk">
        <div className="grid grid-cols-5 gap-3">
          {CARD_CONFIG.map((c) => (
            <StatCard key={c.key} label={c.label} value={stats[c.key] ?? 0}
              total={stats.total || 1} color={c.color} loading={loading} size={46} dense />
          ))}
        </div>
      </SectionCard>
​
      {/* Kiri: Pengaduan (atas) + Akun (bawah) bertumpuk | Kanan: Penilaian memanjang */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title="Laporan Pengaduan" className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full items-center">
              <StatCard label="Total Pengaduan" value={complaintStats.total} total={Math.max(complaintStats.total, 1)} color="#A78BFA" loading={loading} size={46} dense />
              <StatCard label="Belum Ditanggapi" value={complaintStats.belum} total={Math.max(complaintStats.total, 1)} color="#F97316" loading={loading} size={46} dense />
              <StatCard label="Sudah Ditanggapi" value={complaintStats.total - complaintStats.belum} total={Math.max(complaintStats.total, 1)} color="#22C55E" loading={loading} size={46} dense />
            </div>
          </SectionCard>
​
          <SectionCard title="Akun Pelanggan" className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full items-center">
              <StatCard label="Jumlah Daftar Akun" value={accounts.total} total={Math.max(accounts.total, 1)} color="#3B82F6" loading={loading} size={46} dense />
              <StatCard label="Belum Verifikasi" value={accounts.unverified} total={Math.max(accounts.total, 1)} color="#F5C400" loading={loading} size={46} dense />
              <StatCard label="Sudah Verifikasi" value={accounts.verified} total={Math.max(accounts.total, 1)} color="#22C55E" loading={loading} size={46} dense />
            </div>
          </SectionCard>
        </div>
​
        <SectionCard title="Laporan Penilaian">
          <PenilaianPanel data={penilaian} loading={loading} />
        </SectionCard>
      </div>
​
      {/* Log aktivitas */}
      <ActivityLogSection logs={logs} loading={logLoading} error={logError} />
    </div>
  );
}