/**
 * parseSubmissionList — helper untuk membongkar response API submission
 * yang bentuknya tidak konsisten antar endpoint:
 *
 *   - GET /customer/submissions/my  → bisa array langsung [ {...} ]
 *                                      atau { data: [...] }
 *   - GET /admin/submissions        → { data: [...] }
 *                                      atau { data: { data: [...], meta } } (paginated)
 *
 * Fungsi ini mencoba semua kemungkinan bentuk secara berurutan,
 * supaya frontend tetap jalan walau backend mengubah struktur sedikit.
 */
export function parseSubmissionList(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  if (Array.isArray(json?.submissions)) return json.submissions;
  return [];
}