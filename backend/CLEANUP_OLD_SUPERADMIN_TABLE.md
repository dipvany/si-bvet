# Cleanup Legacy SuperAdmin Table

Panduan ini untuk membersihkan tabel lama "SuperAdmin" setelah profil admin dan superadmin disatukan ke tabel "Admin".

## Kapan dijalankan

Jalankan sekali di environment yang pernah punya tabel "SuperAdmin".
Jika environment baru, langkah ini aman dilewati.

## 1. Backup database

Contoh backup:

pg_dump -h localhost -U postgres -d sibvet_lampung -f backup_before_superadmin_cleanup.sql

## 2. Jalankan aplikasi terbaru dulu

Pastikan kode terbaru sudah berjalan dan AutoMigrate sudah dieksekusi minimal sekali.
Tujuannya agar struktur tabel "Admin" sesuai model terbaru.

## 3. Jalankan SQL cleanup manual

File SQL cleanup:

migrations/manual_cleanup_superadmin_to_admin.sql

Contoh eksekusi:

psql -h localhost -U postgres -d sibvet_lampung -f migrations/manual_cleanup_superadmin_to_admin.sql

Lalu jalankan migrasi kolom waktu legacy:

psql -h localhost -U postgres -d sibvet_lampung -f migrations/manual_migrate_legacy_timestamps.sql

## 4. Verifikasi hasil

Jalankan query berikut:

SELECT to_regclass('"SuperAdmin"') AS superadmin_table;
SELECT COUNT(_) AS managed_accounts FROM "Admin";
SELECT role, COUNT(_) FROM "Users" WHERE role IN ('admin', 'superadmin') GROUP BY role;
SELECT column_name FROM information_schema.columns WHERE table_name = 'Users' AND column_name IN ('create_at', 'update_at', 'created_at', 'updated_at') ORDER BY column_name;
SELECT column_name FROM information_schema.columns WHERE table_name = 'Complaint' AND column_name IN ('create_at', 'created_at', 'updated_at') ORDER BY column_name;
SELECT column_name FROM information_schema.columns WHERE table_name = 'Feedback' AND column_name IN ('create_at', 'created_at') ORDER BY column_name;

Hasil yang diharapkan:

- superadmin_table bernilai null (tabel lama sudah hilang)
- data profil akun admin/superadmin ada di tabel "Admin"
- role user tetap konsisten di tabel "Users"
- kolom legacy create_at/update_at sudah tidak ada
- kolom created_at/updated_at sudah tersedia sesuai model baru

## 5. Rollback jika diperlukan

Jika ada masalah, restore dari backup langkah 1.

## Catatan

SQL cleanup bersifat idempotent: aman dijalankan ulang.
Jika tabel "SuperAdmin" tidak ada, script akan skip tanpa error.
