import { useState, useEffect } from "react";
import { getAdminSubmissions, getActivityLogs, getAllComplaints, getUnverifiedCustomers } from "../../services/superAdminServices";

const CARD_CONFIG = [
  { key: "total",                label: "Total Pengajuan Masuk", color: "#F5C400" },
  { key: "pending_verification", label: "Menunggu Verifikasi",   color: "#F5C400" },
  { key: "waiting_payment",      label: "Menunggu Pembayaran",   color: "#22C55E" },
  { key: "in_process",           label: "Sedang Pengujian",      color: "#EF4444" },
  { key: "completed",            label: "Selesai Pengujian",     color: "#3B82F6" },
];

// Warna per action/tipe aktivitas
const ACTION_COLOR = {
  login:    { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   icon: "🔑" },
  logout:   { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   icon: "🚪" },
  create:   { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  icon: "➕" },
  update:   { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", icon: "✏️" },
  delete:   { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500",    icon: "🗑️" },
  verify:   { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", icon: "✅" },
  reject:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", icon: "❌" },
  approve:  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-500",   icon: "👍" },
  upload:   { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", icon: "📤" },
  default:  { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   icon: "📋" },
};

function getActionStyle(log) {
  // Coba deteksi dari field action / event / type / description
  const raw = (
    log.action ?? log.event ?? log.type ?? log.description ?? log.activity ?? ""
  ).toLowerCase();
  for (const key of Object.keys(ACTION_COLOR)) {
    if (key !== "default" && raw.includes(key)) return ACTION_COLOR[key];
  }
  return ACTION_COLOR.default;
}

function formatTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitials(name) {
  if (!name || name === "—") return "?";
  // Ambil huruf pertama dari tiap kata (maks 2 kata)
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return initials || "?";
}

// Ambil label deskripsi dari berbagai kemungkinan field
function getDesc(log) {
  return log.description ?? log.activity ?? log.action ?? log.event ?? log.message ?? "Aktivitas sistem";
}

function getUserName(log) {
  // Coba semua kemungkinan field nama dari response API
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

function DonutChart({ value, max, color, size = 64 }) {
  const r = 24, cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = circumference * pct;
  const gap  = circumference - dash;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
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

function StatCard({ label, value, total, color, loading }) {
  return (
    <div className="bg-gradient-to-br from-[#233B6E] to-[#2d4d8f] rounded-2xl p-4
      flex items-center justify-between shadow-sm min-w-0">
      <p className="text-sm font-semibold text-white leading-snug max-w-[110px]">{label}</p>
      {loading
        ? <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse flex-shrink-0"/>
        : <DonutChart value={value} max={total || 1} color={color}/>
      }
    </div>
  );
}

function ActivityLogSection({ logs, loading, error }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? logs : logs.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          <h2 className="font-bold text-[#233B6E] text-base">Log Aktivitas Sistem</h2>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1 font-medium">
          {logs.length} aktivitas
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600
          text-xs rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse flex-shrink-0"/>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/5"/>
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/5"/>
              </div>
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse"/>
            </div>
          ))}
        </div>
      ) : logs.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-3 opacity-40">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586
              a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
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
              // actor: nama yang ditampilkan, fallback ke "Sistem" jika tidak ada
              const actor    = log.actor ?? name ?? "Sistem";
              const initials = getInitials(actor);
              const method   = log.method ?? log.http_method ?? null;
              const endpoint = log.endpoint ?? log.path ?? log.url ?? null;

              const methodColor = (
                { GET: "bg-blue-100 text-blue-700", POST: "bg-green-100 text-green-700",
                  PATCH: "bg-yellow-100 text-yellow-700", PUT: "bg-yellow-100 text-yellow-700",
                  DELETE: "bg-red-100 text-red-600" }[method?.toUpperCase()] ?? "bg-gray-100 text-gray-600"
              );

              return (
                <div key={log.id ?? i}
                  className="flex items-start gap-4 px-6 py-3.5 hover:bg-[#F8F9FC] transition-colors">

                  {/* Nomor */}
                  <span className="text-xs text-gray-300 font-medium w-4 flex-shrink-0 mt-1 text-right">
                    {i + 1}
                  </span>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                    flex-shrink-0 text-xs font-bold ${style.bg} ${style.text}`}>
                    {initials}
                  </div>

                  {/* Konten */}
                  <div className="flex-1 min-w-0">
                    {/* Nama actor */}
                    <p className="text-sm font-semibold text-gray-800 truncate">{actor}</p>

                    {/* Deskripsi aktivitas */}
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {desc}
                    </p>

                    {/* Method + Endpoint */}
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

                  {/* Waktu */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more */}
          {logs.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-100 text-center">
              <button onClick={() => setShowAll(p => !p)}
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

export default function SuperAdminBeranda() {
  const [stats, setStats]       = useState({
    total: 0, pending_verification: 0,
    waiting_payment: 0, in_process: 0, completed: 0,
  });
  const [logs, setLogs]         = useState([]);
  const [complaints, setComplaints] = useState({ total: 0, belum: 0 });
  const [accounts, setAccounts] = useState({ total: 0, verified: 0, unverified: 0 });
  const [loading, setLoading]   = useState(true);
  const [logLoading, setLogLoading] = useState(true);
  const [error, setError]       = useState("");
  const [logError, setLogError] = useState("");

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchComplaints();
    fetchCustomers();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await getAdminSubmissions();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      const data = json.data?.data ?? json.data ?? [];
      const counts = {
        total: data.length,
        pending_verification: 0, waiting_payment: 0,
        in_process: 0, completed: 0,
      };
      data.forEach(s => {
        const st = (s.process_status ?? "").toLowerCase();
        if (st === "pending_verification") counts.pending_verification++;
        else if (["awaiting_payment", "menunggu_pembayaran", "awaiting_verification", "menunggu_verifikasi_pembayaran"].includes(st))
          counts.waiting_payment++;
        else if (["processed", "diproses"].includes(st)) counts.in_process++;
        else if (["done", "selesai", "completed"].includes(st)) counts.completed++;
      });
      setStats(counts);
    } catch (err) {
      setError(err.message ?? "Gagal memuat statistik.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogLoading(true);
    setLogError("");
    try {
      const res  = await getActivityLogs();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat log.");
      // Handle berbagai format: { logs: [] } atau { data: [] } atau []
      const data = json.logs ?? json.data ?? json.activity_logs ?? (Array.isArray(json) ? json : []);
      setLogs(data);
    } catch (err) {
      setLogError(err.message ?? "Gagal memuat log aktivitas.");
    } finally {
      setLogLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res  = await getAllComplaints();
      const data = await res.json();
      const list = data.complaints ?? [];
      const belum = list.filter(c => c.status !== "resolved" && !c.admin_response).length;
      setComplaints({ total: list.length, belum });
    } catch (e) {
      console.warn("Complaints fetch error:", e.message);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res  = await getUnverifiedCustomers();
      const json = await res.json();
      const list = json.customers ?? json.data ?? [];
      const verified = list.filter(c => c.is_verified).length;
      setAccounts({ total: list.length, verified, unverified: list.length - verified });
    } catch (e) {
      console.warn("Customers fetch error:", e.message);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Beranda</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl
          px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={fetchStats}
            className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {CARD_CONFIG.map(c => (
          <StatCard key={c.key} label={c.label} value={stats[c.key] ?? 0}
            total={stats.total || 1} color={c.color} loading={loading}/>
        ))}
      </div>

      {/* Stat akun pelanggan */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Akun Pelanggan
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Jumlah Daftar Akun" value={accounts.total} total={Math.max(accounts.total, 1)} color="#3B82F6" loading={loading}/>
          <StatCard label="Belum Verifikasi" value={accounts.unverified} total={Math.max(accounts.total, 1)} color="#F5C400" loading={loading}/>
          <StatCard label="Sudah Verifikasi" value={accounts.verified} total={Math.max(accounts.total, 1)} color="#22C55E" loading={loading}/>
        </div>
      </div>

      {/* Stat pengaduan */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Pengaduan Masuk
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Pengaduan"  value={complaints.total} total={Math.max(complaints.total, 1)} color="#A78BFA" loading={loading}/>
          <StatCard label="Belum Ditanggapi" value={complaints.belum} total={Math.max(complaints.total, 1)} color="#F97316" loading={loading}/>
          <StatCard label="Sudah Ditanggapi" value={complaints.total - complaints.belum} total={Math.max(complaints.total, 1)} color="#22C55E" loading={loading}/>
        </div>
      </div>

      {/* Log aktivitas */}
      <ActivityLogSection logs={logs} loading={logLoading} error={logError}/>
    </div>
  );
}