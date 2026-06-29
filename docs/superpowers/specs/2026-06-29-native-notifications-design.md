# Native Business Notifications Design

## Goal

Menambahkan sistem notifikasi proses bisnis untuk SPARTA Maintenance yang muncul di dalam aplikasi dan, bila user mengaktifkan izin perangkat, muncul sebagai notifikasi native melalui PWA/Web Push.

Target utama:

- BMS, BMC, BNM Manager, dan Admin menerima informasi proses bisnis yang relevan tanpa harus membuka halaman laporan terus-menerus.
- Notifikasi tetap tercatat di database walaupun push native gagal, browser ditutup, atau perangkat tidak mendukung Web Push.
- Push native bersifat pendukung. Sumber kebenaran tetap tabel notifikasi aplikasi.
- Implementasi tidak memperberat transaksi utama laporan/PJUM, terutama karena database production memakai Aiven Free dengan batas koneksi kecil.

## Current Repo Context

Project sudah memiliki fondasi PWA:

- `components/pwa-register.tsx` mendaftarkan `/sw.js` pada production.
- `public/sw.js` saat ini hanya menangani offline cache dan belum menangani `push` atau `notificationclick`.
- `app/manifest.ts` sudah menyediakan manifest PWA.
- `app/dashboard/_components/admin/admin-site-header-actions.tsx` sudah memiliki tombol notifikasi berbentuk ikon, tetapi masih placeholder.

Project belum memiliki:

- tabel notifikasi aplikasi,
- tabel subscription Web Push,
- helper pengiriman push,
- API untuk subscribe/unsubscribe perangkat,
- unread count dan daftar notifikasi,
- event bus notifikasi untuk action laporan/PJUM.

Dependency yang belum ada dan perlu ditambahkan:

- `web-push`
- `@types/web-push` sebagai dev dependency bila TypeScript membutuhkan tipe tambahan.

## Product Scope

### In Scope

- Notifikasi in-app di bell header.
- Notifikasi native perangkat melalui PWA/Web Push.
- Subscription perangkat per user.
- Flow notifikasi laporan dari BMS sampai BNM.
- Flow notifikasi PJUM.
- Mark as read, mark all as read, dan unread count.
- Link notifikasi menuju halaman terkait.
- Role-aware link:
  - BMS menuju `/reports/[reportNumber]`.
  - BMC, BNM Manager, dan Admin menuju `/dashboard/reports/[reportNumber]`.
  - PJUM dashboard menuju `/dashboard/pjum/[id]`.
- Preference sederhana:
  - user bisa mengaktifkan notifikasi perangkat,
  - user bisa mematikan perangkat tertentu dengan unsubscribe.

### Out of Scope Untuk Iterasi Pertama

- Realtime websocket.
- Push notification scheduling kompleks.
- Notification template builder lewat UI.
- Notification preferences per event.
- Email fallback untuk semua event.
- Push ke role `BRANCH_ADMIN`, kecuali event PJUM existing yang masih memakai email lama.
- Mobile native app push melalui FCM/APNs langsung.

## Recommended Approach

Gunakan arsitektur hybrid:

1. Simpan notifikasi ke database sebagai sumber kebenaran.
2. Kirim Web Push best-effort setelah transaksi bisnis selesai.
3. Tampilkan notifikasi in-app dari database.
4. Jika Web Push gagal, user tetap melihat notifikasi saat membuka aplikasi.

Alasan:

- PWA sudah ada, jadi Web Push adalah jalur paling tepat untuk notifikasi native browser/perangkat.
- Tidak perlu vendor realtime untuk tahap awal.
- Tidak membuat proses bisnis gagal hanya karena push gagal.
- Cocok dengan constraint Aiven Free karena push tidak dilakukan di dalam transaksi database.

Alternatif yang tidak dipilih untuk tahap awal:

