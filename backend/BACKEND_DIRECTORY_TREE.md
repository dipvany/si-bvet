# Backend Directory Tree - SI-BVET

Berikut struktur folder utama pada backend SI-BVET beserta komentar singkatnya.

```text
backend/
|-- cmd/            # Titik masuk aplikasi dan executable utama
|   `-- server/     # Folder server utama untuk menjalankan backend
|-- internal/       # Modul inti yang hanya dipakai di dalam proyek ini
|   |-- constants/  # Konstanta global seperti role dan status
|   |-- db/         # Konfigurasi dan inisialisasi koneksi database
|   |-- dto/        # Struktur request dan response untuk API
|   |-- handlers/   # Penerima request HTTP dan pengirim response
|   |-- middleware/ # Lapisan autentikasi, otorisasi, dan proses lintas request
|   |-- models/     # Definisi model data aplikasi
|   |-- repositories/ # Akses data dan operasi ke database
|   |-- routes/     # Registrasi endpoint dan pengelompokan route
|   |-- services/   # Logika bisnis utama aplikasi
|   `-- utils/      # Fungsi bantu umum seperti JWT dan helper lain
|-- migrations/     # File migrasi untuk skema database
`-- uploads/        # Penyimpanan file hasil unggahan
```

## Keterangan Folder

- `backend/`: Root aplikasi backend SI-BVET, tempat seluruh source code, migrasi database, dan file pendukung berada.
- `cmd/`: Tempat entry point aplikasi, biasanya dipakai untuk memisahkan executable utama dari package lain.
- `cmd/server/`: Folder untuk menjalankan server utama aplikasi.
- `internal/`: Berisi modul inti aplikasi yang hanya dipakai di dalam proyek ini.
- `internal/constants/`: Menyimpan konstanta global seperti role, status, atau nilai tetap lain.
- `internal/db/`: Berisi konfigurasi dan inisialisasi koneksi database.
- `internal/dto/`: Menyimpan struktur request dan response untuk validasi data API.
- `internal/handlers/`: Layer handler yang menerima request HTTP dan mengembalikan response.
- `internal/middleware/`: Middleware untuk proses lintas request, misalnya autentikasi dan otorisasi.
- `internal/models/`: Definisi model data yang merepresentasikan tabel atau entitas aplikasi.
- `internal/repositories/`: Layer akses data ke database, biasanya untuk query dan operasi CRUD.
- `internal/routes/`: Tempat registrasi endpoint dan pengelompokan route API.
- `internal/services/`: Logic bisnis utama yang menghubungkan handler, repository, dan aturan aplikasi.
- `internal/utils/`: Fungsi bantu yang dipakai lintas modul, seperti JWT atau helper umum.
- `migrations/`: File migrasi database untuk membuat atau memperbarui skema tabel.
- `uploads/`: Folder penyimpanan file yang diunggah melalui aplikasi.

## Catatan Singkat Alur Struktur

Secara umum, alur backend ini mengikuti pola: `routes` -> `handlers` -> `services` -> `repositories` -> `db`.
Struktur seperti ini memudahkan pemisahan tanggung jawab, menjaga kode lebih rapi, dan membuat fitur baru lebih mudah dikembangkan.
