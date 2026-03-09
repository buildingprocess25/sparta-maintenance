# Audit Report — SPARTA Maintenance

> **Tanggal Audit:** 9 Maret 2026  
> **Auditor:** GitHub Copilot (Claude Sonnet 4.6)  
> **Cakupan:** Full codebase audit — keamanan, arsitektur, kualitas kode, dan debt teknis  
> **Versi Aplikasi:** 0.1.0 (Next.js 16, TypeScript 5, Prisma 7, PostgreSQL via Neon, Supabase Storage)

---

## Ringkasan Eksekutif

SPARTA Maintenance adalah aplikasi web internal PT Sumber Alfaria Trijaya untuk pelaporan dan tracking aset maintenance toko. Sistem ini mengimplementasikan alur kerja multi-peran (BMS → BMC → BNM Manager → Admin) dengan 10 status laporan.

Secara umum arsitekturnya cukup solid — autentikasi berbasis JWT dengan cookie HttpOnly, server actions terproteksi dengan CSRF validation, dan otorisasi berbasis peran yang konsisten. Namun ditemukan beberapa celah keamanan serius yang perlu segera ditangani.

**Total temuan: 24 isu**, dikategorikan sebagai:

- 🔴 **Critical (3)** — Celah keamanan langsung yang bisa dieksploitasi
- 🟠 **High (5)** — Kerentanan signifikan atau kerusakan fungsional
- 🟡 **Medium (8)** — Risiko sedang atau degradasi kualitas
- 🟢 **Low (8)** — Masalah kecil, debt teknis, atau best practice violation

---

## CRITICAL

### C-01 — Autentikasi: Password = Nama Cabang (Teks Biasa)

**File:** [app/login/action.ts](app/login/action.ts) — baris 47–55

```ts
const isPasswordValid =
    user.branchNames.length > 0 &&
    user.branchNames.some(
        (branch) =>
            branch.trim().toUpperCase() === password.trim().toUpperCase(),
    );
```

**Masalah:**  
Password pengguna identik dengan nama cabang mereka (misalnya `"HEAD OFFICE"`). Ini berarti:

1. Setiap orang yang mengetahui nama cabang bisa login sebagai semua pengguna di cabang tersebut.
2. Password disimpan tidak ter-hash (perbandingan teks biasa langsung di DB query — nama cabang adalah plaintext di kolom `branchNames[]`).
3. Tidak ada isolasi antar akun BMS satu cabang — semua BMS punya "password" yang sama.

**Rekomendasi:**  
Implementasikan field `password` terpisah di model `User` dengan hashing Argon2id atau Bcrypt (min cost 12). Migrasikan semua pengguna.

---

### C-02 — Middleware Tidak Aktif — Semua Protected Route Terbuka

**File:** [proxy.ts](proxy.ts)

```ts
// FILE INI BUKAN middleware.ts
// Next.js hanya membaca middleware.ts di root — proxy.ts TIDAK dieksekusi!
export default async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] };
```

**Masalah:**  
File middleware berjalan di Next.js harus bernama `middleware.ts` di root project. File saat ini bernama `proxy.ts` sehingga **tidak pernah dieksekusi** oleh Next.js runtime. Ini berarti:

- Semua proteksi route di level middleware (redirect ke `/login` jika tidak terautentikasi) tidak berjalan.
- Halaman `/dashboard`, `/reports`, `/admin` dapat diakses langsung tanpa login.
- Proteksi yang ada hanya di level Server Component (`requireAuth()`) — bukan di edge.

**Bukti:** `next.config.ts` tidak menyebutkan `proxy.ts` sebagai middleware.

**Rekomendasi:**  
Rename `proxy.ts` → `middleware.ts`.

```bash
mv proxy.ts middleware.ts
```

---

### ~~C-03 — API Endpoint PDF Tanpa Autentikasi~~ ✅ Fixed

**File:** [app/api/reports/[reportNumber]/pdf/route.ts](app/api/reports/[reportNumber]/pdf/route.ts)

**Fix:** Ditambahkan pengecekan `getAuthUser()` di awal handler. Jika tidak ada session yang valid, API mengembalikan `401 Unauthorized` sebelum mengakses database.

