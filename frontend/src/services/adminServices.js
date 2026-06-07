/**
 * adminServices.js  —  role: "admin" (dulunya officer)
 * Semua call pakai apiFetch (native fetch + Bearer token).
 */
import { apiFetch } from "./api";

// ── Registrasi Customer ───────────────────────────────────────────
export const getUnverifiedCustomers = () =>
  apiFetch("/admin/customers/unverified");

export const verifyUser = (userId) =>
  apiFetch(`/admin/customers/${userId}/verify`, { method: "PATCH" });

export const rejectUser = (userId) =>
  apiFetch(`/admin/customers/${userId}/reject`, { method: "PATCH" });

// ── Submission ────────────────────────────────────────────────────
export const getAdminSubmissions = () =>
  apiFetch("/admin/submissions");

export const approveSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/approve`, { method: "PATCH" });

export const rejectSubmission = (id) =>
  apiFetch(`/admin/submissions/${id}/reject`, { method: "PATCH" });

// ── Billing ───────────────────────────────────────────────────────
export const verifyPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/verify`, { method: "PATCH" });

export const rejectPayment = (submissionId) =>
  apiFetch(`/admin/billings/${submissionId}/reject`, { method: "PATCH" });