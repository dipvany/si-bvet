import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated, getUser } from "../utils/auth";

// ── Halaman publik ────────────────────────────────────────────────
import Login       from "../pages/Login";
import Register    from "../pages/Register";
import LandingPage from "../pages/LandingPage";

// ── Layout ────────────────────────────────────────────────────────
import AdminLayout      from "../layouts/AdminLayout";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import LaporanPengaduan       from "../pages/superAdmin/LaporanPengaduan";
import DetailLaporanPengaduan from "../pages/superAdmin/DetailLaporanPengaduan";
import CustomerLayout   from "../layouts/CustomerLayout";

// ── Halaman admin (role: "admin") ─────────────────────────────────
import AdminBeranda        from "../pages/admin/Beranda";
import RegistrasiPelanggan from "../pages/admin/RegistrasiPelanggan";
import DetailPelanggan     from "../pages/admin/DetailPelanggan";

// ── Halaman superadmin (role: "superadmin") ───────────────────────
import SuperAdminBeranda             from "../pages/superAdmin/Beranda";
import SuperAdminRegistrasiPelanggan from "../pages/superAdmin/RegistrasiPelanggan";
import SuperAdminDetailPelanggan     from "../pages/superAdmin/DetailPelanggan";
import SuperAdminProfil     from "../pages/superAdmin/Profil";

// ── Halaman customer (role: "customer") ───────────────────────────
import CustomerBeranda       from "../pages/customer/Beranda";
import CustomerProfil        from "../pages/customer/Profil";
import CustomerPengaduan     from "../pages/customer/Pengaduan";
import KatalogPengujian      from "../pages/customer/KatalogPengujian";
/*
  Uncomment saat halaman sudah dibuat:
  import PengajuanUjiSampel from "../pages/customer/PengajuanUjiSampel";
  import PengajuanSaya      from "../pages/customer/PengajuanSaya";
  import Pengaduan          from "../pages/customer/Pengaduan";
*/

/* ── PrivateRoute ────────────────────────────────────────────────
   Role dari backend lowercase: "admin" | "superadmin" | "customer"
────────────────────────────────────────────────────────────────── */
function PrivateRoute({ children, allowedRoles }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();
  const role = (user?.role ?? "").toLowerCase();
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Publik ──────────────────────────────────────────────── */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Admin (role: "admin") ────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                  element={<AdminBeranda />} />
        <Route path="registrasi-pelanggan"     element={<RegistrasiPelanggan />} />
        <Route path="registrasi-pelanggan/:id" element={<DetailPelanggan />} />
        {/*
          <Route path="pengajuan-masuk"  element={<PengajuanMasuk />} />
          <Route path="proses-pengujian" element={<ProsesPengujian />} />
          <Route path="profil"           element={<AdminProfil />} />
        */}
      </Route>

      {/* ── SuperAdmin (role: "superadmin") ──────────────────────── */}
      <Route
        path="/superadmin"
        element={
          <PrivateRoute allowedRoles={["superadmin"]}>
            <SuperAdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                  element={<SuperAdminBeranda />} />
        <Route path="registrasi-pelanggan"     element={<SuperAdminRegistrasiPelanggan />} />
        <Route path="registrasi-pelanggan/:id" element={<SuperAdminDetailPelanggan />} />
        <Route path="laporan-pengaduan"     element={<LaporanPengaduan />} />
        <Route path="laporan-pengaduan/:id" element={<DetailLaporanPengaduan />} />
        <Route path="profil"           element={<SuperAdminProfil />} />
        {/*
          <Route path="pengajuan-masuk"  element={...} />
          <Route path="manajemen-akun"   element={...} />
          <Route path="katalog-pengujian" element={...} />
        */}
      </Route>

      {/* ── Customer (role: "customer") ───────────────────────────── */}
      <Route
        path="/customer"
        element={
          <PrivateRoute allowedRoles={["customer"]}>
            <CustomerLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="beranda" replace />} />
        <Route path="beranda"             element={<CustomerBeranda />} />
        <Route path="profil"              element={<CustomerProfil />} />
        <Route path="katalog-pengujian"   element={<KatalogPengujian />} />
        <Route path="pengaduan"           element={<CustomerPengaduan />} />
        {/*
          <Route path="pengajuan-uji-sampel" element={<PengajuanUjiSampel />} />
          <Route path="pengajuan-saya"       element={<PengajuanSaya />} />
        */}
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}