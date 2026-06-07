import { useState, useEffect } from "react";
import { getAdminSubmissions } from "../../services/superAdminServices";

/**
 * SuperAdminBeranda
 * PERUBAHAN: Bagian VerticalBarChart (distribusi pengajuan) dihapus
 * karena informasi yang sama sudah tersedia di stat cards di atas.
 */

const CARD_CONFIG = [
  { key: "total",               label: "Total Pengajuan Masuk", color: "#F5C400" },
  { key: "pending_verification",label: "Menunggu Verifikasi",   color: "#F5C400" },
  { key: "waiting_payment",     label: "Menunggu Pembayaran",   color: "#22C55E" },
  { key: "in_process",          label: "Sedang Pengujian",      color: "#EF4444" },
  { key: "completed",           label: "Selesai Pengujian",     color: "#3B82F6" },
];

function DonutChart({ value, max, color, size = 64 }) {
  const r = 24, cx = size / 2, cy = size / 2;
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

function StatCard({ label, value, total, color, loading }) {
  return (
    <div className="bg-gradient-to-br from-[#233B6E] to-[#2d4d8f] rounded-2xl p-4
      flex items-center justify-between shadow-sm min-w-0">
      <p className="text-sm font-semibold text-white leading-snug max-w-[110px]">{label}</p>
      {loading
        ? <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
        : <DonutChart value={value} max={total || 1} color={color} />
      }
    </div>
  );
}

export default function SuperAdminBeranda() {
  const [stats, setStats]     = useState({
    total: 0, pending_verification: 0,
    waiting_payment: 0, in_process: 0, completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await getAdminSubmissions();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? "Gagal memuat data.");
      const submissions = json.data ?? [];
      const counts = {
        total: submissions.length,
        pending_verification: 0, waiting_payment: 0,
        in_process: 0, completed: 0,
      };
      submissions.forEach(s => {
        if (counts[s.process_status] !== undefined) counts[s.process_status]++;
      });
      setStats(counts);
    } catch (err) {
      setError(err.message ?? "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Beranda</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl
          px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={fetchData}
            className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Stat cards — chart distribusi dihapus, sudah cukup dari cards ini */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {CARD_CONFIG.map(c => (
          <StatCard key={c.key} label={c.label} value={stats[c.key] ?? 0}
            total={stats.total || 1} color={c.color} loading={loading} />
        ))}
      </div>
    </div>
  );
}