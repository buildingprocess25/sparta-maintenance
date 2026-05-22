export const GOOGLE_DRIVE_CDN_PREFIX = "https://lh3.googleusercontent.com/d/";

export function normalizePhotoUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function normalizePhotoUrls(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    return values
        .map(normalizePhotoUrl)
        .filter((url): url is string => url !== null);
}

/**
 * Returns true if and only if the URL is a Google Drive CDN URL.
 * Pure function — no side effects.
 */
export function isGoogleDriveCdnUrl(url: unknown): boolean {
    const normalized = normalizePhotoUrl(url);
    return normalized?.startsWith(GOOGLE_DRIVE_CDN_PREFIX) ?? false;
}

/**
 * Builds a CDN URL from a Drive file ID.
 * Uses our proxy API to avoid Google's 429 rate limits.
 */
export function buildCdnUrl(fileId: string): string {
    return `/api/photos/${fileId}`;
}

/**
 * Builds a fallback download URL from a Drive file ID.
 * Used when CDN URL fails to load.
 */
export function buildDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
}

/**
 * Resolves a photo URL for display.
 * - Converts Drive URLs to our proxy API
 * - Legacy UploadThing URLs are returned as-is
 */
export function resolvePhotoUrl(url: unknown): string {
    const normalized = normalizePhotoUrl(url);
    if (!normalized) return "";

    // Convert Drive URLs to proxy
    const fileId = extractDriveFileId(normalized);
    if (fileId) {
        return `/api/photos/${fileId}`;
    }
    
    // Legacy UploadThing URLs
    return normalized;
}

/**
 * Extracts file ID from a Google Drive URL (CDN or download format).
 * Returns null if URL is not a Google Drive URL.
 */
export function extractDriveFileId(url: unknown): string | null {
    const normalized = normalizePhotoUrl(url);
    if (!normalized) return null;

    // CDN format: https://lh3.googleusercontent.com/d/{fileId}
    if (normalized.startsWith(GOOGLE_DRIVE_CDN_PREFIX)) {
        return normalized.substring(GOOGLE_DRIVE_CDN_PREFIX.length);
    }
    
    // Download format: https://drive.google.com/uc?id={fileId}&export=download
    const downloadMatch = normalized.match(/drive\.google\.com\/uc\?id=([^&]+)/);
    if (downloadMatch) {
        return downloadMatch[1];
    }
    
    return null;
}
