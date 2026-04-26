# Quick Start - Google Drive Photo Storage

## 🚀 Setup dalam 5 Langkah

### 1️⃣ Google Cloud Setup (10 menit)
```bash
# Buka: https://console.cloud.google.com/
# 1. Buat project baru: "sparta-photo-cdn"
# 2. Enable "Google Drive API"
# 3. Buat OAuth 2.0 Credentials (Desktop app)
# 4. Catat Client ID dan Client Secret
```

### 2️⃣ Generate Refresh Token (5 menit)
```bash
# Install googleapis
npm install googleapis

# Edit file dengan Client ID & Secret
nano scripts/get-drive-refresh-token.js

# Jalankan script
node scripts/get-drive-refresh-token.js

# Follow instruksi, catat Refresh Token
```

### 3️⃣ Buat Folder di Google Drive (2 menit)
```bash
# 1. Login ke drive.google.com (akun CDN)
# 2. Buat folder: "sparta-photos"
# 3. Buka folder, copy ID dari URL:
#    https://drive.google.com/drive/folders/FOLDER_ID_HERE
```

### 4️⃣ Set Environment Variables (5 menit)

#### Local (.env.local)
```bash
DRIVE_CDN_CLIENT_ID="xxx.apps.googleusercontent.com"
DRIVE_CDN_CLIENT_SECRET="GOCSPX-xxx"
DRIVE_CDN_REFRESH_TOKEN="1//xxx"
DRIVE_CDN_ROOT_FOLDER_ID="1abc...xyz"
```

#### Production (Vercel/Railway)
Tambahkan 4 environment variables di atas di dashboard hosting

#### GitHub Secrets
```bash
# Settings > Secrets and variables > Actions > New repository secret
# Tambahkan 7 secrets:
# - DRIVE_CDN_CLIENT_ID
# - DRIVE_CDN_CLIENT_SECRET
# - DRIVE_CDN_REFRESH_TOKEN
# - DRIVE_CDN_ROOT_FOLDER_ID
# - DATABASE_URL
# - DIRECT_URL
# - UPLOADTHING_TOKEN
```

### 5️⃣ Database Migration (2 menit)
```bash
# Development
npx prisma db push

# Production
npx prisma migrate deploy
```

---

## ✅ Testing

### Test Upload (Local)
```bash
npm run dev
# Login sebagai BMS > Buat laporan > Upload foto
# Check Google Drive folder
```

### Test Cleanup (Dry-run)
```bash
npx tsx scripts/cleanup-approved-pjum-photos.ts
# Check cleanup-output.txt
```

### Test GitHub Actions
```bash
# GitHub > Actions > Cleanup Approved PJUM Photos > Run workflow
```

---

## 📋 Environment Variables Checklist

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `DRIVE_CDN_CLIENT_ID` | Google Cloud Console | `123.apps.googleusercontent.com` |
| `DRIVE_CDN_CLIENT_SECRET` | Google Cloud Console | `GOCSPX-abc123` |
| `DRIVE_CDN_REFRESH_TOKEN` | get-drive-refresh-token.js | `1//abc123xyz` |
| `DRIVE_CDN_ROOT_FOLDER_ID` | Google Drive folder URL | `1abc...xyz` |
| `DATABASE_URL` | Existing | `postgresql://...` |
| `DIRECT_URL` | Existing | `postgresql://...` |
| `UPLOADTHING_TOKEN` | Existing | `sk_live_...` |

---

## 🔧 Troubleshooting

### Upload gagal
```bash
# Check env vars
echo $DRIVE_CDN_CLIENT_ID
echo $DRIVE_CDN_CLIENT_SECRET
echo $DRIVE_CDN_REFRESH_TOKEN
echo $DRIVE_CDN_ROOT_FOLDER_ID

# Check Google Drive API enabled
# Check refresh token valid (generate baru jika perlu)
```

### Cleanup job tidak jalan
```bash
# Check GitHub Secrets
# Check workflow file: .github/workflows/cleanup-approved-photos.yml
# Manual trigger di GitHub Actions
```

---

## 📞 Support

- Setup Guide lengkap: `SETUP-GUIDE.md`
- Arsitektur: `cron-architecture.md`
- Backward compatibility: `backward-compatibility-verification.md`
