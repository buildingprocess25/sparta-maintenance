# Fix: AHO Import Background Job

## Scope

Mengubah arsitektur fitur import XLSX tiket AHO dari synchronous Server Action menjadi background job pattern berbasis database untuk mengatasi error "gateway timeout" di production.

## Context and Sources

- Error: User mendapatkan notif "Import gagal" padahal data berhasil tersimpan di DB.
- Root cause: Server action yang mengeksekusi import berjalan lama (~171 detik di production) dan memanggil `revalidatePath` sebelum me-return hasil. Hal ini menyebabkan response terputus oleh gateway timeout Traefik di VPS.
- Solusi: Menyimpan file ke database sementara, enqueue job, dan melakukan polling dari client hingga status job selesai (`done` atau `failed`).

## Changed Files

- `prisma/schema.prisma`: Menambah model `AhoImportJob` dan enum `AhoImportStatus`.
- `lib/jobs/aho-import.ts`: Memindahkan logika parser `parseFormatBXlsx` dan eksekutor `upsertAhoTickets` dari `actions.ts`. Menambahkan service `processAhoImportJob`.
- `app/api/admin/import-aho/route.ts`: Endpoint POST untuk enqueue job baru.
- `app/api/admin/import-aho/[jobId]/route.ts`: Endpoint GET untuk polling status job.
- `app/dashboard/aho-tickets/actions.ts`: Refactor `adminImportAhoTickets` menjadi enqueue-only (memanggil db.create dan trigger process tanpa menunggunya).
- `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`: Refactor menjadi polling-based component dengan simulasi progres saat `processing`.

## Decisions

- **Database-backed queue**: Dipilih dibanding Redis/queue eksternal agar tidak menambah dependensi infra baru. File XLSX disimpan sementara sebagai `Bytes` di PostgreSQL lalu dibersihkan setelah selesai.
- **Fire-and-forget processing**: Dipanggil di Node.js standalone process tanpa `await`.
- **Client-side routing refresh**: Halaman direfresh via `router.refresh()` di client alih-alih `revalidatePath()` di server action untuk mengurangi durasi response server action.

## Verification

- TypeScript build (`tsc --noEmit`) pass.
- Fitur diuji secara manual dari proses upload, polling, hingga sukses mengimpor.

## Remaining Work and Risks

- "Ghost jobs": Job yang stuck karena server mati mendadak saat proses tidak memiliki cleanup otomatis. Dapat ditambahkan ke cron cleanup di masa mendatang jika diperlukan.
- Beban storage sementara: File XLSX ditampung di DB. Cukup efisien (segera dibersihkan) tapi akan menaikkan ukuran tabel jika banyak import serentak.