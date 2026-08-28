# Google Drive Hierarchy Design

**Date:** 2026-08-26
**Status:** Approved design, pending implementation

## Problem

Sparta Maintenance currently stores report PDFs and PJUM documents under a
module-owned archive hierarchy while newly uploaded photos are placed directly
in one Drive CDN root folder. The flat photo folder has reached Google Drive's
child limit, and neither hierarchy follows the company-owned `DOKUMEN SPARTA`
structure that is shared with the separate Building module.

The application must adopt the existing branch and store folders without
modifying Building-owned content. It must also repair incomplete or stale store
folder codes safely and keep cross-store PJUM documents outside individual
stores.

## Goals

- Store every new Sparta Maintenance PDF and photo below `DOKUMEN SPARTA`.
- Reuse existing branch and store folders before creating new folders.
- Treat the database store code as the authoritative store identity.
- Create `Maintenance` beside the existing `Building` folder.
- Separate each report and evidence category into bounded folders.
- Keep one branch-level PJUM archive because one PJUM can contain many stores.
- Preserve Drive CDN/proxy URLs for application photo access.
- Keep database backups outside the operational document root.

## Non-goals

- Moving or reorganizing Building-owned folders or files.
- Migrating files already stored in the legacy PDF or flat CDN roots.
- Automatically resolving duplicate Drive folders with ambiguous identities.
- Adding `no-ulok` to the application database.
- Keeping an unlimited history of revised report PDFs.
- Changing the database backup format or retention count.

## Root and access model

`GOOGLE_DRIVE_ROOT_FOLDER_ID` becomes the canonical ID of the existing
`DOKUMEN SPARTA` folder after the new code is deployed. During cutover,
`DRIVE_CDN_ROOT_FOLDER_ID` points to the same folder for compatibility. The
implementation should make the CDN client use the canonical root so the
separate CDN root variable can later be removed.

The Google primary OAuth identity and Drive CDN OAuth identity must both have
Editor access to `DOKUMEN SPARTA`. The primary identity remains responsible for
PDF/PJUM operations and the CDN identity remains responsible for photo upload
and proxy access.

`BACKUP_DRIVE_FOLDER_ID` remains independent and points directly to a restricted
folder outside `DOKUMEN SPARTA`, for example:

```text
SPARTA SYSTEM BACKUP/
  Database/
    Production/
```

Only the primary Google identity needs access to the backup folder. Existing
retention remains the latest 10 Drive backup files.

## Target hierarchy

```text
DOKUMEN SPARTA/
  <NAMA CABANG>/
    Toko/
      <NO ULOK> - <NAMA TOKO> - <KODE TOKO>/
        Building/
        Maintenance/
          <NOMOR LAPORAN>/
            01 - Dokumen/
              <NOMOR LAPORAN> - Laporan Final.pdf
              <NOMOR LAPORAN> - Laporan Revisi.pdf
            02 - Foto Checklist/
              <NAMA KATEGORI CHECKLIST>/
                <ID ITEM> - <NAMA ITEM>/
                  checklist-<URUTAN>.<ext>
            03 - Foto Mulai Pekerjaan/
              01 - Selfie BMS/
                selfie-<URUTAN>.<ext>
              02 - Nota Pembelian/
                nota-<URUTAN>.<ext>
              03 - Toko Material/
                <URUTAN> - <NAMA TOKO MATERIAL> - <KOTA>/
                  toko-material-<URUTAN>.<ext>
            04 - Foto Penyelesaian/
              01 - Hasil Pekerjaan/
                <NAMA KATEGORI CHECKLIST>/
                  <ID ITEM> - <NAMA ITEM>/
                    hasil-<URUTAN>.<ext>
              02 - Nota Realisasi/
                <ID ITEM> - <NAMA ITEM>/
                  nota-realisasi-<URUTAN>.<ext>
              03 - Dokumentasi Tambahan/
                dokumentasi-<URUTAN>.<ext>
    PJUM Sparta-Maintenance/
      <NIK BMS> - <NAMA BMS>/
        <TAHUN>/
          <NAMA BULAN>/
            PJUM <BULAN> Minggu ke <NOMOR> - <JUMLAH> Laporan.pdf
```

