import { useState, useEffect } from "react";
import { getAdminSubmissions, getUnverifiedCustomers, getAllComplaints } from "../../services/adminServices";

const CARD_CONFIG = [
  { label: "Total Pengajuan Masuk", key: "total",                color: "#F5C400" },
  { label: "Menunggu Verifikasi",   key: "pending_verification", color: "#F5C400" },
  { label: "Menunggu Pembayaran",   key: "waiting_payment",      color: "#22C55E" },
  { label: "Sedang Pengujian",      key: "in_process",           color: "#EF4444" },
  { label: "Selesai Pengujian",     key: "completed",            color: "#3B82F6" },
];

function DonutChart({ value = 0, total = 0, color = "#F59E0B", size = 64 }) {
  const r    = 24, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? Math.min(value / total, 1) : 0;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
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

function StatCard({ label, value, total, color, loading }) {
  return (
    <div className="bg-gradient-to-br from-[#233B6E] to-[#2d4d8f] rounded-2xl p-4
      flex items-center justify-between shadow-sm min-w-0">
      <p className="text-sm font-semibold text-white leading-snug max-w-[110px]">{label}</p>
      {loading
        ? <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse flex-shrink-0"/>
        : <DonutChart value={value} total={total || 1} color={color}/>
      }
    </div>
  );
}

export default function AdminBeranda() {
  const [stats,      setStats]      = useState({ total: 0, pending_verification: 0, waiting_payment: 0, in_process: 0, completed: 0 });
  const [complaints, setComplaints]  = useState({ total: 0, belum: 0 });
  const [unverified, setUnverified] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch terpisah supaya error salah satu tidak crash keduanya
      let submissions = [];
      let unv = [];

      try {
        const subRes  = await getAdminSubmissions();
        const subText = await subRes.text();
        const subData = JSON.parse(subText);
        // Handle nested: { data: { data: [...] } } atau { data: [...] }
        submissions = subData?.data?.data ?? subData?.data ?? [];
        if (!Array.isArray(submissions)) submissions = [];
      } catch (e) {
        console.warn("Submissions fetch error:", e.message);
      }

      try {
        const unvRes  = await getUnverifiedCustomers();
        const unvText = await unvRes.text();
        const unvData = JSON.parse(unvText);
        unv = unvData?.customers ?? unvData?.data ?? [];
        if (!Array.isArray(unv)) unv = [];
      } catch (e) {
        console.warn("Unverified fetch error:", e.message);
      }

      try {
        const cmpRes  = await getAllComplaints();
        const cmpData = await cmpRes.json();
        const cmpList = cmpData.complaints ?? [];
        const belum   = cmpList.filter(c => c.status !== "resolved" && !c.admin_response).length;
        setComplaints({ total: cmpList.length, belum });
      } catch (e) {
        console.warn("Complaints fetch error:", e.message);
      }

      const counts = { total: submissions.length, pending_verification: 0, waiting_payment: 0, in_process: 0, completed: 0 };
      submissions.forEach(s => {
        if (counts[s.process_status] !== undefined) counts[s.process_status]++;
      });

      setStats(counts);
      setUnverified(unv);
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
          <button onClick={fetchData} className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Banner pelanggan belum verifikasi */}
      {!loading && unverified.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {unverified.length} pelanggan menunggu verifikasi
            </p>
            <p className="text-xs text-amber-600">Segera tinjau di menu Registrasi Pelanggan</p>
          </div>
        </div>
      )}

      {/* Stat cards pengajuan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {CARD_CONFIG.map(c => (
          <StatCard key={c.key} label={c.label} value={stats[c.key] ?? 0}
            total={stats.total || 1} color={c.color} loading={loading}/>
        ))}
      </div>

      {/* Stat pengaduan */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Pengaduan Masuk
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Pengaduan"   value={complaints.total} total={Math.max(complaints.total, 1)} color="#A78BFA" loading={loading}/>
          <StatCard label="Belum Ditanggapi"  value={complaints.belum} total={Math.max(complaints.total, 1)} color="#F97316" loading={loading}/>
          <StatCard label="Sudah Ditanggapi"  value={complaints.total - complaints.belum} total={Math.max(complaints.total, 1)} color="#22C55E" loading={loading}/>
        </div>
      </div>
    </div>
  );
}