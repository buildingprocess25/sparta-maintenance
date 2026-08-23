# AHO Import Timeout UX Handling

## Overview
When importing a large Excel file for AHO tickets, Cloudflare sometimes terminates the connection after 100 seconds (524 Timeout). However, the Next.js Server Action continues processing in the background and successfully upserts the data into PostgreSQL. 

Currently, the client-side UI catches this timeout as a generic `fetch` error and displays a misleading red "Import failed" toast, causing users to panic and re-upload the file.

## Goal
Improve the user experience by replacing the generic error with an informative alert in the UI when a network/timeout error occurs.

## Proposed Changes

1. **Component**: `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`
2. **Logic**:
   - Add an `isTimeout` boolean state to the component.
   - In the `handleImport` function's `catch` block, instead of triggering a red `toast.error`, we will set `isTimeout = true` to render an inline alert inside the dialog.
3. **UI/UX**:
   - The alert will be styled with an "Info" theme (blue colors).
   - **Title**: "Memproses di Latar Belakang..."
   - **Message**: "Karena ukuran data cukup besar, proses import sedang dilanjutkan oleh server di belakang layar. Anda bisa menutup jendela ini dan refresh halaman beberapa saat lagi."
4. **Behavior**:
   - The user will see this clear message inside the dialog, preventing them from uploading again and assuring them the process is still running.