- Pusher/Ably/Supabase Realtime: bagus untuk realtime in-app, tetapi tidak menggantikan native push saat app tertutup.
- Novu: berguna untuk notification workflow besar, tetapi menambah kompleksitas dan vendor dependency yang belum diperlukan.
- FCM langsung: bisa dipakai di Android, tetapi untuk PWA browser standar tetap lebih sederhana memakai Web Push + VAPID.

## Tech Stack

- PWA service worker existing: `public/sw.js`
- Web Push library: `web-push`
- Browser APIs:
  - `Notification`
  - `ServiceWorkerRegistration.pushManager`
  - `PushSubscription`
- Database:
  - Prisma + PostgreSQL
- UI:
  - shadcn/ui components yang relevan:
    - `DropdownMenu`
    - `Button`
    - `Badge`
    - `ScrollArea`
    - `Separator`
    - `Tooltip`
    - `Alert`
    - `Skeleton`
    - `Empty`
- Existing feedback:
  - `sonner` hanya untuk feedback lokal, bukan notifikasi bisnis persistent.

## Environment Variables

Tambahkan env berikut:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

Catatan:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` dipakai client untuk subscribe.
- `VAPID_PRIVATE_KEY` hanya server-side.
- `VAPID_SUBJECT` wajib untuk identitas pengirim Web Push.
- Generate key bisa memakai script internal atau perintah dari package `web-push`.

## Data Model

### Notification

Menyimpan satu notifikasi untuk satu recipient.

```prisma
model Notification {
  id             String             @id @default(uuid())
  recipientNIK   String
  actorNIK       String?
  type           NotificationType
  title          String
  body           String
  href           String
  entityType     NotificationEntityType
  entityId       String
  reportNumber   String?
  pjumExportId   String?
  metadata       Json               @default("{}")
  readAt         DateTime?
  createdAt      DateTime           @default(now())

  recipient      User               @relation("ReceivedNotifications", fields: [recipientNIK], references: [NIK])
  actor          User?              @relation("SentNotifications", fields: [actorNIK], references: [NIK])

  @@index([recipientNIK, readAt, createdAt])
  @@index([recipientNIK, createdAt])
  @@index([entityType, entityId])
  @@index([reportNumber])
  @@index([pjumExportId])
}
```

### PushSubscription

Menyimpan perangkat/browser yang sudah diizinkan user.

```prisma
model PushSubscription {
  id          String   @id @default(uuid())
  userNIK     String
  endpoint    String   @unique
  p256dh      String
  auth        String
  userAgent   String?
  deviceLabel String?
  disabledAt  DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userNIK], references: [NIK])

  @@index([userNIK, disabledAt])
}
```

### Enums

```prisma
enum NotificationType {
  REPORT_SUBMITTED
  REPORT_ESTIMATION_APPROVED
  REPORT_ESTIMATION_REJECTED_REVISION
  REPORT_ESTIMATION_REJECTED
  REPORT_WORK_STARTED
  REPORT_COMPLETION_SUBMITTED
  REPORT_WORK_APPROVED
  REPORT_WORK_REJECTED_REVISION
  REPORT_FINAL_APPROVED
  REPORT_FINAL_REJECTED_REVISION
  PJUM_CREATED
  PJUM_APPROVED
  PJUM_REJECTED
  REPORT_INTERVENTION_CREATED
}

