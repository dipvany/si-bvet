# Quick Start - Backend Si-BVet

Panduan cepat untuk memulai backend Si-BVet dalam 5 langkah.

## ⚡ 5 Langkah Quick Start

### 1️⃣ Prerequisites

```bash
# Verifikasi Go terinstall
go version    # Minimal Go 1.24.0

# Verifikasi PostgreSQL berjalan
psql --version
```

### 2️⃣ Create Database

Buka PostgreSQL client dan jalankan:

```sql
CREATE DATABASE sibvet_lampung;
```

### 3️⃣ Setup Environment

Copy `.env.example` ke `.env`:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` dengan konfigurasi PostgreSQL Anda (terutama `DB_PASSWORD`)

### 4️⃣ Download Dependencies

```bash
go mod download
go mod tidy
```

### 5️⃣ Run Backend

```bash
go run cmd/server/main.go
```

✅ Server akan berjalan di **http://localhost:8080**

---

## 📚 Dokumen Lengkap

Untuk setup lebih detail, lihat: [SETUP_BACKEND.md](SETUP_BACKEND.md)

## 🔗 API Documentation

Lihat: [API_CONTRACT_SI_BVET_TEMP.md](API_CONTRACT_SI_BVET_TEMP.md)

## 🧪 Test API

Import file Postman: `SI-BVET_TEMP_API_CONTRACT.postman_collection.json`

---

## ❓ Common Issues

| Error                           | Solusi                                       |
| ------------------------------- | -------------------------------------------- |
| "Could not connect to database" | Cek `.env` config dan PostgreSQL running     |
| "Port 8080 already in use"      | Ubah PORT di `.env`                          |
| "No .env file found"            | Copy `.env.example` ke `.env` dan config     |
| Download dependencies error     | Run: `go clean -modcache && go mod download` |

---

**Butuh bantuan?** Lihat troubleshooting section di [SETUP_BACKEND.md](SETUP_BACKEND.md#troubleshooting)
