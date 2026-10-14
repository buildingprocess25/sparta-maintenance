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
