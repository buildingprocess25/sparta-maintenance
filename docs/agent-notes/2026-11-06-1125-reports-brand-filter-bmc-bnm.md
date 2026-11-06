# Brand filter for BMC and BNM on Laporan Maintenance

## Scope

Show the Brand filter on `/dashboard/reports` (table filter and Ekspor XLSX
dialog) for BMC and BNM_MANAGER, not only ADMIN. Branch scoping, the Admin-only
"History Dihapus" tab and the Admin-only branch picker in the export dialog are
unchanged.

## Context and Sources

- `app/dashboard/reports/actions.ts` (`getAdminReports`): already parses and
  applies `filters.brand` for every role, after scoping BMC/BNM to their
  `branchNames`.
- `app/api/admin/export/route.ts`: already parses `filter.brand` before the
  BMC/BNM branch scoping; `buildReportWhere` in `app/admin/export/queries.ts`
  applies it to both export types offered by the dialog (reports, signage).
- The only gate was `showBrandFilter={isAdmin}` and `initialBrand` forced to
  `"ALL"` for non-admins in the page.

## Changed Files

- `app/dashboard/reports/page.tsx`: read `?brand=` for every role and always
  show the brand filter in the export dialog.
- `app/dashboard/reports/_components/admin-reports-content.tsx`: always show
  the brand filter in the reports table.

## Decisions

No server changes: brand is an extra narrowing filter inside the branch scope
the server already enforces, so it cannot widen what BMC/BNM can see.

## Verification

- `npx tsc --noEmit` (8 GB heap): no errors.
- `eslint` on the changed files: only pre-existing issues in
  `admin-reports-content.tsx` (`any` props, unused `StoreBrandFilter` import).
- Not checked in a browser with a BMC/BNM account.

## Remaining Work and Risks

None.