```ts
const user = await getAuthUser();
if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## HIGH

### H-01 — BNM Manager: Tidak Ada Pemeriksaan Cabang saat Approve Final

**File:** [app/reports/actions/approve-final.ts](app/reports/actions/approve-final.ts)

```ts
export async function approveFinal(reportNumber: string, notes?: string) {
    const user = await requireRole("BNM_MANAGER");
    // ...
    const report = await prisma.report.findUnique({
        where: { reportNumber },
        select: { status: true }, // ← branchName TIDAK diambil, TIDAK dicek
    });
    // Langsung approve tanpa validasi cabang
}
```

**Masalah:**  
BNM Manager hanya dicek role-nya, tetapi tidak dicek apakah laporan tersebut berasal dari cabang yang menjadi tanggung jawabnya. Seorang BNM Manager dari "Cabang Surabaya" bisa meng-approve laporan dari "Cabang Jakarta".

**Rekomendasi:**  
Tambahkan pemeriksaan `branchName`:

```ts
const report = await prisma.report.findUnique({
    where: { reportNumber },
    select: { status: true, branchName: true },
});
if (!user.branchNames.includes(report.branchName)) {
    return { error: "Laporan ini bukan dari cabang Anda" };
}
```

---

### H-02 — Tidak Ada Rate Limiting pada Endpoint Login

**File:** [app/login/action.ts](app/login/action.ts)

**Masalah:**  
Endpoint login tidak memiliki mekanisme rate limiting atau throttling. Dengan password yang sekedar nama cabang (lihat C-01), kurangnya rate limit memperpendek waktu untuk brute force. Sesuai OWASP Top 10 A07, login endpoint harus dibatasi minimal 5 percobaan / 15 menit per IP.

**Rekomendasi:**  
Implementasikan rate limiting menggunakan middleware atau library seperti `@vercel/kv` + `upstash/ratelimit` untuk serverless environment di Vercel.

---

### H-03 — CSRF Validation Tidak Berjalan di Development (Silent Skip)

**File:** [lib/authorization.ts](lib/authorization.ts) — baris 162–185

```ts
if (process.env.NODE_ENV === "development") {
    // ...
    if (!isAllowedOrigin) {
        logger.warn(..., "CSRF validation skipped in development — origin not in allowlist");
    }
    return; // ← SELALU return tanpa throw, bahkan jika origin tidak cocok
}
```

**Masalah:**  
Fungsi `validateCSRF()` di mode development selalu sukses tanpa exception, bahkan ketika origin tidak ada di allowlist. Ini berarti developer tidak bisa mendeteksi bahwa CSRF protection mungkin lalai dikonfigurasi saat deploy ke production. Juga berisiko jika secara tidak sengaja `NODE_ENV` tidak diset dengan benar di staging.

**Rekomendasi:**  
Lempar error (atau setidaknya lakukan strict matching) di development juga, atau tunjukkan warning yang lebih jelas di output.

---

### H-04 — Informasi Error Internal Bocor ke Client

**File:** [lib/server-error.ts](lib/server-error.ts) + [app/reports/actions/submit.ts](app/reports/actions/submit.ts)

```ts
// server-error.ts
export function getErrorDetail(error: unknown): string {
    if (error instanceof Error) {
        return error.message; // ← stack trace message bocor ke response
    }
    ...
}

