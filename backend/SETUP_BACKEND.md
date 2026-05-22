# Panduan Setup & Menjalankan Backend Si-BVet

Dokumentasi ini ditujukan untuk frontend developer agar dapat menyesuaikan dan mengintegrasikan dengan backend Si-BVet.

---

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Instalasi Dependencies](#instalasi-dependencies)
3. [Konfigurasi Environment](#konfigurasi-environment)
4. [Setup Database](#setup-database)
5. [Menjalankan Backend](#menjalankan-backend)
6. [Informasi API](#informasi-api)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Sebelum memulai, pastikan Anda telah menginstal:

### 1. **Go Programming Language**

- **Versi**: Go 1.24.0 atau lebih tinggi
- **Download**: [https://golang.org/dl/](https://golang.org/dl/)
- **Verifikasi instalasi**:
  ```bash
  go version
  ```
- Pastikan output menunjukkan versi 1.24.0 atau lebih

### 2. **PostgreSQL Database**

- **Versi**: PostgreSQL 13 atau lebih tinggi
- **Download**: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- **Verifikasi instalasi**:
  ```bash
  psql --version
  ```

### 3. **PostgreSQL Client Tools** (optional, tapi disarankan)

- **pgAdmin** atau **DBeaver** untuk yang lebih mudah mengelola database

### 4. **IDE/Editor** (optional)

- Visual Studio Code dengan extension Go
- GoLand (IntelliJ IDEA)
- Atau text editor favorit Anda

### 5. **Git** (untuk clone repository)

- **Download**: [https://git-scm.com/](https://git-scm.com/)

---

## Instalasi Dependencies

### 1. Navigate ke Folder Backend

```bash
cd backend
```

### 2. Download Go Dependencies

Go akan otomatis download dependencies dari `go.mod` file:

```bash
go mod download
```

### 3. Verify Dependencies

```bash
go mod tidy
```

Perintah ini akan membersihkan dan memastikan semua dependencies tercatat dengan baik di `go.mod`.

---

## Konfigurasi Environment

### 1. Buat File `.env`

Pada folder `backend/`, buat file `.env` dengan konten:

```env
# Server Configuration
PORT=8080

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=sibvet_lampung

# JWT Configuration
JWT_SECRET=secret_token123
JWT_EXPIRED_HOURS=24

# Optional: one-time initial superadmin bootstrap
BOOTSTRAP_SUPERADMIN_EMAIL=
BOOTSTRAP_SUPERADMIN_PASSWORD=
BOOTSTRAP_SUPERADMIN_FULLNAME=Initial Superadmin
BOOTSTRAP_SUPERADMIN_PHONE=080000000000
BOOTSTRAP_SUPERADMIN_POSITION=
BOOTSTRAP_SUPERADMIN_UNIT_LAB=
BOOTSTRAP_SUPERADMIN_EMPLOYEE_NO=
```

Catatan bootstrap superadmin:

- Bootstrap hanya berjalan jika `BOOTSTRAP_SUPERADMIN_EMAIL` dan `BOOTSTRAP_SUPERADMIN_PASSWORD` diisi.
- Bootstrap hanya akan membuat akun ketika belum ada user dengan role `superadmin`.
- Jika superadmin sudah ada, bootstrap akan otomatis skip.
- Jika email bootstrap sudah dipakai user lain, startup akan gagal agar tidak membuat akun ganda/konflik.

### 2. Konfigurasi Per Environment

#### Development (localhost)

```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=dyvaniest123
DB_NAME=sibvet_lampung
JWT_SECRET=dev_secret_key
JWT_EXPIRED_HOURS=24
```

#### Production (Server)

```env
PORT=8000
DB_HOST=prod-db-server.com
DB_PORT=5432
DB_USER=prod_user
DB_PASSWORD=strong_password_production
DB_NAME=sibvet_prod
JWT_SECRET=production_secret_key_very_long_and_complex
JWT_EXPIRED_HOURS=5
GCS_BUCKET_NAME=sibvet-documents
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Jika `GCS_BUCKET_NAME` diisi, backend akan menyimpan dokumen registrasi ke Google Cloud Storage.
Jika env bucket tidak diisi, backend tetap bisa jalan dengan penyimpanan lokal sementara untuk development.

### 3. Setup Google Cloud Storage Permission

Jika Anda menjalankan backend di Google Cloud atau ingin upload dokumen tidak bergantung ke filesystem lokal, lakukan langkah berikut:

1. **Buat bucket GCS**

```bash
gsutil mb -l asia-southeast2 gs://sibvet-documents
```

Ganti `sibvet-documents` dengan nama bucket Anda sendiri jika diperlukan.

2. **Buat atau pilih service account untuk backend**

Service account ini yang akan dipakai oleh Cloud Run, VM, atau server yang menjalankan backend.

3. **Berikan izin upload ke bucket**

Minimal role yang dibutuhkan:

- `roles/storage.objectAdmin` untuk upload dan baca object di bucket
- `roles/iam.serviceAccountTokenCreator` jika backend perlu membuat signed URL memakai service account credentials

Contoh command:

```bash
gcloud storage buckets add-iam-policy-binding gs://sibvet-documents \
  --member="serviceAccount:YOUR_BACKEND_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud iam service-accounts add-iam-policy-binding \
  YOUR_BACKEND_SA@PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:YOUR_BACKEND_SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

4. **Kalau deploy ke Cloud Run**

- Attach service account backend tadi ke Cloud Run service
- Pastikan Cloud Run service punya akses ke bucket yang sama
- Set environment variable:

```env
GCS_BUCKET_NAME=sibvet-documents
```

Jika Anda menjalankan backend secara lokal dengan file key service account, tambahkan juga:

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

5. **Uji upload**

Setelah backend jalan, upload dokumen registrasi sekali lalu cek apakah object muncul di bucket dan link dokumen bisa dibuka dari halaman admin.

**⚠️ PENTING**:

- Jangan commit `.env` file ke repository (sudah ada di `.gitignore`)
- Selalu gunakan password yang kuat untuk production
- Simpan JWT_SECRET dengan aman

---

## Setup Database

### 1. Buat Database di PostgreSQL

Buka PostgreSQL client (psql, pgAdmin, atau DBeaver) dan jalankan:

```sql
-- Buat database
CREATE DATABASE sibvet_lampung;

-- Connect ke database
\c sibvet_lampung

-- Extensions (optional, tapi disarankan)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Struktur Database

Backend akan otomatis membuat tabel-tabel ketika pertama kali dijalankan (Auto Migration menggunakan GORM). Tabel yang akan dibuat:

- `users` - Data user (customer, admin, superadmin)
- `admins` - Data admin
- `customers` - Data customer/pengguna
- `submissions` - Permohonan tes/sample
- `samples` - Data sample/contoh specimen
- `billings` - Data tagihan
- `lhu_documents` - Document LHU (Laboratorium Hewan Uji)
- `feedbacks` - Feedback customer
- `complaints` - Keluhan customer
- `test_services` - Layanan tes yang tersedia
- `test_requests` - Permintaan tes

### 3. Verifikasi Database

Setelah backend berjalan, verifikasi tabel sudah dibuat:

```sql
\dt
```

Atau di pgAdmin, cek di `Databases > sibvet_lampung > Schemas > public > Tables`

---

## Menjalankan Backend

### Method 1: Direct Go Run (Development)

```bash
cd backend
go run cmd/server/main.go
```

### Method 2: Build dan Run (Production)

```bash
cd backend

# Build executable
go build -o sibvet cmd/server/main.go

# Run executable
./sibvet
```

### Method 3: Go Module Run

```bash
cd backend
go run ./cmd/server
```

### Output yang Diharapkan

Jika sukses, terminal akan menampilkan:

```
Starting server on :8080
```

Server akan berjalan di: **http://localhost:8080**

---

## Informasi API

### Base URL

```
http://localhost:8080/api
```

### Endpoint Struktur

```
/api/auth           - Authentication (register, login)
/api/admin          - Admin management
/api/submissions    - Manajemen submission
/api/test-services  - Layanan tes
/api/billing        - Manajemen billing
/api/complaints     - Keluhan
/api/feedbacks      - Feedback
/api/profile        - User profile
```

### Authentication

Untuk protected endpoints, kirim JWT Token di header:

```
Authorization: Bearer <token_jwt>
```

Contoh dengan cURL:

```bash
curl -H "Authorization: Bearer your_jwt_token" http://localhost:8080/api/profile
```

### Testing API

Gunakan file Postman collection yang tersedia:

- `SI-BVET_TEMP_API_CONTRACT.postman_collection.json` - Untuk testing API

Atau lihat detail API di:

- `API_CONTRACT_SI_BVET_TEMP.md` - Dokumentasi API lengkap

---

## Struktur Project

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Entry point aplikasi
├── internal/
│   ├── constants/            # Konstanta (roles, dll)
│   ├── db/                   # Database configuration
│   ├── dto/                  # Data Transfer Objects (request models)
│   ├── handlers/             # HTTP handlers/controllers
│   ├── middleware/           # Middleware (auth, role)
│   ├── models/               # Database models
│   ├── repositories/         # Repository pattern untuk DB queries
│   ├── routes/               # Route definitions
│   ├── services/             # Business logic
│   └── utils/                # Utility functions (JWT, dll)
├── migrations/               # Database migrations
├── uploads/                  # Folder untuk file uploads
├── go.mod                    # Go module definition
├── .env                      # Environment variables (create this)
├── .env.example              # Example environment file
└── SETUP_BACKEND.md          # File ini
```

---

## Dependencies Utama

| Library           | Version | Fungsi               |
| ----------------- | ------- | -------------------- |
| Gin Gonic         | v1.11.0 | Web framework        |
| GORM              | v1.31.1 | ORM untuk database   |
| PostgreSQL Driver | v1.6.0  | Driver database      |
| JWT               | v5.3.1  | Token authentication |
| godotenv          | v1.5.1  | Load .env files      |

---

## Troubleshooting

### Error: "No such file or directory: .env"

**Solusi**: Buat file `.env` di folder `backend/` dengan konfigurasi yang sesuai (lihat [Konfigurasi Environment](#konfigurasi-environment))

### Error: "Could not connect to the database"

**Kemungkinan penyebab**:

1. PostgreSQL tidak running
2. Kredensial database salah di `.env`
3. Database belum dibuat

**Solusi**:

```bash
# Check PostgreSQL status (Windows)
pg_isready -h localhost -p 5432

# atau manual connect ke postgres
psql -h localhost -U postgres

# Verifikasi database ada
\l

# Jika belum ada, buat:
CREATE DATABASE sibvet_lampung;
```

### Error: "Could not download dependencies"

**Solusi**:

```bash
# Clear cache
go clean -modcache

# Download ulang
go mod download

# Tidy
go mod tidy
```

### Error: "Port 8080 already in use"

**Solusi**:

```bash
# Windows - Cari process yang menggunakan port 8080
netstat -ano | findstr :8080

# Linux/Mac
lsof -i :8080

# Kemudian kill process atau ubah PORT di .env
```

### Server Running tapi tidak bisa connect dari Frontend

**Kemungkinan penyebab**: CORS issue

**Solusi**: Pastikan CORS middleware sudah dikonfigurasi di `routes.go`

### Error saat Auto Migration

**Solusi**:

1. Cek koneksi database
2. Cek permissions user di database
3. Manual run migrations jika ada di folder `migrations/`

---

## Development Tips

### 1. **Debug Mode**

Jalankan dengan log mode maksimal:

```bash
go run cmd/server/main.go
```

### 2. **Hot Reload** (Optional)

Install AIR untuk auto-reload saat ada perubahan:

```bash
go install github.com/cosmtrek/air@latest
```

Jalankan dengan:

```bash
air
```

### 3. **Format Code**

Sebelum commit, format code:

```bash
go fmt ./...
```

### 4. **Run Tests** (jika ada)

```bash
go test ./...
```

---

## Selanjutnya

Setelah backend berjalan:

1. **Testing API** dengan Postman menggunakan collection yang disediakan
2. **Setup Frontend** dan point ke `http://localhost:8080/api`
3. **Integrate Auth** - Gunakan JWT token dari login endpoint
4. **Monitor Logs** - Perhatikan console untuk error atau warning

---

## Kontak & Support

Jika ada pertanyaan atau issue:

1. Cek error message di console backend
2. Lihat file `API_CONTRACT_SI_BVET_TEMP.md` untuk dokumentasi API detail
3. Hubungi backend developer

---

**Last Updated**: 2026-04-02  
**Backend Version**: 1.0.0  
**Go Version**: 1.24.0
