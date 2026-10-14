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