// submit.ts
return {
    error: "Gagal mengirim laporan",
    detail: getErrorDetail(error), // ← user melihat detail error internal
};
```

**Masalah:**  
`getErrorDetail()` mengembalikan `error.message` yang bisa berisi informasi internal seperti nama tabel DB, stack trace partial, atau pesan error Prisma. Ini dikirim sebagai `detail` dalam response server action yang ditampilkan ke client. Ini adalah **Information Exposure** (OWASP A05).

**Rekomendasi:**  
Di production, return pesan generik. Di development, return detail. Gunakan environment check:

```ts
export function getErrorDetail(error: unknown): string {
    if (process.env.NODE_ENV !== "production") {
        if (error instanceof Error) return error.message;
    }
    return "Terjadi kesalahan teknis. Silakan hubungi administrator.";
}
```

---

### ~~H-05 — `create-user.ts` Script Hilang (Package.json Menunjuk File yang Hilang)~~ ✅ Fixed

**Fix:** Baris `"create-user": "tsx scripts/create-user.ts"` dihapus dari `package.json` untuk menghilangkan script yang mengarah ke file tidak ada. Pembuatan user bisa dilakukan langsung via Prisma Studio (`npm run db:studio`) atau dengan membuat script baru di masa depan.

---

## MEDIUM

### M-01 — Supabase ANON Key Adalah Kunci Publik — Tidak Ada RLS yang Dikonfirmasi

**File:** [lib/supabase.ts](lib/supabase.ts)

```ts
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
_client = createClient(url, key);
```

**Masalah:**  
`NEXT_PUBLIC_SUPABASE_ANON_KEY` di-prefix dengan `NEXT_PUBLIC_` yang berarti key ini **terekspos ke browser**. Supabase anon key dirancang untuk akses publik, tetapi keamanannya bergantung sepenuhnya pada Row Level Security (RLS) yang dikonfigurasi di Supabase dashboard. Tidak ada kode di aplikasi ini yang memverifikasi apakah RLS sudah aktif pada bucket `reports`. Jika RLS tidak aktif, siapapun yang inspeksi source JS bisa mengakses semua foto laporan.

**Rekomendasi:**

1. Verifikasi dan aktifkan RLS pada Supabase Storage bucket `reports`.
2. Untuk operasi write/delete dari server, gunakan `SUPABASE_SERVICE_ROLE_KEY` (server-only, tidak di-publish ke client).
3. Client hanya perlu anon key untuk membaca public URL.

---

### M-02 — Open Redirect Tidak Sepenuhnya Aman untuk Path Berbahaya

**File:** [app/login/action.ts](app/login/action.ts) — baris 81–86

```ts
const safeRedirect =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
```

**Masalah:**  
Validasi ini memblokir `//evil.com` (protocol-relative URL) tetapi masih rentan terhadap beberapa form redirect berbahaya seperti `/\evil.com` di beberapa browser, atau URL yang mengeksploitasi karakter unicode yang dinormalisasi. Juga tidak memvalidasi panjang URL (DoS vector).

**Rekomendasi:**  
Tambahkan allowlist path yang valid atau gunakan URL parsing untuk memastikan redirect hanya ke origin yang sama:

```ts
function isSafeRedirect(url: string): boolean {
    if (!url || !url.startsWith("/") || url.startsWith("//")) return false;
    // Sanitize path-only (no query injection beyond expected params)
    try {
        const parsed = new URL(url, "http://localhost");
        return parsed.origin === "http://localhost";
    } catch {
        return false;
    }
}
```

---

### ~~M-03 — Session Expiry: 1 Jam Sangat Pendek Tanpa Refresh Token~~ ✅ Fixed

**Fix:** `SESSION_EXPIRY_MS` di [lib/session.ts](lib/session.ts) diubah dari 1 jam menjadi **8 jam** — cukup untuk satu shift kerja lapangan penuh. Cookie expiry diupdate otomatis.

```ts
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 jam — cukup untuk satu shift kerja lapangan
```

---

### M-04 — Password di Login Form: Uppercase Hardcoded di Client

**File:** [app/login/login-form.tsx](app/login/login-form.tsx) — baris 44–46

```ts
const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value.toUpperCase());
};
```

**Masalah:**  
Password dikonversi ke uppercase di client side, yang secara implisit mengkonfirmasi kepada siapapun yang inspeksi kode bahwa password adalah case-insensitive string uppercase (nama cabang). Ini memberikan hint untuk serangan.

---

### M-05 — Tidak Ada Validasi Tipe File untuk Upload Foto

**File:** [app/reports/(bms)/create/hooks/use-photo-upload.ts](<app/reports/(bms)/create/hooks/use-photo-upload.ts>)

**Masalah:**  
Proses upload foto menggunakan `imageCompression` tapi tidak memvalidasi ekstensi atau MIME type file sebelum upload ke Supabase. File type hanya diambil dari nama file (`file.name.split(".").pop()`), bukan dari magic bytes. User yang mengubah ekstensi file bisa mengupload file berbahaya. Perlu divalidasi bahwa file yang diupload benar-benar image (JPEG, PNG, WebP, HEIC).

**Rekomendasi:**

```ts
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
];
if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    toast.error("Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.");
    return;
}
```

---

### M-06 — Logging Plan Belum Diimplementasi (Sesuai .docs/plan-logging-system.md)

**File:** [lib/logger.ts](lib/logger.ts) + [.docs/plan-logging-system.md](.docs/plan-logging-system.md)

**Masalah:**  
Logger saat ini hanya menulis ke `console.error/warn/log` — tidak ada persistensi ke database (AppLog model yang direncanakan belum dibuat). Jika terjadi insiden di production:

