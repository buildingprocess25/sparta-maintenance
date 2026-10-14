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
