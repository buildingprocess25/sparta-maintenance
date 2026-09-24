# Panduan Setup SPARTA Maintenance

SPARTA Maintenance adalah aplikasi internal (berbasis Next.js 16 App Router) untuk pelaporan maintenance toko, approval berjenjang, checklist preventif, realisasi biaya, arsip PDF, PJUM, dan notifikasi proses bisnis.

---

## Langkah 1: Persiapan (Prerequisites)
Pastikan sistem operasi kamu sudah terinstal perlengkapan berikut:
- **Node.js** (rekomendasi versi terbaru / LTS)
- **NPM** (terbawa saat install Node.js)
- **PostgreSQL** (harus berjalan di lokal atau kamu bisa gunakan koneksi remote/Docker)

## Langkah 2: Instalasi Dependencies & Git Hooks
Buka terminal/command prompt dan masuk ke root folder `sparta-maintenance`. 
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Setup Git Hooks (Penting untuk standardisasi commit):
   ```bash
   npm run setup:git-hooks
   ```

---

## Langkah 3: Setup Google Cloud Console (OAuth & Drive API)
Aplikasi ini sangat bergantung pada ekosistem Google untuk mengirim email, upload foto, dan CDN dokumen. Kamu harus mengatur Google Cloud Console.

### 3.1. Membuat Project & Kredensial
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project Baru (misal: `Sparta Maintenance Dev`).
3. Pergi ke menu **APIs & Services > Library**.
4. Cari dan klik tombol **Enable** untuk API berikut:
   - **Google Drive API**
   - **Gmail API**
5. Pergi ke menu **APIs & Services > OAuth consent screen**.
   - Pilih **External** (atau Internal jika menggunakan email korporat khusus).
   - Isi nama aplikasi dan email support.
   - Pada bagian **Test users**, tambahkan email Google milikmu yang akan digunakan untuk testing.
6. Pergi ke menu **APIs & Services > Credentials**.
   - Klik **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: Boleh bebas (misal: NextJS Local).
   - **Authorized redirect URIs**: Tambahkan `http://localhost:3001` dan `https://developers.google.com/oauthplayground`.
   - Klik **Create**. Kamu akan mendapatkan **Client ID** dan **Client Secret**. Jangan sampai hilang!

---

## Langkah 4: Setup Environment Variables (.env)
Duplikat file `.env.example` menjadi `.env`. Buka file `.env` dan atur nilainya.

### 4.1. Konfigurasi Database & Session
```env
DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/<NAMA_DB>?sslmode=disable"
DIRECT_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/<NAMA_DB>?sslmode=disable"

# Generate dengan text acak panjang (misal: openssl rand -base64 32)
SESSION_SECRET="rahasia-acak-disini"
```

### 4.2. Konfigurasi Web Push Notification (VAPID)
Jalankan perintah ini di terminal untuk membuat sepasang kunci:
```bash
npx web-push generate-vapid-keys
```
Masukkan kunci tersebut ke `.env`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<public_key_hasil_generate>"
VAPID_PRIVATE_KEY="<private_key_hasil_generate>"
VAPID_SUBJECT="mailto:email_kamu@example.com"
```

### 4.3. Konfigurasi Kredensial Google
Masukkan **Client ID** dan **Client Secret** dari Langkah 3 ke dalam `.env`:
```env
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
GMAIL_USER="email-sistem-kamu@gmail.com"
```
*(Catatan: Isikan hal yang sama pada `DRIVE_CDN_CLIENT_ID` dan `DRIVE_CDN_CLIENT_SECRET`)*

---

## Langkah 5: Mengambil Google Refresh Token (Via Script Bawaan)
Alih-alih menggunakan OAuth Playground, project ini menyediakan *script* khusus untuk memudahkan pengambilan *Refresh Token* secara otomatis.

1. Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` sudah terisi di `.env`.
2. Jalankan perintah:
   ```bash
   npm run auth:google
   ```
3. Terminal akan memunculkan sebuah link/URL. Klik/Buka URL tersebut di browser.
4. Login menggunakan email yang sudah didaftarkan di *Test users* (Langkah 3.1).
5. Izinkan akses yang diminta (centang semua).
6. Browser akan diarahkan ke *localhost*, dan terminal-mu otomatis akan menangkap **Refresh Token**.
7. Salin *Refresh Token* tersebut dan masukkan ke file `.env` di bagian `GOOGLE_REFRESH_TOKEN` (serta `DRIVE_CDN_REFRESH_TOKEN`).

### 5.1. Setup Google Drive Folder ID
1. Buka Google Drive di browser.
2. Buat folder baru (misal: `Sparta_Dev_Uploads`).
3. Buka folder tersebut. Lihat URL browser (contoh: `https://drive.google.com/drive/folders/1aBcD...`).
4. Copy string panjang di akhir URL tersebut, masukkan ke `.env`:
   ```env
   GOOGLE_DRIVE_ROOT_FOLDER_ID="1aBcD..."
   BACKUP_DRIVE_FOLDER_ID="1aBcD..."
   DRIVE_CDN_ROOT_FOLDER_ID="1aBcD..."
   ```

### 5.2. Test Koneksi Google Drive
Untuk memastikan kredensial dan folder sudah benar, jalankan script:
```bash
npm run test:gdrive
```
Jika sukses, terminal akan memberi pesan sukses.

---

## Langkah 6: Setup Database (Prisma)
Jika `.env` dan Database sudah siap, inisialisasi tabel:

1. **Generate Prisma Client** (menghasilkan type dari schema):
   ```bash
   npm run db:generate
   ```
   
2. **Sinkronisasi Schema Database** (membuat struktur tabel):
   ```bash
   npx prisma db push
   ```

3. **Memasukkan Data Awal (Seeding)**:
   ```bash
   npm run db:seed
   ```

---

## Langkah 7: Menjalankan Aplikasi
Semua setup sudah selesai. Jalankan mode *development*:
```bash
npm run dev
```
Aplikasi akan berjalan di port **3001**. Buka browser ke alamat: `http://localhost:3001`.

---

## Daftar Script Utilitas Bawaan (`package.json`)
Beberapa perintah tambahan yang bisa dijalankan untuk mempermudah:
- `npm run setup:git-hooks` = Mengaktifkan *pre-commit hook* agar setiap commit tervalidasi.
- `npm run auth:google` = Meng-generate Google Refresh Token dengan cepat via terminal.
- `npm run test:gdrive` = Memvalidasi koneksi ke Google Drive API.
- `npm run db:studio` = Membuka antarmuka UI di browser untuk melihat, mengedit, atau menghapus record di dalam database secara langsung.
- `npm run create-user` = Membuat user dummy secara manual.
- `npm run sync:stores` = Mensinkronisasikan data master toko (Store) dari Google Sheet ke DB.