## Branch and store resolution

The resolver only inspects direct children of the target branch's `Toko`
folder. Folder names are parsed as three logical fields separated by ` - `:

```text
<NO ULOK> - <NAMA TOKO> - <KODE TOKO>
```

Resolution uses this precedence:

1. Find one folder whose final segment equals the database store code after
   trimming and case normalization.
2. If exactly one code match exists, use it even when its store-name segment
   differs from the database. Do not rewrite the Drive store name.
3. If no code match exists, find a folder whose store-name segment equals the
   database store name after trimming, case folding, and collapsing repeated
   whitespace.
4. If exactly one name match exists, use it and replace only its final segment
   with the database store code. This applies when the old segment is
   `BELUM DIISI`, `-`, or an incorrect non-placeholder code.
5. Preserve the existing no-ulok and store-name segments during that rename.
6. If neither identity matches, create
   `BELUM DIISI - <NAMA TOKO DB> - <KODE TOKO DB>`.

When a code match and a different name match both exist, the code match wins
and the name-matched folder is left untouched. Multiple code matches or
multiple normalized-name matches are ambiguous: the resolver must fail with a
specific logged error and must not rename, merge, or create another store
folder.

The resolver then ensures `Maintenance` exists beneath the selected store
folder. It never renames, moves, creates content inside, or deletes `Building`.

## Report folder lifecycle

One report number maps to one Drive report folder. Rejection, resubmission,
completion revision, and final approval continue using that folder.

Checklist photos are captured before the current submit action creates a
report number. The new flow therefore reserves a real `DRAFT` report row and
report number for the selected store before the first checklist upload. Final
submission promotes that same row instead of creating another report. Changing
stores before submission discards the previous draft through the normal draft
cleanup flow and reserves a new report number; report numbers are never reused.

The report folder and category path are created when the first file for that
path is uploaded. Empty category folders are not created. A zero-cost report
that legitimately skips start-work photos therefore does not receive empty
start-work evidence folders.

New photos upload directly to their final report/category folder instead of a
flat CDN root. The upload request must carry enough server-validated context to
resolve the report, store, category, optional checklist item, and optional
material store. Client-provided branch and target-store names are not
authoritative; the server loads report and target-store identity from the
database. A material-store label is display metadata entered before start-work
submission, so the server may accept its name, city, and stable form-entry ID
after schema validation and sanitization. Those labels never affect report
authorization or target-store resolution.

Photo files retain Drive file IDs in `drivePhotoFileIds` and continue to be
served through the existing application proxy URL. Removing a not-yet-final
photo must delete that exact Drive file when the current workflow permits
removal. Upload retries must not silently redirect a file to the root folder.
Expired `DRAFT` reports are deleted by the pending cleanup job together with
their tracked Drive photo files; empty Drive folders may remain and are safe to
reuse if the same report folder is still referenced, but no active file may be
left untracked.

## Evidence mapping

| Application data | Target folder |
| --- | --- |
| `items[].images` or legacy `photoUrl` | `02 - Foto Checklist/<category>/<item>` |
| `startSelfieUrl` | `03 - Foto Mulai Pekerjaan/01 - Selfie BMS` |
| `startReceiptUrls` | `03 - Foto Mulai Pekerjaan/02 - Nota Pembelian` |
| `startMaterialStores[].photoUrls` | `03 - Foto Mulai Pekerjaan/03 - Toko Material/<store>` |
| `items[].afterImages` | `04 - Foto Penyelesaian/01 - Hasil Pekerjaan/<category>/<item>` |
| `items[].receiptImages` | `04 - Foto Penyelesaian/02 - Nota Realisasi/<item>` |
| `completionAdditionalPhotos` | `04 - Foto Penyelesaian/03 - Dokumentasi Tambahan` |
| final report PDF | `01 - Dokumen/<report> - Laporan Final.pdf` |
| latest Admin revision PDF | `01 - Dokumen/<report> - Laporan Revisi.pdf` |

