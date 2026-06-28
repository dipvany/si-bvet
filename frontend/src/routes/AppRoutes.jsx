import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated, getUser } from "../utils/auth";

// ── Halaman publik ────────────────────────────────────────────────
import Login          from "../pages/auth/Login";
import Register       from "../pages/auth/Register";
import LandingPage    from "../pages/LandingPage";
import ForgotPassword from "../pages/auth/LupaSandi";
import ResetPassword  from "../pages/auth/ResetSandi";

// ── Layout ────────────────────────────────────────────────────────
import AdminLayout      from "../layouts/AdminLayout";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import CustomerLayout   from "../layouts/CustomerLayout";

// ── Halaman admin (role: "admin") ─────────────────────────────────
import AdminBeranda                from "../pages/admin/Beranda";
import RegistrasiPelanggan         from "../pages/admin/RegistrasiPelanggan";
import DetailPelanggan             from "../pages/admin/DetailPelanggan";
import AdminLaporanPengaduan       from "../pages/admin/LaporanPengaduan";
import AdminDetailLaporanPengaduan from "../pages/admin/DetailLaporanPengaduan";
import AdminPenilaianPengguna      from "../pages/admin/PenilaianPengguna";
import AdminProfil                 from "../pages/admin/Profil";
import AdminLaporanHasilUji        from "../pages/admin/LaporanHasilUji";       // ✅ BARU
/*
  import PengajuanMasuk  from "../pages/admin/PengajuanMasuk";
  import ProsesPengujian from "../pages/admin/ProsesPengujian";
*/

// ── Halaman superadmin (role: "superadmin") ───────────────────────
import SuperAdminBeranda             from "../pages/superAdmin/Beranda";
import SuperAdminRegistrasiPelanggan from "../pages/superAdmin/RegistrasiPelanggan";
import SuperAdminDetailPelanggan     from "../pages/superAdmin/DetailPelanggan";
import SuperAdminProfil              from "../pages/superAdmin/Profil";
import ManajemenAkun                 from "../pages/superAdmin/ManajemenAkun";
import SuperAdminKatalog             from "../pages/superAdmin/KatalogPengujian";
import SuperAdminLaporanPengaduan    from "../pages/superAdmin/LaporanPengaduan";
import SuperAdminDetailLaporan       from "../pages/superAdmin/DetailLaporanPengaduan";
import SuperAdminPenilaianPengguna   from "../pages/superAdmin/PenilaianPengguna";
import SuperAdminLaporanHasilUji     from "../pages/superAdmin/LaporanHasilUji"; // ✅ BARU
/*
  import SuperAdminPengajuanMasuk  from "../pages/superAdmin/PengajuanMasuk";
  import SuperAdminProsesPengujian from "../pages/superAdmin/ProsesPengujian";
*/

// ── Halaman customer (role: "customer") ───────────────────────────
import CustomerBeranda    from "../pages/customer/Beranda";
import CustomerProfil     from "../pages/customer/Profil";
import CustomerPengaduan  from "../pages/customer/Pengaduan";
import KatalogPengujian   from "../pages/customer/KatalogPengujian";
import KatalogPerLab      from "../pages/customer/KatalogPerLab";
import Keranjang          from "../pages/customer/Keranjang";
import PengajuanSaya      from "../pages/customer/PengajuanSaya";
import DetailPengajuan    from "../pages/customer/DetailPengajuan";
import PenilaianKepuasan  from "../pages/customer/PenilaianKepuasan";
import PengajuanUjiSampel from "../pages/customer/PengajuanUjiSampel";

/* ── PrivateRoute ─────────────────────────────────────────────────
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
      <Route path="/"                              element={<LandingPage />} />
      <Route path="/login"                         element={<Login />} />
      <Route path="/register"                      element={<Register />} />
      <Route path="/forgot-password"               element={<ForgotPassword />} />
      <Route path="/reset-password/:userId/:token" element={<ResetPassword />} />

      {/* ── Admin (role: "admin") ────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index                               element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                      element={<AdminBeranda />} />
        <Route path="registrasi-pelanggan"         element={<RegistrasiPelanggan />} />
        <Route path="registrasi-pelanggan/:id"     element={<DetailPelanggan />} />
        <Route path="laporan-pengaduan"            element={<AdminLaporanPengaduan />} />
        <Route path="laporan-pengaduan/:id"        element={<AdminDetailLaporanPengaduan />} />
        <Route path="penilaian-pengguna"           element={<AdminPenilaianPengguna />} />
        <Route path="lhu"                          element={<AdminLaporanHasilUji />} />  {/* ✅ */}
        <Route path="profil"                       element={<AdminProfil />} />
        {/*
          <Route path="pengajuan-masuk"            element={<PengajuanMasuk />} />
          <Route path="proses-pengujian"           element={<ProsesPengujian />} />
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
        <Route index                               element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                      element={<SuperAdminBeranda />} />
        <Route path="registrasi-pelanggan"         element={<SuperAdminRegistrasiPelanggan />} />
        <Route path="registrasi-pelanggan/:id"     element={<SuperAdminDetailPelanggan />} />
        <Route path="manajemen-akun"               element={<ManajemenAkun />} />
        <Route path="katalog-pengujian"            element={<SuperAdminKatalog />} />
        <Route path="laporan-pengaduan"            element={<SuperAdminLaporanPengaduan />} />
        <Route path="laporan-pengaduan/:id"        element={<SuperAdminDetailLaporan />} />
        <Route path="penilaian-pengguna"           element={<SuperAdminPenilaianPengguna />} />
        <Route path="lhu"                          element={<SuperAdminLaporanHasilUji />} />  {/* ✅ */}
        <Route path="profil"                       element={<SuperAdminProfil />} />
        {/*
          <Route path="pengajuan-masuk"            element={<SuperAdminPengajuanMasuk />} />
          <Route path="proses-pengujian"           element={<SuperAdminProsesPengujian />} />
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
        <Route index                               element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                      element={<CustomerBeranda />} />
        <Route path="profil"                       element={<CustomerProfil />} />
        <Route path="katalog-pengujian"            element={<KatalogPengujian />} />
        <Route path="katalog-pengujian/lab/:unit"  element={<KatalogPerLab />} />
        <Route path="keranjang"                    element={<Keranjang />} />
        <Route path="pengajuan-uji-sampel"         element={<PengajuanUjiSampel />} />
        <Route path="pengajuan-saya"               element={<PengajuanSaya />} />
        <Route path="pengajuan-saya/:id"           element={<DetailPengajuan />} />
        <Route path="penilaian/:id"                element={<PenilaianKepuasan />} />
        <Route path="pengaduan"                    element={<CustomerPengaduan />} />
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}