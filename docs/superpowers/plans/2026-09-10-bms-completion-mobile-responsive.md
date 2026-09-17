# BMS Completion Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan horizontal page overflow pada halaman kirim penyelesaian BMS dan menjaga galeri, menu realisasi, dialog edit, serta footer tetap rapi pada seluruh viewport ponsel yang didukung.

**Architecture:** Jadikan `PhotoStrip` satu-satunya renderer koleksi foto dan ubah presentasinya menjadi responsive wrapping grid. Perbaiki intrinsic-width containment pada setiap composition boundary, lalu batasi page shell dan overlay sebagai defense-in-depth tanpa mengubah state form, alur upload, autosave, validasi, atau payload server.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui `radix-vega`, Node.js test runner melalui `tsx`.

## Global Constraints

- Target viewport adalah lebar CSS 320, 360, 390, dan 430 piksel dalam portrait dan landscape.
- `document.documentElement.scrollWidth <= window.innerWidth + 1` pada setiap skenario verifikasi.
- Galeri memakai dua kolom di bawah 360 piksel dan tiga kolom mulai 360 piksel; galeri tidak memakai horizontal scrolling.
- Semua galeri completion, termasuk foto toko material, memakai `PhotoStrip`.
- Header, dropdown, dialog, dan fixed footer tidak boleh keluar dari dynamic viewport.
- Tidak boleh menambahkan global `body { overflow-x: hidden }` atau mengubah komponen shadcn global.
- State form, urutan foto, callback preview/remove, upload, autosave, validasi, dan payload server tidak berubah.
- Target hapus foto tetap minimal 44 piksel dan setiap tombol icon mempertahankan accessible name.

---

## File Map

- Create `app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts`: source-contract regression test untuk aturan layout yang tidak dapat dicakup unit DOM pada toolchain saat ini.
- Modify `app/reports/[reportNumber]/completion/components/photo-strip.tsx`: renderer tunggal untuk responsive photo grid.
- Modify `app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx`: menghapus gallery toko duplikat dan memperbaiki shrink boundaries.
- Modify `app/reports/[reportNumber]/completion/components/evidence-capture-section.tsx`: membatasi section dan action header ke lebar parent.
- Modify `app/reports/[reportNumber]/completion/components/additional-documentation-section.tsx`: membatasi documentation section ke lebar parent.
- Modify `app/reports/[reportNumber]/completion/components/completion-item-section.tsx`: containment item, baris realisasi, dropdown event, dan dialog sempit.
- Modify `app/reports/[reportNumber]/completion/completion-client.tsx`: page-shell dan fixed-footer viewport guard.
- Modify `docs/project/05-routes-and-ui.md`: kontrak UI mobile permanen.
- Create a dated file in `docs/agent-notes/` using the required `yyyy-MM-dd-HHmm-bms-completion-mobile-responsive.md` format: catatan implementasi dan bukti verifikasi.

### Task 1: Lock the photo-grid contract with a failing regression test

**Files:**

- Create: `app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts`

**Interfaces:**

- Consumes: source file paths relatif terhadap test melalui `new URL(..., import.meta.url)`.
- Produces: regression test awal untuk wrapping grid dan reuse `PhotoStrip`; task berikutnya menambah contract lain ke file yang sama.

- [ ] **Step 1: Write the failing source-contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(fileName: string): string {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

const photoStrip = readSource("./photo-strip.tsx");
const revision = readSource("./start-work-revision-section.tsx");

test("photo collections wrap inside the mobile viewport", () => {
  assert.match(
    photoStrip,
    /grid min-w-0 max-w-full grid-cols-2 gap-2 min-\[360px\]:grid-cols-3/,
  );
  assert.doesNotMatch(photoStrip, /overflow-x-auto|-mx-4|shrink-0/);
  assert.match(revision, /<PhotoStrip[\s\S]*photos=\{store\.photos\}/);
  assert.doesNotMatch(revision, /overflow-x-auto/);
});
```

- [ ] **Step 2: Run the test and confirm the red state**

Run:

```powershell
npx tsx --test "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts"
```

Expected: FAIL pada assertion responsive grid pertama karena `PhotoStrip` masih memakai `-mx-4 flex ... overflow-x-auto`. Jangan commit red state ke `main`; Task 2 membuat contract ini hijau sebelum commit pertama.

### Task 2: Make PhotoStrip wrap and reuse it for material-store photos

**Files:**

- Modify: `app/reports/[reportNumber]/completion/components/photo-strip.tsx`
- Modify: `app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx`

**Interfaces:**

- Consumes: existing `PhotoStripProps` shape (`photos`, `emptyText`, optional `onRemove`, `onPreview`) tanpa perubahan signature.
- Produces: responsive two/three-column grid dan satu renderer yang dipakai oleh gallery toko material.

- [ ] **Step 1: Replace the horizontal PhotoStrip layout**

Ubah non-empty return menjadi:

```tsx
return (
  <div className="grid min-w-0 max-w-full grid-cols-2 gap-2 min-[360px]:grid-cols-3">
    {photos.map((photo) => (
      <div
        key={photo.id}
        className="group relative aspect-square min-w-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl}
          alt="Foto bukti"
          className="h-full w-full object-cover"
          onClick={() => onPreview(photo.previewUrl)}
        />
        <button
          type="button"
          onClick={() => onPreview(photo.previewUrl)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100"
          aria-label="Lihat foto"
        >
          <ZoomIn className="size-5" />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            className="absolute right-0 top-0 flex size-11 items-start justify-end p-1 text-destructive"
            aria-label="Hapus foto"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-background/95 shadow-sm">
              <Trash2 className="size-4" />
            </span>
          </button>
        )}
      </div>
    ))}
  </div>
);
```

Empty state tetap memakai markup dan copy yang ada.

- [ ] **Step 2: Replace the duplicated store gallery with PhotoStrip**

Tambahkan import:

```tsx
import { PhotoStrip } from "./photo-strip";
```

Hapus import `Trash2` yang tidak lagi dipakai. Ganti conditional gallery toko dengan:

```tsx
<PhotoStrip
  photos={store.photos}
  emptyText="Belum ada foto."
  onRemove={(photoId) => onRemoveStorePhoto(store.id, photoId)}
  onPreview={onPreview}
