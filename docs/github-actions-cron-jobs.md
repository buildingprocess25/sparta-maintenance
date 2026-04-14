# GitHub Actions Cron Jobs Setup

## Overview

SPARTA Maintenance menggunakan GitHub Actions untuk menjalankan scheduled jobs:

- **Daily Backup** (`backup-db.yml`): Database backup ke Google Drive
- **Cleanup Pending Reports** (`cleanup-pending-reports.yml`): Hapus draft reports lama dari Neon + UploadThing

Kedua workflow ini berjalan secara **independen dari Render** — mereka connect langsung ke database Neon menggunakan credentials yang disimpan di GitHub Secrets.

---

## Workflow Details

### 1. Daily Database Backup

**File:** `.github/workflows/backup-db.yml`

**Schedule:** Setiap hari pukul 12:00 AM UTC

**Apa yang dilakukan:**

1. Install PostgreSQL 17 client & `pg_dump`
2. Backup database ke SQL file (compress)
3. Upload backup ke Google Drive folder (`BACKUP_DRIVE_FOLDER_ID`)
4. Simpan 7 hari di GitHub Artifacts

**Required Secrets:**

```
DATABASE_URL              # PostgreSQL connection (pooled OK)
GOOGLE_CLIENT_ID          # OAuth credentials
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN      # Refresh token untuk Google Drive API
BACKUP_DRIVE_FOLDER_ID    # Folder ID di Google Drive untuk backup
```

**Manual Trigger:**

```
GitHub repo → Actions → "Daily Database Backup" → Run workflow
```

---

### 2. Cleanup Pending Reports

**File:** `.github/workflows/cleanup-pending-reports.yml`

**Schedule:** Setiap hari pukul 1:00 AM UTC (1 jam setelah backup)

**Apa yang dilakukan:**

1. Query Report dengan status `PENDING_ESTIMATION` yang lebih tua dari 14 hari (default)
2. Delete semua UploadThing files (photo dari `uploadthingFileKeys`)
3. Delete ActivityLog & ApprovalLog terkait report
4. Delete Report record dari Neon

**Required Secrets:**

```
DATABASE_URL              # PostgreSQL connection (pooled OK)
DIRECT_URL                # Non-pooled connection untuk Prisma CLI
UPLOADTHING_TOKEN         # API token untuk delete files via UTApi
```

**Manual Trigger:**

```
GitHub repo → Actions → "Cleanup Pending Reports" → Run workflow
```

**Tuning:**
Di Render environment variables atau GitHub secrets, set:

```
CLEANUP_PENDING_EXPIRY_DAYS=14    # Default: 14 hari
```

---

## GitHub Secrets Configuration

Masuk ke GitHub repo → **Settings → Secrets and variables → Actions**, tambahkan secrets di bawah:

### Production Secrets (Render)

| Secret Name              | Value                                  | Notes                                                      |
| :----------------------- | :------------------------------------- | :--------------------------------------------------------- |
| `DATABASE_URL`           | `postgres://user:pass@...`             | Pooled connection dari Neon (untuk runtime)                |
| `DIRECT_URL`             | `postgres://user:pass@...`             | Non-pooled connection dari Neon (untuk Prisma CLI/scripts) |
| `GOOGLE_CLIENT_ID`       | OAuth ID dari Google Cloud Console     | Sama untuk backup & email                                  |
| `GOOGLE_CLIENT_SECRET`   | OAuth secret dari Google Cloud Console | -                                                          |
| `GOOGLE_REFRESH_TOKEN`   | Refresh token dari generate script     | Generate: `npm run generate-google-refresh-token`          |
| `BACKUP_DRIVE_FOLDER_ID` | Google Drive folder ID (backup target) | Format: `1ABC...` (lihat URL drive)                        |
| `UPLOADTHING_TOKEN`      | API token dari UploadThing dashboard   | Untuk cleanup jobs                                         |

### Getting `DIRECT_URL` from Neon

1. Login ke Neon console (neon.tech)
2. Database → Connection string
3. Toggle "Pooled connection" OFF
4. Copy connection string → ini adalah `DIRECT_URL`

