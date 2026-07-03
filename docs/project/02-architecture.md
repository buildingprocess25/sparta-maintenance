# Architecture

## Runtime

Project memakai Next.js 16 App Router dengan React Server Components, Server Actions, dan route handlers.

Layer utama:

| Layer | File/Folder | Fungsi |
| --- | --- | --- |
| App Router | `app/` | Route, page, layout, server actions, route handlers. |
| Shared UI | `components/` | Sidebar, dialog, shadcn/ui wrapper, komponen lintas route. |
| Domain helpers | `lib/` | Auth, Prisma, status label, PDF, Google Drive, notifications, settings. |
| Database | `prisma/schema.prisma` | Model, enum, index, migration source. |
| Scripts | `scripts/` | Import, backup, cleanup, migration helper, utility CLI. |

## Request Flow

1. User membuka route.
2. Middleware/proxy memvalidasi session dan maintenance mode.
3. Page server component mengambil auth user dari `lib/authorization.ts`.
4. Query/action memvalidasi role dan branch/area scope.
5. Prisma membaca/menulis PostgreSQL.
6. Mutasi penting menulis `ActivityLog`, `ApprovalLog`, atau `Notification`.
7. UI direvalidasi dengan `revalidatePath` jika diperlukan.

## Auth

- Session disimpan dalam cookie httpOnly.
- Helper utama ada di `lib/session.ts` dan `lib/authorization.ts`.
- Role utama: `BMS`, `BMC`, `BNM_MANAGER`, `ADMIN`.
- `BRANCH_ADMIN` ada di schema tetapi bukan role login utama saat ini.

## Database Access

- Runtime Prisma memakai `lib/prisma.ts`.
- Prisma CLI memakai `prisma.config.ts`.
- `DATABASE_URL` dipakai runtime.
- `DIRECT_URL` dipakai migrasi jika tersedia.
- Timezone koneksi runtime dipaksa UTC melalui option PostgreSQL.

## Integrations

| Integrasi | Fungsi |
| --- | --- |
| Google Drive API | Arsip PDF report/PJUM. |
| Drive CDN/proxy | Foto report dan dokumentasi. |
| Gmail OAuth2 | Email notifikasi/OTP jika dipakai flow terkait. |
| Web Push | Native notification untuk PWA. |
| UploadThing | Handler legacy; jangan dipakai untuk fitur baru kecuali masih dibutuhkan route lama. |

## Deployment

- Production memakai Docker standalone Next.js di Render.
- Health check: `/api/health`.
- Migration production dijalankan dengan `npx prisma migrate deploy`.
- Jangan menjalankan migration terhadap database production dari branch lokal tanpa memastikan target env.
