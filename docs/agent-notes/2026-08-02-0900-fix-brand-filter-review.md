# Fix Brand Filter Review Findings

## Scope

Fixes review findings from the ADMIN brand-filter implementation. No schema, migration, or production data is changed.

## Context and Sources

- `docs/superpowers/specs/2026-08-02-admin-brand-filter-design.md`
- `docs/superpowers/plans/2026-08-02-admin-brand-filter.md`
- `docs/agent-notes/2026-08-02-0135-task-5-admin-brand-filter.md`
- `docs/agent-notes/2026-08-02-0143-task-6.md`

## Changed Files

- `app/dashboard/_components/admin/admin-trend-filter.tsx`: gates Brand UI and URL output behind an explicit capability prop.
- `app/dashboard/_components/admin/admin-trend-filter.test.ts`: verifies disabled pages cannot emit a brand URL and the ADMIN dashboard retains it.
- `app/dashboard/reports/**`: shows, preserves, and server-validates Brand only for ADMIN reports and exports.
- `app/dashboard/preventive/actions.ts` and `app/api/admin/export/route.ts`: reject invalid Brand values at the request boundary.
- `app/dashboard/realisasi/**`: keeps Brand across the realisasi page and applies it to its report query.
- `app/dashboard/branches/**`: applies the ADMIN Brand scope to branch data, detail data, and all branch navigation.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: preserves Brand in dashboard links and labels global active-user data under a selected Brand.
- `app/dashboard/queries.ts`: uses the PJUM query builder and removes unused per-brand status, trend, branch, and stuck-report queries.
- `lib/store-brand-filter.ts` and `lib/store-brand-filter.test.ts`: add request parsing and a production PJUM predicate builder with focused coverage.
- `app/dashboard/pjum-brand.test.ts`: verifies the production PJUM predicate builder.
- `app/dashboard/pjum-brand.spec.ts`: removed a test that only asserted a hand-built object rather than production behavior.
- `update_queries.ts`: removed an accidental source-rewriting helper script.

## Decisions

- Brand controls remain ADMIN-only; shared components default to hiding them.
- Existing global active-user data remains global and is explicitly labeled when a specific Brand is selected.
- A selected Brand remains in Dashboard links to reports, realisasi, and branch performance; BMC/BNM remain unscoped.
- Branch last-activity timestamps are intentionally omitted under a selected Brand until their raw aggregation can be brand-scoped directly; showing global activity would be incorrect.

## Verification

- `npx tsx app/dashboard/pjum-brand.test.ts` passed.
- `npx tsx app/dashboard/_components/admin/admin-trend-filter.test.ts` passed.
- `npx tsx lib/store-brand-filter.test.ts` passed.
- Focused `npx eslint` for the changed files passed with no errors.
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

## Remaining Work and Risks

Manual browser verification is still needed for ADMIN/BMC/BNM rendering and XLSX contents. A database-backed mixed-brand PJUM integration fixture remains deferred.