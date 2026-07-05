/**
 * adminServices.js  —  role: "admin"
 */
import { apiFetch } from "./api";
​
// ── Registrasi Customer ───────────────────────────────────────────
export const getUnverifiedCustomers = () =>
  apiFetch("/admin/customers");
​
export const verifyUser = (userId) =>
  apiFetch(`/admin/customers/${userId}/verify`, { method: "PATCH" });
​
export const rejectUser = (userId) =>
  apiFetch(`/admin/customers/${userId}/reject`, { method: "PATCH" });
​
// ── Submission ────────────────────────────────────────────────────
export const getAdminSubmissions = (params = "") =>
  apiFetch(`/admin/submissions${params}`);
​
export const approveSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/approve`, { method: "PATCH" });
​
export const rejectSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/reject`, { method: "PATCH" });
​
export const getSubmissionByID = (id) =>
  apiFetch(`/admin/submissions/${id}`);
​
// Export pengajuan ke Excel.
// payload: { export_all: true } untuk semua data,
// atau { export_all: false, submission_ids: [1, 2, 3] } untuk pilih beberapa/1 data.
export const exportSubmissions = (payload) =>
  apiFetch("/admin/submissions/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
​
// ── Billing ───────────────────────────────────────────────────────
export const createBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
​
export const getBilling = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}`);
​
export const updateBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
​
export const verifyPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/verify`, { method: "PATCH" });
​
export const rejectPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/reject`, { method: "PATCH" });
​
// ── LHU ──────────────────────────────────────────────────────────
// GET  /admin/submissions/:id/lhu   — cek / ambil LHU
export const getLHU = (submissionId) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`);
​
// POST /admin/submissions/:id/lhu   — upload LHU (FormData: no_lhu, file)
export const uploadLHU = (submissionId, formData) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`, {
    method: "POST",
    body:   formData,
    // Jangan set Content-Type — browser isi boundary FormData otomatis
  });
​
// ── Profil ────────────────────────────────────────────────────────
export const getProfile = () =>
  apiFetch("/profile");
​
export const updateProfile = (data) =>
  apiFetch("/profile", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
​
export const changePassword = (data) =>
  apiFetch("/auth/change-password", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
​
// ── Penilaian ────────────────────────────────────────────────────
export const getAllFeedbacks = () =>
  apiFetch("/admin/feedbacks");
​
// ── Laporan Pengaduan ─────────────────────────────────────────────
export const getAllComplaints = () =>
  apiFetch("/admin/complaints");
​
export const respondComplaint = (id, data) =>
  apiFetch(`/admin/complaints/${id}/respond`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });