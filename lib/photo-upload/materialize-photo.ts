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
