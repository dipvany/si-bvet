import { useState, useEffect, useMemo } from "react";
import { getAdminSubmissions, getUnverifiedCustomers, getAllComplaints, getAllFeedbacks } from "../../services/adminServices";
​
const CARD_CONFIG = [
  { label: "Total Pengajuan Masuk", key: "total",                color: "#F5C400" },
  { label: "Menunggu Verifikasi",   key: "pending_verification", color: "#F5C400" },
  { label: "Menunggu Pembayaran",   key: "waiting_payment",      color: "#22C55E" },
  { label: "Sedang Pengujian",      key: "in_process",           color: "#EF4444" },
  { label: "Selesai Pengujian",     key: "completed",            color: "#3B82F6" },
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
function DonutChart({ value = 0, total = 0, color = "#F59E0B", size = 64 }) {
  const r = size / 2 - 8, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
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
        : <DonutChart value={value} total={total || 1} color={color} size={size} />
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
export default function AdminBeranda() {
  const [submissions, setSubmissions] = useState([]);
  const [customers, setCustomers]     = useState([]);
  const [complaints, setComplaints]   = useState([]);
  const [feedbacks, setFeedbacks]     = useState([]);
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
      try {
        const subRes  = await getAdminSubmissions();
        const subText = await subRes.text();
        const subData = JSON.parse(subText);
        let subs = subData?.data?.data ?? subData?.data ?? [];
        if (!Array.isArray(subs)) subs = [];
        setSubmissions(subs);
      } catch (e) { console.warn("Submissions fetch error:", e.message); }
​
      try {
        const unvRes  = await getUnverifiedCustomers();
        const unvText = await unvRes.text();
        const unvData = JSON.parse(unvText);
        let unv = unvData?.customers ?? unvData?.data ?? [];
        if (!Array.isArray(unv)) unv = [];
        setCustomers(unv);
      } catch (e) { console.warn("Unverified fetch error:", e.message); }
​
      try {
        const cmpRes  = await getAllComplaints();
        const cmpData = await cmpRes.json();
        setComplaints(cmpData.complaints ?? []);
      } catch (e) { console.warn("Complaints fetch error:", e.message); }
​
      try {
        const fbRes  = await getAllFeedbacks();
        const fbData = await fbRes.json();
        setFeedbacks(fbData.feedbacks ?? []);
      } catch (e) { console.warn("Feedbacks fetch error:", e.message); }
    } catch (err) {
      setError(err.message ?? "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
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
          <button onClick={fetchData} className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}
​
      {/* Pengajuan */}
      <SectionCard title="Pengajuan Masuk">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {CARD_CONFIG.map((c) => (
            <StatCard key={c.key} label={c.label} value={stats[c.key] ?? 0}
              total={stats.total || 1} color={c.color} loading={loading} />
          ))}
        </div>
      </SectionCard>
​
      {/* Kiri: Pengaduan (atas) + Akun (bawah) bertumpuk | Kanan: Penilaian memanjang */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title="Laporan Pengaduan" className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
              <StatCard label="Total Pengaduan" value={complaintStats.total} total={Math.max(complaintStats.total, 1)} color="#A78BFA" loading={loading} size={46} dense />
              <StatCard label="Belum Ditanggapi" value={complaintStats.belum} total={Math.max(complaintStats.total, 1)} color="#F97316" loading={loading} size={46} dense />
              <StatCard label="Sudah Ditanggapi" value={complaintStats.total - complaintStats.belum} total={Math.max(complaintStats.total, 1)} color="#22C55E" loading={loading} size={46} dense />
            </div>
          </SectionCard>
​
          <SectionCard title="Akun Pelanggan" className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
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
    </div>
  );
}