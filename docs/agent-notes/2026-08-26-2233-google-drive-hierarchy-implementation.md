# Google Drive Hierarchy Implementation

## Scope

Implement approved Google Drive hierarchy routing for new Sparta Maintenance
photos, final PDFs, revision PDFs, PJUM PDFs, and DRAFT cleanup behavior.
Legacy Drive file migration is outside this scope.

## Context and Sources

- `AI_RULES.md`
- `docs/project/07-integrations-and-env.md`
- `docs/project/08-operations.md`
- `docs/superpowers/specs/2026-08-26-google-drive-hierarchy-design.md`
- `docs/superpowers/plans/2026-08-26-google-drive-hierarchy.md`
- `docs/agent-notes/2026-08-26-2215-google-drive-hierarchy-plan.md`
- Current code in `lib/google-drive`, `lib/storage`, `app/api/photos`,
  `app/reports`, `app/dashboard/intervensi/revisi-laporan`, and cleanup jobs.

## Changed Files

- `lib/google-drive/hierarchy-policy.ts`: added pure folder naming and
  relative path policy for stores, reports, evidence folders, PDFs, and PJUM.
- `lib/google-drive/hierarchy-policy.spec.ts`: added executable assertions for
  the approved folder policy.
- `lib/google-drive/folder-gateway.ts`: added a narrow Google Drive folder
  gateway with paginated list, read, create, and rename operations.
- `lib/google-drive/hierarchy-service.ts`: added code-first store folder
  resolution, safe code repair, cache validation, report folder, evidence
  folder, document folder, and branch-level PJUM folder ensures.
- `lib/google-drive/hierarchy-service.spec.ts`: added fake-gateway coverage for
  code precedence, name fallback, placeholder/wrong-code repair, ambiguity
  failures, Maintenance creation, cache invalidation, evidence paths, document
  folders, and PJUM folders.
- `lib/google-drive/files.ts`: routed legacy folder path ensure operations
  through the shared Drive folder gateway.
- `lib/reports/drive-draft-service.ts`: added injected DRAFT reservation and
  promotion rules for real report numbers before checklist photo upload.
- `lib/reports/drive-draft-service.spec.ts`: added fake-repository coverage for
  DRAFT reuse, store-change replacement, branch validation, ownership rejection,
  and promotion without creating another row.
- `lib/reports/drive-draft-prisma-repository.ts`: added Prisma transaction
  adapter for Drive DRAFT reservation and promotion.
- `app/reports/actions/ensure-drive-draft.ts`: added authenticated BMS server
  action that reserves a real DRAFT report number.
- `app/reports/actions/submit.ts`: promotes a reserved DRAFT report when
  `draftReportNumber` is present, with legacy create fallback retained during
  the migration.
- `app/reports/actions/draft.ts` and `app/reports/actions.ts`: added/exported
  reserved DRAFT discard behavior.
- `app/reports/actions/types.ts`: allowed `draftReportNumber` in create draft
  payloads.
- `app/reports/(bms)/create/hooks/use-draft.ts`: persists real
  `draftReportNumber` and removes the old `LCL-*` pseudo ID.
- `app/reports/(bms)/create/hooks/use-photo-upload.ts`: reserves a real DRAFT
  report before the first checklist photo upload.
- `lib/google-drive/photo-upload-context.ts`: added upload context schema,
  ownership/status validation, and mapping to hierarchy evidence destinations.
- `lib/google-drive/photo-upload-context.spec.ts`: added context parsing,
  status authorization, ownership, and unknown item assertions.
- `app/api/photos/upload/route.ts`: added injectable context-aware upload
  handler that resolves the report evidence folder before writing to Drive.
- `app/api/photos/upload/route.spec.ts`: added route contract checks for
  evidence-folder parent upload and no storage call on ambiguous Drive folders.
- `lib/storage/drive-photo-service.ts`: changed photo upload to require an
  explicit parent folder ID instead of using the CDN root as the file parent.
- `lib/google-drive/folder-cache.ts`: added Prisma-backed folder cache adapter
  for runtime hierarchy resolution.
- `lib/hooks/use-photo-upload.ts`: requires a semantic
  `PhotoUploadContext` and serializes it with every upload request.
- `lib/hooks/use-photo-upload.spec.ts`: added source-level upload contract
  assertions for shared, checklist, start-work, and completion flows.
- `app/reports/(bms)/create/hooks/use-photo-upload.ts`: sends `CHECKLIST`
  context with the reserved report number and checklist item ID.