- Tidak ada cara untuk menelusuri log historis lebih dari periode retensi Vercel (1 jam di Free tier).
- Tidak ada halaman admin untuk memonitor log.
- Status dokumen plan: **PENDING**.

**Rekomendasi:**  
Implementasikan plan dari `.docs/plan-logging-system.md` — minimal Task 1 (schema AppLog) dan Task 2 (logger dengan DB persistence).

---

### ~~M-07 — Duplikasi Kode: `buildItemsJson` dan `buildEstimationsJson` di 3 File~~ ✅ Fixed

**Fix:** Kedua fungsi diekstrak ke [app/reports/actions/report-json-helpers.ts](app/reports/actions/report-json-helpers.ts) dan diimpor di `submit.ts`, `draft.ts`, dan `resubmit.ts`.

---

### ~~M-08 — Admin Menu Mengarah ke Route yang Belum Dibuat~~ ✅ Fixed

**Fix:** Tiga halaman placeholder dibuat dengan proteksi `requireRole("ADMIN")`:

- [app/admin/verification/page.tsx](app/admin/verification/page.tsx)
- [app/admin/archive/page.tsx](app/admin/archive/page.tsx)
- [app/admin/settings/page.tsx](app/admin/settings/page.tsx)

Masing-masing menampilkan pesan "Fitur Segera Hadir" dan menolak akses non-admin.

---

## LOW

### L-01 — ~~`proxy.ts` Menggunakan `export const config` yang Tidak Berdampak~~ ✅ Bukan Issue

Sebagaimana dikonfirmasi pada C-02, `proxy.ts` adalah konvensi Next.js 16 yang benar. `export const config` dengan `matcher` juga valid dan berfungsi.

---

### L-02 — Email Notification Dikomentari Tanpa Timeline Perbaikan ✅ Confirmed Disabled

**File:** [app/reports/actions/submit.ts](app/reports/actions/submit.ts), [app/reports/actions/resubmit.ts](app/reports/actions/resubmit.ts), [lib/email/mailer.ts](lib/email/mailer.ts)

Email benar-benar dinonaktifkan di **dua lapisan**:

1. **Lapisan Action** — import `sendReportNotification` dikomentari di `submit.ts` dan `resubmit.ts` sehingga tidak ada yang memanggil fungsi email.
2. **Lapisan Mailer** — `mailer.ts` memiliki `return;` explicit sebelum logika pengiriman, sehingga bahkan jika import di-uncomment, email tetap tidak terkirim.

Fitur ini aman untuk tetap dinonaktifkan. Aktifkan kembali ketika siap dengan cara: (1) hapus early `return;` di `mailer.ts`, dan (2) uncomment baris import di action files.

---

### L-03 — `console.log/error` Langsung di Komponen Client (Bukan Melalui logger)

**File:** [app/reports/(bms)/create/hooks/use-draft.ts](<app/reports/(bms)/create/hooks/use-draft.ts>), [use-photo-upload.ts](<app/reports/(bms)/create/hooks/use-photo-upload.ts>), [complete-form.tsx](<app/reports/(bms)/complete/complete-form.tsx>)

**Masalah:**  
Error di komponen client menggunakan `console.error()` langsung, bukan melalui mekanisme logging terpusat. Ini konsisten dengan logging plan yang belum diimplementasikan (M-06), tapi merupakan tech debt.

---

### ~~L-04 — `dev-utils.ts` Menggunakan Deprecated `supabase` Export~~ ✅ Fixed

**Fix:** Import diubah dari `import { supabase }` menjadi `import { getSupabaseClient }`. Instance client disimpan ke variabel lokal `supabaseClient` di dalam fungsi untuk menghindari pemanggilan berulang.

```ts
// Sebelum
import { supabase } from "@/lib/supabase";
supabase.storage.from("reports").upload(...);

// Sesudah
import { getSupabaseClient } from "@/lib/supabase";
const supabaseClient = getSupabaseClient();
supabaseClient.storage.from("reports").upload(...);
```

---

### L-05 — Barrel Export `actions.ts` Formatting Tidak Konsisten

**File:** [app/reports/actions.ts](app/reports/actions.ts) — baris 14–16

```ts
export { approveFinal } from "./actions/approve-final";export {  // ← dua statement di satu baris
    getStoresByBranch,
```

