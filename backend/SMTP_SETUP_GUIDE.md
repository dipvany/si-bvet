# Panduan Konfigurasi SMTP untuk Notifikasi Email SI-BVET

## Pilihan 1: Gmail (Recommended untuk Development)

### Step 1: Aktifkan 2-Step Verification di Google Account
1. Buka https://myaccount.google.com/
2. Klik "Security" di menu kiri
3. Scroll ke bagian "How you sign in to Google"
4. Aktifkan "2-Step Verification" (jika belum aktif)

### Step 2: Buat App Password
1. Kembali ke Google Account > Security
2. Scroll ke "How you sign in to Google" 
3. Klik "App passwords" (muncul setelah 2-Step aktif)
4. Pilih:
   - App: Custom (type "SI-BVET")
   - Device: Windows Computer
5. Google akan generate password 16 karakter. **Catat password ini.**

### Step 3: Update .env
```bash
# Buka file .env (atau copy dari .env.example jika belum ada)
# Edit bagian SMTP:

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_gmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM=your_gmail@gmail.com
APP_LOGIN_URL=http://localhost:3000/login
```

**Catatan:** 
- Password mungkin ada space, copy sesuai yang diberikan Google
- Gunakan full email Gmail Anda

---

## Pilihan 2: Mailtrap (Free untuk Testing)

### Step 1: Daftar Akun
1. Buka https://mailtrap.io/
2. Sign up dengan email Anda
3. Verify email

### Step 2: Buat Project
1. Di dashboard, klik "Create Project"
2. Beri nama "SI-BVET"
3. Klik project yang baru dibuat

### Step 3: Ambil SMTP Credentials
1. Pilih "SMTP" tab
2. Dropdown "Integrations" pilih "Go"
3. Akan terlihat:
   ```
   Host: live.smtp.mailtrap.io
   Port: 587
   Username: api
   Password: [16 char key]
   ```

### Step 4: Update .env
```bash
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USERNAME=api
SMTP_PASSWORD=xxxxxxxxxxxxxxxx
SMTP_FROM=your_email@example.com
APP_LOGIN_URL=http://localhost:3000/login
```

**Keuntungan Mailtrap:**
- Semua email tertangkap di inbox Mailtrap (safe untuk development)
- Bisa lihat header, body, attachment
- Lebih aman karena tidak pakai real email

---

## Pilihan 3: SendGrid (Production-Ready)

### Step 1: Daftar
1. Buka https://sendgrid.com/
2. Sign up (free tier: 100 email/hari)
3. Verify email

### Step 2: Buat API Key
1. Dashboard > Settings > API Keys
2. Klik "Create API Key"
3. Beri nama "SI-BVET"
4. Pilih "Full Access"
5. Copy API Key

### Step 3: Update .env
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxx...
SMTP_FROM=noreply@sibvet.com
APP_LOGIN_URL=http://localhost:3000/login
```

---

## Testing Konfigurasi

### Cara 1: Cek Manual via Go
Jalankan di terminal backend folder:

```bash
# Opsi A: Login dan test email langsung saat registrasi
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -F "fullname=Test User" \
  -F "email=test@example.com" \
  -F "phone=081234567890" \
  -F "password=TestPassword123" \
  -F "registration_doc=@/path/to/doc.pdf"

# Opsi B: Test dengan script Go (jika ingin isolasi)
# Buat file test_email.go:
```

### Cara 2: Test Script Go
Buat file `internal/utils/email_test.go`:

```go
package utils

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
)

func TestSendEmail(t *testing.T) {
	godotenv.Load("../../.env")

	err := SendEmail(
		"your_real_email@gmail.com",
		"[TEST] SI-BVET Email Configuration",
		"Jika Anda menerima email ini, SMTP sudah berhasil dikonfigurasi!\n\nHari ini: April 21, 2026",
	)

	if err != nil {
		t.Fatalf("Failed to send email: %v", err)
	}

	t.Log("Email sent successfully!")
}
```

Jalankan test:
```bash
cd backend
go test ./internal/utils -v -run TestSendEmail
```

---

## Troubleshooting

### Error: "Invalid username/password"
- Pastikan password di .env EXACT sesuai yang diberikan provider
- Untuk Gmail: gunakan App Password, bukan password akun normal
- Check apakah ada space di password, copy-paste dengan teliti

### Error: "Dial tcp: i/o timeout"
- Check SMTP_HOST dan SMTP_PORT sudah benar
- Cek koneksi internet
- Firewall mungkin block port 587, coba port 465 (TLS) atau 25 (unsecure)

### Email tidak terkirim tapi tidak ada error
- SMTP tidak dikonfigurasi penuh, check `echo $SMTP_HOST`
- Cek bahwa .env sudah di-load oleh aplikasi

### Untuk Mailtrap: Email masuk tapi empty/corrupt
- Mungkin charset issue, pastikan header Content-Type: text/plain; charset=UTF-8 sudah benar
- (Sudah implemented di kode, jadi likely tidak masalah)

---

## Rekomendasi untuk Production

| Aspek | Development | Production |
|-------|-------------|------------|
| Provider | Gmail / Mailtrap | SendGrid / AWS SES / Postmark |
| Volume | <100/hari | 1000+/hari |
| Reliability | Testing | SLA 99.9% |
| Cost | Free | $10-100/bulan |

---

## Validasi Sukses

Setelah setup, coba:

1. ✅ Register akun customer baru → cek email "Registrasi Berhasil"
2. ✅ Admin verify user → cek email "Verifikasi Akun Berhasil" + login link
3. ✅ Upload submission → check app notifications in-app
4. ✅ Payment verified → cek email "Pembayaran Berhasil"
5. ✅ LHU uploaded → cek email "LHU Tersedia"

---

## FAQ

**Q: Apakah saya HARUS isi SMTP untuk run aplikasi?**
A: Tidak. Email adalah optional. Jika tidak dikonfigurasi, notifikasi in-app tetap berjalan, tapi email tidak terkirim.

**Q: Saya mau disable email sementara?**
A: Biarkan `SMTP_HOST` atau `SMTP_FROM` kosong di .env. Aplikasi otomatis skip email.

**Q: Bisakah saya ubah template email?**
A: Ya, edit file `internal/services/notification_service.go`, fungsi `SendXxxEmail()`. Template adalah plain text, bisa diganti HTML jika perlu.

**Q: Port 587 vs 465?**
- 587 = SMTP + STARTTLS (mulai unencrypted, upgrade ke encrypted)
- 465 = SMTPS (langsung encrypted)
- Kebanyakan provider support keduanya, 587 lebih compatible

