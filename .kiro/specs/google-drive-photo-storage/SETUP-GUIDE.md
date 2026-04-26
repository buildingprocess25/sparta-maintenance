# Setup Guide - Google Drive Photo Storage

## Checklist Persiapan

### ✅ 1. Google Cloud Project Setup

#### A. Buat Google Cloud Project Baru (untuk CDN)
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru (misalnya: "sparta-photo-cdn")
3. Enable Google Drive API:
   - Buka "APIs & Services" > "Library"
   - Cari "Google Drive API"
   - Klik "Enable"

#### B. Buat OAuth 2.0 Credentials
1. Buka "APIs & Services" > "Credentials"
2. Klik "Create Credentials" > "OAuth client ID"
3. Pilih "Desktop app" atau "Web application"
4. Catat:
   - **Client ID** → untuk `DRIVE_CDN_CLIENT_ID`
   - **Client Secret** → untuk `DRIVE_CDN_CLIENT_SECRET`

#### C. Generate Refresh Token
Jalankan script ini untuk mendapatkan refresh token:

```bash
# Install dependencies
npm install googleapis

# Buat file get-refresh-token.js
```

```javascript
// get-refresh-token.js
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Buka URL ini di browser:');
console.log(authUrl);
console.log('\nSetelah authorize, copy code yang muncul dan paste di sini:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Refresh Token:');
    console.log(tokens.refresh_token);
  } catch (error) {
    console.error('Error:', error);
  }
  rl.close();
});
```

```bash
# Jalankan script
node get-refresh-token.js

# Follow instruksi di console
# Catat refresh token yang muncul → untuk DRIVE_CDN_REFRESH_TOKEN
```

#### D. Buat Root Folder di Google Drive
1. Login ke Google Drive dengan akun yang sama (akun CDN kedua)
2. Buat folder baru (misalnya: "sparta-photos")
3. Buka folder tersebut
4. Lihat URL di browser: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
5. Copy `FOLDER_ID_HERE` → untuk `DRIVE_CDN_ROOT_FOLDER_ID`

---

### ✅ 2. Environment Variables

#### A. Local Development (.env.local)
Tambahkan ke file `.env.local`:

```bash
# Google Drive CDN (Akun Kedua)
DRIVE_CDN_CLIENT_ID="your-client-id.apps.googleusercontent.com"
DRIVE_CDN_CLIENT_SECRET="your-client-secret"
DRIVE_CDN_REFRESH_TOKEN="your-refresh-token"
DRIVE_CDN_ROOT_FOLDER_ID="your-folder-id"

# UploadThing (sudah ada, tetap dipertahankan)
UPLOADTHING_TOKEN="your-uploadthing-token"

# Database (sudah ada)
DATABASE_URL="your-database-url"
DIRECT_URL="your-direct-url"
```

#### B. Production Server (Vercel/Railway/etc)
Tambahkan environment variables di dashboard hosting:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `DRIVE_CDN_CLIENT_ID` | `xxx.apps.googleusercontent.com` | From Google Cloud Console |
| `DRIVE_CDN_CLIENT_SECRET` | `GOCSPX-xxx` | From Google Cloud Console |
| `DRIVE_CDN_REFRESH_TOKEN` | `1//xxx` | From get-refresh-token script |
| `DRIVE_CDN_ROOT_FOLDER_ID` | `1abc...xyz` | From Google Drive folder URL |
| `UPLOADTHING_TOKEN` | `sk_live_xxx` | Keep existing value |
| `DATABASE_URL` | `postgresql://...` | Keep existing value |
| `DIRECT_URL` | `postgresql://...` | Keep existing value |

#### C. GitHub Secrets (untuk Cron Job)
Tambahkan secrets di GitHub repository:

1. Buka repository di GitHub
2. Klik "Settings" > "Secrets and variables" > "Actions"
3. Klik "New repository secret"
4. Tambahkan secrets berikut:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `DRIVE_CDN_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Same as production |
| `DRIVE_CDN_CLIENT_SECRET` | `GOCSPX-xxx` | Same as production |
| `DRIVE_CDN_REFRESH_TOKEN` | `1//xxx` | Same as production |
| `DRIVE_CDN_ROOT_FOLDER_ID` | `1abc...xyz` | Same as production |
| `UPLOADTHING_TOKEN` | `sk_live_xxx` | Same as production |
| `DATABASE_URL` | `postgresql://...` | Same as production |
| `DIRECT_URL` | `postgresql://...` | Same as production |

---

### ✅ 3. Database Migration

Jalankan migration untuk menambahkan field `drivePhotoFileIds`:

```bash
# Development
npx prisma db push

# Production (jika menggunakan migrations)
npx prisma migrate deploy
```

**Verifikasi:**
```sql
-- Check field exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Report' 
AND column_name = 'drivePhotoFileIds';

-- Expected result:
-- column_name: drivePhotoFileIds
-- data_type: jsonb
-- column_default: '[]'::jsonb
```

---

### ✅ 4. Testing

#### A. Test Upload Photo (Local)
1. Jalankan development server: `npm run dev`
2. Login sebagai BMS
3. Buat laporan baru
4. Upload foto
5. Check console log untuk melihat upload berhasil
6. Check Google Drive folder untuk melihat foto muncul

