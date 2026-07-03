# Testing and Verification

## Verifikasi Umum

Gunakan verifikasi paling kecil yang relevan dengan perubahan.

| Perubahan | Command |
| --- | --- |
| TypeScript atau domain helper | `npx tsc --noEmit` |
| Lint file tertentu | `npx eslint <file>` |
| Prisma schema | `npx prisma generate` |
| Script merge area | `npx tsx scripts/merge-branch-scopes.ts --self-test` |
| Notifikasi recipient | `npx tsx lib/notifications/recipients.spec.ts` |
| Template notifikasi | `npx tsx lib/notifications/templates.spec.ts` |
| Realisasi helper | `npx tsx lib/realisasi.spec.ts` |
| Time helper | `npx tsx lib/time.spec.ts` |
| Build production | `npm run build` |

## Verifikasi UI

Untuk perubahan UI:

1. Jalankan dev server.
2. Buka route terkait.
3. Cek desktop dan mobile.
4. Pastikan tidak ada overflow horizontal.
5. Pastikan tabel compact dan vertical align center.
6. Pastikan status memakai label global.
7. Pastikan loading foto tidak terlihat hitam atau misleading.
8. Pastikan action destructive memakai dialog konfirmasi.

## Verifikasi Docs

Untuk perubahan dokumentasi:

```bash
rg -n "T[O]DO|T[B]D|lor[e]m" README.md docs/project .agents/AI_CONTEXT.md
```

Jika command menemukan kata dari command verifikasi itu sendiri, abaikan selama bukan konten yang belum selesai.

```bash
rg -n "\]\(" README.md docs/project .agents/AI_CONTEXT.md
```

Pastikan link lokal mengarah ke file yang ada.

## Prinsip

- Jangan menjalankan migration production sebagai bagian dari verifikasi docs.
- Jangan menjalankan script destructive tanpa dry-run atau konfirmasi eksplisit.
- Jika test tidak dijalankan, sebutkan alasannya di final response.
