# PJUM Monitoring Gantung Client Error Fix

- **Date:** 2026-10-05
- **Task:** Fix `BUCKET_KEYS.map is not a function` error on the client.
- **Context:** The `BUCKET_KEYS` constant array was exported from a `"use server"` file (`actions.ts`). Next.js strips out non-function exports from Server Action files when imported into Client Components, which caused the client to receive an undefined variable instead of an array.
- **Implementation:** Moved the `BUCKET_KEYS` constant definition directly into the client components (`export-monitoring-dialog.tsx`) and removed the `export` keyword from the constant in `actions.ts`.
- **Status:** Complete. The array maps correctly on the client.
