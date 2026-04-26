export const GOOGLE_DRIVE_CDN_PREFIX = "https://lh3.googleusercontent.com/d/";

/**
 * Returns true if and only if the URL is a Google Drive CDN URL.
 * Pure function — no side effects.
 */
export function isGoogleDriveCdnUrl(url: string): boolean {
    return url.startsWith(GOOGLE_DRIVE_CDN_PREFIX);
}

/**
 * Builds a CDN URL from a Drive file ID.
 * Uses lh3.googleusercontent.com CDN for direct image access.
 */
export function buildCdnUrl(fileId: string): string {
    return `${GOOGLE_DRIVE_CDN_PREFIX}${fileId}`;
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
 * - Drive CDN URLs are returned as-is
 * - Legacy UploadThing URLs are returned as-is
 */
export function resolvePhotoUrl(url: string): string {
    return url;
}

/**
 * Extracts file ID from a Google Drive URL (CDN or download format).
 * Returns null if URL is not a Google Drive URL.
 */
export function extractDriveFileId(url: string): string | null {
    // CDN format: https://lh3.googleusercontent.com/d/{fileId}
    if (url.startsWith(GOOGLE_DRIVE_CDN_PREFIX)) {
        return url.substring(GOOGLE_DRIVE_CDN_PREFIX.length);
    }
    
    // Download format: https://drive.google.com/uc?id={fileId}&export=download
    const downloadMatch = url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
    if (downloadMatch) {
        return downloadMatch[1];
    }
    
    return null;
}
