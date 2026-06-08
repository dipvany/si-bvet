import { useState, useEffect, useRef } from "react";
import { getAdminSubmissions, getUnverifiedCustomers } from "../../services/adminServices";

/* ──────────────────────────────────────────────────────────────────
   DonutChart — pure SVG, no external lib
   Props:
     value    : number  current count
     total    : number  total submissions
     color    : string  stroke hex color
     size     : number  diameter in px (default 72)
   ────────────────────────────────────────────────────────────────── */
function DonutChart({ value = 0, total = 0, color = "#F59E0B", size = 72 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  const dash = pct * circ;
  const gap = circ - dash;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="6"
      />
      {/* Progress — start from top */}
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ / 4}   /* rotate to 12-o'clock */
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      {/* Center number */}
      <text
        x={center} y={center}
        textAnchor="middle" dominantBaseline="central"
        fontSize="16" fontWeight="700" fill="white"
        fontFamily="inherit"
      >
        {value}
      </text>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   StatCard
   ────────────────────────────────────────────────────────────────── */
function StatCard({ label, value, total, chartColor, loading }) {
  return (
    <div className="bg-[#233B6E] rounded-2xl p-5 flex items-center
      justify-between gap-4 shadow-md hover:shadow-lg
      hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <p className="text-white font-bold text-base leading-snug">{label}</p>
      {loading ? (
        <div className="w-[72px] h-[72px] rounded-full bg-white/10 animate-pulse flex-shrink-0" />
      ) : (
        <DonutChart value={value} total={total} color={chartColor} />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Derived status helpers
   ────────────────────────────────────────────────────────────────── */
function countByStatus(submissions, status) {
  return submissions.filter((s) => s.process_status === status).length;
}

/* ──────────────────────────────────────────────────────────────────
   AdminBeranda — main page component
   ────────────────────────────────────────────────────────────────── */
export default function AdminBeranda() {
  const [submissions, setSubmissions] = useState([]);
  const [unverified, setUnverified]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [subRes, unvRes] = await Promise.all([
          getAdminSubmissions(),
          getUnverifiedCustomers(),
        ]);
        const [subData, unvData] = await Promise.all([
          subRes.json(),
          unvRes.json(),
        ]);
        if (!cancelled) {
          setSubmissions(subData?.data ?? []);
          setUnverified(unvData?.customers ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ??
            err.response?.data?.message ??
            "Gagal memuat data dashboard."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  /* Derived counts */
  const total          = submissions.length;
  const menungguVerif  = countByStatus(submissions, "pending_verification");
  const menungguBayar  = countByStatus(submissions, "pending_payment");
  const sedangPengujian= countByStatus(submissions, "testing_in_progress");
  const selesai        = countByStatus(submissions, "completed");

  const CARDS = [
    {
      label: "Total Pengajuan Masuk",
      value: total,
      total: Math.max(total, 1),
      chartColor: "#F59E0B",   // amber
    },
    {
      label: "Menunggu Verifikasi",
      value: menungguVerif,
      total: Math.max(total, 1),
      chartColor: "#F59E0B",
    },
    {
      label: "Menunggu Pembayaran",
      value: menungguBayar,
      total: Math.max(total, 1),
      chartColor: "#22C55E",   // green
    },
    {
      label: "Sedang Pengujian",
      value: sedangPengujian,
      total: Math.max(total, 1),
      chartColor: "#EF4444",   // red
    },
    {
      label: "Selesai Pengujian",
      value: selesai,
      total: Math.max(total, 1),
      chartColor: "#F59E0B",
    },
  ];

  return (
    <div className="max-w-3xl">
      {/* Page heading */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-[#1E3A5F]">Beranda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Ringkasan aktivitas sistem SI-BVET hari ini
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-600
          text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Unverified customers banner */}
      {!loading && unverified.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl
          px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center
            justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71
                3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {unverified.length} pelanggan menunggu verifikasi
            </p>
            <p className="text-xs text-amber-600">
              Segera tinjau di menu Registrasi Pelanggan
            </p>
          </div>
        </div>
      )}

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((card, i) => (
          <StatCard
            key={card.label}
            loading={loading}
            {...card}
          />
        ))}
      </div>
    </div>
  );
}