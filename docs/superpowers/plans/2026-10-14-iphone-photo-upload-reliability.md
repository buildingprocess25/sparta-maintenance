# iPhone Photo Upload Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat upload foto di alur Mulai Pekerjaan dan Penyelesaian tahan terhadap kegagalan khas iPhone (Safari/WebKit), dan membuat setiap kegagalan menampilkan penyebab aslinya.

**Architecture:** Logika upload dipindah ke modul murni `lib/photo-upload/` (tanpa React) supaya bisa dites dengan `npx tsx`: klasifikasi error + retry (usulan 1–2), "materialisasi" file dari IndexedDB ke memori sebelum upload (usulan 3), dan registry upload langsung (eager) dengan status per foto yang disimpan di localStorage (usulan 4). Hook React tipis (`useEagerPhotoUploads`) dan React context (`PhotoUploadStatusProvider`) menghubungkan registry ke UI tanpa prop drilling. IndexedDB tetap dipakai sebagai antrean cadangan (hybrid): foto yang gagal di-upload saat diambil akan dicoba lagi otomatis saat submit.

**Tech Stack:** Next.js 16 App Router, React 19 (`useSyncExternalStore`), TypeScript 5, sonner (toast), lucide-react, shadcn/ui `Button`, `browser-image-compression@2.0.2`, test runner `npx tsx` + `node:assert/strict`.

## Global Constraints

- Kontrak server `/api/photos/upload` TIDAK berubah: multipart `file` + `context` (JSON), respons sukses `{ url, fileId }`, error `{ error }`, batas 4 MB, MIME `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
- Semua copy UI dan pesan toast dalam Bahasa Indonesia.
- Ikuti `AI_RULES.md`: pakai komponen shadcn/ui (`@/components/ui/button`) dulu; jangan menambah padding/margin/gap manual pada komponen shadcn — spacing hanya di wrapper `div`.
- Test memakai pola repo: file `*.spec.ts` dijalankan dengan `npx tsx <path>`, assertion dari `node:assert/strict`. Jangan menambah dependency test baru.
- Modul di `lib/photo-upload/*.ts` harus murni (tanpa `"use client"`, tanpa React, tanpa `window` di top-level) agar bisa diimpor oleh `npx tsx`.
- Setiap commit WAJIB ikut men-stage task note `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` (pre-commit hook `scripts/check-agent-task-note.mjs` memblokir commit tanpa itu). Plan ini memakai satu note yang dibuat di Task 1 dan diperbarui di setiap task berikutnya.
- Foto toko material (`START_MATERIAL_STORE`) TIDAK di-upload saat diambil, karena konteksnya wajib berisi `name` dan `city` yang bisa diisi/diubah setelah foto diambil. Foto ini tetap di-upload saat submit (tetap mendapat manfaat usulan 1–3).
- Versi draft localStorage tidak berubah (Penyelesaian `version: 3`, Mulai Kerja `version: 2`). Status upload eager disimpan di key terpisah `sparta-eager-uploads-<reportNumber>`.
- Di luar scope: bug di `components/ui/camera-modal.tsx`, race condition di `app/reports/(bms)/create/hooks/use-photo-upload.ts`, dan pembersihan file Drive yatim (foto yang sudah ter-upload lalu dihapus user).
- Akhiri setiap pesan commit dengan baris:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## File Structure

| File | Status | Tanggung jawab |
| --- | --- | --- |
| `lib/photo-upload/upload-failure.ts` | Create | Tipe `PhotoUploadFailure`/`PhotoUploadOutcome`, aturan retry, teks penjelasan error (Bahasa Indonesia). |
| `lib/photo-upload/upload-photo-request.ts` | Create | Satu-satunya tempat yang memanggil `fetch("/api/photos/upload")`, dengan retry + backoff. |
| `lib/photo-upload/materialize-photo.ts` | Create | Membaca isi foto (IndexedDB / File / blob URL) ke `ArrayBuffer` lalu membuat `File` baru yang berbasis memori. |
| `lib/photo-upload/eager-upload-registry.ts` | Create | Registry status upload per foto (uploading/uploaded/failed), dedup request in-flight, persist ke store. |
| `lib/photo-upload/compress-photo.ts` | Create | Kompresi foto galeri tanpa web worker. |
| `lib/hooks/use-eager-photo-uploads.ts` | Create | Hook React: membuat registry per laporan, subscribe status, toast saat gagal. |
| `components/photo-upload-status.tsx` | Create | Context provider + overlay status per foto (spinner / centang / tombol "Ulangi"). |
| `lib/hooks/use-photo-upload.ts` | Modify (Task 2), Delete (Task 7) | Hook lama; sementara memakai `uploadPhotoRequest`, lalu dihapus setelah semua caller pindah ke registry. |
| `lib/hooks/use-photo-upload.spec.ts` | Modify | Assertion kontrak upload dipindah ke `upload-photo-request.ts`. |
| `app/reports/[reportNumber]/completion/use-completion-work-form.ts` | Modify | Submit Penyelesaian memakai outcome/materialize/registry; upload eager saat capture. |
| `app/reports/[reportNumber]/completion/hooks/use-completion-autosave.ts` | Modify | `addPhoto` tidak gagal kalau IndexedDB gagal; restore memakai URL yang sudah ter-upload sebagai cadangan. |
| `app/reports/[reportNumber]/completion/completion-client.tsx` | Modify | Bungkus halaman dengan `PhotoUploadStatusProvider`. |
| `app/reports/[reportNumber]/completion/components/photo-strip.tsx` | Modify | Render `PhotoUploadStatusOverlay`. |
| `app/reports/[reportNumber]/start/start-work-client.tsx` | Modify | Sama seperti Penyelesaian untuk alur Mulai Pekerjaan + PhotoStrip lokal + kompresi galeri. |
| `app/reports/[reportNumber]/start/use-start-work-autosave.ts` | Modify | `file` jadi opsional, `addPhoto` toleran, restore dengan URL cadangan. |
| `docs/project/04-workflows.md`, `docs/project/09-testing-and-verification.md` | Modify | Dokumentasi perilaku baru dan command test. |

---

### Task 1: Upload outcome, error description, and retrying request (usulan 1 + 2, logika murni)

**Files:**
- Create: `lib/photo-upload/upload-failure.ts`
- Create: `lib/photo-upload/upload-photo-request.ts`
- Test: `lib/photo-upload/upload-failure.spec.ts`
- Test: `lib/photo-upload/upload-photo-request.spec.ts`
- Create: `docs/agent-notes/2026-10-14-HHMM-iphone-photo-upload-reliability.md` (ganti `HHMM` dengan jam WIB saat file dibuat, misal `1530`; pakai nama file yang sama di semua task berikutnya)

**Interfaces:**
- Consumes: `PhotoUploadContext` dari `@/lib/google-drive/photo-upload-context` (tipe saja).
- Produces:
  - `type PhotoUploadFailure = { kind: "network"; detail: string } | { kind: "http"; status: number; serverMessage: string | null } | { kind: "invalid-response"; status: number } | { kind: "local-file"; detail: string }`
  - `type PhotoUploadOutcome = { ok: true; url: string; fileId: string } | { ok: false; failure: PhotoUploadFailure }`
  - `isRetryableFailure(failure: PhotoUploadFailure): boolean`
  - `describePhotoUploadFailure(failure: PhotoUploadFailure): string`
  - `errorDetail(error: unknown): string`
  - `uploadPhotoRequest(file: File, context: PhotoUploadContext, deps?: UploadPhotoRequestDeps): Promise<PhotoUploadOutcome>` — tidak pernah throw.
  - `type UploadPhotoRequestDeps = { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; retryDelaysMs?: readonly number[] }`
  - `PHOTO_UPLOAD_ENDPOINT = "/api/photos/upload"`, `DEFAULT_RETRY_DELAYS_MS = [1000, 2000]`

- [ ] **Step 1: Write the failing test for failure helpers**

Create `lib/photo-upload/upload-failure.spec.ts`:

```ts
import assert from "node:assert/strict";

import {
  describePhotoUploadFailure,
  errorDetail,
  isRetryableFailure,
} from "./upload-failure";

assert.equal(isRetryableFailure({ kind: "network", detail: "Load failed" }), true);
for (const status of [408, 429, 500, 502, 504]) {
  assert.equal(
    isRetryableFailure({ kind: "http", status, serverMessage: null }),
    true,
    `HTTP ${status} must be retried`,
  );
}
for (const status of [400, 401, 403, 404, 409, 413, 422, 503]) {
  assert.equal(
    isRetryableFailure({ kind: "http", status, serverMessage: null }),
    false,
    `HTTP ${status} must not be retried`,
  );
}
assert.equal(isRetryableFailure({ kind: "invalid-response", status: 200 }), false);
assert.equal(isRetryableFailure({ kind: "local-file", detail: "x" }), false);

assert.match(
  describePhotoUploadFailure({ kind: "network", detail: "Load failed" }),
  /Koneksi terputus.*Load failed/,
);
assert.match(
  describePhotoUploadFailure({ kind: "local-file", detail: "WebKitBlobResource error 1" }),
  /tidak dapat dibaca.*WebKitBlobResource error 1.*ambil ulang/,
);
assert.match(
  describePhotoUploadFailure({ kind: "http", status: 401, serverMessage: "Unauthenticated" }),
  /Sesi login sudah berakhir/,
);
assert.match(
  describePhotoUploadFailure({ kind: "http", status: 422, serverMessage: "Status laporan tidak sesuai untuk upload foto ini" }),
  /Status laporan sudah berubah: Status laporan tidak sesuai/,
);
assert.equal(
  describePhotoUploadFailure({ kind: "http", status: 503, serverMessage: "Sedang maintenance" }),
  "Sedang maintenance",
);
assert.equal(
  describePhotoUploadFailure({ kind: "http", status: 400, serverMessage: "File too large. Maximum size: 4 MB" }),
  "Server menolak foto (HTTP 400): File too large. Maximum size: 4 MB.",
);
assert.equal(
  describePhotoUploadFailure({ kind: "http", status: 500, serverMessage: null }),
  "Server menolak foto (HTTP 500).",
);
assert.match(
  describePhotoUploadFailure({ kind: "invalid-response", status: 200 }),
  /Respons server tidak valid \(HTTP 200\)/,
);

assert.equal(errorDetail(new TypeError("Load failed")), "Load failed");
assert.equal(errorDetail(new Error("")), "Error");
assert.equal(errorDetail("boom"), "boom");

console.log("upload failure helper assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/photo-upload/upload-failure.spec.ts`
Expected: FAIL — `Cannot find module './upload-failure'` (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Implement `upload-failure.ts`**

Create `lib/photo-upload/upload-failure.ts`:

```ts
export type PhotoUploadFailure =
  | { kind: "network"; detail: string }
  | { kind: "http"; status: number; serverMessage: string | null }
  | { kind: "invalid-response"; status: number }
  | { kind: "local-file"; detail: string };

export type PhotoUploadOutcome =
  | { ok: true; url: string; fileId: string }
  | { ok: false; failure: PhotoUploadFailure };

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 504]);

/**
 * Network failures (including iOS "Load failed") and transient server errors
 * are retried. 503 is excluded because the proxy uses it for maintenance mode.
 */
export function isRetryableFailure(failure: PhotoUploadFailure): boolean {
  if (failure.kind === "network") return true;
  if (failure.kind === "http") return RETRYABLE_HTTP_STATUSES.has(failure.status);
  return false;
}

export function describePhotoUploadFailure(failure: PhotoUploadFailure): string {
  switch (failure.kind) {
    case "network":
      return `Koneksi terputus saat mengunggah (${failure.detail}). Pastikan sinyal stabil dan jangan pindah aplikasi selama proses upload, lalu coba lagi.`;
    case "local-file":
      return `Foto yang tersimpan di HP tidak dapat dibaca (${failure.detail}). Hapus foto ini lalu ambil ulang.`;
    case "invalid-response":
      return `Respons server tidak valid (HTTP ${failure.status}). Coba lagi beberapa saat lagi.`;
    case "http":
      return describeHttpFailure(failure.status, failure.serverMessage);
  }
}

function describeHttpFailure(status: number, serverMessage: string | null): string {
  const suffix = serverMessage ? `: ${serverMessage}` : "";
  if (status === 401) {
    return "Sesi login sudah berakhir. Silakan login ulang lalu kirim kembali.";
  }
  if (status === 413) {
    return "Ukuran foto terlalu besar. Ambil ulang foto lalu coba lagi.";
  }
  if (status === 422) {
    return `Status laporan sudah berubah${suffix}. Muat ulang halaman.`;
  }
  if (status === 503) {
    return serverMessage ?? "Aplikasi sedang dalam pemeliharaan. Coba lagi nanti.";
  }
  return `Server menolak foto (HTTP ${status})${suffix}.`;
}

export function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/photo-upload/upload-failure.spec.ts`
Expected: PASS — prints `upload failure helper assertions passed`.

- [ ] **Step 5: Write the failing test for the request helper**

Create `lib/photo-upload/upload-photo-request.spec.ts`:

```ts
import assert from "node:assert/strict";

import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import {
  DEFAULT_RETRY_DELAYS_MS,
  PHOTO_UPLOAD_ENDPOINT,
  uploadPhotoRequest,
} from "./upload-photo-request";

type Call = { url: string; init: RequestInit | undefined };

function fakeFetch(responses: Array<Response | Error>) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra fetch call");
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { impl, calls };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function recorder() {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => void delays.push(ms) };
}

const context: PhotoUploadContext = {
  kind: "COMPLETION_RESULT",
  reportNumber: "Q001-2610-001",
  itemId: "A15",
};
const file = new File(["jpeg-bytes"], "photo.jpg", { type: "image/jpeg" });

async function run() {
  assert.deepEqual([...DEFAULT_RETRY_DELAYS_MS], [1000, 2000]);

  // 1. Success on first attempt sends multipart file + context.
  {
    const fetcher = fakeFetch([json({ url: "/api/photos/abc", fileId: "abc" }, 200)]);
    const { delays, sleep } = recorder();
    const outcome = await uploadPhotoRequest(file, context, { fetchImpl: fetcher.impl, sleep });
    assert.deepEqual(outcome, { ok: true, url: "/api/photos/abc", fileId: "abc" });
    assert.equal(fetcher.calls.length, 1);
    assert.equal(fetcher.calls[0].url, PHOTO_UPLOAD_ENDPOINT);
    assert.equal(fetcher.calls[0].init?.method, "POST");
    const form = fetcher.calls[0].init?.body as FormData;
    assert.equal(form.get("context"), JSON.stringify(context));
    assert.ok(form.get("file") instanceof File);
    assert.deepEqual(delays, []);
  }

  // 2. Network error (iOS "Load failed") is retried, then succeeds.
  {
    const fetcher = fakeFetch([
      new TypeError("Load failed"),
      json({ url: "/api/photos/def", fileId: "def" }, 200),
    ]);
    const { delays, sleep } = recorder();
    const outcome = await uploadPhotoRequest(file, context, { fetchImpl: fetcher.impl, sleep });
    assert.deepEqual(outcome, { ok: true, url: "/api/photos/def", fileId: "def" });
    assert.equal(fetcher.calls.length, 2);
    assert.deepEqual(delays, [1000]);
  }

  // 3. 401 is not retried and keeps the server message.
  {
    const fetcher = fakeFetch([json({ error: "Unauthenticated" }, 401)]);
    const { delays, sleep } = recorder();
    const outcome = await uploadPhotoRequest(file, context, { fetchImpl: fetcher.impl, sleep });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "http", status: 401, serverMessage: "Unauthenticated" },
    });
    assert.equal(fetcher.calls.length, 1);
    assert.deepEqual(delays, []);
  }

  // 4. Persistent 500 gives up after 3 attempts with backoff 1000, 2000.
  {
    const fetcher = fakeFetch([
      json({ error: "Failed to upload photo" }, 500),
      json({ error: "Failed to upload photo" }, 500),
      json({ error: "Failed to upload photo" }, 500),
    ]);
    const { delays, sleep } = recorder();
    const outcome = await uploadPhotoRequest(file, context, { fetchImpl: fetcher.impl, sleep });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "http", status: 500, serverMessage: "Failed to upload photo" },
    });
    assert.equal(fetcher.calls.length, 3);
    assert.deepEqual(delays, [1000, 2000]);
  }

  // 5. 200 with a non-JSON body is an invalid response, not retried.
  {
    const fetcher = fakeFetch([new Response("<html>login</html>", { status: 200 })]);
    const { sleep } = recorder();
    const outcome = await uploadPhotoRequest(file, context, { fetchImpl: fetcher.impl, sleep });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "invalid-response", status: 200 },
    });
    assert.equal(fetcher.calls.length, 1);
  }

  // 6. A non-JSON error body still yields an http failure with null message.
  {
    const fetcher = fakeFetch([new Response("Bad Gateway", { status: 502 })]);
    const { sleep } = recorder();
    const outcome = await uploadPhotoRequest(file, context, {
      fetchImpl: fetcher.impl,
      sleep,
      retryDelaysMs: [],
    });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "http", status: 502, serverMessage: null },
    });
  }

  console.log("upload photo request assertions passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx tsx lib/photo-upload/upload-photo-request.spec.ts`
Expected: FAIL — `Cannot find module './upload-photo-request'`.

- [ ] **Step 7: Implement `upload-photo-request.ts`**

Create `lib/photo-upload/upload-photo-request.ts`:

```ts
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import {
  errorDetail,
  isRetryableFailure,
  type PhotoUploadOutcome,
} from "./upload-failure";

export const PHOTO_UPLOAD_ENDPOINT = "/api/photos/upload";
export const DEFAULT_RETRY_DELAYS_MS = [1000, 2000] as const;

export type UploadPhotoRequestDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  retryDelaysMs?: readonly number[];
};

/**
 * Uploads one photo to the Drive CDN endpoint. Never throws: every failure is
 * returned as a typed outcome so callers can show the real cause to the user.
 * Retryable failures are attempted again after each delay in `retryDelaysMs`.
 */
export async function uploadPhotoRequest(
  file: File,
  context: PhotoUploadContext,
  deps: UploadPhotoRequestDeps = {},
): Promise<PhotoUploadOutcome> {
  // Wrap fetch so it is never invoked with a foreign `this` (Illegal invocation).
  const fetchImpl: typeof fetch = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const sleep = deps.sleep ?? defaultSleep;
  const retryDelaysMs = deps.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  let outcome = await attemptUpload(file, context, fetchImpl);
  for (const delay of retryDelaysMs) {
    if (outcome.ok || !isRetryableFailure(outcome.failure)) return outcome;
    await sleep(delay);
    outcome = await attemptUpload(file, context, fetchImpl);
  }
  return outcome;
}

async function attemptUpload(
  file: File,
  context: PhotoUploadContext,
  fetchImpl: typeof fetch,
): Promise<PhotoUploadOutcome> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("context", JSON.stringify(context));

  let response: Response;
  try {
    response = await fetchImpl(PHOTO_UPLOAD_ENDPOINT, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    return { ok: false, failure: { kind: "network", detail: errorDetail(error) } };
  }

  const body = await readJsonBody(response);
  if (!response.ok) {
    return {
      ok: false,
      failure: {
        kind: "http",
        status: response.status,
        serverMessage: typeof body?.error === "string" ? body.error : null,
      },
    };
  }

  const url = body?.url;
  const fileId = body?.fileId;
  if (typeof url !== "string" || typeof fileId !== "string" || !url || !fileId) {
    return { ok: false, failure: { kind: "invalid-response", status: response.status } };
  }

  return { ok: true, url, fileId };
}

async function readJsonBody(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 8: Run both tests to verify they pass**

Run: `npx tsx lib/photo-upload/upload-failure.spec.ts; npx tsx lib/photo-upload/upload-photo-request.spec.ts`
Expected: PASS — prints `upload failure helper assertions passed` and `upload photo request assertions passed`.

- [ ] **Step 9: Type-check and lint**

Run: `npx tsc --noEmit; npx eslint lib/photo-upload`
Expected: no errors.

- [ ] **Step 10: Create the task note**

Create `docs/agent-notes/2026-10-14-HHMM-iphone-photo-upload-reliability.md` (ganti `HHMM` dengan jam WIB saat ini):

```markdown
# iPhone photo upload reliability

## Scope

Usulan 1–4 untuk keluhan upload foto BMS pengguna iPhone di alur Mulai
Pekerjaan dan Penyelesaian: penyebab error asli di toast, retry otomatis,
materialisasi file IndexedDB sebelum upload, dan upload eager saat foto
diambil dengan IndexedDB sebagai antrean cadangan. Di luar scope: bug
camera-modal, race di form create, pembersihan file Drive yatim.

## Context and Sources

- Plan: `docs/superpowers/plans/2026-10-14-iphone-photo-upload-reliability.md`
- Screenshot user: toast "Gagal mengunggah foto sesudah untuk item ..." saat submit Penyelesaian.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`, `lib/hooks/use-photo-upload.ts`, `app/api/photos/upload/handler.ts`.

## Changed Files

- `lib/photo-upload/upload-failure.ts`: tipe outcome/failure, aturan retry, teks error.
- `lib/photo-upload/upload-photo-request.ts`: request upload dengan retry + backoff.

## Decisions

- Retry untuk error jaringan dan HTTP 408/429/500/502/504; 503 tidak di-retry karena dipakai mode maintenance.

## Verification

- `npx tsx lib/photo-upload/upload-failure.spec.ts` — pass.
- `npx tsx lib/photo-upload/upload-photo-request.spec.ts` — pass.

## Remaining Work and Risks

- Task 2–9 di plan belum dikerjakan.
```

- [ ] **Step 11: Commit**

```bash
git add lib/photo-upload/upload-failure.ts lib/photo-upload/upload-failure.spec.ts lib/photo-upload/upload-photo-request.ts lib/photo-upload/upload-photo-request.spec.ts docs/agent-notes/
git commit -m "feat(photos): add typed upload outcome with retry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Show the real failure cause on submit (usulan 1 + 2 live)

**Files:**
- Modify: `lib/hooks/use-photo-upload.ts` (seluruh file)
- Modify: `lib/hooks/use-photo-upload.spec.ts:4,19-23`
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts` (imports, `uploadPhotos` di dalam `handleSubmit`, ~baris 503-544)
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx` (imports, `handleSubmit` ~baris 375-452)
- Modify: task note

**Interfaces:**
- Consumes: `uploadPhotoRequest`, `PhotoUploadOutcome`, `PhotoUploadFailure`, `describePhotoUploadFailure` (Task 1).
- Produces: `usePhotoUpload(): { uploadPhoto(file: File, context: PhotoUploadContext): Promise<PhotoUploadOutcome>; isUploading: boolean }` (sebelumnya mengembalikan `PhotoUploadResult | null`). Fungsi lokal `uploadLocalPhoto(photo, context): Promise<PhotoUploadOutcome>` di dalam `handleSubmit` kedua alur — Task 3 dan Task 6/7 hanya mengganti isi fungsi ini.

- [ ] **Step 1: Update the contract spec so it points at the new request module (failing)**

Di `lib/hooks/use-photo-upload.spec.ts`, ganti baris 4:

```ts
const sharedHook = readFileSync("lib/hooks/use-photo-upload.ts", "utf8");
```

menjadi:

```ts
const sharedHook = readFileSync("lib/hooks/use-photo-upload.ts", "utf8");
const uploadRequest = readFileSync("lib/photo-upload/upload-photo-request.ts", "utf8");
```

dan ganti blok assertion:

```ts
assert.match(
  sharedHook,
  /formData\.append\("context", JSON\.stringify\(context\)\)/,
);
assert.doesNotMatch(sharedHook, /branchName/);
```

menjadi:

```ts
assert.match(
  uploadRequest,
  /formData\.append\("context", JSON\.stringify\(context\)\)/,
);
assert.doesNotMatch(uploadRequest, /branchName/);
assert.match(sharedHook, /uploadPhotoRequest\(file, context\)/);
assert.match(completionHook, /describePhotoUploadFailure\(/);
assert.match(startWorkClient, /describePhotoUploadFailure\(/);
```

- [ ] **Step 2: Run spec to verify it fails**

Run: `npx tsx lib/hooks/use-photo-upload.spec.ts`
Expected: FAIL — `AssertionError` karena `sharedHook` belum memanggil `uploadPhotoRequest(file, context)`.

- [ ] **Step 3: Rewrite `lib/hooks/use-photo-upload.ts`**

Ganti seluruh isi file:

```ts
"use client";

import { useState } from "react";
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import type { PhotoUploadOutcome } from "@/lib/photo-upload/upload-failure";
import { uploadPhotoRequest } from "@/lib/photo-upload/upload-photo-request";

/**
 * React hook for uploading photos to Google Drive CDN.
 * Returns a typed outcome so callers can show the real failure cause.
 */
export function usePhotoUpload() {
    const [isUploading, setIsUploading] = useState(false);

    const uploadPhoto = async (
        file: File,
        context: PhotoUploadContext,
    ): Promise<PhotoUploadOutcome> => {
        setIsUploading(true);
        try {
            const outcome = await uploadPhotoRequest(file, context);
            if (!outcome.ok) {
                console.error("[usePhotoUpload] Upload failed:", outcome.failure);
            }
            return outcome;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        uploadPhoto,
        isUploading,
    };
}
```

- [ ] **Step 4: Update the completion submit**

Di `app/reports/[reportNumber]/completion/use-completion-work-form.ts`, tambahkan import (setelah import `PhotoUploadContext` yang sudah ada):

```ts
import {
  describePhotoUploadFailure,
  type PhotoUploadFailure,
  type PhotoUploadOutcome,
} from "@/lib/photo-upload/upload-failure";
```

Lalu di dalam `handleSubmit`, ganti seluruh definisi `const uploadPhotos = async (...) => { ... };` (dari `const uploadPhotos = async (` sampai `return { urls, fileIds };\n      };`) dengan:

```ts
      const failUpload = (errorMessage: string, failure: PhotoUploadFailure) => {
        toast.error(errorMessage, {
          id: loadingId,
          description: describePhotoUploadFailure(failure),
        });
      };

      const uploadLocalPhoto = async (
        photo: LocalPhoto,
        context: PhotoUploadContext,
      ): Promise<PhotoUploadOutcome> => {
        const file = await autosave.getPhotoFile(photo.id);
        if (!file) {
          return {
            ok: false,
            failure: {
              kind: "local-file",
              detail: "foto tidak ditemukan di penyimpanan HP",
            },
          };
        }
        return uploadPhoto(file, context);
      };

      const uploadPhotos = async (
        photos: LocalPhoto[],
        errorMessage: string,
        getContext: (photo: LocalPhoto, index: number) => PhotoUploadContext,
      ) => {
        const urls: string[] = [];
        const fileIds: string[] = [];

        for (const [index, photo] of photos.entries()) {
          if (photo.id.startsWith("remote-") && photo.previewUrl) {
            urls.push(photo.previewUrl);
            continue;
          }

          const result = await uploadLocalPhoto(photo, getContext(photo, index));
          if (!result.ok) {
            failUpload(errorMessage, result.failure);
            return null;
          }

          urls.push(result.url);
          fileIds.push(result.fileId);
        }

        return { urls, fileIds };
      };
```

- [ ] **Step 5: Update the start-work submit**

Di `app/reports/[reportNumber]/start/start-work-client.tsx`, tambahkan import:

```ts
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import {
  describePhotoUploadFailure,
  type PhotoUploadFailure,
  type PhotoUploadOutcome,
} from "@/lib/photo-upload/upload-failure";
```

Pastikan `StartWorkLocalPhoto` sudah diimpor dari `./use-start-work-autosave` (cari `StartWorkLocalPhoto` di blok import; kalau belum ada, tambahkan `type StartWorkLocalPhoto` ke import tersebut).

Di dalam `handleSubmit`, ganti bagian mulai dari `startTransition(async () => {` sampai akhir blok `if (allStorePhotosUploadFailed) { ... return; }` dengan:

```ts
    startTransition(async () => {
      const loadingId = toast.loading(
        "Mengunggah foto dan memulai pekerjaan...",
      );
      const failUpload = (title: string, failure: PhotoUploadFailure) => {
        toast.dismiss(loadingId);
        toast.error(title, { description: describePhotoUploadFailure(failure) });
      };
      const uploadLocalPhoto = (
        photo: StartWorkLocalPhoto,
        context: PhotoUploadContext,
      ): Promise<PhotoUploadOutcome> => uploadPhoto(photo.file, context);

      const selfiePhotosToUpload = skipPhotos ? [] : selfiePhotos;
      const receiptPhotosToUpload = skipPhotos ? [] : receiptPhotos;
      const uploadedSelfieUrls: string[] = [];
      const uploadedSelfieFileIds: string[] = [];
      for (const photo of selfiePhotosToUpload) {
        const result = await uploadLocalPhoto(photo, {
          kind: "START_SELFIE",
          reportNumber,
        });
        if (!result.ok) {
          failUpload("Gagal mengunggah foto selfie", result.failure);
          return;
        }
        uploadedSelfieUrls.push(result.url);
        uploadedSelfieFileIds.push(result.fileId);
      }

      const uploadedReceiptUrls: string[] = [];
      const uploadedReceiptFileIds: string[] = [];
      for (const photo of receiptPhotosToUpload) {
        const result = await uploadLocalPhoto(photo, {
          kind: "START_RECEIPT",
          reportNumber,
        });
        if (!result.ok) {
          failUpload("Gagal mengunggah foto nota", result.failure);
          return;
        }
        uploadedReceiptUrls.push(result.url);
        uploadedReceiptFileIds.push(result.fileId);
      }

      const storeUploadFailures: PhotoUploadFailure[] = [];
      const uploadedStoreFileIds: string[] = [];
      const finalizedStores = skipPhotos
        ? []
        : await Promise.all(
            materialStores.map(async (store) => {
              const urls: string[] = [];
              const storeIndex = materialStores.findIndex(
                (candidate) => candidate.id === store.id,
              );
              for (const photo of store.photos) {
                const result = await uploadLocalPhoto(photo, {
                  kind: "START_MATERIAL_STORE",
                  reportNumber,
                  entryId: store.id,
                  index: storeIndex,
                  name: store.name,
                  city: store.city,
                });
                if (!result.ok) {
                  storeUploadFailures.push(result.failure);
                  continue;
                }
                urls.push(result.url);
                uploadedStoreFileIds.push(result.fileId);
              }
              return {
                name: store.name.trim(),
                city: store.city.trim(),
                ...(urls.length > 0 ? { photoUrls: urls } : {}),
              };
            }),
          );

      if (storeUploadFailures.length > 0) {
        failUpload("Gagal mengunggah foto toko material", storeUploadFailures[0]);
        return;
      }
```

Sisa `handleSubmit` (panggilan `startWorkWithPhotos(...)` dan seterusnya) tidak berubah.

- [ ] **Step 6: Run spec, type-check, lint**

Run: `npx tsx lib/hooks/use-photo-upload.spec.ts; npx tsc --noEmit; npx eslint lib/hooks/use-photo-upload.ts "app/reports/[reportNumber]/completion/use-completion-work-form.ts" "app/reports/[reportNumber]/start/start-work-client.tsx"`
Expected: spec selesai tanpa output error (exit 0), `tsc` dan `eslint` tanpa error.

- [ ] **Step 7: Update the task note**

Tambahkan di `## Changed Files`:

```markdown
- `lib/hooks/use-photo-upload.ts`: memakai `uploadPhotoRequest` dan mengembalikan outcome bertipe.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`, `app/reports/[reportNumber]/start/start-work-client.tsx`: toast error submit kini memuat penyebab asli lewat `describePhotoUploadFailure`.
```

dan di `## Verification`: `- npx tsx lib/hooks/use-photo-upload.spec.ts — pass.`

- [ ] **Step 8: Commit**

```bash
git add lib/hooks/use-photo-upload.ts lib/hooks/use-photo-upload.spec.ts "app/reports/[reportNumber]/completion/use-completion-work-form.ts" "app/reports/[reportNumber]/start/start-work-client.tsx" docs/agent-notes/
git commit -m "fix(photos): show real upload failure cause on submit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Materialize local photos before upload (usulan 3)

**Files:**
- Create: `lib/photo-upload/materialize-photo.ts`
- Test: `lib/photo-upload/materialize-photo.spec.ts`
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts` (isi `uploadLocalPhoto` dari Task 2)
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx` (isi `uploadLocalPhoto` dari Task 2)
- Modify: task note

**Interfaces:**
- Consumes: `PhotoUploadFailure`, `errorDetail` (Task 1).
- Produces:
  - `type MaterializeOutcome = { ok: true; file: File } | { ok: false; failure: PhotoUploadFailure }`
  - `type MaterializePhotoSources = { loadStored: () => Promise<Blob | null>; fallbackUrl?: string; fileName?: string; fetchImpl?: typeof fetch }`
  - `materializePhotoFile(sources: MaterializePhotoSources): Promise<MaterializeOutcome>` — tidak pernah throw. Kegagalan selalu `kind: "local-file"`.

- [ ] **Step 1: Write the failing test**

Create `lib/photo-upload/materialize-photo.spec.ts`:

```ts
import assert from "node:assert/strict";

import { materializePhotoFile } from "./materialize-photo";

function brokenBlob(message: string): Blob {
  const blob = new Blob(["x"], { type: "image/jpeg" });
  Object.defineProperty(blob, "arrayBuffer", {
    value: async () => {
      throw new Error(message);
    },
  });
  return blob;
}

const neverFetch = (async () => {
  throw new Error("fetch must not be called");
}) as typeof fetch;

async function run() {
  // 1. Stored file is copied into a new memory-backed File with same bytes.
  {
    const stored = new File(["hello"], "after.jpg", { type: "image/jpeg" });
    const outcome = await materializePhotoFile({
      loadStored: async () => stored,
      fetchImpl: neverFetch,
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.notEqual(outcome.file, stored);
    assert.equal(outcome.file.name, "after.jpg");
    assert.equal(outcome.file.type, "image/jpeg");
    assert.equal(await outcome.file.text(), "hello");
  }

  // 2. Missing MIME type falls back to image/jpeg; plain Blob gets photo.jpg.
  {
    const outcome = await materializePhotoFile({
      loadStored: async () => new Blob(["abc"]),
      fetchImpl: neverFetch,
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.file.type, "image/jpeg");
    assert.equal(outcome.file.name, "photo.jpg");
  }

  // 3. Unreadable stored blob (WebKit) falls back to the blob: preview URL.
  {
    const fetchCalls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      fetchCalls.push(String(input));
      return new Response(new Blob(["from-memory"], { type: "image/jpeg" }));
    }) as typeof fetch;
    const outcome = await materializePhotoFile({
      loadStored: async () => brokenBlob("WebKitBlobResource error 1"),
      fallbackUrl: "blob:https://app/123",
      fetchImpl,
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.deepEqual(fetchCalls, ["blob:https://app/123"]);
    assert.equal(await outcome.file.text(), "from-memory");
  }

  // 4. loadStored rejecting (IndexedDB connection lost) also falls back.
  {
    const fetchImpl = (async () =>
      new Response(new Blob(["ok"], { type: "image/jpeg" }))) as typeof fetch;
    const outcome = await materializePhotoFile({
      loadStored: async () => {
        throw new Error("Connection to Indexed Database server lost");
      },
      fallbackUrl: "blob:https://app/456",
      fetchImpl,
    });
    assert.equal(outcome.ok, true);
  }

  // 5. Non-blob fallback URL is never fetched; failure keeps last error detail.
  {
    const outcome = await materializePhotoFile({
      loadStored: async () => brokenBlob("WebKitBlobResource error 1"),
      fallbackUrl: "/api/photos/abc",
      fetchImpl: neverFetch,
    });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "local-file", detail: "WebKitBlobResource error 1" },
    });
  }

  // 6. Nothing stored and no fallback.
  {
    const outcome = await materializePhotoFile({
      loadStored: async () => null,
      fetchImpl: neverFetch,
    });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "local-file", detail: "foto tidak ditemukan di penyimpanan HP" },
    });
  }

  // 7. Empty blob is treated as unreadable.
  {
    const outcome = await materializePhotoFile({
      loadStored: async () => new Blob([], { type: "image/jpeg" }),
      fetchImpl: neverFetch,
    });
    assert.deepEqual(outcome, {
      ok: false,
      failure: { kind: "local-file", detail: "file foto kosong" },
    });
  }

  console.log("materialize photo assertions passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/photo-upload/materialize-photo.spec.ts`
Expected: FAIL — `Cannot find module './materialize-photo'`.

- [ ] **Step 3: Implement `materialize-photo.ts`**

Create `lib/photo-upload/materialize-photo.ts`:

```ts
import { errorDetail, type PhotoUploadFailure } from "./upload-failure";

export type MaterializeOutcome =
  | { ok: true; file: File }
  | { ok: false; failure: PhotoUploadFailure };

export type MaterializePhotoSources = {
  /** Reads the persisted copy (IndexedDB File or in-memory File). */
  loadStored: () => Promise<Blob | null>;
  /** `blob:` preview URL of the originally captured file, used as a fallback. */
  fallbackUrl?: string;
  fileName?: string;
  fetchImpl?: typeof fetch;
};

const NOT_FOUND_DETAIL = "foto tidak ditemukan di penyimpanan HP";

/**
 * Reads a locally stored photo fully into memory and wraps the bytes in a new
 * File. Safari/WebKit can fail to read IndexedDB-backed blobs lazily while
 * `fetch` streams the request body; reading them up front either fixes that or
 * surfaces a clear "local-file" failure instead of a generic network error.
 */
export async function materializePhotoFile(
  sources: MaterializePhotoSources,
): Promise<MaterializeOutcome> {
  const fetchImpl: typeof fetch =
    sources.fetchImpl ?? ((input, init) => fetch(input, init));
  let lastDetail = NOT_FOUND_DETAIL;

  try {
    const stored = await sources.loadStored();
    if (stored) {
      return { ok: true, file: await toDetachedFile(stored, sources.fileName) };
    }
  } catch (error) {
    lastDetail = errorDetail(error);
  }

  if (sources.fallbackUrl?.startsWith("blob:")) {
    try {
      const response = await fetchImpl(sources.fallbackUrl);
      const blob = await response.blob();
      return { ok: true, file: await toDetachedFile(blob, sources.fileName) };
    } catch (error) {
      lastDetail = errorDetail(error);
    }
  }

  return { ok: false, failure: { kind: "local-file", detail: lastDetail } };
}

async function toDetachedFile(blob: Blob, fileName?: string): Promise<File> {
  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error("file foto kosong");

  const name =
    fileName ?? (blob instanceof File && blob.name ? blob.name : "photo.jpg");
  return new File([buffer], name, { type: blob.type || "image/jpeg" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/photo-upload/materialize-photo.spec.ts`
Expected: PASS — prints `materialize photo assertions passed`.

- [ ] **Step 5: Use it in the completion submit**

Di `use-completion-work-form.ts`, tambahkan import:

```ts
import { materializePhotoFile } from "@/lib/photo-upload/materialize-photo";
```

Ganti isi `uploadLocalPhoto` (dari Task 2) menjadi:

```ts
      const uploadLocalPhoto = async (
        photo: LocalPhoto,
        context: PhotoUploadContext,
      ): Promise<PhotoUploadOutcome> => {
        const materialized = await materializePhotoFile({
          loadStored: () => autosave.getPhotoFile(photo.id),
          fallbackUrl: photo.previewUrl,
        });
        if (!materialized.ok) return materialized;
        return uploadPhoto(materialized.file, context);
      };
```

- [ ] **Step 6: Use it in the start-work submit**

Di `start-work-client.tsx`, tambahkan import:

```ts
import { materializePhotoFile } from "@/lib/photo-upload/materialize-photo";
```

Ganti `uploadLocalPhoto` (dari Task 2) menjadi:

```ts
      const uploadLocalPhoto = async (
        photo: StartWorkLocalPhoto,
        context: PhotoUploadContext,
      ): Promise<PhotoUploadOutcome> => {
        const materialized = await materializePhotoFile({
          loadStored: async () => photo.file,
          fallbackUrl: photo.previewUrl,
        });
        if (!materialized.ok) return materialized;
        return uploadPhoto(materialized.file, context);
      };
```

- [ ] **Step 7: Add wiring assertions to the contract spec**

Di akhir `lib/hooks/use-photo-upload.spec.ts` tambahkan:

```ts
assert.match(completionHook, /materializePhotoFile\(\{/);
assert.match(startWorkClient, /materializePhotoFile\(\{/);
```

- [ ] **Step 8: Run specs, type-check, lint**

Run: `npx tsx lib/photo-upload/materialize-photo.spec.ts; npx tsx lib/hooks/use-photo-upload.spec.ts; npx tsc --noEmit; npx eslint lib/photo-upload "app/reports/[reportNumber]/completion/use-completion-work-form.ts" "app/reports/[reportNumber]/start/start-work-client.tsx"`
Expected: semua pass, tanpa error.

- [ ] **Step 9: Update the task note**

Tambahkan di `## Changed Files`: `- lib/photo-upload/materialize-photo.ts: baca foto lokal ke memori sebelum upload, fallback ke blob URL preview.` Tambahkan di `## Decisions`: `- Materialisasi dilakukan sebelum upload agar Blob IndexedDB yang tidak terbaca di WebKit muncul sebagai error "local-file" yang jelas, dan agar foto yang belum reload bisa diambil dari blob URL preview.` Tambahkan di `## Verification`: `- npx tsx lib/photo-upload/materialize-photo.spec.ts — pass.`

- [ ] **Step 10: Commit**

```bash
git add lib/photo-upload/materialize-photo.ts lib/photo-upload/materialize-photo.spec.ts lib/hooks/use-photo-upload.spec.ts "app/reports/[reportNumber]/completion/use-completion-work-form.ts" "app/reports/[reportNumber]/start/start-work-client.tsx" docs/agent-notes/
git commit -m "fix(photos): read local photos into memory before upload

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Eager upload registry (usulan 4, logika murni)

**Files:**
- Create: `lib/photo-upload/eager-upload-registry.ts`
- Test: `lib/photo-upload/eager-upload-registry.spec.ts`
- Modify: task note

**Interfaces:**
- Consumes: `PhotoUploadContext`; `PhotoUploadFailure`, `PhotoUploadOutcome`, `errorDetail` (Task 1); `MaterializeOutcome` (Task 3).
- Produces:
  - `type EagerUploadState = { status: "uploading" } | { status: "uploaded"; url: string; fileId: string } | { status: "failed"; failure: PhotoUploadFailure }`
  - `type UploadedPhotoRecord = { url: string; fileId: string }`
  - `type UploadedPhotoStore = { load(): Record<string, UploadedPhotoRecord>; save(records: Record<string, UploadedPhotoRecord>): void }`
  - `type PhotoUploader = (file: File, context: PhotoUploadContext) => Promise<PhotoUploadOutcome>`
  - `class EagerUploadRegistry` dengan: `constructor(uploader: PhotoUploader, store: UploadedPhotoStore)`, `subscribe(listener: () => void): () => void` (arrow property), `getSnapshot(): Readonly<Record<string, EagerUploadState>>` (arrow property, referensi stabil selama tidak ada perubahan), `getUploaded(photoId: string): UploadedPhotoRecord | null`, `start(photoId: string, file: File, context: PhotoUploadContext): Promise<PhotoUploadOutcome>`, `ensureUploaded(photoId: string, loadFile: () => Promise<MaterializeOutcome>, context: PhotoUploadContext): Promise<PhotoUploadOutcome>`, `retry(photoId: string): Promise<PhotoUploadOutcome> | null`, `forget(photoId: string): void`, `clear(): void`
  - `createLocalStorageUploadedPhotoStore(key: string): UploadedPhotoStore`
  - `parseUploadedRecords(value: unknown): Record<string, UploadedPhotoRecord>`

- [ ] **Step 1: Write the failing test**

Create `lib/photo-upload/eager-upload-registry.spec.ts`:

```ts
import assert from "node:assert/strict";

import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import {
  EagerUploadRegistry,
  parseUploadedRecords,
  type UploadedPhotoRecord,
  type UploadedPhotoStore,
} from "./eager-upload-registry";
import type { PhotoUploadOutcome } from "./upload-failure";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function memoryStore(initial: Record<string, UploadedPhotoRecord> = {}) {
  const saves: Array<Record<string, UploadedPhotoRecord>> = [];
  const store: UploadedPhotoStore = {
    load: () => initial,
    save: (records) => void saves.push(records),
  };
  return { store, saves };
}

function scriptedUploader(outcomes: PhotoUploadOutcome[]) {
  const calls: Array<{ file: File; context: PhotoUploadContext }> = [];
  const uploader = async (file: File, context: PhotoUploadContext) => {
    calls.push({ file, context });
    const next = outcomes.shift();
    if (!next) throw new Error("unexpected upload call");
    return next;
  };
  return { uploader, calls };
}

const context: PhotoUploadContext = { kind: "COMPLETION_ADDITIONAL", reportNumber: "R1" };
const file = new File(["a"], "a.jpg", { type: "image/jpeg" });
const ok = (id: string): PhotoUploadOutcome => ({ ok: true, url: `/api/photos/${id}`, fileId: id });
const networkFail: PhotoUploadOutcome = {
  ok: false,
  failure: { kind: "network", detail: "Load failed" },
};

async function run() {
  // 1. start(): uploading -> uploaded, persisted, listeners notified.
  {
    const { store, saves } = memoryStore();
    const { uploader } = scriptedUploader([ok("f1")]);
    const registry = new EagerUploadRegistry(uploader, store);
    let notifications = 0;
    registry.subscribe(() => notifications++);

    const pending = registry.start("p1", file, context);
    assert.deepEqual(registry.getSnapshot().p1, { status: "uploading" });
    assert.deepEqual(await pending, ok("f1"));
    assert.deepEqual(registry.getSnapshot().p1, {
      status: "uploaded",
      url: "/api/photos/f1",
      fileId: "f1",
    });
    assert.deepEqual(registry.getUploaded("p1"), { url: "/api/photos/f1", fileId: "f1" });
    assert.deepEqual(saves.at(-1), { p1: { url: "/api/photos/f1", fileId: "f1" } });
    assert.equal(notifications, 2);
  }

  // 2. Failure becomes "failed"; uploader throwing is treated as network failure.
  {
    const { store } = memoryStore();
    const registry = new EagerUploadRegistry(async () => {
      throw new TypeError("Load failed");
    }, store);
    const outcome = await registry.start("p1", file, context);
    assert.deepEqual(outcome, networkFail);
    assert.deepEqual(registry.getSnapshot().p1, {
      status: "failed",
      failure: { kind: "network", detail: "Load failed" },
    });
  }

  // 3. Snapshot reference is stable when nothing changes.
  {
    const registry = new EagerUploadRegistry(scriptedUploader([]).uploader, memoryStore().store);
    assert.equal(registry.getSnapshot(), registry.getSnapshot());
  }

  // 4. Records loaded from the store start as uploaded; ensureUploaded skips upload.
  {
    const { store } = memoryStore({ p9: { url: "/api/photos/f9", fileId: "f9" } });
    const { uploader, calls } = scriptedUploader([]);
    const registry = new EagerUploadRegistry(uploader, store);
    const outcome = await registry.ensureUploaded(
      "p9",
      async () => {
        throw new Error("loadFile must not be called");
      },
      context,
    );
    assert.deepEqual(outcome, ok("f9"));
    assert.equal(calls.length, 0);
  }

  // 5. ensureUploaded awaits an in-flight upload instead of uploading twice.
  {
    const gate = deferred<PhotoUploadOutcome>();
    let uploadCalls = 0;
    const registry = new EagerUploadRegistry(async () => {
      uploadCalls++;
      return gate.promise;
    }, memoryStore().store);
    void registry.start("p1", file, context);
    const ensured = registry.ensureUploaded(
      "p1",
      async () => {
        throw new Error("loadFile must not be called");
      },
      context,
    );
    gate.resolve(ok("f1"));
    assert.deepEqual(await ensured, ok("f1"));
    assert.equal(uploadCalls, 1);
  }

  // 6. ensureUploaded after a failed eager upload re-uploads from loadFile.
  {
    const { uploader, calls } = scriptedUploader([networkFail, ok("f2")]);
    const registry = new EagerUploadRegistry(uploader, memoryStore().store);
    await registry.start("p1", file, context);
    const fresh = new File(["b"], "b.jpg", { type: "image/jpeg" });
    const outcome = await registry.ensureUploaded(
      "p1",
      async () => ({ ok: true, file: fresh }),
      context,
    );
    assert.deepEqual(outcome, ok("f2"));
    assert.equal(calls[1].file, fresh);
  }

  // 7. ensureUploaded with an unreadable local file marks the photo failed.
  {
    const { uploader, calls } = scriptedUploader([]);
    const registry = new EagerUploadRegistry(uploader, memoryStore().store);
    const failure = { kind: "local-file" as const, detail: "file foto kosong" };
    const outcome = await registry.ensureUploaded(
      "p1",
      async () => ({ ok: false, failure }),
      context,
    );
    assert.deepEqual(outcome, { ok: false, failure });
    assert.deepEqual(registry.getSnapshot().p1, { status: "failed", failure });
    assert.equal(calls.length, 0);
    assert.equal(registry.retry("p1"), null, "no file known, retry impossible");
  }

  // 8. retry() re-uploads the remembered file and context.
  {
    const { uploader, calls } = scriptedUploader([networkFail, ok("f3")]);
    const registry = new EagerUploadRegistry(uploader, memoryStore().store);
    await registry.start("p1", file, context);
    const retried = registry.retry("p1");
    assert.ok(retried);
    assert.deepEqual(await retried, ok("f3"));
    assert.equal(calls[1].file, file);
    assert.equal(calls[1].context, context);
    assert.equal(registry.retry("unknown"), null);
  }

  // 9. forget() mid-flight ignores the late result and removes the state.
  {
    const gate = deferred<PhotoUploadOutcome>();
    const { store, saves } = memoryStore();
    const registry = new EagerUploadRegistry(async () => gate.promise, store);
    void registry.start("p1", file, context);
    registry.forget("p1");
    gate.resolve(ok("f1"));
    await gate.promise;
    await Promise.resolve();
    assert.equal(registry.getSnapshot().p1, undefined);
    assert.equal(registry.getUploaded("p1"), null);
    assert.deepEqual(saves.at(-1), {});
  }

  // 10. clear() wipes everything and persists an empty record set.
  {
    const { store, saves } = memoryStore({ p9: { url: "/api/photos/f9", fileId: "f9" } });
    const registry = new EagerUploadRegistry(scriptedUploader([]).uploader, store);
    registry.clear();
    assert.deepEqual(registry.getSnapshot(), {});
    assert.deepEqual(saves.at(-1), {});
  }

  // 11. parseUploadedRecords keeps only well-formed entries.
  assert.deepEqual(
    parseUploadedRecords({
      good: { url: "/api/photos/a", fileId: "a" },
      noFileId: { url: "/api/photos/b" },
      emptyUrl: { url: "", fileId: "c" },
      wrongType: "x",
    }),
    { good: { url: "/api/photos/a", fileId: "a" } },
  );
  assert.deepEqual(parseUploadedRecords(null), {});
  assert.deepEqual(parseUploadedRecords([1, 2]), {});

  console.log("eager upload registry assertions passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/photo-upload/eager-upload-registry.spec.ts`
Expected: FAIL — `Cannot find module './eager-upload-registry'`.

- [ ] **Step 3: Implement `eager-upload-registry.ts`**

Create `lib/photo-upload/eager-upload-registry.ts`:

```ts
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import type { MaterializeOutcome } from "./materialize-photo";
import {
  errorDetail,
  type PhotoUploadFailure,
  type PhotoUploadOutcome,
} from "./upload-failure";

export type EagerUploadState =
  | { status: "uploading" }
  | { status: "uploaded"; url: string; fileId: string }
  | { status: "failed"; failure: PhotoUploadFailure };

export type UploadedPhotoRecord = { url: string; fileId: string };

export type UploadedPhotoStore = {
  load(): Record<string, UploadedPhotoRecord>;
  save(records: Record<string, UploadedPhotoRecord>): void;
};

export type PhotoUploader = (
  file: File,
  context: PhotoUploadContext,
) => Promise<PhotoUploadOutcome>;

type StateMap = Readonly<Record<string, EagerUploadState>>;

/**
 * Tracks per-photo upload state for photos that are uploaded as soon as they
 * are captured. Successful uploads are persisted through `store` so a page
 * reload does not upload them again. Submit flows call `ensureUploaded`, which
 * reuses a finished or in-flight upload and only re-uploads when needed.
 */
export class EagerUploadRegistry {
  private states: StateMap;
  private readonly inflight = new Map<string, Promise<PhotoUploadOutcome>>();
  private readonly contexts = new Map<string, PhotoUploadContext>();
  private readonly files = new Map<string, File>();
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly uploader: PhotoUploader,
    private readonly store: UploadedPhotoStore,
  ) {
    const initial: Record<string, EagerUploadState> = {};
    for (const [photoId, record] of Object.entries(store.load())) {
      initial[photoId] = { status: "uploaded", url: record.url, fileId: record.fileId };
    }
    this.states = initial;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): StateMap => this.states;

  getUploaded(photoId: string): UploadedPhotoRecord | null {
    const state = this.states[photoId];
    return state?.status === "uploaded" ? { url: state.url, fileId: state.fileId } : null;
  }

  start(photoId: string, file: File, context: PhotoUploadContext): Promise<PhotoUploadOutcome> {
    const pending = this.inflight.get(photoId);
    if (pending) return pending;

    this.contexts.set(photoId, context);
    this.files.set(photoId, file);
    this.setState(photoId, { status: "uploading" });

    const promise = this.runUpload(photoId, file, context);
    this.inflight.set(photoId, promise);
    return promise;
  }

  async ensureUploaded(
    photoId: string,
    loadFile: () => Promise<MaterializeOutcome>,
    context: PhotoUploadContext,
  ): Promise<PhotoUploadOutcome> {
    const uploaded = this.getUploaded(photoId);
    if (uploaded) return { ok: true, ...uploaded };

    const pending = this.inflight.get(photoId);
    if (pending) {
      const outcome = await pending;
      if (outcome.ok) return outcome;
    }

    const materialized = await loadFile();
    if (!materialized.ok) {
      this.contexts.set(photoId, context);
      this.setState(photoId, { status: "failed", failure: materialized.failure });
      return materialized;
    }
    return this.start(photoId, materialized.file, context);
  }

  retry(photoId: string): Promise<PhotoUploadOutcome> | null {
    const context = this.contexts.get(photoId);
    const file = this.files.get(photoId);
    if (!context || !file) return null;
    return this.start(photoId, file, context);
  }

  forget(photoId: string): void {
    this.inflight.delete(photoId);
    this.contexts.delete(photoId);
    this.files.delete(photoId);
    if (!(photoId in this.states)) return;

    this.states = Object.fromEntries(
      Object.entries(this.states).filter(([id]) => id !== photoId),
    );
    this.persist();
    this.emit();
  }

  clear(): void {
    this.inflight.clear();
    this.contexts.clear();
    this.files.clear();
    this.states = {};
    this.store.save({});
    this.emit();
  }

  private async runUpload(
    photoId: string,
    file: File,
    context: PhotoUploadContext,
  ): Promise<PhotoUploadOutcome> {
    let outcome: PhotoUploadOutcome;
    try {
      outcome = await this.uploader(file, context);
    } catch (error) {
      outcome = { ok: false, failure: { kind: "network", detail: errorDetail(error) } };
    }

    this.inflight.delete(photoId);
    // The photo was removed (forget/clear) while uploading: drop the result.
    if (this.contexts.get(photoId) !== context) return outcome;

    if (outcome.ok) {
      this.setState(photoId, { status: "uploaded", url: outcome.url, fileId: outcome.fileId });
      this.persist();
    } else {
      this.setState(photoId, { status: "failed", failure: outcome.failure });
    }
    return outcome;
  }

  private setState(photoId: string, state: EagerUploadState): void {
    this.states = { ...this.states, [photoId]: state };
    this.emit();
  }

  private persist(): void {
    const records: Record<string, UploadedPhotoRecord> = {};
    for (const [photoId, state] of Object.entries(this.states)) {
      if (state.status === "uploaded") {
        records[photoId] = { url: state.url, fileId: state.fileId };
      }
    }
    this.store.save(records);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export function parseUploadedRecords(value: unknown): Record<string, UploadedPhotoRecord> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const records: Record<string, UploadedPhotoRecord> = {};
  for (const [photoId, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const { url, fileId } = entry as Record<string, unknown>;
    if (typeof url === "string" && url && typeof fileId === "string" && fileId) {
      records[photoId] = { url, fileId };
    }
  }
  return records;
}

export function createLocalStorageUploadedPhotoStore(key: string): UploadedPhotoStore {
  return {
    load() {
      if (typeof window === "undefined") return {};
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? parseUploadedRecords(JSON.parse(raw)) : {};
      } catch {
        return {};
      }
    },
    save(records) {
      if (typeof window === "undefined") return;
      try {
        if (Object.keys(records).length === 0) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(records));
        }
      } catch (error) {
        console.warn("Gagal menyimpan status upload foto:", error);
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/photo-upload/eager-upload-registry.spec.ts`
Expected: PASS — prints `eager upload registry assertions passed`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit; npx eslint lib/photo-upload`
Expected: no errors.

- [ ] **Step 6: Update the task note**

Tambahkan di `## Changed Files`: `- lib/photo-upload/eager-upload-registry.ts: registry status upload eager per foto + store localStorage.` Tambahkan di `## Decisions`: `- Status upload eager disimpan di key localStorage terpisah (sparta-eager-uploads-<reportNumber>) agar versi draft lama tidak perlu dimigrasi.` Tambahkan di `## Verification`: `- npx tsx lib/photo-upload/eager-upload-registry.spec.ts — pass.`

- [ ] **Step 7: Commit**

```bash
git add lib/photo-upload/eager-upload-registry.ts lib/photo-upload/eager-upload-registry.spec.ts docs/agent-notes/
git commit -m "feat(photos): add eager upload registry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: React hook and per-photo upload status UI

**Files:**
- Create: `lib/hooks/use-eager-photo-uploads.ts`
- Create: `components/photo-upload-status.tsx`
- Modify: `app/reports/[reportNumber]/completion/components/photo-strip.tsx` (seluruh file)
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx` (komponen lokal `PhotoStrip`, ~baris 112-160)
- Test: `lib/photo-upload/eager-upload-wiring.spec.ts`
- Modify: task note

**Interfaces:**
- Consumes: `EagerUploadRegistry`, `createLocalStorageUploadedPhotoStore`, `EagerUploadState` (Task 4); `uploadPhotoRequest` (Task 1); `describePhotoUploadFailure` (Task 1).
- Produces:
  - `useEagerPhotoUploads(reportNumber: string): { registry: EagerUploadRegistry; states: Readonly<Record<string, EagerUploadState>>; startUpload(photoId: string, file: File, context: PhotoUploadContext): void; retryUpload(photoId: string): void; statusValue: PhotoUploadStatusValue }`
  - `type PhotoUploadStatusValue = { states: Readonly<Record<string, EagerUploadState>>; onRetry: (photoId: string) => void }`
  - `<PhotoUploadStatusProvider value={PhotoUploadStatusValue}>`
  - `<PhotoUploadStatusOverlay photoId={string} />` — merender `null` jika tidak ada provider atau tidak ada status untuk foto tsb (jadi aman dipakai sebelum Task 6/7).

- [ ] **Step 1: Write the failing wiring spec**

Create `lib/photo-upload/eager-upload-wiring.spec.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const hook = read("lib/hooks/use-eager-photo-uploads.ts");
const statusUi = read("components/photo-upload-status.tsx");
const completionStrip = read("app/reports/[reportNumber]/completion/components/photo-strip.tsx");
const startWorkClient = read("app/reports/[reportNumber]/start/start-work-client.tsx");

assert.match(hook, /useSyncExternalStore\(/);
assert.match(hook, /sparta-eager-uploads-\$\{reportNumber\}/);
assert.match(hook, /uploadPhotoRequest\(file, context\)/);
assert.match(statusUi, /export function PhotoUploadStatusProvider/);
assert.match(statusUi, /export function PhotoUploadStatusOverlay/);
assert.match(statusUi, /from "@\/components\/ui\/button"/);
assert.match(completionStrip, /<PhotoUploadStatusOverlay photoId=\{photo\.id\} \/>/);
assert.match(startWorkClient, /<PhotoUploadStatusOverlay photoId=\{photo\.id\} \/>/);

console.log("eager upload wiring assertions passed");
```

- [ ] **Step 2: Run spec to verify it fails**

Run: `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts`
Expected: FAIL — `ENOENT: no such file or directory, open 'lib/hooks/use-eager-photo-uploads.ts'`.

- [ ] **Step 3: Create the status UI component**

Create `components/photo-upload-status.tsx`:

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EagerUploadState } from "@/lib/photo-upload/eager-upload-registry";

export type PhotoUploadStatusValue = {
    states: Readonly<Record<string, EagerUploadState>>;
    onRetry: (photoId: string) => void;
};

const PhotoUploadStatusContext = createContext<PhotoUploadStatusValue | null>(
    null,
);

export function PhotoUploadStatusProvider({
    value,
    children,
}: {
    value: PhotoUploadStatusValue;
    children: ReactNode;
}) {
    return (
        <PhotoUploadStatusContext.Provider value={value}>
            {children}
        </PhotoUploadStatusContext.Provider>
    );
}

/**
 * Overlay for a photo thumbnail showing its eager upload status.
 * Must be rendered inside a `relative` container. Renders nothing when there
 * is no provider or no tracked status for the photo.
 */
export function PhotoUploadStatusOverlay({ photoId }: { photoId: string }) {
    const context = useContext(PhotoUploadStatusContext);
    const state = context?.states[photoId];
    if (!context || !state) return null;

    if (state.status === "uploading") {
        return (
            <div
                role="status"
                aria-label="Mengunggah foto"
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-white"
            >
                <Loader2 className="size-5 animate-spin" />
            </div>
        );
    }

    if (state.status === "uploaded") {
        return (
            <div
                aria-label="Foto sudah terunggah"
                className="pointer-events-none absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-background/95 text-emerald-600 shadow-sm"
            >
                <CheckCircle2 className="size-4" />
            </div>
        );
    }

    return (
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-destructive/85 py-1">
            <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => context.onRetry(photoId)}
            >
                <RotateCw data-icon="inline-start" />
                Ulangi
            </Button>
        </div>
    );
}
```

- [ ] **Step 4: Create the hook**

Create `lib/hooks/use-eager-photo-uploads.ts`:

```ts
"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";

import type { PhotoUploadStatusValue } from "@/components/photo-upload-status";
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import {
    createLocalStorageUploadedPhotoStore,
    EagerUploadRegistry,
    type EagerUploadState,
} from "@/lib/photo-upload/eager-upload-registry";
import { describePhotoUploadFailure } from "@/lib/photo-upload/upload-failure";
import { uploadPhotoRequest } from "@/lib/photo-upload/upload-photo-request";

const EMPTY_STATES: Readonly<Record<string, EagerUploadState>> = Object.freeze(
    {},
);
const getServerSnapshot = () => EMPTY_STATES;

/**
 * Uploads photos as soon as they are captured and tracks their status per
 * report. Uploaded records survive reloads via localStorage; failed photos stay
 * in IndexedDB and are uploaded again on submit through `registry.ensureUploaded`.
 */
export function useEagerPhotoUploads(reportNumber: string) {
    const registry = useMemo(
        () =>
            new EagerUploadRegistry(
                (file, context) => uploadPhotoRequest(file, context),
                createLocalStorageUploadedPhotoStore(
                    `sparta-eager-uploads-${reportNumber}`,
                ),
            ),
        [reportNumber],
    );

    const states = useSyncExternalStore(
        registry.subscribe,
        registry.getSnapshot,
        getServerSnapshot,
    );

    const startUpload = useCallback(
        (photoId: string, file: File, context: PhotoUploadContext) => {
            void registry.start(photoId, file, context).then((outcome) => {
                if (outcome.ok || !registry.getSnapshot()[photoId]) return;
                toast.error("Foto belum terunggah", {
                    description: `${describePhotoUploadFailure(outcome.failure)} Foto tetap tersimpan dan akan dicoba lagi saat dikirim.`,
                });
            });
        },
        [registry],
    );

    const retryUpload = useCallback(
        (photoId: string) => {
            const retry = registry.retry(photoId);
            if (!retry) {
                toast.error("Foto tidak bisa diunggah ulang", {
                    description: "Hapus foto ini lalu ambil ulang.",
                });
                return;
            }
            void retry.then((outcome) => {
                if (outcome.ok) {
                    toast.success("Foto berhasil diunggah");
                    return;
                }
                toast.error("Upload ulang gagal", {
                    description: describePhotoUploadFailure(outcome.failure),
                });
            });
        },
        [registry],
    );

    const statusValue = useMemo<PhotoUploadStatusValue>(
        () => ({ states, onRetry: retryUpload }),
        [states, retryUpload],
    );

    return { registry, states, startUpload, retryUpload, statusValue };
}
```

- [ ] **Step 5: Render the overlay in the completion PhotoStrip**

Ganti seluruh isi `app/reports/[reportNumber]/completion/components/photo-strip.tsx`:

```tsx
import { Trash2, ZoomIn } from "lucide-react";

import { PhotoUploadStatusOverlay } from "@/components/photo-upload-status";
import type { LocalPhoto } from "../types";

export function PhotoStrip({
    photos,
    emptyText,
    onRemove,
    onPreview,
}: {
    photos: LocalPhoto[];
    emptyText: string;
    onRemove?: (id: string) => void;
    onPreview: (url: string) => void;
}) {
    if (photos.length === 0) {
        return (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 text-center text-xs text-muted-foreground">
                {emptyText}
            </div>
        );
    }

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
                    <PhotoUploadStatusOverlay photoId={photo.id} />
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
}
```

(Overlay diletakkan SETELAH tombol zoom `inset-0` supaya tombol "Ulangi" bisa diklik, dan SEBELUM tombol hapus supaya tombol hapus tetap di atas.)

- [ ] **Step 6: Render the overlay in the start-work PhotoStrip**

Di `app/reports/[reportNumber]/start/start-work-client.tsx`, tambahkan import:

```ts
import { PhotoUploadStatusOverlay } from "@/components/photo-upload-status";
```

Di komponen lokal `PhotoStrip`, sisipkan satu baris di antara tombol zoom dan tombol hapus, sehingga menjadi:

```tsx
          <button
            type="button"
            onClick={() => onPreview(photo.previewUrl)}
            className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100"
            aria-label="Lihat foto"
          >
            <ZoomIn className="size-5" />
          </button>
          <PhotoUploadStatusOverlay photoId={photo.id} />
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-background/95 text-destructive shadow-sm"
            aria-label="Hapus foto"
          >
            <Trash2 className="size-3.5" />
          </button>
```

- [ ] **Step 7: Run spec, type-check, lint**

Run: `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts; npx tsc --noEmit; npx eslint lib/hooks/use-eager-photo-uploads.ts components/photo-upload-status.tsx "app/reports/[reportNumber]/completion/components/photo-strip.tsx" "app/reports/[reportNumber]/start/start-work-client.tsx"`
Expected: spec prints `eager upload wiring assertions passed`; `tsc`/`eslint` tanpa error. (Belum ada perubahan perilaku yang terlihat: overlay merender `null` karena provider belum dipasang.)

- [ ] **Step 8: Update the task note**

Tambahkan di `## Changed Files`: `- lib/hooks/use-eager-photo-uploads.ts, components/photo-upload-status.tsx: hook registry + overlay status per foto (spinner/centang/Ulangi).` dan `- Kedua PhotoStrip merender PhotoUploadStatusOverlay.` Tambahkan di `## Verification`: `- npx tsx lib/photo-upload/eager-upload-wiring.spec.ts — pass.`

- [ ] **Step 9: Commit**

```bash
git add lib/hooks/use-eager-photo-uploads.ts components/photo-upload-status.tsx lib/photo-upload/eager-upload-wiring.spec.ts "app/reports/[reportNumber]/completion/components/photo-strip.tsx" "app/reports/[reportNumber]/start/start-work-client.tsx" docs/agent-notes/
git commit -m "feat(photos): add eager upload hook and status overlay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Eager upload in the Penyelesaian flow

**Files:**
- Modify: `app/reports/[reportNumber]/completion/hooks/use-completion-autosave.ts` (`addPhoto`, `restoreDraft`, `restorePhotosFromIds`, interface `UseCompletionAutosave`)
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts` (imports, hook setup, restore effect, `handlePhotoCaptured`, remove handlers, `uploadLocalPhoto`, success path, return value)
- Modify: `app/reports/[reportNumber]/completion/completion-client.tsx` (destructure + provider)
- Modify: `lib/photo-upload/eager-upload-wiring.spec.ts`
- Modify: `lib/hooks/use-photo-upload.spec.ts`
- Modify: task note

**Interfaces:**
- Consumes: `useEagerPhotoUploads` (Task 5), `PhotoUploadStatusProvider` (Task 5), `materializePhotoFile` (Task 3), `registry.ensureUploaded/forget/clear/getUploaded` (Task 4).
- Produces:
  - `UseCompletionAutosave.restoreDraft(reportNumber: string, getUploadedUrl?: (photoId: string) => string | undefined): Promise<RestoredDraft | null>`
  - `useCompletionWorkForm(...)` kini juga mengembalikan `photoUploadStatus: PhotoUploadStatusValue`.

- [ ] **Step 1: Extend the wiring spec (failing)**

Di `lib/photo-upload/eager-upload-wiring.spec.ts`, sebelum baris `console.log(...)`, tambahkan:

```ts
const completionHook = read("app/reports/[reportNumber]/completion/use-completion-work-form.ts");
const completionAutosave = read("app/reports/[reportNumber]/completion/hooks/use-completion-autosave.ts");
const completionClient = read("app/reports/[reportNumber]/completion/completion-client.tsx");

assert.match(completionHook, /useEagerPhotoUploads\(reportNumber\)/);
assert.match(completionHook, /kind: "COMPLETION_RESULT", reportNumber, itemId/);
assert.match(completionHook, /kind: "COMPLETION_ADDITIONAL", reportNumber/);
assert.match(completionHook, /eager\.registry\.ensureUploaded\(/);
assert.match(completionHook, /eager\.registry\.forget\(/);
assert.match(completionHook, /eager\.registry\.clear\(\)/);
assert.doesNotMatch(completionHook, /usePhotoUpload\(/);
assert.match(completionAutosave, /getUploadedUrl\?\.\(id\)/);
assert.match(completionClient, /<PhotoUploadStatusProvider value=\{photoUploadStatus\}>/);
```

Di `lib/hooks/use-photo-upload.spec.ts`, hapus baris:

```ts
assert.match(completionHook, /describePhotoUploadFailure\(/);
```

(baris `materializePhotoFile` untuk `completionHook` tetap ada.)

- [ ] **Step 2: Run spec to verify it fails**

Run: `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts`
Expected: FAIL — `AssertionError` pada `useEagerPhotoUploads\(reportNumber\)`.

- [ ] **Step 3: Make the completion autosave tolerant and upload-aware**

Di `app/reports/[reportNumber]/completion/hooks/use-completion-autosave.ts`:

(a) Di interface `UseCompletionAutosave`, ganti deklarasi `restoreDraft` dengan:

```ts
    /**
     * Load a previously saved draft. Recreates LocalPhotos from IDB. When a
     * photo is missing from IDB but was already uploaded, `getUploadedUrl`
     * supplies its remote URL as the preview. Returns null if no draft.
     */
    restoreDraft: (
        reportNumber: string,
        getUploadedUrl?: (photoId: string) => string | undefined,
    ) => Promise<RestoredDraft | null>;
```

(b) Ganti `addPhoto` dengan:

```ts
    const addPhoto = useCallback(
        async (
            reportNumber: string,
            file: File,
            type: string,
        ): Promise<LocalPhoto> => {
            const id = genPhotoId(reportNumber, type);
            try {
                await idbPut(id, file);
            } catch (error) {
                // iOS Safari can lose its IndexedDB connection; keep the photo in
                // memory so the eager upload / submit can still use it.
                console.warn("Gagal menyimpan foto ke penyimpanan lokal:", error);
            }
            const previewUrl = URL.createObjectURL(file);
            return { id, previewUrl };
        },
        [],
    );
```

(c) Ganti seluruh `const restoreDraft = useCallback(...)` dengan:

```ts
    const restoreDraft = useCallback(
        async (
            reportNumber: string,
            getUploadedUrl?: (photoId: string) => string | undefined,
        ): Promise<RestoredDraft | null> => {
            const raw = localStorage.getItem(`${LS_KEY_PREFIX}${reportNumber}`);
            if (!raw) return null;

            let draft: CompletionDraftData;
            try {
                draft = JSON.parse(raw) as CompletionDraftData;
            } catch {
                return null;
            }

            // Validate version
            if (draft.version !== 3) return null;

            const itemStates = new Map<string, CompletionItemState>();
            for (const [itemId, saved] of Object.entries(draft.itemStates)) {
                itemStates.set(itemId, {
                    afterPhotos: await restorePhotosFromIds(
                        saved.afterPhotoIds,
                        getUploadedUrl,
                    ),
                    realisasiEntries: saved.realisasiEntries,
                    discountAmount: saved.discountAmount ?? 0,
                    materialStores: saved.materialStores,
                    receiptPhotos: await restorePhotosFromIds(
                        saved.receiptPhotoIds,
                        getUploadedUrl,
                    ),
                    notes: saved.notes,
                });
            }

            const startWorkMaterialStores: StartWorkMaterialStoreEntry[] = [];
            for (const store of draft.startWorkMaterialStores ?? []) {
                startWorkMaterialStores.push({
                    ...store,
                    photos: await restorePhotosFromIds(
                        store.photoIds || [],
                        getUploadedUrl,
                    ),
                });
            }

            return {
                globalNotes: draft.globalNotes,
                selfiePhotos: await restorePhotosFromIds(
                    draft.selfiePhotoIds,
                    getUploadedUrl,
                ),
                startWorkSelfiePhotos: await restorePhotosFromIds(
                    draft.startWorkSelfiePhotoIds ?? [],
                    getUploadedUrl,
                ),
                startWorkReceiptPhotos: await restorePhotosFromIds(
                    draft.startWorkReceiptPhotoIds ?? [],
                    getUploadedUrl,
                ),
                startWorkMaterialStores,
                startWorkSkipPhotos: draft.startWorkSkipPhotos ?? false,
                additionalDocumentationPhotos: await restorePhotosFromIds(
                    draft.additionalDocumentationPhotoIds ?? [],
                    getUploadedUrl,
                ),
                additionalDocumentationNote:
                    draft.additionalDocumentationNote?.trim() || "",
                itemStates,
            };
        },
        [],
    );
```

(d) Ganti fungsi `restorePhotosFromIds` di bawah file dengan:

```ts
async function restoreLocalPhoto(
    id: string,
    getUploadedUrl?: (photoId: string) => string | undefined,
): Promise<LocalPhoto | null> {
    const remotePhoto = restorePhotoFromId(id);
    if (remotePhoto) return remotePhoto;

    const file = await idbGet(id).catch((error) => {
        console.warn("Gagal membaca foto draft:", error);
        return null;
    });
    if (file) return { id, previewUrl: URL.createObjectURL(file) };

    const uploadedUrl = getUploadedUrl?.(id);
    return uploadedUrl ? { id, previewUrl: uploadedUrl } : null;
}

async function restorePhotosFromIds(
    ids: string[],
    getUploadedUrl?: (photoId: string) => string | undefined,
): Promise<LocalPhoto[]> {
    const photos: LocalPhoto[] = [];
    for (const id of ids) {
        const photo = await restoreLocalPhoto(id, getUploadedUrl);
        if (photo) photos.push(photo);
    }
    return photos;
}
```

- [ ] **Step 4: Wire the registry into the completion form**

Di `app/reports/[reportNumber]/completion/use-completion-work-form.ts`:

(a) Hapus import `import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";` dan tambahkan:

```ts
import { useEagerPhotoUploads } from "@/lib/hooks/use-eager-photo-uploads";
```

Ubah import upload-failure menjadi (karena `describePhotoUploadFailure` dan `PhotoUploadOutcome` masih dipakai, `PhotoUploadFailure` juga):

```ts
import {
  describePhotoUploadFailure,
  type PhotoUploadFailure,
  type PhotoUploadOutcome,
} from "@/lib/photo-upload/upload-failure";
```

(b) Ganti baris `const { uploadPhoto } = usePhotoUpload();` dengan (perhatikan `reportNumber` didefinisikan sesudahnya — pindahkan baris ini ke bawah `const reportNumber = report.reportNumber;`):

```ts
  const eager = useEagerPhotoUploads(reportNumber);
```

(c) Di effect restore draft, ganti `autosave\n      .restoreDraft(reportNumber)` dengan:

```ts
    autosave
      .restoreDraft(reportNumber, (id) => eager.registry.getUploaded(id)?.url)
```

dan ubah deps effect itu dari `[autosave, report, reportNumber]` menjadi `[autosave, eager.registry, report, reportNumber]`.

(d) Ganti seluruh `const handlePhotoCaptured = useCallback(...)` dengan:

```ts
  const handlePhotoCaptured = useCallback(
    async (file: File) => {
      if (!cameraTarget) return;
      const target = cameraTarget;
      setCameraTarget(null);

      if (target.target === "additional") {
        const photo = await autosave.addPhoto(
          reportNumber,
          file,
          `additional-doc-${Date.now()}`,
        );
        setAdditionalDocumentationPhotos((prev) => [...prev, photo]);
        eager.startUpload(photo.id, file, { kind: "COMPLETION_ADDITIONAL", reportNumber });
        return;
      }

      if (target.target === "startSelfie" || target.target === "startReceipt") {
        const photo = await autosave.addPhoto(reportNumber, file, target.target);

        if (target.target === "startSelfie") {
          setStartWorkSelfiePhotos((prev) => [...prev, photo]);
          eager.startUpload(photo.id, file, { kind: "START_SELFIE", reportNumber });
          return;
        }

        setStartWorkReceiptPhotos((prev) => [...prev, photo]);
        setStartWorkMaterialStores((prev) =>
          prev.length > 0
            ? prev
            : [{ id: genId(), name: "", city: "", photos: [] }],
        );
        eager.startUpload(photo.id, file, { kind: "START_RECEIPT", reportNumber });
        return;
      }

      if (target.target === "startStore") {
        // Not uploaded eagerly: the Drive folder depends on the store name/city,
        // which the user may still change. Uploaded on submit instead.
        const storeId = target.storeId;
        const photo = await autosave.addPhoto(reportNumber, file, "startStore");
        setStartWorkMaterialStores((prev) =>
          prev.map((s) =>
            s.id === storeId ? { ...s, photos: [...s.photos, photo] } : s,
          ),
        );
        return;
      }

      if (target.target !== "item") return;

      const itemId = target.itemId;
      const photo = await autosave.addPhoto(
        reportNumber,
        file,
        `after-${itemId}`,
      );
      setItemStates((prev) => {
        const current = prev.get(itemId);
        if (!current) return prev;

        const next = new Map(prev);
        next.set(itemId, {
          ...current,
          afterPhotos: [...current.afterPhotos, photo],
        });
        return next;
      });
      eager.startUpload(photo.id, file, { kind: "COMPLETION_RESULT", reportNumber, itemId });
    },
    [autosave, cameraTarget, eager, reportNumber],
  );
```

(e) Ganti `handleRemovePhoto` dengan:

```ts
  const handleRemovePhoto = useCallback(
    (id: string, updater: () => void) => {
      eager.registry.forget(id);
      void autosave.removePhoto(id);
      updater();
    },
    [autosave, eager.registry],
  );
```

dan di `handleRemoveStartWorkStorePhoto`, tambahkan `eager.registry.forget(photoId);` sebagai baris pertama callback, lalu ubah deps-nya menjadi `[autosave, eager.registry]`.

(f) Di `handleSubmit`, ganti `uploadLocalPhoto` (versi Task 3) dengan:

```ts
      const uploadLocalPhoto = (
        photo: LocalPhoto,
        context: PhotoUploadContext,
      ): Promise<PhotoUploadOutcome> =>
        eager.registry.ensureUploaded(
          photo.id,
          () =>
            materializePhotoFile({
              loadStored: () => autosave.getPhotoFile(photo.id),
              fallbackUrl: photo.previewUrl,
            }),
          context,
        );
```

(g) Di jalur sukses `handleSubmit`, ganti:

```ts
      await autosave.clearDraft(reportNumber);
```

dengan:

```ts
      await autosave.clearDraft(reportNumber);
      eager.registry.clear();
```

(h) Di deps array `handleSubmit`, ganti `uploadPhoto,` dengan `eager.registry,`.

(i) Tambahkan ke objek `return { ... }` hook:

```ts
    photoUploadStatus: eager.statusValue,
```

- [ ] **Step 5: Provide the status context on the page**

Di `app/reports/[reportNumber]/completion/completion-client.tsx`:

Tambahkan import:

```ts
import { PhotoUploadStatusProvider } from "@/components/photo-upload-status";
```

Tambahkan `photoUploadStatus,` ke daftar destructuring dari `useCompletionWorkForm(...)`.

Bungkus elemen root yang di-return. Ganti:

```tsx
  return (
    <div className="min-h-svh min-w-0 max-w-full overflow-x-clip bg-background text-foreground">
```

dengan:

```tsx
  return (
    <PhotoUploadStatusProvider value={photoUploadStatus}>
    <div className="min-h-svh min-w-0 max-w-full overflow-x-clip bg-background text-foreground">
```

dan di akhir komponen, ganti:

```tsx
      <LoadingOverlay
        isOpen={isRestoringDraft}
        message="Memuat draft penyelesaian..."
      />
    </div>
  );
}
```

dengan:

```tsx
      <LoadingOverlay
        isOpen={isRestoringDraft}
        message="Memuat draft penyelesaian..."
      />
    </div>
    </PhotoUploadStatusProvider>
  );
}
```

Lalu jalankan `npx prettier --write "app/reports/[reportNumber]/completion/completion-client.tsx"` jika prettier tersedia di proyek (cek `node_modules/.bin/prettier`); jika tidak, rapikan indentasi secara manual.

- [ ] **Step 6: Run specs, type-check, lint**

Run: `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts; npx tsx lib/hooks/use-photo-upload.spec.ts; npx tsx lib/photo-upload/eager-upload-registry.spec.ts; npx tsc --noEmit; npx eslint "app/reports/[reportNumber]/completion"`
Expected: semua spec pass, `tsc`/`eslint` tanpa error.

- [ ] **Step 7: Manual check in the browser (desktop, DevTools mobile mode)**

1. `npm run dev`, login sebagai user BMS lokal yang punya laporan `IN_PROGRESS`, buka `/reports/<nomor>/completion`.
2. Ambil foto sesudah untuk satu item → thumbnail menampilkan spinner, lalu ikon centang.
3. DevTools → Network → Offline, ambil foto lagi → spinner, lalu bar merah dengan tombol "Ulangi" + toast "Foto belum terunggah". Kembali Online, klik "Ulangi" → toast "Foto berhasil diunggah", ikon centang.
4. Reload halaman → foto yang sudah ter-upload tetap bercentang (dari localStorage `sparta-eager-uploads-<nomor>`).
5. Lengkapi form lalu kirim → di tab Network, foto yang sudah bercentang TIDAK di-upload ulang; submit sukses dan key `sparta-eager-uploads-<nomor>` hilang dari localStorage.

- [ ] **Step 8: Update the task note**

Tambahkan di `## Changed Files`: `- Alur Penyelesaian: upload eager saat capture (hasil, dokumentasi tambahan, selfie/nota revisi); submit memakai ensureUploaded; addPhoto toleran IndexedDB gagal; restore memakai URL ter-upload sebagai cadangan.` Tambahkan di `## Verification` hasil Step 6 dan Step 7.

- [ ] **Step 9: Commit**

```bash
git add "app/reports/[reportNumber]/completion" lib/photo-upload/eager-upload-wiring.spec.ts lib/hooks/use-photo-upload.spec.ts docs/agent-notes/
git commit -m "feat(completion): upload photos as soon as captured

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Eager upload in the Mulai Pekerjaan flow + remove legacy hook

**Files:**
- Modify: `app/reports/[reportNumber]/start/use-start-work-autosave.ts` (`StartWorkLocalPhoto`, `addPhoto`, `restorePhotos`, `restoreDraft`)
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx` (imports, hook setup, restore effect, `handlePhotoCaptured`, remove handlers, `uploadLocalPhoto`, success path, provider)
- Delete: `lib/hooks/use-photo-upload.ts`
- Modify: `lib/hooks/use-photo-upload.spec.ts`
- Modify: `lib/photo-upload/eager-upload-wiring.spec.ts`
- Modify: task note

**Interfaces:**
- Consumes: semua dari Task 3–5.
- Produces: `StartWorkLocalPhoto.file` menjadi opsional (`file?: File`); `restoreDraft(reportNumber: string, getUploadedUrl?: (photoId: string) => string | undefined)`.

- [ ] **Step 1: Extend the wiring spec (failing)**

Di `lib/photo-upload/eager-upload-wiring.spec.ts`, sebelum `console.log(...)`, tambahkan:

```ts
const startAutosave = read("app/reports/[reportNumber]/start/use-start-work-autosave.ts");

assert.match(startWorkClient, /useEagerPhotoUploads\(reportNumber\)/);
assert.match(startWorkClient, /kind: "START_SELFIE", reportNumber \}\)/);
assert.match(startWorkClient, /kind: "START_RECEIPT", reportNumber \}\)/);
assert.match(startWorkClient, /eager\.registry\.ensureUploaded\(/);
assert.match(startWorkClient, /eager\.registry\.forget\(/);
assert.match(startWorkClient, /eager\.registry\.clear\(\)/);
assert.match(startWorkClient, /<PhotoUploadStatusProvider value=\{eager\.statusValue\}>/);
assert.doesNotMatch(startWorkClient, /usePhotoUpload\(/);
assert.match(startAutosave, /file\?: File;/);
assert.match(startAutosave, /getUploadedUrl\?\.\(id\)/);
```

Di `lib/hooks/use-photo-upload.spec.ts`:
- hapus baris `const sharedHook = readFileSync("lib/hooks/use-photo-upload.ts", "utf8");`
- hapus baris `assert.match(sharedHook, /uploadPhotoRequest\(file, context\)/);`
- hapus baris `assert.match(startWorkClient, /describePhotoUploadFailure\(/);`

- [ ] **Step 2: Run spec to verify it fails**

Run: `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts`
Expected: FAIL — `AssertionError` pada `useEagerPhotoUploads\(reportNumber\)` untuk `startWorkClient`.

- [ ] **Step 3: Update the start-work autosave**

Di `app/reports/[reportNumber]/start/use-start-work-autosave.ts`:

(a) Ganti tipe `StartWorkLocalPhoto` dengan:

```ts
export type StartWorkLocalPhoto = {
    id: string;
    previewUrl: string;
    /** Missing when the photo was restored from its uploaded URL only. */
    file?: File;
    fileId?: string;
};
```

(b) Ganti `restorePhotos` dengan:

```ts
async function restorePhotos(
    ids: string[],
    getUploadedUrl?: (photoId: string) => string | undefined,
): Promise<StartWorkLocalPhoto[]> {
    const photos: StartWorkLocalPhoto[] = [];
    for (const id of ids) {
        const file = await idbGet(id).catch((error) => {
            console.warn("Gagal membaca foto draft:", error);
            return null;
        });
        if (file) {
            photos.push({ id, file, previewUrl: URL.createObjectURL(file) });
            continue;
        }
        const uploadedUrl = getUploadedUrl?.(id);
        if (uploadedUrl) photos.push({ id, previewUrl: uploadedUrl });
    }
    return photos;
}
```

(c) Ganti isi `addPhoto` dengan:

```ts
    const addPhoto = useCallback(
        async (
            reportNumber: string,
            file: File,
            type: string,
        ): Promise<StartWorkLocalPhoto> => {
            const id = genPhotoId(reportNumber, type);
            try {
                await idbPut(id, file);
            } catch (error) {
                // iOS Safari can lose its IndexedDB connection; keep the photo in
                // memory so the eager upload / submit can still use it.
                console.warn("Gagal menyimpan foto ke penyimpanan lokal:", error);
            }
            return {
                id,
                file,
                previewUrl: URL.createObjectURL(file),
            };
        },
        [],
    );
```

(d) Di `restoreDraft`, ubah signature dan tiga pemanggilan `restorePhotos`:

```ts
    const restoreDraft = useCallback(
        async (
            reportNumber: string,
            getUploadedUrl?: (photoId: string) => string | undefined,
        ): Promise<RestoredStartWorkDraft | null> => {
```

```ts
            const [selfiePhotos, receiptPhotos] = await Promise.all([
                restorePhotos(draft.selfiePhotoIds, getUploadedUrl),
                restorePhotos(draft.receiptPhotoIds, getUploadedUrl),
            ]);
```

```ts
                    photos: await restorePhotos(store.photoIds || [], getUploadedUrl),
```

- [ ] **Step 4: Wire the registry into the start-work client**

Di `app/reports/[reportNumber]/start/start-work-client.tsx`:

(a) Ganti import `usePhotoUpload` dengan:

```ts
import { useEagerPhotoUploads } from "@/lib/hooks/use-eager-photo-uploads";
```

dan ubah import komponen status menjadi:

```ts
import {
  PhotoUploadStatusOverlay,
  PhotoUploadStatusProvider,
} from "@/components/photo-upload-status";
```

(b) Hapus `const { uploadPhoto } = usePhotoUpload();` dan, tepat di bawah `const reportNumber = report.reportNumber;`, tambahkan:

```ts
  const eager = useEagerPhotoUploads(reportNumber);
```

(c) Di effect restore, ganti `.restoreDraft(reportNumber)` dengan `.restoreDraft(reportNumber, (id) => eager.registry.getUploaded(id)?.url)` dan deps `[autosave, reportNumber]` menjadi `[autosave, eager.registry, reportNumber]`.

(d) Ganti seluruh `const handlePhotoCaptured = useCallback(...)` dengan:

```ts
  const handlePhotoCaptured = useCallback(
    async (file: File) => {
      if (!cameraTarget) return;
      const target = cameraTarget;
      setCameraTarget(null);

      if (typeof target === "object" && target.type === "store") {
        // Not uploaded eagerly: the Drive folder depends on the store name/city.
        handleAddMaterialStorePhoto(target.storeId, file);
        return;
      }

      const photo = await autosave.addPhoto(
        reportNumber,
        file,
        target as string,
      );
      if (target === "selfie") {
        setSelfiePhotos((prev) => [...prev, photo]);
        eager.startUpload(photo.id, file, { kind: "START_SELFIE", reportNumber });
        return;
      }

      setReceiptPhotos((prev) => {
        const next = [...prev, photo];
        if (prev.length === 0) {
          setMaterialStores([{ id: genId(), name: "", city: "", photos: [] }]);
        }
        return next;
      });
      eager.startUpload(photo.id, file, { kind: "START_RECEIPT", reportNumber });
    },
    [autosave, cameraTarget, eager, handleAddMaterialStorePhoto, reportNumber],
  );
```

(e) Di `handleRemoveSelfiePhoto`, `handleRemoveReceiptPhoto`, dan `handleRemoveStorePhoto`, tambahkan `eager.registry.forget(id);` (untuk `handleRemoveStorePhoto` pakai `eager.registry.forget(photoId);`) sebagai baris pertama callback, dan ubah deps masing-masing dari `[autosave]` menjadi `[autosave, eager.registry]`.

(f) Di `handleSubmit`, ganti `uploadLocalPhoto` (versi Task 3) dengan:

```ts
      const uploadLocalPhoto = (
        photo: StartWorkLocalPhoto,
        context: PhotoUploadContext,
      ): Promise<PhotoUploadOutcome> =>
        eager.registry.ensureUploaded(
          photo.id,
          () =>
            materializePhotoFile({
              loadStored: async () => photo.file ?? null,
              fallbackUrl: photo.previewUrl,
            }),
          context,
        );
```

(g) Di jalur sukses, ganti `await autosave.clearDraft(reportNumber);` dengan:

```ts
      await autosave.clearDraft(reportNumber);
      eager.registry.clear();
```

(h) Di deps `handleSubmit`, ganti `uploadPhoto,` dengan `eager.registry,`.

(i) Bungkus root JSX `StartWorkClient`. Ganti:

```tsx
  return (
    <div className="min-h-svh bg-background text-foreground">
```

dengan:

```tsx
  return (
    <PhotoUploadStatusProvider value={eager.statusValue}>
    <div className="min-h-svh bg-background text-foreground">
```

dan tutup provider tepat sebelum `);` penutup `return` milik `StartWorkClient` (setelah `</div>` root terakhir komponen itu, sebelum deklarasi komponen berikutnya di file):

```tsx
    </div>
    </PhotoUploadStatusProvider>
  );
}
```

Rapikan indentasi (prettier jika tersedia).

- [ ] **Step 5: Delete the legacy hook**

Run: `git grep -n "hooks/use-photo-upload\"" -- app components lib`
Expected: tidak ada hasil yang menunjuk ke `@/lib/hooks/use-photo-upload` (import `./hooks/use-photo-upload` di `create-form.tsx` adalah hook berbeda dan tidak boleh disentuh).

Lalu hapus file:

```bash
git rm lib/hooks/use-photo-upload.ts
```

- [ ] **Step 6: Run specs, type-check, lint**

Run: `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts; npx tsx lib/hooks/use-photo-upload.spec.ts; npx tsc --noEmit; npx eslint "app/reports/[reportNumber]/start" lib/hooks`
Expected: semua pass, tanpa error.

- [ ] **Step 7: Manual check in the browser**

1. `npm run dev`, login sebagai BMS dengan laporan `ESTIMATION_APPROVED`, buka `/reports/<nomor>/start`.
2. Ambil selfie dan foto nota → spinner lalu centang. Foto toko material → TIDAK ada spinner/centang (diunggah saat submit).
3. Mode Offline + ambil selfie → "Ulangi" muncul; Online + "Ulangi" → centang.
4. Kirim → selfie/nota yang sudah bercentang tidak di-upload ulang (cek Network); foto toko material di-upload; status laporan menjadi `IN_PROGRESS`.

- [ ] **Step 8: Update the task note**

Tambahkan di `## Changed Files`: `- Alur Mulai Pekerjaan: upload eager selfie/nota; foto toko material tetap saat submit; file di StartWorkLocalPhoto opsional; lib/hooks/use-photo-upload.ts dihapus (tidak ada caller).` Tambahkan di `## Verification` hasil Step 6 dan Step 7.

- [ ] **Step 9: Commit**

```bash
git add "app/reports/[reportNumber]/start" lib/hooks/use-photo-upload.spec.ts lib/photo-upload/eager-upload-wiring.spec.ts docs/agent-notes/
git commit -m "feat(start-work): upload photos as soon as captured

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Compress gallery photos without a web worker

Mendukung usulan 4: foto galeri iPhone (24–48 MP, 5–8 MB) melebihi batas server 4 MB, dan `useWebWorker: true` di iOS selalu gagal setelah mengunduh library dari `cdn.jsdelivr.net`.

**Files:**
- Create: `lib/photo-upload/compress-photo.ts`
- Test: `lib/photo-upload/compress-photo.spec.ts`
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx` (hapus `MATERIAL_STORE_COMPRESSION_OPTIONS`, `compressMaterialStorePhoto`, import `browser-image-compression`; ubah `handleAddMaterialStorePhoto`)
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts` (`handleAddStartWorkMaterialStorePhoto`)
- Modify: task note

**Interfaces:**
- Produces: `compressGalleryPhoto(file: File): Promise<File>` (boleh throw — caller fallback ke file asli), `GALLERY_PHOTO_COMPRESSION_OPTIONS = { maxSizeMB: 0.07, maxWidthOrHeight: 1280, useWebWorker: false }`.

- [ ] **Step 1: Write the failing spec**

Create `lib/photo-upload/compress-photo.spec.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const compressModule = read("lib/photo-upload/compress-photo.ts");
const startWorkClient = read("app/reports/[reportNumber]/start/start-work-client.tsx");
const completionHook = read("app/reports/[reportNumber]/completion/use-completion-work-form.ts");

assert.match(compressModule, /useWebWorker: false/);
assert.match(compressModule, /maxSizeMB: 0\.07/);
assert.match(compressModule, /maxWidthOrHeight: 1280/);
assert.match(startWorkClient, /compressGalleryPhoto\(file\)/);
assert.doesNotMatch(startWorkClient, /from "browser-image-compression"/);
assert.match(completionHook, /compressGalleryPhoto\(file\)/);

console.log("gallery compression wiring assertions passed");
```

- [ ] **Step 2: Run spec to verify it fails**

Run: `npx tsx lib/photo-upload/compress-photo.spec.ts`
Expected: FAIL — `ENOENT ... lib/photo-upload/compress-photo.ts`.

- [ ] **Step 3: Implement `compress-photo.ts`**

Create `lib/photo-upload/compress-photo.ts`:

```ts
import imageCompression from "browser-image-compression";

/**
 * `useWebWorker` is disabled on purpose: on iOS the library's worker always
 * fails (no `Image` in workers) after downloading itself from cdn.jsdelivr.net,
 * then redoes the work on the main thread anyway.
 */
export const GALLERY_PHOTO_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.07,
  maxWidthOrHeight: 1280,
  useWebWorker: false,
} as const;

/** Compresses a photo picked from the gallery so it stays far below the 4 MB upload limit. */
export async function compressGalleryPhoto(file: File): Promise<File> {
  const compressed = (await imageCompression(
    file,
    GALLERY_PHOTO_COMPRESSION_OPTIONS,
  )) as Blob;
  return new File([compressed], file.name || "photo.jpg", {
    type: compressed.type || "image/jpeg",
  });
}
```

- [ ] **Step 4: Use it in the start-work client**

Di `start-work-client.tsx`:
- hapus `import imageCompression from "browser-image-compression";`
- hapus konstanta `MATERIAL_STORE_COMPRESSION_OPTIONS` dan fungsi `compressMaterialStorePhoto` (~baris 72-76 dan 101-109)
- tambahkan `import { compressGalleryPhoto } from "@/lib/photo-upload/compress-photo";`
- ganti `handleAddMaterialStorePhoto` dengan:

```ts
  const handleAddMaterialStorePhoto = useCallback(
    (storeId: string, file: File) => {
      void (async () => {
        let photoFile = file;
        try {
          photoFile = await compressGalleryPhoto(file);
        } catch (error) {
          console.warn("Gagal mengompres foto toko material:", error);
        }
        const photo = await autosave.addPhoto(reportNumber, photoFile, "store");
        setMaterialStores((prev) =>
          prev.map((s) =>
            s.id === storeId ? { ...s, photos: [...s.photos, photo] } : s,
          ),
        );
      })();
    },
    [autosave, reportNumber],
  );
```

- [ ] **Step 5: Use it in the completion revision gallery**

Di `use-completion-work-form.ts`, tambahkan `import { compressGalleryPhoto } from "@/lib/photo-upload/compress-photo";` dan ganti `handleAddStartWorkMaterialStorePhoto` dengan:

```ts
  const handleAddStartWorkMaterialStorePhoto = useCallback(
    (storeId: string, file: File) => {
      void (async () => {
        let photoFile = file;
        try {
          photoFile = await compressGalleryPhoto(file);
        } catch (error) {
          console.warn("Gagal mengompres foto toko material:", error);
        }
        const photo = await autosave.addPhoto(reportNumber, photoFile, "startStore");
        setStartWorkMaterialStores((prev) =>
          prev.map((s) =>
            s.id === storeId ? { ...s, photos: [...s.photos, photo] } : s,
          ),
        );
      })();
    },
    [autosave, reportNumber],
  );
```

- [ ] **Step 6: Run spec, type-check, lint**

Run: `npx tsx lib/photo-upload/compress-photo.spec.ts; npx tsc --noEmit; npx eslint lib/photo-upload "app/reports/[reportNumber]/start/start-work-client.tsx" "app/reports/[reportNumber]/completion/use-completion-work-form.ts"`
Expected: spec prints `gallery compression wiring assertions passed`; `tsc`/`eslint` tanpa error.

- [ ] **Step 7: Manual check**

Di `/reports/<nomor>/start`, tambah foto toko material dari galeri dengan file JPEG > 4 MB → thumbnail muncul; saat submit, request `POST /api/photos/upload` untuk foto tsb berukuran < 100 KB dan sukses. Di tab Network tidak ada request ke `cdn.jsdelivr.net`.

- [ ] **Step 8: Update the task note and commit**

Tambahkan di `## Changed Files`: `- lib/photo-upload/compress-photo.ts: kompresi galeri tanpa web worker; dipakai di Mulai Pekerjaan dan revisi Penyelesaian.` Tambahkan hasil Step 6–7 di `## Verification`.

```bash
git add lib/photo-upload/compress-photo.ts lib/photo-upload/compress-photo.spec.ts "app/reports/[reportNumber]/start/start-work-client.tsx" "app/reports/[reportNumber]/completion/use-completion-work-form.ts" docs/agent-notes/
git commit -m "fix(photos): compress gallery photos without web worker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentation and final verification

**Files:**
- Modify: `docs/project/04-workflows.md`
- Modify: `docs/project/09-testing-and-verification.md`
- Modify: task note

- [ ] **Step 1: Document the behavior**

Di `docs/project/04-workflows.md`, tambahkan subbagian berikut di bagian yang membahas Mulai Pekerjaan / Penyelesaian (letakkan setelah paragraf tentang penyelesaian BMS; jika tidak ada heading yang pas, tambahkan di akhir file):

```markdown
### Upload Foto Mulai Pekerjaan dan Penyelesaian

- Foto selfie, nota, foto sesudah, dan dokumentasi tambahan di-upload ke Drive
  CDN segera setelah diambil. Thumbnail menampilkan status: spinner (sedang
  upload), centang (sudah ter-upload), atau tombol "Ulangi" (gagal).
- Foto toko material tetap di-upload saat submit karena folder Drive-nya
  bergantung pada nama dan kota toko yang bisa diubah setelah foto diambil.
- Semua foto tetap disimpan di IndexedDB sebagai cadangan. Saat submit, foto
  yang belum ter-upload dibaca ulang ke memori lalu di-upload; foto yang sudah
  ter-upload tidak dikirim ulang.
- Status foto yang sudah ter-upload disimpan di localStorage key
  `sparta-eager-uploads-<reportNumber>` dan dihapus setelah submit sukses.
- Upload otomatis di-retry untuk error jaringan dan HTTP 408/429/500/502/504.
  Pesan error menampilkan penyebab asli (koneksi, sesi habis, status laporan,
  file lokal tidak terbaca, atau pesan server).
- Foto dari galeri dikompres (maks. 1280 px, target 70 KB) tanpa web worker.
- Foto Drive yang sudah ter-upload lalu dihapus user belum dibersihkan otomatis.
```

- [ ] **Step 2: Document the test commands**

Di tabel `## Verifikasi Umum` pada `docs/project/09-testing-and-verification.md`, tambahkan baris sebelum `| Build production | ...`:

```markdown
| Upload foto (logika) | `npx tsx lib/photo-upload/upload-failure.spec.ts`, `npx tsx lib/photo-upload/upload-photo-request.spec.ts`, `npx tsx lib/photo-upload/materialize-photo.spec.ts`, `npx tsx lib/photo-upload/eager-upload-registry.spec.ts` |
| Upload foto (wiring) | `npx tsx lib/photo-upload/eager-upload-wiring.spec.ts`, `npx tsx lib/photo-upload/compress-photo.spec.ts`, `npx tsx lib/hooks/use-photo-upload.spec.ts` |
```

- [ ] **Step 3: Run the full verification**

Run:

```bash
npx tsx lib/photo-upload/upload-failure.spec.ts
npx tsx lib/photo-upload/upload-photo-request.spec.ts
npx tsx lib/photo-upload/materialize-photo.spec.ts
npx tsx lib/photo-upload/eager-upload-registry.spec.ts
npx tsx lib/photo-upload/eager-upload-wiring.spec.ts
npx tsx lib/photo-upload/compress-photo.spec.ts
npx tsx lib/hooks/use-photo-upload.spec.ts
npx tsx app/api/photos/upload/route.spec.ts
npx tsc --noEmit
npm run lint
npm run build
```

Expected: semua spec pass; `tsc`, `lint`, dan `build` tanpa error.

- [ ] **Step 4: Finalize the task note**

Lengkapi task note: `## Verification` berisi hasil Step 3, dan `## Remaining Work and Risks` berisi:

```markdown
- Verifikasi di iPhone sungguhan belum dilakukan oleh agent. Checklist untuk tim:
  1. Safari iOS, laporan IN_PROGRESS: ambil 5+ foto sesudah → semua bercentang.
  2. Ambil foto, kunci layar 30 detik, buka lagi → foto bercentang atau "Ulangi" berfungsi.
  3. Mode pesawat, ambil foto → "Ulangi" muncul; matikan mode pesawat, kirim → sukses tanpa foto ulang.
  4. Tutup tab di tengah pengisian, buka lagi → foto bercentang tetap ada dan tidak di-upload ulang saat kirim.
  5. Kalau masih gagal, screenshot toast sekarang memuat penyebab asli — gunakan itu untuk diagnosis lanjutan.
- File Drive yatim (foto ter-upload lalu dihapus / laporan tidak jadi dikirim) belum dibersihkan.
- Bug camera-modal (shutter diam saat video belum siap / errorMessage tidak di-reset) dan race di form create masih di luar scope.
```

- [ ] **Step 5: Commit**

```bash
git add docs/project/04-workflows.md docs/project/09-testing-and-verification.md docs/agent-notes/
git commit -m "docs: describe eager photo upload behavior

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
