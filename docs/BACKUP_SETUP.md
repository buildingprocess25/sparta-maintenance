# Automated Database Backup Setup

Sistem backup otomatis untuk database Supabase ke Google Drive setiap hari 12 AM UTC.

## ✅ Apa yang sudah ada

- ✅ Script backup (`scripts/backup-db.ts`)
- ✅ GitHub Actions workflow (`.github/workflows/backup-db.yml`)
- ✅ npm script: `npm run backup:db`

## 📋 Setup Checklist

### 1. Dapatkan Google Drive Folder ID

Folder ID adalah ID unik dari folder Google Drive tempat backup akan disimpan.

**Cara mendapatkan:**

1. Buka [Google Drive](https://drive.google.com)
2. Buat folder baru: **"SPARTA DB Backups"** (atau nama apapun)
3. Buka folder tersebut
4. URL akan terlihat seperti: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
5. Salin `FOLDER_ID_HERE` (string panjang setelah `/folders/`)

### 2. Set GitHub Secrets

Repository > Settings > Secrets and variables > Actions > New repository secret

Tambahkan 5 secrets:

| Secret Name              | Value                      | Sumber                                                     |
| ------------------------ | -------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`           | Connection string Supabase | Supabase Console → Settings → Database → Connection string |
| `GOOGLE_CLIENT_ID`       | Credentials OAuth          | `.env.local` (dari Gmail/Drive setup)                      |
| `GOOGLE_CLIENT_SECRET`   | Credentials OAuth          | `.env.local`                                               |
| `GOOGLE_REFRESH_TOKEN`   | Token refresh              | `.env.local`                                               |
| `BACKUP_DRIVE_FOLDER_ID` | Folder ID                  | Dari step 1 di atas                                        |

**Catatan:** Jika belum punya `GOOGLE_REFRESH_TOKEN`, jalankan:

```bash
npm run auth:google
```

### 3. Test Backup Manual

Setelah semua secrets set:

```bash
npm run backup:db
```

**Output diharapkan:**

```
📦 Starting database backup...
   Destination: /path/to/backups/sparta-db-2026-03-26T12-30-45.sql
✅ Database backup completed: 2500 KB
📤 Uploading to Google Drive...
✅ Uploaded to Drive: 1abc2def3ghi...
```

File `.sql` juga tersimpan di folder `backups/` lokal.

### 4. Verifikasi Scheduled Backup

1. Buka repository > **Actions** tab
2. Cari workflow: **"Daily Database Backup"**
3. Status akan menunjukkan:
    - ✅ Scheduled untuk 12 AM UTC daily
    - 🟢 Green = success
    - 🔴 Red = failed (cek logs)

**Untuk test sekarang tanpa tunggu 12 AM:**

- Klik workflow → **Run workflow** → Button biru

## 📊 Monitoring

### Cek Status Backup

1. Repository → Actions → Daily Database Backup
2. Lihat run history dengan timestamp

### Verifikasi di Google Drive

1. Buka folder "SPARTA DB Backups" di Drive
2. File baru akan muncul dengan nama format: `sparta-db-2026-03-26T12-30-45.sql`
3. Size file sekitar 2-5 MB (bergantung data)

### Di Komputer Lokal

Backup juga disimpan di folder `backups/`:

```bash
ls -lh backups/
```

## 🗑️ Cleanup Otomatis

- Local backups: Dihapus otomatis setelah 30 hari
- GitHub Artifacts: Dihapus otomatis setelah 7 hari
- Google Drive: Otomatis menyimpan **10 backup terbaru** (backup terlama akan dihapus)

## 🆘 Troubleshooting

### "Command not found: pg_dump"

- GitHub Actions workflow sudah install via `apt-get`
- Jika manual lokal: install PostgreSQL client

    ```bash
    # macOS
    brew install postgresql

    # Ubuntu/Debian
    sudo apt-get install postgresql-client
    ```

### "Missing env var: GOOGLE_CLIENT_ID"

- Set secrets di GitHub Actions (bukan `.env.local`)
- `.env.local` hanya untuk manual testing

### "BACKUP_DRIVE_FOLDER_ID not set"

- Optional — backup tetap berjalan ke local storage
- Untuk Drive upload, set secret dengan Folder ID

### Backup file kosong atau sangat kecil

- Database mungkin kosong (setelah reset)
- Atau CONNECTION_URL tidak valid
- Cek Supabase dashboard apakah ada data

## 🔒 Security Notes

- `GOOGLE_REFRESH_TOKEN` & `DATABASE_URL` tersimpan di GitHub Secrets (encrypted)
- Tidak di-log atau expose di output
- Backup files bersifat public di Drive (share settings default)
- Pertimbangkan restrict access ke Drive folder jika sensitive

## 📅 Jadwal Backup

**Default:** Setiap hari 12:00 AM UTC

**Untuk ubah waktu:**

- Edit `.github/workflows/backup-db.yml`
- Ubah baris cron: `- cron: "0 12 * * *"`
- Format: `minute hour day month day-of-week`
- Contoh: `"0 2 * * *"` = 2 AM UTC daily

[Cron scheduler reference](https://crontab.guru)

## 💡 Tips

1. **Restore dari backup:**

    ```bash
    psql $DATABASE_URL < backups/sparta-db-2026-03-26T12-30-45.sql
    ```

2. **Download batch dari Drive:**
    - Pilih file → Download (.zip)
    - Backup lokal juga bisa di-commit ke private repo

3. **Upgrade ke Pro Supabase:**
    - Pro tier ($25/bulan): Auto-backup included
    - Bisa disable GitHub Actions workflow jika upgrade

---

**Last updated:** March 26, 2026
**Status:** ✅ Ready to deploy
