# Plan: Logging System untuk SPARTA Maintenance

> Status: **PENDING** — belum diimplementasi
> Created: 2026-02-16

## Tujuan

Menyediakan sistem logging untuk kebutuhan maintenance dan debugging saat project di-hosting di Vercel. Menggunakan kombinasi **Vercel Built-in Logs** (Opsi 1) dan **Custom Admin Log Page** (Opsi 2).

---

## Opsi 1: Vercel Built-in Logs (Zero Setup)

Sudah tersedia otomatis setelah deploy ke Vercel.

- **Akses:** `vercel.com/[team]/sparta-maintenance` → tab **Logs**
- **Capture:** `console.log`, `console.error` dari Server Components, Server Actions, proxy.ts
- **Retensi:** Free = 1 jam, Pro = 3 hari
- **Action item:** Tidak ada — sudah langsung jalan saat deploy

---

## Opsi 2: Custom `/admin/logs` Page

### Task List

#### Task 1: Schema — Model `AppLog`

**File:** `prisma/schema.prisma`

```prisma
model AppLog {
  id        String   @id @default(cuid())
  level     String   // "info" | "warn" | "error"
  message   String
  context   String?  // nama fungsi/module (e.g. "loginAction", "requireAuth")
  metadata  Json?    // data tambahan (userId, reportId, error stack, dll)
  createdAt DateTime @default(now())

  @@index([level])
  @@index([createdAt])
  @@index([context])
}
```

Jalankan `npx prisma migrate dev --name add_app_log` setelah menambahkan model.

---

#### Task 2: Logger Utility

**File:** `lib/logger.ts`

Buat utility wrapper:

```ts
import prisma from "./prisma";

type LogLevel = "info" | "warn" | "error";

interface LogOptions {
    context?: string; // nama fungsi/module
    metadata?: Record<string, unknown>; // data tambahan
}

async function log(level: LogLevel, message: string, options?: LogOptions) {
    // 1. Tetap console.log (untuk Vercel built-in logs)
    const prefix = `[${level.toUpperCase()}]${options?.context ? ` [${options.context}]` : ""}`;
    if (level === "error") {
        console.error(prefix, message, options?.metadata || "");
    } else if (level === "warn") {
        console.warn(prefix, message, options?.metadata || "");
    } else {
        console.log(prefix, message, options?.metadata || "");
    }

    // 2. Simpan ke DB (fire-and-forget, jangan block request)
    try {
        await prisma.appLog.create({
            data: {
                level,
                message,
                context: options?.context,
                metadata: options?.metadata ?? undefined,
            },
        });
    } catch {
        // Jangan throw — logging failure tidak boleh crash app
        console.error("[LOGGER] Failed to write log to DB");
    }
}

export const logger = {
    info: (msg: string, opts?: LogOptions) => log("info", msg, opts),
    warn: (msg: string, opts?: LogOptions) => log("warn", msg, opts),
    error: (msg: string, opts?: LogOptions) => log("error", msg, opts),
};
```

---

#### Task 3: Ganti `console.log/error` → `logger`

Lokasi yang perlu diupdate:

| File                  | Saat ini                                             | Ganti ke                                                                        |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `app/login/action.ts` | `console.error("Login Error:", error)`               | `logger.error("Login failed", { context: "loginAction", metadata: { email } })` |
| `lib/auth-helper.ts`  | `console.error("Error fetching user:", error)`       | `logger.error("Failed to fetch user", { context: "getCurrentUser" })`           |
| `lib/auth-helper.ts`  | `console.error("Error fetching user stats:", error)` | `logger.error("Failed to fetch stats", { context: "getUserStats" })`            |

Tambahkan juga logger di:

- Approval actions (approve/reject report)
- Create report submission
- Session create/delete

---

#### Task 4: API Route — Fetch Logs

**File:** `app/api/logs/route.ts`

```ts
// GET /api/logs?level=error&limit=50&page=1&search=login
// Response: { logs: AppLog[], total: number, page: number }
```

Fitur:

- Filter by `level` (info/warn/error)
- Filter by `context`
- Search by `message`
- Pagination (default 50 per page)
- Sort by `createdAt` DESC
- **Auth check:** hanya role ADMIN yang bisa akses

---

#### Task 5: Admin Log Page

**File:** `app/admin/logs/page.tsx`

UI terminal-like dengan fitur:

- **Dark background** + monospace font
- **Colored log levels:** 🟢 info (hijau), 🟡 warn (kuning), 🔴 error (merah)
- **Auto-scroll** ke log terbaru
- **Toolbar:** filter level, search, date range, refresh button
- **Auto-refresh** setiap 10 detik (toggle on/off)
- **Click to expand** — lihat metadata/stack trace
- Pagination (load more)

Layout:

```
┌─────────────────────────────────────────────┐
│ Header: "System Logs"          [Back to Dashboard] │
├─────────────────────────────────────────────┤
│ [Filter: All ▾] [Search...        ] [Refresh ↻] │
├─────────────────────────────────────────────┤
│ 09:08:52 ERROR [loginAction] Login failed    │
│ 09:07:30 INFO  [requireAuth] User authenticated │
│ 09:05:12 WARN  [getUserStats] Slow query 2.3s   │
│ ...                                         │
└─────────────────────────────────────────────┘
```

---

#### Task 6: Log Cleanup (Opsional)

Opsi untuk membersihkan log lama:

- **Manual:** Tombol "Clear Logs" di admin page (hapus > 30 hari)
- **Auto:** Vercel CRON `/api/cron/cleanup-logs` yang jalan harian

---

### Urutan Implementasi

1. Task 1: Schema `AppLog` + migrate
2. Task 2: `lib/logger.ts`
3. Task 3: Ganti semua `console.log/error`
4. Task 4: API route `/api/logs`
5. Task 5: Admin page `/admin/logs`
6. Task 6: Cleanup (opsional, bisa nanti)

### Estimasi

- Task 1-3: ~15 menit
- Task 4-5: ~30 menit
- Task 6: ~10 menit
- **Total: ~1 jam**
