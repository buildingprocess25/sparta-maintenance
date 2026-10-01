# Spec: Notification Table Cleanup via Cron Job

**Tanggal:** 2026-10-01
**Status:** Approved
**Author:** Rendi Elang (via brainstorming dengan Antigravity)

---

## 1. Latar Belakang

Tabel `Notification` saat ini memiliki **310.904 baris** dan terus bertambah tanpa batas karena tidak ada mekanisme pembersihan data.

### Perbedaan dengan tabel lain

| Tabel | Tujuan | Retensi |
|---|---|---|
| `ActivityLog` | Audit trail bisnis per laporan — dipakai untuk dashboard, analytics, histori | Permanen (selama laporan ada) |
| `ApprovalLog` | Rekam keputusan approval per laporan | Permanen (selama laporan ada) |
| `Notification` | Ephemeral signal ke user — "ada aksi yang menunggu kamu" | **7 hari** (setelah itu tidak relevan) |

`Notification` adalah sinyal sementara, bukan audit trail. API hanya mengambil 10 notifikasi terbaru per user. Notifikasi berumur > 7 hari tidak pernah ditampilkan dan tidak bernilai bisnis.

---

## 2. Tujuan

- Mencegah tabel `Notification` tumbuh tak terbatas.
- Menjaga performa query `count(readAt IS NULL)` dan `findMany` yang berjalan setiap user membuka dashboard.
- Konsisten dengan pola cron yang sudah ada di project.

---

## 3. Cakupan

**In scope:**
- Cron job harian untuk menghapus notifikasi berumur > 7 hari.
- Script one-time cleanup untuk membersihkan 310K baris lama sebelum cron aktif.
- Tambah env var `NOTIFICATION_RETENTION_DAYS` ke render.yaml.

**Out of scope:**
- Perubahan schema Prisma atau migration database.
- Perubahan dispatch logic notifikasi.
- Perubahan UI notification panel.
- Partitioning atau perubahan infrastruktur database.

---

## 4. Desain

### 4.1 Arsitektur

```
Render Cron Scheduler (1x per hari, 01:00 UTC / 08:00 WIB)
  → GET /api/cron/cleanup-notifications
      → Authorization: Bearer CRON_SECRET
      → lib/jobs/cleanup-notifications.ts
          → DELETE FROM "Notification" WHERE "createdAt" < NOW() - INTERVAL '7 days'
      → Response: { ok: true, deleted: N, threshold: ISO string }
```

### 4.2 Retention Policy

- **Retention period:** 7 hari dihitung dari `createdAt`.
- **Configurable via env:** `NOTIFICATION_RETENTION_DAYS` (default: `7`).
- Notifikasi belum dibaca (readAt IS NULL) tetap dihapus jika sudah > 7 hari.

### 4.3 Index yang Dimanfaatkan

Index `(recipientNIK, createdAt)` sudah ada. DELETE WHERE createdAt < threshold efisien via index.

### 4.4 Jadwal

| Parameter | Nilai |
|---|---|
| Jadwal | Harian, 01:00 UTC (08:00 WIB) |
| Endpoint | GET /api/cron/cleanup-notifications |
| Authorization | Bearer CRON_SECRET |

---

## 5. File yang Dibuat / Diubah

| File | Aksi | Keterangan |
|---|---|---|
| app/api/cron/cleanup-notifications/route.ts | Buat baru | Route handler cron |
| lib/jobs/cleanup-notifications.ts | Buat baru | Logika delete + return count |
| render.yaml | Edit | Tambah NOTIFICATION_RETENTION_DAYS |
| scripts/one-time-cleanup-notifications.ts | Buat baru | Script cleanup 310K baris (dry-run + --confirm) |

Tidak ada perubahan schema, tidak ada migration.

---

## 6. Logika Cleanup

```typescript
export async function cleanupOldNotifications() {
    const retentionDays = parseInt(
        process.env.NOTIFICATION_RETENTION_DAYS ?? "7", 10
    );
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.notification.deleteMany({
        where: { createdAt: { lt: threshold } },
    });
    return { deleted: result.count, threshold };
}
```

Response: `{ ok: true, deleted: 4231, threshold: "2026-09-24T01:00:00.000Z" }`

---

## 7. One-Time Initial Cleanup

```bash
# Dry-run (preview jumlah yang akan dihapus)
npx tsx scripts/one-time-cleanup-notifications.ts

# Eksekusi aktual
npx tsx scripts/one-time-cleanup-notifications.ts --confirm
```

---

## 8. Keamanan

- Endpoint hanya terima Authorization: Bearer CRON_SECRET.
- Return 500 jika CRON_SECRET tidak dikonfigurasi.
- Pattern identik dengan /api/cron/cleanup-pending-reports/route.ts.

---

## 9. Verifikasi

1. Jalankan script one-time cleanup — cek log output.
2. Panggil endpoint cron manual dengan Bearer token — pastikan ok: true.
3. Cek count tabel Notification via SQL setelah cleanup.
4. Deploy dan verifikasi cron schedule di Render dashboard.

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| User kehilangan notifikasi belum dibaca > 7 hari | Diterima — tidak actionable; UI hanya tampil 10 terbaru |
| Cron gagal jalan | Data menumpuk sementara, aman — cleanup berjalan saat aktif kembali |
| Lock tabel saat bulk delete | Index createdAt memastikan delete efisien |
