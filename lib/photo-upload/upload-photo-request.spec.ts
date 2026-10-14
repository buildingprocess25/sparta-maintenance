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