enum NotificationEntityType {
  REPORT
  PJUM
  INTERVENTION
}
```

User model perlu relation tambahan:

```prisma
notificationsReceived Notification[] @relation("ReceivedNotifications")
notificationsSent     Notification[] @relation("SentNotifications")
pushSubscriptions     PushSubscription[]
```

## Notification Flow Table

| No | Trigger bisnis | Status/result | Actor | Recipient | Channel | Link | Tujuan pesan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | BMS submit laporan baru | `PENDING_ESTIMATION` | BMS | BMC di cabang laporan | In-app + Web Push | `/dashboard/reports/[reportNumber]` | BMC tahu ada laporan baru untuk review estimasi |
| 2 | BMS submit ulang revisi estimasi | `PENDING_ESTIMATION` | BMS | BMC di cabang laporan | In-app + Web Push | `/dashboard/reports/[reportNumber]` | BMC tahu revisi estimasi sudah dikirim ulang |
| 3 | BMC approve estimasi | `ESTIMATION_APPROVED` | BMC | BMS pembuat laporan | In-app + Web Push | `/reports/[reportNumber]` | BMS tahu pekerjaan boleh dimulai |
| 4 | BMC tolak estimasi untuk revisi | `ESTIMATION_REJECTED_REVISION` | BMC | BMS pembuat laporan | In-app + Web Push | `/reports/[reportNumber]` | BMS tahu estimasi harus direvisi |
| 5 | BMC tolak estimasi permanen | `ESTIMATION_REJECTED` | BMC | BMS pembuat laporan | In-app + Web Push | `/reports/[reportNumber]` | BMS tahu laporan ditolak permanen |
| 6 | BMS mulai pekerjaan | `IN_PROGRESS` | BMS | BMC di cabang laporan | In-app only untuk tahap awal | `/dashboard/reports/[reportNumber]` | BMC punya jejak bahwa pekerjaan sudah dimulai |
| 7 | BMS ajukan penyelesaian | `PENDING_REVIEW` | BMS | BMC di cabang laporan | In-app + Web Push | `/dashboard/reports/[reportNumber]` | BMC tahu laporan perlu dicek dengan nota/foto |
| 8 | BMS submit ulang revisi pekerjaan | `PENDING_REVIEW` | BMS | BMC di cabang laporan | In-app + Web Push | `/dashboard/reports/[reportNumber]` | BMC tahu revisi pekerjaan sudah dikirim ulang |
| 9 | BMC approve pekerjaan | `APPROVED_BMC` | BMC | BNM Manager di cabang laporan | In-app + Web Push | `/dashboard/reports/[reportNumber]` | BNM tahu laporan perlu approval final |
| 10 | BMC tolak pekerjaan untuk revisi | `REVIEW_REJECTED_REVISION` | BMC | BMS pembuat laporan | In-app + Web Push | `/reports/[reportNumber]` | BMS tahu pekerjaan harus direvisi |
| 11 | BNM approve final | `COMPLETED` | BNM Manager | BMS pembuat laporan dan BMC cabang | In-app + Web Push | role-aware report link | BMS/BMC tahu laporan selesai final |
| 12 | BNM tolak final untuk revisi | `REVIEW_REJECTED_REVISION` | BNM Manager | BMS pembuat laporan dan BMC cabang | In-app + Web Push | role-aware report link | BMS/BMC tahu final review dikembalikan |
| 13 | BMC membuat PJUM | `PENDING_APPROVAL` | BMC | BNM Manager di cabang PJUM | In-app + Web Push | `/dashboard/pjum/[id]` | BNM tahu ada PJUM menunggu approval |
| 14 | BNM approve PJUM | `APPROVED` | BNM Manager | BMC pembuat PJUM dan BMS terkait | In-app + Web Push + email existing ke Branch Admin | `/dashboard/pjum/[id]` untuk dashboard role, `/reports/pjum/[id]` bila legacy BMS perlu | Pihak cabang tahu PJUM disetujui |
| 15 | BNM reject PJUM | `REJECTED` | BNM Manager | BMC pembuat PJUM dan BMS terkait | In-app + Web Push | `/dashboard/pjum/[id]` | BMC/BMS tahu PJUM perlu ditindaklanjuti |
| 16 | Admin membuat intervensi laporan selesai | revision PDF / data revision | Admin | BMS pembuat laporan, BMC cabang, BNM cabang | In-app + Web Push | `/dashboard/reports/[reportNumber]` atau `/reports/[reportNumber]` untuk BMS | Semua pihak tahu ada koreksi pasca laporan selesai |

## Recipient Resolution Rules

### BMS Recipient

Untuk notifikasi ke BMS:

- gunakan `Report.createdByNIK`,
- pastikan user belum soft-deleted: `deletedAt: null`,
- link selalu `/reports/[reportNumber]`.

### BMC Recipient

Untuk notifikasi ke BMC:

- pilih user role `BMC`,
- `branchNames` mengandung `report.branchName` atau `pjum.branchName`,
- `deletedAt: null`,
- link dashboard.

### BNM Manager Recipient

Untuk notifikasi ke BNM:

- pilih user role `BNM_MANAGER`,
- `branchNames` mengandung `report.branchName` atau `pjum.branchName`,
- `deletedAt: null`,
- link dashboard.

### Admin Recipient

Admin tidak perlu menerima semua notifikasi operasional pada iterasi pertama karena berisiko terlalu ramai.

Admin hanya menerima:

- event error delivery kritikal bila nanti ada notification health monitor,
- intervensi manual bila fitur audit notification dibutuhkan.

## Notification Content Guidelines

Format pesan harus jelas untuk user awam:

- Title menjawab "apa yang terjadi".
- Body menjawab "laporan/PJUM mana dan perlu apa".
- Link langsung membawa user ke halaman tindakan.

Contoh:

```ts
{
  title: "Laporan baru menunggu review estimasi",
  body: "U845-2606-001 dari KPG. TIMOR RAYA KM10 perlu dicek oleh BMC.",
  href: "/dashboard/reports/U845-2606-001"
}
```

```ts
{
  title: "Pekerjaan disetujui BMC",
  body: "U845-2606-001 sudah diteruskan ke BNM untuk approval final.",
  href: "/reports/U845-2606-001"
}
```

Untuk rejection, body wajib menyebut bahwa ada catatan:

```ts
{
  title: "Laporan dikembalikan untuk revisi",
  body: "U845-2606-001 perlu direvisi. Buka laporan untuk melihat catatan reviewer.",
  href: "/reports/U845-2606-001"
}
```

## Architecture

### Layer 1: Notification Domain

File yang disarankan:

- `lib/notifications/types.ts`
- `lib/notifications/templates.ts`
- `lib/notifications/recipients.ts`
- `lib/notifications/create-notification.ts`
- `lib/notifications/push.ts`
- `lib/notifications/dispatch.ts`

Tanggung jawab:

- membangun payload notifikasi,
- menentukan recipient,
- menyimpan notifikasi,
- mengirim Web Push best-effort,
- menghapus subscription invalid.

### Layer 2: API Routes

File yang disarankan:

- `app/api/push/subscribe/route.ts`
- `app/api/push/unsubscribe/route.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/read/route.ts`

Tanggung jawab:

- subscribe perangkat aktif,
- unsubscribe endpoint,
- mengambil daftar notifikasi user saat ini,
- mark read dan mark all read.

Semua route wajib memakai auth user aktif. Client tidak boleh mengirim `userNIK` sebagai sumber otorisasi.

### Layer 3: Service Worker

Update `public/sw.js`:

- tetap pertahankan offline cache existing,
- tambahkan event `push`,
- tambahkan event `notificationclick`.

Behavior:

- jika payload valid, tampilkan `self.registration.showNotification(title, options)`,
- simpan `href` dalam `data`,
- saat notification diklik:
  - tutup notifikasi,
  - fokus tab existing jika URL sudah terbuka,
  - kalau belum ada tab, buka URL baru.

### Layer 4: Client UI

File yang disarankan:

- `components/notifications/notification-bell.tsx`
- `components/notifications/notification-enable-button.tsx`
- `components/notifications/use-push-subscription.ts`
- `app/dashboard/_components/admin/admin-site-header-actions.tsx`

UI:

- bell icon tetap berbentuk tombol bulat,
- badge unread kecil,
- dropdown berisi daftar ringkas 10 notifikasi terbaru,
- tombol "Tandai semua dibaca",
- state kosong "Belum ada notifikasi",
- tombol "Aktifkan notifikasi perangkat" muncul jika browser mendukung dan permission belum granted.

### Layer 5: Business Actions Integration

Notifikasi dibuat setelah transaksi bisnis berhasil.

Pola yang disarankan:

```ts
const result = await prisma.$transaction(...);

