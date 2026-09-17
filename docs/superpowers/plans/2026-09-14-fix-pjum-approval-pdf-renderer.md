# Fix PJUM Approval PDF Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki kegagalan approval PJUM di production Dokploy yang crash saat render PDF dengan error `Cannot read properties of undefined (reading 'S')`.

**Architecture:** Masalah terjadi di runtime server production saat `approvePjumExport` memanggil PDF generation berbasis `@react-pdf/renderer`. Perbaikan difokuskan pada konfigurasi Next.js agar React PDF tidak ikut `optimizePackageImports`/Turbopack server bundling path yang memicu mismatch React reconciler, lalu menambahkan guard test dan smoke script supaya regression mudah dideteksi sebelum deploy.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, `@react-pdf/renderer`, Node `tsx`, Dokploy standalone deployment.

## Global Constraints

- Jangan mengubah schema database atau migration.
- Jangan mengubah alur bisnis status PJUM.
- Jangan membuat approval PJUM menjadi sukses jika PDF final gagal dibuat.
- Tidak menambah library baru.
- Jaga `serverExternalPackages` yang sudah ada, termasuk `googleapis`.
- Verifikasi utama harus membuktikan `@react-pdf/renderer` tidak masuk `experimental.optimizePackageImports`.

---

## File Structure

- `next.config.ts`: sumber konfigurasi production Next.js. File ini harus mengeluarkan `@react-pdf/renderer` dari `experimental.optimizePackageImports` dan memasukkannya ke `serverExternalPackages`.
- `next-config-pdf-runtime.spec.ts`: guard test source-level untuk memastikan konfigurasi PDF renderer tidak kembali dioptimasi.
- `scripts/smoke-react-pdf-renderer.ts`: smoke script minimal yang merender PDF dengan `@react-pdf/renderer` dan mencetak versi React/renderer yang dipakai.
- `docs/agent-notes/YYYY-MM-DD-HHMM-fix-pjum-pdf-renderer.md`: catatan task sesuai aturan repo setelah implementasi selesai.

---

### Task 1: Tambah Guard Test Untuk Konfigurasi React PDF

**Files:**
- Create: `next-config-pdf-runtime.spec.ts`

**Interfaces:**
- Consumes: default export dari `next.config.ts`.
- Produces: executable source-level assertion yang gagal jika `@react-pdf/renderer` masih ada di `experimental.optimizePackageImports` atau belum ada di `serverExternalPackages`.

- [ ] **Step 1: Buat failing test**

Buat file `next-config-pdf-runtime.spec.ts` dengan isi berikut:

```typescript
import assert from "node:assert/strict";
import nextConfig from "./next.config";

const optimizePackageImports =
    nextConfig.experimental?.optimizePackageImports ?? [];
const serverExternalPackages = nextConfig.serverExternalPackages ?? [];

assert.ok(
    !optimizePackageImports.includes("@react-pdf/renderer"),
    "@react-pdf/renderer must not be listed in experimental.optimizePackageImports because production SSR bundling can break React PDF reconciler internals",
);

assert.ok(
    serverExternalPackages.includes("@react-pdf/renderer"),
    "@react-pdf/renderer must be listed in serverExternalPackages so server PDF generation uses the Node package instead of the optimized server bundle",
);

assert.ok(
    serverExternalPackages.includes("googleapis"),
    "googleapis must remain externalized because it was already required by the existing Next.js config",
);

console.log("next-config PDF runtime guard passed");
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run:

```powershell
node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts
```

Expected: FAIL dengan pesan:

```text
@react-pdf/renderer must not be listed in experimental.optimizePackageImports because production SSR bundling can break React PDF reconciler internals
```

- [ ] **Step 3: Commit test merah**

```powershell
git add next-config-pdf-runtime.spec.ts
git commit -m "test(config): guard react pdf server bundling"
```

---

### Task 2: Perbaiki Konfigurasi Next.js Untuk React PDF

**Files:**
- Modify: `next.config.ts`
- Test: `next-config-pdf-runtime.spec.ts`

**Interfaces:**
- Consumes: guard dari Task 1.
- Produces: `nextConfig.serverExternalPackages` berisi `googleapis` dan `@react-pdf/renderer`; `nextConfig.experimental.optimizePackageImports` tidak berisi `@react-pdf/renderer`.

- [ ] **Step 1: Ubah `serverExternalPackages`**

Di `next.config.ts`, ubah baris:

```typescript
  serverExternalPackages: ["googleapis"],