Photo filenames are semantic and contain a deterministic sequence plus a short
unique suffix so an edit cannot overwrite a different photo accidentally. All
dynamic folder and file segments are sanitized consistently; `/` becomes `-`,
outer whitespace is removed, and an empty result becomes `-`.

## PDF and PJUM behavior

The final report PDF and latest revision PDF are separate files. Regenerating
the final file before publication overwrites the final filename. Generating a
new Admin revision overwrites the revision filename while preserving the final
file, matching the database's single latest-revision pointer.

PJUM documents are never copied into store folders. The branch-level
`PJUM Sparta-Maintenance` folder groups them by BMS, year, and month. Recreating
the same logical PJUM overwrites its deterministic filename rather than adding
an uncontrolled duplicate.

## Cache and consistency

Folder IDs, not names, are authoritative after resolution. Cache entries must
include the canonical root ID and stable business identity. A cached ID must be
validated as an accessible, non-trashed folder under the expected parent before
it is reused. Store-folder rename must update or invalidate affected cache
entries.

Concurrent requests can race while ensuring folders. Folder creation helpers
must re-query after a conflict or duplicate observation and return one stable
folder. Ambiguous pre-existing duplicates still fail safely and require manual
resolution.

## Error handling

- Missing branch, `Toko`, report, store code, or OAuth access returns a specific
  server error and creates no fallback path at the Drive root.
- Ambiguous store matches never trigger an automatic rename or folder creation.
- A failed folder rename stops the upload; it does not create a second folder.
- Failed photo upload keeps the report data unchanged and returns a retryable
  user-facing error.
- Failed PDF/PJUM upload preserves existing database Drive URLs.
- Logs include operation, report number, branch, store code, category, and
  correlation ID, but never OAuth credentials or raw file contents.

## Deployment and rollback

Production cutover is atomic at the application/environment level:

1. Deploy code that understands the new hierarchy.
2. Set `GOOGLE_DRIVE_ROOT_FOLDER_ID` to `DOKUMEN SPARTA`.
3. During compatibility rollout, set `DRIVE_CDN_ROOT_FOLDER_ID` to the same ID.
4. Recreate/deploy the container so cached clients read the new environment.
5. Upload one controlled report photo, final PDF, revision PDF, and PJUM, then
   verify their exact Drive parents and application URLs.

Rollback restores the previous application image and previous root env values.
Files already written to the new hierarchy remain intact. Legacy files are not
moved or deleted by deploy or rollback.

## Verification

Focused tests must cover parsing, normalization, code-first matching, name
fallback, placeholder/wrong-code rename, new-folder naming, ambiguity failure,
Maintenance creation, path mapping for every evidence type, root fallback,
PDF separation, PJUM placement, cache invalidation, and no root-level photo
upload.

Integration tests use a fake Drive adapter and assert parent IDs and file names;
they must not call production Drive. Before completion run focused tests,
ESLint, TypeScript typecheck, production build, Prisma validation, and
`git diff --check`.

## Acceptance criteria

- New operational files appear only in the approved hierarchy.
- The database store code wins over Drive code/name discrepancies.
- Existing no-ulok and Drive store names are preserved during code repair.
- New stores use `BELUM DIISI` as the no-ulok segment.
- `Maintenance` is created beside and without touching `Building`.
- Every photo category and report PDF maps to the documented path.
- PJUM is branch-level and never duplicated per store.
- Backup storage remains independent and restricted.
- Flat root-level photo uploads stop after cutover.
- Existing legacy files and URLs remain usable without migration.
