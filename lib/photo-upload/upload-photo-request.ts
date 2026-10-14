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
