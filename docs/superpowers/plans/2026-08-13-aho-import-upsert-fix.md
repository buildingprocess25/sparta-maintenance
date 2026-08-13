# AHO Import — Fix Transaction Timeout via PostgreSQL UPSERT

**Goal:** Ganti implementasi `adminImportAhoTickets` yang timeout akibat interactive transaction + N sequential updates menjadi satu PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` (UPSERT) bulk + `deleteMany`.

**Status:** ✅ COMPLETED — 2026-08-13 21:42 WIB

**Architecture:** Hapus `prisma.$transaction(callback)` interactive transaction. Ganti dengan: (1) raw SQL batch UPSERT handles create + update dalam satu query, (2) `deleteMany` untuk baris yang tidak ada di file.

**Tech Stack:** Next.js Server Action, Prisma `$queryRawUnsafe`, PostgreSQL `INSERT ON CONFLICT`

---

### Changes Made

- `app/dashboard/aho-tickets/actions.ts`
  - Added: `upsertAhoTickets()` helper (batch UPSERT)
  - Added: `existingById` Map (O(1) lookup)
  - Removed: `prisma.$transaction(callback, { timeout: 30_000 })`
  - Replaced with: `upsertAhoTickets(allIncoming)` + `deleteMany`

### Performance
- Before: ~32+ detik → timeout error
- After: Expected < 5 detik untuk 9k baris (1 DB roundtrip vs N sequential)