#### B. Test Cleanup Script (Local Dry-Run)
```bash
# Set environment variables
export DATABASE_URL="..."
export DIRECT_URL="..."
export UPLOADTHING_TOKEN="..."
export DRIVE_CDN_CLIENT_ID="..."
export DRIVE_CDN_CLIENT_SECRET="..."
export DRIVE_CDN_REFRESH_TOKEN="..."
export DRIVE_CDN_ROOT_FOLDER_ID="..."

# Run dry-run (tidak akan delete apa-apa)
npx tsx scripts/cleanup-approved-pjum-photos.ts

# Check output di cleanup-output.txt
cat cleanup-output.txt
```

#### C. Test GitHub Actions Workflow
1. Buka GitHub repository
2. Klik tab "Actions"
3. Pilih workflow "Cleanup Approved PJUM Photos"
4. Klik "Run workflow" > "Run workflow"
5. Tunggu selesai (sekitar 2-5 menit)
6. Check log untuk memastikan tidak ada error

---

### ✅ 5. Monitoring

#### A. Check Foto Berhasil Upload
```sql
-- Check reports dengan Drive CDN photos
SELECT 
  "reportNumber",
  "drivePhotoFileIds",
  "createdAt"
FROM "Report"
WHERE "drivePhotoFileIds" != '[]'::jsonb
ORDER BY "createdAt" DESC
LIMIT 10;
```

#### B. Check Cleanup History
```bash
# Check GitHub Actions runs
# https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/cleanup-approved-photos.yml

# Check cleanup output (jika run manual)
cat cleanup-output.txt
```

#### C. Check Google Drive Storage Usage
1. Buka [Google Drive Storage](https://drive.google.com/settings/storage)
2. Login dengan akun CDN kedua
3. Lihat storage usage
4. Pastikan tidak melebihi quota (15 GB free tier)

---

## Troubleshooting

### ❌ Error: "DRIVE_CDN_CLIENT_ID is not defined"
**Solusi:** Pastikan environment variable sudah di-set dengan benar

```bash
# Check env vars
echo $DRIVE_CDN_CLIENT_ID
echo $DRIVE_CDN_CLIENT_SECRET
echo $DRIVE_CDN_REFRESH_TOKEN
echo $DRIVE_CDN_ROOT_FOLDER_ID
```

### ❌ Error: "Invalid refresh token"
**Solusi:** Generate refresh token baru menggunakan script `get-refresh-token.js`

### ❌ Error: "Insufficient permissions"
**Solusi:** 
1. Pastikan Google Drive API sudah enabled
2. Pastikan OAuth scope sudah benar: `https://www.googleapis.com/auth/drive.file`
3. Generate refresh token baru

### ❌ Error: "Folder not found"
**Solusi:**
1. Pastikan folder ID benar
2. Pastikan akun yang digunakan untuk OAuth sama dengan akun pemilik folder
3. Pastikan folder tidak dihapus

### ❌ Foto tidak muncul di Google Drive
**Solusi:**
1. Check console log untuk error
2. Check environment variables
3. Check Google Drive API quota (jangan sampai exceed)
4. Check network connection

### ❌ Cleanup job tidak jalan
**Solusi:**
1. Check GitHub Actions enabled di repository settings
2. Check GitHub Secrets sudah di-set dengan benar
3. Check workflow file syntax (YAML)
4. Manual trigger untuk test

---

## Security Checklist

- [ ] ✅ Client Secret tidak di-commit ke Git
- [ ] ✅ Refresh Token tidak di-commit ke Git
- [ ] ✅ Environment variables di-set sebagai secrets (GitHub/Vercel)
- [ ] ✅ Google Drive folder hanya accessible oleh service account
- [ ] ✅ Database credentials tidak exposed
- [ ] ✅ UploadThing token tidak exposed

---

## Rollback Plan

Jika ada masalah dan perlu rollback:

### 1. Disable Upload ke Google Drive
```typescript
// Temporary: Comment out di app/api/photos/upload/route.ts
// const result = await uploadPhotoToDriveCdn(compressedBlob, fileName);
// Fallback ke UploadThing sementara
```

### 2. Disable Cleanup Job
```yaml
# Comment out schedule di .github/workflows/cleanup-approved-photos.yml
# on:
#   schedule:
#     - cron: "0 2 * * *"
```

### 3. Revert Database Changes
```sql
-- Jika perlu hapus field (HATI-HATI!)
-- ALTER TABLE "Report" DROP COLUMN "drivePhotoFileIds";
```

---

## Next Steps

Setelah semua setup selesai:

1. ✅ Test upload foto di development
2. ✅ Test cleanup script dry-run
3. ✅ Deploy ke production
4. ✅ Test upload foto di production
5. ✅ Manual trigger cleanup job di GitHub Actions
6. ✅ Monitor selama 1-2 minggu
7. ✅ Jika stabil, consider disable UploadThing untuk foto baru (optional)

---

## Support

Jika ada pertanyaan atau masalah:
1. Check log di GitHub Actions
2. Check console log di browser (untuk upload)
3. Check server log (untuk API errors)
4. Check database untuk data integrity