```

menjadi:

```typescript
  serverExternalPackages: ["googleapis", "@react-pdf/renderer"],
```

- [ ] **Step 2: Keluarkan `@react-pdf/renderer` dari `optimizePackageImports`**

Di `next.config.ts`, ubah array:

```typescript
    optimizePackageImports: ["lucide-react", "@tabler/icons-react", "recharts", "date-fns", "@base-ui/react", "@react-pdf/renderer"],
```

menjadi:

```typescript
    optimizePackageImports: ["lucide-react", "@tabler/icons-react", "recharts", "date-fns", "@base-ui/react"],
```

- [ ] **Step 3: Jalankan guard test**

Run:

```powershell
node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts
```

Expected: PASS dan output:

```text
next-config PDF runtime guard passed
```

- [ ] **Step 4: Commit konfigurasi**

```powershell
git add next.config.ts next-config-pdf-runtime.spec.ts
git commit -m "fix(config): externalize react pdf renderer"
```

---

### Task 3: Tambah Smoke Script Untuk PDF Renderer

**Files:**
- Create: `scripts/smoke-react-pdf-renderer.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@react-pdf/renderer` dan React runtime yang terpasang.
- Produces: script `npm run smoke:react-pdf` yang merender PDF minimal dan gagal cepat jika reconciler PDF crash.

- [ ] **Step 1: Buat smoke script**

Buat file `scripts/smoke-react-pdf-renderer.ts`:

```typescript
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import React from "react";
import {
    Document,
    Page,
    Text,
    renderToBuffer,
} from "@react-pdf/renderer";

const require = createRequire(import.meta.url);
const reactPackage = require("react/package.json") as { version: string };
const rendererPackage = require("@react-pdf/renderer/package.json") as {
    version: string;
};

const doc = React.createElement(
    Document,
    null,
    React.createElement(
        Page,
        { size: "A4" },
        React.createElement(Text, null, "SPARTA PDF renderer smoke test"),
    ),
);

const buffer = await renderToBuffer(doc);
const pdfBuffer = Buffer.from(buffer);

assert.ok(
    pdfBuffer.length > 1000,
    `Expected a non-empty PDF buffer, got ${pdfBuffer.length} bytes`,
);

console.log(
    `react-pdf-smoke-ok react=${reactPackage.version} renderer=${rendererPackage.version} bytes=${pdfBuffer.length}`,
);
```

- [ ] **Step 2: Tambahkan script package**

Di `package.json`, tambahkan script setelah `test:agent-note`:

```json
    "smoke:react-pdf": "tsx scripts/smoke-react-pdf-renderer.ts",
```

Pastikan koma JSON tetap valid:

```json
    "check:agent-note": "node scripts/check-agent-task-note.mjs",
    "test:agent-note": "node scripts/check-agent-task-note.spec.mjs",
    "smoke:react-pdf": "tsx scripts/smoke-react-pdf-renderer.ts",
    "setup:git-hooks": "git config core.hooksPath .githooks",
```

- [ ] **Step 3: Jalankan smoke script**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts
```

Expected: PASS dengan output serupa:

```text
react-pdf-smoke-ok react=19.2.8 renderer=4.5.1 bytes=1500
```

Angka `bytes` boleh berbeda, tetapi harus lebih dari `1000`.

- [ ] **Step 4: Jalankan melalui npm script jika npm tersedia**

Run:

```powershell
npm run smoke:react-pdf
```

Expected jika npm lokal tersedia:

```text
react-pdf-smoke-ok react=19.2.8 renderer=4.5.1 bytes=...
```

Jika npm global di mesin Windows masih gagal dengan `Cannot find module ... npm-cli.js`, catat sebagai environment issue dan gunakan command `node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts` sebagai verifikasi lokal.

- [ ] **Step 5: Commit smoke script**

```powershell
git add package.json scripts/smoke-react-pdf-renderer.ts
git commit -m "test(pdf): add react pdf smoke check"
```

---

### Task 4: Verifikasi Flow Approval PJUM Setelah Build

**Files:**
- Modify: `docs/agent-notes/YYYY-MM-DD-HHMM-fix-pjum-pdf-renderer.md`

**Interfaces:**
- Consumes: hasil Task 1-3.
- Produces: catatan verifikasi yang bisa dipakai untuk release/deploy.

- [ ] **Step 1: Jalankan guard test**

Run:

```powershell
node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts
```

Expected:

```text
next-config PDF runtime guard passed
```

