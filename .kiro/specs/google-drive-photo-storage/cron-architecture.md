# Arsitektur Cron Job - Cleanup Approved Photos

## Perubahan Arsitektur

### ❌ Arsitektur Lama (Sebelum Perubahan)
```
GitHub Actions (Scheduler)
    ↓ HTTP Request
Server API Route (/api/cron/cleanup-approved-photos)
    ↓ Function Call
Job Wrapper (lib/jobs/cleanup-approved-photos.ts)
    ↓ Function Call
Cleanup Script (scripts/cleanup-approved-pjum-photos.ts)
    ↓ Database & Drive API Calls
Database + Google Drive + UploadThing
```

**Masalah:**
- Server harus menangani HTTP request dari GitHub Actions
- Server harus menjalankan proses cleanup yang berat (CPU, memory, network)
- Timeout risk jika cleanup memakan waktu lama
- Server resource terpakai untuk proses yang bisa dilakukan di tempat lain

---

### ✅ Arsitektur Baru (Setelah Perubahan)
```
GitHub Actions (Scheduler + Executor)
    ↓ Direct Script Execution
Cleanup Script (scripts/cleanup-approved-pjum-photos.ts)
    ↓ Database & Drive API Calls
Database + Google Drive + UploadThing
```

**Keuntungan:**
- ✅ **Zero server load** - Semua proses cleanup dijalankan di GitHub runner
- ✅ **No timeout risk** - GitHub Actions timeout 30 menit (lebih dari cukup)
- ✅ **Better logging** - Log langsung di GitHub Actions UI
- ✅ **Simpler architecture** - Tidak perlu API route dan job wrapper
- ✅ **Cost efficient** - GitHub Actions free tier: 2000 menit/bulan untuk private repo

---

## Implementasi Detail

### 1. GitHub Actions Workflow
**File:** `.github/workflows/cleanup-approved-photos.yml`

**Jadwal:** Setiap hari jam 2:00 AM UTC

**Steps:**
1. Checkout code dari repository
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Jalankan script cleanup dengan environment variables:
   - `DATABASE_URL` - Koneksi ke database
   - `DIRECT_URL` - Direct connection untuk Prisma
   - `UPLOADTHING_TOKEN` - Token untuk hapus file UploadThing
   - `DRIVE_CDN_CLIENT_ID` - Google OAuth client ID
   - `DRIVE_CDN_CLIENT_SECRET` - Google OAuth client secret
   - `DRIVE_CDN_REFRESH_TOKEN` - Google OAuth refresh token
   - `DRIVE_CDN_ROOT_FOLDER_ID` - Root folder ID di Google Drive

**Command:**
```bash
npx tsx scripts/cleanup-approved-pjum-photos.ts --execute
```

---

### 2. Cleanup Script
**File:** `scripts/cleanup-approved-pjum-photos.ts`

**Fungsi:**
- Query eligible reports (COMPLETED + in APPROVED PJUM)
- Delete Drive CDN files
- Delete UploadThing files (legacy)
- Clear file IDs from database
- Generate summary report

**Flags:**
- `--execute` - Jalankan cleanup (default: dry-run)
- `--dry-run` - Simulasi tanpa delete/update

**Output:**
- Console log (ditampilkan di GitHub Actions)
- File `cleanup-output.txt` (summary detail)

---

## File yang Dihapus

### ❌ `app/api/cron/cleanup-approved-photos/route.ts`
**Alasan:** Tidak diperlukan karena GitHub Actions langsung menjalankan script

**Sebelumnya:**
- Menerima HTTP GET request dari GitHub Actions
- Validasi Bearer token
- Panggil job wrapper
- Return JSON response

### ❌ `lib/jobs/cleanup-approved-photos.ts`
**Alasan:** Duplikasi logic dengan script, tidak diperlukan wrapper

**Sebelumnya:**
- Wrapper function untuk dipanggil dari API route
- Duplikasi logic dari script cleanup

---

## Perbandingan Resource Usage

### Scenario: Cleanup 100 reports dengan 500 foto total

#### Arsitektur Lama (Server-based)
| Resource | Usage |
|----------|-------|
| Server CPU | ~2-5 menit full load |
| Server Memory | ~200-500 MB |
| Server Network | Download + Upload semua foto |
| GitHub Actions | ~10 detik (hanya HTTP call) |
| **Total Cost** | Server resource + GitHub Actions |

#### Arsitektur Baru (GitHub Actions-based)
| Resource | Usage |
|----------|-------|
| Server CPU | 0% (tidak terpakai) |
| Server Memory | 0 MB (tidak terpakai) |
| Server Network | 0 (tidak terpakai) |
| GitHub Actions | ~2-5 menit |
| **Total Cost** | GitHub Actions only (FREE) |

---

## Monitoring & Debugging

### Cara Melihat Log Cleanup
1. Buka GitHub repository
2. Klik tab "Actions"
3. Pilih workflow "Cleanup Approved PJUM Photos"
4. Klik run terakhir
5. Lihat log detail di step "Run cleanup approved photos script"

### Cara Manual Trigger
1. Buka GitHub repository
2. Klik tab "Actions"
3. Pilih workflow "Cleanup Approved PJUM Photos"
4. Klik "Run workflow"
5. Pilih branch (biasanya `main`)
6. Klik "Run workflow"

### Cara Test Dry-Run Lokal
```bash
# Set environment variables
export DATABASE_URL="..."
export DIRECT_URL="..."
export UPLOADTHING_TOKEN="..."
export DRIVE_CDN_CLIENT_ID="..."
export DRIVE_CDN_CLIENT_SECRET="..."
export DRIVE_CDN_REFRESH_TOKEN="..."
export DRIVE_CDN_ROOT_FOLDER_ID="..."

# Run dry-run (default)
npx tsx scripts/cleanup-approved-pjum-photos.ts

# Run execute
npx tsx scripts/cleanup-approved-pjum-photos.ts --execute
```

---

## Security Considerations

### Environment Variables di GitHub Secrets
Semua credentials disimpan sebagai GitHub Secrets:
- ✅ Encrypted at rest
- ✅ Tidak terlihat di log
- ✅ Hanya bisa diakses oleh workflow yang authorized
- ✅ Tidak bisa di-export atau di-print

### Script Execution
- ✅ Script hanya bisa dijalankan dari GitHub Actions (scheduled atau manual)
- ✅ Tidak ada public endpoint yang bisa dipanggil dari luar
- ✅ Tidak ada risk CRON_SECRET leak (karena tidak ada API route)

---

## Kesimpulan

Perubahan ini mengoptimalkan arsitektur cron job dengan:
1. **Menghilangkan beban server** - Cleanup dijalankan di GitHub runner
2. **Menyederhanakan kode** - Hapus API route dan job wrapper
3. **Meningkatkan reliability** - Timeout lebih panjang, logging lebih baik
4. **Menghemat cost** - GitHub Actions free tier sudah cukup

**Trade-off:** Tidak ada (pure improvement) ✅