- `app/reports/[reportNumber]/start/start-work-client.tsx`: sends
  `START_SELFIE`, `START_RECEIPT`, and `START_MATERIAL_STORE` contexts.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`: sends
  `COMPLETION_RESULT`, `COMPLETION_RECEIPT`,
  `COMPLETION_ADDITIONAL`, and start-work revision contexts.
- `lib/google-drive/archive.ts`: refactored report/PJUM archive uploads behind
  an injected service and routed final PDFs, revision PDFs, and PJUM PDFs into
  the approved hierarchy.
- `lib/google-drive/report-archive.spec.ts`: added archive service assertions
  for final report documents, revision report documents, and branch-level PJUM
  upload destinations.
- `lib/pdf/report-snapshots.ts`: changed `COMPLETED` report snapshot
  publication to upload through the canonical final report archive function.
- `lib/pdf/snapshot-storage.ts`: removed the legacy final report Drive path
  builder; remaining APIs are for transient snapshot paths.
- `app/dashboard/intervensi/revisi-laporan/actions.ts`: changed admin revision
  PDF publication to upload through the canonical revision archive function.
- `app/reports/pjum/approval-actions.ts`: changed final report fallback upload
  during PJUM approval to use the canonical final report archive function.

## Decisions

- `BELUM DIISI` remains the no-ulok placeholder for new store folders.
- Evidence category folders are built only from semantic upload destinations.
- PJUM folder naming is centralized in the pure policy so runtime code and tests
  cannot drift from the approved structure.
- Existing branch and `Toko` folders are required. The resolver does not create
  them, which keeps accidental writes away from the wrong Drive root.
- Store cache keys include root, branch, and authoritative database store code;
  invalid cached folders are deleted before a fresh Drive scan.
- Reserved Drive DRAFT numbers are reused for the same BMS/store and replaced
  when the selected store changes.
- Submit can now promote a reserved DRAFT row instead of always creating a new
  report row. The fallback path remains until all upload contexts are wired.
- Photo upload requests without a validated semantic context are rejected before
  Drive writes happen.
- Drive upload no longer has a root-folder parent fallback for photo files.
- Completion receipt photos now upload into the canonical nota realisasi
  evidence folder instead of being omitted from completion payloads.
- Final and revision report PDFs now resolve
  `Maintenance/<reportNumber>/01 - Dokumen` under the authoritative store
  folder.
- PJUM approval PDFs now resolve the branch-level
  `PJUM Sparta-Maintenance/<NIK> - <name>/<year>/<month>` folder.
- Legacy snapshot storage no longer owns canonical final report Drive paths.

## Verification

- `npx tsx lib/google-drive/hierarchy-policy.spec.ts`: blocked because global
  `npx` is missing `npx-cli.js` in the current Windows profile.
- Esbuild-bundled execution of `lib/google-drive/hierarchy-policy.spec.ts`
  from the isolated worktree: passed.
- Esbuild `write:false` execution of focused specs: passed.
  - `lib/google-drive/hierarchy-policy.spec.ts`
  - `lib/google-drive/hierarchy-service.spec.ts`
  - `lib/google-drive/dev-proxy.spec.ts`
  - `lib/storage/photo-url.spec.ts`
- Esbuild `write:false` execution of Task 3 focused specs: passed.
  - `lib/reports/drive-draft-service.spec.ts`
  - `app/reports/actions/types.spec.ts`
  - `app/reports/actions/report-json-helpers.spec.ts`
- `tsc --noEmit` with `NODE_OPTIONS=--max-old-space-size=8192`: code changes
  reached a single pre-existing dependency error:
  `lib/utils.spec.ts(1,30): Cannot find module 'vitest'`.
- Esbuild `write:false` execution of Task 4 focused specs: passed.
  - `lib/google-drive/photo-upload-context.spec.ts`
  - `app/api/photos/upload/route.spec.ts`
  - `lib/storage/photo-url.spec.ts`
- `tsc --noEmit` after Task 4: same single pre-existing `vitest` dependency
  error only.
- Esbuild `write:false` execution of Task 5 focused specs: passed.
  - `lib/hooks/use-photo-upload.spec.ts`
  - `lib/start-work-evidence.spec.ts`
  - `lib/completion-evidence.spec.ts`
- `tsc --noEmit` after Task 5: same single pre-existing `vitest` dependency
  error only.
- Esbuild `write:false` execution of Task 6/7 focused spec passed:
  - `lib/google-drive/report-archive.spec.ts`
- `tsc --noEmit --incremental false` after Task 6/7: same single pre-existing
  `vitest` dependency error only.

## Remaining Work and Risks

- Cleanup, root env config, docs, and full verification are still pending.
- Repository-wide TypeScript verification needs the existing `vitest`
  dependency gap resolved or that spec excluded from production type checks.
