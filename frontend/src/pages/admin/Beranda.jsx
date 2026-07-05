import { useState, useEffect } from "react";
import { getAdminSubmissions, getUnverifiedCustomers, getAllComplaints } from "../../services/adminServices";
​
const CARD_CONFIG = [
  { label: "Total Pengajuan Masuk", key: "total",                color: "#F5C400" },
  { label: "Menunggu Verifikasi",   key: "pending_verification", color: "#F5C400" },
  { label: "Menunggu Pembayaran",   key: "waiting_payment",      color: "#22C55E" },
  { label: "Sedang Pengujian",      key: "in_process",           color: "#EF4444" },
  { label: "Selesai Pengujian",     key: "completed",            color: "#3B82F6" },
];
​
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
​
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
​
export default function AdminBeranda() {
  const [stats,      setStats]      = useState({ total: 0, pending_verification: 0, waiting_payment: 0, in_process: 0, completed: 0 });
  const [complaints, setComplaints]  = useState({ total: 0, belum: 0 });
  const [unverified, setUnverified] = useState([]);
  const [accounts,   setAccounts]   = useState({ total: 0, verified: 0, unverified: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
​
  useEffect(() => { fetchData(); }, []);
​
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch terpisah supaya error salah satu tidak crash keduanya
      let submissions = [];
      let unv = [];
​
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
​
      try {
        const unvRes  = await getUnverifiedCustomers();
        const unvText = await unvRes.text();
        const unvData = JSON.parse(unvText);
        unv = unvData?.customers ?? unvData?.data ?? [];
        if (!Array.isArray(unv)) unv = [];
      } catch (e) {
        console.warn("Unverified fetch error:", e.message);
      }
​
      try {
        const cmpRes  = await getAllComplaints();
        const cmpData = await cmpRes.json();
        const cmpList = cmpData.complaints ?? [];
        const belum   = cmpList.filter(c => c.status !== "resolved" && !c.admin_response).length;
        setComplaints({ total: cmpList.length, belum });
      } catch (e) {
        console.warn("Complaints fetch error:", e.message);
      }
​
      const counts = { total: submissions.length, pending_verification: 0, waiting_payment: 0, in_process: 0, completed: 0 };
      submissions.forEach(s => {
        const st = (s.process_status ?? "").toLowerCase();
        if (st === "pending_verification") counts.pending_verification++;
        else if (["awaiting_payment", "menunggu_pembayaran", "awaiting_verification", "menunggu_verifikasi_pembayaran"].includes(st))
          counts.waiting_payment++;
        else if (["processed", "diproses"].includes(st)) counts.in_process++;
        else if (["done", "selesai", "completed"].includes(st)) counts.completed++;
      });
​
      setStats(counts);
      setUnverified(unv);
      const custVerified = unv.filter(c => c.is_verified).length;
      setAccounts({ total: unv.length, verified: custVerified, unverified: unv.length - custVerified });
    } catch (err) {
      setError(err.message ?? "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  };
​
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#233B6E]">Beranda</h1>
​
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl
          px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={fetchData} className="text-red-600 font-semibold hover:underline text-xs ml-4">
            Coba Lagi
          </button>
        </div>
      )}
​
      {/* Stat cards pengajuan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {CARD_CONFIG.map(c => (
          <StatCard key={c.key} label={c.label} value={stats[c.key] ?? 0}
            total={stats.total || 1} color={c.color} loading={loading}/>
        ))}
      </div>
​
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
​
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