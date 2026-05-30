# SI-BVET Temporary API Contract

Tanggal: 2026-04-02
Tujuan: acuan sementara komunikasi frontend-backend.

## Base URL

- `http://localhost:8080/api`

## Authentication

- Header untuk endpoint protected:
  - `Authorization: Bearer <JWT_TOKEN>`
- Token didapat dari endpoint login.
- Endpoint auth tambahan:
  - `PATCH /api/auth/change-password` untuk user yang sedang login.
  - `POST /api/auth/forgot-password` untuk meminta link reset password.
  - `POST /api/auth/reset-password/:id/:token?expires=...&signature=...` untuk menyimpan password baru.

## Global Response Pattern

- Sukses umumnya:
  - `{ "message": "..." }`
  - atau object/list entity langsung (contoh submission list, billing object, lhu object)
- Gagal umumnya:
  - `{ "error": "..." }`

## Role Access

- Public: `/auth/*`
- Protected umum: `/profile`, `/dashboard`
- Superadmin only: `/superadmin/*`
- Admin + superadmin: `/admin/*`
- Customer only: `/customer/*`

## Content-Type by Endpoint

- `application/json`: login, profile update, admin/account, test-services, submission create/update manual, feedback, complaint response, billing create/update.
- `application/json`: juga dipakai untuk change-password, forgot-password, dan reset-password.
- `multipart/form-data`: register customer, upload billing proof, upload LHU, create complaint, submit submission bulk upload.
- `multipart/form-data`: import sample template customer dengan path parameter `submission_id`.
- `GET` download file: `/customer/submissions/:submission_id/lhu/download`
- Endpoint import sample template customer: `POST /api/customer/submissions/:submission_id/samples/import`.
- Endpoint create submission bulk upload customer: `POST /api/customer/submissions` dengan field form biasa + file template `file`.

## Important Notes (Temporary)

- Endpoint `DELETE /api/superadmin/admin-accounts/:id` sudah ada di route tetapi handler belum mengembalikan response final (implementasi backend belum lengkap).
- Endpoint yang upload file memakai field name wajib:
  - register: `registration_doc`
  - upload proof pembayaran: `proof`
  - upload LHU: `file`
  - complaint attachment (opsional): `attachment`
  - import sample template customer: `file`

## Postman Collection

Gunakan file ini untuk import ke Postman:

- `backend/SI-BVET_TEMP_API_CONTRACT.postman_collection.json`

Collection sudah mencakup seluruh endpoint aktif di `routes.go` beserta contoh body request.

## Postman Examples

- Setiap request sudah dilengkapi contoh response pada tab `Examples`.
- Cakupan minimal:
  - Success response per endpoint.
  - Unauthorized response (`401`) untuk endpoint protected.
  - Bad request response (`400`) untuk endpoint yang validasinya eksplisit (misalnya login/register).