/>
```

Jangan ubah handler file input, `multiple`, urutan `files.forEach`, atau callback camera/gallery.

- [ ] **Step 3: Add intrinsic-width boundaries to the revision composition**

Terapkan class berikut pada boundary terkait:

```tsx
<section
  id="start-work-section"
  className="min-w-0 max-w-full border-b border-border/40 py-4"
>
```

```tsx
<div className="min-w-0 max-w-full flex-1">
```

```tsx
<div key={store.id} className="min-w-0 max-w-full">
  <div className="grid min-w-0 max-w-full grid-cols-1 gap-2">
```

```tsx
<Textarea className="min-h-16 min-w-0 max-w-full resize-none" ... />
```

```tsx
<div className="mt-1 min-w-0 max-w-full space-y-2 overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-2">
```

Pada header foto toko gunakan wrapping layout agar tombol tidak memaksa lebar parent:

```tsx
<div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
  <Label className="text-[11px] font-semibold text-muted-foreground">
    Foto Toko
  </Label>
  <div className="flex max-w-full flex-wrap gap-1">
```

- [ ] **Step 4: Run focused checks**

Run:

```powershell
npx tsx --test "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts"
npx eslint "app/reports/[reportNumber]/completion/components/photo-strip.tsx" "app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx"
```

Expected: test suite PASS dan ESLint PASS tanpa unused import.

- [ ] **Step 5: Commit the reusable photo-grid change**

```powershell
git add -- "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts" "app/reports/[reportNumber]/completion/components/photo-strip.tsx" "app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx"
git commit -m "fix: wrap completion photo grids"
```

### Task 3: Constrain every completion section and the page shell

**Files:**

- Modify: `app/reports/[reportNumber]/completion/components/evidence-capture-section.tsx`
- Modify: `app/reports/[reportNumber]/completion/components/additional-documentation-section.tsx`
- Modify: `app/reports/[reportNumber]/completion/components/completion-item-section.tsx`
- Modify: `app/reports/[reportNumber]/completion/completion-client.tsx`

**Interfaces:**

- Consumes: current component props dan callbacks tanpa signature changes.
- Produces: section/page boundaries yang tidak dapat melebihi viewport; tidak ada perubahan business logic.

- [ ] **Step 1: Append a failing containment contract**

Tambahkan source dan test berikut ke `completion-responsive-layout.spec.ts`:

```ts
const evidence = readSource("./evidence-capture-section.tsx");
const additional = readSource("./additional-documentation-section.tsx");
const completionItem = readSource("./completion-item-section.tsx");
const client = readSource("../completion-client.tsx");

test("completion sections constrain intrinsic width", () => {
  for (const source of [revision, evidence, additional, completionItem]) {
    assert.match(source, /min-w-0/);
    assert.match(source, /max-w-full/);
  }
  assert.match(client, /overflow-x-clip/);
  assert.match(client, /min-w-0/);
});
```

Run:

```powershell
npx tsx --test "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts"
```

Expected: photo-grid test PASS dan containment test FAIL pada section pertama yang belum memiliki `max-w-full`.

- [ ] **Step 2: Constrain reusable evidence and additional sections**

Pada root section masing-masing tambahkan `min-w-0 max-w-full`. Pada flex child yang menampung title, actions, dan `PhotoStrip`, gunakan `min-w-0 max-w-full flex-1`. Header dengan actions harus memakai `flex-wrap`; actions wrapper memakai `max-w-full flex-wrap`. Contoh class contract:

```tsx
<section className="min-w-0 max-w-full border-b border-border/40 py-4">
```

```tsx
<div className="min-w-0 max-w-full flex-1">
  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
