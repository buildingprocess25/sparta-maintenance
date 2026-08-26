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

## Decisions

- `BELUM DIISI` remains the no-ulok placeholder for new store folders.
- Evidence category folders are built only from semantic upload destinations.
- PJUM folder naming is centralized in the pure policy so runtime code and tests
  cannot drift from the approved structure.
- Existing branch and `Toko` folders are required. The resolver does not create
  them, which keeps accidental writes away from the wrong Drive root.
- Store cache keys include root, branch, and authoritative database store code;
  invalid cached folders are deleted before a fresh Drive scan.

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

## Remaining Work and Risks

- DRAFT lifecycle, photo route, client contexts, PDF/PJUM archive routing,
  cleanup, docs, and full verification are still pending.
