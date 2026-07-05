import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../../utils/auth";
import { getMySubmissions } from "../../services/CustomerServices";
​
/* ──────────────────────────────────────────────────────────────────
   DonutChart — pure SVG, konsisten dengan halaman admin/superadmin
   ────────────────────────────────────────────────────────────────── */
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
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      {/* Progress */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      {/* Angka tengah */}
      <text x={cx} y={cx + 5} textAnchor="middle"
        fontSize="16" fontWeight="700" fill="white" fontFamily="inherit">
        {value}
      </text>
    </svg>
  );
}
​
/* ──────────────────────────────────────────────────────────────────
   StatCard — sesuai desain UI (background biru gelap, teks putih)
   ────────────────────────────────────────────────────────────────── */
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
/* ──────────────────────────────────────────────────────────────────
   Status helpers — mapping process_status API ke label kartu
   ────────────────────────────────────────────────────────────────── */
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
/* ──────────────────────────────────────────────────────────────────
   CustomerBeranda — main page
   ────────────────────────────────────────────────────────────────── */
export default function CustomerBeranda() {
  const navigate = useNavigate();
  const user     = getUser();
​
  const [stats, setStats]     = useState({ total: 0, pending_verification: 0, waiting_payment: 0, in_process: 0, completed: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
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
      const submissions = json.data?.data ?? json.data ?? json.submissions ?? [];
      setStats(buildStats(submissions));
    } catch (err) {
      setError(err.message ?? "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  };
​
  /* 4 kartu sesuai UI design */
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
      {/* Salam */}
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
      {/* Error */}
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
      {/* Stat cards — grid 2 kolom persis seperti UI design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
​
    </div>
  );
}