```

Pertahankan seluruh copy, disabled state, notes, dan callbacks.

- [ ] **Step 3: Constrain CompletionItemSection outer structure**

Ubah root item, `Collapsible`, trigger, dan content wrappers agar memiliki kombinasi `min-w-0 max-w-full`. Bentuk target:

```tsx
<section
  id={`completion-item-${item.itemId}`}
  className="min-w-0 max-w-full border-b border-border/40 py-4"
>
  <Collapsible className="min-w-0 max-w-full" ...>
```

Child teks tetap `min-w-0 flex-1`; jangan menghapus `truncate`, karena truncate menjaga judul panjang tidak menekan action.

- [ ] **Step 4: Add a page-level defense-in-depth guard**

Ubah page shell dan width-bearing containers:

```tsx
<div className="min-h-svh min-w-0 max-w-full overflow-x-clip bg-background text-foreground">
```

```tsx
<div className="mx-auto flex w-full min-w-0 max-w-lg items-center justify-between gap-3 px-4 py-2.5">
```

```tsx
<main className="mx-auto flex w-full min-w-0 max-w-lg flex-col overflow-x-clip px-4 pb-32 pt-[116px]">
```

```tsx
<footer className="fixed inset-x-0 bottom-0 z-40 max-w-full overflow-x-clip border-t ...">
  <div className="mx-auto w-full min-w-0 max-w-lg">
