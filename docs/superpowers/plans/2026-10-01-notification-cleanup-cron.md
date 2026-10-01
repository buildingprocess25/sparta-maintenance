# Notification Cleanup Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan cron job harian yang menghapus notifikasi berumur > 7 hari dari tabel `Notification`, plus script one-time cleanup untuk membuang 310K baris lama.

**Architecture:** Ikuti pola cron yang sudah ada (`/api/cron/cleanup-pending-reports`). Logika delete dipisah di `lib/jobs/cleanup-notifications.ts`. Endpoint cron hanya menjadi thin wrapper dengan authorization check. Script one-time cleanup dijalankan manual via `npx tsx`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, TypeScript 5, `tsx` untuk script.

## Global Constraints

- Tidak ada perubahan schema Prisma atau migration database.
- Tidak ada perubahan dispatch logic notifikasi (`lib/notifications/dispatch.ts`).
- Tidak ada perubahan UI notification panel.
- Authorization via `CRON_SECRET` env var — identik dengan cron yang sudah ada.
- Default retention: 7 hari (`NOTIFICATION_RETENTION_DAYS` env var, fallback ke `7`).
- Gunakan `logger` dari `@/lib/logger` untuk semua log (bukan `console.log`).
- Prisma import via `@/lib/prisma` (default import), bukan `new PrismaClient()`.
- File baru harus diawali `import "server-only"` jika hanya dipakai di server.

---

## Task 1: Buat `lib/jobs/cleanup-notifications.ts`

**Files:**
- Create: `lib/jobs/cleanup-notifications.ts`

**Interfaces:**
- Produces:
  - `cleanupOldNotifications(): Promise<CleanupNotificationsResult>`
  - `CleanupNotificationsResult = { deleted: number; threshold: string }`

- [ ] **Step 1: Buat file `lib/jobs/cleanup-notifications.ts`**

```typescript
import "server-only";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_RETENTION_DAYS = 7;

export type CleanupNotificationsResult = {
    deleted: number;
    threshold: string;
};

function getRetentionDays(): number {
    const raw = process.env.NOTIFICATION_RETENTION_DAYS;
    if (!raw) return DEFAULT_RETENTION_DAYS;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
        logger.warn(
            {
                operation: "cleanupOldNotifications",
                notificationRetentionDays: raw,
            },
            "Invalid NOTIFICATION_RETENTION_DAYS, falling back to default",
        );
        return DEFAULT_RETENTION_DAYS;
    }

    return parsed;
}

export async function cleanupOldNotifications(): Promise<CleanupNotificationsResult> {
    const retentionDays = getRetentionDays();
    const threshold = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    logger.info(
        {
            operation: "cleanupOldNotifications",
            threshold: threshold.toISOString(),
            retentionDays,
        },
        "Starting notification cleanup job",
    );

    const result = await prisma.notification.deleteMany({
        where: { createdAt: { lt: threshold } },
    });

    logger.info(
        {
            operation: "cleanupOldNotifications",
            deleted: result.count,
            threshold: threshold.toISOString(),
        },
        "Notification cleanup job completed",
    );

    return {
        deleted: result.count,
        threshold: threshold.toISOString(),
    };
}
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
git add lib/jobs/cleanup-notifications.ts
git commit -m "feat(jobs): add cleanupOldNotifications job"
```

---

## Task 2: Buat `app/api/cron/cleanup-notifications/route.ts`

**Files:**
- Create: `app/api/cron/cleanup-notifications/route.ts`

**Interfaces:**
- Consumes: `cleanupOldNotifications()` dari `@/lib/jobs/cleanup-notifications`
- Produces: GET endpoint `{ ok: true, deleted: N, threshold: "ISO string" }` atau `{ error: string }` dengan status 401/500

- [ ] **Step 1: Buat file `app/api/cron/cleanup-notifications/route.ts`**