**Masalah:**  
Baris export yang tergabung (tidak ada newline) menunjukkan formatting yang di-commit dengan tidak rapi, mengindikasikan kurangnya linter/formatter enforcement di CI.

---

### ~~L-06 — Session Cookie Bernama `bnm_session` — Nama yang Misleading~~ ✅ Fixed

**Fix:** Cookie direname dari `bnm_session` → `app_session` di tiga file:

- [lib/session.ts](lib/session.ts)
- [proxy.ts](proxy.ts)
- [app/api/auth/session/route.ts](app/api/auth/session/route.ts)

> **Catatan:** Pengguna yang sedang login akan di-logout otomatis setelah deploy karena browser masih menyimpan cookie lama dengan nama `bnm_session`.

---

### L-07 — `getAuthUser` Tidak Konsisten: Mengembalikan `null` vs `throw` saat DB Error

**File:** [lib/authorization.ts](lib/authorization.ts) — baris 56–62

```ts
} catch (error) {
    if (isConnectionError(error)) {
        throw new Error("Tidak dapat terhubung ke server...");
    }
    logger.error(...);
    return null; // ← DB error non-koneksi silently return null = user dianggap tidak login
}
```

**Masalah:**  
Error DB yang bukan error koneksi (misalnya query timeout, DB constraint) menyebabkan `getAuthUser()` return `null`, yang membuat pengguna terlihat tidak terautentikasi. Ini bisa menyebabkan "phantom logout" yang sulit di-debug. Lebih baik throw error agar problem terdeteksi.

---

### L-08 — `AppLog` dari Plan Logging Menggunakan `String` untuk Level, Bukan Enum

**File:** [.docs/plan-logging-system.md](.docs/plan-logging-system.md) — schema yang direncanakan

```prisma
model AppLog {
  level String  // "info" | "warn" | "error"
  ...
}
```

**Masalah:**  
Jika dan saat AppLog diimplementasikan, menggunakan `String` untuk level alih-alih Prisma enum akan mengurangi type safety dan memperumit query filtering. Sebaiknya gunakan enum.

**Rekomendasi:**

```prisma
enum LogLevel { INFO WARN ERROR }
model AppLog {
  level LogLevel
  ...
}
```

---

## Ringkasan Temuan

| ID   | Severity        | Judul                                                   | File Terdampak             | Status                   |
| ---- | --------------- | ------------------------------------------------------- | -------------------------- | ------------------------ |
| C-01 | 🔴 Critical     | Password = Nama Cabang (Plaintext)                      | `app/login/action.ts`      | Terbuka                  |
| C-02 | ~~🔴 Critical~~ | ~~Middleware Tidak Aktif~~                              | `proxy.ts`                 | Bukan issue (Next.js 16) |
| C-03 | ~~🔴 Critical~~ | ~~PDF API Tanpa Autentikasi~~                           | `app/api/.../pdf/route.ts` | ✅ Fixed                 |
| H-01 | 🟠 High         | BNM Manager Tidak Cek Cabang saat Approve Final         | `approve-final.ts`         | Terbuka                  |
| H-02 | 🟠 High         | Tidak Ada Rate Limiting pada Login                      | `app/login/action.ts`      | Terbuka                  |
| H-03 | 🟠 High         | CSRF Validation Silent Skip di Development              | `lib/authorization.ts`     | Terbuka                  |
| H-04 | 🟠 High         | Error Internal Bocor ke Client                          | `lib/server-error.ts`      | Terbuka                  |
| H-05 | ~~🟠 High~~     | ~~`create-user.ts` Script Hilang~~                      | `package.json`             | ✅ Fixed                 |
| M-01 | 🟡 Medium       | Supabase RLS Tidak Dikonfirmasi                         | `lib/supabase.ts`          | Terbuka                  |
| M-02 | 🟡 Medium       | Open Redirect Tidak Sepenuhnya Aman                     | `app/login/action.ts`      | Terbuka                  |
| M-03 | ~~🟡 Medium~~   | ~~Session 1 Jam Tanpa Refresh~~                         | `lib/session.ts`           | ✅ Fixed (8 jam)         |
| M-04 | 🟡 Medium       | Uppercase Hint di Login Form                            | `login-form.tsx`           | Terbuka                  |
| M-05 | 🟡 Medium       | Tidak Ada Validasi MIME Type Upload                     | `use-photo-upload.ts`      | Terbuka                  |
| M-06 | 🟡 Medium       | Logging Plan Belum Diimplementasi                       | `lib/logger.ts`            | Terbuka                  |
| M-07 | ~~🟡 Medium~~   | ~~Duplikasi `buildItemsJson` / `buildEstimationsJson`~~ | 3 action files             | ✅ Fixed                 |
| M-08 | ~~🟡 Medium~~   | ~~Admin Menu Mengarah ke Route 404~~                    | `admin-dashboard.tsx`      | ✅ Fixed                 |
| L-01 | ~~🟢 Low~~      | ~~`proxy.ts` Config Tidak Berdampak~~                   | `proxy.ts`                 | Bukan issue              |
| L-02 | ~~🟢 Low~~      | ~~Email Dikomentari Tanpa Timeline~~                    | action files               | ✅ Confirmed disabled    |
| L-03 | 🟢 Low          | `console.error` di Client, Bukan via Logger             | beberapa file client       | Terbuka                  |
| L-04 | ~~🟢 Low~~      | ~~Deprecated `supabase` Export di `dev-utils.ts`~~      | `dev-utils.ts`             | ✅ Fixed                 |
| L-05 | 🟢 Low          | Formatting Tidak Konsisten di `actions.ts`              | `app/reports/actions.ts`   | Terbuka                  |
| L-06 | ~~🟢 Low~~      | ~~Nama Cookie Misleading (`bnm_session`)~~              | `lib/session.ts`           | ✅ Fixed (`app_session`) |
| L-07 | ~~🟢 Low~~      | ~~`getAuthUser` Return `null` pada DB Error~~           | `lib/authorization.ts`     | ✅ Fixed                 |
| L-08 | 🟢 Low          | Rencana AppLog Gunakan `String` Alih-alih Enum          | `plan-logging-system.md`   | Terbuka                  |