```

Jangan menambahkan aturan overflow pada `html` atau `body` global.

- [ ] **Step 5: Run focused checks**

Run:

```powershell
npx tsx --test "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts"
npx eslint "app/reports/[reportNumber]/completion/components/evidence-capture-section.tsx" "app/reports/[reportNumber]/completion/components/additional-documentation-section.tsx" "app/reports/[reportNumber]/completion/components/completion-item-section.tsx" "app/reports/[reportNumber]/completion/completion-client.tsx"
```

Expected: seluruh test yang sudah ada PASS dan ESLint PASS.

- [ ] **Step 6: Commit the section and shell containment**

```powershell
git add -- "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts" "app/reports/[reportNumber]/completion/components/evidence-capture-section.tsx" "app/reports/[reportNumber]/completion/components/additional-documentation-section.tsx" "app/reports/[reportNumber]/completion/components/completion-item-section.tsx" "app/reports/[reportNumber]/completion/completion-client.tsx"
git commit -m "fix: contain completion mobile layout"
```

### Task 4: Harden the realisasi row, dropdown, and edit dialog

**Files:**

- Modify: `app/reports/[reportNumber]/completion/components/completion-item-section.tsx`

**Interfaces:**

- Consumes: existing `handleOpenDialog(entry?)`, `handleRemove(id)`, `draftEntry`, dan shadcn `Dialog`/`DropdownMenu` primitives.
- Produces: stable two-region row, Radix-native menu selection, dan narrow-screen dialog with vertical scroll.

- [ ] **Step 1: Append a failing interaction and dialog contract**

Tambahkan test berikut ke `completion-responsive-layout.spec.ts`:

```ts
test("realisasi actions and edit dialog stay usable on narrow screens", () => {
  assert.match(completionItem, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(completionItem, /DropdownMenuItem onSelect=/);
  assert.doesNotMatch(completionItem, /DropdownMenuItem onClick=/);
  assert.match(completionItem, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(completionItem, /max-w-\[calc\(100dvw-2rem\)\]/);
  assert.match(
    completionItem,
    /grid-cols-1[^"]*min-\[360px\]:grid-cols-\[minmax\(0,1fr\)_104px\]/,
  );
});
```

Run:

```powershell
npx tsx --test "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts"
```

Expected: photo-grid dan containment tests PASS; test baru FAIL pada realisasi row yang masih memakai flex.

- [ ] **Step 2: Replace the realisasi row flex with an explicit grid**

Gunakan:

```tsx
<div
  key={entry.id}
  className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2"
>
  <div className="min-w-0">
    ...
  </div>
  <div className="flex shrink-0 items-center gap-2">
    <span className="whitespace-nowrap text-xs font-bold">
      {formatCurrency(realisasiTotal(entry))}
    </span>
    ...
  </div>
</div>
```

Pertahankan `truncate` pada nama dan detail barang.

- [ ] **Step 3: Use DropdownMenu selection semantics**

Ubah kedua item menu saja:

```tsx
<DropdownMenuItem onSelect={() => handleOpenDialog(entry)}>
```

```tsx
<DropdownMenuItem
  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
  onSelect={() => handleRemove(entry.id)}
>
```

`onSelect` dipakai karena ini primitive Radix DropdownMenu; callback edit/remove tidak berubah.

- [ ] **Step 4: Constrain the dialog to the dynamic viewport**

Ubah local composition, bukan `components/ui/dialog.tsx`:

```tsx
<DialogContent
  className="max-h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6"
  onOpenAutoFocus={(event) => event.preventDefault()}
>
```

Ubah jumlah/satuan menjadi responsive grid:

```tsx
<div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_104px]">
```

Tambahkan `min-w-0` pada kedua field wrapper. Pertahankan parsing jumlah, opsi satuan, validasi tombol simpan, title, description, dan footer.

- [ ] **Step 5: Run the complete automated verification**

Run:

```powershell
npx tsx --test "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts"
npx eslint "app/reports/[reportNumber]/completion/components/photo-strip.tsx" "app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx" "app/reports/[reportNumber]/completion/components/evidence-capture-section.tsx" "app/reports/[reportNumber]/completion/components/additional-documentation-section.tsx" "app/reports/[reportNumber]/completion/components/completion-item-section.tsx" "app/reports/[reportNumber]/completion/completion-client.tsx"
npx tsc --noEmit
```

Expected: seluruh source-contract test PASS, ESLint exit 0, dan TypeScript exit 0.

- [ ] **Step 6: Commit the interaction hardening**

```powershell
git add -- "app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts" "app/reports/[reportNumber]/completion/components/completion-item-section.tsx"
git commit -m "fix: harden completion item actions"
```

### Task 5: Verify real browser behavior and record the change

**Files:**

- Modify: `docs/project/05-routes-and-ui.md`
- Create: a dated `docs/agent-notes/yyyy-MM-dd-HHmm-bms-completion-mobile-responsive.md` task note generated at implementation time in Asia/Jakarta.

**Interfaces:**

- Consumes: a local report in `REVIEW_REJECTED_REVISION` with at least one damaged item and permission to open the BMS completion route.
- Produces: repeatable responsive QA evidence and a task note that records actual results without production data.

- [ ] **Step 1: Start the application for manual QA**

Run:

```powershell
npm run dev
```

Expected: Next.js reports the local server ready on port 3001 with no compile error when the completion route is loaded.

- [ ] **Step 2: Exercise every overflow-sensitive state**

At widths 320, 360, 390, and 430 CSS pixels, repeat in portrait and landscape:

1. Open a `REVIEW_REJECTED_REVISION` completion form.
2. Add at least eight photos to selfie, nota, every toko material, before/after item where editable, and documentation tambahan.
3. Expand every damaged item.
4. Open the three-dot menu; run Edit and Hapus on disposable local draft data.
5. In Edit, focus every input, open the unit Select, scroll the dialog with the virtual keyboard visible, save, reopen, and cancel.
6. Preview and remove photos, add a second toko, and verify long store/material names.
7. Confirm header and submit footer remain fully visible and clickable.

At each significant state run in DevTools:

```js
console.assert(
  document.documentElement.scrollWidth <= window.innerWidth + 1,
  {
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  },
);
```

Expected: no assertion failure, no page-level horizontal scrollbar, no per-character text wrapping, gallery grows vertically, and overlays remain inside the viewport.

- [ ] **Step 3: Check desktop regression**

At 768 and 1280 CSS pixels, load the same route, open menu/dialog/photo preview, and submit only if using an explicitly disposable test report.

Expected: content remains capped by `max-w-lg`, dropdown aligns to its trigger, dialog is centered, and no content is clipped.

- [ ] **Step 4: Write the required task note with actual evidence**

In the same PowerShell session, compute and print the exact target path:

```powershell
$taskNoteTimestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$taskNotePath = "docs/agent-notes/$taskNoteTimestamp-bms-completion-mobile-responsive.md"
$taskNotePath
```

Use `apply_patch` to create the printed `$taskNotePath` with the headings from `docs/agent-notes/TEMPLATE.md`. Record exact changed files, decisions, automated command results, each tested viewport, and any environment limitation. Do not include report numbers, user names, photos, production records, or other personal data.

- [ ] **Step 5: Validate documentation and repository policy**

Run:

```powershell
git diff --check
npm run check:agent-note
```

Expected: both commands exit 0 and the checker identifies the dated task note for the substantive changes.

- [ ] **Step 6: Commit docs and final verification evidence**

```powershell
git add -- "docs/project/05-routes-and-ui.md"
git add -- $taskNotePath
git commit -m "docs: record completion mobile fix"
```

Expected: commit succeeds through the repository pre-commit hook; do not use `--no-verify`.

## Rollback Boundary

If visual verification finds a regression, revert only the task commit that introduced it. No database migration, persisted-state transformation, API contract change, or production cleanup is part of this plan, so rollback is limited to frontend source and documentation.