Ikuti pola identik dari `app/api/cron/cleanup-pending-reports/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cleanupOldNotifications } from "@/lib/jobs/cleanup-notifications";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const authHeader = request.headers.get("authorization");
    return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
    if (!process.env.CRON_SECRET) {
        logger.error(
            { operation: "cron.cleanupNotifications" },
            "CRON_SECRET is not configured",
        );
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 },
        );
    }

    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await cleanupOldNotifications();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        logger.error(
            { operation: "cron.cleanupNotifications" },
            "Notification cleanup cron job failed",
            error,
        );
        return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 3: Test endpoint secara manual (dev server)**

Jalankan dev server:
```bash
npm run dev
```

Panggil endpoint dengan `CRON_SECRET` yang ada di `.env`:
```bash
curl -H "Authorization: Bearer <isi CRON_SECRET dari .env>" http://localhost:3000/api/cron/cleanup-notifications
```

Expected response (tidak ada data lama di dev, deleted bisa 0):
```json
{ "ok": true, "deleted": 0, "threshold": "2026-09-24T..." }
```

Panggil tanpa auth header:
```bash
curl http://localhost:3000/api/cron/cleanup-notifications
```

Expected:
```json
{ "error": "Unauthorized" }
```
dengan HTTP 401.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/cleanup-notifications/route.ts
git commit -m "feat(cron): add cleanup-notifications cron endpoint"
```

---

## Task 3: Tambah `NOTIFICATION_RETENTION_DAYS` ke `render.yaml`

**Files:**
- Modify: `render.yaml`

**Interfaces:**
- Consumes: env var `NOTIFICATION_RETENTION_DAYS` dibaca oleh `lib/jobs/cleanup-notifications.ts`

- [ ] **Step 1: Edit `render.yaml` — tambah env var setelah baris `CLEANUP_PENDING_EXPIRY_DAYS`**

Temukan blok ini di `render.yaml` (sekitar baris 61-62):
```yaml
          - key: CLEANUP_PENDING_EXPIRY_DAYS
            value: "14"
```

Tambahkan tepat setelah blok tersebut:
```yaml
          - key: CLEANUP_PENDING_EXPIRY_DAYS
            value: "14"
          - key: NOTIFICATION_RETENTION_DAYS
            value: "7"
```

- [ ] **Step 2: Verifikasi YAML valid**

```bash
npx js-yaml render.yaml
```

Jika `js-yaml` tidak tersedia, cukup pastikan indentasi konsisten (2 spasi) dan tidak ada tab.

- [ ] **Step 3: Commit**

```bash
git add render.yaml
git commit -m "chore(config): add NOTIFICATION_RETENTION_DAYS to render.yaml"
```

---

## Task 4: Buat `scripts/one-time-cleanup-notifications.ts`

**Files:**
- Create: `scripts/one-time-cleanup-notifications.ts`

**Interfaces:**
- Standalone script. Tidak diimpor oleh file lain.
- Dijalankan via: `npx tsx scripts/one-time-cleanup-notifications.ts [--confirm]`

- [ ] **Step 1: Buat file `scripts/one-time-cleanup-notifications.ts`**

```typescript
/**
 * One-time cleanup script for old Notification rows.
 *
 * Usage:
 *   npx tsx scripts/one-time-cleanup-notifications.ts           # dry-run
 *   npx tsx scripts/one-time-cleanup-notifications.ts --confirm # execute delete
 */

import prisma from "@/lib/prisma";

const RETENTION_DAYS = parseInt(
    process.env.NOTIFICATION_RETENTION_DAYS ?? "7",
    10,
);

async function main() {
    const isDryRun = !process.argv.includes("--confirm");

    const threshold = new Date(
        Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    console.log("=== Notification Cleanup Script ===");
    console.log(`Retention: ${RETENTION_DAYS} days`);
    console.log(`Threshold: ${threshold.toISOString()}`);
    console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "EXECUTE DELETE"}`);
    console.log("");

    // Count rows that will be deleted
    const count = await prisma.notification.count({
        where: { createdAt: { lt: threshold } },
    });

    console.log(`Rows to delete: ${count}`);

    if (isDryRun) {
        console.log("");
        console.log("Dry run complete. To execute, run:");
        console.log(
            "  npx tsx scripts/one-time-cleanup-notifications.ts --confirm",
        );
        await prisma.$disconnect();
        return;
    }

    console.log("Executing delete...");
    const result = await prisma.notification.deleteMany({
        where: { createdAt: { lt: threshold } },
    });

    console.log(`Deleted: ${result.count} rows`);
    console.log("Done.");

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
});
```

- [ ] **Step 2: Jalankan dry-run untuk verifikasi (tidak ada perubahan data)**

```bash
npx tsx scripts/one-time-cleanup-notifications.ts
```

Expected output (angka bisa berbeda):
```
=== Notification Cleanup Script ===
Retention: 7 days
Threshold: 2026-09-24T...
Mode: DRY RUN (no changes)

Rows to delete: 310904

Dry run complete. To execute, run:
  npx tsx scripts/one-time-cleanup-notifications.ts --confirm
```

- [ ] **Step 3: Commit script**

```bash
git add scripts/one-time-cleanup-notifications.ts
git commit -m "chore(scripts): add one-time notification cleanup script"
```

- [ ] **Step 4: Jalankan dengan `--confirm` untuk initial cleanup**

> **PERHATIAN:** Ini akan menghapus data dari database production/staging. Pastikan `.env` mengarah ke database yang benar.

```bash
npx tsx scripts/one-time-cleanup-notifications.ts --confirm
```

Expected output:
```
=== Notification Cleanup Script ===
Retention: 7 days
Threshold: 2026-09-24T...
Mode: EXECUTE DELETE

Rows to delete: 310904
Executing delete...
Deleted: 310904 rows
Done.
```

- [ ] **Step 5: Verifikasi jumlah baris setelah cleanup via SQL (opsional)**

Jalankan query ini di database client (misal: prisma studio, psql, atau DB tool):
```sql
SELECT COUNT(*) FROM "Notification";
```

Expected: angka jauh lebih kecil dari 310.904 (hanya notifikasi < 7 hari terakhir).

---

## Task 5: Tulis Agent Note & Commit Final

**Files:**
- Create: `docs/agent-notes/2026-10-01-HHMM-notification-cleanup-cron.md`

- [ ] **Step 1: Buat agent note**

Buat file `docs/agent-notes/2026-10-01-<waktu WIB>-notification-cleanup-cron.md` dengan isi:

```markdown
# Notification Cleanup Cron

## Perubahan
- Tambah `lib/jobs/cleanup-notifications.ts` — logika delete notifikasi > 7 hari
- Tambah `app/api/cron/cleanup-notifications/route.ts` — endpoint cron
- Tambah `NOTIFICATION_RETENTION_DAYS=7` ke `render.yaml`
- Tambah `scripts/one-time-cleanup-notifications.ts` — script cleanup 310K baris lama

## Keputusan
- Retention 7 hari: notifikasi > 7 hari sudah tidak actionable (UI hanya tampil 10 terbaru)
- Tidak ada perubahan schema — cukup cron delete biasa
- Ikuti pattern `cleanup-pending-reports` yang sudah ada

## Cara test
- GET /api/cron/cleanup-notifications dengan Bearer CRON_SECRET
- Expected: { ok: true, deleted: N, threshold: ISO string }

## Tindak lanjut
- Jadwalkan cron di Render dashboard: schedule "0 1 * * *", URL /api/cron/cleanup-notifications
```

- [ ] **Step 2: Final build check**

```bash
npm run build
```

Expected: build sukses tanpa error baru.

- [ ] **Step 3: Commit akhir**

```bash
git add docs/agent-notes/
git commit -m "docs: add agent note for notification cleanup cron"
```

---

## Checklist Deployment

Setelah semua task selesai dan di-push:

- [ ] Deploy ke production (Render auto-deploy dari main/production branch)
- [ ] Jadwalkan cron di Render dashboard:
  - URL: `/api/cron/cleanup-notifications`
  - Schedule: `0 1 * * *` (harian 01:00 UTC = 08:00 WIB)
  - Authorization: set header `Authorization: Bearer <CRON_SECRET>`
- [ ] Verifikasi cron pertama berjalan keesokan harinya lewat Render logs
