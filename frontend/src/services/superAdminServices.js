/**
 * superAdminServices.js — role: "superadmin"
 * Semua call pakai apiFetch (native fetch + auto Bearer token dari api.js).
 */
import { apiFetch } from "./api";

// ── Dashboard ─────────────────────────────────────────────────────
export const getDashboard        = () => apiFetch("/dashboard");
export const getAdminSubmissions = () => apiFetch("/admin/submissions");

// ── Registrasi Customer ───────────────────────────────────────────
export const getUnverifiedCustomers = () =>
  apiFetch("/admin/customers");

export const verifyUser = (id) =>
  apiFetch(`/admin/customers/${id}/verify`, { method: "PATCH" });

export const rejectUser = (id) =>
  apiFetch(`/admin/customers/${id}/reject`, { method: "PATCH" });

// ── Manajemen Akun Admin ──────────────────────────────────────────
export const getAllAdminAccounts = () =>
  apiFetch("/superadmin/admin-accounts");

export const createAdminAccount = (data) =>
  apiFetch("/superadmin/admin-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateAdminAccount = (userId, data) =>
  apiFetch(`/superadmin/admin-accounts/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deleteAdminAccount = (userId) =>
  apiFetch(`/superadmin/admin-accounts/${userId}`, { method: "DELETE" });

// ── Submission ────────────────────────────────────────────────────
export const approveSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/approve`, { method: "PATCH" });

export const rejectSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/reject`, { method: "PATCH" });

// ── Billing ───────────────────────────────────────────────────────
export const createBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getBilling = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}`);

export const updateBilling = (submissionId, data) =>
  apiFetch(`/admin/billings/${submissionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const verifyPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/verify`, { method: "PATCH" });

export const rejectPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/reject`, { method: "PATCH" });

// ── LHU ──────────────────────────────────────────────────────────
export const uploadLHU = (submissionId, formData) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`, {
    method: "POST",
    body: formData,
    // Jangan set Content-Type — browser otomatis isi boundary FormData
  });

export const getLHU = (submissionId) =>
  apiFetch(`/admin/submissions/${submissionId}/lhu`);

// ── Katalog / Test Services ───────────────────────────────────────
export const getTestServices   = ()         => apiFetch("/admin/test-services");
export const createTestService = (data)     =>
  apiFetch("/admin/test-services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const updateTestService = (id, data) =>
  apiFetch(`/admin/test-services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const deleteTestService = (id) =>
  apiFetch(`/admin/test-services/${id}`, { method: "DELETE" });

// ── Feedback & Complaints ─────────────────────────────────────────
export const getAllFeedbacks   = ()         => apiFetch("/admin/feedbacks");
export const getAllComplaints  = ()         => apiFetch("/admin/complaints");
export const respondComplaint = (id, data) =>
  apiFetch(`/admin/complaints/${id}/respond`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// ── Profil (endpoint shared GET/PATCH /profile) ───────────────────
// Response: { profile: { id, fullname, email, phone, role, institution, ... } }
export const getProfile = () =>
  apiFetch("/profile");

export const updateProfile = (data) =>
  apiFetch("/profile", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
    // field yang diterima: fullname, phone, institution, (dan customer fields bila role customer)
  });

// ── Ganti Kata Sandi (PATCH /auth/change-password) ───────────────
// Body wajib: { current_password, new_password }
export const changePassword = (data) =>
  apiFetch("/auth/change-password", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });