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
