# Camera Error Handling & Progressive Fallback Design

## Context

The `CameraModal` component currently attempts to access the camera with strict constraints (1080p and environment facing). If any error occurs (e.g., hardware does not support the resolution, camera is already in use by another app), the system broadly catches the error, sets a generic `permissionError` state to `true`, and shows a toast saying "Gagal mengakses kamera. Pastikan izin diberikan."

This leads to significant user confusion when the issue is hardware compatibility or camera locks, not browser permissions.

## Proposed Changes

### 1. Progressive Constraints (Fallback System)

Instead of a single `getUserMedia` call, implement a cascade of attempts:

```javascript
const constraintTiers = [
    { video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } },
    { video: { facingMode: facingMode } },
    { video: true }
];
```

The system will loop through `constraintTiers`. If an attempt throws an `OverconstrainedError`, it moves to the next, less-strict tier. If it succeeds, the loop breaks and the stream is saved.

### 2. Accurate Error Decoding

Remove the binary `permissionError` state and replace it with a string `errorMessage` state.
When `getUserMedia` fails completely (e.g. all tiers exhausted, or a non-constraint error occurs), decode the native browser error name:

- `NotAllowedError` / `SecurityError`: "Izin kamera ditolak oleh browser. Mohon izinkan akses kamera di pengaturan."
- `NotFoundError`: "Tidak ada perangkat kamera yang terdeteksi."
- `NotReadableError` / `TrackStartError`: "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut (seperti telepon/WA) lalu coba lagi."
- `OverconstrainedError`: "Kamera perangkat Anda tidak mendukung format yang diminta."
- `TypeError`: "Terjadi kesalahan sistem. Pastikan koneksi aman (HTTPS)."
- Default: `Gagal mengakses kamera: ${error.message}`

### 3. UI Refinements

- The fallback UI inside `CameraModal` (when `errorMessage` is set) will display the exact error message instead of the hardcoded permission text.
- The toast message will also display the exact decoded error message.

## Verification Plan

- Manually trigger `NotAllowedError` by denying camera permissions in Chrome to verify the specific text.
- Use a mock or specific device to trigger `NotReadableError`.
- Ensure that devices unable to support 1080p successfully fallback to the second tier without showing an error screen.
