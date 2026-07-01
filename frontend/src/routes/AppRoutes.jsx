import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated, getUser } from "../utils/auth";

import Login          from "../pages/auth/Login";
import Register       from "../pages/auth/Register";
import LandingPage    from "../pages/LandingPage";
import ForgotPassword from "../pages/auth/LupaSandi";
import ResetPassword  from "../pages/auth/ResetSandi";
import PengaduanPublik from "../pages/PengaduanPublik";

import AdminLayout      from "../layouts/AdminLayout";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import CustomerLayout   from "../layouts/CustomerLayout";

// ── Admin ─────────────────────────────────────────────────────────
import AdminBeranda                from "../pages/admin/Beranda";
import RegistrasiPelanggan         from "../pages/admin/RegistrasiPelanggan";
import DetailPelanggan             from "../pages/admin/DetailPelanggan";
import AdminPengajuanMasuk         from "../pages/admin/PengajuanMasuk";
import AdminDetailPengajuan        from "../pages/admin/DetailPengajuanMasuk";
import AdminProsesPengujian        from "../pages/admin/ProsesPengujian";
import AdminLaporanHasilUji        from "../pages/admin/LaporanHasilUji";
import AdminLaporanPengaduan       from "../pages/admin/LaporanPengaduan";
import AdminDetailLaporanPengaduan from "../pages/admin/DetailLaporanPengaduan";
import AdminPenilaianPengguna      from "../pages/admin/PenilaianPengguna";
import AdminProfil                 from "../pages/admin/Profil";

// ── SuperAdmin ────────────────────────────────────────────────────
import SuperAdminBeranda             from "../pages/superAdmin/Beranda";
import SuperAdminRegistrasiPelanggan from "../pages/superAdmin/RegistrasiPelanggan";
import SuperAdminDetailPelanggan     from "../pages/superAdmin/DetailPelanggan";
import SuperAdminPengajuanMasuk      from "../pages/superAdmin/PengajuanMasuk";
import SuperAdminDetailPengajuan     from "../pages/superAdmin/DetailPengajuanMasuk";
import SuperAdminProsesPengujian     from "../pages/superAdmin/ProsesPengujian";
import SuperAdminLaporanHasilUji     from "../pages/superAdmin/LaporanHasilUji";
import ManajemenAkun                 from "../pages/superAdmin/ManajemenAkun";
import SuperAdminKatalog             from "../pages/superAdmin/KatalogPengujian";
import SuperAdminLaporanPengaduan    from "../pages/superAdmin/LaporanPengaduan";
import SuperAdminDetailLaporan       from "../pages/superAdmin/DetailLaporanPengaduan";
import SuperAdminPenilaianPengguna   from "../pages/superAdmin/PenilaianPengguna";
import SuperAdminProfil              from "../pages/superAdmin/Profil";

// ── Customer ──────────────────────────────────────────────────────
import CustomerBeranda    from "../pages/customer/Beranda";
import CustomerProfil     from "../pages/customer/Profil";
import CustomerPengaduan  from "../pages/PengaduanPublik";
import KatalogPengujian   from "../pages/customer/KatalogPengujian";
import KatalogPerLab      from "../pages/customer/KatalogPerLab";
import Keranjang          from "../pages/customer/Keranjang";
import PengajuanSaya      from "../pages/customer/PengajuanSaya";
import DetailPengajuan    from "../pages/customer/DetailPengajuan";
import PenilaianKepuasan  from "../pages/customer/PenilaianKepuasan";
import PengajuanUjiSampel from "../pages/customer/PengajuanUjiSampel";

function PrivateRoute({ children, allowedRoles }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();
  const role = (user?.role ?? "").toLowerCase();
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Publik */}
      <Route path="/"                              element={<LandingPage />} />
      <Route path="/login"                         element={<Login />} />
      <Route path="/register"                      element={<Register />} />
      <Route path="/forgot-password"               element={<ForgotPassword />} />
      <Route path="/reset-password/:userId/:token" element={<ResetPassword />} />
      <Route path="/pengaduan"                     element={<PengaduanPublik />} />

      {/* Admin */}
      <Route path="/admin" element={<PrivateRoute allowedRoles={["admin"]}><AdminLayout /></PrivateRoute>}>
        <Route index                               element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                      element={<AdminBeranda />} />
        <Route path="registrasi-pelanggan"         element={<RegistrasiPelanggan />} />
        <Route path="registrasi-pelanggan/:id"     element={<DetailPelanggan />} />
        <Route path="pengajuan-masuk"              element={<AdminPengajuanMasuk />} />
        <Route path="pengajuan-masuk/detail/:id"   element={<AdminDetailPengajuan />} />
        <Route path="proses-pengujian"             element={<AdminProsesPengujian />} />
        <Route path="laporan-hasil-uji"            element={<AdminLaporanHasilUji />} />
        <Route path="laporan-pengaduan"            element={<AdminLaporanPengaduan />} />
        <Route path="laporan-pengaduan/:id"        element={<AdminDetailLaporanPengaduan />} />
        <Route path="penilaian-pengguna"           element={<AdminPenilaianPengguna />} />
        <Route path="profil"                       element={<AdminProfil />} />
      </Route>

      {/* SuperAdmin */}
      <Route path="/superadmin" element={<PrivateRoute allowedRoles={["superadmin"]}><SuperAdminLayout /></PrivateRoute>}>
        <Route index                               element={<Navigate to="beranda" replace />} />
        <Route path="beranda"                      element={<SuperAdminBeranda />} />
        <Route path="registrasi-pelanggan"         element={<SuperAdminRegistrasiPelanggan />} />
        <Route path="registrasi-pelanggan/:id"     element={<SuperAdminDetailPelanggan />} />
        <Route path="pengajuan-masuk"              element={<SuperAdminPengajuanMasuk />} />
        <Route path="pengajuan-masuk/detail/:id"   element={<SuperAdminDetailPengajuan />} />
        <Route path="proses-pengujian"             element={<SuperAdminProsesPengujian />} />
        <Route path="laporan-hasil-uji"            element={<SuperAdminLaporanHasilUji />} />
        <Route path="manajemen-akun"               element={<ManajemenAkun />} />
        <Route path="katalog-pengujian"            element={<SuperAdminKatalog />} />
        <Route path="laporan-pengaduan"            element={<SuperAdminLaporanPengaduan />} />
        <Route path="laporan-pengaduan/:id"        element={<SuperAdminDetailLaporan />} />
        <Route path="penilaian-pengguna"           element={<SuperAdminPenilaianPengguna />} />
        <Route path="profil"                       element={<SuperAdminProfil />} />
      </Route>

      {/* Customer */}
      <Route path="/customer" element={<PrivateRoute allowedRoles={["customer"]}><CustomerLayout /></PrivateRoute>}>
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}