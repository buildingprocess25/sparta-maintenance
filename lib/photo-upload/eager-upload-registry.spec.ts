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
