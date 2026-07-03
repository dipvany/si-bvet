/**
 * superAdminServices.js — role: "superadmin"
 * Semua call pakai apiFetch (native fetch + auto Bearer token dari api.js).
 */
import { apiFetch } from "./api";

// ── Dashboard ─────────────────────────────────────────────────────
export const getDashboard = () => apiFetch("/dashboard");

// FIX: tambah params agar bisa kirim ?page=1&per_page=20 dari PengajuanMasuk
export const getAdminSubmissions = (params = "") =>
  apiFetch(`/admin/submissions${params}`);

// ── Registrasi Customer ───────────────────────────────────────────
export const getUnverifiedCustomers = () =>
  apiFetch("/admin/customers");

export const verifyUser = (id) =>
  apiFetch(`/admin/customers/${id}/verify`, { method: "PATCH" });

export const rejectUser = (id) =>
  apiFetch(`/admin/customers/${id}/reject`, { method: "PATCH" });

// ── Submission ────────────────────────────────────────────────────
export const approveSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/approve`, { method: "PATCH" });

export const rejectSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/reject`, { method: "PATCH" });

export const getSubmissionByID = (id) =>
  apiFetch(`/admin/submissions/${id}`);

// Export pengajuan ke Excel.
// payload: { export_all: true } untuk semua data,
// atau { export_all: false, submission_ids: [1, 2, 3] } untuk pilih beberapa/1 data.
export const exportSubmissions = (payload) =>
  apiFetch("/admin/submissions/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

// ── Billing ───────────────────────────────────────────────────────
export const createBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const getBilling = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}`);

export const updateBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const verifyPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/verify`, { method: "PATCH" });

export const rejectPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/reject`, { method: "PATCH" });

// ── LHU ──────────────────────────────────────────────────────────
export const getLHU = (submissionId) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`);

export const uploadLHU = (submissionId, formData) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`, {
    method: "POST",
    body:   formData,
  });

// ── Manajemen Akun Admin ──────────────────────────────────────────
export const getAllAdminAccounts = () =>
  apiFetch("/superadmin/admin-accounts");

export const createAdminAccount = (data) =>
  apiFetch("/superadmin/admin-accounts", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const updateAdminAccount = (userId, data) =>
  apiFetch(`/superadmin/admin-accounts/${userId}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const deleteAdminAccount = (userId) =>
  apiFetch(`/superadmin/admin-accounts/${userId}`, { method: "DELETE" });

// ── Katalog / Test Services ───────────────────────────────────────
export const getTestServices = () =>
  apiFetch("/admin/test-services");

export const updateTestService = (id, data) =>
  apiFetch(`/admin/test-services/${id}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const deleteTestService = (id) =>
  apiFetch(`/admin/test-services/${id}`, { method: "DELETE" });

// ── Penilaian ────────────────────────────────────────────────────
export const getAllFeedbacks = () =>
  apiFetch("/admin/feedbacks");

// ── Laporan Pengaduan ─────────────────────────────────────────────
export const getAllComplaints = () =>
  apiFetch("/admin/complaints");

export const respondComplaint = (id, data) =>
  apiFetch(`/admin/complaints/${id}/respond`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

// ── Profil ────────────────────────────────────────────────────────
export const getProfile = () =>
  apiFetch("/profile");

export const updateProfile = (data) =>
  apiFetch("/profile", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const changePassword = (data) =>
  apiFetch("/auth/change-password", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

// ── Template Sampel (pengajuan massal) ───────────────────────────
// POST /superadmin/submissions/samples/template
// Upload template Excel yang akan diunduh customer di Step 2
export const uploadSampleTemplate = (formData) =>
  apiFetch("/superadmin/submissions/samples/template", {
    method: "POST",
    body:   formData,
    // Jangan set Content-Type — browser isi boundary FormData otomatis
  });

export const getActivityLogs = () => apiFetch("/superadmin/activity-logs");