### Getting Google Refresh Token

```bash
npm run generate-google-refresh-token
```

Script ini akan:

1. Open Google OAuth consent screen di browser
2. Anda approve akses
3. Script save refresh token ke `.env.local`
4. Copy token ke GitHub Secrets

---

## Monitoring & Troubleshooting

### View Workflow Runs

**GitHub UI:**

```
Repo → Actions → Select workflow → Past runs
```

### View Logs

Klik run yang ingin di-inspect, lihat step output:

- "Install dependencies" → npm install issues
- "Run backup/cleanup" → Job logic errors
- "Upload artifact" → Upload issues

### Common Issues

#### ❌ "pg_dump: command not found"

- PostgreSQL client belum ter-install di runner
- Backup workflow sudah install PostgreSQL 17 → check setup-node step

#### ❌ "DIRECT_URL is not configured"

- Cleanup workflow: DIRECT_URL secret belum di-set di GitHub
- Solution: GitHub Secrets → tambah `DIRECT_URL`

#### ❌ "Unauthorized" (cleanup job)

- UPLOADTHING_TOKEN invalid atau belum di-set
- Solution: Copy dari UploadThing dashboard → GitHub Secrets

#### ❌ "Connection timeout to Neon"

- Neon IP whitelist: Jika repo di-host di GitHub (free tier), IP runner bisa berubah
- Solution: Di Neon console, allow all IPs atau gunakan Neon IP whitelist yang flexible

#### ❌ "Post-checkout: GitHub Actions timeout"

- GitHub Actions runner sedang overload
- GitHub automatically retry jika timeout (bisanya 6 jam kemudian)

---

## Render Environment Variables

Di **Render Dashboard → Services → sparta-maintenance → Environment**:

```
CRON_SECRET              = <generate random string>  (untuk manual HTTP trigger)
CLEANUP_PENDING_EXPIRY_DAYS = 14                     (days before delete)
UPLOADTHING_TOKEN        = <copy dari UploadThing>   (untuk endpoint handler)
```

Ini memungkinkan:

1. GitHub Actions cleanup script berjalan scheduled
2. Render endpoint `/api/cron/cleanup-pending-reports` tersedia untuk manual trigger via `curl` jika perlu

---

## Manual Trigger via Curl (Optional)

Jika ingin manual trigger cleanup dari terminal (e.g., debug):

```bash
curl -X GET https://sparta-maintenance.onrender.com/api/cron/cleanup-pending-reports \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response:

```json
{
    "ok": true,
    "cutoffDate": "2026-04-01T00:00:00.000Z",
    "reportsFound": 5,
    "reportsDeleted": 5,
    "photosDeleted": 23,
    "failedReports": []
}
```

---

## Local Testing

### Test Database Backup Locally

```bash
npm run backup-db
# Hasil: backups/database-YYYY-MM-DD.sql.gz
```

### Test Cleanup Locally

```bash
npm run cleanup-pending-reports
# Hasil: console output dengan summary
```

Kedua command ini memerlukan `.env.local` dengan:

```
DATABASE_URL=...
DIRECT_URL=...
GOOGLE_REFRESH_TOKEN=...  (untuk backup)
UPLOADTHING_TOKEN=...     (untuk cleanup)
```

---

## Summary

| Component            | Schedule  | Trigger             | Secrets                                                        | Notes                                     |
| :------------------- | :-------- | :------------------ | :------------------------------------------------------------- | :---------------------------------------- |
| **Backup Job**       | 12 AM UTC | GitHub Actions      | DATABASE_URL, DIRECT_URL, Google OAuth, BACKUP_DRIVE_FOLDER_ID | Upload to Drive, keep 7 days in Artifacts |
| **Cleanup Job**      | 1 AM UTC  | GitHub Actions      | DATABASE_URL, DIRECT_URL, UPLOADTHING_TOKEN                    | Delete pending reports >14d old           |
| **Cleanup Endpoint** | Manual    | HTTP + Bearer token | CRON_SECRET, UPLOADTHING_TOKEN                                 | Optional manual trigger from Render       |

Semuanya fully automated dan independent dari Render infrastructure.