---

## Hal yang Sudah Baik (Positive Findings)

Beberapa implementasi patut diapresiasi:

- ✅ **JWT dengan jose** — implementasi JWT signing dengan HS256 menggunakan `jose` library (bukan `jsonwebtoken`), dengan HttpOnly cookie dan SameSite=Lax.
- ✅ **CSRF Protection** — `validateCSRF()` dipanggil di setiap server action, menggunakan origin-host comparison (bukan token) yang tepat untuk Next.js Server Actions.
- ✅ **Prisma Advisory Lock** — `generateReportNumber()` menggunakan `pg_advisory_xact_lock` untuk mencegah race condition pada nomor urut laporan.
- ✅ **Server-only imports** — File query dan auth menggunakan `import "server-only"` untuk mencegah impor ke client components.
- ✅ **Zod validation** — Input server action divalidasi dengan Zod (`draftDataSchema`) sebelum diproses.
- ✅ **Structured logging** — `lib/logger.ts` menggunakan format JSON terstruktur dengan correlationId, operasi, dan stack trace error.
- ✅ **Branch scoping** — Query BMC dan BNM Manager selalu difilter berdasarkan `branchNames` user.
- ✅ **JSONB pattern** — Penggunaan JSONB untuk `items` dan `estimations` menghindari N+1 queries dan over-normalization.
- ✅ **Serverless pool tuning** — `prisma.ts` menggunakan `max: 1` connection pool yang dioptimalkan untuk serverless Vercel.
- ✅ **Photo watermarking** — CameraModal menerapkan watermark timestamp, nama, NIK, dan lokasi toko pada foto yang diambil.
- ✅ **IndexedDB autosave** — Form penyelesaian menggunakan IndexedDB untuk menyimpan draft foto secara lokal, mencegah data loss.

---

## Prioritas Perbaikan

### Segera (Sebelum Go-live)

1. **C-01** — Rancang ulang sistem autentikasi dengan password hash terpisah
2. **H-01** — Tambah branch check di `approveFinal`
3. **H-02** — Implementasi rate limiting pada login
4. **H-04** — Sanitize error response di production

### Dalam Waktu Dekat (Sprint berikutnya)

5. **M-01** — Verifikasi dan dokumentasikan RLS Supabase
6. **M-06** — Implementasi logging plan (AppLog schema + DB persistence)

### Backlog

7. M-02, M-04, M-05, H-03, L-03, L-05, L-08

---

_Dokumen ini dibuat berdasarkan analisis statis kode pada tanggal 9 Maret 2026. Beberapa temuan mungkin memerlukan verifikasi runtime untuk konfirmasi dampak penuh._