- [ ] **Step 2: Jalankan smoke PDF renderer**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts
```

Expected:

```text
react-pdf-smoke-ok react=19.2.8 renderer=4.5.1 bytes=...
```

- [ ] **Step 3: Jalankan type check fokus bila tersedia**

Run:

```powershell
node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Expected:

```text
No TypeScript errors
```

Jika command gagal karena pre-existing `vitest` type gap pada `lib/utils.spec.ts`, catat pesan exact-nya di task note dan lanjut ke Step 4. Jangan mengubah dependency untuk task ini.

- [ ] **Step 4: Jalankan build production**

Run:

```powershell
node_modules\.bin\next.cmd build
```

Expected:

```text
✓ Compiled successfully
```

Jika build lokal gagal karena network/font atau environment Windows, catat pesan exact-nya di task note dan lakukan build di environment Dokploy/CI yang biasa dipakai deploy.

- [ ] **Step 5: Deploy ke Dokploy**

Deploy commit yang berisi Task 1-3 lewat alur Dokploy normal project.

Expected setelah deploy:

```text
Application deployed successfully
```

- [ ] **Step 6: Smoke test endpoint PDF laporan**

Login sebagai user yang punya akses ke laporan completed, lalu buka:

```text
/api/reports/1PP9-2609-001/pdf?fallback=1
```

Expected:

```text
HTTP 200
Content-Type: application/pdf
```

Jika report `1PP9-2609-001` tidak ada di environment target, gunakan satu report completed yang masuk PJUM pending dari cabang BNM yang sedang diuji.

- [ ] **Step 7: Smoke test approval PJUM**

Login sebagai BNM terkait, buka detail PJUM pending yang sebelumnya gagal, lalu klik `Setujui PJUM`.

Expected UI:

```text
Toast: PJUM disetujui
Status detail PJUM berubah dari Menunggu Approval ke Disetujui
Tombol Lihat PDF PJUM muncul
```

Expected log Dokploy:

```json
{"operation":"approvePjumExport","message":"PJUM approved successfully"}
```

Pastikan tidak muncul lagi:

```text
Cannot read properties of undefined (reading 'S')
```

- [ ] **Step 8: Buat task note**

Buat file `docs/agent-notes/YYYY-MM-DD-HHMM-fix-pjum-pdf-renderer.md` dari template `docs/agent-notes/TEMPLATE.md` dengan isi ringkas berikut, menyesuaikan timestamp Asia/Jakarta dan hasil command aktual:

```markdown
# Fix PJUM PDF Renderer Production Crash

## Scope

Fixes production PJUM approval failures caused by React PDF renderer crashing with `Cannot read properties of undefined (reading 'S')`.

## Context and Sources

- User reported BNM cannot approve PJUM.
- Dokploy logs showed repeated `approvePjumExport` failures with the same React PDF reconciler stack.
- `next.config.ts` had `@react-pdf/renderer` inside `experimental.optimizePackageImports`.

## Changed Files

- `next.config.ts`: externalized `@react-pdf/renderer` and removed it from optimized package imports.
- `next-config-pdf-runtime.spec.ts`: added config regression guard.
- `scripts/smoke-react-pdf-renderer.ts`: added minimal renderer smoke test.
- `package.json`: added `smoke:react-pdf` script.

## Decisions

- Keep PJUM approval strict: approval still fails if final PDF generation fails.
- Avoid optimizing `@react-pdf/renderer` because it owns React reconciler internals that are sensitive to production server bundling.

## Verification

- `node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts`: PASS.
- `node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts`: PASS.
- Add TypeScript/build/deploy/manual approval results here with exact output.

## Remaining Work and Risks

- Monitor Dokploy logs after deploy for any remaining `approvePjumExport` or `generatePdf` failures.
```

- [ ] **Step 9: Commit verification note**

```powershell
git add docs/agent-notes/YYYY-MM-DD-HHMM-fix-pjum-pdf-renderer.md
git commit -m "docs: record pjum pdf renderer fix"
```

---

## Self-Review

- Spec coverage: The plan addresses the repeated `approvePjumExport` production crash, protects the Next.js config from regression, adds a renderer smoke check, and includes Dokploy/manual approval verification.
- Placeholder scan: No `TBD`, `TODO`, or open-ended "handle edge cases" steps remain.
- Type consistency: The plan consistently uses `nextConfig.experimental.optimizePackageImports`, `nextConfig.serverExternalPackages`, and the `smoke:react-pdf` script name.