dispatchNotificationEvent({
  type: "REPORT_SUBMITTED",
  reportNumber: result.reportNumber,
  actorNIK: user.NIK,
}).catch((error) => logger.warn(...));
```

Aturan penting:

- jangan kirim push di dalam transaction,
- jangan membuat action bisnis gagal hanya karena push gagal,
- notifikasi database boleh dibuat setelah transaction selesai,
- jika notifikasi database gagal, log sebagai warning atau error non-fatal sesuai event.

## Native Push Behavior

### Permission Flow

Notifikasi native tidak boleh diminta otomatis saat halaman dibuka.

Flow:

1. User membuka menu notifikasi.
2. User klik "Aktifkan notifikasi perangkat".
3. Browser menampilkan permission prompt.
4. Jika granted:
   - client mengambil service worker registration,
   - membuat PushSubscription,
   - mengirim endpoint dan keys ke `/api/push/subscribe`.
5. Jika denied:
   - tampilkan pesan singkat bahwa izin ditolak dari browser/perangkat.

### Device Support Notes

- Android Chrome/Edge: cocok untuk PWA Web Push.
- Desktop Chrome/Edge/Firefox: cocok untuk Web Push.
- iOS/iPadOS: Web Push untuk PWA memerlukan iOS/iPadOS 16.4+ dan app sudah ditambahkan ke Home Screen.
- Browser yang tidak mendukung Push API tetap memakai in-app notification.

## Database and Performance Considerations

Karena production memakai Aiven Free dan sebelumnya pernah ada connection/transaction timeout:

- jangan buka Prisma transaction hanya untuk mengirim push,
- query recipient harus scoped dan select field minimal,
- batch create notification menggunakan `createMany` jika recipient lebih dari satu,
- ambil subscription hanya untuk recipient yang dipilih,
- batasi jumlah subscription aktif per user jika perlu, misalnya 5 perangkat,
- hapus subscription yang mendapat status 404/410 dari Web Push provider,
- notification list wajib pagination atau limit default.

Index minimal:

- `Notification(recipientNIK, readAt, createdAt)`
- `Notification(recipientNIK, createdAt)`
- `Notification(entityType, entityId)`
- `PushSubscription(userNIK, disabledAt)`
- `PushSubscription(endpoint)` unique

## Reliability Strategy

### Iterasi Pertama

Gunakan best-effort dispatch setelah transaksi:

- simpan Notification row,
- kirim Web Push,
- log kegagalan push,
- hapus subscription invalid.

Kelebihan:

- sederhana,
- cepat diimplementasikan,
- tidak butuh worker tambahan.

Kekurangan:

- jika process mati setelah Notification row dibuat tetapi sebelum push terkirim, user tetap melihat in-app notification tetapi tidak menerima native push.

### Iterasi Kedua Jika Dibutuhkan

Tambahkan outbox table:

```prisma
model NotificationDelivery {
  id              String   @id @default(uuid())
  notificationId  String
  channel         String
  status          String
  attempts        Int      @default(0)
  nextAttemptAt   DateTime @default(now())
  lastError       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status, nextAttemptAt])
}
```

Lalu proses retry via:

- Render Cron Job,
- scheduled internal endpoint dengan secret,
- atau worker service terpisah bila volume meningkat.

Untuk tahap awal, outbox tidak wajib.

## Security

- API subscribe/unsubscribe wajib auth.
- Client tidak boleh bisa subscribe untuk user lain.
- Endpoint push subscription dianggap sensitive token; jangan log full endpoint.
- Payload push tidak boleh berisi data sensitif seperti nominal detail lengkap, catatan internal panjang, atau link file privat.
- Payload cukup title, body, href, notificationId, type.
- Permission notification harus user-initiated.
- CSRF tetap dipakai untuk mutation jika route mengikuti pola server action; route handler harus validasi session.

## UI Design

### Header Bell

Bell tetap berada di kanan atas site header sesuai implementasi saat ini.

State:

- no unread: ikon biasa,
- unread: badge angka kecil,
- loading: skeleton ringkas di dropdown,
- empty: teks "Belum ada notifikasi",
- unsupported push: tidak menampilkan tombol aktivasi native, hanya in-app notification.

Konten dropdown:

- header: "Notifikasi"
- action: "Tandai semua dibaca"
- list item:
  - title,
  - body pendek,
  - waktu relatif,
  - titik unread,
  - klik menuju `href` dan mark read.

### Settings Optional

Jika notifikasi perangkat perlu kontrol lebih jelas, tambahkan section kecil di `/dashboard/settings`:

- status izin browser,
- perangkat aktif,
- tombol aktifkan/nonaktifkan perangkat ini.

Ini bisa ditunda jika dropdown bell sudah cukup.

## Implementation Plan Outline

Implementasi sebaiknya dibagi menjadi 6 tahap:

1. Data model dan migration
   - tambah model Notification dan PushSubscription,
   - tambah enum,
   - generate Prisma client.

2. Web Push foundation
   - install `web-push`,
   - tambah env VAPID,
   - tambah helper convert VAPID key,
   - tambah subscribe/unsubscribe API,
   - update service worker push/click handler.

3. Notification domain
   - template event,
   - recipient resolver,
   - create notification,
   - push delivery helper.

4. Header UI
   - ubah placeholder bell menjadi daftar notifikasi,
   - unread badge,
   - mark read,
   - enable native notification button.

5. Business action integration
   - submit report,
   - resubmit report,
   - estimation review,
   - completion submit,
   - completion review,
   - final BNM approval/rejection,
   - create PJUM,
   - approve/reject PJUM,
   - intervensi admin.

6. Verification and hardening
   - test auth route,
   - test service worker manual,
   - test push with one subscription,
   - test unsupported browser path,
   - test invalid subscription cleanup,
   - run TypeScript and lint targeted.

## Testing Strategy

### Unit/Integration Targets

- recipient resolver:
  - BMC receives only branch-scoped report,
  - BNM receives only branch-scoped report,
  - BMS receives own report only,
  - soft-deleted users are excluded.

- notification template:
  - each event produces title/body/href,
  - BMS href and dashboard href differ correctly.

- subscribe route:
  - requires auth,
  - upserts endpoint,
  - does not allow user override.

- read route:
  - only marks current user's notification.

### Manual QA

- Login BMS, enable native notification.
- Login BMC in another browser/profile, enable native notification.
- BMS submit report.
- Confirm:
  - BMC bell unread count increases,
  - BMC receives OS/browser notification,
  - notification click opens `/dashboard/reports/[reportNumber]`.
- BMC approve estimation.
- Confirm BMS receives notification and link opens `/reports/[reportNumber]`.
- Repeat for completion review and final BNM approval.
- Disable notification permission and confirm in-app notification still works.

## Rollout Plan

1. Deploy schema and code with notification UI disabled behind a constant or env flag if desired.
2. Enable in-app notification first.
3. Enable Web Push subscription UI for internal users.
4. Test BMS/BMC/BNM devices.
5. Enable broadly after one business cycle.

Recommended feature flag:

```env
NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
NEXT_PUBLIC_WEB_PUSH_ENABLED=true
```

If environment flags are not desired, ship both enabled but gracefully hide native activation when VAPID public key is missing.

## Open Decisions

The following decisions are intentionally fixed for the first implementation:

- Admin does not receive all operational notifications.
- Email fallback remains only for existing PJUM approval flow.
- No realtime websocket.
- No outbox worker in first version.
- Native push permission is always opt-in by user click.
- Notification payload excludes sensitive details.

## Spec Self-Review

- No placeholder sections remain.
- Scope is implementable as one feature with staged tasks.
- Architecture keeps business transactions separate from push delivery.
- Native push behavior accounts for PWA/browser limitations.
- Flow table covers BMS to BMC to BNM and PJUM.
- UI uses existing shadcn-compatible header pattern and avoids creating a separate notification page in the first iteration.
